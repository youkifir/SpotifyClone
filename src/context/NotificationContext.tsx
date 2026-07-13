import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'

export interface Notification {
  _id: string
  type: 'new_song' | 'new_album'
  title: string
  artist: string
  entityId: string | null
  read: boolean
  createdAt: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: () => Promise<void>
  markAllRead: () => Promise<void>
  markRead: (id: string) => Promise<void>
  following: string[]
  follow: (musicianId: string) => Promise<void>
  unfollow: (musicianId: string) => Promise<void>
  isFollowing: (musicianId: string) => boolean
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const API = 'http://localhost:5000/api/notifications'

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [following, setFollowing] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const headers = { Authorization: `Bearer ${token}` }

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(API, { headers })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.data || [])
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [token])

  const fetchFollowing = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/following`, { headers })
      if (res.ok) {
        const data = await res.json()
        setFollowing((data.data || []).map(String))
      }
    } catch { /* ignore */ }
  }, [token])

  useEffect(() => {
    if (user && token) {
      fetchNotifications()
      fetchFollowing()
      // Пулінг кожні 30 секунд
      const interval = setInterval(fetchNotifications, 30_000)
      return () => clearInterval(interval)
    } else {
      setNotifications([])
      setFollowing([])
    }
  }, [user, token])

  const markAllRead = async () => {
    if (!token) return
    await fetch(`${API}/read-all`, { method: 'PATCH', headers })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = async (id: string) => {
    if (!token) return
    await fetch(`${API}/${id}/read`, { method: 'PATCH', headers })
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
  }

  const follow = async (musicianId: string) => {
    if (!token) return
    await fetch(`${API}/follow/${musicianId}`, { method: 'POST', headers })
    setFollowing(prev => [...prev, musicianId])
  }

  const unfollow = async (musicianId: string) => {
    if (!token) return
    await fetch(`${API}/follow/${musicianId}`, { method: 'DELETE', headers })
    setFollowing(prev => prev.filter(id => id !== musicianId))
  }

  const isFollowing = (musicianId: string) => following.includes(musicianId)

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading,
      fetchNotifications, markAllRead, markRead,
      following, follow, unfollow, isFollowing,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
