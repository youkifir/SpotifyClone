import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch, isOfflineError, ApiError } from '../utils/apiError'

export interface Song {
  id: number | string
  name: string
  image: string
  file: string
  desc: string
  duration: string
  lyrics?: string
  artist?: string
}

interface TimeParts {
  minute: number
  second: number
}

interface PlayerContextType {
  audioRef: React.RefObject<HTMLAudioElement | null>
  songsData: Song[]
  songsLoading: boolean
  songsError: string | null
  track: Song
  _hasTrack: boolean
  playStatus: boolean
  currentTime: TimeParts
  currentSeconds: number   // точний час у секундах з дробовою частиною (для синхронізації тексту)
  totalTime: TimeParts
  progress: number
  volume: number
  shuffle: boolean
  loop: boolean
  isFullScreen: boolean
  setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>>
  play: () => void
  pause: () => void
  playWithId: (id: Song['id']) => void
  previous: () => void
  next: () => void
  seekTo: (ratio: number) => void
  changeVolume: (ratio: number) => void
  toggleShuffle: () => void
  toggleLoop: () => void
  audioError: string | null
  clearAudioError: () => void
  refreshSongs: () => Promise<void>
  addSongs: (songs: Song[]) => void
  setQueue: (songs: Song[]) => void
  clearQueue: () => void
  // Список, за яким зараз рухаються next/previous/shuffle: або явна черга
  // (наприклад, трек-лист плейлиста), або весь каталог, якщо черга не задана.
  // Потрібен для панелі "Черга відтворення" зліва від гучності.
  activeQueue: Song[]
}

// eslint-disable-next-line react-refresh/only-export-components
export const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

const toParts = (seconds: number): TimeParts => {
  if (!seconds || Number.isNaN(seconds)) return { minute: 0, second: 0 }
  const minute = Math.floor(seconds / 60)
  const second = Math.floor(seconds % 60)
  return { minute, second }
}

const API_BASE = 'http://localhost:5000'

// Завантажує аудіо через захищений проксі і повертає Blob URL
// щоб оригінальна iTunes/локальна URL ніколи не потрапляла в браузер
async function fetchSecureAudio(songId: string | number, token: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/audio/stream/${songId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Не вдалося завантажити аудіо')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export const PlayerContextProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // true тільки якщо юзер сам натиснув play/трек — не при першому завантаженні
  const shouldAutoPlay = useRef(false)
  // Зберігаємо поточний Blob URL щоб звільняти пам'ять
  const currentBlobUrl = useRef<string | null>(null)
  // Трекер прослуховувань: щоб рахувати тільки після 10 секунд реального прослуховування
  const playCountedRef = useRef<Set<string | number>>(new Set())
  const playSecondsRef = useRef(0)
  const lastTimeRef = useRef(0)

  const [songsData, setSongsData] = useState<Song[]>([])
  const [songsLoading, setSongsLoading] = useState(true)
  const [songsError, setSongsError] = useState<string | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [trackId, setTrackId] = useState<Song['id'] | null>(null)

  const [playStatus, setPlayStatus] = useState(false)
  const [currentTime, setCurrentTime] = useState<TimeParts>({ minute: 0, second: 0 })
  const [currentSeconds, setCurrentSeconds] = useState(0)
  const [totalTime, setTotalTime] = useState<TimeParts>({ minute: 0, second: 0 })
  const [progress, setProgress] = useState(0)
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('playerVolume')
    return saved !== null ? parseFloat(saved) : 0.7
  })
  const [shuffle, setShuffle] = useState(false)
  const [loop, setLoop] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Активна черга — якщо встановлена, next/previous/shuffle ходять по ній.
  // null = режим «всі пісні» (songsData)
  const [queue, setQueueState] = useState<Song[] | null>(null)

  // Поточний список для навігації: черга або всі пісні
  const activeList = queue ?? songsData

  const track = songsData.find((s) => s.id === trackId) ?? null

  const fetchSongs = useCallback(async () => {
    setSongsLoading(true)
    setSongsError(null)
    try {
      const response = await apiFetch('http://localhost:5000/api/songs')
      const resData = await response.json()
      const raw = Array.isArray(resData) ? resData : (resData.data || [])

      const normalized: Song[] = raw.map((song: any) => ({
        ...song,
        id: song.id ?? song._id,
      }))

      setSongsData(normalized)
    } catch (error) {
      console.error('Помилка завантаження пісень:', error)
      if (isOfflineError(error)) {
        setSongsError('network')
      } else if (error instanceof ApiError) {
        setSongsError(error.kind)
      } else {
        setSongsError('unknown')
      }
    } finally {
      setSongsLoading(false)
    }
  }, [])

  // Додає нові треки в глобальний список (без дублікатів).
  // Використовується сторінкою артиста, щоб треки можна було програти.
  const addSongs = useCallback((newSongs: Song[]) => {
    setSongsData((prev) => {
      const existingIds = new Set(prev.map((s) => String(s.id)))
      const toAdd = newSongs.filter((s) => !existingIds.has(String(s.id)))
      if (toAdd.length === 0) return prev
      return [...prev, ...toAdd]
    })
  }, [])

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || trackId === null) return

    const song = songsData.find((s) => s.id === trackId)
    if (!song) return

    const token = localStorage.getItem('token') ?? sessionStorage.getItem('token') ?? ''

    let cancelled = false

    const loadAudio = async () => {
      setAudioError(null)
      try {
        if (currentBlobUrl.current) {
          URL.revokeObjectURL(currentBlobUrl.current)
          currentBlobUrl.current = null
        }

        // Always load via secure proxy - direct URL never reaches the browser
        const blobUrl = await fetchSecureAudio(song.id, token)

        if (cancelled) {
          URL.revokeObjectURL(blobUrl)
          return
        }

        currentBlobUrl.current = blobUrl
        audio.src = blobUrl
        audio.load()
        audio.volume = volume

        if (shouldAutoPlay.current) {
          const playPromise = audio.play()
          if (playPromise !== undefined) {
            playPromise
              .then(() => setPlayStatus(true))
              .catch((err: Error) => {
                if (err.name === 'AbortError') return
                setPlayStatus(false)
              })
          }
        }
      } catch (err) {
        if (cancelled) return
        console.error("Помилка завантаження аудіо:", err)
        if (isOfflineError(err)) {
          setAudioError('Немає з\'єднання. Перевір мережу.')
        } else if (err instanceof ApiError && err.kind === 'auth') {
          setAudioError('Потрібна авторизація для відтворення.')
        } else {
          setAudioError('Не вдалося завантажити аудіо.')
        }
        setPlayStatus(false)
      }
    }

    loadAudio()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const currentT = audio.currentTime

      // Підраховуємо реальний час прослуховування (не перемотку)
      if (lastTimeRef.current > 0) {
        const delta = currentT - lastTimeRef.current
        // delta між 0 і 2 сек — нормальне відтворення (не перемотка)
        if (delta > 0 && delta < 2) {
          playSecondsRef.current += delta
        }
      }
      lastTimeRef.current = currentT

      // Після 10 секунд реального прослуховування — рахуємо прослуховування
      if (playSecondsRef.current >= 10 && trackId !== null && !playCountedRef.current.has(trackId)) {
        playCountedRef.current.add(trackId)
        const token = localStorage.getItem('token') ?? sessionStorage.getItem('token') ?? ''
        fetch(`${API_BASE}/api/songs/${trackId}/play`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).catch(() => {/* ignore errors */})
      }

      setCurrentTime(toParts(currentT))
      setCurrentSeconds(currentT)
      setTotalTime(toParts(audio.duration))
      setProgress(audio.duration ? currentT / audio.duration : 0)
    }
    const handleLoadedMetadata = () => {
      setTotalTime(toParts(audio.duration))
    }
    const handleEnded = () => {
      if (loop) {
        audio.currentTime = 0
        audio.play().catch((err: Error) => { if (err.name !== 'AbortError') console.error(err) })
      } else {
        nextTrack()
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, loop, shuffle, songsData])

  const play = () => {
    const audio = audioRef.current
    if (!audio || !track) return
    audio.play()
      .then(() => setPlayStatus(true))
      .catch((err: Error) => { if (err.name !== 'AbortError') console.error(err) })
  }

  const pause = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    setPlayStatus(false)
  }

  const playWithId = (id: Song['id']) => {
    if (songsData.length === 0) return

    if (trackId === id) {
      if (playStatus) pause()
      else play()
      return
    }
    shouldAutoPlay.current = true
    setTrackId(id)
    // Скидаємо лічильник секунд для нового треку
    playSecondsRef.current = 0
    lastTimeRef.current = 0
  }

  const nextTrack = () => {
    if (activeList.length === 0) return
    const index = activeList.findIndex((s) => s.id === trackId)

    shouldAutoPlay.current = true
    playSecondsRef.current = 0
    lastTimeRef.current = 0

    if (shuffle) {
      let r = Math.floor(Math.random() * activeList.length)
      while (r === index && activeList.length > 1) r = Math.floor(Math.random() * activeList.length)
      setTrackId(activeList[r].id)
      return
    }

    const next = (index + 1) % activeList.length
    setTrackId(activeList[next].id)
  }

  const previous = () => {
    if (activeList.length === 0) return
    const index = activeList.findIndex((s) => s.id === trackId)
    const prev = (index - 1 + activeList.length) % activeList.length
    shouldAutoPlay.current = true
    playSecondsRef.current = 0
    lastTimeRef.current = 0
    setTrackId(activeList[prev].id)
  }

  const next = nextTrack

  const seekTo = (ratio: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = ratio * audio.duration
  }

  const changeVolume = (ratio: number) => {
    const clamped = Math.min(1, Math.max(0, ratio))
    setVolumeState(clamped)
    localStorage.setItem('playerVolume', String(clamped))
    if (audioRef.current) audioRef.current.volume = clamped
  }

  const toggleShuffle = () => setShuffle((s) => !s)
  const toggleLoop = () => setLoop((l) => !l)
  const clearAudioError = () => setAudioError(null)

  // Встановити чергу (наприклад, пісні плейліста).
  // Треки також додаються в songsData щоб аудіо міг завантажитись.
  const setQueue = (songs: Song[]) => {
    addSongs(songs)
    setQueueState(songs)
  }

  // Скинути чергу — повернутись до режиму «всі пісні»
  const clearQueue = () => setQueueState(null)

  const currentTrack: Song = track ?? {
    id: '',
    name: 'Немає треків',
    image: '',
    file: '',
    desc: '',
    duration: '0:00',
  }

  const value: PlayerContextType = {
    audioRef,
    songsData,
    songsLoading,
    songsError,
    track: currentTrack,
    _hasTrack: track !== null,
    playStatus,
    currentTime,
    currentSeconds,
    totalTime,
    progress,
    volume,
    shuffle,
    loop,
    isFullScreen,
    setIsFullScreen,
    play,
    pause,
    playWithId,
    previous,
    next,
    seekTo,
    changeVolume,
    toggleShuffle,
    toggleLoop,
    audioError,
    clearAudioError,
    refreshSongs: fetchSongs,
    addSongs,
    setQueue,
    clearQueue,
    activeQueue: activeList,
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  )
}

export default PlayerContextProvider