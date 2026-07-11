const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
=======
const { register, login, getMe, updateProfile, getUsers, deleteUser } = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/auth');


router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);


// POST /api/auth/request-musician
// Звичайний юзер подає заявку на роль музиканта.
// Адмін побачить її в /api/admin/musician-requests
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

module.exports = router;
=======
// Admin-only user management
router.get('/users', protect, isAdmin, getUsers);
router.delete('/users/:id', protect, isAdmin, deleteUser);

module.exports = router;

