const express = require('express');
const { query } = require('express-validator');
const problemController = require('../controllers/problemController');
const { validateRequest } = require('../utils/validate');

const router = express.Router();

router.get(
  '/',
  query('search').optional().isString(),
  validateRequest,
  problemController.getAllProblems
);

router.get('/:slug', problemController.getProblem);

module.exports = router;
