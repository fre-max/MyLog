import { useUIStore } from '@/store'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

// ─── Layout partagé ───────────────────────────────────────
// Utilisé par Journal et Stats pour ne pas dupliquer
// la Sidebar et le Topbar dans chaque page
//
// Exemple :
// <AppLayout title="Statistiques">
//   <MonContenu />
// </AppLayout>

interface AppLayoutProps {
  children: React.ReactNode
  title: string
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const openSidebar = useUIStore((state) => state.openSidebar)

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar — gère son propre backdrop et animation */}
      <Sidebar />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} onMenuClick={openSidebar} />
        {children}
      </div>
    </div>
  )
}
