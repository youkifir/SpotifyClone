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
    <div className="pt-4">
      {/* шапка альбому */}
      <div
        className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-lg"
        style={{ background: `linear-gradient(180deg, ${album.bgColor}, #121212)` }}
      >
        <img src={album.image} alt={album.name} className="w-48 h-48 object-cover shadow-2xl rounded" />
        <div className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase text-neutral-200">Плейлист</p>
          <h1 className="text-4xl sm:text-6xl font-black text-white my-2">{album.name}</h1>
          <p className="text-neutral-300 text-sm">{album.desc}</p>
        </div>
      </div>

      {/* керування */}
      <div className="flex items-center gap-6 px-6 py-6">
        <div
          onClick={handlePlayAlbum}
          className="w-14 h-14 rounded-full bg-[#1db954] shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition"
        >
          <img
            src={playStatus && songsData.some((s) => s.id === track.id) ? assets.pause_icon : assets.play_icon}
            alt="Відтворити"
            className="w-6 h-6"
          />
        </div>
        <Button variant="ghost">Ще</Button>
      </div>

      {/* трек-лист */}
      <div className="px-2">
        <SongList songs={songsData} />
      </div>
    </div>
  )
}

export default AlbumPage