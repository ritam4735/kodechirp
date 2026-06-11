const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const CSV_FILE_PATH = fs.existsSync('/app/leetcode_dataset.csv') ? '/app/leetcode_dataset.csv' : path.join(__dirname, '../../../data/leetcode_dataset - lc.csv');

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function parseProblemDescription(rawText) {
  // Try to separate constraints and examples from the main description
  let description = rawText;
  let constraints = null;

  const constraintsIndex = rawText.lastIndexOf('Constraints:');
  if (constraintsIndex !== -1) {
    description = rawText.substring(0, constraintsIndex).trim();
    constraints = rawText.substring(constraintsIndex + 12).trim();
  }

  return { description, constraints };
}

async function importDataset() {
  console.log(`Starting import from: ${CSV_FILE_PATH}`);
  let count = 0;
  let skipped = 0;

  try {
    const problems = [];
    
    // Read CSV completely into memory first (it's ~2MB)
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
          problems.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Found ${problems.length} problems in CSV. Starting database insertion...`);

    for (const row of problems) {
      try {
        const slug = slugify(row.title);
        
        // Check if exists
        const checkRes = await db.query('SELECT id FROM problems WHERE slug = $1', [slug]);
        if (checkRes.rowCount > 0) {
          console.log(`[SKIP] Problem already exists: ${row.title}`);
          skipped++;
          continue;
        }

        const rawStatement = row.description || '';
        const { description, constraints } = parseProblemDescription(rawStatement);
        
        let difficulty = row.difficulty || 'Medium';
        if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
          difficulty = 'Medium';
        }

        const tags = row.related_topics ? row.related_topics.split(',').map(t => t.trim()) : [];
        
        const metadata = {
          original_id: row.id,
          acceptance_rate: parseFloat(row.acceptance_rate) || 0,
          likes: parseInt(row.likes) || 0,
          dislikes: parseInt(row.dislikes) || 0,
          similar_questions: row.similar_questions || '',
          solution_link: row.solution_link || ''
        };

        const query = `
          INSERT INTO problems 
          (slug, title, description, raw_statement, difficulty, constraints, source, status, review_status, tags, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        await db.query(query, [
          slug,
          row.title,
          description || rawStatement,
          rawStatement,
          difficulty,
          constraints,
          'leetcode_import',
          'Imported',
          'imported',
          JSON.stringify(tags),
          JSON.stringify(metadata)
        ]);

        count++;
        if (count % 100 === 0) {
          console.log(`Imported ${count} problems...`);
        }
      } catch (err) {
        console.error(`[ERROR] Failed to import problem: ${row.title}`, err.message);
      }
    }

    console.log(`\nImport completed successfully!`);
    console.log(`Successfully imported: ${count}`);
    console.log(`Skipped (duplicates): ${skipped}`);
    process.exit(0);

  } catch (err) {
    console.error('Fatal error during import:', err);
    process.exit(1);
  }
}

importDataset();
