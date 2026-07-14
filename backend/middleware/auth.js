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
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    
    // Стандартизуємо id та _id для повної сумісності
    req.user = {
      id: decoded.id || decoded._id,
      _id: decoded.id || decoded._id,
      role: decoded.role,
    };
    
    next();
  } catch (err) {
    next(createError('Invalid or expired token', 401));
  }
};

// Тільки адмін
const isAdmin = (req, res, next) =>
  req.user?.role === 'admin'
    ? next()
    : next(createError('Access denied: administrator privileges are required', 403));

// Музикант АБО адмін
const isMusician = (req, res, next) =>
  req.user?.role === 'musician' || req.user?.role === 'admin'
    ? next()
    : next(createError('Access denied: musician or administrator privileges are required', 403));

module.exports = { protect, isAdmin, isMusician };