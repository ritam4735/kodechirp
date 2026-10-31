// gateway/src/controllers/assessmentExportController.js
// ─────────────────────────────────────────────────────────────────────────────
// Assessment Results Export Controller — Organization-Scoped Export & History
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const exportService = require('../services/assessmentExportService');
const { isSuperAdmin } = require('../middleware/rbac');

/**
 * Preview exportable assessment results with statistics before downloading.
 */
exports.previewExport = async (req, res, next) => {
  try {
    const { id: assessmentId } = req.params;
    const isSuper = isSuperAdmin(req.user);
    const orgId = req.organizationId;

    const filters = {
      status: req.query.status || 'all',
      department: req.query.department || 'all',
      academicYear: req.query.academicYear || 'all',
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
    };

    const { assessment, rows } = await exportService.getExportResults({
      assessmentId,
      organizationId: orgId,
      isSuperAdmin: isSuper,
      filters,
    });

    // Compute summary metrics
    const totalAttempts = rows.length;
    const scores = rows.map(r => Number(r.total_score) || 0);
    const percentages = rows.map(r => Number(r.percentage) || 0);
    const passThreshold = Number(assessment.pass_percentage) || 40;
    const passedCount = percentages.filter(p => p >= passThreshold).length;

    const avgScore = totalAttempts > 0 ? (scores.reduce((a, b) => a + b, 0) / totalAttempts).toFixed(2) : 0;
    const highestScore = totalAttempts > 0 ? Math.max(...scores).toFixed(2) : 0;
    const lowestScore = totalAttempts > 0 ? Math.min(...scores).toFixed(2) : 0;
    const passRate = totalAttempts > 0 ? ((passedCount / totalAttempts) * 100).toFixed(1) : 0;

    // Available departments and academic years from the attempts
    const departments = Array.from(new Set(rows.map(r => r.department).filter(d => d && d !== 'N/A')));
    const academicYears = Array.from(new Set(rows.map(r => r.academic_year).filter(y => y && y !== 'N/A')));

    res.status(200).json({
      success: true,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        slug: assessment.slug,
        totalMarks: assessment.total_marks,
        passPercentage: assessment.pass_percentage,
      },
      summary: {
        totalAttempts,
        avgScore: Number(avgScore),
        highestScore: Number(highestScore),
        lowestScore: Number(lowestScore),
        passRate: Number(passRate),
        passedCount,
        failedCount: totalAttempts - passedCount,
      },
      availableFilters: {
        departments,
        academicYears,
      },
      previewRows: rows.slice(0, 25),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Download assessment results file (.xlsx or .csv).
 */
exports.downloadExport = async (req, res, next) => {
  try {
    const { id: assessmentId } = req.params;
    const isSuper = isSuperAdmin(req.user);
    const orgId = req.organizationId;
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';

    let selectedFields = null;
    if (req.query.fields) {
      selectedFields = req.query.fields.split(',').map(f => f.trim());
    }

    const filters = {
      status: req.query.status || 'all',
      department: req.query.department || 'all',
      academicYear: req.query.academicYear || 'all',
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
    };

    const { assessment, rows } = await exportService.getExportResults({
      assessmentId,
      organizationId: orgId,
      isSuperAdmin: isSuper,
      filters,
    });

    const file = await exportService.generateExportFile(rows, assessment, format, selectedFields);

    // Record export in background
    await exportService.recordExportLog({
      assessmentId,
      organizationId: orgId || assessment.organization_id,
      adminUser: req.user,
      format,
      filters,
      recordsCount: file.totalRecords,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return res.send(file.buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * View results export logs history.
 */
exports.getExportHistory = async (req, res, next) => {
  try {
    const { id: assessmentId } = req.params;
    const isSuper = isSuperAdmin(req.user);
    const orgId = req.organizationId;

    let whereClause = 'ael.assessment_id = $1';
    const params = [assessmentId];
    let paramIndex = 2;

    if (!isSuper && orgId) {
      whereClause += ` AND ael.organization_id = $${paramIndex++}`;
      params.push(orgId);
    }

    const result = await db.query(
      `SELECT ael.*, ael.records_count AS record_count, u.username AS exported_by_username, u.username AS admin_username, u.email AS exported_by_email, o.name AS organization_name
       FROM assessment_export_logs ael
       JOIN users u ON u.id = ael.exported_by
       LEFT JOIN organizations o ON o.id = ael.organization_id
       WHERE ${whereClause}
       ORDER BY ael.created_at DESC
       LIMIT 50`,
      params
    );

    res.status(200).json({ success: true, history: result.rows, data: result.rows });
  } catch (err) {
    next(err);
  }
};
