// gateway/tests/rbacRosterCompete.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Automated Test Suite for RBAC, Roster Import, Eligibility, Export & Compete
// ─────────────────────────────────────────────────────────────────────────────

const XLSX = require('xlsx');
const db = require('../src/config/database');
const {
  normalizeRole,
  isSuperAdmin,
  isCollegeAdmin,
  isStudent,
  requireCollegeAdmin,
  requireOrgMatch,
} = require('../src/middleware/rbac');
const { requireRole } = require('../src/middleware/auth');
const rosterService = require('../src/services/rosterService');
const exportService = require('../src/services/assessmentExportService');
const eligibilityService = require('../src/services/assessmentEligibilityService');

jest.mock('../src/config/database');

describe('RBAC, Roster, Eligibility, and Export Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. ROLE-BASED ACCESS CONTROL (RBAC) ───────────────────────────────────
  describe('1. Role Normalization & Authorization Rules', () => {
    it('normalizes legacy and canonical roles correctly', () => {
      expect(normalizeRole('admin')).toBe('super_admin');
      expect(normalizeRole('super_admin')).toBe('super_admin');
      expect(normalizeRole('college_admin')).toBe('college_admin');
      expect(normalizeRole('user')).toBe('student');
      expect(normalizeRole('student')).toBe('student');
      expect(normalizeRole('moderator')).toBe('moderator');
      expect(normalizeRole(null)).toBe('student');
    });

    it('correctly identifies role hierarchies', () => {
      expect(isSuperAdmin({ role: 'super_admin' })).toBe(true);
      expect(isSuperAdmin({ role: 'admin' })).toBe(true);
      expect(isSuperAdmin({ role: 'college_admin' })).toBe(false);
      expect(isSuperAdmin({ role: 'student' })).toBe(false);

      // Super Admin also has College Admin capabilities
      expect(isCollegeAdmin({ role: 'super_admin' })).toBe(true);
      expect(isCollegeAdmin({ role: 'college_admin' })).toBe(true);
      expect(isCollegeAdmin({ role: 'student' })).toBe(false);

      expect(isStudent({ role: 'student' })).toBe(true);
      expect(isStudent({ role: 'user' })).toBe(true);
      expect(isStudent({ role: 'college_admin' })).toBe(false);
    });

    it('requireRole middleware allows super_admin and blocks student from admin routes', () => {
      const middleware = requireRole('admin');
      const nextFn = jest.fn();
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Super Admin allowed
      const reqSuper = { user: { id: 'u1', role: 'super_admin' } };
      middleware(reqSuper, res, nextFn);
      expect(nextFn).toHaveBeenCalled();

      // Student rejected
      nextFn.mockClear();
      const reqStudent = { user: { id: 'u2', role: 'student' } };
      middleware(reqStudent, res, nextFn);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Insufficient permissions' })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('requireCollegeAdmin validates assigned organization membership', async () => {
      const nextFn = jest.fn();
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // College admin with valid membership
      const reqAdmin = {
        user: { id: 'ca-1', role: 'college_admin' },
        headers: {},
        query: {},
        params: {},
      };

      db.query.mockResolvedValueOnce({
        rows: [{
          organization_id: 'org-123',
          member_role: 'college_admin',
          organization_name: 'Tech University',
          organization_slug: 'tech-univ',
          organization_active: true,
        }],
      });

      await requireCollegeAdmin(reqAdmin, res, nextFn);
      expect(reqAdmin.organizationId).toBe('org-123');
      expect(nextFn).toHaveBeenCalled();

      // College admin without assigned org gets 403
      nextFn.mockClear();
      db.query.mockResolvedValueOnce({ rows: [] });
      await requireCollegeAdmin(reqAdmin, res, nextFn);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'No active College Admin assignment found for this account' })
      );
    });

    it('requireOrgMatch blocks cross-organization access attempts', () => {
      const matchMiddleware = requireOrgMatch('organizationId');
      const nextFn = jest.fn();
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // College admin trying to access different org
      const reqCross = {
        user: { id: 'ca-1', role: 'college_admin' },
        organizationId: 'org-111',
        params: { organizationId: 'org-999' },
      };

      matchMiddleware(reqCross, res, nextFn);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Cannot access another organization') })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  // ── 2. ROSTER PARSING & VALIDATION ─────────────────────────────────────────
  describe('2. Spreadsheet Roster Import & Validation Engine', () => {
    it('parses valid CSV and auto-detects alias column headers', () => {
      const csvData = [
        'Roll Number,Candidate Name,Email ID,Stream,Graduating Year,Status',
        'CS101,John Doe,john@test.edu,Computer Science,2025,active',
        'IT102,Jane Smith,jane@test.edu,Information Technology,2025,active',
      ].join('\n');

      const buffer = Buffer.from(csvData, 'utf-8');
      const parsed = rosterService.parseRosterFile(buffer, 'test_roster.csv');

      expect(parsed.totalRows).toBe(2);
      expect(parsed.headers).toContain('Roll Number');
      expect(parsed.headers).toContain('Email ID');

      const autoMapping = rosterService.autoDetectMapping(parsed.headers);
      expect(autoMapping.student_id).toBe('Roll Number');
      expect(autoMapping.student_name).toBe('Candidate Name');
      expect(autoMapping.college_email).toBe('Email ID');
      expect(autoMapping.department).toBe('Stream');
      expect(autoMapping.academic_year).toBe('Graduating Year');
      expect(autoMapping.enrollment_status).toBe('Status');
    });

    it('detects duplicate student IDs and invalid email addresses in file', async () => {
      const rawRows = [
        { id: 'STU001', email: 'valid1@college.edu', name: 'Alice' },
        { id: 'STU001', email: 'valid2@college.edu', name: 'Alice Duplicate' }, // duplicate id
        { id: 'STU002', email: 'bad-email-format', name: 'Bob' }, // invalid email
        { id: '', email: 'no-id@college.edu', name: 'Charlie' }, // missing id
      ];

      const mapping = {
        student_id: 'id',
        college_email: 'email',
        student_name: 'name',
      };

      db.query.mockResolvedValueOnce({ rows: [] }); // No existing records

      const result = await rosterService.validateRosterRows(rawRows, mapping, 'org-1');

      expect(result.summary.invalidCount).toBe(3);
      expect(result.summary.validNewCount).toBe(1);
      expect(result.invalid.some(i => i.errors.some(e => e.includes('Duplicate Student ID')))).toBe(true);
      expect(result.invalid.some(i => i.errors.some(e => e.includes('Invalid email syntax')))).toBe(true);
      expect(result.invalid.some(i => i.errors.some(e => e.includes('Missing Student ID')))).toBe(true);
    });

    it('detects cross-identity conflicts with existing database records', async () => {
      // In DB: Student A has ID STU001 and email a@college.edu
      // In DB: Student B has ID STU002 and email b@college.edu
      // In File: row has ID STU001 and email b@college.edu (conflicting identity!)
      const rawRows = [
        { id: 'STU001', email: 'b@college.edu', name: 'Conflicted Student' },
      ];

      const mapping = { student_id: 'id', college_email: 'email', student_name: 'name' };

      db.query.mockResolvedValueOnce({
        rows: [
          { id: 'rec-1', student_id_number: 'STU001', college_email: 'a@college.edu', student_name: 'Alice', is_active: true },
          { id: 'rec-2', student_id_number: 'STU002', college_email: 'b@college.edu', student_name: 'Bob', is_active: true },
        ],
      });

      const result = await rosterService.validateRosterRows(rawRows, mapping, 'org-1');

      expect(result.summary.conflictsCount).toBe(1);
      expect(result.conflicts[0].reason).toContain('belongs to');
    });

    it('generates downloadable template and error reports in CSV and XLSX', () => {
      const csvTemplate = rosterService.generateRosterTemplate('csv');
      expect(csvTemplate.contentType).toBe('text/csv');
      expect(csvTemplate.fileName.endsWith('.csv')).toBe(true);
      expect(csvTemplate.buffer.toString('utf-8')).toContain('Student ID');

      const xlsxTemplate = rosterService.generateRosterTemplate('xlsx');
      expect(xlsxTemplate.contentType).toContain('openxmlformats');
      expect(xlsxTemplate.fileName.endsWith('.xlsx')).toBe(true);

      const errorReport = rosterService.generateErrorReport({
        id: 'batch-1',
        validation_errors: [{ row: 5, studentId: 'S5', email: 'bad', errors: ['Invalid email'] }],
      }, 'csv');
      expect(errorReport.buffer.toString('utf-8')).toContain('Invalid email');
    });
  });

  // ── 3. RESULTS EXPORT & FORMULA INJECTION DEFENSE ─────────────────────────
  describe('3. Assessment Results Export & Spreadsheet Security', () => {
    it('defends against CSV/Excel formula injection on user text fields', () => {
      // Cell values starting with =, +, -, @, \t, \r must be prefixed with a single quote
      expect(exportService.sanitizeCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(exportService.sanitizeCell('+cmd|/c calc')).toBe("'+cmd|/c calc");
      expect(exportService.sanitizeCell('-10+20')).toBe("'-10+20");
      expect(exportService.sanitizeCell('@test')).toBe("'@test");
      expect(exportService.sanitizeCell('Normal Name')).toBe('Normal Name');
      expect(exportService.sanitizeCell(100)).toBe(100);
      expect(exportService.sanitizeCell(null)).toBe('');
    });

    it('generates export file with accurate fields and headers', () => {
      const mockRows = [
        {
          student_id: 'CS101',
          student_name: 'Alice',
          college_email: 'alice@college.edu',
          department: 'Computer Science',
          academic_year: '2024-2025',
          assessment_title: 'DSA Placement Mock',
          attempt_number: 1,
          attempt_status: 'evaluated',
          started_at: '2026-10-18T10:00:00Z',
          submitted_at: '2026-10-18T10:45:00Z',
          time_taken_minutes: 45,
          total_score: 85,
          max_marks: 100,
          percentage: 85,
          is_finalized: true,
          correct_count: 17,
          incorrect_count: 3,
          unanswered_count: 0,
        },
      ];

      const assessment = { title: 'DSA Placement Mock', pass_percentage: 40 };

      // Generate CSV
      const csvExport = exportService.generateExportFile(mockRows, assessment, 'csv');
      expect(csvExport.contentType).toContain('text/csv');
      const csvText = csvExport.buffer.toString('utf-8');
      expect(csvText).toContain('Student ID');
      expect(csvText).toContain('Alice');
      expect(csvText).toContain('85');
      expect(csvText).toContain('Passed');

      // Generate XLSX
      const xlsxExport = exportService.generateExportFile(mockRows, assessment, 'xlsx');
      expect(xlsxExport.contentType).toContain('openxmlformats');
      expect(xlsxExport.buffer.length).toBeGreaterThan(100);
    });
  });

  // ── 4. ASSESSMENT ELIGIBILITY & ASSIGNMENTS ───────────────────────────────
  describe('4. Assessment Eligibility & Cohort Assignments', () => {
    it('grants access to public assessments for all students', async () => {
      const publicAssessment = {
        id: 'assess-pub',
        is_public: true,
        organization_id: null,
        max_attempts: 2,
      };

      const result = await eligibilityService.checkStudentEligibility({
        assessment: publicAssessment,
        userId: 'student-1',
        userRole: 'student',
      });

      expect(result.eligible).toBe(true);
      expect(result.maxAttempts).toBe(2);
    });

    it('denies access if student does not belong to the assessment organization', async () => {
      const orgAssessment = {
        id: 'assess-org-1',
        is_public: false,
        organization_id: 'org-alpha',
        max_attempts: 1,
        target_audience: 'organization',
      };

      // Student has no membership or roster record in org-alpha
      db.query.mockResolvedValueOnce({
        rows: [{
          role: null,
          student_id_number: null,
          organization_name: 'Alpha College',
          organization_active: true,
        }],
      });

      const result = await eligibilityService.checkStudentEligibility({
        assessment: orgAssessment,
        userId: 'student-external',
        userRole: 'student',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('restricted to enrolled students of Alpha College');
    });

    it('denies access if student enrollment status is inactive or suspended', async () => {
      const orgAssessment = {
        id: 'assess-org-1',
        is_public: false,
        organization_id: 'org-alpha',
        max_attempts: 1,
      };

      db.query.mockResolvedValueOnce({
        rows: [{
          role: 'student',
          student_id_number: 'STU999',
          department: 'Computer Science',
          enrollment_status: 'suspended', // Suspended
          roster_active: false,
          organization_name: 'Alpha College',
          organization_active: true,
        }],
      });

      const result = await eligibilityService.checkStudentEligibility({
        assessment: orgAssessment,
        userId: 'student-suspended',
        userRole: 'student',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('inactive or suspended');
    });

    it('enforces department-based cohort assignment matching', async () => {
      const orgAssessment = {
        id: 'assess-dept',
        is_public: false,
        organization_id: 'org-alpha',
        max_attempts: 1,
      };

      // Student is in Mechanical Engineering
      db.query
        .mockResolvedValueOnce({
          rows: [{
            role: 'student',
            student_id_number: 'ME101',
            department: 'Mechanical Engineering',
            enrollment_status: 'active',
            roster_active: true,
            organization_name: 'Alpha College',
            organization_active: true,
          }],
        })
        // Assignments query: only assigned to Computer Science and Information Technology
        .mockResolvedValueOnce({
          rows: [{
            id: 'assign-1',
            assignment_type: 'departments',
            target_departments: ['Computer Science', 'Information Technology'],
            is_active: true,
          }],
        });

      const result = await eligibilityService.checkStudentEligibility({
        assessment: orgAssessment,
        userId: 'student-me',
        userRole: 'student',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('not assigned to this assessment cohort');
    });

    it('allows access and applies attempt override for matching cohort', async () => {
      const orgAssessment = {
        id: 'assess-dept',
        is_public: false,
        organization_id: 'org-alpha',
        max_attempts: 1,
      };

      // Student is in Computer Science
      db.query
        .mockResolvedValueOnce({
          rows: [{
            role: 'student',
            student_id_number: 'CS101',
            department: 'Computer Science',
            academic_year: '2024-2025',
            enrollment_status: 'active',
            roster_active: true,
            organization_name: 'Alpha College',
            organization_active: true,
          }],
        })
        // Assignment matches Computer Science and grants max_attempts_override = 3
        .mockResolvedValueOnce({
          rows: [{
            id: 'assign-cs',
            assignment_type: 'departments',
            target_departments: ['Computer Science'],
            max_attempts_override: 3,
            is_active: true,
          }],
        });

      const result = await eligibilityService.checkStudentEligibility({
        assessment: orgAssessment,
        userId: 'student-cs',
        userRole: 'student',
      });

      expect(result.eligible).toBe(true);
      expect(result.maxAttempts).toBe(3);
    });

    it('denies access if student is graduated', async () => {
      const orgAssessment = {
        id: 'assess-grad',
        is_public: false,
        organization_id: 'org-alpha',
        max_attempts: 1,
      };

      db.query.mockResolvedValueOnce({
        rows: [{
          role: 'student',
          roster_id: 'sr-grad-1',
          roster_student_id: 'GRAD001',
          department: 'Computer Science',
          enrollment_status: 'graduated',
          roster_status: 'graduated',
          roster_active: false,
          organization_name: 'Alpha College',
          organization_active: true,
        }],
      });

      const result = await eligibilityService.checkStudentEligibility({
        assessment: orgAssessment,
        userId: 'student-grad',
        userRole: 'student',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Graduated students are not eligible');
    });

    it('denies access if roster record is marked is_active = false', async () => {
      const orgAssessment = {
        id: 'assess-deact',
        is_public: false,
        organization_id: 'org-alpha',
        max_attempts: 1,
      };

      db.query.mockResolvedValueOnce({
        rows: [{
          role: 'student',
          roster_id: 'sr-deact-1',
          roster_student_id: 'STU102',
          department: 'Computer Science',
          enrollment_status: 'active',
          roster_status: 'inactive',
          roster_active: false,
          organization_name: 'Alpha College',
          organization_active: true,
        }],
      });

      const result = await eligibilityService.checkStudentEligibility({
        assessment: orgAssessment,
        userId: 'student-deact',
        userRole: 'student',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('inactive or suspended');
    });

    it('allows access and self-heals stale om.enrollment_status when student is active on roster', async () => {
      const orgAssessment = {
        id: 'assess-heal',
        is_public: false,
        organization_id: 'org-alpha',
        target_audience: 'organization',
        max_attempts: 2,
      };

      db.query
        .mockResolvedValueOnce({
          rows: [{
            role: 'student',
            roster_id: 'sr-aarav',
            roster_student_id: 'DC1-2024-001',
            department: 'Computer Science & Engineering',
            academic_year: '3rd Year',
            enrollment_status: 'inactive', // stale membership record
            roster_status: 'active',       // active on roster
            roster_active: true,
            organization_name: 'Alpha College',
            organization_active: true,
          }],
        })
        // healing query update organization_members
        .mockResolvedValueOnce({ rowCount: 1 })
        // assignments query: none, open to all enrolled students
        .mockResolvedValueOnce({ rows: [] });

      const result = await eligibilityService.checkStudentEligibility({
        assessment: orgAssessment,
        userId: 'aarav-user-id',
        userRole: 'student',
      });

      expect(result.eligible).toBe(true);
      expect(result.maxAttempts).toBe(2);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organization_members'),
        ['org-alpha', 'aarav-user-id']
      );
    });

    it('denies access if assessment belongs to an inactive organization', async () => {
      const orgAssessment = {
        id: 'assess-inact-org',
        is_public: false,
        organization_id: 'org-inactive',
        max_attempts: 1,
      };

      db.query.mockResolvedValueOnce({
        rows: [{
          role: 'student',
          roster_id: 'sr-1',
          organization_name: 'Inactive College',
          organization_active: false, // Inactive org
        }],
      });

      const result = await eligibilityService.checkStudentEligibility({
        assessment: orgAssessment,
        userId: 'student-1',
        userRole: 'student',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('organization that is not currently active');
    });
  });

  // ── 5. ROSTER ELIGIBILITY MANAGEMENT & ACCOUNT SYNC ─────────────────────────
  describe('5. Roster Eligibility Management & Account Sync', () => {
    const rosterController = require('../src/controllers/rosterController');
    const authService = require('../src/services/authService');

    it('updateStudentEligibility synchronizes is_active and enrollment_status to active and updates organization_members', async () => {
      const req = {
        organizationId: 'org-alpha',
        params: { studentId: 'roster-student-1' },
        body: { is_active: true }, // Admin toggles to active without explicit enrollment_status
        user: { id: 'admin-1', email: 'admin@college.edu', role: 'college_admin' },
        ip: '127.0.0.1',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      // Current record is inactive
      db.query
        // 1. SELECT current record
        .mockResolvedValueOnce({
          rows: [{
            id: 'roster-student-1',
            student_id_number: 'STU001',
            college_email: 'aarav@college.edu',
            is_active: false,
            enrollment_status: 'inactive',
            matched_user_id: 'user-aarav-id',
            department: 'Computer Science',
            academic_year: '3rd Year',
          }],
        })
        // 2. UPDATE student_rosters
        .mockResolvedValueOnce({
          rows: [{
            id: 'roster-student-1',
            student_id_number: 'STU001',
            college_email: 'aarav@college.edu',
            is_active: true,
            enrollment_status: 'active',
            matched_user_id: 'user-aarav-id',
            department: 'Computer Science',
            academic_year: '3rd Year',
          }],
        })
        // 3. INSERT / UPDATE organization_members
        .mockResolvedValueOnce({ rowCount: 1 })
        // 4. Audit log query
        .mockResolvedValueOnce({ rowCount: 1 });

      await rosterController.updateStudentEligibility(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        student: expect.objectContaining({
          is_active: true,
          enrollment_status: 'active',
          student_id: 'STU001',
          user_id: 'user-aarav-id',
          has_account: true,
        }),
      }));

      // Verify organization_members was updated with 'active'
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_members'),
        ['org-alpha', 'user-aarav-id', 'Computer Science', '3rd Year', 'active', 'STU001']
      );
    });

    it('updateStudentEligibility sets enrollment_status to inactive when is_active is set to false', async () => {
      const req = {
        organizationId: 'org-alpha',
        params: { studentId: 'roster-student-1' },
        body: { is_active: false }, // Deactivate student
        user: { id: 'admin-1', email: 'admin@college.edu', role: 'college_admin' },
        ip: '127.0.0.1',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      db.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'roster-student-1',
            student_id_number: 'STU001',
            college_email: 'aarav@college.edu',
            is_active: true,
            enrollment_status: 'active',
            matched_user_id: 'user-aarav-id',
            department: 'Computer Science',
            academic_year: '3rd Year',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'roster-student-1',
            student_id_number: 'STU001',
            college_email: 'aarav@college.edu',
            is_active: false,
            enrollment_status: 'inactive',
            matched_user_id: 'user-aarav-id',
            department: 'Computer Science',
            academic_year: '3rd Year',
          }],
        })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      await rosterController.updateStudentEligibility(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        student: expect.objectContaining({
          is_active: false,
          enrollment_status: 'inactive',
        }),
      }));
    });

    it('getRoster returns student_id, user_id aliases and counts in meta', async () => {
      const req = {
        organizationId: 'org-alpha',
        query: { page: '0', limit: '10' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      db.query
        // Count query
        .mockResolvedValueOnce({
          rows: [{ total: '8', active_count: '8', registered_count: '5' }],
        })
        // Filter dropdowns query
        .mockResolvedValueOnce({
          rows: [{ departments: ['Computer Science'], academic_years: ['3rd Year'] }],
        })
        // Data query
        .mockResolvedValueOnce({
          rows: [{
            id: 'r1',
            student_id_number: 'DC1-001',
            student_id: 'DC1-001',
            matched_user_id: 'u1',
            user_id: 'u1',
            has_account: true,
            is_active: true,
            enrollment_status: 'active',
          }],
        });

      await rosterController.getRoster(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.meta).toEqual(expect.objectContaining({
        total: 8,
        activeCount: 8,
        registeredCount: 5,
      }));
      expect(jsonCall.students[0].student_id).toBe('DC1-001');
      expect(jsonCall.students[0].user_id).toBe('u1');
    });

    it('syncUserWithRoster links unlinked roster records and creates organization_members on user authentication', async () => {
      const user = {
        id: 'new-user-uuid',
        email: 'alex.j@college.edu',
        role: 'user',
      };

      db.query
        // 1. UPDATE student_rosters RETURNING
        .mockResolvedValueOnce({
          rows: [{
            organization_id: 'org-alpha',
            department: 'Computer Science',
            academic_year: '2024-2025',
            enrollment_status: 'active',
            student_id_number: 'CS2024001',
            is_active: true,
          }],
        })
        // 2. INSERT INTO organization_members
        .mockResolvedValueOnce({ rowCount: 1 })
        // 3. UPDATE users SET role = 'student'
        .mockResolvedValueOnce({ rowCount: 1 });

      await authService.syncUserWithRoster(user);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE student_rosters'),
        [user.id, user.email]
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_members'),
        ['org-alpha', user.id, 'Computer Science', '2024-2025', 'active', 'CS2024001']
      );
      expect(user.role).toBe('student');
    });
  });
});
