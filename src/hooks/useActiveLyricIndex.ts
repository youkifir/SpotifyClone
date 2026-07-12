import { useMemo } from 'react'
import type { LrcLine } from './useLyrics'

// Повертає індекс активного рядка на основі поточного часу плеєра
export const useActiveLyricIndex = (
  lines: LrcLine[] | null,
  currentSeconds: number
): number => {
  return useMemo(() => {
    if (!lines || lines.length === 0) return -1

    let active = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentSeconds) {
        active = i
      } else {
        break
      }
    }
    return active
  }, [lines, currentSeconds])
}
