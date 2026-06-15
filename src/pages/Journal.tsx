import { AppLayout } from '@/components/layout/AppLayout'
import { TradeTable } from '@/components/trade/TradeTable'
import { TradeDrawer } from '@/components/trade/TradeDrawer'
import { TradeDetail } from '@/components/trade/TradeDetail'
import { TelegramButton } from '@/components/trade/TelegramButton'

// ─── Page Journal ─────────────────────────────────────────
// Page principale qui affiche la liste des trades
// Utilise AppLayout pour le Sidebar + Topbar

export default function Journal() {
  return (
    <AppLayout title="Tous les trades">
      <TradeTable />

      {/* Drawers — se superposent au contenu */}
      <TradeDrawer />
      <TradeDetail />

      {/* Bouton flottant Telegram (Quick Entry) */}
      <TelegramButton />
    </AppLayout>
  )
}
