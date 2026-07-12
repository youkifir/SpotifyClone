import React, { useRef, useEffect } from 'react'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'
import { useLyrics } from '../hooks/useLyrics'
import { useActiveLyricIndex } from '../hooks/useActiveLyricIndex'

const formatTime = ({ minute, second }: { minute: number; second: number }) =>
  `${minute}:${second.toString().padStart(2, '0')}`

export const FullScreenPlayer: React.FC = () => {
  const {
    isFullScreen,
    setIsFullScreen,
    track,
    playStatus,
    currentTime,
    currentSeconds,
    totalTime,
    progress,
    shuffle,
    loop,
    play,
    pause,
    previous,
    next,
    seekTo,
    toggleShuffle,
    toggleLoop,
  } = usePlayer()

  const seekBgRef = useRef<HTMLDivElement>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const activeLineRef = useRef<HTMLParagraphElement>(null)

  // Отримуємо синхронізований LRC з LRCLIB
  const { lines, loading } = useLyrics(track.name, track.artist ?? '')

  // Індекс активного рядка
  const activeIndex = useActiveLyricIndex(lines, currentSeconds)

  // Плавний скрол до активного рядка
  useEffect(() => {
    if (activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeIndex])

  if (!isFullScreen) return null

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = seekBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seekTo(Math.min(1, Math.max(0, ratio)))
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#222] to-black z-50 flex flex-col p-4 sm:p-6 md:p-12 text-white transition-all duration-300">
      
      {/* Верхня панель */}
      <div className="flex justify-between items-center w-full max-w-6xl mx-auto mb-4 md:mb-8 shrink-0">
        <button
          onClick={() => setIsFullScreen(false)}
          className="text-neutral-400 hover:text-white hover:scale-105 transition flex items-center gap-2 font-medium"
        >
          ✕ Згорнути
        </button>
        <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold">Зараз грає</p>
        <div className="w-16" />
      </div>

      {/* Центральний контент */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 flex-1 max-w-6xl mx-auto w-full overflow-hidden min-h-0">

        {/* Ліва сторона — обкладинка та назва */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4 sm:gap-6 w-full md:w-2/5 shrink-0">
          <img
            className="w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96 rounded-lg object-cover shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] transition-transform hover:scale-[1.02]"
            src={track.image}
            alt={track.name}
          />
          <div className="min-w-0 w-full">
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold tracking-tight line-clamp-2">{track.name}</h1>
            <p className="text-neutral-400 text-sm sm:text-base md:text-lg mt-2 line-clamp-2">{track.artist || track.desc}</p>
          </div>
        </div>

        {/* Права сторона — синхронізований текст */}
        <div
          ref={lyricsContainerRef}
          className="flex-1 w-full h-full overflow-y-auto max-h-[30vh] md:max-h-[70vh] pr-2 sm:pr-4 custom-scrollbar flex flex-col gap-3 min-h-0 scroll-smooth"
          style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)' }}
        >
          <h2 className="text-lg sm:text-xl font-bold mb-2 text-neutral-400 sticky top-0 bg-transparent">
            Текст пісні
          </h2>

          {/* Стан завантаження */}
          {loading && (
            <div className="flex items-center gap-3 mt-8">
              <div className="w-2 h-2 rounded-full bg-[#1db954] animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-[#1db954] animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-[#1db954] animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-neutral-500 text-sm">Завантаження тексту...</span>
            </div>
          )}

          {/* Синхронізований текст (є таймкоди) */}
          {!loading && lines && lines.length > 0 && (
            <div className="flex flex-col gap-2 pb-32">
              {lines.map((line, i) => {
                const isActive = i === activeIndex
                const isPast = i < activeIndex

                return (
                  <p
                    key={i}
                    ref={isActive ? activeLineRef : undefined}
                    className="transition-all duration-300 leading-relaxed cursor-pointer select-text"
                    style={{
                      fontSize: isActive ? '1.6rem' : '1.2rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive
                        ? '#ffffff'
                        : isPast
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(255,255,255,0.5)',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                      transformOrigin: 'left center',
                      textShadow: isActive ? '0 0 20px rgba(29,185,84,0.4)' : 'none',
                      lineHeight: 1.4,
                    }}
                    onClick={() => seekTo(line.time / (totalTime.minute * 60 + totalTime.second))}
                  >
                    {line.text}
                  </p>
                )
              })}
            </div>
          )}

          {/* Текст без таймкодів або зовсім немає */}
          {!loading && !lines && (
            <p className="text-lg sm:text-xl md:text-2xl font-bold whitespace-pre-line leading-relaxed tracking-tight text-neutral-400 mt-4">
              {track.lyrics || 'Текст пісні для цього треку відсутній.'}
            </p>
          )}
        </div>
      </div>

      {/* Керування відтворенням */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-2 pt-6 shrink-0">
        <div className="flex items-center gap-3 w-full text-xs text-[#b3b3b3]">
          <p className="w-9 text-right shrink-0">{formatTime(currentTime)}</p>
          <div
            ref={seekBgRef}
            onClick={handleSeekClick}
            className="flex-1 bg-[#4d4d4d] h-1 rounded-full cursor-pointer group relative"
          >
            <div
              className="h-1 rounded-full bg-white group-hover:bg-[#1db954] transition-colors relative"
              style={{ width: `${progress * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition" />
            </div>
          </div>
          <p className="w-9 shrink-0">{formatTime(totalTime)}</p>
        </div>
        <div className="flex items-center gap-6 sm:gap-8">
          <img
            onClick={toggleShuffle}
            className={`w-4 h-4 cursor-pointer transition hover:scale-110 ${shuffle ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            style={shuffle ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
            src={assets.shuffle_icon}
            alt="Shuffle"
          />
          <img onClick={previous} className="w-5 h-5 cursor-pointer opacity-80 hover:opacity-100 hover:scale-110 transition" src={assets.prev_icon} alt="Previous" />
          {playStatus ? (
            <img onClick={pause} className="w-11 h-11 cursor-pointer hover:scale-105 transition" src={assets.pause_icon} alt="Pause" />
          ) : (
            <img onClick={play} className="w-11 h-11 cursor-pointer hover:scale-105 transition" src={assets.play_icon} alt="Play" />
          )}
          <img onClick={next} className="w-5 h-5 cursor-pointer opacity-80 hover:opacity-100 hover:scale-110 transition" src={assets.next_icon} alt="Next" />
          <img
            onClick={toggleLoop}
            className={`w-4 h-4 cursor-pointer transition hover:scale-110 ${loop ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            style={loop ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
            src={assets.loop_icon}
            alt="Loop"
          />
        </div>
      </div>
    </div>
  )
}

export default FullScreenPlayer
