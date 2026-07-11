import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:5000'

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ProfilePage() {
  const { user, token, login: ctxLogin } = useAuth()

  // Форма основних даних
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')

  // Форма паролю
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loadingInfo, setLoadingInfo] = useState(false)
  const [loadingPass, setLoadingPass] = useState(false)
  const [errorInfo, setErrorInfo] = useState('')
  const [errorPass, setErrorPass] = useState('')
  const [successInfo, setSuccessInfo] = useState('')
  const [successPass, setSuccessPass] = useState('')

  const avatarLetter = user?.username?.charAt(0).toUpperCase() ?? 'U'

  const showSuccess = (setter: (v: string) => void, msg: string) => {
    setter(msg)
    setTimeout(() => setter(''), 3000)
  }

  // Оновлення імені та пошти
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorInfo('')
    setLoadingInfo(true)
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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

  // Зміна паролю
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorPass('')
    if (newPassword !== confirmPassword) {
      setErrorPass('Паролі не збігаються')
      return
    }
    setLoadingPass(true)
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Помилка')
      ctxLogin(data.token, data.user)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showSuccess(setSuccessPass, 'Пароль змінено!')
    } catch (err: any) {
      setErrorPass(err.message)
    } finally {
      setLoadingPass(false)
    }
  }

  return (
    <div className="pt-2 sm:pt-4 flex flex-col gap-6 max-w-2xl mx-auto">

      {/* Шапка профілю */}
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
                : 'bg-[#282828] text-neutral-400'
            }`}>
              {user?.role === 'admin' ? 'Адміністратор' : 'Користувач'}
            </span>
            <span className="text-neutral-500 text-xs">
              З нами з {formatDate((user as any)?.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Блок — основна інформація */}
      <div className="bg-[#181818] rounded-xl p-6">
        <h2 className="text-white font-bold text-base mb-5">Особисті дані</h2>

        {errorInfo && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-sm">
            {errorInfo}
          </div>
        )}
        {successInfo && (
          <div className="bg-[#1db954]/20 border border-[#1db954]/40 text-[#1db954] p-3 rounded-lg mb-4 text-sm">
            {successInfo}
          </div>
        )}

        <form onSubmit={handleSaveInfo} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Ім'я користувача
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder="Ваше ім'я"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder="name@domain.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Дата реєстрації
            </label>
            <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-neutral-500 cursor-not-allowed">
              {formatDate((user as any)?.createdAt)}
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingInfo}
            className="self-start px-6 py-2.5 rounded-full text-sm font-bold bg-white hover:bg-neutral-200 text-black transition disabled:opacity-50 mt-1"
          >
            {loadingInfo ? 'Збереження...' : 'Зберегти зміни'}
          </button>
        </form>
      </div>

      {/* Блок — зміна паролю */}
      <div className="bg-[#181818] rounded-xl p-6">
        <h2 className="text-white font-bold text-base mb-5">Змінити пароль</h2>

        {errorPass && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-sm">
            {errorPass}
          </div>
        )}
        {successPass && (
          <div className="bg-[#1db954]/20 border border-[#1db954]/40 text-[#1db954] p-3 rounded-lg mb-4 text-sm">
            {successPass}
          </div>
        )}

        <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Поточний пароль
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Новий пароль
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#1db954] transition-colors"
              placeholder="Мінімум 6 символів"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Підтвердити пароль
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full bg-[#242424] border rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors ${
                confirmPassword && newPassword !== confirmPassword
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[#3a3a3a] focus:border-[#1db954]'
              }`}
              placeholder="Повторіть новий пароль"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Паролі не збігаються</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loadingPass || (!!confirmPassword && newPassword !== confirmPassword)}
            className="self-start px-6 py-2.5 rounded-full text-sm font-bold bg-white hover:bg-neutral-200 text-black transition disabled:opacity-50 mt-1"
          >
            {loadingPass ? 'Збереження...' : 'Змінити пароль'}
          </button>
        </form>
      </div>

    </div>
  )
}