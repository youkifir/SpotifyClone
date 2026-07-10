const Playlist = require('../models/Playlist');
const Song = require('../models/Song');

// Проверяет, что плейлист принадлежит текущему пользователю (или он админ).
// Возвращает сам плейлист, либо null и уже отправляет ответ об ошибке.
const findOwnedPlaylist = async (req, res, next) => {
  const playlist = await Playlist.findById(req.params.id);
  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found' });
    return null;
  }
  const isOwner = playlist.owner.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    res.status(403).json({ message: 'You do not have permission to access this playlist' });
    return null;
  }
  return playlist;
};

// GET /api/playlists/my — все плейлисты текущего пользователя
const getMyPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ owner: req.user.id })
      .populate('songs')
      .sort({ createdAt: -1 });
    res.json({ success: true, message: "Request completed successfully", data: playlists });
  } catch (err) {
    next(err);
  }
};

// GET /api/playlists/:id — один плейлист (только владелец или админ, либо isPublic: true)
const getPlaylistById = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id).populate('songs');
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found', errors: [] });

    const isOwner = playlist.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!playlist.isPublic && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You do not have permission to access this playlist', errors: [] });
    }

    res.json({ success: true, message: "Request completed successfully", data: playlist });
  } catch (err) {
    next(err);
  }
};

// POST /api/playlists — создать новый плейлист (владелец — текущий юзер)
const createPlaylist = async (req, res, next) => {
  try {
    const { name, description, image, isPublic } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Playlist name is required', errors: [] });

    const playlist = await Playlist.create({
      name,
      description,
      image,
      isPublic,
      owner: req.user.id,
      songs: [],
    });

    res.status(201).json({ success: true, message: "Created successfully", data: playlist });
  } catch (err) {
    next(err);
  }
};

// PUT /api/playlists/:id — переименовать / изменить описание, обложку, приватность
const updatePlaylist = async (req, res, next) => {
  try {
    const playlist = await findOwnedPlaylist(req, res);
    if (!playlist) return; // ответ уже отправлен внутри findOwnedPlaylist

    const { name, description, image, isPublic } = req.body;
    if (name !== undefined) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (image !== undefined) playlist.image = image;
    if (isPublic !== undefined) playlist.isPublic = isPublic;

    await playlist.save();
    res.json({ success: true, message: "Request completed successfully", data: playlist });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/playlists/:id
const deletePlaylist = async (req, res, next) => {
  try {
    const playlist = await findOwnedPlaylist(req, res);
    if (!playlist) return;

    await playlist.deleteOne();
    res.json({ message: 'Playlist deleted successfully', playlist });
  } catch (err) {
    next(err);
  }
};

// POST /api/playlists/:id/songs   body: { songId }
const addSongToPlaylist = async (req, res, next) => {
  try {
    const playlist = await findOwnedPlaylist(req, res);
    if (!playlist) return;

    const { songId } = req.body;
    if (!songId) return res.status(400).json({ success: false, message: 'songId is required', errors: [] });

    const song = await Song.findById(songId);
    if (!song) return res.status(404).json({ success: false, message: 'Song not found', errors: [] });

    const alreadyAdded = playlist.songs.some((id) => id.toString() === songId);
    if (alreadyAdded) {
      return res.status(409).json({ success: false, message: 'This song is already in the playlist', errors: [] });
    }

    playlist.songs.push(songId);
    await playlist.save();
    await playlist.populate('songs');

    res.status(201).json({ success: true, message: "Created successfully", data: playlist });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/playlists/:id/songs/:songId
const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const playlist = await findOwnedPlaylist(req, res);
    if (!playlist) return;

    const { songId } = req.params;
    playlist.songs = playlist.songs.filter((id) => id.toString() !== songId);
    await playlist.save();
    await playlist.populate('songs');

    res.json({ success: true, message: "Request completed successfully", data: playlist });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
};
