import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Home from './pages/Home'
import AlbumPage from './pages/AlbumPage'

// 1. Імпортуйте ваш провайдер (перевірте шлях до файлу, де він створений!)
import { PlayerContextProvider } from './context/PlayerContext' 

function App() {
  return (
    // 2. Огортаємо все дерево компонентів у Провайдер
    <PlayerContextProvider>
      <div className="h-screen bg-black flex flex-col p-2 gap-2 overflow-hidden">
        
        {/* Верхнє меню на весь розмір екрана */}
        <Navbar />
        
        {/* Головна робоча область сайту */}
        <div className="h-[81%] flex flex-1 gap-2 overflow-hidden">
          {/* Лівий сайдбар із медіатекою */}
          <Sidebar />
          
          {/* Права частина з динамічним контентом, що змінюється за роутами */}
          <div className="flex-1 bg-[#121212] rounded-lg text-white p-4 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/album/:id" element={<AlbumPage />} />
            </Routes>
          </div>
        </div>

        {/* Програвач знизу */}
        <Player />
        <audio preload="auto"></audio>
      </div>
    </PlayerContextProvider>
  )
}

export default App