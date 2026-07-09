import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'

function Navbar() {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-[#121212]/95 backdrop-blur z-10">
      <div className="flex items-center gap-2">
        <img
          src={assets.arrow_left}
          alt="Назад"
          className="w-8 h-8 p-2 bg-black rounded-full cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <img
          src={assets.arrow_right}
          alt="Вперед"
          className="w-8 h-8 p-2 bg-black rounded-full cursor-pointer"
          onClick={() => navigate(1)}
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="hidden sm:block px-4 py-1.5 text-sm font-semibold text-neutral-300 hover:text-white transition-colors">
          Розширити Spotify
        </button>
        <img src={assets.bell_icon} alt="" className="w-5 h-5 cursor-pointer" />
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold cursor-pointer">
          К
        </div>
      </div>
    </div>
  )
}

export default Navbar
