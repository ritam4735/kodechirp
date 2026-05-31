// gateway/src/middleware/requestLogger.js
// ─────────────────────────────────────────────────────────────────────────────
// HTTP request/response logging middleware
// ─────────────────────────────────────────────────────────────────────────────

const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userId: req.user?.id,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'Request completed with server error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Request completed with client error');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  next();
}

module.exports = { requestLogger };
