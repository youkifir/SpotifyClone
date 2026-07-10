import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'

interface Song {
  id: number | string
  name: string
  image: string
  desc: string
  duration: string
}

interface SongListProps {
  songs: Song[]
}

function SongList({ songs }: SongListProps) {
  const { track, playStatus, playWithId } = usePlayer()

  return (
    <div>
      <div className="grid grid-cols-[16px_4fr_2fr_minmax(80px,1fr)] gap-4 px-4 py-2 text-neutral-400 text-sm border-b border-[#2a2a2a]">
        <span>#</span>
        <span>Назва</span>
        <span className="hidden sm:block">Опис</span>
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
              className={`grid grid-cols-[16px_4fr_2fr_minmax(80px,1fr)] gap-4 px-4 py-2 rounded-md hover:bg-[#2a2a2a] cursor-pointer group ${
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
                <img src={song.image} alt={song.name} className="w-10 h-10 rounded object-cover" />
                <span className={`text-sm truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>{song.name}</span>
              </div>
              <span className="hidden sm:block self-center text-sm truncate">{song.desc}</span>
              <span className="self-center text-sm justify-self-end">{song.duration}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SongList
