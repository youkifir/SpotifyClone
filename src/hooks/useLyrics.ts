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

// Зсуває таймкоди LRC для iTunes прев'ю.
// iTunes прев'ю — це 30-секундний відрізок з середини треку.
// lrclib дає таймкоди від початку повного треку, тому треба відняти previewOffset,
// щоб таймкоди відповідали реальній позиції у 30-секундному аудіо.
const shiftLrcForPreview = (
  lines: LrcLine[],
  previewOffset: number,   // секунди — звідки починається прев'ю у повній пісні
  previewDuration: number  // тривалість прев'ю (зазвичай ~30 сек)
): LrcLine[] => {
  const end = previewOffset + previewDuration
  return lines
    .filter(l => l.time >= previewOffset - 1 && l.time <= end + 1)
    .map(l => ({ ...l, time: Math.max(0, l.time - previewOffset) }))
}

const cache = new Map<string, LrcLine[] | null>()

const API = 'http://localhost:5000'

interface UseLyricsOptions {
  // Реальна тривалість аудіо в секундах (з HTMLAudioElement.duration)
  audioDuration?: number
  // Тривалість повного треку в секундах (з поля duration в БД, наприклад "3:45" → 225)
  fullTrackDuration?: number
  // true якщо це iTunes трек (прев'ю)
  isItunes?: boolean
}

export const useLyrics = (
  trackName: string,
  artist: string,
  options: UseLyricsOptions = {}
): {
  lines: LrcLine[] | null
  loading: boolean
} => {
  const [lines, setLines] = useState<LrcLine[] | null>(null)
  const [loading, setLoading] = useState(false)

  const { audioDuration, fullTrackDuration, isItunes } = options

  useEffect(() => {
    if (!trackName || !artist) {
      setLines(null)
      return
    }

    const key = `${artist}::${trackName}`

    if (cache.has(key)) {
      const cached = cache.get(key)!
      // Навіть з кешу треба зсунути для прев'ю
      setLines(maybeShift(cached, isItunes, audioDuration, fullTrackDuration))
      return
    }

    let cancelled = false
    setLoading(true)
    setLines(null)

    const fetchLyrics = async () => {
      try {
        const url = `${API}/api/songs/lrclib?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artist)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Proxy request failed')

        const results: Array<{ syncedLyrics?: string; plainLyrics?: string; duration?: number }> = await res.json()
        const withSynced = results.find((r) => r.syncedLyrics)

        if (!cancelled) {
          const parsed = withSynced?.syncedLyrics ? parseLrc(withSynced.syncedLyrics) : null
          // Зберігаємо оригінальні таймкоди в кеш
          cache.set(key, parsed)
          setLines(maybeShift(parsed, isItunes, audioDuration, fullTrackDuration))
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
  }, [trackName, artist, isItunes, audioDuration, fullTrackDuration])

  return { lines, loading }
}

// Застосовує зсув для прев'ю якщо потрібно
function maybeShift(
  lines: LrcLine[] | null,
  isItunes?: boolean,
  audioDuration?: number,
  fullTrackDuration?: number
): LrcLine[] | null {
  if (!lines || !isItunes || !audioDuration || !fullTrackDuration) return lines
  // Якщо аудіо суттєво коротше повного треку — це прев'ю
  if (fullTrackDuration <= audioDuration + 5) return lines
  // iTunes прев'ю береться з середини треку
  const previewOffset = (fullTrackDuration - audioDuration) / 2
  const shifted = shiftLrcForPreview(lines, previewOffset, audioDuration)
  // Якщо після зсуву майже нічого не лишилось — повертаємо оригінал
  // (буває якщо lrclib дав текст іншої версії пісні)
  return shifted.length >= 2 ? shifted : lines
}
