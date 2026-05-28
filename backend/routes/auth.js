const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../utils/validate');

const router = express.Router();

router.post(
  '/signup',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
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
