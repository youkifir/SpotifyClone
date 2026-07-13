import React, { useState, useRef, useEffect } from 'react'
import { assets } from '../assets/assets'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { LANGUAGES } from '../i18n/translations'
import { useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import { useNotifications } from '../context/NotificationContext.tsx'
import NotificationPanel from './NotificationPanel'


interface NavbarProps {
  onToggleSidebar?: () => void
  onToggleCollapse?: () => void
  sidebarCollapsed?: boolean
}

const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onToggleCollapse, sidebarCollapsed }) => {
  const [notifOpen, setNotifOpen] = useState(false)        // ← add this
  const { unreadCount } = useNotifications()  
  const { user, logout } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [premiumOpen, setPremiumOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Закриваємо меню при кліку поза ним
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setLangMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/login')
  }

  const handleAdminPanel = () => {
    setMenuOpen(false)
    navigate('/admin')
  }

  // Перша літера імені для аватара
  const avatarLetter = user?.username?.charAt(0).toUpperCase() ?? 'U'

  return (
    <div className='bg-[#121212] h-14 rounded-lg grid grid-cols-3 items-center px-2 sm:px-4 w-full select-none shrink-0'>

      {/* Лівий блок */}
      <div className='flex items-center gap-2 justify-start min-w-0'>
        {/* Мобільний бургер */}
        <button
          onClick={onToggleSidebar}
          aria-label="Відкрити бібліотеку"
          className='lg:hidden w-9 h-9 shrink-0 rounded-full flex items-center justify-center hover:bg-[#2a2a2a] hover:scale-105 transition text-white'
        >
          <svg role="img" height="20" width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <img
          onClick={() => navigate('/')}
          className='w-8 h-8 cursor-pointer hover:scale-105 transition hidden sm:block shrink-0'
          src={assets.spotify_logo}
          alt="Spotify"
        />
      </div>

      {/* Центральний блок — пошук */}
      <div className='flex items-center justify-center gap-2 w-full max-w-125 justify-self-center min-w-0'>
        <div
          onClick={() => navigate('/')}
          className='bg-[#1f1f1f] p-3 rounded-full hover:bg-[#2a2a2a] hover:scale-105 cursor-pointer transition flex items-center justify-center w-11 h-11 shrink-0'
        >
          <img className='w-5' src={assets.home_icon} alt="Home" />
        </div>
        <SearchBar />
      </div>

      {/* Правий блок — профіль */}
      <div className='flex items-center justify-end gap-2 sm:gap-3'>
        <button onClick={() => setPremiumOpen(true)} className='bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:scale-105 hover:bg-neutral-200 transition hidden xl:block shadow-sm'>
          {t('watchPremium')}
        </button>

        {/* Premium модалка */}
        {premiumOpen && (
          <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm' onClick={() => setPremiumOpen(false)}>
            <div className='bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-4 text-center' onClick={e => e.stopPropagation()}>
              <div className='w-16 h-16 rounded-full bg-[#1db954]/20 flex items-center justify-center'>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1db954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <h2 className='text-white text-xl font-bold'>{t('premiumTitle')}</h2>
              <p className='text-neutral-400 text-sm leading-relaxed'>{t('premiumDesc')}</p>
              <button
                onClick={() => setPremiumOpen(false)}
                className='mt-2 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-sm px-8 py-2.5 rounded-full transition hover:scale-105 active:scale-95'
              >
                {t('premiumClose')}
              </button>
            </div>
          </div>
        )}

        {/* Дзвіночок */}
        <div className='relative'>
          <button
            onClick={() => setNotifOpen(o => !o)}
            aria-label="Сповіщення"
            className='relative bg-[#1f1f1f] p-2.5 rounded-full hover:bg-[#2a2a2a] hover:scale-105 cursor-pointer transition flex items-center justify-center w-9 h-9 text-[#b3b3b3] hover:text-white'
          >
            <svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5a3 3 0 0 0-3 3v2.37l-1.283 1.283A1 1 0 0 0 3 8.862V10.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.862a1 1 0 0 0-.717-.71l-1.283-1.282V4.5a3 3 0 0 0-3-3zM6.5 13a1.5 1.5 0 0 0 3 0h-3z" />
            </svg>
            {unreadCount > 0 && (
              <span className='absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1db954] text-black text-[9px] font-bold flex items-center justify-center leading-none'>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Аватар з дропдауном */}
        <div className='relative' ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className='w-9 h-9 rounded-full overflow-hidden bg-[#282828] hover:scale-105 transition cursor-pointer flex items-center justify-center font-bold text-xs border border-[#3e3e3e] hover:border-[#1db954] text-white uppercase shrink-0'
            aria-label="Профіль"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Аватар" className="w-full h-full object-cover" />
            ) : (
              avatarLetter
            )}
          </button>

          {/* Дропдаун меню */}
          {menuOpen && (
            <div className='absolute right-0 top-11 z-50 w-52 bg-[#282828] rounded-lg shadow-2xl border border-[#3e3e3e] overflow-hidden py-1'>

              {/* Інфо про юзера */}
              <div className='px-4 py-3 border-b border-[#3e3e3e]'>
                <p className='text-white font-semibold text-sm truncate'>{user?.username}</p>
                <p className='text-neutral-400 text-xs truncate'>{user?.email}</p>
              </div>

              {/* Адмін панель — тільки для адміна */}
              {user?.role === 'admin' && (
                <button
                  onClick={handleAdminPanel}
                  className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1db954] hover:bg-[#1db954]/10 transition text-left'
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  {t('adminPanel')}
                </button>
              )}

              {/* Студія музиканта — для музиканта та адміна */}
              {(user?.role === 'musician' || user?.role === 'admin') && (
                <button
                  onClick={() => { setMenuOpen(false); navigate('/musician') }}
                  className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-purple-400 hover:bg-purple-500/10 transition text-left'
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                  </svg>
                  {t('myStudio')}
                </button>
              )}

              {/* Профіль */}
              <button
                onClick={() => { setMenuOpen(false); navigate('/profile') }}
                className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-[#333333] transition text-left'
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {t('profile')}
              </button>

              <div className='border-t border-[#3e3e3e] mt-1'></div>

              {/* Мова */}
              <div className='relative'>
                <button
                  onClick={() => setLangMenuOpen((o) => !o)}
                  className='w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-[#333333] transition text-left'
                >
                  <span className='flex items-center gap-3'>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    {t('language')}
                  </span>
                  <span className='text-xs text-neutral-500'>{language.toUpperCase()}</span>
                </button>

                {langMenuOpen && (
                  <div className='pb-1'>
                    {LANGUAGES.map((lng) => (
                      <button
                        key={lng.code}
                        onClick={() => { setLanguage(lng.code); setLangMenuOpen(false) }}
                        className={`w-full flex items-center justify-between pl-11 pr-4 py-2 text-sm transition text-left ${
                          language === lng.code ? 'text-[#1db954]' : 'text-neutral-400 hover:text-white'
                        } hover:bg-[#333333]`}
                      >
                        {lng.label}
                        {language === lng.code && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className='border-t border-[#3e3e3e] mt-1'></div>

              {/* Вийти */}
              <button
                onClick={handleLogout}
                className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-[#333333] transition text-left'
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Navbar