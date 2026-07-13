export interface RecentlyPlayedItem {
  id: string
  type: 'playlist' | 'album' | 'artist'
  name: string
  desc: string
  image: string
  isLikedSongs?: boolean
}

const STORAGE_KEY_PREFIX = 'recentlyPlayed_'
const MAX_ITEMS = 20

function getKey(userId?: string) {
  return `${STORAGE_KEY_PREFIX}${userId ?? 'guest'}`
}

export function getRecentlyPlayed(userId?: string): RecentlyPlayedItem[] {
  try {
    const raw = localStorage.getItem(getKey(userId))
    return raw ? (JSON.parse(raw) as RecentlyPlayedItem[]) : []
  } catch {
    return []
  }
}

export function addRecentlyPlayed(userId: string | undefined, item: RecentlyPlayedItem): void {
  try {
    const existing = getRecentlyPlayed(userId).filter((i) => i.id !== item.id)
    const updated = [item, ...existing].slice(0, MAX_ITEMS)
    localStorage.setItem(getKey(userId), JSON.stringify(updated))
  } catch {
    // ignore storage errors
  }
}

export function clearRecentlyPlayed(userId?: string): void {
  localStorage.removeItem(getKey(userId))
}
