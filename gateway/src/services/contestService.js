// gateway/src/services/contestService.js
// ─────────────────────────────────────────────────────────────────────────────
// Contest management service
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');

/**
 * List contests with optional status filter.
 */
async function listContests({ status, limit = 20, offset = 0 } = {}) {
  let query = `
    SELECT c.*, COUNT(cp.user_id) AS participant_count
    FROM contests c
    LEFT JOIN contest_participants cp ON cp.contest_id = c.id
  `;
  const params = [];
  let paramIndex = 1;

  if (status) {
    query += ` WHERE c.status = $${paramIndex++}`;
    params.push(status);
  }

  query += ` GROUP BY c.id ORDER BY c.starts_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Get a single contest with its problems.
 */
async function getContest(contestId) {
  const contestResult = await db.query(
    'SELECT * FROM contests WHERE id = $1',
    [contestId]
  );

  if (contestResult.rows.length === 0) {
    const err = new Error('Contest not found');
    err.status = 404;
    throw err;
  }

  const contest = contestResult.rows[0];

  // Fetch problems
  const problemsResult = await db.query(
    `SELECT cp.order_index, cp.points,
            p.id, p.slug, p.title, p.difficulty
     FROM contest_problems cp
     JOIN problems p ON p.id = cp.problem_id
     WHERE cp.contest_id = $1
     ORDER BY cp.order_index ASC`,
    [contestId]
  );

  contest.problems = problemsResult.rows;

  return contest;
}

/**
 * Join a contest.
 */
async function joinContest(contestId, userId) {
  const contest = await getContest(contestId);

  if (contest.status !== 'upcoming' && contest.status !== 'active') {
    const err = new Error('Cannot join an ended contest');
    err.status = 400;
    throw err;
  }

  await db.query(
    `INSERT INTO contest_participants (contest_id, user_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [contestId, userId]
  );

  return { joined: true, contestId };
}

module.exports = {
  listContests,
  getContest,
  joinContest,
};
