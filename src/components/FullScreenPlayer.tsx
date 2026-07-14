import React, { useRef, useState, useEffect, useCallback } from 'react'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'
import { useLyrics } from '../hooks/useLyrics'
import { useActiveLyricIndex } from '../hooks/useActiveLyricIndex'
import { useLanguage } from '../context/LanguageContext'

const formatTime = ({ minute, second }: { minute: number; second: number }) =>
  `${minute}:${second.toString().padStart(2, '0')}`

const SECS_PER_LINE = 3
const API = 'http://localhost:5000'

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

  const { t } = useLanguage()

  const seekBgRef = useRef<HTMLDivElement>(null)
  const mobileSeekBgRef = useRef<HTMLDivElement>(null)
  const volumeBgRef = useRef<HTMLDivElement>(null)
  const mobileVolumeBgRef = useRef<HTMLDivElement>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const activeLineRef = useRef<HTMLParagraphElement>(null)
  const userScrolledRef = useRef(false)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isDraggingVolume, setIsDraggingVolume] = useState(false)
  const [isDraggingMobileVolume, setIsDraggingMobileVolume] = useState(false)
  const [isDraggingSeek, setIsDraggingSeek] = useState(false)
  const [mobileTab, setMobileTab] = useState<'player' | 'lyrics'>('player')

  // ── LRCLIB синхронізований текст ──────────────────────────
  const { lines: lrcLines, loading: lrcLoading } = useLyrics(
    track?.name ?? '',
    (track as any)?.artist ?? ''
  )
  const activeIndex = useActiveLyricIndex(lrcLines, currentSeconds)

  // ── Функция расчета громкости ──
  const updateVolumePosition = useCallback((clientX: number) => {
    const el = volumeBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    changeVolume(Math.min(1, Math.max(0, ratio)))
  }, [changeVolume])

  // ── Вертикальна гучність для мобілки (знизу вгору) ──
  const updateMobileVolumePosition = useCallback((clientY: number) => {
    const el = mobileVolumeBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = 1 - (clientY - rect.top) / rect.height
    changeVolume(Math.min(1, Math.max(0, ratio)))
  }, [changeVolume])

  // ── Функция расчета позиции трека ──
  const updateSeekPosition = useCallback((clientX: number) => {
    // Определяем, какой из двух прогресс-баров сейчас активен/виден
    const el = seekBgRef.current?.getBoundingClientRect().width ? seekBgRef.current : mobileSeekBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    seekTo(Math.min(1, Math.max(0, ratio)))
  }, [seekTo])

  // Handler для начала перетаскивания таймлайна (мышь и тач)
  const handleSeekMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setIsDraggingSeek(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    updateSeekPosition(clientX)
  }

  // ── Глобальные слушатели для громкости и перемотки трека ──
  useEffect(() => {
    if (!isDraggingVolume && !isDraggingSeek) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingVolume) updateVolumePosition(e.clientX)
      if (isDraggingSeek) updateSeekPosition(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        if (isDraggingVolume) updateVolumePosition(e.touches[0].clientX)
        if (isDraggingSeek) updateSeekPosition(e.touches[0].clientX)
      }
    }

    const handleMouseUp = () => {
      setIsDraggingVolume(false)
      setIsDraggingSeek(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchend', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDraggingVolume, isDraggingSeek, updateVolumePosition, updateSeekPosition])

  // ── Глобальні слухачі для вертикального слайдера мобілки ──
  useEffect(() => {
    if (!isDraggingMobileVolume) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      updateMobileVolumePosition(clientY)
    }
    const handleUp = () => setIsDraggingMobileVolume(false)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDraggingMobileVolume, updateMobileVolumePosition])

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
    if ((track as any)?.lyrics) {
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
    const trackId = track.id
    if (trackId === lastTrackId) return
    setLastTrackId(trackId)
    userScrolledRef.current = false
    fetchStaticLyrics(trackId)
  }, [isFullScreen, track?.id, lastTrackId, fetchStaticLyrics])

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [])

  const handleUserScroll = () => {
    userScrolledRef.current = true
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => { userScrolledRef.current = false }, 4000)
  }

  const handleVolumeMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setIsDraggingVolume(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    updateVolumePosition(clientX)
  }

  if (!isFullScreen || !track) return null

  const staticLines = staticLyrics ? staticLyrics.split('\n').map(l => l.trim()) : []
  const nonEmptyLines = staticLines.filter(l => l.length > 0)
  const totalLines = nonEmptyLines.length

  const trackDurationStr: string = (track as any)?.duration ?? '0:30'
  const durationParts = trackDurationStr.split(':').map(Number)
  const fullTrackSec = durationParts.length === 2 ? durationParts[0] * 60 + durationParts[1] : 30
  const isItunes = (track as any)?.source === 'itunes'
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

  const trackImageUrl = (track.image as string)?.startsWith('http')
    ? track.image
    : `${API}/${track.image}`

  const hasLrc = !lrcLoading && lrcLines && lrcLines.length > 0

  const renderLyricsContent = (isMobileLayout: boolean) => (
    <div className="flex-1 w-full h-full min-h-0 flex flex-col">
      <div className="hidden md:flex items-center gap-2 mb-4 shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b3b3b3" strokeWidth="2">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">{t('playerLyricsTitle' as any)}</h2>
        {lrcLoading && <span className="ml-2 text-xs text-neutral-500 animate-pulse">{t('loading' as any)}</span>}
        {hasLrc && !isItunes && <span className="ml-2 text-xs text-[#1db954] font-semibold">{t('playerSynced' as any)}</span>}
        {isItunes && <span className="ml-2 text-xs text-neutral-500">{t('playerPreviewNoSync' as any)}</span>}
      </div>

      <div
        ref={isMobileLayout ? undefined : lyricsRef}
        onScroll={handleUserScroll}
        className={`overflow-y-auto flex-1 pr-2 custom-scrollbar ${isMobileLayout ? 'max-h-[55vh] text-center md:text-left' : 'max-h-[65vh]'}`}
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
      >
        {lrcLoading && (
          <div className="flex flex-col gap-3 mt-4 items-center md:items-start">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-5 rounded-full bg-neutral-800 animate-pulse"
                style={{ width: `${60 + (i * 7) % 30}%`, opacity: 1 - i * 0.08 }} />
            ))}
          </div>
        )}

        {hasLrc && (
          <div className="flex flex-col gap-3 pb-20">
            {lrcLines!.map((line, i) => {
              // Для iTunes прев'ю LRC таймкоди від повного треку — offset невідомий,
              // тому підсвічування вимикаємо щоб не йшло не в такт
              const isActive = !isItunes && i === activeIndex
              const isPast = !isItunes && i < activeIndex
              return (
                <p
                  key={i}
                  ref={isActive && !isMobileLayout ? activeLineRef : undefined}
                  onClick={() => seekTo(line.time / (totalTime.minute * 60 + totalTime.second || 1))}
                  className="transition-all duration-300 leading-relaxed cursor-pointer select-text"
                  style={{
                    fontSize: isActive ? (isMobileLayout ? '1.4rem' : '1.6rem') : (isMobileLayout ? '1.1rem' : '1.2rem'),
                    fontWeight: isActive ? 800 : 500,
                    color: isActive ? '#ffffff' : isPast ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: isMobileLayout ? 'center center' : 'left center',
                    textShadow: isActive ? '0 0 24px rgba(29,185,84,0.5)' : 'none',
                  }}
                >
                  {line.text}
                </p>
              )
            })}
          </div>
        )}

        {!lrcLoading && !hasLrc && staticStatus === 'loading' && (
          <div className="flex flex-col gap-3 mt-4 items-center md:items-start">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-5 rounded-full bg-neutral-800 animate-pulse" style={{ width: `${55 + (i * 7) % 35}%` }} />
            ))}
          </div>
        )}

        {!lrcLoading && !hasLrc && staticStatus === 'found' && staticLines.length > 0 && (
          <div className="flex flex-col gap-2 pb-20">
            {displayLines.map(({ line, idx, i }) => {
              if (line.length === 0) return <div key={i} className="h-4" />
              // Для iTunes прев'ю offset невідомий — підсвічування буде брехнею,
              // тому просто показуємо весь текст однаково без активного рядка
              const isActive = !isItunes && idx === currentLineIndex
              const isPast = !isItunes && idx < currentLineIndex
              return (
                <p
                  key={i}
                  ref={isActive && !isMobileLayout ? activeLineRef : undefined}
                  className={`text-lg sm:text-xl md:text-3xl font-black leading-snug tracking-tight transition-all duration-500 py-0.5 ${isActive ? 'text-white scale-[1.02] origin-center md:origin-left'
                    : isPast ? 'text-neutral-600' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                >
                  {line}
                </p>
              )
            })}
          </div>
        )}

        {!lrcLoading && !hasLrc && (staticStatus === 'not_found' || staticStatus === 'error') && (
          <div className="flex flex-col items-center md:items-start gap-3 mt-4">
            <p className="text-xl sm:text-2xl font-black text-neutral-300 text-center md:text-left">
              {t('playerNoLyrics' as any)}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#1a1a1a] to-black z-50 flex flex-col text-white select-none overflow-hidden"
      style={{padding: 'clamp(16px, 3vw, 48px)'}}>

      {/* Шапка плеера */}
      <div className="flex justify-between items-center w-full max-w-6xl mx-auto mb-4 shrink-0">
        <button
          onClick={() => setIsFullScreen(false)}
          className="text-neutral-400 hover:text-white hover:scale-105 transition flex items-center gap-2 font-medium text-sm"
        >
          ✕ <span className="hidden sm:inline">{t('playerCollapse' as any)}</span>
        </button>

        <div className="flex md:hidden bg-neutral-900 rounded-full p-1 border border-neutral-800">
          <button
            onClick={() => setMobileTab('player')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mobileTab === 'player' ? 'bg-white text-black' : 'text-neutral-400'}`}
          >
            {t('playerTrackTab' as any)}
          </button>
          <button
            onClick={() => setMobileTab('lyrics')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mobileTab === 'lyrics' ? 'bg-white text-black' : 'text-neutral-400'}`}
          >
            {t('playerLyricsTab' as any)}
          </button>
        </div>

        <p className="hidden md:block text-xs uppercase tracking-widest text-neutral-400 font-bold">{t('nowPlaying' as any)}</p>
        <div className="w-16 hidden md:block"></div>
      </div>

      {/* ── ДЕСКТОПНА СІТКА ── */}
      <div className="hidden md:flex flex-row items-center justify-center gap-10 lg:gap-16 flex-1 max-w-6xl mx-auto w-full min-h-0 overflow-hidden">

        {/* Ліва колонка: обкладинка + назва */}
        <div className="flex flex-col items-start gap-5 shrink-0" style={{width: 'clamp(220px, 30vw, 360px)'}}>
          <img
            className="rounded-xl object-cover shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] w-full aspect-square"
            src={trackImageUrl}
            alt={track.name}
          />
          <div className="w-full min-w-0">
            <h1 className="font-black tracking-tight leading-tight truncate w-full"
              style={{fontSize: 'clamp(1.1rem, 2vw, 1.75rem)'}}>
              {track.name}
            </h1>
            <p className="text-neutral-400 mt-1 truncate w-full" style={{fontSize: 'clamp(0.8rem, 1.2vw, 1rem)'}}>
              {(track as any).artist || track.desc?.slice(0, 40)}
            </p>
          </div>
        </div>

        {/* Права колонка: текст пісні */}
        <div className="flex-1 min-w-0 h-full min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b3b3b3" strokeWidth="2">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">{t('playerLyricsTitle' as any)}</h2>
            {lrcLoading && <span className="ml-2 text-xs text-neutral-500 animate-pulse">{t('loading' as any)}</span>}
            {hasLrc && <span className="ml-2 text-xs text-[#1db954] font-semibold">{t('playerSynced' as any)}</span>}
          </div>

          <div
            ref={lyricsRef}
            onScroll={handleUserScroll}
            className="overflow-y-auto flex-1 min-h-0 pr-3"
            style={{scrollbarWidth: 'thin', scrollbarColor: '#333 transparent'}}
          >
            {lrcLoading && (
              <div className="flex flex-col gap-3 mt-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-5 rounded-full bg-neutral-800 animate-pulse"
                    style={{width: `${60 + (i * 7) % 30}%`, opacity: 1 - i * 0.08}} />
                ))}
              </div>
            )}

            {hasLrc && (
              <div className="flex flex-col gap-2 pb-8">
                {lrcLines!.map((line, i) => {
                  const isActive = i === activeIndex
                  const isPast = i < activeIndex
                  return (
                    <p
                      key={i}
                      ref={isActive ? activeLineRef : undefined}
                      onClick={() => seekTo(line.time / (totalTime.minute * 60 + totalTime.second || 1))}
                      className="transition-all duration-300 leading-snug cursor-pointer select-text break-words"
                      style={{
                        fontSize: isActive ? 'clamp(1.1rem, 2vw, 1.5rem)' : 'clamp(0.9rem, 1.5vw, 1.15rem)',
                        fontWeight: isActive ? 800 : 500,
                        color: isActive ? '#ffffff' : isPast ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)',
                        textShadow: isActive ? '0 0 24px rgba(29,185,84,0.5)' : 'none',
                      }}
                    >
                      {line.text}
                    </p>
                  )
                })}
              </div>
            )}

            {!lrcLoading && !hasLrc && staticStatus === 'loading' && (
              <div className="flex flex-col gap-3 mt-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-5 rounded-full bg-neutral-800 animate-pulse" style={{width: `${55 + (i * 7) % 35}%`}} />
                ))}
              </div>
            )}

            {!lrcLoading && !hasLrc && staticStatus === 'found' && staticLines.length > 0 && (
              <div className="flex flex-col gap-1.5 pb-8">
                {displayLines.map(({line, idx, i}) => {
                  if (line.length === 0) return <div key={i} className="h-3" />
                  const isActive = idx === currentLineIndex
                  const isPast = idx < currentLineIndex
                  return (
                    <p
                      key={i}
                      ref={isActive ? activeLineRef : undefined}
                      className="leading-snug transition-all duration-500 break-words"
                      style={{
                        fontSize: isActive ? 'clamp(1rem, 1.8vw, 1.4rem)' : 'clamp(0.85rem, 1.4vw, 1.1rem)',
                        fontWeight: isActive ? 800 : 600,
                        color: isActive ? '#fff' : isPast ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)',
                      }}
                    >
                      {line}
                    </p>
                  )
                })}
              </div>
            )}

            {!lrcLoading && !hasLrc && (staticStatus === 'not_found' || staticStatus === 'error') && (
              <p className="text-lg font-bold text-neutral-400 mt-2">
                {t('playerNoLyrics' as any)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── МОБІЛЬНА СІТКА ── */}
      <div className="flex md:hidden flex-col flex-1 items-center justify-center w-full min-h-0">
        {mobileTab === 'player' ? (
          <div className="flex flex-row items-center justify-center w-full flex-1 gap-4 py-4 animate-fadeIn">

            {/* Вертикальний слайдер гучності зліва */}
            <div className="flex flex-col items-center gap-2 h-64 sm:h-72 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-400 shrink-0">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
              <div
                ref={mobileVolumeBgRef}
                onMouseDown={(e) => { setIsDraggingMobileVolume(true); updateMobileVolumePosition(e.clientY) }}
                onTouchStart={(e) => { setIsDraggingMobileVolume(true); updateMobileVolumePosition(e.touches[0].clientY) }}
                className="flex-1 w-1.5 bg-neutral-700 rounded-full cursor-pointer relative flex flex-col-reverse"
              >
                <div
                  className={`w-full rounded-full transition-colors ${isDraggingMobileVolume ? 'bg-[#1db954]' : 'bg-neutral-300'}`}
                  style={{height: `${volume * 100}%`}}
                >
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg transition-opacity ${isDraggingMobileVolume ? 'opacity-100' : 'opacity-70'}`}
                    style={{top: `${(1 - volume) * 100}%`, transform: 'translate(-50%, -50%)'}}
                  />
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-400 shrink-0">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              </svg>
            </div>

            {/* Права частина: обкладинка + назва + прогрес */}
            <div className="flex flex-col items-center text-center gap-4 flex-1 min-w-0">
              <img
                className="w-52 h-52 sm:w-64 sm:h-64 rounded-xl object-cover shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
                src={trackImageUrl}
                alt={track.name}
              />
              <div className="w-full px-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">{track.name}</h1>
                <p className="text-neutral-400 text-sm mt-0.5 truncate">
                  {(track as any).artist || track.desc?.slice(0, 40)}
                </p>
              </div>

              <div className="w-full flex items-center gap-2 text-[10px] text-neutral-400">
                <p className="w-7 text-right shrink-0">{formatTime(currentTime)}</p>
                <div
                  ref={mobileSeekBgRef}
                  onMouseDown={handleSeekMouseDown}
                  onTouchStart={handleSeekMouseDown}
                  className="flex-1 bg-neutral-800 h-1.5 rounded-full relative cursor-pointer select-none"
                >
                  <div className="h-1.5 rounded-full bg-white" style={{width: `${progress * 100}%`}}>
                    <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white transition-opacity ${isDraggingSeek ? 'opacity-100 bg-[#1db954]' : 'opacity-0'}`} />
                  </div>
                </div>
                <p className="w-7 text-left shrink-0">{formatTime(totalTime)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full px-2 py-4 overflow-hidden flex flex-col animate-fadeIn">
            {renderLyricsContent(true)}
          </div>
        )}
      </div>

      {/* Панель управління */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3 pt-4 shrink-0 border-t border-neutral-900 md:border-none">

        {/* Прогрес-бар десктоп */}
        <div className="hidden md:flex items-center gap-3 w-full text-xs text-[#b3b3b3]">
          <p className="w-9 text-right shrink-0">{formatTime(currentTime)}</p>
          <div
            ref={seekBgRef}
            onMouseDown={handleSeekMouseDown}
            className="flex-1 bg-[#4d4d4d] h-1 rounded-full cursor-pointer group relative select-none"
          >
            <div className="h-1 rounded-full bg-white group-hover:bg-[#1db954] transition-colors relative" style={{width: `${progress * 100}%`}}>
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white transition-opacity ${isDraggingSeek ? 'opacity-100 bg-[#1db954]' : 'opacity-0 group-hover:opacity-100'}`} />
            </div>
          </div>
          <p className="w-9 shrink-0">{formatTime(totalTime)}</p>
        </div>

        {/* Кнопки керування */}
        <div className="flex items-center gap-6 sm:gap-8 md:gap-10">
          <img onClick={toggleShuffle}
            className={`w-4 h-4 md:w-5 md:h-5 cursor-pointer transition hover:scale-110 ${shuffle ? 'opacity-100' : 'opacity-70'}`}
            style={shuffle ? {filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)'} : undefined}
            src={assets.shuffle_icon} alt="Shuffle"
          />
          <img onClick={previous} className="w-5 h-5 md:w-6 md:h-6 cursor-pointer opacity-80 hover:opacity-100 hover:scale-110 transition" src={assets.prev_icon} alt="Previous" />
          {playStatus
            ? <img onClick={pause} className="w-12 h-12 md:w-14 md:h-14 cursor-pointer hover:scale-105 transition" src={assets.pause_icon} alt="Pause" />
            : <img onClick={play} className="w-12 h-12 md:w-14 md:h-14 cursor-pointer hover:scale-105 transition" src={assets.play_icon} alt="Play" />
          }
          <img onClick={next} className="w-5 h-5 md:w-6 md:h-6 cursor-pointer opacity-80 hover:opacity-100 hover:scale-110 transition" src={assets.next_icon} alt="Next" />
          <img onClick={toggleLoop}
            className={`w-4 h-4 md:w-5 md:h-5 cursor-pointer transition hover:scale-110 ${loop ? 'opacity-100' : 'opacity-70'}`}
            style={loop ? {filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)'} : undefined}
            src={assets.loop_icon} alt="Loop"
          />
        </div>

        {/* Гучність десктоп */}
        <div className="hidden md:flex items-center gap-3 w-full max-w-xs">
          <button onClick={() => changeVolume(volume > 0 ? 0 : 0.7)} className="shrink-0 text-neutral-400 hover:text-white transition">
            {volume === 0 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
            ) : volume < 0.5 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
            )}
          </button>
          <div ref={volumeBgRef} onMouseDown={handleVolumeMouseDown} onTouchStart={handleVolumeMouseDown}
            className="flex-1 bg-[#4d4d4d] h-1 rounded-full cursor-pointer group relative flex items-center">
            <div className="h-1 rounded-full bg-white group-hover:bg-[#1db954] transition-colors relative flex items-center" style={{width: `${volume * 100}%`}}>
              <div className={`absolute right-0 w-3 h-3 rounded-full bg-white transition-opacity ${isDraggingVolume ? 'opacity-100 bg-[#1db954]' : 'opacity-0 group-hover:opacity-100'}`} style={{transform: 'translateX(50%)'}} />
            </div>
          </div>
          <span className="text-xs text-neutral-500 w-8 text-right shrink-0">{Math.round(volume * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

export default FullScreenPlayer