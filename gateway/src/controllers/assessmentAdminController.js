// gateway/src/controllers/assessmentAdminController.js
// ─────────────────────────────────────────────────────────────────────────────
// Assessment Engine — Admin Assessment Builder Controller
// Comprehensive Audit & Repair: Strict Tenant Isolation, Reordering, Integrity
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const logger = require('../utils/logger');
const { isSuperAdmin, logAdminAction } = require('../middleware/rbac');
const { normalizeOptions, normalizeCorrectAnswer, validateObjectiveQuestion } = require('../utils/helpers');

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function canModifyAssessment(user, assessmentOrgId, userOrgId) {
  if (isSuperAdmin(user)) return true;
  // If assessment has no org yet, allow college admin to manage
  if (!assessmentOrgId) return true;
  return assessmentOrgId === userOrgId;
}

async function ensureAssessmentOrg(assessmentId, orgId) {
  if (!orgId) return;
  try {
    await db.query(`UPDATE assessments SET organization_id = $1 WHERE id = $2 AND organization_id IS NULL;`, [orgId, assessmentId]);
  } catch (err) {
    logger.warn({ err, assessmentId, orgId }, '[AssessmentAdmin] Failed to associate assessment to organization');
  }
}


/**
 * List all assessments with counts, stats, and strict tenant isolation.
 */
async function getAssessments(req, res) {
  try {
    const { status, category, search, limit = 50, offset = 0, organizationId } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const isSuper = isSuperAdmin(req.user);
    const orgId = isSuper ? (organizationId || req.organizationId) : req.organizationId;

    const conditions = [];
    const params = [];

    // Organization scoping: College Admin MUST ONLY see their assigned organization's assessments
    if (!isSuper) {
      if (!req.organizationId) {
        return res.status(403).json({ success: false, error: 'No organization assigned to your account' });
      }
      params.push(req.organizationId);
      conditions.push(`a.organization_id = $${params.length}`);
    } else if (orgId && orgId !== 'all') {
      params.push(orgId);
      conditions.push(`a.organization_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`a.category = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(a.title ILIKE $${params.length} OR a.description ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT count(*)::int AS total FROM assessments a ${whereClause};`;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const dataParams = [...params, parsedLimit, parsedOffset];
    const dataSql = `
      SELECT
        a.*,
        o.name AS organization_name,
        o.code AS organization_code,
        o.slug AS organization_slug,
        u_author.username AS author_username,
        u_author.display_name AS author_display_name,
        COALESCE((SELECT count(*)::int FROM assessment_sections s WHERE s.assessment_id = a.id), 0) AS section_count,
        COALESCE((
          SELECT count(*)::int
          FROM assessment_section_questions sq
          JOIN assessment_sections s ON sq.section_id = s.id
          WHERE s.assessment_id = a.id
        ), 0) AS total_questions_count,
        COALESCE((SELECT count(*)::int FROM assessment_attempts att WHERE att.assessment_id = a.id), 0) AS attempt_count,
        COALESCE((SELECT count(*)::int FROM assessment_assignments aa WHERE aa.assessment_id = a.id AND aa.is_active = TRUE), 0) AS assignments_count
      FROM assessments a
      LEFT JOIN organizations o ON o.id = a.organization_id
      LEFT JOIN users u_author ON u_author.id = a.created_by
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
    `;

    const dataRes = await db.query(dataSql, dataParams);

    res.json({
      success: true,
      assessments: dataRes.rows,
      total,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (err) {
    logger.error({ err }, '[AssessmentAdmin] getAssessments failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve assessments' });
  }
}

/**
 * Get assessment details with sections and questions.
 * Enforces strict tenant isolation.
 */
async function getAssessment(req, res) {
  try {
    const { id } = req.params;
    const isSuper = isSuperAdmin(req.user);

    const assessRes = await db.query(`SELECT * FROM assessments WHERE id = $1;`, [id]);
    if (assessRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const assessment = assessRes.rows[0];

    // Strict tenant isolation: College admin cannot view other organizations' assessments
    if (!isSuper && assessment.organization_id && assessment.organization_id !== req.organizationId) {
      logger.warn(
        { userId: req.user.id, userOrg: req.organizationId, targetOrg: assessment.organization_id },
        '[RBAC] Cross-tenant assessment access blocked'
      );
      return res.status(403).json({ success: false, error: 'Access denied: Cannot access another organization\'s assessment' });
    }

    // Get sections ordered by section_order
    const sectionsRes = await db.query(
      `SELECT * FROM assessment_sections WHERE assessment_id = $1 ORDER BY section_order ASC, created_at ASC;`,
      [id]
    );
    const sections = sectionsRes.rows;

    // Get mapped questions for all sections
    for (const sec of sections) {
      const qRes = await db.query(
        `
        SELECT
          sq.id AS mapping_id,
          sq.order_index,
          sq.marks_override,
          sq.negative_marks_override,
          sq.question_id,
          sq.problem_id,
          -- Objective question fields
          q.category AS question_category,
          q.topic AS question_topic,
          q.difficulty AS question_difficulty,
          q.question_type,
          q.question_text,
          q.options,
          q.correct_answer,
          q.explanation,
          q.default_marks,
          q.default_negative_marks,
          -- DSA Coding problem fields
          p.title AS problem_title,
          p.slug AS problem_slug,
          p.difficulty AS problem_difficulty,
          p.description AS problem_description,
          p.tags AS problem_tags
        FROM assessment_section_questions sq
        LEFT JOIN assessment_questions q ON sq.question_id = q.id
        LEFT JOIN problems p ON sq.problem_id = p.id
        WHERE sq.section_id = $1
        ORDER BY sq.order_index ASC, sq.created_at ASC;
      `,
        [sec.id]
      );
      sec.questions = qRes.rows.map((q) => ({
        ...q,
        options: normalizeOptions(q.options),
        correct_answer: normalizeCorrectAnswer(q.correct_answer, q.options),
      }));
    }

    assessment.sections = sections;

    res.json({ success: true, assessment });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] getAssessment failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve assessment' });
  }
}

/**
 * Create a new assessment draft.
 * Automatically pins organization_id to authenticated College Admin scope.
 */
async function createAssessment(req, res) {
  try {
    const {
      title,
      slug,
      description,
      instructions,
      category = 'Placement',
      duration_minutes = 60,
      randomize_questions = false,
      randomize_options = false,
      default_negative_marking = true,
      show_results_immediately = true,
      show_answers_mode = 'after_submission',
      pass_percentage = 40.0,
      starts_at = null,
      ends_at = null,
      max_attempts = 1,
      organization_id,
      is_public,
      target_audience,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Assessment title is required' });
    }

    const duration = parseInt(duration_minutes, 10);
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({ success: false, error: 'Duration must be a positive number of minutes' });
    }

    if (starts_at && ends_at && new Date(starts_at) >= new Date(ends_at)) {
      return res.status(400).json({ success: false, error: 'Assessment start time must precede end time' });
    }

    const isSuper = isSuperAdmin(req.user);

    // Organization scoping: College Admin must use their assigned organization
    if (!isSuper && !req.organizationId) {
      return res.status(403).json({ success: false, error: 'No organization assigned to your account' });
    }

    const finalOrgId = isSuper ? (organization_id || null) : req.organizationId;
    const finalIsPublic = Boolean(is_public);
    const finalAudience = target_audience || (finalOrgId ? (finalIsPublic ? 'public' : 'organization') : 'public');

    let baseSlug = slug ? slugify(slug) : slugify(title);
    if (!baseSlug) baseSlug = `assessment-${Date.now()}`;
    let finalSlug = baseSlug;

    // Ensure slug uniqueness with loop
    let slugAttempts = 0;
    while (true) {
      const slugCheck = await db.query(`SELECT id FROM assessments WHERE slug = $1;`, [finalSlug]);
      if (slugCheck.rowCount === 0) break;
      slugAttempts++;
      finalSlug = `${baseSlug}-${Math.floor(Math.random() * 9000 + 1000)}`;
      if (slugAttempts > 10) {
        finalSlug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    const insertSql = `
      INSERT INTO assessments (
        title, slug, description, instructions, category,
        duration_minutes, status, starts_at, ends_at, max_attempts,
        randomize_questions, randomize_options, default_negative_marking,
        show_results_immediately, show_answers_mode, pass_percentage, created_by,
        organization_id, is_public, target_audience
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, 'Draft', $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19
      ) RETURNING *;
    `;

    const result = await db.query(insertSql, [
      title.trim(),
      finalSlug,
      description || null,
      instructions || null,
      category.trim(),
      duration,
      starts_at ? new Date(starts_at) : null,
      ends_at ? new Date(ends_at) : null,
      Math.max(parseInt(max_attempts, 10) || 1, 1),
      Boolean(randomize_questions),
      Boolean(randomize_options),
      Boolean(default_negative_marking),
      Boolean(show_results_immediately),
      show_answers_mode,
      !isNaN(parseFloat(pass_percentage)) ? Math.min(Math.max(parseFloat(pass_percentage), 0), 100) : 40.0,
      req.user?.id || null,
      finalOrgId,
      finalIsPublic,
      finalAudience,
    ]);

    const created = result.rows[0];

    await logAdminAction({
      organizationId: finalOrgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'assessment.create',
      targetType: 'assessment',
      targetId: created.id,
      details: { title: created.title, slug: created.slug, audience: finalAudience },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, assessment: created });
  } catch (err) {
    logger.error({ err }, '[AssessmentAdmin] createAssessment failed');
    res.status(500).json({ success: false, error: err.message || 'Failed to create assessment' });
  }
}

/**
 * Update assessment details.
 * Enforces tenant isolation and validates inputs.
 */
async function updateAssessment(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      description,
      instructions,
      category,
      duration_minutes,
      status,
      starts_at,
      ends_at,
      max_attempts,
      randomize_questions,
      randomize_options,
      default_negative_marking,
      show_results_immediately,
      show_answers_mode,
      pass_percentage,
      organization_id,
      is_public,
      target_audience,
    } = req.body;

    const existingRes = await db.query(`SELECT * FROM assessments WHERE id = $1;`, [id]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const current = existingRes.rows[0];

    const isSuper = isSuperAdmin(req.user);

    // Prevent cross-organization updates
    if (!canModifyAssessment(req.user, current.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot modify assessment belonging to another organization' });
    }
    if (!current.organization_id && req.organizationId) {
      await ensureAssessmentOrg(id, req.organizationId);
    }

    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({ success: false, error: 'Assessment title cannot be empty' });
    }

    if (duration_minutes !== undefined) {
      const dur = parseInt(duration_minutes, 10);
      if (isNaN(dur) || dur <= 0) {
        return res.status(400).json({ success: false, error: 'Duration must be greater than zero' });
      }
    }

    const finalStartsAt = starts_at !== undefined ? (starts_at ? new Date(starts_at) : null) : current.starts_at;
    const finalEndsAt = ends_at !== undefined ? (ends_at ? new Date(ends_at) : null) : current.ends_at;

    if (finalStartsAt && finalEndsAt && new Date(finalStartsAt) >= new Date(finalEndsAt)) {
      return res.status(400).json({ success: false, error: 'Assessment start time must precede end time' });
    }

    let finalSlug = current.slug;
    if (slug && slug.trim() && slug !== current.slug) {
      finalSlug = slugify(slug);
      const slugCheck = await db.query(`SELECT id FROM assessments WHERE slug = $1 AND id != $2;`, [finalSlug, id]);
      if (slugCheck.rowCount > 0) {
        return res.status(409).json({ success: false, error: 'Slug is already in use by another assessment' });
      }
    }

    const finalOrgId = isSuper ? (organization_id !== undefined ? organization_id : current.organization_id) : current.organization_id;
    const finalIsPublic = is_public !== undefined ? Boolean(is_public) : current.is_public;
    const finalAudience = target_audience !== undefined ? target_audience : current.target_audience;

    const updateSql = `
      UPDATE assessments
      SET
        title = $1,
        slug = $2,
        description = $3,
        instructions = $4,
        category = $5,
        duration_minutes = $6,
        status = $7,
        starts_at = $8,
        ends_at = $9,
        max_attempts = $10,
        randomize_questions = $11,
        randomize_options = $12,
        default_negative_marking = $13,
        show_results_immediately = $14,
        show_answers_mode = $15,
        pass_percentage = $16,
        organization_id = $17,
        is_public = $18,
        target_audience = $19,
        updated_at = NOW()
      WHERE id = $20
      RETURNING *;
    `;

    const result = await db.query(updateSql, [
      title !== undefined ? title.trim() : current.title,
      finalSlug,
      description !== undefined ? description : current.description,
      instructions !== undefined ? instructions : current.instructions,
      category !== undefined ? category.trim() : current.category,
      duration_minutes !== undefined ? parseInt(duration_minutes, 10) : current.duration_minutes,
      status !== undefined ? status : current.status,
      finalStartsAt,
      finalEndsAt,
      max_attempts !== undefined ? Math.max(parseInt(max_attempts, 10) || 1, 1) : current.max_attempts,
      randomize_questions !== undefined ? Boolean(randomize_questions) : current.randomize_questions,
      randomize_options !== undefined ? Boolean(randomize_options) : current.randomize_options,
      default_negative_marking !== undefined ? Boolean(default_negative_marking) : current.default_negative_marking,
      show_results_immediately !== undefined ? Boolean(show_results_immediately) : current.show_results_immediately,
      show_answers_mode !== undefined ? show_answers_mode : current.show_answers_mode,
      pass_percentage !== undefined ? Math.min(Math.max(parseFloat(pass_percentage) || 0, 0), 100) : current.pass_percentage,
      finalOrgId,
      finalIsPublic,
      finalAudience,
      id,
    ]);

    await logAdminAction({
      organizationId: finalOrgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'assessment.update',
      targetType: 'assessment',
      targetId: id,
      details: { previousTitle: current.title, newTitle: result.rows[0].title },
      ipAddress: req.ip,
    });

    res.json({ success: true, assessment: result.rows[0] });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] updateAssessment failed');
    res.status(500).json({ success: false, error: 'Failed to update assessment' });
  }
}

/**
 * Toggle assessment publication status (Draft, Published, Archived).
 * Performs comprehensive pre-publish validation.
 */
async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Draft', 'Published', 'Archived'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Must be Draft, Published, or Archived.' });
    }

    const assessRes = await db.query(`SELECT * FROM assessments WHERE id = $1;`, [id]);
    if (assessRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const assessment = assessRes.rows[0];

    const isSuper = isSuperAdmin(req.user);
    if (!isSuper && assessment.organization_id !== req.organizationId) {
      return res.status(403).json({ success: false, error: 'Cannot modify assessment belonging to another organization' });
    }

    // Comprehensive server-side pre-publishing validation
    if (status === 'Published') {
      const validationIssues = [];

      if (!assessment.title || !assessment.title.trim()) {
        validationIssues.push('Assessment title is required.');
      }

      if (!assessment.duration_minutes || assessment.duration_minutes <= 0) {
        validationIssues.push('Assessment duration must be greater than zero minutes.');
      }

      if (assessment.starts_at && assessment.ends_at && new Date(assessment.starts_at) >= new Date(assessment.ends_at)) {
        validationIssues.push('Scheduled start time must precede end time.');
      }

      if (assessment.ends_at && new Date(assessment.ends_at) <= new Date()) {
        validationIssues.push('Scheduled end time has already passed. Please update the scheduled end time.');
      }

      // Check sections and questions
      const sectionsRes = await db.query(
        `SELECT id, title, section_order, section_type, total_questions, total_marks
         FROM assessment_sections
         WHERE assessment_id = $1
         ORDER BY section_order ASC;`,
        [id]
      );
      const sections = sectionsRes?.rows || [];

      if (sections.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot publish an assessment with zero sections',
          issues: ['Assessment must contain at least one section before publishing.']
        });
      }

      for (const sec of sections) {
        const qCountRes = await db.query(
          `SELECT count(*)::int AS count FROM assessment_section_questions WHERE section_id = $1;`,
          [sec.id]
        );
        const count = qCountRes?.rows?.[0]?.count || 0;
        if (count === 0) {
          validationIssues.push(`Section "${sec.title}" has no questions. Please add questions or remove the empty section.`);
        }

        // Validate objective questions in this section have valid options and answer key
        const objQuestions = await db.query(
          `SELECT q.id, q.question_text, q.question_type, q.options, q.correct_answer
           FROM assessment_section_questions sq
           JOIN assessment_questions q ON sq.question_id = q.id
           WHERE sq.section_id = $1;`,
          [sec.id]
        );

        const objRows = objQuestions?.rows || [];

        // Check if coding section contains objective questions
        if (sec.section_type === 'coding' && objRows.length > 0) {
          validationIssues.push(`Section "${sec.title}" is a coding section but contains objective questions. Change section type to mixed or remove objective questions.`);
        }

        for (const oq of objRows) {
          if (['single_choice', 'multiple_choice'].includes(oq.question_type)) {
            const opts = Array.isArray(oq.options) ? oq.options : [];
            if (opts.length < 2) {
              validationIssues.push(`Question "${oq.question_text?.substring(0, 40)}..." must have at least 2 options.`);
            }
            if (oq.correct_answer === null || oq.correct_answer === undefined || oq.correct_answer === '') {
              validationIssues.push(`Question "${oq.question_text?.substring(0, 40)}..." is missing a correct answer.`);
            }
          }
        }
      }

      if (validationIssues.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot publish assessment due to validation failures:\n• ${validationIssues.join('\n• ')}`,
          issues: validationIssues,
        });
      }
    }

    // Recalculate total marks before persisting state change
    await recalculateAssessmentTotal(id);

    const result = await db.query(
      `UPDATE assessments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`,
      [status, id]
    );

    await logAdminAction({
      organizationId: assessment.organization_id,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: status === 'Published' ? 'assessment.publish' : 'assessment.status_change',
      targetType: 'assessment',
      targetId: id,
      details: { previousStatus: assessment.status, newStatus: status, title: assessment.title },
      ipAddress: req.ip,
    });

    res.json({ success: true, assessment: result.rows[0] });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] toggleStatus failed');
    res.status(500).json({ success: false, error: err.message || 'Failed to update publication status' });
  }
}

/**
 * Delete assessment with tenant isolation.
 */
async function deleteAssessment(req, res) {
  try {
    const { id } = req.params;
    const isSuper = isSuperAdmin(req.user);

    const checkRes = await db.query(`SELECT organization_id, title FROM assessments WHERE id = $1;`, [id]);
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    if (!canModifyAssessment(req.user, checkRes.rows[0].organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot delete assessment belonging to another organization' });
    }

    await db.query(`DELETE FROM assessments WHERE id = $1;`, [id]);

    await logAdminAction({
      organizationId: checkRes.rows[0].organization_id,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'assessment.delete',
      targetType: 'assessment',
      targetId: id,
      details: { title: checkRes.rows[0].title },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Assessment deleted successfully' });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] deleteAssessment failed');
    res.status(500).json({ success: false, error: 'Failed to delete assessment' });
  }
}

/**
 * Helper to recalculate assessment total marks and question counts accurately.
 */
async function recalculateAssessmentTotal(assessmentId) {
  // 1. Update section question counts and section total marks
  await db.query(`
    UPDATE assessment_sections s
    SET
      total_questions = COALESCE((
        SELECT count(*)::int FROM assessment_section_questions sq WHERE sq.section_id = s.id
      ), 0),
      total_marks = COALESCE((
        SELECT SUM(
          COALESCE(
            sq.marks_override,
            CASE WHEN sq.problem_id IS NOT NULL THEN 10.00 ELSE s.marks_per_question END,
            q.default_marks,
            1.00
          )
        )
        FROM assessment_section_questions sq
        LEFT JOIN assessment_questions q ON sq.question_id = q.id
        WHERE sq.section_id = s.id
      ), 0.00),
      section_type = CASE
        WHEN (SELECT count(*) FROM assessment_section_questions sq WHERE sq.section_id = s.id AND sq.problem_id IS NOT NULL) > 0
         AND (SELECT count(*) FROM assessment_section_questions sq WHERE sq.section_id = s.id AND sq.question_id IS NOT NULL) > 0
        THEN 'mixed'
        WHEN (SELECT count(*) FROM assessment_section_questions sq WHERE sq.section_id = s.id AND sq.problem_id IS NOT NULL) > 0
        THEN 'coding'
        WHEN (SELECT count(*) FROM assessment_section_questions sq WHERE sq.section_id = s.id AND sq.question_id IS NOT NULL) > 0
        THEN 'objective'
        ELSE s.section_type
      END,
      updated_at = NOW()
    WHERE s.assessment_id = $1;
  `, [assessmentId]);

  // 2. Update parent assessment total marks
  await db.query(`
    UPDATE assessments
    SET
      total_marks = COALESCE((
        SELECT SUM(total_marks) FROM assessment_sections WHERE assessment_id = $1
      ), 0.00),
      updated_at = NOW()
    WHERE id = $1;
  `, [assessmentId]);
}

/**
 * Section Management: Create Section
 */
async function createSection(req, res) {
  try {
    const assessmentId = req.params.id || req.params.assessmentId;
    const {
      title,
      description,
      instructions,
      section_order,
      section_type = 'objective',
      duration_minutes = null,
      marks_per_question = 1.0,
      negative_marks_per_question = 0.0,
      selection_mode = 'manual',
      selection_rules = {},
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Section title is required' });
    }

    const isSuper = isSuperAdmin(req.user);
    const assessRes = await db.query('SELECT organization_id FROM assessments WHERE id = $1;', [assessmentId]);
    if (assessRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    if (!canModifyAssessment(req.user, assessRes.rows[0].organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot modify assessment belonging to another organization' });
    }
    if (!assessRes.rows[0].organization_id && req.organizationId) {
      await ensureAssessmentOrg(assessmentId, req.organizationId);
    }

    // Determine safe next order
    let finalOrder = section_order !== undefined ? parseInt(section_order, 10) : null;
    if (finalOrder === null || isNaN(finalOrder)) {
      const orderRes = await db.query(
        `SELECT COALESCE(MAX(section_order), -1) + 1 AS next_order FROM assessment_sections WHERE assessment_id = $1;`,
        [assessmentId]
      );
      finalOrder = orderRes.rows[0].next_order;
    }

    const insertSql = `
      INSERT INTO assessment_sections (
        assessment_id, title, description, instructions, section_order,
        section_type, duration_minutes, marks_per_question, negative_marks_per_question,
        selection_mode, selection_rules
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11
      ) RETURNING *;
    `;

    const result = await db.query(insertSql, [
      assessmentId,
      title.trim(),
      description || null,
      instructions || null,
      finalOrder,
      ['objective', 'coding', 'mixed'].includes(section_type) ? section_type : 'objective',
      duration_minutes ? parseInt(duration_minutes, 10) : null,
      marks_per_question !== undefined && marks_per_question !== '' && !isNaN(parseFloat(marks_per_question)) ? Math.max(parseFloat(marks_per_question), 0) : 1.0,
      negative_marks_per_question !== undefined && negative_marks_per_question !== '' && !isNaN(parseFloat(negative_marks_per_question)) ? Math.max(parseFloat(negative_marks_per_question), 0) : 0.0,
      selection_mode || 'manual',
      JSON.stringify(selection_rules || {}),
    ]);

    await recalculateAssessmentTotal(assessmentId);

    res.status(201).json({ success: true, section: result.rows[0] });
  } catch (err) {
    logger.error({ err, assessmentId: req.params.id }, '[AssessmentAdmin] createSection failed');
    res.status(500).json({ success: false, error: 'Failed to create section' });
  }
}

/**
 * Section Management: Update Section
 */
async function updateSection(req, res) {
  try {
    const { sectionId } = req.params;
    const {
      title,
      description,
      instructions,
      section_order,
      section_type,
      duration_minutes,
      marks_per_question,
      negative_marks_per_question,
      selection_mode,
      selection_rules,
    } = req.body;

    const secRes = await db.query(
      `SELECT s.*, a.organization_id 
       FROM assessment_sections s 
       JOIN assessments a ON s.assessment_id = a.id 
       WHERE s.id = $1;`,
      [sectionId]
    );
    if (secRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    const current = secRes.rows[0];

    const isSuper = isSuperAdmin(req.user);
    if (!canModifyAssessment(req.user, current.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot modify section belonging to another organization' });
    }

    const updateSql = `
      UPDATE assessment_sections
      SET
        title = $1,
        description = $2,
        instructions = $3,
        section_order = $4,
        section_type = $5,
        duration_minutes = $6,
        marks_per_question = $7,
        negative_marks_per_question = $8,
        selection_mode = $9,
        selection_rules = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *;
    `;

    const result = await db.query(updateSql, [
      title !== undefined ? title.trim() : current.title,
      description !== undefined ? description : current.description,
      instructions !== undefined ? instructions : current.instructions,
      section_order !== undefined ? parseInt(section_order, 10) : current.section_order,
      section_type !== undefined ? section_type : current.section_type,
      duration_minutes !== undefined ? (duration_minutes ? parseInt(duration_minutes, 10) : null) : current.duration_minutes,
      marks_per_question !== undefined && marks_per_question !== '' && !isNaN(parseFloat(marks_per_question)) ? Math.max(parseFloat(marks_per_question), 0) : current.marks_per_question,
      negative_marks_per_question !== undefined && negative_marks_per_question !== '' && !isNaN(parseFloat(negative_marks_per_question)) ? Math.max(parseFloat(negative_marks_per_question), 0) : current.negative_marks_per_question,
      selection_mode !== undefined ? selection_mode : current.selection_mode,
      selection_rules !== undefined ? JSON.stringify(selection_rules) : current.selection_rules,
      sectionId,
    ]);

    await recalculateAssessmentTotal(current.assessment_id);

    res.json({ success: true, section: result.rows[0] });
  } catch (err) {
    logger.error({ err, sectionId: req.params.sectionId }, '[AssessmentAdmin] updateSection failed');
    res.status(500).json({ success: false, error: 'Failed to update section' });
  }
}

/**
 * Section Management: Delete Section
 * Safely removes mappings without deleting question bank questions or problems.
 */
async function deleteSection(req, res) {
  try {
    const { sectionId } = req.params;

    const secRes = await db.query(
      `SELECT s.*, a.organization_id 
       FROM assessment_sections s 
       JOIN assessments a ON s.assessment_id = a.id 
       WHERE s.id = $1;`,
      [sectionId]
    );
    if (secRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    const current = secRes.rows[0];

    const isSuper = isSuperAdmin(req.user);
    if (!canModifyAssessment(req.user, current.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot delete section belonging to another organization' });
    }

    // Delete section (foreign key cascade safely removes assessment_section_questions rows)
    await db.query(`DELETE FROM assessment_sections WHERE id = $1;`, [sectionId]);

    // Normalize remaining sections' ordering
    const remainingSections = await db.query(
      `SELECT id FROM assessment_sections WHERE assessment_id = $1 ORDER BY section_order ASC, created_at ASC;`,
      [current.assessment_id]
    );
    const remRows = remainingSections?.rows || [];
    for (let i = 0; i < remRows.length; i++) {
      await db.query(`UPDATE assessment_sections SET section_order = $1 WHERE id = $2;`, [i, remRows[i].id]);
    }

    await recalculateAssessmentTotal(current.assessment_id);

    res.json({ success: true, message: 'Section deleted successfully' });
  } catch (err) {
    logger.error({ err, sectionId: req.params.sectionId }, '[AssessmentAdmin] deleteSection failed');
    res.status(500).json({ success: false, error: 'Failed to delete section' });
  }
}

/**
 * Section Management: Reorder Sections
 */
async function reorderSections(req, res) {
  try {
    const { id: assessmentId } = req.params;
    const { section_ids } = req.body;

    if (!Array.isArray(section_ids) || section_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'section_ids array is required' });
    }

    const isSuper = isSuperAdmin(req.user);
    const assessRes = await db.query('SELECT organization_id FROM assessments WHERE id = $1;', [assessmentId]);
    if (assessRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    if (!canModifyAssessment(req.user, assessRes.rows[0].organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot reorder sections of another organization\'s assessment' });
    }

    // Update order for each section atomically
    for (let i = 0; i < section_ids.length; i++) {
      await db.query(
        `UPDATE assessment_sections SET section_order = $1 WHERE id = $2 AND assessment_id = $3;`,
        [i, section_ids[i], assessmentId]
      );
    }

    res.json({ success: true, message: 'Sections reordered successfully' });
  } catch (err) {
    logger.error({ err, assessmentId: req.params.id }, '[AssessmentAdmin] reorderSections failed');
    res.status(500).json({ success: false, error: 'Failed to reorder sections' });
  }
}

/**
 * Add a question or coding problem to section.
 * Validates section type and prevents duplicate associations.
 */
async function addQuestionToSection(req, res) {
  try {
    const { sectionId } = req.params;
    const {
      question_id,
      question_ids,
      problem_id,
      problem_ids,
      marks_override,
      negative_marks_override,
    } = req.body;

    // Normalise input arrays
    const qIds = Array.isArray(question_ids) ? question_ids : (question_id ? [question_id] : []);
    const pIds = Array.isArray(problem_ids) ? problem_ids : (problem_id ? [problem_id] : []);

    if (qIds.length === 0 && pIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Either question_id(s) or problem_id(s) must be provided' });
    }

    const secRes = await db.query(
      `SELECT s.*, a.organization_id 
       FROM assessment_sections s 
       JOIN assessments a ON s.assessment_id = a.id 
       WHERE s.id = $1;`,
      [sectionId]
    );
    if (secRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    const section = secRes.rows[0];

    const isSuper = isSuperAdmin(req.user);
    if (!canModifyAssessment(req.user, section.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot add questions to an assessment belonging to another organization' });
    }
    if (!section.organization_id && req.organizationId) {
      await ensureAssessmentOrg(section.assessment_id, req.organizationId);
    }

    // Enforce strict section type constraints: coding problems only in coding/mixed, MCQs only in objective/mixed
    if (section.section_type === 'objective' && pIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot add coding problems to an objective (MCQ) section. Change section type to mixed or add to a coding section.',
      });
    }
    if (section.section_type === 'coding' && qIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot add objective questions to a coding section. Change section type to mixed or add to an objective section.',
      });
    }

    // If adding a single question/problem, check duplicate first before order lookup
    if (qIds.length === 1 && pIds.length === 0) {
      const dup = await db.query(
        `SELECT id FROM assessment_section_questions WHERE section_id = $1 AND question_id = $2;`,
        [sectionId, qIds[0]]
      );
      if (dup.rowCount > 0) {
        return res.status(409).json({ success: false, error: 'Question is already added to this section' });
      }
    } else if (pIds.length === 1 && qIds.length === 0) {
      const dup = await db.query(
        `SELECT id FROM assessment_section_questions WHERE section_id = $1 AND problem_id = $2;`,
        [sectionId, pIds[0]]
      );
      if (dup.rowCount > 0) {
        return res.status(409).json({ success: false, error: 'Coding problem is already added to this section' });
      }
    }

    // Safe starting order index
    const orderRes = await db.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM assessment_section_questions WHERE section_id = $1;`,
      [sectionId]
    );
    let orderIndex = orderRes?.rows?.[0]?.next_order ?? 0;

    const insertSql = `
      INSERT INTO assessment_section_questions (
        section_id, question_id, problem_id, order_index, marks_override, negative_marks_override
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const addedMappings = [];

    // Add objective questions
    for (const qId of qIds) {
      const dup = qIds.length > 1 ? await db.query(
        `SELECT id FROM assessment_section_questions WHERE section_id = $1 AND question_id = $2;`,
        [sectionId, qId]
      ) : { rowCount: 0 };
      if (dup.rowCount === 0) {
        const finalMarksOverride = marks_override !== undefined && marks_override !== '' && marks_override !== null && !isNaN(parseFloat(marks_override))
          ? parseFloat(marks_override)
          : null;
        const finalNegativeOverride = negative_marks_override !== undefined && negative_marks_override !== '' && negative_marks_override !== null && !isNaN(parseFloat(negative_marks_override))
          ? parseFloat(negative_marks_override)
          : null;

        const result = await db.query(insertSql, [
          sectionId,
          qId,
          null,
          orderIndex++,
          finalMarksOverride,
          finalNegativeOverride,
        ]);
        addedMappings.push(result.rows[0]);
      }
    }

    // Add coding problems
    for (const pId of pIds) {
      const dup = await db.query(
        `SELECT id FROM assessment_section_questions WHERE section_id = $1 AND problem_id = $2;`,
        [sectionId, pId]
      );
      if (dup.rowCount === 0) {
        const finalMarksOverride = marks_override !== undefined && marks_override !== '' && marks_override !== null && !isNaN(parseFloat(marks_override))
          ? parseFloat(marks_override)
          : 10.0;
        const finalNegativeOverride = negative_marks_override !== undefined && negative_marks_override !== '' && negative_marks_override !== null && !isNaN(parseFloat(negative_marks_override))
          ? parseFloat(negative_marks_override)
          : 0.0;

        const result = await db.query(insertSql, [
          sectionId,
          null,
          pId,
          orderIndex++,
          finalMarksOverride,
          finalNegativeOverride,
        ]);
        addedMappings.push(result.rows[0]);
      }
    }

    if (addedMappings.length === 0 && (qIds.length > 0 || pIds.length > 0)) {
      return res.status(409).json({
        success: false,
        error: qIds.length > 0 ? 'Question(s) already added to this section' : 'Coding problem(s) already added to this section',
      });
    }

    await recalculateAssessmentTotal(section.assessment_id);

    res.status(201).json({
      success: true,
      mapping: addedMappings[0],
      mappings: addedMappings,
      added_count: addedMappings.length,
    });
  } catch (err) {
    logger.error({ err, sectionId: req.params.sectionId }, '[AssessmentAdmin] addQuestionToSection failed');
    res.status(500).json({ success: false, error: 'Failed to add question to section' });
  }
}

/**
 * Remove question or problem mapping from section.
 * Does NOT delete the source question bank or coding problem record.
 */
async function removeQuestionFromSection(req, res) {
  try {
    const mappingId = req.params.mappingId;

    const mapRes = await db.query(
      `SELECT sq.id, sq.section_id, s.assessment_id, a.organization_id
       FROM assessment_section_questions sq
       JOIN assessment_sections s ON sq.section_id = s.id
       JOIN assessments a ON s.assessment_id = a.id
       WHERE sq.id = $1;`,
      [mappingId]
    );

    if (mapRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Question mapping not found' });
    }
    const mapping = mapRes.rows[0];

    const isSuper = isSuperAdmin(req.user);
    if (!canModifyAssessment(req.user, mapping.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot remove question from another organization\'s assessment' });
    }

    await db.query(`DELETE FROM assessment_section_questions WHERE id = $1;`, [mappingId]);

    // Normalize remaining order_index in this section
    const remainingQuestions = await db.query(
      `SELECT id FROM assessment_section_questions WHERE section_id = $1 ORDER BY order_index ASC, created_at ASC;`,
      [mapping.section_id]
    );
    for (let i = 0; i < remainingQuestions.rows.length; i++) {
      await db.query(`UPDATE assessment_section_questions SET order_index = $1 WHERE id = $2;`, [i, remainingQuestions.rows[i].id]);
    }

    await recalculateAssessmentTotal(mapping.assessment_id);

    res.json({ success: true, message: 'Question removed from section' });
  } catch (err) {
    logger.error({ err, mappingId: req.params.mappingId }, '[AssessmentAdmin] removeQuestionFromSection failed');
    res.status(500).json({ success: false, error: 'Failed to remove question' });
  }
}

/**
 * Reorder questions within a section.
 */
async function reorderQuestions(req, res) {
  try {
    const { sectionId } = req.params;
    const { mapping_ids } = req.body;

    if (!Array.isArray(mapping_ids) || mapping_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'mapping_ids array is required' });
    }

    const secRes = await db.query(
      `SELECT s.*, a.organization_id 
       FROM assessment_sections s 
       JOIN assessments a ON s.assessment_id = a.id 
       WHERE s.id = $1;`,
      [sectionId]
    );
    if (secRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    const section = secRes.rows[0];

    const isSuper = isSuperAdmin(req.user);
    if (!canModifyAssessment(req.user, section.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot reorder questions in another organization\'s assessment' });
    }

    for (let i = 0; i < mapping_ids.length; i++) {
      await db.query(
        `UPDATE assessment_section_questions SET order_index = $1 WHERE id = $2 AND section_id = $3;`,
        [i, mapping_ids[i], sectionId]
      );
    }

    res.json({ success: true, message: 'Questions reordered successfully' });
  } catch (err) {
    logger.error({ err, sectionId: req.params.sectionId }, '[AssessmentAdmin] reorderQuestions failed');
    res.status(500).json({ success: false, error: 'Failed to reorder questions' });
  }
}

/**
 * Update assessment-specific question configuration (marks_override, negative_marks_override).
 */
async function updateQuestionMapping(req, res) {
  try {
    const { mappingId } = req.params;
    const { marks_override, negative_marks_override } = req.body;

    const mapRes = await db.query(
      `SELECT sq.id, sq.section_id, s.assessment_id, a.organization_id
       FROM assessment_section_questions sq
       JOIN assessment_sections s ON sq.section_id = s.id
       JOIN assessments a ON s.assessment_id = a.id
       WHERE sq.id = $1;`,
      [mappingId]
    );
    if (mapRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Question mapping not found' });
    }
    const mapping = mapRes.rows[0];

    const isSuper = isSuperAdmin(req.user);
    if (!canModifyAssessment(req.user, mapping.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot modify question in another organization\'s assessment' });
    }

    const marks = marks_override !== undefined && marks_override !== '' && marks_override !== null
      ? Math.max(parseFloat(marks_override) || 0, 0)
      : null;
    const negMarks = negative_marks_override !== undefined && negative_marks_override !== '' && negative_marks_override !== null
      ? Math.max(parseFloat(negative_marks_override) || 0, 0)
      : null;

    const result = await db.query(
      `UPDATE assessment_section_questions 
       SET marks_override = $1, negative_marks_override = $2
       WHERE id = $3
       RETURNING *;`,
      [marks, negMarks, mappingId]
    );

    await recalculateAssessmentTotal(mapping.assessment_id);

    res.json({ success: true, mapping: result.rows[0] });
  } catch (err) {
    logger.error({ err, mappingId: req.params.mappingId }, '[AssessmentAdmin] updateQuestionMapping failed');
    res.status(500).json({ success: false, error: 'Failed to update question marks configuration' });
  }
}

/**
 * Move question mapping between sections.
 */
async function moveQuestionBetweenSections(req, res) {
  try {
    const { mappingId } = req.params;
    const { target_section_id } = req.body;

    if (!target_section_id) {
      return res.status(400).json({ success: false, error: 'target_section_id is required' });
    }

    const mapRes = await db.query(
      `SELECT sq.*, s.assessment_id, a.organization_id
       FROM assessment_section_questions sq
       JOIN assessment_sections s ON sq.section_id = s.id
       JOIN assessments a ON s.assessment_id = a.id
       WHERE sq.id = $1;`,
      [mappingId]
    );
    if (mapRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Question mapping not found' });
    }
    const sourceMapping = mapRes.rows[0];

    const isSuper = isSuperAdmin(req.user);
    if (!canModifyAssessment(req.user, sourceMapping.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot move question from another organization\'s assessment' });
    }

    // Verify target section belongs to same assessment
    const targetSecRes = await db.query(
      `SELECT * FROM assessment_sections WHERE id = $1 AND assessment_id = $2;`,
      [target_section_id, sourceMapping.assessment_id]
    );
    if (targetSecRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Target section not found within this assessment' });
    }
    const targetSection = targetSecRes.rows[0];

    // Reject cross-type move if target section doesn't support the item type
    if (targetSection.section_type === 'coding' && sourceMapping.question_id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot move an objective question to a coding section. Change target section type to mixed or choose an objective section.',
      });
    }
    if (targetSection.section_type === 'objective' && sourceMapping.problem_id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot move a coding problem to an objective (MCQ) section. Change target section type to mixed or choose a coding section.',
      });
    }

    // Check duplicate in target section
    if (sourceMapping.question_id) {
      const dup = await db.query(
        `SELECT id FROM assessment_section_questions WHERE section_id = $1 AND question_id = $2;`,
        [target_section_id, sourceMapping.question_id]
      );
      if (dup.rowCount > 0) {
        return res.status(409).json({ success: false, error: 'Question is already present in target section' });
      }
    } else if (sourceMapping.problem_id) {
      const dup = await db.query(
        `SELECT id FROM assessment_section_questions WHERE section_id = $1 AND problem_id = $2;`,
        [target_section_id, sourceMapping.problem_id]
      );
      if (dup.rowCount > 0) {
        return res.status(409).json({ success: false, error: 'Coding problem is already present in target section' });
      }
    }

    // Next order index in target section
    const orderRes = await db.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM assessment_section_questions WHERE section_id = $1;`,
      [target_section_id]
    );
    const nextOrder = orderRes?.rows?.[0]?.next_order ?? orderRes?.rows?.[0]?.max_order ?? 0;

    await db.query(
      `UPDATE assessment_section_questions SET section_id = $1, order_index = $2 WHERE id = $3;`,
      [target_section_id, nextOrder, mappingId]
    );

    await recalculateAssessmentTotal(sourceMapping.assessment_id);

    res.json({ success: true, message: 'Question moved to new section successfully' });
  } catch (err) {
    logger.error({ err, mappingId: req.params.mappingId }, '[AssessmentAdmin] moveQuestionBetweenSections failed');
    res.status(500).json({ success: false, error: 'Failed to move question between sections' });
  }
}

/**
 * Create a new question in Question Bank and map it directly to a section in one operation.
 */
async function createQuestionAndAddToSection(req, res) {
  try {
    const { sectionId } = req.params;
    const {
      category,
      topic,
      subtopic,
      difficulty = 'Medium',
      question_type = 'single_choice',
      question_text,
      options = [],
      correct_answer = null,
      explanation = null,
      default_marks = 1.0,
      default_negative_marks = 0.0,
      marks_override,
      negative_marks_override,
      tags = [],
    } = req.body;

    const secRes = await db.query(
      `SELECT s.*, a.organization_id 
       FROM assessment_sections s 
       JOIN assessments a ON s.assessment_id = a.id 
       WHERE s.id = $1;`,
      [sectionId]
    );
    if (secRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    const section = secRes.rows[0];

    const isSuper = isSuperAdmin(req.user);
    if (!canModifyAssessment(req.user, section.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot modify another organization\'s assessment' });
    }
    if (!section.organization_id && req.organizationId) {
      await ensureAssessmentOrg(section.assessment_id, req.organizationId);
    }
    if (section.section_type === 'coding') {
      return res.status(400).json({
        success: false,
        error: 'Cannot add an objective question to a coding section. Change section type to mixed or select an objective section.',
      });
    }

    if (!category || !topic || !question_text) {
      return res.status(400).json({ success: false, error: 'Category, topic, and question text are required' });
    }

    const crypto = require('crypto');
    const normalized = `${category.trim().toLowerCase()}:${topic.trim().toLowerCase()}:${question_text.replace(/\s+/g, ' ').trim().toLowerCase()}`;
    const contentHash = crypto.createHash('sha256').update(normalized).digest('hex');

    const normalizedOpts = normalizeOptions(options);
    const normalizedAns = normalizeCorrectAnswer(correct_answer, normalizedOpts);

    const validationErr = validateObjectiveQuestion(question_type, normalizedOpts, normalizedAns);
    if (validationErr) {
      return res.status(400).json({ success: false, error: validationErr });
    }

    let finalTags = [];
    if (Array.isArray(tags)) {
      finalTags = tags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string') {
      finalTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Check existing or create question in Question Bank
    let questionId;
    const existingQ = await db.query(`SELECT id FROM assessment_questions WHERE content_hash = $1;`, [contentHash]);
    if (existingQ.rowCount > 0) {
      questionId = existingQ.rows[0].id;
    } else {
      const qRes = await db.query(
        `INSERT INTO assessment_questions (
          category, topic, subtopic, difficulty, question_type,
          question_text, options, correct_answer, explanation,
          default_marks, default_negative_marks, tags,
          source_file, import_batch, content_hash, is_active, created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          'builder_manual', 'manual', $13, TRUE, $14
        ) RETURNING id;`,
        [
          category.trim(),
          topic.trim(),
          subtopic ? subtopic.trim() : null,
          ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
          question_type,
          question_text.trim(),
          JSON.stringify(normalizedOpts),
          normalizedAns !== null ? JSON.stringify(normalizedAns) : null,
          explanation ? explanation.trim() : null,
          parseFloat(default_marks) || 1.0,
          parseFloat(default_negative_marks) || 0.0,
          JSON.stringify(finalTags),
          contentHash,
          req.user?.id || null,
        ]
      );
      questionId = qRes.rows[0].id;
    }

    // Check duplicate in section
    const dupCheck = await db.query(
      `SELECT id FROM assessment_section_questions WHERE section_id = $1 AND question_id = $2;`,
      [sectionId, questionId]
    );
    if (dupCheck.rowCount > 0) {
      return res.status(409).json({ success: false, error: 'This question is already in this section' });
    }

    const orderRes = await db.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM assessment_section_questions WHERE section_id = $1;`,
      [sectionId]
    );
    const orderIndex = orderRes.rows[0].next_order;

    const mapRes = await db.query(
      `INSERT INTO assessment_section_questions (
        section_id, question_id, order_index, marks_override, negative_marks_override
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
      [
        sectionId,
        questionId,
        orderIndex,
        marks_override !== undefined && marks_override !== '' && marks_override !== null ? parseFloat(marks_override) : null,
        negative_marks_override !== undefined && negative_marks_override !== '' && negative_marks_override !== null ? parseFloat(negative_marks_override) : null,
      ]
    );

    await recalculateAssessmentTotal(section.assessment_id);

    res.status(201).json({ success: true, mapping: mapRes.rows[0], questionId });
  } catch (err) {
    logger.error({ err, sectionId: req.params.sectionId }, '[AssessmentAdmin] createQuestionAndAddToSection failed');
    res.status(500).json({ success: false, error: 'Failed to create and add question' });
  }
}

/**
 * Random question selection based on rules: category, topic, difficulty, count
 */
async function populateRandomQuestions(req, res) {
  try {
    const { sectionId } = req.params;
    const { category, topic, difficulty, count = 10, marks_override, negative_marks_override } = req.body;

    const reqCount = Math.max(parseInt(count, 10) || 10, 1);

    const secRes = await db.query(
      `SELECT s.*, a.organization_id 
       FROM assessment_sections s 
       JOIN assessments a ON s.assessment_id = a.id 
       WHERE s.id = $1;`,
      [sectionId]
    );
    if (secRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    const section = secRes.rows[0];

    const isSuper = isSuperAdmin(req.user);
    if (!canModifyAssessment(req.user, section.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot populate questions for another organization\'s assessment' });
    }
    if (!section.organization_id && req.organizationId) {
      await ensureAssessmentOrg(section.assessment_id, req.organizationId);
    }
    if (section.section_type === 'coding') {
      return res.status(400).json({
        success: false,
        error: 'Cannot populate objective questions into a coding section. Change section type to mixed or select an objective section.',
      });
    }

    // Build conditions for random candidate pool
    const conditions = ['q.is_active = TRUE'];
    const params = [sectionId];

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`q.category = $${params.length}`);
    }

    if (topic && topic !== 'all') {
      params.push(topic);
      conditions.push(`q.topic = $${params.length}`);
    }

    if (difficulty && difficulty !== 'all') {
      params.push(difficulty);
      conditions.push(`q.difficulty = $${params.length}`);
    }

    // Exclude questions already in this section
    conditions.push(`q.id NOT IN (SELECT question_id FROM assessment_section_questions WHERE section_id = $1 AND question_id IS NOT NULL)`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Check count of available matching questions
    const availRes = await db.query(`SELECT count(*)::int AS count FROM assessment_questions q ${whereClause};`, params);
    const available = availRes.rows[0]?.count || 0;

    if (available < reqCount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient eligible questions available (${available} available, ${reqCount} requested). Please adjust rules or question count.`,
        available,
        requested: reqCount,
      });
    }

    // Select random questions using RANDOM()
    const selectSql = `
      SELECT q.id
      FROM assessment_questions q
      ${whereClause}
      ORDER BY RANDOM()
      LIMIT ${reqCount};
    `;
    const selectedRes = await db.query(selectSql, params);

    // Get current max order index
    const orderRes = await db.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM assessment_section_questions WHERE section_id = $1;`,
      [sectionId]
    );
    let orderIndex = orderRes.rows[0].next_order;

    let added = 0;
    for (const row of selectedRes.rows) {
      await db.query(
        `
        INSERT INTO assessment_section_questions (
          section_id, question_id, order_index, marks_override, negative_marks_override
        ) VALUES ($1, $2, $3, $4, $5);
      `,
        [
          sectionId,
          row.id,
          orderIndex++,
          marks_override !== undefined && marks_override !== '' && marks_override !== null ? parseFloat(marks_override) : null,
          negative_marks_override !== undefined && negative_marks_override !== '' && negative_marks_override !== null ? parseFloat(negative_marks_override) : null,
        ]
      );
      added++;
    }

    // Update section selection rules metadata
    await db.query(
      `UPDATE assessment_sections SET selection_mode = 'random', selection_rules = $1 WHERE id = $2;`,
      [JSON.stringify({ category, topic, difficulty, count: reqCount }), sectionId]
    );

    await recalculateAssessmentTotal(section.assessment_id);

    res.json({
      success: true,
      message: `Successfully populated ${added} random questions into section`,
      added,
    });
  } catch (err) {
    logger.error({ err, sectionId: req.params.sectionId }, '[AssessmentAdmin] populateRandomQuestions failed');
    res.status(500).json({ success: false, error: 'Failed to populate random questions' });
  }
}

/**
 * Get all candidate attempts for an assessment with tenant isolation.
 */
async function getAssessmentAttempts(req, res) {
  try {
    const { id } = req.params;
    const isSuper = isSuperAdmin(req.user);

    const assessRes = await db.query('SELECT organization_id FROM assessments WHERE id = $1;', [id]);
    if (assessRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    if (!canModifyAssessment(req.user, assessRes.rows[0].organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot view attempts for another organization\'s assessment' });
    }

    const result = await db.query(
      `
      SELECT
        att.*,
        u.username,
        u.email,
        u.display_name
      FROM assessment_attempts att
      JOIN users u ON att.user_id = u.id
      WHERE att.assessment_id = $1
      ORDER BY att.created_at DESC;
    `,
      [id]
    );

    res.json({ success: true, attempts: result.rows });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] getAssessmentAttempts failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve assessment attempts' });
  }
}

/**
 * Get assignments for an assessment
 */
async function getAssignments(req, res, next) {
  try {
    const { id } = req.params;
    let orgId = req.organizationId || req.query.organizationId;
    if (!orgId) {
      const aRes = await db.query('SELECT organization_id FROM assessments WHERE id = $1', [id]);
      orgId = aRes.rows[0]?.organization_id;
    }
    const eligibilityService = require('../services/assessmentEligibilityService');
    const rawAssignments = await eligibilityService.getAssignments(id, orgId);
    
    // Enrich with frontend-friendly aliases
    const assignments = (rawAssignments || []).map((a) => {
      const depts = Array.isArray(a.target_departments) ? a.target_departments : [];
      const years = Array.isArray(a.target_academic_years) ? a.target_academic_years : [];
      const students = Array.isArray(a.target_student_ids) ? a.target_student_ids : [];
      let targetValue = null;
      if (depts.length) targetValue = depts.join(', ');
      else if (years.length) targetValue = years.join(', ');
      else if (students.length) targetValue = students.join(', ');

      return {
        ...a,
        target_type: a.assignment_type,
        target_value: targetValue,
        max_attempts: a.max_attempts_override,
        valid_from: a.starts_at,
        valid_until: a.ends_at,
      };
    });

    res.json({ success: true, assignments });
  } catch (err) {
    next(err);
  }
}

/**
 * Create cohort or student assignment for an assessment
 */
async function createAssignment(req, res, next) {
  try {
    const { id } = req.params;
    let orgId = req.organizationId || req.body.organizationId;
    if (!orgId) {
      const aRes = await db.query('SELECT organization_id FROM assessments WHERE id = $1', [id]);
      orgId = aRes.rows[0]?.organization_id;
    }
    if (!orgId) {
      return res.status(400).json({ success: false, error: 'Organization ID is required for cohort assignment' });
    }

    // Map frontend or backend parameter schemas
    let assignmentType = req.body.assignmentType || req.body.target_type || 'all_organization';
    let targetDepartments = req.body.targetDepartments || [];
    let targetAcademicYears = req.body.targetAcademicYears || [];
    let targetStudentIds = req.body.targetStudentIds || [];

    if (assignmentType === 'all_organization_students' || assignmentType === 'all_organization') {
      assignmentType = 'all_organization';
    } else if (assignmentType === 'department' || assignmentType === 'departments') {
      assignmentType = 'departments';
      if (req.body.target_value) targetDepartments = [req.body.target_value.trim()];
    } else if (assignmentType === 'academic_year' || assignmentType === 'academic_years') {
      assignmentType = 'academic_years';
      if (req.body.target_value) targetAcademicYears = [req.body.target_value.trim()];
    } else if (assignmentType === 'cohort') {
      assignmentType = 'rule_based';
      if (req.body.target_value) targetDepartments = [req.body.target_value.trim()];
    } else if (assignmentType === 'specific_students') {
      assignmentType = 'specific_students';
      if (req.body.target_value) {
        targetStudentIds = req.body.target_value.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    const startsAt = req.body.startsAt || req.body.valid_from || null;
    const endsAt = req.body.endsAt || req.body.valid_until || null;
    const maxAttemptsOverride = req.body.maxAttemptsOverride || req.body.max_attempts || null;

    const eligibilityService = require('../services/assessmentEligibilityService');
    const assignment = await eligibilityService.createAssignment({
      assessmentId: id,
      organizationId: orgId,
      assignmentType,
      targetDepartments,
      targetAcademicYears,
      targetStudentIds,
      startsAt,
      endsAt,
      maxAttemptsOverride,
      adminUser: req.user,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, assignment });
  } catch (err) {
    next(err);
  }
}

/**
 * Revoke an assessment assignment
 */
async function revokeAssignment(req, res, next) {
  try {
    const { assignmentId } = req.params;
    let orgId = req.organizationId || req.body.organizationId || req.query.organizationId;
    if (!orgId) {
      const asgRes = await db.query('SELECT organization_id FROM assessment_assignments WHERE id = $1', [assignmentId]);
      orgId = asgRes.rows[0]?.organization_id;
    }
    const eligibilityService = require('../services/assessmentEligibilityService');
    const revoked = await eligibilityService.revokeAssignment(assignmentId, orgId, req.user, req.ip);
    res.json({ success: true, assignment: revoked });
  } catch (err) {
    next(err);
  }
}

/**
 * Release results to students: sets show_results_immediately to true and persists results_released_at.
 */
async function releaseResults(req, res) {
  try {
    const { id } = req.params;
    const isSuper = isSuperAdmin(req.user);

    const assessRes = await db.query(`SELECT * FROM assessments WHERE id = $1;`, [id]);
    if (assessRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const assessment = assessRes.rows[0];

    if (!canModifyAssessment(req.user, assessment.organization_id, req.organizationId)) {
      return res.status(403).json({ success: false, error: 'Cannot release results for another organization\'s assessment' });
    }

    const result = await db.query(
      `UPDATE assessments 
       SET show_results_immediately = TRUE, 
           results_released_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [id]
    );

    await logAdminAction({
      organizationId: assessment.organization_id,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'assessment.release_results',
      targetType: 'assessment',
      targetId: id,
      details: { title: assessment.title },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Assessment results have been successfully released to all participating students',
      assessment: result.rows[0],
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] releaseResults failed');
    res.status(500).json({ success: false, error: 'Failed to release assessment results' });
  }
}

module.exports = {
  getAssessments,
  getAssessment,
  createAssessment,
  updateAssessment,
  toggleStatus,
  deleteAssessment,
  recalculateAssessmentTotal,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  addQuestionToSection,
  removeQuestionFromSection,
  reorderQuestions,
  updateQuestionMapping,
  moveQuestionBetweenSections,
  createQuestionAndAddToSection,
  populateRandomQuestions,
  getAssessmentAttempts,
  getAssignments,
  createAssignment,
  revokeAssignment,
  releaseResults,
};

