// gateway/src/utils/helpers.js
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');

/**
 * Hash a token using SHA-256 for secure storage.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically secure random token.
 */
function generateToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Extract client IP from request (handles proxies).
 */
function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
}

/**
 * Normalise output strings for comparison (trim, collapse whitespace).
 */
function normaliseOutput(str) {
  return (str || '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/ +\n/g, '\n')
    .replace(/\n +/g, '\n');
}

module.exports = { hashToken, generateToken, getClientIp, normaliseOutput };
