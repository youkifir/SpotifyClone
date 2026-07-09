import Player from './components/Player'
import Sidebar from './components/SIdebar'
import Navbar from './components/Navbar'

function App() {
  return (
    <div className="h-screen bg-black flex flex-col p-2 gap-2 overflow-hidden">
      
      {/* Верхнє меню на весь розмір екрана */}
      <Navbar />
      
      {/* Головна робоча область сайту */}
      <div className="h-[81%] flex flex-1 gap-2 overflow-hidden">
        <Sidebar />
        
        {/* Права частина з контентом */}
        <div className="flex-1 bg-[#121212] rounded-lg text-white p-4">
          {/* Тут будуть твої треки/альбоми */}
        </div>
      </div>

      {/* Програвач знизу */}
      <Player />
      <audio preload="auto"></audio>
    </div>
  )
}

export default App