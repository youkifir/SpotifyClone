import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/usePlayer'
import { Navigate } from 'react-router-dom'

const API = 'http://localhost:5000'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  playCount: number
  createdAt: string
  source: 'local' | 'itunes'
}

interface Album {
  _id: string
  name: string
  image: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const imgSrc = (url: string) =>
  !url ? '' : url.startsWith('http') ? url : `${API}/${url}`

const authHeaders = (token: string | null) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token ?? ''}`,
})

async function uploadFile(file: File, token: string | null): Promise<string> {
  if (!token) throw new Error('Токен авторизації відсутній')
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

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-2xl animate-bounce-once
        ${ok ? 'bg-[#1db954] text-black' : 'bg-red-500 text-white'}`}
    >
      {msg}
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ title, onConfirm, onCancel }: {
  title: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#282828] rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-white font-semibold text-base mb-6">{title}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-full text-sm font-bold text-neutral-300 hover:text-white border border-neutral-600 hover:border-neutral-400 transition">
            Скасувати
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-full text-sm font-bold bg-red-500 hover:bg-red-400 text-white transition">
            Видалити
          </button>
        </div>
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

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ token, albums, initial, onClose, onSaved }: {
  token: string | null
  albums: Album[]
  initial?: Song
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    artist: initial?.artist ?? '',
    image: initial?.image ?? '',
    file: initial?.file ?? '',
    desc: initial?.desc ?? '',
    duration: initial?.duration ?? '0:00',
    genre: initial?.genre ?? '',
    album: initial?.album ?? '',
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setAudioFile(file)
    if (file) {
      const audio = new Audio()
      const url = URL.createObjectURL(file)
      audio.src = url
      audio.onloadedmetadata = () => {
        const m = Math.floor(audio.duration / 60)
        const s = Math.floor(audio.duration % 60)
        setForm(f => ({ ...f, duration: `${m}:${s.toString().padStart(2, '0')}` }))
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
        setProgress('Завантаження обкладинки...')
        imageUrl = await uploadFile(imageFile, token)
      }
      if (audioFile) {
        setProgress('Завантаження аудіо...')
        fileUrl = await uploadFile(audioFile, token)
      }

      setProgress('Збереження...')
      const body = { ...form, image: imageUrl, file: fileUrl, album: form.album || null, source: 'local' }
      const url = isEdit ? `${API}/api/songs/${initial!._id}` : `${API}/api/songs`
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка збереження')
      onSaved(isEdit ? 'Трек оновлено!' : 'Трек завантажено!')
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl my-auto w-full max-w-lg border border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-neutral-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1db954] mb-0.5">
              {isEdit ? 'Редагування' : 'Новий трек'}
            </p>
            <h3 className="text-white font-bold text-lg">
              {isEdit ? initial!.name : 'Завантажити трек'}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-400 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Назва треку" required>
                <input required value={form.name} onChange={set('name')} placeholder="Назва" className="musician-input" />
              </Field>
              <Field label="Виконавець">
                <input value={form.artist} onChange={set('artist')} placeholder="Ваше ім'я" className="musician-input" />
              </Field>
            </div>

            <Field label="Обкладинка">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-neutral-700 hover:border-[#1db954]/50 cursor-pointer transition group">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500 group-hover:text-[#1db954] transition shrink-0">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-sm text-neutral-400 group-hover:text-neutral-200 transition truncate">
                    {imageFile ? imageFile.name : 'Вибрати зображення...'}
                  </span>
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} className="hidden" />
                </label>
                {!imageFile && (
                  <input value={form.image} onChange={set('image')} placeholder="або URL: https://..." className="musician-input text-xs" />
                )}
              </div>
            </Field>

            <Field label="Аудіофайл" required={!isEdit}>
              <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-neutral-700 hover:border-[#1db954]/50 cursor-pointer transition group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500 group-hover:text-[#1db954] transition shrink-0">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
                <span className="text-sm text-neutral-400 group-hover:text-neutral-200 transition truncate">
                  {audioFile ? audioFile.name : isEdit ? 'Замінити аудіофайл (необов\'язково)' : 'Вибрати аудіофайл...'}
                </span>
                <input type="file" accept="audio/*" onChange={handleAudio} className="hidden" />
              </label>
              {audioFile && (
                <p className="text-xs text-neutral-500 mt-1">Тривалість: {form.duration}</p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Жанр">
                <input value={form.genre} onChange={set('genre')} placeholder="Pop, Rock, Hip-Hop..." className="musician-input" />
              </Field>
              <Field label="Альбом">
                <select value={form.album} onChange={set('album')} className="musician-input">
                  <option value="">— Без альбому —</option>
                  {albums.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Опис">
              <textarea value={form.desc} onChange={set('desc')} placeholder="Розкажи про трек..." rows={2} className="musician-input resize-none" />
            </Field>

            <div className="flex items-center gap-3 justify-end pt-2">
              {loading && progress && (
                <span className="text-[#1db954] text-xs animate-pulse">{progress}</span>
              )}
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-sm font-bold text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 transition">
                Скасувати
              </button>
              <button
                type="submit"
                disabled={loading || (!isEdit && !form.file && !audioFile)}
                className="px-6 py-2 rounded-full text-sm font-bold bg-[#1db954] hover:bg-[#1ed760] text-black transition disabled:opacity-40 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12"/>
                    </svg>
                    Завантаження...
                  </>
                ) : (
                  isEdit ? 'Зберегти зміни' : 'Опублікувати'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color = 'text-white' }: {
  label: string; value: number | string; icon: React.ReactNode; color?: string
}) {
  return (
    <div className="bg-[#181818] rounded-2xl p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-[#282828] flex items-center justify-center shrink-0 text-neutral-400">
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        <p className="text-xs text-neutral-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Main MusicianPage ────────────────────────────────────────────────────────

export default function MusicianPage() {
  const { user, token } = useAuth()
  const { playWithId, addSongs, track, playStatus } = usePlayer()

  const [songs, setSongs] = useState<Song[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadModal, setUploadModal] = useState<{ song?: Song } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'plays'>('date')

  // Redirect if not musician/admin
  if (!user || (user.role !== 'musician' && user.role !== 'admin')) {
    return <Navigate to="/" replace />
  }

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchMySongs = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/api/songs/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      const list: Song[] = data.data ?? []
      setSongs(list)
      addSongs(list.map(s => ({ ...s, id: s._id })))
    } catch { /* ignore */ }
  }, [token])

  const fetchAlbums = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/albums`)
      const data = await res.json()
      setAlbums(data.data ?? data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchMySongs(), fetchAlbums()]).finally(() => setLoading(false))
  }, [fetchMySongs, fetchAlbums])

  const handleDelete = async () => {
    if (!deleteTarget || !token) return
    try {
      const res = await fetch(`${API}/api/songs/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Помилка видалення')
      showToast('Трек видалено!')
      fetchMySongs()
    } catch (err: any) {
      showToast(err.message, false)
    } finally {
      setDeleteTarget(null)
    }
  }

  const handlePlay = (song: Song) => {
    addSongs(songs.map(s => ({ ...s, id: s._id })))
    playWithId(song._id)
  }

  const totalPlays = songs.reduce((acc, s) => acc + (s.playCount || 0), 0)
  const topSong = songs.reduce((best, s) => (!best || s.playCount > best.playCount) ? s : best, null as Song | null)

  const sorted = [...songs].sort((a, b) => {
    if (sortBy === 'plays') return (b.playCount || 0) - (a.playCount || 0)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="flex flex-col gap-6 min-h-full pb-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1db954] mb-1">Студія музиканта</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Мої треки</h1>
        </div>
        <button
          onClick={() => setUploadModal({})}
          className="flex items-center gap-2 bg-[#1db954] hover:bg-[#1ed760] text-black px-5 py-2.5 rounded-full text-sm font-bold transition active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Завантажити трек
        </button>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Треків"
          value={songs.length}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
        />
        <StatCard
          label="Прослуховувань"
          value={totalPlays.toLocaleString('uk-UA')}
          color="text-[#1db954]"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
        />
        <StatCard
          label="Альбомів"
          value={albums.length}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/></svg>}
        />
        <StatCard
          label="Топ трек"
          value={topSong ? `${topSong.playCount ?? 0} plays` : '—'}
          color="text-yellow-400"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
        />
      </div>

      {/* ── Top Song Banner ── */}
      {topSong && topSong.playCount > 0 && (
        <div
          className="relative rounded-2xl overflow-hidden p-5 flex items-center gap-4 cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #1db95422 0%, #181818 100%)' }}
          onClick={() => handlePlay(topSong)}
        >
          <div className="absolute inset-0 border border-[#1db954]/20 rounded-2xl pointer-events-none" />
          <img src={imgSrc(topSong.image)} alt={topSong.name} className="w-16 h-16 rounded-xl object-cover shadow-lg shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1db954] mb-0.5">🏆 Найпопулярніший трек</p>
            <p className="text-white font-bold text-lg truncate">{topSong.name}</p>
            <p className="text-neutral-400 text-sm">{topSong.playCount.toLocaleString('uk-UA')} прослуховувань</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1db954] flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="black"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      )}

      {/* ── Track List ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-base">Усі треки</h2>
          <div className="flex bg-[#181818] rounded-full p-1 gap-1">
            {(['date', 'plays'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${sortBy === s ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
              >
                {s === 'date' ? 'Нові' : 'Популярні'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-neutral-500 text-sm animate-pulse">Завантаження...</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center text-neutral-600">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">Поки немає треків</p>
              <p className="text-neutral-500 text-sm mt-1">Завантаж свій перший трек, щоб почати</p>
            </div>
            <button
              onClick={() => setUploadModal({})}
              className="px-5 py-2 rounded-full text-sm font-bold bg-[#1db954] text-black hover:bg-[#1ed760] transition"
            >
              + Завантажити перший трек
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {/* Header row */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-800/60">
              <span className="w-8 text-center">#</span>
              <span>Назва</span>
              <span className="hidden sm:block w-16 text-center">Жанр</span>
              <span className="w-16 text-right">Plays</span>
              <span className="w-14 text-right hidden sm:block">Дата</span>
              <span className="w-16" />
            </div>

            {sorted.map((song, idx) => {
              const isPlaying = track?.id === song._id && playStatus
              return (
                <div
                  key={song._id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#282828] transition group cursor-pointer"
                  onClick={() => handlePlay(song)}
                >
                  {/* Index / Play icon */}
                  <div className="w-8 flex items-center justify-center shrink-0">
                    {isPlaying ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#1db954">
                        <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    ) : (
                      <>
                        <span className="text-neutral-500 text-sm group-hover:hidden">{idx + 1}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="hidden group-hover:block">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      </>
                    )}
                  </div>

                  {/* Cover + title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={imgSrc(song.image)} alt={song.name} className="w-10 h-10 rounded-lg object-cover shrink-0 shadow" />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isPlaying ? 'text-[#1db954]' : 'text-white'}`}>
                        {song.name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{song.duration}</p>
                    </div>
                  </div>

                  {/* Genre */}
                  <span className="hidden sm:block w-16">
                    {song.genre ? (
                      <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full font-medium truncate block text-center">
                        {song.genre}
                      </span>
                    ) : null}
                  </span>

                  {/* Play count */}
                  <div className="w-16 text-right">
                    <span className="text-sm text-neutral-300 font-medium">
                      {(song.playCount || 0).toLocaleString('uk-UA')}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="hidden sm:block w-14 text-right text-xs text-neutral-600">
                    {formatDate(song.createdAt)}
                  </span>

                  {/* Actions */}
                  <div
                    className="w-16 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setUploadModal({ song })}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition"
                      title="Редагувати"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: song._id, name: song.name })}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition"
                      title="Видалити"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {uploadModal !== null && (
        <UploadModal
          token={token}
          albums={albums}
          initial={uploadModal.song}
          onClose={() => setUploadModal(null)}
          onSaved={(msg) => { showToast(msg); fetchMySongs() }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`Видалити трек "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* ── CSS for inputs (injected once) ── */}
      <style>{`
        .musician-input {
          width: 100%;
          background: #0f0f0f;
          border: 1px solid #2a2a2a;
          border-radius: 0.75rem;
          padding: 0.6rem 0.875rem;
          color: #fff;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .musician-input:focus {
          border-color: #1db954;
        }
        .musician-input option {
          background: #1a1a1a;
        }
      `}</style>
    </div>
  )
}
