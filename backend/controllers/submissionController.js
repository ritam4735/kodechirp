const { pool } = require('../db');
const { executePython } = require('../executors/pythonExecutor');
const { executeC } = require('../executors/cExecutor');
const { executeCpp } = require('../executors/cppExecutor');
const { executeJs } = require('../executors/jsExecutor');

exports.runCode = (req, res) => {
  // handled by /api/execute
  res.status(501).json({ success: false, error: 'Not implemented' });
};

exports.submitCode = async (req, res, next) => {
  try {
    const { problem_id, code, language } = req.body;
    const userId = req.user?.id || null; // optional auth

    if (!problem_id || !code || !language) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Fetch test cases for this problem
    const testCasesResult = await pool.query(
      'SELECT input, expected_output FROM test_cases WHERE problem_id = $1 ORDER BY order_index ASC',
      [problem_id]
    );
    const testCases = testCasesResult.rows;

    if (testCases.length === 0) {
      return res.status(404).json({ success: false, error: 'No test cases found for this problem' });
    }

    let status = 'Accepted';
    let failed_test_input = null;
    let failed_test_expected = null;
    let failed_test_actual = null;
    let totalRuntime = 0;

    for (let tc of testCases) {
      let result;
      const start = Date.now();
      switch (language.toLowerCase()) {
        case 'python':
        case 'python3':
        case 'py':
          result = await executePython(code, tc.input);
          break;
        case 'c':
          result = await executeC(code, tc.input);
          break;
        case 'cpp':
        case 'c++':
          result = await executeCpp(code, tc.input);
          break;
        case 'js':
        case 'javascript':
        case 'node':
          result = await executeJs(code, tc.input);
          break;
        default:
          return res.status(400).json({ success: false, error: `Language '${language}' not supported` });
      }
      totalRuntime += (Date.now() - start);

      if (!result.success) {
        if (result.error.includes('Timed Out')) {
          status = 'Time Limit Exceeded';
        } else {
          status = 'Runtime Error';
        }
        failed_test_input = tc.input;
        failed_test_expected = tc.expected_output;
        failed_test_actual = result.stderr || result.error;
        break; // stop on first failure
      }

      // normalize output to compare safely
      const cleanExpected = tc.expected_output.trim().replace(/\r\n/g, '\n');
      const cleanActual = (result.stdout || '').trim().replace(/\r\n/g, '\n');

      if (cleanExpected !== cleanActual) {
        status = 'Wrong Answer';
        failed_test_input = tc.input;
        failed_test_expected = cleanExpected;
        failed_test_actual = cleanActual;
        break;
      }
    }

    const avgRuntime = testCases.length > 0 ? Math.floor(totalRuntime / testCases.length) : 0;
    const memoryKb = Math.floor(Math.random() * 50000 + 10000); // Mock memory for now

    // Record submission
    const insertResult = await pool.query(
      `INSERT INTO submissions 
       (user_id, problem_id, language, code, status, runtime_ms, memory_kb, failed_test_input, failed_test_expected, failed_test_actual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [userId, problem_id, language, code, status, avgRuntime, memoryKb, failed_test_input, failed_test_expected, failed_test_actual]
    );

    res.json({
      success: true,
      data: insertResult.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserSubmissions = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};
