// gateway/src/routes/auth.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { authLoginLimiter, authSignupLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/signup',
  authSignupLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('username').isString().isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, hyphens'),
  validateRequest,
  authController.signup
);

router.post(
  '/login',
  authLoginLimiter,
  body('identifier').notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest,
  authController.login
);

router.post('/refresh', authController.refresh);

router.post('/logout', optionalAuth, authController.logout);

router.get('/me', requireAuth, authController.getMe);

router.post(
  '/forgot-password',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  validateRequest,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  validateRequest,
  authController.resetPassword
);

router.post(
  '/verify-email',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('token').notEmpty().withMessage('Verification token is required'),
  validateRequest,
  authController.verifyEmail
);

router.get(
  '/verify-email',
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  validateRequest,
  authController.resendVerification
);

module.exports = router;
