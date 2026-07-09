import React from 'react'
import { assets } from '../assets/assets'

export const Sidebar: React.FC = () => {
  return (
    <div className='w-[25%] h-full flex-col text-white hidden lg:flex shrink-0'>

      <div className='bg-[#121212] h-full rounded-lg p-2 flex flex-col gap-2'>

        <div className='p-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <img className='w-8' src={assets.stack_icon} alt="Library" />
            <p className='font-semibold'>Your Library</p>
          </div>
          <div className='flex items-center gap-4 px-1'>
             <img className='w-5 cursor-pointer opacity-70 hover:opacity-100 transition' src={assets.arrow_icon} alt="Arrow" />
             <img className='w-5 cursor-pointer opacity-70 hover:opacity-100 transition' src={assets.plus_icon} alt="Plus" />
          </div>
        </div>

        <div className='flex flex-col gap-4 px-2 overflow-y-auto'>
 
          <div className='p-4 bg-[#242424] rounded-lg flex flex-col items-start gap-1'>
            <h1 className='font-bold text-base text-white'>Create your first playlist</h1>
            <p className='text-sm text-white font-light opacity-90'>it's easy we will help you</p>
            <button className='bg-white text-black text-sm font-bold px-4 py-1.5 rounded-full mt-4 hover:scale-105 transition'>
              Create Playlist
            </button>
          </div>

          <div className='p-4 bg-[#242424] rounded-lg flex flex-col items-start gap-1'>
            <h1 className='font-bold text-base text-white'>Let's findsome podcasts to follow</h1>
            <p className='text-sm text-white font-light opacity-90'>we'll keep you update on new episodes</p>
            <button className='bg-white text-black text-sm font-bold px-4 py-1.5 rounded-full mt-4 hover:scale-105 transition'>
              Browse podcasts
            </button>
          </div>

        </div>

      </div>

    </div>
  )
}

export default Sidebar