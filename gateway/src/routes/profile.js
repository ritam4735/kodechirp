// gateway/src/routes/profile.js
const express = require('express');
const { body } = require('express-validator');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.use(requireAuth);

router.get('/', profileController.getProfile);

router.put(
  '/',
  body('username').optional().isString().trim().isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, hyphens').escape(),
  body('display_name').optional().isString().trim().isLength({ max: 100 }).escape(),
  body('bio').optional().isString().trim().isLength({ max: 500 }).escape(),
  body('github_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid URL'),
  body('linkedin_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid URL'),
  body('website_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid URL'),
  body('preferences_json').optional().isObject(),
  validateRequest,
  profileController.updateProfile
);

router.put(
  '/password',
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  validateRequest,
  profileController.changePassword
);

router.post(
  '/avatar',
  // Normally we would use multer for file uploads, but if we handle data URIs:
  body('avatar_url').notEmpty().withMessage('Avatar URL or data is required'),
  validateRequest,
  profileController.updateAvatar
);

module.exports = router;
