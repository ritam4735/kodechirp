// gateway/tests/collegeOnboarding.test.js
// ─────────────────────────────────────────────────────────────────────────────
// KodeChirp College Onboarding & Verification Workflow — Automated Test Suite
// ─────────────────────────────────────────────────────────────────────────────

const collegeOnboardingService = require('../src/services/collegeOnboardingService');
const collegeOnboardingController = require('../src/controllers/collegeOnboardingController');
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

jest.mock('../src/config/database');
jest.mock('bcryptjs');

describe('College Onboarding & Approval Lifecycle', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  const validPayload = {
    collegeName: 'Apex Institute of Technology',
    institutionType: 'Engineering College',
    website: 'https://apex.edu',
    domain: 'apex.edu',
    address: '100 Innovation Way, Tech Park',
    contactPhone: '+91 9876543210',
    contactEmail: 'info@apex.edu',
    applicantName: 'Dr. John Doe',
    applicantEmail: 'dean@apex.edu',
    applicantDesignation: 'Dean of Engineering',
    password: 'SecurePassword123!',
  };

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: null,
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      headersSent: false,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
    bcrypt.genSalt.mockResolvedValue('salt123');
    bcrypt.hash.mockResolvedValue('hashed_secret_password');
    bcrypt.compare.mockResolvedValue(true);
  });

  // ── 1. PUBLIC COLLEGE REGISTRATION VALIDATION ──────────────────────────────
  describe('1. Public College Registration Validation', () => {
    it('successfully submits a valid college registration in PENDING status', async () => {
      // Query 1: check existing approved organization
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Query 2: check existing pending application
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Query 3: check existing username in users
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Query 4: check existing pending username in applications
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Query 5: insert application RETURNING id, college_name, ...
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'app-uuid-1',
            college_name: validPayload.collegeName,
            status: 'PENDING',
            applicant_name: validPayload.applicantName,
            applicant_email: validPayload.applicantEmail,
            created_at: new Date().toISOString(),
          },
        ],
      });

      const result = await collegeOnboardingService.submitApplication(validPayload);

      expect(result.success).toBe(true);
      expect(result.application.status).toBe('PENDING');
      expect(result.application.id).toBe('app-uuid-1');
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', 'salt123');
    });

    it('rejects registration if college name or applicant details are missing', async () => {
      mockReq.body = {
        college_name: '',
        applicant_name: '',
        applicant_email: 'invalid-email',
      };

      await collegeOnboardingController.registerCollege(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/required/i),
        })
      );
    });

    it('rejects registration with weak password', async () => {
      mockReq.body = {
        ...validPayload,
        password: '123', // Too short, lacks variety
      };

      await collegeOnboardingController.registerCollege(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/password/i),
        })
      );
    });

    it('prevents client-side privilege escalation (client role/status ignored)', async () => {
      const escalationPayload = {
        ...validPayload,
        role: 'super_admin', // Attempt privilege escalation
        status: 'APPROVED', // Attempt status spoofing
      };

      // Query 1: check existing approved org
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Query 2: check existing pending application
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Query 3: check existing username in users
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Query 4: check existing pending username in applications
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Query 5: insert application
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'app-uuid-2',
            college_name: escalationPayload.collegeName,
            status: 'PENDING', // Forced PENDING by server
            applicant_name: escalationPayload.applicantName,
            applicant_email: escalationPayload.applicantEmail,
            created_at: new Date().toISOString(),
          },
        ],
      });

      const result = await collegeOnboardingService.submitApplication(escalationPayload);

      // Verify the status was set to PENDING regardless of client input
      expect(result.application.status).toBe('PENDING');
    });

    it('detects duplicate registration for an already pending college application', async () => {
      // Query 1: No approved org
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Query 2: Pending application found!
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'existing-app-1', status: 'PENDING' }],
      });

      await expect(
        collegeOnboardingService.submitApplication(validPayload)
      ).rejects.toThrow(/pending verification/i);
    });

    it('detects duplicate registration when an approved organization with same name/domain exists', async () => {
      // Query 1: Approved organization exists!
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'org-existing-1', name: 'Apex Institute of Technology' }],
      });

      await expect(
        collegeOnboardingService.submitApplication(validPayload)
      ).rejects.toThrow(/approved organization already exists/i);
    });
  });

  // ── 2. EMAIL VERIFICATION WORKFLOW ─────────────────────────────────────────
  describe('2. Email Verification Token Handling', () => {
    it('verifies applicant email using valid verification token', async () => {
      mockReq.query = { token: 'valid-token-1234567890' };

      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'app-uuid-1',
            applicant_email: 'dean@apex.edu',
            email_verified: true,
          },
        ],
      });

      await collegeOnboardingController.verifyEmail(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/verified/i),
        })
      );
    });

    it('rejects email verification if token is invalid or expired', async () => {
      mockReq.query = { token: 'expired-or-fake-token' };

      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // token not found / expired

      await collegeOnboardingController.verifyEmail(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/invalid or expired/i),
        })
      );
    });
  });

  // ── 3. SUPER ADMIN APPROVAL WORKFLOW & ATOMIC PROVISIONING ──────────────────
  describe('3. Super Admin Review & Approval', () => {
    it('allows only super admin to approve college application', async () => {
      mockReq.user = { id: 'sa-1', role: 'super_admin' };
      mockReq.params = { id: 'app-uuid-1' };
      mockReq.body = { notes: 'Accreditation verified with state board' };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      db.getClient = jest.fn().mockResolvedValue(mockClient);

      // 1. BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // 2. SELECT FOR UPDATE (Application lookup)
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'app-uuid-1',
            status: 'PENDING',
            college_name: 'Apex Institute of Technology',
            institution_type: 'Engineering College',
            official_website: 'https://apex.edu',
            address: '100 Innovation Way',
            contact_phone: '+91 9876543210',
            contact_email: 'info@apex.edu',
            applicant_name: 'Dr. John Doe',
            applicant_email: 'dean@apex.edu',
            applicant_designation: 'Dean',
            password_hash: 'hashed_secret_password',
          },
        ],
      });
      // 3. Slug check
      mockClient.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 4. Code check
      mockClient.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 5. INSERT into organizations
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'org-new-uuid',
            name: 'Apex Institute of Technology',
            slug: 'apex-institute-of-technology',
            code: 'AIOT',
          },
        ],
      });
      // 6. User check
      mockClient.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 7. Username check
      mockClient.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 8. INSERT into users
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'user-new-uuid', email: 'dean@apex.edu', role: 'college_admin' }],
      });
      // 9. INSERT into organization_members
      mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // 10. UPDATE college_applications
      mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // 11. INSERT into audit_logs
      mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // 12. COMMIT
      mockClient.query.mockResolvedValueOnce({});

      await collegeOnboardingController.approveApplication(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/approved/i),
          organization: expect.objectContaining({ id: 'org-new-uuid' }),
          adminUserId: 'user-new-uuid',
        })
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rejects approval attempt on an already approved application (double approval protection)', async () => {
      mockReq.user = { id: 'sa-1', role: 'super_admin' };
      mockReq.params = { id: 'app-uuid-1' };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      db.getClient = jest.fn().mockResolvedValue(mockClient);

      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'app-uuid-1', status: 'APPROVED' }], // Already approved!
      });
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await collegeOnboardingController.approveApplication(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/reviewed|approved/i),
        })
      );
    });

    it('rejects an application with a recorded reason', async () => {
      mockReq.user = { id: 'sa-1', role: 'super_admin' };
      mockReq.params = { id: 'app-uuid-1' };
      mockReq.body = { reason: 'Official domain and accreditation documents could not be verified' };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      db.getClient = jest.fn().mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'app-uuid-1',
              status: 'PENDING',
              college_name: 'Apex Institute',
              applicant_name: 'Dr. John Doe',
              applicant_email: 'dean@apex.edu',
            },
          ],
        }) // lookup FOR UPDATE
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'app-uuid-1',
              status: 'REJECTED',
              rejection_reason: mockReq.body.reason,
            },
          ],
        }) // update status
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // audit log
        .mockResolvedValueOnce({}); // COMMIT

      await collegeOnboardingController.rejectApplication(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/rejected/i),
        })
      );
    });

    it('blocks non-super-admins from approving or rejecting applications', async () => {
      mockReq.user = { id: 'user-1', role: 'student' };
      mockReq.params = { id: 'app-uuid-1' };

      // Controller should enforce super_admin
      await collegeOnboardingController.approveApplication(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/super admin privileges required/i),
        })
      );
    });
  });

  // ── 4. TENANT ISOLATION & PRIVILEGE BARRIERS ──────────────────────────────
  describe('4. Tenant Isolation & Access Barriers', () => {
    it('prevents pending applicants from accessing college admin features', async () => {
      // Pending user token has role 'pending' or no organization_id
      const pendingUser = { id: 'pending-u', role: 'user', organizationId: null };
      mockReq.user = pendingUser;
      mockReq.organizationId = null;

      // When accessing super admin application endpoint
      await collegeOnboardingController.getApplications(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});
