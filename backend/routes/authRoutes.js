const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, getUsers, deleteUser } = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Admin-only user management
router.get('/users', protect, isAdmin, getUsers);
router.delete('/users/:id', protect, isAdmin, deleteUser);

module.exports = router;