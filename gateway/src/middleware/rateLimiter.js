// gateway/src/middleware/rateLimiter.js
// ─────────────────────────────────────────────────────────────────────────────
// Redis-backed sliding window rate limiter
// ─────────────────────────────────────────────────────────────────────────────

const { getClient } = require('../config/redis');
const config = require('../config');
const logger = require('../utils/logger');
const { getClientIp } = require('../utils/helpers');
const { REDIS_KEYS } = require('../utils/constants');

/**
 * Create a rate limiter middleware.
 *
 * @param {Object} options
 * @param {number} options.window - Time window in seconds
 * @param {number} options.max    - Max requests per window
 * @param {string} [options.keyPrefix] - Redis key prefix
 * @param {Function} [options.keyGenerator] - Custom key generator (req) => string
 */
function createRateLimiter({ window, max, keyPrefix = 'default', keyGenerator } = {}) {
  return async (req, res, next) => {
    try {
      const redis = getClient();
      const key = `${REDIS_KEYS.RATE_LIMIT}${keyPrefix}:${
        keyGenerator ? keyGenerator(req) : getClientIp(req)
      }`;

      const now = Date.now();
      const windowStart = now - (window * 1000);

      // Sliding window using sorted set
      const multi = redis.multi();
      multi.zremrangebyscore(key, 0, windowStart);  // Remove expired entries
      multi.zadd(key, now, `${now}:${Math.random()}`);  // Add current request
      multi.zcard(key);  // Count requests in window
      multi.expire(key, window + 1);  // Set TTL

      const results = await multi.exec();
      const requestCount = results[2][1];

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': Math.max(0, max - requestCount),
        'X-RateLimit-Reset': Math.ceil((now + window * 1000) / 1000),
      });

      if (requestCount > max) {
        logger.warn({
          ip: getClientIp(req),
          path: req.path,
          requestCount,
          limit: max,
        }, '[RateLimit] Exceeded');

        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: window,
        });
      }

      next();
    } catch (err) {
      // If Redis is down, allow the request (fail-open)
      logger.error({ err }, '[RateLimit] Redis error, failing open');
      next();
    }
  };
}

// ── Pre-configured limiters ───────────────────────────────────────────────

const globalLimiter = createRateLimiter({
  ...config.rateLimit.global,
  keyPrefix: 'global',
});

const authLoginLimiter = createRateLimiter({
  ...config.rateLimit.authLogin,
  keyPrefix: 'auth:login',
});

const authSignupLimiter = createRateLimiter({
  ...config.rateLimit.authSignup,
  keyPrefix: 'auth:signup',
});

const submitRunLimiter = createRateLimiter({
  ...config.rateLimit.submitRun,
  keyPrefix: 'submit:run',
  keyGenerator: (req) => req.user?.id || getClientIp(req),
});

const submitJudgeLimiter = createRateLimiter({
  ...config.rateLimit.submitJudge,
  keyPrefix: 'submit:judge',
  keyGenerator: (req) => req.user?.id || getClientIp(req),
});

module.exports = {
  createRateLimiter,
  globalLimiter,
  authLoginLimiter,
  authSignupLimiter,
  submitRunLimiter,
  submitJudgeLimiter,
};
