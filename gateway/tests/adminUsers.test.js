const adminController = require('../src/controllers/adminController');
const db = require('../src/config/database');

jest.mock('../src/config/database');
jest.mock('../src/services/monitorService', () => ({
  recordEvent: jest.fn(),
  flush: jest.fn(),
}));

describe('Admin Controller - User Management', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: { id: 'admin-1', role: 'admin' },
      params: {},
      body: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('deleteUser', () => {
    it('prevents self-deletion', async () => {
      mockReq.params.id = 'admin-1';

      await adminController.deleteUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot delete your own account',
      });
      expect(db.query).not.toHaveBeenCalled();
    });

    it('returns 404 when user to delete does not exist', async () => {
      mockReq.params.id = 'non-existent-user';
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await adminController.deleteUser(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1 RETURNING id, username, email',
        ['non-existent-user']
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
    });

    it('successfully deletes a user and returns confirmation', async () => {
      mockReq.params.id = 'target-user-id';
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'target-user-id', username: 'baduser', email: 'bad@example.com' }],
      });

      await adminController.deleteUser(mockReq, mockRes, mockNext);

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1 RETURNING id, username, email',
        ['target-user-id']
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User baduser deleted successfully',
        data: { id: 'target-user-id', username: 'baduser', email: 'bad@example.com' },
      });
    });

    it('passes errors to next() on db failure', async () => {
      mockReq.params.id = 'target-user-id';
      const dbError = new Error('Database connection failed');
      db.query.mockRejectedValueOnce(dbError);

      await adminController.deleteUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });

  describe('updateUserRole', () => {
    it('prevents self-demotion from admin', async () => {
      mockReq.params.id = 'admin-1';
      mockReq.body.role = 'user';

      await adminController.updateUserRole(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot demote yourself',
      });
    });

    it('updates user role successfully', async () => {
      mockReq.params.id = 'user-2';
      mockReq.body.role = 'moderator';
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'user-2', username: 'user2', role: 'moderator' }],
      });

      await adminController.updateUserRole(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 'user-2', username: 'user2', role: 'moderator' },
      });
    });
  });

  describe('updateUserStatus', () => {
    it('prevents self-suspension', async () => {
      mockReq.params.id = 'admin-1';
      mockReq.body.is_active = false;

      await adminController.updateUserStatus(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot change your own status',
      });
    });

    it('updates status successfully', async () => {
      mockReq.params.id = 'user-2';
      mockReq.body.is_active = false;
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'user-2', username: 'user2', is_active: false }],
      });

      await adminController.updateUserStatus(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 'user-2', username: 'user2', is_active: false },
      });
    });
  });
});
