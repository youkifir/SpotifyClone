import { useState, useRef, useCallback } from 'react'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'
import ArtistPopup from './ArtistProup'
import { useLike } from '../hooks/Uselike'
import AddToPlaylistMenu from './AddToPlaylistMenu'

const API = 'http://localhost:5000'
const getImageUrl = (url: string) =>
  !url || url.startsWith('http') || url.startsWith('data:') ? url : `${API}/${url.replace(/^\//, '')}`

interface Song {
  id: number | string
  name: string
  image: string
  desc: string
  duration: string
  artist?: string
}

interface SongListProps {
  songs: Song[]
}

function SongList({ songs }: SongListProps) {
  const { track, playStatus, playWithId } = usePlayer()
  const { isLiked, toggleLike } = useLike()
  const [popupArtist, setPopupArtist] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [animatingId, setAnimatingId] = useState<string | number | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Стан меню "Додати до плейліста"
  const [menuSongId, setMenuSongId] = useState<string | number | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  const handleArtistMouseEnter = (e: React.MouseEvent<HTMLSpanElement>, artist: string) => {
    const el = e.currentTarget
    hoverTimer.current = setTimeout(() => {
      setAnchorEl(el)
      setPopupArtist(artist)
    }, 400)
  }

  const handleArtistMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }

  const closeArtistPopup = () => {
    setPopupArtist(null)
    setAnchorEl(null)
  }

  const handleLike = (e: React.MouseEvent, songId: string | number) => {
    e.stopPropagation()
    toggleLike(songId)
    setAnimatingId(songId)
    setTimeout(() => setAnimatingId(null), 400)
  }

  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>, songId: string | number) => {
    e.stopPropagation()
    if (menuSongId === songId) {
      setMenuSongId(null)
      setMenuAnchor(null)
    } else {
      setMenuSongId(songId)
      setMenuAnchor(e.currentTarget)
    }
  }

  const closeMenu = useCallback(() => {
    setMenuSongId(null)
    setMenuAnchor(null)
  }, [])

  return (
    <div>
      {/* Заголовок таблиці — додаємо колонку для кнопок дій */}
      <div className="grid grid-cols-[16px_4fr_2fr_auto_auto_minmax(56px,1fr)] gap-2 sm:gap-4 px-2 sm:px-4 py-2 text-neutral-400 text-sm border-b border-[#2a2a2a]">
        <span>#</span>
        <span>Назва</span>
        <span className="hidden sm:block">Опис / Автор</span>
        <span></span>
        <span></span>
        <img src={assets.clock_icon} alt="Тривалість" className="w-4 h-4 justify-self-end" />
      </div>

      <div className="mt-2">
        {songs.map((song, index) => {
          const isActive = track.id === song.id
          const isActivePlaying = isActive && playStatus
          const liked = isLiked(song.id)
          const isAnimating = animatingId === song.id

          return (
            <div
              key={song.id}
              onClick={() => playWithId(song.id)}
              className={`grid grid-cols-[16px_4fr_2fr_auto_auto_minmax(56px,1fr)] gap-2 sm:gap-4 px-2 sm:px-4 py-2 rounded-md hover:bg-[#2a2a2a] cursor-pointer group ${
                isActive ? 'text-[#1db954]' : 'text-neutral-300'
              }`}
            >
              {/* Номер / Equalizer / Play */}
              <span className="self-center text-sm relative w-4 h-4 flex items-center justify-center">
                {/* Equalizer — тільки для активного треку, ховається при hover */}
                {isActive ? (
                  <span className={`equalizer ${playStatus ? 'playing' : 'paused'} group-hover:hidden`}>
                    <span /><span /><span />
                  </span>
                ) : (
                  <span className="group-hover:hidden text-neutral-400">{index + 1}</span>
                )}
                <img
                  src={isActivePlaying ? assets.pause_icon : assets.play_icon}
                  alt=""
                  className={`w-3 h-3 absolute inset-0 m-auto ${isActivePlaying ? 'hidden group-hover:block' : 'hidden group-hover:block'}`}
                />
              </span>

              {/* Фото + Назва + Артист */}
              <div className="flex items-center gap-3 min-w-0">
                <img src={getImageUrl(song.image)} alt={song.name} className="w-10 h-10 rounded object-cover shrink-0" />
                <div className="min-w-0">
                  <span className={`text-sm truncate block ${isActive ? 'text-[#1db954]' : 'text-white'}`}>{song.name}</span>
                  {song.artist && (
                    <span
                      onMouseEnter={(e) => { e.stopPropagation(); handleArtistMouseEnter(e, song.artist!) }}
                      onMouseLeave={handleArtistMouseLeave}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-neutral-400 hover:text-white hover:underline cursor-pointer truncate block transition-colors"
                    >
                      {song.artist}
                    </span>
                  )}
                </div>
              </div>

              {/* Опис (десктоп) */}
              <div className="hidden sm:flex items-center min-w-0">
                {song.artist ? (
                  <span
                    onMouseEnter={(e) => { e.stopPropagation(); handleArtistMouseEnter(e, song.artist!) }}
                    onMouseLeave={handleArtistMouseLeave}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-neutral-400 hover:text-white hover:underline cursor-pointer truncate transition-colors"
                  >
                    {song.artist}
                  </span>
                ) : (
                  <span className="text-sm truncate">{song.desc}</span>
                )}
              </div>

              {/* Кнопка лайку ♥ */}
              <button
                onClick={(e) => handleLike(e, song.id)}
                className={`self-center w-5 h-5 flex items-center justify-center transition-all ${
                  liked
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 group-hover:opacity-60 hover:opacity-100!'
                } ${isAnimating ? 'scale-125' : 'hover:scale-110'}`}
                aria-label={liked ? 'Прибрати з улюблених' : 'Додати до улюблених'}
              >
                <svg
                  width="16" height="16" viewBox="0 0 24 24"
                  fill={liked ? '#1db954' : 'none'}
                  stroke={liked ? '#1db954' : 'currentColor'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="transition-all duration-200"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

              {/* Кнопка ⋮ — додати до плейліста */}
              <button
                onClick={(e) => handleOpenMenu(e, song.id)}
                className={`self-center w-5 h-5 flex items-center justify-center rounded-full transition-all
                  opacity-0 group-hover:opacity-60 hover:opacity-100! hover:bg-white/10
                  ${menuSongId === song.id ? 'opacity-100! bg-white/10' : ''}`}
                aria-label="Додати до плейліста"
                title="Додати до плейліста"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {/* Тривалість */}
              <span className="self-center text-sm justify-self-end">{song.duration}</span>
            </div>
          )
        })}
      </div>

      {/* Popup артиста */}
      {popupArtist && (
        <ArtistPopup
          artistName={popupArtist}
          anchorEl={anchorEl}
          onClose={closeArtistPopup}
        />
      )}

      {/* Меню "Додати до плейліста" */}
      {menuSongId !== null && (
        <AddToPlaylistMenu
          songId={menuSongId}
          anchorEl={menuAnchor}
          onClose={closeMenu}
        />
      )}
    </div>
  )
}

export default SongList