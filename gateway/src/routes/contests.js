// gateway/src/routes/contests.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { param, query } = require('express-validator');
const contestController = require('../controllers/contestController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.get(
  '/',
  query('status').optional().isIn(['upcoming', 'active', 'ended']),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('offset').optional().isInt({ min: 0 }),
  validateRequest,
  contestController.listContests
);

router.get(
  '/:id',
  param('id').isUUID(),
  validateRequest,
  contestController.getContest
);

router.post(
  '/:id/join',
  requireAuth,
  param('id').isUUID(),
  validateRequest,
  contestController.joinContest
);

module.exports = router;
