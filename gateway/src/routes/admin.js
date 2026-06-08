const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All routes require admin privileges
router.use(requireAuth, requireRole('admin'));

// Dashboard stats
router.get('/stats', adminController.getStats);

// Analytics
router.get('/stats/analytics', adminController.getAnalytics);

// Problems management
router.get('/problems', adminController.getProblems);
router.post('/problems', adminController.createProblem);
router.post('/problems/bulk-action', adminController.bulkAction);
router.get('/problems/:id', adminController.getProblem);
router.put('/problems/:id', adminController.updateProblem);
router.delete('/problems/:id', adminController.deleteProblem);
router.post('/problems/:id/toggle-status', adminController.toggleProblemStatus);

// Test Cases management
router.get('/problems/:id/test-cases', adminController.getTestCases);
router.post('/problems/:id/test-cases', adminController.createTestCase);
router.post('/problems/:id/test-cases/bulk', adminController.bulkImportTestCases);
router.put('/test-cases/:id', adminController.updateTestCase);
router.delete('/test-cases/:id', adminController.deleteTestCase);

// Problem validation (pre-publish check)
router.get('/problems/:id/validate', adminController.validateProblem);

// Test Case Report (audit)
router.get('/reports/test-cases', adminController.getTestCaseReport);

// User management
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/status', adminController.updateUserStatus);

// Submission monitoring
router.get('/submissions', adminController.getSubmissions);

module.exports = router;
