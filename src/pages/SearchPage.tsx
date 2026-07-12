import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/usePlayer'
import { useLike } from '../hooks/Uselike'
import type { Song } from '../context/PlayerContext'

const API = 'http://localhost:5000'

interface ApiSong {
  _id: string
  name: string
  artist?: string
  image: string
  file: string
  desc?: string
  duration: string
  album?: string
  genre?: string
}

interface ApiAlbum {
  _id: string
  name: string
  image: string
  desc?: string
}

interface SearchResults {
  songs: Song[]
  topArtists: string[]
  albums: ApiAlbum[]
  rawSongs: ApiSong[]
}

function apiSongToSong(s: ApiSong): Song {
  return {
    id: s._id,
    name: s.name,
    artist: s.artist || '',
    image: s.image?.startsWith('http') ? s.image : `${API}/${s.image}`,
    file: s.file?.startsWith('http') ? s.file : `${API}/${s.file}`,
    desc: s.desc || '',
    duration: s.duration || '0:00',
  }
}

// ──────────────────────────────────────────────
//  Мала картка — трек у сітці
// ──────────────────────────────────────────────
function SongCard({
  song,
  isActive,
  isPlaying,
  isLiked,
  onPlay,
  onLike,
}: {
  song: Song
  isActive: boolean
  isPlaying: boolean
  isLiked: boolean
  onPlay: () => void
  onLike: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onPlay}
      className={`group relative flex flex-col rounded-xl p-3 cursor-pointer transition-all duration-200 ${
        isActive ? 'bg-[#1db954]/10 ring-1 ring-[#1db954]/30' : 'bg-[#181818] hover:bg-[#282828]'
      }`}
    >
      {/* Cover */}
      <div className="relative w-full aspect-square mb-3 rounded-lg overflow-hidden shadow-lg">
        <img
          src={song.image}
          alt={song.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23333"/><text x="50" y="55" fill="%23666" font-size="28" text-anchor="middle">♪</text></svg>'
          }}
        />
        {/* Play overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
            isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-11 h-11 rounded-full bg-[#1db954] shadow-xl flex items-center justify-center translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <rect x="3" y="4" width="4" height="16" rx="1" />
                <rect x="10" y="4" width="4" height="16" rx="1" />
                <rect x="17" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </div>
        </div>

        {/* Like button */}
        <button
          onClick={onLike}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center transition-all duration-150 ${
            isLiked
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-80 hover:opacity-100!'
          } hover:scale-110`}
          aria-label={isLiked ? 'Прибрати з улюблених' : 'Додати до улюблених'}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill={isLiked ? '#1db954' : 'none'}
            stroke={isLiked ? '#1db954' : '#fff'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <p className={`text-sm font-semibold truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
        {song.name}
      </p>
      <p className="text-xs text-neutral-400 truncate mt-0.5">{song.artist}</p>
      <span className="text-[10px] text-neutral-500 mt-1 tabular-nums">{song.duration}</span>
    </div>
  )
}

// ──────────────────────────────────────────────
//  Рядок треку — компактний вигляд для списку
// ──────────────────────────────────────────────
function SongRow({
  song,
  index,
  isActive,
  isPlaying,
  isLiked,
  onPlay,
  onLike,
}: {
  song: Song
  index: number
  isActive: boolean
  isPlaying: boolean
  isLiked: boolean
  onPlay: () => void
  onLike: (e: React.MouseEvent) => void
}) {
  return (
    <li
      onClick={onPlay}
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-[#1db954]/10' : 'hover:bg-[#282828]'
      }`}
    >
      {/* Index / play icon */}
      <div className="w-7 text-center shrink-0">
        <span className={`text-sm tabular-nums group-hover:hidden ${isActive ? 'hidden' : 'block text-neutral-400'}`}>
          {index + 1}
        </span>
        {isPlaying ? (
          <svg className="mx-auto group-hover:block hidden" width="13" height="13" viewBox="0 0 24 24" fill="#1db954">
            <rect x="3" y="4" width="4" height="16" rx="1" />
            <rect x="10" y="4" width="4" height="16" rx="1" />
            <rect x="17" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="mx-auto group-hover:block hidden" width="12" height="12" viewBox="0 0 24 24" fill="white">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
        {isActive && !isPlaying && (
          <svg className="mx-auto block group-hover:hidden" width="13" height="13" viewBox="0 0 24 24" fill="#1db954">
            <rect x="3" y="4" width="4" height="16" rx="1" />
            <rect x="10" y="4" width="4" height="16" rx="1" />
          </svg>
        )}
      </div>

      {/* Cover */}
      <img
        src={song.image}
        alt={song.name}
        className="w-10 h-10 rounded object-cover shrink-0"
        onError={(e) => {
          ;(e.target as HTMLImageElement).src =
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23333"/></svg>'
        }}
      />

      {/* Title / artist */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
          {song.name}
        </p>
        <p className="text-xs text-neutral-400 truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      <span className="text-xs text-neutral-500 tabular-nums shrink-0 hidden sm:block">
        {song.duration}
      </span>

      {/* Like button */}
      <button
        onClick={onLike}
        className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-all ${
          isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:opacity-100!'
        } hover:scale-110`}
        aria-label={isLiked ? 'Прибрати з улюблених' : 'Додати до улюблених'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={isLiked ? '#1db954' : 'none'}
          stroke={isLiked ? '#1db954' : '#b3b3b3'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </li>
  )
}

// ──────────────────────────────────────────────
//  Картка артиста
// ──────────────────────────────────────────────
function ArtistCard({ name, onClick }: { name: string; onClick: () => void }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Deterministic hue from artist name
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  return (
    <div
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-[#282828] transition-colors text-center"
    >
      <div
        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg transition-transform duration-200 group-hover:scale-105"
        style={{ background: `hsl(${hue},55%,30%)` }}
      >
        {initials}
      </div>
      <div>
        <p className="text-sm font-semibold text-white truncate max-w-24">{name}</p>
        <p className="text-xs text-neutral-400">Виконавець</p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
//  Skeleton loader
// ──────────────────────────────────────────────
function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#181818] rounded-xl p-3 animate-pulse">
          <div className="w-full aspect-square rounded-lg bg-[#2a2a2a] mb-3" />
          <div className="h-3 w-3/4 bg-[#2a2a2a] rounded mb-2" />
          <div className="h-2.5 w-1/2 bg-[#2a2a2a] rounded" />
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
//  ViewToggle
// ──────────────────────────────────────────────
type ViewMode = 'grid' | 'list'

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
      <button
        onClick={() => onChange('grid')}
        className={`p-1.5 rounded transition-colors ${
          mode === 'grid' ? 'bg-[#282828] text-white' : 'text-neutral-500 hover:text-neutral-300'
        }`}
        title="Сітка"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect x="0" y="0" width="6" height="6" rx="1" />
          <rect x="10" y="0" width="6" height="6" rx="1" />
          <rect x="0" y="10" width="6" height="6" rx="1" />
          <rect x="10" y="10" width="6" height="6" rx="1" />
        </svg>
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-1.5 rounded transition-colors ${
          mode === 'list' ? 'bg-[#282828] text-white' : 'text-neutral-500 hover:text-neutral-300'
        }`}
        title="Список"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect x="0" y="1" width="16" height="2.5" rx="1" />
          <rect x="0" y="6.75" width="16" height="2.5" rx="1" />
          <rect x="0" y="12.5" width="16" height="2.5" rx="1" />
        </svg>
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────
//  Головна сторінка пошуку
// ──────────────────────────────────────────────
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const query = searchParams.get('q') || ''
  const [inputValue, setInputValue] = useState(query)
  const [results, setResults] = useState<SearchResults>({
    songs: [],
    topArtists: [],
    albums: [],
    rawSongs: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [animatingId, setAnimatingId] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { playWithId, addSongs, track, playStatus } = usePlayer()
  const { isLiked, toggleLike } = useLike()

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Sync input when URL query changes
  useEffect(() => {
    setInputValue(query)
  }, [query])

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults({ songs: [], topArtists: [], albums: [], rawSongs: [] })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API}/api/songs/search?q=${encodeURIComponent(trimmed)}`)
      if (!res.ok) throw new Error(`Статус ${res.status}`)
      const data = await res.json()

      const rawSongs: ApiSong[] = data.data?.songs || data.data || []
      const songs: Song[] = rawSongs.map(apiSongToSong)

      // Unique artists from results
      const artistSet = new Set<string>()
      rawSongs.forEach((s) => {
        if (s.artist) artistSet.add(s.artist)
      })
      const topArtists = Array.from(artistSet).slice(0, 6)

      // Albums if backend provides them (future-proofing)
      const albums: ApiAlbum[] = data.data?.albums || []

      setResults({ songs, topArtists, albums, rawSongs })
      if (songs.length > 0) addSongs(songs)
    } catch {
      setError('Не вдалося виконати пошук. Перевір з\'єднання з сервером.')
      setResults({ songs: [], topArtists: [], albums: [], rawSongs: [] })
    } finally {
      setLoading(false)
    }
  }, [addSongs])

  // Debounce search when query param changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (val.trim()) {
        setSearchParams({ q: val.trim() }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    }, 300)
  }

  const handleClear = () => {
    setInputValue('')
    setSearchParams({}, { replace: true })
    inputRef.current?.focus()
  }

  const handlePlay = (song: Song) => {
    playWithId(song.id)
  }

  const handleLike = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation()
    toggleLike(songId)
    setAnimatingId(songId)
    setTimeout(() => setAnimatingId(null), 400)
  }

  const hasSongs = results.songs.length > 0
  const hasArtists = results.topArtists.length > 0
  const hasResults = hasSongs || hasArtists || results.albums.length > 0
  const searched = query.trim().length > 0

  return (
    <div className="min-h-full">
      {/* ── Пошуковий рядок ── */}
      <div className="sticky top-0 z-20 bg-[#121212]/90 backdrop-blur-md pt-1 pb-3">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="shrink-0 w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#282828] transition-colors"
            aria-label="Назад"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Search input */}
          <div className="flex-1 flex items-center gap-2 bg-[#1f1f1f] h-11 rounded-full px-4 border border-[#3e3e3e] focus-within:border-white hover:bg-[#2a2a2a] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b3b3b3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Що хочеш послухати?"
              className="flex-1 bg-transparent text-sm text-white placeholder-[#b3b3b3] outline-none min-w-0"
              autoComplete="off"
            />
            {inputValue && (
              <button
                onClick={handleClear}
                className="shrink-0 text-[#b3b3b3] hover:text-white transition"
                aria-label="Очистити"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            {loading && (
              <svg className="animate-spin shrink-0 text-[#b3b3b3]" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* ── Тіло сторінки ── */}
      <div className="mt-2">

        {/* Порожній стан — нічого не введено */}
        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b3b3b3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Пошук музики</h2>
            <p className="text-neutral-400 text-sm max-w-xs">
              Введи назву треку, ім'я виконавця або альбому
            </p>
          </div>
        )}

        {/* Завантаження */}
        {loading && searched && (
          <div className="mt-4">
            <div className="h-4 w-32 bg-[#2a2a2a] rounded animate-pulse mb-5" />
            <SkeletonGrid count={8} />
          </div>
        )}

        {/* Помилка */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">Помилка пошуку</p>
            <p className="text-neutral-400 text-sm">{error}</p>
            <button
              onClick={() => doSearch(query)}
              className="mt-4 px-5 py-2 bg-[#1db954] text-black text-sm font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
            >
              Спробувати ще раз
            </button>
          </div>
        )}

        {/* Немає результатів */}
        {searched && !loading && !error && !hasResults && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b3b3b3" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Нічого не знайдено</h2>
            <p className="text-neutral-400 text-sm max-w-xs">
              За запитом <span className="text-white font-medium">«{query}»</span> нічого не знайдено.
              Спробуй іншу назву або виконавця.
            </p>
          </div>
        )}

        {/* ── Результати ── */}
        {searched && !loading && !error && hasResults && (
          <div className="space-y-8">

            {/* ── Виконавці ── */}
            {hasArtists && (
              <section>
                <h2 className="text-lg font-bold text-white mb-4">Виконавці</h2>
                <div className="flex flex-wrap gap-1">
                  {results.topArtists.map((name) => (
                    <ArtistCard
                      key={name}
                      name={name}
                      onClick={() => navigate(`/artist/${encodeURIComponent(name)}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Треки ── */}
            {hasSongs && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Треки</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {results.songs.length} {results.songs.length === 1 ? 'результат' : results.songs.length < 5 ? 'результати' : 'результатів'}
                    </p>
                  </div>
                  <ViewToggle mode={viewMode} onChange={setViewMode} />
                </div>

                {/* Кнопка відтворити всі */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => handlePlay(results.songs[0])}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1db954] text-black text-sm font-bold rounded-full hover:bg-[#1ed760] hover:scale-105 transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    Відтворити
                  </button>
                  <button
                    onClick={() => {
                      if (results.songs.length > 0) {
                        const shuffled = [...results.songs].sort(() => Math.random() - 0.5)
                        addSongs(shuffled)
                        handlePlay(shuffled[0])
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-[#3e3e3e] text-neutral-300 text-sm font-semibold rounded-full hover:border-white hover:text-white transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 3 21 3 21 8" />
                      <line x1="4" y1="20" x2="21" y2="3" />
                      <polyline points="21 16 21 21 16 21" />
                      <line x1="15" y1="15" x2="21" y2="21" />
                    </svg>
                    Перемішати
                  </button>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {results.songs.map((song) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        isActive={track.id === song.id}
                        isPlaying={track.id === song.id && playStatus}
                        isLiked={isLiked(String(song.id))}
                        onPlay={() => handlePlay(song)}
                        onLike={(e) => handleLike(e, String(song.id))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#181818] rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-[28px_40px_1fr_auto_32px] sm:grid-cols-[28px_40px_1fr_80px_32px] gap-3 px-3 py-2.5 border-b border-[#2a2a2a]">
                      <span className="text-[11px] text-neutral-500 text-center">#</span>
                      <span />
                      <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Назва</span>
                      <span className="text-[11px] text-neutral-500 uppercase tracking-wider hidden sm:block text-right">Тривалість</span>
                      <span />
                    </div>
                    <ul className="divide-y divide-[#1e1e1e]">
                      {results.songs.map((song, i) => (
                        <SongRow
                          key={song.id}
                          song={song}
                          index={i}
                          isActive={track.id === song.id}
                          isPlaying={track.id === song.id && playStatus}
                          isLiked={isLiked(String(song.id))}
                          onPlay={() => handlePlay(song)}
                          onLike={(e) => handleLike(e, String(song.id))}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}