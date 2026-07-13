import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const API = 'http://localhost:5000'

function formatDate(dateStr?: string, language = 'uk') {
  if (!dateStr) return '—'
  const locale = language === 'en' ? 'en-GB' : language === 'ru' ? 'ru-RU' : 'uk-UA'
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Musician Request Button ──────────────────────────────────────────────────

function MusicianRequestButton({ token, t }: { token: string | null; t: (key: any) => string }) {
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
          {t('musicianRequestPending')}
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
          {status === 'loading' ? t('sendingRequest') : t('becomeMusician')}
        </button>
      )}
    </div>
  )
}

// ─── Listen History Types ─────────────────────────────────────────────────────
interface HistorySong { _id: string; name: string; artist: string; image: string; duration: string }
interface HistoryItem { song: HistorySong; listenedAt: string }
interface HistoryStats {
  totalListens: number; uniqueSongs: number; uniqueArtists: number
  topSongs: { song: HistorySong; count: number }[]
  topArtists: { name: string; count: number }[]
}

export default function ProfilePage() {
  const { user, token, login: ctxLogin } = useAuth()
  const { t, language } = useLanguage()

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

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar ?? null)
  const [loadingAvatar, setLoadingAvatar] = useState(false)
  const [errorAvatar, setErrorAvatar] = useState('')
  const [successAvatar, setSuccessAvatar] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const avatarLetter = user?.username?.charAt(0).toUpperCase() ?? 'U'

  // ─── Listen History ──────────────────────────────────────────────────────────
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [historyStats, setHistoryStats] = useState<HistoryStats | null>(null)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchHistory = useCallback(async (page = 1, append = false) => {
    if (!token) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/history?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setHistoryItems((prev: HistoryItem[]) => append ? [...prev, ...data.data.history] : data.data.history)
        setHistoryStats(data.data.stats)
        setHistoryTotalPages(data.data.pagination.totalPages)
        setHistoryPage(page)
      }
    } catch { /* ignore */ } finally {
      setHistoryLoading(false)
    }
  }, [token])

  useEffect(() => { fetchHistory(1) }, [fetchHistory])


  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorAvatar(t('avatarErrorType'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorAvatar(t('avatarErrorSize'))
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setAvatarPreview(result)
      setErrorAvatar('')
    }
    reader.readAsDataURL(file)
  }

  const handleSaveAvatar = async () => {
    if (!avatarPreview || avatarPreview === user?.avatar) return
    setLoadingAvatar(true)
    setErrorAvatar('')
    try {
      const res = await fetch(`${API}/api/auth/avatar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar: avatarPreview }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка')
      ctxLogin(data.token, data.user)
      showSuccess(setSuccessAvatar, t('avatarUpdated'))
    } catch (err: any) {
      setErrorAvatar(err.message)
    } finally {
      setLoadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setLoadingAvatar(true)
    setErrorAvatar('')
    try {
      const res = await fetch(`${API}/api/auth/avatar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar: null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка')
      ctxLogin(data.token, data.user)
      setAvatarPreview(null)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      showSuccess(setSuccessAvatar, t('avatarDeleted'))
    } catch (err: any) {
      setErrorAvatar(err.message)
    } finally {
      setLoadingAvatar(false)
    }
  }

  const showSuccess = (setter: (v: string) => void, msg: string) => {
    setter(msg)
    setTimeout(() => setter(''), 3000)
  }

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
      showSuccess(setSuccessInfo, t('profileUpdated'))
    } catch (err: any) {
      setErrorInfo(err.message)
    } finally {
      setLoadingInfo(false)
    }
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorPass('')
    if (newPassword !== confirmPassword) { setErrorPass(t('passwordMismatch')); return }
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
      showSuccess(setSuccessPass, t('passwordChanged'))
    } catch (err: any) {
      setErrorPass(err.message)
    } finally {
      setLoadingPass(false)
    }
  }

  return (
    <div className="pt-2 sm:pt-4 flex flex-col gap-6 max-w-2xl mx-auto">

      {/* Шапка */}
      <div className="flex items-center gap-5 p-6 bg-linear-to-br from-[#1db954]/20 to-[#121212] rounded-xl border border-[#1db954]/10">
        {/* Аватар */}
        <div className="relative shrink-0 group">
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Аватар" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#1db954] flex items-center justify-center text-black font-black text-3xl">
                {avatarLetter}
              </div>
            )}
          </div>
          {/* Оверлей при наведенні */}
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title={t('changeAvatarTitle')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span className="text-white text-[9px] font-semibold mt-0.5">{t('changeAvatar')}</span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1db954] mb-1">{t('profileLabel')}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{user?.username}</h1>
          <p className="text-neutral-400 text-sm mt-0.5">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              user?.role === 'admin'
                ? 'bg-[#1db954]/20 text-[#1db954] border border-[#1db954]/30'
                : user?.role === 'musician'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-[#282828] text-neutral-400'
            }`}>
              {user?.role === 'admin' ? t('roleAdmin') : user?.role === 'musician' ? t('roleMusician') : t('roleUser')}
            </span>
            <span className="text-neutral-500 text-xs">
              {t('memberSince')} {formatDate((user as any)?.createdAt, language)}
            </span>
          </div>
          {user?.role === 'user' && <MusicianRequestButton token={token} t={t} />}

          {/* Кнопки збереження/видалення аватара */}
          {(avatarPreview !== (user?.avatar ?? null)) && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleSaveAvatar}
                disabled={loadingAvatar}
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#1db954] text-black hover:bg-[#1ed760] transition disabled:opacity-50"
              >
                {loadingAvatar ? t('savingAvatar') : t('saveAvatar')}
              </button>
              <button
                onClick={() => {
                  setAvatarPreview(user?.avatar ?? null)
                  if (avatarInputRef.current) avatarInputRef.current.value = ''
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#282828] text-neutral-400 hover:text-white hover:bg-[#333] transition"
              >
                {t('cancelAvatar')}
              </button>
            </div>
          )}
          {avatarPreview && avatarPreview === (user?.avatar ?? null) && (
            <button
              onClick={handleRemoveAvatar}
              disabled={loadingAvatar}
              className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition disabled:opacity-50"
            >
              {loadingAvatar ? '...' : t('deleteAvatar')}
            </button>
          )}
          {errorAvatar && <p className="text-red-400 text-xs mt-2">{errorAvatar}</p>}
          {successAvatar && <p className="text-[#1db954] text-xs mt-2">{successAvatar}</p>}
        </div>
      </div>

      {/* Особисті дані */}
      <div className="bg-[#181818] rounded-xl p-6">
        <h2 className="text-white font-bold text-base mb-5">{t('personalInfo')}</h2>
        {errorInfo && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-sm">{errorInfo}</div>}
        {successInfo && <div className="bg-[#1db954]/20 border border-[#1db954]/40 text-[#1db954] p-3 rounded-lg mb-4 text-sm">{successInfo}</div>}
        <form onSubmit={handleSaveInfo} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">{t('usernameLabel')}</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder={t('usernamePlaceholder')} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder="name@domain.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">{t('registrationDate')}</label>
            <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-neutral-500 cursor-not-allowed">
              {formatDate((user as any)?.createdAt, language)}
            </div>
          </div>
          <button type="submit" disabled={loadingInfo}
            className="self-start px-6 py-2.5 rounded-full text-sm font-bold bg-white hover:bg-neutral-200 text-black transition disabled:opacity-50 mt-1">
            {loadingInfo ? t('saving') : t('saveChanges')}
          </button>
        </form>
      </div>

      {/* Зміна паролю */}
      <div className="bg-[#181818] rounded-xl p-6">
        <h2 className="text-white font-bold text-base mb-5">{t('changePassword')}</h2>
        {errorPass && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-sm">{errorPass}</div>}
        {successPass && <div className="bg-[#1db954]/20 border border-[#1db954]/40 text-[#1db954] p-3 rounded-lg mb-4 text-sm">{successPass}</div>}
        <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">{t('currentPassword')}</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">{t('newPassword')}</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder={t('newPasswordPlaceholder')} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">{t('confirmPassword')}</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
              className={`w-full bg-[#242424] border rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors ${
                confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : 'border-[#3a3a3a] focus:border-[#1db954]'
              }`}
              placeholder={t('confirmPasswordPlaceholder')} />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">{t('passwordMismatch')}</p>
            )}
          </div>
          <button type="submit" disabled={loadingPass || (!!confirmPassword && newPassword !== confirmPassword)}
            className="self-start px-6 py-2.5 rounded-full text-sm font-bold bg-white hover:bg-neutral-200 text-black transition disabled:opacity-50 mt-1">
            {loadingPass ? t('saving') : t('changePasswordBtn')}
          </button>
        </form>
      </div>

      {/* Історія прослуховувань */}
      <div className="bg-[#181818] rounded-xl p-6">
        <h2 className="text-white font-bold text-base mb-5">{t('listenHistory')}</h2>

        {historyStats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: t('historyTotalListens'), value: historyStats.totalListens },
              { label: t('historyUniqueSongs'),  value: historyStats.uniqueSongs  },
              { label: t('historyUniqueArtists'),value: historyStats.uniqueArtists },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#242424] rounded-xl p-4 text-center">
                <p className="text-[#1db954] font-black text-2xl">{value}</p>
                <p className="text-neutral-400 text-xs mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        )}

        {historyStats && (historyStats.topSongs.length > 0 || historyStats.topArtists.length > 0) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {historyStats.topSongs.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">{t('historyTopSongs')}</p>
                <div className="flex flex-col gap-2">
                  {historyStats.topSongs.map(({ song, count }: { song: HistorySong; count: number }, i: number) => (
                    <div key={song._id} className="flex items-center gap-2">
                      <span className="text-neutral-500 text-xs w-4 shrink-0">{i + 1}</span>
                      <img
                        src={song.image?.startsWith('http') ? song.image : `${API}/${song.image}`}
                        alt={song.name}
                        className="w-8 h-8 rounded object-cover shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs font-semibold truncate">{song.name}</p>
                        <p className="text-neutral-400 text-[11px] truncate">{song.artist}</p>
                      </div>
                      <span className="text-[#1db954] text-xs shrink-0">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {historyStats.topArtists.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">{t('historyTopArtists')}</p>
                <div className="flex flex-col gap-2">
                  {historyStats.topArtists.map(({ name, count }: { name: string; count: number }, i: number) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-neutral-500 text-xs w-4 shrink-0">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-[#1db954]/20 flex items-center justify-center shrink-0">
                        <span className="text-[#1db954] text-xs font-bold">{name.charAt(0).toUpperCase()}</span>
                      </div>
                      <p className="text-white text-xs font-semibold truncate flex-1 min-w-0">{name}</p>
                      <span className="text-[#1db954] text-xs shrink-0">{count} {t('historyTimes')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {historyLoading && historyItems.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">{t('historyLoading')}</div>
        ) : historyItems.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🎵</div>
            <p className="text-white font-semibold mb-1">{t('historyNoHistory')}</p>
            <p className="text-neutral-400 text-sm">{t('historyNoHistoryHint')}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              {historyItems.map((item: HistoryItem, idx: number) => (
                <div key={idx} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#242424] transition">
                  <img
                    src={item.song.image?.startsWith('http') ? item.song.image : `${API}/${item.song.image}`}
                    alt={item.song.name}
                    className="w-10 h-10 rounded object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.song.name}</p>
                    <p className="text-neutral-400 text-xs truncate">{item.song.artist}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-neutral-500 text-xs">
                      {new Date(item.listenedAt).toLocaleDateString(
                        language === 'en' ? 'en-GB' : language === 'ru' ? 'ru-RU' : 'uk-UA',
                        { day: 'numeric', month: 'short' }
                      )}
                    </p>
                    <p className="text-neutral-600 text-[11px]">
                      {new Date(item.listenedAt).toLocaleTimeString(
                        language === 'en' ? 'en-GB' : language === 'ru' ? 'ru-RU' : 'uk-UA',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {historyPage < historyTotalPages && (
              <button
                onClick={() => fetchHistory(historyPage + 1, true)}
                disabled={historyLoading}
                className="mt-4 w-full py-2 rounded-full bg-[#242424] text-neutral-400 hover:text-white hover:bg-[#2a2a2a] text-sm font-medium transition disabled:opacity-50"
              >
                {historyLoading ? t('historyLoading') : t('historyLoadMore')}
              </button>
            )}
          </>
        )}
      </div>


    </div>
  )
}