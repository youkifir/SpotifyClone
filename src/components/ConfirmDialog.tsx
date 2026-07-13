import { useEffect } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** z-index класу контейнера — підніміть, якщо діалог показується поверх іншого модального вікна */
  zIndexClass?: string
}

function ConfirmDialog({
  isOpen,
  title = 'Підтвердіть дію',
  message,
  confirmText = 'Так',
  cancelText = 'Скасувати',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  zIndexClass = 'z-70',
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onCancel, onConfirm])

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px] confirm-overlay`}
      onClick={(e) => { e.stopPropagation(); onCancel() }}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
        className="confirm-panel bg-[#181818] border border-zinc-700 rounded-xl w-full max-w-sm p-6 shadow-2xl"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-white mb-2">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="text-sm text-zinc-400 mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-transparent border border-zinc-600 text-white text-sm font-semibold py-2.5 rounded-full hover:border-white transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 text-sm font-bold py-2.5 rounded-full transition-all hover:scale-104 active:scale-98 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer ${
              danger ? 'bg-red-500 text-white' : 'bg-green-500 text-black'
            }`}
          >
            {loading ? '...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
