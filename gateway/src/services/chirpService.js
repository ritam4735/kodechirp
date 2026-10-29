// gateway/src/services/chirpService.js
// ─────────────────────────────────────────────────────────────────────────────
// Chirp Service — Core Community Learning & Peer Explanation Engine
// Handles threaded discussions, upvoting, problem associations, and moderation
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Fetch a feed of Chirps with optional filtering by problem, tag, parent, or search.
 */
async function getChirps(options = {}) {
  const {
    problem_id = null,
    sort = 'popular',
    tag = null,
    search = null,
    parent_id = 'top',
    page = 1,
    limit = 30,
    currentUserId = null,
  } = options;

  const conditions = [];
  const params = [];

  // Problem filter
  if (problem_id) {
    params.push(problem_id);
    conditions.push(`(c.problem_id::text = $${params.length} OR p.slug = $${params.length})`);
  }

  // Hierarchy filter (top-level vs replies)
  if (parent_id === 'top' || parent_id === null || parent_id === undefined) {
    conditions.push('c.parent_id IS NULL');
  } else if (parent_id !== 'all') {
    params.push(parent_id);
    conditions.push(`c.parent_id::text = $${params.length}`);
  }

  // Tag filter
  if (tag && tag.trim()) {
    params.push(tag.trim().toLowerCase());
    conditions.push(`LOWER(c.approach_tag) = $${params.length}`);
  }

  // Search filter across content, problem title, and approach tag
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    const sIdx = params.length;
    conditions.push(`(c.content ILIKE $${sIdx} OR p.title ILIKE $${sIdx} OR c.approach_tag ILIKE $${sIdx} OR u.username ILIKE $${sIdx})`);
  }

  // Auth user parameter for is_upvoted subquery
  params.push(currentUserId || null);
  const userParamIdx = params.length;

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Sorting
  let orderBy = 'c.upvote_count DESC, c.created_at DESC';
  if (sort === 'newest') {
    orderBy = 'c.created_at DESC';
  } else if (sort === 'oldest') {
    orderBy = 'c.created_at ASC';
  } else if (sort === 'replies') {
    orderBy = 'reply_count DESC, c.upvote_count DESC';
  }

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  params.push(parseInt(limit, 10), offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const query = `
    SELECT 
      c.id,
      c.parent_id,
      c.problem_id,
      c.user_id,
      c.content,
      c.code_snippet,
      c.approach_tag,
      c.upvote_count,
      c.created_at AS "createdAt",
      c.updated_at AS "updatedAt",
      COALESCE(u.display_name, u.username, 'Anonymous') AS "authorName",
      COALESCE(u.username, 'anonymous') AS author,
      u.avatar_url,
      u.role AS user_role,
      p.title AS problem_title,
      p.slug AS problem_slug,
      p.serial_number AS problem_serial_number,
      p.difficulty AS problem_difficulty,
      (SELECT COUNT(*)::int FROM chirps r WHERE r.parent_id = c.id) AS reply_count,
      CASE 
        WHEN $${userParamIdx}::uuid IS NOT NULL THEN
          EXISTS(SELECT 1 FROM chirp_upvotes cu WHERE cu.chirp_id = c.id AND cu.user_id = $${userParamIdx}::uuid)
        ELSE FALSE
      END AS is_upvoted
    FROM chirps c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN problems p ON c.problem_id = p.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const result = await db.query(query, params);

  // Total count for pagination
  const countParams = params.slice(0, userParamIdx - 1);
  const countWhere = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM chirps c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN problems p ON c.problem_id = p.id
    ${countWhere}
  `;
  const countRes = await db.query(countQuery, countParams);

  return {
    chirps: result.rows,
    total: countRes.rows[0]?.total || 0,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
}

/**
 * Fetch a single Chirp by ID with associated metadata and upvote state.
 */
async function getChirpById(chirpId, currentUserId = null) {
  const query = `
    SELECT 
      c.id,
      c.parent_id,
      c.problem_id,
      c.user_id,
      c.content,
      c.code_snippet,
      c.approach_tag,
      c.upvote_count,
      c.created_at AS "createdAt",
      c.updated_at AS "updatedAt",
      COALESCE(u.display_name, u.username, 'Anonymous') AS "authorName",
      COALESCE(u.username, 'anonymous') AS author,
      u.avatar_url,
      u.role AS user_role,
      p.title AS problem_title,
      p.slug AS problem_slug,
      p.serial_number AS problem_serial_number,
      p.difficulty AS problem_difficulty,
      (SELECT COUNT(*)::int FROM chirps r WHERE r.parent_id = c.id) AS reply_count,
      CASE 
        WHEN $2::uuid IS NOT NULL THEN
          EXISTS(SELECT 1 FROM chirp_upvotes cu WHERE cu.chirp_id = c.id AND cu.user_id = $2::uuid)
        ELSE FALSE
      END AS is_upvoted
    FROM chirps c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN problems p ON c.problem_id = p.id
    WHERE c.id = $1
  `;

  const result = await db.query(query, [chirpId, currentUserId || null]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

/**
 * Fetch all threaded replies to a Chirp ordered chronologically.
 */
async function getChirpReplies(chirpId, currentUserId = null) {
  const query = `
    SELECT 
      c.id,
      c.parent_id,
      c.problem_id,
      c.user_id,
      c.content,
      c.code_snippet,
      c.approach_tag,
      c.upvote_count,
      c.created_at AS "createdAt",
      c.updated_at AS "updatedAt",
      COALESCE(u.display_name, u.username, 'Anonymous') AS "authorName",
      COALESCE(u.username, 'anonymous') AS author,
      u.avatar_url,
      u.role AS user_role,
      CASE 
        WHEN $2::uuid IS NOT NULL THEN
          EXISTS(SELECT 1 FROM chirp_upvotes cu WHERE cu.chirp_id = c.id AND cu.user_id = $2::uuid)
        ELSE FALSE
      END AS is_upvoted
    FROM chirps c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.parent_id = $1
    ORDER BY c.created_at ASC
  `;

  const result = await db.query(query, [chirpId, currentUserId || null]);
  return result.rows;
}

/**
 * Create a new Chirp (top-level or threaded reply).
 */
async function createChirp(data, user) {
  const { problem_id, content, code_snippet, approach_tag, parent_id } = data;

  if (!content || !content.trim()) {
    const err = new Error('Chirp content cannot be empty');
    err.status = 400;
    throw err;
  }

  let finalProblemId = problem_id || null;

  // If this is a reply, verify parent chirp exists and inherit problem_id if not explicitly provided
  if (parent_id) {
    const parentRes = await db.query('SELECT id, problem_id FROM chirps WHERE id = $1', [parent_id]);
    if (parentRes.rows.length === 0) {
      const err = new Error('Parent chirp not found');
      err.status = 404;
      throw err;
    }
    if (!finalProblemId && parentRes.rows[0].problem_id) {
      finalProblemId = parentRes.rows[0].problem_id;
    }
  }

  // If problem_id is given, check that problem exists
  if (finalProblemId) {
    const probRes = await db.query('SELECT id FROM problems WHERE id::text = $1 OR slug = $1', [finalProblemId]);
    if (probRes.rows.length === 0) {
      const err = new Error('Associated problem not found');
      err.status = 404;
      throw err;
    }
    finalProblemId = probRes.rows[0].id;
  }

  const insertQuery = `
    INSERT INTO chirps (problem_id, user_id, content, code_snippet, approach_tag, parent_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `;

  const insertRes = await db.query(insertQuery, [
    finalProblemId,
    user.id,
    content.trim(),
    code_snippet && code_snippet.trim() ? code_snippet.trim() : null,
    approach_tag && approach_tag.trim() ? approach_tag.trim().toLowerCase() : null,
    parent_id || null,
  ]);

  const newId = insertRes.rows[0].id;
  logger.info({ chirpId: newId, userId: user.id, problemId: finalProblemId, parentId: parent_id }, '[Chirp] Chirp created');

  return getChirpById(newId, user.id);
}

/**
 * Update an existing Chirp. Only author or admin may update.
 */
async function updateChirp(chirpId, data, user) {
  const { content, code_snippet, approach_tag } = data;

  const existingRes = await db.query('SELECT * FROM chirps WHERE id = $1', [chirpId]);
  if (existingRes.rows.length === 0) {
    const err = new Error('Chirp not found');
    err.status = 404;
    throw err;
  }

  const chirp = existingRes.rows[0];

  // Authorization check: author or super_admin / admin
  const isAuthor = chirp.user_id === user.id;
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  if (!isAuthor && !isAdmin) {
    const err = new Error('You do not have permission to edit this chirp');
    err.status = 403;
    throw err;
  }

  if (content !== undefined && (!content || !content.trim())) {
    const err = new Error('Chirp content cannot be empty');
    err.status = 400;
    throw err;
  }

  const updatedContent = content !== undefined ? content.trim() : chirp.content;
  const updatedSnippet = code_snippet !== undefined ? (code_snippet && code_snippet.trim() ? code_snippet.trim() : null) : chirp.code_snippet;
  const updatedTag = approach_tag !== undefined ? (approach_tag && approach_tag.trim() ? approach_tag.trim().toLowerCase() : null) : chirp.approach_tag;

  await db.query(
    `UPDATE chirps 
     SET content = $1, code_snippet = $2, approach_tag = $3, updated_at = NOW()
     WHERE id = $4`,
    [updatedContent, updatedSnippet, updatedTag, chirpId]
  );

  logger.info({ chirpId, userId: user.id }, '[Chirp] Chirp updated');
  return getChirpById(chirpId, user.id);
}

/**
 * Delete a Chirp. Only author, admin, or moderator may delete.
 */
async function deleteChirp(chirpId, user) {
  const existingRes = await db.query('SELECT * FROM chirps WHERE id = $1', [chirpId]);
  if (existingRes.rows.length === 0) {
    const err = new Error('Chirp not found');
    err.status = 404;
    throw err;
  }

  const chirp = existingRes.rows[0];

  const isAuthor = chirp.user_id === user.id;
  const isAdminOrMod = user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator';

  if (!isAuthor && !isAdminOrMod) {
    const err = new Error('You do not have permission to delete this chirp');
    err.status = 403;
    throw err;
  }

  await db.query('DELETE FROM chirps WHERE id = $1', [chirpId]);
  logger.info({ chirpId, deletedBy: user.id }, '[Chirp] Chirp deleted');

  return { success: true, message: 'Chirp deleted successfully' };
}

/**
 * Toggle upvote for a Chirp. Atomic and prevents duplicate votes.
 */
async function toggleUpvote(chirpId, userId) {
  const chirpCheck = await db.query('SELECT id, upvote_count FROM chirps WHERE id = $1', [chirpId]);
  if (chirpCheck.rows.length === 0) {
    const err = new Error('Chirp not found');
    err.status = 404;
    throw err;
  }

  // Check if already upvoted
  const voteCheck = await db.query(
    'SELECT 1 FROM chirp_upvotes WHERE chirp_id = $1 AND user_id = $2',
    [chirpId, userId]
  );

  let upvoted = false;

  if (voteCheck.rows.length > 0) {
    // Remove upvote
    await db.query(
      'DELETE FROM chirp_upvotes WHERE chirp_id = $1 AND user_id = $2',
      [chirpId, userId]
    );
    upvoted = false;
  } else {
    // Add upvote
    await db.query(
      'INSERT INTO chirp_upvotes (chirp_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [chirpId, userId]
    );
    upvoted = true;
  }

  // Get current fresh count from database (trigger keeps it accurate)
  const freshRes = await db.query('SELECT upvote_count FROM chirps WHERE id = $1', [chirpId]);
  const upvote_count = freshRes.rows[0]?.upvote_count || 0;

  return {
    success: true,
    upvoted,
    upvote_count,
  };
}

/**
 * Get distinct popular approach tags with their usage count.
 */
async function getPopularTags() {
  const result = await db.query(`
    SELECT approach_tag, COUNT(*)::int AS count
    FROM chirps
    WHERE approach_tag IS NOT NULL AND approach_tag != ''
    GROUP BY approach_tag
    ORDER BY count DESC, approach_tag ASC
    LIMIT 20
  `);
  return result.rows;
}

module.exports = {
  getChirps,
  getChirpById,
  getChirpReplies,
  createChirp,
  updateChirp,
  deleteChirp,
  toggleUpvote,
  getPopularTags,
};
