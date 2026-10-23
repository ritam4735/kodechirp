// gateway/src/middleware/rbac.js
// ─────────────────────────────────────────────────────────────────────────────
// Role-Based Access Control & Organization Authorization Middleware
// Supports: SUPER_ADMIN, COLLEGE_ADMIN, STUDENT
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const logger = require('../utils/logger');
const { ROLES } = require('../utils/constants');

/**
 * Normalize role to standard logical roles:
 * 'admin', 'super_admin' -> 'super_admin'
 * 'college_admin' -> 'college_admin'
 * 'user', 'student' -> 'student'
 * 'moderator' -> 'moderator'
 */
function normalizeRole(role) {
  if (!role) return ROLES.STUDENT;
  if (role === 'admin' || role === 'super_admin') return ROLES.SUPER_ADMIN;
  if (role === 'college_admin') return ROLES.COLLEGE_ADMIN;
  if (role === 'user' || role === 'student') return ROLES.STUDENT;
  return role;
}

/**
 * Check if user is Super Admin (platform-wide authority).
 */
function isSuperAdmin(user) {
  if (!user) return false;
  const normalized = normalizeRole(user.role);
  return normalized === ROLES.SUPER_ADMIN;
}

/**
 * Check if user is College Admin (assigned organization authority).
 * Super admins implicitly have college admin authority when operating in org context.
 */
function isCollegeAdmin(user) {
  if (!user) return false;
  const normalized = normalizeRole(user.role);
  return normalized === ROLES.COLLEGE_ADMIN || normalized === ROLES.SUPER_ADMIN;
}

/**
 * Check if user is a Student.
 */
function isStudent(user) {
  if (!user) return false;
  const normalized = normalizeRole(user.role);
  return normalized === ROLES.STUDENT;
}

/**
 * Log sensitive administrative actions to admin_audit_logs.
 */
async function logAdminAction({
  organizationId = null,
  actorId,
  actorEmail = null,
  actorRole = null,
  action,
  targetType = null,
  targetId = null,
  details = {},
  ipAddress = null,
}) {
  try {
    let resolvedEmail = actorEmail;
    if (!resolvedEmail && actorId) {
      const uRes = await db.query('SELECT email FROM users WHERE id = $1', [actorId]);
      resolvedEmail = uRes?.rows?.[0]?.email || null;
    }

    await db.query(
      `INSERT INTO admin_audit_logs 
        (organization_id, actor_id, actor_email, actor_role, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        organizationId,
        actorId,
        resolvedEmail,
        actorRole,
        action,
        targetType,
        targetId ? String(targetId) : null,
        JSON.stringify(details || {}),
        ipAddress,
      ]
    );
  } catch (err) {
    logger.error({ err, action, actorId }, '[RBAC] Failed to record audit log');
  }
}

/**
 * Fetch organization membership for a user.
 */
async function getUserOrganization(userId) {
  const result = await db.query(
    `SELECT om.organization_id, om.role AS member_role, om.department, om.academic_year, 
            om.enrollment_status, om.student_id_number,
            o.name AS organization_name, o.slug AS organization_slug, o.is_active AS organization_active
     FROM organization_members om
     JOIN organizations o ON o.id = om.organization_id
     WHERE om.user_id = $1 AND o.is_active = TRUE
     ORDER BY (om.role = 'college_admin') DESC, om.created_at ASC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Middleware: Require Super Admin access.
 * Denies access if user is not super_admin or admin.
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (!isSuperAdmin(req.user)) {
    logger.warn({ userId: req.user.id, role: req.user.role }, '[RBAC] Super Admin required — access denied');
    return res.status(403).json({ success: false, error: 'Access denied: Super Admin privileges required' });
  }

  next();
}

/**
 * Middleware: Require College Admin or Super Admin access.
 * Resolves req.organizationId from:
 * 1. User's assigned organization if college_admin.
 * 2. Header `x-organization-id` or query `organizationId` or route param `organizationId` if super_admin.
 */
async function requireCollegeAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const superAdmin = isSuperAdmin(req.user);
  const collegeAdminRole = normalizeRole(req.user.role) === ROLES.COLLEGE_ADMIN;

  try {
    const membership = await getUserOrganization(req.user.id);
    const hasOrgCollegeAdmin = membership?.member_role === 'college_admin';

    if (!superAdmin && !collegeAdminRole && !hasOrgCollegeAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied: College Admin or Super Admin privileges required' });
    }

    if (superAdmin) {
      // Super Admin can act on requested org or fall back to their own membership
      const requestedOrg = req.headers['x-organization-id'] || req.query.organizationId || req.params.organizationId || req.body?.organizationId;
      req.organizationId = requestedOrg || membership?.organization_id || null;
      req.organizationMembership = membership;
      return next();
    }

    if (!membership || (membership.member_role !== 'college_admin' && !collegeAdminRole)) {
      return res.status(403).json({ success: false, error: 'No active College Admin assignment found for this account' });
    }

    req.organizationId = membership.organization_id;
    req.organizationMembership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Validate that the request does not cross organization boundaries.
 * For example, if endpoint has `:organizationId` param, verify college admin belongs to it.
 */
function requireOrgMatch(paramName = 'organizationId') {
  return (req, res, next) => {
    if (isSuperAdmin(req.user)) {
      return next(); // Super admin can access any organization
    }

    const targetOrgId = req.params[paramName] || req.body?.[paramName] || req.query?.[paramName];
    if (targetOrgId && req.organizationId && targetOrgId !== req.organizationId) {
      logger.warn(
        { userId: req.user.id, userOrg: req.organizationId, targetOrg: targetOrgId },
        '[RBAC] Cross-organization access attempt blocked'
      );
      return res.status(403).json({ success: false, error: 'Access denied: Cannot access another organization\'s resources' });
    }

    next();
  };
}

module.exports = {
  normalizeRole,
  isSuperAdmin,
  isCollegeAdmin,
  isStudent,
  logAdminAction,
  getUserOrganization,
  requireSuperAdmin,
  requireCollegeAdmin,
  requireOrgMatch,
};
