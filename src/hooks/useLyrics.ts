import { useEffect, useState } from 'react'

export interface LrcLine {
  time: number   // секунди
  text: string
}

// Парсить рядок виду "[mm:ss.xx] текст" у { time, text }
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

// Кешуємо результати в пам'яті, щоб не дублювати запити між рендерами
const cache = new Map<string, LrcLine[] | null>()

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
        // LRCLIB — безкоштовне API без ключа, повертає синхронізований LRC
        const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artist)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('LRCLIB request failed')

        const results: Array<{ syncedLyrics?: string; plainLyrics?: string }> = await res.json()

        // Беремо перший результат з синхронізованим текстом
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
