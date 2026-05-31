// gateway/src/services/leaderboardService.js
// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard & contest ranking service
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');

/**
 * Get global leaderboard (top users by accepted submissions).
 */
async function getGlobalLeaderboard({ limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT u.id, u.username, u.avatar_url, u.rating,
            COUNT(DISTINCT s.problem_id) FILTER (WHERE s.status = 'Accepted') AS problems_solved,
            COUNT(s.id) AS total_submissions
     FROM users u
     LEFT JOIN submissions s ON s.user_id = u.id
     WHERE u.is_active = TRUE
     GROUP BY u.id
     HAVING COUNT(DISTINCT s.problem_id) FILTER (WHERE s.status = 'Accepted') > 0
     ORDER BY problems_solved DESC, u.rating DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

/**
 * Get contest leaderboard.
 */
async function getContestLeaderboard(contestId, { limit = 100 } = {}) {
  const result = await db.query(
    `SELECT cp.user_id, u.username, u.avatar_url,
            cp.score, cp.penalty_time, cp.rank
     FROM contest_participants cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.contest_id = $1
     ORDER BY cp.score DESC, cp.penalty_time ASC
     LIMIT $2`,
    [contestId, limit]
  );

  return result.rows;
}

module.exports = {
  getGlobalLeaderboard,
  getContestLeaderboard,
};
