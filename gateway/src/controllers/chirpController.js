// gateway/src/controllers/chirpController.js
const db = require('../config/database');

exports.getChirps = async (req, res, next) => {
  try {
    const { problem_id } = req.query;

    if (!problem_id) {
      return res.status(400).json({ success: false, error: 'problem_id is required' });
    }

    const result = await db.query(
      `SELECT c.id, c.content, c.code_snippet, c.approach_tag, c.upvote_count,
              c.created_at AS "createdAt", COALESCE(u.username, 'anonymous') AS author, u.avatar_url
       FROM chirps c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.problem_id = $1
       ORDER BY c.created_at DESC`,
      [problem_id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

exports.postChirp = async (req, res, next) => {
  try {
    const { problem_id, content, code_snippet, approach_tag } = req.body;
    const userId = req.user ? req.user.id : null;

    const result = await db.query(
      `INSERT INTO chirps (problem_id, user_id, content, code_snippet, approach_tag)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, content, code_snippet, approach_tag, upvote_count, created_at AS "createdAt"`,
      [problem_id, userId, content, code_snippet, approach_tag]
    );
    
    const chirp = result.rows[0];
    chirp.author = req.user ? req.user.username : 'anonymous';

    return res.status(201).json({ success: true, data: chirp });
  } catch (err) {
    next(err);
  }
};
