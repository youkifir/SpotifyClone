const express = require('express');
const router = express.Router();
const {
  register, login, getMe, updateProfile, updateAvatar,
  getLikedSongs, toggleLike,
  getUsers, deleteUser, googleLogin, facebookLogin
} = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/auth');
const User = require('../models/User');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/facebook', facebookLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/avatar', protect, updateAvatar);

// Лайки
router.get('/likes', protect, getLikedSongs);
router.post('/likes/:songId', protect, toggleLike);

// Запит на музиканта
router.post('/request-musician', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role === 'musician') {
      return res.status(400).json({ success: false, message: 'You are already a musician', errors: [] });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admins cannot apply for musician role', errors: [] });
    }
    if (user.musicianRequest?.status === 'pending') {
      return res.status(409).json({ success: false, message: 'You already have a pending request', errors: [] });
    }
    user.musicianRequest = { status: 'pending', message: '', requestedAt: new Date() };
    await user.save();
    res.json({
      success: true,
      message: 'Your request has been submitted. Wait for admin approval.',
      data: { musicianRequest: user.musicianRequest },
    });
  } catch (err) {
    next(err);
  }
});

// Admin
router.get('/users', protect, isAdmin, getUsers);
router.delete('/users/:id', protect, isAdmin, deleteUser);

module.exports = router;