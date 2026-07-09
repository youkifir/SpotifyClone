const jwt = require('jsonwebtoken');

// Проверяет JWT из заголовка Authorization: Bearer <token>
// и кладёт данные пользователя в req.user (id, role)
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Немає доступу: токен відсутній' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Немає доступу: недійсний або протермінований токен' });
  }
};

// Использовать ПОСЛЕ protect. Пропускает дальше только role === 'admin'
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ заборонено: потрібні права адміністратора' });
  }
  next();
};

module.exports = { protect, isAdmin };
