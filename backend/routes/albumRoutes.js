const express = require('express');
const router = express.Router();
const { getAlbums, getAlbumById, createAlbum } = require('../controllers/albumController');

router.get('/', getAlbums);
router.get('/:id', getAlbumById);
router.post('/', createAlbum);

module.exports = router;
