import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/usePlayer'
import { useAuth } from '../context/AuthContext'
import { assets } from '../assets/assets'

interface ArtistSong {
  id: string
  name: string
  image: string
  duration: string
  desc: string
  artist: string
  genre?: string
  source?: string
}

function ArtistPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { playWithId, addSongs, track, playStatus, play, pause } = usePlayer()
  const { token } = useAuth()

  const [songs, setSongs] = useState<ArtistSong[]>([])
  const [artistImage, setArtistImage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const artistName = decodeURIComponent(name || '')

  useEffect(() => {
    if (!artistName) return
    setLoading(true)
    setError('')

    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

    fetch(`http://localhost:5000/api/songs/artist/${encodeURIComponent(artistName)}`, { headers })
      .then(async (r) => {
        const text = await r.text()
        try {
          return JSON.parse(text)
        } catch {
          throw new Error(`Server error ${r.status}: ${text.slice(0, 100)}`)
        }
      })
      .then((res) => {
        if (!res.success) throw new Error(res.message || 'Помилка сервера')
        const data = res.data
        setArtistImage(data.image || '')
        const normalized = (data.songs || []).map((s: any) => ({
          ...s,
          id: s.id ?? s._id,
        }))
        setSongs(normalized)
        addSongs(normalized)
      })
      .catch((e) => {
        console.error('ArtistPage fetch error:', e)
        setError('Не вдалося завантажити треки виконавця')
      })
      .finally(() => setLoading(false))
  }, [artistName, token])

  const resolveUrl = (url: string) =>
    url?.startsWith('http') ? url : `http://localhost:5000/${url}`

  const isAnyActive = songs.some((s) => s.id === track?.id)

  const handlePlayAll = () => {
    if (songs.length === 0) return
    if (isAnyActive) {
      playStatus ? pause() : play()
    } else {
      playWithId(songs[0].id)
    }
  }

  // Picked a representative big cover from the first song
  const heroCover = artistImage ? resolveUrl(artistImage) : null

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-10 h-10 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-400 text-sm">Завантаження виконавця...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-neutral-400 hover:text-white transition underline">
          ← Назад
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero banner */}
      <div className="relative flex items-end gap-6 p-6 sm:p-8 rounded-lg overflow-hidden mb-2"
        style={{ minHeight: 220, background: 'linear-gradient(180deg, #2a2a2a 0%, #121212 100%)' }}
      >
        {/* Blurred background cover */}
        {heroCover && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl scale-110"
            style={{ backgroundImage: `url(${heroCover})` }}
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-[#121212] via-[#121212]/60 to-transparent" />

        {/* Avatar */}
        <div className="relative z-10 w-32 h-32 sm:w-44 sm:h-44 rounded-full overflow-hidden shadow-2xl border-2 border-white/10 shrink-0">
          {heroCover ? (
            <img src={heroCover} alt={artistName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#333] flex items-center justify-center">
              <span className="text-4xl text-white/50">🎤</span>
            </div>
          )}
        </div>

        {/* Artist info */}
        <div className="relative z-10 flex flex-col gap-1 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-300">Виконавець</span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white truncate">{artistName}</h1>
          <p className="text-neutral-400 text-sm mt-1">
            {songs.length} {songs.length === 1 ? 'трек' : songs.length >= 2 && songs.length <= 4 ? 'треки' : 'треків'}
            {songs.some(s => s.source === 'itunes') && (
              <span className="ml-2 text-xs bg-white/10 text-neutral-300 px-2 py-0.5 rounded-full">iTunes</span>
            )}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5 px-4 py-4">
        <button
          onClick={handlePlayAll}
          disabled={songs.length === 0}
          className="w-14 h-14 rounded-full bg-[#1db954] hover:bg-[#1ed760] hover:scale-105 transition flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img
            src={isAnyActive && playStatus ? assets.pause_icon : assets.play_icon}
            alt="Play"
            className="w-6 h-6"
          />
        </button>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-neutral-400 hover:text-white transition"
        >
          ← Назад
        </button>
      </div>

      {/* Track list */}
      {songs.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">Треків не знайдено</div>
      ) : (
        <div className="flex flex-col px-2">
          {/* Header */}
          <div className="grid grid-cols-[16px_1fr_auto_auto] sm:grid-cols-[16px_1fr_2fr_auto_auto] gap-3 px-4 py-2 text-neutral-400 text-xs uppercase tracking-wider border-b border-white/10 mb-1">
            <span>#</span>
            <span>Назва</span>
            <span className="hidden sm:block">Альбом</span>
            <span className="hidden sm:block">Джерело</span>
            <img src={assets.clock_icon} alt="" className="w-4 h-4 justify-self-end" />
          </div>

          {songs.map((song, i) => {
            const isActive = track?.id === song.id
            const isPlaying = isActive && playStatus

            return (
              <div
                key={song.id}
                onClick={() => playWithId(song.id)}
                className={`grid grid-cols-[16px_1fr_auto_auto] sm:grid-cols-[16px_1fr_2fr_auto_auto] gap-3 px-4 py-2.5 rounded-md cursor-pointer hover:bg-white/5 group transition ${
                  isActive ? 'text-[#1db954]' : 'text-neutral-300'
                }`}
              >
                {/* Index */}
                <span className="self-center text-sm relative w-4 h-4">
                  <span className={`${isPlaying ? 'hidden' : 'group-hover:hidden'}`}>{i + 1}</span>
                  <img
                    src={isPlaying ? assets.pause_icon : assets.play_icon}
                    alt=""
                    className={`w-3 h-3 absolute inset-0 m-auto ${isPlaying ? 'block' : 'hidden group-hover:block'}`}
                  />
                </span>

                {/* Cover + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={resolveUrl(song.image)}
                    alt={song.name}
                    className="w-10 h-10 rounded object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
                      {song.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">{song.artist}</p>
                  </div>
                </div>

                {/* Album / desc */}
                <span className="hidden sm:block self-center text-sm text-neutral-500 truncate">
                  {song.desc || '—'}
                </span>

                {/* Source badge */}
                <span className="hidden sm:block self-center">
                  {song.source === 'itunes' ? (
                    <span className="text-xs bg-white/10 text-neutral-400 px-2 py-0.5 rounded-full">iTunes</span>
                  ) : (
                    <span className="text-xs bg-[#1db954]/20 text-[#1db954] px-2 py-0.5 rounded-full">Local</span>
                  )}
                </span>

                {/* Duration */}
                <span className="self-center text-sm text-neutral-500 justify-self-end">{song.duration}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ArtistPage