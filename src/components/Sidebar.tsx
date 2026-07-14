import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { onLikeChanged } from '../hooks/Uselike'
import { onPlaylistSongAdded } from './AddToPlaylistMenu'
import CreatePlaylistModal from './CreatePlaylistModal'
import ConfirmDialog from './ConfirmDialog'
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
  createdAt?: string
}

interface FollowedArtist {
  name: string
  photo: string | null
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const getOwnerName = (playlist: Playlist): string => {
  if (!playlist.owner) return ''
  if (typeof playlist.owner === 'string') return ''
  return playlist.owner.name || playlist.owner.username || ''
}

const resolveImage = (playlist: Playlist) => {
  if (playlist.isLikedSongs) return null
  if (!playlist.image) return assets.stack_icon
  if (playlist.image.startsWith('data:') || playlist.image.startsWith('http')) return playlist.image
  return `${API}/${playlist.image}`
}

const resolveArtistImage = (photo: string | null) => {
  if (!photo) return null
  if (photo.startsWith('data:') || photo.startsWith('http')) return photo
  return `${API}/${photo}`
}

type SortOrder = 'recent' | 'name' | 'artist' | 'created'

// Tooltip для collapsed режиму
const CollapsedTooltip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="relative group/tip flex justify-center">
    {children}
    <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[999]
      bg-[#282828] text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-xl
      whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150
      border border-white/10">
      {label}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#282828]" />
    </div>
  </div>
)

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose, collapsed = false, onToggleCollapse }) => {
  const { token } = useAuth()
  const { t, language } = useLanguage()

  const [tab, setTab] = useState<'playlists' | 'artists'>('playlists')
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [sharedPlaylists, setSharedPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [followedArtists, setFollowedArtists] = useState<FollowedArtist[]>([])
  const [artistsLoading, setArtistsLoading] = useState(false)

  const getSongsTranslation = useCallback((count: number): string => {
    const mod10 = count % 10
    const mod100 = count % 100
    if (language === 'uk' || language === 'ru') {
      if (mod100 >= 11 && mod100 <= 19) return t('songsPlural5plus')
      if (mod10 === 1) return t('songsPlural1')
      if (mod10 >= 2 && mod10 <= 4) return t('songsPlural2to4')
      return t('songsPlural5plus')
    }
    return count === 1 ? t('songsPlural1') : t('songsPlural2to4')
  }, [language, t])

  const fetchPlaylists = useCallback(async (silent = false) => {
    if (!token) { setPlaylists([]); return }
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/playlists/my`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        const list: Playlist[] = Array.isArray(data) ? data : (data.data || [])
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
    if (!token) { setSharedPlaylists([]); return }
    try {
      const res = await fetch(`${API_BASE}/playlists/shared`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setSharedPlaylists(Array.isArray(data) ? data : (data.data || []))
      }
    } catch (e) {
      console.error('Sidebar: помилка завантаження спільних плейлистів', e)
    }
  }, [token])

  const fetchFollowedArtists = useCallback(async () => {
    if (!token) { setFollowedArtists([]); return }
    setArtistsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/following`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        const names: string[] = data.data || []
        // Map names to {name, photo} objects for display
        setFollowedArtists(names.map((name: string) => ({ name, photo: null })))
        // Load photos async
        names.forEach(async (name: string) => {
          try {
            const r = await fetch(`${API_BASE}/auth/deezer-artist?name=${encodeURIComponent(name)}`)
            const dz = await r.json()
            const found = dz?.data?.[0]
            const match = found && found.name.toLowerCase().includes(name.split(' ')[0].toLowerCase())
            if (match) {
              setFollowedArtists(prev => prev.map(a => a.name === name ? { ...a, photo: found.picture_medium } : a))
            }
          } catch {}
        })
      } else {
        setFollowedArtists([])
      }
    } catch (e) {
      console.error('Sidebar: помилка завантаження підписок', e)
      setFollowedArtists([])
    } finally {
      setArtistsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchPlaylists()
    fetchSharedPlaylists()
    fetchFollowedArtists()
  }, [fetchPlaylists, fetchSharedPlaylists, fetchFollowedArtists])

  useEffect(() => {
    const unsubLike = onLikeChanged(() => fetchPlaylists(true))
    const unsubAdd = onPlaylistSongAdded(() => fetchPlaylists(true))
    const handleFollowChange = () => fetchFollowedArtists()
    window.addEventListener('follow-changed', handleFollowChange)
    return () => {
      unsubLike()
      unsubAdd()
      window.removeEventListener('follow-changed', handleFollowChange)
    }
  }, [fetchPlaylists, fetchFollowedArtists])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setSortMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sortedPlaylistsList = useMemo(() => {
    if (!playlists.length) return []
    const likedSongs = playlists.filter(p => p.isLikedSongs)
    const restPlaylists = playlists.filter(p => !p.isLikedSongs)
    const sorted = [...restPlaylists].sort((a, b) => {
      switch (sortOrder) {
        case 'name': return a.name.localeCompare(b.name)
        case 'artist': return getOwnerName(a).localeCompare(getOwnerName(b))
        case 'created': {
          const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dB - dA
        }
        default: return b._id.localeCompare(a._id)
      }
    })
    return [...likedSongs, ...sorted]
  }, [playlists, sortOrder])

  const handlePlaylistCreated = (newPlaylist: CreatedPlaylist) => {
    setPlaylists((prev) => {
      const withNew = [newPlaylist as unknown as Playlist, ...prev]
      withNew.sort((a, b) => (b.isLikedSongs ? 1 : 0) - (a.isLikedSongs ? 1 : 0))
      return withNew
    })
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleDelete = (e: React.MouseEvent, playlistId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!token) return
    setConfirmDeleteId(playlistId)
  }

  const confirmDeletePlaylist = async () => {
    if (!token || !confirmDeleteId) return
    const playlistId = confirmDeleteId
    setConfirmDeleteId(null)
    setDeletingId(playlistId)
    try {
      const response = await fetch(`${API_BASE}/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) setPlaylists((prev) => prev.filter((p) => p._id !== playlistId))
    } catch (error) {
      console.error('Помилка видалення плейлиста:', error)
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Thumbnail плейлиста ───────────────────────────────────────────────────
  const PlaylistThumb = ({ playlist, size = 'md' }: { playlist: Playlist; size?: 'sm' | 'md' }) => {
    const img = resolveImage(playlist)
    const cls = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'

    if (playlist.isLikedSongs) {
      return (
        <div
          className={`${cls} rounded-md shrink-0 flex items-center justify-center shadow-md`}
          style={{ background: 'linear-gradient(135deg, #4b2f8a 0%, #1d89e4 100%)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      )
    }
    if (img && img !== assets.stack_icon) {
      return <img className={`${cls} rounded-md object-cover shrink-0 shadow-md`} src={img} alt={playlist.name} />
    }
    return (
      <div className={`${cls} rounded-md shrink-0 bg-[#2a2a2a] flex items-center justify-center shadow-md`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#a3a3a3">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>
    )
  }

  // ─── Елемент плейлиста (розгорнутий) ──────────────────────────────────────
  const PlaylistItem = ({ playlist, isShared = false }: { playlist: Playlist; isShared?: boolean }) => {
    const songCount = playlist.songs?.length ?? 0
    const songsWord = getSongsTranslation(songCount)
    const displayName = playlist.isLikedSongs ? t('likedSongsTitle') : playlist.name

    let subtext = t('playlistLabel')
    if (playlist.isLikedSongs) {
      subtext = `${t('playlistLabel')} • ${songCount} ${songsWord}`
    } else {
      const creator = getOwnerName(playlist)
      if (creator) subtext = `${t('playlistLabel')} • ${creator}`
    }

    return (
      <Link
        to={`/playlist/${playlist._id}`}
        onClick={onClose}
        className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
      >
        <PlaylistThumb playlist={playlist} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-white truncate group-hover:text-[#1db954] transition-colors leading-tight">
            {displayName}
          </p>
          <p className="text-xs text-neutral-500 truncate mt-0.5 leading-tight">
            {subtext}
          </p>
        </div>
        {!isShared && !playlist.isLikedSongs && (
          <button
            onClick={(e) => handleDelete(e, playlist._id)}
            disabled={deletingId === playlist._id}
            aria-label="Видалити плейлист"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-zinc-600
              hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </Link>
    )
  }

  // ─── Collapsed: елемент плейлиста (іконка + tooltip) ──────────────────────
  const CollapsedPlaylistItem = ({ playlist }: { playlist: Playlist }) => {
    const displayName = playlist.isLikedSongs ? t('likedSongsTitle') : playlist.name
    return (
      <CollapsedTooltip label={displayName}>
        <Link
          to={`/playlist/${playlist._id}`}
          onClick={onClose}
          className="flex items-center justify-center w-11 h-11 rounded-md hover:scale-105 transition-transform"
        >
          <PlaylistThumb playlist={playlist} size="md" />
        </Link>
      </CollapsedTooltip>
    )
  }

  // ─── Collapsed: елемент виконавця ─────────────────────────────────────────
  const CollapsedArtistItem = ({ name, photo }: { name: string; photo: string | null }) => {
    const artistImg = resolveArtistImage(photo)
    return (
      <CollapsedTooltip label={name}>
        <Link
          to={`/artist/${encodeURIComponent(name)}`}
          onClick={onClose}
          className="flex items-center justify-center hover:scale-105 transition-transform"
        >
          {artistImg
            ? <img src={artistImg} alt={name} className="w-11 h-11 rounded-full object-cover shadow-md ring-2 ring-transparent hover:ring-[#1db954] transition-all" />
            : <div className="w-11 h-11 rounded-full bg-[#2a2a2a] flex items-center justify-center text-lg shadow-md">🎤</div>
          }
        </Link>
      </CollapsedTooltip>
    )
  }

  // ─── Collapsed sidebar ─────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <>
        <div
          style={{ width: '72px' }}
          className="fixed lg:static top-0 left-0 h-full flex flex-col text-white shrink-0 z-50 lg:z-auto"
        >
          <div className="bg-[#121212] h-full lg:rounded-lg flex flex-col items-center py-3 gap-1 overflow-hidden">

            {/* Заголовок: іконка бібліотеки + кнопка розгорнути */}
            <div className="flex flex-col items-center gap-2 pb-2 border-b border-white/5 w-full px-2">
              <CollapsedTooltip label={t('yourLibrary')}>
                <button
                  onClick={onToggleCollapse}
                  className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors group/lib"
                >
                  <img
                    src={assets.stack_icon}
                    alt="Library"
                    className="w-5 h-5 opacity-70 group-hover/lib:opacity-100 transition-opacity"
                  />
                </button>
              </CollapsedTooltip>

              <CollapsedTooltip label={t('createPlaylist')}>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors group/plus"
                >
                  <img
                    src={assets.plus_icon}
                    alt="Plus"
                    className="w-5 h-5 opacity-70 group-hover/plus:opacity-100 transition-opacity"
                  />
                </button>
              </CollapsedTooltip>
            </div>

            {/* Список плейлистів / виконавців */}
            <div className="flex flex-col items-center gap-1.5 overflow-y-auto custom-scrollbar flex-1 w-full px-2 pt-1">
              {!token ? null : tab === 'playlists' ? (
                loading ? (
                  <>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-11 h-11 rounded-md bg-[#2a2a2a] animate-pulse shrink-0" />
                    ))}
                  </>
                ) : (
                  sortedPlaylistsList.map((playlist) => (
                    <CollapsedPlaylistItem key={playlist._id} playlist={playlist} />
                  ))
                )
              ) : (
                artistsLoading ? (
                  <>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-11 h-11 rounded-full bg-[#2a2a2a] animate-pulse shrink-0" />
                    ))}
                  </>
                ) : (
                  followedArtists.map(({ name, photo }) => (
                    <CollapsedArtistItem key={name} name={name} photo={photo} />
                  ))
                )
              )}
            </div>

          </div>
        </div>

        <CreatePlaylistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={handlePlaylistCreated} />
        <ConfirmDialog
          isOpen={!!confirmDeleteId}
          title={t('deletePlaylistTitle')}
          message={t('deletePlaylistConfirm')}
          confirmText={t('deleteBtn')}
          danger
          loading={!!deletingId}
          onConfirm={confirmDeletePlaylist}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </>
    )
  }

  // ─── Expanded sidebar ──────────────────────────────────────────────────────
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      <div
        className={`fixed lg:static top-0 left-0 h-full w-[78%] lg:w-full flex flex-col text-white shrink-0 z-50 lg:z-auto
          transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="bg-[#121212] h-full lg:rounded-lg p-2 flex flex-col gap-2 overflow-hidden">

          {/* Header */}
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img className="w-5 h-5 opacity-80" src={assets.stack_icon} alt="Library" />
              <span className="font-bold text-sm text-white tracking-wide">{t('yourLibrary')}</span>
            </div>
            <div className="flex items-center gap-1">
              {tab === 'playlists' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  title={t('createPlaylist')}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors group/plus"
                >
                  <img src={assets.plus_icon} alt="Plus" className="w-4 h-4 opacity-60 group-hover/plus:opacity-100 transition-opacity" />
                </button>
              )}
              <button
                onClick={onToggleCollapse}
                title="Згорнути"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors group/arr"
              >
                <img
                  src={assets.arrow_icon}
                  alt="Collapse"
                  className="w-4 h-4 opacity-60 group-hover/arr:opacity-100 transition-opacity"
                />
              </button>
              <button
                onClick={onClose}
                className="lg:hidden w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition text-base"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1.5 px-2">
            <button
              onClick={() => setTab('playlists')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${tab === 'playlists'
                  ? 'bg-white text-black shadow'
                  : 'bg-[#242424] text-neutral-400 hover:text-white hover:bg-[#2a2a2a]'
                }`}
            >
              {t('sidebarTabPlaylists')}
            </button>
            <button
              onClick={() => setTab('artists')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${tab === 'artists'
                  ? 'bg-white text-black shadow'
                  : 'bg-[#242424] text-neutral-400 hover:text-white hover:bg-[#2a2a2a]'
                }`}
            >
              {t('sidebarTabArtists')}
            </button>
          </div>

          {/* Sort row */}
          {tab === 'playlists' && token && playlists.length > 0 && (
            <div className="px-2" ref={sortMenuRef}>
              <div className="relative">
                <button
                  onClick={() => setSortMenuOpen(o => !o)}
                  className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition px-2 py-1 rounded-md hover:bg-white/5"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M7 12h10M11 18h2" />
                  </svg>
                  <span className="font-semibold truncate max-w-[120px]">
                    {sortOrder === 'recent' ? t('sortRecent')
                      : sortOrder === 'name' ? t('sortByName')
                        : sortOrder === 'artist' ? t('sortByArtist')
                          : t('sortByCreated')}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"
                    className={`shrink-0 transition-transform duration-200 ${sortMenuOpen ? 'rotate-180' : ''}`}>
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </button>

                {sortMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-[#282828] rounded-lg shadow-2xl z-50 overflow-hidden min-w-[180px] border border-white/5">
                    {([
                      { key: 'recent', label: t('sortRecent') },
                      { key: 'name', label: t('sortByName') },
                      { key: 'artist', label: t('sortByArtist') },
                      { key: 'created', label: t('sortByCreated') },
                    ] as { key: SortOrder; label: string }[]).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => { setSortOrder(key); setSortMenuOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between gap-3 transition-colors
                          ${sortOrder === key ? 'text-[#1db954] font-semibold' : 'text-neutral-300'} hover:bg-white/5`}
                      >
                        {label}
                        {sortOrder === key && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex flex-col gap-0.5 px-1 overflow-y-auto custom-scrollbar flex-1 pb-2">
            {!token ? (
              <p className="text-sm text-zinc-500 px-4 py-6 text-center">{t('loginToSeePlaylists')}</p>
            ) : tab === 'playlists' ? (
              loading ? (
                <p className="text-sm text-zinc-500 px-4 py-4">{t('loading')}</p>
              ) : playlists.length === 0 ? (
                <div className="mx-2 mt-2 p-4 bg-[#1a1a1a] rounded-xl flex flex-col items-start gap-1">
                  <h1 className="font-bold text-sm text-white">{t('createFirstPlaylist')}</h1>
                  <p className="text-xs text-neutral-400 font-light">{t('itsEasy')}</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full mt-3 hover:scale-105 hover:bg-neutral-200 transition"
                  >
                    {t('createPlaylist')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-0.5">
                    {sortedPlaylistsList.map((playlist) => (
                      <PlaylistItem key={playlist._id} playlist={playlist} />
                    ))}
                  </div>
                  {sharedPlaylists.length > 0 && (
                    <div className="flex flex-col gap-0.5 mt-3">
                      <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest px-2 mb-1">
                        {t('fromColleagues')}
                      </p>
                      {sharedPlaylists.map((playlist) => (
                        <PlaylistItem key={playlist._id} playlist={playlist} isShared />
                      ))}
                    </div>
                  )}
                </>
              )
            ) : (
              artistsLoading ? (
                <div className="flex flex-col gap-1.5 pt-2 px-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-1.5 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-[#2a2a2a] shrink-0" />
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="h-3 w-24 rounded bg-[#2a2a2a]" />
                        <div className="h-2.5 w-16 rounded bg-[#222]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : followedArtists.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="text-3xl mb-2">🎤</div>
                  <p className="text-white font-semibold text-sm mb-1">{t('sidebarNoFollowing')}</p>
                  <p className="text-neutral-500 text-xs">{t('sidebarNoFollowingHint')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 pt-1">
                  {followedArtists.map(({ name, photo }) => {
                    const artistImg = resolveArtistImage(photo)
                    return (
                      <Link
                        key={name}
                        to={`/artist/${encodeURIComponent(name)}`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        {artistImg
                          ? <img src={artistImg} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0 shadow" />
                          : <div className="w-10 h-10 rounded-full bg-[#282828] shrink-0 flex items-center justify-center text-lg">🎤</div>
                        }
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-white truncate group-hover:text-[#1db954] transition-colors leading-tight">{name}</p>
                          <p className="text-xs text-neutral-500 mt-0.5 leading-tight">{t('artistLabel2')}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <CreatePlaylistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={handlePlaylistCreated} />
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title={t('deletePlaylistTitle')}
        message={t('deletePlaylistConfirm')}
        confirmText={t('deleteBtn')}
        danger
        loading={!!deletingId}
        onConfirm={confirmDeletePlaylist}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  )
}

export default Sidebar