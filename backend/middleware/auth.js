const jwt = require('jsonwebtoken');

/**
 * Middleware: require a valid JWT bearer token
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware: optionally attach user if token present (no 401 on failure)
 */
function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(
        authHeader.slice(7),
        process.env.JWT_SECRET || 'dev-secret'
      );
    } catch {
      req.user = null;
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
