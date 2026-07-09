const express = require('express');
const router = express.Router();
const { getSongs, getSongById, searchSongs, createSong, getGenres } = require('../controllers/songController');

// ВАЖНО: /search и /genres должны идти раньше /:id, иначе Express подумает,
// что это id песни
router.get('/search', searchSongs);
router.get('/genres', getGenres);
router.get('/', getSongs);
router.get('/:id', getSongById);
router.post('/', createSong);

module.exports = router;
