// gateway/src/services/assessmentExportService.js
// ─────────────────────────────────────────────────────────────────────────────
// Assessment Results Export Service — XLSX & CSV with Formula Injection Defense
// ─────────────────────────────────────────────────────────────────────────────

const XLSX = require('xlsx');
const db = require('../config/database');
const logger = require('../utils/logger');
const { logAdminAction } = require('../middleware/rbac');

/**
 * Sanitize cell values against Formula Injection (CSV/Excel Formula Injection).
 * Any cell value starting with '=', '+', '-', '@', '\t', or '\r' is prefixed with a single quote "'".
 */
function sanitizeCell(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Query authorized assessment attempt results for an organization.
 */
async function getExportResults({ assessmentId, organizationId, isSuperAdmin = false, filters = {} }) {
  // Verify assessment exists
  const assessRes = await db.query(
    `SELECT a.id, a.title, a.slug, a.organization_id, a.total_marks, a.pass_percentage, a.show_answers_mode
     FROM assessments a
     WHERE a.id = $1`,
    [assessmentId]
  );

  if (assessRes.rows.length === 0) {
    const err = new Error('Assessment not found');
    err.status = 404;
    throw err;
  }

  const assessment = assessRes.rows[0];

  // Organization security check
  if (!isSuperAdmin && assessment.organization_id && assessment.organization_id !== organizationId) {
    const err = new Error('Access denied: Cannot export results of another organization\'s assessment');
    err.status = 403;
    throw err;
  }

  let whereClause = `aa.assessment_id = $1`;
  const params = [assessmentId];
  let paramIndex = 2;

  // If organization-scoped, only return attempts by students belonging to this organization
  if (organizationId && !isSuperAdmin) {
    whereClause += ` AND (
      sr.organization_id = $${paramIndex} OR 
      om.organization_id = $${paramIndex} OR 
      a.organization_id = $${paramIndex}
    )`;
    params.push(organizationId);
    paramIndex++;
  }

  // Filters
  if (filters.status && filters.status !== 'all') {
    whereClause += ` AND aa.status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters.department && filters.department !== 'all') {
    whereClause += ` AND (sr.department = $${paramIndex} OR om.department = $${paramIndex})`;
    params.push(filters.department);
    paramIndex++;
  }

  if (filters.academicYear && filters.academicYear !== 'all') {
    whereClause += ` AND (sr.academic_year = $${paramIndex} OR om.academic_year = $${paramIndex})`;
    params.push(filters.academicYear);
    paramIndex++;
  }

  if (filters.startDate) {
    whereClause += ` AND aa.started_at >= $${paramIndex++}`;
    params.push(new Date(filters.startDate));
  }

  if (filters.endDate) {
    whereClause += ` AND aa.started_at <= $${paramIndex++}`;
    params.push(new Date(filters.endDate));
  }

  const query = `
    SELECT 
      aa.id AS attempt_id,
      aa.attempt_number,
      aa.status AS attempt_status,
      aa.started_at,
      aa.submitted_at,
      aa.total_score,
      aa.max_marks,
      aa.percentage,
      aa.total_questions,
      aa.answered_count,
      aa.correct_count,
      aa.incorrect_count,
      aa.unanswered_count,
      aa.section_scores,
      aa.is_finalized,
      u.id AS user_id,
      u.username,
      u.email AS user_email,
      u.display_name,
      COALESCE(sr.student_id_number, om.student_id_number, u.username) AS student_id,
      COALESCE(sr.student_name, u.display_name, u.username) AS student_name,
      COALESCE(sr.college_email, u.email) AS college_email,
      COALESCE(sr.department, om.department, 'N/A') AS department,
      COALESCE(sr.academic_year, om.academic_year, 'N/A') AS academic_year,
      a.title AS assessment_title,
      a.slug AS assessment_slug,
      ROUND(EXTRACT(EPOCH FROM (COALESCE(aa.submitted_at, aa.expires_at) - aa.started_at)) / 60, 1) AS time_taken_minutes
    FROM assessment_attempts aa
    JOIN assessments a ON a.id = aa.assessment_id
    JOIN users u ON u.id = aa.user_id
    LEFT JOIN student_rosters sr ON (sr.matched_user_id = u.id OR LOWER(sr.college_email) = LOWER(u.email))
    LEFT JOIN organization_members om ON (om.user_id = u.id AND (om.organization_id = a.organization_id OR om.organization_id = $${organizationId ? 2 : 1}))
    WHERE ${whereClause}
    ORDER BY aa.total_score DESC, aa.submitted_at ASC
  `;

  const result = await db.query(query, params);
  return { assessment, rows: result.rows };
}

/**
 * Format and serialize assessment attempt rows into XLSX or CSV buffer.
 */
function generateExportFile(rows, assessment, format = 'xlsx', selectedFields = null) {
  const defaultFields = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'student_name', label: 'Student Name' },
    { key: 'college_email', label: 'College Email' },
    { key: 'department', label: 'Department' },
    { key: 'academic_year', label: 'Academic Year' },
    { key: 'assessment_title', label: 'Assessment Title' },
    { key: 'attempt_number', label: 'Attempt #' },
    { key: 'attempt_status', label: 'Status' },
    { key: 'started_at', label: 'Started At' },
    { key: 'submitted_at', label: 'Submitted At' },
    { key: 'time_taken_minutes', label: 'Time Taken (Mins)' },
    { key: 'total_score', label: 'Score' },
    { key: 'max_marks', label: 'Max Marks' },
    { key: 'percentage', label: 'Percentage (%)' },
    { key: 'result_status', label: 'Result Status' },
    { key: 'correct_count', label: 'Correct Answers' },
    { key: 'incorrect_count', label: 'Incorrect Answers' },
    { key: 'unanswered_count', label: 'Unanswered' },
  ];

  const fieldsToExport = selectedFields && Array.isArray(selectedFields) && selectedFields.length > 0
    ? defaultFields.filter(f => selectedFields.includes(f.key))
    : defaultFields;

  const formattedRows = rows.map((r, index) => {
    const rowObj = {};
    const passPct = assessment.pass_percentage || 40;
    const isPassed = (r.percentage || 0) >= passPct;
    const resultStatus = r.is_finalized ? (isPassed ? 'Passed' : 'Failed') : 'Pending Evaluation';

    for (const f of fieldsToExport) {
      let val = '';
      if (f.key === 'result_status') {
        val = resultStatus;
      } else if (f.key === 'started_at' || f.key === 'submitted_at') {
        val = r[f.key] ? new Date(r[f.key]).toISOString().replace('T', ' ').substring(0, 19) : 'N/A';
      } else if (f.key === 'percentage' || f.key === 'total_score' || f.key === 'max_marks') {
        val = r[f.key] !== null ? Number(r[f.key]) : 0;
      } else {
        val = r[f.key] !== undefined && r[f.key] !== null ? r[f.key] : '';
      }

      rowObj[f.label] = sanitizeCell(val);
    }
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(
    formattedRows.length > 0 ? formattedRows : [{ Message: 'No assessment attempts found matching criteria' }]
  );

  // Set column widths
  const colWidths = fieldsToExport.map(f => ({ wch: Math.max(f.label.length + 4, 15) }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  const sheetName = (assessment.title || 'Assessment Results').substring(0, 30).replace(/[:\/\\?*\[\]]/g, '');
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanTitle = (assessment.title || 'assessment').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const timestamp = new Date().toISOString().substring(0, 10);

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      contentType: 'text/csv; charset=utf-8',
      fileName: `${cleanTitle}_results_${timestamp}.csv`,
      totalRecords: rows.length,
    };
  }

  const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return {
    buffer: xlsxBuffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileName: `${cleanTitle}_results_${timestamp}.xlsx`,
    totalRecords: rows.length,
  };
}

/**
 * Record export in assessment_export_logs and admin_audit_logs.
 */
async function recordExportLog({ assessmentId, organizationId, adminUser, format, filters, recordsCount, ipAddress }) {
  try {
    await db.query(
      `INSERT INTO assessment_export_logs 
        (assessment_id, organization_id, exported_by, format, filters, records_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'completed')`,
      [
        assessmentId,
        organizationId,
        adminUser.id,
        format,
        JSON.stringify(filters || {}),
        recordsCount,
      ]
    );

    await logAdminAction({
      organizationId,
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'assessment.results_export',
      targetType: 'assessment',
      targetId: assessmentId,
      details: { format, filters, recordsCount },
      ipAddress,
    });
  } catch (err) {
    logger.error({ err, assessmentId }, '[Export] Failed to record export log');
  }
}

module.exports = {
  sanitizeCell,
  getExportResults,
  generateExportFile,
  recordExportLog,
};
