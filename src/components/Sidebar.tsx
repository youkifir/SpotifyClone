import React, { useEffect, useState, useCallback } from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { onLikeChanged } from '../hooks/Uselike'
import { onPlaylistChanged } from '../hooks/usePlaylistEvents'
import CreatePlaylistModal from './CreatePlaylistModal'
import type { Playlist as CreatedPlaylist } from './CreatePlaylistModal'

const API = 'http://localhost:5000'

interface Playlist {
  _id: string
  name: string
  image: string
  isLikedSongs?: boolean
  songs: any[]
  owner?: { _id?: string; username?: string; name?: string } | string
}
import CreatePlaylistModal, { type Playlist } from './CreatePlaylistModal'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const API_BASE = 'http://localhost:5000/api'

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { token } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [sharedPlaylists, setSharedPlaylists] = useState<Playlist[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchPlaylists = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/api/playlists/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const list: Playlist[] = Array.isArray(data) ? data : (data.data || [])
        // "Liked Songs" завжди першим
        list.sort((a, b) => (b.isLikedSongs ? 1 : 0) - (a.isLikedSongs ? 1 : 0))
        setPlaylists(list)
      }
    } catch (e) {
      console.error('Sidebar: помилка завантаження плейлистів', e)
    }
  }, [token])

  const fetchSharedPlaylists = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/api/playlists/shared`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSharedPlaylists(Array.isArray(data) ? data : (data.data || []))
      }
    } catch (e) {
      console.error('Sidebar: помилка завантаження спільних плейлистів', e)
    }
  }, [token])

  useEffect(() => {
    fetchPlaylists()
    fetchSharedPlaylists()
  }, [fetchPlaylists, fetchSharedPlaylists])

  // Слухаємо подію лайку
  useEffect(() => {
    return onLikeChanged(fetchPlaylists)
  }, [fetchPlaylists])

  // Слухаємо зміни плейлиста (назва, аватарка, кількість треків) — оновлюємо без перезавантаження
  useEffect(() => {
    return onPlaylistChanged(({ _id, name, image, songCount }) => {
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl._id !== _id) return pl
          return {
            ...pl,
            ...(name !== undefined ? { name } : {}),
            ...(image !== undefined ? { image } : {}),
            ...(songCount !== undefined
              ? { songs: Array.from({ length: songCount }) }
              : {}),
          }
        })
      )
    })
  }, [])

  const handlePlaylistCreated = (newPlaylist: CreatedPlaylist) => {
    setPlaylists((prev) => {
      const withNew = [newPlaylist as unknown as Playlist, ...prev]
      withNew.sort((a, b) => (b.isLikedSongs ? 1 : 0) - (a.isLikedSongs ? 1 : 0))
      return withNew
    })
  }

  const getImage = (playlist: Playlist) => {
    if (playlist.isLikedSongs) return null
    if (!playlist.image) return null
    // base64 data URL — повертаємо як є
    if (playlist.image.startsWith('data:')) return playlist.image
    // повна http URL — повертаємо як є
    if (playlist.image.startsWith('http')) return playlist.image
    // відносний шлях — додаємо API базу
    return `${API}/${playlist.image}`
  }

  const getOwnerName = (playlist: Playlist) => {
    if (!playlist.owner) return ''
    if (typeof playlist.owner === 'string') return ''
    return playlist.owner.name || playlist.owner.username || ''
  }

  const PlaylistItem = ({ playlist, isShared = false }: { playlist: Playlist; isShared?: boolean }) => {
    const img = getImage(playlist)
    return (
      <Link
        key={playlist._id}
        to={`/playlist/${playlist._id}`}
        onClick={onClose}
        className='flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] transition-colors group cursor-pointer'
      >
        {/* Обкладинка */}
        {playlist.isLikedSongs ? (
          <div
            className='w-12 h-12 rounded shrink-0 flex items-center justify-center'
            style={{ background: 'linear-gradient(135deg, #4b2f8a 0%, #1d89e4 100%)' }}
          >
            <svg width='20' height='20' viewBox='0 0 24 24' fill='white'>
              <path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' />
            </svg>
          </div>
        ) : img ? (
          <img className='w-12 h-12 rounded object-cover shrink-0' src={img} alt={playlist.name} />
        ) : (
          <div className='w-12 h-12 rounded shrink-0 bg-[#282828] flex items-center justify-center'>
            <svg width='20' height='20' viewBox='0 0 24 24' fill='#b3b3b3'>
              <path d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' />
            </svg>
          </div>
        )}

        <div className='min-w-0 flex-1'>
          <p className='font-medium text-sm text-white truncate group-hover:text-[#1db954] transition-colors'>
            {playlist.name}
          </p>
          <p className='text-xs text-neutral-400 truncate'>
            {isShared && getOwnerName(playlist)
              ? `${getOwnerName(playlist)} • `
              : ''}
            Плейлист • {playlist.songs?.length ?? 0}{' '}
            {playlist.songs?.length === 1 ? 'пісня' : 'пісень'}
          </p>
        </div>
      </Link>
    )

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!token) {
        setPlaylists([])
        return
      }
      setLoading(true)
      try {
        const response = await fetch(`${API_BASE}/playlists/my`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const resData = await response.json()
          setPlaylists(Array.isArray(resData) ? resData : resData.data || [])
        }
      } catch (error) {
        console.error('Помилка завантаження плейлистів:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [token])

  const handleCreated = (playlist: Playlist) => {
    setPlaylists((prev) => [playlist, ...prev])
  }

  const handleDelete = async (e: React.MouseEvent, playlistId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!token) return
    if (!window.confirm('Видалити цей плейлист?')) return

    setDeletingId(playlistId)
    try {
      const response = await fetch(`${API_BASE}/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setPlaylists((prev) => prev.filter((p) => p._id !== playlistId))
      }
    } catch (error) {
      console.error('Помилка видалення плейлиста:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const resolveImage = (image: string) => {
    if (!image) return assets.stack_icon
    return image.startsWith('http') || image.startsWith('data:') ? image : `http://localhost:5000/${image}`
  }

  return (
    <>
      {/* Затемнення фону на мобільних */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <div
        className={`fixed lg:static top-0 left-0 h-full w-[78%] max-w-70 lg:w-[25%] flex flex-col text-white shrink-0 z-50 lg:z-auto transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className='bg-[#121212] h-full lg:rounded-lg p-2 flex flex-col gap-2'>

          <div className='p-4 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <img className='w-8' src={assets.stack_icon} alt='Library' />
              <p className='font-semibold'>Your Library</p>
            </div>
            <div className='flex items-center gap-4 px-1'>

              <img className='w-5 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.arrow_icon} alt='Arrow' />
              {/* Кнопка + відкриває модал створення плейлиста */}
              <img
                className='w-5 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition'
                src={assets.plus_icon}
                alt='Plus'
                onClick={() => setIsModalOpen(true)}
                title='Створити плейлист'

              <img
                onClick={() => setIsModalOpen(true)}
                className='w-5 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition'
                src={assets.plus_icon}
                alt="Створити плейлист"
                title="Створити плейлист"

              />
              <button
                onClick={onClose}
                aria-label='Закрити бібліотеку'
                className='lg:hidden w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-white hover:scale-110 transition text-lg leading-none'
              >
                ✕
              </button>
            </div>
          </div>
          <div className='flex flex-col gap-1 px-2 overflow-y-auto custom-scrollbar flex-1'>
            {playlists.length === 0 ? (
          <div className='flex flex-col gap-3 px-2 overflow-y-auto custom-scrollbar flex-1'>
            {!token ? (
              <p className='text-sm text-zinc-400 p-4'>Увійдіть в акаунт, щоб бачити свої плейлисти</p>
            ) : loading ? (
              <p className='text-sm text-zinc-400 p-4'>Завантаження...</p>
            ) : playlists.length === 0 ? (
              <div className='p-4 bg-[#242424] hover:bg-[#2a2a2a] transition-colors rounded-lg flex flex-col items-start gap-1'>
                <h1 className='font-bold text-base text-white'>Create your first playlist</h1>
                <p className='text-sm text-white font-light opacity-90'>it's easy we will help you</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className='bg-white text-black text-sm font-bold px-4 py-1.5 rounded-full mt-4 hover:scale-105 hover:bg-neutral-200 transition'
                >
                  Create Playlist
                </button>
              </div>
            ) : (
              playlists.map((playlist) => (
                <PlaylistItem key={playlist._id} playlist={playlist} />
              ))
            )}

            {/* Плейлисти колег (публічні) */}
            {sharedPlaylists.length > 0 && (
              <>
                <div className='mt-3 mb-1 px-2'>
                  <p className='text-xs text-neutral-500 font-semibold uppercase tracking-wider'>Від колег</p>
                </div>
                {sharedPlaylists.map((playlist) => (
                  <PlaylistItem key={playlist._id} playlist={playlist} isShared={true} />
                ))}
              </>
                <Link
                  key={playlist._id}
                  to={`/playlist/${playlist._id}`}
                  onClick={onClose}
                  className='flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] transition-colors group cursor-pointer'
                >
                  <img
                    className='w-12 h-12 rounded object-cover shrink-0'
                    src={resolveImage(playlist.image)}
                    alt={playlist.name}
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='font-medium text-sm text-white truncate group-hover:text-[#1db954] transition-colors'>
                      {playlist.name}
                    </p>
                    <p className='text-xs text-neutral-400 truncate'>
                      Плейлист • {playlist.songs.length} треків
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, playlist._id)}
                    disabled={deletingId === playlist._id}
                    aria-label="Видалити плейлист"
                    title="Видалити плейлист"
                    className='shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition disabled:opacity-50'
                  >
                    <svg viewBox="0 0 24 24" fill="none" className='w-4 h-4' stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </Link>
              ))

            )}
          </div>

        </div>
      </div>

      {/* Модал створення плейлиста */}
      <CreatePlaylistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handlePlaylistCreated}
      <CreatePlaylistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  )
}

export default Sidebar
