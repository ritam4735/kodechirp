// gateway/src/routes/problems.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { query, param } = require('express-validator');
const problemController = require('../controllers/problemController');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.get(
  '/',
  query('search').optional({ values: 'falsy' }).isString(),
  query('difficulty').optional({ values: 'falsy' }).isIn(['Easy', 'Medium', 'Hard']),
  query('topic').optional({ values: 'falsy' }).isString(),
  query('page').optional({ values: 'falsy' }).isInt({ min: 1 }),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 500 }),
  validateRequest,
  problemController.getAllProblems
);

router.get(
  '/:slug',
  param('slug').isString().notEmpty().withMessage('Problem slug is required'),
  validateRequest,
  problemController.getProblem
);

module.exports = router;
