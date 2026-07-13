import { useState, useEffect, useCallback } from 'react'

// Максимальна кількість "недавно прослуханих" плиток на головній,
// так само як у справжньому Spotify.
const MAX_RECENT_ITEMS = 8

export interface RecentlyPlayedItem {
  id: string
  type: 'playlist' | 'album'
  name: string
  desc: string
  image: string
  isLikedSongs?: boolean
  playedAt: number
}

const recentEventTarget = new EventTarget()
const RECENTLY_PLAYED_CHANGED = 'recently-played-changed'

function storageKey(userId: string) {
  return `recentlyPlayed:${userId}`
}

function readList(userId: string): RecentlyPlayedItem[] {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(userId: string, list: RecentlyPlayedItem[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(list))
  } catch {
    // якщо localStorage недоступний (наприклад приватний режим) — просто ігноруємо
  }
  recentEventTarget.dispatchEvent(new Event(RECENTLY_PLAYED_CHANGED))
}

// Додає (або піднімає нагору, якщо вже є) плейлист/альбом у список
// "недавно прослуханих". Викликається щоразу, коли юзер відкриває
// сторінку плейлиста/альбому — так само як реальний Spotify оновлює
// свою плитку "Нещодавно прослухані" на головній.
export function addRecentlyPlayed(userId: string | undefined | null, item: Omit<RecentlyPlayedItem, 'playedAt'>) {
  if (!userId || !item.id) return
  const current = readList(userId)
  const withoutDuplicate = current.filter((i) => !(i.id === item.id && i.type === item.type))
  const next = [{ ...item, playedAt: Date.now() }, ...withoutDuplicate].slice(0, MAX_RECENT_ITEMS)
  writeList(userId, next)
}

export function useRecentlyPlayed(userId: string | undefined | null) {
  const [items, setItems] = useState<RecentlyPlayedItem[]>(() => (userId ? readList(userId) : []))

  const refresh = useCallback(() => {
    setItems(userId ? readList(userId) : [])
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    recentEventTarget.addEventListener(RECENTLY_PLAYED_CHANGED, refresh)
    return () => recentEventTarget.removeEventListener(RECENTLY_PLAYED_CHANGED, refresh)
  }, [refresh])

  return items
}
