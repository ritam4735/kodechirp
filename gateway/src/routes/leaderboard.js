// gateway/src/routes/leaderboard.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { param, query } = require('express-validator');
const leaderboardController = require('../controllers/leaderboardController');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.get(
  '/',
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validateRequest,
  leaderboardController.getGlobalLeaderboard
);

router.get(
  '/contest/:contestId',
  param('contestId').isUUID(),
  validateRequest,
  leaderboardController.getContestLeaderboard
);

module.exports = router;
