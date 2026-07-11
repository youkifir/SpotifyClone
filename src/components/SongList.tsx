import { useState, useRef } from 'react'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'
import ArtistPopup from './ArtistProup'

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
  const [popupArtist, setPopupArtist] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const closePopup = () => {
    setPopupArtist(null)
    setAnchorEl(null)
  }

  return (
    <div>
      <div className="grid grid-cols-[16px_4fr_2fr_auto_minmax(56px,1fr)] gap-2 sm:gap-4 px-2 sm:px-4 py-2 text-neutral-400 text-sm border-b border-[#2a2a2a]">
        <span>#</span>
        <span>Назва</span>
        <span className="hidden sm:block">Опис / Автор</span>
        <span></span>
        <img src={assets.clock_icon} alt="Тривалість" className="w-4 h-4 justify-self-end" />
      </div>
      <div className="mt-2">
        {songs.map((song, index) => {
          const isActive = track.id === song.id
          const isActivePlaying = isActive && playStatus

          return (
            <div
              key={song.id}
              onClick={() => playWithId(song.id)}
              className={`grid grid-cols-[16px_4fr_2fr_auto_minmax(56px,1fr)] gap-2 sm:gap-4 px-2 sm:px-4 py-2 rounded-md hover:bg-[#2a2a2a] cursor-pointer group ${
                isActive ? 'text-[#1db954]' : 'text-neutral-300'
              }`}
            >
              <span className="self-center text-sm relative w-4 h-4">
                <span className={`${isActivePlaying ? 'hidden' : 'group-hover:hidden'}`}>{index + 1}</span>
                <img
                  src={isActivePlaying ? assets.pause_icon : assets.play_icon}
                  alt=""
                  className={`w-3 h-3 absolute inset-0 m-auto ${isActivePlaying ? 'block' : 'hidden group-hover:block'}`}
                />
              </span>
              <div className="flex items-center gap-3 min-w-0">
                <img src={song.image} alt={song.name} className="w-10 h-10 rounded object-cover shrink-0" />
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
              <img
                src={assets.like_icon}
                alt="Подобається"
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 self-center opacity-0 group-hover:opacity-70 hover:opacity-100! hover:scale-110 transition"
              />
              <span className="self-center text-sm justify-self-end">{song.duration}</span>
            </div>
          )
        })}
      </div>

      {/* Artist popup */}
      {popupArtist && (
        <ArtistPopup
          artistName={popupArtist}
          anchorEl={anchorEl}
          onClose={closePopup}
        />
      )}
    </div>
  )
}

export default SongList
