import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// Initialisation de Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null

// Initialisation de Supabase (URL + Clé publique Anon)
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

interface TelegramFile {
  file_id: string
  file_size: number
  width: number
  height: number
}

interface TelegramMessage {
  message_id: number
  date: number
  photo?: TelegramFile[]
  caption?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

interface TelegramResponse {
  ok: boolean
  result: TelegramUpdate[]
}

interface TelegramFileResponse {
  ok: boolean
  result: { file_path: string }
}

/**
 * Fonction d'aide interne pour télécharger une image et l'analyser avec Gemini Vision.
 * Exécute le prompt structuré SMC.
 */
async function analyserImageAvecGemini(imageUrl: string): Promise<any> {
  if (!genAI) {
    throw new Error('Clé API Gemini non configurée sur le serveur')
  }

  // 1️⃣ Téléchargement de l'image
  const imageRes = await fetch(imageUrl)
  if (!imageRes.ok) {
    throw new Error(`Échec du téléchargement de l'image Telegram (${imageRes.status})`)
  }

  const contentType = imageRes.headers.get('content-type') || 'image/jpeg'
  const arrayBuffer = await imageRes.arrayBuffer()
  const base64Image = Buffer.from(arrayBuffer).toString('base64')

  // 2️⃣ Appel à Gemini-1.5-flash
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const prompt = `Tu es un assistant spécialisé en analyse de trades SMC (Smart Money Concepts).
Analyse ce screenshot TradingView et extrais les informations suivantes en JSON.
La position est toujours ouverte et visible sur le chart.

Retourne UNIQUEMENT ce JSON, sans texte supplémentaire :
{
  "pair": "paire tradée (ex: XAUUSD, EURUSD...)",
  "direction": "long ou short",
  "entry_price": nombre ou null,
  "sl": nombre ou null,
  "tp": nombre ou null,
  "timeframe": "timeframe visible (ex: M15, H1...)",
  "session": "Asian, London, NY ou London/NY selon l'heure visible, ou null",
  "rr": nombre calculé depuis entrée/SL/TP ou null,
  "patterns": ["patterns SMC visibles si annotés sur le chart"],
  "confidence": {
    "pair": 0.0 à 1.0,
    "direction": 0.0 à 1.0,
    "entry_price": 0.0 à 1.0,
    "sl": 0.0 à 1.0,
    "tp": 0.0 à 1.0
  }
}`

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image,
        mimeType: contentType
      }
    }
  ])

  const responseText = result.response.text()
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Gemini n\'a pas retourné de JSON valide')
  }

  return JSON.parse(jsonMatch[0])
}

/**
 * Handler principal pour l'API Telegram.
 * Lit le dernier message du bot, extrait l'image et la caption, et applique le routage.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return res.status(500).json({ error: 'Token du bot Telegram non configuré' })
  }

  try {
    console.log('📡 [Telegram API] Récupération du dernier message Telegram...')
    // Récupère le tout dernier message reçu par le bot
    const updatesRes = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?limit=1&offset=-1`
    )
    const updates: TelegramResponse = await updatesRes.json()

    const message = updates.result?.[0]?.message
    if (!message?.photo?.length) {
      console.log('❌ [Telegram API] Aucune image récente trouvée dans le bot')
      return res.status(404).json({ error: 'Aucune image trouvée dans le bot' })
    }

    // Récupération de l'image haute résolution
    const photo = message.photo[message.photo.length - 1]
    const fileRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${photo.file_id}`
    )
    const fileData: TelegramFileResponse = await fileRes.json()
    const fileUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`

    // Lecture de la caption (légende du message)
    const caption = (message.caption || '').toLowerCase().trim()
    console.log('✅ [Telegram API] Image trouvée. Caption :', caption || '(aucune)')

    // ────────────────────────────────────────────────────────
    // ROUTAGE SELON LA CAPTION
    // ────────────────────────────────────────────────────────

    // 1️⃣ Cas "q" ou "quick" : Analyse IA + Création automatique du trade dans Supabase
    if (caption === 'q' || caption === 'quick') {
      console.log('🚀 [Telegram API] Mode Quick Entry détecté')

      // Analyse via Gemini
      const analysisData = await analyserImageAvecGemini(fileUrl)

      // Initialiser le client Supabase avec le token de la requête pour respecter RLS
      const authHeader = req.headers.authorization
      if (!authHeader || !supabaseUrl || !supabaseAnonKey) {
        // Si pas de session fournie, on renvoie les données d'analyse pour création côté client
        console.log('⚠️ [Telegram API] Pas d\'en-tête d\'autorisation, renvoi des données pour création client')
        return res.status(200).json({
          mode: 'quick_fallback',
          fileUrl,
          analysis: analysisData,
          date: message.date,
        })
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })

      // Récupérer les détails de l'utilisateur connecté via son JWT
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('JWT invalide ou utilisateur non authentifié côté Supabase')
      }

      // Création du trade dans Supabase avec status 'quick'
      const tradeData = {
        user_id: user.id,
        pair: analysisData.pair || 'XAUUSD',
        direction: (analysisData.direction || 'long') as 'long' | 'short',
        session: analysisData.session || 'London',
        date_backtested: new Date().toISOString().split('T')[0],
        entry_time: null,
        result: null,
        rr_planned: analysisData.rr ? parseFloat(analysisData.rr) : null,
        rr_realized: null,
        exit_type: null,
        emotion: null,
        status: 'quick' as const
      }

      const { data: insertedTrade, error: tradeInsertError } = await supabase
        .from('trades')
        .insert(tradeData)
        .select()
        .single()

      if (tradeInsertError || !insertedTrade) {
        throw tradeInsertError || new Error('Erreur lors de la création du trade')
      }

      // Création de l'étape "Infos générales" liée au trade
      const stepData = {
        trade_id: insertedTrade.id,
        order: 0,
        type: 'biais', // Étape initiale
        title: 'Infos générales (Quick Entry)',
        timeframe: analysisData.timeframe || null,
        notes: `Patterns SMC identifiés : ${(analysisData.patterns || []).join(', ') || 'aucun'}`,
        fields: {
          extracted: analysisData,
          is_quick_entry: true
        }
      }

      const { data: insertedStep, error: stepInsertError } = await supabase
        .from('steps')
        .insert(stepData)
        .select()
        .single()

      if (stepInsertError || !insertedStep) {
        throw stepInsertError || new Error('Erreur lors de la création de l\'étape générale')
      }

      // Liaison de l'image de Telegram à l'étape créée
      const { error: imageInsertError } = await supabase
        .from('step_images')
        .insert({
          step_id: insertedStep.id,
          source: 'telegram',
          url: fileUrl
        })

      if (imageInsertError) {
        console.error('❌ [Telegram API] Erreur lors de l\'enregistrement de l\'image :', imageInsertError)
      }

      console.log('✅ [Telegram API] Trade rapide et étape créés en BDD. ID Trade :', insertedTrade.id)

      return res.status(200).json({
        mode: 'quick',
        tradeId: insertedTrade.id,
        analysis: analysisData,
        fileUrl,
        date: message.date,
      })
    }

    // 2️⃣ Cas "a" ou "analyse" : Analyse IA seulement (retourne les données pour le formulaire)
    if (caption === 'a' || caption === 'analyse') {
      console.log('🚀 [Telegram API] Mode Analyse seule détecté')
      const analysisData = await analyserImageAvecGemini(fileUrl)

      return res.status(200).json({
        mode: 'analyse',
        fileUrl,
        analysis: analysisData,
        date: message.date,
      })
    }

    // 3️⃣ Pas de caption : Retourner simplement l'URL de l'image (comportement d'origine)
    console.log('🚀 [Telegram API] Mode Standard détecté (stockage d\'image simple)')
    return res.status(200).json({
      mode: 'standard',
      fileUrl,
      date: message.date,
    })

  } catch (error: any) {
    console.error('❌ [Telegram API] Erreur générale :', error)
    return res.status(500).json({ error: error.message || 'Erreur lors du traitement du message Telegram' })
  }
}
