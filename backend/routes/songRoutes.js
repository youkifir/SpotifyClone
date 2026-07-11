const express = require('express');
const router = express.Router();

const {
  getSongs, getSongById, searchSongs, createSong,
  getGenres, updateSong, deleteSong, getSongLyrics,
} = require('../controllers/songController');
const { protect, isAdmin, isMusician } = require('../middleware/auth');
=======
const { getSongs, getSongById, searchSongs, searchItunesPreview, createSong, getGenres, updateSong, deleteSong, getSongLyrics, getArtistSongs } = require('../controllers/songController');
const { protect, isAdmin } = require('../middleware/auth');


router.get('/search', searchSongs);
router.get('/genres', getGenres);
// Admin-only iTunes preview search (returns results without saving to DB)
router.get('/itunes-preview', protect, isAdmin, searchItunesPreview);
// Artist page — must be before /:id
router.get('/artist/:name', getArtistSongs);
router.get('/', getSongs);
router.get('/:id', getSongById);
router.get('/:id/lyrics', getSongLyrics);

// POST /api/songs/:id/play — фронтенд викликає коли починає грати пісню
router.post('/:id/play', async (req, res, next) => {
  try {
    const song = await require('../models/Song').findByIdAndUpdate(
      req.params.id,
      { $inc: { playCount: 1 } },
      { new: true }
    );
    if (!song) return res.status(404).json({ success: false, message: 'Song not found', errors: [] });
    res.json({ success: true, message: 'Play counted', data: { playCount: song.playCount } });
  } catch (err) { next(err); }
});

// Музикант може додавати і редагувати ТІЛЬКИ свої пісні, адмін — будь-які
router.post('/', protect, isMusician, createSong);
router.put('/:id', protect, isMusician, updateSong);
router.delete('/:id', protect, isMusician, deleteSong);

module.exports = router;