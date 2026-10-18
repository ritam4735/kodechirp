// gateway/src/scripts/seed_demo_assessment.js
const { execSync } = require('child_process');

function psqlRaw(query) {
  return execSync(`docker exec -i kodechirp-postgres psql -U kodechirp -d kodechirp -t -A -q -c "${query.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8',
  }).trim();
}

function psql(query) {
  const lines = psqlRaw(query).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('INSERT') && !l.startsWith('UPDATE') && !l.startsWith('DELETE'));
  return lines.length > 0 ? lines[0] : '';
}

function psqlAll(query) {
  return psqlRaw(query).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('INSERT') && !l.startsWith('UPDATE') && !l.startsWith('DELETE'));
}

async function main() {
  console.log('Seeding Placement Qualifier Assessment...');

  // 1. Create or get assessment
  const existingId = psql(`SELECT id FROM assessments WHERE slug = 'national-placement-qualifier-2026';`);
  let assessmentId = existingId;

  if (!assessmentId) {
    assessmentId = psql(`
      INSERT INTO assessments (
        title, slug, description, instructions, category, duration_minutes,
        status, max_attempts, randomize_questions, show_results_immediately,
        show_answers_mode, pass_percentage
      ) VALUES (
        'TCS / Infosys National Placement Qualifier 2026',
        'national-placement-qualifier-2026',
        'Comprehensive assessment covering Quantitative Aptitude, Logical Reasoning, and DSA Coding problem solving.',
        '1. The test contains 3 sections.\\n2. Total time allowed: 60 minutes.\\n3. Negative marking is applied for incorrect answers.\\n4. Code solutions are evaluated automatically against test cases.',
        'Placement',
        60,
        'Published',
        2,
        false,
        true,
        'after_submission',
        40.0
      ) RETURNING id;
    `);
    console.log('Created assessment:', assessmentId);
  } else {
    console.log('Assessment already exists:', assessmentId);
  }

  // 2. Clear old sections for idempotency
  psql(`DELETE FROM assessment_sections WHERE assessment_id = '${assessmentId}';`);

  // 3. Section 1: Quantitative Aptitude
  const sec1Id = psql(`
    INSERT INTO assessment_sections (
      assessment_id, title, description, section_order, section_type,
      marks_per_question, negative_marks_per_question
    ) VALUES (
      '${assessmentId}',
      'Quantitative Aptitude',
      'Questions on Unit Digit, Factors, and Number Theory.',
      0,
      'objective',
      2.0,
      0.5
    ) RETURNING id;
  `);

  // Pick 5 Quantitative questions
  const q1Ids = psqlAll(`
    SELECT id FROM assessment_questions
    WHERE category = 'Quantitative Aptitude'
    LIMIT 5;
  `);

  let idx = 0;
  for (const qId of q1Ids) {
    psql(`
      INSERT INTO assessment_section_questions (section_id, question_id, order_index, marks_override, negative_marks_override)
      VALUES ('${sec1Id}', '${qId}', ${idx++}, 2.0, 0.5);
    `);
  }

  // 4. Section 2: Logical Reasoning
  const sec2Id = psql(`
    INSERT INTO assessment_sections (
      assessment_id, title, description, section_order, section_type,
      marks_per_question, negative_marks_per_question
    ) VALUES (
      '${assessmentId}',
      'Logical Reasoning',
      'Questions on Direction Sense, Clocks, and Calendar.',
      1,
      'objective',
      2.0,
      0.5
    ) RETURNING id;
  `);

  // Pick 5 Logical Reasoning questions
  const q2Ids = psqlAll(`
    SELECT id FROM assessment_questions
    WHERE category = 'Logical Reasoning'
    LIMIT 5;
  `);

  idx = 0;
  for (const qId of q2Ids) {
    psql(`
      INSERT INTO assessment_section_questions (section_id, question_id, order_index, marks_override, negative_marks_override)
      VALUES ('${sec2Id}', '${qId}', ${idx++}, 2.0, 0.5);
    `);
  }

  // 5. Section 3: DSA Coding
  const sec3Id = psql(`
    INSERT INTO assessment_sections (
      assessment_id, title, description, section_order, section_type,
      marks_per_question, negative_marks_per_question
    ) VALUES (
      '${assessmentId}',
      'DSA Coding Challenge',
      'Implementation problem testing data structures and algorithms.',
      2,
      'coding',
      20.0,
      0.0
    ) RETURNING id;
  `);

  // Pick "Two Sum" problem
  const twoSumId = psql(`SELECT id FROM problems WHERE slug = 'two-sum' LIMIT 1;`);
  if (twoSumId) {
    psql(`
      INSERT INTO assessment_section_questions (section_id, problem_id, order_index, marks_override, negative_marks_override)
      VALUES ('${sec3Id}', '${twoSumId}', 0, 20.0, 0.0);
    `);
  }

  // 6. Recalculate totals
  psql(`
    UPDATE assessment_sections s
    SET
      total_questions = (SELECT count(*)::int FROM assessment_section_questions WHERE section_id = s.id),
      total_marks = (SELECT COALESCE(SUM(COALESCE(marks_override, 1.0)), 0) FROM assessment_section_questions WHERE section_id = s.id)
    WHERE assessment_id = '${assessmentId}';
  `);

  psql(`
    UPDATE assessments
    SET total_marks = (SELECT SUM(total_marks) FROM assessment_sections WHERE assessment_id = '${assessmentId}'),
        status = 'Published'
    WHERE id = '${assessmentId}';
  `);

  const summary = psql(`
    SELECT title, total_marks,
      (SELECT count(*) FROM assessment_sections WHERE assessment_id = '${assessmentId}') AS sections_count,
      (SELECT count(*) FROM assessment_section_questions sq JOIN assessment_sections s ON sq.section_id = s.id WHERE s.assessment_id = '${assessmentId}') AS questions_count
    FROM assessments WHERE id = '${assessmentId}';
  `);

  console.log('Seeded successfully! Details:', summary);
}

main().catch(console.error);
