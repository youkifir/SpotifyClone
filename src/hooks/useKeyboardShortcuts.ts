import { useEffect, useRef } from 'react'

interface ShortcutsProps {
    playStatus: boolean
    play: () => void
    pause: () => void
    audioRef: React.RefObject<HTMLAudioElement | null>
    seekTo: (ratio: number) => void
    volume: number
    changeVolume: (ratio: number) => void
    _hasTrack: boolean
}

export const useKeyboardShortcuts = ({
    playStatus,
    play,
    pause,
    audioRef,
    seekTo,
    volume,
    changeVolume,
    _hasTrack,
}: ShortcutsProps) => {
    // Храним предыдущую громкость для реализации Mute/Unmute
    const prevVolumeRef = useRef<number>(0.7)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Полный список тегов-исключений, где горячие клавиши должны быть отключены
            const target = e.target as HTMLElement
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return
            }

            // Если ни один трек еще не выбран, горячие клавиши плеера не должны срабатывать
            if (!_hasTrack) return

            const audio = audioRef.current
            if (!audio) return

            switch (e.code) {
                // Пробел — Play / Pause
                case 'Space':
                    e.preventDefault() // Отменяет скролл страницы пробелом
                    if (playStatus) {
                        pause()
                    } else {
                        play()
                    }
                    break

                // Стрелка влево — Перемотка назад на 5 секунд
                case 'ArrowLeft':
                    e.preventDefault()
                    if (audio.duration) {
                        const newTimeLeft = Math.max(0, audio.currentTime - 5)
                        seekTo(newTimeLeft / audio.duration)
                    }
                    break

                // Стрелка вправо — Перемотка вперед на 5 секунд
                case 'ArrowRight':
                    e.preventDefault()
                    if (audio.duration) {
                        const newTimeRight = Math.min(audio.duration, audio.currentTime + 5)
                        seekTo(newTimeRight / audio.duration)
                    }
                    break

                // Клавиша M (английская) — Включение / Выключение звука
                case 'KeyM':
                    e.preventDefault()
                    if (volume > 0) {
                        prevVolumeRef.current = volume // Запоминаем текущую громкость перед выключением
                        changeVolume(0)
                    } else {
                        // Возвращаем старую громкость, либо ставим 0.5, если она была слишком тихой
                        changeVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.5)
                    }
                    break

                default:
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [playStatus, play, pause, audioRef, seekTo, volume, changeVolume, _hasTrack])
}