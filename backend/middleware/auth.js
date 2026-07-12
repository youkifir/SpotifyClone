const jwt = require('jsonwebtoken');

const createError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

// Перевіряє JWT-токен у заголовку Authorization: Bearer <token>
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('Access denied: token is missing', 401));
  }
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(err);
  }
};

// Тільки адмін
const isAdmin = (req, res, next) =>
  req.user?.role === 'admin'
    ? next()
    : next(createError('Access denied: administrator privileges are required', 403));

// Музикант АБО адмін (адмін має всі права)
const isMusician = (req, res, next) =>
  req.user?.role === 'musician' || req.user?.role === 'admin'
    ? next()
    : next(createError('Access denied: musician or administrator privileges are required', 403));

module.exports = { protect, isAdmin, isMusician };
