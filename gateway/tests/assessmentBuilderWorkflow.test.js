// gateway/tests/assessmentBuilderWorkflow.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Assessment Builder Pipeline — Comprehensive Workflow Regression Test Suite
// ─────────────────────────────────────────────────────────────────────────────

const adminController = require('../src/controllers/assessmentAdminController');
const studentController = require('../src/controllers/assessmentStudentController');
const eligibilityService = require('../src/services/assessmentEligibilityService');
const db = require('../src/config/database');

jest.mock('../src/config/database');

describe('Assessment Builder End-to-End Workflow & Pipeline', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      query: {},
      user: { id: 'admin-college-1', username: 'dean_college', role: 'college_admin' },
      organizationId: 'org-college-1',
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // ── 1. ASSESSMENT CREATION & SETTINGS ──────────────────────────────────────
  describe('1. Assessment Creation & Settings Persistence', () => {
    it('creates draft assessment with valid slug, bounds, and public settings', async () => {
      mockReq.body = {
        title: 'Placement Assessment 2026',
        category: 'Placement',
        duration_minutes: 60,
        pass_percentage: 45.0,
        is_public: true,
        target_audience: 'public',
      };

      // 1. Slug check (unique)
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 2. INSERT INTO assessments ... RETURNING *
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'assess-new-1',
            title: 'Placement Assessment 2026',
            slug: 'placement-assessment-2026',
            status: 'Draft',
            duration_minutes: 60,
            pass_percentage: 45.0,
            is_public: true,
            target_audience: 'public',
            organization_id: 'org-college-1',
          },
        ],
      });

      // 3. Admin audit log
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.createAssessment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          assessment: expect.objectContaining({
            id: 'assess-new-1',
            is_public: true,
            target_audience: 'public',
          }),
        })
      );
    });

    it('clamps pass_percentage to 0-100 bounds on creation and update', async () => {
      mockReq.body = {
        title: 'Out of Bounds Test',
        duration_minutes: 30,
        pass_percentage: 150, // Should be clamped to 100
      };

      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // Slug check
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'assess-clamp-1', title: 'Out of Bounds Test', pass_percentage: 100 }],
      });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] }); // Audit log

      await adminController.createAssessment(mockReq, mockRes);

      // Verify the query was called with clamped 100
      const insertCallArgs = db.query.mock.calls[1][1];
      expect(insertCallArgs[14]).toBe(100);
    });
  });

  // ── 2. SECTION MANAGEMENT & MIXED TYPES ────────────────────────────────────
  describe('2. Section Management & Safe Numeric Zeros', () => {
    it('creates section supporting 0 marks and 0 negative marks without fallback to 1.0', async () => {
      mockReq.params.id = 'assess-1';
      mockReq.body = {
        title: 'Practice / Ungraded Section',
        description: 'Warmup questions without marks',
        section_type: 'objective',
        duration_minutes: 15,
        marks_per_question: 0,
        negative_marks_per_question: 0,
      };

      // 1. Check assessment ownership
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'assess-1', organization_id: 'org-college-1' }],
      });

      // 2. Section order lookup
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ next_order: 0 }],
      });

      // 3. INSERT INTO assessment_sections
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'sec-zero-1',
            title: 'Practice / Ungraded Section',
            marks_per_question: 0,
            negative_marks_per_question: 0,
          },
        ],
      });

      // 4 & 5. recalculateAssessmentTotal
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.createSection(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const insertArgs = db.query.mock.calls[2][1];
      expect(insertArgs[6]).toBe(15); // duration_minutes
      expect(insertArgs[7]).toBe(0); // marks_per_question
      expect(insertArgs[8]).toBe(0); // negative_marks_per_question
    });

    it('enforces section type constraint by rejecting adding a coding problem to an objective section', async () => {
      mockReq.params.sectionId = 'sec-mcq-1';
      mockReq.body = { problem_id: 'problem-dsa-1' };

      // 1. Lookup section (currently objective)
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-mcq-1', assessment_id: 'assess-1', organization_id: 'org-college-1', section_type: 'objective' }],
      });

      await adminController.addQuestionToSection(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Cannot add coding problems to an objective'),
        })
      );
    });

    it('enforces section type constraint by rejecting adding an objective question to a coding section', async () => {
      mockReq.params.sectionId = 'sec-code-1';
      mockReq.body = { question_id: 'q-math-1' };

      // 1. Lookup section (currently coding)
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-code-1', assessment_id: 'assess-1', organization_id: 'org-college-1', section_type: 'coding' }],
      });

      await adminController.addQuestionToSection(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Cannot add objective questions to a coding section'),
        })
      );
    });

    it('supports batch adding multiple questions into a mixed or objective section', async () => {
      mockReq.params.sectionId = 'sec-mcq-1';
      mockReq.body = { question_ids: ['q-1', 'q-2'] };

      // 1. Lookup section
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-mcq-1', assessment_id: 'assess-1', organization_id: 'org-college-1', section_type: 'objective' }],
      });

      // 2. Starting order index
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ next_order: 0 }] });

      // 3. Dup check q-1
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 4. Insert q-1
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'm-1', question_id: 'q-1' }] });

      // 5. Dup check q-2
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 6. Insert q-2
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'm-2', question_id: 'q-2' }] });

      // 7 & 8. recalculateAssessmentTotal
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.addQuestionToSection(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          added_count: 2,
        })
      );
    });
  });

  // ── 3. QUESTION CREATION VALIDATION ───────────────────────────────────────
  describe('3. Inline Question Creation & Validation', () => {
    it('validates objective questions before creating and blocks invalid options', async () => {
      mockReq.params.sectionId = 'sec-1';
      mockReq.body = {
        category: 'Quantitative Aptitude',
        topic: 'Algebra',
        question_text: 'Invalid Question with only 1 option',
        question_type: 'single_choice',
        options: [{ id: 'a', text: 'Single Option' }],
        correct_answer: 'a',
      };

      // 1. Lookup section
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-1', assessment_id: 'assess-1', organization_id: 'org-college-1', section_type: 'objective' }],
      });

      await adminController.createQuestionAndAddToSection(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/at least 2 options/i),
        })
      );
    });

    it('creates valid 2-option (True/False) questions successfully', async () => {
      mockReq.params.sectionId = 'sec-1';
      mockReq.body = {
        category: 'Logical Reasoning',
        topic: 'Deduction',
        question_text: 'Is KodeChirp an assessment engine?',
        question_type: 'single_choice',
        options: [
          { id: 'a', text: 'True' },
          { id: 'b', text: 'False' },
        ],
        correct_answer: 'a',
      };

      // 1. Lookup section
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-1', assessment_id: 'assess-1', organization_id: 'org-college-1', section_type: 'objective' }],
      });

      // 2. Content hash check (not found)
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 3. INSERT INTO assessment_questions
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'q-new-tf-1' }],
      });

      // 4. Duplicate in section check
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 5. Order index
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ next_order: 0 }] });

      // 6. INSERT INTO assessment_section_questions
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'map-tf-1', section_id: 'sec-1', question_id: 'q-new-tf-1' }],
      });

      // 7 & 8. recalculateAssessmentTotal
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.createQuestionAndAddToSection(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          questionId: 'q-new-tf-1',
        })
      );
    });
  });

  // ── 4. CANDIDATE ACCESSIBILITY & ELIGIBILITY ──────────────────────────────
  describe('4. Candidate Access & Eligibility', () => {
    it('allows students to access and attempt public assessments without college roster membership', async () => {
      const publicAssessment = {
        id: 'assess-public-1',
        title: 'Open National Coding Challenge',
        organization_id: 'org-college-1',
        is_public: true,
        target_audience: 'public',
        max_attempts: 2,
      };

      const result = await eligibilityService.checkStudentEligibility({
        assessment: publicAssessment,
        userId: 'student-external-1',
        userRole: 'student',
      });

      expect(result.eligible).toBe(true);
      expect(result.maxAttempts).toBe(2);
    });

    it('restricts organization-scoped assessments from unauthorized external students', async () => {
      const orgAssessment = {
        id: 'assess-org-1',
        title: 'Internal College Exam',
        organization_id: 'org-college-1',
        is_public: false,
        target_audience: 'organization',
        max_attempts: 1,
      };

      // Mock organization lookup: student is NOT a member
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            role: null,
            student_id_number: null,
            organization_name: 'Apex Engineering College',
            organization_active: true,
          },
        ],
      });

      const result = await eligibilityService.checkStudentEligibility({
        assessment: orgAssessment,
        userId: 'student-external-1',
        userRole: 'student',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/restricted to enrolled students/i);
    });
  });
});
