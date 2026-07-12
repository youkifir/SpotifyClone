import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Player from './components/Player'
import Home from './pages/Home'
import AlbumPage from './pages/AlbumPage'
import AuthPage from './pages/AuthPage'
import AdminPanel from './pages/AdminPanel'
import ProfilePage from './pages/ProfilePage'
import ArtistPage from './pages/ArtistPage'
import MusicianPage from './pages/MusicianPage'
import { PlayerContextProvider } from './context/PlayerContext'
import { useAuth } from './context/AuthContext'
import { Sidebar } from './components/Sidebar'
import PlaylistPage from './pages/PlaylistPage'
import { FullScreenPlayer } from './components/FullScreenPlayer'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white font-bold text-xl">
        Завантаження додатку...
      </div>
    )
  }

  // ── Рендер для неавторизованого користувача (Вхід / Реєстрація) ──
  if (!token) {
    return (
      <div className="h-screen w-screen bg-[#09090b] relative flex items-center justify-center overflow-hidden">
        {/* Декоративний розмитий фон для ефекту "пустого аккаунту" */}
        <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 via-transparent to-zinc-500/5 blur-[120px] pointer-events-none" />

        <div className="z-10 w-full h-full flex items-center justify-center backdrop-blur-md">
          <Routes>
            <Route path="/login" element={<AuthPage isLoginMode={true} />} />
            <Route path="/register" element={<AuthPage isLoginMode={false} />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    )
  }

  // ── Основний рендер додатку (коли токен є) ──
  return (
    <PlayerContextProvider>
      <div className="h-screen bg-black flex flex-col p-2 gap-2 overflow-hidden">
        <Navbar onToggleSidebar={() => setIsSidebarOpen((open) => !open)} />

        <div className="h-[81%] flex flex-1 gap-2 overflow-hidden relative">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

          <div className="flex-1 min-w-0 bg-[#121212] rounded-lg text-white p-3 sm:p-4 overflow-y-auto custom-scrollbar">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/album/:id" element={<AlbumPage />} />
              <Route path="/playlist/:id" element={<PlaylistPage />} />
              <Route path="/artist/:name" element={<ArtistPage />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/musician" element={<MusicianPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>

        <Player />
      </div>

      <FullScreenPlayer />
    </PlayerContextProvider>
  )
}

export default App