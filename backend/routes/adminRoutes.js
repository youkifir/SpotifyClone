const express = require('express');
const router = express.Router();
const { getMusicianRequests, handleMusicianRequest, getStats, getAllUsers } = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/auth');

// Всі адмін-роути захищені: потрібен токен + роль admin
router.use(protect, isAdmin);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.get('/musician-requests', getMusicianRequests);
router.put('/musician-requests/:userId', handleMusicianRequest);

module.exports = router;
