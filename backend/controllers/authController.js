const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

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
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/profile — оновлення імені, пошти, паролю
const updateProfile = async (req, res, next) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Оновлення імені
    if (username && username.trim()) {
      user.username = username.trim();
    }

    // Оновлення email
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

    // Зміна паролю
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

    // Генеруємо новий токен якщо змінились дані
    const newToken = generateToken(user);

    res.json({
      success: true,
      message: 'Профіль оновлено',
      token: newToken,
      user: { id: user._id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/users — admin only: list all users
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

// DELETE /api/auth/users/:id — admin only: delete a user (cannot delete self)
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

module.exports = { register, login, getMe, updateProfile, getUsers, deleteUser };