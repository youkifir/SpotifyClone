/**
 * Перевикористовувані екрани стану:
 *  - ErrorScreen    — помилка API / мережі
 *  - OfflineScreen  — немає мережі / сервер недоступний
 *  - EmptyScreen    — немає даних
 *  - LoadingScreen  — завантаження
 *  - SkeletonCard   — плейсхолдер картки під час завантаження
 */

interface ErrorScreenProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
  /** Якщо true — показуємо іконку Wi-Fi (offline), інакше — загальна помилка */
  offline?: boolean
}

export function ErrorScreen({ message, onRetry, retryLabel = 'Спробувати ще раз', offline = false }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${offline ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
        {offline ? (
          /* Wi-Fi off icon */
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M8.5 16.5a5 5 0 0 1 7 0" />
            <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
            <path d="M5 13a10 10 0 0 1 5.24-2.76" />
            <circle cx="12" cy="20" r="1" />
          </svg>
        ) : (
          /* Alert circle icon */
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>

      <p className="text-white font-semibold text-base mb-1">
        {offline ? 'Немає з\'єднання' : 'Щось пішло не так'}
      </p>
      <p className="text-neutral-400 text-sm max-w-xs mb-5">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2 bg-[#1db954] text-black text-sm font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
          </svg>
          {retryLabel}
        </button>
      )}
    </div>
  )
}

interface EmptyScreenProps {
  title: string
  hint?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyScreen({ title, hint, icon, action }: EmptyScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-5">
        {icon ?? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b3b3b3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        )}
      </div>
      <p className="text-white font-semibold text-base mb-1">{title}</p>
      {hint && <p className="text-neutral-400 text-sm max-w-xs mb-5">{hint}</p>}
      {action}
    </div>
  )
}

interface LoadingScreenProps {
  label?: string
}

export function LoadingScreen({ label = 'Завантаження...' }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      <p className="text-neutral-400 text-sm">{label}</p>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-[#181818] rounded-xl p-3 animate-pulse shrink-0 w-36 sm:w-44 snap-start" style={{ scrollSnapAlign: 'start' }}>
      <div className="w-full aspect-square rounded-lg bg-[#2a2a2a] mb-3" />
      <div className="h-3 w-3/4 bg-[#2a2a2a] rounded mb-2" />
      <div className="h-2.5 w-1/2 bg-[#2a2a2a] rounded" />
    </div>
  )
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
          <div className="w-7 h-4 bg-[#2a2a2a] rounded" />
          <div className="w-10 h-10 rounded bg-[#2a2a2a] shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-3 w-2/3 bg-[#2a2a2a] rounded" />
            <div className="h-2.5 w-1/3 bg-[#2a2a2a] rounded" />
          </div>
          <div className="h-2.5 w-10 bg-[#2a2a2a] rounded" />
        </div>
      ))}
    </div>
  )
}
