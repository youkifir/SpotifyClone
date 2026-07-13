import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getRecentlyPlayed, type RecentlyPlayedItem } from '../hooks/useRecentlyPlayed'
import { useAuth } from '../context/AuthContext'
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
  const { t } = useLanguage()
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
      <p className="text-xs text-neutral-400 mt-0.5 text-center">{t('artistLabel2')}</p>
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

  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [recentItems, setRecentItems] = useState<RecentlyPlayedItem[]>([])
  const [recommendedPlaylists, setRecommendedPlaylists] = useState<any[]>([])
  const [recLoading, setRecLoading] = useState(false)
  // savedIds: зберігаємо id вже збережених плейлистів щоб не дублювати при повторному кліці
  const [savedIds, setSavedIds] = useState<Map<number, string>>(new Map())
  const [openingIdx, setOpeningIdx] = useState<number | null>(null)

  // Оновлюємо список при кожному відкритті головної
  useEffect(() => {
    const items = getRecentlyPlayed(user?.id).slice(0, 8)
    setRecentItems(items)
  }, [user?.id])

  // Рекомендовані плейлисти на основі listenHistory
  useEffect(() => {
    if (!token) return
    setRecLoading(true)
    fetch(`${API}/api/playlists/recommended`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => { if (res.success) setRecommendedPlaylists(res.data || []) })
      .catch(() => {})
      .finally(() => setRecLoading(false))
  }, [token])

  // При кліку — відкриваємо без збереження в БД, передаємо треки через router state
  const handleOpenRec = (pl: any) => {
    navigate('/playlist/preview', { state: { preview: pl } })
  }


  return (
    <div className="pt-2 sm:pt-4 flex flex-col gap-6 sm:gap-8">

{/* ── Нещодавно відкриті ── */}
      {recentItems.length > 0 && (
        <section>
          <h2 className="text-white font-bold text-xl mb-4">{t('recentlyPlayed')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                to={item.type === 'playlist' ? `/playlist/${item.id}` : item.type === 'album' ? `/album/${item.id}` : `/artist/${encodeURIComponent(item.name)}`}
                className="flex items-center gap-3 bg-[#ffffff14] hover:bg-[#ffffff26] rounded-md overflow-hidden transition-colors group cursor-pointer h-16"
              >
                {/* Обкладинка */}
                {item.isLikedSongs ? (
                  <div className="w-16 h-16 shrink-0 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #4b2f8a 0%, #1d89e4 100%)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                ) : item.image ? (
                  <img src={item.image} alt={item.name}
                    className="w-16 h-16 object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 shrink-0 bg-[#282828] flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#b3b3b3">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>
                )}
                <span className="text-white text-sm font-semibold truncate pr-3 group-hover:text-white leading-tight">
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {token && (
        <section>
          <h2 className="text-white font-bold text-xl mb-4">Плейлисти для тебе</h2>
          {recLoading ? (
            <div className="flex gap-3">
              {[1,2,3].map(i => (
                <div key={i} className="w-44 sm:w-52 shrink-0 rounded-xl bg-[#181818] p-3 animate-pulse">
                  <div className="w-full aspect-square rounded-lg bg-[#282828] mb-3" />
                  <div className="h-3 bg-[#282828] rounded mb-2 w-3/4" /><div className="h-2 bg-[#282828] rounded w-full" />
                </div>
              ))}
            </div>
          ) : recommendedPlaylists.length > 0 ? (
            <div className="flex gap-3 sm:gap-5 overflow-x-auto no-scrollbar pb-2">
              {recommendedPlaylists.map((pl, i) => {
                const covers = (pl.songs || []).slice(0, 4)
                const isOpening = false
                return (
                  <div
                    key={i}
                    onClick={() => handleOpenRec(pl)}
                    className="w-44 sm:w-52 shrink-0 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors p-3 group cursor-pointer select-none"
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-3 shadow-lg">
                      {covers.length >= 4 ? (
                        <div className="grid grid-cols-2 w-full h-full">
                          {covers.map((s: any, ci: number) => (
                            <img key={ci} src={s.image?.startsWith('http') ? s.image : `${API}/${s.image}`} alt={s.name} className="w-full h-full object-cover" onError={(e)=>{(e.target as HTMLImageElement).src='https://via.placeholder.com/80?text=music'}} />
                          ))}
                        </div>
                      ) : covers.length > 0 ? (
                        <img src={covers[0].image?.startsWith('http') ? covers[0].image : `${API}/${covers[0].image}`} alt={covers[0].name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="#b3b3b3"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        </div>
                      )}
                      {/* Play-кнопка при hover */}
                      <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                        {isOpening ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" className="animate-spin"><circle cx="12" cy="12" r="9" strokeDasharray="56" strokeDashoffset="20"/></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </div>
                    </div>
                    <p className="text-white text-sm font-semibold truncate">{pl.name}</p>
                    <p className="text-neutral-400 text-xs mt-0.5 line-clamp-2">{pl.description || `${pl.songs?.length || 0} треків`}</p>
                    {pl.genre && <span className="inline-block mt-1.5 text-xs bg-white/10 text-neutral-400 px-2 py-0.5 rounded-full">{pl.genre}</span>}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-zinc-400 text-sm pl-1">Послухай кілька треків — і ми підберемо плейлисти спеціально для тебе</p>
          )}
        </section>
      )}


      <ScrollSection title={t('popularTracks')} isEmpty={shuffledSongs.length === 0} emptyText={t('noAvailableTracks')}>
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

      <ScrollSection title={t('popularArtists')} isEmpty={artists.length === 0} emptyText={t('noArtists')}>
        {artists.map((artist) => (
          <ArtistCard key={artist.name} artist={artist} />
        ))}
      </ScrollSection>

    </div>
  )
}

export default Home