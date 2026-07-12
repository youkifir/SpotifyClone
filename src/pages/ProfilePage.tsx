import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/usePlayer'
import { useLike } from '../hooks/Uselike'

const API = 'http://localhost:5000'

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface LikedSong {
  id: string
  _id: string
  name: string
  artist?: string
  image: string
  file: string
  desc: string
  duration: string
}

// ─── Musician Request Button ──────────────────────────────────────────────────

function MusicianRequestButton({ token }: { token: string | null }) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'loading' | 'sent'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const u = data.data || data
        if (u?.musicianRequest?.status === 'pending') setStatus('pending')
        else if (u?.musicianRequest?.status === 'approved') setStatus('sent')
      })
      .catch(() => {})
  }, [token])

  const sendRequest = async () => {
    if (!token || status !== 'idle') return
    setStatus('loading')
    try {
      const res = await fetch('http://localhost:5000/api/auth/request-musician', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка')
      setStatus('pending')
    } catch (err: any) {
      setError(err.message)
      setStatus('idle')
      setTimeout(() => setError(''), 3000)
    }
  }

  if (status === 'sent') return null

  return (
    <div className="mt-3">
      {error && <p className="text-red-400 text-xs mb-1">{error}</p>}
      {status === 'pending' ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
          ⏳ Заявка на розгляді
        </span>
      ) : (
        <button
          onClick={sendRequest}
          disabled={status === 'loading'}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition flex items-center gap-1.5 disabled:opacity-50"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          {status === 'loading' ? 'Відправляємо...' : 'Стати музикантом'}
        </button>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { user, token, login: ctxLogin } = useAuth()
  const { playWithId, addSongs, track, playStatus } = usePlayer()
  const { toggleLike } = useLike()

  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loadingInfo, setLoadingInfo] = useState(false)
  const [loadingPass, setLoadingPass] = useState(false)
  const [errorInfo, setErrorInfo] = useState('')
  const [errorPass, setErrorPass] = useState('')
  const [successInfo, setSuccessInfo] = useState('')
  const [successPass, setSuccessPass] = useState('')

  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([])
  const [loadingLikes, setLoadingLikes] = useState(false)

  const avatarLetter = user?.username?.charAt(0).toUpperCase() ?? 'U'

  const showSuccess = (setter: (v: string) => void, msg: string) => {
    setter(msg)
    setTimeout(() => setter(''), 3000)
  }

  // Завантаження улюблених
  useEffect(() => {
    if (!token) return
    setLoadingLikes(true)
    fetch(`${API}/api/auth/likes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const songs = (data.data || []).map((s: any) => ({ ...s, id: String(s._id || s.id) }))
        setLikedSongs(songs)
        addSongs(songs)
      })
      .catch(() => {})
      .finally(() => setLoadingLikes(false))
  }, [token])

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorInfo('')
    setLoadingInfo(true)
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка')
      ctxLogin(data.token, data.user)
      showSuccess(setSuccessInfo, 'Профіль оновлено!')
    } catch (err: any) {
      setErrorInfo(err.message)
    } finally {
      setLoadingInfo(false)
    }
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorPass('')
    if (newPassword !== confirmPassword) { setErrorPass('Паролі не збігаються'); return }
    setLoadingPass(true)
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка')
      ctxLogin(data.token, data.user)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      showSuccess(setSuccessPass, 'Пароль змінено!')
    } catch (err: any) {
      setErrorPass(err.message)
    } finally {
      setLoadingPass(false)
    }
  }

  const handleUnlike = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation()
    await toggleLike(songId)
    setLikedSongs((prev) => prev.filter((s) => s.id !== songId))
  }

  return (
    <div className="pt-2 sm:pt-4 flex flex-col gap-6 max-w-2xl mx-auto">

      {/* Шапка */}
      <div className="flex items-center gap-5 p-6 bg-linear-to-br from-[#1db954]/20 to-[#121212] rounded-xl border border-[#1db954]/10">
        <div className="w-20 h-20 rounded-full bg-[#1db954] flex items-center justify-center text-black font-black text-3xl shrink-0 shadow-lg">
          {avatarLetter}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1db954] mb-1">Профіль</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{user?.username}</h1>
          <p className="text-neutral-400 text-sm mt-0.5">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              user?.role === 'admin'
                ? 'bg-[#1db954]/20 text-[#1db954] border border-[#1db954]/30'
                : user?.role === 'musician'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-[#282828] text-neutral-400'
            }`}>
              {user?.role === 'admin' ? '🛡 Адміністратор' : user?.role === 'musician' ? '🎵 Музикант' : 'Користувач'}
            </span>
            <span className="text-neutral-500 text-xs">
              З нами з {formatDate((user as any)?.createdAt)}
            </span>
          </div>
          {user?.role === 'user' && <MusicianRequestButton token={token} />}
        </div>
      </div>

      {/* Улюблені треки */}
      <div className="bg-[#181818] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1db954" stroke="#1db954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <h2 className="text-white font-bold text-base">Улюблені треки</h2>
          {likedSongs.length > 0 && (
            <span className="text-xs text-neutral-500 ml-1">{likedSongs.length}</span>
          )}
        </div>

        {loadingLikes ? (
          <div className="flex items-center gap-2 text-neutral-400 text-sm py-4">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Завантаження...
          </div>
        ) : likedSongs.length === 0 ? (
          <div className="py-6 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3e3e3e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <p className="text-neutral-500 text-sm">Ще немає улюблених треків</p>
            <p className="text-neutral-600 text-xs mt-1">Натисни ♥ біля будь-якої пісні</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {likedSongs.map((song) => {
              const isActive = track.id === song.id
              const isPlaying = isActive && playStatus
              return (
                <div
                  key={song.id}
                  onClick={() => playWithId(song.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
                    isActive ? 'bg-[#1db954]/10' : 'hover:bg-[#242424]'
                  }`}
                >
                  {/* Обкладинка */}
                  <div className="relative shrink-0 w-10 h-10">
                    <img
                      src={song.image.startsWith('http') ? song.image : `${API}/${song.image}`}
                      alt={song.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className={`absolute inset-0 rounded flex items-center justify-center bg-black/50 transition-opacity ${
                      isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {isPlaying ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                          <rect x="3" y="4" width="4" height="16" rx="1"/>
                          <rect x="10" y="4" width="4" height="16" rx="1"/>
                          <rect x="17" y="4" width="4" height="16" rx="1"/>
                        </svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                          <polygon points="5,3 19,12 5,21"/>
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Назва + автор */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
                      {song.name}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">{song.artist || song.desc}</p>
                  </div>

                  <span className="text-xs text-neutral-500 shrink-0 tabular-nums">{song.duration}</span>

                  {/* Кнопка видалити з улюблених */}
                  <button
                    onClick={(e) => handleUnlike(e, song.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                    aria-label="Прибрати з улюблених"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1db954" stroke="#1db954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Особисті дані */}
      <div className="bg-[#181818] rounded-xl p-6">
        <h2 className="text-white font-bold text-base mb-5">Особисті дані</h2>
        {errorInfo && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-sm">{errorInfo}</div>}
        {successInfo && <div className="bg-[#1db954]/20 border border-[#1db954]/40 text-[#1db954] p-3 rounded-lg mb-4 text-sm">{successInfo}</div>}
        <form onSubmit={handleSaveInfo} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Ім'я користувача</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder="Ваше ім'я" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder="name@domain.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Дата реєстрації</label>
            <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-neutral-500 cursor-not-allowed">
              {formatDate((user as any)?.createdAt)}
            </div>
          </div>
          <button type="submit" disabled={loadingInfo}
            className="self-start px-6 py-2.5 rounded-full text-sm font-bold bg-white hover:bg-neutral-200 text-black transition disabled:opacity-50 mt-1">
            {loadingInfo ? 'Збереження...' : 'Зберегти зміни'}
          </button>
        </form>
      </div>

      {/* Зміна паролю */}
      <div className="bg-[#181818] rounded-xl p-6">
        <h2 className="text-white font-bold text-base mb-5">Змінити пароль</h2>
        {errorPass && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-sm">{errorPass}</div>}
        {successPass && <div className="bg-[#1db954]/20 border border-[#1db954]/40 text-[#1db954] p-3 rounded-lg mb-4 text-sm">{successPass}</div>}
        <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Поточний пароль</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Новий пароль</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder="Мінімум 6 символів" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Підтвердити пароль</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
              className={`w-full bg-[#242424] border rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors ${
                confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : 'border-[#3a3a3a] focus:border-[#1db954]'
              }`}
              placeholder="Повторіть новий пароль" />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Паролі не збігаються</p>
            )}
          </div>
          <button type="submit" disabled={loadingPass || (!!confirmPassword && newPassword !== confirmPassword)}
            className="self-start px-6 py-2.5 rounded-full text-sm font-bold bg-white hover:bg-neutral-200 text-black transition disabled:opacity-50 mt-1">
            {loadingPass ? 'Збереження...' : 'Змінити пароль'}
          </button>
        </form>
      </div>

    </div>
  )
}