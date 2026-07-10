const notFound = (req, res, next) => {
  const error = new Error(
    `Route ${req.method} ${req.originalUrl} was not found`
  );
  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode =
    err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  let message = err.message || 'Internal server error';
  let errors = [];

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier: ${err.path}`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Data validation failed';
    errors = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `The value for "${field}" is already in use`;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && statusCode === 500
      ? { stack: err.stack }
      : {}),
  });
};

module.exports = { notFound, errorHandler };