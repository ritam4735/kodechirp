// gateway/tests/assessmentEngine.test.js
// ─────────────────────────────────────────────────────────────────────────────
// KodeChirp Assessment Engine — Automated Test Suite
// ─────────────────────────────────────────────────────────────────────────────

const questionController = require('../src/controllers/assessmentQuestionController');
const adminController = require('../src/controllers/assessmentAdminController');
const studentController = require('../src/controllers/assessmentStudentController');
const db = require('../src/config/database');

jest.mock('../src/config/database');

describe('KodeChirp Assessment Engine', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    db.query.mockReset();
    mockReq = {
      user: { id: 'admin-uuid-1', username: 'admin1', role: 'admin' },
      params: {},
      body: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // ── 1. QUESTION BANK TESTS ─────────────────────────────────────────────────
  describe('Question Bank Controller', () => {
    it('returns questions with count and category dropdowns', async () => {
      mockReq.query = { category: 'Quantitative Aptitude', limit: 10, offset: 0 };

      db.query
        .mockResolvedValueOnce({ rows: [{ total: 20 }] }) // count query
        .mockResolvedValueOnce({ rows: [{ total_all: 250 }] }) // total all
        .mockResolvedValueOnce({ rows: [{ id: 'q-1', question_text: 'Find unit digit' }] }) // data query
        .mockResolvedValueOnce({ rows: [{ category: 'Quantitative Aptitude' }] }) // categories
        .mockResolvedValueOnce({ rows: [{ topic: 'Unit Digit', category: 'Quantitative Aptitude' }] }); // topics

      await questionController.getQuestions(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total: 20,
          totalAll: 250,
          questions: expect.any(Array),
          categories: ['Quantitative Aptitude'],
        })
      );
    });

    it('rejects question creation if required fields are missing', async () => {
      mockReq.body = { category: '', topic: 'Unit Digit' };

      await questionController.createQuestion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Category, topic, and question text are required',
      });
    });

    it('prevents duplicate questions with identical content hash', async () => {
      mockReq.body = {
        category: 'Quantitative Aptitude',
        topic: 'Unit Digit',
        question_text: 'Find unit digit of 25 * 36',
      };

      // Mock duplicate check found 1 row
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-q' }] });

      await questionController.createQuestion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'A question with identical content already exists',
      });
    });

    it('normalizes options and answer key to lowercase and inserts successfully', async () => {
      mockReq.body = {
        category: 'Quantitative Aptitude',
        topic: 'Unit Digit',
        question_text: 'What is 10 + 20?',
        options: [
          { id: 'A', text: '30' },
          { id: 'B', text: '40' },
        ],
        correct_answer: 'A',
      };

      // Mock duplicate check found 0 rows
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Mock insert returning created question
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'q-new',
            options: [
              { id: 'a', text: '30' },
              { id: 'b', text: '40' },
            ],
            correct_answer: 'a',
          },
        ],
      });

      await questionController.createQuestion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const inserted = mockRes.json.mock.calls[0][0].question;
      expect(inserted.options[0].id).toBe('a');
      expect(inserted.correct_answer).toBe('a');
    });

    it('rejects deleteQuestion if referenced in an assessment section', async () => {
      mockReq.params.id = 'q-in-use';

      // Mock check in assessment_section_questions returns referenced assessment
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'a-1', title: 'Midterm Test', status: 'Draft' }],
      });

      await questionController.deleteQuestion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('referenced in assessment(s): "Midterm Test"'),
        })
      );
    });
  });

  // ── 2. ASSESSMENT BUILDER TESTS ───────────────────────────────────────────
  describe('Assessment Builder Controller', () => {
    it('prevents publishing an assessment with zero sections or questions', async () => {
      mockReq.params.id = 'assess-1';
      mockReq.body = { status: 'Published' };

      // Mock section count and question count as 0
      db.query.mockResolvedValueOnce({
        rows: [{ section_count: 0, question_count: 0 }],
      });

      await adminController.toggleStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Cannot publish an assessment with zero sections',
        })
      );
    });

    it('validates candidate pool before populating random questions', async () => {
      mockReq.params.sectionId = 'sec-1';
      mockReq.body = {
        category: 'Quantitative Aptitude',
        topic: 'Unit Digit',
        count: 50, // Request 50 when only 10 exist
      };

      // Mock section lookup
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-1', assessment_id: 'assess-1' }],
      });

      // Mock count of available matching questions
      db.query.mockResolvedValueOnce({
        rows: [{ count: 10 }],
      });

      await adminController.populateRandomQuestions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          available: 10,
          requested: 50,
        })
      );
    });
  });

  // ── 3. STUDENT ATTEMPT & SECURITY TESTS ─────────────────────────────────────
  describe('Student Attempt Security & Payload Safety', () => {
    it('NEVER leaks correct answers or explanations in active attempt payload', async () => {
      mockReq.params.attemptId = 'att-1';
      mockReq.user = { id: 'student-1', role: 'user' };

      const futureDate = new Date(Date.now() + 3600 * 1000);

      // Mock attempt lookup
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-1',
            user_id: 'student-1',
            assessment_id: 'assess-1',
            status: 'in_progress',
            started_at: new Date(),
            expires_at: futureDate,
            is_finalized: false,
          },
        ],
      });

      // Mock sections lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'sec-1', title: 'Quantitative Aptitude' }],
      });

      // Mock saved responses
      db.query.mockResolvedValueOnce({ rows: [] });

      // Mock section questions lookup
      db.query.mockResolvedValueOnce({
        rows: [
          {
            mapping_id: 'm-1',
            order_index: 0,
            marks: 2.0,
            negative_marks: 0.5,
            question_id: 'q-1',
            problem_id: null,
            category: 'Quantitative Aptitude',
            topic: 'Unit Digit',
            difficulty: 'Medium',
            question_type: 'single_choice',
            question_text: 'Find unit digit of (25 * 36)',
            options: [
              { id: 'a', text: '0' },
              { id: 'b', text: '5' },
            ],
            // Note: correct_answer and explanation are deliberately omitted by SQL query
          },
        ],
      });

      await studentController.getAttemptData(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const payload = mockRes.json.mock.calls[0][0];

      expect(payload.success).toBe(true);
      const question = payload.sections[0].questions[0];

      // CRITICAL SECURITY ASSERTION
      expect(question.correct_answer).toBeUndefined();
      expect(question.explanation).toBeUndefined();
      expect(question.options).toHaveLength(2);
    });

    it('enforces IDOR protection when student attempts to access another user attempt', async () => {
      mockReq.params.attemptId = 'att-2';
      mockReq.user = { id: 'attacker-id', role: 'user' };

      // Attempt belongs to 'victim-id'
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-2',
            user_id: 'victim-id',
            assessment_id: 'assess-1',
            status: 'in_progress',
          },
        ],
      });

      await studentController.getAttemptData(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied to this attempt',
      });
    });

    it('rejects answer modifications once an attempt has been finalized', async () => {
      mockReq.params.attemptId = 'att-submitted';
      mockReq.user = { id: 'student-1' };
      mockReq.body = {
        section_id: 'sec-1',
        question_id: 'q-1',
        selected_options: 'b',
      };

      // Mock attempt is already evaluated
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-submitted',
            user_id: 'student-1',
            status: 'evaluated',
            is_finalized: true,
            expires_at: new Date(Date.now() + 10000),
          },
        ],
      });

      await studentController.saveResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot modify responses on a submitted attempt',
      });
    });

    it('withholds detailed attempt results when results have not been released', async () => {
      mockReq.params.attemptId = 'att-submitted-withheld';
      mockReq.user = { id: 'student-1', role: 'user' };

      // Mock attempt query where show_results_immediately is false and results_released_at is null
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-submitted-withheld',
            user_id: 'student-1',
            status: 'evaluated',
            show_results_immediately: false,
            results_released_at: null,
            assessment_title: 'Midterm Test',
          },
        ],
      });

      await studentController.getAttemptResult(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          result: expect.objectContaining({
            results_withheld: true,
            message: expect.stringContaining('released once published by your institution'),
          }),
        })
      );
    });
  });

  describe('Assessment Administration - Result Release', () => {
    it('releases assessment results and sets results_released_at', async () => {
      mockReq.params.id = 'assess-1';
      mockReq.user = { id: 'admin-1', role: 'admin', email: 'admin@kodechirp.com' };

      // Mock assessment query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'assess-1', title: 'Placement Test 1', organization_id: 'org-1' }],
      });
      // Mock UPDATE query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'assess-1', show_results_immediately: true, results_released_at: new Date() }],
      });
      // Mock audit log INSERT
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      await adminController.releaseResults(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Assessment results have been successfully released to all participating students',
        })
      );
    });
  });
});
