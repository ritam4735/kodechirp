const express = require('express');
const { body } = require('express-validator');
const chirpController = require('../controllers/chirpController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../utils/validate');

const router = express.Router();

router.get('/:problemId', optionalAuth, chirpController.getChirps);

router.post(
  '/',
  requireAuth,
  body('problem_id').isString().notEmpty(),
  body('content').isString().isLength({ min: 20 }),
  validateRequest,
  chirpController.postChirp
);

router.post('/:chirpId/upvote', requireAuth, chirpController.upvoteChirp);

module.exports = router;
