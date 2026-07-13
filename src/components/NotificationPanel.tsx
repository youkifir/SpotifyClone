import React, { useRef, useEffect } from 'react'
import { useNotifications } from '../context/NotificationContext.tsx'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'


interface Props {
  open: boolean
  onClose: () => void
}

const NotificationPanel: React.FC<Props> = ({ open, onClose }) => {
  const { notifications, unreadCount, loading, markAllRead, markRead } = useNotifications()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleNotifClick = async (notif: typeof notifications[0]) => {
    await markRead(notif._id)
    onClose()
    if (notif.entityId) {
      navigate(`/song/${notif.entityId}`)
    }
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return t('notifJustNow')
    if (min < 60) return `${min} ${t('notifMinAgo')}`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h} ${t('notifHourAgo')}`
    return `${Math.floor(h / 24)} ${t('notifDayAgo')}`
  }

  return (
    <div
      ref={panelRef}
      className='absolute right-0 top-12 z-50 w-80 sm:w-96 bg-[#282828] rounded-xl shadow-2xl border border-[#3e3e3e] overflow-hidden'
    >
      {/* Шапка */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-[#3e3e3e]'>
        <h3 className='text-white font-bold text-sm'>{t('notifTitle')}</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className='text-xs text-[#1db954] hover:underline transition'
          >
            {t('notifMarkAllRead')}
          </button>
        )}
      </div>

      {/* Список */}
      <div className='max-h-96 overflow-y-auto'>
        {loading && (
          <div className='flex items-center justify-center py-8 text-neutral-400 text-sm'>
            {t('loading')}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className='flex flex-col items-center justify-center py-10 gap-2 text-neutral-500'>
            <svg width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
              <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' />
              <path d='M13.73 21a2 2 0 0 1-3.46 0' />
            </svg>
            <p className='text-sm'>{t('notifEmpty')}</p>
          </div>
        )}

        {!loading && notifications.map(notif => (
          <div
            key={notif._id}
            onClick={() => handleNotifClick(notif)}
            className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#333] transition border-b border-[#333] last:border-none ${
              !notif.read ? 'bg-[#1db954]/5' : ''
            }`}
          >
            {/* Іконка */}
            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              !notif.read ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-[#3e3e3e] text-neutral-400'
            }`}>
              <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/>
              </svg>
            </div>

            {/* Текст */}
            <div className='flex-1 min-w-0'>
              <p className='text-white text-xs font-semibold truncate'>{notif.title}</p>
              <p className='text-neutral-400 text-xs truncate'>
                {notif.artist} · {t('notifNewSong')}
              </p>
              <p className='text-neutral-500 text-[10px] mt-0.5'>{timeAgo(notif.createdAt)}</p>
            </div>

            {/* Індикатор непрочитаного */}
            {!notif.read && (
              <div className='w-2 h-2 rounded-full bg-[#1db954] shrink-0 mt-2' />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default NotificationPanel
