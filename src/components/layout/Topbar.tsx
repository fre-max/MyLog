import { useUIStore } from '@/store'
import { useTrades } from '@/hooks/useTrades'
import { cn } from '@/lib/utils'

// ─── Topbar ───────────────────────────────────────────────
// Barre horizontale en haut avec :
// - Bouton burger mobile (ouvre la sidebar)
// - Titre de la page
// - Stats rapides (masquées sur mobile)
// - Bouton "+ Nouveau" (uniquement sur la page Journal)

interface TopbarProps {
  title: string
  onMenuClick: () => void
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const openNewTrade = useUIStore((state) => state.openNewTrade)
  const { data: trades = [] } = useTrades()

  console.log('🔝 [Topbar] Rendu du composant')

  // Calcul des stats rapides pour l'affichage dans la topbar
  const totalTrades = trades.length
  const wins = trades.filter((t) => t.result === 'win').length
  const winRate = totalTrades ? Math.round((wins / totalTrades) * 100) : 0
  const avgRR = totalTrades
    ? (trades.reduce((acc, t) => acc + (t.rr_realized ?? 0), 0) / totalTrades).toFixed(2)
    : '—'

  return (
    <header className="h-[52px] border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
      {/* Bouton burger — visible uniquement sur mobile */}
      <button
        className="md:hidden text-txt2 text-xl"
        onClick={() => {
          console.log('🔝 [Topbar] Clic menu burger mobile')
          onMenuClick()
        }}
      >
        ☰
      </button>

      {/* Titre de la page */}
      <span className="text-txt font-medium text-[15px] flex-1">{title}</span>

      {/* Stats rapides — masquées sur mobile pour gagner de l'espace */}
      <div className="hidden md:flex items-center gap-4">
        <Stat label="Win rate" value={`${winRate}%`} color="text-win" />
        <Stat label="Moy. R:R" value={avgRR === '—' ? '—' : `${avgRR}R`} color="text-accent" />
        <Stat label="Trades" value={String(totalTrades)} />
      </div>

      {/* Compteur compact mobile — juste le nombre de trades */}
      <span className="md:hidden text-txt3 text-[12px]">
        {totalTrades} trade{totalTrades !== 1 ? 's' : ''}
      </span>

      {/* Bouton nouveau trade */}
      <button
        onClick={() => {
          console.log('🔝 [Topbar] Clic bouton + Nouveau')
          openNewTrade()
        }}
        className="bg-accent text-white px-3 py-1.5 rounded-md text-[13px] font-medium hover:bg-accent/90 transition-colors"
      >
        <span className="hidden sm:inline">+ Nouveau</span>
        <span className="sm:hidden">+</span>
      </button>
    </header>
  )
}

// ─── Stat individuelle ────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12.5px] text-txt2">
      {label} <span className={cn('font-semibold text-[13px]', color ?? 'text-txt')}>{value}</span>
    </div>
  )
}
