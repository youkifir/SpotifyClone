import React from 'react'
import { usePlayer } from '../context/usePlayer'

export const FullScreenPlayer: React.FC = () => {
  const { isFullScreen, setIsFullScreen, track } = usePlayer()

  if (!isFullScreen) return null

  return (
    <div className="fixed inset-0 bg-linear-to-b from-[#222] to-black z-50 flex flex-col p-6 md:p-12 text-white transition-all duration-300">
      
      {/* Верхня панель дій */}
      <div className="flex justify-between items-center w-full max-w-6xl mx-auto mb-8">
        <button 
          onClick={() => setIsFullScreen(false)} 
          className="text-neutral-400 hover:text-white transition flex items-center gap-2 font-medium"
        >
          ✕ Згорнути
        </button>
        <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold">Зараз грає</p>
        <div className="w-16"></div>
      </div>

      {/* Центральний контент */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-12 flex-1 max-w-6xl mx-auto w-full overflow-hidden">
        
        {/* Ліва сторона: Велика обкладинка та деталі */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6 w-full md:w-2/5 shrink-0">
          <img 
            className="w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-lg object-cover shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]" 
            src={track.image} 
            alt={track.name} 
          />
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight line-clamp-2">{track.name}</h1>
            <p className="text-neutral-400 text-base sm:text-lg mt-2 line-clamp-2">{track.desc}</p>
          </div>
        </div>

        {/* Права сторона: Текст пісні */}
        <div className="flex-1 w-full h-full overflow-y-auto max-h-[50vh] md:max-h-[70vh] pr-4 custom-scrollbar flex flex-col justify-start">
          <h2 className="text-xl font-bold mb-4 text-neutral-400">Текст пісні</h2>
          <p className="text-xl sm:text-3xl font-bold whitespace-pre-line leading-relaxed tracking-tight text-neutral-200 selection:bg-[#1db954]">
            {track.lyrics || "Текст пісні для цього треку відсутній."}
          </p>
        </div>

      </div>
    </div>
  )
}

export default FullScreenPlayer