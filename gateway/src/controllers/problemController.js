// gateway/src/controllers/problemController.js
// ─────────────────────────────────────────────────────────────────────────────
// Problem Controller — list and retrieve coding problems
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const jwt = require('jsonwebtoken');

function extractUserIdAndRole(req) {
  let userId = null;
  let isAdmin = false;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      userId = decoded.id;
      if (decoded.role === 'admin') isAdmin = true;
    } catch (e) {}
  }
  return { userId, isAdmin };
}

exports.getAllProblems = async (req, res, next) => {
  try {
    const { search, difficulty, topic, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const { userId } = extractUserIdAndRole(req);

    const params = [];
    let paramIndex = 1;

    let solvedSelect = ', FALSE AS is_solved';
    if (userId) {
      solvedSelect = `, EXISTS (SELECT 1 FROM submissions s WHERE s.problem_id = p.id AND s.user_id = $${paramIndex} AND s.status = 'Accepted') AS is_solved`;
      params.push(userId);
      paramIndex++;
    }

    let queryText = `
      SELECT p.id, p.slug, p.title, p.difficulty, p.acceptance_rate, p.tags,
             p.total_submissions, p.total_accepted, p.created_at, p.serial_number
             ${solvedSelect}
      FROM problems p
      WHERE p.status = 'Published'
    `;

    if (search && search.trim()) {
      queryText += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.slug ILIKE $${paramIndex} OR p.serial_number::text = $${paramIndex + 1})`;
      params.push(`%${search.trim()}%`, search.trim());
      paramIndex += 2;
    }

    if (difficulty) {
      queryText += ` AND p.difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    if (topic && topic.trim()) {
      queryText += ` AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.tags) elem WHERE elem ILIKE $${paramIndex})`;
      params.push(topic.trim());
      paramIndex++;
    }

    queryText += ` ORDER BY p.serial_number ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(queryText, params);

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) FROM problems WHERE status = 'Published'";
    const countParams = [];
    let countParamIndex = 1;

    if (search && search.trim()) {
      countQuery += ` AND (title ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex} OR slug ILIKE $${countParamIndex} OR serial_number::text = $${countParamIndex + 1})`;
      countParams.push(`%${search.trim()}%`, search.trim());
      countParamIndex += 2;
    }

    if (difficulty) {
      countQuery += ` AND difficulty = $${countParamIndex}`;
      countParams.push(difficulty);
      countParamIndex++;
    }

    if (topic && topic.trim()) {
      countQuery += ` AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(tags) elem WHERE elem ILIKE $${countParamIndex})`;
      countParams.push(topic.trim());
      countParamIndex++;
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

    // Get all available topics with problem counts across all published problems
    const topicsResult = await db.query(`
      SELECT 
        elem AS topic,
        COUNT(*)::int AS count
      FROM problems,
      LATERAL jsonb_array_elements_text(tags) elem
      WHERE status = 'Published'
      GROUP BY elem
      ORDER BY count DESC, topic ASC
    `);

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
      topics: topicsResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

exports.getProblem = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { userId, isAdmin } = extractUserIdAndRole(req);

    const query = isAdmin 
      ? `SELECT * FROM problems WHERE (slug = $1 OR id::text = $1 OR serial_number::text = $1)`
      : `SELECT * FROM problems WHERE (slug = $1 OR id::text = $1 OR serial_number::text = $1) AND status = 'Published'`;

    const problemResult = await db.query(query, [slug]);

    if (problemResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    const problem = problemResult.rows[0];

    // Check solved status if user is logged in
    if (userId) {
      const solvedCheck = await db.query(
        `SELECT 1 FROM submissions WHERE problem_id = $1 AND user_id = $2 AND status = 'Accepted' LIMIT 1`,
        [problem.id, userId]
      );
      problem.is_solved = solvedCheck.rows.length > 0;
    } else {
      problem.is_solved = false;
    }

    // Fetch previous and next published problems in permanent serial_number order
    const prevQuery = isAdmin
      ? `SELECT slug, title, serial_number, difficulty FROM problems WHERE serial_number < $1 ORDER BY serial_number DESC LIMIT 1`
      : `SELECT slug, title, serial_number, difficulty FROM problems WHERE status = 'Published' AND serial_number < $1 ORDER BY serial_number DESC LIMIT 1`;
    const nextQuery = isAdmin
      ? `SELECT slug, title, serial_number, difficulty FROM problems WHERE serial_number > $1 ORDER BY serial_number ASC LIMIT 1`
      : `SELECT slug, title, serial_number, difficulty FROM problems WHERE status = 'Published' AND serial_number > $1 ORDER BY serial_number ASC LIMIT 1`;

    const [prevResult, nextResult] = await Promise.all([
      db.query(prevQuery, [problem.serial_number]),
      db.query(nextQuery, [problem.serial_number]),
    ]);

    problem.prevProblem = prevResult.rows[0] || null;
    problem.nextProblem = nextResult.rows[0] || null;

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
