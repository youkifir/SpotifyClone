import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CreatePlaylistModal, { type Playlist } from './CreatePlaylistModal'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const API_BASE = 'http://localhost:5000/api'

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { token } = useAuth()

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!token) {
        setPlaylists([])
        return
      }
      setLoading(true)
      try {
        const response = await fetch(`${API_BASE}/playlists/my`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const resData = await response.json()
          setPlaylists(Array.isArray(resData) ? resData : resData.data || [])
        }
      } catch (error) {
        console.error('Помилка завантаження плейлистів:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [token])

  const handleCreated = (playlist: Playlist) => {
    setPlaylists((prev) => [playlist, ...prev])
  }

  const handleDelete = async (e: React.MouseEvent, playlistId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!token) return
    if (!window.confirm('Видалити цей плейлист?')) return

    setDeletingId(playlistId)
    try {
      const response = await fetch(`${API_BASE}/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setPlaylists((prev) => prev.filter((p) => p._id !== playlistId))
      }
    } catch (error) {
      console.error('Помилка видалення плейлиста:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const resolveImage = (image: string) => {
    if (!image) return assets.stack_icon
    return image.startsWith('http') || image.startsWith('data:') ? image : `http://localhost:5000/${image}`
  }

  return (
    <>
      {/* Затемнення фону на мобільних */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      />

      <div
        className={`fixed lg:static top-0 left-0 h-full w-[78%] max-w-70 lg:w-[25%] flex flex-col text-white shrink-0 z-50 lg:z-auto transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className='bg-[#121212] h-full lg:rounded-lg p-2 flex flex-col gap-2'>

          <div className='p-4 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <img className='w-8' src={assets.stack_icon} alt="Library" />
              <p className='font-semibold'>Your Library</p>
            </div>
            <div className='flex items-center gap-4 px-1'>
              <img
                onClick={() => setIsModalOpen(true)}
                className='w-5 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition'
                src={assets.plus_icon}
                alt="Створити плейлист"
                title="Створити плейлист"
              />
              <button
                onClick={onClose}
                aria-label="Закрити бібліотеку"
                className='lg:hidden w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-white hover:scale-110 transition text-lg leading-none'
              >
                ✕
              </button>
            </div>
          </div>

          <div className='flex flex-col gap-3 px-2 overflow-y-auto custom-scrollbar flex-1'>
            {!token ? (
              <p className='text-sm text-zinc-400 p-4'>Увійдіть в акаунт, щоб бачити свої плейлисти</p>
            ) : loading ? (
              <p className='text-sm text-zinc-400 p-4'>Завантаження...</p>
            ) : playlists.length === 0 ? (
              <div className='p-4 bg-[#242424] hover:bg-[#2a2a2a] transition-colors rounded-lg flex flex-col items-start gap-1'>
                <h1 className='font-bold text-base text-white'>Create your first playlist</h1>
                <p className='text-sm text-white font-light opacity-90'>it's easy we will help you</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className='bg-white text-black text-sm font-bold px-4 py-1.5 rounded-full mt-4 hover:scale-105 hover:bg-neutral-200 transition'
                >
                  Create Playlist
                </button>
              </div>
            ) : (
              playlists.map((playlist) => (
                <Link
                  key={playlist._id}
                  to={`/playlist/${playlist._id}`}
                  onClick={onClose}
                  className='flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] transition-colors group cursor-pointer'
                >
                  <img
                    className='w-12 h-12 rounded object-cover shrink-0'
                    src={resolveImage(playlist.image)}
                    alt={playlist.name}
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='font-medium text-sm text-white truncate group-hover:text-[#1db954] transition-colors'>
                      {playlist.name}
                    </p>
                    <p className='text-xs text-neutral-400 truncate'>
                      Плейлист • {playlist.songs.length} треків
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, playlist._id)}
                    disabled={deletingId === playlist._id}
                    aria-label="Видалити плейлист"
                    title="Видалити плейлист"
                    className='shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition disabled:opacity-50'
                  >
                    <svg viewBox="0 0 24 24" fill="none" className='w-4 h-4' stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </Link>
              ))
            )}
          </div>

        </div>
      </div>

      <CreatePlaylistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  )
}

export default Sidebar
