const express = require('express');
const router = express.Router();
const { getAlbums, getAlbumById, createAlbum, updateAlbum, deleteAlbum } = require('../controllers/albumController');
const { protect, isAdmin } = require('../middleware/auth');

router.get('/', getAlbums);
router.get('/:id', getAlbumById);

router.post('/', protect, isAdmin, createAlbum);
router.put('/:id', protect, isAdmin, updateAlbum);
router.delete('/:id', protect, isAdmin, deleteAlbum);

module.exports = router;
