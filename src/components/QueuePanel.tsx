import React from 'react'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'
import { useLanguage } from '../context/LanguageContext'

interface QueuePanelProps {
  isOpen: boolean
  onClose: () => void
}

const resolveImage = (path: string) => {
  if (!path) return ''
  return path.startsWith('http') || path.startsWith('data:') ? path : `http://localhost:5000/${path}`
}

const QueuePanel: React.FC<QueuePanelProps> = ({ isOpen, onClose }) => {
  const { track, playStatus, activeQueue, play, pause, playWithId } = usePlayer()
  const { t } = useLanguage()

  if (!isOpen) return null

  const currentIndex = activeQueue.findIndex((s) => s.id === track.id)
  const upNext = currentIndex >= 0 ? activeQueue.slice(currentIndex + 1) : activeQueue

  // Явно розрізняємо "клік по вже активному треку" (просто пауза/плей)
  // від "клік по іншому треку" (перемикання), щоб пауза точно зупиняла звук.
  const handleRowClick = (songId: string | number, isActive: boolean) => {
    if (isActive) {
      if (playStatus) pause()
      else play()
    } else {
      playWithId(songId)
    }
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 z-70" />
      <div className="fixed right-2 bottom-[calc(12%+8px)] lg:bottom-[calc(10%+8px)] top-2 w-[90vw] max-w-sm bg-[#121212] border border-zinc-800 rounded-lg z-71 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <h2 className="text-white font-bold text-base">{t('queue')}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {track.id && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-[#1db954] uppercase tracking-wide px-2 mb-1">
                {t('nowPlaying')}
              </p>
              <div className="flex items-center gap-3 p-2 rounded-md bg-white/5">
                <img
                  src={resolveImage(track.image)}
                  alt={track.name}
                  className="w-10 h-10 rounded object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#1db954] truncate">{track.name}</p>
                  <p className="text-xs text-zinc-400 truncate">{track.artist || track.desc}</p>
                </div>
                <button
                  onClick={() => { if (playStatus) pause(); else play() }}
                  className="w-7 h-7 shrink-0 flex items-center justify-center"
                >
                  <img src={playStatus ? assets.pause_icon : assets.play_icon} alt="" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide px-2 mb-1">{t('nextUp')}</p>
          {upNext.length === 0 ? (
            <p className="text-zinc-500 text-sm px-2 py-4">{t('emptyQueue')}</p>
          ) : (
            <div className="flex flex-col">
              {upNext.map((song) => {
                const isActive = song.id === track.id
                const isActivePlaying = isActive && playStatus
                return (
                  <div
                    key={song.id}
                    onClick={() => handleRowClick(song.id, isActive)}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer group"
                  >
                    <img
                      src={resolveImage(song.image)}
                      alt={song.name}
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>{song.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{song.artist || song.desc}</p>
                    </div>
                    <img
                      src={isActivePlaying ? assets.pause_icon : assets.play_icon}
                      alt=""
                      className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition shrink-0"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default QueuePanel
