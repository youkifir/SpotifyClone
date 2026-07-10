import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const [albums, setAlbums] = useState<any[]>([])

  // Подтягиваем альбомы для отображения в библиотеке сайдбара
  useEffect(() => {
    const fetchSidebarAlbums = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/albums')
        if (response.ok) {
          const resData = await response.json()
          setAlbums(Array.isArray(resData) ? resData : (resData.data || []))
        }
      } catch (error) {
        console.error('Помилка завантаження альбомів у сайдбар:', error)
      }
    }
    fetchSidebarAlbums()
  }, [])

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
              <img className='w-5 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.arrow_icon} alt="Arrow" />
              <img className='w-5 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 transition' src={assets.plus_icon} alt="Plus" />
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
            {albums.length === 0 ? (
              <>
                <div className='p-4 bg-[#242424] hover:bg-[#2a2a2a] transition-colors rounded-lg flex flex-col items-start gap-1'>
                  <h1 className='font-bold text-base text-white'>Create your first playlist</h1>
                  <p className='text-sm text-white font-light opacity-90'>it's easy we will help you</p>
                  <button className='bg-white text-black text-sm font-bold px-4 py-1.5 rounded-full mt-4 hover:scale-105 hover:bg-neutral-200 transition'>
                    Create Playlist
                  </button>
                </div>
              </>
            ) : (
              albums.map((album) => {
                const albumId = album.id || album._id
                const imageUrl = album.image.startsWith('http') ? album.image : `http://localhost:5000/${album.image}`
                return (
                  <Link
                    key={albumId}
                    to={`/album/${albumId}`}
                    onClick={onClose}
                    className='flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] transition-colors group cursor-pointer'
                  >
                    <img className='w-12 h-12 rounded object-cover' src={imageUrl} alt={album.name} />
                    <div className='min-w-0 flex-1'>
                      <p className='font-medium text-sm text-white truncate group-hover:text-[#1db954] transition-colors'>{album.name}</p>
                      <p className='text-xs text-neutral-400 truncate'>Плейлист • {album.desc}</p>
                    </div>
                  </Link>
                )
              })
            )}
          </div>

        </div>
      </div>
    </>
  )
}

export default Sidebar