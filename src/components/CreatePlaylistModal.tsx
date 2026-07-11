import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fileToCompressedDataUrl } from '../utils/imageCompression'

export interface Playlist {
  _id: string
  name: string
  description: string
  image: string
  owner: string
  songs: unknown[]
  isPublic: boolean
}

interface CreatePlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (playlist: Playlist) => void
}

const API_BASE = 'http://localhost:5000/api'

function CreatePlaylistModal({ isOpen, onClose, onCreated }: CreatePlaylistModalProps) {
  const { token } = useAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [name, setName] = useState('')
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const resetAndClose = () => {
    setName('')
    setImagePreview('')
    setIsPublic(false)
    setError('')
    setLoading(false)
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Оберіть файл зображення')
      return
    }

    try {
      setError('')
      const compressed = await fileToCompressedDataUrl(file)
      setImagePreview(compressed)
    } catch {
      setError('Не вдалося обробити зображення. Спробуйте інший файл.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Потрібно увійти в акаунт')
      return
    }
    if (!name.trim()) {
      setError('Введіть назву плейлиста')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          image: imagePreview,
          isPublic,
        }),
      })

      const resData = await response.json()

      if (!response.ok) {
        throw new Error(resData.message || 'Не вдалося створити плейлист')
      }

      const playlist: Playlist = resData.data || resData
      onCreated(playlist)
      resetAndClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка з\'єднання з сервером')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4"
      onClick={resetAndClose}
    >
      <div
        className="bg-[#181818] border border-zinc-700 rounded-xl w-full max-w-sm p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-6">Створити плейлист</h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-md mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* обкладинка */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 rounded-md bg-[#242424] border border-zinc-700 hover:border-zinc-500 flex items-center justify-center overflow-hidden shrink-0 transition-colors"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Обкладинка плейлиста" className="w-full h-full object-cover" />
              ) : (
                <span className="text-zinc-400 text-xs text-center px-2">Додати фото</span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Назва
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#242424] border border-zinc-700 rounded-md p-3 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
              placeholder="Мій плейлист"
            />
          </div>

          {/* Перемикач публічності */}
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-sm font-medium text-white">Публічний плейлист</p>
              <p className="text-xs text-zinc-400">Колеги побачать його у своїй бібліотеці</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                isPublic ? 'bg-green-500' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="flex-1 bg-transparent border border-zinc-600 text-white font-semibold p-3 rounded-full hover:border-white transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-500 text-black font-bold p-3 rounded-full hover:scale-104 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Створення...' : 'Створити'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePlaylistModal