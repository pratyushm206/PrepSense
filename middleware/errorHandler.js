const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production' || (err.statusCode || err.status || 500) >= 500) {
    console.error(err.stack);
  }

  const statusCode = err.name === 'CastError'
    ? 400
    : err.statusCode || err.status || 500;
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Something went wrong. Please try again later.'
    : err.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorHandler;
