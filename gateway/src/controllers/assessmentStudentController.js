// gateway/src/controllers/assessmentStudentController.js
// ─────────────────────────────────────────────────────────────────────────────
// Assessment Engine — Student Assessment Controller
// Timed Attempts, Response Persistence, Backend Scoring & Results Analytics
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const logger = require('../utils/logger');
const { normalizeOptions, normalizeCorrectAnswer } = require('../utils/helpers');

/**
 * List published assessments available for students
 */
async function getPublishedAssessments(req, res) {
  try {
    const { category, search, scope } = req.query;
    const conditions = ["a.status = 'Published'"];
    const params = [];

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`a.category = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(a.title ILIKE $${params.length} OR a.description ILIKE $${params.length})`);
    }

    const userId = req.user?.id || null;
    const { isSuperAdmin } = require('../middleware/rbac');
    const isSuper = req.user ? isSuperAdmin(req.user) : false;

    // Organization visibility rule
    if (!isSuper) {
      if (userId) {
        params.push(userId);
        const uIdx = params.length;
        conditions.push(`(
          a.is_public = TRUE OR 
          a.target_audience = 'public' OR
          a.organization_id IS NULL OR 
          a.organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = $${uIdx}
            UNION
            SELECT organization_id FROM student_rosters WHERE (matched_user_id = $${uIdx} OR LOWER(college_email) = (SELECT LOWER(email) FROM users WHERE id = $${uIdx})) AND is_active = TRUE
          )
        )`);
      } else {
        conditions.push(`(a.is_public = TRUE OR a.target_audience = 'public' OR a.organization_id IS NULL)`);
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT
        a.id,
        a.title,
        a.slug,
        a.description,
        a.instructions,
        a.category,
        a.duration_minutes,
        a.starts_at,
        a.ends_at,
        a.max_attempts,
        a.total_marks,
        a.pass_percentage,
        a.show_results_immediately,
        a.is_secure_mode,
        a.security_policy,
        a.created_at,
        a.organization_id,
        a.is_public,
        a.target_audience,
        o.name AS organization_name,
        o.code AS organization_code,
        o.slug AS organization_slug,
        u_author.username AS author_username,
        u_author.display_name AS author_display_name,
        (SELECT count(*)::int FROM assessment_sections s WHERE s.assessment_id = a.id) AS section_count,
        (
          SELECT count(*)::int
          FROM assessment_section_questions sq
          JOIN assessment_sections s ON sq.section_id = s.id
          WHERE s.assessment_id = a.id
        ) AS total_questions_count,
        ${userId ? `(
          SELECT json_build_object(
            'has_attempted', count(*) > 0,
            'attempt_count', count(*)::int,
            'latest_status', (SELECT status FROM assessment_attempts WHERE assessment_id = a.id AND user_id = $${params.length + 1} ORDER BY created_at DESC LIMIT 1),
            'latest_attempt_id', (SELECT id FROM assessment_attempts WHERE assessment_id = a.id AND user_id = $${params.length + 1} ORDER BY created_at DESC LIMIT 1),
            'latest_score', (SELECT total_score FROM assessment_attempts WHERE assessment_id = a.id AND user_id = $${params.length + 1} AND is_finalized = TRUE ORDER BY created_at DESC LIMIT 1)
          )
          FROM assessment_attempts
          WHERE assessment_id = a.id AND user_id = $${params.length + 1}
        )` : `'{}'::jsonb`} AS user_status
      FROM assessments a
      LEFT JOIN organizations o ON o.id = a.organization_id
      LEFT JOIN users u_author ON u_author.id = a.created_by
      ${whereClause}
      ORDER BY a.created_at DESC;
    `;

    const queryParams = userId ? [...params, userId] : params;
    const result = await db.query(sql, queryParams);

    res.json({ success: true, assessments: result.rows });
  } catch (err) {
    logger.error({ err }, '[AssessmentStudent] getPublishedAssessments failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve assessments' });
  }
}

/**
 * Get assessment details / overview before starting
 */
async function getAssessmentOverview(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const assessRes = await db.query(
      `
      SELECT
        a.id,
        a.title,
        a.slug,
        a.description,
        a.instructions,
        a.category,
        a.duration_minutes,
        a.status,
        a.starts_at,
        a.ends_at,
        a.max_attempts,
        a.total_marks,
        a.pass_percentage,
        a.show_results_immediately,
        a.is_secure_mode,
        a.security_policy,
        a.organization_id,
        a.is_public,
        a.target_audience,
        o.name AS organization_name,
        o.code AS organization_code,
        o.slug AS organization_slug,
        u_author.username AS author_username,
        u_author.display_name AS author_display_name
      FROM assessments a
      LEFT JOIN organizations o ON o.id = a.organization_id
      LEFT JOIN users u_author ON u_author.id = a.created_by
      WHERE (a.id::text = $1 OR a.slug = $1);
    `,
      [id]
    );

    if (assessRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const assessment = assessRes.rows[0];

    const { isSuperAdmin } = require('../middleware/rbac');
    const isSuper = req.user ? isSuperAdmin(req.user) : false;

    if (assessment.status !== 'Published' && !isSuper) {
      return res.status(403).json({ success: false, error: 'Assessment is not currently published' });
    }

    let eligibility = { eligible: true };
    if (userId) {
      const eligibilityService = require('../services/assessmentEligibilityService');
      eligibility = await eligibilityService.checkStudentEligibility({
        assessment,
        userId,
        userRole: req.user?.role || 'student',
      });
    }
    assessment.eligibility = eligibility;

    // Get section summaries
    const secRes = await db.query(
      `
      SELECT
        s.id,
        s.title,
        s.description,
        s.instructions,
        s.section_order,
        s.section_type,
        s.duration_minutes,
        s.marks_per_question,
        s.negative_marks_per_question,
        s.total_questions,
        s.total_marks
      FROM assessment_sections s
      WHERE s.assessment_id = $1
      ORDER BY s.section_order ASC;
    `,
      [assessment.id]
    );
    assessment.sections = secRes.rows;

    // Check existing attempt
    let existingAttempt = null;
    if (userId) {
      const attRes = await db.query(
        `
        SELECT id, attempt_number, status, started_at, expires_at, is_finalized, total_score, max_marks, percentage
        FROM assessment_attempts
        WHERE assessment_id = $1 AND user_id = $2
        ORDER BY created_at DESC
        LIMIT 1;
      `,
        [assessment.id, userId]
      );
      if (attRes.rowCount > 0) {
        existingAttempt = attRes.rows[0];
      }
    }

    res.json({ success: true, assessment, existingAttempt });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentStudent] getAssessmentOverview failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve assessment details' });
  }
}

/**
 * Start or resume an assessment attempt
 */
async function startAttempt(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const assessRes = await db.query(`SELECT * FROM assessments WHERE (id::text = $1 OR slug = $1);`, [id]);
    if (assessRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const assessment = assessRes.rows[0];

    const { isSuperAdmin } = require('../middleware/rbac');
    const isSuper = isSuperAdmin(req.user);

    if (assessment.status !== 'Published' && !isSuper) {
      return res.status(403).json({ success: false, error: 'Assessment is not available' });
    }

    // Verify student eligibility
    const eligibilityService = require('../services/assessmentEligibilityService');
    const elig = await eligibilityService.checkStudentEligibility({
      assessment,
      userId,
      userRole: req.user.role,
    });

    if (!elig.eligible) {
      return res.status(403).json({
        success: false,
        error: elig.reason || 'You are not eligible to take this assessment.',
      });
    }

    const effectiveMaxAttempts = elig.maxAttempts || assessment.max_attempts;

    // Check time windows if configured
    const now = new Date();
    if (assessment.starts_at && new Date(assessment.starts_at) > now) {
      return res.status(403).json({ success: false, error: 'Assessment has not started yet' });
    }
    if (assessment.ends_at && new Date(assessment.ends_at) < now) {
      return res.status(403).json({ success: false, error: 'Assessment has already concluded' });
    }

    // Check existing in-progress attempt
    const inProgressRes = await db.query(
      `
      SELECT * FROM assessment_attempts
      WHERE assessment_id = $1 AND user_id = $2 AND status = 'in_progress';
    `,
      [assessment.id, userId]
    );

    let attempt;
    if (inProgressRes.rowCount > 0) {
      attempt = inProgressRes.rows[0];

      // Check if attempt has expired server-side
      if (new Date(attempt.expires_at) < now) {
        // Automatically finalize and score expired attempt
        await finalizeAndScoreAttempt(attempt.id);
        return res.status(400).json({
          success: false,
          error: 'Your previous attempt has expired and has been submitted.',
          attemptId: attempt.id,
          expired: true,
        });
      }
    } else {
      // Check max attempts
      const countRes = await db.query(
        `SELECT count(*)::int AS count FROM assessment_attempts WHERE assessment_id = $1 AND user_id = $2;`,
        [assessment.id, userId]
      );
      const attemptCount = countRes.rows[0]?.count || 0;
      if (attemptCount >= effectiveMaxAttempts) {
        return res.status(403).json({
          success: false,
          error: `You have reached the maximum allowed attempts (${effectiveMaxAttempts}) for this assessment.`,
        });
      }

      // Calculate authoritative server timestamps
      const durationMs = assessment.duration_minutes * 60 * 1000;
      const startedAt = new Date();
      let expiresAt = new Date(startedAt.getTime() + durationMs);

      // If assessment has a hard end time that comes sooner, cap expires_at
      if (assessment.ends_at && new Date(assessment.ends_at) < expiresAt) {
        expiresAt = new Date(assessment.ends_at);
      }

      // Count total questions in assessment
      const qCountRes = await db.query(
        `
        SELECT count(*)::int AS total
        FROM assessment_section_questions sq
        JOIN assessment_sections s ON sq.section_id = s.id
        WHERE s.assessment_id = $1;
      `,
        [assessment.id]
      );
      const totalQuestions = qCountRes.rows[0]?.total || 0;

      const createSql = `
        INSERT INTO assessment_attempts (
          assessment_id, user_id, attempt_number, status,
          started_at, expires_at, max_marks, total_questions
        ) VALUES (
          $1, $2, $3, 'in_progress',
          $4, $5, $6, $7
        ) RETURNING *;
      `;

      const createRes = await db.query(createSql, [
        assessment.id,
        userId,
        attemptCount + 1,
        startedAt,
        expiresAt,
        assessment.total_marks,
        totalQuestions,
      ]);
      attempt = createRes.rows[0];
    }

    res.json({
      success: true,
      attemptId: attempt.id,
      startedAt: attempt.started_at,
      expiresAt: attempt.expires_at,
      is_secure_mode: Boolean(assessment.is_secure_mode),
      security_policy: assessment.security_policy,
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentStudent] startAttempt failed');
    res.status(500).json({ success: false, error: 'Failed to start assessment attempt' });
  }
}

/**
 * Retrieve active student attempt state with student-safe questions (NO LEAKAGE OF ANSWER KEYS)
 */
async function getAttemptData(req, res) {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    const attRes = await db.query(
      `
      SELECT att.*, a.title AS assessment_title, a.slug AS assessment_slug, a.instructions AS assessment_instructions,
             a.randomize_questions, a.randomize_options, a.is_secure_mode, a.security_policy
      FROM assessment_attempts att
      JOIN assessments a ON att.assessment_id = a.id
      WHERE att.id = $1;
    `,
      [attemptId]
    );

    if (attRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }
    const attempt = attRes.rows[0];

    // Ownership check (prevent IDOR)
    if (attempt.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied to this attempt' });
    }

    const now = new Date();
    // Check expiration
    if (attempt.status === 'in_progress' && new Date(attempt.expires_at) < now) {
      await finalizeAndScoreAttempt(attempt.id);
      attempt.status = 'evaluated';
    }

    // Get sections
    const secRes = await db.query(
      `
      SELECT id, title, description, instructions, section_order, section_type, duration_minutes,
             marks_per_question, negative_marks_per_question
      FROM assessment_sections
      WHERE assessment_id = $1
      ORDER BY section_order ASC, created_at ASC;
    `,
      [attempt.assessment_id]
    );
    const sections = secRes.rows;

    // Get responses saved so far by student
    const respRes = await db.query(
      `
      SELECT section_id, question_id, problem_id, selected_options, text_response, code_submission_id, is_flagged_for_review
      FROM assessment_responses
      WHERE attempt_id = $1;
    `,
      [attemptId]
    );

    const responsesMap = {};
    for (const r of respRes.rows) {
      const key = r.question_id || r.problem_id;
      responsesMap[key] = r;
    }

    // Get questions for each section (STUDENT SAFE PAYLOAD: NO correct_answer or explanation)
    for (const sec of sections) {
      const qRes = await db.query(
        `
        SELECT
          sq.id AS mapping_id,
          sq.order_index,
          COALESCE(sq.marks_override, sec.marks_per_question, q.default_marks, 1.0) AS marks,
          COALESCE(sq.negative_marks_override, sec.negative_marks_per_question, q.default_negative_marks, 0.0) AS negative_marks,
          sq.question_id,
          sq.problem_id,
          -- Objective question fields (SAFE: NEVER EXPOSE correct_answer or explanation)
          q.category,
          q.topic,
          q.difficulty,
          q.question_type,
          q.question_text,
          q.options,
          -- DSA Coding problem fields
          p.title AS problem_title,
          p.slug AS problem_slug,
          p.difficulty AS problem_difficulty,
          p.description AS problem_description,
          p.input_format,
          p.output_format,
          p.constraints,
          p.time_limit_ms,
          p.memory_limit_mb,
          p.judge_mode,
          p.signature_metadata,
          (
            SELECT COALESCE(json_agg(json_build_object('input', tc.input, 'output', tc.expected_output, 'explanation', tc.explanation)), '[]'::json)
            FROM test_cases tc
            WHERE tc.problem_id = p.id AND tc.is_sample = true
          ) AS sample_test_cases
        FROM assessment_section_questions sq
        JOIN assessment_sections sec ON sq.section_id = sec.id
        LEFT JOIN assessment_questions q ON sq.question_id = q.id
        LEFT JOIN problems p ON sq.problem_id = p.id
        WHERE sq.section_id = $1
        ORDER BY sq.order_index ASC, sq.created_at ASC;
      `,
        [sec.id]
      );

      // Map questions and attach student's current response
      sec.questions = qRes.rows.map((q) => {
        const itemKey = q.question_id || q.problem_id;
        const savedResp = responsesMap[itemKey] || null;

        return {
          id: itemKey,
          mapping_id: q.mapping_id,
          order_index: q.order_index,
          marks: q.marks,
          negative_marks: q.negative_marks,
          question_id: q.question_id,
          problem_id: q.problem_id,
          is_coding: Boolean(q.problem_id),
          category: q.category,
          topic: q.topic,
          difficulty: q.difficulty || q.problem_difficulty,
          question_type: q.question_type || 'coding',
          question_text: q.question_text || q.problem_description,
          title: q.problem_title || null,
          slug: q.problem_slug || null,
          input_format: q.input_format || null,
          output_format: q.output_format || null,
          constraints: q.constraints || null,
          judge_mode: q.judge_mode || 'STDIN_STDOUT',
          signature_metadata: q.signature_metadata || null,
          sample_test_cases: q.sample_test_cases || [],
          options: normalizeOptions(q.options),
          // Current student response state
          saved_response: savedResp
            ? {
                selected_options: savedResp.selected_options,
                text_response: savedResp.text_response,
                code_submission_id: savedResp.code_submission_id,
                is_flagged_for_review: savedResp.is_flagged_for_review,
              }
            : null,
        };
      });
    }

    // Remaining seconds
    const remainingMs = Math.max(0, new Date(attempt.expires_at).getTime() - Date.now());
    const remainingSeconds = Math.floor(remainingMs / 1000);

    res.json({
      success: true,
      attempt: {
        id: attempt.id,
        assessment_id: attempt.assessment_id,
        assessment_title: attempt.assessment_title,
        status: attempt.status,
        started_at: attempt.started_at,
        expires_at: attempt.expires_at,
        remaining_seconds: remainingSeconds,
        is_finalized: attempt.is_finalized,
        is_secure_mode: Boolean(attempt.is_secure_mode),
        security_policy: attempt.security_policy,
        submission_reason: attempt.submission_reason,
        is_terminated_by_violation: Boolean(attempt.is_terminated_by_violation),
        terminated_reason: attempt.terminated_reason,
        violations: attempt.violations || [],
      },
      sections,
    });
  } catch (err) {
    logger.error({ err, attemptId: req.params.attemptId }, '[AssessmentStudent] getAttemptData failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve attempt data' });
  }
}

/**
 * Save or update student response for a question during assessment
 */
async function saveResponse(req, res) {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;
    const {
      section_id,
      question_id,
      problem_id,
      selected_options,
      text_response,
      code_submission_id,
      is_flagged_for_review = false,
    } = req.body;

    if (!section_id || (!question_id && !problem_id)) {
      return res.status(400).json({ success: false, error: 'Missing section or question reference' });
    }

    // Verify attempt ownership and active status
    const attRes = await db.query(`SELECT * FROM assessment_attempts WHERE id = $1;`, [attemptId]);
    if (attRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }
    const attempt = attRes.rows[0];

    if (attempt.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (attempt.status !== 'in_progress' || attempt.is_finalized || attempt.is_terminated_by_violation) {
      return res.status(400).json({ success: false, error: 'Cannot modify responses on a submitted attempt' });
    }

    // Check expiration
    if (new Date(attempt.expires_at) < new Date()) {
      await finalizeAndScoreAttempt(attempt.id);
      return res.status(400).json({ success: false, error: 'Attempt time has expired', expired: true });
    }

    // Upsert response
    const upsertSql = `
      INSERT INTO assessment_responses (
        attempt_id, section_id, question_id, problem_id,
        selected_options, text_response, code_submission_id, is_flagged_for_review,
        answered_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        NOW(), NOW()
      )
      ON CONFLICT (attempt_id, COALESCE(question_id, '00000000-0000-0000-0000-000000000000'))
      DO UPDATE SET
        selected_options = EXCLUDED.selected_options,
        text_response = EXCLUDED.text_response,
        code_submission_id = EXCLUDED.code_submission_id,
        is_flagged_for_review = EXCLUDED.is_flagged_for_review,
        updated_at = NOW()
      RETURNING *;
    `;

    // Note: To handle problem_id conflict gracefully if question_id is null:
    let result;
    if (question_id) {
      const qCheck = await db.query(
        `SELECT id FROM assessment_responses WHERE attempt_id = $1 AND question_id = $2;`,
        [attemptId, question_id]
      );
      if (qCheck.rowCount > 0) {
        result = await db.query(
          `
          UPDATE assessment_responses
          SET selected_options = $1, text_response = $2, code_submission_id = $3,
              is_flagged_for_review = $4, updated_at = NOW()
          WHERE attempt_id = $5 AND question_id = $6
          RETURNING *;
        `,
          [
            selected_options !== undefined ? JSON.stringify(selected_options) : null,
            text_response || null,
            code_submission_id || null,
            Boolean(is_flagged_for_review),
            attemptId,
            question_id,
          ]
        );
      } else {
        result = await db.query(
          `
          INSERT INTO assessment_responses (
            attempt_id, section_id, question_id, problem_id,
            selected_options, text_response, code_submission_id, is_flagged_for_review
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `,
          [
            attemptId,
            section_id,
            question_id,
            null,
            selected_options !== undefined ? JSON.stringify(selected_options) : null,
            text_response || null,
            code_submission_id || null,
            Boolean(is_flagged_for_review),
          ]
        );
      }
    } else {
      // problem_id for coding questions
      const pCheck = await db.query(
        `SELECT id FROM assessment_responses WHERE attempt_id = $1 AND problem_id = $2;`,
        [attemptId, problem_id]
      );
      if (pCheck.rowCount > 0) {
        result = await db.query(
          `
          UPDATE assessment_responses
          SET selected_options = $1, text_response = $2, code_submission_id = $3,
              is_flagged_for_review = $4, updated_at = NOW()
          WHERE attempt_id = $5 AND problem_id = $6
          RETURNING *;
        `,
          [
            selected_options !== undefined ? JSON.stringify(selected_options) : null,
            text_response || null,
            code_submission_id || null,
            Boolean(is_flagged_for_review),
            attemptId,
            problem_id,
          ]
        );
      } else {
        result = await db.query(
          `
          INSERT INTO assessment_responses (
            attempt_id, section_id, question_id, problem_id,
            selected_options, text_response, code_submission_id, is_flagged_for_review
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `,
          [
            attemptId,
            section_id,
            null,
            problem_id,
            selected_options !== undefined ? JSON.stringify(selected_options) : null,
            text_response || null,
            code_submission_id || null,
            Boolean(is_flagged_for_review),
          ]
        );
      }
    }

    // Update counts on attempt
    await db.query(`
      UPDATE assessment_attempts
      SET
        answered_count = (
          SELECT count(*)::int FROM assessment_responses
          WHERE attempt_id = $1 AND (selected_options IS NOT NULL OR text_response IS NOT NULL OR code_submission_id IS NOT NULL)
        ),
        review_count = (
          SELECT count(*)::int FROM assessment_responses
          WHERE attempt_id = $1 AND is_flagged_for_review = TRUE
        ),
        updated_at = NOW()
      WHERE id = $1;
    `, [attemptId]);

    res.json({ success: true, response: result.rows[0] });
  } catch (err) {
    logger.error({ err, attemptId: req.params.attemptId }, '[AssessmentStudent] saveResponse failed');
    res.status(500).json({ success: false, error: 'Failed to save response' });
  }
}

/**
 * Submit and finalize assessment attempt
 */
async function submitAttempt(req, res) {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;
    const { submission_reason = 'manual', violation_type, violation_details, terminated_reason } = req.body || {};

    const attRes = await db.query(`SELECT * FROM assessment_attempts WHERE id = $1;`, [attemptId]);
    if (attRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }
    const attempt = attRes.rows[0];

    if (attempt.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (attempt.is_finalized) {
      return res.json({
        success: true,
        message: 'Assessment is already submitted',
        attemptId: attempt.id,
        result: attempt,
      });
    }

    const isViolation = Boolean(
      (submission_reason && submission_reason !== 'manual' && submission_reason !== 'timer_expired') ||
      violation_type
    );
    const finalReason = isViolation ? (violation_type || submission_reason) : submission_reason;

    const userAgent = typeof req.get === 'function' ? req.get('user-agent') : (req.headers && req.headers['user-agent']) || null;
    const evaluatedAttempt = await finalizeAndScoreAttempt(attemptId, {
      submission_reason: finalReason,
      is_violation: isViolation,
      violation_details,
      terminated_reason,
      ip: req.ip || null,
      userAgent,
    });

    res.json({
      success: true,
      message: isViolation ? 'Assessment terminated and submitted' : 'Assessment submitted and scored successfully',
      result: evaluatedAttempt,
    });
  } catch (err) {
    logger.error({ err, attemptId: req.params.attemptId }, '[AssessmentStudent] submitAttempt failed');
    res.status(500).json({ success: false, error: 'Failed to submit assessment' });
  }
}

/**
 * Record a security violation event during assessment attempt
 * In strict secure mode, automatically triggers finalization and scoring.
 */
async function recordViolation(req, res) {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;
    const { event_type, details } = req.body || {};

    if (!event_type) {
      return res.status(400).json({ success: false, error: 'Missing event_type' });
    }

    const attRes = await db.query(
      `
      SELECT att.*, a.is_secure_mode, a.security_policy
      FROM assessment_attempts att
      JOIN assessments a ON att.assessment_id = a.id
      WHERE att.id = $1;
    `,
      [attemptId]
    );

    if (attRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }
    const attempt = attRes.rows[0];

    if (attempt.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (attempt.is_finalized) {
      return res.json({
        success: true,
        message: 'Assessment is already submitted',
        attemptId: attempt.id,
        is_finalized: true,
        result: attempt,
      });
    }

    const secPolicy = attempt.security_policy || {};
    const terminatingEvents = ['tab_hidden', 'fullscreen_exited', 'navigation_attempt', 'security_violation'];
    const isStrictTermination = Boolean(
      attempt.is_secure_mode &&
      secPolicy.auto_submit_on_violation !== false &&
      terminatingEvents.includes(event_type)
    );

    const userAgent = typeof req.get === 'function' ? req.get('user-agent') : (req.headers && req.headers['user-agent']) || null;

    if (isStrictTermination) {
      const evaluated = await finalizeAndScoreAttempt(attemptId, {
        submission_reason: event_type,
        is_violation: true,
        violation_details: details,
        ip: req.ip || null,
        userAgent,
      });

      return res.json({
        success: true,
        terminated: true,
        submission_reason: event_type,
        message: 'Assessment automatically submitted due to security violation',
        result: evaluated,
      });
    } else {
      // Non-terminating violation (e.g. copy attempt warning or audit logging)
      const currentViolations = Array.isArray(attempt.violations) ? attempt.violations : [];
      const updatedViolations = [
        ...currentViolations,
        {
          event_type,
          occurred_at: new Date().toISOString(),
          details: details || {},
        },
      ];

      await db.query(
        `UPDATE assessment_attempts SET violations = $1, updated_at = NOW() WHERE id = $2;`,
        [JSON.stringify(updatedViolations), attemptId]
      );

      try {
        await db.query(
          `
          INSERT INTO assessment_violation_logs (
            attempt_id, assessment_id, user_id, event_type, details, ip_address, user_agent, occurred_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());
        `,
          [
            attempt.id,
            attempt.assessment_id,
            attempt.user_id,
            event_type,
            JSON.stringify(details || {}),
            req.ip || null,
            userAgent,
          ]
        );
      } catch (logErr) {
        logger.warn({ logErr, attemptId }, '[AssessmentStudent] Failed to insert into assessment_violation_logs');
      }

      return res.json({
        success: true,
        terminated: false,
        message: 'Violation recorded',
      });
    }
  } catch (err) {
    logger.error({ err, attemptId: req.params.attemptId }, '[AssessmentStudent] recordViolation failed');
    res.status(500).json({ success: false, error: 'Failed to record violation' });
  }
}

/**
 * Core Evaluation Engine: Calculates score, section breakdown, percentages securely
 */
async function finalizeAndScoreAttempt(attemptId, options = {}) {
  const attRes = await db.query(`SELECT * FROM assessment_attempts WHERE id = $1;`, [attemptId]);
  if (attRes.rowCount === 0) throw new Error('Attempt not found');
  const attempt = attRes.rows[0];

  // Idempotent safeguard: if already finalized, return existing attempt
  if (attempt.is_finalized) {
    return attempt;
  }

  const now = new Date();
  const isExpired = new Date(attempt.expires_at) < now;
  const isViolation = Boolean(
    options.is_violation ||
    (options.submission_reason && options.submission_reason !== 'manual' && options.submission_reason !== 'timer_expired')
  );

  let submissionReason = options.submission_reason || (isExpired ? 'timer_expired' : 'manual');
  let terminatedReason = options.terminated_reason || null;
  if (isViolation && !terminatedReason) {
    if (submissionReason === 'tab_hidden') terminatedReason = 'Assessment document was hidden (switched tabs or minimized browser).';
    else if (submissionReason === 'fullscreen_exited') terminatedReason = 'Full-screen mode was exited during strict secure assessment.';
    else if (submissionReason === 'navigation_attempt') terminatedReason = 'Browser navigation or reload was attempted during assessment.';
    else terminatedReason = 'A confirmed security violation occurred during strict assessment.';
  }

  let currentViolations = Array.isArray(attempt.violations) ? attempt.violations : [];
  if (isViolation || options.violation_details) {
    currentViolations = [
      ...currentViolations,
      {
        event_type: submissionReason,
        occurred_at: now.toISOString(),
        details: options.violation_details || {},
        reason: terminatedReason,
      },
    ];
  }

  // Get all sections for this assessment
  const secRes = await db.query(
    `SELECT * FROM assessment_sections WHERE assessment_id = $1 ORDER BY section_order ASC;`,
    [attempt.assessment_id]
  );
  const sections = secRes.rows;

  let overallScore = 0;
  let overallMaxMarks = 0;
  let overallCorrect = 0;
  let overallIncorrect = 0;
  let overallUnanswered = 0;
  let totalQuestionsCount = 0;

  const sectionScores = [];

  for (const sec of sections) {
    // Get all mapped questions in this section
    const qRes = await db.query(
      `
      SELECT
        sq.id AS mapping_id,
        sq.question_id,
        sq.problem_id,
        COALESCE(sq.marks_override, sec.marks_per_question, q.default_marks, 1.0) AS marks,
        COALESCE(sq.negative_marks_override, sec.negative_marks_per_question, q.default_negative_marks, 0.0) AS negative_marks,
        q.question_type,
        q.correct_answer,
        p.id AS problem_id_ref
      FROM assessment_section_questions sq
      JOIN assessment_sections sec ON sq.section_id = sec.id
      LEFT JOIN assessment_questions q ON sq.question_id = q.id
      LEFT JOIN problems p ON sq.problem_id = p.id
      WHERE sq.section_id = $1;
    `,
      [sec.id]
    );

    let secScore = 0;
    let secMaxMarks = 0;
    let secCorrect = 0;
    let secIncorrect = 0;
    let secUnanswered = 0;

    for (const item of qRes.rows) {
      const marks = parseFloat(item.marks) || 1.0;
      const negMarks = parseFloat(item.negative_marks) || 0.0;
      secMaxMarks += marks;
      totalQuestionsCount++;

      // Check student's response
      let respRes;
      if (item.question_id) {
        respRes = await db.query(
          `SELECT * FROM assessment_responses WHERE attempt_id = $1 AND question_id = $2;`,
          [attemptId, item.question_id]
        );
      } else {
        respRes = await db.query(
          `SELECT * FROM assessment_responses WHERE attempt_id = $1 AND problem_id = $2;`,
          [attemptId, item.problem_id]
        );
      }

      const response = respRes.rows[0] || null;

      if (!response || (!response.selected_options && !response.text_response && !response.code_submission_id)) {
        // Unanswered
        secUnanswered++;
        if (response) {
          await db.query(
            `UPDATE assessment_responses SET is_correct = FALSE, is_evaluated = TRUE, score_awarded = 0 WHERE id = $1;`,
            [response.id]
          );
        }
        continue;
      }

      let isCorrect = false;
      let scoreAwarded = 0;

      if (item.question_id) {
        // Objective evaluation
        const qType = item.question_type || 'single_choice';
        const expected = item.correct_answer;

        if (expected === null || expected === undefined) {
          isCorrect = false;
          scoreAwarded = 0;
        } else if (qType === 'single_choice' || qType === 'true_false') {
          const selected = typeof response.selected_options === 'string'
            ? response.selected_options.toLowerCase().trim()
            : (Array.isArray(response.selected_options) ? response.selected_options[0]?.toLowerCase() : null);

          let expectedNormalized = expected;
          if (typeof expected === 'string') {
            expectedNormalized = expected.toLowerCase().trim();
          } else if (Array.isArray(expected)) {
            expectedNormalized = expected[0]?.toLowerCase().trim();
          }

          if (selected && selected === expectedNormalized) {
            isCorrect = true;
            scoreAwarded = marks;
          } else {
            isCorrect = false;
            scoreAwarded = -negMarks;
          }
        } else if (qType === 'multiple_choice') {
          const selectedArr = Array.isArray(response.selected_options)
            ? response.selected_options.map(s => String(s).toLowerCase().trim()).sort()
            : [];
          const expectedArr = Array.isArray(expected)
            ? expected.map(s => String(s).toLowerCase().trim()).sort()
            : [String(expected).toLowerCase().trim()];

          if (JSON.stringify(selectedArr) === JSON.stringify(expectedArr)) {
            isCorrect = true;
            scoreAwarded = marks;
          } else {
            isCorrect = false;
            scoreAwarded = -negMarks;
          }
        } else if (qType === 'short_answer') {
          const text = (response.text_response || '').trim().toLowerCase();
          const expectedStr = String(expected).trim().toLowerCase();
          if (text === expectedStr) {
            isCorrect = true;
            scoreAwarded = marks;
          } else {
            isCorrect = false;
            scoreAwarded = -negMarks;
          }
        } else {
          isCorrect = false;
          scoreAwarded = 0;
        }
      } else if (item.problem_id) {
        // DSA Coding problem evaluation
        if (response.code_submission_id) {
          const subRes = await db.query(
            `SELECT status, test_cases_passed, test_cases_total FROM submissions WHERE id = $1;`,
            [response.code_submission_id]
          );
          if (subRes.rowCount > 0) {
            const sub = subRes.rows[0];
            if (sub.status === 'Accepted' && sub.test_cases_passed === sub.test_cases_total && sub.test_cases_total > 0) {
              isCorrect = true;
              scoreAwarded = marks;
            } else if (sub.test_cases_passed > 0 && sub.test_cases_total > 0) {
              const fraction = sub.test_cases_passed / sub.test_cases_total;
              scoreAwarded = parseFloat((fraction * marks).toFixed(2));
              isCorrect = fraction >= 0.5;
            } else {
              isCorrect = false;
              scoreAwarded = 0;
            }
          }
        }
      }

      if (isCorrect) {
        secCorrect++;
      } else {
        secIncorrect++;
      }
      secScore += scoreAwarded;

      // Update response score
      await db.query(
        `
        UPDATE assessment_responses
        SET is_correct = $1, is_evaluated = TRUE, score_awarded = $2, updated_at = NOW()
        WHERE id = $3;
      `,
        [isCorrect, scoreAwarded, response.id]
      );
    }

    // Accumulate overall
    overallScore += secScore;
    overallMaxMarks += secMaxMarks;
    overallCorrect += secCorrect;
    overallIncorrect += secIncorrect;
    overallUnanswered += secUnanswered;

    sectionScores.push({
      section_id: sec.id,
      title: sec.title,
      score: Math.max(0, parseFloat(secScore.toFixed(2))),
      max_marks: parseFloat(secMaxMarks.toFixed(2)),
      correct_count: secCorrect,
      incorrect_count: secIncorrect,
      unanswered_count: secUnanswered,
    });
  }

  // Ensure overall score doesn't fall below zero
  const finalScore = Math.max(0, parseFloat(overallScore.toFixed(2)));
  const percentage = overallMaxMarks > 0 ? parseFloat(((finalScore / overallMaxMarks) * 100).toFixed(2)) : 0.0;

  // Finalize attempt in database
  const updateAttemptSql = `
    UPDATE assessment_attempts
    SET
      status = 'evaluated',
      submitted_at = NOW(),
      total_score = $1,
      max_marks = $2,
      percentage = $3,
      total_questions = $4,
      answered_count = $5,
      correct_count = $6,
      incorrect_count = $7,
      unanswered_count = $8,
      section_scores = $9,
      is_finalized = TRUE,
      submission_reason = $10,
      is_terminated_by_violation = $11,
      terminated_reason = $12,
      violations = $13,
      updated_at = NOW()
    WHERE id = $14
    RETURNING *;
  `;

  const finalRes = await db.query(updateAttemptSql, [
    finalScore,
    overallMaxMarks,
    percentage,
    totalQuestionsCount,
    overallCorrect + overallIncorrect,
    overallCorrect,
    overallIncorrect,
    overallUnanswered,
    JSON.stringify(sectionScores),
    submissionReason,
    isViolation,
    terminatedReason,
    JSON.stringify(currentViolations),
    attemptId,
  ]);

  if (isViolation || options.violation_details) {
    try {
      await db.query(
        `
        INSERT INTO assessment_violation_logs (
          attempt_id, assessment_id, user_id, event_type, details, ip_address, user_agent, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());
      `,
        [
          attempt.id,
          attempt.assessment_id,
          attempt.user_id,
          submissionReason,
          JSON.stringify(options.violation_details || { reason: terminatedReason }),
          options.ip || null,
          options.userAgent || null,
        ]
      );
    } catch (logErr) {
      logger.warn({ logErr, attemptId }, '[AssessmentStudent] Failed to insert into assessment_violation_logs');
    }
  }

  return finalRes.rows[0];
}

/**
 * Get assessment results with permitted review details
 */
async function getAttemptResult(req, res) {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    const attRes = await db.query(
      `
      SELECT
        att.*,
        a.title AS assessment_title,
        a.category AS assessment_category,
        a.show_results_immediately,
        a.show_answers_mode,
        a.ends_at AS assessment_ends_at,
        a.pass_percentage,
        a.organization_id,
        a.results_released_at,
        a.is_secure_mode,
        a.security_policy
      FROM assessment_attempts att
      JOIN assessments a ON att.assessment_id = a.id
      WHERE att.id = $1;
    `,
      [attemptId]
    );

    if (attRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }
    const attempt = attRes.rows[0];

    const { isSuperAdmin, isCollegeAdmin } = require('../middleware/rbac');
    const isSuper = isSuperAdmin(req.user);
    const isCollegeAdm = isCollegeAdmin(req.user);
    const isOwner = attempt.user_id === userId;
    const canManageOrg = isSuper || (isCollegeAdm && req.user.organizationId && req.user.organizationId === attempt.organization_id);

    if (!isOwner && !canManageOrg) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only view your own assessment results' });
    }

    // Check if review is permitted by assessment settings
    let canViewAnswers = false;
    const mode = attempt.show_answers_mode;
    const now = new Date();

    const resultsReleased = attempt.show_results_immediately || (attempt.assessment_ends_at && new Date(attempt.assessment_ends_at) < now) || (attempt.results_released_at && new Date(attempt.results_released_at) <= now);

    if (!resultsReleased && !canManageOrg) {
      return res.json({
        success: true,
        result: {
          id: attempt.id,
          assessment_id: attempt.assessment_id,
          assessment_title: attempt.assessment_title,
          assessment_category: attempt.assessment_category,
          status: attempt.status,
          is_finalized: attempt.is_finalized,
          results_withheld: true,
          message: 'Your assessment attempt has been successfully recorded. Detailed scores and performance analytics will be released once published by your institution.',
        }
      });
    }

    if (isSuper || canManageOrg) {
      canViewAnswers = true;
    } else if (mode === 'immediate' || mode === 'after_submission') {
      canViewAnswers = true;
    } else if (mode === 'after_assessment_end') {
      canViewAnswers = attempt.assessment_ends_at && new Date(attempt.assessment_ends_at) < now;
    } else {
      canViewAnswers = false;
    }

    // Fetch per-question breakdown if review is permitted
    let questionsReview = [];
    if (canViewAnswers) {
      const qRevRes = await db.query(
        `
        SELECT
          sq.section_id,
          s.title AS section_title,
          sq.question_id,
          sq.problem_id,
          COALESCE(sq.marks_override, s.marks_per_question, q.default_marks, 1.0) AS marks,
          COALESCE(sq.negative_marks_override, s.negative_marks_per_question, q.default_negative_marks, 0.0) AS negative_marks,
          q.category,
          q.topic,
          q.difficulty,
          q.question_type,
          q.question_text,
          q.options,
          q.correct_answer,
          q.explanation,
          p.title AS problem_title,
          r.selected_options,
          r.text_response,
          r.code_submission_id,
          r.is_correct,
          r.score_awarded
        FROM assessment_section_questions sq
        JOIN assessment_sections s ON sq.section_id = s.id
        LEFT JOIN assessment_questions q ON sq.question_id = q.id
        LEFT JOIN problems p ON sq.problem_id = p.id
        LEFT JOIN assessment_responses r ON r.attempt_id = $1 AND (r.question_id = sq.question_id OR r.problem_id = sq.problem_id)
        WHERE s.assessment_id = $2
        ORDER BY s.section_order ASC, sq.order_index ASC;
      `,
        [attemptId, attempt.assessment_id]
      );
      questionsReview = qRevRes.rows.map((q) => {
        const opts = normalizeOptions(q.options);
        return {
          ...q,
          options: opts,
          correct_answer: normalizeCorrectAnswer(q.correct_answer, opts),
        };
      });
    }

    // Calculate time taken
    let timeTakenSeconds = 0;
    if (attempt.started_at && attempt.submitted_at) {
      timeTakenSeconds = Math.round((new Date(attempt.submitted_at) - new Date(attempt.started_at)) / 1000);
    }

    res.json({
      success: true,
      result: {
        id: attempt.id,
        assessment_id: attempt.assessment_id,
        assessment_title: attempt.assessment_title,
        assessment_category: attempt.assessment_category,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        time_taken_seconds: timeTakenSeconds,
        total_score: attempt.total_score,
        max_marks: attempt.max_marks,
        percentage: attempt.percentage,
        is_passed: attempt.percentage >= attempt.pass_percentage,
        pass_percentage: attempt.pass_percentage,
        total_questions: attempt.total_questions,
        answered_count: attempt.answered_count,
        correct_count: attempt.correct_count,
        incorrect_count: attempt.incorrect_count,
        unanswered_count: attempt.unanswered_count,
        section_scores: attempt.section_scores,
        can_view_answers: canViewAnswers,
        questions_review: questionsReview,
        submission_reason: attempt.submission_reason,
        is_terminated_by_violation: Boolean(attempt.is_terminated_by_violation),
        terminated_reason: attempt.terminated_reason,
        violations: attempt.violations || [],
        is_secure_mode: Boolean(attempt.is_secure_mode),
        security_policy: attempt.security_policy,
      },
    });
  } catch (err) {
    logger.error({ err, attemptId: req.params.attemptId }, '[AssessmentStudent] getAttemptResult failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve assessment results' });
  }
}

module.exports = {
  getPublishedAssessments,
  getAssessmentOverview,
  startAttempt,
  getAttemptData,
  saveResponse,
  submitAttempt,
  recordViolation,
  getAttemptResult,
};
