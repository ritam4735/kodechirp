// gateway/src/services/authService.js
// ─────────────────────────────────────────────────────────────────────────────
// JWT Auth Service — Access Tokens + Refresh Token Rotation
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const db = require('../config/database');
const logger = require('../utils/logger');
const { hashToken, generateToken } = require('../utils/helpers');

/**
 * Register a new user.
 */
async function signup({ email, password, username }) {
  // Check existing user
  const existing = await db.query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );

  if (existing.rows.length > 0) {
    const err = new Error('User already exists with that email or username');
    err.status = 409;
    throw err;
  }

  // Hash password (cost factor 12 for production)
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // Insert user
  const result = await db.query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, display_name, role, avatar_url, bio, rating, github_url, linkedin_url, website_url, preferences_json, created_at`,
    [username, email, passwordHash]
  );

  const user = result.rows[0];

  // Generate token pair
  const tokens = await generateTokenPair(user);

  logger.info({ userId: user.id }, '[Auth] New user registered');

  return { user, ...tokens };
}

/**
 * Authenticate user and issue tokens.
 */
async function login({ identifier, password }) {
  const result = await db.query(
    'SELECT * FROM users WHERE (email = $1 OR username = $1) AND is_active = TRUE',
    [identifier]
  );

  if (result.rows.length === 0) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const user = result.rows[0];

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  // Update last login
  await db.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  // Clean sensitive fields
  delete user.password_hash;

  // Generate token pair
  const tokens = await generateTokenPair(user);

  logger.info({ userId: user.id }, '[Auth] User logged in');

  return { user, ...tokens };
}

/**
 * Refresh access token using refresh token.
 * Implements refresh token rotation with family tracking.
 */
async function refreshAccessToken(refreshToken) {
  const tokenHash = hashToken(refreshToken);

  // Look up the refresh token
  const result = await db.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }

  const storedToken = result.rows[0];

  // Check if token is revoked (potential theft detected)
  if (storedToken.revoked_at) {
    // Revoke ALL tokens in this family (compromised)
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1',
      [storedToken.family_id]
    );
    logger.warn({ familyId: storedToken.family_id, userId: storedToken.user_id },
      '[Auth] Refresh token reuse detected — revoking family');
    const err = new Error('Refresh token reuse detected');
    err.status = 401;
    throw err;
  }

  // Check expiry
  if (new Date(storedToken.expires_at) < new Date()) {
    const err = new Error('Refresh token expired');
    err.status = 401;
    throw err;
  }

  // Revoke the current token (rotation)
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
    [storedToken.id]
  );

  // Fetch user
  const userResult = await db.query(
    'SELECT id, username, email, display_name, role, avatar_url, bio, rating, github_url, linkedin_url, website_url, preferences_json FROM users WHERE id = $1 AND is_active = TRUE',
    [storedToken.user_id]
  );

  if (userResult.rows.length === 0) {
    const err = new Error('User not found or deactivated');
    err.status = 401;
    throw err;
  }

  const user = userResult.rows[0];

  // Issue new token pair with same family_id
  const tokens = await generateTokenPair(user, storedToken.family_id);

  logger.info({ userId: user.id }, '[Auth] Token refreshed');

  return { user, ...tokens };
}

/**
 * Revoke all refresh tokens for a user (logout everywhere).
 */
async function revokeAllTokens(userId) {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
  logger.info({ userId }, '[Auth] All refresh tokens revoked');
}

/**
 * Get user profile by ID.
 */
async function getProfile(userId) {
  const result = await db.query(
    `SELECT id, username, email, display_name, role, avatar_url, bio, rating, github_url, linkedin_url, website_url, preferences_json, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

// ── Internal Helpers ──────────────────────────────────────────────────────────

/**
 * Generate access + refresh token pair.
 * Stores refresh token hash in DB with family tracking.
 */
async function generateTokenPair(user, familyId = null) {
  // Access token (short-lived, stateless)
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role || 'user' },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn }
  );

  // Refresh token (long-lived, stored in DB)
  const refreshToken = generateToken(48);
  const tokenHash = hashToken(refreshToken);
  const family = familyId || uuidv4();
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresMs);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [user.id, tokenHash, family, expiresAt]
  );

  return { accessToken, refreshToken };
}

module.exports = {
  signup,
  login,
  refreshAccessToken,
  revokeAllTokens,
  getProfile,
};
