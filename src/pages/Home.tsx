import { useEffect, useState } from 'react'
import Card from '../components/Card'
import { usePlayer } from '../context/usePlayer'

function useVisibleCount() {
  const getCount = () => {
    const w = window.innerWidth
    if (w >= 1800) return 8
    if (w >= 1400) return 7
    if (w >= 1200) return 6
    if (w >= 1024) return 5
    if (w >= 768)  return 4
    if (w >= 500)  return 3
    return 2
  }

  const [count, setCount] = useState(getCount)

  useEffect(() => {
    const handleResize = () => setCount(getCount())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return count
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function Home() {
  const { track, playStatus, playWithId, songsData } = usePlayer()
  const [albumsData, setAlbumsData] = useState<any[]>([])
  const visibleCount = useVisibleCount()
  const [shuffledSongs, setShuffledSongs] = useState<any[]>([])

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

  // Перемішати один раз при завантаженні даних
  useEffect(() => {
    if (songsData.length === 0) return
    setShuffledSongs(shuffle(songsData))
  }, [songsData.length])

  const popularSongs = shuffledSongs.slice(0, visibleCount)

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
        {popularSongs.length === 0 ? (
          <p className="text-zinc-400 text-sm pl-1">Немає доступних треків</p>
        ) : (
          <div
            className="grid gap-3 sm:gap-4"
            style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}
          >
            {popularSongs.map((song, i) => (
              <Card
                key={`${song.id}-${i}`}
                fluid
                image={song.image.startsWith('http') ? song.image : `http://localhost:5000/${song.image}`}
                name={song.name}
                desc={song.desc}
                onClick={() => playWithId(song.id)}
                isActive={track && track.id === song.id && playStatus}
                songId={song.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Home