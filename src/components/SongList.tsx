import { assets } from '../assets/assets'

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
  return (
    <div>
      {/* заголовок таблиці */}
      <div className="grid grid-cols-[16px_4fr_2fr_minmax(80px,1fr)] gap-4 px-4 py-2 text-neutral-400 text-sm border-b border-[#2a2a2a]">
        <span>#</span>
        <span>Назва</span>
        <span className="hidden sm:block">Опис</span>
        <img src={assets.clock_icon} alt="Тривалість" className="w-4 h-4 justify-self-end" />
      </div>

      {/* рядки треків */}
      <div className="mt-2">
        {songs.map((song, index) => (
          <div
            key={song.id}
            className="grid grid-cols-[16px_4fr_2fr_minmax(80px,1fr)] gap-4 px-4 py-2 rounded-md text-neutral-300 hover:bg-[#2a2a2a] cursor-pointer group"
          >
            <span className="self-center text-sm">{index + 1}</span>
            <div className="flex items-center gap-3 min-w-0">
              <img src={song.image} alt={song.name} className="w-10 h-10 rounded object-cover" />
              <span className="text-white text-sm truncate">{song.name}</span>
            </div>
            <span className="hidden sm:block self-center text-sm truncate">{song.desc}</span>
            <span className="self-center text-sm justify-self-end">{song.duration}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SongList
