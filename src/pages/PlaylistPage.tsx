import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/usePlayer'
import { assets } from '../assets/assets'
import EditPlaylistModal from '../components/EditPlaylistModal'
import AddSongsModal, { type ApiSong } from '../components/AddSongsModal'
import { durationToSeconds } from '../utils/parseDuration'
import type { Playlist } from '../components/CreatePlaylistModal'
import type { Song } from '../context/PlayerContext'
import { apiFetch, isOfflineError } from '../utils/apiError'
import { ErrorScreen, LoadingScreen } from '../components/StateScreen'
import { useLanguage } from '../context/LanguageContext'
import { addRecentlyPlayed } from '../hooks/useRecentlyPlayed'
import { onLikeChanged } from '../hooks/Uselike'
import { onPlaylistSongAdded } from '../components/AddToPlaylistMenu'

interface PlaylistDetail extends Omit<Playlist, 'songs'> {
  songs: ApiSong[]
}

type SortKey = 'dateAdded' | 'name' | 'artist' | 'album' | 'duration'
type SortDirection = 'asc' | 'desc'

const API_BASE = 'http://localhost:5000/api'

const resolveUrl = (path: string) => {
  if (!path) return ''
  return path.startsWith('http') || path.startsWith('data:') ? path : `http://localhost:5000/${path}`
}

function PlaylistPage() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const { track, playStatus, playWithId, play, pause, refreshSongs, setQueue, clearQueue, addSongs } = usePlayer()

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [albumNames, setAlbumNames] = useState<Record<string, string>>({})

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('dateAdded')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [wasDeleted, setWasDeleted] = useState(false)
  const [copied, setCopied] = useState(false)

  // завантаження плейлиста
  const fetchPlaylist = useCallback(async (silent = false) => {
    if (!token || !id) return
    if (!silent) setLoading(true)
    setNotFound(false)
    setFetchError(null)
    setOffline(false)
    try {
      const response = await apiFetch(`${API_BASE}/playlists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const resData = await response.json()
      const loadedPlaylist = resData.data || resData
      setPlaylist(loadedPlaylist)

      // Позначаємо плейлист як "недавно прослуханий" на головній сторінці
      if (loadedPlaylist?._id) {
        addRecentlyPlayed(user?.id, {
          id: loadedPlaylist._id,
          type: 'playlist',
          name: loadedPlaylist.name,
          desc: loadedPlaylist.isLikedSongs
            ? ''
            : `${t('playlistLabel2')} • ${loadedPlaylist.songs?.length ?? 0} ${loadedPlaylist.songs?.length === 1 ? 'трек' : 'треків'}`,
          image: loadedPlaylist.image ? resolveUrl(loadedPlaylist.image) : '',
          isLikedSongs: !!loadedPlaylist.isLikedSongs,
        })
      }
    } catch (error) {
      console.error('Помилка завантаження плейлиста:', error)
      if (isOfflineError(error)) {
        setOffline(true)
      } else {
        setFetchError('Не вдалося завантажити плейлист')
      }
    } finally {
      setLoading(false)
    }
  }, [id, token, user?.id, t])

  useEffect(() => {
    fetchPlaylist()
  }, [fetchPlaylist])

  // Оновлюємо список одразу після лайку або додавання треку до плейліcту
  useEffect(() => {
    const unsubLike = onLikeChanged(() => fetchPlaylist(true))
    const unsubAdd = onPlaylistSongAdded((playlistId) => {
      if (!playlistId || playlistId === id) fetchPlaylist(true)
    })
    return () => { unsubLike(); unsubAdd() }
  }, [fetchPlaylist, id])

  // резолвимо назви альбомів
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const response = await fetch(`${API_BASE}/albums`)
        if (response.ok) {
          const resData = await response.json()
          const list = Array.isArray(resData) ? resData : resData.data || []
          const map: Record<string, string> = {}
          for (const album of list) {
            map[album._id || album.id] = album.name
          }
          setAlbumNames(map)
        }
      } catch (error) {
        console.error('Помилка завантаження альбомів:', error)
      }
    }
    fetchAlbums()
  }, [])

  const existingSongIds = useMemo(
    () => new Set((playlist?.songs || []).map((s) => s._id)),
    [playlist]
  )

  const visibleSongs = useMemo(() => {
    if (!playlist) return []

    const withIndex = playlist.songs.map((song, index) => ({ song, index }))

    const query = search.trim().toLowerCase()
    const filtered = query
      ? withIndex.filter(({ song }) => song.name.toLowerCase().includes(query))
      : withIndex

    const dir = sortDir === 'asc' ? 1 : -1

    const sorted = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.song.name.localeCompare(b.song.name) * dir
        case 'artist':
          return (a.song.artist || '').localeCompare(b.song.artist || '') * dir
        case 'album': {
          const albumA = albumNames[a.song.album || ''] || ''
          const albumB = albumNames[b.song.album || ''] || ''
          return albumA.localeCompare(albumB) * dir
        }
        case 'duration':
          return (durationToSeconds(a.song.duration) - durationToSeconds(b.song.duration)) * dir
        case 'dateAdded':
        default:
          return (a.index - b.index) * dir
      }
    })

    return sorted.map((item) => item.song)
  }, [playlist, search, sortKey, sortDir, albumNames])

  // Конвертуємо ApiSong → Song для плеєра
  const toPlayerSong = useCallback((s: ApiSong): Song => ({
    id: s._id,
    name: s.name,
    image: resolveUrl(s.image),
    file: s.file || '',
    desc: s.desc || '',
    duration: s.duration || '0:00',
    artist: s.artist,
    lyrics: (s as any).lyrics,
  }), [])

  // Встановлюємо чергу щоразу коли змінюється плейліст / сортування
  useEffect(() => {
    if (!playlist || visibleSongs.length === 0) return
    const playerSongs = visibleSongs.map(toPlayerSong)
    addSongs(playerSongs)
    setQueue(playerSongs)
    return () => { clearQueue() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist?._id, visibleSongs])

  const handleRemoveSong = async (songId: string) => {
    if (!token || !id) return
    setRemovingId(songId)
    try {
      const response = await fetch(`${API_BASE}/playlists/${id}/songs/${songId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setPlaylist((prev) => (prev ? { ...prev, songs: prev.songs.filter((s) => s._id !== songId) } : prev))
      }
    } catch (error) {
      console.error('Помилка видалення треку:', error)
    } finally {
      setRemovingId(null)
    }
  }

  const handleSharePlaylist = async () => {
    if (!playlist) return
    const shareUrl = `${window.location.origin}/playlist/${playlist._id}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Не вдалося скопіювати посилання:', error)
    }
  }

  const handleSongAdded = (song: ApiSong) => {
    setPlaylist((prev) => (prev ? { ...prev, songs: [...prev.songs, song] } : prev))
    refreshSongs()
  }

  const handlePlaylistUpdated = (updated: Playlist) => {
    setPlaylist((prev) => (prev ? { ...prev, name: updated.name, image: updated.image } : prev))
  }

  const handlePlaylistDeleted = () => {
    setIsEditOpen(false)
    setWasDeleted(true)
  }

  const handlePlayAll = () => {
    if (visibleSongs.length === 0) return
    const playerSongs = visibleSongs.map(toPlayerSong)
    setQueue(playerSongs)
    const isCurrentInPlaylist = visibleSongs.some((s) => s._id === track.id)
    if (isCurrentInPlaylist) {
      playStatus ? pause() : play()
    } else {
      playWithId(visibleSongs[0]._id)
    }
  }

  if (wasDeleted) return <Navigate to="/" replace />
  if (loading) return <LoadingScreen message="Завантаження плейлиста…" />
  if (offline) return <ErrorScreen message="Немає з'єднання з сервером" onRetry={() => fetchPlaylist()} />
  if (fetchError) return <ErrorScreen message={fetchError} onRetry={() => fetchPlaylist()} />
  if (notFound || !playlist) return <Navigate to="/" replace />

  const isPlaylistPlaying = playStatus && visibleSongs.some((s) => s._id === track.id)

  return (
    <div className="pt-2 sm:pt-4">
      {/* шапка плейлиста */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 p-4 sm:p-6 rounded-lg bg-linear-to-b from-[#535353] to-[#121212]">
        <button
          onClick={() => setIsEditOpen(true)}
          className="w-36 h-36 sm:w-48 sm:h-48 shrink-0 rounded shadow-2xl overflow-hidden group relative"
          title="Редагувати плейлист"
        >
          <img
            src={playlist.image ? resolveUrl(playlist.image) : assets.stack_icon}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-sm font-semibold">
            Редагувати
          </div>
        </button>
        <div className="text-center sm:text-left min-w-0">
          <p className="text-xs font-semibold uppercase text-neutral-200">Плейлист</p>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white my-2 truncate">{playlist.name}</h1>
          <p className="text-neutral-300 text-sm">{playlist.songs.length} треків</p>
        </div>
      </div>

      {/* керування */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-3 sm:px-6 py-4 sm:py-6">
        <button
          onClick={handlePlayAll}
          className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-[#1db954] shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 hover:bg-[#1ed760] transition"
        >
          <img
            src={isPlaylistPlaying ? assets.pause_icon : assets.play_icon}
            alt="Відтворити"
            className="w-5 h-5 sm:w-6 sm:h-6"
          />
        </button>

        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-transparent border border-zinc-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:border-white transition-colors"
        >
          + Додати треки
        </button>

        <button
          onClick={() => setIsEditOpen(true)}
          className="text-zinc-400 hover:text-white text-sm font-semibold transition-colors"
        >
          Редагувати
        </button>

        <button
          onClick={handleSharePlaylist}
          className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${copied
              ? 'bg-green-600 border-green-600 text-white'
              : 'bg-transparent border-zinc-600 text-white hover:border-white'
            }`}
        >
          {copied ? '✓ Скопійовано!' : 'Поділитися'}
        </button>

        <div className="flex-1 min-w-2" />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук у плейлисті"
          className="bg-[#242424] border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors w-full sm:w-56"
        />

        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-[#242424] border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
          >
            <option value="dateAdded">Дата додавання</option>
            <option value="name">Назва</option>
            <option value="artist">Виконавець</option>
            <option value="album">Альбом</option>
            <option value="duration">Тривалість</option>
          </select>
          <button
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            title={sortDir === 'asc' ? 'За зростанням' : 'За спаданням'}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md bg-[#242424] border border-zinc-700 text-white hover:border-zinc-500 transition-colors"
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* трек-лист */}
      <div className="px-1 sm:px-2">
        {playlist.songs.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <p className="mb-4">У цьому плейлисті поки немає треків</p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="bg-white text-black text-sm font-bold px-5 py-2 rounded-full hover:scale-105 transition"
            >
              Додати треки
            </button>
          </div>
        ) : visibleSongs.length === 0 ? (
          <p className="text-zinc-400 text-sm px-4 py-8 text-center">Нічого не знайдено за запитом «{search}»</p>
        ) : (
          <>
            <div className="grid grid-cols-[16px_4fr_2fr_2fr_auto_minmax(56px,1fr)] gap-2 sm:gap-4 px-2 sm:px-4 py-2 text-neutral-400 text-sm border-b border-[#2a2a2a]">
              <span>#</span>
              <span>Назва</span>
              <span className="hidden sm:block">Виконавець</span>
              <span className="hidden md:block">Альбом</span>
              <span></span>
              <img src={assets.clock_icon} alt="Тривалість" className="w-4 h-4 justify-self-end" />
            </div>
            <div className="mt-2">
              {visibleSongs.map((song, index) => {
                const isActive = track.id === song._id
                const isActivePlaying = isActive && playStatus

                return (
                  <div
                    key={song._id}
                    onClick={() => {
                      if (isActive) {
                        if (playStatus) pause()
                        else play()
                      } else {
                        playWithId(song._id)
                      }
                    }}
                    className={`grid grid-cols-[16px_4fr_2fr_2fr_auto_minmax(56px,1fr)] gap-2 sm:gap-4 px-2 sm:px-4 py-2 rounded-md hover:bg-[#2a2a2a] cursor-pointer group ${isActive ? 'text-[#1db954]' : 'text-neutral-300'
                      }`}
                  >
                    <span className="self-center text-sm relative w-4 h-4">
                      <span className={`${isActivePlaying ? 'hidden' : 'group-hover:hidden'}`}>{index + 1}</span>
                      <img
                        src={isActivePlaying ? assets.pause_icon : assets.play_icon}
                        alt=""
                        className={`w-3 h-3 absolute inset-0 m-auto ${isActivePlaying ? 'block' : 'hidden group-hover:block'
                          }`}
                      />
                    </span>
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={resolveUrl(song.image)} alt={song.name} className="w-10 h-10 rounded object-cover shrink-0" />
                      <span className={`text-sm truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
                        {song.name}
                      </span>
                    </div>
                    <span className="hidden sm:block self-center text-sm truncate">{song.artist || '—'}</span>
                    <span className="hidden md:block self-center text-sm truncate">
                      {(song.album && albumNames[song.album]) || '—'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveSong(song._id)
                      }}
                      disabled={removingId === song._id}
                      title="Прибрати з плейлиста"
                      aria-label="Прибрати з плейлиста"
                      className="w-6 h-6 self-center flex items-center justify-center rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span className="self-center text-sm justify-self-end">{song.duration}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <EditPlaylistModal
        isOpen={isEditOpen}
        playlist={playlist}
        onClose={() => setIsEditOpen(false)}
        onSaved={handlePlaylistUpdated}
        onDeleted={handlePlaylistDeleted}
      />

      <AddSongsModal
        isOpen={isAddOpen}
        playlistId={playlist._id}
        existingSongIds={existingSongIds}
        onClose={() => setIsAddOpen(false)}
        onAdded={handleSongAdded}
      />
    </div>
  )
}

export default PlaylistPage
