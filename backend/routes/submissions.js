const express = require('express');
const { body } = require('express-validator');
const submissionController = require('../controllers/submissionController');
const { optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../utils/validate');

const router = express.Router();

router.post(
  '/run',
  optionalAuth,
  body('code').isString().notEmpty(),
  body('language').isString().notEmpty(),
  validateRequest,
  submissionController.runCode
);

router.post(
  '/submit',
  optionalAuth,
  body('code').isString().notEmpty(),
  body('language').isString().notEmpty(),
  body('problem_id').isString().notEmpty(),
  validateRequest,
  submissionController.submitCode
);

router.get('/user', optionalAuth, submissionController.getUserSubmissions);

module.exports = router;
