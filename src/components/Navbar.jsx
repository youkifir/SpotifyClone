import React from 'react'
import { assets } from '../assets/assets'

const Navbar = () => {
  return (
    <div className='bg-[#121212] h-14 rounded-lg grid grid-cols-3 items-center px-4 w-full select-none shrink-0'>

      <div className='flex items-center justify-start'>
        <img 
          className='w-8 h-8 cursor-pointer hover:scale-105 transition' 
          src={assets.spotify_logo} 
          alt="Spotify" 
        />
      </div>

      <div className='flex items-center justify-center gap-2 w-full max-w-125 justify-self-center min-w-0'>
        <div className='bg-[#1f1f1f] p-3 rounded-full hover:bg-[#2a2a2a] hover:scale-105 cursor-pointer transition flex items-center justify-center w-11 h-11 shrink-0'>
          <img className='w-5' src={assets.home_icon} alt="Home" />
        </div>
        <div className='flex-1 bg-[#1f1f1f] h-11 rounded-full flex items-center justify-between px-4 hover:bg-[#2a2a2a] border border-transparent hover:border-[#3e3e3e] cursor-pointer transition text-[#b3b3b3] min-w-0'>
          <div className='flex items-center gap-2 min-w-0'>
            <img className='w-5 shrink-0' src={assets.search_icon} alt="Search" />
            <p className='text-sm font-medium truncate'>What do you want to play?</p>
          </div>
          <div className='flex items-center gap-3 shrink-0 pl-2'>
            <div className='w-[px] h-5 bg-[#3e3e3e]'></div>
            <svg 
              role="img" height="20" width="20" aria-hidden="true" 
              className='text-[#b3b3b3] hover:text-white transition' 
              viewBox="0 0 24 24" fill="none" stroke="currentColor" 
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
        </div>
      </div>

      <div className='flex items-center justify-end gap-3'>
        <button className='bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:scale-105 transition hidden xl:block shadow-sm'>
          Watch about Premium
        </button>
        <div className='bg-[#1f1f1f] p-2.5 rounded-full hover:bg-[#2a2a2a] hover:scale-105 cursor-pointer transition flex items-center justify-center w-9 h-9 text-[#b3b3b3] hover:text-white'>
          <svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1.5a3 3 0 0 0-3 3v2.37l-1.283 1.283A1 1 0 0 0 3 8.862V10.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.862a1 1 0 0 0-.717-.71l-1.283-1.282V4.5a3 3 0 0 0-3-3zM6.5 13a1.5 1.5 0 0 0 3 0h-3z"/>
          </svg>
        </div>
        <div className='w-9 h-9 rounded-full bg-[#282828] hover:scale-105 transition cursor-pointer flex items-center justify-center font-bold text-xs border border-[#3e3e3e] text-white uppercase'>
          U
        </div>
      </div>

    </div>
  )
}

export default Navbar