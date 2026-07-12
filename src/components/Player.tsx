import React, { useRef, useState, useCallback, useEffect } from 'react'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'
import ArtistPopup from './ArtistProup'
import { useLike } from '../hooks/Uselike'
import AddToPlaylistMenu from './AddToPlaylistMenu'

const formatTime = ({ minute, second }: { minute: number; second: number }) =>
  `${minute}:${second.toString().padStart(2, '0')}`

export const Player: React.FC = () => {
  const {
    track,
    playStatus,
    currentTime,
    totalTime,
    progress,
    volume,
    shuffle,
    loop,
    setIsFullScreen,
    play,
    pause,
    previous,
    next,
    seekTo,
    changeVolume,
    toggleShuffle,
    toggleLoop,
  } = usePlayer()

  const { isLiked, toggleLike } = useLike()

  const seekBgRef = useRef<HTMLDivElement>(null)
  const volumeBgRef = useRef<HTMLDivElement>(null)
  const artistAnchorRef = useRef<HTMLSpanElement>(null)
  const [showArtistPopup, setShowArtistPopup] = useState(false)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false)
  const [playlistMenuAnchor, setPlaylistMenuAnchor] = useState<HTMLElement | null>(null)

  // Состояния для перетаскивания (громкость и таймлайн трека)
  const [isDraggingVolume, setIsDraggingVolume] = useState(false)
  const [isDraggingSeek, setIsDraggingSeek] = useState(false)

  const closePlaylistMenu = useCallback(() => {
    setPlaylistMenuOpen(false)
    setPlaylistMenuAnchor(null)
  }, [])

  // Расчет прогресса трека по координате X
  const updateSeekPosition = useCallback((clientX: number) => {
    const el = seekBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    seekTo(Math.min(1, Math.max(0, ratio)))
  }, [seekTo])

  const handleSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingSeek(true)
    updateSeekPosition(e.clientX)
  }

  // Расчет громкости по координате X
  const updateVolumePosition = useCallback((clientX: number) => {
    const el = volumeBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    changeVolume(Math.min(1, Math.max(0, ratio)))
  }, [changeVolume])

  const handleVolumeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingVolume(true)
    updateVolumePosition(e.clientX)
  }

  // Глобальные слушатели перемещения мыши для плавного Drag & Drop
  useEffect(() => {
    if (!isDraggingVolume && !isDraggingSeek) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingVolume) updateVolumePosition(e.clientX)
      if (isDraggingSeek) updateSeekPosition(e.clientX)
    }

    const handleMouseUp = () => {
      setIsDraggingVolume(false)
      setIsDraggingSeek(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingVolume, isDraggingSeek, updateVolumePosition, updateSeekPosition])

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!track) return
    toggleLike(track.id)
    setLikeAnimating(true)
    setTimeout(() => setLikeAnimating(false), 400)
  }

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  if (!track) return null

  const trackImageUrl = track.image?.startsWith('http')
    ? track.image
    : `http://localhost:5000/${track.image}`

  const liked = isLiked(track.id)

  return (
    <>
      <div className='h-[12%] sm:h-[10%] min-h-16 lg:min-h-20 bg-black text-white flex flex-col justify-center select-none shrink-0 border-t border-neutral-900 lg:border-none px-2 lg:px-4'>

        {/* ── МОБИЛЬНЫЙ МИНИ-ПЛЕЕР ── */}
        <div className='flex lg:hidden flex-col w-full bg-[#181818] rounded-md overflow-hidden shadow-lg'>
          {/* Полоса прогресса на мобилках тоже теперь реагирует на зажатие */}
          <div
            ref={seekBgRef}
            onMouseDown={handleSeekMouseDown}
            className='w-full bg-neutral-700 h-[3px] cursor-pointer relative'
          >
            <div className='h-full bg-white transition-[width]' style={{ width: `${progress * 100}%` }} />
          </div>
          
          <div
            onClick={() => setIsFullScreen(true)}
            className='flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer active:bg-[#222] transition-colors'
          >
            <div className='flex items-center gap-3 min-w-0 flex-1'>
              <img className='w-10 h-10 rounded object-cover shrink-0 shadow-md' src={trackImageUrl} alt={track.name} />
              <div className='min-w-0 flex-1'>
                <p className='font-bold text-sm truncate text-white'>{track.name}</p>
                <p className='text-xs text-neutral-400 truncate mt-0.5'>
                  {(track as any).artist || track.desc?.slice(0, 30)}
                </p>
              </div>
            </div>
            
            <div className='flex items-center gap-3 sm:gap-4 shrink-0'>
              <button
                onClick={(e) => { stop(e); handleLike(e) }}
                className={`w-8 h-8 flex items-center justify-center transition ${likeAnimating ? 'scale-125' : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? '#1db954' : 'none'} stroke={liked ? '#1db954' : '#b3b3b3'} strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
              
              {playStatus ? (
                <img onClick={(e) => { stop(e); pause() }} className='w-8 h-8 active:scale-90 transition shrink-0' src={assets.pause_icon} alt="Pause" />
              ) : (
                <img onClick={(e) => { stop(e); play() }} className='w-8 h-8 active:scale-90 transition shrink-0' src={assets.play_icon} alt="Play" />
              )}
            </div>
          </div>
        </div>

        {/* ── ДЕСКТОПНЫЙ ПЛЕЕР ── */}
        <div className='hidden lg:flex justify-between items-center h-full gap-4'>

          {/* Лево: инфо о треке */}
          <div className='flex items-center gap-4 w-1/4 min-w-[200px] flex-nowrap'>
            <img className='w-14 h-14 rounded object-cover shrink-0 shadow-md' src={trackImageUrl} alt={track.name} />
            <div className='min-w-0 flex-1'>
              <p className='font-bold text-sm truncate text-white hover:underline cursor-pointer' onClick={() => setIsFullScreen(true)}>{track.name}</p>
              {(track as any).artist ? (
                <span
                  ref={artistAnchorRef}
                  onClick={(e) => { e.stopPropagation(); setShowArtistPopup(true) }}
                  className='text-xs text-neutral-400 hover:text-white hover:underline cursor-pointer truncate block mt-0.5'
                >
                  {(track as any).artist}
                </span>
              ) : (
                <p className='text-xs text-neutral-400 truncate mt-0.5'>{track.desc?.slice(0, 25)}</p>
              )}
            </div>

            <div className='flex items-center gap-2 shrink-0 ml-2'>
              <button
                onClick={handleLike}
                className={`w-6 h-6 flex items-center justify-center transition-all ${likeAnimating ? 'scale-125' : 'hover:scale-110'}`}
                aria-label={liked ? 'Прибрати з улюблених' : 'Додати до улюблених'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? '#1db954' : 'none'} stroke={liked ? '#1db954' : '#b3b3b3'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setPlaylistMenuAnchor(e.currentTarget); setPlaylistMenuOpen(true) }}
                className={`w-6 h-6 flex items-center justify-center transition-all hover:scale-110 ${playlistMenuOpen ? 'text-[#1db954]' : 'text-neutral-400 hover:text-white'}`}
                title="Додати до плейліста"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Центр: управление и таймлайн */}
          <div className='flex flex-col items-center gap-1.5 flex-1 max-w-2xl px-4'>
            <div className='flex items-center gap-5'>
              <img
                onClick={toggleShuffle}
                className={`w-4 cursor-pointer transition hover:scale-110 ${shuffle ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                style={shuffle ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
                src={assets.shuffle_icon}
                alt="Shuffle"
              />
              <img onClick={previous} className='w-4 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.prev_icon} alt="Previous" />
              {playStatus ? (
                <img onClick={pause} className='w-8 h-8 cursor-pointer hover:scale-105 transition' src={assets.pause_icon} alt="Pause" />
              ) : (
                <img onClick={play} className='w-8 h-8 cursor-pointer hover:scale-105 transition' src={assets.play_icon} alt="Play" />
              )}
              <img onClick={next} className='w-4 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.next_icon} alt="Next" />
              <img
                onClick={toggleLoop}
                className={`w-4 cursor-pointer transition hover:scale-110 ${loop ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                style={loop ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
                src={assets.loop_icon}
                alt="Loop"
              />
            </div>
            
            <div className='flex items-center gap-3 w-full text-[11px] text-neutral-400'>
              <p className='w-8 text-right shrink-0'>{formatTime(currentTime)}</p>
              
              {/* Исправленный таймлайн с поддержкой зажатия мыши */}
              <div 
                ref={seekBgRef} 
                onMouseDown={handleSeekMouseDown} 
                className='flex-1 bg-neutral-800 h-1 rounded-full cursor-pointer group relative select-none'
              >
                <div className='h-1 rounded-full bg-white group-hover:bg-[#1db954] transition-colors relative' style={{ width: `${progress * 100}%` }}>
                  <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white transition-opacity ${
                    isDraggingSeek ? 'opacity-100 bg-[#1db954]' : 'opacity-0 group-hover:opacity-100'
                  }`} />
                </div>
              </div>
              
              <p className='w-8 shrink-0'>{formatTime(totalTime)}</p>
            </div>
          </div>

          {/* Право: громкость и кнопки дополнительных режимов */}
          <div className='flex items-center gap-3 w-1/4 justify-end shrink-0 min-w-[180px]'>
            <img className='w-4 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.plays_icon} alt="Plays" />
            <img onClick={() => setIsFullScreen(true)} className='w-4 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.mic_icon} alt="Lyrics" />
            <img className='w-4 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.queue_icon} alt="Queue" />
            <img className='w-4 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.speaker_icon} alt="Connect to a device" />
            <img className='w-4 opacity-70' src={assets.volume_icon} alt="Volume" />
            
            <div ref={volumeBgRef} onMouseDown={handleVolumeMouseDown} className='w-20 bg-neutral-800 h-1 rounded-full cursor-pointer group relative flex items-center mr-1 select-none'>
              <div className='h-1 rounded-full bg-white group-hover:bg-[#1db954] transition-colors relative flex items-center' style={{ width: `${volume * 100}%` }}>
                <div className={`absolute right-0 w-2.5 h-2.5 rounded-full bg-white transition-opacity ${isDraggingVolume ? 'opacity-100 bg-[#1db954]' : 'opacity-0 group-hover:opacity-100'}`} style={{ transform: 'translateX(50%)' }} />
              </div>
            </div>
            
            <img className='w-4 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.mini_player_icon} alt="Miniplayer" />
            <img onClick={() => setIsFullScreen(true)} className='w-4 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.zoom_icon} alt="Fullscreen" />
          </div>
        </div>
      </div>

      {showArtistPopup && (track as any).artist && (
        <ArtistPopup
          artistName={(track as any).artist}
          anchorEl={artistAnchorRef.current}
          onClose={() => setShowArtistPopup(false)}
        />
      )}

      {playlistMenuOpen && (
        <AddToPlaylistMenu
          songId={track.id}
          anchorEl={playlistMenuAnchor}
          onClose={closePlaylistMenu}
        />
      )}
    </>
  )
}

export default Player