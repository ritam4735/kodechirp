// gateway/src/controllers/adminController.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin Controller — Full administration console backend
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');

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
      db.query("SELECT COUNT(*) FROM problems WHERE is_active = true"),
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
    const status = req.query.status || ''; // 'published' | 'unpublished'
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
      whereClause += ` AND (title ILIKE $${paramIndex} OR slug ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (difficulty) {
      whereClause += ` AND difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (source) {
      whereClause += ` AND source = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    if (tags) {
      whereClause += ` AND tags @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify([tags]));
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) FROM problems ${whereClause}`;
    const dataQuery = `
      SELECT id, title, slug, difficulty, source, status, tags,
             total_submissions, total_accepted, acceptance_rate,
             created_at, updated_at
      FROM problems
      ${whereClause}
      ORDER BY ${safeSortBy} ${sortOrder}
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
      time_limit_ms, memory_limit_mb, tags, metadata, source
    } = req.body;

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const result = await db.query(`
      INSERT INTO problems (title, slug, description, difficulty, status, created_by,
        input_format, output_format, constraints, time_limit_ms, memory_limit_mb, tags, metadata, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      title, finalSlug, description, difficulty || 'Medium', status || 'Draft', req.user.id,
      input_format || null, output_format || null, constraints || null,
      time_limit_ms || 2000, memory_limit_mb || 256,
      JSON.stringify(tags || []), JSON.stringify(metadata || {}), source || 'kodechirp'
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
      time_limit_ms, memory_limit_mb, tags, metadata, slug, source
    } = req.body;

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
          updated_at = NOW()
      WHERE id = $14 RETURNING *
    `, [
      title, description, difficulty, status,
      input_format, output_format, constraints,
      time_limit_ms, memory_limit_mb,
      tags ? JSON.stringify(tags) : null,
      metadata ? JSON.stringify(metadata) : null,
      slug, source,
      req.params.id
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
    const result = await db.query(
      'UPDATE problems SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
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
      result = await db.query(
        'UPDATE problems SET is_active = true, updated_at = NOW() WHERE id = ANY($1::uuid[]) RETURNING id',
        [ids]
      );
    } else if (action === 'unpublish') {
      result = await db.query(
        'UPDATE problems SET is_active = false, updated_at = NOW() WHERE id = ANY($1::uuid[]) RETURNING id',
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
    const { input, expected_output, is_sample, explanation, order_index } = req.body;
    const result = await db.query(`
      INSERT INTO test_cases (problem_id, input, expected_output, is_sample, explanation, order_index)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.params.id, input, expected_output, is_sample || false, explanation, order_index || 0]);

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
    const { input, expected_output, is_sample, explanation, order_index } = req.body;
    const result = await db.query(`
      UPDATE test_cases
      SET input = COALESCE($1, input),
          expected_output = COALESCE($2, expected_output),
          is_sample = COALESCE($3, is_sample),
          explanation = COALESCE($4, explanation),
          order_index = COALESCE($5, order_index)
      WHERE id = $6 RETURNING *
    `, [input, expected_output, is_sample, explanation, order_index, req.params.id]);

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
