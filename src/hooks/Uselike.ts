import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:5000'

const likeEventTarget = new EventTarget()
export const LIKED_SONGS_CHANGED = 'liked-songs-changed'

export function emitLikeChanged() {
  likeEventTarget.dispatchEvent(new Event(LIKED_SONGS_CHANGED))
}
export function onLikeChanged(cb: () => void) {
  likeEventTarget.addEventListener(LIKED_SONGS_CHANGED, cb)
  return () => likeEventTarget.removeEventListener(LIKED_SONGS_CHANGED, cb)
}

export function useLike() {
  const { token } = useAuth()
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const prevCountRef = useRef(0)

  const fetchLiked = useCallback(async () => {
    if (!token) { setLikedIds(new Set()); return }
    try {
      const res = await fetch(`${API}/api/auth/likes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const ids = (data.data || []).map((s: any) => String(s._id || s.id))
      setLikedIds(new Set(ids))
      prevCountRef.current = ids.length
    } catch {}
  }, [token])

  useEffect(() => {
    fetchLiked()
  }, [fetchLiked])

  const toggleLike = useCallback(async (songId: string | number) => {
    if (!token) return
    const id = String(songId)

    // Оптимістичне оновлення UI
    let wasLiked = false
    setLikedIds((prev) => {
      const next = new Set(prev)
      wasLiked = next.has(id)
      if (wasLiked) next.delete(id)
      else next.add(id)
      return next
    })

    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/likes/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        emitLikeChanged()
      } else {
        // Відкатуємо при помилці
        setLikedIds((prev) => {
          const next = new Set(prev)
          if (wasLiked) next.add(id)
          else next.delete(id)
          return next
        })
      }
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (wasLiked) next.add(id)
        else next.delete(id)
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [token])

  const isLiked = useCallback(
    (songId: string | number) => likedIds.has(String(songId)),
    [likedIds]
  )

  return { likedIds, isLiked, toggleLike, loading, refetch: fetchLiked }
}