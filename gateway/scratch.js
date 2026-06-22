const db = require('./src/config/database');
const rsService = require('./src/services/referenceSolutionService');

(async () => {
  try {
    const problems = await db.query('SELECT id FROM problems LIMIT 1');
    if (problems.rows.length === 0) return console.log('No problems');
    const pid = problems.rows[0].id;
    const rs = await db.query('SELECT id FROM reference_solutions WHERE problem_id = $1', [pid]);
    if (rs.rows.length === 0) return console.log('No reference solution for problem', pid);
    const result = await rsService.verify(rs.rows[0].id);
    console.log("VERIFY RESULT:\n" + JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
