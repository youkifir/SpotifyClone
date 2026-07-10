import {
  createContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { songsData } from '../assets/assets'

export interface Song {
  id: number | string
  name: string
  image: string
  file: string
  desc: string
  duration: string
}

interface TimeParts {
  minute: number
  second: number
}

interface PlayerContextType {
  audioRef: React.RefObject<HTMLAudioElement | null>
  track: Song
  playStatus: boolean
  currentTime: TimeParts
  totalTime: TimeParts
  progress: number
  volume: number
  shuffle: boolean
  loop: boolean
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

  const [track, setTrack] = useState<Song>(songsData[0])
  const [playStatus, setPlayStatus] = useState(false)
  const [currentTime, setCurrentTime] = useState<TimeParts>({ minute: 0, second: 0 })
  const [totalTime, setTotalTime] = useState<TimeParts>({ minute: 0, second: 0 })
  const [progress, setProgress] = useState(0)
  const [volume, setVolumeState] = useState(0.7)
  const [shuffle, setShuffle] = useState(false)
  const [loop, setLoop] = useState(false)

  const play = () => {
    const audio = audioRef.current
    if (!audio) return
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
    const song = songsData.find((s) => s.id === id)
    if (!song) return
    if (track.id === id) {
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

  // Load new track whenever it changes, autoplay
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = track.file
    audio.load()
    audio.volume = volume
    audio.play().then(() => setPlayStatus(true)).catch(() => setPlayStatus(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, loop, shuffle])

  const value: PlayerContextType = {
    audioRef,
    track,
    playStatus,
    currentTime,
    totalTime,
    progress,
    volume,
    shuffle,
    loop,
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
