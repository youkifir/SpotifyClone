const express = require('express');
const router = express.Router();
const {
  register, login, getMe, updateProfile, updateAvatar,
  getLikedSongs, toggleLike,
  getUsers, deleteUser, googleLogin, facebookLogin 
} = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/auth');
const User = require('../models/User');

// --- Маршрути авторизації та профілю ---
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/facebook', facebookLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/avatar', protect, updateAvatar);

// --- Лайки ---
router.get('/likes', protect, getLikedSongs);
router.post('/likes/:songId', protect, toggleLike);

// --- Запит на роль музиканта ---
router.post('/request-musician', protect, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', errors: [] });
    }
    if (user.role === 'musician') {
      return res.status(400).json({ success: false, message: 'You are already a musician', errors: [] });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admins cannot apply for musician role', errors: [] });
    }
    if (user.musicianRequest?.status === 'pending') {
      return res.status(409).json({ success: false, message: 'You already have a pending request', errors: [] });
    }

    user.musicianRequest = { status: 'pending', message: '', requestedAt: new Date() };
    await user.save();

    res.json({
      success: true,
      message: 'Your request has been submitted. Wait for admin approval.',
      data: { musicianRequest: user.musicianRequest },
    });
  } catch (err) {
    next(err);
  }
});

// --- Адмін-панель ---
router.get('/users', protect, isAdmin, getUsers);
router.delete('/users/:id', protect, isAdmin, deleteUser);


// ─── Artist Follow & History ──────────────────────────────────────────────────

// GET /api/auth/history — історія прослуховування
router.get('/history', protect, async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId)
      .select('listenHistory')
      .populate({ path: 'listenHistory.song', select: 'name artist image duration', model: 'Song' })
      .lean();

    const history = (user?.listenHistory || [])
      .filter(h => h.song) // пропускаємо видалені треки
      .reverse();          // новіші першими

    const total = history.length;
    const page_data = history.slice(skip, skip + limit);

    // Статистика
    const allSongs  = history.map(h => h.song);
    const songCount = {};
    const artistCount = {};
    allSongs.forEach(s => {
      if (!s) return;
      songCount[s._id]   = (songCount[s._id]   || 0) + 1;
      artistCount[s.artist] = (artistCount[s.artist] || 0) + 1;
    });

    const topSongs = Object.entries(songCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, count]) => ({ song: allSongs.find(s => String(s._id) === id), count }));
      
    const topArtists = Object.entries(artistCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      success: true,
      data: {
        history: page_data,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalListens: total,
        uniqueSongs:   new Set(allSongs.map(s => s?._id)).size,
        uniqueArtists: new Set(allSongs.map(s => s?.artist)).size,
        topSongs,
        topArtists,
      }
    });
  } catch (err) { next(err); }
});

// GET /api/auth/deezer-artist?name=... — проксі для Deezer
router.get('/deezer-artist', async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const r = await fetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1`,
      { headers: { 'User-Agent': 'SpotifyClone/1.0' } }
    );
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Deezer unavailable' });
  }
});

// GET /api/auth/artists/following — отримуємо підписки юзера (використовує референси з бази та Deezer як фолбек)
router.get('/artists/following', protect, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Завантажуємо юзера разом із заповненими даними підписок (username та avatar)
    const user = await User.findById(userId)
      .select('following')
      .populate({ path: 'following', select: 'username avatar', model: 'User' })
      .lean();
    
    const followedUsers = user?.following || [];
    
    // Форматуємо підписки під очікування фронтенду `{ name, photo }`
    const enrichedArtists = await Promise.all(
      followedUsers.map(async (artist) => {
        // Якщо у нашого локального музиканта вже є аватарка в базі, використовуємо її
        if (artist.avatar) {
          return {
            name: artist.username,
            photo: artist.avatar
          };
        }

        // Якщо аватарки немає, робимо "м'який" запит до Deezer, щоб знайти гарне фото
        try {
          const deezerRes = await fetch(
            `https://api.deezer.com/search/artist?q=${encodeURIComponent(artist.username)}&limit=1`,
            { headers: { 'User-Agent': 'SpotifyClone/1.0' } }
          );
          if (deezerRes.ok) {
            const result = await deezerRes.json();
            const artistData = result.data?.[0];
            return {
              name: artist.username,
              photo: artistData?.picture_medium || null
            };
          }
        } catch (e) {
          console.error(`Не вдалося завантажити фото з Deezer для ${artist.username}:`, e);
        }
        
        return { name: artist.username, photo: null };
      })
    );

    res.json({ success: true, data: enrichedArtists });
  } catch (err) { 
    next(err); 
  }
});

// POST /api/auth/follow/:artistName — підписатись / відписатись (toggle)
router.post('/follow/:artistName', protect, async (req, res, next) => {
  try {
    const artistName = decodeURIComponent(req.params.artistName).trim();
    const userId = req.user.id || req.user._id;
    
    // 1. Знаходимо музиканта за його username в нашій базі даних
    const artist = await User.findOne({ username: artistName, role: 'musician' });
    if (!artist) {
      return res.status(404).json({ 
        success: false, 
        message: 'Musician not found in database. You can only follow registered musicians.' 
      });
    }

    // 2. Отримуємо профіль поточного користувача
    const user = await User.findById(userId).select('following');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', errors: [] });
    }

    const artistId = artist._id;
    const idx = user.following.indexOf(artistId);
    let following = false;

    // 3. Додаємо/видаляємо ID музиканта з масиву підписок
    if (idx === -1) {
      user.following.push(artistId);
      following = true;
    } else {
      user.following.splice(idx, 1);
      following = false;
    }
    
    await user.save();

    res.json({ 
      success: true, 
      data: { 
        following, 
        followingIds: user.following 
      } 
    });
  } catch (err) { 
    next(err); 
  }
});

module.exports = router;