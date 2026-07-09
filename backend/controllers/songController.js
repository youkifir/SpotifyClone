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
// Ответ структурирован как в Spotify: { topArtist, songs }
const searchSongs = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ topArtist: null, songs: [] });

    const localResults = await Song.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { artist: { $regex: q, $options: 'i' } },
      ],
    });

    let combined = [...localResults];

    // Если своих результатов мало — добираем из iTunes
    if (localResults.length < 5) {
      let externalResults = [];
      try {
        const itunesTracks = await searchItunes(q, 10);

        const existingIds = new Set(
          (await Song.find({ externalId: { $in: itunesTracks.map((t) => t.externalId) } })).map(
            (s) => s.externalId
          )
        );

        const newTracks = itunesTracks.filter((t) => !existingIds.has(t.externalId));
        if (newTracks.length > 0) {
          await Song.insertMany(newTracks);
        }

        externalResults = await Song.find({
          externalId: { $in: itunesTracks.map((t) => t.externalId) },
        });
      } catch (externalErr) {
        console.error('⚠️ iTunes API недоступен:', externalErr.message);
      }
      combined = [...combined, ...externalResults];
    }

    const unique = Array.from(new Map(combined.map((s) => [String(s._id), s])).values());

    // Определяем "топ-исполнителя": если запрос похож на чьё-то имя артиста
    // среди найденного — выносим его отдельной карточкой наверх, как в Spotify.
    const qLower = q.toLowerCase();
    const artistCounts = {}; // имя артиста -> количество совпавших песен
    for (const song of unique) {
      if (song.artist && song.artist.toLowerCase().includes(qLower)) {
        artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
      }
    }

    let topArtist = null;
    const artistNames = Object.keys(artistCounts);
    if (artistNames.length > 0) {
      // берём исполнителя с наибольшим числом совпавших песен
      const bestArtist = artistNames.sort((a, b) => artistCounts[b] - artistCounts[a])[0];
      // ещё раз ищем ВСЕ песни этого исполнителя в базе (не только из текущей выдачи),
      // чтобы карточка показывала честное количество треков
      const allSongsByArtist = await Song.find({
        artist: { $regex: `^${bestArtist}$`, $options: 'i' },
      });
      topArtist = {
        name: bestArtist,
        image: allSongsByArtist[0]?.image || '',
        songCount: allSongsByArtist.length,
      };
    }

    // Остальные песни — те, что совпали по названию, но не обязательно от topArtist
    // (topArtist.name можно использовать на фронте, чтобы визуально не дублировать)
    res.json({ topArtist, songs: unique });
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

// PUT /api/songs/:id
const updateSong = async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!song) return res.status(404).json({ message: 'Песня не найдена' });
    res.json(song);
  } catch (err) {
    res.status(400).json({ message: 'Ошибка при обновлении песни', error: err.message });
  }
};

// DELETE /api/songs/:id
const deleteSong = async (req, res) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return res.status(404).json({ message: 'Песня не найдена' });
    res.json({ message: 'Песня удалена', song });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при удалении песни', error: err.message });
  }
};

module.exports = { getSongs, getSongById, searchSongs, createSong, getGenres, updateSong, deleteSong };
