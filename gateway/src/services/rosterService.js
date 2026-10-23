// gateway/src/services/rosterService.js
// ─────────────────────────────────────────────────────────────────────────────
// Student Roster Import & Eligibility Management Service
// Supports: .xlsx and .csv parsing, validation, conflict detection, persistence
// ─────────────────────────────────────────────────────────────────────────────

const XLSX = require('xlsx');
const db = require('../config/database');
const logger = require('../utils/logger');
const { logAdminAction } = require('../middleware/rbac');

const MAX_ROWS = 5000;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const HEADER_ALIASES = {
  student_id: ['student id', 'studentid', 'roll no', 'roll number', 'rollno', 'registration no', 'reg no', 'id', 'student_id', 'roll_no'],
  college_email: ['college email', 'email', 'mail', 'email id', 'student email', 'college_email', 'email_address', 'mail_id'],
  student_name: ['student name', 'name', 'full name', 'student_name', 'fullname', 'candidate name'],
  department: ['department', 'dept', 'branch', 'stream', 'course', 'discipline'],
  academic_year: ['academic year', 'year', 'batch', 'graduating year', 'academic_year', 'class', 'cohort'],
  enrollment_status: ['enrollment status', 'status', 'enrollment_status', 'state'],
};

/**
 * Parse an uploaded buffer (.xlsx or .csv) into rows of raw objects.
 */
function parseRosterFile(buffer, originalname = '') {
  if (!buffer || buffer.length === 0) {
    const err = new Error('Uploaded file is empty');
    err.status = 400;
    throw err;
  }

  const isCsv = originalname.toLowerCase().endsWith('.csv');
  let workbook;

  try {
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
      sheetRows: MAX_ROWS + 10,
    });
  } catch (parseErr) {
    logger.warn({ parseErr, originalname }, '[Roster] Workbook parsing failed');
    const err = new Error('Failed to parse spreadsheet file. Please ensure it is a valid .xlsx or .csv file.');
    err.status = 400;
    throw err;
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    const err = new Error('Spreadsheet contains no sheets');
    err.status = 400;
    throw err;
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  if (rows.length === 0) {
    const err = new Error('Spreadsheet has no data rows');
    err.status = 400;
    throw err;
  }

  if (rows.length > MAX_ROWS) {
    const err = new Error(`Roster file exceeds maximum supported limit of ${MAX_ROWS} rows.`);
    err.status = 400;
    throw err;
  }

  // Get raw headers from first row keys
  const headers = Object.keys(rows[0]);

  return { rows, headers, totalRows: rows.length, isCsv };
}

/**
 * Automatically map detected file headers to standard canonical keys.
 */
function autoDetectMapping(headers) {
  const mapping = {};
  const lowerHeaders = headers.map(h => ({ raw: h, clean: String(h).toLowerCase().trim() }));

  for (const [canonicalKey, aliases] of Object.entries(HEADER_ALIASES)) {
    const match = lowerHeaders.find(h => aliases.includes(h.clean));
    if (match) {
      mapping[canonicalKey] = match.raw;
    }
  }

  return mapping;
}

/**
 * Validate roster rows against format, identity, and current database records.
 */
async function validateRosterRows(rawRows, columnMapping, organizationId) {
  const idCol = columnMapping.student_id;
  const emailCol = columnMapping.college_email;
  const nameCol = columnMapping.student_name;
  const deptCol = columnMapping.department;
  const yearCol = columnMapping.academic_year;
  const statusCol = columnMapping.enrollment_status;

  if (!idCol || !emailCol || !nameCol) {
    const err = new Error('Column mapping must specify student_id, college_email, and student_name');
    err.status = 400;
    throw err;
  }

  // Fetch existing roster records for this organization
  const existingRostersRes = await db.query(
    `SELECT id, student_id_number, college_email, student_name, department, academic_year, enrollment_status, is_active, matched_user_id
     FROM student_rosters
     WHERE organization_id = $1`,
    [organizationId]
  );

  const existingById = new Map();
  const existingByEmail = new Map();
  for (const rec of existingRostersRes.rows) {
    existingById.set(rec.student_id_number.toLowerCase(), rec);
    existingByEmail.set(rec.college_email.toLowerCase(), rec);
  }

  const validNew = [];
  const validUpdated = [];
  const unchanged = [];
  const invalid = [];
  const conflicts = [];
  const fileStudentIds = new Set();
  const fileEmails = new Set();

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // 1-indexed header is row 1
    const rawId = String(row[idCol] || '').trim();
    const rawEmail = String(row[emailCol] || '').trim().toLowerCase();
    const rawName = String(row[nameCol] || '').trim();
    const dept = deptCol && row[deptCol] ? String(row[deptCol]).trim() : '';
    const year = yearCol && row[yearCol] ? String(row[yearCol]).trim() : '';
    let status = statusCol && row[statusCol] ? String(row[statusCol]).trim().toLowerCase() : 'active';

    if (!['active', 'inactive', 'graduated', 'suspended'].includes(status)) {
      status = 'active';
    }

    const rowErrors = [];

    if (!rawId) {
      rowErrors.push('Missing Student ID');
    }
    if (!rawEmail) {
      rowErrors.push('Missing College Email');
    } else if (!EMAIL_REGEX.test(rawEmail)) {
      rowErrors.push(`Invalid email syntax: "${rawEmail}"`);
    }
    if (!rawName) {
      rowErrors.push('Missing Student Name');
    }

    // In-file duplicate detection
    if (rawId && fileStudentIds.has(rawId.toLowerCase())) {
      rowErrors.push(`Duplicate Student ID in file: "${rawId}"`);
    }
    if (rawEmail && fileEmails.has(rawEmail)) {
      rowErrors.push(`Duplicate Email in file: "${rawEmail}"`);
    }

    if (rowErrors.length > 0) {
      invalid.push({
        row: rowNum,
        studentId: rawId,
        email: rawEmail,
        name: rawName,
        department: dept,
        academicYear: year,
        status,
        errors: rowErrors,
      });
      return;
    }

    fileStudentIds.add(rawId.toLowerCase());
    fileEmails.add(rawEmail);

    // Cross-identity conflict check with DB
    const existingForId = existingById.get(rawId.toLowerCase());
    const existingForEmail = existingByEmail.get(rawEmail);

    if (existingForId && existingForEmail && existingForId.id !== existingForEmail.id) {
      conflicts.push({
        row: rowNum,
        studentId: rawId,
        email: rawEmail,
        name: rawName,
        department: dept,
        academicYear: year,
        status,
        reason: `Student ID belongs to "${existingForId.student_name}" (${existingForId.college_email}), but Email belongs to "${existingForEmail.student_name}" (${existingForEmail.student_id_number}).`,
      });
      return;
    }

    const existing = existingForId || existingForEmail;

    const recordPayload = {
      row: rowNum,
      studentId: rawId,
      email: rawEmail,
      name: rawName,
      department: dept,
      academicYear: year,
      status,
      existingId: existing ? existing.id : null,
    };

    if (!existing) {
      validNew.push(recordPayload);
    } else {
      // Check if anything actually changed
      const isUnchanged =
        existing.student_name === rawName &&
        existing.student_id_number.toLowerCase() === rawId.toLowerCase() &&
        existing.college_email.toLowerCase() === rawEmail &&
        (existing.department || '') === dept &&
        (existing.academic_year || '') === year &&
        existing.enrollment_status === status &&
        existing.is_active === (status === 'active');

      if (isUnchanged) {
        unchanged.push(recordPayload);
      } else {
        validUpdated.push({
          ...recordPayload,
          changes: {
            name: existing.student_name !== rawName ? { from: existing.student_name, to: rawName } : null,
            email: existing.college_email !== rawEmail ? { from: existing.college_email, to: rawEmail } : null,
            id: existing.student_id_number !== rawId ? { from: existing.student_id_number, to: rawId } : null,
            department: (existing.department || '') !== dept ? { from: existing.department, to: dept } : null,
            year: (existing.academic_year || '') !== year ? { from: existing.academic_year, to: year } : null,
            status: existing.enrollment_status !== status ? { from: existing.enrollment_status, to: status } : null,
          },
        });
      }
    }
  });

  // Calculate missing records from current active DB roster
  const missingRecords = [];
  for (const rec of existingRostersRes.rows) {
    if (rec.is_active && !fileStudentIds.has(rec.student_id_number.toLowerCase()) && !fileEmails.has(rec.college_email.toLowerCase())) {
      missingRecords.push({
        id: rec.id,
        studentId: rec.student_id_number,
        email: rec.college_email,
        name: rec.student_name,
        department: rec.department,
        academicYear: rec.academic_year,
      });
    }
  }

  return {
    summary: {
      totalRows: rawRows.length,
      validNewCount: validNew.length,
      validUpdatedCount: validUpdated.length,
      unchangedCount: unchanged.length,
      invalidCount: invalid.length,
      conflictsCount: conflicts.length,
      missingActiveCount: missingRecords.length,
      readyToImport: invalid.length === 0 && conflicts.length === 0,
    },
    validNew,
    validUpdated,
    unchanged,
    invalid,
    conflicts,
    missingRecords,
  };
}

/**
 * Commit validated roster import within a PostgreSQL transaction.
 */
async function commitRosterImport({
  organizationId,
  adminUser,
  fileName,
  fileFormat,
  columnMapping,
  deactivationPolicy = 'deactivate_missing',
  validNew,
  validUpdated,
  unchanged,
  invalid,
  conflicts,
  missingRecords,
  ipAddress,
}) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create roster_imports record
    const importRes = await client.query(
      `INSERT INTO roster_imports 
        (organization_id, imported_by, file_name, file_format, total_rows, valid_new, updated_count, unchanged_count, 
         duplicate_count, invalid_count, deactivated_count, status, validation_errors, column_mapping, deactivation_policy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        organizationId,
        adminUser.id,
        fileName,
        fileFormat,
        validNew.length + validUpdated.length + unchanged.length + invalid.length + conflicts.length,
        validNew.length,
        validUpdated.length,
        unchanged.length,
        conflicts.length,
        invalid.length,
        (deactivationPolicy === 'deactivate_missing' || deactivationPolicy === 'mark_inactive') ? missingRecords.length : 0,
        invalid.length > 0 ? 'partial' : 'completed',
        JSON.stringify([...invalid, ...conflicts]),
        JSON.stringify(columnMapping),
        deactivationPolicy,
      ]
    );

    const importBatch = importRes.rows[0];

    // 2. Insert new records
    for (const rec of validNew) {
      await client.query(
        `INSERT INTO student_rosters 
          (organization_id, student_id_number, college_email, student_name, department, academic_year, enrollment_status, is_active, import_batch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (organization_id, student_id_number) 
         DO UPDATE SET 
            college_email = EXCLUDED.college_email,
            student_name = EXCLUDED.student_name,
            department = EXCLUDED.department,
            academic_year = EXCLUDED.academic_year,
            enrollment_status = EXCLUDED.enrollment_status,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()`,
        [
          organizationId,
          rec.studentId,
          rec.email,
          rec.name,
          rec.department || null,
          rec.academicYear || null,
          rec.status,
          rec.status === 'active',
          importBatch.id,
        ]
      );
    }

    // 3. Update existing records
    for (const rec of validUpdated) {
      await client.query(
        `UPDATE student_rosters
         SET college_email = $1,
             student_name = $2,
             department = $3,
             academic_year = $4,
             enrollment_status = $5,
             is_active = $6,
             import_batch_id = $7,
             updated_at = NOW()
         WHERE id = $8 AND organization_id = $9`,
        [
          rec.email,
          rec.name,
          rec.department || null,
          rec.academicYear || null,
          rec.status,
          rec.status === 'active',
          importBatch.id,
          rec.existingId,
          organizationId,
        ]
      );
    }

    // 4. Handle deactivation policy for missing active students
    if ((deactivationPolicy === 'deactivate_missing' || deactivationPolicy === 'mark_inactive') && missingRecords.length > 0) {
      const missingIds = missingRecords.map(m => m.id);
      await client.query(
        `UPDATE student_rosters
         SET is_active = FALSE,
             enrollment_status = 'inactive',
             updated_at = NOW()
         WHERE id = ANY($1::uuid[]) AND organization_id = $2`,
        [missingIds, organizationId]
      );
    }

    // 5. Match student_rosters with existing verified users
    await client.query(
      `UPDATE student_rosters sr
       SET matched_user_id = u.id
       FROM users u
       WHERE sr.organization_id = $1 
         AND LOWER(sr.college_email) = LOWER(u.email)
         AND sr.matched_user_id IS NULL`,
      [organizationId]
    );

    // 6. Ensure matched users have organization_members entry with role 'student'
    await client.query(
      `INSERT INTO organization_members (organization_id, user_id, role, department, academic_year, enrollment_status, student_id_number)
       SELECT sr.organization_id, sr.matched_user_id, 'student', sr.department, sr.academic_year, sr.enrollment_status, sr.student_id_number
       FROM student_rosters sr
       WHERE sr.organization_id = $1 AND sr.matched_user_id IS NOT NULL
       ON CONFLICT (organization_id, user_id)
       DO UPDATE SET
          department = EXCLUDED.department,
          academic_year = EXCLUDED.academic_year,
          enrollment_status = EXCLUDED.enrollment_status,
          student_id_number = EXCLUDED.student_id_number,
          updated_at = NOW()`,
      [organizationId]
    );

    await client.query('COMMIT');

    // Audit log
    await logAdminAction({
      organizationId,
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'roster.import',
      targetType: 'roster_import',
      targetId: importBatch.id,
      details: {
        fileName,
        validNewCount: validNew.length,
        updatedCount: validUpdated.length,
        unchangedCount: unchanged.length,
        deactivatedCount: deactivationPolicy === 'deactivate_missing' ? missingRecords.length : 0,
        invalidCount: invalid.length,
      },
      ipAddress,
    });

    return importBatch;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, organizationId }, '[Roster] Import transaction failed and rolled back');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Generate a downloadable sample roster template.
 */
function generateRosterTemplate(format = 'xlsx') {
  const data = [
    {
      'Student ID': 'CS2024001',
      'Student Name': 'Alex Johnson',
      'College Email': 'alex.j@college.edu',
      'Department': 'Computer Science',
      'Academic Year': '2024-2025',
      'Enrollment Status': 'active',
    },
    {
      'Student ID': 'CS2024002',
      'Student Name': 'Priya Sharma',
      'College Email': 'priya.s@college.edu',
      'Department': 'Information Technology',
      'Academic Year': '2024-2025',
      'Enrollment Status': 'active',
    },
    {
      'Student ID': 'EE2024015',
      'Student Name': 'Liam Chen',
      'College Email': 'liam.c@college.edu',
      'Department': 'Electrical Engineering',
      'Academic Year': '2024-2025',
      'Enrollment Status': 'active',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Roster Template');

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      contentType: 'text/csv',
      fileName: 'kodechirp_student_roster_template.csv',
    };
  }

  const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return {
    buffer: xlsxBuffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileName: 'kodechirp_student_roster_template.xlsx',
  };
}

/**
 * Generate a downloadable error report from an import record.
 */
function generateErrorReport(importRecord, format = 'csv') {
  const errors = importRecord.validation_errors || [];
  const rows = errors.map(err => ({
    'Row Number': err.row || 'N/A',
    'Student ID': err.studentId || 'N/A',
    'Email': err.email || 'N/A',
    'Name': err.name || 'N/A',
    'Error Details': Array.isArray(err.errors) ? err.errors.join('; ') : (err.reason || 'Validation error'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Message': 'No validation errors recorded' }]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Errors');

  if (format === 'xlsx') {
    return {
      buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: `roster_import_errors_${importRecord.id}.xlsx`,
    };
  }

  return {
    buffer: Buffer.from(XLSX.utils.sheet_to_csv(worksheet), 'utf-8'),
    contentType: 'text/csv',
    fileName: `roster_import_errors_${importRecord.id}.csv`,
  };
}

module.exports = {
  parseRosterFile,
  autoDetectMapping,
  validateRosterRows,
  commitRosterImport,
  generateRosterTemplate,
  generateErrorReport,
};
