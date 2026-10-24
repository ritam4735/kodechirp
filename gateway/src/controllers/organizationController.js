// gateway/src/controllers/organizationController.js
// ─────────────────────────────────────────────────────────────────────────────
// Organization Management Controller — Super Admin & College Admin Scope
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const logger = require('../utils/logger');
const { ROLES } = require('../utils/constants');
const { isSuperAdmin, logAdminAction } = require('../middleware/rbac');

/**
 * List all organizations (Super Admin) or get own organization.
 */
exports.getOrganizations = async (req, res, next) => {
  try {
    const isSuper = isSuperAdmin(req.user);
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const status = req.query.status; // 'active', 'inactive', 'all'
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (!isSuper) {
      if (!req.organizationId) {
        return res.status(403).json({ success: false, error: 'No organization assigned to your account' });
      }
      whereClause += ` AND o.id = $${paramIndex++}`;
      params.push(req.organizationId);
    } else {
      if (status === 'active') {
        whereClause += ` AND o.is_active = TRUE`;
      } else if (status === 'inactive') {
        whereClause += ` AND o.is_active = FALSE`;
      }
      if (search) {
        whereClause += ` AND (o.name ILIKE $${paramIndex} OR o.code ILIKE $${paramIndex} OR o.slug ILIKE $${paramIndex})`;
        params.push(search);
        paramIndex++;
      }
    }

    const countRes = await db.query(
      `SELECT COUNT(*) FROM organizations o WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = [...params, limit, offset];
    const dataRes = await db.query(
      `SELECT o.*,
              COUNT(DISTINCT om.user_id) FILTER (WHERE om.role = 'student') AS student_members_count,
              COUNT(DISTINCT om.user_id) FILTER (WHERE om.role = 'college_admin') AS admins_count,
              COUNT(DISTINCT sr.id) FILTER (WHERE sr.is_active = TRUE) AS active_roster_count,
              COUNT(DISTINCT a.id) AS assessments_count
       FROM organizations o
       LEFT JOIN organization_members om ON om.organization_id = o.id
       LEFT JOIN student_rosters sr ON sr.organization_id = o.id
       LEFT JOIN assessments a ON a.organization_id = o.id
       WHERE ${whereClause}
       GROUP BY o.id
       ORDER BY o.name ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      queryParams
    );

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      organizations: dataRes.rows,
      data: dataRes.rows,
      meta: { total, limit, offset },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single organization by ID or slug.
 */
exports.getOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSuper = isSuperAdmin(req.user);

    if (!isSuper && req.organizationId !== id) {
      return res.status(403).json({ success: false, error: 'Cannot view details of another organization' });
    }

    const result = await db.query(
      `SELECT o.*,
              COUNT(DISTINCT om.user_id) FILTER (WHERE om.role = 'student') AS student_members_count,
              COUNT(DISTINCT om.user_id) FILTER (WHERE om.role = 'college_admin') AS admins_count,
              COUNT(DISTINCT sr.id) FILTER (WHERE sr.is_active = TRUE) AS active_roster_count,
              COUNT(DISTINCT a.id) AS assessments_count
       FROM organizations o
       LEFT JOIN organization_members om ON om.organization_id = o.id
       LEFT JOIN student_rosters sr ON sr.organization_id = o.id
       LEFT JOIN assessments a ON a.organization_id = o.id
       WHERE o.id = $1 OR o.slug = $1
       GROUP BY o.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    res.status(200).json({ success: true, organization: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new organization (Super Admin only).
 */
exports.createOrganization = async (req, res, next) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Only Super Admin can create organizations' });
    }

    const { name, code, slug, domain, description, settings } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Organization name is required' });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const cleanCode = (code || cleanSlug).toUpperCase().trim();

    // Check slug and code uniqueness
    const existing = await db.query(
      `SELECT id FROM organizations WHERE slug = $1 OR code = $2`,
      [cleanSlug, cleanCode]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'An organization with this slug or code already exists' });
    }

    const insertRes = await db.query(
      `INSERT INTO organizations (name, slug, code, domain, description, settings, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name.trim(),
        cleanSlug,
        cleanCode,
        domain ? domain.trim().toLowerCase() : null,
        description || null,
        settings ? JSON.stringify(settings) : '{}',
        req.user.id,
      ]
    );

    const createdOrg = insertRes.rows[0];

    await logAdminAction({
      organizationId: createdOrg.id,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'organization.create',
      targetType: 'organization',
      targetId: createdOrg.id,
      details: { name: createdOrg.name, code: createdOrg.code, slug: createdOrg.slug },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, organization: createdOrg });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an organization.
 */
exports.updateOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSuper = isSuperAdmin(req.user);

    if (!isSuper && req.organizationId !== id) {
      return res.status(403).json({ success: false, error: 'Cannot modify another organization' });
    }

    const { name, code, domain, description, settings } = req.body;

    const currentRes = await db.query('SELECT * FROM organizations WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    const current = currentRes.rows[0];

    // Check code uniqueness if changing code
    if (code && code.trim().toUpperCase() !== current.code) {
      const codeCheck = await db.query(
        'SELECT id FROM organizations WHERE code = $1 AND id != $2',
        [code.trim().toUpperCase(), id]
      );
      if (codeCheck.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Organization code already in use' });
      }
    }

    const updatedName = name !== undefined ? name.trim() : current.name;
    const updatedCode = code !== undefined ? code.trim().toUpperCase() : current.code;
    const updatedDomain = domain !== undefined ? (domain ? domain.trim().toLowerCase() : null) : current.domain;
    const updatedDesc = description !== undefined ? description : current.description;
    const updatedSettings = settings !== undefined ? JSON.stringify(settings) : current.settings;

    const updateRes = await db.query(
      `UPDATE organizations
       SET name = $1, code = $2, domain = $3, description = $4, settings = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [updatedName, updatedCode, updatedDomain, updatedDesc, updatedSettings, id]
    );

    await logAdminAction({
      organizationId: id,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'organization.update',
      targetType: 'organization',
      targetId: id,
      details: { previous: current, updated: updateRes.rows[0] },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, organization: updateRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle organization active/suspended status (Super Admin only).
 */
exports.toggleOrganizationStatus = async (req, res, next) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Only Super Admin can activate or suspend organizations' });
    }

    const { id } = req.params;
    const { is_active } = req.body;

    const currentRes = await db.query('SELECT id, name, is_active FROM organizations WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const nextState = is_active !== undefined ? Boolean(is_active) : !currentRes.rows[0].is_active;

    const updateRes = await db.query(
      'UPDATE organizations SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [nextState, id]
    );

    await logAdminAction({
      organizationId: id,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: nextState ? 'organization.activate' : 'organization.suspend',
      targetType: 'organization',
      targetId: id,
      details: { previousState: currentRes.rows[0].is_active, newState: nextState, name: currentRes.rows[0].name },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, organization: updateRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * List College Admins for an organization.
 */
exports.getOrganizationAdmins = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSuper = isSuperAdmin(req.user);

    if (!isSuper && req.organizationId !== id) {
      return res.status(403).json({ success: false, error: 'Cannot view admins of another organization' });
    }

    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.display_name, u.role, u.is_active, om.joined_at, om.created_at
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.role = 'college_admin'
       ORDER BY om.created_at ASC`,
      [id]
    );

    res.status(200).json({ success: true, admins: result.rows, data: result.rows });
  } catch (err) {
    next(err);
  }
};

/**
 * Assign or promote a user to College Admin for an organization (Super Admin only).
 */
exports.assignCollegeAdmin = async (req, res, next) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Only Super Admin can assign College Admins' });
    }

    const { id } = req.params; // organization_id
    const { userId, email, username } = req.body;

    // Verify organization exists
    const orgRes = await db.query('SELECT id, name FROM organizations WHERE id = $1', [id]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Resolve user
    let userQuery = 'SELECT id, username, email, role FROM users WHERE ';
    const userParams = [];
    if (userId) {
      userQuery += 'id = $1';
      userParams.push(userId);
    } else if (email) {
      userQuery += 'email = $1';
      userParams.push(email.trim().toLowerCase());
    } else if (username) {
      userQuery += 'username = $1';
      userParams.push(username.trim());
    } else {
      return res.status(400).json({ success: false, error: 'userId, email, or username is required' });
    }

    const userRes = await db.query(userQuery, userParams);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Target user account not found' });
    }
    const targetUser = userRes.rows[0];

    // Upsert membership
    await db.query(
      `INSERT INTO organization_members (organization_id, user_id, role, enrollment_status)
       VALUES ($1, $2, 'college_admin', 'active')
       ON CONFLICT (organization_id, user_id) 
       DO UPDATE SET role = 'college_admin', enrollment_status = 'active', updated_at = NOW()`,
      [id, targetUser.id]
    );

    // If user's global role is 'user' or 'student', elevate to 'college_admin'
    if (targetUser.role === 'user' || targetUser.role === 'student') {
      await db.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [
        ROLES.COLLEGE_ADMIN,
        targetUser.id,
      ]);
    }

    await logAdminAction({
      organizationId: id,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'college_admin.assign',
      targetType: 'user',
      targetId: targetUser.id,
      details: {
        targetEmail: targetUser.email,
        targetUsername: targetUser.username,
        organizationName: orgRes.rows[0].name,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `User ${targetUser.email} assigned as College Admin for ${orgRes.rows[0].name}`,
      user: { id: targetUser.id, email: targetUser.email, role: ROLES.COLLEGE_ADMIN },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Revoke College Admin privileges for an organization (Super Admin only).
 */
exports.revokeCollegeAdmin = async (req, res, next) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Only Super Admin can revoke College Admin privileges' });
    }

    const { id, userId } = req.params;

    // Remove or demote from organization_members
    const delRes = await db.query(
      `DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND role = 'college_admin' RETURNING *`,
      [id, userId]
    );

    if (delRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'College admin assignment not found' });
    }

    // Check if user has any other college_admin assignments
    const remainingAdmins = await db.query(
      `SELECT id FROM organization_members WHERE user_id = $1 AND role = 'college_admin'`,
      [userId]
    );

    // If no other college admin assignments, and not super_admin, demote user role back to 'student'
    const targetUser = await db.query('SELECT role, email FROM users WHERE id = $1', [userId]);
    if (remainingAdmins.rows.length === 0 && targetUser.rows[0]?.role === ROLES.COLLEGE_ADMIN) {
      await db.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [ROLES.STUDENT, userId]);
    }

    await logAdminAction({
      organizationId: id,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'college_admin.revoke',
      targetType: 'user',
      targetId: userId,
      details: { organizationId: id, revokedEmail: targetUser.rows[0]?.email },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'College Admin privileges revoked' });
  } catch (err) {
    next(err);
  }
};

/**
 * View Administrative Audit History.
 * Super Admin: platform-wide or filtered by organization.
 * College Admin: strictly scoped to req.organizationId.
 */
exports.getAuditLogs = async (req, res, next) => {
  try {
    const isSuper = isSuperAdmin(req.user);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const actionFilter = req.query.action || null;
    const targetTypeFilter = req.query.targetType || null;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (!isSuper) {
      if (!req.organizationId) {
        return res.status(403).json({ success: false, error: 'No organization assigned' });
      }
      whereClause += ` AND a.organization_id = $${paramIndex++}`;
      params.push(req.organizationId);
    } else if (req.query.organizationId) {
      whereClause += ` AND a.organization_id = $${paramIndex++}`;
      params.push(req.query.organizationId);
    }

    if (actionFilter) {
      whereClause += ` AND a.action = $${paramIndex++}`;
      params.push(actionFilter);
    }

    if (targetTypeFilter) {
      whereClause += ` AND a.target_type = $${paramIndex++}`;
      params.push(targetTypeFilter);
    }

    const countRes = await db.query(
      `SELECT COUNT(*) FROM admin_audit_logs a WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await db.query(
      `SELECT a.*, o.name AS organization_name, o.slug AS organization_slug, u.username AS actor_username
       FROM admin_audit_logs a
       LEFT JOIN organizations o ON o.id = a.organization_id
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      logs: dataRes.rows,
    });
  } catch (err) {
    next(err);
  }
};
