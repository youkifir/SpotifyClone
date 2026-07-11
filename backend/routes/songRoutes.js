const express = require('express');
const router = express.Router();
const {
  getSongs, getSongById, searchSongs, searchItunesPreview,
  createSong, getGenres, updateSong, deleteSong,
  getSongLyrics, getArtistSongs,
} = require('../controllers/songController');
const { protect, isAdmin, isMusician } = require('../middleware/auth');

router.get('/search', searchSongs);
router.get('/genres', getGenres);
router.get('/itunes-preview', protect, isAdmin, searchItunesPreview);
router.get('/artist/:name', getArtistSongs);
router.get('/', getSongs);
router.get('/:id', getSongById);
router.get('/:id/lyrics', getSongLyrics);

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

router.post('/', protect, isMusician, createSong);
router.put('/:id', protect, isMusician, updateSong);
router.delete('/:id', protect, isMusician, deleteSong);

module.exports = router;