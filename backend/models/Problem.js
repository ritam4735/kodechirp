const db = require('../db');

class Problem {
  static async findAll(searchQuery = '') {
    let query = 'SELECT id, slug, title, description, created_at FROM problems';
    const values = [];

    if (searchQuery && searchQuery.trim()) {
      query += ' WHERE title ILIKE $1 OR description ILIKE $1';
      values.push(`%${searchQuery.trim()}%`);
    }

    query += ' ORDER BY created_at ASC';

    const result = await db.query(query, values);
    return result.rows;
  }

  static async findBySlug(slug) {
    const problemResult = await db.query(
      'SELECT * FROM problems WHERE slug = $1 OR id::text = $1',
      [slug]
    );

    if (problemResult.rows.length === 0) {
      return null;
    }

    const problem = problemResult.rows[0];

    const testCasesResult = await db.query(
      'SELECT * FROM test_cases WHERE problem_id = $1 AND is_sample = true ORDER BY order_index ASC',
      [problem.id]
    );

    problem.sample_test_cases = testCasesResult.rows;

    return problem;
  }
}

module.exports = Problem;
