const submissionService = require('../src/services/submissionService');
const db = require('../src/config/database');

jest.mock('../src/config/database');

// Mock enqueueSubmission to avoid bullmq errors during required files loading
jest.mock('../src/queue/producer', () => ({
  enqueueSubmission: jest.fn()
}));

describe('Submission Service - getSubmission Security Audit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Guest can access guest-owned submission', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'sub-1', user_id: null }] });
    
    const result = await submissionService.getSubmission('sub-1', null);
    
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('s.user_id IS NULL'),
      ['sub-1']
    );
    expect(result).toEqual({ id: 'sub-1', user_id: null });
  });

  it('Guest cannot access other user submission', async () => {
    // If submission exists but belongs to a user, 'user_id IS NULL' will fail to find it
    db.query.mockResolvedValueOnce({ rows: [] });
    
    await expect(submissionService.getSubmission('sub-2', null)).rejects.toThrow('Submission not found');
    
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('s.user_id IS NULL'),
      ['sub-2']
    );
  });

  it('User can access own submission', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'sub-3', user_id: 'user-1' }] });
    
    const result = await submissionService.getSubmission('sub-3', { id: 'user-1', role: 'user' });
    
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('AND user_id = $2'),
      ['sub-3', 'user-1']
    );
    expect(result).toEqual({ id: 'sub-3', user_id: 'user-1' });
  });

  it('User cannot access another user submission', async () => {
    // Querying for a submission they do not own returns nothing due to AND user_id = $2
    db.query.mockResolvedValueOnce({ rows: [] });
    
    await expect(submissionService.getSubmission('sub-4', { id: 'user-1', role: 'user' })).rejects.toThrow('Submission not found');
    
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('AND user_id = $2'),
      ['sub-4', 'user-1']
    );
  });

  it('Admin can access any submission', async () => {
    // Admin query does not include any user_id filter
    db.query.mockResolvedValueOnce({ rows: [{ id: 'sub-5', user_id: 'user-2' }] });
    
    const result = await submissionService.getSubmission('sub-5', { id: 'admin-1', role: 'admin' });
    
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT 1'),
      ['sub-5']
    );
    expect(result).toEqual({ id: 'sub-5', user_id: 'user-2' });
  });

  describe('Data Leakage Prevention', () => {
    it('redacts private test case details for non-admins', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'sub-leak',
          user_id: 'user-1',
          failed_test_is_sample: false,
          failed_test_input: 'private_in',
          failed_test_expected: 'private_exp',
          failed_test_actual: 'actual',
          error_message: 'Detailed error trace'
        }]
      });

      const result = await submissionService.getSubmission('sub-leak', { id: 'user-1', role: 'user' });

      expect(result.failed_test_input).toBeNull();
      expect(result.failed_test_expected).toBeNull();
      expect(result.failed_test_actual).toBeNull();
      expect(result.error_message).toBe('Hidden execution trace');
      expect(result.failed_test_is_sample).toBeUndefined(); // Should be deleted
    });

    it('retains private test case details for admins', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'sub-leak-admin',
          user_id: 'user-1',
          failed_test_is_sample: false,
          failed_test_input: 'private_in',
          failed_test_expected: 'private_exp',
          failed_test_actual: 'actual',
          error_message: 'Detailed error trace'
        }]
      });

      const result = await submissionService.getSubmission('sub-leak-admin', { id: 'admin-1', role: 'admin' });

      expect(result.failed_test_input).toBe('private_in');
      expect(result.failed_test_expected).toBe('private_exp');
      expect(result.failed_test_actual).toBe('actual');
      expect(result.error_message).toBe('Detailed error trace');
    });

    it('does not redact sample test case details for non-admins', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'sub-leak-sample',
          user_id: 'user-1',
          failed_test_is_sample: true,
          failed_test_input: 'sample_in',
          failed_test_expected: 'sample_exp',
          failed_test_actual: 'sample_actual',
          error_message: 'Some error'
        }]
      });

      const result = await submissionService.getSubmission('sub-leak-sample', { id: 'user-1', role: 'user' });

      expect(result.failed_test_input).toBe('sample_in');
      expect(result.failed_test_expected).toBe('sample_exp');
      expect(result.failed_test_actual).toBe('sample_actual');
      expect(result.error_message).toBe('Some error');
    });
  });
});
