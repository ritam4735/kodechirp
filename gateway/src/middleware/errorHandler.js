// gateway/src/middleware/errorHandler.js
// ─────────────────────────────────────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────────────────────────────────────

const logger = require('../utils/logger');
const config = require('../config');

function errorHandler(err, req, res, _next) {
  const statusCode = err.status || err.statusCode || 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    logger.error({
      err,
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    }, '[Error] Unhandled server error');
  } else {
    logger.warn({
      message: err.message,
      status: statusCode,
      path: req.path,
    }, '[Error] Client error');
  }

  const response = {
    success: false,
    error: isServerError && config.env === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
  };

  // Include stack trace in development
  if (config.env === 'development' && isServerError) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = { errorHandler };
