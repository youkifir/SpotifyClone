import { useNavigate } from 'react-router-dom'

interface CardProps {
  to?: string
  image: string
  name: string
  desc: string
}

function Card({ to, image, name, desc }: CardProps) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => to && navigate(to)}
      className="min-w-45 bg-[#181818] hover:bg-[#282828] transition-colors rounded-lg p-4 cursor-pointer group"
    >
      <div className="relative">
        <img src={image} alt={name} className="w-full aspect-square object-cover rounded-md shadow-lg" />
      </div>
      <p className="text-white text-sm font-semibold mt-3 truncate">{name}</p>
      <p className="text-neutral-400 text-xs mt-1 line-clamp-2">{desc}</p>
    </div>
  )
}

export default Card