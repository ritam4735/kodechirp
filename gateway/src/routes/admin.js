const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const assessmentQuestionController = require('../controllers/assessmentQuestionController');
const assessmentAdminController = require('../controllers/assessmentAdminController');

const router = express.Router();

// All routes require admin privileges
router.use(requireAuth, requireRole('admin'));

// Dashboard stats
router.get('/stats', adminController.getStats);

// Analytics
router.get('/stats/analytics', adminController.getAnalytics);

// ── Problem Normalization Pipeline (static paths before :id) ────────────────
router.get('/problems/review-queue', adminController.getReviewQueue);
router.post('/problems/batch-parse', adminController.batchParse);
router.get('/normalization/ai-status', adminController.getAIStatus);

// Problems management
router.get('/problems', adminController.getProblems);
router.post('/problems', adminController.createProblem);
router.post('/problems/generate-examples', adminController.generateExamples);
router.post('/problems/bulk-action', adminController.bulkAction);
router.get('/problems/:id', adminController.getProblem);
router.put('/problems/:id', adminController.updateProblem);
router.delete('/problems/:id', adminController.deleteProblem);
router.post('/problems/:id/toggle-status', adminController.toggleProblemStatus);

// Normalization — parameterized routes
router.post('/problems/:id/parse', adminController.parseProblem);
router.post('/problems/:id/normalize', adminController.normalizeProblem);
router.post('/problems/:id/approve-parsing', adminController.approveParsing);
router.post('/problems/:id/review-status', adminController.updateReviewStatus);

// Reference Solution management
router.get('/problems/:id/reference-solution', adminController.getReferenceSolution);
router.put('/problems/:id/reference-solution', adminController.upsertReferenceSolution);
router.delete('/problems/:id/reference-solution', adminController.deleteReferenceSolution);
router.post('/problems/:id/reference-solution/verify', adminController.verifyReferenceSolution);

// Automated Test Generation
router.post('/problems/:id/generate-tests', adminController.generateTests);

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
router.delete('/users/:id', adminController.deleteUser);

// Submission monitoring
router.get('/submissions', adminController.getSubmissions);

// ── Assessment Engine — Question Bank Management ────────────────────────────
router.get('/assessment-questions', assessmentQuestionController.getQuestions);
router.get('/assessment-questions/batches', assessmentQuestionController.getBatches);
router.get('/assessment-questions/:id', assessmentQuestionController.getQuestion);
router.post('/assessment-questions', assessmentQuestionController.createQuestion);
router.put('/assessment-questions/:id', assessmentQuestionController.updateQuestion);
router.delete('/assessment-questions/:id', assessmentQuestionController.deleteQuestion);
router.post('/assessment-questions/:id/toggle-status', assessmentQuestionController.toggleStatus);

// ── Assessment Engine — Assessments & Builder Management ────────────────────
router.get('/assessments', assessmentAdminController.getAssessments);
router.post('/assessments', assessmentAdminController.createAssessment);
router.get('/assessments/:id', assessmentAdminController.getAssessment);
router.put('/assessments/:id', assessmentAdminController.updateAssessment);
router.delete('/assessments/:id', assessmentAdminController.deleteAssessment);
router.post('/assessments/:id/status', assessmentAdminController.toggleStatus);
router.get('/assessments/:id/attempts', assessmentAdminController.getAssessmentAttempts);

// Assessment Sections & Question Population
router.post('/assessments/:id/sections', assessmentAdminController.createSection);
router.put('/assessments/sections/:sectionId', assessmentAdminController.updateSection);
router.delete('/assessments/sections/:sectionId', assessmentAdminController.deleteSection);
router.post('/assessments/sections/:sectionId/questions', assessmentAdminController.addQuestionToSection);
router.delete('/assessments/sections/:sectionId/questions/:mappingId', assessmentAdminController.removeQuestionFromSection);
router.delete('/assessments/sections/questions/:mappingId', assessmentAdminController.removeQuestionFromSection);
router.post('/assessments/sections/:sectionId/populate-random', assessmentAdminController.populateRandomQuestions);

module.exports = router;
