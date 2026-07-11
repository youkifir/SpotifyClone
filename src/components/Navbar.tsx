import React, { useState, useRef, useEffect } from 'react'
import { assets } from '../assets/assets'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface NavbarProps {
  onToggleSidebar?: () => void
}

const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Закриваємо меню при кліку поза ним
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
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
        <div className='flex-1 bg-[#1f1f1f] h-11 rounded-full flex items-center justify-between px-4 hover:bg-[#2a2a2a] border border-transparent hover:border-[#3e3e3e] cursor-pointer transition text-[#b3b3b3] min-w-0'>
          <div className='flex items-center gap-2 min-w-0'>
            <img className='w-5 shrink-0' src={assets.search_icon} alt="Search" />
            <p className='text-sm font-medium truncate hidden sm:block'>What do you want to play?</p>
          </div>
          <div className='hidden sm:flex items-center gap-3 shrink-0 pl-2'>
            <div className='w-[px] h-5 bg-[#3e3e3e]'></div>
            <svg
              role="img" height="20" width="20" aria-hidden="true"
              className='text-[#b3b3b3] hover:text-white transition'
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
        </div>
      </div>

      {/* Правий блок — профіль */}
      <div className='flex items-center justify-end gap-2 sm:gap-3'>
        <button className='bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:scale-105 hover:bg-neutral-200 transition hidden xl:block shadow-sm'>
          Watch about Premium
        </button>

        {/* Дзвіночок */}
        <div className='bg-[#1f1f1f] p-2.5 rounded-full hover:bg-[#2a2a2a] hover:scale-105 cursor-pointer transition flex items-center justify-center w-9 h-9 text-[#b3b3b3] hover:text-white'>
          <svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1.5a3 3 0 0 0-3 3v2.37l-1.283 1.283A1 1 0 0 0 3 8.862V10.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.862a1 1 0 0 0-.717-.71l-1.283-1.282V4.5a3 3 0 0 0-3-3zM6.5 13a1.5 1.5 0 0 0 3 0h-3z" />
          </svg>
        </div>

        {/* Аватар з дропдауном */}
        <div className='relative' ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className='w-9 h-9 rounded-full bg-[#282828] hover:scale-105 transition cursor-pointer flex items-center justify-center font-bold text-xs border border-[#3e3e3e] hover:border-[#1db954] text-white uppercase shrink-0'
            aria-label="Профіль"
          >
            {avatarLetter}
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
                  Адмін панель
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
                Профіль
              </button>

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
                Вийти
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Navbar