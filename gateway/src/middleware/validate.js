// gateway/src/middleware/validate.js
// ─────────────────────────────────────────────────────────────────────────────
// Express-validator result handler
// ─────────────────────────────────────────────────────────────────────────────

const { validationResult } = require('express-validator');

/**
 * Check validation results and return 400 if any errors.
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(e => ({
        field: e.path,
        message: e.msg,
        value: e.value,
      })),
    });
  }
  next();
}

module.exports = { validateRequest };
