import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/usePlayer'
import { Navigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

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

type Tab = 'albums' | 'songs' | 'users' | 'musicians'
type ModalMode = 'create' | 'edit'

interface UserRecord {
  id: string
  username: string
  email: string
  role: 'user' | 'admin' | 'musician'
  createdAt: string
}

interface MusicianRequest {
  _id: string
  username: string
  email: string
  musicianRequest: {
    status: 'pending' | 'approved' | 'rejected'
    message: string
    requestedAt: string
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const imgSrc = (url: string) =>
  url?.startsWith('http') ? url : `${API}/${url}`

const authHeaders = (token: string | null) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token ?? ''}`,
})

// ─── File Upload Helper ───────────────────────────────────────────────────────

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

// ─── Confirm Modal ───────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#282828] rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-white font-semibold text-base mb-6">{title}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-bold text-neutral-300 hover:text-white border border-neutral-600 hover:border-neutral-400 transition"
          >
            {t('adminCancelBtn' as any)}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-full text-sm font-bold bg-red-500 hover:bg-red-400 text-white transition"
          >
            {t('adminDeleteBtn' as any)}
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
  token: string | null
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
  const { t } = useLanguage()

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
      if (!res.ok) throw new Error(data.message || 'Помилка збереження альбому')
      onSaved(mode === 'create' ? t('adminAlbumCreated' as any) : t('adminAlbumUpdated' as any))
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
            {mode === 'create' ? t('adminAddAlbum' as any).replace('+ ', '') : `${t('adminEditBtn' as any)} ${t('adminTabAlbums' as any).toLowerCase()}`}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none transition">✕</button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label={t('adminAlbumNameLabel' as any)} required>
            <input
              required
              value={form.name}
              onChange={set('name')}
              placeholder={t('adminAlbumNamePlaceholder' as any)}
              className="admin-input"
            />
          </Field>

          <Field label={t('coverLabel' as any)}>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="admin-input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#1db954]/20 file:text-[#1db954] hover:file:bg-[#1db954]/30"
              />
              <p className="text-neutral-500 text-xs">URL:</p>
              <input
                value={form.image}
                onChange={set('image')}
                placeholder="https://..."
                className="admin-input"
                disabled={!!imageFile}
              />
            </div>
          </Field>

          <Field label={t('adminAlbumDescLabel' as any)}>
            <textarea
              value={form.desc}
              onChange={set('desc')}
              placeholder={t('adminAlbumDescPlaceholder' as any)}
              rows={2}
              className="admin-input resize-none"
            />
          </Field>
          
          <Field label={t('adminAlbumColorLabel' as any)}>
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
              {t('adminCancelBtn' as any)}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-full text-sm font-bold bg-[#1db954] hover:bg-[#1ed760] text-black transition disabled:opacity-50"
            >
              {loading ? t('adminSavingDots' as any) : t('adminSaveBtn' as any)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── iTunes Track Type ────────────────────────────────────────────────────────

interface ItunesTrack {
  name: string
  artist: string
  image: string
  file: string
  duration: string
  desc: string
  genre: string
  source: 'itunes'
  externalId: string
  alreadyAdded: boolean
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
  token: string | null
  albums: Album[]
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [source, setSource] = useState<'local' | 'itunes'>(initial?.source ?? 'local')
  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-[#282828] rounded-xl shadow-2xl my-auto w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="text-white font-bold text-lg">
            {mode === 'create' ? t('adminAddSong' as any).replace('+ ', '') : `${t('adminEditBtn' as any)} ${t('adminTabSongs' as any).toLowerCase()}`}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none transition">✕</button>
        </div>

        {mode === 'create' && (
          <div className="px-6 pb-4">
            <div className="flex bg-[#1a1a1a] rounded-full p-1 gap-1 w-fit">
              <button
                onClick={() => setSource('local')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  source === 'local' ? 'bg-[#1db954] text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                📁 Local
              </button>
              <button
                onClick={() => setSource('itunes')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  source === 'itunes' ? 'bg-purple-500 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                🎵 iTunes
              </button>
            </div>
          </div>
        )}

        <div className="px-6 pb-6">
          {source === 'local' ? (
            <LocalSongForm
              mode={mode}
              initial={initial}
              token={token}
              albums={albums}
              onClose={onClose}
              onSaved={onSaved}
            />
          ) : (
            <ItunesSongSearch
              token={token}
              albums={albums}
              onClose={onClose}
              onSaved={onSaved}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Local Song Form ──────────────────────────────────────────────────────────

function LocalSongForm({
  mode,
  initial,
  token,
  albums,
  onClose,
  onSaved,
}: {
  mode: ModalMode
  initial?: Song
  token: string | null
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
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')
  const { t } = useLanguage()

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

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
        setUploadProgress(t('adminUploadingCover' as any))
        imageUrl = await uploadFile(imageFile, token)
      }
      if (audioFile) {
        setUploadProgress(t('adminUploadingAudio' as any))
        fileUrl = await uploadFile(audioFile, token)
      }

      setUploadProgress(t('adminSavingDots' as any))
      const body = { ...form, image: imageUrl, file: fileUrl, album: form.album || null, source: 'local' }
      const url = mode === 'create' ? `${API}/api/songs` : `${API}/api/songs/${initial!._id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка збереження треку')
      onSaved(mode === 'create' ? t('adminSongAdded' as any) : t('adminSongUpdated' as any))
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  return (
    <>
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('adminSongNameLabel' as any)} required>
            <input required value={form.name} onChange={set('name')} placeholder={t('adminSongNamePlaceholder' as any)} className="admin-input" />
          </Field>
          <Field label={t('adminColArtist' as any)}>
            <input value={form.artist} onChange={set('artist')} placeholder={t('adminSongArtistPlaceholder' as any)} className="admin-input" />
          </Field>
        </div>

        <Field label={t('coverLabel' as any)}>
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="admin-input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#1db954]/20 file:text-[#1db954] hover:file:bg-[#1db954]/30"
            />
            <input
              value={form.image}
              onChange={set('image')}
              placeholder={t('adminCoverUrlPlaceholder' as any)}
              className="admin-input"
              disabled={!!imageFile}
            />
          </div>
        </Field>

        <Field label={t('audioLabel' as any)} required>
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="admin-input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#1db954]/20 file:text-[#1db954] hover:file:bg-[#1db954]/30"
            />
            <input
              value={form.file}
              onChange={set('file')}
              placeholder={t('chooseAudio' as any)}
              className="admin-input"
              disabled={!!audioFile}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('genreLabel' as any)}>
            <input value={form.genre} onChange={set('genre')} placeholder={t('adminSongGenrePlaceholder' as any)} className="admin-input" />
          </Field>
          <Field label={t('durationLabel' as any)}>
            <input value={form.duration} onChange={set('duration')} placeholder={t('adminSongDurationPlaceholder' as any)} className="admin-input" />
          </Field>
        </div>

        <Field label={t('albumLabel' as any)}>
          <select value={form.album} onChange={set('album')} className="admin-input">
            <option value="">{t('noAlbum' as any)}</option>
            {albums.map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </Field>

        <Field label={t('descLabel' as any)}>
          <textarea value={form.desc} onChange={set('desc')} placeholder={t('adminSongDescPlaceholder' as any)} rows={2} className="admin-input resize-none" />
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
            {t('adminCancelBtn' as any)}
          </button>
          <button
            type="submit"
            disabled={loading || (!form.file && !audioFile)}
            className="px-5 py-2 rounded-full text-sm font-bold bg-[#1db954] hover:bg-[#1ed760] text-black transition disabled:opacity-50"
          >
            {loading ? t('adminSavingDots' as any) : t('adminSaveBtn' as any)}
          </button>
        </div>
      </form>
    </>
  )
}

// ─── iTunes Song Search ───────────────────────────────────────────────────────

function ItunesSongSearch({
  token,
  albums,
  onSaved,
}: {
  token: string | null
  albums: Album[]
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ItunesTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selected, setSelected] = useState<ItunesTrack | null>(null)
  const [albumId, setAlbumId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const { t } = useLanguage()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearchError('')
    setSearching(true)
    setResults([])
    setSelected(null)
    try {
      const res = await fetch(`${API}/api/songs/itunes-preview?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка пошуку')
      setResults(data.data)
      if (data.data.length === 0) setSearchError(t('searchNotFound' as any))
    } catch (err: any) {
      setSearchError(err.message)
    } finally {
      setSearching(false)
    }
  }

  const handleImport = async () => {
    if (!selected) return
    setSaveError('')
    setSaving(true)
    try {
      const body = {
        name: selected.name,
        artist: selected.artist,
        image: selected.image,
        file: selected.file,
        duration: selected.duration,
        desc: selected.desc,
        genre: selected.genre,
        source: 'itunes',
        externalId: selected.externalId,
        album: albumId || null,
      }
      const res = await fetch(`${API}/api/songs`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка імпорту')
      setJustAdded(prev => new Set(prev).add(selected.externalId))
      setResults(prev =>
        prev.map(t => t.externalId === selected.externalId ? { ...t, alreadyAdded: true } : t)
      )
      setSelected(null)
      onSaved(t('adminSongAdded' as any))
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const isAdded = (track: ItunesTrack) => track.alreadyAdded || justAdded.has(track.externalId)

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('adminItunesSearchPlaceholder' as any)}
          className="admin-input flex-1"
          autoFocus
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="px-4 py-2 rounded-full text-sm font-bold bg-purple-500 hover:bg-purple-400 text-white transition disabled:opacity-40"
        >
          {searching ? '...' : t('itunesSearch' as any)}
        </button>
      </form>

      {searchError && <p className="text-red-400 text-xs">{searchError}</p>}

      {results.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
          {results.map(track => {
            const added = isAdded(track)
            const isSelected = selected?.externalId === track.externalId
            return (
              <button
                key={track.externalId}
                type="button"
                onClick={() => !added && setSelected(isSelected ? null : track)}
                disabled={added}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition w-full
                  ${added
                    ? 'opacity-40 cursor-not-allowed bg-[#1a1a1a]'
                    : isSelected
                      ? 'bg-purple-500/20 border border-purple-500/60'
                      : 'bg-[#1a1a1a] hover:bg-[#222] border border-transparent'
                  }`}
              >
                <img src={track.image} alt={track.name} className="w-10 h-10 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{track.name}</p>
                  <p className="text-neutral-400 text-xs truncate">{track.artist} · {track.duration}</p>
                </div>
                {added && <span className="text-xs text-neutral-500">{t('alreadyAdded' as any)}</span>}
                {!added && isSelected && <span className="text-xs text-purple-300">✓</span>}
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-4 flex flex-col gap-3">
          <Field label={t('adminSongBindAlbum' as any)}>
            <select value={albumId} onChange={e => setAlbumId(e.target.value)} className="admin-input">
              <option value="">{t('noAlbum' as any)}</option>
              {albums.map(a => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </Field>

          {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setSelected(null)}
              className="px-4 py-1.5 rounded-full text-xs font-bold text-neutral-300 hover:text-white border border-neutral-600"
            >
              {t('adminCancelBtn' as any)}
            </button>
            <button
              onClick={handleImport}
              disabled={saving}
              className="px-4 py-1.5 rounded-full text-xs font-bold bg-purple-500 text-white hover:bg-purple-400"
            >
              {saving ? t('adminSavingDots' as any) : t('addBtn' as any)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Field Wrapper ────────────────────────────────────────────────────────────

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

// ─── Main Admin Panel ────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user, token } = useAuth()
  const { refreshSongs } = usePlayer()
  const { t } = useLanguage()

  const [tab, setTab] = useState<Tab>('albums')
  const [albums, setAlbums] = useState<Album[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const [users, setUsers] = useState<UserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userDeleteTarget, setUserDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const [musicianRequests, setMusicianRequests] = useState<MusicianRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

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

  const fetchUsers = async () => {
    if (!token) return
    setUsersLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setUsers(data.data ?? [])
    } catch {
      showToast(t('adminLoadUsersFail' as any), false)
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchMusicianRequests = async () => {
    if (!token) return
    setRequestsLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/musician-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setMusicianRequests(data.data ?? [])
    } catch {
      showToast(t('adminLoadRequestsFail' as any), false)
    } finally {
      setRequestsLoading(false)
    }
  }

  const handleMusicianRequest = async (userId: string, action: 'approve' | 'reject') => {
    if (!token || processingId) return
    setProcessingId(userId)
    try {
      const res = await fetch(`${API}/api/admin/musician-requests/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка')
      showToast(action === 'approve' ? t('adminMusicianApproved' as any) : t('adminRequestRejected' as any))
      fetchMusicianRequests()
    } catch (err: any) {
      showToast(err.message, false)
    } finally {
      setProcessingId(null)
    }
  }

  useEffect(() => {
    setLoadingData(true)
    Promise.all([fetchAlbums(), fetchSongs()]).finally(() => setLoadingData(false))
  }, [])

  useEffect(() => {
    if (tab === 'users') fetchUsers()
    if (tab === 'musicians') fetchMusicianRequests()
  }, [tab])

  const handleDelete = async () => {
    if (!deleteTarget || !token) return
    const { type, id } = deleteTarget
    try {
      const res = await fetch(`${API}/api/${type === 'album' ? 'albums' : 'songs'}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Помилка сервера при видаленні')
      showToast(type === 'album' ? t('adminAlbumDeleted' as any) : t('adminSongDeleted' as any))
      if (type === 'album') {
        fetchAlbums()
      } else {
        fetchSongs()
        refreshSongs()
      }
    } catch (err: any) {
      showToast(err.message, false)
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!userDeleteTarget || !token) return
    try {
      const res = await fetch(`${API}/api/auth/users/${userDeleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Помилка')
      }
      showToast(t('adminUserDeleted' as any))
      fetchUsers()
    } catch (err: any) {
      showToast(err.message, false)
    } finally {
      setUserDeleteTarget(null)
    }
  }

  return (
    <div className="pt-2 sm:pt-4 flex flex-col gap-6 min-h-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1db954] mb-1">{t('adminPanelTitle' as any)}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{t('adminContentManagement' as any)}</h1>
        </div>
        <div className="flex items-center gap-2 bg-[#1db954]/10 border border-[#1db954]/30 rounded-full px-3 py-1.5 self-start sm:self-auto shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#1db954] animate-pulse shrink-0" />
          <span className="text-[#1db954] text-xs font-semibold">{user.username}</span>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: t('adminUsersCount' as any), value: users.length, color: 'text-white' },
          { label: t('adminAlbumsCount' as any), value: albums.length, color: 'text-white' },
          { label: t('adminSongsCount' as any), value: songs.length, color: 'text-white' },
          { label: t('adminGenresCount' as any), value: [...new Set(songs.map((s) => s.genre).filter(Boolean))].length, color: 'text-white' },
          { label: t('adminItunesCount' as any), value: songs.filter((s) => s.source === 'itunes').length, color: 'text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#181818] rounded-xl p-4">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-neutral-400 mt-0.5 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex bg-[#181818] rounded-full p-1 gap-1 overflow-x-auto no-scrollbar max-w-full">
          {['albums', 'songs', 'users', 'musicians'].map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey as Tab)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                tab === tabKey ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tabKey === 'albums' && t('adminTabAlbums' as any)}
              {tabKey === 'songs' && t('adminTabSongs' as any)}
              {tabKey === 'users' && t('adminTabUsers' as any)}
              {tabKey === 'musicians' && t('adminTabRequests' as any)}
            </button>
          ))}
        </div>

        {tab === 'albums' && (
          <button
            onClick={() => setAlbumModal({ mode: 'create' })}
            className="px-4 py-2 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-full transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
          >
            {t('adminAddAlbum' as any)}
          </button>
        )}
        {tab === 'songs' && (
          <button
            onClick={() => setSongModal({ mode: 'create' })}
            className="px-4 py-2 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-full transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
          >
            {t('adminAddSong' as any)}
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loadingData ? (
        <div className="flex items-center justify-center py-20 text-[#1db954] animate-pulse font-semibold">
          {t('loading' as any)}...
        </div>
      ) : (
        <>
          {tab === 'albums' && (
            <div className="bg-[#121212] rounded-xl overflow-hidden border border-neutral-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-neutral-850 text-neutral-400 text-xs uppercase font-bold bg-[#181818]">
                      <th className="px-5 py-3.5">{t('coverLabel' as any)}</th>
                      <th className="px-5 py-3.5">{t('adminColName' as any)}</th>
                      <th className="px-5 py-3.5">{t('adminColDesc' as any)}</th>
                      <th className="px-5 py-3.5 text-right">{t('actionsLabel' as any)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {albums.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-neutral-500 font-medium bg-[#121212]">
                          {t('searchNotFound' as any)}
                        </td>
                      </tr>
                    ) : (
                      albums.map((album) => (
                        <tr key={album._id} className="hover:bg-neutral-900/50 transition">
                          <td className="px-5 py-3 shrink-0">
                            <img src={imgSrc(album.image)} alt={album.name} className="w-10 h-10 rounded object-cover shadow-md" />
                          </td>
                          <td className="px-5 py-3 font-semibold text-white max-w-[200px] truncate">{album.name}</td>
                          <td className="px-5 py-3 text-neutral-400 max-w-[300px] truncate font-medium">{album.desc || '—'}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => setAlbumModal({ mode: 'edit', item: album })}
                                className="text-xs font-bold text-[#1db954] hover:underline"
                              >
                                {t('adminEditBtn' as any)}
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ type: 'album', id: album._id, name: album.name })}
                                className="text-xs font-bold text-red-500 hover:underline"
                              >
                                {t('adminDeleteBtn' as any)}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'songs' && (
            <div className="bg-[#121212] rounded-xl overflow-hidden border border-neutral-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-neutral-850 text-neutral-400 text-xs uppercase font-bold bg-[#181818]">
                      <th className="px-5 py-3.5">{t('coverLabel' as any)}</th>
                      <th className="px-5 py-3.5">{t('adminColName' as any)}</th>
                      <th className="px-5 py-3.5">{t('adminColArtist' as any)}</th>
                      <th className="px-5 py-3.5">{t('genreLabel' as any)}</th>
                      <th className="px-5 py-3.5">{t('durationLabel' as any)}</th>
                      <th className="px-5 py-3.5 text-right">{t('actionsLabel' as any)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {songs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-neutral-500 font-medium bg-[#121212]">
                          {t('searchNotFound' as any)}
                        </td>
                      </tr>
                    ) : (
                      songs.map((song) => (
                        <tr key={song._id} className="hover:bg-neutral-900/50 transition">
                          <td className="px-5 py-3 shrink-0">
                            <img src={imgSrc(song.image)} alt={song.name} className="w-10 h-10 rounded object-cover shadow-md" />
                          </td>
                          <td className="px-5 py-3 font-semibold text-white max-w-[200px] truncate">{song.name}</td>
                          <td className="px-5 py-3 text-neutral-400 truncate max-w-[150px] font-medium">{song.artist}</td>
                          <td className="px-5 py-3 text-neutral-400 font-medium truncate max-w-[100px]">{song.genre || '—'}</td>
                          <td className="px-5 py-3 text-neutral-400 font-mono text-xs">{song.duration}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => setSongModal({ mode: 'edit', item: song })}
                                className="text-xs font-bold text-[#1db954] hover:underline"
                              >
                                {t('adminEditBtn' as any)}
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ type: 'song', id: song._id, name: song.name })}
                                className="text-xs font-bold text-red-500 hover:underline"
                              >
                                {t('adminDeleteBtn' as any)}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="bg-[#121212] rounded-xl overflow-hidden border border-neutral-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-neutral-850 text-neutral-400 text-xs uppercase font-bold bg-[#181818]">
                      <th className="px-5 py-3.5">{t('adminColUsername' as any)}</th>
                      <th className="px-5 py-3.5">{t('adminColEmail' as any)}</th>
                      <th className="px-5 py-3.5">{t('adminColRole' as any)}</th>
                      <th className="px-5 py-3.5 text-right">{t('actionsLabel' as any)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-[#1db954] font-semibold bg-[#121212]">
                          {t('loading' as any)}...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-neutral-500 font-medium bg-[#121212]">
                          {t('searchNotFound' as any)}
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-neutral-900/50 transition">
                          <td className="px-5 py-3 font-semibold text-white">{u.username}</td>
                          <td className="px-5 py-3 text-neutral-400 font-medium">{u.email}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                ${u.role === 'admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''}
                                ${u.role === 'musician' ? 'bg-[#1db954]/10 text-[#1db954] border border-[#1db954]/20' : ''}
                                ${u.role === 'user' ? 'bg-neutral-800 text-neutral-400' : ''}
                              `}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {u.id !== user.id && (
                              <button
                                onClick={() => setUserDeleteTarget({ id: u.id, name: u.username })}
                                className="text-xs font-bold text-red-500 hover:underline"
                              >
                                {t('adminDeleteBtn' as any)}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'musicians' && (
            <div className="bg-[#121212] rounded-xl overflow-hidden border border-neutral-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-neutral-850 text-neutral-400 text-xs uppercase font-bold bg-[#181818]">
                      <th className="px-5 py-3.5">{t('adminColUsername' as any)}</th>
                      <th className="px-5 py-3.5">{t('adminColEmail' as any)}</th>
                      <th className="px-5 py-3.5">{t('adminColMessage' as any)}</th>
                      <th className="px-5 py-3.5 text-right">{t('actionsLabel' as any)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {requestsLoading ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-[#1db954] font-semibold bg-[#121212]">
                          {t('loading' as any)}...
                        </td>
                      </tr>
                    ) : musicianRequests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-neutral-500 font-medium bg-[#121212]">
                          {t('searchNotFound' as any)}
                        </td>
                      </tr>
                    ) : (
                      musicianRequests.map((req) => (
                        <tr key={req._id} className="hover:bg-neutral-900/50 transition">
                          <td className="px-5 py-3 font-semibold text-white">{req.username}</td>
                          <td className="px-5 py-3 text-neutral-400 font-medium">{req.email}</td>
                          <td className="px-5 py-3 text-neutral-400 max-w-[250px] truncate font-medium">
                            {req.musicianRequest?.message || '—'}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                disabled={!!processingId}
                                onClick={() => handleMusicianRequest(req._id, 'approve')}
                                className="text-xs font-bold text-[#1db954] hover:underline disabled:opacity-50"
                              >
                                {processingId === req._id ? '...' : t('adminApproveBtn' as any)}
                              </button>
                              <button
                                disabled={!!processingId}
                                onClick={() => handleMusicianRequest(req._id, 'reject')}
                                className="text-xs font-bold text-red-500 hover:underline disabled:opacity-50"
                              >
                                {processingId === req._id ? '...' : t('adminRejectBtn' as any)}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modals & Toast ── */}
      {albumModal && (
        <AlbumModal
          mode={albumModal.mode}
          initial={albumModal.item}
          token={token}
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
          token={token}
          albums={albums}
          onClose={() => setSongModal(null)}
          onSaved={(msg) => {
            showToast(msg)
            fetchSongs()
            refreshSongs()
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`${t('adminConfirmDelete' as any)} "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {userDeleteTarget && (
        <ConfirmModal
          title={`${t('adminConfirmDelete' as any)} "${userDeleteTarget.name}"?`}
          onConfirm={handleDeleteUser}
          onCancel={() => setUserDeleteTarget(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}