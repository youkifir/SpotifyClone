import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/usePlayer'
import { useAuth } from '../context/AuthContext'

interface ArtistPopupProps {
  artistName: string
  anchorEl: HTMLElement | null
  onClose: () => void
}

interface ArtistSong {
  id: string
  name: string
  image: string
  duration: string
  desc: string
  file: string
}

function ArtistPopup({ artistName, anchorEl, onClose }: ArtistPopupProps) {
  const { playWithId, addSongs, track, playStatus } = usePlayer()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [songs, setSongs] = useState<ArtistSong[]>([])
  const [loading, setLoading] = useState(true)
  const popupRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!artistName) return
    setLoading(true)
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    fetch(`http://localhost:5000/api/songs/artist/${encodeURIComponent(artistName)}`, { headers })
      .then((r) => r.json())
      .then((res) => {
        const raw = res.data?.songs || []
        const normalized = raw.map((s: any) => ({ ...s, id: s.id ?? s._id }))
        setSongs(normalized)
        addSongs(normalized)
      })
      .catch(() => setSongs([]))
      .finally(() => setLoading(false))
  }, [artistName, token])

  // Position popup: bottom-left of anchor, stay within viewport
  useEffect(() => {
    if (!anchorEl) return
    const update = () => {
      const anchorRect = anchorEl.getBoundingClientRect()
      const popupWidth = 320
      const popupHeight = 420

      let left = anchorRect.left
      let top = anchorRect.bottom + 8

      if (left + popupWidth > window.innerWidth - 16) left = window.innerWidth - popupWidth - 16
      if (left < 8) left = 8
      if (top + popupHeight > window.innerHeight - 16) top = anchorRect.top - popupHeight - 8

      setPosition({ top, left })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [anchorEl])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [anchorEl, onClose])

  if (!anchorEl) return null

  const resolveUrl = (url: string) =>
    url?.startsWith('http') ? url : `http://localhost:5000/${url}`

  const goToArtistPage = () => {
    onClose()
    navigate(`/artist/${encodeURIComponent(artistName)}`)
  }

  return (
    <div
      ref={popupRef}
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 9999, width: 320 }}
      className="bg-[#282828] rounded-xl shadow-2xl border border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-0.5">Виконавець</p>
            <h3 className="text-white font-bold text-base truncate">{artistName}</h3>
            {!loading && (
              <p className="text-neutral-500 text-xs mt-0.5">
                {songs.length}{' '}
                {songs.length === 1 ? 'трек' : songs.length >= 2 && songs.length <= 4 ? 'треки' : 'треків'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition text-lg leading-none shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Go to full page */}
        <button
          onClick={goToArtistPage}
          className="mt-3 w-full text-xs text-[#1db954] hover:text-[#1ed760] border border-[#1db954]/40 hover:border-[#1db954] rounded-lg py-1.5 transition font-medium"
        >
          Переглянути всі треки →
        </button>
      </div>

      {/* Song list preview (up to 5) */}
      <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 260 }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center text-neutral-500 text-sm py-8 px-4">Треки не знайдено</div>
        ) : (
          <div className="py-2">
            {songs.slice(0, 5).map((song, i) => {
              const isActive = track?.id === song.id
              const isPlaying = isActive && playStatus

              return (
                <div
                  key={song.id}
                  onClick={() => { playWithId(song.id); onClose() }}
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/10 transition group ${
                    isActive ? 'text-[#1db954]' : 'text-neutral-300'
                  }`}
                >
                  <span className="w-4 text-xs text-center shrink-0 text-neutral-500 group-hover:hidden">
                    {isPlaying ? '▶' : i + 1}
                  </span>
                  <span className="w-4 text-xs text-center shrink-0 hidden group-hover:block text-white">▶</span>

                  <img src={resolveUrl(song.image)} alt={song.name} className="w-9 h-9 rounded object-cover shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
                      {song.name}
                    </p>
                    {song.desc && <p className="text-xs text-neutral-500 truncate">{song.desc}</p>}
                  </div>

                  <span className="text-xs text-neutral-500 shrink-0">{song.duration}</span>
                </div>
              )
            })}

            {songs.length > 5 && (
              <button
                onClick={goToArtistPage}
                className="w-full text-xs text-neutral-400 hover:text-white py-2 transition"
              >
                + ще {songs.length - 5} треків
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ArtistPopup