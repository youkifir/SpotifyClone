import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:5000'

// Подія: трек додано до плейлісту — слухається у PlaylistPage для live-оновлення
const playlistEventTarget = new EventTarget()
const PLAYLIST_SONG_ADDED = 'playlist-song-added'

export function emitPlaylistSongAdded(playlistId: string) {
  const e = new CustomEvent(PLAYLIST_SONG_ADDED, { detail: { playlistId } })
  playlistEventTarget.dispatchEvent(e)
}
export function onPlaylistSongAdded(cb: (playlistId: string) => void) {
  const handler = (e: Event) => cb((e as CustomEvent).detail.playlistId)
  playlistEventTarget.addEventListener(PLAYLIST_SONG_ADDED, handler)
  return () => playlistEventTarget.removeEventListener(PLAYLIST_SONG_ADDED, handler)
}

interface Playlist {
  _id: string
  name: string
  image: string
  isLikedSongs?: boolean
}

interface AddToPlaylistMenuProps {
  songId: string | number
  onClose: () => void
  anchorEl: HTMLElement | null
}

function AddToPlaylistMenu({ songId, onClose, anchorEl }: AddToPlaylistMenuProps) {
  const { token } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [errorId, setErrorId] = useState<string | null>(null)

  // Позиція меню відносно кнопки
  const [pos, setPos] = useState({ top: 0, left: 0, openUpward: false })

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const menuWidth = 240
    const menuHeight = 300
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight

    let left = rect.right + 8
    if (left + menuWidth > window.innerWidth) {
      left = rect.left - menuWidth - 8
    }
    if (left < 8) left = 8

    const top = openUpward
      ? rect.top - menuHeight + window.scrollY
      : rect.bottom + 4 + window.scrollY

    setPos({ top, left, openUpward })
  }, [anchorEl])

  // Завантажуємо свої плейлисти (крім Liked Songs)
  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch(`${API}/api/playlists/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list: Playlist[] = Array.isArray(data) ? data : (data.data || [])
        setPlaylists(list.filter((p) => !p.isLikedSongs))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  // Закриваємо при кліку поза меню
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Затримка, щоб не спрацювало одразу після відкриття
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  // Закриваємо по Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleAdd = async (playlistId: string) => {
    if (!token || addingId || addedIds.has(playlistId)) return
    setAddingId(playlistId)
    setErrorId(null)
    try {
      const res = await fetch(`${API}/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ songId: String(songId) }),
      })
      if (res.ok || res.status === 409) {
        setAddedIds(prev => new Set([...prev, playlistId]))
        if (res.ok) emitPlaylistSongAdded(playlistId)
      } else {
        setErrorId(playlistId)
        setTimeout(() => setErrorId(null), 2000)
      }
    } catch {
      setErrorId(playlistId)
      setTimeout(() => setErrorId(null), 2000)
    } finally {
      setAddingId(null)
    }
  }

  const getImage = (p: Playlist) => {
    if (!p.image) return null
    if (p.image.startsWith('data:') || p.image.startsWith('http')) return p.image
    return `${API}/${p.image}`
  }

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-60 bg-[#282828] rounded-lg shadow-2xl border border-[#3a3a3a] overflow-hidden text-white text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3a3a3a]">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
          Додати до плейліста
        </p>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-white/10"
          aria-label="Закрити"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Список плейлистів */}
      {loading ? (
        <div className="px-4 py-4 flex items-center gap-2 text-neutral-400 text-xs">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
          Завантаження...
        </div>
      ) : playlists.length === 0 ? (
        <div className="px-4 py-4 text-neutral-400 text-xs text-center">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          Немає плейлистів
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-[#3a3a3a]">
          {playlists.map((p) => {
            const img = getImage(p)
            const isAdded = addedIds.has(p._id)
            const isError = errorId === p._id
            const isAdding = addingId === p._id

            return (
              <button
                key={p._id}
                onClick={() => handleAdd(p._id)}
                disabled={!!addingId || isAdded}
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left group
                  ${isAdded
                    ? 'bg-[#1db954]/10 cursor-default'
                    : isError
                    ? 'hover:bg-red-500/10'
                    : 'hover:bg-[#3a3a3a] active:bg-[#444] cursor-pointer'
                  }
                  disabled:cursor-default`}
              >
                {/* Мініатюра плейліста */}
                {img ? (
                  <img src={img} alt={p.name} className="w-9 h-9 rounded object-cover shrink-0 shadow" />
                ) : (
                  <div className="w-9 h-9 rounded bg-[#3a3a3a] flex items-center justify-center shrink-0 shadow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#b3b3b3">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}

                <span className="flex-1 truncate text-sm">
                  {isError ? (
                    <span className="text-red-400 text-xs">Помилка, спробуй ще</span>
                  ) : isAdding ? (
                    <span className="text-neutral-400">Додаємо...</span>
                  ) : (
                    <span className={isAdded ? 'text-[#1db954]' : 'text-white'}>{p.name}</span>
                  )}
                </span>

                {/* Іконка стану */}
                <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                  {isAdded ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1db954" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isAdding ? (
                    <svg className="animate-spin w-3 h-3 text-neutral-400" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                    </svg>
                  ) : (
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      className="text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Підвал з кнопкою "Готово" якщо щось додано */}
      {addedIds.size > 0 && (
        <div className="px-3 py-2 border-t border-[#3a3a3a]">
          <button
            onClick={onClose}
            className="w-full py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors"
          >
            Готово
          </button>
        </div>
      )}
    </div>
  )
}

export default AddToPlaylistMenu