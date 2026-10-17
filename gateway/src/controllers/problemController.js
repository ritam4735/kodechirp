// gateway/src/controllers/problemController.js
// ─────────────────────────────────────────────────────────────────────────────
// Problem Controller — list and retrieve coding problems
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');

exports.getAllProblems = async (req, res, next) => {
  try {
    const { search, difficulty, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT id, slug, title, difficulty, acceptance_rate,
             total_submissions, total_accepted, created_at
      FROM problems
      WHERE status = 'Published'
    `;
    const params = [];
    let paramIndex = 1;

    if (search && search.trim()) {
      queryText += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (difficulty) {
      queryText += ` AND difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    queryText += ` ORDER BY created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(queryText, params);

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) FROM problems WHERE status = 'Published'";
    const countParams = [];
    let countParamIndex = 1;

    if (search && search.trim()) {
      countQuery += ` AND (title ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`;
      countParams.push(`%${search.trim()}%`);
      countParamIndex++;
    }

    if (difficulty) {
      countQuery += ` AND difficulty = $${countParamIndex}`;
      countParams.push(difficulty);
    }

    const countResult = await db.query(countQuery, countParams);

    // Get catalog counts across all published problems
    const countsResult = await db.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE difficulty = 'Easy')::int AS easy,
        COUNT(*) FILTER (WHERE difficulty = 'Medium')::int AS medium,
        COUNT(*) FILTER (WHERE difficulty = 'Hard')::int AS hard
      FROM problems
      WHERE status = 'Published'
    `);
    const catalogCounts = countsResult.rows[0] || { total: 0, easy: 0, medium: 0, hard: 0 };

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
      },
      counts: {
        total: parseInt(catalogCounts.total || 0),
        Easy: parseInt(catalogCounts.easy || 0),
        Medium: parseInt(catalogCounts.medium || 0),
        Hard: parseInt(catalogCounts.hard || 0),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getProblem = async (req, res, next) => {
  try {
    const { slug } = req.params;

    let isAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        if (decoded.role === 'admin') isAdmin = true;
      } catch (e) {}
    }

    const query = isAdmin 
      ? `SELECT * FROM problems WHERE (slug = $1 OR id::text = $1)`
      : `SELECT * FROM problems WHERE (slug = $1 OR id::text = $1) AND status = 'Published'`;

    const problemResult = await db.query(query, [slug]);

    if (problemResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    const problem = problemResult.rows[0];

    // Fetch sample test cases only
    const testCasesResult = await db.query(
      `SELECT id, input, expected_output, explanation, order_index
       FROM test_cases
       WHERE problem_id = $1 AND is_sample = TRUE
       ORDER BY order_index ASC`,
      [problem.id]
    );

    // Fetch problem templates
    const templatesResult = await db.query(
      `SELECT language, starter_code
       FROM problem_templates
       WHERE problem_id = $1`,
      [problem.id]
    );

    problem.testCases = testCasesResult.rows;
    problem.templates = templatesResult.rows.reduce((acc, row) => {
      acc[row.language] = row.starter_code;
      return acc;
    }, {});

    return res.json({ success: true, data: problem });
  } catch (err) {
    next(err);
  }
};
