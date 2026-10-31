// gateway/src/controllers/rosterController.js
// ─────────────────────────────────────────────────────────────────────────────
// Student Roster Controller — Organization-Scoped Roster & Import/Export
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const rosterService = require('../services/rosterService');
const { isSuperAdmin, logAdminAction } = require('../middleware/rbac');

/**
 * Get organization student roster with filtering and pagination.
 */
exports.getRoster = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const department = req.query.department || null;
    const academicYear = req.query.academicYear || null;
    const status = req.query.status || null; // 'active', 'inactive', 'graduated', 'suspended'
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    let whereClause = 'sr.organization_id = $1';
    const params = [orgId];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (sr.student_name ILIKE $${paramIndex} OR sr.student_id_number ILIKE $${paramIndex} OR sr.college_email ILIKE $${paramIndex})`;
      params.push(search);
      paramIndex++;
    }

    if (department && department !== 'all') {
      whereClause += ` AND sr.department = $${paramIndex++}`;
      params.push(department);
    }

    if (academicYear && academicYear !== 'all') {
      whereClause += ` AND sr.academic_year = $${paramIndex++}`;
      params.push(academicYear);
    }

    if (status && status !== 'all') {
      whereClause += ` AND sr.enrollment_status = $${paramIndex++}`;
      params.push(status);
    }

    const countRes = await db.query(
      `SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN sr.is_active = TRUE AND (sr.enrollment_status = 'active' OR sr.enrollment_status IS NULL) THEN 1 END)::int AS active_count,
        COUNT(CASE WHEN sr.matched_user_id IS NOT NULL THEN 1 END)::int AS registered_count
       FROM student_rosters sr WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);
    const activeCount = parseInt(countRes.rows[0].active_count, 10);
    const registeredCount = parseInt(countRes.rows[0].registered_count, 10);

    // Get unique departments and academic years for filter dropdowns
    const filtersRes = await db.query(
      `SELECT 
        ARRAY_AGG(DISTINCT sr.department) FILTER (WHERE sr.department IS NOT NULL AND sr.department != '') AS departments,
        ARRAY_AGG(DISTINCT sr.academic_year) FILTER (WHERE sr.academic_year IS NOT NULL AND sr.academic_year != '') AS academic_years
       FROM student_rosters sr
       WHERE sr.organization_id = $1`,
      [orgId]
    );

    const dataRes = await db.query(
      `SELECT sr.*, 
              sr.student_id_number AS student_id,
              sr.matched_user_id AS user_id,
              u.id AS user_account_id, u.username, u.avatar_url,
              (sr.matched_user_id IS NOT NULL) AS has_account
       FROM student_rosters sr
       LEFT JOIN users u ON u.id = sr.matched_user_id
       WHERE ${whereClause}
       ORDER BY sr.student_name ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      students: dataRes.rows,
      data: dataRes.rows,
      meta: { total, activeCount, registeredCount, limit, offset },
      availableDepartments: filtersRes.rows[0]?.departments || [],
      availableAcademicYears: filtersRes.rows[0]?.academic_years || [],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Download sample roster template (.xlsx or .csv).
 */
exports.getTemplate = async (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const template = await rosterService.generateRosterTemplate(format);

    res.setHeader('Content-Type', template.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${template.fileName}"`);
    return res.send(template.buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Preview and validate roster file before committing.
 */
exports.previewRosterImport = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded. Please upload a .xlsx or .csv file.' });
    }

    const { rows, headers, totalRows, isCsv } = await rosterService.parseRosterFile(
      req.file.buffer,
      req.file.originalname
    );

    // Optional client column mapping override
    let columnMapping = {};
    if (req.body.columnMapping) {
      try {
        columnMapping = typeof req.body.columnMapping === 'string'
          ? JSON.parse(req.body.columnMapping)
          : req.body.columnMapping;
      } catch {
        columnMapping = {};
      }
    }

    // Auto-detect any missing mapping keys
    const autoDetected = rosterService.autoDetectMapping(headers);
    const finalMapping = { ...autoDetected, ...columnMapping };

    // Validate rows
    const validationResult = await rosterService.validateRosterRows(
      rows,
      finalMapping,
      orgId
    );

    const crypto = require('crypto');
    const batchId = crypto.randomUUID();
    const validRows = [
      ...(validationResult.validNew || []),
      ...(validationResult.validUpdated || []),
      ...(validationResult.unchanged || []),
    ];

    res.status(200).json({
      success: true,
      batchId,
      fileName: req.file.originalname,
      fileFormat: isCsv ? 'csv' : 'xlsx',
      detectedHeaders: headers,
      columnMapping: finalMapping,
      validation: validationResult,
      validRows,
      invalidRows: validationResult.invalid || [],
      conflicts: validationResult.conflicts || [],
      validNew: validationResult.validNew || [],
      validUpdated: validationResult.validUpdated || [],
      unchanged: validationResult.unchanged || [],
      missingRecords: validationResult.missingRecords || [],
      summary: {
        totalRows: validationResult.summary.totalRows,
        newRecords: validationResult.summary.validNewCount,
        updatedRecords: validationResult.summary.validUpdatedCount,
        unchangedRecords: validationResult.summary.unchangedCount,
        invalidRecords: (validationResult.summary.invalidCount || 0) + (validationResult.summary.conflictsCount || 0),
        missingActiveCount: validationResult.summary.missingActiveCount || 0,
        ...validationResult.summary,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirm and commit roster import.
 */
exports.confirmRosterImport = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    let {
      fileName = 'roster_import',
      fileFormat = 'xlsx',
      columnMapping = {},
      deactivationPolicy = 'deactivate_missing',
      validNew = [],
      validUpdated = [],
      unchanged = [],
      invalid = [],
      conflicts = [],
      missingRecords = [],
      rows = [],
    } = req.body;

    if (deactivationPolicy === 'mark_inactive') {
      deactivationPolicy = 'deactivate_missing';
    }

    // If client supplied flat `rows` array (fallback)
    if (!validNew.length && !validUpdated.length && !unchanged.length && rows.length > 0) {
      for (const r of rows) {
        if (r.existingId) {
          validUpdated.push(r);
        } else {
          validNew.push(r);
        }
      }
    }

    // If a file was uploaded in this request directly:
    if (req.file) {
      fileName = req.file.originalname;
      const parsed = await rosterService.parseRosterFile(req.file.buffer, req.file.originalname);
      fileFormat = parsed.isCsv ? 'csv' : 'xlsx';
      const autoMapping = rosterService.autoDetectMapping(parsed.headers);
      columnMapping = { ...autoMapping, ...columnMapping };

      const validated = await rosterService.validateRosterRows(parsed.rows, columnMapping, orgId);
      validNew = validated.validNew;
      validUpdated = validated.validUpdated;
      unchanged = validated.unchanged;
      invalid = validated.invalid;
      conflicts = validated.conflicts;
      missingRecords = validated.missingRecords;
    }

    if (!validNew.length && !validUpdated.length && !unchanged.length && invalid.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot import file: all rows are invalid or conflicting.',
        invalidCount: invalid.length,
      });
    }

    const batch = await rosterService.commitRosterImport({
      organizationId: orgId,
      adminUser: req.user,
      fileName,
      fileFormat,
      columnMapping,
      deactivationPolicy,
      validNew,
      validUpdated,
      unchanged,
      invalid,
      conflicts,
      missingRecords,
      ipAddress: req.ip,
    });

    const summary = {
      totalRows: batch.total_rows,
      newRecords: batch.valid_new,
      updatedRecords: batch.updated_count,
      unchangedRecords: batch.unchanged_count,
      deactivatedRecords: batch.deactivated_count,
      invalidRecords: batch.invalid_count,
    };

    res.status(201).json({
      success: true,
      message: `Import processed successfully. ${batch.valid_new} added, ${batch.updated_count} updated, ${batch.deactivated_count} deactivated.`,
      importBatch: batch,
      summary,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * View Roster Import History.
 */
exports.getImportHistory = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const countRes = await db.query(
      'SELECT COUNT(*) FROM roster_imports WHERE organization_id = $1',
      [orgId]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await db.query(
      `SELECT ri.*, u.username AS imported_by_username, u.email AS imported_by_email
       FROM roster_imports ri
       LEFT JOIN users u ON u.id = ri.imported_by
       WHERE ri.organization_id = $1
       ORDER BY ri.created_at DESC
       LIMIT $2 OFFSET $3`,
      [orgId, limit, offset]
    );

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      history: dataRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Download error report for a specific import batch.
 */
exports.downloadErrorReport = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM roster_imports WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Import record not found' });
    }

    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    const report = await rosterService.generateErrorReport(result.rows[0], format);

    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return res.send(report.buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Update a student's eligibility status or details manually.
 */
exports.updateStudentEligibility = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { studentId } = req.params;
    const { is_active, enrollment_status, department, academic_year } = req.body;

    const existingRes = await db.query(
      'SELECT * FROM student_rosters WHERE id = $1 AND organization_id = $2',
      [studentId, orgId]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student roster record not found' });
    }
    const current = existingRes.rows[0];

    let updatedActive;
    let updatedStatus;

    if (enrollment_status !== undefined) {
      updatedStatus = enrollment_status;
      if (is_active !== undefined) {
        updatedActive = Boolean(is_active);
      } else {
        updatedActive = (enrollment_status === 'active');
      }
    } else if (is_active !== undefined) {
      updatedActive = Boolean(is_active);
      if (updatedActive) {
        updatedStatus = (current.enrollment_status === 'inactive' || !current.enrollment_status) ? 'active' : current.enrollment_status;
      } else {
        updatedStatus = current.enrollment_status === 'active' ? 'inactive' : current.enrollment_status;
      }
    } else {
      updatedActive = current.is_active;
      updatedStatus = current.enrollment_status;
    }

    const updatedDept = department !== undefined ? department : current.department;
    const updatedYear = academic_year !== undefined ? academic_year : current.academic_year;

    // Check if matched user exists or can be matched
    let matchedUserId = current.matched_user_id;
    if (!matchedUserId && current.college_email) {
      const userRes = await db.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [current.college_email]
      );
      if (userRes.rows.length > 0) {
        matchedUserId = userRes.rows[0].id;
      }
    }

    const result = await db.query(
      `UPDATE student_rosters
       SET is_active = $1, enrollment_status = $2, department = $3, academic_year = $4,
           matched_user_id = COALESCE($5, matched_user_id),
           updated_at = NOW()
       WHERE id = $6 AND organization_id = $7
       RETURNING *`,
      [updatedActive, updatedStatus, updatedDept, updatedYear, matchedUserId, studentId, orgId]
    );

    // Synchronize organization_members if student has matched user account
    if (matchedUserId) {
      await db.query(
        `INSERT INTO organization_members (organization_id, user_id, role, department, academic_year, enrollment_status, student_id_number, updated_at)
         VALUES ($1, $2, 'student', $3, $4, $5, $6, NOW())
         ON CONFLICT (organization_id, user_id)
         DO UPDATE SET
            department = EXCLUDED.department,
            academic_year = EXCLUDED.academic_year,
            enrollment_status = EXCLUDED.enrollment_status,
            student_id_number = EXCLUDED.student_id_number,
            updated_at = NOW()`,
        [orgId, matchedUserId, updatedDept, updatedYear, updatedStatus, current.student_id_number]
      );
    }

    await logAdminAction({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'roster.student_eligibility_update',
      targetType: 'student_roster',
      targetId: studentId,
      details: { previous: current, updated: result.rows[0] },
      ipAddress: req.ip,
    });

    const studentRecord = {
      ...result.rows[0],
      student_id: result.rows[0].student_id_number,
      user_id: result.rows[0].matched_user_id,
      has_account: Boolean(result.rows[0].matched_user_id),
    };

    res.status(200).json({ success: true, student: studentRecord });
  } catch (err) {
    next(err);
  }
};
