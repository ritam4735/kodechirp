// gateway/tests/secureAssessmentMode.test.js
// ─────────────────────────────────────────────────────────────────────────────
// KodeChirp Secure Assessment Mode — Automated Test Suite
// Fullscreen enforcement, Violation Detection, Auto-Submission & Audit Trail
// ─────────────────────────────────────────────────────────────────────────────

const studentController = require('../src/controllers/assessmentStudentController');
const adminController = require('../src/controllers/assessmentAdminController');
const db = require('../src/config/database');

jest.mock('../src/config/database');

describe('KodeChirp Secure Assessment Mode', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      user: { id: 'student-uuid-1', username: 'student1', role: 'user' },
      params: {},
      body: {},
      query: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0 TestBrowser'),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // ── 1. SECURE MODE CONFIGURATION & METADATA ────────────────────────────────
  describe('Assessment Creation & Policy Configuration', () => {
    it('creates an assessment with is_secure_mode and custom security_policy', async () => {
      mockReq.user = { id: 'admin-uuid-1', role: 'admin' };
      mockReq.organizationId = 'org-1';
      mockReq.body = {
        title: 'Strict Proctored Placement Exam',
        duration_minutes: 90,
        is_secure_mode: true,
        security_policy: {
          require_fullscreen: true,
          prevent_tab_switch: true,
          prevent_clipboard: true,
          prevent_navigation: true,
          auto_submit_on_violation: true,
        },
      };

      // slug check returns 0
      db.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // slug check
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'assess-sec-1',
              title: 'Strict Proctored Placement Exam',
              slug: 'strict-proctored-placement-exam',
              is_secure_mode: true,
              security_policy: mockReq.body.security_policy,
            },
          ],
        }); // insert query

      await adminController.createAssessment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          assessment: expect.objectContaining({
            is_secure_mode: true,
            security_policy: expect.objectContaining({
              require_fullscreen: true,
              auto_submit_on_violation: true,
            }),
          }),
        })
      );
    });

    it('returns secure mode metadata on startAttempt', async () => {
      mockReq.params = { id: 'assess-sec-1' };

      // Assessment fetch
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'assess-sec-1',
              status: 'Published',
              max_attempts: 1,
              total_marks: 50,
              duration_minutes: 60,
              is_secure_mode: true,
              security_policy: { auto_submit_on_violation: true },
            },
          ],
        })
        // Check in-progress attempts
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        // Check attempt count
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 0 }] })
        // Count total questions
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ total: 10 }] })
        // Insert attempt
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'att-sec-1',
              started_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 3600000).toISOString(),
            },
          ],
        });

      await studentController.startAttempt(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          attemptId: 'att-sec-1',
          is_secure_mode: true,
          security_policy: expect.objectContaining({ auto_submit_on_violation: true }),
        })
      );
    });
  });

  // ── 2. VIOLATION DETECTION & AUTOMATIC FINALIZATION ────────────────────────
  describe('Violation Detection and Immediate Finalization', () => {
    it('automatically finalizes attempt and calculates score when tab_hidden violation occurs in strict mode', async () => {
      mockReq.params = { attemptId: 'att-sec-1' };
      mockReq.body = {
        event_type: 'tab_hidden',
        details: { timestamp: new Date().toISOString(), reason: 'document hidden' },
      };

      // 1. Check attempt & policy
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-sec-1',
            assessment_id: 'assess-sec-1',
            user_id: 'student-uuid-1',
            is_finalized: false,
            status: 'in_progress',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            is_secure_mode: true,
            security_policy: { auto_submit_on_violation: true },
            violations: [],
          },
        ],
      });

      // 2. finalizeAndScoreAttempt: query attempt
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-sec-1',
            assessment_id: 'assess-sec-1',
            user_id: 'student-uuid-1',
            is_finalized: false,
            status: 'in_progress',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            violations: [],
          },
        ],
      });

      // 3. finalizeAndScoreAttempt: query sections
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sec-1', title: 'Aptitude Section' }],
      });

      // 4. finalizeAndScoreAttempt: query section questions
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            mapping_id: 'map-1',
            question_id: 'q-1',
            marks: 2,
            negative_marks: 0.5,
            question_type: 'single_choice',
            correct_answer: 'b',
          },
        ],
      });

      // 5. finalizeAndScoreAttempt: query candidate response
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'resp-1', selected_options: 'b' }],
      });

      // 6. finalizeAndScoreAttempt: update assessment_responses
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      // 7. finalizeAndScoreAttempt: update assessment_attempts
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-sec-1',
            status: 'evaluated',
            is_finalized: true,
            is_terminated_by_violation: true,
            submission_reason: 'tab_hidden',
            total_score: 2.0,
            percentage: 100.0,
          },
        ],
      });

      // 8. finalizeAndScoreAttempt: insert into assessment_violation_logs
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await studentController.recordViolation(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          terminated: true,
          submission_reason: 'tab_hidden',
          result: expect.objectContaining({
            is_terminated_by_violation: true,
            submission_reason: 'tab_hidden',
            total_score: 2.0,
          }),
        })
      );
    });

    it('automatically terminates exam on fullscreen_exited event', async () => {
      mockReq.params = { attemptId: 'att-sec-2' };
      mockReq.body = {
        event_type: 'fullscreen_exited',
        details: { timestamp: new Date().toISOString() },
      };

      // 1. Attempt check
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-sec-2',
            assessment_id: 'assess-sec-1',
            user_id: 'student-uuid-1',
            is_finalized: false,
            status: 'in_progress',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            is_secure_mode: true,
            security_policy: { auto_submit_on_violation: true },
            violations: [],
          },
        ],
      });

      // 2. finalize: attempt check
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-sec-2',
            assessment_id: 'assess-sec-1',
            user_id: 'student-uuid-1',
            is_finalized: false,
            status: 'in_progress',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            violations: [],
          },
        ],
      });

      // 3. finalize: sections
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 4. finalize: update attempt
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-sec-2',
            is_finalized: true,
            is_terminated_by_violation: true,
            submission_reason: 'fullscreen_exited',
            terminated_reason: 'Full-screen mode was exited during strict secure assessment.',
          },
        ],
      });

      // 5. violation logs insert
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await studentController.recordViolation(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          terminated: true,
          submission_reason: 'fullscreen_exited',
        })
      );
    });

    it('rejects attempt modification once terminated by violation', async () => {
      mockReq.params = { attemptId: 'att-sec-1' };
      mockReq.body = {
        section_id: 'sec-1',
        question_id: 'q-1',
        selected_options: 'c',
      };

      // Attempt is already terminated by violation
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-sec-1',
            user_id: 'student-uuid-1',
            status: 'evaluated',
            is_finalized: true,
            is_terminated_by_violation: true,
          },
        ],
      });

      await studentController.saveResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Cannot modify responses on a submitted attempt',
        })
      );
    });

    it('idempotently handles repeated submission or violation events', async () => {
      mockReq.params = { attemptId: 'att-sec-1' };
      mockReq.body = {
        event_type: 'tab_hidden',
      };

      // Attempt was already finalized
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'att-sec-1',
            user_id: 'student-uuid-1',
            is_finalized: true,
            status: 'evaluated',
            submission_reason: 'tab_hidden',
            is_terminated_by_violation: true,
          },
        ],
      });

      await studentController.recordViolation(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Assessment is already submitted',
          is_finalized: true,
        })
      );
    });
  });

  // ── 3. AUDIT TRAIL LOGGING ─────────────────────────────────────────────────
  describe('Violation Audit Trail & Administration', () => {
    it('retrieves candidate violation audit trail for an assessment attempt', async () => {
      mockReq.user = { id: 'admin-1', role: 'college_admin' };
      mockReq.organizationId = 'org-1';
      mockReq.params = { attemptId: 'att-sec-1' };

      // Query attempt with org
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'att-sec-1', organization_id: 'org-1' }],
        })
        // Query violation logs
        .mockResolvedValueOnce({
          rowCount: 2,
          rows: [
            {
              id: 'vl-1',
              attempt_id: 'att-sec-1',
              event_type: 'fullscreen_exited',
              details: { reason: 'User pressed Escape' },
              ip_address: '127.0.0.1',
              occurred_at: new Date().toISOString(),
            },
            {
              id: 'vl-2',
              attempt_id: 'att-sec-1',
              event_type: 'tab_hidden',
              details: { reason: 'document hidden' },
              ip_address: '127.0.0.1',
              occurred_at: new Date().toISOString(),
            },
          ],
        });

      await adminController.getAttemptViolations(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          violations: expect.arrayContaining([
            expect.objectContaining({ event_type: 'fullscreen_exited' }),
            expect.objectContaining({ event_type: 'tab_hidden' }),
          ]),
        })
      );
    });
  });
});
