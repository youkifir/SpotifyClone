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
  refreshSongs: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

const toParts = (seconds: number): TimeParts => {
  if (!seconds || Number.isNaN(seconds)) return { minute: 0, second: 0 }
  const minute = Math.floor(seconds / 60)
  const second = Math.floor(seconds % 60)
  return { minute, second }
}

const resolveUrl = (file: string) =>
  file?.startsWith('http') ? file : `http://localhost:5000/${file}`

export const PlayerContextProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [songsData, setSongsData] = useState<Song[]>([])
  // Зберігаємо лише ID поточного треку — щоб зміна списку не тригерила useEffect
  const [trackId, setTrackId] = useState<Song['id'] | null>(null)

  const [playStatus, setPlayStatus] = useState(false)
  const [currentTime, setCurrentTime] = useState<TimeParts>({ minute: 0, second: 0 })
  const [currentSeconds, setCurrentSeconds] = useState(0)
  const [totalTime, setTotalTime] = useState<TimeParts>({ minute: 0, second: 0 })
  const [progress, setProgress] = useState(0)
  const [volume, setVolumeState] = useState(0.7)
  const [shuffle, setShuffle] = useState(false)
  const [loop, setLoop] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Поточний трек — обчислюється з songsData + trackId (без зайвих ре-рендерів)
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

      // Встановлюємо ID першого треку тільки якщо ще нічого не вибрано
      setTrackId((prev) => {
        if (prev !== null) return prev
        return normalized.length > 0 ? normalized[0].id : null
      })
    } catch (error) {
      console.error('Помилка завантаження пісень:', error)
    }
  }, [])

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  // Завантажуємо аудіо тільки коли змінюється trackId (не весь об'єкт треку)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || trackId === null) return

    // Знаходимо трек у поточному списку
    const song = songsData.find((s) => s.id === trackId)
    if (!song || !song.file) return

    const fileUrl = resolveUrl(song.file)

    // Якщо той самий src — не перезавантажуємо
    if (audio.src === fileUrl) return

    audio.src = fileUrl
    audio.load()
    audio.volume = volume

    audio.play()
      .then(() => setPlayStatus(true))
      .catch(() => setPlayStatus(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(toParts(audio.currentTime))
      setCurrentSeconds(audio.currentTime)   // точне значення без округлення
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
      // Той самий трек — toggle play/pause
      if (playStatus) pause()
      else play()
      return
    }
    setTrackId(id)
  }

  const nextTrack = () => {
    if (songsData.length === 0) return
    const index = songsData.findIndex((s) => s.id === trackId)

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
    refreshSongs: fetchSongs,
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  )
}

export default PlayerContextProvider
