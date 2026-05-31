const express = require('express');
const { body } = require('express-validator');
const submissionController = require('../controllers/submissionController');
const { optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../utils/validate');

const router = express.Router();

router.post(
  '/run',
  optionalAuth,
  body('code').isString().notEmpty().withMessage('Code is required'),
  body('language').isString().notEmpty().withMessage('Language is required'),
  body('stdin').optional().isString(),
  validateRequest,
  submissionController.runCode
);

router.post(
  '/submit',
  optionalAuth,
  body('code').isString().notEmpty().withMessage('Code is required'),
  body('language').isString().notEmpty().withMessage('Language is required'),
  body('problem_id').isUUID().withMessage('Invalid problem ID format'),
  validateRequest,
  submissionController.submitCode
);

router.get('/user', optionalAuth, submissionController.getUserSubmissions);

module.exports = router;
