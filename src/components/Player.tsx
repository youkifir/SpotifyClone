import { assets, songsData } from '../assets/assets'

// Це поки що лише каркас плеєра (верстка).
// Реальна логіка відтворення підʼєднається пізніше через PlayerContext / useAudioPlayer.
function Player() {
  const currentSong = songsData[0]

  return (
    <div className="h-[90px] shrink-0 bg-[#181818] border-t border-[#2a2a2a] px-4 flex items-center justify-between gap-4">
      {/* трек, що грає */}
      <div className="flex items-center gap-3 w-[30%] min-w-0">
        <img src={currentSong.image} alt="" className="w-14 h-14 rounded object-cover" />
        <div className="min-w-0">
          <p className="text-sm text-white truncate">{currentSong.name}</p>
          <p className="text-xs text-neutral-400 truncate">{currentSong.desc}</p>
        </div>
        <img src={assets.plus_icon} alt="" className="w-4 h-4 ml-2 hidden sm:block" />
      </div>

      {/* керування відтворенням */}
      <div className="flex-1 max-w-[45%] flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <img src={assets.shuffle_icon} alt="" className="w-4 h-4 cursor-pointer opacity-70 hover:opacity-100" />
          <img src={assets.prev_icon} alt="" className="w-4 h-4 cursor-pointer" />
          <img src={assets.play_icon} alt="" className="w-8 h-8 cursor-pointer" />
          <img src={assets.next_icon} alt="" className="w-4 h-4 cursor-pointer" />
          <img src={assets.loop_icon} alt="" className="w-4 h-4 cursor-pointer opacity-70 hover:opacity-100" />
        </div>
        <div className="flex items-center gap-2 w-full text-xs text-neutral-400">
          <span>0:00</span>
          <div className="flex-1 h-1 bg-[#4d4d4d] rounded-full">
            <div className="h-1 w-0 bg-white rounded-full" />
          </div>
          <span>{currentSong.duration}</span>
        </div>
      </div>

      {/* гучність та інше */}
      <div className="hidden md:flex items-center gap-3 w-[30%] justify-end">
        <img src={assets.mic_icon} alt="" className="w-4 h-4 opacity-70" />
        <img src={assets.queue_icon} alt="" className="w-4 h-4 opacity-70" />
        <img src={assets.speaker_icon} alt="" className="w-4 h-4 opacity-70" />
        <img src={assets.volume_icon} alt="" className="w-4 h-4 opacity-70" />
        <div className="w-20 h-1 bg-[#4d4d4d] rounded-full">
          <div className="h-1 w-2/3 bg-white rounded-full" />
        </div>
      </div>
    </div>
  )
}

export default Player
