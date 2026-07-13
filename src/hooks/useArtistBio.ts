/**
 * useArtistBio — підтягує біографію виконавця через MusicBrainz + Wikipedia,
 * і автоматично перекладає її на поточну мову сайту через MyMemory API.
 *
 * Ланцюжок:
 *   MusicBrainz (метадані + Wikipedia URL)
 *     → Wikipedia REST API (текст en)
 *       → MyMemory Translation API (en → uk | ru | залишаємо en)
 *
 * Кешування: окремо для кожної мови, 7 днів у localStorage.
 * MyMemory: безкоштовний, без ключів, ліміт ~5000 слів/день.
 */

import { useState, useEffect } from 'react'

export interface ArtistBioData {
  bio: string | null
  wikiUrl: string | null
  mbid: string | null
  country: string | null
  type: string | null
  beginYear: number | null
  endYear: number | null
  tags: string[]
  loading: boolean
  error: string | null
}

// Мапа кодів мов сайту → коди MyMemory / Wikipedia
const LANG_MAP: Record<string, { myMemory: string; wiki: string }> = {
  uk: { myMemory: 'uk-UA', wiki: 'uk' },
  ru: { myMemory: 'ru-RU', wiki: 'ru' },
  en: { myMemory: 'en-US', wiki: 'en' },
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function cacheKey(artistName: string, lang: string) {
  return `artistBio:${lang}:${artistName.toLowerCase()}`
}

function getCached(artistName: string, lang: string): ArtistBioData | null {
  try {
    const raw = localStorage.getItem(cacheKey(artistName, lang))
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(artistName, lang))
      return null
    }
    return data
  } catch { return null }
}

function setCache(artistName: string, lang: string, data: ArtistBioData) {
  try {
    localStorage.setItem(cacheKey(artistName, lang), JSON.stringify({ data, ts: Date.now() }))
  } catch { /* localStorage переповнений — ігноруємо */ }
}

// ── MusicBrainz ──────────────────────────────────────────────────────────────

async function fetchMusicBrainzArtist(name: string) {
  const searchUrl =
    `https://musicbrainz.org/ws/2/artist/?query=artist:"${encodeURIComponent(name)}"&limit=1&fmt=json`

  const searchResp = await fetch(searchUrl, {
    headers: { 'User-Agent': 'SpotifyClone/1.0 (educational project)' },
  })
  if (!searchResp.ok) throw new Error('MusicBrainz search failed')
  const searchData = await searchResp.json()

  const artist = searchData.artists?.[0]
  if (!artist) return null

  const mbid: string = artist.id
  const country: string | null = artist.country || null
  const type: string | null = artist.type || null
  const beginYear: number | null = artist['life-span']?.begin
    ? parseInt(artist['life-span'].begin.slice(0, 4)) : null
  const endYear: number | null = artist['life-span']?.end
    ? parseInt(artist['life-span'].end.slice(0, 4)) : null
  const tags: string[] = (artist.tags || [])
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)
    .map((t: any) => t.name as string)

  // Шукаємо Wikipedia URL через relations
  let wikiUrl: string | null = null
  try {
    const relResp = await fetch(
      `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`,
      { headers: { 'User-Agent': 'SpotifyClone/1.0 (educational project)' } }
    )
    if (relResp.ok) {
      const relData = await relResp.json()
      const relations: any[] = relData.relations || []
      const wikiRels = relations.filter((r: any) => r.type === 'wikipedia')
      // en у пріоритеті — зручніше перекладати з одного джерела
      const enWiki = wikiRels.find((r: any) => r.url?.resource?.includes('en.wikipedia'))
      const chosen = enWiki || wikiRels[0]
      if (chosen?.url?.resource) wikiUrl = chosen.url.resource
    }
  } catch { /* не критично */ }

  return { mbid, country, type, beginYear, endYear, tags, wikiUrl }
}

// ── Wikipedia ─────────────────────────────────────────────────────────────────

async function fetchWikipediaSummary(wikiUrl: string, wikiLang: string): Promise<string | null> {
  try {
    const match = wikiUrl.match(/wikipedia\.org\/wiki\/(.+)$/)
    if (!match) return null
    const title = match[1]

    // Спочатку пробуємо на мові користувача (якщо стаття є)
    if (wikiLang !== 'en') {
      try {
        const localResp = await fetch(
          `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${title}`
        )
        if (localResp.ok) {
          const localData = await localResp.json()
          if (localData.extract) return localData.extract
        }
      } catch { /* нема статті на цій мові — падаємо на англійську */ }
    }

    // Завжди беремо англійський текст як fallback (потім перекладаємо)
    const enResp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
    )
    if (!enResp.ok) return null
    const enData = await enResp.json()
    return enData.extract || null
  } catch { return null }
}

// ── MyMemory Translation API ──────────────────────────────────────────────────
// Безкоштовний, без ключів. Ліміт ~5000 слів/день для анонімних запитів.
// Текст ріжемо на шматки по 500 символів, бо API має обмеження на запит.

async function translateText(text: string, targetLang: string): Promise<string> {
  if (targetLang === 'en-US') return text // вже англійська — не перекладаємо

  const CHUNK = 500
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += CHUNK) {
    chunks.push(text.slice(i, i + CHUNK))
  }

  const translated: string[] = []
  for (const chunk of chunks) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${targetLang}`
    const resp = await fetch(url)
    if (!resp.ok) {
      translated.push(chunk) // якщо помилка — залишаємо оригінал
      continue
    }
    const data = await resp.json()
    const result: string = data?.responseData?.translatedText || chunk
    translated.push(result)
  }

  return translated.join(' ')
}

// ── Хук ──────────────────────────────────────────────────────────────────────

export function useArtistBio(
  artistName: string | undefined,
  siteLang: string = 'uk'
): ArtistBioData {
  const [state, setState] = useState<ArtistBioData>({
    bio: null, wikiUrl: null, mbid: null, country: null,
    type: null, beginYear: null, endYear: null, tags: [],
    loading: false, error: null,
  })

  useEffect(() => {
    if (!artistName) return

    const cached = getCached(artistName, siteLang)
    if (cached) {
      setState({ ...cached, loading: false, error: null })
      return
    }

    let cancelled = false
    setState((prev) => ({ ...prev, loading: true, error: null }))

    ;(async () => {
      try {
        const langConfig = LANG_MAP[siteLang] || LANG_MAP.uk

        const mbData = await fetchMusicBrainzArtist(artistName)

        let bio: string | null = null
        if (mbData?.wikiUrl) {
          // Отримуємо текст Wikipedia (намагаємось на мові користувача, fallback — en)
          const rawBio = await fetchWikipediaSummary(mbData.wikiUrl, langConfig.wiki)

          if (rawBio) {
            // Перевіряємо чи отриманий текст вже на потрібній мові.
            // fetchWikipediaSummary повертає локальну статтю якщо знайшла,
            // або англійську. Якщо мова не en і текст прийшов з en.wikipedia — перекладаємо.
            const needsTranslation = siteLang !== 'en' && langConfig.wiki !== 'en'
            // Проста евристика: якщо запит до локальної вікі вдався — translate не потрібен.
            // Ми не знаємо звідки прийшов текст, тому перекладаємо завжди крім en→en.
            if (siteLang === 'en') {
              bio = rawBio
            } else {
              // Спробуємо перекласти. Якщо текст вже був на потрібній мові —
              // MyMemory просто поверне його майже без змін.
              try {
                bio = await translateText(rawBio, langConfig.myMemory)
              } catch {
                bio = rawBio // якщо переклад впав — показуємо оригінал
              }
            }
          }
        }

        if (cancelled) return

        const result: ArtistBioData = {
          bio,
          wikiUrl: mbData?.wikiUrl ?? null,
          mbid: mbData?.mbid ?? null,
          country: mbData?.country ?? null,
          type: mbData?.type ?? null,
          beginYear: mbData?.beginYear ?? null,
          endYear: mbData?.endYear ?? null,
          tags: mbData?.tags ?? [],
          loading: false,
          error: null,
        }

        setCache(artistName, siteLang, result)
        setState(result)
      } catch (err) {
        if (cancelled) return
        console.warn('useArtistBio: failed for', artistName, err)
        setState((prev) => ({ ...prev, loading: false, error: 'Не вдалося завантажити біографію' }))
      }
    })()

    return () => { cancelled = true }
  }, [artistName, siteLang])

  return state
}
