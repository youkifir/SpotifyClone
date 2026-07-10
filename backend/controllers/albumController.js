const Album = require('../models/Album');

// GET /api/albums
const getAlbums = async (req, res, next) => {
  try {
    const albums = await Album.find().sort({ createdAt: 1 });
    res.json({ success: true, message: "Request completed successfully", data: albums });
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
    res.status(201).json({ success: true, message: "Created successfully", data: album });
  } catch (err) {
    next(err);
  }
};

// PUT /api/albums/:id
const updateAlbum = async (req, res, next) => {
  try {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // вернуть уже обновлённый документ
      runValidators: true,
    });
    if (!album) return res.status(404).json({ success: false, message: 'Album not found', errors: [] });
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
    res.json({ message: 'Album deleted successfully', album });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAlbums, getAlbumById, createAlbum, updateAlbum, deleteAlbum };
