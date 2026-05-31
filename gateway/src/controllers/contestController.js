// gateway/src/controllers/contestController.js
// ─────────────────────────────────────────────────────────────────────────────

const contestService = require('../services/contestService');

exports.listContests = async (req, res, next) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    const contests = await contestService.listContests({
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.json({ success: true, data: contests });
  } catch (err) {
    next(err);
  }
};

exports.getContest = async (req, res, next) => {
  try {
    const contest = await contestService.getContest(req.params.id);
    return res.json({ success: true, data: contest });
  } catch (err) {
    next(err);
  }
};

exports.joinContest = async (req, res, next) => {
  try {
    const result = await contestService.joinContest(req.params.id, req.user.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
