import { create } from 'zustand'
import type { TradeWithSteps } from '@/types'

// ─── Toast ────────────────────────────────────────────────

export interface Toast {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

// ─── UI Store ─────────────────────────────────────────────

interface UIState {
  // Sidebar mobile
  isSidebarOpen: boolean
  openSidebar: () => void
  closeSidebar: () => void

  // Drawer nouveau trade
  isNewTradeOpen: boolean
  openNewTrade: () => void
  closeNewTrade: () => void

  // Détail d'un trade
  isDetailOpen: boolean
  selectedTradeId: string | null
  selectedTrade: TradeWithSteps | null
  openDetail: (trade: TradeWithSteps) => void
  closeDetail: () => void

  // Toasts (notifications)
  toasts: Toast[]
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  isSidebarOpen: false,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),

  // Drawer nouveau trade
  isNewTradeOpen: false,
  openNewTrade: () => set({ isNewTradeOpen: true }),
  closeNewTrade: () => set({ isNewTradeOpen: false }),

  // Détail
  isDetailOpen: false,
  selectedTradeId: null,
  selectedTrade: null,
  openDetail: (trade) => set({ isDetailOpen: true, selectedTrade: trade, selectedTradeId: trade.id }),
  closeDetail: () => set({ isDetailOpen: false, selectedTrade: null, selectedTradeId: null }),

  // Toasts — on génère un id unique avec Date.now + random
  toasts: [],
  addToast: (message, type) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, message, type },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

// ─── Filtres ──────────────────────────────────────────────

interface FilterState {
  filterPair: string | null
  filterSession: string | null
  filterResult: string | null
  setFilter: (key: keyof Omit<FilterState, 'setFilter' | 'resetFilters'>, value: string | null) => void
  resetFilters: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  filterPair: null,
  filterSession: null,
  filterResult: null,

  setFilter: (key, value) => set({ [key]: value }),
  resetFilters: () => set({ filterPair: null, filterSession: null, filterResult: null }),
}))
