import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/usePlayer'
import { Navigate } from 'react-router-dom'

const API = 'http://localhost:5000'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Album {
  _id: string
  name: string
  image: string
  desc: string
  bgColor: string
  createdAt: string
}

interface Song {
  _id: string
  name: string
  artist: string
  image: string
  file: string
  desc: string
  duration: string
  genre: string
  album: string | null
  source: 'local' | 'itunes'
}

type Tab = 'albums' | 'songs'
type ModalMode = 'create' | 'edit'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const imgSrc = (url: string) =>
  url?.startsWith('http') ? url : `${API}/${url}`

const authHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

// ─── File Upload Helper ───────────────────────────────────────────────────────

async function uploadFile(file: File, token: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Помилка завантаження файлу')
  return data.data.url
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-2xl
        ${ok ? 'bg-[#1db954] text-black' : 'bg-red-500 text-white'}`}
    >
      {msg}
    </div>
  )
}

function ConfirmModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#282828] rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-white font-semibold text-base mb-6">{title}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-bold text-neutral-300 hover:text-white border border-neutral-600 hover:border-neutral-400 transition"
          >
            Скасувати
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-full text-sm font-bold bg-red-500 hover:bg-red-400 text-white transition"
          >
            Видалити
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Album Modal ─────────────────────────────────────────────────────────────

function AlbumModal({
  mode,
  initial,
  token,
  onClose,
  onSaved,
}: {
  mode: ModalMode
  initial?: Album
  token: string
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    image: initial?.image ?? '',
    desc: initial?.desc ?? '',
    bgColor: initial?.bgColor ?? '#333333',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let imageUrl = form.image
      if (imageFile) {
        imageUrl = await uploadFile(imageFile, token)
      }

      const url = mode === 'create' ? `${API}/api/albums` : `${API}/api/albums/${initial!._id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ ...form, image: imageUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка')
      onSaved(mode === 'create' ? 'Альбом створено!' : 'Альбом оновлено!')
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#282828] rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">
            {mode === 'create' ? 'Новий альбом' : 'Редагувати альбом'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none transition">✕</button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Назва" required>
            <input
              required
              value={form.name}
              onChange={set('name')}
              placeholder="Назва альбому"
              className="admin-input"
            />
          </Field>

          <Field label="Обкладинка">
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="admin-input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#1db954]/20 file:text-[#1db954] hover:file:bg-[#1db954]/30"
              />
              <p className="text-neutral-500 text-xs">або вкажіть URL:</p>
              <input
                value={form.image}
                onChange={set('image')}
                placeholder="https://... або /images/img1.jpg"
                className="admin-input"
                disabled={!!imageFile}
              />
            </div>
          </Field>

          <Field label="Опис">
            <textarea
              value={form.desc}
              onChange={set('desc')}
              placeholder="Короткий опис альбому"
              rows={2}
              className="admin-input resize-none"
            />
          </Field>
          <Field label="Фоновий колір">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.bgColor}
                onChange={set('bgColor')}
                className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
              />
              <input
                value={form.bgColor}
                onChange={set('bgColor')}
                placeholder="#333333"
                className="admin-input flex-1"
              />
            </div>
          </Field>

          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-bold text-neutral-300 hover:text-white border border-neutral-600 hover:border-neutral-400 transition"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-full text-sm font-bold bg-[#1db954] hover:bg-[#1ed760] text-black transition disabled:opacity-50"
            >
              {loading ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Song Modal ───────────────────────────────────────────────────────────────

function SongModal({
  mode,
  initial,
  token,
  albums,
  onClose,
  onSaved,
}: {
  mode: ModalMode
  initial?: Song
  token: string
  albums: Album[]
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    artist: initial?.artist ?? '',
    image: initial?.image ?? '',
    file: initial?.file ?? '',
    desc: initial?.desc ?? '',
    duration: initial?.duration ?? '0:00',
    genre: initial?.genre ?? '',
    album: initial?.album ?? '',
    source: initial?.source ?? 'local',
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  // Автоматически вычисляем длительность из аудио файла
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setAudioFile(file)
    if (file) {
      const audio = new Audio()
      const url = URL.createObjectURL(file)
      audio.src = url
      audio.onloadedmetadata = () => {
        const mins = Math.floor(audio.duration / 60)
        const secs = Math.floor(audio.duration % 60)
        setForm(f => ({ ...f, duration: `${mins}:${secs.toString().padStart(2, '0')}` }))
        URL.revokeObjectURL(url)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let imageUrl = form.image
      let fileUrl = form.file

      if (imageFile) {
        setUploadProgress('Завантаження обкладинки...')
        imageUrl = await uploadFile(imageFile, token)
      }
      if (audioFile) {
        setUploadProgress('Завантаження аудіо...')
        fileUrl = await uploadFile(audioFile, token)
      }

      setUploadProgress('Збереження...')
      const body = { ...form, image: imageUrl, file: fileUrl, album: form.album || null }
      const url = mode === 'create' ? `${API}/api/songs` : `${API}/api/songs/${initial!._id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка')
      onSaved(mode === 'create' ? 'Пісню додано!' : 'Пісню оновлено!')
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-[#282828] rounded-xl p-6 w-full max-w-lg shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">
            {mode === 'create' ? 'Нова пісня' : 'Редагувати пісню'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none transition">✕</button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Назва пісні" required>
              <input required value={form.name} onChange={set('name')} placeholder="Назва" className="admin-input" />
            </Field>
            <Field label="Виконавець">
              <input value={form.artist} onChange={set('artist')} placeholder="Автор" className="admin-input" />
            </Field>
          </div>

          {/* Обкладинка */}
          <Field label="Обкладинка">
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="admin-input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#1db954]/20 file:text-[#1db954] hover:file:bg-[#1db954]/30"
              />
              <p className="text-neutral-500 text-xs">або вкажіть URL обкладинки:</p>
              <input
                value={form.image}
                onChange={set('image')}
                placeholder="https://..."
                className="admin-input"
                disabled={!!imageFile}
              />
            </div>
          </Field>

          {/* Аудіо файл */}
          <Field label="Аудіофайл" required>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                className="admin-input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#1db954]/20 file:text-[#1db954] hover:file:bg-[#1db954]/30"
              />
              <p className="text-neutral-500 text-xs">або вкажіть URL аудіо:</p>
              <input
                value={form.file}
                onChange={set('file')}
                placeholder="https://... або /songs/song1.mp3"
                className="admin-input"
                disabled={!!audioFile}
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Жанр">
              <input value={form.genre} onChange={set('genre')} placeholder="Pop, Rock, Hip-Hop..." className="admin-input" />
            </Field>
            <Field label="Тривалість">
              <input value={form.duration} onChange={set('duration')} placeholder="3:45" className="admin-input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Альбом">
              <select value={form.album} onChange={set('album')} className="admin-input">
                <option value="">— Без альбому —</option>
                {albums.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Джерело">
              <select value={form.source} onChange={set('source')} className="admin-input">
                <option value="local">local</option>
                <option value="itunes">itunes</option>
              </select>
            </Field>
          </div>

          <Field label="Опис">
            <textarea value={form.desc} onChange={set('desc')} placeholder="Короткий опис..." rows={2} className="admin-input resize-none" />
          </Field>

          <div className="flex gap-3 justify-end mt-2 items-center">
            {loading && uploadProgress && (
              <span className="text-[#1db954] text-xs animate-pulse">{uploadProgress}</span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-bold text-neutral-300 hover:text-white border border-neutral-600 hover:border-neutral-400 transition"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={loading || (!form.file && !audioFile)}
              className="px-5 py-2 rounded-full text-sm font-bold bg-[#1db954] hover:bg-[#1ed760] text-black transition disabled:opacity-50"
            >
              {loading ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
        {label}{required && <span className="text-[#1db954] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Main AdminPanel ─────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user, token } = useAuth()
  const { refreshSongs } = usePlayer()

  const [tab, setTab] = useState<Tab>('albums')
  const [albums, setAlbums] = useState<Album[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const [albumModal, setAlbumModal] = useState<{ mode: ModalMode; item?: Album } | null>(null)
  const [songModal, setSongModal] = useState<{ mode: ModalMode; item?: Song } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'album' | 'song'; id: string; name: string } | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  if (!user || user.role !== 'admin') return <Navigate to="/" replace />

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchAlbums = async () => {
    const res = await fetch(`${API}/api/albums`)
    const data = await res.json()
    setAlbums(data.data ?? data)
  }

  const fetchSongs = async () => {
    const res = await fetch(`${API}/api/songs`)
    const data = await res.json()
    setSongs(data.data ?? data)
  }

  useEffect(() => {
    setLoadingData(true)
    Promise.all([fetchAlbums(), fetchSongs()]).finally(() => setLoadingData(false))
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget || !token) return
    const { type, id } = deleteTarget
    try {
      const res = await fetch(`${API}/api/${type === 'album' ? 'albums' : 'songs'}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Помилка видалення')
      showToast(type === 'album' ? 'Альбом видалено!' : 'Пісню видалено!')
      if (type === 'album') {
        fetchAlbums()
      } else {
        fetchSongs()
        refreshSongs() // Обновляем плеер
      }
    } catch (err: any) {
      showToast(err.message, false)
    } finally {
      setDeleteTarget(null)
    }
  }

  const albumName = (id: string | null) => {
    if (!id) return '—'
    return albums.find((a) => a._id === id)?.name ?? '—'
  }

  return (
    <div className="pt-2 sm:pt-4 flex flex-col gap-6 min-h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1db954] mb-1">Панель адміністратора</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Управління контентом</h1>
        </div>
        <div className="flex items-center gap-2 bg-[#1db954]/10 border border-[#1db954]/30 rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-[#1db954] animate-pulse shrink-0" />
          <span className="text-[#1db954] text-xs font-semibold hidden sm:inline">{user.username}</span>
          <span className="text-[#1db954]/60 text-xs hidden sm:inline">•</span>
          <span className="text-[#1db954]/60 text-xs hidden sm:inline">admin</span>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Альбомів', value: albums.length, color: 'text-white' },
          { label: 'Пісень', value: songs.length, color: 'text-white' },
          { label: 'Жанрів', value: [...new Set(songs.map((s) => s.genre).filter(Boolean))].length, color: 'text-white' },
          { label: 'iTunes треків', value: songs.filter((s) => s.source === 'itunes').length, color: 'text-[#1db954]' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#181818] hover:bg-[#1f1f1f] transition rounded-xl p-4">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-neutral-400 mt-0.5 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center justify-between">
        <div className="flex bg-[#181818] rounded-full p-1 gap-1">
          {(['albums', 'songs'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition ${
                tab === t
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t === 'albums' ? 'Альбоми' : 'Пісні'}
            </button>
          ))}
        </div>

        <button
          onClick={() =>
            tab === 'albums'
              ? setAlbumModal({ mode: 'create' })
              : setSongModal({ mode: 'create' })
          }
          className="flex items-center gap-2 bg-[#1db954] hover:bg-[#1ed760] text-black text-sm font-bold px-4 py-2 rounded-full transition hover:scale-105"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span>{tab === 'albums' ? 'Додати альбом' : 'Додати пісню'}</span>
        </button>
      </div>

      {/* ── Content ── */}
      {loadingData ? (
        <div className="flex items-center justify-center py-20 text-neutral-400 text-sm">
          Завантаження...
        </div>
      ) : tab === 'albums' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {albums.length === 0 ? (
            <EmptyState
              label="Альбомів поки немає"
              sub="Натисніть «Додати альбом», щоб створити перший"
            />
          ) : (
            albums.map((album) => (
              <div
                key={album._id}
                className="bg-[#181818] hover:bg-[#1f1f1f] transition rounded-xl p-4 flex items-center gap-4 group"
              >
                <img
                  src={imgSrc(album.image)}
                  alt={album.name}
                  className="w-14 h-14 rounded-lg object-cover shrink-0 shadow-lg"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="56" height="56"%3E%3Crect width="56" height="56" fill="%23282828"/%3E%3C/svg%3E'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{album.name}</p>
                  <p className="text-neutral-400 text-xs truncate mt-0.5">{album.desc || 'Без опису'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                      style={{ background: album.bgColor }}
                    />
                    <span className="text-neutral-500 text-xs font-mono">{album.bgColor}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                  <IconBtn
                    title="Редагувати"
                    onClick={() => setAlbumModal({ mode: 'edit', item: album })}
                  >
                    <PencilIcon />
                  </IconBtn>
                  <IconBtn
                    title="Видалити"
                    danger
                    onClick={() => setDeleteTarget({ type: 'album', id: album._id, name: album.name })}
                  >
                    <TrashIcon />
                  </IconBtn>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#282828]">
          {songs.length === 0 ? (
            <EmptyState label="Пісень поки немає" sub="Натисніть «Додати пісню», щоб додати першу" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#282828]">
                  {['', 'Назва', 'Виконавець', 'Жанр', 'Альбом', 'Дж.', ''].map((h, i) => (
                    <th
                      key={i}
                      className="text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3 first:w-12 last:w-20"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {songs.map((song, idx) => (
                  <tr
                    key={song._id}
                    className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#1f1f1f] transition group"
                  >
                    <td className="px-4 py-3 text-neutral-500 text-xs w-8">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={imgSrc(song.image)}
                          alt={song.name}
                          className="w-9 h-9 rounded object-cover shrink-0"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="36" height="36"%3E%3Crect width="36" height="36" fill="%23282828"/%3E%3C/svg%3E'
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate max-w-45">{song.name}</p>
                          <p className="text-neutral-500 text-xs">{song.duration}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-300 truncate max-w-30">{song.artist || '—'}</td>
                    <td className="px-4 py-3">
                      {song.genre ? (
                        <span className="bg-[#282828] text-neutral-300 text-xs font-medium px-2 py-0.5 rounded-full">
                          {song.genre}
                        </span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 truncate max-w-30">{albumName(song.album)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          song.source === 'itunes'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-[#1db954]/15 text-[#1db954]'
                        }`}
                      >
                        {song.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
                        <IconBtn
                          title="Редагувати"
                          onClick={() => setSongModal({ mode: 'edit', item: song })}
                        >
                          <PencilIcon />
                        </IconBtn>
                        <IconBtn
                          title="Видалити"
                          danger
                          onClick={() => setDeleteTarget({ type: 'song', id: song._id, name: song.name })}
                        >
                          <TrashIcon />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {albumModal && (
        <AlbumModal
          mode={albumModal.mode}
          initial={albumModal.item}
          token={token!}
          onClose={() => setAlbumModal(null)}
          onSaved={(msg) => {
            showToast(msg)
            fetchAlbums()
          }}
        />
      )}

      {songModal && (
        <SongModal
          mode={songModal.mode}
          initial={songModal.item}
          token={token!}
          albums={albums}
          onClose={() => setSongModal(null)}
          onSaved={(msg) => {
            showToast(msg)
            fetchSongs()
            refreshSongs() // ← Оновлюємо плеер і головну
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`Видалити «${deleteTarget.name}»? Цю дію не можна скасувати.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}

// ─── Micro-components ────────────────────────────────────────────────────────

function EmptyState({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-[#282828] flex items-center justify-center mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#404040" strokeWidth="1.5" />
          <path d="M12 8v4M12 16h.01" stroke="#404040" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-white font-semibold text-sm mb-1">{label}</p>
      <p className="text-neutral-500 text-xs">{sub}</p>
    </div>
  )
}

function IconBtn({
  children,
  title,
  danger = false,
  onClick,
}: {
  children: React.ReactNode
  title: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition
        ${danger
          ? 'text-neutral-500 hover:text-red-400 hover:bg-red-400/10'
          : 'text-neutral-500 hover:text-white hover:bg-white/10'
        }`}
    >
      {children}
    </button>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
