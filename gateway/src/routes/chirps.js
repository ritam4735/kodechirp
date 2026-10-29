// gateway/src/routes/chirps.js
// ─────────────────────────────────────────────────────────────────────────────
// Routes for Chirps (Peer Explanations & Community Discussion Feed)
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { body, param, query } = require('express-validator');
const chirpController = require('../controllers/chirpController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 1. Get Chirps feed (problem-scoped or platform-wide, with filters and sorting)
router.get(
  '/',
  optionalAuth,
  query('problem_id').optional().isString().trim(),
  query('sort').optional().isIn(['popular', 'newest', 'oldest', 'replies']),
  query('tag').optional().isString().trim(),
  query('search').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
  chirpController.getChirps
);

// 2. Get distinct popular approach tags
router.get('/tags', chirpController.getPopularTags);

// 3. Get single Chirp by ID
router.get(
  '/:id',
  optionalAuth,
  param('id').matches(UUID_REGEX).withMessage('Valid Chirp UUID is required'),
  validateRequest,
  chirpController.getChirpById
);

// 4. Get replies to a Chirp
router.get(
  '/:id/replies',
  optionalAuth,
  param('id').matches(UUID_REGEX).withMessage('Valid Chirp UUID is required'),
  validateRequest,
  chirpController.getChirpReplies
);

// 5. Post a new Chirp or threaded reply (Authentication required)
router.post(
  '/',
  requireAuth,
  body('content').isString().trim().notEmpty().withMessage('Content is required').isLength({ max: 5000 }),
  body('problem_id').optional({ nullable: true }).isString().trim(),
  body('parent_id').optional({ nullable: true }).matches(UUID_REGEX).withMessage('parent_id must be a valid UUID'),
  body('code_snippet').optional({ nullable: true }).isString().isLength({ max: 10000 }),
  body('approach_tag').optional({ nullable: true }).isString().trim().isLength({ max: 50 }),
  validateRequest,
  chirpController.postChirp
);

// 6. Update an existing Chirp (Authentication required, author or admin)
router.put(
  '/:id',
  requireAuth,
  param('id').matches(UUID_REGEX).withMessage('Valid Chirp UUID is required'),
  body('content').optional().isString().trim().notEmpty().withMessage('Content cannot be empty').isLength({ max: 5000 }),
  body('code_snippet').optional({ nullable: true }).isString().isLength({ max: 10000 }),
  body('approach_tag').optional({ nullable: true }).isString().trim().isLength({ max: 50 }),
  validateRequest,
  chirpController.updateChirp
);

// 7. Delete a Chirp (Authentication required, author or admin/moderator)
router.delete(
  '/:id',
  requireAuth,
  param('id').matches(UUID_REGEX).withMessage('Valid Chirp UUID is required'),
  validateRequest,
  chirpController.deleteChirp
);

// 8. Toggle like/upvote for a Chirp (Authentication required)
router.post(
  '/:id/upvote',
  requireAuth,
  param('id').matches(UUID_REGEX).withMessage('Valid Chirp UUID is required'),
  validateRequest,
  chirpController.toggleUpvote
);

module.exports = router;
