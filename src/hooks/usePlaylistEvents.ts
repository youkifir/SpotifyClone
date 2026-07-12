// Глобальна шина подій для змін плейлистів.
// Дозволяє PlaylistPage повідомити Sidebar (і будь-який інший компонент)
// про зміну назви, аватарки або кількості треків — без перезавантаження сторінки.

const playlistEventTarget = new EventTarget()
const PLAYLIST_CHANGED = 'playlist-changed'

export interface PlaylistChangedDetail {
  _id: string
  name?: string
  image?: string
  songCount?: number
}

export function emitPlaylistChanged(detail: PlaylistChangedDetail) {
  playlistEventTarget.dispatchEvent(
    new CustomEvent(PLAYLIST_CHANGED, { detail })
  )
}

export function onPlaylistChanged(cb: (detail: PlaylistChangedDetail) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<PlaylistChangedDetail>).detail)
  playlistEventTarget.addEventListener(PLAYLIST_CHANGED, handler)
  return () => playlistEventTarget.removeEventListener(PLAYLIST_CHANGED, handler)
}