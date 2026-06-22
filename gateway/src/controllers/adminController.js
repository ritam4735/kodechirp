// gateway/src/controllers/adminController.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin Controller — Full administration console backend
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const { parseProblem } = require('../services/problemParser');
const normalizationService = require('../services/problemNormalizationService');
const referenceSolutionService = require('../services/referenceSolutionService');
const testGenerationService = require('../services/testGenerationService');
const { validateSignature } = require('../utils/typeSystem');

const REVIEW_STATUSES = Object.freeze({
  IMPORTED: 'imported',
  PARSED: 'parsed',
  AI_NORMALIZED: 'ai_normalized',
  REVIEW_REQUIRED: 'review_required',
  APPROVED: 'approved',
  READY_FOR_PUBLICATION: 'ready_for_publication',
  PUBLISHED: 'published',
});

const LEGACY_REVIEW_STATUSES = Object.freeze(['pending', 'ready']);
const VALID_REVIEW_STATUSES = Object.freeze([
  ...Object.values(REVIEW_STATUSES),
  ...LEGACY_REVIEW_STATUSES,
]);

// ── Publish Validation Helper ───────────────────────────────────────────────
// Validates a problem meets all requirements before publishing.
// Required: title, description, ≥1 example, difficulty, tags, reference solution
async function validatePublish(problemId) {
  const errors = [];

  // Check problem fields
  const probResult = await db.query(
    `SELECT title, description, difficulty, tags, constraints,
            examples_json, reference_solution_id, judge_mode, signature_metadata
     FROM problems WHERE id = $1`,
    [problemId]
  );
  if (probResult.rowCount === 0) {
    return { valid: false, errors: ['Problem not found'] };
  }
  const prob = probResult.rows[0];

  // Signature validation for FUNCTION/CLASS
  if (prob.judge_mode === 'FUNCTION' || prob.judge_mode === 'CLASS') {
    if (!validateSignature(prob.signature_metadata)) {
      errors.push('A valid function signature must be defined for FUNCTION/CLASS judge modes.');
    }
  }

  // Required fields
  if (!prob.title || !prob.title.trim()) errors.push('Title is required');
  if (!prob.description || !prob.description.trim()) errors.push('Description is required');
  if (!prob.difficulty) errors.push('Difficulty is required');

  // Tags
  const tags = prob.tags || [];
  if (!Array.isArray(tags) || tags.length === 0) errors.push('At least one tag is required');

  // Examples: check examples_json or sample test cases
  const examplesJson = prob.examples_json || [];
  const sampleResult = await db.query(
    'SELECT COUNT(*)::int as count FROM test_cases WHERE problem_id = $1 AND is_sample = TRUE',
    [problemId]
  );
  const sampleCount = sampleResult.rows[0].count;
  if (examplesJson.length === 0 && sampleCount === 0) {
    errors.push('At least one example is required');
  }

  // Reference solution
  if (!prob.reference_solution_id) {
    errors.push('Cannot publish problem without a reference solution');
  } else {
    // Check verification status
    const refResult = await db.query(
      'SELECT compile_status FROM reference_solutions WHERE id = $1',
      [prob.reference_solution_id]
    );
    if (refResult.rowCount === 0) {
      errors.push('Reference solution record not found');
    } else if (refResult.rows[0].compile_status !== 'verified') {
      errors.push('Reference solution must be verified before publishing');
    }
  }

  // Check test cases
  const tcResult = await db.query(
    `SELECT 
       COUNT(*)::int as total,
       COUNT(CASE WHEN is_sample = TRUE THEN 1 END)::int as public_count,
       COUNT(CASE WHEN is_sample = FALSE THEN 1 END)::int as private_count
     FROM test_cases WHERE problem_id = $1`,
    [problemId]
  );
  const tc = tcResult.rows[0];
  if (tc.total === 0) errors.push('At least one test case is required');
  if (tc.public_count === 0) errors.push('At least one public test case is required');
  if (tc.private_count === 0) errors.push('At least one private (hidden) test case is required');

  return { valid: errors.length === 0, errors };
}

// ── Dashboard Stats ─────────────────────────────────────────────────────────

exports.getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProblems,
      totalSubmissions,
      acceptedSubmissions,
      problemsByDifficulty,
      recentActivity,
      recentSubmissions,
      publishedProblems,
      newUsersThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM problems'),
      db.query('SELECT COUNT(*) FROM submissions'),
      db.query("SELECT COUNT(*) FROM submissions WHERE status = 'Accepted'"),
      db.query('SELECT difficulty, COUNT(*)::int FROM problems GROUP BY difficulty'),
      db.query(`
        SELECT id, username, email, role, is_active, last_login_at, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 10
      `),
      db.query(`
        SELECT s.id, u.username, p.title, p.slug, s.status, s.language,
               s.runtime_ms, s.memory_kb, s.created_at
        FROM submissions s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN problems p ON s.problem_id = p.id
        ORDER BY s.created_at DESC
        LIMIT 10
      `),
      db.query("SELECT COUNT(*) FROM problems WHERE status = 'Published'"),
      db.query("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days'"),
      db.query("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days'"),
    ]);

    let successRate = 0;
    const totalSubs = parseInt(totalSubmissions.rows[0].count);
    const acceptedSubs = parseInt(acceptedSubmissions.rows[0].count);
    if (totalSubs > 0) {
      successRate = (acceptedSubs / totalSubs) * 100;
    }

    res.status(200).json({
      success: true,
      data: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalProblems: parseInt(totalProblems.rows[0].count),
        publishedProblems: parseInt(publishedProblems.rows[0].count),
        totalSubmissions: totalSubs,
        acceptedSubmissions: acceptedSubs,
        successRate: successRate.toFixed(2),
        problemsByDifficulty: problemsByDifficulty.rows,
        recentActivity: recentActivity.rows,
        recentSubmissions: recentSubmissions.rows,
        newUsersThisWeek: parseInt(newUsersThisWeek.rows[0].count),
        newUsersThisMonth: parseInt(newUsersThisMonth.rows[0].count),
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── Analytics ───────────────────────────────────────────────────────────────

exports.getAnalytics = async (req, res, next) => {
  try {
    const [
      problemsByDifficulty,
      dailySubmissions,
      weeklySubmissions,
      acceptanceByDifficulty,
      mostAttempted,
      mostSolved,
      mostActiveUsers,
      submissionsByStatus,
    ] = await Promise.all([
      db.query('SELECT difficulty, COUNT(*)::int as count FROM problems GROUP BY difficulty'),
      db.query(`
        SELECT DATE(created_at) as date, COUNT(*)::int as count
        FROM submissions
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      db.query(`
        SELECT DATE_TRUNC('week', created_at)::date as week, COUNT(*)::int as count
        FROM submissions
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week ASC
      `),
      db.query(`
        SELECT p.difficulty,
               COUNT(s.id)::int as total,
               COUNT(CASE WHEN s.status = 'Accepted' THEN 1 END)::int as accepted,
               CASE WHEN COUNT(s.id) > 0
                    THEN ROUND(COUNT(CASE WHEN s.status = 'Accepted' THEN 1 END)::numeric / COUNT(s.id) * 100, 1)
                    ELSE 0 END as rate
        FROM problems p
        LEFT JOIN submissions s ON s.problem_id = p.id
        GROUP BY p.difficulty
      `),
      db.query(`
        SELECT p.id, p.title, p.slug, p.difficulty, COUNT(s.id)::int as attempts
        FROM problems p
        JOIN submissions s ON s.problem_id = p.id
        GROUP BY p.id, p.title, p.slug, p.difficulty
        ORDER BY attempts DESC
        LIMIT 10
      `),
      db.query(`
        SELECT p.id, p.title, p.slug, p.difficulty,
               COUNT(CASE WHEN s.status = 'Accepted' THEN 1 END)::int as solved
        FROM problems p
        JOIN submissions s ON s.problem_id = p.id
        GROUP BY p.id, p.title, p.slug, p.difficulty
        HAVING COUNT(CASE WHEN s.status = 'Accepted' THEN 1 END) > 0
        ORDER BY solved DESC
        LIMIT 10
      `),
      db.query(`
        SELECT u.id, u.username, COUNT(s.id)::int as total_submissions,
               COUNT(CASE WHEN s.status = 'Accepted' THEN 1 END)::int as accepted
        FROM users u
        JOIN submissions s ON s.user_id = u.id
        GROUP BY u.id, u.username
        ORDER BY total_submissions DESC
        LIMIT 10
      `),
      db.query(`
        SELECT status, COUNT(*)::int as count
        FROM submissions
        GROUP BY status
      `),
    ]);

    res.status(200).json({
      success: true,
      data: {
        problemsByDifficulty: problemsByDifficulty.rows,
        dailySubmissions: dailySubmissions.rows,
        weeklySubmissions: weeklySubmissions.rows,
        acceptanceByDifficulty: acceptanceByDifficulty.rows,
        mostAttempted: mostAttempted.rows,
        mostSolved: mostSolved.rows,
        mostActiveUsers: mostActiveUsers.rows,
        submissionsByStatus: submissionsByStatus.rows,
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── Problem Management ──────────────────────────────────────────────────────

exports.getProblems = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    const difficulty = req.query.difficulty || '';
    const status = req.query.status || '';
    const source = req.query.source || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const tags = req.query.tags || '';

    const allowedSorts = ['created_at', 'title', 'difficulty', 'total_submissions', 'acceptance_rate'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'created_at';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (p.title ILIKE $${paramIndex} OR p.slug ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (difficulty) {
      whereClause += ` AND p.difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (source) {
      whereClause += ` AND p.source = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    if (tags) {
      whereClause += ` AND p.tags @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify([tags]));
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) FROM problems p ${whereClause}`;
    const dataQuery = `
      SELECT p.id, p.title, p.slug, p.difficulty, p.source, p.status, p.tags,
             p.total_submissions, p.total_accepted, p.acceptance_rate,
             p.created_at, p.updated_at,
             COALESCE(tc_stats.test_count, 0)::int as test_count,
             COALESCE(tc_stats.public_tests, 0)::int as public_tests,
             COALESCE(tc_stats.private_tests, 0)::int as private_tests
      FROM problems p
      LEFT JOIN (
        SELECT problem_id,
               COUNT(*)::int as test_count,
               COUNT(CASE WHEN is_sample = TRUE THEN 1 END)::int as public_tests,
               COUNT(CASE WHEN is_sample = FALSE THEN 1 END)::int as private_tests
        FROM test_cases GROUP BY problem_id
      ) tc_stats ON tc_stats.problem_id = p.id
      ${whereClause}
      ORDER BY p.${safeSortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      db.query(countQuery, params.slice(0, -2)),
      db.query(dataQuery, params),
    ]);

    res.status(200).json({
      success: true,
      data: dataRes.rows,
      meta: {
        total: parseInt(countRes.rows[0].count),
        limit,
        offset,
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getProblem = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM problems WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.createProblem = async (req, res, next) => {
  try {
    const {
      title, slug, description, difficulty, status,
      input_format, output_format, constraints,
      time_limit_ms, memory_limit_mb, tags, metadata, source,
      judge_mode, signature_metadata
    } = req.body;

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const result = await db.query(`
      INSERT INTO problems (title, slug, description, difficulty, status, created_by,
        input_format, output_format, constraints, time_limit_ms, memory_limit_mb, tags, metadata, source, judge_mode, signature_metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      title, finalSlug, description, difficulty || 'Medium', status || 'Draft', req.user.id,
      input_format || null, output_format || null, constraints || null,
      time_limit_ms || 2000, memory_limit_mb || 256,
      JSON.stringify(tags || []), JSON.stringify(metadata || {}), source || 'kodechirp',
      judge_mode || 'STDIN_STDOUT', signature_metadata ? JSON.stringify(signature_metadata) : null
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateProblem = async (req, res, next) => {
  try {
    const {
      title, description, difficulty, status,
      input_format, output_format, constraints,
      time_limit_ms, memory_limit_mb, tags, metadata, slug, source,
      judge_mode, signature_metadata
    } = req.body;

    // Validate publish requirements if transitioning to Published
    if (status === 'Published') {
      const validation = await validatePublish(req.params.id);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Cannot publish: ' + validation.errors.join('; '),
          validationErrors: validation.errors,
        });
      }
    }

    const result = await db.query(`
      UPDATE problems
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          difficulty = COALESCE($3, difficulty),
          status = COALESCE($4, status),
          input_format = COALESCE($5, input_format),
          output_format = COALESCE($6, output_format),
          constraints = COALESCE($7, constraints),
          time_limit_ms = COALESCE($8, time_limit_ms),
          memory_limit_mb = COALESCE($9, memory_limit_mb),
          tags = COALESCE($10, tags),
          metadata = COALESCE($11, metadata),
          slug = COALESCE($12, slug),
          source = COALESCE($13, source),
          judge_mode = COALESCE($15, judge_mode),
          signature_metadata = COALESCE($16, signature_metadata),
          execution_version = CASE WHEN ($15 IS NOT NULL AND $15 != judge_mode) OR ($16 IS NOT NULL AND $16::text != signature_metadata::text) THEN execution_version + 1 ELSE execution_version END,
          review_status = CASE WHEN $4 = 'Published' THEN '${REVIEW_STATUSES.PUBLISHED}' ELSE review_status END,
          updated_at = NOW()
      WHERE id = $14 RETURNING *
    `, [
      title, description, difficulty, status,
      input_format, output_format, constraints,
      time_limit_ms, memory_limit_mb,
      tags ? JSON.stringify(tags) : null,
      metadata ? JSON.stringify(metadata) : null,
      slug, source,
      req.params.id,
      judge_mode, signature_metadata ? JSON.stringify(signature_metadata) : null
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteProblem = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM problems WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }
    res.status(200).json({ success: true, message: 'Problem deleted' });
  } catch (err) {
    next(err);
  }
};

exports.toggleProblemStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    // Validate publish requirements if transitioning to Published
    if (status === 'Published') {
      const validation = await validatePublish(req.params.id);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Cannot publish: ' + validation.errors.join('; '),
          validationErrors: validation.errors,
        });
      }
    }

    const result = await db.query(
      `UPDATE problems
       SET status = $1,
           review_status = CASE WHEN $1 = 'Published' THEN $3 ELSE review_status END,
           updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, req.params.id, REVIEW_STATUSES.PUBLISHED]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.bulkAction = async (req, res, next) => {
  try {
    const { ids, action } = req.body;
    // action: 'publish' | 'unpublish' | 'delete'

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No IDs provided' });
    }

    if (!['publish', 'unpublish', 'delete'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    let result;
    if (action === 'publish') {
      // Validate each problem before bulk publishing
      const failures = [];
      for (const id of ids) {
        const validation = await validatePublish(id);
        if (!validation.valid) {
          const probRes = await db.query('SELECT title FROM problems WHERE id = $1', [id]);
          const title = probRes.rows[0]?.title || id;
          failures.push({ id, title, errors: validation.errors });
        }
      }
      if (failures.length > 0) {
        return res.status(400).json({
          success: false,
          error: `${failures.length} problem(s) cannot be published due to validation errors`,
          failures,
        });
      }
      result = await db.query(
        "UPDATE problems SET status = 'Published', review_status = $2, updated_at = NOW() WHERE id = ANY($1::uuid[]) RETURNING id",
        [ids, REVIEW_STATUSES.PUBLISHED]
      );
    } else if (action === 'unpublish') {
      result = await db.query(
        "UPDATE problems SET status = 'Draft', updated_at = NOW() WHERE id = ANY($1::uuid[]) RETURNING id",
        [ids]
      );
    } else if (action === 'delete') {
      result = await db.query(
        'DELETE FROM problems WHERE id = ANY($1::uuid[]) RETURNING id',
        [ids]
      );
    }

    res.status(200).json({
      success: true,
      message: `${action} applied to ${result.rowCount} problems`,
      affected: result.rowCount,
    });
  } catch (err) {
    next(err);
  }
};

// ── Test Case Management ────────────────────────────────────────────────────

exports.getTestCases = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM test_cases WHERE problem_id = $1 ORDER BY order_index ASC',
      [req.params.id]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

exports.createTestCase = async (req, res, next) => {
  try {
    const { input, expected_output, input_json, expected_json, is_sample, explanation, order_index } = req.body;
    const result = await db.query(`
      INSERT INTO test_cases (problem_id, input, expected_output, input_json, expected_json, is_sample, explanation, order_index)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [
      req.params.id, 
      input, 
      expected_output, 
      input_json ? JSON.stringify(input_json) : null,
      expected_json ? JSON.stringify(expected_json) : null,
      is_sample || false, 
      explanation, 
      order_index || 0
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.bulkImportTestCases = async (req, res, next) => {
  try {
    const { test_cases } = req.body;
    const problemId = req.params.id;

    if (!test_cases || !Array.isArray(test_cases) || test_cases.length === 0) {
      return res.status(400).json({ success: false, error: 'No test cases provided' });
    }

    // Verify the problem exists
    const probCheck = await db.query('SELECT id FROM problems WHERE id = $1', [problemId]);
    if (probCheck.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    const values = [];
    const placeholders = [];
    let idx = 1;

    for (const tc of test_cases) {
      placeholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5})`);
      values.push(
        problemId,
        tc.input,
        tc.expected_output,
        tc.is_sample || false,
        tc.explanation || null,
        tc.order_index || 0
      );
      idx += 6;
    }

    const result = await db.query(`
      INSERT INTO test_cases (problem_id, input, expected_output, is_sample, explanation, order_index)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `, values);

    res.status(201).json({
      success: true,
      data: result.rows,
      message: `${result.rowCount} test cases imported`,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTestCase = async (req, res, next) => {
  try {
    const { input, expected_output, input_json, expected_json, is_sample, explanation, order_index } = req.body;
    const result = await db.query(`
      UPDATE test_cases
      SET input = COALESCE($1, input),
          expected_output = COALESCE($2, expected_output),
          input_json = COALESCE($3, input_json),
          expected_json = COALESCE($4, expected_json),
          is_sample = COALESCE($5, is_sample),
          explanation = COALESCE($6, explanation),
          order_index = COALESCE($7, order_index)
      WHERE id = $8 RETURNING *
    `, [
      input, 
      expected_output, 
      input_json ? JSON.stringify(input_json) : null,
      expected_json ? JSON.stringify(expected_json) : null,
      is_sample, 
      explanation, 
      order_index, 
      req.params.id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Test case not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteTestCase = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM test_cases WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Test case not found' });
    }
    res.status(200).json({ success: true, message: 'Test case deleted' });
  } catch (err) {
    next(err);
  }
};

// ── User Management ─────────────────────────────────────────────────────────

exports.getUsers = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (status === 'active') {
      whereClause += ' AND u.is_active = true';
    } else if (status === 'suspended') {
      whereClause += ' AND u.is_active = false';
    }

    const countQuery = `SELECT COUNT(*) FROM users u ${whereClause}`;
    const dataQuery = `
      SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at, u.last_login_at,
             COALESCE(sub_stats.total_submissions, 0)::int as total_submissions,
             COALESCE(sub_stats.total_accepted, 0)::int as total_accepted
      FROM users u
      LEFT JOIN (
        SELECT user_id,
               COUNT(*)::int as total_submissions,
               COUNT(CASE WHEN status = 'Accepted' THEN 1 END)::int as total_accepted
        FROM submissions
        GROUP BY user_id
      ) sub_stats ON sub_stats.user_id = u.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      db.query(countQuery, params.slice(0, -2)),
      db.query(dataQuery, params),
    ]);

    res.status(200).json({
      success: true,
      data: dataRes.rows,
      meta: {
        total: parseInt(countRes.rows[0].count),
        limit,
        offset,
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    // Prevent self-demotion
    if (req.params.id === req.user.id && role !== 'admin') {
      return res.status(400).json({ success: false, error: 'Cannot demote yourself' });
    }

    const result = await db.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, role, is_active',
      [role, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;

    // Prevent self-suspension
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot change your own status' });
    }

    const result = await db.query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, role, is_active',
      [is_active, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── Submission Monitoring ───────────────────────────────────────────────────

exports.getSubmissions = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const user = req.query.user || '';
    const problem = req.query.problem || '';
    const status = req.query.status || '';
    const language = req.query.language || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (user) {
      whereClause += ` AND u.username ILIKE $${paramIndex}`;
      params.push(`%${user}%`);
      paramIndex++;
    }

    if (problem) {
      whereClause += ` AND p.title ILIKE $${paramIndex}`;
      params.push(`%${problem}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (language) {
      whereClause += ` AND s.language = $${paramIndex}`;
      params.push(language);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*)
      FROM submissions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN problems p ON s.problem_id = p.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT s.id, s.status, s.language, s.runtime_ms, s.memory_kb,
             s.test_cases_passed, s.test_cases_total, s.created_at,
             u.username, p.title as problem_title, p.slug as problem_slug
      FROM submissions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN problems p ON s.problem_id = p.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      db.query(countQuery, params.slice(0, -2)),
      db.query(dataQuery, params),
    ]);

    res.status(200).json({
      success: true,
      data: dataRes.rows,
      meta: {
        total: parseInt(countRes.rows[0].count),
        limit,
        offset,
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── Publish Validation Endpoint ─────────────────────────────────────────────

exports.validateProblem = async (req, res, next) => {
  try {
    const validation = await validatePublish(req.params.id);
    res.status(200).json({ success: true, ...validation });
  } catch (err) {
    next(err);
  }
};

// ── Test Case Report ────────────────────────────────────────────────────────

exports.getTestCaseReport = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id, p.title, p.slug, p.status, p.difficulty, p.source,
        COALESCE(tc.total, 0)::int as total_tests,
        COALESCE(tc.public_count, 0)::int as public_tests,
        COALESCE(tc.private_count, 0)::int as private_tests
      FROM problems p
      LEFT JOIN (
        SELECT 
          problem_id,
          COUNT(*)::int as total,
          COUNT(CASE WHEN is_sample = TRUE THEN 1 END)::int as public_count,
          COUNT(CASE WHEN is_sample = FALSE THEN 1 END)::int as private_count
        FROM test_cases
        GROUP BY problem_id
      ) tc ON tc.problem_id = p.id
      ORDER BY tc.total ASC NULLS FIRST, p.created_at DESC
    `);

    const summary = {
      totalProblems: result.rows.length,
      problemsWithTests: result.rows.filter(r => r.total_tests > 0).length,
      problemsMissingTests: result.rows.filter(r => r.total_tests === 0).length,
      totalPublicTests: result.rows.reduce((sum, r) => sum + r.public_tests, 0),
      totalPrivateTests: result.rows.reduce((sum, r) => sum + r.private_tests, 0),
      totalTests: result.rows.reduce((sum, r) => sum + r.total_tests, 0),
      publishedWithoutTests: result.rows.filter(r => r.status === 'Published' && r.total_tests === 0).length,
    };

    res.status(200).json({
      success: true,
      summary,
      problems: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// ── Problem Normalization Pipeline ──────────────────────────────────────────

// Parse a single problem
exports.parseProblem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT id, title, description, raw_statement FROM problems WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    const problem = result.rows[0];
    const rawText = problem.raw_statement || problem.description || '';

    // Run parser
    const parseResult = parseProblem(rawText);

    // Copy current description to raw_statement if not already set
    if (!problem.raw_statement && problem.description) {
      await db.query(
        'UPDATE problems SET raw_statement = description WHERE id = $1',
        [id]
      );
    }

    // Save parsed data to database
    await db.query(`
      UPDATE problems SET
        description_md = $1,
        examples_json = $2,
        constraints_json = $3,
        notes_json = $4,
        parser_confidence = $5,
        review_status = $6,
        updated_at = NOW()
      WHERE id = $7
    `, [
      parseResult.parsed.description,
      JSON.stringify(parseResult.parsed.examples),
      JSON.stringify(parseResult.parsed.constraints),
      JSON.stringify(parseResult.parsed.notes),
      parseResult.confidence,
      REVIEW_STATUSES.PARSED,
      id,
    ]);

    res.status(200).json({
      success: true,
      data: {
        id,
        title: problem.title,
        ...parseResult,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Batch parse multiple problems
exports.batchParse = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No problem IDs provided' });
    }

    // Limit batch size
    const limitedIds = ids.slice(0, 50);

    const result = await db.query(
      'SELECT id, title, description, raw_statement FROM problems WHERE id = ANY($1::uuid[])',
      [limitedIds]
    );

    const results = [];

    for (const problem of result.rows) {
      const rawText = problem.raw_statement || problem.description || '';
      const parseResult = parseProblem(rawText);

      // Preserve raw_statement
      if (!problem.raw_statement && problem.description) {
        await db.query(
          'UPDATE problems SET raw_statement = description WHERE id = $1',
          [problem.id]
        );
      }

      // Save parsed data
      await db.query(`
        UPDATE problems SET
          description_md = $1,
          examples_json = $2,
          constraints_json = $3,
          notes_json = $4,
          parser_confidence = $5,
          review_status = $6,
          updated_at = NOW()
        WHERE id = $7
      `, [
        parseResult.parsed.description,
        JSON.stringify(parseResult.parsed.examples),
        JSON.stringify(parseResult.parsed.constraints),
        JSON.stringify(parseResult.parsed.notes),
        parseResult.confidence,
        REVIEW_STATUSES.PARSED,
        problem.id,
      ]);

      results.push({
        id: problem.id,
        title: problem.title,
        confidence: parseResult.confidence,
      });
    }

    res.status(200).json({
      success: true,
      data: results,
      message: `${results.length} problems parsed`,
    });
  } catch (err) {
    next(err);
  }
};

// AI-normalize a single problem
exports.normalizeProblem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, title, description, raw_statement, description_md,
              examples_json, constraints_json, notes_json, parser_confidence
       FROM problems WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    const problem = result.rows[0];
    const rawText = problem.raw_statement || problem.description || '';

    // Ensure parser has run first
    let parsedData;
    if (problem.description_md) {
      parsedData = {
        description: problem.description_md,
        examples: problem.examples_json || [],
        constraints: problem.constraints_json || [],
        notes: problem.notes_json || [],
      };
    } else {
      // Run parser first
      const parseResult = parseProblem(rawText);
      parsedData = parseResult.parsed;
    }

    // Run AI normalization
    const normalized = await normalizationService.normalize(parsedData, rawText);
    const normalizedReviewStatus = normalized.quality_flags?.needs_manual_review
      ? REVIEW_STATUSES.REVIEW_REQUIRED
      : REVIEW_STATUSES.AI_NORMALIZED;

    // Save normalized data
    await db.query(`
      UPDATE problems SET
        description_md = $1,
        examples_json = $2,
        constraints_json = $3,
        notes_json = $4,
        ai_quality_flags = $5,
        generated_constraints = $6,
        constraint_source = $7,
        review_status = $8,
        updated_at = NOW()
      WHERE id = $9
    `, [
      normalized.description,
      JSON.stringify(normalized.examples),
      JSON.stringify(normalized.constraints),
      JSON.stringify(normalized.notes),
      JSON.stringify(normalized.quality_flags),
      JSON.stringify(normalized.generated_constraints),
      normalized.constraint_source,
      normalizedReviewStatus,
      id,
    ]);

    res.status(200).json({
      success: true,
      data: {
        id,
        title: problem.title,
        normalized,
        ai_status: normalizationService.getAIStatus(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get problems in the review queue
exports.getReviewQueue = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const reviewStatus = req.query.review_status || '';
    const minConfidence = parseFloat(req.query.min_confidence) || 0;
    const maxConfidence = parseFloat(req.query.max_confidence) || 1;
    const sortBy = req.query.sortBy || 'parser_confidence';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';

    const allowedSorts = ['parser_confidence', 'created_at', 'title', 'updated_at'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'parser_confidence';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (reviewStatus) {
      whereClause += ` AND p.review_status = $${paramIndex}`;
      params.push(reviewStatus);
      paramIndex++;
    }

    if (minConfidence > 0) {
      whereClause += ` AND p.parser_confidence >= $${paramIndex}`;
      params.push(minConfidence);
      paramIndex++;
    }

    if (maxConfidence < 1) {
      whereClause += ` AND p.parser_confidence <= $${paramIndex}`;
      params.push(maxConfidence);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) FROM problems p ${whereClause}`;
    const dataQuery = `
      SELECT p.id, p.title, p.slug, p.difficulty, p.status, p.source,
             p.description_md, p.examples_json, p.constraints_json, p.notes_json,
             p.parser_confidence, p.ai_quality_flags, p.generated_constraints,
             p.constraint_source, p.review_status, p.raw_statement,
             p.created_at, p.updated_at
      FROM problems p
      ${whereClause}
      ORDER BY p.${safeSortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      db.query(countQuery, params.slice(0, -2)),
      db.query(dataQuery, params),
    ]);

    // Calculate review stats
    const statsResult = await db.query(`
      SELECT
        review_status,
        COUNT(*)::int as count,
        ROUND(AVG(parser_confidence)::numeric, 2) as avg_confidence
      FROM problems
      WHERE review_status IS NOT NULL
      GROUP BY review_status
    `);

    res.status(200).json({
      success: true,
      data: dataRes.rows,
      meta: {
        total: parseInt(countRes.rows[0].count),
        limit,
        offset,
      },
      stats: statsResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// Approve parsing result
exports.approveParsing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description_md, examples, constraints, notes } = req.body;

    // Allow admin to optionally override parsed fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (description_md !== undefined) {
      updates.push(`description_md = $${paramIndex}`);
      values.push(description_md);
      paramIndex++;
    }

    if (examples !== undefined) {
      updates.push(`examples_json = $${paramIndex}`);
      values.push(JSON.stringify(examples));
      paramIndex++;
    }

    if (constraints !== undefined) {
      updates.push(`constraints_json = $${paramIndex}`);
      values.push(JSON.stringify(constraints));
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes_json = $${paramIndex}`);
      values.push(JSON.stringify(notes));
      paramIndex++;
    }

    updates.push(`review_status = '${REVIEW_STATUSES.APPROVED}'`);
    updates.push(`updated_at = NOW()`);

    values.push(id);

    const result = await db.query(
      `UPDATE problems SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Update review status
exports.updateReviewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { review_status } = req.body;

    if (!VALID_REVIEW_STATUSES.includes(review_status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid review_status. Must be one of: ${VALID_REVIEW_STATUSES.join(', ')}`,
      });
    }

    const result = await db.query(
      'UPDATE problems SET review_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [review_status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Get AI normalization service status
exports.getAIStatus = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: normalizationService.getAIStatus(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Reference Solution Management ──────────────────────────────────────────

exports.getReferenceSolution = async (req, res, next) => {
  try {
    const solution = await referenceSolutionService.getByProblem(req.params.id);
    res.status(200).json({ success: true, data: solution });
  } catch (err) {
    next(err);
  }
};

exports.upsertReferenceSolution = async (req, res, next) => {
  try {
    const { language, source_code } = req.body;

    if (!language || !source_code) {
      return res.status(400).json({
        success: false,
        error: 'Language and source_code are required',
      });
    }

    const supportedLanguages = ['cpp', 'c', 'python', 'javascript', 'java'];
    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language. Must be one of: ${supportedLanguages.join(', ')}`,
      });
    }

    const solution = await referenceSolutionService.upsert(req.params.id, {
      language,
      sourceCode: source_code,
      userId: req.user.id,
    });

    res.status(200).json({ success: true, data: solution });
  } catch (err) {
    next(err);
  }
};

exports.deleteReferenceSolution = async (req, res, next) => {
  try {
    const solution = await referenceSolutionService.getByProblem(req.params.id);
    if (!solution) {
      return res.status(404).json({ success: false, error: 'No reference solution found' });
    }
    await referenceSolutionService.remove(solution.id);
    res.status(200).json({ success: true, message: 'Reference solution deleted' });
  } catch (err) {
    next(err);
  }
};

exports.verifyReferenceSolution = async (req, res, next) => {
  try {
    const solution = await referenceSolutionService.getByProblem(req.params.id);
    if (!solution) {
      return res.status(404).json({ success: false, error: 'No reference solution found' });
    }

    const result = await referenceSolutionService.verify(solution.id);
    const requireLogger = require('../utils/logger');
    requireLogger.info(`VERIFY RESPONSE JSON: ${JSON.stringify(result)}`);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── Automated Test Generation ──────────────────────────────────────────────

exports.generateTests = async (req, res, next) => {
  try {
    const { visible_count, hidden_count, dry_run } = req.body;

    if (!testGenerationService.isAIConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'AI service is not configured. Set AI_API_URL and AI_API_KEY.',
      });
    }

    const result = await testGenerationService.generateTests(req.params.id, {
      visibleCount: visible_count || 10,
      hiddenCount: hidden_count || 50,
      dryRun: dry_run || false,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    // Return user-facing errors with 400
    if (err.message && (
      err.message.includes('not found') ||
      err.message.includes('no reference') ||
      err.message.includes('not verified') ||
      err.message.includes('AI')
    )) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
};
