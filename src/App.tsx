import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import FullScreenPlayer from './components/FullScreenPlayer'
import Home from './pages/Home'
import AlbumPage from './pages/AlbumPage'
import AuthPage from './pages/AuthPage' // Импортировали
import { PlayerContextProvider } from './context/PlayerContext'
import { useAuth } from './context/AuthContext' // Импортировали

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white font-bold text-xl">
        Завантаження додатку...
      </div>
    );
  }

  return (
    <PlayerContextProvider>
      <div className="h-screen bg-black flex flex-col p-2 gap-2 overflow-hidden">

        {/* Верхнє меню на весь розмір екрана */}
        <Navbar onToggleSidebar={() => setIsSidebarOpen((open) => !open)} />

        {/* Головна робоча область сайту */}
        <div className="h-[81%] flex flex-1 gap-2 overflow-hidden relative">
          {/* Лівий сайдбар із медіатекою (на мобільних — висувна панель) */}
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

          {/* Права часть с динамическим контентом */}
          <div className="flex-1 min-w-0 bg-[#121212] rounded-lg text-white p-3 sm:p-4 overflow-y-auto custom-scrollbar">
            <Routes>
              {/* Если токена нет, перенаправляем на логин */}
              <Route path="/" element={token ? <Home /> : <Navigate to="/login" />} />
              <Route path="/album/:id" element={token ? <AlbumPage /> : <Navigate to="/login" />} />

              {/* Маршруты авторизации */}
              <Route path="/login" element={!token ? <AuthPage isLoginMode={true} /> : <Navigate to="/" />} />
              <Route path="/register" element={!token ? <AuthPage isLoginMode={false} /> : <Navigate to="/" />} />
            </Routes>
          </div>
        </div>

        {/* Програвач знизу (показывается только если юзер авторизован) */}
        {token && <Player />}
      </div>

      {/* Повноекранний режим із текстом пісні */}
      {token && <FullScreenPlayer />}
    </PlayerContextProvider>
  )
}

export default App