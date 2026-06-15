import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─── Type pour les données extraites par Gemini Vision ────────────────────────
// Représente le JSON retourné par api/analyze.ts ou api/telegram.ts

export interface GeminiAnalysis {
  pair: string | null
  direction: 'long' | 'short' | null
  entry_price: number | null
  sl: number | null
  tp: number | null
  timeframe: string | null
  session: string | null
  rr: number | null
  patterns: string[]
  confidence: {
    pair: number
    direction: number
    entry_price: number
    sl: number
    tp: number
  }
}

// ─── Type pour le résultat retourné par le hook ───────────────────────────────

export interface QuickEntryResult {
  tradeId: string
  analysis: GeminiAnalysis
}

/**
 * Hook pour créer un trade rapide (Quick Entry) depuis les données Gemini.
 * 
 * Crée le trade en status 'quick' dans Supabase, crée l'étape "Infos générales"
 * avec les données pré-remplies, attache l'image Telegram, puis invalide
 * le cache React Query pour rafraîchir la liste des trades.
 * 
 * Exemple :
 * const { mutateAsync: creerQuickEntry, isPending } = useQuickEntry()
 * const resultat = await creerQuickEntry({ analysis: dataGemini, imageUrl: '...' })
 */
export function useQuickEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      analysis,
      imageUrl
    }: {
      analysis: GeminiAnalysis
      imageUrl: string
    }): Promise<QuickEntryResult> => {
      console.log('🚀 [useQuickEntry] Début création trade rapide...')

      // 1️⃣ Récupérer l'utilisateur connecté via Supabase Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Utilisateur non connecté ou session expirée')
      }
      console.log('👤 [useQuickEntry] Utilisateur connecté :', user.id)

      // 2️⃣ Créer le trade principal avec status 'quick'
      const tradeData = {
        user_id: user.id,
        pair: analysis.pair || 'XAUUSD',
        direction: (analysis.direction || 'long') as 'long' | 'short',
        session: analysis.session || 'London',
        date_backtested: new Date().toISOString().split('T')[0],
        entry_time: null,
        result: null,
        rr_planned: analysis.rr ?? null,
        rr_realized: null,
        exit_type: null,
        emotion: null,
        status: 'quick' as const,
      }

      console.log('📡 [useQuickEntry] Insertion du trade en BDD...', tradeData)
      const { data: insertedTrade, error: tradeError } = await supabase
        .from('trades')
        .insert(tradeData)
        .select()
        .single()

      if (tradeError || !insertedTrade) {
        throw tradeError || new Error('Erreur lors de la création du trade')
      }
      console.log('✅ [useQuickEntry] Trade créé, ID :', insertedTrade.id)

      // 3️⃣ Créer l'étape "Infos générales (Quick Entry)" avec les données Gemini
      const stepData = {
        trade_id: insertedTrade.id,
        order: 0,
        type: 'biais',
        title: 'Quick Entry — IA',
        timeframe: analysis.timeframe || null,
        notes: [
          analysis.patterns?.length
            ? `Patterns SMC identifiés : ${analysis.patterns.join(', ')}`
            : null,
          analysis.entry_price ? `Entrée : ${analysis.entry_price}` : null,
          analysis.sl ? `SL : ${analysis.sl}` : null,
          analysis.tp ? `TP : ${analysis.tp}` : null,
        ].filter(Boolean).join('\n') || null,
        // On stocke les données Gemini + les niveaux de confiance dans fields
        fields: {
          is_quick_entry: true,
          entry_price: analysis.entry_price,
          sl: analysis.sl,
          tp: analysis.tp,
          rr: analysis.rr,
          patterns: analysis.patterns,
          confidence: analysis.confidence,
        },
      }

      console.log('📡 [useQuickEntry] Insertion de l\'étape initiale...')
      const { data: insertedStep, error: stepError } = await supabase
        .from('steps')
        .insert(stepData)
        .select()
        .single()

      if (stepError || !insertedStep) {
        throw stepError || new Error('Erreur lors de la création de l\'étape')
      }
      console.log('✅ [useQuickEntry] Étape créée, ID :', insertedStep.id)

      // 4️⃣ Attacher l'image Telegram à l'étape créée
      const { error: imageError } = await supabase
        .from('step_images')
        .insert({
          step_id: insertedStep.id,
          source: 'telegram',
          url: imageUrl,
          storage_path: null,
        })

      if (imageError) {
        // Erreur non bloquante — le trade existe, juste l'image n'est pas attachée
        console.error('⚠️ [useQuickEntry] Erreur lors de l\'attachement de l\'image :', imageError)
      } else {
        console.log('✅ [useQuickEntry] Image Telegram attachée à l\'étape')
      }

      return {
        tradeId: insertedTrade.id,
        analysis,
      }
    },

    // 5️⃣ Après la création réussie, invalider le cache pour rafraîchir le tableau
    onSuccess: (resultat) => {
      console.log('✅ [useQuickEntry] Trade rapide créé ! Invalidation du cache React Query...')
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      console.log('✅ [useQuickEntry] Cache invalidé, trade ID :', resultat.tradeId)
    },

    onError: (error: any) => {
      console.error('❌ [useQuickEntry] Échec de la création du trade rapide :', error)
    },
  })
}
