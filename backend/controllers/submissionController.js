// backend/controllers/submissionController.js
// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: both handlers previously returned 501 Not Implemented.
// Now they delegate to submissionService for real execution and judging.
// ─────────────────────────────────────────────────────────────────────────────

const submissionService = require('../services/submissionService');
const { query } = require('../db');
// ── POST /api/submissions/run ─────────────────────────────────────────────────
// Execute code once with optional stdin; return raw stdout/stderr.
// Used by the "Run Code" button (no test-case comparison).

exports.runCode = async (req, res, next) => {
  try {
    const { code, language, stdin = '' } = req.body;

    const result = await submissionService.runCode(code, language, stdin);

    return res.json({
      success: true,
      output:  result.stdout || result.stderr || '',  // show stderr if stdout is empty
      error:   result.exitCode !== 0 || result.timedOut,
      stderr:  result.stderr,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/submissions/submit ──────────────────────────────────────────────
// Judge code against all test cases for the given problem.

exports.submitCode = async (req, res, next) => {
  try {
    const { code, language, problem_id } = req.body;

    // req.user is set by optionalAuth middleware (null if not logged in)
    const userId = req.user?.id || null;

    const result = await submissionService.submitCode(problem_id, code, language, userId);

    return res.json({
      success: true,
      data:    result,
    });
  } catch (err) {
    // If the error is "no test cases found", return 404 rather than 500
    if (err.message && err.message.startsWith('No test cases found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    next(err);
  }
};

// ── GET /api/submissions/user ─────────────────────────────────────────────────
// Placeholder — intentionally not yet implemented.

exports.getUserSubmissions = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userId = req.user.id;
    const result = await query(
      'SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50;',
      [userId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Submissions] Get user submissions error:', err);
    next(err);
  }
};
