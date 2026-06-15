import { useState } from 'react'
import type { GeminiAnalysis } from './useQuickEntry'

// ─── Types pour l'état interne du hook ───────────────────────────────────────

export type TelegramMode = 'standard' | 'analyse' | 'quick' | 'quick_fallback' | null

interface TelegramState {
  isLoading: boolean
  preview: string | null   // URL de l'image récupérée
  error: string | null
  mode: TelegramMode       // Mode détecté selon la caption du message
  analysis: GeminiAnalysis | null  // Données extraites par Gemini (si analyse ou quick)
}

/**
 * Hook pour interagir avec le bot Telegram.
 * Appelle /api/telegram et retourne l'image + le mode d'action selon la caption.
 *
 * Modes retournés selon la légende (caption) du message Telegram :
 * - 'quick' ou 'quick_fallback' → le trade a été créé / les données sont prêtes pour création
 * - 'analyse'  → les données Gemini sont prêtes pour pré-remplir le formulaire
 * - 'standard' → uniquement une URL d'image (pas d'analyse)
 * - null       → état initial avant tout appel
 * 
 * Exemple :
 * const { fetchLastMessage, isLoading, preview, mode, analysis } = useTelegram()
 * await fetchLastMessage()
 * if (mode === 'analyse') { /* pré-remplir le formulaire avec analysis *\/ }
 */
export function useTelegram() {
  const [state, setState] = useState<TelegramState>({
    isLoading: false,
    preview: null,
    error: null,
    mode: null,
    analysis: null,
  })

  // Appelle /api/telegram et met à jour l'état selon le mode retourné par le serveur
  const fetchLastMessage = async (): Promise<TelegramState> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('📡 [useTelegram] Appel de /api/telegram...')
      const res = await fetch('/api/telegram')
      if (!res.ok) throw new Error('Aucune image trouvée dans le bot Telegram')

      const data = await res.json()
      console.log('✅ [useTelegram] Réponse reçue, mode :', data.mode)

      const nouvelEtat: TelegramState = {
        isLoading: false,
        preview: data.fileUrl || null,
        error: null,
        mode: data.mode || 'standard',
        analysis: data.analysis || null,
      }

      setState(nouvelEtat)
      return nouvelEtat

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      const etatErreur: TelegramState = {
        isLoading: false,
        preview: null,
        error: message,
        mode: null,
        analysis: null,
      }
      setState(etatErreur)
      return etatErreur
    }
  }

  // Méthode de rétrocompatibilité : fetchLastImage (utilisé par ImageField.tsx)
  // Préserve l'ancien comportement en retournant { fileUrl, date }
  const fetchLastImage = async () => {
    const etat = await fetchLastMessage()
    if (etat.preview) {
      return { fileUrl: etat.preview, date: Date.now() }
    }
    return null
  }

  // Réinitialiser l'état complet du hook
  const clearPreview = () => {
    setState({ isLoading: false, preview: null, error: null, mode: null, analysis: null })
  }

  return {
    ...state,
    fetchLastMessage,
    fetchLastImage,  // Rétrocompatibilité avec ImageField.tsx
    clearPreview,
  }
}
