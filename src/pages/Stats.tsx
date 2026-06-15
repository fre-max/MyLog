import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useTradeStats, type StatsGroupe } from '@/hooks/useTradeStats'
import { Skeleton, SkeletonLine } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

// ─── Onglets de breakdown ─────────────────────────────────
const BREAKDOWN_TABS = [
  { key: 'paire', label: 'Par Paire' },
  { key: 'session', label: 'Par Session' },
  { key: 'setup', label: 'Par Setup' },
  { key: 'emotion', label: 'Par Émotion' },
] as const

type BreakdownKey = (typeof BREAKDOWN_TABS)[number]['key']

// ─── Page Statistiques ────────────────────────────────────
// Affiche les métriques globales + breakdowns par catégorie
// Utilise useTradeStats() pour les calculs

export default function Stats() {
  const { globales, parPaire, parSession, parSetup, parEmotion, isLoading } = useTradeStats()
  const [activeTab, setActiveTab] = useState<BreakdownKey>('paire')

  // Sélectionner les données du breakdown actif
  const breakdownData: Record<BreakdownKey, StatsGroupe[]> = {
    paire: parPaire,
    session: parSession,
    setup: parSetup,
    emotion: parEmotion,
  }
  const donneesActives = breakdownData[activeTab]

  return (
    <AppLayout title="Statistiques">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        {/* ─── Section 1 : Métriques globales ──────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard
            label="Win Rate"
            value={isLoading ? null : `${globales.winRate}%`}
            icon="🎯"
            color={globales.winRate >= 50 ? 'text-win' : 'text-loss'}
          />
          <MetricCard
            label="Expectancy"
            value={isLoading ? null : `${globales.expectancy > 0 ? '+' : ''}${globales.expectancy}R`}
            icon="📈"
            color={globales.expectancy >= 0 ? 'text-win' : 'text-loss'}
          />
          <MetricCard
            label="Moy. R:R"
            value={isLoading ? null : `${globales.moyenneRR}R`}
            icon="⚖️"
            color="text-accent"
          />
          <MetricCard
            label="Total Trades"
            value={isLoading ? null : String(globales.totalTrades)}
            icon="📋"
            subtitle={
              isLoading
                ? undefined
                : `${globales.totalWins}W / ${globales.totalLosses}L / ${globales.totalBE}BE`
            }
          />
        </div>

        {/* ─── Section 2 : Breakdowns ──────────────────────── */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {/* Onglets */}
          <div className="flex border-b border-border overflow-x-auto">
            {BREAKDOWN_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'text-accent border-accent'
                    : 'text-txt2 border-transparent hover:text-txt hover:bg-surface2'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tableau de breakdown */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[11.5px] font-medium text-txt3 uppercase tracking-wider">Nom</th>
                  <th className="px-4 py-2.5 text-left text-[11.5px] font-medium text-txt3 uppercase tracking-wider">Trades</th>
                  <th className="px-4 py-2.5 text-left text-[11.5px] font-medium text-txt3 uppercase tracking-wider">Wins</th>
                  <th className="px-4 py-2.5 text-left text-[11.5px] font-medium text-txt3 uppercase tracking-wider">Losses</th>
                  <th className="px-4 py-2.5 text-left text-[11.5px] font-medium text-txt3 uppercase tracking-wider">Win Rate</th>
                  <th className="px-4 py-2.5 text-left text-[11.5px] font-medium text-txt3 uppercase tracking-wider">Avg R:R</th>
                </tr>
              </thead>
              <tbody>
                {/* Skeleton pendant le chargement */}
                {isLoading && [1, 2, 3, 4].map((i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3"><SkeletonLine width="w-20" /></td>
                    <td className="px-4 py-3"><SkeletonLine width="w-8" /></td>
                    <td className="px-4 py-3"><SkeletonLine width="w-8" /></td>
                    <td className="px-4 py-3"><SkeletonLine width="w-8" /></td>
                    <td className="px-4 py-3"><SkeletonLine width="w-12" /></td>
                    <td className="px-4 py-3"><SkeletonLine width="w-12" /></td>
                  </tr>
                ))}

                {/* Données réelles */}
                {!isLoading && donneesActives.map((groupe) => (
                  <tr key={groupe.nom} className="border-b border-border hover:bg-surface2 transition-colors">
                    <td className="px-4 py-3 text-[13.5px] text-txt font-medium">{groupe.nom}</td>
                    <td className="px-4 py-3 text-[13.5px] text-txt2">{groupe.totalTrades}</td>
                    <td className="px-4 py-3 text-[13.5px] text-win">{groupe.wins}</td>
                    <td className="px-4 py-3 text-[13.5px] text-loss">{groupe.losses}</td>
                    <td className="px-4 py-3">
                      {/* Barre de progression du win rate */}
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-[13.5px] font-medium',
                          groupe.winRate >= 50 ? 'text-win' : 'text-loss'
                        )}>
                          {groupe.winRate}%
                        </span>
                        <div className="w-16 h-1.5 bg-bg rounded-full overflow-hidden hidden md:block">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              groupe.winRate >= 50 ? 'bg-win' : 'bg-loss'
                            )}
                            style={{ width: `${groupe.winRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13.5px] text-accent font-medium">
                      {groupe.moyenneRR > 0 ? '+' : ''}{groupe.moyenneRR}R
                    </td>
                  </tr>
                ))}

                {/* Aucune donnée */}
                {!isLoading && donneesActives.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-txt3 text-sm">
                      Aucune donnée disponible — ajoutez des trades pour voir les statistiques
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

// ─── Carte de métrique ────────────────────────────────────
// Affiche une métrique clé (win rate, expectancy, etc.)
// Avec skeleton si value est null

interface MetricCardProps {
  label: string
  value: string | null
  icon: string
  color?: string
  subtitle?: string
}

function MetricCard({ label, value, icon, color, subtitle }: MetricCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-2">
      {/* Header avec icône */}
      <div className="flex items-center justify-between">
        <span className="text-txt3 text-[11.5px] font-medium uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>

      {/* Valeur principale */}
      {value === null ? (
        <Skeleton className="w-20 h-7" />
      ) : (
        <span className={cn('text-2xl font-bold tracking-tight', color ?? 'text-txt')}>
          {value}
        </span>
      )}

      {/* Sous-texte optionnel */}
      {subtitle && (
        <span className="text-txt3 text-[11.5px]">{subtitle}</span>
      )}
    </div>
  )
}
