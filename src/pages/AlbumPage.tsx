import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SongList from '../components/SongList'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'
import { useAuth } from '../context/AuthContext'

interface Album {
  id: string | number
  name: string
  image: string
  desc: string
  bgColor: string
}

interface AlbumSong {
  id: string | number
  name: string
  image: string
  desc: string
  duration: string
  artist?: string
  album?: string | null
  file: string
}

function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0
  const parts = duration.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

function formatTotalDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h} год ${m} хв`
  return `${m} хв ${s > 0 ? s + ' сек' : ''}`
}

function AlbumPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { track, playStatus, playWithId, play, pause, songsData, addSongs } = usePlayer()
  const { token } = useAuth()

  const [album, setAlbum] = useState<Album | null>(null)
  const [albumSongsRaw, setAlbumSongsRaw] = useState<AlbumSong[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')

    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

    // Fetch album info
    fetch(`http://localhost:5000/api/albums/${id}`, { headers })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const res = await r.json()
        const fetchedAlbum = res.data || res
        if (fetchedAlbum) {
          setAlbum({ ...fetchedAlbum, id: fetchedAlbum.id || fetchedAlbum._id })
        } else {
          throw new Error('Альбом не знайдено')
        }
      })
      .catch((e) => {
        console.error('AlbumPage fetch error:', e)
        setError('Не вдалося завантажити альбом')
      })
      .finally(() => setLoading(false))
  }, [id, token])

  // Fetch songs that belong to this album
  useEffect(() => {
    if (!id) return
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

    fetch(`http://localhost:5000/api/songs?album=${id}`, { headers })
      .then(async (r) => {
        if (!r.ok) return
        const res = await r.json()
        const songs = (res.data || res.songs || []).map((s: any) => ({
          ...s,
          id: s.id ?? s._id,
        }))
        if (songs.length > 0) {
          setAlbumSongsRaw(songs)
          addSongs(songs)
        }
      })
      .catch(() => {/* fallback to songsData */})
  }, [id, token])

  // Якщо окремий ендпоінт не повернув пісень — фолбек через songsData
  const albumSongs = useMemo(() => {
    if (albumSongsRaw.length > 0) return albumSongsRaw
    if (!album) return songsData
    return songsData.filter(
      (s: any) =>
        s.album === id ||
        s.album === album.id ||
        s.albumId === id ||
        (album.name && (s.desc === album.name || s.album === album.name))
    ).length > 0
      ? songsData.filter(
          (s: any) =>
            s.album === id ||
            s.album === album.id ||
            s.albumId === id ||
            (album.name && (s.desc === album.name || s.album === album.name))
        )
      : songsData
  }, [albumSongsRaw, songsData, album, id])

  const totalSeconds = useMemo(
    () => albumSongs.reduce((acc, s) => acc + parseDurationToSeconds(s.duration), 0),
    [albumSongs]
  )

  const uniqueArtists = useMemo(
    () => [...new Set(albumSongs.map((s: any) => s.artist).filter(Boolean))],
    [albumSongs]
  )

  const isAnyActive = albumSongs.some((s) => s.id === track?.id)

  const handlePlayAlbum = () => {
    if (albumSongs.length === 0) return
    if (isAnyActive) {
      playStatus ? pause() : play()
    } else {
      playWithId(albumSongs[0].id)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-400 text-sm">Завантаження альбому...</p>
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400">{error || 'Альбом не знайдено'}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-neutral-400 hover:text-white transition underline">
          ← Назад
        </button>
      </div>
    )
  }

  const albumImageUrl = album.image?.startsWith('http')
    ? album.image
    : `http://localhost:5000/${album.image}`

  const bgColor = album.bgColor || '#535353'

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Hero шапка ── */}
      <div
        className="relative flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 p-4 sm:p-8 rounded-lg overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${bgColor}cc 0%, #121212 100%)` }}
      >
        {/* Розмитий фон */}
        <div
          className="absolute inset-0 opacity-15 blur-2xl scale-110 bg-cover bg-center"
          style={{ backgroundImage: `url(${albumImageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />

        {/* Обкладинка */}
        <img
          src={albumImageUrl}
          alt={album.name}
          className="relative z-10 w-40 h-40 sm:w-52 sm:h-52 object-cover shadow-2xl rounded-md shrink-0"
        />

        {/* Метадані */}
        <div className="relative z-10 flex flex-col gap-1 text-center sm:text-left min-w-0 pb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">Альбом</span>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white leading-none mt-1 mb-2">
            {album.name}
          </h1>

          {/* Опис / Автори */}
          {album.desc && (
            <p className="text-neutral-300 text-sm mb-1 line-clamp-2">{album.desc}</p>
          )}

          <div className="flex flex-wrap items-center gap-1 text-sm text-neutral-400 justify-center sm:justify-start">
            {uniqueArtists.length > 0 && (
              <>
                <span className="font-semibold text-white">{uniqueArtists.slice(0, 3).join(', ')}</span>
                <span>•</span>
              </>
            )}
            <span>{albumSongs.length} {albumSongs.length === 1 ? 'трек' : albumSongs.length <= 4 ? 'треки' : 'треків'}</span>
            {totalSeconds > 0 && (
              <>
                <span>•</span>
                <span>{formatTotalDuration(totalSeconds)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Кнопки керування ── */}
      <div className="flex items-center gap-5 px-4 py-5">
        <button
          onClick={handlePlayAlbum}
          disabled={albumSongs.length === 0}
          className="w-14 h-14 rounded-full bg-[#1db954] hover:bg-[#1ed760] hover:scale-105 transition flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isAnyActive && playStatus ? 'Пауза' : 'Відтворити альбом'}
        >
          <img
            src={isAnyActive && playStatus ? assets.pause_icon : assets.play_icon}
            alt=""
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

      {/* ── Список треків ── */}
      <div className="px-1 sm:px-2">
        {albumSongs.length === 0 ? (
          <div className="text-center text-neutral-500 py-16">Треки не знайдено</div>
        ) : (
          <SongList songs={albumSongs} />
        )}
      </div>
    </div>
  )
}

export default AlbumPage