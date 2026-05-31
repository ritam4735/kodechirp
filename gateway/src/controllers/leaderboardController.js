// gateway/src/controllers/leaderboardController.js
// ─────────────────────────────────────────────────────────────────────────────

const leaderboardService = require('../services/leaderboardService');

exports.getGlobalLeaderboard = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const leaderboard = await leaderboardService.getGlobalLeaderboard({
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.json({ success: true, data: leaderboard });
  } catch (err) {
    next(err);
  }
};

exports.getContestLeaderboard = async (req, res, next) => {
  try {
    const { contestId } = req.params;
    const leaderboard = await leaderboardService.getContestLeaderboard(contestId);

    return res.json({ success: true, data: leaderboard });
  } catch (err) {
    next(err);
  }
};
