// gateway/src/controllers/authController.js
// ─────────────────────────────────────────────────────────────────────────────
// Auth Controller — signup, login, refresh, logout, profile
// ─────────────────────────────────────────────────────────────────────────────

const authService = require('../services/authService');
const config = require('../config');

// Cookie options for refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict',
  path: '/api/auth/refresh',
  maxAge: config.jwt.refreshExpiresMs,
};

exports.signup = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;

    const result = await authService.signup({ email, password, username });

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token required' });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    // Rotate cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    // Clear cookie on failure
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      await authService.revokeAllTokens(req.user.id);
    }

    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    return res.status(200).json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
