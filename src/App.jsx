import Player from './components/Player'

function App() {
  return (
    <div className="h-screen bg-neutral-900">
      <div className="h-[90%] flex">
        <h1 className="text-red-500 p-4">Spotify Clone</h1>
      </div>
      

      <Player />
      <audio preload='auto'></audio>
    </div>
  )
}

export default App