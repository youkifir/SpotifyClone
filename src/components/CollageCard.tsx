import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:5000'

const getSafeImgSrc = (imgStr: string | undefined | null): string => {
  if (!imgStr) return ''
  if (imgStr.startsWith('http') || imgStr.startsWith('data:')) return imgStr
  return `${API}/${imgStr}`
}

// Локальний кеш колажів у пам'яті (щоб не перефетчувати між рендерами)
const collageCache = new Map<string, string[]>()

interface CollageCardProps {
  to: string
  id: string
  type: 'playlist' | 'album'
  fallbackImage?: string
  songs?: Array<{ image?: string; _id?: string }> // для плейлистів — вже є
  name: string
  desc: string
}

function CollageCard({ to, id, type, fallbackImage, songs, name, desc }: CollageCardProps) {
  const navigate = useNavigate()
  const cacheKey = `collage_${type}_${id}`

  // Отримуємо початкові фото: або з кешу, або з songs prop
  const getInitialPhotos = (): string[] => {
    // 1. Перевіряємо пам'ять кеш
    if (collageCache.has(cacheKey)) return collageCache.get(cacheKey)!
    // 2. Перевіряємо localStorage
    try {
      const stored = localStorage.getItem(cacheKey)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        collageCache.set(cacheKey, parsed)
        return parsed
      }
    } catch {}
    // 3. Якщо плейліст — беремо з переданих songs
    if (type === 'playlist' && songs && songs.length > 0) {
      const imgs = songs
        .map(s => getSafeImgSrc(s.image))
        .filter(Boolean)
        .slice(0, 4)
      if (imgs.length > 0) {
        collageCache.set(cacheKey, imgs)
        try { localStorage.setItem(cacheKey, JSON.stringify(imgs)) } catch {}
        return imgs
      }
    }
    return []
  }

  const [photos, setPhotos] = useState<string[]>(getInitialPhotos)
  const [loading, setLoading] = useState(photos.length === 0)

  useEffect(() => {
    // Якщо вже є фото (з кешу) — не фетчимо
    if (photos.length > 0) return

    // Для плейлистів — пробуємо з songs prop
    if (type === 'playlist' && songs && songs.length > 0) {
      const imgs = songs
        .map(s => getSafeImgSrc(s.image))
        .filter(Boolean)
        .slice(0, 4)
      if (imgs.length > 0) {
        setPhotos(imgs)
        collageCache.set(cacheKey, imgs)
        try { localStorage.setItem(cacheKey, JSON.stringify(imgs)) } catch {}
        setLoading(false)
        return
      }
    }

    // Для альбомів — фетчимо пісні
    if (type === 'album') {
      fetch(`${API}/api/songs?album=${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(res => {
          const songList: any[] = res?.data || []
          const imgs = songList
            .map(s => getSafeImgSrc(s.image))
            .filter(Boolean)
            .slice(0, 4)
          const result = imgs.length > 0 ? imgs : fallbackImage ? [getSafeImgSrc(fallbackImage)] : []
          setPhotos(result)
          if (result.length > 0) {
            collageCache.set(cacheKey, result)
            try { localStorage.setItem(cacheKey, JSON.stringify(result)) } catch {}
          }
        })
        .catch(() => {
          if (fallbackImage) setPhotos([getSafeImgSrc(fallbackImage)])
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [id, type, cacheKey, photos.length, songs, fallbackImage])

  const renderCover = () => {
    const validPhotos = photos.filter(Boolean)

    if (loading) {
      return <div className="w-full aspect-square bg-[#282828] rounded-md animate-pulse" />
    }

    // Менше 2 фото — показуємо один великий
    if (validPhotos.length < 2) {
      const src = validPhotos[0] || getSafeImgSrc(fallbackImage) || ''
      return (
        <img
          src={src}
          alt={name}
          className="w-full aspect-square object-cover rounded-md shadow-lg transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )
    }

    // 2–4 фото — колаж 2×2 як у Spotify
    const grid = [...validPhotos]
    while (grid.length < 4) grid.push(grid[grid.length - 1]) // дублюємо якщо менше 4

    return (
      <div className="w-full aspect-square rounded-md overflow-hidden grid grid-cols-2 gap-px shadow-lg transition-transform duration-300 group-hover:scale-105" style={{ background: '#121212' }}>
        {grid.slice(0, 4).map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      onClick={() => navigate(to)}
      className="w-36 sm:w-45 shrink-0 snap-start bg-[#181818] rounded-lg p-3 sm:p-4 cursor-pointer group relative card-hover ripple-btn"
    >
      <div className="relative overflow-hidden rounded-md">
        {renderCover()}
        {/* Play button overlay */}
        <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] shadow-lg flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition hover:scale-105">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="black">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
      </div>
      <p className="text-sm font-semibold mt-3 truncate text-white">{name}</p>
      <p className="text-neutral-400 text-xs mt-1 line-clamp-2">{desc}</p>
    </div>
  )
}

export default CollageCard
