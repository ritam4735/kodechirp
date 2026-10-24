// gateway/src/services/assessmentEligibilityService.js
// ─────────────────────────────────────────────────────────────────────────────
// Assessment Eligibility & Cohort Assignment Service
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const logger = require('../utils/logger');
const { isSuperAdmin, logAdminAction } = require('../middleware/rbac');

/**
 * Check if a student is eligible to access and attempt an assessment.
 */
async function checkStudentEligibility({ assessment, userId, userRole }) {
  // Super Admin can inspect/test any assessment
  if (isSuperAdmin({ role: userRole })) {
    return { eligible: true, maxAttempts: assessment.max_attempts };
  }

  // If assessment is completely public and not bound to an organization, or open to public audience
  if (!assessment.organization_id || assessment.is_public || assessment.target_audience === 'public') {
    return { eligible: true, maxAttempts: assessment.max_attempts };
  }

  // Assessment belongs to an organization
  const orgId = assessment.organization_id;

  // Fetch student membership and roster entry
  const memberRes = await db.query(
    `SELECT om.role, om.department, om.academic_year, om.enrollment_status, om.student_id_number,
            sr.id AS roster_id, sr.student_id_number AS roster_student_id,
            sr.is_active AS roster_active, sr.department AS roster_dept, sr.academic_year AS roster_year,
            sr.enrollment_status AS roster_status,
            o.name AS organization_name, o.is_active AS organization_active
     FROM organizations o
     LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = $2
     LEFT JOIN student_rosters sr ON sr.organization_id = o.id AND (sr.matched_user_id = $2 OR LOWER(sr.college_email) = (SELECT LOWER(email) FROM users WHERE id = $2))
     WHERE o.id = $1
     ORDER BY (sr.is_active = TRUE) DESC, (om.enrollment_status = 'active') DESC, sr.created_at DESC
     LIMIT 1`,
    [orgId, userId]
  );

  if (memberRes.rows.length === 0 || !memberRes.rows[0].organization_active) {
    return {
      eligible: false,
      reason: 'This assessment belongs to an organization that is not currently active.',
    };
  }

  const record = memberRes.rows[0];

  // If College Admin of this organization, allow access
  if (record.role === 'college_admin') {
    return { eligible: true, maxAttempts: assessment.max_attempts, isOrgAdmin: true };
  }

  // Must have an active membership or roster record in this organization
  const hasMembership = Boolean(record.role);
  const hasRoster = Boolean(record.roster_id || record.roster_student_id || record.student_id_number || record.roster_dept);

  if (!hasMembership && !hasRoster) {
    return {
      eligible: false,
      reason: `This assessment is restricted to enrolled students of ${record.organization_name}.`,
    };
  }

  // Check suspended status
  const isSuspended = record.enrollment_status === 'suspended' || record.roster_status === 'suspended';
  if (isSuspended) {
    return {
      eligible: false,
      reason: 'Your student enrollment record is marked as inactive or suspended.',
    };
  }

  // Check graduated status
  const isGraduated = record.enrollment_status === 'graduated' || record.roster_status === 'graduated';
  if (isGraduated) {
    return {
      eligible: false,
      reason: 'Graduated students are not eligible to attempt active college assessments.',
    };
  }

  // Check inactive or deactivated status
  const isRosterInactive = record.roster_id && (record.roster_active === false || record.roster_status === 'inactive');
  const isMemberInactive = !record.roster_id && record.enrollment_status === 'inactive';
  if (isRosterInactive || isMemberInactive) {
    return {
      eligible: false,
      reason: 'Your student enrollment record is marked as inactive or suspended.',
    };
  }

  // If roster record is explicitly active & eligible, but organization_members is still 'inactive' (e.g. legacy desync), heal it
  if (record.roster_id && record.roster_active && (record.roster_status === 'active' || !record.roster_status)) {
    if (record.enrollment_status === 'inactive') {
      try {
        await db.query(
          `UPDATE organization_members
           SET enrollment_status = 'active', updated_at = NOW()
           WHERE organization_id = $1 AND user_id = $2`,
          [orgId, userId]
        );
        record.enrollment_status = 'active';
      } catch (e) {
        logger.warn({ err: e }, '[AssessmentEligibility] Non-fatal error healing om.enrollment_status');
      }
    }
  }

  // Check enrollment status (must not be suspended or inactive)
  const isEnrolledActive =
    (record.enrollment_status === 'active' || !record.enrollment_status) &&
    (record.roster_active !== false) &&
    (record.roster_status !== 'inactive' && record.roster_status !== 'suspended' && record.roster_status !== 'graduated');

  if (!isEnrolledActive) {
    return {
      eligible: false,
      reason: 'Your student enrollment record is marked as inactive or suspended.',
    };
  }

  const studentDept = record.department || record.roster_dept || '';
  const studentYear = record.academic_year || record.roster_year || '';
  const studentIdNumber = record.student_id_number || record.roster_student_id || '';

  // Check assignments for this assessment
  const assignmentsRes = await db.query(
    `SELECT * FROM assessment_assignments
     WHERE assessment_id = $1 AND organization_id = $2 AND is_active = TRUE`,
    [assessment.id, orgId]
  );

  const assignments = assignmentsRes.rows;

  // If no specific assignments exist, but target_audience is organization, all enrolled students in org are eligible
  if (assignments.length === 0) {
    if (assessment.target_audience === 'assigned_only') {
      return {
        eligible: false,
        reason: 'This assessment is restricted to specifically assigned students or cohorts.',
      };
    }
    return { eligible: true, maxAttempts: assessment.max_attempts };
  }

  // Check matching assignments
  const now = new Date();
  let matchedAssignment = null;

  for (const assign of assignments) {
    // Check assignment availability window if configured
    if (assign.starts_at && new Date(assign.starts_at) > now) {
      continue;
    }
    if (assign.ends_at && new Date(assign.ends_at) < now) {
      continue;
    }

    if (assign.assignment_type === 'all_organization') {
      matchedAssignment = assign;
      break;
    }

    if (assign.assignment_type === 'departments') {
      const depts = assign.target_departments || [];
      if (depts.includes(studentDept)) {
        matchedAssignment = assign;
        break;
      }
    }

    if (assign.assignment_type === 'academic_years') {
      const years = assign.target_academic_years || [];
      if (years.includes(studentYear)) {
        matchedAssignment = assign;
        break;
      }
    }

    if (assign.assignment_type === 'specific_students') {
      const targetIds = assign.target_student_ids || [];
      if (targetIds.includes(userId) || targetIds.includes(studentIdNumber)) {
        matchedAssignment = assign;
        break;
      }
    }

    if (assign.assignment_type === 'rule_based') {
      const depts = assign.target_departments || [];
      const years = assign.target_academic_years || [];
      const deptMatch = depts.length === 0 || depts.includes(studentDept);
      const yearMatch = years.length === 0 || years.includes(studentYear);
      if (deptMatch && yearMatch) {
        matchedAssignment = assign;
        break;
      }
    }
  }

  if (!matchedAssignment) {
    return {
      eligible: false,
      reason: 'You are not assigned to this assessment cohort.',
    };
  }

  const effectiveMaxAttempts = matchedAssignment.max_attempts_override || assessment.max_attempts;
  return {
    eligible: true,
    maxAttempts: effectiveMaxAttempts,
    assignment: matchedAssignment,
  };
}

/**
 * Fetch all assessment assignments for an assessment within an organization.
 */
async function getAssignments(assessmentId, organizationId) {
  let sql = `SELECT aa.*, u.username AS created_by_username
     FROM assessment_assignments aa
     LEFT JOIN users u ON u.id = aa.created_by
     WHERE aa.assessment_id = $1`;
  const params = [assessmentId];
  if (organizationId) {
    params.push(organizationId);
    sql += ` AND aa.organization_id = $2`;
  }
  sql += ` ORDER BY aa.created_at DESC`;
  const result = await db.query(sql, params);
  return result.rows;
}

/**
 * Create or publish an assessment assignment.
 */
async function createAssignment({
  assessmentId,
  organizationId,
  assignmentType,
  targetDepartments = [],
  targetAcademicYears = [],
  targetStudentIds = [],
  startsAt = null,
  endsAt = null,
  maxAttemptsOverride = null,
  adminUser,
  ipAddress,
}) {
  // Verify assessment exists and belongs to or is usable by this organization
  const assessRes = await db.query(
    'SELECT id, title, organization_id FROM assessments WHERE id = $1',
    [assessmentId]
  );

  if (assessRes.rows.length === 0) {
    const err = new Error('Assessment not found');
    err.status = 404;
    throw err;
  }

  const assessment = assessRes.rows[0];
  if (assessment.organization_id && assessment.organization_id !== organizationId && !isSuperAdmin(adminUser)) {
    const err = new Error('Cannot assign assessment belonging to another organization');
    err.status = 403;
    throw err;
  }

  const result = await db.query(
    `INSERT INTO assessment_assignments 
      (assessment_id, organization_id, assignment_type, target_departments, target_academic_years, target_student_ids, 
       starts_at, ends_at, max_attempts_override, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)
     RETURNING *`,
    [
      assessmentId,
      organizationId,
      assignmentType,
      JSON.stringify(targetDepartments || []),
      JSON.stringify(targetAcademicYears || []),
      JSON.stringify(targetStudentIds || []),
      startsAt ? new Date(startsAt) : null,
      endsAt ? new Date(endsAt) : null,
      maxAttemptsOverride ? parseInt(maxAttemptsOverride, 10) : null,
      adminUser.id,
    ]
  );

  const assignment = result.rows[0];

  await logAdminAction({
    organizationId,
    actorId: adminUser.id,
    actorEmail: adminUser.email,
    actorRole: adminUser.role,
    action: 'assessment.assign',
    targetType: 'assessment_assignment',
    targetId: assignment.id,
    details: {
      assessmentTitle: assessment.title,
      assignmentType,
      targetDepartments,
      targetAcademicYears,
      targetStudentIdsCount: targetStudentIds.length,
    },
    ipAddress,
  });

  return assignment;
}

/**
 * Revoke an assessment assignment.
 */
async function revokeAssignment(assignmentId, organizationId, adminUser, ipAddress) {
  const existingRes = await db.query(
    'SELECT * FROM assessment_assignments WHERE id = $1 AND organization_id = $2',
    [assignmentId, organizationId]
  );

  if (existingRes.rows.length === 0) {
    const err = new Error('Assignment not found');
    err.status = 404;
    throw err;
  }

  const result = await db.query(
    'UPDATE assessment_assignments SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *',
    [assignmentId, organizationId]
  );

  await logAdminAction({
    organizationId,
    actorId: adminUser.id,
    actorEmail: adminUser.email,
    actorRole: adminUser.role,
    action: 'assessment.assignment_revoke',
    targetType: 'assessment_assignment',
    targetId: assignmentId,
    details: { previous: existingRes.rows[0] },
    ipAddress,
  });

  return result.rows[0];
}

module.exports = {
  checkStudentEligibility,
  getAssignments,
  createAssignment,
  revokeAssignment,
};
