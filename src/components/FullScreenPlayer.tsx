import React, { useRef, useState, useEffect, useCallback } from 'react'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'
import { useLyrics } from '../hooks/useLyrics'
import { useActiveLyricIndex } from '../hooks/useActiveLyricIndex'

const API = 'http://localhost:5000'

const formatTime = ({ minute, second }: { minute: number; second: number }) =>
  `${minute}:${second.toString().padStart(2, '0')}`

const SECS_PER_LINE = 3

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
    volume,
    changeVolume,
  } = usePlayer()

  const seekBgRef = useRef<HTMLDivElement>(null)
  const volumeBgRef = useRef<HTMLDivElement>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const activeLineRef = useRef<HTMLParagraphElement>(null)
  const userScrolledRef = useRef(false)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── LRCLIB синхронізований текст ──────────────────────────
  const { lines: lrcLines, loading: lrcLoading } = useLyrics(
    track.name,
    (track as any).artist ?? ''
  )
  const activeIndex = useActiveLyricIndex(lrcLines, currentSeconds)

  // Плавний скрол до активного рядка (тільки якщо юзер не скролить вручну)
  useEffect(() => {
    if (userScrolledRef.current) return
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex])

  // ── Fallback: статичний текст з бекенду ───────────────────
  const [staticLyrics, setStaticLyrics] = useState<string | null>(null)
  const [staticStatus, setStaticStatus] = useState<'idle' | 'loading' | 'found' | 'not_found' | 'error'>('idle')
  const [lastTrackId, setLastTrackId] = useState<string | number | null>(null)

  const fetchStaticLyrics = useCallback(async (trackId: string | number) => {
    if ((track as any).lyrics) {
      setStaticLyrics((track as any).lyrics)
      setStaticStatus('found')
      return
    }
    setStaticStatus('loading')
    setStaticLyrics(null)
    try {
      const token = localStorage.getItem('token') ?? ''
      const res = await fetch(`${API}/api/songs/${trackId}/lyrics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (res.ok && data.data?.lyrics) {
        setStaticLyrics(data.data.lyrics)
        setStaticStatus('found')
      } else {
        setStaticStatus('not_found')
      }
    } catch {
      setStaticStatus('error')
    }
  }, [track])

  useEffect(() => {
    if (!isFullScreen || !track?.id) return
    if (track.id === lastTrackId) return
    setLastTrackId(track.id)
    userScrolledRef.current = false
    fetchStaticLyrics(track.id)
  }, [isFullScreen, track?.id, lastTrackId, fetchStaticLyrics])

  useEffect(() => {
    return () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current) }
  }, [])

  // ── iTunes fallback: рівномірний скрол без таймкодів ─────
  const staticLines = staticLyrics ? staticLyrics.split('\n').map(l => l.trim()) : []
  const nonEmptyLines = staticLines.filter(l => l.length > 0)
  const totalLines = nonEmptyLines.length

  const trackDurationStr: string = (track as any).duration ?? '0:30'
  const durationParts = trackDurationStr.split(':').map(Number)
  const fullTrackSec = durationParts.length === 2 ? durationParts[0] * 60 + durationParts[1] : 30
  const isItunes = (track as any).source === 'itunes'
  const previewSec = 30
  const previewOffsetSec = isItunes && fullTrackSec > previewSec ? (fullTrackSec - previewSec) / 2 : 0
  const startLine = totalLines > 0 && fullTrackSec > 0
    ? Math.round(totalLines * (previewOffsetSec / fullTrackSec)) : 0
  const linesInPreview = isItunes && fullTrackSec > 0
    ? Math.round(totalLines * (previewSec / fullTrackSec)) : totalLines
  const secsPerLine = linesInPreview > 0 ? previewSec / linesInPreview : SECS_PER_LINE
  const currentSec = currentTime.minute * 60 + currentTime.second
  const currentLineIndex = Math.min(
    startLine + Math.floor(currentSec / secsPerLine),
    totalLines - 1
  )

  let nonEmptyCount = 0
  const displayLines = staticLines.map((line, i) => {
    if (line.length === 0) return { line, idx: -1, i }
    const idx = nonEmptyCount++
    return { line, idx, i }
  })

  const handleUserScroll = () => {
    userScrolledRef.current = true
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => { userScrolledRef.current = false }, 4000)
  }

  if (!isFullScreen) return null

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = seekBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    seekTo(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)))
  }

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = volumeBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    changeVolume(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)))
  }

  const trackImageUrl = (track.image as string)?.startsWith('http')
    ? track.image
    : `${API}/${track.image}`

  // Визначаємо що показувати: LRCLIB (з таймкодами) або static fallback
  const hasLrc = !lrcLoading && lrcLines && lrcLines.length > 0

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#1a1a1a] to-black z-50 flex flex-col p-4 sm:p-6 md:p-12 text-white transition-all duration-300">

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
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 flex-1 max-w-6xl mx-auto w-full overflow-hidden min-h-0">

        {/* Ліва: обкладинка + назва */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4 sm:gap-6 w-full md:w-2/5 shrink-0">
          <img
            className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-lg object-cover shadow-[0_25px_60px_-12px_rgba(0,0,0,0.8)] transition-transform hover:scale-[1.02]"
            src={trackImageUrl}
            alt={track.name}
          />
          <div className="min-w-0 w-full">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight line-clamp-2">{track.name}</h1>
            <p className="text-neutral-400 text-sm sm:text-base mt-1 line-clamp-1">
              {(track as any).artist || track.desc?.slice(0, 40)}
            </p>
          </div>
        </div>

        {/* Права: текст пісні */}
        <div className="flex-1 w-full h-full min-h-0 flex flex-col">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b3b3b3" strokeWidth="2">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Текст пісні</h2>
            {lrcLoading && (
              <span className="ml-2 flex items-center gap-1.5 text-xs text-neutral-500">
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12"/>
                </svg>
                Завантаження...
              </span>
            )}
            {hasLrc && (
              <span className="ml-2 text-xs text-[#1db954] font-semibold">● синхронізовано</span>
            )}
          </div>

          <div
            ref={lyricsRef}
            onScroll={handleUserScroll}
            className="overflow-y-auto flex-1 pr-2 max-h-[35vh] md:max-h-[65vh] custom-scrollbar"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
          >
            {/* Завантаження LRCLIB */}
            {lrcLoading && (
              <div className="flex flex-col gap-3 mt-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-5 rounded-full bg-neutral-800 animate-pulse"
                    style={{ width: `${55 + (i * 7) % 35}%`, opacity: 1 - i * 0.08 }} />
                ))}
              </div>
            )}

            {/* ✅ LRCLIB — синхронізований текст з таймкодами */}
            {hasLrc && (
              <div className="flex flex-col gap-2 pb-20">
                {lrcLines!.map((line, i) => {
                  const isActive = i === activeIndex
                  const isPast = i < activeIndex
                  return (
                    <p
                      key={i}
                      ref={isActive ? activeLineRef : undefined}
                      onClick={() => seekTo(line.time / (totalTime.minute * 60 + totalTime.second || 1))}
                      className="transition-all duration-300 leading-relaxed cursor-pointer select-text"
                      style={{
                        fontSize: isActive ? '1.6rem' : '1.2rem',
                        fontWeight: isActive ? 800 : 500,
                        color: isActive ? '#ffffff'
                          : isPast ? 'rgba(255,255,255,0.25)'
                          : 'rgba(255,255,255,0.45)',
                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                        transformOrigin: 'left center',
                        textShadow: isActive ? '0 0 24px rgba(29,185,84,0.5)' : 'none',
                        lineHeight: 1.4,
                      }}
                    >
                      {line.text}
                    </p>
                  )
                })}
              </div>
            )}

            {/* Fallback: статичний текст з бекенду (без таймкодів) */}
            {!lrcLoading && !hasLrc && staticStatus === 'loading' && (
              <div className="flex flex-col gap-3 mt-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-5 rounded-full bg-neutral-800 animate-pulse"
                    style={{ width: `${55 + (i * 7) % 35}%` }} />
                ))}
              </div>
            )}

            {!lrcLoading && !hasLrc && staticStatus === 'found' && staticLines.length > 0 && (
              <div className="flex flex-col gap-0.5 pb-20">
                {displayLines.map(({ line, idx, i }) => {
                  if (line.length === 0) return <div key={i} className="h-4" />
                  const isActive = idx === currentLineIndex
                  const isPast = idx < currentLineIndex
                  return (
                    <p
                      key={i}
                      ref={isActive ? activeLineRef : undefined}
                      className={`text-xl sm:text-2xl md:text-3xl font-black leading-snug tracking-tight cursor-default select-text transition-all duration-500 py-0.5 ${
                        isActive ? 'text-white scale-[1.02] origin-left'
                          : isPast ? 'text-neutral-600'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {line}
                    </p>
                  )
                })}
              </div>
            )}

            {!lrcLoading && !hasLrc && (staticStatus === 'not_found' || staticStatus === 'error') && (
              <div className="flex flex-col items-start gap-3 mt-4">
                <p className="text-2xl sm:text-3xl font-black text-neutral-300">
                  Текст пісні для цього треку відсутній.
                </p>
                <p className="text-sm text-neutral-600 mt-1">
                  {staticStatus === 'error' ? 'Помилка при завантаженні. Спробуй пізніше.'
                    : 'Спробуй додати текст вручну через редагування треку.'}
                </p>
              </div>
            )}

            {!lrcLoading && !hasLrc && staticStatus === 'idle' && (
              <p className="text-2xl font-black text-neutral-600">...</p>
            )}
          </div>
        </div>
      </div>

      {/* Керування */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3 pt-6 shrink-0">
        <div className="flex items-center gap-3 w-full text-xs text-[#b3b3b3]">
          <p className="w-9 text-right shrink-0">{formatTime(currentTime)}</p>
          <div ref={seekBgRef} onClick={handleSeekClick}
            className="flex-1 bg-[#4d4d4d] h-1 rounded-full cursor-pointer group relative">
            <div className="h-1 rounded-full bg-white group-hover:bg-[#1db954] transition-colors relative"
              style={{ width: `${progress * 100}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition" />
            </div>
          </div>
          <p className="w-9 shrink-0">{formatTime(totalTime)}</p>
        </div>

        <div className="flex items-center gap-6 sm:gap-8">
          <img onClick={toggleShuffle}
            className={`w-4 h-4 cursor-pointer transition hover:scale-110 ${shuffle ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            style={shuffle ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
            src={assets.shuffle_icon} alt="Shuffle" />
          <img onClick={previous} className="w-5 h-5 cursor-pointer opacity-80 hover:opacity-100 hover:scale-110 transition" src={assets.prev_icon} alt="Previous" />
          {playStatus
            ? <img onClick={pause} className="w-11 h-11 cursor-pointer hover:scale-105 transition" src={assets.pause_icon} alt="Pause" />
            : <img onClick={play} className="w-11 h-11 cursor-pointer hover:scale-105 transition" src={assets.play_icon} alt="Play" />
          }
          <img onClick={next} className="w-5 h-5 cursor-pointer opacity-80 hover:opacity-100 hover:scale-110 transition" src={assets.next_icon} alt="Next" />
          <img onClick={toggleLoop}
            className={`w-4 h-4 cursor-pointer transition hover:scale-110 ${loop ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            style={loop ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
            src={assets.loop_icon} alt="Loop" />
        </div>

        {/* Гучність */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <button onClick={() => changeVolume(volume > 0 ? 0 : 0.7)}
            className="shrink-0 text-neutral-400 hover:text-white transition">
            {volume === 0 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : volume < 0.5 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            )}
          </button>
          <div ref={volumeBgRef} onClick={handleVolumeClick}
            className="flex-1 bg-[#4d4d4d] h-1 rounded-full cursor-pointer group relative">
            <div className="h-1 rounded-full bg-white group-hover:bg-[#1db954] transition-colors relative"
              style={{ width: `${volume * 100}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition" />
            </div>
          </div>
          <span className="text-xs text-neutral-500 w-8 text-right shrink-0">{Math.round(volume * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

export default FullScreenPlayer
