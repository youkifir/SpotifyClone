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
const { protect } = require('../middleware/auth');

// Все роуты плейлистов требуют авторизации — это "особиста сторінка" юзера.
// isAdmin здесь не нужен: любой залогиненный пользователь управляет СВОИМИ
// плейлистами, а проверка на владельца сделана внутри контроллера.
router.use(protect);

router.get('/my', getMyPlaylists);
router.get('/shared', getSharedPlaylists);
router.get('/:id', getPlaylistById);
router.post('/', createPlaylist);
router.put('/:id', updatePlaylist);
router.delete('/:id', deletePlaylist);

router.post('/:id/songs', addSongToPlaylist);
router.delete('/:id/songs/:songId', removeSongFromPlaylist);

module.exports = router;