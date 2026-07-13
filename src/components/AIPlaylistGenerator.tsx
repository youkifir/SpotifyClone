import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/usePlayer'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000/api'

interface GeneratedPlaylist {
  name: string
  description: string
  songIds: string[]
  songNames: string[]
}

export default function AIPlaylistGenerator() {
  const { token } = useAuth()
  const { songsData } = usePlayer()
  const navigate = useNavigate()

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusText, setStatusText] = useState('')
  const [result, setResult] = useState<GeneratedPlaylist | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!token) return
    setStatus('loading')
    setResult(null)
    setCreatedId(null)

    try {
      // 1. Отримуємо історію прослуховування
      setStatusText('Аналізую твої смаки...')
      const histRes = await fetch(`${API_BASE}/auth/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const histData = await histRes.json()
      const history: Array<{ song: { name: string; artist?: string; _id?: string } }> =
        histData.data?.history || histData.history || []

      // 2. Будуємо список унікальних треків з каталогу для Claude
      const catalogSummary = songsData
        .slice(0, 80)
        .map((s) => `${s.id}|||${s.name}|||${s.artist || s.desc || ''}`)
        .join('\n')

      // 3. Будуємо список прослуханих треків
      const listenedSummary = history
        .filter((h) => h.song)
        .slice(0, 30)
        .map((h) => `${h.song.name}${h.song.artist ? ` — ${h.song.artist}` : ''}`)
        .join('\n')

      if (!listenedSummary) {
        // Нема історії — робимо плейлист на основі всього каталогу
        setStatusText('Підбираю треки...')
      }

      setStatusText('Claude підбирає треки...')

      // 4. Запит до Claude API
      const prompt = listenedSummary
        ? `Ти — музичний куратор. Юзер слухав ці треки:\n${listenedSummary}\n\nЗ наступного каталогу (формат: id|||назва|||артист) вибери 8-12 треків які найбільше підійдуть цьому слухачу за стилем і настроєм:\n${catalogSummary}\n\nПоверни ТІЛЬКИ JSON без коментарів:\n{"name":"назва плейлиста (коротка, 2-4 слова)","description":"1 речення чому ці треки підійдуть","songIds":["id1","id2",...],"songNames":["назва1","назва2",...]}`
        : `Ти — музичний куратор. З наступного каталогу (формат: id|||назва|||артист) вибери 10 найцікавіших треків для нового слухача:\n${catalogSummary}\n\nПоверни ТІЛЬКИ JSON без коментарів:\n{"name":"назва плейлиста (коротка, 2-4 слова)","description":"1 речення опис","songIds":["id1","id2",...],"songNames":["назва1","назва2",...]}`

      // Запит через бекенд-проксі — API-ключ на сервері, не в браузері
      const claudeRes = await fetch(`${API_BASE}/ai-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      })

      if (!claudeRes.ok) {
        const errData = await claudeRes.json().catch(() => ({}))
        throw new Error(errData.message || `Помилка сервера ${claudeRes.status}`)
      }

      const claudeData = await claudeRes.json()
      const rawText = claudeData.content?.map((b: any) => b.text || '').join('') || ''

      // 5. Парсимо JSON з відповіді
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Не вдалося отримати відповідь від AI')

      const parsed: GeneratedPlaylist = JSON.parse(jsonMatch[0])

      // Фільтруємо тільки ті id що реально є в каталозі
      const validIds = parsed.songIds.filter((id) =>
        songsData.some((s) => String(s.id) === String(id))
      )
      if (validIds.length === 0) throw new Error('AI не знайшов підходящих треків')

      parsed.songIds = validIds
      setResult(parsed)
      setStatus('success')
      setStatusText('')
    } catch (e: any) {
      console.error(e)
      setStatus('error')
      setStatusText(e.message || 'Щось пішло не так')
    }
  }, [token, songsData])

  const createPlaylist = useCallback(async () => {
    if (!result || !token) return
    setStatus('loading')
    setStatusText('Створюю плейлист...')

    try {
      // 1. Створюємо плейлист
      const createRes = await fetch(`${API_BASE}/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: result.name, description: result.description }),
      })
      const createData = await createRes.json()
      const playlistId = createData._id || createData.data?._id
      if (!playlistId) throw new Error('Не вдалося створити плейлист')

      // 2. Додаємо треки по одному
      for (const songId of result.songIds) {
        await fetch(`${API_BASE}/playlists/${playlistId}/songs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ songId }),
        })
      }

      setCreatedId(playlistId)
      setStatus('success')
      setStatusText('')
    } catch (e: any) {
      setStatus('error')
      setStatusText(e.message || 'Помилка при створенні')
    }
  }, [result, token])

  if (!token) return null

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-5 sm:p-6 border border-white/5">
      {/* Декоративні кола */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-[#1db954]/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">

        {/* Іконка AI */}
        <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1db954] to-[#158a3e] flex items-center justify-center shadow-lg shadow-[#1db954]/20">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" fill="white"/>
            <circle cx="5" cy="5" r="1.5" fill="white" opacity="0.6"/>
            <circle cx="19" cy="19" r="1.5" fill="white" opacity="0.6"/>
          </svg>
        </div>

        {/* Текст */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base sm:text-lg leading-tight">
            AI-плейлист для тебе
          </p>
          <p className="text-neutral-400 text-sm mt-0.5">
            {status === 'idle' && 'Claude проаналізує твою музику і підбере схожі треки'}
            {status === 'loading' && (
              <span className="flex items-center gap-2">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1db954] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#1db954] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#1db954] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                {statusText}
              </span>
            )}
            {status === 'error' && <span className="text-red-400">{statusText}</span>}
            {status === 'success' && result && !createdId && (
              <span className="text-[#1db954]">✓ Готово — «{result.name}»</span>
            )}
            {createdId && <span className="text-[#1db954]">✓ Плейлист створено!</span>}
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex items-center gap-2 shrink-0">
          {status === 'idle' && (
            <button
              onClick={generate}
              className="ripple-btn bg-[#1db954] hover:bg-[#1ed760] text-black text-sm font-bold px-5 py-2 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#1db954]/20"
            >
              Згенерувати
            </button>
          )}

          {status === 'loading' && (
            <button disabled className="bg-[#1db954]/40 text-black text-sm font-bold px-5 py-2 rounded-full cursor-not-allowed">
              Зачекай...
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={generate}
              className="ripple-btn bg-[#333] hover:bg-[#444] text-white text-sm font-bold px-5 py-2 rounded-full transition-all hover:scale-105"
            >
              Спробувати знову
            </button>
          )}

          {status === 'success' && result && !createdId && (
            <div className="flex gap-2">
              <button
                onClick={generate}
                title="Інший варіант"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-105"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
              <button
                onClick={createPlaylist}
                className="ripple-btn bg-[#1db954] hover:bg-[#1ed760] text-black text-sm font-bold px-5 py-2 rounded-full transition-all hover:scale-105 active:scale-95"
              >
                Зберегти
              </button>
            </div>
          )}

          {createdId && (
            <button
              onClick={() => navigate(`/playlist/${createdId}`)}
              className="ripple-btn bg-white hover:bg-neutral-200 text-black text-sm font-bold px-5 py-2 rounded-full transition-all hover:scale-105"
            >
              Відкрити →
            </button>
          )}
        </div>
      </div>

      {/* Превью треків */}
      {status === 'success' && result && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">
            {result.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {result.songNames.slice(0, 8).map((name, i) => (
              <span key={i} className="text-xs bg-white/10 text-neutral-300 px-2.5 py-1 rounded-full">
                {name}
              </span>
            ))}
            {result.songNames.length > 8 && (
              <span className="text-xs bg-white/10 text-neutral-500 px-2.5 py-1 rounded-full">
                +{result.songNames.length - 8}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}