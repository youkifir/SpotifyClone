import React, { useRef } from 'react'
import { assets } from '../assets/assets'
import { usePlayer } from '../context/usePlayer'

const formatTime = ({ minute, second }: { minute: number; second: number }) =>
  `${minute}:${second.toString().padStart(2, '0')}`

export const Player: React.FC = () => {
  const {
    track,
    playStatus,
    currentTime,
    totalTime,
    progress,
    volume,
    shuffle,
    loop,
    play,
    pause,
    previous,
    next,
    seekTo,
    changeVolume,
    toggleShuffle,
    toggleLoop,
  } = usePlayer()

  const seekBgRef = useRef<HTMLDivElement>(null)
  const volumeBgRef = useRef<HTMLDivElement>(null)

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = seekBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seekTo(Math.min(1, Math.max(0, ratio)))
  }

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = volumeBgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    changeVolume(ratio)
  }

  return (
    <div className='h-[10%] bg-black flex justify-between items-center text-white px-4'>
      <div className='hidden lg:flex items-center gap-4 w-1/4 min-w-0'>
        <img className='w-12 h-12 rounded object-cover shrink-0' src={track.image} alt={track.name} />
        <div className='min-w-0'>
          <p className='font-medium text-sm truncate'>{track.name}</p>
          <p className='text-xs opacity-70 truncate'>{track.desc.slice(0, 25)}</p>
        </div>
        <img className='w-4 cursor-pointer opacity-70 hover:opacity-100 transition shrink-0' src={assets.like_icon} alt="Like" />
      </div>

      <div className='flex flex-col items-center gap-1 m-auto w-full max-w-160'>
        <div className='flex items-center gap-4'>
          <img
            onClick={toggleShuffle}
            className={`w-4 cursor-pointer transition ${shuffle ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            style={shuffle ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
            src={assets.shuffle_icon}
            alt="Shuffle"
          />
          <img onClick={previous} className='w-4 cursor-pointer opacity-80 hover:opacity-100 transition' src={assets.prev_icon} alt="Previous" />
          {playStatus ? (
            <img onClick={pause} className='w-8 cursor-pointer hover:scale-105 transition' src={assets.pause_icon} alt="Pause" />
          ) : (
            <img onClick={play} className='w-8 cursor-pointer hover:scale-105 transition' src={assets.play_icon} alt="Play" />
          )}
          <img onClick={next} className='w-4 cursor-pointer opacity-80 hover:opacity-100 transition' src={assets.next_icon} alt="Next" />
          <img
            onClick={toggleLoop}
            className={`w-4 cursor-pointer transition ${loop ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            style={loop ? { filter: 'invert(56%) sepia(90%) saturate(500%) hue-rotate(80deg)' } : undefined}
            src={assets.loop_icon}
            alt="Loop"
          />
        </div>
        <div className='flex items-center gap-3 w-full text-xs text-[#b3b3b3]'>
          <p className='w-9 text-right shrink-0'>{formatTime(currentTime)}</p>
          <div
            ref={seekBgRef}
            onClick={handleSeekClick}
            className='flex-1 bg-[#4d4d4d] h-1 rounded-full cursor-pointer group relative'
          >
            <div
              className='h-1 rounded-full bg-white group-hover:bg-[#1db954] transition-colors relative'
              style={{ width: `${progress * 100}%` }}
            >
              <div className='absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition' />
            </div>
          </div>
          <p className='w-9 shrink-0'>{formatTime(totalTime)}</p>
        </div>
      </div>

      <div className='hidden lg:flex items-center gap-3 opacity-75 hover:opacity-100 transition w-1/4 justify-end'>
        <img className='w-4 cursor-pointer' src={assets.plays_icon} alt="Plays" />
        <img className='w-4 cursor-pointer' src={assets.mic_icon} alt="Lyrics" />
        <img className='w-4 cursor-pointer' src={assets.queue_icon} alt="Queue" />
        <img className='w-4 cursor-pointer' src={assets.speaker_icon} alt="Connect to a device" />
        <img className='w-4 cursor-pointer' src={assets.volume_icon} alt="Volume" />
        <div
          ref={volumeBgRef}
          onClick={handleVolumeClick}
          className='w-20 bg-[#4d4d4d] h-1 rounded cursor-pointer group'
        >
          <div
            className='bg-white group-hover:bg-[#1db954] h-1 rounded transition-colors'
            style={{ width: `${volume * 100}%` }}
          />
        </div>
        <img className='w-4 cursor-pointer' src={assets.mini_player_icon} alt="Miniplayer" />
        <img className='w-4 cursor-pointer' src={assets.zoom_icon} alt="Fullscreen" />
      </div>
    </div>
  )
}

export default Player
