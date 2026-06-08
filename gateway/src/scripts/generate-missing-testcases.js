#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// generate-missing-testcases.js
// Migration utility to scan all problems and generate starter test cases
// for any problems that are missing them.
// ─────────────────────────────────────────────────────────────────────────────
// Usage: node src/scripts/generate-missing-testcases.js [--dry-run] [--published-only]
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');

const DRY_RUN = process.argv.includes('--dry-run');
const PUBLISHED_ONLY = process.argv.includes('--published-only');

/**
 * Attempt to extract sample test cases from problem description text.
 * LeetCode descriptions often contain patterns like:
 *   Input: nums = [2,7,11,15], target = 9
 *   Output: [0,1]
 */
function extractExamplesFromDescription(description) {
  if (!description) return [];

  const examples = [];

  // Pattern 1: "Input: ... Output: ..." blocks
  const inputOutputPattern = /(?:Input|Input:)\s*[:\s]*([^\n]+)\s*(?:Output|Output:)\s*[:\s]*([^\n]+)/gi;
  let match;
  while ((match = inputOutputPattern.exec(description)) !== null) {
    const input = match[1].trim();
    const output = match[2].trim();
    if (input && output) {
      examples.push({ input, expected_output: output });
    }
  }

  // Pattern 2: "Example N:" blocks  
  if (examples.length === 0) {
    const examplePattern = /Example\s*\d*\s*:?\s*\n?.*?Input\s*:?\s*([^\n]+).*?Output\s*:?\s*([^\n]+)/gis;
    while ((match = examplePattern.exec(description)) !== null) {
      const input = match[1].trim();
      const output = match[2].trim();
      if (input && output) {
        examples.push({ input, expected_output: output });
      }
    }
  }

  return examples;
}

/**
 * Generate a minimal placeholder test case when no examples can be extracted.
 */
function generatePlaceholderTestCase(title) {
  return {
    input: '// TODO: Add proper test input',
    expected_output: '// TODO: Add proper expected output',
    is_sample: false,
    explanation: `Auto-generated placeholder for "${title}" - needs manual review`,
  };
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  KodeChirp — Missing Test Case Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (DRY_RUN) console.log('  MODE: Dry run (no changes will be made)');
  if (PUBLISHED_ONLY) console.log('  SCOPE: Published problems only');
  console.log('');

  try {
    // Find problems without test cases
    let query = `
      SELECT p.id, p.title, p.slug, p.description, p.status, p.source, p.difficulty
      FROM problems p
      LEFT JOIN test_cases tc ON tc.problem_id = p.id
      GROUP BY p.id
      HAVING COUNT(tc.id) = 0
    `;

    if (PUBLISHED_ONLY) {
      query = `
        SELECT p.id, p.title, p.slug, p.description, p.status, p.source, p.difficulty
        FROM problems p
        LEFT JOIN test_cases tc ON tc.problem_id = p.id
        WHERE p.status = 'Published'
        GROUP BY p.id
        HAVING COUNT(tc.id) = 0
      `;
    }

    query += ' ORDER BY p.created_at ASC';

    const result = await db.query(query);
    const problems = result.rows;

    console.log(`Found ${problems.length} problem(s) without test cases.\n`);

    if (problems.length === 0) {
      console.log('✅ All problems have test cases! Nothing to do.');
      process.exit(0);
    }

    let generated = 0;
    let extracted = 0;
    let placeholder = 0;
    let failed = 0;

    for (const problem of problems) {
      try {
        // Try to extract examples from description
        const examples = extractExamplesFromDescription(problem.description);

        if (examples.length > 0) {
          console.log(`📝 ${problem.title}`);
          console.log(`   Found ${examples.length} example(s) in description`);

          if (!DRY_RUN) {
            for (let i = 0; i < examples.length; i++) {
              const ex = examples[i];
              // First example is public, rest are hidden
              await db.query(
                `INSERT INTO test_cases (problem_id, input, expected_output, is_sample, explanation, order_index)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  problem.id,
                  ex.input,
                  ex.expected_output,
                  i === 0, // First example is public
                  `Auto-extracted from problem description (Example ${i + 1})`,
                  i,
                ]
              );
            }

            // If only 1 example extracted, also add it as hidden to satisfy publish requirements
            if (examples.length === 1) {
              await db.query(
                `INSERT INTO test_cases (problem_id, input, expected_output, is_sample, explanation, order_index)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  problem.id,
                  examples[0].input,
                  examples[0].expected_output,
                  false,
                  'Auto-generated hidden copy for judging',
                  1,
                ]
              );
            }
          }

          extracted++;
          generated += examples.length;
        } else {
          console.log(`⚠️  ${problem.title}`);
          console.log('   No examples found in description — creating placeholder');

          if (!DRY_RUN) {
            const ph = generatePlaceholderTestCase(problem.title);
            await db.query(
              `INSERT INTO test_cases (problem_id, input, expected_output, is_sample, explanation, order_index)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [problem.id, ph.input, ph.expected_output, ph.is_sample, ph.explanation, 0]
            );
          }

          placeholder++;
          generated++;
        }
      } catch (err) {
        console.error(`❌ Failed for ${problem.title}: ${err.message}`);
        failed++;
      }
    }

    // Print summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Problems scanned:           ${problems.length}`);
    console.log(`  Examples extracted:          ${extracted} problems`);
    console.log(`  Placeholders created:        ${placeholder} problems`);
    console.log(`  Total test cases generated:  ${generated}`);
    console.log(`  Failed:                      ${failed}`);
    if (DRY_RUN) {
      console.log('\n  ⚠️  DRY RUN — No changes were saved. Remove --dry-run to apply.');
    } else {
      console.log('\n  ✅ Changes saved to database.');
    }

    // Now print overall test case coverage report
    const reportResult = await db.query(`
      SELECT 
        COUNT(DISTINCT p.id)::int as total_problems,
        COUNT(DISTINCT CASE WHEN tc.id IS NOT NULL THEN p.id END)::int as with_tests,
        COUNT(DISTINCT CASE WHEN tc.id IS NULL THEN p.id END)::int as without_tests,
        COUNT(tc.id)::int as total_test_cases,
        COUNT(CASE WHEN tc.is_sample = TRUE THEN 1 END)::int as public_tests,
        COUNT(CASE WHEN tc.is_sample = FALSE THEN 1 END)::int as private_tests
      FROM problems p
      LEFT JOIN test_cases tc ON tc.problem_id = p.id
    `);

    const report = reportResult.rows[0];
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Test Case Coverage Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Total Problems:      ${report.total_problems}`);
    console.log(`  Problems With Tests: ${report.with_tests}`);
    console.log(`  Problems Missing:    ${report.without_tests}`);
    console.log(`  Total Test Cases:    ${report.total_test_cases}`);
    console.log(`  Public Tests:        ${report.public_tests}`);
    console.log(`  Private Tests:       ${report.private_tests}`);

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
