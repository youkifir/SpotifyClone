import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/usePlayer'
import { useAuth } from '../context/AuthContext'
import { assets } from '../assets/assets'

interface ArtistSong {
  id: string
  name: string
  image: string
  duration: string
  desc: string
  artist: string
  file: string
  genre?: string
  source?: string
}

interface ArtistInfo {
  name: string
  image?: string
  bio?: string
  genres?: string[]
  monthlyListeners?: number
  country?: string
  formedYear?: number
}

function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0
  const parts = duration.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

function ArtistPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { playWithId, addSongs, track, playStatus, play, pause } = usePlayer()
  const { token } = useAuth()

  const [songs, setSongs] = useState<ArtistSong[]>([])
  const [artistInfo, setArtistInfo] = useState<ArtistInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showFullBio, setShowFullBio] = useState(false)
  const [activeTab, setActiveTab] = useState<'tracks' | 'about'>('tracks')

  const artistName = decodeURIComponent(name || '')

  useEffect(() => {
    if (!artistName) return
    setLoading(true)
    setError('')

    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

    fetch(`http://localhost:5000/api/songs/artist/${encodeURIComponent(artistName)}`, { headers })
      .then(async (r) => {
        const text = await r.text()
        try { return JSON.parse(text) }
        catch { throw new Error(`Server error ${r.status}: ${text.slice(0, 100)}`) }
      })
      .then((res) => {
        if (!res.success) throw new Error(res.message || 'Помилка сервера')
        const data = res.data

        // Збираємо інфо про виконавця з відповіді + генеруємо доп. поля
        const image = data.image || ''
        const rawSongs: ArtistSong[] = (data.songs || []).map((s: any) => ({
          ...s,
          id: s.id ?? s._id,
        }))

        setSongs(rawSongs)
        addSongs(rawSongs)

        // Genres — збираємо унікальні жанри з пісень
        const genres = [...new Set(rawSongs.map((s) => s.genre).filter(Boolean))] as string[]

        setArtistInfo({
          name: artistName,
          image,
          bio: data.bio || data.description || null,
          genres,
          monthlyListeners: data.monthlyListeners || null,
          country: data.country || null,
          formedYear: data.formedYear || null,
        })
      })
      .catch((e) => {
        console.error('ArtistPage fetch error:', e)
        setError('Не вдалося завантажити дані виконавця')
      })
      .finally(() => setLoading(false))
  }, [artistName, token])

  const resolveUrl = (url: string) =>
    url?.startsWith('http') ? url : `http://localhost:5000/${url}`

  const isAnyActive = songs.some((s) => s.id === track?.id)

  const handlePlayAll = () => {
    if (songs.length === 0) return
    if (isAnyActive) {
      playStatus ? pause() : play()
    } else {
      playWithId(songs[0].id)
    }
  }

  const totalSeconds = useMemo(
    () => songs.reduce((acc, s) => acc + parseDurationToSeconds(s.duration), 0),
    [songs]
  )

  const heroCover = artistInfo?.image ? resolveUrl(artistInfo.image) : null

  // Топ-5 треків (за назвою; якщо бек поверне порядок — береться перші 5)
  const topTracks = songs.slice(0, 5)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-10 h-10 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-400 text-sm">Завантаження виконавця...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-neutral-400 hover:text-white transition underline">
          ← Назад
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Hero banner ── */}
      <div
        className="relative flex items-end gap-6 p-6 sm:p-8 rounded-lg overflow-hidden mb-2"
        style={{ minHeight: 240, background: 'linear-gradient(180deg, #2a2a2a 0%, #121212 100%)' }}
      >
        {/* ← Back button top-left */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 text-sm text-white/70 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full transition"
        >
          ← Назад
        </button>
        {heroCover && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 blur-xl scale-110"
            style={{ backgroundImage: `url(${heroCover})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent" />

        {/* Аватар */}
        <div className="relative z-10 w-32 h-32 sm:w-44 sm:h-44 rounded-full overflow-hidden shadow-2xl border-2 border-white/10 shrink-0">
          {heroCover ? (
            <img src={heroCover} alt={artistName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#333] flex items-center justify-center">
              <span className="text-5xl">🎤</span>
            </div>
          )}
        </div>

        {/* Інфо */}
        <div className="relative z-10 flex flex-col gap-1 min-w-0 pb-1">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">Виконавець</span>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-none">{artistName}</h1>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-neutral-400">
            {artistInfo?.country && (
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">{artistInfo.country}</span>
            )}
            {artistInfo?.formedYear && (
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">з {artistInfo.formedYear}</span>
            )}
            {(artistInfo?.genres || []).map((g) => (
              <span key={g} className="bg-[#1db954]/20 text-[#1db954] px-2 py-0.5 rounded-full text-xs">{g}</span>
            ))}
          </div>

          <p className="text-neutral-400 text-sm mt-1">
            {songs.length} {songs.length === 1 ? 'трек' : songs.length <= 4 ? 'треки' : 'треків'}
            {totalSeconds > 0 && (
              <span className="ml-2">
                • {Math.floor(totalSeconds / 60)} хв
              </span>
            )}
            {songs.some((s) => s.source === 'itunes') && (
              <span className="ml-2 text-xs bg-white/10 text-neutral-300 px-2 py-0.5 rounded-full">iTunes</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Кнопки керування ── */}
      <div className="flex items-center gap-5 px-4 py-4">
        <button
          onClick={handlePlayAll}
          disabled={songs.length === 0}
          className="w-14 h-14 rounded-full bg-[#1db954] hover:bg-[#1ed760] hover:scale-105 transition flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img
            src={isAnyActive && playStatus ? assets.pause_icon : assets.play_icon}
            alt="Play"
            className="w-6 h-6"
          />
        </button>
      </div>

      {/* ── Таби ── */}
      <div className="flex gap-0 px-4 mb-4 border-b border-white/10">
        {(['tracks', 'about'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === tab
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {tab === 'tracks' ? 'Треки' : 'Про виконавця'}
          </button>
        ))}
      </div>

      {/* ── Треки ── */}
      {activeTab === 'tracks' && (
        <>
          {songs.length === 0 ? (
            <div className="text-center text-neutral-500 py-12">Треків не знайдено</div>
          ) : (
            <div className="flex flex-col px-2">
              {/* Заголовок */}
              <div className="grid grid-cols-[16px_1fr_auto_auto] sm:grid-cols-[16px_1fr_2fr_auto_auto] gap-3 px-4 py-2 text-neutral-400 text-xs uppercase tracking-wider border-b border-white/10 mb-1">
                <span>#</span>
                <span>Назва</span>
                <span className="hidden sm:block">Опис</span>
                <span className="hidden sm:block">Джерело</span>
                <img src={assets.clock_icon} alt="" className="w-4 h-4 justify-self-end" />
              </div>

              {songs.map((song, i) => {
                const isActive = track?.id === song.id
                const isPlaying = isActive && playStatus

                return (
                  <div
                    key={song.id}
                    onClick={() => playWithId(song.id)}
                    className={`grid grid-cols-[16px_1fr_auto_auto] sm:grid-cols-[16px_1fr_2fr_auto_auto] gap-3 px-4 py-2.5 rounded-md cursor-pointer hover:bg-white/5 group transition ${
                      isActive ? 'text-[#1db954]' : 'text-neutral-300'
                    }`}
                  >
                    {/* Індекс / іконка */}
                    <span className="self-center text-sm relative w-4 h-4">
                      <span className={`${isPlaying ? 'hidden' : 'group-hover:hidden'}`}>{i + 1}</span>
                      <img
                        src={isPlaying ? assets.pause_icon : assets.play_icon}
                        alt=""
                        className={`w-3 h-3 absolute inset-0 m-auto ${isPlaying ? 'block' : 'hidden group-hover:block'}`}
                      />
                    </span>

                    {/* Обкладинка + назва */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={resolveUrl(song.image)}
                        alt={song.name}
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
                          {song.name}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">{song.artist}</p>
                      </div>
                    </div>

                    {/* Опис */}
                    <span className="hidden sm:block self-center text-sm text-neutral-500 truncate">
                      {song.desc || '—'}
                    </span>

                    {/* Джерело */}
                    <span className="hidden sm:block self-center">
                      {song.source === 'itunes' ? (
                        <span className="text-xs bg-white/10 text-neutral-400 px-2 py-0.5 rounded-full">iTunes</span>
                      ) : (
                        <span className="text-xs bg-[#1db954]/20 text-[#1db954] px-2 py-0.5 rounded-full">Local</span>
                      )}
                    </span>

                    {/* Тривалість */}
                    <span className="self-center text-sm text-neutral-500 justify-self-end">{song.duration}</span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Про виконавця ── */}
      {activeTab === 'about' && (
        <div className="px-4 pb-8 flex flex-col gap-6">

          {/* Картка з фото + базова інфо */}
          <div className="flex flex-col sm:flex-row gap-6 bg-white/5 rounded-xl p-5">
            {heroCover && (
              <img
                src={heroCover}
                alt={artistName}
                className="w-full sm:w-48 h-48 object-cover rounded-lg shadow-xl shrink-0"
              />
            )}
            <div className="flex flex-col gap-3 min-w-0">
              <h2 className="text-white text-2xl font-bold">{artistName}</h2>

              {/* Жанри */}
              {(artistInfo?.genres || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(artistInfo?.genres || []).map((g) => (
                    <span key={g} className="bg-[#1db954]/20 text-[#1db954] text-xs font-semibold px-3 py-1 rounded-full">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Статистика */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-2xl font-bold text-white">{songs.length}</p>
                  <p className="text-xs text-neutral-400">Треків</p>
                </div>
                {totalSeconds > 0 && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-2xl font-bold text-white">{Math.floor(totalSeconds / 60)}</p>
                    <p className="text-xs text-neutral-400">Хвилин музики</p>
                  </div>
                )}
                {artistInfo?.formedYear && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-2xl font-bold text-white">{artistInfo.formedYear}</p>
                    <p className="text-xs text-neutral-400">Рік початку</p>
                  </div>
                )}
                {artistInfo?.country && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-2xl font-bold text-white">{artistInfo.country}</p>
                    <p className="text-xs text-neutral-400">Країна</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Біографія */}
          {artistInfo?.bio ? (
            <div className="bg-white/5 rounded-xl p-5">
              <h3 className="text-white font-bold text-lg mb-3">Біографія</h3>
              <p className={`text-neutral-300 text-sm leading-relaxed whitespace-pre-line ${!showFullBio ? 'line-clamp-4' : ''}`}>
                {artistInfo.bio}
              </p>
              {artistInfo.bio.length > 200 && (
                <button
                  onClick={() => setShowFullBio((v) => !v)}
                  className="mt-2 text-xs text-neutral-400 hover:text-white transition underline"
                >
                  {showFullBio ? 'Показати менше' : 'Читати більше'}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl p-5">
              <h3 className="text-white font-bold text-lg mb-2">Біографія</h3>
              <p className="text-neutral-500 text-sm">Біографія виконавця поки що недоступна.</p>
            </div>
          )}

          {/* Топ-треки */}
          {topTracks.length > 0 && (
            <div className="bg-white/5 rounded-xl p-5">
              <h3 className="text-white font-bold text-lg mb-3">Популярні треки</h3>
              <div className="flex flex-col gap-1">
                {topTracks.map((song, i) => {
                  const isActive = track?.id === song.id
                  const isPlaying = isActive && playStatus
                  return (
                    <div
                      key={song.id}
                      onClick={() => playWithId(song.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/10 group transition ${
                        isActive ? 'text-[#1db954]' : 'text-neutral-300'
                      }`}
                    >
                      <span className="w-5 text-center text-sm text-neutral-500 group-hover:hidden shrink-0">
                        {isPlaying ? '▶' : i + 1}
                      </span>
                      <img
                        src={resolveUrl(song.image)}
                        alt={song.name}
                        className="hidden group-hover:inline w-4 h-4 shrink-0"
                      />
                      <img
                        src={resolveUrl(song.image)}
                        alt={song.name}
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
                          {song.name}
                        </p>
                        {song.desc && (
                          <p className="text-xs text-neutral-500 truncate">{song.desc}</p>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500 shrink-0">{song.duration}</span>
                    </div>
                  )
                })}
              </div>
              {songs.length > 5 && (
                <button
                  onClick={() => setActiveTab('tracks')}
                  className="mt-3 text-xs text-neutral-400 hover:text-white transition underline"
                >
                  Переглянути всі {songs.length} треків →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ArtistPage