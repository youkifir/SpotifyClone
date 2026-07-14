const Album = require('../models/Album');

// ── Daily Albums Cache ───────────────────────────────────────────────────────
// Зберігаємо підбірку альбомів у пам'яті і оновлюємо раз на день.
// При рестарті сервера кеш скидається — це нормально.
const DAILY_ALBUMS_COUNT = 8; // скільки альбомів показувати
let _dailyCache = null; // { albums: [], expiresAt: Date }

function isCacheValid() {
  return _dailyCache && _dailyCache.expiresAt > Date.now();
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getMidnightTomorrow() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime();
}

// GET /api/albums
const getAlbums = async (req, res, next) => {
  try {
    const albums = await Album.find().sort({ createdAt: 1 });
    res.json({ success: true, message: "Request completed successfully", data: albums });
  } catch (err) {
    next(err);
  }
};

// GET /api/albums/daily
// Повертає випадкову підбірку альбомів, що оновлюється раз на день (о 00:00).
// Якщо в БД менше DAILY_ALBUMS_COUNT альбомів — повертає всі.
const getDailyAlbums = async (req, res, next) => {
  try {
    if (isCacheValid()) {
      return res.json({
        success: true,
        message: "Request completed successfully",
        data: _dailyCache.albums,
        refreshesAt: new Date(_dailyCache.expiresAt).toISOString(),
      });
    }

    const all = await Album.find().lean();
    const picked = shuffleArray(all).slice(0, DAILY_ALBUMS_COUNT);

    _dailyCache = {
      albums: picked,
      expiresAt: getMidnightTomorrow(),
    };

    res.json({
      success: true,
      message: "Request completed successfully",
      data: picked,
      refreshesAt: new Date(_dailyCache.expiresAt).toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/albums/:id
const getAlbumById = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found', errors: [] });
    res.json({ success: true, message: "Request completed successfully", data: album });
  } catch (err) {
    next(err);
  }
};

// POST /api/albums
const createAlbum = async (req, res, next) => {
  try {
    const album = await Album.create(req.body);
    _dailyCache = null; // скидаємо кеш, щоб новий альбом міг потрапити в підбірку
    res.status(201).json({ success: true, message: "Created successfully", data: album });
  } catch (err) {
    next(err);
  }
};

// PUT /api/albums/:id
const updateAlbum = async (req, res, next) => {
  try {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!album) return res.status(404).json({ success: false, message: 'Album not found', errors: [] });
    _dailyCache = null; // скидаємо кеш після оновлення
    res.json({ success: true, message: "Request completed successfully", data: album });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/albums/:id
const deleteAlbum = async (req, res, next) => {
  try {
    const album = await Album.findByIdAndDelete(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found', errors: [] });
    _dailyCache = null; // скидаємо кеш після видалення
    res.json({ message: 'Album deleted successfully', album });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAlbums, getDailyAlbums, getAlbumById, createAlbum, updateAlbum, deleteAlbum };