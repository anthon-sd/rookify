import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { BottomNavigation } from "./BottomNavigation"
import { TopBar } from "./TopBar"
import { useMobile } from "@/hooks/useMobile"

export function AppLayout() {
  const isMobile = useMobile()

  return (
    <div className="min-h-screen chess-gradient">
      {!isMobile && <Sidebar />}
      <div className={`${!isMobile ? 'ml-64' : ''} min-h-screen`}>
        <TopBar />
        <main className={`${isMobile ? 'pb-20 pt-16' : 'pt-16'} p-4 md:p-6`}>
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      {isMobile && <BottomNavigation />}
    </div>
  )
}