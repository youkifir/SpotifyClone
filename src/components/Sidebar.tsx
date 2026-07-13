import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { onLikeChanged } from '../hooks/Uselike'
import { onPlaylistSongAdded } from './AddToPlaylistMenu'
import CreatePlaylistModal from './CreatePlaylistModal'
import type { Playlist as CreatedPlaylist } from './CreatePlaylistModal'

const API = 'http://localhost:5000'
const API_BASE = 'http://localhost:5000/api'

export interface Playlist {
  _id: string
  name: string
  image: string
  isLikedSongs?: boolean
  songs: any[]
  owner?: { _id?: string; username?: string; name?: string } | string
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose, collapsed = false, onToggleCollapse }) => {
  const { token } = useAuth()
  const { t } = useLanguage()

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [sharedPlaylists, setSharedPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchPlaylists = useCallback(async (silent = false) => {
    if (!token) {
      setPlaylists([])
      return
    }
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/playlists/my`, {
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
    } finally {
      if (!silent) setLoading(false)
    }
  }, [token])

  const fetchSharedPlaylists = useCallback(async () => {
    if (!token) {
      setSharedPlaylists([])
      return
    }
    try {
      const res = await fetch(`${API_BASE}/playlists/shared`, {
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

  // Слухаємо подію лайку (silent — без спінера)
  useEffect(() => {
    return onLikeChanged(() => fetchPlaylists(true))
  }, [fetchPlaylists])

  // Слухаємо додавання пісні до плейліста — оновлюємо кількість у сайдбарі
  useEffect(() => {
    return onPlaylistSongAdded(() => fetchPlaylists(true))
  }, [fetchPlaylists])

  const handlePlaylistCreated = (newPlaylist: CreatedPlaylist) => {
    setPlaylists((prev) => {
      const withNew = [newPlaylist as unknown as Playlist, ...prev]
      withNew.sort((a, b) => (b.isLikedSongs ? 1 : 0) - (a.isLikedSongs ? 1 : 0))
      return withNew
    })
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

  const resolveImage = (playlist: Playlist) => {
    if (playlist.isLikedSongs) return null
    if (!playlist.image) return assets.stack_icon
    if (playlist.image.startsWith('data:') || playlist.image.startsWith('http')) {
      return playlist.image
    }
    return `${API}/${playlist.image}`
  }

  const getOwnerName = (playlist: Playlist) => {
    if (!playlist.owner) return ''
    if (typeof playlist.owner === 'string') return ''
    return playlist.owner.name || playlist.owner.username || ''
  }

  const PlaylistItem = ({ playlist, isShared = false }: { playlist: Playlist; isShared?: boolean }) => {
    const img = resolveImage(playlist)
    return (
      <Link
        key={playlist._id}
        to={`/playlist/${playlist._id}`}
        onClick={onClose}
        className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] transition-colors group cursor-pointer"
      >
        {/* Обкладинка */}
        {playlist.isLikedSongs ? (
          <div
            className="w-12 h-12 rounded shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4b2f8a 0%, #1d89e4 100%)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        ) : img ? (
          <img className="w-12 h-12 rounded object-cover shrink-0" src={img} alt={playlist.name} />
        ) : (
          <div className="w-12 h-12 rounded shrink-0 bg-[#282828] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#b3b3b3">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-white truncate group-hover:text-[#1db954] transition-colors">
            {playlist.name}
          </p>
          <p className="text-xs text-neutral-400 truncate">
            {isShared && getOwnerName(playlist) ? `${getOwnerName(playlist)} • ` : ''}
            Плейлист • {playlist.songs?.length ?? 0}{' '}
            {playlist.songs?.length === 1 ? 'пісня' : 'пісень'}
          </p>
        </div>

        {/* Кнопка видалення (показується тільки для власних звичайних плейлистів) */}
        {!isShared && !playlist.isLikedSongs && (
          <button
            onClick={(e) => handleDelete(e, playlist._id)}
            disabled={deletingId === playlist._id}
            aria-label="Видалити плейлист"
            title="Видалити плейлист"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Затемнення фону на мобільних */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      />

      <div
        style={{ width: collapsed ? '72px' : undefined }}
        className={`fixed lg:static top-0 left-0 h-full flex flex-col text-white shrink-0 z-50 lg:z-auto transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:w-[25%] w-[78%] max-w-70`}
      >
        <div className="bg-[#121212] h-full lg:rounded-lg p-2 flex flex-col gap-2 overflow-hidden">
          <div className="p-4 flex items-center justify-between min-w-0">
            <div
              style={{
                opacity: collapsed ? 0 : 1,
                width: collapsed ? 0 : undefined,
                overflow: 'hidden',
                pointerEvents: collapsed ? 'none' : undefined,
                transition: 'opacity 0.3s, width 0.3s',
                whiteSpace: 'nowrap',
              }}
              className="flex items-center gap-3"
            >
              <img className="w-8 shrink-0" src={assets.stack_icon} alt="Library" />
              <p className="font-semibold">{t('yourLibrary')}</p>
            </div>
            <div style={{ margin: collapsed ? '0 auto' : undefined }} className="flex items-center gap-4 px-1 shrink-0">
              <img
                onClick={onToggleCollapse}
                style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                className="w-5 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110"
                src={assets.arrow_icon}
                alt="Arrow"
                title={collapsed ? 'Розгорнути' : 'Згорнути'}
              />
              <img
                onClick={() => setIsModalOpen(true)}
                className="w-5 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition"
                src={assets.plus_icon}
                alt="Створити плейлист"
                title="Створити плейлист"
              />
              <button
                onClick={onClose}
                aria-label="Закрити бібліотеку"
                className="lg:hidden w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-white hover:scale-110 transition text-lg leading-none"
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ display: collapsed ? "none" : undefined }} className="flex flex-col gap-3 px-2 overflow-y-auto custom-scrollbar flex-1">
            {!token ? (
              <p className="text-sm text-zinc-400 p-4">{t('loginToSeePlaylists')}</p>
            ) : loading ? (
              <p className="text-sm text-zinc-400 p-4">{t('loading')}</p>
            ) : playlists.length === 0 ? (
              <div className="p-4 bg-[#242424] hover:bg-[#2a2a2a] transition-colors rounded-lg flex flex-col items-start gap-1">
                <h1 className="font-bold text-base text-white">{t('createFirstPlaylist')}</h1>
                <p className="text-sm text-white font-light opacity-90">{t('itsEasy')}</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white text-black text-sm font-bold px-4 py-1.5 rounded-full mt-4 hover:scale-105 hover:bg-neutral-200 transition"
                >
                  {t('createPlaylist')}
                </button>
              </div>
            ) : (
              <>
                {/* Список власних плейлистів */}
                <div className="flex flex-col gap-1">
                  {playlists.map((playlist) => (
                    <PlaylistItem key={playlist._id} playlist={playlist} />
                  ))}
                </div>

                {/* Плейлисти колег (публічні) */}
                {sharedPlaylists.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="mt-3 mb-1 px-2">
                      <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Від колег</p>
                    </div>
                    {sharedPlaylists.map((playlist) => (
                      <PlaylistItem key={playlist._id} playlist={playlist} isShared={true} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Модал створення плейлиста */}
      <CreatePlaylistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handlePlaylistCreated}
      />
    </>
  )
}

export default Sidebar