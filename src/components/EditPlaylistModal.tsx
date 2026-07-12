import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fileToCompressedDataUrl } from '../utils/imageCompression'
import type { Playlist } from './CreatePlaylistModal'

interface EditPlaylistModalProps {
  isOpen: boolean
  playlist: Playlist
  onClose: () => void
  onSaved: (playlist: Playlist) => void
  onDeleted: () => void
}

const API_BASE = 'http://localhost:5000/api'

function EditPlaylistModal({ isOpen, playlist, onClose, onSaved, onDeleted }: EditPlaylistModalProps) {
  const { token } = useAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [name, setName] = useState(playlist.name)
  const [imagePreview, setImagePreview] = useState<string>(playlist.image || '')
  const [isPublic, setIsPublic] = useState(playlist.isPublic ?? false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setError('')
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
      const response = await fetch(`${API_BASE}/playlists/${playlist._id}`, {
        method: 'PUT',
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
        throw new Error(resData.message || 'Не вдалося оновити плейлист')
      }

      onSaved(resData.data || resData)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка з\'єднання з сервером')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!token) return
    if (!window.confirm('Видалити цей плейлист? Цю дію не можна скасувати.')) return

    setDeleting(true)
    try {
      const response = await fetch(`${API_BASE}/playlists/${playlist._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        onDeleted()
      }
    } catch (error) {
      console.error('Помилка видалення плейлиста:', error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-[#181818] border border-zinc-700 rounded-xl w-full max-w-sm p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-6">Редагувати плейлист</h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-md mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              onClick={handleClose}
              className="flex-1 bg-transparent border border-zinc-600 text-white font-semibold p-3 rounded-full hover:border-white transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-500 text-black font-bold p-3 rounded-full hover:scale-104 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 hover:text-red-300 text-sm font-medium mt-2 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Видалення...' : 'Видалити плейлист'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default EditPlaylistModal
