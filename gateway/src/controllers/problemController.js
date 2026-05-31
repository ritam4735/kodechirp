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
      WHERE is_active = TRUE
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
    let countQuery = 'SELECT COUNT(*) FROM problems WHERE is_active = TRUE';
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

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getProblem = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const problemResult = await db.query(
      `SELECT * FROM problems WHERE (slug = $1 OR id::text = $1) AND is_active = TRUE`,
      [slug]
    );

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

    problem.testCases = testCasesResult.rows;

    return res.json({ success: true, data: problem });
  } catch (err) {
    next(err);
  }
};
