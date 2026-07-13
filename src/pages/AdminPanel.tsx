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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#282828] rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-white font-semibold text-base mb-6">{title}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-bold text-neutral-300 hover:text-white border border-neutral-600 hover:border-neutral-400 transition"
          >
            {t('adminCancelBtn')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-full text-sm font-bold bg-red-500 hover:bg-red-400 text-white transition"
          >
            {t('adminDeleteBtn')}
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
      onSaved(mode === 'create' ? t('adminAlbumCreated') : t('adminAlbumUpdated'))
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
            {mode === 'create' ? t('adminAddAlbum').replace('+ ', '') : `${t('adminEditBtn')} ${t('adminTabAlbums').toLowerCase()}`}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none transition">✕</button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label={t('adminAlbumNameLabel')} required>
            <input
              required
              value={form.name}
              onChange={set('name')}
              placeholder={t('adminAlbumNamePlaceholder')}
              className="admin-input"
            />
          </Field>

          <Field label={t('coverLabel')}>
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

          <Field label={t('adminAlbumDescLabel')}>
            <textarea
              value={form.desc}
              onChange={set('desc')}
              placeholder={t('adminAlbumDescPlaceholder')}
              rows={2}
              className="admin-input resize-none"
            />
          </Field>
          
          <Field label={t('adminAlbumColorLabel')}>
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
              {t('adminCancelBtn')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-full text-sm font-bold bg-[#1db954] hover:bg-[#1ed760] text-black transition disabled:opacity-50"
            >
              {loading ? t('adminSavingDots') : t('adminSaveBtn')}
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
            {mode === 'create' ? t('adminAddSong').replace('+ ', '') : `${t('adminEditBtn')} ${t('adminTabSongs').toLowerCase()}`}
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
        setUploadProgress(t('adminUploadingCover'))
        imageUrl = await uploadFile(imageFile, token)
      }
      if (audioFile) {
        setUploadProgress(t('adminUploadingAudio'))
        fileUrl = await uploadFile(audioFile, token)
      }

      setUploadProgress(t('adminSavingDots'))
      const body = { ...form, image: imageUrl, file: fileUrl, album: form.album || null, source: 'local' }
      const url = mode === 'create' ? `${API}/api/songs` : `${API}/api/songs/${initial!._id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка збереження треку')
      onSaved(mode === 'create' ? t('adminSongAdded') : t('adminSongUpdated'))
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
          <Field label={t('adminSongNameLabel')} required>
            <input required value={form.name} onChange={set('name')} placeholder={t('adminSongNamePlaceholder')} className="admin-input" />
          </Field>
          <Field label={t('adminColArtist')}>
            <input value={form.artist} onChange={set('artist')} placeholder={t('adminSongArtistPlaceholder')} className="admin-input" />
          </Field>
        </div>

        <Field label={t('coverLabel')}>
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
              placeholder={t('adminCoverUrlPlaceholder')}
              className="admin-input"
              disabled={!!imageFile}
            />
          </div>
        </Field>

        <Field label={t('audioLabel')} required>
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
placeholder={t('chooseAudio')}
              className="admin-input"
              disabled={!!audioFile}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('genreLabel')}>
            <input value={form.genre} onChange={set('genre')} placeholder={t('adminSongGenrePlaceholder')} className="admin-input" />
          </Field>
          <Field label={t('durationLabel')}>
            <input value={form.duration} onChange={set('duration')} placeholder={t('adminSongDurationPlaceholder')} className="admin-input" />
          </Field>
        </div>

        <Field label={t('albumLabel')}>
          <select value={form.album} onChange={set('album')} className="admin-input">
            <option value="">{t('noAlbum')}</option>
            {albums.map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </Field>

        <Field label={t('descLabel')}>
          <textarea value={form.desc} onChange={set('desc')} placeholder={t('adminSongDescPlaceholder')} rows={2} className="admin-input resize-none" />
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
            {t('adminCancelBtn')}
          </button>
          <button
            type="submit"
            disabled={loading || (!form.file && !audioFile)}
            className="px-5 py-2 rounded-full text-sm font-bold bg-[#1db954] hover:bg-[#1ed760] text-black transition disabled:opacity-50"
          >
            {loading ? t('adminSavingDots') : t('adminSaveBtn')}
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
      if (data.data.length === 0) setSearchError(t('searchNotFound'))
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
      onSaved(t('adminSongAdded'))
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
          placeholder={t('adminItunesSearchPlaceholder')}
          className="admin-input flex-1"
          autoFocus
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="px-4 py-2 rounded-full text-sm font-bold bg-purple-500 hover:bg-purple-400 text-white transition disabled:opacity-40"
        >
          {searching ? '...' : t('itunesSearch')}
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
                {added && <span className="text-xs text-neutral-500">{t('alreadyAdded')}</span>}
                {!added && isSelected && <span className="text-xs text-purple-300">✓</span>}
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-4 flex flex-col gap-3">
          <Field label={t('adminSongBindAlbum')}>
            <select value={albumId} onChange={e => setAlbumId(e.target.value)} className="admin-input">
              <option value="">{t('noAlbum')}</option>
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
              {t('adminCancelBtn')}
            </button>
            <button
              onClick={handleImport}
              disabled={saving}
              className="px-4 py-1.5 rounded-full text-xs font-bold bg-purple-500 text-white hover:bg-purple-400"
            >
              {saving ? t('adminSavingDots') : t('addBtn')}
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
      showToast(t('adminLoadUsersFail'), false)
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
      showToast(t('adminLoadRequestsFail'), false)
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
      showToast(action === 'approve' ? t('adminMusicianApproved') : t('adminRequestRejected'))
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
      showToast(type === 'album' ? t('adminAlbumDeleted') : t('adminSongDeleted'))
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
      showToast(t('adminUserDeleted'))
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1db954] mb-1">{t('adminPanelTitle')}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{t('adminContentManagement')}</h1>
        </div>
        <div className="flex items-center gap-2 bg-[#1db954]/10 border border-[#1db954]/30 rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-[#1db954] animate-pulse shrink-0" />
          <span className="text-[#1db954] text-xs font-semibold">{user.username}</span>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: t('adminUsersCount'), value: users.length, color: 'text-white' },
          { label: t('adminAlbumsCount'), value: albums.length, color: 'text-white' },
          { label: t('adminSongsCount'), value: songs.length, color: 'text-white' },
          { label: t('adminGenresCount'), value: [...new Set(songs.map((s) => s.genre).filter(Boolean))].length, color: 'text-white' },
          { label: t('adminItunesCount'), value: songs.filter((s) => s.source === 'itunes').length, color: 'text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#181818] rounded-xl p-4">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-neutral-400 mt-0.5 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs & Actions ── */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex bg-[#181818] rounded-full p-1 gap-1">
          {(['albums', 'songs', 'users', 'musicians'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition ${
                tab === tabKey ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tabKey === 'albums' ? t('adminTabAlbums') : tabKey === 'songs' ? t('adminTabSongs') : tabKey === 'users' ? t('adminTabUsers') : (
                <span className="flex items-center gap-1.5">
                  {t('adminTabRequests')}
                  {musicianRequests.length > 0 && (
                    <span className="bg-[#1db954] text-black text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {musicianRequests.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab !== 'users' && tab !== 'musicians' && (
          <button
            onClick={() => tab === 'albums' ? setAlbumModal({ mode: 'create' }) : setSongModal({ mode: 'create' })}
            className="bg-[#1db954] hover:bg-[#1ed760] text-black px-5 py-2 rounded-full text-sm font-bold transition"
          >
            {tab === 'albums' ? t('adminAddAlbum') : t('adminAddSong')}
          </button>
        )}
      </div>

      {/* ── Dynamic Tabs Content ── */}
      <div className="flex-1">
        {loadingData || (tab === 'users' && usersLoading) ? (
          <div className="flex items-center justify-center py-20 text-neutral-400 text-sm animate-pulse">
            {t('adminLoadingData')}
          </div>
        ) : (
          <div>
            {/* 1. ALBUMS TAB */}
            {tab === 'albums' && (
              albums.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">{t('adminNoAlbums')}</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {albums.map((album) => (
                    <div key={album._id} className="bg-[#181818] hover:bg-[#282828] p-4 rounded-xl transition group relative">
                      <img src={imgSrc(album.image)} alt={album.name} className="w-full aspect-square object-cover rounded-md mb-3 shadow-lg" />
                      <h3 className="text-white font-bold text-sm truncate">{album.name}</h3>
                      <p className="text-neutral-400 text-xs truncate mt-1">{album.desc || t('adminNoDesc')}</p>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setAlbumModal({ mode: 'edit', item: album })} className="bg-black/80 p-2 rounded-full text-white text-xs">✏️</button>
                        <button onClick={() => setDeleteTarget({ type: 'album', id: album._id, name: album.name })} className="bg-red-600/90 p-2 rounded-full text-white text-xs">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* 2. SONGS TAB */}
            {tab === 'songs' && (
              songs.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">{t('adminNoSongs')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-neutral-400 text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        <th className="py-3 px-4">{t('adminColName')}</th>
                        <th className="py-3 px-4">{t('adminColArtist')}</th>
                        <th className="py-3 px-4">{t('adminColGenre')}</th>
                        <th className="py-3 px-4">{t('adminColAlbum')}</th>
                        <th className="py-3 px-4">{t('adminColSource')}</th>
                        <th className="py-3 px-4 text-right">{t('adminColActions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {songs.map((song) => (
                        <tr key={song._id} className="border-b border-neutral-900 hover:bg-[#1a1a1a] transition group">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <img src={imgSrc(song.image)} alt={song.name} className="w-10 h-10 object-cover rounded shadow" />
                            <div>
                              <p className="text-white font-medium truncate max-w-45">{song.name}</p>
                              <p className="text-xs text-neutral-500 mt-0.5">{song.duration}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-white font-medium">{song.artist || '—'}</td>
                          <td className="py-3 px-4">
                            <span className="bg-neutral-800 text-neutral-300 text-xs font-medium px-2 py-0.5 rounded-full">{song.genre || '—'}</span>
                          </td>
                          <td className="py-3 px-4 text-neutral-300">
                            {albums.find(a => a._id === song.album)?.name || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${song.source === 'itunes' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-green-600/20 text-green-400 border border-green-500/30'}`}>
                              {song.source}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                            <button onClick={() => setSongModal({ mode: 'edit', item: song })} className="text-neutral-400 hover:text-white mr-3 font-semibold text-xs">{t('adminEditBtn')}</button>
                            <button onClick={() => setDeleteTarget({ type: 'song', id: song._id, name: song.name })} className="text-red-500 hover:text-red-400 font-semibold text-xs">{t('adminDeleteBtn')}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* 3. USERS TAB */}
            {tab === 'users' && (
              users.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-[#121212] rounded-xl p-12 text-center border border-neutral-800/40">
                  <div className="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center text-neutral-500 text-xl mb-4">ⓘ</div>
                  <p className="text-white font-bold text-base">{t('adminNoUsers')}</p>
                  <p className="text-neutral-500 text-xs mt-1">{t('adminNoUsersHint')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-neutral-400 text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        <th className="py-3 px-4">{t('adminColUser')}</th>
                        <th className="py-3 px-4">{t('adminColEmail')}</th>
                        <th className="py-3 px-4">{t('adminColRole')}</th>
                        <th className="py-3 px-4 text-right">{t('adminColActions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-neutral-900 hover:bg-[#1a1a1a] transition group">
                          <td className="py-3 px-4 text-white font-medium">{u.username}</td>
                          <td className="py-3 px-4">{u.email}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              u.role === 'admin' ? 'bg-[#1db954]/20 text-[#1db954]' :
                              u.role === 'musician' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-neutral-800 text-neutral-400'
                            }`}>
                              {u.role === 'musician' ? '🎵 musician' : u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                            {u.id !== user.id ? (
                              <button onClick={() => setUserDeleteTarget({ id: u.id, name: u.username })} className="text-red-500 hover:text-red-400 font-semibold text-xs">{t('adminDeleteBtn')}</button>
                            ) : (
                              <span className="text-xs text-neutral-600 italic">{t('adminThisIsYou')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* 4. MUSICIAN REQUESTS TAB */}
            {tab === 'musicians' && (
              requestsLoading ? (
                <div className="py-16 text-center text-neutral-500 text-sm animate-pulse">{t('adminLoadingRequests')}</div>
              ) : musicianRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-[#121212] rounded-xl p-12 text-center border border-neutral-800/40">
                  <div className="w-14 h-14 rounded-full bg-[#181818] flex items-center justify-center text-2xl mb-4">🎵</div>
                  <p className="text-white font-bold text-base">{t('adminNoRequests')}</p>
                  <p className="text-neutral-500 text-xs mt-1">{t('adminNoRequestsHint')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {musicianRequests.map((req) => (
                    <div key={req._id} className="flex items-center gap-4 bg-[#181818] rounded-2xl p-4 border border-neutral-800/60">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-[#282828] flex items-center justify-center font-bold text-white text-sm shrink-0 uppercase">
                        {req.username.charAt(0)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{req.username}</p>
                        <p className="text-neutral-500 text-xs truncate">{req.email}</p>
                        {req.musicianRequest.requestedAt && (
                          <p className="text-neutral-600 text-[10px] mt-0.5">
                            {t('adminSubmittedAt')} {new Date(req.musicianRequest.requestedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 shrink-0">
                        ⏳ pending
                      </span>

                      {/* Action buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleMusicianRequest(req._id, 'reject')}
                          disabled={processingId === req._id}
                          className="px-3 py-1.5 rounded-full text-xs font-bold text-neutral-300 border border-neutral-700 hover:border-red-500/50 hover:text-red-400 transition disabled:opacity-40"
                        >
                          {t('adminRejectBtn')}
                        </button>
                        <button
                          onClick={() => handleMusicianRequest(req._id, 'approve')}
                          disabled={processingId === req._id}
                          className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#1db954] hover:bg-[#1ed760] text-black transition disabled:opacity-40 flex items-center gap-1.5"
                        >
                          {processingId === req._id ? (
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12"/>
                            </svg>
                          ) : null}
                          {t('adminApproveBtn')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Modals Layer ── */}
      {albumModal && (
        <AlbumModal
          mode={albumModal.mode}
          initial={albumModal.item}
          token={token}
          onClose={() => setAlbumModal(null)}
          onSaved={(msg) => { showToast(msg); fetchAlbums(); }}
        />
      )}

      {songModal && (
        <SongModal
          mode={songModal.mode}
          initial={songModal.item}
          token={token}
          albums={albums}
          onClose={() => setSongModal(null)}
          onSaved={(msg) => { showToast(msg); fetchSongs(); refreshSongs(); }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`${deleteTarget.type === 'album' ? t('adminConfirmDeleteAlbum') : t('adminConfirmDeleteSong')} "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {userDeleteTarget && (
        <ConfirmModal
          title={`${t('adminConfirmDeleteUser')} "${userDeleteTarget.name}"?`}
          onConfirm={handleDeleteUser}
          onCancel={() => setUserDeleteTarget(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}