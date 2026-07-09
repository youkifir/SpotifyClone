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

module.exports = { getAlbums, getAlbumById, createAlbum };
