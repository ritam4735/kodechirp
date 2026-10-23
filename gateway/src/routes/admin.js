const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireCollegeAdmin, requireSuperAdmin } = require('../middleware/rbac');

const adminController = require('../controllers/adminController');
const assessmentQuestionController = require('../controllers/assessmentQuestionController');
const assessmentAdminController = require('../controllers/assessmentAdminController');
const organizationController = require('../controllers/organizationController');
const rosterController = require('../controllers/rosterController');
const assessmentExportController = require('../controllers/assessmentExportController');
const collegeOnboardingController = require('../controllers/collegeOnboardingController');

const router = express.Router();

// File upload handler for roster spreadsheets (.xlsx, .csv)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// All routes require authentication
router.use(requireAuth);

// ── Super Admin Only: Organizations & Platform Management ───────────────────
router.get('/organizations', requireCollegeAdmin, organizationController.getOrganizations);
router.post('/organizations', requireSuperAdmin, organizationController.createOrganization);
router.get('/organizations/:id', requireCollegeAdmin, organizationController.getOrganization);
router.put('/organizations/:id', requireCollegeAdmin, organizationController.updateOrganization);
router.post('/organizations/:id/status', requireSuperAdmin, organizationController.toggleOrganizationStatus);
router.get('/organizations/:id/admins', requireCollegeAdmin, organizationController.getOrganizationAdmins);
router.post('/organizations/:id/admins', requireSuperAdmin, organizationController.assignCollegeAdmin);
router.delete('/organizations/:id/admins/:userId', requireSuperAdmin, organizationController.revokeCollegeAdmin);

// ── Super Admin Only: College Applications Review & Verification Lifecycle ──
router.get('/college-applications', requireSuperAdmin, collegeOnboardingController.getApplications);
router.get('/college-applications/:id', requireSuperAdmin, collegeOnboardingController.getApplication);
router.post('/college-applications/:id/approve', requireSuperAdmin, collegeOnboardingController.approveApplication);
router.post('/college-applications/:id/reject', requireSuperAdmin, collegeOnboardingController.rejectApplication);

// Administrative Audit Logs (Platform for Super Admin, Scoped for College Admin)
router.get('/audit-logs', requireCollegeAdmin, organizationController.getAuditLogs);

// ── College Admin & Super Admin: Student Roster Management ──────────────────
router.get('/roster', requireCollegeAdmin, rosterController.getRoster);
router.get('/roster/template', requireCollegeAdmin, rosterController.getTemplate);
router.post('/roster/preview', requireCollegeAdmin, upload.single('file'), rosterController.previewRosterImport);
router.post('/roster/import', requireCollegeAdmin, upload.single('file'), rosterController.confirmRosterImport);
router.get('/roster/history', requireCollegeAdmin, rosterController.getImportHistory);
router.get('/roster/history/:id/errors', requireCollegeAdmin, rosterController.downloadErrorReport);
router.put('/roster/students/:studentId', requireCollegeAdmin, rosterController.updateStudentEligibility);

// ── Assessment Results Export ───────────────────────────────────────────────
router.get('/assessments/:id/export/preview', requireCollegeAdmin, assessmentExportController.previewExport);
router.get('/assessments/:id/export', requireCollegeAdmin, assessmentExportController.downloadExport);
router.get('/assessments/:id/export/history', requireCollegeAdmin, assessmentExportController.getExportHistory);

// ── Assessment Assignments (Cohorts & Eligibility) ──────────────────────────
router.get('/assessments/:id/assignments', requireCollegeAdmin, assessmentAdminController.getAssignments);
router.post('/assessments/:id/assignments', requireCollegeAdmin, assessmentAdminController.createAssignment);
router.delete('/assessments/:id/assignments/:assignmentId', requireCollegeAdmin, assessmentAdminController.revokeAssignment);

// ── Super Admin Platform Routes ─────────────────────────────────────────────
// Dashboard stats & Analytics
router.get('/stats', requireCollegeAdmin, adminController.getStats);
router.get('/stats/analytics', requireCollegeAdmin, adminController.getAnalytics);

// Problem Normalization Pipeline (Super Admin)
router.get('/problems/review-queue', requireSuperAdmin, adminController.getReviewQueue);
router.post('/problems/batch-parse', requireSuperAdmin, adminController.batchParse);
router.get('/normalization/ai-status', requireSuperAdmin, adminController.getAIStatus);

// Problems management (Super Admin, browsing permitted for College Admins in Assessment Builder)
router.get('/problems', requireCollegeAdmin, adminController.getProblems);
router.post('/problems', requireSuperAdmin, adminController.createProblem);
router.post('/problems/generate-examples', requireSuperAdmin, adminController.generateExamples);
router.post('/problems/bulk-action', requireSuperAdmin, adminController.bulkAction);
router.get('/problems/:id', requireSuperAdmin, adminController.getProblem);
router.put('/problems/:id', requireSuperAdmin, adminController.updateProblem);
router.delete('/problems/:id', requireSuperAdmin, adminController.deleteProblem);
router.post('/problems/:id/toggle-status', requireSuperAdmin, adminController.toggleProblemStatus);

// Normalization — parameterized routes (Super Admin)
router.post('/problems/:id/parse', requireSuperAdmin, adminController.parseProblem);
router.post('/problems/:id/normalize', requireSuperAdmin, adminController.normalizeProblem);
router.post('/problems/:id/approve-parsing', requireSuperAdmin, adminController.approveParsing);
router.post('/problems/:id/review-status', requireSuperAdmin, adminController.updateReviewStatus);

// Reference Solution management (Super Admin)
router.get('/problems/:id/reference-solution', requireSuperAdmin, adminController.getReferenceSolution);
router.put('/problems/:id/reference-solution', requireSuperAdmin, adminController.upsertReferenceSolution);
router.delete('/problems/:id/reference-solution', requireSuperAdmin, adminController.deleteReferenceSolution);
router.post('/problems/:id/reference-solution/verify', requireSuperAdmin, adminController.verifyReferenceSolution);

// Automated Test Generation (Super Admin)
router.post('/problems/:id/generate-tests', requireSuperAdmin, adminController.generateTests);

// Test Cases management (Super Admin)
router.get('/problems/:id/test-cases', requireSuperAdmin, adminController.getTestCases);
router.post('/problems/:id/test-cases', requireSuperAdmin, adminController.createTestCase);
router.post('/problems/:id/test-cases/bulk', requireSuperAdmin, adminController.bulkImportTestCases);
router.put('/test-cases/:id', requireSuperAdmin, adminController.updateTestCase);
router.delete('/test-cases/:id', requireSuperAdmin, adminController.deleteTestCase);

// Problem validation (pre-publish check)
router.get('/problems/:id/validate', requireSuperAdmin, adminController.validateProblem);

// Test Case Report (audit)
router.get('/reports/test-cases', requireSuperAdmin, adminController.getTestCaseReport);

// User management (Super Admin)
router.get('/users', requireSuperAdmin, adminController.getUsers);
router.put('/users/:id/role', requireSuperAdmin, adminController.updateUserRole);
router.put('/users/:id/status', requireSuperAdmin, adminController.updateUserStatus);
router.delete('/users/:id', requireSuperAdmin, adminController.deleteUser);

// Submission monitoring
router.get('/submissions', requireSuperAdmin, adminController.getSubmissions);

// ── Assessment Engine — Question Bank Management ────────────────────────────
router.get('/assessment-questions', requireCollegeAdmin, assessmentQuestionController.getQuestions);
router.get('/assessment-questions/batches', requireCollegeAdmin, assessmentQuestionController.getBatches);
router.post('/assessment-questions/import', requireCollegeAdmin, upload.single('file'), assessmentQuestionController.importQuestions);
router.get('/assessment-questions/:id', requireCollegeAdmin, assessmentQuestionController.getQuestion);
router.post('/assessment-questions', requireCollegeAdmin, assessmentQuestionController.createQuestion);
router.put('/assessment-questions/:id', requireCollegeAdmin, assessmentQuestionController.updateQuestion);
router.delete('/assessment-questions/:id', requireCollegeAdmin, assessmentQuestionController.deleteQuestion);
router.post('/assessment-questions/:id/toggle-status', requireCollegeAdmin, assessmentQuestionController.toggleStatus);

// ── Assessment Engine — Assessments & Builder Management ────────────────────
router.get('/assessments', requireCollegeAdmin, assessmentAdminController.getAssessments);
router.post('/assessments', requireCollegeAdmin, assessmentAdminController.createAssessment);
router.get('/assessments/:id', requireCollegeAdmin, assessmentAdminController.getAssessment);
router.put('/assessments/:id', requireCollegeAdmin, assessmentAdminController.updateAssessment);
router.delete('/assessments/:id', requireCollegeAdmin, assessmentAdminController.deleteAssessment);
router.post('/assessments/:id/status', requireCollegeAdmin, assessmentAdminController.toggleStatus);
router.post('/assessments/:id/release-results', requireCollegeAdmin, assessmentAdminController.releaseResults);
router.get('/assessments/:id/attempts', requireCollegeAdmin, assessmentAdminController.getAssessmentAttempts);

// Assessment Sections & Question Population
router.post('/assessments/:id/sections', requireCollegeAdmin, assessmentAdminController.createSection);
router.put('/assessments/:id/sections/reorder', requireCollegeAdmin, assessmentAdminController.reorderSections);
router.put('/assessments/sections/:sectionId', requireCollegeAdmin, assessmentAdminController.updateSection);
router.delete('/assessments/sections/:sectionId', requireCollegeAdmin, assessmentAdminController.deleteSection);
router.post('/assessments/sections/:sectionId/questions', requireCollegeAdmin, assessmentAdminController.addQuestionToSection);
router.put('/assessments/sections/:sectionId/questions/reorder', requireCollegeAdmin, assessmentAdminController.reorderQuestions);
router.put('/assessments/sections/questions/:mappingId', requireCollegeAdmin, assessmentAdminController.updateQuestionMapping);
router.put('/assessments/sections/questions/:mappingId/move', requireCollegeAdmin, assessmentAdminController.moveQuestionBetweenSections);
router.post('/assessments/sections/:sectionId/create-question', requireCollegeAdmin, assessmentAdminController.createQuestionAndAddToSection);
router.delete('/assessments/sections/:sectionId/questions/:mappingId', requireCollegeAdmin, assessmentAdminController.removeQuestionFromSection);
router.delete('/assessments/sections/questions/:mappingId', requireCollegeAdmin, assessmentAdminController.removeQuestionFromSection);
router.post('/assessments/sections/:sectionId/populate-random', requireCollegeAdmin, assessmentAdminController.populateRandomQuestions);

module.exports = router;
