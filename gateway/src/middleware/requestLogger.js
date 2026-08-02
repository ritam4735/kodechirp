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

    // Record to monitoring (skip /health and /monitoring to avoid noise)
    if (!req.originalUrl.startsWith('/health') && !req.originalUrl.startsWith('/monitoring')) {
      const { recordRequest } = require('../services/monitorService');
      recordRequest(req, res, duration);
    }
  });

  next();
}

module.exports = { requestLogger };
