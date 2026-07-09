import React from 'react'
import { songsData, assets } from '../assets/assets'

export const Player: React.FC = () => {
  return (
    <div className='h-[10%] bg-black flex justify-between items-center text-white px-4'>
      <div className='hidden lg:flex items-center gap-4'>
        <img className='w-12' src={songsData[0].image} alt={songsData[0].name} />
        <div>
            <p className='font-medium text-sm'>{songsData[0].name}</p>
            <p className='text-xs opacity-70'>{songsData[0].desc.slice(0, 12)}</p>
        </div>
      </div>
      <div className='flex flex-col items-center gap-1 m-auto'>
        <div className='flex gap-4'>
            <img className='w-4 cursor-pointer opacity-80 hover:opacity-100 transition' src={assets.shuffle_icon} alt="Shuffle" />
            <img className='w-4 cursor-pointer opacity-80 hover:opacity-100 transition' src={assets.prev_icon} alt="Previous" />
            <img className='w-4 cursor-pointer hover:scale-105 transition' src={assets.play_icon} alt="Play" />
            <img className='w-4 cursor-pointer opacity-80 hover:opacity-100 transition' src={assets.next_icon} alt="Next" />
            <img className='w-4 cursor-pointer opacity-80 hover:opacity-100 transition' src={assets.loop_icon} alt="Loop" />
        </div>
        <div className='flex items-center gap-5 text-xs text-[#b3b3b3]'>
          <p>1:06</p>
          <div className='w-[60vw] max-w-125 bg-[#4d4d4d] h-1 rounded-full cursor-pointer group relative'>
              <hr className='h-1 border-none w-[30%] bg-white group-hover:bg-[#1db954] rounded-full transition-colors'/>
          </div>
          <p>3:20</p>
        </div>
      </div>
      <div className='hidden lg:flex items-center gap-3 opacity-75 hover:opacity-100 transition'>
          <img className='w-4 cursor-pointer' src={assets.plays_icon} alt="Plays" />
          <img className='w-4 cursor-pointer' src={assets.mic_icon} alt="Lyrics" />
          <img className='w-4 cursor-pointer' src={assets.queue_icon} alt="Queue" />
          <img className='w-4 cursor-pointer' src={assets.speaker_icon} alt="Connect to a device" />
          <img className='w-4 cursor-pointer' src={assets.volume_icon} alt="Volume" />
          <div className='w-20 bg-[#4d4d4d] h-1 rounded cursor-pointer group'>
            <div className='bg-white group-hover:bg-[#1db954] h-1 w-[70%] rounded transition-colors'></div>
          </div>
          
          <img className='w-4 cursor-pointer' src={assets.mini_player_icon} alt="Miniplayer" />
          <img className='w-4 cursor-pointer' src={assets.zoom_icon} alt="Fullscreen" />
      </div>

    </div>
  )
}

export default Player