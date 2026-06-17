import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { GeminiAnalysis } from './useQuickEntry'

// ─── Types pour l'état interne du hook ───────────────────────────────────────

export type TelegramMode = 'standard' | 'analyse' | 'quick' | 'quick_fallback' | 'ping' | null

export interface TelegramPingResult {
  ok: boolean
  bot?: { id: number; username: string; name: string }
  webhook?: { active: boolean; url: string | null }
  queue?: { pendingUpdates: number; pendingPhotos: number }
  gemini?: { configured: boolean; model: string }
  error?: string
}

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
  const fetchLastMessage = async (stepId?: string): Promise<TelegramState> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('📡 [useTelegram] Appel de /api/telegram...')

      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = {}
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const apiUrl = stepId ? `/api/telegram?step_id=${encodeURIComponent(stepId)}` : '/api/telegram'
      const res = await fetch(apiUrl, { headers })

      console.log(`📡 [useTelegram] Statut réponse : ${res.status} ${res.statusText}`)
      const contentType = res.headers.get('content-type')
      console.log(`📡 [useTelegram] Content-Type : ${contentType}`)

      const text = await res.text()

      if (!res.ok) {
        let serverMessage = text
        try {
          const errBody = JSON.parse(text) as { error?: string }
          if (errBody.error) serverMessage = errBody.error
        } catch {
          // garder le texte brut
        }
        throw new Error(serverMessage || `Erreur HTTP ${res.status}`)
      }
      console.log('📡 [useTelegram] Réponse brute reçue (premiers 200 caractères) :', text.substring(0, 200))

      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('❌ [useTelegram] Échec du parsing JSON de la réponse !')
        console.error('❌ [useTelegram] Contenu non-JSON reçu :', text)
        throw new Error(`La réponse du serveur n'est pas un JSON valide (reçu: ${text.substring(0, 50)}...)`)
      }

      console.log('✅ [useTelegram] Réponse JSON parsée avec succès, mode :', data.mode)

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
      console.error('❌ [useTelegram] Erreur attrapée dans fetchLastMessage :', err)
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
  const fetchLastImage = async (stepId?: string) => {
    const etat = await fetchLastMessage(stepId)
    if (etat.preview) {
      return { fileUrl: etat.preview, date: Date.now() }
    }
    return null
  }

  // Réinitialiser l'état complet du hook
  const clearPreview = () => {
    setState({ isLoading: false, preview: null, error: null, mode: null, analysis: null })
  }

  // Teste la connexion au bot sans consommer de message ni appeler Gemini
  const testBotConnection = async (): Promise<TelegramPingResult> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const res = await fetch('/api/telegram?ping=1')
      const data = await res.json() as TelegramPingResult & { mode?: string }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Erreur HTTP ${res.status}`)
      }

      setState((prev) => ({ ...prev, isLoading: false, error: null, mode: 'ping' }))
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      return { ok: false, error: message }
    }
  }

  return {
    ...state,
    fetchLastMessage,
    fetchLastImage,  // Rétrocompatibilité avec ImageField.tsx
    testBotConnection,
    clearPreview,
  }
}
