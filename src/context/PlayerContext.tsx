import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

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
  track: Song
  playStatus: boolean
  currentTime: TimeParts
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
  refreshSongs: () => Promise<void>
  addSongs: (songs: Song[]) => void
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

  const [songsData, setSongsData] = useState<Song[]>([])
  const [trackId, setTrackId] = useState<Song['id'] | null>(null)

  const [playStatus, setPlayStatus] = useState(false)
  const [currentTime, setCurrentTime] = useState<TimeParts>({ minute: 0, second: 0 })
  const [totalTime, setTotalTime] = useState<TimeParts>({ minute: 0, second: 0 })
  const [progress, setProgress] = useState(0)
  const [volume, setVolumeState] = useState(0.7)
  const [shuffle, setShuffle] = useState(false)
  const [loop, setLoop] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const track = songsData.find((s) => s.id === trackId) ?? null

  const fetchSongs = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/songs')
      if (!response.ok) return
      const resData = await response.json()
      const raw = Array.isArray(resData) ? resData : (resData.data || [])

      const normalized: Song[] = raw.map((song: any) => ({
        ...song,
        id: song.id ?? song._id,
      }))

      setSongsData(normalized)

      setTrackId((prev) => {
        if (prev !== null) return prev
        return normalized.length > 0 ? normalized[0].id : null
      })
    } catch (error) {
      console.error('Помилка завантаження пісень:', error)
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
      try {
        if (currentBlobUrl.current) {
          URL.revokeObjectURL(currentBlobUrl.current)
          currentBlobUrl.current = null
        }

        let blobUrl: string
        if (token) {
          blobUrl = await fetchSecureAudio(song.id, token)
        } else {
          blobUrl = song.file?.startsWith("http") ? song.file : `${API_BASE}/${song.file}`
        }

        if (cancelled) {
          URL.revokeObjectURL(blobUrl)
          return
        }

        currentBlobUrl.current = blobUrl
        audio.src = blobUrl
        audio.load()
        audio.volume = volume

        if (shouldAutoPlay.current) {
          audio.play()
            .then(() => setPlayStatus(true))
            .catch(() => setPlayStatus(false))
        }
      } catch (err) {
        console.error("Помилка завантаження аудіо:", err)
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
      setCurrentTime(toParts(audio.currentTime))
      setTotalTime(toParts(audio.duration))
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    }
    const handleLoadedMetadata = () => {
      setTotalTime(toParts(audio.duration))
    }
    const handleEnded = () => {
      if (loop) {
        audio.currentTime = 0
        audio.play()
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
    setPlayStatus(true)
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
  }

  const nextTrack = () => {
    if (songsData.length === 0) return
    const index = songsData.findIndex((s) => s.id === trackId)

    shouldAutoPlay.current = true

    if (shuffle) {
      let r = Math.floor(Math.random() * songsData.length)
      while (r === index && songsData.length > 1) r = Math.floor(Math.random() * songsData.length)
      setTrackId(songsData[r].id)
      return
    }

    const next = (index + 1) % songsData.length
    setTrackId(songsData[next].id)
  }

  const previous = () => {
    if (songsData.length === 0) return
    const index = songsData.findIndex((s) => s.id === trackId)
    const prev = (index - 1 + songsData.length) % songsData.length
    shouldAutoPlay.current = true
    setTrackId(songsData[prev].id)
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
    if (audioRef.current) audioRef.current.volume = clamped
  }

  const toggleShuffle = () => setShuffle((s) => !s)
  const toggleLoop = () => setLoop((l) => !l)

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
    track: currentTrack,
    playStatus,
    currentTime,
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
    refreshSongs: fetchSongs,
    addSongs,
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  )
}

export default PlayerContextProvider