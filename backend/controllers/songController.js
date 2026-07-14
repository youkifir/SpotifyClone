const Song = require('../models/Song');
const { searchItunes } = require('../utils/itunes');
const { fetchLyrics } = require('../utils/lyrics');

const getSongs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.album) filter.album = req.query.album;
    if (req.query.genre) filter.genre = req.query.genre;

    const songs = await Song.find(filter).sort({ createdAt: 1 });

    res.json({
      success: true,
      message: 'Songs retrieved successfully',
      data: songs,
    });
  } catch (err) {
    next(err);
  }
};

const getGenres = async (req, res, next) => {
  try {
    const genres = await Song.distinct('genre');

    res.json({
      success: true,
      message: 'Genres retrieved successfully',
      data: genres.filter(Boolean).sort(),
    });
  } catch (err) {
    next(err);
  }
};

const getSongById = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found',
        errors: [],
      });
    }

    res.json({
      success: true,
      message: 'Song retrieved successfully',
      data: song,
    });
  } catch (err) {
    next(err);
  }
};

const searchSongs = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        errors: [],
      });
    }

    const localResults = await Song.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { artist: { $regex: q, $options: 'i' } },
      ],
    });

    let combined = [...localResults];

    if (localResults.length < 5) {
      let externalResults = [];

      try {
        const itunesTracks = await searchItunes(q, 10);

        const existingIds = new Set(
          (
            await Song.find({
              externalId: { $in: itunesTracks.map((track) => track.externalId) },
            })
          ).map((song) => song.externalId)
        );

        const newTracks = itunesTracks.filter(
          (track) => !existingIds.has(track.externalId)
        );

        if (newTracks.length > 0) {
          await Song.insertMany(newTracks);
        }

        externalResults = await Song.find({
          externalId: { $in: itunesTracks.map((track) => track.externalId) },
        });
      } catch (externalErr) {
        console.error('⚠️ iTunes API is unavailable:', externalErr.message);
      }

      combined = [...combined, ...externalResults];
    }

    const uniqueSongs = Array.from(
      new Map(combined.map((song) => [String(song._id), song])).values()
    );

    const qLower = q.toLowerCase();
    const artistCounts = {};

    for (const song of uniqueSongs) {
      if (song.artist && song.artist.toLowerCase().includes(qLower)) {
        artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
      }
    }

    let topArtist = null;
    const artistNames = Object.keys(artistCounts);

    if (artistNames.length > 0) {
      const bestArtist = artistNames.sort(
        (a, b) => artistCounts[b] - artistCounts[a]
      )[0];

      const allSongsByArtist = await Song.find({
        artist: { $regex: `^${bestArtist}$`, $options: 'i' },
      });

      topArtist = {
        name: bestArtist,
        image: allSongsByArtist[0]?.image || '',
        songCount: allSongsByArtist.length,
      };
    }

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: {
        topArtist,
        songs: uniqueSongs,
      },
    });
  } catch (err) {
    next(err);
  }
};

const createSong = async (req, res, next) => {
  try {
    const song = await Song.create({
      ...req.body,
      uploadedBy: req.user?.id || null,
    });

    if (req.user?.id) {
      try {
        const uploader = await User.findById(req.user.id).select('username').lean();
        const subscribers = await User.find({ following: req.user.id }).select('_id').lean();
        if (subscribers.length > 0) {
          const notifications = subscribers.map(sub => ({
            recipient: sub._id,
            type: 'new_song',
            triggeredBy: req.user.id,
            title: song.name,
            artist: uploader?.username || song.artist || '',
            entityId: String(song._id),
          }));
          await Notification.insertMany(notifications);
        }
      } catch (notifErr) {
        console.error('Notification dispatch error:', notifErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Song created successfully',
      data: song,
    });
  } catch (err) {
    next(err);
  }
};

const updateSong = async (req, res, next) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found',
        errors: [],
      });
    }

    res.json({
      success: true,
      message: 'Song updated successfully',
      data: song,
    });
  } catch (err) {
    next(err);
  }
};

const deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found',
        errors: [],
      });
    }

    res.json({
      success: true,
      message: 'Song deleted successfully',
      data: song,
    });
  } catch (err) {
    next(err);
  }
};

const getSongLyrics = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found',
        errors: [],
      });
    }

    if (song.lyrics) {
      return res.json({
        success: true,
        message: 'Lyrics retrieved successfully',
        data: {
          lyrics: song.lyrics,
          cached: true,
        },
      });
    }

    let lyrics;

    try {
      lyrics = await fetchLyrics(song.artist, song.name);
    } catch (externalErr) {
      console.error('⚠️ Lyrics API is unavailable:', externalErr.message);

      return res.status(502).json({
        success: false,
        message: 'Lyrics service is temporarily unavailable',
        errors: [],
      });
    }

    if (!lyrics) {
      return res.status(200).json({
        success: false,
        message: 'Lyrics not found',
        errors: [],
      });
    }

    song.lyrics = lyrics;
    await song.save();

    res.json({
      success: true,
      message: 'Lyrics retrieved successfully',
      data: {
        lyrics,
        cached: false,
      },
    });
  } catch (err) {
    next(err);
  }
};

const searchItunesPreview = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        errors: [],
      });
    }

    const tracks = await searchItunes(q, 20);

    const externalIds = tracks.map((t) => t.externalId);
    const existing = await Song.find({ externalId: { $in: externalIds } }).select('externalId');
    const existingSet = new Set(existing.map((s) => s.externalId));

    const results = tracks.map((t) => ({
      ...t,
      alreadyAdded: existingSet.has(t.externalId),
    }));

    res.json({
      success: true,
      message: 'iTunes search completed',
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

const getArtistSongs = async (req, res, next) => {
  try {
    const artistName = decodeURIComponent(req.params.name || '').trim();

    if (!artistName) {
      return res.status(400).json({ success: false, message: 'Artist name is required' });
    }

    const localSongs = await Song.find({
      artist: { $regex: `^${artistName}$`, $options: 'i' },
    }).sort({ createdAt: 1 });

    let combined = [...localSongs];

    try {
      const itunesTracks = await searchItunes(artistName, 25);

      const filtered = itunesTracks.filter(
        (t) => t.artist && t.artist.toLowerCase() === artistName.toLowerCase()
      );

      if (filtered.length > 0) {
        const existingIds = new Set(
          (
            await Song.find({
              externalId: { $in: filtered.map((t) => t.externalId) },
            })
          ).map((s) => s.externalId)
        );

        const newTracks = filtered.filter((t) => !existingIds.has(t.externalId));
        if (newTracks.length > 0) {
          try {
            await Song.insertMany(newTracks, { ordered: false });
          } catch (insertErr) {
            if (insertErr.code !== 11000 && !(insertErr.writeErrors?.every?.((e) => e.code === 11000))) {
              console.error('insertMany error:', insertErr.message);
            }
          }
        }

        const itunesSongs = await Song.find({
          externalId: { $in: filtered.map((t) => t.externalId) },
        });

        combined = [...combined, ...itunesSongs];
      }
    } catch (itunesErr) {
      console.error('⚠️ iTunes API unavailable:', itunesErr.message);
    }

    const unique = Array.from(
      new Map(combined.map((s) => [String(s._id), s])).values()
    );

    let artistImage = unique[0]?.image || '';
    try {
      const deezerRes = await fetch(
        `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=5`,
        { headers: { 'User-Agent': 'SpotifyClone/1.0' } }
      );
      if (deezerRes.ok) {
        const deezerData = await deezerRes.json();
        const results = deezerData?.data || [];
        const artistNameLower = artistName.toLowerCase().trim();
        const deezerArtist = results.find((a) =>
          a.name.toLowerCase().trim() === artistNameLower
        );
        if (deezerArtist?.picture_xl) {
          artistImage = deezerArtist.picture_xl;
        }
      }
    } catch (deezerErr) {
      console.warn('Deezer artist photo unavailable:', deezerErr.message);
    }

    // ✅ musicianId прибрано
    res.json({
      success: true,
      data: {
        artist: artistName,
        image: artistImage,
        songs: unique,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getMySongs = async (req, res, next) => {
  try {
    const filter = req.user?.role === 'admin'
      ? {}
      : { uploadedBy: req.user.id };

    const songs = await Song.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Songs retrieved successfully',
      data: songs,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSongs,
  getSongById,
  searchSongs,
  searchItunesPreview,
  createSong,
  getGenres,
  updateSong,
  deleteSong,
  getSongLyrics,
  getArtistSongs,
  getMySongs,
};