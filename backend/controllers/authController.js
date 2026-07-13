require('dotenv').config();
const { OAuth2Client } = require('google-auth-library'); // ДОБАВЛЕНО
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Playlist = require('../models/Playlist');

// Инициализируем клиент Google OAuth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // ДОБАВЛЕНО

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

    // Если пользователь регистрировался через Google/FB и не имеет пароля
    if (!user.password) {
      return res.status(401).json({ success: false, message: 'This account uses social login. Please log in with Google or Facebook.', errors: [] });
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

// POST /api/auth/google
const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google token is required' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email not provided by Google' });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (!user) {
      user = await User.create({
        username: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        avatar: picture || null,
        role: 'user',
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.avatar && picture) user.avatar = picture;
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      message: 'Google login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({ success: false, message: 'Invalid Google token' });
  }
};

// POST /api/auth/facebook
const facebookLogin = async (req, res, next) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Facebook access token is required' });
    }

    const fbResponse = await axios.get(`https://graph.facebook.com/me`, {
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token: accessToken,
      },
    });

    const { id: facebookId, name, email, picture } = fbResponse.data;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email not provided by Facebook or authorized' });
    }

    let user = await User.findOne({ $or: [{ facebookId }, { email: email.toLowerCase() }] });

    const avatarUrl = picture?.data?.url || null;

    if (!user) {
      user = await User.create({
        username: name || email.split('@')[0],
        email: email.toLowerCase(),
        facebookId,
        avatar: avatarUrl,
        role: 'user',
      });
    } else if (!user.facebookId) {
      user.facebookId = facebookId;
      if (!user.avatar && avatarUrl) user.avatar = avatarUrl;
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      message: 'Facebook login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Facebook Auth Error:', err);
    res.status(401).json({ success: false, message: 'Invalid Facebook token' });
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
    const { avatar } = req.body;
    if (avatar !== null && typeof avatar !== 'string') {
      return res.status(400).json({ success: false, message: 'Невірний формат аватара' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

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
      if (user.password) {
        // Если у пользователя есть пароль в базе (обычная регистрация) — требуем старый
        if (!currentPassword) {
          return res.status(400).json({ success: false, message: 'Введіть поточний пароль' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: 'Поточний пароль невірний' });
        }
      }
      // Если пароля нет (OAuth аккаунт), он может просто установить новый без ввода старого

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

// GET /api/auth/likes
const getLikedSongs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('likedSongs');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user.likedSongs });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/likes/:songId
const toggleLike = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const songId = req.params.songId;
    const alreadyLiked = user.likedSongs.some((id) => id.toString() === songId);

    if (alreadyLiked) {
      user.likedSongs = user.likedSongs.filter((id) => id.toString() !== songId);
    } else {
      user.likedSongs.push(songId);
    }
    await user.save();

    let likedPlaylist = await Playlist.findOne({ owner: user._id, isLikedSongs: true });

    if (!likedPlaylist) {
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

// GET /api/auth/users
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

// DELETE /api/auth/users/:id
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

module.exports = { register, login, getMe, updateProfile, updateAvatar, getLikedSongs, toggleLike, getUsers, deleteUser, googleLogin, facebookLogin };