const express = require('express');
const router = express.Router();
const { getSongs, getSongById, searchSongs, createSong, getGenres, updateSong, deleteSong, getSongLyrics } = require('../controllers/songController');
const { protect, isAdmin } = require('../middleware/auth');

// ВАЖНО: /search и /genres должны идти раньше /:id, иначе Express подумает,
// что это id песни
router.get('/search', searchSongs);
router.get('/genres', getGenres);
router.get('/', getSongs);
router.get('/:id', getSongById);
router.get('/:id/lyrics', getSongLyrics); // текст песни, публично доступен всем

// Создавать, редактировать и удалять песни (в т.ч. загружать полные треки,
// а не 30-секундные превью из iTunes) может только админ
router.post('/', protect, isAdmin, createSong);
router.put('/:id', protect, isAdmin, updateSong);
router.delete('/:id', protect, isAdmin, deleteSong);

module.exports = router;
