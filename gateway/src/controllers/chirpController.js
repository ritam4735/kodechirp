// gateway/src/controllers/chirpController.js
// ─────────────────────────────────────────────────────────────────────────────
// Chirp Controller — HTTP Request Handlers for Chirps Community Engine
// ─────────────────────────────────────────────────────────────────────────────

const chirpService = require('../services/chirpService');

exports.getChirps = async (req, res, next) => {
  try {
    const { problem_id, sort, tag, search, parent_id, page, limit } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    const result = await chirpService.getChirps({
      problem_id,
      sort,
      tag,
      search,
      parent_id,
      page,
      limit,
      currentUserId,
    });

    return res.json({
      success: true,
      data: result.chirps,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    next(err);
  }
};

exports.getChirpById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const chirp = await chirpService.getChirpById(id, currentUserId);
    if (!chirp) {
      return res.status(404).json({ success: false, error: 'Chirp not found' });
    }

    return res.json({ success: true, data: chirp });
  } catch (err) {
    next(err);
  }
};

exports.getChirpReplies = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const replies = await chirpService.getChirpReplies(id, currentUserId);
    return res.json({ success: true, data: replies });
  } catch (err) {
    next(err);
  }
};

exports.postChirp = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { problem_id, content, code_snippet, approach_tag, parent_id } = req.body;

    const chirp = await chirpService.createChirp(
      { problem_id, content, code_snippet, approach_tag, parent_id },
      req.user
    );

    return res.status(201).json({ success: true, data: chirp });
  } catch (err) {
    next(err);
  }
};

exports.updateChirp = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    const { content, code_snippet, approach_tag } = req.body;

    const updated = await chirpService.updateChirp(
      id,
      { content, code_snippet, approach_tag },
      req.user
    );

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

exports.deleteChirp = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    const result = await chirpService.deleteChirp(id, req.user);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.toggleUpvote = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    const result = await chirpService.toggleUpvote(id, req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getPopularTags = async (req, res, next) => {
  try {
    const tags = await chirpService.getPopularTags();
    return res.json({ success: true, data: tags });
  } catch (err) {
    next(err);
  }
};
