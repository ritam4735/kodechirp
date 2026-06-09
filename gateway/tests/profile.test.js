// gateway/tests/profile.test.js

const profileController = require('../src/controllers/profileController');
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

jest.mock('../src/config/database');
jest.mock('bcryptjs');

describe('Profile Controller Security Audit', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-1' },
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns user profile and stats', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'user-1', username: 'testuser' }] });
      db.query.mockResolvedValueOnce({ rows: [{ problems_solved: '5', total_submissions: '10', accepted_submissions: '7' }] });

      await profileController.getProfile(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: { id: 'user-1', username: 'testuser' },
        stats: { problems_solved: 5, total_submissions: 10, acceptance_rate: 70 }
      });
    });

    it('returns 404 if user not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await profileController.getProfile(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'User not found' });
    });
  });

  describe('updateProfile', () => {
    it('updates allowed fields', async () => {
      mockReq.body = { display_name: 'Test Name', bio: 'New bio' };
      db.query.mockResolvedValueOnce({ rows: [{ id: 'user-1', display_name: 'Test Name', bio: 'New bio' }] });

      await profileController.updateProfile(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
        ['Test Name', undefined, 'New bio', undefined, undefined, undefined, undefined, 'user-1']
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('prevents updating to taken username', async () => {
      mockReq.body = { username: 'taken_user' };
      db.query.mockResolvedValueOnce({ rows: [{ id: 'other-user' }] });

      await profileController.updateProfile(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'Username already taken' });
    });
  });

  describe('changePassword', () => {
    it('successfully changes password when current password matches', async () => {
      mockReq.body = { current_password: 'oldPass', new_password: 'newPass' };
      db.query.mockResolvedValueOnce({ rows: [{ password_hash: 'hashedOldPass' }] });
      bcrypt.compare.mockResolvedValueOnce(true);
      bcrypt.genSalt.mockResolvedValueOnce('salt');
      bcrypt.hash.mockResolvedValueOnce('hashedNewPass');

      await profileController.changePassword(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password_hash = $1'),
        ['hashedNewPass', 'user-1']
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('rejects password change with incorrect current password', async () => {
      mockReq.body = { current_password: 'wrongPass', new_password: 'newPass' };
      db.query.mockResolvedValueOnce({ rows: [{ password_hash: 'hashedOldPass' }] });
      bcrypt.compare.mockResolvedValueOnce(false);

      await profileController.changePassword(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'Incorrect current password' });
    });
  });

  describe('updateAvatar', () => {
    it('updates avatar successfully', async () => {
      mockReq.body = { avatar_url: 'http://example.com/avatar.jpg' };
      db.query.mockResolvedValueOnce({ rows: [{ avatar_url: 'http://example.com/avatar.jpg' }] });

      await profileController.updateAvatar(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET avatar_url = $1'),
        ['http://example.com/avatar.jpg', 'user-1']
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('returns 400 if avatar_url is missing', async () => {
      await profileController.updateAvatar(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'Avatar URL is required' });
    });
  });
});
