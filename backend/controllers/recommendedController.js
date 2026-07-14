const User = require('../models/User');
const Song = require('../models/Song');
const Playlist = require('../models/Playlist');

async function askClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY не вказано у backend/.env');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}`);
  const data = await res.json();
  return data.content?.map((b) => b.text || '').join('') || '';
}

// POST /api/ai-playlist
const proxyAIPlaylist = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'prompt required' });
    const text = await askClaude(prompt);
    res.json({ success: true, content: [{ type: 'text', text }] });
  } catch (err) { next(err); }
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickSongs(pool, count, usedIds) {
  const fresh = pool.filter(s => !usedIds.has(String(s._id)));
  const sortedByPopularity = fresh.slice().sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  const topSlice = shuffle(sortedByPopularity.slice(0, Math.max(count * 3, 15)));
  const chosen = topSlice.slice(0, count);
  chosen.forEach(s => usedIds.add(String(s._id)));
  return chosen;
}

// GET /api/playlists/recommended
// Генерує 2-3 плейлисти на основі listenHistory, зберігає їх у БД (або оновлює існуючі),
// повертає як справжні плейлисти з _id — їх можна відкривати, слухати, зберігати.
const getRecommendedPlaylists = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({ path: 'listenHistory.song', select: 'name artist genre _id' })
      .populate({ path: 'likedSongs', select: 'name artist genre _id' })
      .lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const history = (user.listenHistory || []).filter(h => h.song).slice(-150).reverse();
    const liked = (user.likedSongs || []).filter(Boolean);

    if (history.length === 0 && liked.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Рахуємо ваги жанрів та артистів
    const genreScore = {};
    const artistScore = {};
    const bump = (map, key, weight) => { if (key) map[key] = (map[key] || 0) + weight; };

    history.forEach(({ song }, idx) => {
      const weight = 1 + Math.max(0, (30 - idx) / 30);
      bump(genreScore, song.genre, weight);
      bump(artistScore, song.artist, weight);
    });
    liked.forEach(song => {
      bump(genreScore, song.genre, 2);
      bump(artistScore, song.artist, 2);
    });

    const topGenres = Object.entries(genreScore).sort((a, b) => b[1] - a[1]).map(([g]) => g);
    const topArtists = Object.entries(artistScore).sort((a, b) => b[1] - a[1]).map(([a]) => a);

    // Знаходимо найбільш слуханий трек для кожного жанру/артиста (для заголовку)
    const songCount = {};
    const topSongByGenre = {};
    const topSongByArtist = {};
    history.forEach(({ song }) => {
      const sid = String(song._id);
      songCount[sid] = (songCount[sid] || 0) + 1;
      if (song.genre && (!topSongByGenre[song.genre] || songCount[sid] > (songCount[String(topSongByGenre[song.genre]._id)] || 0)))
        topSongByGenre[song.genre] = song;
      if (song.artist && (!topSongByArtist[song.artist] || songCount[sid] > (songCount[String(topSongByArtist[song.artist]._id)] || 0)))
        topSongByArtist[song.artist] = song;
    });

    if (topGenres.length === 0 && topArtists.length === 0)
      return res.json({ success: true, data: [] });

    const allSongs = await Song.find({}).select('_id name artist genre image playCount').limit(500).lean();
    if (allSongs.length === 0) return res.json({ success: true, data: [] });

    const alreadyKnownIds = new Set([
      ...history.map(h => String(h.song._id)),
      ...liked.map(s => String(s._id)),
    ]);
    const usedIds = new Set();

    // Визначаємо 2-3 плейлисти
    const configs = [];

    const genre1 = topGenres[0];
    if (genre1) {
      const pool = allSongs.filter(s => s.genre === genre1);
      let songs = pickSongs(pool.filter(s => !alreadyKnownIds.has(String(s._id))), 10, usedIds);
      if (songs.length < 6) songs = songs.concat(pickSongs(pool, 10 - songs.length, usedIds));
      if (songs.length >= 3) configs.push({
        slug: `rec_genre1_${req.user.id}`,
        name: topSongByGenre[genre1] ? `Бо ти слухав "${topSongByGenre[genre1].name}"` : `Твій жанр: ${genre1}`,
        description: topSongByGenre[genre1]?.artist ? `${topSongByGenre[genre1].artist} та схожі` : `Треки у жанрі ${genre1}`,
        songIds: songs.map(s => s._id),
        image: songs[0]?.image || '',
      });
    }

    const artist1 = topArtists[0];
    if (artist1) {
      const pool = allSongs.filter(s => s.artist === artist1);
      let songs = pickSongs(pool.filter(s => !alreadyKnownIds.has(String(s._id))), 10, usedIds);
      if (songs.length < 6) songs = songs.concat(pickSongs(pool, 10 - songs.length, usedIds));
      if (songs.length >= 3) configs.push({
        slug: `rec_artist1_${req.user.id}`,
        name: `Більше від: ${artist1}`,
        description: topSongByArtist[artist1] ? `Бо ти слухав "${topSongByArtist[artist1].name}"` : `Виконавець, якого ти часто слухаєш`,
        songIds: songs.map(s => s._id),
        image: songs[0]?.image || '',
      });
    }

    const genre2 = topGenres.find(g => g !== genre1);
    if (genre2) {
      const pool = allSongs.filter(s => s.genre === genre2);
      let songs = pickSongs(pool.filter(s => !alreadyKnownIds.has(String(s._id))), 10, usedIds);
      if (songs.length < 6) songs = songs.concat(pickSongs(pool, 10 - songs.length, usedIds));
      if (songs.length >= 3) configs.push({
        slug: `rec_genre2_${req.user.id}`,
        name: topSongByGenre[genre2] ? `Бо ти слухав "${topSongByGenre[genre2].name}"` : `Відкрий: ${genre2}`,
        description: topSongByGenre[genre2]?.artist ? `${topSongByGenre[genre2].artist} та схожі` : `Схожа музика у жанрі ${genre2}`,
        songIds: songs.map(s => s._id),
        image: songs[0]?.image || '',
      });
    }

    // Зберігаємо/оновлюємо кожен плейліст у БД за slug (у description зберігаємо slug для пошуку)
    const savedPlaylists = [];
    for (const cfg of configs) {
      // Шукаємо існуючий рекомендований плейліст по slug (зберігаємо slug у description як маркер)
      let pl = await Playlist.findOne({ owner: req.user.id, name: cfg.name });
      if (pl) {
        // Оновлюємо треки і обкладинку
        pl.songs = cfg.songIds;
        pl.image = cfg.image;
        pl.description = cfg.description;
        await pl.save();
      } else {
        pl = await Playlist.create({
          name: cfg.name,
          description: cfg.description,
          image: cfg.image,
          owner: req.user.id,
          songs: cfg.songIds,
          isPublic: false,
          isRecommended: true,
        });
      }
      savedPlaylists.push(pl);
    }

    // Повертаємо як populate'd плейлисти
    const result = await Playlist.find({ _id: { $in: savedPlaylists.map(p => p._id) } })
      .populate({ path: 'songs', select: '_id name artist image duration genre' })
      .lean();

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// POST /api/playlists/recommended/save (залишаємо для сумісності)
const saveRecommendedPlaylist = async (req, res, next) => {
  try {
    const { name, description, songIds } = req.body;
    if (!name || !Array.isArray(songIds) || songIds.length === 0)
      return res.status(400).json({ success: false, message: 'name та songIds обовʼязкові' });

    const songs = await Song.find({ _id: { $in: songIds } }).select('_id image').lean();
    if (songs.length === 0) return res.status(400).json({ success: false, message: 'Треки не знайдено' });

    const playlist = await Playlist.create({
      name, description,
      image: songs[0]?.image || '',
      owner: req.user.id,
      songs: songs.map(s => s._id),
      isPublic: false,
    });
    res.status(201).json({ success: true, data: playlist });
  } catch (err) { next(err); }
};

module.exports = { proxyAIPlaylist, getRecommendedPlaylists, saveRecommendedPlaylist };