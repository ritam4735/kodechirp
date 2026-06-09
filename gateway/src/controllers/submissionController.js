// gateway/src/controllers/submissionController.js
// ─────────────────────────────────────────────────────────────────────────────
// Submission Controller — run code, submit for judging, get history
// ─────────────────────────────────────────────────────────────────────────────

const submissionService = require('../services/submissionService');

/**
 * POST /api/submissions/run
 * Execute code once with stdin — immediate result (no judging).
 */
exports.runCode = async (req, res, next) => {
  try {
    const { code, language, stdin = '' } = req.body;

    const result = await submissionService.runCode({ code, language, stdin });

    return res.json({
      success: true,
      output: result.stdout || result.stderr || '',
      error: result.exitCode !== 0 || result.timedOut,
      stderr: result.stderr,
      exitCode: result.exitCode,
      timedOut: result.timedOut || false,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/submissions/submit
 * Submit code for async judging — enqueues to worker via Redis.
 * Returns submission ID immediately.
 */
exports.submitCode = async (req, res, next) => {
  try {
    const { code, language, problem_id } = req.body;
    const userId = req.user?.id || null;

    const result = await submissionService.submitCode({
      problemId: problem_id,
      code,
      language,
      userId,
    });

    return res.status(202).json({
      success: true,
      data: result,
      message: 'Submission queued for execution',
    });
  } catch (err) {
    if (err.message?.startsWith('No test cases') || err.message?.startsWith('Problem not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    next(err);
  }
};

/**
 * GET /api/submissions/user
 * Get authenticated user's submission history.
 */
exports.getUserSubmissions = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { limit = 50, offset = 0 } = req.query;
    const submissions = await submissionService.getUserSubmissions(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/submissions/:id
 * Get a specific submission.
 */
exports.getSubmission = async (req, res, next) => {
  try {
    const submission = await submissionService.getSubmission(
      req.params.id,
      req.user
    );

    return res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};
