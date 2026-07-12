import React from 'react'
import { useLanguage } from '../context/LanguageContext'

interface DevicesMenuProps {
  isOpen: boolean
  onClose: () => void
}

const DevicesMenu: React.FC<DevicesMenuProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage()

  if (!isOpen) return null

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[70]" />
      <div className="absolute bottom-full right-0 mb-3 w-64 bg-[#282828] border border-zinc-700 rounded-lg shadow-2xl z-[71] overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-700">
          <p className="text-white font-semibold text-sm">{t('connectDevice')}</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 shrink-0 rounded-full bg-[#1db954]/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1db954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm truncate">{t('thisDevice')}</p>
            <p className="text-xs text-zinc-400 truncate">{t('webPlayer')}</p>
          </div>
          <span className="text-[#1db954] text-xs font-semibold shrink-0">{t('active')}</span>
        </div>
      </div>
    </>
  )
}

export default DevicesMenu
