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

// POST /api/ai-playlist — проксі для фронту (Claude API ключ на сервері)
const proxyAIPlaylist = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'prompt required' });
    const text = await askClaude(prompt);
    res.json({ success: true, content: [{ type: 'text', text }] });
  } catch (err) { next(err); }
};

// Перемішати масив (Fisher–Yates)
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Обрати до `count` треків із `pool`, уникаючи id з `usedIds`.
// Бере топ-N за playCount (популярність), тасує їх, потім бере count — щоб плейлист не був завжди однаковим.
function pickSongs(pool, count, usedIds) {
  const fresh = pool.filter(s => !usedIds.has(String(s._id)));
  const sortedByPopularity = fresh.slice().sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  const topSlice = shuffle(sortedByPopularity.slice(0, Math.max(count * 3, 15)));
  const chosen = topSlice.slice(0, count);
  chosen.forEach(s => usedIds.add(String(s._id)));
  return chosen;
}

// GET /api/playlists/recommended
// Формує 2-3 плейлисти БЕЗ звернення до зовнішніх AI-сервісів —
// виключно на основі listenHistory / likedSongs юзера та каталогу треків у БД.
const getRecommendedPlaylists = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({ path: 'listenHistory.song', select: 'name artist genre _id' })
      .populate({ path: 'likedSongs', select: 'name artist genre _id' })
      .lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Останні 150 прослуховувань — свіжіші прослуховування важать трохи більше
    const history = (user.listenHistory || []).filter(h => h.song).slice(-150).reverse();
    const liked = (user.likedSongs || []).filter(Boolean);

    if (history.length === 0 && liked.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 1) Рахуємо "вагу" кожного жанру/артиста: недавні прослуховування + лайки (вагоміші)
    const genreScore = {};
    const artistScore = {};
    const bump = (map, key, weight) => { if (key) map[key] = (map[key] || 0) + weight; };

    history.forEach(({ song }, idx) => {
      // трохи більша вага для недавніших прослуховувань (history вже відсортований від найновіших)
      const weight = 1 + Math.max(0, (30 - idx) / 30);
      bump(genreScore, song.genre, weight);
      bump(artistScore, song.artist, weight);
    });
    liked.forEach(song => {
      bump(genreScore, song.genre, 2); // лайк важить як 2 прослуховування
      bump(artistScore, song.artist, 2);
    });

    const topGenres = Object.entries(genreScore).sort((a, b) => b[1] - a[1]).map(([g]) => g);
    const topArtists = Object.entries(artistScore).sort((a, b) => b[1] - a[1]).map(([a]) => a);

    if (topGenres.length === 0 && topArtists.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 2) Каталог треків для підбору
    const allSongs = await Song.find({}).select('_id name artist genre image playCount').limit(500).lean();
    if (allSongs.length === 0) return res.json({ success: true, data: [] });

    // Треки, які юзер вже чув/лайкнув — щоб рекомендувати радше нове, ніж повтори
    const alreadyKnownIds = new Set([
      ...history.map(h => String(h.song._id)),
      ...liked.map(s => String(s._id)),
    ]);

    const usedIds = new Set(); // щоб один трек не потрапив у два плейлисти одночасно
    const playlists = [];

    // Плейлист 1: найулюбленіший жанр
    const genre1 = topGenres[0];
    if (genre1) {
      const pool = allSongs.filter(s => s.genre === genre1);
      let songs = pickSongs(pool.filter(s => !alreadyKnownIds.has(String(s._id))), 10, usedIds);
      if (songs.length < 6) {
        // не вистачає нового — добираємо з уже відомих цього жанру
        songs = songs.concat(pickSongs(pool, 10 - songs.length, usedIds));
      }
      if (songs.length >= 3) {
        playlists.push({
          name: `Улюблений жанр: ${genre1}`,
          description: `Треки в жанрі ${genre1}, підібрані на основі твоєї історії прослуховувань`,
          genre: genre1,
          songs,
          songIds: songs.map(s => String(s._id)),
        });
      }
    }

    // Плейлист 2: найулюбленіший артист (по всіх жанрах цього артиста)
    const artist1 = topArtists[0];
    if (artist1) {
      const pool = allSongs.filter(s => s.artist === artist1);
      let songs = pickSongs(pool.filter(s => !alreadyKnownIds.has(String(s._id))), 10, usedIds);
      if (songs.length < 6) {
        songs = songs.concat(pickSongs(pool, 10 - songs.length, usedIds));
      }
      if (songs.length >= 3) {
        playlists.push({
          name: `Більше від ${artist1}`,
          description: `Треки виконавця ${artist1}, якого ти часто слухаєш`,
          genre: '',
          songs,
          songIds: songs.map(s => String(s._id)),
        });
      }
    }

    // Плейлист 3: другий за популярністю жанр (якщо відрізняється від першого)
    const genre2 = topGenres.find(g => g !== genre1);
    if (genre2) {
      const pool = allSongs.filter(s => s.genre === genre2);
      let songs = pickSongs(pool.filter(s => !alreadyKnownIds.has(String(s._id))), 10, usedIds);
      if (songs.length < 6) {
        songs = songs.concat(pickSongs(pool, 10 - songs.length, usedIds));
      }
      if (songs.length >= 3) {
        playlists.push({
          name: `Відкрий для себе: ${genre2}`,
          description: `Ще один жанр з твоєї історії прослуховувань — ${genre2}`,
          genre: genre2,
          songs,
          songIds: songs.map(s => String(s._id)),
        });
      }
    }

    res.json({ success: true, data: playlists });
  } catch (err) { next(err); }
};

// POST /api/playlists/recommended/save
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