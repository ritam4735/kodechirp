// gateway/src/routes/problems.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { query, param } = require('express-validator');
const problemController = require('../controllers/problemController');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.get(
  '/',
  query('search').optional().isString(),
  query('difficulty').optional().isIn(['Easy', 'Medium', 'Hard']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
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
