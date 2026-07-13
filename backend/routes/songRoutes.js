const express = require('express');
const router = express.Router();
const {
  getSongs, getSongById, searchSongs, searchItunesPreview,
  createSong, getGenres, updateSong, deleteSong,
  getSongLyrics, getArtistSongs, getMySongs,
} = require('../controllers/songController');
const { protect, isAdmin, isMusician } = require('../middleware/auth');

router.get('/search', searchSongs);
router.get('/genres', getGenres);
router.get('/itunes-preview', protect, isMusician, searchItunesPreview);
router.get('/my', protect, isMusician, getMySongs);
router.get('/artist/:name', getArtistSongs);

// GET /api/songs/top-artists — топ виконавці по кількості треків і прослуховувань
// Фото береться з Deezer (реальне фото виконавця), fallback — обкладинка треку
router.get('/top-artists', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const artists = await require('../models/Song').aggregate([
      { $match: { artist: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$artist',
          songCount: { $sum: 1 },
          totalPlays: { $sum: '$playCount' },
          image: { $first: '$image' },
        },
      },
      { $sort: { totalPlays: -1, songCount: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          name: '$_id',
          songCount: 1,
          totalPlays: 1,
          image: 1,
        },
      },
    ]);

    // Паралельно підтягуємо реальні фото з Deezer для всіх виконавців
    const withPhotos = await Promise.all(
      artists.map(async (artist) => {
        try {
          const r = await fetch(
            `https://api.deezer.com/search/artist?q=${encodeURIComponent(artist.name)}&limit=1`,
            { headers: { 'User-Agent': 'SpotifyClone/1.0' }, signal: AbortSignal.timeout(3000) }
          );
          if (r.ok) {
            const d = await r.json();
            const found = d?.data?.[0];
            if (found?.picture_xl) {
              const nameMatch = found.name.toLowerCase() === artist.name.toLowerCase();
              const partialMatch = found.name.toLowerCase().includes(artist.name.split(' ')[0].toLowerCase());
              if (nameMatch || partialMatch) {
                return { ...artist, image: found.picture_xl };
              }
            }
          }
        } catch { /* fallback */ }
        return artist;
      })
    );

    res.json({ success: true, data: withPhotos });
  } catch (err) {
    next(err);
  }
});


router.get('/', getSongs);

// GET /api/songs/lrclib?track_name=...&artist_name=...
// Proxy to lrclib.net to avoid CORS issues from the browser
router.get('/lrclib', async (req, res) => {
  try {
    const { track_name, artist_name } = req.query
    if (!track_name) return res.status(400).json({ error: 'track_name required' })

    const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(track_name)}&artist_name=${encodeURIComponent(artist_name || '')}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SpotifyClone/1.0' }
    })

    if (!response.ok) return res.status(response.status).json({ error: 'lrclib error' })

    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: 'Proxy error', detail: err.message })
  }
})

router.get('/:id', getSongById);
router.get('/:id/lyrics', getSongLyrics);

router.post('/:id/play', async (req, res, next) => {
  try {
    const Song = require('../models/Song');
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $inc: { playCount: 1 } },
      { new: true }
    );
    if (!song) return res.status(404).json({ success: false, message: 'Song not found', errors: [] });

    // Якщо юзер авторизований — зберігаємо в history (max 500 записів)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        const User = require('../models/User');
        await User.findByIdAndUpdate(decoded.id, {
          $push: {
            listenHistory: {
              $each: [{ song: song._id, listenedAt: new Date() }],
              $slice: -500, // зберігаємо лише останні 500
            },
          },
        });
      } catch { /* токен невалідний або юзер не знайдений — ігноруємо */ }
    }

    res.json({ success: true, message: 'Play counted', data: { playCount: song.playCount } });
  } catch (err) { next(err); }
});

router.post('/', protect, isMusician, createSong);
router.put('/:id', protect, isMusician, updateSong);
router.delete('/:id', protect, isMusician, deleteSong);

module.exports = router;