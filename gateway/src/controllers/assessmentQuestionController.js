// gateway/src/controllers/assessmentQuestionController.js
// ─────────────────────────────────────────────────────────────────────────────
// Assessment Engine — Unified Question Bank Controller (Admin)
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../utils/logger');
const { normalizeOptions, normalizeCorrectAnswer, validateObjectiveQuestion } = require('../utils/helpers');
const { isSuperAdmin } = require('../middleware/rbac');

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

    const isSuper = isSuperAdmin(req.user);
    if (!isSuper) {
      if (req.organizationId) {
        params.push(req.organizationId);
        conditions.push(`(q.organization_id IS NULL OR q.organization_id = $${params.length})`);
      } else {
        conditions.push(`q.organization_id IS NULL`);
      }
    } else if (req.query.organization_id) {
      if (req.query.organization_id === 'global') {
        conditions.push(`q.organization_id IS NULL`);
      } else {
        params.push(req.query.organization_id);
        conditions.push(`q.organization_id = $${params.length}`);
      }
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
        q.organization_id,
        q.created_at,
        q.updated_at
      FROM assessment_questions q
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
    `;
    const dataRes = await db.query(dataSql, dataParams);

    // Normalize options and correct_answer defensively for API consumers
    const normalizedQuestions = dataRes.rows.map((q) => {
      const opts = normalizeOptions(q.options);
      return {
        ...q,
        options: opts,
        correct_answer: normalizeCorrectAnswer(q.correct_answer, opts),
      };
    });

    // Fetch distinct categories and topics for filter dropdowns
    const catsRes = await db.query(`SELECT DISTINCT category FROM assessment_questions ORDER BY category;`);
    const topicsRes = await db.query(`SELECT DISTINCT topic, category FROM assessment_questions ORDER BY category, topic;`);

    res.json({
      success: true,
      questions: normalizedQuestions,
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

    const q = result.rows[0];
    const isSuper = isSuperAdmin(req.user);
    if (!isSuper && q.organization_id && q.organization_id !== req.organizationId) {
      return res.status(403).json({ success: false, error: 'Access denied: question belongs to another organization' });
    }

    const opts = normalizeOptions(q.options);
    const normalizedQ = {
      ...q,
      options: opts,
      correct_answer: normalizeCorrectAnswer(q.correct_answer, opts),
    };

    res.json({ success: true, question: normalizedQ });
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

    const normalizedOpts = normalizeOptions(options);
    const normalizedAns = normalizeCorrectAnswer(correct_answer, normalizedOpts);

    const validationErr = validateObjectiveQuestion(question_type, normalizedOpts, normalizedAns);
    if (validationErr) {
      return res.status(400).json({ success: false, error: validationErr });
    }

    const isSuper = isSuperAdmin(req.user);
    const targetOrgId = isSuper ? (req.body.organization_id || null) : (req.organizationId || null);

    const insertSql = `
      INSERT INTO assessment_questions (
        category, topic, subtopic, difficulty, question_type,
        question_text, options, correct_answer, explanation,
        default_marks, default_negative_marks, tags,
        source_file, import_batch, content_hash, is_active, created_by, organization_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16, $17, $18
      ) RETURNING *;
    `;

    const result = await db.query(insertSql, [
      category.trim(),
      topic.trim(),
      subtopic ? subtopic.trim() : null,
      ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
      question_type,
      question_text.trim(),
      JSON.stringify(normalizedOpts),
      normalizedAns !== null ? JSON.stringify(normalizedAns) : null,
      explanation ? explanation.trim() : null,
      parseFloat(default_marks) || 1.0,
      parseFloat(default_negative_marks) || 0.0,
      JSON.stringify(tags),
      'manual_admin',
      'manual',
      contentHash,
      Boolean(is_active),
      req.user?.id || null,
      targetOrgId,
    ]);

    const created = result.rows[0];
    created.options = normalizeOptions(created.options);
    created.correct_answer = normalizeCorrectAnswer(created.correct_answer, created.options);

    res.status(201).json({ success: true, question: created });
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
    const isSuper = isSuperAdmin(req.user);
    if (!isSuper) {
      if (!current.organization_id) {
        return res.status(403).json({ success: false, error: 'Only super administrators can modify global questions' });
      }
      if (current.organization_id !== req.organizationId) {
        return res.status(403).json({ success: false, error: 'Cannot modify question belonging to another organization' });
      }
    }
    const newCategory = category !== undefined ? category.trim() : current.category;
    const newTopic = topic !== undefined ? topic.trim() : current.topic;
    const newText = question_text !== undefined ? question_text.trim() : current.question_text;
    const newType = question_type !== undefined ? question_type : current.question_type;
    const contentHash = generateHash(newCategory, newTopic, newText);

    // Normalize options & answer if provided
    let finalOpts = current.options;
    if (options !== undefined) {
      finalOpts = normalizeOptions(options);
    } else {
      finalOpts = normalizeOptions(finalOpts);
    }

    let finalAns = current.correct_answer;
    if (correct_answer !== undefined) {
      finalAns = normalizeCorrectAnswer(correct_answer, finalOpts);
    } else {
      finalAns = normalizeCorrectAnswer(finalAns, finalOpts);
    }

    const validationErr = validateObjectiveQuestion(newType, finalOpts, finalAns);
    if (validationErr) {
      return res.status(400).json({ success: false, error: validationErr });
    }

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
      newType,
      newText,
      JSON.stringify(finalOpts),
      finalAns !== null ? JSON.stringify(finalAns) : null,
      explanation !== undefined ? explanation : current.explanation,
      default_marks !== undefined ? parseFloat(default_marks) : current.default_marks,
      default_negative_marks !== undefined ? parseFloat(default_negative_marks) : current.default_negative_marks,
      tags !== undefined ? JSON.stringify(tags) : current.tags,
      is_active !== undefined ? Boolean(is_active) : current.is_active,
      contentHash,
      id,
    ]);

    const updated = result.rows[0];
    updated.options = normalizeOptions(updated.options);
    updated.correct_answer = normalizeCorrectAnswer(updated.correct_answer, updated.options);

    res.json({ success: true, question: updated });
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
    const existingRes = await db.query(`SELECT id, organization_id FROM assessment_questions WHERE id = $1;`, [id]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const current = existingRes.rows[0];
    const isSuper = isSuperAdmin(req.user);
    if (!isSuper) {
      if (!current.organization_id) {
        return res.status(403).json({ success: false, error: 'Only super administrators can modify global questions' });
      }
      if (current.organization_id !== req.organizationId) {
        return res.status(403).json({ success: false, error: 'Cannot modify question belonging to another organization' });
      }
    }

    const result = await db.query(
      `UPDATE assessment_questions SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, is_active;`,
      [id]
    );

    res.json({ success: true, question: result.rows[0] });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentQuestion] toggleStatus failed');
    res.status(500).json({ success: false, error: 'Failed to toggle question status' });
  }
}

/**
 * Delete a question safely: protects active assessment references and historical attempts.
 */
async function deleteQuestion(req, res) {
  try {
    const { id } = req.params;

    // Check if question is used in any assessment sections
    const refAssessRes = await db.query(
      `SELECT DISTINCT a.id, a.title, a.status 
       FROM assessment_section_questions asq
       JOIN assessment_sections s ON asq.section_id = s.id
       JOIN assessments a ON s.assessment_id = a.id
       WHERE asq.question_id = $1;`,
      [id]
    );

    if ((refAssessRes?.rowCount || refAssessRes?.rows?.length || 0) > 0) {
      const titles = (refAssessRes.rows || []).map(r => `"${r.title}"`).join(', ');
      return res.status(400).json({
        success: false,
        error: `Cannot delete question: it is currently referenced in assessment(s): ${titles}. Remove it from the assessment section(s) or toggle its status to Inactive instead.`
      });
    }

    // Check if question has student attempts/responses
    const respRes = await db.query(
      `SELECT count(*)::int AS count FROM assessment_responses WHERE question_id = $1;`,
      [id]
    );
    if (Number(respRes?.rows?.[0]?.count || 0) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete question: student attempt responses reference this record. Deactivate the question instead to preserve historical candidate records.'
      });
    }

    const isSuper = isSuperAdmin(req.user);
    if (!isSuper) {
      const existingRes = await db.query(`SELECT id, organization_id FROM assessment_questions WHERE id = $1;`, [id]);
      if (existingRes.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Question not found' });
      }

      const current = existingRes.rows[0];
      if (!current.organization_id) {
        return res.status(403).json({ success: false, error: 'Only super administrators can delete global questions' });
      }
      if (current.organization_id !== req.organizationId) {
        return res.status(403).json({ success: false, error: 'Cannot delete question belonging to another organization' });
      }
    }

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
 * Batch import questions from JSON or CSV with validation and audit logging.
 */
async function importQuestions(req, res) {
  try {
    let rawItems = [];
    let filename = 'manual_import.json';
    let fileFormat = 'json';

    if (req.file) {
      filename = req.file.originalname || 'upload.json';
      const fileExt = (filename.split('.').pop() || '').toLowerCase();
      fileFormat = fileExt;

      if (fileExt === 'json') {
        const text = req.file.buffer.toString('utf-8');
        try {
          const parsed = JSON.parse(text);
          rawItems = Array.isArray(parsed) ? parsed : (parsed.questions || []);
        } catch {
          return res.status(400).json({ success: false, error: 'Invalid JSON file format' });
        }
      } else if (fileExt === 'csv') {
        // Simple CSV parse
        const text = req.file.buffer.toString('utf-8');
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          return res.status(400).json({ success: false, error: 'CSV file contains no data rows' });
        }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          const item = {};
          headers.forEach((h, idx) => { item[h] = cols[idx] || ''; });
          // Format options from option_a, option_b, ...
          if (!item.options && (item.option_a || item.a)) {
            item.options = [
              { id: 'a', text: item.option_a || item.a },
              { id: 'b', text: item.option_b || item.b },
              { id: 'c', text: item.option_c || item.c },
              { id: 'd', text: item.option_d || item.d },
            ].filter(o => o.text);
          }
          rawItems.push(item);
        }
      } else {
        return res.status(400).json({ success: false, error: 'Unsupported file type. Please upload a .json or .csv file.' });
      }
    } else if (req.body.questions && Array.isArray(req.body.questions)) {
      rawItems = req.body.questions;
    } else {
      return res.status(400).json({ success: false, error: 'No file or questions array provided for import' });
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const errors = [];

    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      const category = (item.category || '').trim();
      const topic = (item.topic || '').trim();
      const questionText = (item.question_text || item.question || '').trim();
      const difficulty = ['Easy', 'Medium', 'Hard'].includes(item.difficulty) ? item.difficulty : 'Medium';
      const questionType = item.question_type || 'single_choice';

      if (!category || !topic || !questionText) {
        totalFailed++;
        errors.push({
          row: idx + 1,
          question: questionText.substring(0, 30) || 'Unknown',
          reason: 'Missing category, topic, or question text',
        });
        continue;
      }

      const normalizedOpts = normalizeOptions(item.options);
      const normalizedAns = normalizeCorrectAnswer(item.correct_answer || item.answer, normalizedOpts);

      const validationErr = validateObjectiveQuestion(questionType, normalizedOpts, normalizedAns);
      if (validationErr) {
        totalFailed++;
        errors.push({
          row: idx + 1,
          question: questionText.substring(0, 30),
          reason: validationErr,
        });
        continue;
      }

      const contentHash = generateHash(category, topic, questionText);

      // Check if duplicate
      const dup = await db.query(`SELECT id FROM assessment_questions WHERE content_hash = $1;`, [contentHash]);
      if (dup.rowCount > 0) {
        totalSkipped++;
        continue;
      }

      try {
        await db.query(
          `INSERT INTO assessment_questions (
            category, topic, subtopic, difficulty, question_type,
            question_text, options, correct_answer, explanation,
            default_marks, default_negative_marks, tags,
            source_file, import_batch, content_hash, is_active, created_by, organization_id
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12,
            $13, $14, $15, $16, $17, $18
          );`,
          [
            category,
            topic,
            item.subtopic ? item.subtopic.trim() : null,
            difficulty,
            questionType,
            questionText,
            JSON.stringify(normalizedOpts),
            normalizedAns !== null ? JSON.stringify(normalizedAns) : null,
            item.explanation ? item.explanation.trim() : null,
            parseFloat(item.default_marks || item.marks) || 1.0,
            parseFloat(item.default_negative_marks || item.negative_marks) || 0.0,
            JSON.stringify(Array.isArray(item.tags) ? item.tags : []),
            filename,
            batchId,
            contentHash,
            item.is_active !== undefined ? Boolean(item.is_active) : true,
            req.user?.id || null,
            isSuperAdmin(req.user) ? (req.body.organization_id || null) : (req.organizationId || null),
          ]
        );
        totalInserted++;
      } catch (err) {
        totalFailed++;
        errors.push({
          row: idx + 1,
          question: questionText.substring(0, 30),
          reason: err.message,
        });
      }
    }

    // Record batch log
    await db.query(
      `INSERT INTO import_batches (
        batch_id, source_file, file_format, total_discovered,
        total_inserted, total_skipped, total_failed, status, error_report
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [
        batchId,
        filename,
        fileFormat,
        rawItems.length,
        totalInserted,
        totalSkipped,
        totalFailed,
        totalFailed > 0 ? (totalInserted > 0 ? 'completed' : 'failed') : 'completed',
        JSON.stringify(errors),
      ]
    );

    res.json({
      success: true,
      batchId,
      totalDiscovered: rawItems.length,
      totalInserted,
      totalSkipped,
      totalFailed,
      errors,
    });
  } catch (err) {
    logger.error({ err }, '[AssessmentQuestion] importQuestions failed');
    res.status(500).json({ success: false, error: err.message || 'Import failed' });
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
  importQuestions,
  getBatches,
};
