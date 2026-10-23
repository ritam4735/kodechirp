// gateway/tests/assessmentPipeline.test.js
// ─────────────────────────────────────────────────────────────────────────────
// KodeChirp Assessment Creation & Pipeline Audit — Automated Test Suite
// ─────────────────────────────────────────────────────────────────────────────

const adminController = require('../src/controllers/assessmentAdminController');
const studentController = require('../src/controllers/assessmentStudentController');
const db = require('../src/config/database');

jest.mock('../src/config/database');

describe('Assessment Creation & Management Pipeline Audit', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      query: {},
      user: { id: 'admin-1', username: 'college_admin_1', role: 'college_admin' },
      organizationId: 'org-apex-1',
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // ── 1. ASSESSMENT METADATA & DRAFT SETTINGS ───────────────────────────────
  describe('1. Assessment Draft & Metadata Settings', () => {
    it('updates assessment settings including title, duration, schedule, and randomization', async () => {
      mockReq.params.id = 'assess-1';
      mockReq.body = {
        title: 'Midterm Engineering Placement Mock',
        description: 'Comprehensive aptitude and technical assessment',
        instructions: 'Read questions carefully before submitting.',
        category: 'Placement',
        duration_minutes: 90,
        pass_percentage: 50.0,
        max_attempts: 2,
        starts_at: '2026-11-01T09:00:00Z',
        ends_at: '2026-11-01T18:00:00Z',
        randomize_questions: true,
        randomize_options: true,
        default_negative_marking: true,
      };

      // 1. SELECT * FROM assessments WHERE id = $1
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'assess-1',
            organization_id: 'org-apex-1',
            title: 'Old Title',
            status: 'Draft',
          },
        ],
      });

      // 2. UPDATE assessments ... RETURNING *
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'assess-1',
            organization_id: 'org-apex-1',
            title: mockReq.body.title,
            duration_minutes: 90,
            pass_percentage: 50.0,
            status: 'Draft',
          },
        ],
      });

      // 3. Admin audit log
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.updateAssessment(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          assessment: expect.objectContaining({
            title: 'Midterm Engineering Placement Mock',
            duration_minutes: 90,
          }),
        })
      );
    });

    it('enforces tenant isolation: college admin cannot update assessment belonging to another college', async () => {
      mockReq.params.id = 'assess-foreign-1';
      mockReq.body = { title: 'Unauthorized Modification' };

      // Assessment belongs to org-other-999, but user is in org-apex-1
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'assess-foreign-1', organization_id: 'org-other-999', title: 'Foreign College Assessment' }],
      });

      await adminController.updateAssessment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/belonging to another organization/i),
        })
      );
    });
  });

  // ── 2. SECTION MANAGEMENT & REORDERING ────────────────────────────────────
  describe('2. Section Management & Reordering', () => {
    it('creates section in draft assessment within college scope', async () => {
      mockReq.params.assessmentId = 'assess-1';
      mockReq.body = {
        title: 'Quantitative Aptitude',
        description: 'Arithmetic and Number Systems',
        section_type: 'objective',
        duration_minutes: 30,
        marks_per_question: 1.0,
        negative_marks_per_question: 0.25,
      };

      // 1. Check assessment ownership
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'assess-1', organization_id: 'org-apex-1' }],
      });

      // 2. Count existing sections for section_order
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ count: 0 }],
      });

      // 3. INSERT INTO assessment_sections
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'sec-1',
            assessment_id: 'assess-1',
            title: 'Quantitative Aptitude',
            section_order: 0,
            section_type: 'objective',
          },
        ],
      });

      await adminController.createSection(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          section: expect.objectContaining({ title: 'Quantitative Aptitude' }),
        })
      );
    });

    it('reorders sections atomically preserving new order', async () => {
      mockReq.params.id = 'assess-1';
      mockReq.body = {
        section_ids: ['sec-2', 'sec-1', 'sec-3'],
      };

      // 1. Verify assessment ownership
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ organization_id: 'org-apex-1' }],
      });

      // 2. Updates for sec-2, sec-1, sec-3
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.reorderSections(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/sections reordered successfully/i),
        })
      );
    });

    it('safely deletes section and mappings WITHOUT deleting shared question bank questions', async () => {
      mockReq.params.sectionId = 'sec-1';

      // 1. Lookup section and joined assessment for ownership
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-1', assessment_id: 'assess-1', organization_id: 'org-apex-1' }],
      });

      // 2. DELETE FROM assessment_sections (cascades to assessment_section_questions ONLY)
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      // 3. Normalize remaining sections query
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 4. recalculateAssessmentTotal (update sections & update assessment)
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.deleteSection(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/deleted/i),
        })
      );

      // Verify that no query to DELETE FROM assessment_questions or problems was executed!
      const allQueries = db.query.mock.calls.map((c) => c[0].toUpperCase());
      const deletedQuestions = allQueries.some(
        (q) => q.includes('DELETE FROM ASSESSMENT_QUESTIONS') || q.includes('DELETE FROM PROBLEMS')
      );
      expect(deletedQuestions).toBe(false);
    });
  });

  // ── 3. QUESTION MANAGEMENT & MARKS OVERRIDES ──────────────────────────────
  describe('3. Question Management, Reordering & Overrides', () => {
    it('adds question from bank and prevents duplicate mappings in the same section', async () => {
      mockReq.params.sectionId = 'sec-1';
      mockReq.body = { question_id: 'q-bank-1' };

      // 1. Lookup section & assessment ownership
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-1', assessment_id: 'assess-1', organization_id: 'org-apex-1', section_type: 'objective' }],
      });

      // 2. Duplicate check in section
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'existing-mapping' }], // Already mapped!
      });

      await adminController.addQuestionToSection(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/already added to this section/i),
        })
      );
    });

    it('overrides marks and negative marks for a specific assessment item', async () => {
      mockReq.params.mappingId = 'map-1';
      mockReq.body = {
        marks_override: 3.0,
        negative_marks_override: 0.5,
      };

      // 1. Check ownership via mapping -> section -> assessment
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'map-1', section_id: 'sec-1', assessment_id: 'assess-1', organization_id: 'org-apex-1' }],
      });

      // 2. UPDATE assessment_section_questions
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'map-1',
            marks_override: 3.0,
            negative_marks_override: 0.5,
          },
        ],
      });

      // 3 & 4. recalculateAssessmentTotal
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.updateQuestionMapping(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          mapping: expect.objectContaining({
            marks_override: 3.0,
            negative_marks_override: 0.5,
          }),
        })
      );
    });

    it('moves a question between sections in the same assessment', async () => {
      mockReq.params.mappingId = 'map-1';
      mockReq.body = { target_section_id: 'sec-2' };

      // 1. Check current mapping & ownership
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'map-1',
            section_id: 'sec-1',
            question_id: 'q-1',
            problem_id: null,
            assessment_id: 'assess-1',
            organization_id: 'org-apex-1',
          },
        ],
      });

      // 2. Check target section belongs to same assessment
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-2', assessment_id: 'assess-1', organization_id: 'org-apex-1', section_type: 'objective' }],
      });

      // 3. Duplicate check in target section
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 4. Max question order in target section
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ next_order: 4 }] });

      // 5. UPDATE mapping with new section_id
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'map-1', section_id: 'sec-2', order_index: 4 }],
      });

      // 6 & 7. recalculateAssessmentTotal
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.moveQuestionBetweenSections(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/moved.*successfully/i),
        })
      );
    });

    it('reorders questions within a section', async () => {
      mockReq.params.sectionId = 'sec-1';
      mockReq.body = {
        mapping_ids: ['map-2', 'map-1', 'map-3'],
      };

      // 1. Ownership check
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-1', assessment_id: 'assess-1', organization_id: 'org-apex-1' }],
      });

      // 2. Updates for map-2, map-1, map-3
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.reorderQuestions(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/questions reordered successfully/i),
        })
      );
    });

    it('removes question mapping from assessment without altering question bank record', async () => {
      mockReq.params.mappingId = 'map-1';

      // 1. Check ownership
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'map-1', section_id: 'sec-1', assessment_id: 'assess-1', organization_id: 'org-apex-1' }],
      });

      // 2. DELETE FROM assessment_section_questions
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      // 3 & 4. recalculateAssessmentTotal
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.removeQuestionFromSection(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/removed/i),
        })
      );
    });
  });

  // ── 4. PRE-PUBLISH INTEGRITY VALIDATION ────────────────────────────────────
  describe('4. Pre-Publish Validation and Integrity', () => {
    it('blocks publishing when assessment contains empty sections', async () => {
      mockReq.params.id = 'assess-1';
      mockReq.body = { status: 'Published' };

      // 1. Lookup assessment
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'assess-1',
            organization_id: 'org-apex-1',
            title: 'Placement Test 2026',
            duration_minutes: 60,
          },
        ],
      });

      // 2. Sections in assessment
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'sec-empty-1',
            title: 'Empty Verbal Ability Section',
            section_order: 0,
            section_type: 'objective',
          },
        ],
      });

      // 3. Question count in section: 0 questions!
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ count: 0 }],
      });

      // 4. Objective questions query
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await adminController.toggleStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          issues: expect.arrayContaining([expect.stringMatching(/has no questions/i)]),
        })
      );
    });

    it('blocks publishing if objective question has fewer than 2 options or missing correct answer', async () => {
      mockReq.params.id = 'assess-1';
      mockReq.body = { status: 'Published' };

      // 1. Lookup assessment
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'assess-1', organization_id: 'org-apex-1', title: 'Test', duration_minutes: 60 }],
      });

      // 2. Section query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-1', title: 'Quantitative', section_order: 0, section_type: 'objective' }],
      });

      // 3. Question count
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 1 }] });

      // 4. Objective question detail: options array has only 1 option!
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'q-broken-1',
            question_text: 'Broken Question',
            question_type: 'single_choice',
            options: ['Option A'], // Only 1 option!
            correct_answer: null, // Missing correct answer!
          },
        ],
      });

      await adminController.toggleStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          issues: expect.arrayContaining([
            expect.stringMatching(/at least 2 options/i),
            expect.stringMatching(/missing a correct answer/i),
          ]),
        })
      );
    });

    it('successfully publishes assessment when all integrity checks pass', async () => {
      mockReq.params.id = 'assess-1';
      mockReq.body = { status: 'Published' };

      // 1. Lookup assessment
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'assess-1', organization_id: 'org-apex-1', title: 'Valid Test', duration_minutes: 60 }],
      });

      // 2. Sections query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-1', title: 'Quantitative', section_order: 0, section_type: 'objective' }],
      });

      // 3. Question count query
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 5 }] });

      // 4. Objective questions query: valid options and correct answer
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'q-valid-1',
            question_text: 'Valid Question',
            question_type: 'single_choice',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_answer: 'A',
          },
        ],
      });

      // 5 & 6. recalculateAssessmentTotal
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      // 7. UPDATE assessments SET status = 'Published' ...
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'assess-1', status: 'Published' }],
      });

      // 8. Audit log query
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await adminController.toggleStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          assessment: expect.objectContaining({ status: 'Published' }),
        })
      );
    });
  });

  // ── 5. STUDENT ATTEMPT & SECURE RETRIEVAL ──────────────────────────────────
  describe('5. Student Attempt Payload Protection', () => {
    it('never leaks correct answers or explanations in active attempt payload', async () => {
      const studentReq = {
        params: { attemptId: 'att-1' },
        user: { id: 'student-uuid', role: 'student' },
        organizationId: 'org-apex-1',
      };

      // 1. Attempt lookup joined with assessment
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-1',
            assessment_id: 'assess-1',
            user_id: 'student-uuid',
            status: 'in_progress',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            assessment_title: 'Placement Exam',
            randomize_questions: false,
            randomize_options: false,
          },
        ],
      });

      // 2. Sections query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'sec-1',
            title: 'Quantitative',
            section_order: 0,
            section_type: 'objective',
            duration_minutes: 60,
            marks_per_question: 1.0,
            negative_marks_per_question: 0.25,
          },
        ],
      });

      // 3. Responses query
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 4. Questions in section query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            mapping_id: 'map-1',
            order_index: 0,
            marks: 1.0,
            negative_marks: 0.25,
            question_id: 'q-1',
            question_text: 'Find X in 2X = 10',
            question_type: 'single_choice',
            options: ['2', '5', '10', '20'],
            problem_id: null,
          },
        ],
      });

      await studentController.getAttemptData(studentReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      const returnedQuestions = responseData.sections[0].questions;

      expect(returnedQuestions[0].correct_answer).toBeUndefined();
      expect(returnedQuestions[0].explanation).toBeUndefined();
      expect(returnedQuestions[0].question_text).toBe('Find X in 2X = 10');
      expect(returnedQuestions[0].marks).toBe(1.0);
    });
  });
});
