const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Playlist = require('../models/Playlist');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required: username, email, password', errors: [] });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long', errors: [] });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists', errors: [] });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user',
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required', errors: [] });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password', errors: [] });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password', errors: [] });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found', errors: [] });
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar || null,
      createdAt: user.createdAt,
      musicianRequest: user.musicianRequest,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/avatar
const updateAvatar = async (req, res, next) => {
  try {
    // avatar може бути base64 рядком або null (для видалення)
    const { avatar } = req.body;
    if (avatar !== null && typeof avatar !== 'string') {
      return res.status(400).json({ success: false, message: 'Невірний формат аватара' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Зберігаємо як base64 або шлях (залежно від реалізації)
    user.avatar = avatar;
    await user.save();

    const newToken = generateToken(user);
    res.json({
      success: true,
      message: 'Аватар оновлено',
      token: newToken,
      user: { id: user._id, username: user.username, email: user.email, role: user.role, avatar: user.avatar, createdAt: user.createdAt },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (username && username.trim()) {
      user.username = username.trim();
    }

    if (email && email.trim()) {
      const emailLower = email.toLowerCase().trim();
      if (emailLower !== user.email) {
        const existing = await User.findOne({ email: emailLower });
        if (existing) {
          return res.status(409).json({ success: false, message: 'Цей email вже використовується' });
        }
        user.email = emailLower;
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Введіть поточний пароль' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Поточний пароль невірний' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Новий пароль має бути мінімум 6 символів' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();
    const newToken = generateToken(user);

    res.json({
      success: true,
      message: 'Профіль оновлено',
      token: newToken,
      user: { id: user._id, username: user.username, email: user.email, role: user.role, avatar: user.avatar || null, createdAt: user.createdAt },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/likes — повертає список лайкнутих пісень
const getLikedSongs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('likedSongs');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user.likedSongs });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/likes/:songId — toggle лайк + автоматично створює/оновлює плейлист "Liked Songs"
const toggleLike = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const songId = req.params.songId;
    const alreadyLiked = user.likedSongs.some((id) => id.toString() === songId);

    if (alreadyLiked) {
      // Прибираємо лайк
      user.likedSongs = user.likedSongs.filter((id) => id.toString() !== songId);
    } else {
      // Додаємо лайк
      user.likedSongs.push(songId);
    }
    await user.save();

    // --- Синхронізуємо плейлист "Liked Songs" ---
    let likedPlaylist = await Playlist.findOne({ owner: user._id, isLikedSongs: true });

    if (!likedPlaylist) {
      // Перший лайк — створюємо плейлист
      likedPlaylist = await Playlist.create({
        name: 'Liked Songs',
        description: 'Songs you liked',
        owner: user._id,
        isLikedSongs: true,
        isPublic: false,
        songs: user.likedSongs,
      });
    } else {
      likedPlaylist.songs = user.likedSongs;
      await likedPlaylist.save();
    }

    res.json({
      success: true,
      liked: !alreadyLiked,
      likedSongsPlaylistId: likedPlaylist._id,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/users — admin only
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: users.map(u => ({
        id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/auth/users/:id — admin only
const deleteUser = async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Не можна видалити власний акаунт' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
    res.json({ success: true, message: 'Користувача видалено' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateProfile, updateAvatar, getLikedSongs, toggleLike, getUsers, deleteUser };