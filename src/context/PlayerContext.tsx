import {
  createContext,
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
}

// eslint-disable-next-line react-refresh/only-export-components
export const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

const toParts = (seconds: number): TimeParts => {
  if (!seconds || Number.isNaN(seconds)) return { minute: 0, second: 0 }
  const minute = Math.floor(seconds / 60)
  const second = Math.floor(seconds % 60)
  return { minute, second }
}

export const PlayerContextProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Изначально списки пустые, пока бэкенд не ответит
  const [songsData, setSongsData] = useState<Song[]>([])
  const [track, setTrack] = useState<Song | null>(null)

  const [playStatus, setPlayStatus] = useState(false)
  const [currentTime, setCurrentTime] = useState<TimeParts>({ minute: 0, second: 0 })
  const [totalTime, setTotalTime] = useState<TimeParts>({ minute: 0, second: 0 })
  const [progress, setProgress] = useState(0)
  const [volume, setVolumeState] = useState(0.7)
  const [shuffle, setShuffle] = useState(false)
  const [loop, setLoop] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Загружаем песни с бэкенда при монтировании
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/songs')
        if (response.ok) {
          const resData = await response.json()
          // Проверяем формат ответа бэка: если массив обернут в data, берем его, иначе сам массив
          const fetchedSongs = Array.isArray(resData) ? resData : (resData.data || [])

          // Нормализуем _id от MongoDB в id для фронтенда, чтобы не было конфликтов в верстке
          const normalizedSongs = fetchedSongs.map((song: any) => ({
            ...song,
            id: song.id || song._id // если бэк отдал _id, пишем его в id
          }))

          setSongsData(normalizedSongs)

          if (normalizedSongs.length > 0) {
            setTrack(normalizedSongs[0])
          }
        }
      } catch (error) {
        console.error('Помилка завантаження пісень:', error)
      }
    }

    fetchSongs()
  }, [])

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
    const song = songsData.find((s) => s.id === id)
    if (!song) return

    if (track && track.id === id) {
      if (playStatus) {
        pause()
      } else {
        play()
      }
      return
    }
    setTrack(song)
  }

  const changeTrack = (direction: 1 | -1) => {
    if (!track || songsData.length === 0) return
    const index = songsData.findIndex((s) => s.id === track.id)
    if (index === -1) return

    if (shuffle) {
      let randomIndex = Math.floor(Math.random() * songsData.length)
      while (randomIndex === index && songsData.length > 1) {
        randomIndex = Math.floor(Math.random() * songsData.length)
      }
      setTrack(songsData[randomIndex])
      return
    }

    let nextIndex = index + direction
    if (nextIndex < 0) nextIndex = songsData.length - 1
    if (nextIndex >= songsData.length) nextIndex = 0
    setTrack(songsData[nextIndex])
  }

  const next = () => changeTrack(1)
  const previous = () => changeTrack(-1)

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

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return

    // Склеиваем URL, если бэк отдает относительный путь (например, "uploads/song.mp3")
    const fileUrl = track.file.startsWith('http') ? track.file : `http://localhost:5000/${track.file}`

    audio.src = fileUrl
    audio.load()
    audio.volume = volume

    // Запускаем трек (но отлавливаем ошибку блокировки браузера, если юзер еще никуда не кликнул)
    audio.play()
      .then(() => setPlayStatus(true))
      .catch(() => setPlayStatus(false))
  }, [track])

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
        next()
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
  }, [track, loop, shuffle])

  // Если песни еще загружаются или база пуста, даем дефолтную пустую структуру для трека, чтобы фронт не падал
  const currentTrack = track || {
    id: '',
    name: 'Немає треків',
    image: '',
    file: '',
    desc: '',
    duration: '0:00'
  }

  const value: PlayerContextType = {
    audioRef,
    songsData, // Сохранили старое название
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
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  )
}

export default PlayerContextProvider