'use client';

const requestAdmin = async (path, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kc_token') : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/admin${path}`, { headers, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Admin request failed');
  return data;
};

export const adminApi = {
  // ── Dashboard ─────────────────────────────────────────────────────────────
  getStats: () => requestAdmin('/stats'),
  getAnalytics: () => requestAdmin('/stats/analytics'),

  // ── Problems ──────────────────────────────────────────────────────────────
  getProblems: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset) qs.set('offset', params.offset);
    if (params.limit) qs.set('limit', params.limit);
    if (params.search) qs.set('search', params.search);
    if (params.difficulty) qs.set('difficulty', params.difficulty);
    if (params.status) qs.set('status', params.status);
    if (params.source) qs.set('source', params.source);
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
    if (params.tags) qs.set('tags', params.tags);
    return requestAdmin(`/problems?${qs.toString()}`);
  },

  getProblem: (id) => requestAdmin(`/problems/${id}`),
  createProblem: (data) =>
    requestAdmin('/problems', { method: 'POST', body: JSON.stringify(data) }),
  updateProblem: (id, data) =>
    requestAdmin(`/problems/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProblem: (id) =>
    requestAdmin(`/problems/${id}`, { method: 'DELETE' }),
  toggleProblemStatus: (id, status) =>
    requestAdmin(`/problems/${id}/toggle-status`, {
      method: 'POST',
      body: JSON.stringify({ status: status }),
    }),
  bulkAction: (ids, action) =>
    requestAdmin('/problems/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ ids, action }),
    }),

  // ── Test Cases ────────────────────────────────────────────────────────────
  getTestCases: (problemId) => requestAdmin(`/problems/${problemId}/test-cases`),
  createTestCase: (problemId, data) =>
    requestAdmin(`/problems/${problemId}/test-cases`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  bulkImportTestCases: (problemId, testCases) =>
    requestAdmin(`/problems/${problemId}/test-cases/bulk`, {
      method: 'POST',
      body: JSON.stringify({ test_cases: testCases }),
    }),
  updateTestCase: (id, data) =>
    requestAdmin(`/test-cases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTestCase: (id) =>
    requestAdmin(`/test-cases/${id}`, { method: 'DELETE' }),

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset) qs.set('offset', params.offset);
    if (params.limit) qs.set('limit', params.limit);
    if (params.search) qs.set('search', params.search);
    if (params.role) qs.set('role', params.role);
    if (params.status) qs.set('status', params.status);
    return requestAdmin(`/users?${qs.toString()}`);
  },
  updateUserRole: (id, role) =>
    requestAdmin(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  updateUserStatus: (id, isActive) =>
    requestAdmin(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ is_active: isActive }) }),

  // ── Submissions ───────────────────────────────────────────────────────────
  getSubmissions: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset) qs.set('offset', params.offset);
    if (params.limit) qs.set('limit', params.limit);
    if (params.user) qs.set('user', params.user);
    if (params.problem) qs.set('problem', params.problem);
    if (params.status) qs.set('status', params.status);
    if (params.language) qs.set('language', params.language);
    return requestAdmin(`/submissions?${qs.toString()}`);
  },

  // ── Validation ────────────────────────────────────────────────────────────
  validateProblem: (id) => requestAdmin(`/problems/${id}/validate`),

  // ── Reports ───────────────────────────────────────────────────────────────
  getTestCaseReport: () => requestAdmin('/reports/test-cases'),
};
