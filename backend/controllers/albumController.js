const Album = require('../models/Album');

// GET /api/albums
const getAlbums = async (req, res) => {
  try {
    const albums = await Album.find().sort({ createdAt: 1 });
    res.json(albums);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при получении альбомов', error: err.message });
  }
};

// GET /api/albums/:id
const getAlbumById = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ message: 'Альбом не найден' });
    res.json(album);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при получении альбома', error: err.message });
  }
};

// POST /api/albums
const createAlbum = async (req, res) => {
  try {
    const album = await Album.create(req.body);
    res.status(201).json(album);
  } catch (err) {
    res.status(400).json({ message: 'Ошибка при создании альбома', error: err.message });
  }
};

// PUT /api/albums/:id
const updateAlbum = async (req, res) => {
  try {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // вернуть уже обновлённый документ
      runValidators: true,
    });
    if (!album) return res.status(404).json({ message: 'Альбом не найден' });
    res.json(album);
  } catch (err) {
    res.status(400).json({ message: 'Ошибка при обновлении альбома', error: err.message });
  }
};

// DELETE /api/albums/:id
const deleteAlbum = async (req, res) => {
  try {
    const album = await Album.findByIdAndDelete(req.params.id);
    if (!album) return res.status(404).json({ message: 'Альбом не найден' });
    res.json({ message: 'Альбом удалён', album });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при удалении альбома', error: err.message });
  }
};

module.exports = { getAlbums, getAlbumById, createAlbum, updateAlbum, deleteAlbum };
