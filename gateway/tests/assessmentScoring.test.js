// gateway/tests/assessmentScoring.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Scoring Engine & Evaluation Tests
// ─────────────────────────────────────────────────────────────────────────────

const studentController = require('../src/controllers/assessmentStudentController');
const db = require('../src/config/database');

jest.mock('../src/config/database');

describe('Assessment Scoring & Evaluation Engine', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      user: { id: 'student-uuid-1', role: 'user' },
      params: { attemptId: 'att-123' },
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('correctly calculates total score with positive, negative, and unanswered marks', async () => {
    // 1. Mock attempt lookup in submitAttempt
    db.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'att-123', user_id: 'student-uuid-1', assessment_id: 'assess-1', is_finalized: false }],
      })
      // 2. In finalizeAndScoreAttempt -> lookup attempt again
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'att-123', user_id: 'student-uuid-1', assessment_id: 'assess-1' }],
      })
      // 3. Lookup sections (1 section)
      .mockResolvedValueOnce({
        rows: [{ id: 'sec-1', title: 'Quantitative Aptitude', marks_per_question: 2.0, negative_marks_per_question: 0.5 }],
      })
      // 4. Lookup questions in section (3 questions)
      .mockResolvedValueOnce({
        rows: [
          {
            mapping_id: 'm-1',
            question_id: 'q-1',
            marks: 2.0,
            negative_marks: 0.5,
            question_type: 'single_choice',
            correct_answer: 'a',
          },
          {
            mapping_id: 'm-2',
            question_id: 'q-2',
            marks: 2.0,
            negative_marks: 0.5,
            question_type: 'single_choice',
            correct_answer: 'b',
          },
          {
            mapping_id: 'm-3',
            question_id: 'q-3',
            marks: 2.0,
            negative_marks: 0.5,
            question_type: 'single_choice',
            correct_answer: 'c',
          },
        ],
      })
      // Q1 response: student answered 'a' (CORRECT: +2.0)
      .mockResolvedValueOnce({
        rows: [{ id: 'resp-1', selected_options: 'a' }],
      })
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE response 1
      // Q2 response: student answered 'c' (WRONG: -0.5)
      .mockResolvedValueOnce({
        rows: [{ id: 'resp-2', selected_options: 'c' }],
      })
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE response 2
      // Q3 response: UNANSWERED (0)
      .mockResolvedValueOnce({
        rows: [],
      })
      // Finalize attempt in DB
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'att-123',
            total_score: 1.5, // 2.0 - 0.5 = 1.5
            max_marks: 6.0,
            percentage: 25.0,
            correct_count: 1,
            incorrect_count: 1,
            unanswered_count: 1,
            status: 'evaluated',
            is_finalized: true,
          },
        ],
      });

    await studentController.submitAttempt(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        result: expect.objectContaining({
          total_score: 1.5,
          max_marks: 6.0,
          correct_count: 1,
          incorrect_count: 1,
          unanswered_count: 1,
          is_finalized: true,
        }),
      })
    );
  });
});
