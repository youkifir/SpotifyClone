/**
 * Утиліти для централізованої обробки помилок API.
 * Розрізняє: мережеві помилки, HTTP-помилки сервера, таймаути, порожні відповіді.
 */

export type ApiErrorKind =
  | 'network'    // fetch кинув TypeError — сервер недоступний / немає мережі
  | 'timeout'    // запит перевищив ліміт часу
  | 'auth'       // 401 / 403
  | 'not_found'  // 404
  | 'server'     // 5xx
  | 'client'     // 4xx (крім 401/403/404)
  | 'unknown'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

/** Визначає тип помилки з HTTP-статусу */
function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 404) return 'not_found'
  if (status >= 500) return 'server'
  return 'client'
}

/**
 * Обгортка над fetch з:
 *  - таймаутом (default 10s)
 *  - розпізнаванням мережевих помилок
 *  - перевіркою res.ok і викиданням ApiError
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort('timeout'), timeoutMs)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timerId)

    if (!res.ok) {
      const kind = kindFromStatus(res.status)
      // Спробуємо прочитати повідомлення з JSON-тіла
      let serverMsg: string | undefined
      try {
        const body = await res.clone().json()
        serverMsg = body?.message
      } catch {
        // ігноруємо помилку парсингу
      }
      throw new ApiError(kind, serverMsg || `HTTP ${res.status}`, res.status)
    }

    return res
  } catch (err) {
    clearTimeout(timerId)

    if (err instanceof ApiError) throw err

    if (err instanceof DOMException && err.name === 'AbortError') {
      // перевіряємо чи це таймаут або ручне скасування
      if ((err as any).message === 'timeout' || (err as any).reason === 'timeout') {
        throw new ApiError('timeout', 'Request timed out')
      }
      // якщо ні — прокидаємо як є (caller скасував)
      throw err
    }

    // TypeError: Failed to fetch / net::ERR_CONNECTION_REFUSED тощо
    if (err instanceof TypeError) {
      throw new ApiError('network', err.message)
    }

    throw new ApiError('unknown', String(err))
  }
}

/** Повертає true якщо це мережева помилка або таймаут */
export function isOfflineError(err: unknown): boolean {
  return (
    err instanceof ApiError && (err.kind === 'network' || err.kind === 'timeout')
  )
}

/** Людиночитабельне повідомлення для UI (українська) */
export function errorMessageUk(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case 'network':
        return 'Немає з\'єднання з сервером. Перевір мережу.'
      case 'timeout':
        return 'Сервер не відповідає. Спробуй пізніше.'
      case 'auth':
        return 'Потрібна авторизація. Увійди в акаунт.'
      case 'not_found':
        return 'Ресурс не знайдено.'
      case 'server':
        return 'Помилка сервера. Спробуй пізніше.'
      case 'client':
        return err.message || 'Неправильний запит.'
      default:
        return 'Щось пішло не так. Спробуй ще раз.'
    }
  }
  if (err instanceof Error) return err.message
  return 'Невідома помилка'
}
