import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import AlbumPage from './pages/AlbumPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="album/:id" element={<AlbumPage />} />
      </Route>
    </Routes>
  )
}

export default App
