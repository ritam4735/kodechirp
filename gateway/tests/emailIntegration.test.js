// gateway/tests/emailIntegration.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive Test Suite for Resend Transactional Email & Verification Flow
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Mock Resend SDK
const mockResendSend = jest.fn();
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockResendSend,
      },
    })),
  };
});

// Mock database
jest.mock('../src/config/database');
const db = require('../src/config/database');

// Mock redis for rate limiting
const mockRedisMulti = {
  zremrangebyscore: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  zcard: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

jest.mock('../src/config/redis', () => ({
  getClient: jest.fn(() => ({
    multi: () => mockRedisMulti,
  })),
}));

const emailService = require('../src/services/emailService');
const authService = require('../src/services/authService');
const authController = require('../src/controllers/authController');
const { authResendLimiter } = require('../src/middleware/rateLimiter');

describe('Resend Transactional Email & Verification System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
    process.env.RESEND_API_KEY = 're_test_key_123';
    process.env.EMAIL_FROM = 'KodeChirp <onboarding@resend.dev>';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.EMAIL_PROVIDER = 'resend';

    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Resend Provider & Email Service
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Resend Provider & Link Construction', () => {
    it('dispatches verification email with valid structure through Resend SDK', async () => {
      mockResendSend.mockResolvedValueOnce({
        data: { id: 'msg_resend_123' },
        error: null,
      });

      const token = 'sample_secure_verification_token_64_chars';
      const email = 'developer@example.com';

      const result = await emailService.sendVerificationEmail(email, token);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
      const callArgs = mockResendSend.mock.calls[0][0];

      expect(callArgs.from).toBe('KodeChirp <onboarding@resend.dev>');
      expect(callArgs.to).toEqual(['developer@example.com']);
      expect(callArgs.subject).toContain('Verify your Email Address');
      expect(callArgs.html).toContain('http://localhost:3000/auth/verify-email?token=sample_secure_verification_token_64_chars');
      expect(callArgs.text).toContain('http://localhost:3000/auth/verify-email?token=sample_secure_verification_token_64_chars');
      expect(result).toEqual({ id: 'msg_resend_123' });
    });

    it('uses permitted test-sender onboarding@resend.dev when EMAIL_FROM is unset', async () => {
      delete process.env.EMAIL_FROM;
      mockResendSend.mockResolvedValueOnce({
        data: { id: 'msg_resend_default' },
        error: null,
      });

      await emailService.sendVerificationEmail('student@example.com', 'test-token');

      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.from).toContain('onboarding@resend.dev');
    });

    it('handles Resend API error response safely by throwing detailed error', async () => {
      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: {
          name: 'validation_error',
          statusCode: 422,
          message: 'The from address domain is not verified',
        },
      });

      await expect(
        emailService.sendVerificationEmail('user@domain.com', 'dummy-token')
      ).rejects.toThrow(/The from address domain is not verified/);
    });

    it('handles network transport exceptions from Resend SDK', async () => {
      mockResendSend.mockRejectedValueOnce(new Error('Connection timeout to api.resend.com'));

      await expect(
        emailService.sendVerificationEmail('user@domain.com', 'dummy-token')
      ).rejects.toThrow(/Connection timeout/);
    });

    it('throws configuration error if RESEND_API_KEY is missing when provider is resend', async () => {
      delete process.env.RESEND_API_KEY;

      await expect(
        emailService.sendVerificationEmail('user@domain.com', 'dummy-token')
      ).rejects.toThrow(/RESEND_API_KEY/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Frontend URL & Environment Validation
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Frontend URL & Environment Validation', () => {
    it('allows localhost frontend URL in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.FRONTEND_URL = 'http://localhost:3000/';

      const url = emailService.getFrontendUrl();
      expect(url).toBe('http://localhost:3000');
    });

    it('rejects localhost frontend URL in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'http://localhost:3000';

      expect(() => emailService.getFrontendUrl()).toThrow(/localhost is not supported in production/);
    });

    it('rejects 127.0.0.1 frontend URL in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'http://127.0.0.1:3000';

      expect(() => emailService.getFrontendUrl()).toThrow(/localhost is not supported in production/);
    });

    it('accepts deployed HTTPS URL in production and strips trailing slash', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://app.kodechirp.com///';

      const url = emailService.getFrontendUrl();
      expect(url).toBe('https://app.kodechirp.com');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. User Signup & Token Generation
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Signup Flow & Token Generation Security', () => {
    it('generates secure 64-char token, stores SHA-256 hash and 24h expiry in DB', async () => {
      mockResendSend.mockResolvedValueOnce({ data: { id: 'msg_signup_1' }, error: null });

      db.query.mockResolvedValueOnce({ rows: [] }); // User check: does not exist
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'new-user-1',
            email: 'coder@kodechirp.com',
            username: 'coder',
            email_verified: false,
          },
        ],
      }); // Insert user

      const result = await authService.signup({
        email: 'coder@kodechirp.com',
        username: 'coder',
        password: 'Password123!',
      });

      expect(result.verificationRequired).toBe(true);
      expect(result.emailDeliveryFailed).toBe(false);

      // Verify DB insert query arguments
      const insertCall = db.query.mock.calls[1];
      const queryStr = insertCall[0];
      const params = insertCall[1];

      expect(queryStr).toContain('INSERT INTO users');
      expect(queryStr).toContain('verification_token_hash');
      expect(queryStr).toContain('verification_expires_at');

      const tokenHash = params[3];
      const expiresAt = params[4];
      const emailVerified = params[5];

      // SHA-256 hash is 64 hex characters
      expect(tokenHash).toHaveLength(64);
      expect(emailVerified).toBe(false);

      // Expiration is ~24 hours in the future
      const now = Date.now();
      const expiresTime = new Date(expiresAt).getTime();
      const diffHours = (expiresTime - now) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23.9);
      expect(diffHours).toBeLessThan(24.1);

      // Verify emailService called
      expect(mockResendSend).toHaveBeenCalledTimes(1);
    });

    it('safely handles email delivery failure on signup without losing the user account', async () => {
      // Simulate Resend delivery failure (e.g., rate limit or network issue)
      mockResendSend.mockRejectedValueOnce(new Error('Resend rate limit exceeded'));

      db.query.mockResolvedValueOnce({ rows: [] }); // User does not exist
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'new-user-2',
            email: 'failtest@example.com',
            username: 'failtest',
            email_verified: false,
          },
        ],
      });

      const result = await authService.signup({
        email: 'failtest@example.com',
        username: 'failtest',
        password: 'Password123!',
      });

      expect(result.verificationRequired).toBe(true);
      expect(result.emailDeliveryFailed).toBe(true);

      // Test Controller response for this case
      const mockReq = {
        body: { email: 'failtest@example.com', username: 'failtest', password: 'Password123!' },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      jest.spyOn(authService, 'signup').mockResolvedValueOnce(result);

      await authController.signup(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          verificationRequired: true,
          emailDeliveryFailed: true,
          message: expect.stringContaining('could not deliver your verification email'),
        })
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Verification Endpoint (Valid, Expired, Invalid, Repeated)
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Email Verification Endpoint (/api/auth/verify-email)', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = { body: {}, query: {} };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNext = jest.fn();
    });

    it('successfully verifies email with valid token and sets token_hash to NULL (single-use)', async () => {
      const validToken = 'valid_hex_token_123';
      const validHash = crypto.createHash('sha256').update(validToken).digest('hex');
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour future

      mockReq.body = { email: 'user@example.com', token: validToken };

      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'user@example.com',
            email_verified: false,
            verification_token_hash: validHash,
            verification_expires_at: futureDate,
          },
        ],
      }); // SELECT user

      db.query.mockResolvedValueOnce({ rows: [] }); // UPDATE users (verified)
      db.query.mockResolvedValueOnce({ rows: [] }); // syncUserWithRoster (UPDATE student_rosters)

      await authController.verifyEmail(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET email_verified = TRUE'),
        ['user-1']
      );

      // Verify token is cleared for single-use
      const updateCall = db.query.mock.calls[1][0];
      expect(updateCall).toContain('verification_token_hash = NULL');
      expect(updateCall).toContain('verification_expires_at = NULL');

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        alreadyVerified: false,
        message: 'Email verified successfully. You can now log in.',
      });
    });

    it('rejects expired token with 400', async () => {
      const validToken = 'expired_token_123';
      const validHash = crypto.createHash('sha256').update(validToken).digest('hex');
      const pastDate = new Date(Date.now() - 1000 * 60); // Expired 1 min ago

      mockReq.body = { email: 'user@example.com', token: validToken };

      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'user@example.com',
            email_verified: false,
            verification_token_hash: validHash,
            verification_expires_at: pastDate,
          },
        ],
      });

      await authController.verifyEmail(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: expect.stringContaining('expired'),
        })
      );
    });

    it('rejects invalid or tampered token with 400', async () => {
      const realToken = 'authentic_token_abc';
      const realHash = crypto.createHash('sha256').update(realToken).digest('hex');
      const tamperedToken = 'tampered_token_xyz';

      mockReq.body = { email: 'user@example.com', token: tamperedToken };

      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'user@example.com',
            email_verified: false,
            verification_token_hash: realHash,
            verification_expires_at: new Date(Date.now() + 100000),
          },
        ],
      });

      await authController.verifyEmail(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'Invalid or expired verification token',
        })
      );
    });

    it('handles repeated verification gracefully (already verified)', async () => {
      mockReq.body = { email: 'user@example.com', token: 'any-token' };

      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'user@example.com',
            email_verified: true,
          },
        ],
      });

      await authController.verifyEmail(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        alreadyVerified: true,
        message: 'Your email is already verified. You can log in.',
      });
    });

    it('supports query parameters on GET /verify-email', async () => {
      mockReq.query = { email: 'user@example.com', token: 'query-token' };

      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'user@example.com',
            email_verified: true,
          },
        ],
      });

      await authController.verifyEmail(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          alreadyVerified: true,
        })
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Resend Verification Endpoint & Delivery Errors
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Resend Verification & Provider Error Handling', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = { body: {} };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNext = jest.fn();
    });

    it('resends verification email with newly generated token and updated expiry', async () => {
      mockResendSend.mockResolvedValueOnce({ data: { id: 'msg_resend_new' }, error: null });

      mockReq.body.email = 'unverified@kodechirp.com';
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-unverified',
            email: 'unverified@kodechirp.com',
            email_verified: false,
          },
        ],
      });
      db.query.mockResolvedValueOnce({ rows: [] }); // UPDATE users

      await authController.resendVerification(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET verification_token_hash'),
        expect.any(Array)
      );

      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email exists and is unverified, a new verification link has been sent.',
      });
    });

    it('returns success for non-existent email to prevent enumeration', async () => {
      mockReq.body.email = 'nobody@kodechirp.com';
      db.query.mockResolvedValueOnce({ rows: [] }); // User not found

      await authController.resendVerification(mockReq, mockRes, mockNext);

      expect(mockResendSend).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email exists and is unverified, a new verification link has been sent.',
      });
    });

    it('throws 400 when attempting to resend for an already verified email', async () => {
      mockReq.body.email = 'verified@kodechirp.com';
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-verified',
            email: 'verified@kodechirp.com',
            email_verified: true,
          },
        ],
      });

      await authController.resendVerification(mockReq, mockRes, mockNext);

      expect(mockResendSend).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'Email is already verified',
        })
      );
    });

    it('handles Resend provider failure during resend with safe 502 error', async () => {
      mockResendSend.mockRejectedValueOnce(new Error('Resend upstream server unavailable'));

      mockReq.body.email = 'student@kodechirp.com';
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-student',
            email: 'student@kodechirp.com',
            email_verified: false,
          },
        ],
      });
      db.query.mockResolvedValueOnce({ rows: [] }); // UPDATE

      await authController.resendVerification(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 502,
          message: 'Failed to deliver verification email. Please try again in a few moments.',
        })
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Resend Rate Limiter
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. Resend Verification Rate Limiting', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        body: { email: 'spammer@example.com' },
        headers: { 'x-forwarded-for': '198.51.100.42' },
        ip: '198.51.100.42',
        path: '/api/auth/resend-verification',
      };
      mockRes = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNext = jest.fn();
    });

    it('allows requests within the configured window limit', async () => {
      mockRedisMulti.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 1],
        [null, 2], // request count = 2 (under limit of 5)
        [null, 1],
      ]);

      await authResendLimiter(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': 5,
        })
      );
    });

    it('blocks requests exceeding the limit with 429 Too Many Requests', async () => {
      mockRedisMulti.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 1],
        [null, 6], // request count = 6 (exceeds max of 5)
        [null, 1],
      ]);

      await authResendLimiter(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Too many requests'),
        })
      );
    });
  });
});
