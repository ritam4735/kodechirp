const authController = require('../src/controllers/authController');
const authService = require('../src/services/authService');
const db = require('../src/config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

jest.mock('../src/services/authService', () => {
  const original = jest.requireActual('../src/services/authService');
  return {
    ...original,
    revokeAllTokens: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };
});
jest.mock('../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
}));
jest.mock('../src/config/database');
jest.mock('bcryptjs');

describe('Auth Controller & Service - Password Reset', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { body: {}, query: {}, cookies: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      clearCookie: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('returns success message even if email does not exist (prevents enumeration)', async () => {
      mockReq.body.email = 'nonexistent@example.com';
      db.query.mockResolvedValueOnce({ rows: [] }); // User not found

      await authController.forgotPassword(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account exists, a password reset email has been sent.'
      });
    });

    it('generates token and sends email if user exists', async () => {
      mockReq.body.email = 'user@example.com';
      db.query.mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'user@example.com' }] }); // Select user
      db.query.mockResolvedValueOnce({ rows: [] }); // Update user

      await authController.forgotPassword(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password_reset_token_hash'),
        expect.any(Array)
      );
      
      const emailService = require('../src/services/emailService');
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith('user@example.com', expect.any(String));

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resetPassword', () => {
    it('throws error if token is invalid or user not found', async () => {
      mockReq.body = { email: 'user@example.com', token: 'invalid-token', newPassword: 'NewPassword1' };
      db.query.mockResolvedValueOnce({ rows: [] }); // User not found

      await authController.resetPassword(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid or expired reset token',
        status: 400
      }));
    });

    it('throws error if token is expired', async () => {
      mockReq.body = { email: 'user@example.com', token: 'some-token', newPassword: 'NewPassword1' };
      const pastDate = new Date(Date.now() - 10000); // expired
      db.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: 'user-1', 
          password_reset_token_hash: 'somehash', 
          password_reset_expires_at: pastDate 
        }] 
      });

      await authController.resetPassword(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Reset token has expired',
        status: 400
      }));
    });

    it('throws error if token does not match', async () => {
      mockReq.body = { email: 'user@example.com', token: 'wrong-token', newPassword: 'NewPassword1' };
      const futureDate = new Date(Date.now() + 10000);
      db.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: 'user-1', 
          password_reset_token_hash: 'different-hash', 
          password_reset_expires_at: futureDate 
        }] 
      });

      await authController.resetPassword(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid or expired reset token',
        status: 400
      }));
    });

    it('successfully resets password, clears token, and invalidates sessions', async () => {
      const validToken = 'valid-token-123';
      const validHash = crypto.createHash('sha256').update(validToken).digest('hex');
      const futureDate = new Date(Date.now() + 100000);

      mockReq.body = { email: 'user@example.com', token: validToken, newPassword: 'NewPassword1' };
      
      db.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: 'user-1', 
          password_reset_token_hash: validHash, 
          password_reset_expires_at: futureDate 
        }] 
      }); // Find user
      
      bcrypt.genSalt.mockResolvedValueOnce('salt');
      bcrypt.hash.mockResolvedValueOnce('hashedNewPassword');
      
      db.query.mockResolvedValueOnce({ rows: [] }); // Update password

      await authController.resetPassword(mockReq, mockRes, mockNext);

      // Verify password update and token clear
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password_hash = $1, password_reset_token_hash = NULL'),
        ['hashedNewPassword', 'user-1']
      );

      // Verify sessions revoked
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL'),
        ['user-1']
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully'
      });
    });
  });

  describe('verifyEmail', () => {
    it('throws error if token is missing', async () => {
      mockReq.body = { email: 'test@example.com' };
      await authController.verifyEmail(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Token and email are required',
        status: 400
      }));
    });

    it('verifies email successfully and updates DB', async () => {
      const validToken = 'valid-token';
      const validHash = crypto.createHash('sha256').update(validToken).digest('hex');
      const futureDate = new Date(Date.now() + 100000);

      mockReq.body = { email: 'user@example.com', token: validToken };
      
      db.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: 'user-1', 
          email_verified: false,
          verification_token_hash: validHash, 
          verification_expires_at: futureDate 
        }] 
      });

      await authController.verifyEmail(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET email_verified = TRUE'),
        ['user-1']
      );
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resendVerification', () => {
    it('returns success message even if email does not exist', async () => {
      mockReq.body.email = 'nonexistent@example.com';
      db.query.mockResolvedValueOnce({ rows: [] });

      await authController.resendVerification(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email exists and is unverified, a new verification link has been sent.'
      });
    });

    it('generates token and sends email if user is unverified', async () => {
      mockReq.body.email = 'user@example.com';
      db.query.mockResolvedValueOnce({ 
        rows: [{ id: 'user-1', email: 'user@example.com', email_verified: false }] 
      });

      await authController.resendVerification(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET verification_token_hash'),
        expect.any(Array)
      );
      
      const emailService = require('../src/services/emailService');
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith('user@example.com', expect.any(String));
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('throws error if user is already verified', async () => {
      mockReq.body.email = 'user@example.com';
      db.query.mockResolvedValueOnce({ 
        rows: [{ id: 'user-1', email: 'user@example.com', email_verified: true }] 
      });

      await authController.resendVerification(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Email is already verified',
        status: 400
      }));
    });
  });

  describe('logout', () => {
    it('revokes all tokens when req.user is populated and clears cookies on both paths', async () => {
      mockReq.user = { id: 'user-123' };

      await authController.logout(mockReq, mockRes, mockNext);

      expect(authService.revokeAllTokens).toHaveBeenCalledWith('user-123');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({ path: '/api/auth/refresh' }));
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({ path: '/' }));
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Logged out successfully',
      }));
    });

    it('revokes refresh token from cookie when req.user is absent', async () => {
      mockReq.cookies = { refreshToken: 'cookie-refresh-token-xyz' };

      await authController.logout(mockReq, mockRes, mockNext);

      expect(authService.revokeRefreshToken).toHaveBeenCalledWith('cookie-refresh-token-xyz');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({ path: '/api/auth/refresh' }));
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({ path: '/' }));
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    it('revokes refresh token from body when req.user and cookies are absent', async () => {
      mockReq.body = { refreshToken: 'body-refresh-token-xyz' };

      await authController.logout(mockReq, mockRes, mockNext);

      expect(authService.revokeRefreshToken).toHaveBeenCalledWith('body-refresh-token-xyz');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({ path: '/api/auth/refresh' }));
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('clears cookies and returns 200 even if no user or token is provided', async () => {
      mockReq = { body: {}, query: {}, cookies: {} };

      await authController.logout(mockReq, mockRes, mockNext);

      expect(authService.revokeAllTokens).not.toHaveBeenCalled();
      expect(authService.revokeRefreshToken).not.toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({ path: '/api/auth/refresh' }));
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({ path: '/' }));
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('passes error to next middleware if service throws', async () => {
      mockReq.user = { id: 'user-err' };
      const testErr = new Error('Database failure');
      authService.revokeAllTokens.mockRejectedValueOnce(testErr);

      await authController.logout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testErr);
    });
  });

  describe('authService session revocation methods', () => {
    const actualAuthService = jest.requireActual('../src/services/authService');

    it('revokeAllTokens updates all non-revoked refresh tokens for user', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 2 });
      await actualAuthService.revokeAllTokens('user-abc');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL'),
        ['user-abc']
      );
    });

    it('revokeRefreshToken looks up token hash and revokes family and user tokens', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ user_id: 'user-xyz', family_id: 'family-123' }],
      });
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      await actualAuthService.revokeRefreshToken('sample-refresh-token-string');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT user_id, family_id FROM refresh_tokens WHERE token_hash = $1'),
        [expect.any(String)]
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked_at = NOW() WHERE (family_id = $1 OR user_id = $2) AND revoked_at IS NULL'),
        ['family-123', 'user-xyz']
      );
    });
  });
});
