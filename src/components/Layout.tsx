import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Player from './Player'

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [collapsed, setCollapsed] = useState<boolean>(false)

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white flex flex-col">
      <div className="flex flex-1 min-h-0 gap-2 p-2 pb-0 overflow-x-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
        <div className="flex-1 min-w-0 flex flex-col bg-[#121212] rounded-lg overflow-hidden">
          <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
          <main className="flex-1 overflow-y-auto px-6 pb-6">
            <Outlet />
          </main>
        </div>
      </div>
      <Player />
    </div>
  )
}

export default Layout