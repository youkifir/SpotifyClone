import { NavLink } from 'react-router-dom'
import { assets, albumsData } from '../assets/assets'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'text-white bg-[#2a2a2a]' : 'text-neutral-400 hover:text-white'
  }`

function Sidebar() {
  return (
    <aside className="hidden md:flex w-[280px] shrink-0 flex-col gap-2">
      {/* лого + основна навігація */}
      <div className="bg-[#121212] rounded-lg p-4">
        <img src={assets.spotify_logo} alt="Spotify" className="w-24 mb-6" />

        <nav className="flex flex-col gap-1">
          <NavLink to="/" className={navLinkClass} end>
            <img src={assets.home_icon} alt="" className="w-5 h-5" />
            Головна
          </NavLink>
          <NavLink to="/search" className={navLinkClass}>
            <img src={assets.search_icon} alt="" className="w-5 h-5" />
            Пошук
          </NavLink>
        </nav>
      </div>

      {/* бібліотека / плейлисти */}
      <div className="flex-1 bg-[#121212] rounded-lg p-4 overflow-y-auto">
        <div className="flex items-center justify-between text-neutral-400 mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <img src={assets.stack_icon} alt="" className="w-5 h-5" />
            Твоя бібліотека
          </div>
          <img src={assets.plus_icon} alt="" className="w-5 h-5 cursor-pointer" />
        </div>

        <div className="flex flex-col gap-2">
          {albumsData.map((album) => (
            <NavLink
              key={album.id}
              to={`/album/${album.id}`}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-[#2a2a2a] transition-colors"
            >
              <img src={album.image} alt={album.name} className="w-12 h-12 rounded object-cover" />
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{album.name}</p>
                <p className="text-xs text-neutral-400 truncate">Плейлист</p>
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
