import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TradeInsert, TradeWithSteps } from '@/types'

const QUERY_KEY = ['trades'] as const

// Fetch all trades with steps and images
export function useTrades() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<TradeWithSteps[]> => {
      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          steps (
            *,
            images: step_images (*)
          )
        `)
        .order('date_backtested', { ascending: false })

      if (error) throw error
      return data as TradeWithSteps[]
    },
  })
}

// Fetch single trade
export function useTrade(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: async (): Promise<TradeWithSteps> => {
      const { data, error } = await supabase
        .from('trades')
        .select(`*, steps (*, images: step_images (*))`)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as TradeWithSteps
    },
    enabled: !!id,
  })
}

// Create trade
export function useCreateTrade() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (trade: TradeInsert) => {
      const { data, error } = await supabase
        .from('trades')
        .insert(trade)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

// Delete trade
export function useDeleteTrade() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trades').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
