const express = require('express');
const router = express.Router();
const { getAlbums, getDailyAlbums, getAlbumById, createAlbum, updateAlbum, deleteAlbum } = require('../controllers/albumController');
const { protect, isMusician, isAdmin } = require('../middleware/auth');

router.get('/', getAlbums);
router.get('/daily', getDailyAlbums); // ← нова підбірка альбомів, оновлюється раз на день
router.get('/:id', getAlbumById);

// Музикант може створювати альбоми і редагувати свої, адмін — будь-які
router.post('/', protect, isMusician, createAlbum);
router.put('/:id', protect, isMusician, updateAlbum);
router.delete('/:id', protect, isAdmin, deleteAlbum); // видаляти може тільки адмін

module.exports = router;