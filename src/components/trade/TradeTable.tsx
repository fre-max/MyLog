import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { useState, useEffect, useMemo } from 'react'
import { useTrades, useDeleteTrade } from '@/hooks/useTrades'
import { useUIStore, useFilterStore } from '@/store'
import { formatDate, formatRR, cn } from '@/lib/utils'
import { SkeletonTableRow } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/trade/StatusBadge'
import type { TradeWithSteps } from '@/types'

// ─── TradeTable ───────────────────────────────────────────
// Tableau principal des trades avec :
// - Onglets (Tableau / Calendrier / Courbe)
// - Skeleton loader pendant le chargement
// - Empty state enrichi quand 0 trades
// - Tri par colonnes

export function TradeTable() {
  const { data: trades = [], isLoading, isError } = useTrades()
  const { mutateAsync: deleteTrade, isPending: isDeleting } = useDeleteTrade()
  const openDetail = useUIStore((state) => state.openDetail)
  const openEditTrade = useUIStore((state) => state.openEditTrade)
  const openNewTrade = useUIStore((state) => state.openNewTrade)
  const addToast = useUIStore((state) => state.addToast)
  const filterPair = useFilterStore((state) => state.filterPair)
  const filterResult = useFilterStore((state) => state.filterResult)
  const [sorting, setSorting] = useState<SortingState>([])

  // ─── Définition des colonnes ──────────────────────────────
  const col = createColumnHelper<TradeWithSteps>()

  const columns = [
    col.accessor('date_backtested', {
      header: 'Date',
      cell: (info) => <span className="text-txt2">{formatDate(info.getValue())}</span>,
    }),
    col.accessor('pair', {
      header: 'Paire',
      cell: (info) => <span className="text-txt font-medium">{info.getValue()}</span>,
    }),
    col.accessor('direction', {
      header: 'Direction',
      cell: (info) => (
        <Badge variant={info.getValue() === 'long' ? 'long' : 'short'}>
          {info.getValue() === 'long' ? '↑ Long' : '↓ Short'}
        </Badge>
      ),
    }),
    col.accessor('steps', {
      header: 'Setup',
      cell: (info) => {
        const entryStep = info.getValue().find((s) => s.type === 'entry')
        return <span className="text-txt2">{entryStep?.title ?? '—'}</span>
      },
    }),
    col.accessor('session', {
      header: 'Session',
      cell: (info) => <span className="text-txt2">{info.getValue()}</span>,
    }),
    col.accessor('rr_realized', {
      header: 'R:R',
      cell: (info) => <span className="text-txt font-medium">{formatRR(info.getValue())}</span>,
    }),
    col.accessor('result', {
      header: 'Résultat',
      cell: (info) => {
        const v = info.getValue()
        if (!v) return <span className="text-txt3">—</span>
        return <Badge variant={v}>{v === 'win' ? '✓ Win' : v === 'loss' ? '✗ Loss' : '— BE'}</Badge>
      },
    }),
    col.accessor('status', {
      header: 'Statut',
      cell: (info) => {
        const statut = (info.getValue() || 'in_progress') as 'quick' | 'in_progress' | 'complete'
        return <StatusBadge status={statut} />
      },
    }),
    col.accessor('steps', {
      id: 'steps_count',
      header: 'Étapes',
      cell: (info) => (
        <div className="flex gap-1">
          {info.getValue().map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent" />
          ))}
        </div>
      ),
    }),
    col.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              openEditTrade(info.row.original)
            }}
            className="px-3 py-1.5 bg-accent text-white rounded-md text-[11.5px] font-medium hover:bg-accent/90 transition-colors"
          >
            Modifier
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Êtes-vous sûr de vouloir supprimer ce trade ?')) {
                deleteTrade(info.row.original.id)
                  .then(() => {
                    addToast('Trade supprimé avec succès', 'success')
                  })
                  .catch((err) => {
                    addToast(err.message || 'Erreur lors de la suppression', 'error')
                  })
              }
            }}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-loss/10 text-loss border border-loss/30 rounded-md text-[11.5px] font-medium hover:bg-loss/20 transition-colors disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      ),
    }),
  ]

  console.log('📊 [TradeTable] Rendu :', { 
    isLoading, 
    isError, 
    totalTrades: trades.length, 
    filterPair, 
    filterResult 
  })

  // Affiche une notification d'erreur propre sans bloquer l'application
  // useEffect(() => {
  //   if (isError) {
  //     addToast('Erreur de chargement des trades', 'error')
  //   }
  // }, [isError, addToast])

  // Filtrage côté client mémoïsé pour stabiliser la référence
  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filterPair && t.pair !== filterPair) return false
      if (filterResult && t.result !== filterResult) return false
      return true
    })
  }, [trades, filterPair, filterResult])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="flex-1 overflow-auto">
      {/* Onglets */}
      <div className="flex gap-0 px-4 border-b border-border">
        {['📋 Tableau', '📅 Calendrier', '📈 Courbe'].map((tab, i) => (
          <div
            key={tab}
            className={cn(
              'px-3 py-2.5 text-[13px] cursor-pointer border-b-2 whitespace-nowrap',
              i === 0
                ? 'text-txt border-accent'
                : 'text-txt2 border-transparent hover:text-txt'
            )}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Contenu du tableau */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-3 py-2.5 text-left text-[11.5px] font-medium text-txt3 uppercase tracking-wider cursor-pointer hover:text-txt2 whitespace-nowrap"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {/* Skeleton loader — 6 lignes animées */}
            {isLoading && (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonTableRow key={i} />
                ))}
              </>
            )}

            {/* Lignes réelles */}
            {!isLoading && table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => {
                  console.log('🔍 [TradeTable] Clic ligne trade (ouverture détail) :', row.original.id)
                  openDetail(row.original)
                }}
                className="border-b border-border cursor-pointer hover:bg-surface2 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3 text-[13.5px] whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state enrichi — quand 0 trades après chargement */}
        {!isLoading && filtered.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            {/* Illustration */}
            <div className="w-20 h-20 bg-surface2 rounded-2xl flex items-center justify-center text-4xl border border-border">
              📊
            </div>

            {/* Texte */}
            <div className="text-center">
              <p className="text-txt font-medium text-[15px] mb-1">Aucun trade enregistré</p>
              <p className="text-txt3 text-sm max-w-[280px]">
                Commencez votre journal de backtesting en ajoutant votre premier trade
              </p>
            </div>

            {/* Bouton CTA */}
            <button
              onClick={() => {
                console.log('➕ [TradeTable] Clic bouton CTA (ouverture formulaire)')
                openNewTrade()
              }}
              className="bg-accent text-white px-5 py-2.5 rounded-lg text-[13.5px] font-medium hover:bg-accent/90 transition-colors flex items-center gap-2"
            >
              + Créer mon premier trade
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────

type BadgeVariant = 'win' | 'loss' | 'breakeven' | 'long' | 'short'

function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  const styles: Record<BadgeVariant, string> = {
    win: 'bg-win/10 text-win',
    loss: 'bg-loss/10 text-loss',
    breakeven: 'bg-be/10 text-be',
    long: 'bg-accent/10 text-accent',
    short: 'bg-[#f08a4f]/10 text-[#f08a4f]',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11.5px] font-medium', styles[variant])}>
      {children}
    </span>
  )
}
