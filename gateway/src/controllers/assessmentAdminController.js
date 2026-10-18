// gateway/src/controllers/assessmentAdminController.js
// ─────────────────────────────────────────────────────────────────────────────
// Assessment Engine — Admin Assessment Builder Controller
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const logger = require('../utils/logger');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * List all assessments with counts and stats
 */
async function getAssessments(req, res) {
  try {
    const { status, category, search, limit = 50, offset = 0 } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`a.category = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(a.title ILIKE $${params.length} OR a.description ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT count(*)::int AS total FROM assessments a ${whereClause};`;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const dataParams = [...params, parsedLimit, parsedOffset];
    const dataSql = `
      SELECT
        a.*,
        COALESCE((SELECT count(*)::int FROM assessment_sections s WHERE s.assessment_id = a.id), 0) AS section_count,
        COALESCE((
          SELECT count(*)::int
          FROM assessment_section_questions sq
          JOIN assessment_sections s ON sq.section_id = s.id
          WHERE s.assessment_id = a.id
        ), 0) AS total_questions_count,
        COALESCE((SELECT count(*)::int FROM assessment_attempts att WHERE att.assessment_id = a.id), 0) AS attempt_count
      FROM assessments a
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
    `;

    const dataRes = await db.query(dataSql, dataParams);

    res.json({
      success: true,
      assessments: dataRes.rows,
      total,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (err) {
    logger.error({ err }, '[AssessmentAdmin] getAssessments failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve assessments' });
  }
}

/**
 * Get assessment details with all sections and mapped questions
 */
async function getAssessment(req, res) {
  try {
    const { id } = req.params;

    const assessRes = await db.query(`SELECT * FROM assessments WHERE id = $1;`, [id]);
    if (assessRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const assessment = assessRes.rows[0];

    // Get sections
    const sectionsRes = await db.query(
      `SELECT * FROM assessment_sections WHERE assessment_id = $1 ORDER BY section_order ASC, created_at ASC;`,
      [id]
    );
    const sections = sectionsRes.rows;

    // Get mapped questions for all sections
    for (const sec of sections) {
      const qRes = await db.query(
        `
        SELECT
          sq.id AS mapping_id,
          sq.order_index,
          sq.marks_override,
          sq.negative_marks_override,
          sq.question_id,
          sq.problem_id,
          -- Objective question fields
          q.category AS question_category,
          q.topic AS question_topic,
          q.difficulty AS question_difficulty,
          q.question_type,
          q.question_text,
          q.options,
          q.correct_answer,
          q.explanation,
          q.default_marks,
          q.default_negative_marks,
          -- DSA Coding problem fields
          p.title AS problem_title,
          p.slug AS problem_slug,
          p.difficulty AS problem_difficulty,
          p.description AS problem_description,
          p.tags AS problem_tags
        FROM assessment_section_questions sq
        LEFT JOIN assessment_questions q ON sq.question_id = q.id
        LEFT JOIN problems p ON sq.problem_id = p.id
        WHERE sq.section_id = $1
        ORDER BY sq.order_index ASC, sq.created_at ASC;
      `,
        [sec.id]
      );
      sec.questions = qRes.rows;
    }

    assessment.sections = sections;

    res.json({ success: true, assessment });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] getAssessment failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve assessment' });
  }
}

/**
 * Create a new assessment
 */
async function createAssessment(req, res) {
  try {
    const {
      title,
      slug,
      description,
      instructions,
      category = 'Placement',
      duration_minutes = 60,
      randomize_questions = false,
      randomize_options = false,
      default_negative_marking = true,
      show_results_immediately = true,
      show_answers_mode = 'after_submission',
      pass_percentage = 40.0,
      starts_at = null,
      ends_at = null,
      max_attempts = 1,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    let finalSlug = slug ? slugify(slug) : slugify(title);
    if (!finalSlug) finalSlug = `assessment-${Date.now()}`;

    // Ensure slug uniqueness
    const slugCheck = await db.query(`SELECT id FROM assessments WHERE slug = $1;`, [finalSlug]);
    if (slugCheck.rowCount > 0) {
      finalSlug = `${finalSlug}-${Math.floor(Math.random() * 1000)}`;
    }

    const insertSql = `
      INSERT INTO assessments (
        title, slug, description, instructions, category,
        duration_minutes, status, starts_at, ends_at, max_attempts,
        randomize_questions, randomize_options, default_negative_marking,
        show_results_immediately, show_answers_mode, pass_percentage, created_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, 'Draft', $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16
      ) RETURNING *;
    `;

    const result = await db.query(insertSql, [
      title.trim(),
      finalSlug,
      description || null,
      instructions || null,
      category.trim(),
      parseInt(duration_minutes, 10) || 60,
      starts_at ? new Date(starts_at) : null,
      ends_at ? new Date(ends_at) : null,
      parseInt(max_attempts, 10) || 1,
      Boolean(randomize_questions),
      Boolean(randomize_options),
      Boolean(default_negative_marking),
      Boolean(show_results_immediately),
      show_answers_mode,
      parseFloat(pass_percentage) || 40.0,
      req.user?.id || null,
    ]);

    res.status(201).json({ success: true, assessment: result.rows[0] });
  } catch (err) {
    logger.error({ err }, '[AssessmentAdmin] createAssessment failed');
    res.status(500).json({ success: false, error: 'Failed to create assessment' });
  }
}

/**
 * Update assessment details
 */
async function updateAssessment(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      description,
      instructions,
      category,
      duration_minutes,
      status,
      starts_at,
      ends_at,
      max_attempts,
      randomize_questions,
      randomize_options,
      default_negative_marking,
      show_results_immediately,
      show_answers_mode,
      pass_percentage,
    } = req.body;

    const existingRes = await db.query(`SELECT * FROM assessments WHERE id = $1;`, [id]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const current = existingRes.rows[0];

    let finalSlug = current.slug;
    if (slug && slug.trim() && slug !== current.slug) {
      finalSlug = slugify(slug);
      const slugCheck = await db.query(`SELECT id FROM assessments WHERE slug = $1 AND id != $2;`, [finalSlug, id]);
      if (slugCheck.rowCount > 0) {
        return res.status(409).json({ success: false, error: 'Slug is already in use by another assessment' });
      }
    }

    const updateSql = `
      UPDATE assessments
      SET
        title = $1,
        slug = $2,
        description = $3,
        instructions = $4,
        category = $5,
        duration_minutes = $6,
        status = $7,
        starts_at = $8,
        ends_at = $9,
        max_attempts = $10,
        randomize_questions = $11,
        randomize_options = $12,
        default_negative_marking = $13,
        show_results_immediately = $14,
        show_answers_mode = $15,
        pass_percentage = $16,
        updated_at = NOW()
      WHERE id = $17
      RETURNING *;
    `;

    const result = await db.query(updateSql, [
      title !== undefined ? title.trim() : current.title,
      finalSlug,
      description !== undefined ? description : current.description,
      instructions !== undefined ? instructions : current.instructions,
      category !== undefined ? category.trim() : current.category,
      duration_minutes !== undefined ? parseInt(duration_minutes, 10) : current.duration_minutes,
      status !== undefined ? status : current.status,
      starts_at !== undefined ? (starts_at ? new Date(starts_at) : null) : current.starts_at,
      ends_at !== undefined ? (ends_at ? new Date(ends_at) : null) : current.ends_at,
      max_attempts !== undefined ? parseInt(max_attempts, 10) : current.max_attempts,
      randomize_questions !== undefined ? Boolean(randomize_questions) : current.randomize_questions,
      randomize_options !== undefined ? Boolean(randomize_options) : current.randomize_options,
      default_negative_marking !== undefined ? Boolean(default_negative_marking) : current.default_negative_marking,
      show_results_immediately !== undefined ? Boolean(show_results_immediately) : current.show_results_immediately,
      show_answers_mode !== undefined ? show_answers_mode : current.show_answers_mode,
      pass_percentage !== undefined ? parseFloat(pass_percentage) : current.pass_percentage,
      id,
    ]);

    res.json({ success: true, assessment: result.rows[0] });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] updateAssessment failed');
    res.status(500).json({ success: false, error: 'Failed to update assessment' });
  }
}

/**
 * Toggle assessment publication status (Draft, Published, Archived)
 */
async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Draft', 'Published', 'Archived'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    if (status === 'Published') {
      // Validate assessment before publishing: must have >= 1 section and >= 1 question
      const checkRes = await db.query(
        `
        SELECT
          (SELECT count(*)::int FROM assessment_sections WHERE assessment_id = $1) AS section_count,
          (
            SELECT count(*)::int
            FROM assessment_section_questions sq
            JOIN assessment_sections s ON sq.section_id = s.id
            WHERE s.assessment_id = $1
          ) AS question_count;
      `,
        [id]
      );

      const { section_count, question_count } = checkRes.rows[0] || {};
      if (section_count === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot publish an assessment with zero sections',
        });
      }
      if (question_count === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot publish an assessment with zero questions. Add questions first.',
        });
      }
    }

    // Recalculate total marks
    await recalculateAssessmentTotal(id);

    const result = await db.query(
      `UPDATE assessments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`,
      [status, id]
    );

    res.json({ success: true, assessment: result.rows[0] });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] toggleStatus failed');
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
}

/**
 * Delete assessment
 */
async function deleteAssessment(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(`DELETE FROM assessments WHERE id = $1 RETURNING id;`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    res.json({ success: true, message: 'Assessment deleted successfully' });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] deleteAssessment failed');
    res.status(500).json({ success: false, error: 'Failed to delete assessment' });
  }
}

/**
 * Helper to recalculate assessment total marks and question counts
 */
async function recalculateAssessmentTotal(assessmentId) {
  // Update per-section totals
  await db.query(`
    UPDATE assessment_sections s
    SET
      total_questions = COALESCE((
        SELECT count(*)::int FROM assessment_section_questions sq WHERE sq.section_id = s.id
      ), 0),
      total_marks = COALESCE((
        SELECT SUM(
          COALESCE(
            sq.marks_override,
            s.marks_per_question,
            q.default_marks,
            1.00
          )
        )
        FROM assessment_section_questions sq
        LEFT JOIN assessment_questions q ON sq.question_id = q.id
        WHERE sq.section_id = s.id
      ), 0.00)
    WHERE s.assessment_id = $1;
  `, [assessmentId]);

  // Update assessment total marks
  await db.query(`
    UPDATE assessments
    SET
      total_marks = COALESCE((
        SELECT SUM(total_marks) FROM assessment_sections WHERE assessment_id = $1
      ), 0.00),
      updated_at = NOW()
    WHERE id = $1;
  `, [assessmentId]);
}

/**
 * Section Management
 */
async function createSection(req, res) {
  try {
    const { id: assessmentId } = req.params;
    const {
      title,
      description,
      instructions,
      section_order = 0,
      section_type = 'objective',
      duration_minutes = null,
      marks_per_question = 1.0,
      negative_marks_per_question = 0.0,
      selection_mode = 'manual',
      selection_rules = {},
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Section title is required' });
    }

    const insertSql = `
      INSERT INTO assessment_sections (
        assessment_id, title, description, instructions, section_order,
        section_type, duration_minutes, marks_per_question, negative_marks_per_question,
        selection_mode, selection_rules
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11
      ) RETURNING *;
    `;

    const result = await db.query(insertSql, [
      assessmentId,
      title.trim(),
      description || null,
      instructions || null,
      parseInt(section_order, 10) || 0,
      ['objective', 'coding', 'mixed'].includes(section_type) ? section_type : 'objective',
      duration_minutes ? parseInt(duration_minutes, 10) : null,
      parseFloat(marks_per_question) || 1.0,
      parseFloat(negative_marks_per_question) || 0.0,
      selection_mode || 'manual',
      JSON.stringify(selection_rules || {}),
    ]);

    await recalculateAssessmentTotal(assessmentId);

    res.status(201).json({ success: true, section: result.rows[0] });
  } catch (err) {
    logger.error({ err, assessmentId: req.params.id }, '[AssessmentAdmin] createSection failed');
    res.status(500).json({ success: false, error: 'Failed to create section' });
  }
}

async function updateSection(req, res) {
  try {
    const { sectionId } = req.params;
    const {
      title,
      description,
      instructions,
      section_order,
      section_type,
      duration_minutes,
      marks_per_question,
      negative_marks_per_question,
      selection_mode,
      selection_rules,
    } = req.body;

    const existingRes = await db.query(`SELECT * FROM assessment_sections WHERE id = $1;`, [sectionId]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    const current = existingRes.rows[0];

    const updateSql = `
      UPDATE assessment_sections
      SET
        title = $1,
        description = $2,
        instructions = $3,
        section_order = $4,
        section_type = $5,
        duration_minutes = $6,
        marks_per_question = $7,
        negative_marks_per_question = $8,
        selection_mode = $9,
        selection_rules = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *;
    `;

    const result = await db.query(updateSql, [
      title !== undefined ? title.trim() : current.title,
      description !== undefined ? description : current.description,
      instructions !== undefined ? instructions : current.instructions,
      section_order !== undefined ? parseInt(section_order, 10) : current.section_order,
      section_type !== undefined ? section_type : current.section_type,
      duration_minutes !== undefined ? (duration_minutes ? parseInt(duration_minutes, 10) : null) : current.duration_minutes,
      marks_per_question !== undefined ? parseFloat(marks_per_question) : current.marks_per_question,
      negative_marks_per_question !== undefined ? parseFloat(negative_marks_per_question) : current.negative_marks_per_question,
      selection_mode !== undefined ? selection_mode : current.selection_mode,
      selection_rules !== undefined ? JSON.stringify(selection_rules) : current.selection_rules,
      sectionId,
    ]);

    await recalculateAssessmentTotal(current.assessment_id);

    res.json({ success: true, section: result.rows[0] });
  } catch (err) {
    logger.error({ err, sectionId: req.params.sectionId }, '[AssessmentAdmin] updateSection failed');
    res.status(500).json({ success: false, error: 'Failed to update section' });
  }
}

async function deleteSection(req, res) {
  try {
    const { sectionId } = req.params;
    const secRes = await db.query(`DELETE FROM assessment_sections WHERE id = $1 RETURNING assessment_id;`, [sectionId]);
    if (secRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    await recalculateAssessmentTotal(secRes.rows[0].assessment_id);
    res.json({ success: true, message: 'Section deleted successfully' });
  } catch (err) {
    logger.error({ err, sectionId: req.params.sectionId }, '[AssessmentAdmin] deleteSection failed');
    res.status(500).json({ success: false, error: 'Failed to delete section' });
  }
}

/**
 * Add a question or coding problem to section
 */
async function addQuestionToSection(req, res) {
  try {
    const { sectionId } = req.params;
    const { question_id, problem_id, marks_override, negative_marks_override } = req.body;

    if (!question_id && !problem_id) {
      return res.status(400).json({ success: false, error: 'Either question_id or problem_id must be provided' });
    }

    const secRes = await db.query(`SELECT assessment_id FROM assessment_sections WHERE id = $1;`, [sectionId]);
    if (secRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    const assessmentId = secRes.rows[0].assessment_id;

    // Check duplicate mapping
    if (question_id) {
      const dup = await db.query(
        `SELECT id FROM assessment_section_questions WHERE section_id = $1 AND question_id = $2;`,
        [sectionId, question_id]
      );
      if (dup.rowCount > 0) {
        return res.status(409).json({ success: false, error: 'Question is already added to this section' });
      }
    } else {
      const dup = await db.query(
        `SELECT id FROM assessment_section_questions WHERE section_id = $1 AND problem_id = $2;`,
        [sectionId, problem_id]
      );
      if (dup.rowCount > 0) {
        return res.status(409).json({ success: false, error: 'Coding problem is already added to this section' });
      }
    }

    // Get max order index
    const orderRes = await db.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM assessment_section_questions WHERE section_id = $1;`,
      [sectionId]
    );
    const orderIndex = orderRes.rows[0].next_order;

    const insertSql = `
      INSERT INTO assessment_section_questions (
        section_id, question_id, problem_id, order_index, marks_override, negative_marks_override
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const result = await db.query(insertSql, [
      sectionId,
      question_id || null,
      problem_id || null,
      orderIndex,
      marks_override !== undefined ? parseFloat(marks_override) : null,
      negative_marks_override !== undefined ? parseFloat(negative_marks_override) : null,
    ]);

    await recalculateAssessmentTotal(assessmentId);

    res.status(201).json({ success: true, mapping: result.rows[0] });
  } catch (err) {
    logger.error({ err, sectionId: req.params.sectionId }, '[AssessmentAdmin] addQuestionToSection failed');
    res.status(500).json({ success: false, error: 'Failed to add question to section' });
  }
}

/**
 * Remove question or problem from section
 */
async function removeQuestionFromSection(req, res) {
  try {
    const { mappingId } = req.params;
    const mapRes = await db.query(
      `DELETE FROM assessment_section_questions WHERE id = $1 RETURNING section_id;`,
      [mappingId]
    );
    if (mapRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Question mapping not found' });
    }

    const secRes = await db.query(`SELECT assessment_id FROM assessment_sections WHERE id = $1;`, [mapRes.rows[0].section_id]);
    if (secRes.rowCount > 0) {
      await recalculateAssessmentTotal(secRes.rows[0].assessment_id);
    }

    res.json({ success: true, message: 'Question removed from section' });
  } catch (err) {
    logger.error({ err, mappingId: req.params.mappingId }, '[AssessmentAdmin] removeQuestionFromSection failed');
    res.status(500).json({ success: false, error: 'Failed to remove question' });
  }
}

/**
 * Random question selection based on rules: category, topic, difficulty, count
 */
async function populateRandomQuestions(req, res) {
  try {
    const { sectionId } = req.params;
    const { category, topic, difficulty, count = 10, marks_override, negative_marks_override } = req.body;

    const reqCount = Math.max(parseInt(count, 10) || 10, 1);

    const secRes = await db.query(`SELECT * FROM assessment_sections WHERE id = $1;`, [sectionId]);
    if (secRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    const section = secRes.rows[0];

    // Build conditions for random candidate pool
    const conditions = ['q.is_active = TRUE'];
    const params = [sectionId];

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

    // Exclude questions already in this section
    conditions.push(`q.id NOT IN (SELECT question_id FROM assessment_section_questions WHERE section_id = $1 AND question_id IS NOT NULL)`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Check count of available matching questions
    const availRes = await db.query(`SELECT count(*)::int AS count FROM assessment_questions q ${whereClause};`, params);
    const available = availRes.rows[0]?.count || 0;

    if (available < reqCount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient eligible questions available (${available} available, ${reqCount} requested). Please adjust rules or question count.`,
        available,
        requested: reqCount,
      });
    }

    // Select random questions using RANDOM()
    const selectSql = `
      SELECT q.id
      FROM assessment_questions q
      ${whereClause}
      ORDER BY RANDOM()
      LIMIT ${reqCount};
    `;
    const selectedRes = await db.query(selectSql, params);

    // Get current max order index
    const orderRes = await db.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM assessment_section_questions WHERE section_id = $1;`,
      [sectionId]
    );
    let orderIndex = orderRes.rows[0].next_order;

    let added = 0;
    for (const row of selectedRes.rows) {
      await db.query(
        `
        INSERT INTO assessment_section_questions (
          section_id, question_id, order_index, marks_override, negative_marks_override
        ) VALUES ($1, $2, $3, $4, $5);
      `,
        [
          sectionId,
          row.id,
          orderIndex++,
          marks_override !== undefined ? parseFloat(marks_override) : null,
          negative_marks_override !== undefined ? parseFloat(negative_marks_override) : null,
        ]
      );
      added++;
    }

    // Update section selection rules metadata
    await db.query(
      `UPDATE assessment_sections SET selection_mode = 'random', selection_rules = $1 WHERE id = $2;`,
      [JSON.stringify({ category, topic, difficulty, count: reqCount }), sectionId]
    );

    await recalculateAssessmentTotal(section.assessment_id);

    res.json({
      success: true,
      message: `Successfully populated ${added} random questions into section`,
      added,
    });
  } catch (err) {
    logger.error({ err, sectionId: req.params.sectionId }, '[AssessmentAdmin] populateRandomQuestions failed');
    res.status(500).json({ success: false, error: 'Failed to populate random questions' });
  }
}

/**
 * Get all candidate attempts for an assessment
 */
async function getAssessmentAttempts(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `
      SELECT
        att.*,
        u.username,
        u.email,
        u.display_name
      FROM assessment_attempts att
      JOIN users u ON att.user_id = u.id
      WHERE att.assessment_id = $1
      ORDER BY att.created_at DESC;
    `,
      [id]
    );

    res.json({ success: true, attempts: result.rows });
  } catch (err) {
    logger.error({ err, id: req.params.id }, '[AssessmentAdmin] getAssessmentAttempts failed');
    res.status(500).json({ success: false, error: 'Failed to retrieve assessment attempts' });
  }
}

module.exports = {
  getAssessments,
  getAssessment,
  createAssessment,
  updateAssessment,
  toggleStatus,
  deleteAssessment,
  createSection,
  updateSection,
  deleteSection,
  addQuestionToSection,
  removeQuestionFromSection,
  populateRandomQuestions,
  getAssessmentAttempts,
};
