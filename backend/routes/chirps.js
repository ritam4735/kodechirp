const express = require('express');
const { body, param } = require('express-validator');
const chirpController = require('../controllers/chirpController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../utils/validate');

const router = express.Router();

router.get(
  '/:problemId',
  param('problemId').isUUID().withMessage('Invalid problem ID format'),
  validateRequest,
  optionalAuth,
  chirpController.getChirps
);

router.post(
  '/',
  requireAuth,
  body('problem_id').isUUID().withMessage('Invalid problem ID format'),
  body('content').isString().isLength({ min: 20 }),
  validateRequest,
  chirpController.postChirp
);

router.post(
  '/:chirpId/upvote',
  requireAuth,
  param('chirpId').isUUID().withMessage('Invalid chirp ID format'),
  validateRequest,
  chirpController.upvoteChirp
);

module.exports = router;
