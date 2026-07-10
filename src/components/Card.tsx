import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'

interface CardProps {
  to?: string
  image: string
  name: string
  desc: string
  onClick?: () => void
  isActive?: boolean
}

function Card({ to, image, name, desc, onClick, isActive }: CardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }
    if (to) navigate(to)
  }

  return (
    <div
      onClick={handleClick}
      className="w-36 sm:w-45 shrink-0 snap-start bg-[#181818] hover:bg-[#282828] transition-colors rounded-lg p-3 sm:p-4 cursor-pointer group"
    >
      <div className="relative overflow-hidden rounded-md">
        <img
          src={image}
          alt={name}
          className="w-full aspect-square object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
        />
        {onClick && (
          <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] shadow-lg flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition hover:scale-105">
            <img src={isActive ? assets.pause_icon : assets.play_icon} alt="" className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className={`text-sm font-semibold mt-3 truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>{name}</p>
      <p className="text-neutral-400 text-xs mt-1 line-clamp-2">{desc}</p>
    </div>
  )
}

export default Card