const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../utils/validate');

const router = express.Router();

router.post(
  '/signup',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('username').optional().isString().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  validateRequest,
  authController.signup
);

router.post(
  '/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  validateRequest,
  authController.login
);

router.get('/me', requireAuth, authController.getMe);

module.exports = router;
