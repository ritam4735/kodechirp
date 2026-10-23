// gateway/src/utils/helpers.js
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');

/**
 * Hash a token using SHA-256 for secure storage.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically secure random token.
 */
function generateToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Extract client IP from request (handles proxies).
 */
function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
}

/**
 * Normalise output strings for comparison (trim, collapse whitespace).
 */
function normaliseOutput(str) {
  return (str || '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/ +\n/g, '\n')
    .replace(/\n +/g, '\n');
}

/**
 * Normalize question options to standard [{ id: 'a', text: '...' }, ...] format.
 * Guarantees every option has a valid string id (lowercase) and string text.
 */
function normalizeOptions(options) {
  if (!options) return [];
  let parsed = options;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.map((opt, idx) => {
    const fallbackId = String.fromCharCode(97 + idx); // 'a', 'b', 'c', ...
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { id: fallbackId, text: String(opt).trim() };
    }
    if (typeof opt === 'object' && opt !== null) {
      const rawId = (opt.id || opt.key || opt.label || opt.option || fallbackId).toString().trim().toLowerCase();
      const rawText = (opt.text ?? opt.value ?? opt.title ?? '').toString().trim();
      return { id: rawId, text: rawText };
    }
    return { id: fallbackId, text: '' };
  });
}

/**
 * Normalize correct_answer value against options.
 * Guarantees lowercase matching option IDs (e.g., 'a', 'b' or ['a', 'b']).
 */
function normalizeCorrectAnswer(correctAnswer, options = []) {
  if (correctAnswer === null || correctAnswer === undefined || correctAnswer === '') return null;
  let parsed = correctAnswer;
  if (typeof parsed === 'string' && (parsed.startsWith('[') || parsed.startsWith('{') || parsed.startsWith('"'))) {
    try { parsed = JSON.parse(parsed); } catch { /* keep as string */ }
  }

  const normalizedOpts = normalizeOptions(options);
  const validIds = new Set(normalizedOpts.map(o => o.id));

  if (Array.isArray(parsed)) {
    const arr = parsed
      .map(a => String(a).trim().toLowerCase())
      .filter(a => validIds.size === 0 || validIds.has(a));
    return arr.length > 0 ? arr : (parsed.length > 0 ? [String(parsed[0]).trim().toLowerCase()] : null);
  }

  const strAnswer = String(parsed).trim().toLowerCase();
  return strAnswer;
}

/**
 * Validate objective question options and answer key.
 */
function validateObjectiveQuestion(questionType, options, correctAnswer) {
  if (['single_choice', 'multiple_choice'].includes(questionType)) {
    const normalizedOpts = normalizeOptions(options);
    if (!Array.isArray(normalizedOpts) || normalizedOpts.length < 2) {
      return 'Objective questions must have at least 2 options.';
    }
    for (let i = 0; i < normalizedOpts.length; i++) {
      if (!normalizedOpts[i].text || !normalizedOpts[i].text.trim()) {
        return `Option ${normalizedOpts[i].id.toUpperCase()} must have non-empty text.`;
      }
    }
    const optionIds = new Set(normalizedOpts.map(o => o.id));
    if (correctAnswer === null || correctAnswer === undefined || correctAnswer === '') {
      return 'A correct answer key is required for objective questions.';
    }
    const normalizedAns = normalizeCorrectAnswer(correctAnswer, normalizedOpts);
    if (Array.isArray(normalizedAns)) {
      if (normalizedAns.length === 0) return 'At least one correct answer must be selected.';
      for (const ans of normalizedAns) {
        if (!optionIds.has(ans)) {
          return `Correct answer "${ans}" does not match any valid option ID.`;
        }
      }
    } else {
      if (!normalizedAns || !optionIds.has(normalizedAns)) {
        return `Correct answer "${correctAnswer}" does not match any valid option ID (${Array.from(optionIds).join(', ')}).`;
      }
    }
  }
  return null;
}

module.exports = {
  hashToken,
  generateToken,
  getClientIp,
  normaliseOutput,
  normalizeOptions,
  normalizeCorrectAnswer,
  validateObjectiveQuestion,
};
