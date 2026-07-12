import React, { useRef, useState, useCallback } from 'react'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'
import ArtistPopup from './ArtistProup'
import { useLike } from '../hooks/Uselike'
import AddToPlaylistMenu from './AddToPlaylistMenu'

// ─── Device Panel ─────────────────────────────────────────────────────────────

const DEVICES = [
  {
    id: 'this_computer',
    label: 'Цей ПК',
    type: 'computer' as const,
    active: true,
  },
]

function DeviceIcon({ type, active }: { type: 'computer' | 'phone' | 'tv' | 'speaker'; active: boolean }) {
  const color = active ? '#1db954' : '#b3b3b3'
  const paths: Record<string, React.ReactNode> = {
    computer: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    phone: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1"/>
      </svg>
    ),
    tv: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="13" rx="2"/><polyline points="17 2 12 7 7 2"/>
      </svg>
    ),
    speaker: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="14" r="4"/><line x1="12" y1="6" x2="12.01" y2="6"/>
      </svg>
    ),
  }
  return <>{paths[type]}</>
}

function DevicePanel({ anchorEl, onClose }: { anchorEl: HTMLElement | null; onClose: () => void }) {
  const panelRef = React.useRef<HTMLDivElement>(null)

  // Position above the anchor button
  const [pos, setPos] = React.useState({ bottom: 0, right: 0 })
  React.useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    setPos({
      bottom: window.innerHeight - rect.top + 8,
      right: window.innerWidth - rect.right - 4,
    })
  }, [anchorEl])

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          anchorEl && !anchorEl.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorEl, onClose])

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bg-[#282828] rounded-xl shadow-2xl p-4 w-72 border border-white/10 animate-fade-in"
      style={{ bottom: pos.bottom, right: pos.right }}
    >
      {/* Active device */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1db954]/15 shrink-0">
          <DeviceIcon type="computer" active={true} />
        </div>
        <div className="min-w-0">
          <p className="text-[#1db954] font-bold text-sm">Поточний пристрій</p>
          <p className="text-white font-semibold text-base truncate">Цей комп'ютер</p>
        </div>
        <div className="ml-auto">
          <span className="w-2 h-2 rounded-full bg-[#1db954] block animate-pulse" />
        </div>
      </div>

      <hr className="border-white/10 mb-4" />

      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Інші пристрої</p>

      {/* No other devices message */}
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[#3e3e3e] flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b3b3b3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Не бачите свій пристрій?</p>
          <p className="text-neutral-400 text-xs mt-1 leading-relaxed">Відкрийте Spotify на іншому пристрої та він з'явиться тут автоматично</p>
        </div>
      </div>

      {/* Footer tip */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-xs text-neutral-600 text-center">
          Відтворення зараз на <span className="text-[#1db954] font-medium">Цьому комп'ютері</span>
        </p>
      </div>
    </div>
  )
}

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
  const [devicePanelOpen, setDevicePanelOpen] = useState(false)
  const speakerBtnRef = useRef<HTMLButtonElement>(null)

  const closePlaylistMenu = useCallback(() => {
    setPlaylistMenuOpen(false)
    setPlaylistMenuAnchor(null)
  }, [])

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = seekBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seekTo(Math.min(1, Math.max(0, ratio)))
  }

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = volumeBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    changeVolume(ratio)
  }

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
      <div className='h-[10%] min-h-16 bg-black text-white flex flex-col justify-center'>

        {/* --- Мобільна панель --- */}
        <div className='flex lg:hidden flex-col w-full'>
          <div
            onClick={() => setIsFullScreen(true)}
            className='w-full bg-[#4d4d4d] h-0.5 cursor-pointer'
          >
            <div className='h-full bg-[#1db954] transition-[width]' style={{ width: `${progress * 100}%` }} />
          </div>
          <div
            onClick={() => setIsFullScreen(true)}
            className='flex items-center justify-between gap-3 px-3 py-2 cursor-pointer active:bg-[#1a1a1a] transition-colors'
          >
            <div className='flex items-center gap-3 min-w-0 flex-1'>
              <img className='w-10 h-10 rounded object-cover shrink-0' src={trackImageUrl} alt={track.name} />
              <div className='min-w-0'>
                <p className='font-medium text-sm truncate'>{track.name}</p>
                <p className='text-xs text-neutral-400 truncate'>{track.desc?.slice(0, 30)}</p>
              </div>
            </div>
            <div className='flex items-center gap-4 shrink-0'>
              <img
                onClick={(e) => { stop(e); previous() }}
                className='w-5 h-5 opacity-80 active:opacity-100 transition'
                src={assets.prev_icon}
                alt="Previous"
              />
              {playStatus ? (
                <img onClick={(e) => { stop(e); pause() }} className='w-9 h-9 active:scale-95 transition' src={assets.pause_icon} alt="Pause" />
              ) : (
                <img onClick={(e) => { stop(e); play() }} className='w-9 h-9 active:scale-95 transition' src={assets.play_icon} alt="Play" />
              )}
              <img
                onClick={(e) => { stop(e); next() }}
                className='w-5 h-5 opacity-80 active:opacity-100 transition'
                src={assets.next_icon}
                alt="Next"
              />
            </div>
          </div>
        </div>

        {/* --- Десктопна панель --- */}
        <div className='hidden lg:flex justify-between items-center px-4 h-full'>

          {/* Ліво: трек + лайк */}
          <div className='flex items-center gap-4 w-1/4 min-w-0'>
            <img className='w-12 h-12 rounded object-cover shrink-0' src={trackImageUrl} alt={track.name} />
            <div className='min-w-0'>
              <p className='font-medium text-sm truncate'>{track.name}</p>
              {(track as any).artist ? (
                <span
                  ref={artistAnchorRef}
                  onClick={(e) => { e.stopPropagation(); setShowArtistPopup(true) }}
                  className='text-xs opacity-70 hover:opacity-100 hover:underline cursor-pointer truncate block transition-opacity'
                >
                  {(track as any).artist}
                </span>
              ) : (
                <p className='text-xs opacity-70 truncate'>{track.desc?.slice(0, 25)}</p>
              )}
            </div>

            {/* Кнопка лайку */}
            <button
              onClick={handleLike}
              className={`shrink-0 flex items-center justify-center w-5 h-5 transition-all ${
                likeAnimating ? 'scale-125' : 'hover:scale-110'
              }`}
              aria-label={liked ? 'Прибрати з улюблених' : 'Додати до улюблених'}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill={liked ? '#1db954' : 'none'}
                stroke={liked ? '#1db954' : '#b3b3b3'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="transition-all duration-200"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            {/* Кнопка "Додати до плейліста" */}
            <button
              onClick={(e) => { e.stopPropagation(); setPlaylistMenuAnchor(e.currentTarget); setPlaylistMenuOpen(true) }}
              className={`shrink-0 flex items-center justify-center w-5 h-5 transition-all hover:scale-110 ${
                playlistMenuOpen ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'
              }`}
              aria-label="Додати до плейліста"
              title="Додати до плейліста"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Центр: контролери */}
          <div className='flex flex-col items-center gap-1 m-auto w-full max-w-160'>
            <div className='flex items-center gap-4'>
              <img
                onClick={toggleShuffle}
                className={`w-4 cursor-pointer transition hover:scale-110 ${shuffle ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                style={shuffle ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
                src={assets.shuffle_icon}
                alt="Shuffle"
              />
              <img onClick={previous} className='w-4 cursor-pointer opacity-80 hover:opacity-100 hover:scale-110 transition' src={assets.prev_icon} alt="Previous" />
              {playStatus ? (
                <img onClick={pause} className='w-8 cursor-pointer hover:scale-105 transition' src={assets.pause_icon} alt="Pause" />
              ) : (
                <img onClick={play} className='w-8 cursor-pointer hover:scale-105 transition' src={assets.play_icon} alt="Play" />
              )}
              <img onClick={next} className='w-4 cursor-pointer opacity-80 hover:opacity-100 hover:scale-110 transition' src={assets.next_icon} alt="Next" />
              <img
                onClick={toggleLoop}
                className={`w-4 cursor-pointer transition hover:scale-110 ${loop ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                style={loop ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
                src={assets.loop_icon}
                alt="Loop"
              />
            </div>
            <div className='flex items-center gap-3 w-full text-xs text-[#b3b3b3]'>
              <p className='w-9 text-right shrink-0'>{formatTime(currentTime)}</p>
              <div
                ref={seekBgRef}
                onClick={handleSeekClick}
                className='flex-1 bg-[#4d4d4d] h-1 rounded-full cursor-pointer group relative'
              >
                <div
                  className='h-1 rounded-full bg-white group-hover:bg-[#1db954] transition-colors relative'
                  style={{ width: `${progress * 100}%` }}
                >
                  <div className='absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition' />
                </div>
              </div>
              <p className='w-9 shrink-0'>{formatTime(totalTime)}</p>
            </div>
          </div>

          {/* Право: гучність та інші */}
          <div className='flex items-center gap-3 opacity-75 hover:opacity-100 transition w-1/4 justify-end'>
            <img className='w-4 cursor-pointer hover:scale-110 transition' src={assets.plays_icon} alt="Plays" />
            <img onClick={() => setIsFullScreen(true)} className='w-4 cursor-pointer hover:scale-110 transition' src={assets.mic_icon} alt="Lyrics" />
            <img className='w-4 cursor-pointer hover:scale-110 transition' src={assets.queue_icon} alt="Queue" />
            <button
              ref={speakerBtnRef}
              onClick={(e) => { e.stopPropagation(); setDevicePanelOpen(v => !v) }}
              className={`relative flex items-center justify-center w-5 h-5 transition hover:scale-110 ${devicePanelOpen ? 'opacity-100' : ''}`}
              title="Підключення до пристрою"
            >
              <img
                className={`w-4 transition ${devicePanelOpen ? '' : 'opacity-75 hover:opacity-100'}`}
                src={assets.speaker_icon}
                alt="Connect to a device"
                style={devicePanelOpen ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
              />
              {devicePanelOpen && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#1db954]" />
              )}
            </button>
            <img className='w-4 cursor-pointer hover:scale-110 transition' src={assets.volume_icon} alt="Volume" />
            <div
              ref={volumeBgRef}
              onClick={handleVolumeClick}
              className='w-20 bg-[#4d4d4d] h-1 rounded cursor-pointer group'
            >
              <div
                className='bg-white group-hover:bg-[#1db954] h-1 rounded transition-colors'
                style={{ width: `${volume * 100}%` }}
              />
            </div>
            <img className='w-4 cursor-pointer hover:scale-110 transition' src={assets.mini_player_icon} alt="Miniplayer" />
            <img onClick={() => setIsFullScreen(true)} className='w-4 cursor-pointer hover:scale-110 transition' src={assets.zoom_icon} alt="Fullscreen" />
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

      {devicePanelOpen && (
        <DevicePanel
          anchorEl={speakerBtnRef.current}
          onClose={() => setDevicePanelOpen(false)}
        />
      )}
    </>
  )
}

export default Player