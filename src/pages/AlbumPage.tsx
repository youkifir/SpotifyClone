import { useParams, Navigate } from 'react-router-dom'
import { albumsData, songsData } from '../assets/assets'
import SongList from '../components/SongList'
import Button from '../components/Button'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'

function AlbumPage() {
  const { id } = useParams()
  const album = albumsData.find((a) => String(a.id) === id)
  const { track, playStatus, playWithId, play } = usePlayer()

  if (!album) {
    return <Navigate to="/" replace />
  }

  const handlePlayAlbum = () => {
    const isCurrentSongInAlbum = songsData.some((s) => s.id === track.id)
    if (isCurrentSongInAlbum) {
      play()
    } else {
      playWithId(songsData[0].id)
    }
  }

  return (
    <div className="pt-2 sm:pt-4">
      {/* шапка альбому */}
      <div
        className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 p-4 sm:p-6 rounded-lg"
        style={{ background: `linear-gradient(180deg, ${album.bgColor}, #121212)` }}
      >
        <img src={album.image} alt={album.name} className="w-36 h-36 sm:w-48 sm:h-48 object-cover shadow-2xl rounded shrink-0" />
        <div className="text-center sm:text-left min-w-0">
          <p className="text-xs font-semibold uppercase text-neutral-200">Плейлист</p>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white my-2 truncate">{album.name}</h1>
          <p className="text-neutral-300 text-sm">{album.desc}</p>
        </div>
      </div>

      {/* керування */}
      <div className="flex items-center gap-4 sm:gap-6 px-3 sm:px-6 py-4 sm:py-6">
        <div
          onClick={handlePlayAlbum}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1db954] shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 hover:bg-[#1ed760] transition"
        >
          <img
            src={playStatus && songsData.some((s) => s.id === track.id) ? assets.pause_icon : assets.play_icon}
            alt="Відтворити"
            className="w-5 h-5 sm:w-6 sm:h-6"
          />
        </div>
        <Button variant="ghost">Ще</Button>
      </div>

      {/* трек-лист */}
      <div className="px-1 sm:px-2">
        <SongList songs={songsData} />
      </div>
    </div>
  )
}

export default AlbumPage