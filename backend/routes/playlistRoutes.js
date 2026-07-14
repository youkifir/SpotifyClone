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
  reorderPlaylist,
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

// PUT /:id/reorder — зберігає новий порядок треків (тільки власник або адмін)
router.put('/:id/reorder', reorderPlaylist);

module.exports = router;