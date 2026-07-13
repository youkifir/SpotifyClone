import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import AddToPlaylistMenu from './AddToPlaylistMenu'

interface CardProps {
  to?: string
  image: string
  name: string
  desc: string
  onClick?: () => void
  isActive?: boolean
  songId?: string | number   // якщо передано — показуємо кнопку ⋮
  fluid?: boolean            // розтягується на всю ширину колонки grid
}

function Card({ to, image, name, desc, onClick, isActive, songId, fluid }: CardProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  const handleClick = () => {
    if (menuOpen) return
    if (onClick) { onClick(); return }
    if (to) navigate(to)
  }

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
    setMenuOpen(true)
  }

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    setMenuAnchor(null)
  }, [])

  return (
    <div
      onClick={handleClick}
      className={`${fluid ? 'w-full min-w-0' : 'w-36 sm:w-45 shrink-0 snap-start'} bg-[#181818] rounded-lg p-3 sm:p-4 cursor-pointer group relative card-hover ripple-btn`}
    >
      <div className="relative overflow-hidden rounded-md">
        <img
          src={image}
          alt={name}
          className="w-full aspect-square object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
        />

        {/* Кнопка Play */}
        {onClick && (
          <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] shadow-lg flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition hover:scale-105">
            <img src={isActive ? assets.pause_icon : assets.play_icon} alt="" className="w-4 h-4" />
          </div>
        )}

        {/* Кнопка ⋮ — тільки для треків */}
        {songId !== undefined && (
          <button
            onClick={handleMenuClick}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all z-10"
            aria-label="Додати до плейліста"
            title="Додати до плейліста"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        )}
      </div>

      <p className={`text-sm font-semibold mt-3 truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>{name}</p>
      <p className="text-neutral-400 text-xs mt-1 line-clamp-2">{desc}</p>

      {/* Меню додавання до плейліста */}
      {menuOpen && songId !== undefined && (
        <AddToPlaylistMenu
          songId={songId}
          anchorEl={menuAnchor}
          onClose={closeMenu}
        />
      )}
    </div>
  )
}

export default Card