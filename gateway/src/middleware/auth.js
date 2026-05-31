// gateway/src/middleware/auth.js
// ─────────────────────────────────────────────────────────────────────────────
// JWT Authentication Middleware
// Supports: Bearer token header + HTTP-only refresh cookie
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { ROLES } = require('../utils/constants');

/**
 * Require a valid JWT access token.
 * Attaches decoded payload to req.user.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

/**
 * Optionally attach user if valid token present.
 * Never returns 401 — just sets req.user to null if no/bad token.
 */
function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwt.secret);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

/**
 * Role-based access control.
 * Usage: requireRole('admin') or requireRole('admin', 'moderator')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      logger.warn({ userId: req.user.id, role: req.user.role, required: roles },
        '[Auth] Insufficient role');
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

module.exports = { requireAuth, optionalAuth, requireRole, extractToken };
