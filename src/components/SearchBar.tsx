import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlayer } from '../context/usePlayer'
import type { Song } from '../context/PlayerContext'

interface ItunesTrack {
  trackId: number
  trackName: string
  artistName: string
  collectionName: string
  artworkUrl100: string
  previewUrl: string
  trackTimeMillis: number
  primaryGenreName: string
}

function msToDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function itunesToSong(track: ItunesTrack): Song {
  return {
    id: `itunes-${track.trackId}`,
    name: track.trackName,
    artist: track.artistName,
    image: track.artworkUrl100
      ? track.artworkUrl100.replace('100x100bb', '512x512bb')
      : '',
    file: track.previewUrl,
    desc: track.collectionName || track.primaryGenreName || '',
    duration: track.trackTimeMillis ? msToDuration(track.trackTimeMillis) : '0:30',
  }
}

interface SearchBarProps {
  onClose?: () => void
}

export default function SearchBar({ onClose }: SearchBarProps) {
  const { playWithId, addSongs, track, playStatus } = usePlayer()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Дебаунс пошуку — чекаємо 400мс після останнього символу
  const search = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults([])
      setIsOpen(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&media=music&entity=song&limit=8`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Статус ${res.status}`)
      const data = await res.json()

      const songs: Song[] = data.results
        .filter((t: ItunesTrack) => t.previewUrl)
        .map((t: ItunesTrack) => itunesToSong(t))

      setResults(songs)
      setIsOpen(true)

      // Додаємо знайдені треки в глобальний контекст, щоб їх можна було програти
      if (songs.length > 0) addSongs(songs)
    } catch (e) {
      setError('Не вдалося підключитись до iTunes')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [addSongs])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Закриваємо дропдаун при кліку поза компонентом
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handlePlay = (song: Song) => {
    playWithId(song.id)
    setIsOpen(false)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      if (onClose) onClose()
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      {/* Поле вводу */}
      <div className={`flex items-center gap-2 bg-[#1f1f1f] h-11 rounded-full px-4 border transition ${
        isOpen ? 'border-white' : 'border-transparent hover:border-[#3e3e3e]'
      } hover:bg-[#2a2a2a]`}>
        {/* Іконка пошуку / спіннер */}
        <div className="shrink-0 w-5 h-5 flex items-center justify-center">
          {loading ? (
            <svg className="animate-spin text-[#b3b3b3]" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b3b3b3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Що хочеш послухати?"
          className="flex-1 bg-transparent text-sm text-white placeholder-[#b3b3b3] outline-none min-w-0"
        />

        {/* Кнопка очистити */}
        {query && (
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
      </div>

      {/* Дропдаун з результатами */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-[#282828] rounded-xl shadow-2xl border border-[#3e3e3e] overflow-hidden">

          {error ? (
            <div className="px-4 py-3 text-sm text-red-400">{error}</div>
          ) : results.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm text-neutral-400">Нічого не знайдено</div>
          ) : (
            <>
              {/* Заголовок */}
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Результати iTunes
                </span>
                <span className="text-xs text-neutral-500">
                  {results.length} {results.length === 1 ? 'трек' : results.length < 5 ? 'треки' : 'треків'}
                </span>
              </div>

              {/* Список треків */}
              <ul>
                {results.map((song) => {
                  const isActive = track.id === song.id
                  const isPlaying = isActive && playStatus

                  return (
                    <li
                      key={song.id}
                      onClick={() => handlePlay(song)}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer group transition-colors ${
                        isActive ? 'bg-[#1db954]/10' : 'hover:bg-[#333333]'
                      }`}
                    >
                      {/* Обкладинка + play overlay */}
                      <div className="relative shrink-0 w-10 h-10">
                        <img
                          src={song.image}
                          alt={song.name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23333"/></svg>'
                          }}
                        />
                        <div className={`absolute inset-0 rounded flex items-center justify-center bg-black/50 transition-opacity ${
                          isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          {isPlaying ? (
                            // Анімовані хвилі (паузити)
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                              <rect x="3" y="4" width="4" height="16" rx="1"/>
                              <rect x="10" y="4" width="4" height="16" rx="1"/>
                              <rect x="17" y="4" width="4" height="16" rx="1"/>
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                              <polygon points="5,3 19,12 5,21"/>
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Назва + виконавець */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
                          {song.name}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          {song.artist}
                          {song.desc && (
                            <span className="text-neutral-500"> · {song.desc}</span>
                          )}
                        </p>
                      </div>

                      {/* Тривалість */}
                      <span className="text-xs text-neutral-500 shrink-0 tabular-nums">
                        {song.duration}
                      </span>
                    </li>
                  )
                })}
              </ul>

              {/* Підказка — це 30-сек превью */}
              <div className="px-4 py-2 border-t border-[#3e3e3e]">
                <p className="text-[10px] text-neutral-500">
                  30-секундне прев'ю через iTunes · Натисни для відтворення
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}