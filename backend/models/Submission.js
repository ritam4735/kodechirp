// backend/models/Submission.js
// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: previously only contained `notImplemented`.
// Now implements the DB operations needed by submissionService.
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../db');

class Submission {
  /**
   * Persist a new submission record.
   */
  static async create({
    userId, problemId, language, code, status,
    runtimeMs = null, memoryKb = null,
    failedTestInput = null, failedTestExpected = null, failedTestActual = null,
    judge0Token = null,
  }) {
    const result = await db.query(
      `INSERT INTO submissions
         (user_id, problem_id, language, code, status,
          runtime_ms, memory_kb,
          failed_test_input, failed_test_expected, failed_test_actual,
          judge0_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        userId || null, problemId, language, code, status,
        runtimeMs, memoryKb,
        failedTestInput, failedTestExpected, failedTestActual,
        judge0Token,
      ]
    );
    return result.rows[0];
  }

  /**
   * Retrieve submissions for a given user, most recent first.
   */
  static async findByUser(userId, limit = 20) {
    const result = await db.query(
      `SELECT s.*, p.title AS problem_title, p.slug AS problem_slug
       FROM   submissions s
       JOIN   problems    p ON p.id = s.problem_id
       WHERE  s.user_id = $1
       ORDER  BY s.created_at DESC
       LIMIT  $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Retrieve all submissions for a problem (admin / leaderboard use).
   */
  static async findByProblem(problemId, limit = 50) {
    const result = await db.query(
      `SELECT * FROM submissions
       WHERE  problem_id = $1
       ORDER  BY created_at DESC
       LIMIT  $2`,
      [problemId, limit]
    );
    return result.rows;
  }
}

module.exports = Submission;
