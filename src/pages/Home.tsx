import { useEffect, useState } from 'react'
import Card from '../components/Card'
import { usePlayer } from '../context/usePlayer'

function Home() {
  const { track, playStatus, playWithId, songsData } = usePlayer()
  const [albumsData, setAlbumsData] = useState<any[]>([])

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/albums')
        if (response.ok) {
          const resData = await response.json()
          const fetchedAlbums = Array.isArray(resData) ? resData : (resData.data || [])

          const normalizedAlbums = fetchedAlbums.map((album: any) => ({
            ...album,
            id: album.id || album._id
          }))
          setAlbumsData(normalizedAlbums)
        }
      } catch (error) {
        console.error('Помилка при завантаженні альбомів:', error)
      }
    }

    fetchAlbums()
  }, [])

  const popularSongs = songsData.slice(0, 6)

  return (
    <div className="pt-2 sm:pt-4 flex flex-col gap-6 sm:gap-8">
      <section>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4">Плейлисти для тебе</h2>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-1 px-1">
          {albumsData.length === 0 ? (
            <p className="text-zinc-400 text-sm pl-1">Немає доступних плейлистів</p>
          ) : (
            albumsData.map((album) => (
              <Card
                key={album.id}
                to={`/album/${album.id}`}
                image={album.image.startsWith('http') ? album.image : `http://localhost:5000/${album.image}`}
                name={album.name}
                desc={album.desc}
              />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4">Популярні треки</h2>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-1 px-1">
          {popularSongs.length === 0 ? (
            <p className="text-zinc-400 text-sm pl-1">Немає доступних треків</p>
          ) : (
            popularSongs.map((song) => (
              <Card
                key={song.id}
                image={song.image.startsWith('http') ? song.image : `http://localhost:5000/${song.image}`}
                name={song.name}
                desc={song.desc}
                onClick={() => playWithId(song.id)}
                isActive={track && track.id === song.id && playStatus}
                songId={song.id}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default Home