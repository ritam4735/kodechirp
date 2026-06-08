// gateway/src/routes/submissions.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { body, param, query } = require('express-validator');
const submissionController = require('../controllers/submissionController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { submitRunLimiter, submitJudgeLimiter } = require('../middleware/rateLimiter');
const { LANGUAGES } = require('../utils/constants');

const router = express.Router();

// Run code (no judging, immediate result)
router.post(
  '/run',
  optionalAuth,
  submitRunLimiter,
  body('code').isString().isLength({ min: 1, max: 65535 }).withMessage('Code must be between 1 and 65535 characters'),
  body('language').isString().isIn(LANGUAGES).withMessage(`Supported languages: ${LANGUAGES.join(', ')}`),
  body('stdin').optional().isString().isLength({ max: 65535 }).withMessage('Stdin must not exceed 65535 characters'),
  validateRequest,
  submissionController.runCode
);

// Submit for judging (async, queued)
router.post(
  '/submit',
  optionalAuth,
  submitJudgeLimiter,
  body('code').isString().isLength({ min: 1, max: 65535 }).withMessage('Code must be between 1 and 65535 characters'),
  body('language').isString().isIn(LANGUAGES).withMessage(`Supported languages: ${LANGUAGES.join(', ')}`),
  body('problem_id').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('Valid problem ID is required'),
  validateRequest,
  submissionController.submitCode
);

// User submission history
router.get(
  '/user',
  requireAuth,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validateRequest,
  submissionController.getUserSubmissions
);

// Get specific submission
router.get(
  '/:id',
  optionalAuth,
  param('id').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('Valid submission ID is required'),
  validateRequest,
  submissionController.getSubmission
);

module.exports = router;
