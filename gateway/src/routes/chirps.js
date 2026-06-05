// gateway/src/routes/chirps.js
const express = require('express');
const { body, query } = require('express-validator');
const chirpController = require('../controllers/chirpController');
const { optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.get(
  '/',
  query('problem_id').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('Valid problem ID is required'),
  validateRequest,
  chirpController.getChirps
);

router.post(
  '/',
  optionalAuth,
  body('problem_id').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('Valid problem ID is required'),
  body('content').isString().notEmpty().withMessage('Content is required'),
  body('code_snippet').optional().isString(),
  body('approach_tag').optional().isString(),
  validateRequest,
  chirpController.postChirp
);

module.exports = router;
