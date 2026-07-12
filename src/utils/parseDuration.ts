/**
 * Парсить рядок тривалості (наприклад "3:45" або "1:02:10") у загальну
 * кількість секунд. Потрібно для числового сортування треків за тривалістю,
 * бо в базі duration зберігається як текстовий рядок, а не число.
 * Некоректні значення повертають 0.
 */
export function durationToSeconds(duration: string | undefined | null): number {
  if (!duration) return 0

  const parts = duration.split(':').map((p) => parseInt(p, 10))
  if (parts.some((p) => Number.isNaN(p))) return 0

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }
  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  }
  return parts[0] || 0
}
}
