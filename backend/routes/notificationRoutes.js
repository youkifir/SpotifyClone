const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');

// GET /api/notifications — отримати свої сповіщення (останні 50)
router.get('/', protect, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all — позначити всі як прочитані
router.patch('/read-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read — позначити одне як прочитане
router.patch('/:id/read', protect, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/notifications/follow/:musicianId — підписатись на музиканта
router.post('/follow/:musicianId', protect, async (req, res, next) => {
  try {
    const { musicianId } = req.params;
    if (musicianId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }
    const musician = await User.findOne({ _id: musicianId, role: { $in: ['musician', 'admin'] } });
    if (!musician) {
      return res.status(404).json({ success: false, message: 'Musician not found' });
    }
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { following: musicianId } });
    res.json({ success: true, message: 'Subscribed' });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/follow/:musicianId — відписатись від музиканта
router.delete('/follow/:musicianId', protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $pull: { following: req.params.musicianId } });
    res.json({ success: true, message: 'Unsubscribed' });
  } catch (err) { next(err); }
});

// GET /api/notifications/following — список ID музикантів, на яких підписаний поточний юзер
router.get('/following', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('following').lean();
    res.json({ success: true, data: user?.following || [] });
  } catch (err) { next(err); }
});

module.exports = router;
