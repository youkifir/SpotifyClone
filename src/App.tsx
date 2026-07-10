import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import FullScreenPlayer from './components/FullScreenPlayer' // Імпортували новий компонент
import Home from './pages/Home'
import AlbumPage from './pages/AlbumPage'
import { PlayerContextProvider } from './context/PlayerContext' 

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <PlayerContextProvider>
      <div className="h-screen bg-black flex flex-col p-2 gap-2 overflow-hidden">
        
        {/* Верхнє меню на весь розмір екрана */}
        <Navbar onToggleSidebar={() => setIsSidebarOpen((open) => !open)} />
        
        {/* Головна робоча область сайту */}
        <div className="h-[81%] flex flex-1 gap-2 overflow-hidden relative">
          {/* Лівий сайдбар із медіатекою (на мобільних — висувна панель) */}
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          
          {/* Права частина з динамічним контентом, що змінюється за роутами */}
          <div className="flex-1 min-w-0 bg-[#121212] rounded-lg text-white p-3 sm:p-4 overflow-y-auto custom-scrollbar">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/album/:id" element={<AlbumPage />} />
            </Routes>
          </div>
        </div>

        {/* Програвач знизу */}
        <Player />
      </div>

      {/* Повноекранний режим із текстом пісні */}
      <FullScreenPlayer />
    </PlayerContextProvider>
  )
}

export default App