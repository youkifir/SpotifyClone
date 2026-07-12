const User = require('../models/User');
const Song = require('../models/Song');
const Album = require('../models/Album');

// GET /api/admin/musician-requests
// Список усіх заявок зі статусом pending — для адмін-панелі
const getMusicianRequests = async (req, res, next) => {
  try {
    const requests = await User.find({ 'musicianRequest.status': 'pending' })
      .select('username email musicianRequest createdAt')
      .sort({ 'musicianRequest.requestedAt': 1 });

    res.json({ success: true, message: 'Requests retrieved successfully', data: requests });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/musician-requests/:userId
// Схвалити або відхилити заявку. Body: { action: 'approve' | 'reject', message: '...' }
const handleMusicianRequest = async (req, res, next) => {
  try {
    const { action, message } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be "approve" or "reject"',
        errors: [],
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', errors: [] });
    }

    if (user.musicianRequest?.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This user has no pending musician request',
        errors: [],
      });
    }

    if (action === 'approve') {
      user.role = 'musician';
      user.musicianRequest.status = 'approved';
    } else {
      user.musicianRequest.status = 'rejected';
      user.musicianRequest.message = message || '';
    }

    await user.save();

    res.json({
      success: true,
      message: action === 'approve' ? 'User is now a musician' : 'Request rejected',
      data: {
        userId: user._id,
        username: user.username,
        role: user.role,
        musicianRequest: user.musicianRequest,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/stats
// Загальна статистика для адмін-панелі
const getStats = async (req, res, next) => {
  try {
    const [
      totalSongs,
      totalAlbums,
      totalUsers,
      totalMusicians,
      pendingRequests,
      topSongs,
    ] = await Promise.all([
      Song.countDocuments(),
      Album.countDocuments(),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'musician' }),
      User.countDocuments({ 'musicianRequest.status': 'pending' }),
      // Топ-10 пісень за кількістю прослуховувань
      Song.find().sort({ playCount: -1 }).limit(10).select('name artist playCount'),
    ]);

    res.json({
      success: true,
      message: 'Stats retrieved successfully',
      data: {
        totalSongs,
        totalAlbums,
        totalUsers,
        totalMusicians,
        pendingRequests,
        topSongs,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users — список всіх користувачів (для адмін-панелі)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('username email role musicianRequest createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, message: 'Users retrieved successfully', data: users });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMusicianRequests, handleMusicianRequest, getStats, getAllUsers };
