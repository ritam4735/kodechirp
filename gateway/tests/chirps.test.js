// gateway/tests/chirps.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Automated Test Suite for Chirps Community Engine
// Tests controller handlers, service logic, permissions, upvoting, and threading
// ─────────────────────────────────────────────────────────────────────────────

const chirpController = require('../src/controllers/chirpController');
const chirpService = require('../src/services/chirpService');
const db = require('../src/config/database');

jest.mock('../src/config/database');

describe('Chirps Community Engine — Controller & Service Suite', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-uuid-1', username: 'alex_coder', role: 'user' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  // ── 1. GET CHIRPS FEED ─────────────────────────────────────────────────────
  describe('GET /api/chirps (getChirps)', () => {
    it('returns a paginated feed of chirps with author, replies count, and upvote state', async () => {
      mockReq.query = { sort: 'popular', page: '1', limit: '10' };

      const sampleChirps = [
        {
          id: 'c-1',
          content: 'Use two pointers for optimal space',
          upvote_count: 42,
          reply_count: 3,
          is_upvoted: true,
          author: 'alex_coder',
          problem_title: 'Two Sum',
        },
      ];

      db.query.mockImplementation((sql) => {
        if (sql.includes('AS total')) {
          return Promise.resolve({ rows: [{ total: 1 }] });
        }
        return Promise.resolve({ rows: sampleChirps });
      });

      await chirpController.getChirps(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: sampleChirps,
          total: 1,
          page: 1,
          limit: 10,
        })
      );
    });

    it('filters chirps by problem_id when requested', async () => {
      mockReq.query = { problem_id: 'prob-123' };

      db.query.mockImplementation((sql, params) => {
        if (sql.includes('AS total')) {
          return Promise.resolve({ rows: [{ total: 1 }] });
        }
        expect(sql).toContain('c.problem_id::text = $');
        expect(params).toContain('prob-123');
        return Promise.resolve({ rows: [] });
      });

      await chirpController.getChirps(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('filters chirps by approach_tag', async () => {
      mockReq.query = { tag: 'hash-map' };

      db.query.mockImplementation((sql, params) => {
        if (sql.includes('AS total')) {
          return Promise.resolve({ rows: [{ total: 1 }] });
        }
        expect(sql).toContain('LOWER(c.approach_tag) = $');
        expect(params).toContain('hash-map');
        return Promise.resolve({ rows: [] });
      });

      await chirpController.getChirps(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  // ── 2. GET SINGLE CHIRP & REPLIES ──────────────────────────────────────────
  describe('GET /api/chirps/:id and /api/chirps/:id/replies', () => {
    it('returns 404 when chirp does not exist', async () => {
      mockReq.params = { id: 'c-missing' };
      db.query.mockResolvedValueOnce({ rows: [] });

      await chirpController.getChirpById(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'Chirp not found' });
    });

    it('returns chirp with problem and author details when found', async () => {
      mockReq.params = { id: 'c-1' };
      const chirp = { id: 'c-1', content: 'Insightful solution', author: 'marcus' };
      db.query.mockResolvedValueOnce({ rows: [chirp] });

      await chirpController.getChirpById(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: chirp });
    });

    it('returns threaded replies for a chirp in chronological order', async () => {
      mockReq.params = { id: 'c-parent-1' };
      const replies = [
        { id: 'r-1', parent_id: 'c-parent-1', content: 'Agreed!', author: 'jane' },
        { id: 'r-2', parent_id: 'c-parent-1', content: 'What about edge cases?', author: 'bob' },
      ];
      db.query.mockResolvedValueOnce({ rows: replies });

      await chirpController.getChirpReplies(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: replies });
    });
  });

  // ── 3. CREATE CHIRP & THREADED REPLY ───────────────────────────────────────
  describe('POST /api/chirps (postChirp)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockReq.user = null;
      await chirpController.postChirp(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'Authentication required' });
    });

    it('rejects empty content with 400', async () => {
      mockReq.body = { content: '   ' };

      await chirpController.postChirp(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Chirp content cannot be empty', status: 400 })
      );
    });

    it('creates a new top-level chirp linked to an authenticated user and problem', async () => {
      mockReq.body = {
        problem_id: 'prob-1',
        content: 'This problem requires monotonic queue invariant',
        code_snippet: 'class Solution: pass',
        approach_tag: 'queue',
      };

      // 1. Check problem exists
      db.query.mockResolvedValueOnce({ rows: [{ id: 'prob-1' }] });
      // 2. Insert chirp
      db.query.mockResolvedValueOnce({ rows: [{ id: 'new-chirp-id' }] });
      // 3. Fetch newly created chirp
      const createdChirp = {
        id: 'new-chirp-id',
        content: mockReq.body.content,
        author: 'alex_coder',
        problem_title: 'Sliding Window Maximum',
      };
      db.query.mockResolvedValueOnce({ rows: [createdChirp] });

      await chirpController.postChirp(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: createdChirp });
    });

    it('creates a threaded reply and inherits parent problem_id', async () => {
      mockReq.body = {
        parent_id: 'c-parent-1',
        content: 'Here is an alternative edge case handling',
      };

      // 1. Verify parent chirp
      db.query.mockResolvedValueOnce({ rows: [{ id: 'c-parent-1', problem_id: 'prob-1' }] });
      // 2. Verify problem exists
      db.query.mockResolvedValueOnce({ rows: [{ id: 'prob-1' }] });
      // 3. Insert reply
      db.query.mockResolvedValueOnce({ rows: [{ id: 'reply-1' }] });
      // 4. Fetch created reply
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'reply-1', parent_id: 'c-parent-1', content: mockReq.body.content }],
      });

      await chirpController.postChirp(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: 'reply-1', parent_id: 'c-parent-1' }),
        })
      );
    });
  });

  // ── 4. UPDATE CHIRP ────────────────────────────────────────────────────────
  describe('PUT /api/chirps/:id (updateChirp)', () => {
    it('prevents non-owners from editing another user chirp', async () => {
      mockReq.params = { id: 'chirp-other' };
      mockReq.user = { id: 'user-uuid-1', role: 'user' };
      mockReq.body = { content: 'Malicious modification' };

      // Existing chirp belongs to user-uuid-2
      db.query.mockResolvedValueOnce({ rows: [{ id: 'chirp-other', user_id: 'user-uuid-2' }] });

      await chirpController.updateChirp(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'You do not have permission to edit this chirp', status: 403 })
      );
    });

    it('allows author to update content and code_snippet', async () => {
      mockReq.params = { id: 'chirp-own' };
      mockReq.user = { id: 'user-uuid-1', role: 'user' };
      mockReq.body = { content: 'Updated explanation with clearer proof', code_snippet: 'updated()' };

      // Existing chirp owned by user-uuid-1
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'chirp-own', user_id: 'user-uuid-1', content: 'Old content' }],
      });
      // Update query
      db.query.mockResolvedValueOnce({ rows: [] });
      // Fetch updated chirp
      const updatedChirp = { id: 'chirp-own', content: 'Updated explanation with clearer proof' };
      db.query.mockResolvedValueOnce({ rows: [updatedChirp] });

      await chirpController.updateChirp(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updatedChirp });
    });

    it('allows admin to edit any chirp', async () => {
      mockReq.params = { id: 'chirp-other' };
      mockReq.user = { id: 'admin-id', role: 'admin' };
      mockReq.body = { content: 'Admin clarified note' };

      db.query.mockResolvedValueOnce({
        rows: [{ id: 'chirp-other', user_id: 'user-uuid-2', content: 'Original' }],
      });
      db.query.mockResolvedValueOnce({ rows: [] });
      db.query.mockResolvedValueOnce({ rows: [{ id: 'chirp-other', content: 'Admin clarified note' }] });

      await chirpController.updateChirp(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ content: 'Admin clarified note' }) })
      );
    });
  });

  // ── 5. DELETE CHIRP ────────────────────────────────────────────────────────
  describe('DELETE /api/chirps/:id (deleteChirp)', () => {
    it('prevents non-owners from deleting other user chirps', async () => {
      mockReq.params = { id: 'chirp-other' };
      mockReq.user = { id: 'user-uuid-1', role: 'user' };

      db.query.mockResolvedValueOnce({ rows: [{ id: 'chirp-other', user_id: 'user-uuid-2' }] });

      await chirpController.deleteChirp(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'You do not have permission to delete this chirp', status: 403 })
      );
    });

    it('allows author to delete own chirp', async () => {
      mockReq.params = { id: 'chirp-own' };
      mockReq.user = { id: 'user-uuid-1', role: 'user' };

      db.query.mockResolvedValueOnce({ rows: [{ id: 'chirp-own', user_id: 'user-uuid-1' }] });
      db.query.mockResolvedValueOnce({ rows: [] }); // DELETE query

      await chirpController.deleteChirp(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Chirp deleted successfully' });
    });

    it('allows moderator to delete inappropriate chirps', async () => {
      mockReq.params = { id: 'chirp-flagged' };
      mockReq.user = { id: 'mod-1', role: 'moderator' };

      db.query.mockResolvedValueOnce({ rows: [{ id: 'chirp-flagged', user_id: 'user-uuid-3' }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      await chirpController.deleteChirp(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Chirp deleted successfully' });
    });
  });

  // ── 6. UPVOTING AND DEDUPLICATION ──────────────────────────────────────────
  describe('POST /api/chirps/:id/upvote (toggleUpvote)', () => {
    it('rejects unauthenticated upvote attempts with 401', async () => {
      mockReq.user = null;
      mockReq.params = { id: 'chirp-1' };

      await chirpController.toggleUpvote(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'Authentication required' });
    });

    it('adds upvote when user has not voted yet', async () => {
      mockReq.params = { id: 'chirp-1' };
      mockReq.user = { id: 'user-1' };

      // 1. Check chirp exists
      db.query.mockResolvedValueOnce({ rows: [{ id: 'chirp-1', upvote_count: 5 }] });
      // 2. Check existing vote -> not found
      db.query.mockResolvedValueOnce({ rows: [] });
      // 3. Insert vote
      db.query.mockResolvedValueOnce({ rows: [] });
      // 4. Fresh count
      db.query.mockResolvedValueOnce({ rows: [{ upvote_count: 6 }] });

      await chirpController.toggleUpvote(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        upvoted: true,
        upvote_count: 6,
      });
    });

    it('removes upvote when user has already voted (toggle / unlike without duplicates)', async () => {
      mockReq.params = { id: 'chirp-1' };
      mockReq.user = { id: 'user-1' };

      // 1. Check chirp exists
      db.query.mockResolvedValueOnce({ rows: [{ id: 'chirp-1', upvote_count: 6 }] });
      // 2. Check existing vote -> found
      db.query.mockResolvedValueOnce({ rows: [{ chirp_id: 'chirp-1', user_id: 'user-1' }] });
      // 3. Delete vote
      db.query.mockResolvedValueOnce({ rows: [] });
      // 4. Fresh count
      db.query.mockResolvedValueOnce({ rows: [{ upvote_count: 5 }] });

      await chirpController.toggleUpvote(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        upvoted: false,
        upvote_count: 5,
      });
    });
  });

  // ── 7. POPULAR APPROACH TAGS ───────────────────────────────────────────────
  describe('GET /api/chirps/tags (getPopularTags)', () => {
    it('returns top approach tags with usage counts', async () => {
      const tags = [
        { approach_tag: 'hash-map', count: 42 },
        { approach_tag: 'two-pointers', count: 28 },
        { approach_tag: 'dynamic-programming', count: 19 },
      ];
      db.query.mockResolvedValueOnce({ rows: tags });

      await chirpController.getPopularTags(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: tags });
    });
  });
});
