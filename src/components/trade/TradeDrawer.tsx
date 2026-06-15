import { useState } from 'react'
import { useUIStore } from '@/store'
import { cn } from '@/lib/utils'
import { StepBlock } from './StepBlock'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

// ─── Étapes par défaut du formulaire ──────────────────────
const DEFAULT_STEPS = [
  { id: 'step-1', title: 'Infos générales', type: 'general' as const },
  { id: 'step-2', title: 'Biais',           type: 'biais' as const },
  { id: 'step-3', title: 'POI / Zone',      type: 'poi' as const },
  { id: 'step-4', title: 'Entrée',          type: 'entry' as const },
  { id: 'step-5', title: 'Résultat & Review', type: 'result' as const },
]

// ─── État initial du formulaire ────────────────────────────
const INITIAL_FORM_STATE = {
  // Données de base (Trade)
  pair: 'XAUUSD',
  date_backtested: new Date().toISOString().split('T')[0],
  session: 'London',
  entry_time: '',
  direction: 'long' as 'long' | 'short',
  rr_planned: '',
  rr_realized: '',
  result: 'win' as 'win' | 'loss' | 'breakeven' | null,
  exit_type: 'tp' as 'tp' | 'sl' | 'breakeven' | 'trailing' | 'manual',
  emotion: '',

  // Étape Biais
  biais_timeframe: 'H4',
  biais_direction: 'Haussier',
  biais_reasons: '',

  // Étape POI
  poi_timeframe: 'H1',
  poi_type: 'Order Block',
  poi_confluences: '',

  // Étape Entrée
  entry_timeframe: 'M5',
  entry_setup: '',
  entry_price: '',
  entry_sl: '',
  entry_tp: '',
  entry_trailing: '',
  entry_reasons: '',

  // Étape Résultat & Review
  review_good: '',
  review_bad: '',
}

export type FormDataState = typeof INITIAL_FORM_STATE

export function TradeDrawer() {
  const isNewTradeOpen = useUIStore((state) => state.isNewTradeOpen)
  const closeNewTrade = useUIStore((state) => state.closeNewTrade)
  const addToast = useUIStore((state) => state.addToast)

  const [formData, setFormData] = useState<FormDataState>(INITIAL_FORM_STATE)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  console.log('🚪 [TradeDrawer] Rendu, isNewTradeOpen =', isNewTradeOpen)

  const handleClose = () => {
    console.log('🚪 [TradeDrawer] Clic bouton fermer / backdrop')
    if (!saving) {
      closeNewTrade()
    }
  }

  // Enregistre les données du trade et de ses étapes associées dans Supabase
  const handleSave = async () => {
    console.log('🚀 [TradeDrawer] Début de la sauvegarde du trade')
    setSaving(true)

    try {
      // 1. Récupérer la session de l'utilisateur connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Utilisateur non connecté ou session expirée')
      }
      console.log('👤 [TradeDrawer] ID Utilisateur connecté :', user.id)

      // 2. Insérer le trade principal
      const tradeData = {
        user_id: user.id,
        pair: formData.pair,
        direction: formData.direction,
        session: formData.session,
        date_backtested: formData.date_backtested,
        entry_time: formData.entry_time || null,
        result: formData.result,
        rr_planned: formData.rr_planned ? parseFloat(formData.rr_planned) : null,
        rr_realized: formData.rr_realized ? parseFloat(formData.rr_realized) : null,
        exit_type: formData.exit_type,
        emotion: formData.emotion || null,
      }
      console.log('📡 [TradeDrawer] Insertion dans la table trades...', tradeData)

      const { data: insertedTrade, error: tradeInsertError } = await supabase
        .from('trades')
        .insert(tradeData)
        .select()
        .single()

      if (tradeInsertError || !insertedTrade) {
        throw tradeInsertError || new Error("Erreur lors de la création de l'enregistrement de trade")
      }
      console.log('✅ [TradeDrawer] Trade enregistré avec succès, ID :', insertedTrade.id)

      // 3. Préparer les étapes de ce trade
      const stepsToInsert = [
        {
          trade_id: insertedTrade.id,
          order: 0,
          type: 'biais',
          title: 'Biais',
          timeframe: formData.biais_timeframe,
          notes: formData.biais_reasons || null,
          fields: { direction: formData.biais_direction },
        },
        {
          trade_id: insertedTrade.id,
          order: 1,
          type: 'poi',
          title: 'POI / Zone',
          timeframe: formData.poi_timeframe,
          notes: formData.poi_confluences || null,
          fields: { zone_type: formData.poi_type },
        },
        {
          trade_id: insertedTrade.id,
          order: 2,
          type: 'entry',
          title: 'Entrée',
          timeframe: formData.entry_timeframe,
          notes: formData.entry_reasons || null,
          fields: {
            setup: formData.entry_setup,
            price: formData.entry_price ? parseFloat(formData.entry_price) : null,
            sl: formData.entry_sl ? parseFloat(formData.entry_sl) : null,
            tp: formData.entry_tp ? parseFloat(formData.entry_tp) : null,
            trailing: formData.entry_trailing || null,
          },
        },
        {
          trade_id: insertedTrade.id,
          order: 3,
          type: 'result',
          title: 'Résultat & Review',
          timeframe: null,
          notes: `Ce que j'ai bien fait : ${formData.review_good}\nÀ améliorer : ${formData.review_bad}`,
          fields: {
            good: formData.review_good,
            bad: formData.review_bad,
          },
        },
      ]

      console.log('📡 [TradeDrawer] Insertion des étapes...', stepsToInsert)
      const { error: stepsInsertError } = await supabase
        .from('steps')
        .insert(stepsToInsert)

      if (stepsInsertError) {
        throw stepsInsertError
      }
      console.log('✅ [TradeDrawer] Toutes les étapes ont été enregistrées')

      // 4. Notifications et rafraîchissement
      addToast('Le trade a été enregistré avec succès !', 'success')
      queryClient.invalidateQueries({ queryKey: ['trades'] })

      // Réinitialiser et fermer
      setFormData(INITIAL_FORM_STATE)
      closeNewTrade()
    } catch (error: any) {
      console.error('❌ [TradeDrawer] Erreur lors de l\'enregistrement :', error)
      addToast(error.message || 'Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isNewTradeOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-[90]"
          onClick={handleClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-full md:w-[680px] bg-surface border-l border-border',
          'flex flex-col z-[100] transition-transform duration-300',
          isNewTradeOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header — bouton retour sur mobile, ✕ sur desktop */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <button
            onClick={handleClose}
            disabled={saving}
            className="md:hidden text-txt2 hover:text-txt text-lg leading-none disabled:opacity-50"
          >
            ←
          </button>
          <h2 className="text-txt font-semibold text-base flex-1 tracking-tight">Nouveau trade</h2>
          <button
            onClick={handleClose}
            disabled={saving}
            className="hidden md:block text-txt3 hover:text-txt text-xl leading-none disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Body — les étapes du formulaire */}
        <div className="flex-1 overflow-y-auto">
          {DEFAULT_STEPS.map((step, index) => (
            <StepBlock
              key={step.id}
              number={index + 1}
              title={step.title}
              type={step.type}
              defaultOpen={index === 0}
              formData={formData}
              setFormData={setFormData}
            />
          ))}

          <button className="m-5 w-[calc(100%-40px)] py-2.5 border-2 border-dashed border-border2 rounded-md text-txt3 text-sm hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2">
            + Ajouter une étape personnalisée
          </button>
        </div>

        {/* Footer — boutons d'action */}
        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={() => {
              console.log('🚪 [TradeDrawer] Clic bouton Annuler')
              if (!saving) {
                setFormData(INITIAL_FORM_STATE)
                closeNewTrade()
              }
            }}
            disabled={saving}
            className="px-4 py-2 border border-border2 rounded-md text-txt2 text-[13px] font-medium hover:bg-surface2 hover:text-txt transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-accent text-white rounded-md text-[13px] font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </aside>
    </>
  )
}
