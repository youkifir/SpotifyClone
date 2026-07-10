import { albumsData, songsData } from '../assets/assets'
import Card from '../components/Card'
import { usePlayer } from '../context/usePlayer'

function Home() {
  const { track, playStatus, playWithId } = usePlayer()

  return (
    <div className="pt-2 sm:pt-4 flex flex-col gap-6 sm:gap-8">
      <section>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4">Плейлисти для тебе</h2>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-1 px-1">
          {albumsData.map((album) => (
            <Card
              key={album.id}
              to={`/album/${album.id}`}
              image={album.image}
              name={album.name}
              desc={album.desc}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4">Популярні треки</h2>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-1 px-1">
          {songsData.map((song) => (
            <Card
              key={song.id}
              image={song.image}
              name={song.name}
              desc={song.desc}
              onClick={() => playWithId(song.id)}
              isActive={track.id === song.id && playStatus}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home