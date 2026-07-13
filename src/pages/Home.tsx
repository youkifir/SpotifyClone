import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getRecentlyPlayed, type RecentlyPlayedItem } from '../hooks/useRecentlyPlayed'
import { useAuth } from '../context/AuthContext'
import Card from '../components/Card'
import { usePlayer } from '../context/usePlayer'
import { useLanguage } from '../context/LanguageContext'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:5000'

// Функція для безпечного визначення шляху до зображення (захищає від помилки 431)
const getSafeImgSrc = (imgStr: string | undefined | null): string => {
  if (!imgStr) return ''
  // Якщо це пряме посилання або Base64 рядок, повертаємо його без змін
  if (imgStr.startsWith('http') || imgStr.startsWith('data:')) {
    return imgStr
  }
  // Якщо це звичайний локальний шлях, додаємо URL бекенду
  return `${API}/${imgStr}`
}

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
  const imgSrc = getSafeImgSrc(artist.image)

  return (
    <div
      onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
      className="w-36 sm:w-44 shrink-0 snap-start rounded-lg p-3 sm:p-4 cursor-pointer group"
    >
      <div className="relative mx-auto w-full aspect-square rounded-full overflow-hidden shadow-lg mb-3 sm:mb-4">
        <img
          src={imgSrc}
          alt={artist.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=1db954&color=000&size=200&bold=true`
          }}
        />
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

function RecentlyPlayedTile({ item }: { item: RecentlyPlayedItem }) {
  const { t } = useLanguage()
  const to = item.type === 'album' ? `/album/${item.id}` : `/playlist/${item.id}`
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=282828&color=fff`
  const imgSrc = item.image ? getSafeImgSrc(item.image) : fallbackAvatar

  return (
    <Link
      to={to}
      className="flex items-center gap-3 sm:gap-4 bg-[#2a2a2a]/60 hover:bg-[#3a3a3a] transition-colors rounded-md overflow-hidden group min-w-0"
    >
      {item.isLikedSongs ? (
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4b2f8a 0%, #1d89e4 100%)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      ) : (
        <img
          src={imgSrc}
          alt={item.name}
          className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackAvatar
          }}
        />
      )}
      <p className="text-sm sm:text-base font-semibold text-white truncate pr-3">
        {item.isLikedSongs ? t('likedSongsLabel') : item.name}
      </p>
    </Link>
  )
}

function Home() {
  const { track, playStatus, playWithId, songsData } = usePlayer()
  const { t } = useLanguage()
  const [albumsData, setAlbumsData] = useState<any[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [shuffledSongs, setShuffledSongs] = useState<any[]>([])

  const fetchAlbums = useCallback(async () => {
    setAlbumsLoading(true)
    setAlbumsError(null)
    try {
      const r = await apiFetch(`${API}/api/albums`)
      const res = await r.json()
      const albums = Array.isArray(res) ? res : (res.data || [])
      setAlbumsData(albums.map((a: any) => ({ ...a, id: a.id || a._id })))
    } catch (err) {
      // Додано 'as any' для усунення помилок суворої типізації i18n
      setAlbumsError(isOfflineError(err) ? t('errorNetwork' as any) : t('errorLoadAlbums' as any))
    } finally {
      setAlbumsLoading(false)
    }
  }, [t])

  const fetchArtists = useCallback(async () => {
    setArtistsLoading(true)
    setArtistsError(null)
    try {
      const r = await apiFetch(`${API}/api/songs/top-artists?limit=20`)
      const res = await r.json()
      setArtists(res.data || [])
    } catch (err) {
      // Додано 'as any' для усунення помилок суворої типізації i18n
      setArtistsError(isOfflineError(err) ? t('errorNetwork' as any) : t('errorGeneric' as any))
    } finally {
      setArtistsLoading(false)
    }
  }, [t])

  useEffect(() => { fetchAlbums() }, [fetchAlbums])
  useEffect(() => { fetchArtists() }, [fetchArtists])

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

      <ScrollSection
        title={t('playlists')}
        isEmpty={albumsData.length === 0}
        emptyText={t('noAvailablePlaylists')}
        isLoading={albumsLoading}
        error={albumsError}
        onRetry={fetchAlbums}
      >
        {albumsData.map((album) => (
          <Card
            key={album.id}
            to={`/album/${album.id}`}
            image={getSafeImgSrc(album.image)}
            name={album.name}
            desc={album.desc}
          />
        ))}
      </ScrollSection>

      <ScrollSection
        title={t('popularTracks')}
        isEmpty={shuffledSongs.length === 0}
        emptyText={t('noAvailableTracks')}
        isLoading={songsLoading}
        error={songsError ? (songsError === 'network' ? t('errorNetwork' as any) : t('errorLoadSongs' as any)) : null}
      >
        {shuffledSongs.map((song, i) => (
          <Card
            key={`${song.id}-${i}`}
            image={getSafeImgSrc(song.image)}
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