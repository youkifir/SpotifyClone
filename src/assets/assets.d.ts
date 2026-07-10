export interface Album {
  id: number
  name: string
  image: string
  desc: string
  bgColor: string
}

export interface Song {
  id: number
  name: string
  image: string
  file: string
  desc: string
  duration: string
}

export const assets: {
  bell_icon: string
  home_icon: string
  like_icon: string
  loop_icon: string
  mic_icon: string
  next_icon: string
  play_icon: string
  plays_icon: string
  prev_icon: string
  search_icon: string
  shuffle_icon: string
  speaker_icon: string
  stack_icon: string
  zoom_icon: string
  plus_icon: string
  arrow_icon: string
  mini_player_icon: string
  volume_icon: string
  queue_icon: string
  pause_icon: string
  arrow_left: string
  arrow_right: string
  spotify_logo: string
  clock_icon: string
}

export const albumsData: Album[]
export const songsData: Song[]