// gateway/src/routes/assessments.js
// ─────────────────────────────────────────────────────────────────────────────
// Student Assessment Engine Routes
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const studentController = require('../controllers/assessmentStudentController');

const router = express.Router();

// List published assessments (optionalAuth to attach user status if logged in)
router.get('/', optionalAuth, studentController.getPublishedAssessments);

// Get assessment overview/instructions
router.get('/:id', optionalAuth, studentController.getAssessmentOverview);

// Start or resume an assessment attempt (requires auth)
router.post('/:id/start', requireAuth, studentController.startAttempt);

// Get attempt state and student-safe questions (requires auth)
router.get('/attempts/:attemptId', requireAuth, studentController.getAttemptData);

// Save / update answer during attempt (requires auth)
router.post('/attempts/:attemptId/save-response', requireAuth, studentController.saveResponse);

// Final submit attempt (requires auth)
router.post('/attempts/:attemptId/submit', requireAuth, studentController.submitAttempt);

// Record security violation / trigger auto-submit (requires auth)
router.post('/attempts/:attemptId/violation', requireAuth, studentController.recordViolation);

// View attempt results and performance breakdown (requires auth)
router.get('/attempts/:attemptId/result', requireAuth, studentController.getAttemptResult);

module.exports = router;
