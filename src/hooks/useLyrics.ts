import { useEffect, useState } from 'react'

export interface LrcLine {
  time: number
  text: string
}

const parseLrc = (raw: string): LrcLine[] => {
  const lines: LrcLine[] = []
  for (const line of raw.split('\n')) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d+)\](.*)/)
    if (!match) continue
    const minutes = parseInt(match[1], 10)
    const seconds = parseInt(match[2], 10)
    const centiseconds = parseInt(match[3].padEnd(2, '0').slice(0, 2), 10)
    const time = minutes * 60 + seconds + centiseconds / 100
    const text = match[4].trim()
    if (text) lines.push({ time, text })
  }
  return lines.sort((a, b) => a.time - b.time)
}

const cache = new Map<string, LrcLine[] | null>()

const API = 'http://localhost:5000'

export const useLyrics = (trackName: string, artist: string): {
  lines: LrcLine[] | null
  loading: boolean
} => {
  const [lines, setLines] = useState<LrcLine[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!trackName || !artist) {
      setLines(null)
      return
    }

    const key = `${artist}::${trackName}`

    if (cache.has(key)) {
      setLines(cache.get(key)!)
      return
    }

    let cancelled = false
    setLoading(true)
    setLines(null)

    const fetchLyrics = async () => {
      try {
        // Запит через наш бекенд-проксі — без CORS помилок
        const url = `${API}/api/songs/lrclib?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artist)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Proxy request failed')

        const results: Array<{ syncedLyrics?: string; plainLyrics?: string }> = await res.json()
        const withSynced = results.find((r) => r.syncedLyrics)

        if (!cancelled) {
          const parsed = withSynced?.syncedLyrics ? parseLrc(withSynced.syncedLyrics) : null
          cache.set(key, parsed)
          setLines(parsed)
        }
      } catch {
        if (!cancelled) {
          cache.set(key, null)
          setLines(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchLyrics()
    return () => { cancelled = true }
  }, [trackName, artist])

  return { lines, loading }
}