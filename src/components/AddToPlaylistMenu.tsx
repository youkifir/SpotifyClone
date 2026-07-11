import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:5000'

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
  const [successId, setSuccessId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  // Позиція меню відносно кнопки
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const menuWidth = 220
    const left = rect.right + 8 + menuWidth > window.innerWidth
      ? rect.left - menuWidth - 8
      : rect.right + 8
    setPos({ top: rect.top + window.scrollY, left })
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
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Закриваємо по Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleAdd = async (playlistId: string) => {
    if (!token || addingId) return
    setAddingId(playlistId)
    setSuccessId(null)
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
        // 409 — вже є в плейлисті, теж "ок" для UX
        setSuccessId(playlistId)
        setTimeout(onClose, 800)
      } else {
        setErrorId(playlistId)
      }
    } catch {
      setErrorId(playlistId)
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
      className="w-55 bg-[#282828] rounded-md shadow-2xl border border-[#3a3a3a] py-1 text-white text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-4 py-2 text-xs text-neutral-400 font-semibold uppercase tracking-wider border-b border-[#3a3a3a]">
        Додати до плейліста
      </p>

      {loading ? (
        <div className="px-4 py-3 text-neutral-400 text-xs">Завантаження...</div>
      ) : playlists.length === 0 ? (
        <div className="px-4 py-3 text-neutral-400 text-xs">Немає плейлистів</div>
      ) : (
        <div className="max-h-60 overflow-y-auto">
          {playlists.map((p) => {
            const img = getImage(p)
            const isSuccess = successId === p._id
            const isError = errorId === p._id
            const isAdding = addingId === p._id
            return (
              <button
                key={p._id}
                onClick={() => handleAdd(p._id)}
                disabled={!!addingId || isSuccess}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#3a3a3a] transition-colors text-left disabled:cursor-default"
              >
                {/* Мініатюра плейліста */}
                {img ? (
                  <img src={img} alt={p.name} className="w-8 h-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-[#3a3a3a] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#b3b3b3">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}

                <span className="flex-1 truncate text-sm">
                  {isSuccess ? (
                    <span className="text-[#1db954]">✓ Додано!</span>
                  ) : isError ? (
                    <span className="text-red-400">Помилка</span>
                  ) : isAdding ? (
                    <span className="text-neutral-400">Додаємо...</span>
                  ) : (
                    p.name
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AddToPlaylistMenu