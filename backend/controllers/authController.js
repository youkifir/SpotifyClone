const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// POST /api/auth/register
// Публичная регистрация всегда создаёт обычного пользователя (role: 'user').
// Роль admin выдаётся только вручную (см. data/createAdmin.js), это защищает
// от того, что кто угодно объявит себя админом через тело запроса.
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Заповніть усі поля: username, email, password' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль має містити щонайменше 6 символів' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Користувач з таким email вже існує' });
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
      message: 'Реєстрація успішна',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Помилка при реєстрації', error: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Введіть email та пароль' });
    }

    // явно подтягиваем поле password, т.к. в модели у него select: false
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Невірний email або пароль' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Невірний email або пароль' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Вхід успішний',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Помилка при вході', error: err.message });
  }
};

// GET /api/auth/me — профиль текущего пользователя (нужен валидный токен)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });
    res.json({ id: user._id, username: user.username, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Помилка при отриманні профілю', error: err.message });
  }
};

module.exports = { register, login, getMe };
