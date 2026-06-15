import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialisation de l'API Gemini avec la clé d'API
// Exemple : const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

/**
 * Analyse une capture d'écran de graphique pour en extraire des données de trade SMC.
 * 
 * Requête attendue : GET /api/analyze?url=https://...
 * Réponse : JSON contenant les informations extraites par Gemini Vision
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1️⃣ Vérification de la méthode HTTP
  if (req.method !== 'GET') {
    console.log('❌ [Analyze API] Méthode non autorisée :', req.method)
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const imageUrl = req.query.url as string

  // 2️⃣ Vérification des paramètres requis
  if (!imageUrl) {
    console.log('❌ [Analyze API] URL de l\'image manquante dans la requête')
    return res.status(400).json({ error: 'URL de l\'image manquante (paramètre url requis)' })
  }

  if (!genAI) {
    console.log('❌ [Analyze API] GEMINI_API_KEY non configurée dans l\'environnement')
    return res.status(500).json({ error: 'Clé API Gemini non configurée sur le serveur' })
  }

  try {
    console.log('📡 [Analyze API] Téléchargement de l\'image depuis l\'URL...', imageUrl)
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      throw new Error(`Échec du téléchargement de l'image (Statut HTTP : ${imageRes.status})`)
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await imageRes.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')
    console.log('✅ [Analyze API] Téléchargement et conversion base64 réussis. Taille :', arrayBuffer.byteLength, 'octets')

    // 3️⃣ Préparation du prompt et appel à Gemini Vision
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

    console.log('📡 [Analyze API] Appel du modèle gemini-1.5-flash...')
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
    console.log('✅ [Analyze API] Réponse brute de Gemini reçue')

    // 4️⃣ Extraction et parsing de la réponse JSON de Gemini
    // Gemini renvoie parfois le JSON enveloppé dans des blocs markdown ```json ```
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error(`La réponse de l'IA ne contient pas un objet JSON valide. Réponse brute : ${responseText}`)
    }

    const data = JSON.parse(jsonMatch[0])
    console.log('✅ [Analyze API] JSON parsé avec succès :', data)

    return res.status(200).json(data)

  } catch (error: any) {
    console.error('❌ [Analyze API] Erreur d\'analyse :', error)
    return res.status(500).json({ error: error.message || 'Erreur interne lors de l\'analyse de l\'image' })
  }
}
