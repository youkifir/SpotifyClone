import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export interface ApiSong {
  _id: string
  name: string
  artist: string
  image: string
  file: string
  desc: string
  duration: string
  genre: string
  album: string | null
  source: string
}

interface AddSongsModalProps {
  isOpen: boolean
  playlistId: string
  existingSongIds: Set<string>
  onClose: () => void
  onAdded: (song: ApiSong) => void
}

const API_BASE = 'http://localhost:5000/api'

const resolveUrl = (path: string) => {
  if (!path) return ''
  return path.startsWith('http') || path.startsWith('data:') ? path : `http://localhost:5000/${path}`
}

function AddSongsModal({ isOpen, playlistId, existingSongIds, onClose, onAdded }: AddSongsModalProps) {
  const { token } = useAuth()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ApiSong[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)

  // дебаунс-пошук: без запиту показуємо весь каталог, із запитом — гібридний пошук бекенду
  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      const run = async () => {
        setLoading(true)
        setError('')
        try {
          const url = query.trim()
            ? `${API_BASE}/songs/search?q=${encodeURIComponent(query.trim())}`
            : `${API_BASE}/songs`
          const response = await fetch(url, { signal: controller.signal })
          if (response.ok) {
            const resData = await response.json()
            const raw = resData.data ?? resData
            const songs: ApiSong[] = Array.isArray(raw) ? raw : raw.songs || []
            setResults(songs)
          } else {
            setError('Не вдалося завантажити пісні')
          }
        } catch (err) {
          if (!(err instanceof DOMException && err.name === 'AbortError')) {
            setError('Не вдалося завантажити пісні')
          }
        } finally {
          setLoading(false)
        }
      }
      run()
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query, isOpen])

  if (!isOpen) return null

  const handleAdd = async (song: ApiSong) => {
    if (!token) return
    setAddingId(song._id)
    try {
      const response = await fetch(`${API_BASE}/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ songId: song._id }),
      })
      if (response.ok) {
        onAdded(song)
      }
    } catch (error) {
      console.error('Помилка додавання треку:', error)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#181818] border border-zinc-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Додати треки</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук пісень або виконавців..."
          className="w-full bg-[#242424] border border-zinc-700 rounded-md p-3 text-sm text-white focus:outline-none focus:border-green-500 transition-colors mb-4"
        />

        {error && <p className="text-red-400 text-sm mb-2 text-center">{error}</p>}

        <div className="flex-1 overflow-y-auto flex flex-col gap-1 -mx-2 px-2">
          {loading ? (
            <p className="text-zinc-400 text-sm p-4 text-center">Завантаження...</p>
          ) : results.length === 0 ? (
            <p className="text-zinc-400 text-sm p-4 text-center">Нічого не знайдено</p>
          ) : (
            results.map((song) => {
              const isAdded = existingSongIds.has(song._id)
              const isAdding = addingId === song._id
              return (
                <div
                  key={song._id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-[#2a2a2a] transition-colors"
                >
                  <img src={resolveUrl(song.image)} alt={song.name} className="w-10 h-10 rounded object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{song.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{song.artist || '—'}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(song)}
                    disabled={isAdded || isAdding}
                    className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition disabled:opacity-50 ${isAdded
                        ? 'bg-transparent border border-zinc-600 text-zinc-500 cursor-default'
                        : 'bg-green-500 text-black hover:scale-105'
                      }`}
                  >
                    {isAdded ? 'Додано' : isAdding ? '...' : 'Додати'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default AddSongsModal