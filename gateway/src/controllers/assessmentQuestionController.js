// gateway/src/controllers/assessmentQuestionController.js
// ─────────────────────────────────────────────────────────────────────────────
// Assessment Engine — Unified Question Bank Controller (Admin)
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../utils/logger');

function generateHash(category, topic, text) {
  const normalized = `${(category || '').trim().toLowerCase()}:${(topic || '').trim().toLowerCase()}:${(text || '').replace(/\s+/g, ' ').trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * List questions with search, filters, and pagination
 */
async function getQuestions(req, res) {
  try {
    const {
      search,
      category,
      topic,
      difficulty,
      question_type,
      is_active,
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(q.question_text ILIKE $${params.length} OR q.topic ILIKE $${params.length} OR q.category ILIKE $${params.length})`);
    }

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`q.category = $${params.length}`);
    }

    if (topic && topic !== 'all') {
      params.push(topic);
      conditions.push(`q.topic = $${params.length}`);
    }

    if (difficulty && difficulty !== 'all') {
      params.push(difficulty);
      conditions.push(`q.difficulty = $${params.length}`);
    }

    if (question_type && question_type !== 'all') {
      params.push(question_type);
      conditions.push(`q.question_type = $${params.length}`);
    }

    if (is_active !== undefined && is_active !== 'all') {
      params.push(is_active === 'true' || is_active === true);
      conditions.push(`q.is_active = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const validSortCols = ['created_at', 'updated_at', 'category', 'topic', 'difficulty', 'default_marks'];
    const sortCol = validSortCols.includes(sortBy) ? `q.${sortBy}` : 'q.created_at';
    const sortDir = (sortOrder || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count queries
    const countSql = `SELECT count(*)::int AS total FROM assessment_questions q ${whereClause};`;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    // Total questions without filter
    const totalAllRes = await db.query(`SELECT count(*)::int AS total_all FROM assessment_questions;`);
    const totalAll = totalAllRes.rows[0]?.total_all || 0;

    // Data query
    const dataParams = [...params, parsedLimit, parsedOffset];
    const dataSql = `
      SELECT
        q.id,
        q.category,
        q.topic,
        q.subtopic,
        q.difficulty,
        q.question_type,
        q.question_text,
        q.options,
        q.correct_answer,
        q.explanation,
        q.default_marks,
        q.default_negative_marks,
        q.tags,
        q.source_file,
        q.import_batch,
        q.is_active,
        q.created_at,
        q.updated_at
      FROM assessment_questions q
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
    `;
    const dataRes = await db.query(dataSql, dataParams);

    // Fetch distinct categories and topics for filter dropdowns
    const catsRes = await db.query(`SELECT DISTINCT category FROM assessment_questions ORDER BY category;`);
    const topicsRes = await db.query(`SELECT DISTINCT topic, category FROM assessment_questions ORDER BY category, topic;`);

    res.json({
      success: true,
      questions: dataRes.rows,
      total,
      totalAll,
      limit: parsedLimit,
      offset: parsedOffset,
      categories: catsRes.rows.map(r => r.category),
      topics: topicsRes.rows,
    });
  } catch (err) {
    logger.error({ err }, '[AssessmentQuestion] getQuestions failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve questions' });
  }
}

/**
 * Get question by ID
 */
async function getQuestion(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT * FROM assessment_questions WHERE id = $1;`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    res.json({ success: true, question: result.rows[0] });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentQuestion] getQuestion failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve question' });
  }
}

/**
 * Create a new question manually
 */
async function createQuestion(req, res) {
  try {
    const {
      category,
      topic,
      subtopic,
      difficulty = 'Medium',
      question_type = 'single_choice',
      question_text,
      options = [],
      correct_answer = null,
      explanation = null,
      default_marks = 1.0,
      default_negative_marks = 0.0,
      tags = [],
      is_active = true,
    } = req.body;

    if (!category || !topic || !question_text) {
      return res.status(400).json({
        success: false,
        error: 'Category, topic, and question text are required',
      });
    }

    const contentHash = generateHash(category, topic, question_text);

    // Check duplicate
    const checkRes = await db.query(
      `SELECT id FROM assessment_questions WHERE content_hash = $1 LIMIT 1;`,
      [contentHash]
    );
    if (checkRes.rowCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'A question with identical content already exists',
      });
    }

    const insertSql = `
      INSERT INTO assessment_questions (
        category, topic, subtopic, difficulty, question_type,
        question_text, options, correct_answer, explanation,
        default_marks, default_negative_marks, tags,
        source_file, import_batch, content_hash, is_active, created_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16, $17
      ) RETURNING *;
    `;

    const result = await db.query(insertSql, [
      category.trim(),
      topic.trim(),
      subtopic ? subtopic.trim() : null,
      ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
      question_type,
      question_text.trim(),
      JSON.stringify(options),
      correct_answer !== undefined && correct_answer !== null ? JSON.stringify(correct_answer) : null,
      explanation ? explanation.trim() : null,
      parseFloat(default_marks) || 1.0,
      parseFloat(default_negative_marks) || 0.0,
      JSON.stringify(tags),
      'manual_admin',
      'manual',
      contentHash,
      Boolean(is_active),
      req.user?.id || null,
    ]);

    res.status(201).json({ success: true, question: result.rows[0] });
  } catch (err) {
    logger.error({ err }, '[AssessmentQuestion] createQuestion failed');
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
}

/**
 * Update an existing question
 */
async function updateQuestion(req, res) {
  try {
    const { id } = req.params;
    const {
      category,
      topic,
      subtopic,
      difficulty,
      question_type,
      question_text,
      options,
      correct_answer,
      explanation,
      default_marks,
      default_negative_marks,
      tags,
      is_active,
    } = req.body;

    const existingRes = await db.query(`SELECT * FROM assessment_questions WHERE id = $1;`, [id]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const current = existingRes.rows[0];
    const newCategory = category !== undefined ? category.trim() : current.category;
    const newTopic = topic !== undefined ? topic.trim() : current.topic;
    const newText = question_text !== undefined ? question_text.trim() : current.question_text;
    const contentHash = generateHash(newCategory, newTopic, newText);

    const updateSql = `
      UPDATE assessment_questions
      SET
        category = $1,
        topic = $2,
        subtopic = $3,
        difficulty = $4,
        question_type = $5,
        question_text = $6,
        options = $7,
        correct_answer = $8,
        explanation = $9,
        default_marks = $10,
        default_negative_marks = $11,
        tags = $12,
        is_active = $13,
        content_hash = $14,
        updated_at = NOW()
      WHERE id = $15
      RETURNING *;
    `;

    const result = await db.query(updateSql, [
      newCategory,
      newTopic,
      subtopic !== undefined ? subtopic : current.subtopic,
      difficulty !== undefined ? difficulty : current.difficulty,
      question_type !== undefined ? question_type : current.question_type,
      newText,
      options !== undefined ? JSON.stringify(options) : current.options,
      correct_answer !== undefined ? (correct_answer !== null ? JSON.stringify(correct_answer) : null) : current.correct_answer,
      explanation !== undefined ? explanation : current.explanation,
      default_marks !== undefined ? parseFloat(default_marks) : current.default_marks,
      default_negative_marks !== undefined ? parseFloat(default_negative_marks) : current.default_negative_marks,
      tags !== undefined ? JSON.stringify(tags) : current.tags,
      is_active !== undefined ? Boolean(is_active) : current.is_active,
      contentHash,
      id,
    ]);

    res.json({ success: true, question: result.rows[0] });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentQuestion] updateQuestion failed');
    res.status(500).json({ success: false, error: 'Failed to update question' });
  }
}

/**
 * Toggle question active status
 */
async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE assessment_questions SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, is_active;`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    res.json({ success: true, question: result.rows[0] });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentQuestion] toggleStatus failed');
    res.status(500).json({ success: false, error: 'Failed to toggle question status' });
  }
}

/**
 * Delete a question
 */
async function deleteQuestion(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(`DELETE FROM assessment_questions WHERE id = $1 RETURNING id;`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentQuestion] deleteQuestion failed');
    res.status(500).json({ success: false, error: 'Failed to delete question' });
  }
}

/**
 * Get import batches history
 */
async function getBatches(req, res) {
  try {
    const result = await db.query(`
      SELECT * FROM import_batches
      ORDER BY created_at DESC
      LIMIT 50;
    `);
    res.json({ success: true, batches: result.rows });
  } catch (err) {
    logger.error({ err }, '[AssessmentQuestion] getBatches failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve import batches' });
  }
}

module.exports = {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  toggleStatus,
  deleteQuestion,
  getBatches,
};
