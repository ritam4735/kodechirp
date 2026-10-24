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
const emailService = require('./emailService');
const crypto = require('crypto');

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

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Insert user
  const result = await db.query(
    `INSERT INTO users (username, email, password_hash, verification_token_hash, verification_expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, email, display_name, role, avatar_url, bio, rating, github_url, linkedin_url, website_url, preferences_json, created_at, email_verified`,
    [username, email, passwordHash, tokenHash, expiresAt]
  );

  const user = result.rows[0];

  // Send verification email
  await emailService.sendVerificationEmail(user.email, verificationToken);

  logger.info({ userId: user.id }, '[Auth] New user registered, verification email sent');

  return { user, verificationRequired: true };
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

  if (!user.email_verified) {
    const err = new Error('Email not verified. Please verify your email to continue.');
    err.status = 403;
    err.code = 'EMAIL_NOT_VERIFIED';
    // attach email so client can offer resend
    err.email = user.email;
    throw err;
  }

  // Update last login
  await db.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  // Clean sensitive fields
  delete user.password_hash;

  // Auto-sync with student roster if matching college email exists
  await syncUserWithRoster(user);

  // Fetch organization membership if available
  try {
    const orgRes = await db.query(
      `SELECT om.organization_id, om.role AS member_role, om.department, om.academic_year, 
              om.enrollment_status, om.student_id_number,
              o.name AS organization_name, o.slug AS organization_slug, o.code AS organization_code
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND o.is_active = TRUE
       ORDER BY (om.role = 'college_admin') DESC, om.created_at ASC
       LIMIT 1`,
      [user.id]
    );
    user.organization = orgRes.rows[0] || null;
    user.organization_id = orgRes.rows[0]?.organization_id || null;
  } catch {
    user.organization = null;
    user.organization_id = null;
  }

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

  // Auto-sync with student roster if matching college email exists
  await syncUserWithRoster(user);

  try {
    const orgRes = await db.query(
      `SELECT om.organization_id, om.role AS member_role, om.department, om.academic_year, 
              om.enrollment_status, om.student_id_number,
              o.name AS organization_name, o.slug AS organization_slug, o.code AS organization_code
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND o.is_active = TRUE
       ORDER BY (om.role = 'college_admin') DESC, om.created_at ASC
       LIMIT 1`,
      [user.id]
    );
    user.organization = orgRes.rows[0] || null;
    user.organization_id = orgRes.rows[0]?.organization_id || null;
  } catch {
    user.organization = null;
    user.organization_id = null;
  }

  // Issue new token pair with same family_id
  const tokens = await generateTokenPair(user, storedToken.family_id);

  logger.info({ userId: user.id }, '[Auth] Token refreshed');

  return { user, ...tokens };
}

/**
 * Revoke all refresh tokens for a user (logout everywhere).
 */
async function revokeAllTokens(userId) {
  if (!userId) return;
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
  logger.info({ userId }, '[Auth] All refresh tokens revoked');
}

/**
 * Revoke a specific refresh token family (and associated user tokens) by token string.
 */
async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  try {
    const tokenHash = hashToken(refreshToken);
    const result = await db.query(
      'SELECT user_id, family_id FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    if (result.rows.length > 0) {
      const { user_id, family_id } = result.rows[0];
      await db.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE (family_id = $1 OR user_id = $2) AND revoked_at IS NULL',
        [family_id, user_id]
      );
      logger.info({ userId: user_id, familyId: family_id }, '[Auth] Refresh token and family revoked');
    }
  } catch (err) {
    logger.warn({ err }, '[Auth] Error revoking refresh token');
  }
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

  const user = result.rows[0];
  try {
    const orgRes = await db.query(
      `SELECT om.organization_id, om.role AS member_role, om.department, om.academic_year, 
              om.enrollment_status, om.student_id_number,
              o.name AS organization_name, o.slug AS organization_slug, o.code AS organization_code
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND o.is_active = TRUE
       LIMIT 1`,
      [userId]
    );
    user.organization = orgRes.rows[0] || null;
  } catch {
    user.organization = null;
  }

  return user;
}

// ── Internal Helpers ──────────────────────────────────────────────────────────

/**
 * Generate access + refresh token pair.
 * Stores refresh token hash in DB with family tracking.
 */
async function generateTokenPair(user, familyId = null) {
  // Access token (short-lived, stateless)
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email,
      role: user.role || 'user',
      organizationId: user.organization?.organization_id || user.organization_id || null,
    },
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

/**
 * Request password reset
 */
async function forgotPassword(email) {
  // Check existing user
  const result = await db.query('SELECT id, email FROM users WHERE email = $1 AND is_active = TRUE', [email]);
  
  if (result.rows.length === 0) {
    // Silently return to prevent account enumeration
    return true;
  }

  const user = result.rows[0];

  // Generate secure token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token for storage
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  // 15 minutes expiration
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.query(
    'UPDATE users SET password_reset_token_hash = $1, password_reset_expires_at = $2 WHERE id = $3',
    [tokenHash, expiresAt, user.id]
  );

  // Send email
  await emailService.sendPasswordResetEmail(user.email, resetToken);
  
  logger.info({ userId: user.id }, '[Auth] Password reset requested');
  return true;
}

/**
 * Reset password
 */
async function resetPassword({ email, token, newPassword }) {
  const result = await db.query(
    'SELECT id, password_reset_token_hash, password_reset_expires_at FROM users WHERE email = $1 AND is_active = TRUE',
    [email]
  );

  if (result.rows.length === 0) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }

  const user = result.rows[0];

  if (!user.password_reset_token_hash || !user.password_reset_expires_at) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }

  // Check expiration
  if (new Date(user.password_reset_expires_at) < new Date()) {
    const err = new Error('Reset token has expired');
    err.status = 400;
    throw err;
  }

  // Verify token
  const providedTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Use timing-safe compare if possible, but basic equality is usually ok for SHA256 hex strings.
  // We'll just do a strict equality check here.
  if (providedTokenHash !== user.password_reset_token_hash) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }

  // Hash new password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  // Update password and clear token
  await db.query(
    'UPDATE users SET password_hash = $1, password_reset_token_hash = NULL, password_reset_expires_at = NULL WHERE id = $2',
    [passwordHash, user.id]
  );

  // Invalidate all existing sessions
  await revokeAllTokens(user.id);

  logger.info({ userId: user.id }, '[Auth] Password reset successfully');
  return true;
}

/**
 * Verify user email
 */
async function verifyEmail(token, email) {
  const result = await db.query(
    'SELECT id, email_verified, verification_token_hash, verification_expires_at FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    const err = new Error('Invalid or expired verification token');
    err.status = 400;
    throw err;
  }

  const user = result.rows[0];

  if (user.email_verified) {
    // Already verified
    return true;
  }

  if (!user.verification_token_hash || !user.verification_expires_at) {
    const err = new Error('Invalid or expired verification token');
    err.status = 400;
    throw err;
  }

  if (new Date(user.verification_expires_at) < new Date()) {
    const err = new Error('Verification token has expired. Please request a new one.');
    err.status = 400;
    throw err;
  }

  const providedHash = crypto.createHash('sha256').update(token).digest('hex');

  if (providedHash !== user.verification_token_hash) {
    const err = new Error('Invalid or expired verification token');
    err.status = 400;
    throw err;
  }

  // Update user as verified
  await db.query(
    'UPDATE users SET email_verified = TRUE, email_verified_at = NOW(), verification_token_hash = NULL, verification_expires_at = NULL WHERE id = $1',
    [user.id]
  );

  // Auto-sync with student roster if matching college email exists
  await syncUserWithRoster(user);

  logger.info({ userId: user.id }, '[Auth] Email verified successfully');
  return true;
}

/**
 * Resend verification email
 */
async function resendVerification(email) {
  const result = await db.query(
    'SELECT id, email, email_verified FROM users WHERE (email = $1 OR username = $1) AND is_active = TRUE',
    [email]
  );

  if (result.rows.length === 0) {
    // Silently return to prevent enumeration
    return true;
  }

  const user = result.rows[0];

  if (user.email_verified) {
    const err = new Error('Email is already verified');
    err.status = 400;
    throw err;
  }

  // Generate new token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.query(
    'UPDATE users SET verification_token_hash = $1, verification_expires_at = $2 WHERE id = $3',
    [tokenHash, expiresAt, user.id]
  );

  await emailService.sendVerificationEmail(user.email, verificationToken);

  logger.info({ userId: user.id }, '[Auth] Verification email resent');
  return true;
}

/**
 * Automatically link an authenticated user with any matching student roster entry
 * and synchronize organization membership.
 */
async function syncUserWithRoster(user) {
  if (!user || !user.email) return;

  try {
    // 1. Link matching student_rosters records
    const rosterRes = await db.query(
      `UPDATE student_rosters
       SET matched_user_id = $1, updated_at = NOW()
       WHERE LOWER(college_email) = LOWER($2)
         AND (matched_user_id IS NULL OR matched_user_id = $1)
       RETURNING organization_id, department, academic_year, enrollment_status, student_id_number, is_active`,
      [user.id, user.email]
    );

    // 2. For each matched organization, ensure organization_members row
    for (const sr of rosterRes.rows) {
      await db.query(
        `INSERT INTO organization_members (organization_id, user_id, role, department, academic_year, enrollment_status, student_id_number, updated_at)
         VALUES ($1, $2, 'student', $3, $4, $5, $6, NOW())
         ON CONFLICT (organization_id, user_id)
         DO UPDATE SET
            department = COALESCE(EXCLUDED.department, organization_members.department),
            academic_year = COALESCE(EXCLUDED.academic_year, organization_members.academic_year),
            enrollment_status = EXCLUDED.enrollment_status,
            student_id_number = COALESCE(EXCLUDED.student_id_number, organization_members.student_id_number),
            updated_at = NOW()`,
        [sr.organization_id, user.id, sr.department, sr.academic_year, sr.enrollment_status, sr.student_id_number]
      );

      // If user's global role is 'user', elevate to 'student'
      if (user.role === 'user') {
        await db.query(`UPDATE users SET role = 'student', updated_at = NOW() WHERE id = $1`, [user.id]);
        user.role = 'student';
      }
    }
  } catch (err) {
    logger.warn({ err, userId: user.id }, '[Auth] syncUserWithRoster failed non-fatally');
  }
}

module.exports = {
  signup,
  login,
  refreshAccessToken,
  revokeAllTokens,
  revokeRefreshToken,
  getProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  syncUserWithRoster,
};
