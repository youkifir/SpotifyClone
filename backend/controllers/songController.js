const Song = require('../models/Song');
const { searchItunes } = require('../utils/itunes');

// GET /api/songs  (можно фильтровать: /api/songs?album=<albumId>&genre=Pop)
const getSongs = async (req, res) => {
  try {
    const filter = {};
    if (req.query.album) filter.album = req.query.album;
    if (req.query.genre) filter.genre = req.query.genre;
    const songs = await Song.find(filter).sort({ createdAt: 1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при получении песен', error: err.message });
  }
};

// GET /api/songs/genres — список всех уникальных жанров, которые сейчас есть в базе
const getGenres = async (req, res) => {
  try {
    const genres = await Song.distinct('genre');
    res.json(genres.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при получении жанров', error: err.message });
  }
};

// GET /api/songs/:id
const getSongById = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'Песня не найдена' });
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при получении песни', error: err.message });
  }
};

// GET /api/songs/search?q=...
// Гибридный поиск: сначала своя MongoDB, а если там пусто/мало —
// добираем результаты из iTunes Search API и кэшируем их в базу.
const searchSongs = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const localResults = await Song.find({ name: { $regex: q, $options: 'i' } });

    // Если своих результатов достаточно — внешний API не дёргаем
    if (localResults.length >= 5) {
      return res.json(localResults);
    }

    let externalResults = [];
    let debugError = null;
    try {
      const itunesTracks = await searchItunes(q, 10);

      // Не сохраняем повторно то, что уже закэшировано (по externalId)
      const existingIds = new Set(
        (await Song.find({ externalId: { $in: itunesTracks.map((t) => t.externalId) } })).map(
          (s) => s.externalId
        )
      );

      const newTracks = itunesTracks.filter((t) => !existingIds.has(t.externalId));
      if (newTracks.length > 0) {
        await Song.insertMany(newTracks);
      }

      // Отдаём все найденные (и старые, и только что закэшированные)
      externalResults = await Song.find({
        externalId: { $in: itunesTracks.map((t) => t.externalId) },
      });
    } catch (externalErr) {
      // Если iTunes недоступен — не валим весь запрос, просто отдаём то, что нашли локально
      console.error('⚠️ iTunes API недоступен:', externalErr.message);
      debugError = externalErr.message; // ВРЕМЕННО: покажем ошибку прямо в ответе для отладки
    }

    // Объединяем локальные и внешние результаты, убирая дубликаты по _id
    const combined = [...localResults, ...externalResults];
    const unique = Array.from(new Map(combined.map((s) => [String(s._id), s])).values());

    if (debugError) {
      return res.json({ results: unique, _debugError: debugError });
    }
    res.json(unique);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при поиске', error: err.message });
  }
};

// POST /api/songs
const createSong = async (req, res) => {
  try {
    const song = await Song.create(req.body);
    res.status(201).json(song);
  } catch (err) {
    res.status(400).json({ message: 'Ошибка при создании песни', error: err.message });
  }
};

module.exports = { getSongs, getSongById, searchSongs, createSong, getGenres };
