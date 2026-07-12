import { useEffect, useState, useRef, useCallback } from 'react'
import Card from '../components/Card'
import { usePlayer } from '../context/usePlayer'
import { useLanguage } from '../context/LanguageContext'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:5000'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function ScrollSection({ title, children, isEmpty, emptyText }: {
  title: string
  children: React.ReactNode
  isEmpty: boolean
  emptyText: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect() }
  }, [checkScroll, children])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -el.clientWidth * 0.75 : el.clientWidth * 0.75, behavior: 'smooth' })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{title}</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            disabled={!canLeft}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
              ${canLeft ? 'bg-[#3e3e3e] hover:bg-[#4e4e4e] hover:scale-105 text-white cursor-pointer shadow-md' : 'bg-[#1a1a1a] text-neutral-700 cursor-default opacity-50'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canRight}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
              ${canRight ? 'bg-[#3e3e3e] hover:bg-[#4e4e4e] hover:scale-105 text-white cursor-pointer shadow-md' : 'bg-[#1a1a1a] text-neutral-700 cursor-default opacity-50'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-zinc-400 text-sm pl-1">{emptyText}</p>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {children}
        </div>
      )}
    </section>
  )
}

interface Artist {
  name: string
  songCount: number
  totalPlays: number
  image: string
}

function ArtistCard({ artist }: { artist: Artist }) {
  const navigate = useNavigate()
  const imgSrc = artist.image?.startsWith('http') ? artist.image : `${API}/${artist.image}`

  return (
    <div
      onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
      className="w-36 sm:w-44 shrink-0 snap-start rounded-lg p-3 sm:p-4 cursor-pointer group"
    >
      {/* Кругла аватарка */}
      <div className="relative mx-auto w-full aspect-square rounded-full overflow-hidden shadow-lg mb-3 sm:mb-4">
        <img
          src={imgSrc}
          alt={artist.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=1db954&color=000&size=200&bold=true`
          }}
        />
        {/* Play overlay */}
        <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-10 h-10 rounded-full bg-[#1db954] shadow-lg flex items-center justify-center translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="black">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
        </div>
      </div>

      <p className="text-sm font-semibold text-white truncate text-center">{artist.name}</p>
      <p className="text-xs text-neutral-400 mt-0.5 text-center">Виконавець</p>
    </div>
  )
}

function Home() {
  const { track, playStatus, playWithId, songsData } = usePlayer()
  const { t } = useLanguage()
  const [albumsData, setAlbumsData] = useState<any[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [shuffledSongs, setShuffledSongs] = useState<any[]>([])

  useEffect(() => {
    fetch(`${API}/api/albums`)
      .then(r => r.json())
      .then(res => {
        const albums = Array.isArray(res) ? res : (res.data || [])
        setAlbumsData(albums.map((a: any) => ({ ...a, id: a.id || a._id })))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`${API}/api/songs/top-artists?limit=20`)
      .then(r => r.json())
      .then(res => setArtists(res.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (songsData.length === 0) return
    setShuffledSongs(shuffle(songsData))
  }, [songsData.length])

  return (
    <div className="pt-2 sm:pt-4 flex flex-col gap-6 sm:gap-8">

      <ScrollSection title={t('playlists')} isEmpty={albumsData.length === 0} emptyText="Немає доступних плейлистів">
        {albumsData.map((album) => (
          <Card
            key={album.id}
            to={`/album/${album.id}`}
            image={album.image.startsWith('http') ? album.image : `${API}/${album.image}`}
            name={album.name}
            desc={album.desc}
          />
        ))}
      </ScrollSection>

      <ScrollSection title={t('popularTracks')} isEmpty={shuffledSongs.length === 0} emptyText="Немає доступних треків">
        {shuffledSongs.map((song, i) => (
          <Card
            key={`${song.id}-${i}`}
            image={song.image.startsWith('http') ? song.image : `${API}/${song.image}`}
            name={song.name}
            desc={song.desc}
            onClick={() => playWithId(song.id)}
            isActive={track && track.id === song.id && playStatus}
            songId={song.id}
          />
        ))}
      </ScrollSection>

      <ScrollSection title="Популярні виконавці" isEmpty={artists.length === 0} emptyText="Немає виконавців">
        {artists.map((artist) => (
          <ArtistCard key={artist.name} artist={artist} />
        ))}
      </ScrollSection>

    </div>
  )
}

export default Home