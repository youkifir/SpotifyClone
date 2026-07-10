import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import SongList from '../components/SongList'
import Button from '../components/Button'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'

interface Album {
  id: string | number
  name: string
  image: string
  desc: string
  bgColor: string
}

function AlbumPage() {
  const { id } = useParams()
  const { track, playStatus, playWithId, play, songsData } = usePlayer()

  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)

  // Загружаем данные альбома с бэкенда
  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        setLoading(true)
        const response = await fetch(`http://localhost:5000/api/albums/${id}`)
        if (response.ok) {
          const resData = await response.json()
          const fetchedAlbum = resData.data || resData

          if (fetchedAlbum) {
            setAlbum({
              ...fetchedAlbum,
              id: fetchedAlbum.id || fetchedAlbum._id
            })
          }
        }
      } catch (error) {
        console.error('Помилка при завантаженні альбому:', error)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchAlbum()
  }, [id])

  if (loading) {
    return <div className="text-white p-6">Завантаження альбому...</div>
  }

  if (!album) {
    return <Navigate to="/" replace />
  }

  // Фильтруем песни, которые принадлежат только этому альбому (если бэк связывает их, например, по albumId или названию альбома)
  // Если у вас песни делятся по альбомам, можно раскомментировать фильтрацию ниже. Пока оставляем весь songsData, как было в оригинале.
  const albumSongs = songsData // или songsData.filter(s => s.albumId === id || s.album === album.name)

  const handlePlayAlbum = () => {
    if (albumSongs.length === 0) return
    const isCurrentSongInAlbum = albumSongs.some((s) => s.id === track.id)
    if (isCurrentSongInAlbum) {
      play()
    } else {
      playWithId(albumSongs[0].id)
    }
  }

  const albumImageUrl = album.image.startsWith('http') ? album.image : `http://localhost:5000/${album.image}`

  return (
    <div className="pt-2 sm:pt-4">
      {/* шапка альбому */}
      <div
        className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 p-4 sm:p-6 rounded-lg"
        style={{ background: `linear-gradient(180deg, ${album.bgColor || '#535353'}, #121212)` }}
      >
        <img
          src={albumImageUrl}
          alt={album.name}
          className="w-36 h-36 sm:w-48 sm:h-48 object-cover shadow-2xl rounded shrink-0"
        />
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
            src={playStatus && albumSongs.some((s) => s.id === track.id) ? assets.pause_icon : assets.play_icon}
            alt="Відтворити"
            className="w-5 h-5 sm:w-6 sm:h-6"
          />
        </div>
        <Button variant="ghost">Ще</Button>
      </div>

      {/* трек-лист */}
      <div className="px-1 sm:px-2">
        <SongList songs={albumSongs} />
      </div>
    </div>
  )
}

export default AlbumPage