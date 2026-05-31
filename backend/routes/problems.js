const express = require('express');
const { query, param } = require('express-validator');
const problemController = require('../controllers/problemController');
const { validateRequest } = require('../utils/validate');

const router = express.Router();

router.get(
  '/',
  query('search').optional().isString(),
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
