const express = require('express');
const router = express.Router();
const {
  getMyPlaylists,
  getSharedPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
} = require('../controllers/playlistController');
const { getRecommendedPlaylists, saveRecommendedPlaylist } = require('../controllers/recommendedController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/my', getMyPlaylists);
router.get('/shared', getSharedPlaylists);
// Рекомендовані плейлисти на основі listenHistory — ПЕРЕД /:id щоб не перехоплювалось
router.get('/recommended', getRecommendedPlaylists);
router.post('/recommended/save', saveRecommendedPlaylist);
router.get('/:id', getPlaylistById);
router.post('/', createPlaylist);
router.put('/:id', updatePlaylist);
router.delete('/:id', deletePlaylist);

router.post('/:id/songs', addSongToPlaylist);
router.delete('/:id/songs/:songId', removeSongFromPlaylist);

module.exports = router;
// PUT /:id/reorder — зберігає новий порядок треків
router.put('/:id/reorder', async (req, res, next) => {
  try {
    const { songIds } = req.body // масив id треків у новому порядку
    if (!Array.isArray(songIds)) return res.status(400).json({ message: 'songIds required' })
    const Playlist = require('../models/Playlist')
    const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user.id })
    if (!playlist) return res.status(404).json({ message: 'Not found' })
    // Переставляємо songs відповідно до нового порядку
    const songMap = new Map(playlist.songs.map(s => [String(s), s]))
    playlist.songs = songIds.map(id => songMap.get(id)).filter(Boolean)
    await playlist.save()
    res.json({ success: true })
  } catch (err) { next(err) }
})