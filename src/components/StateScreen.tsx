interface ErrorScreenProps {
  message?: string
  onRetry?: () => void
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6 gap-4">
      <p className="text-red-400 text-lg font-semibold">
        {message || 'Щось пішло не так'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition"
        >
          Спробувати ще раз
        </button>
      )}
    </div>
  )
}

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <p className="text-neutral-400 animate-pulse">{message || 'Завантаження…'}</p>
    </div>
  )
}
