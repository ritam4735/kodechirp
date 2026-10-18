'use client';

const requestAdmin = async (path, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kc_token') : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}/api/admin${path}`, { headers, ...options });
  let data = await res.json().catch(() => ({}));

  if (res.status === 401 && (data.code === 'TOKEN_EXPIRED' || data.error?.toLowerCase().includes('token'))) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData.accessToken;
        if (typeof window !== 'undefined') {
          localStorage.setItem('kc_token', newToken);
          if (refreshData.user) {
            localStorage.setItem('kc_user', JSON.stringify(refreshData.user));
          }
        }

        // Retry original request with refreshed token
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${API_BASE}/api/admin${path}`, {
          headers,
          ...options,
        });
        data = await res.json().catch(() => ({}));
      }
    } catch (e) {
      console.error('Failed to refresh token in adminApi', e);
    }
  }

  if (!res.ok) {
    let errorMessage = data.error || `Admin request failed (HTTP ${res.status})`;
    if (data.details && Array.isArray(data.details)) {
      const detailsStr = data.details.map(d => `${d.field || d.path || d.param}: ${d.message || d.msg}`).join(', ');
      errorMessage += ` - ${detailsStr}`;
    }
    throw new Error(errorMessage);
  }
  return data;
};

export const adminApi = {
  // ── Dashboard ─────────────────────────────────────────────────────────────
  getStats: () => requestAdmin('/stats'),
  getAnalytics: () => requestAdmin('/stats/analytics'),

  // ── Problems ──────────────────────────────────────────────────────────────
  getProblems: async (params = {}) => {
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
    const res = await requestAdmin(`/problems?${qs.toString()}`);
    return {
      ...res,
      problems: res.data || [],
      data: res.data || [],
    };
  },

  getProblem: (id) => requestAdmin(`/problems/${id}`),
  createProblem: (data) =>
    requestAdmin('/problems', { method: 'POST', body: JSON.stringify(data) }),
  generateExamples: (data) =>
    requestAdmin('/problems/generate-examples', { method: 'POST', body: JSON.stringify(data) }),
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
  deleteUser: (id) =>
    requestAdmin(`/users/${id}`, { method: 'DELETE' }),

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

  // ── Normalization Pipeline ────────────────────────────────────────────────
  parseProblem: (id) =>
    requestAdmin(`/problems/${id}/parse`, { method: 'POST' }),
  batchParse: (ids) =>
    requestAdmin('/problems/batch-parse', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  normalizeProblem: (id) =>
    requestAdmin(`/problems/${id}/normalize`, { method: 'POST' }),
  getReviewQueue: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset) qs.set('offset', params.offset);
    if (params.limit) qs.set('limit', params.limit);
    if (params.review_status) qs.set('review_status', params.review_status);
    if (params.min_confidence) qs.set('min_confidence', params.min_confidence);
    if (params.max_confidence) qs.set('max_confidence', params.max_confidence);
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
    return requestAdmin(`/problems/review-queue?${qs.toString()}`);
  },
  approveParsing: (id, data = {}) =>
    requestAdmin(`/problems/${id}/approve-parsing`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateReviewStatus: (id, reviewStatus) =>
    requestAdmin(`/problems/${id}/review-status`, {
      method: 'POST',
      body: JSON.stringify({ review_status: reviewStatus }),
    }),
  getAIStatus: () => requestAdmin('/normalization/ai-status'),

  // ── Reference Solutions ───────────────────────────────────────────────────
  getReferenceSolution: (problemId) =>
    requestAdmin(`/problems/${problemId}/reference-solution`),
  upsertReferenceSolution: (problemId, data) =>
    requestAdmin(`/problems/${problemId}/reference-solution`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteReferenceSolution: (problemId) =>
    requestAdmin(`/problems/${problemId}/reference-solution`, { method: 'DELETE' }),
  verifyReferenceSolution: (problemId) =>
    requestAdmin(`/problems/${problemId}/reference-solution/verify`, { method: 'POST' }),

  // ── Test Generation ───────────────────────────────────────────────────────
  generateTests: (problemId, options = {}) =>
    requestAdmin(`/problems/${problemId}/generate-tests`, {
      method: 'POST',
      body: JSON.stringify(options),
    }),

  // ── Unified Question Bank ─────────────────────────────────────────────────
  getAssessmentQuestions: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset !== undefined) qs.set('offset', params.offset);
    if (params.limit !== undefined) qs.set('limit', params.limit);
    if (params.search) qs.set('search', params.search);
    if (params.category) qs.set('category', params.category);
    if (params.topic) qs.set('topic', params.topic);
    if (params.difficulty) qs.set('difficulty', params.difficulty);
    if (params.question_type) qs.set('question_type', params.question_type);
    if (params.is_active !== undefined) qs.set('is_active', params.is_active);
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
    return requestAdmin(`/assessment-questions?${qs.toString()}`);
  },
  getAssessmentQuestion: (id) => requestAdmin(`/assessment-questions/${id}`),
  createAssessmentQuestion: (data) =>
    requestAdmin('/assessment-questions', { method: 'POST', body: JSON.stringify(data) }),
  updateAssessmentQuestion: (id, data) =>
    requestAdmin(`/assessment-questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssessmentQuestion: (id) =>
    requestAdmin(`/assessment-questions/${id}`, { method: 'DELETE' }),
  toggleAssessmentQuestionStatus: (id) =>
    requestAdmin(`/assessment-questions/${id}/toggle-status`, { method: 'POST' }),
  getImportBatches: () => requestAdmin('/assessment-questions/batches'),

  // ── Assessment & Test Builder ─────────────────────────────────────────────
  getAssessments: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset !== undefined) qs.set('offset', params.offset);
    if (params.limit !== undefined) qs.set('limit', params.limit);
    if (params.status) qs.set('status', params.status);
    if (params.category) qs.set('category', params.category);
    if (params.search) qs.set('search', params.search);
    return requestAdmin(`/assessments?${qs.toString()}`);
  },
  getAssessment: (id) => requestAdmin(`/assessments/${id}`),
  createAssessment: (data) =>
    requestAdmin('/assessments', { method: 'POST', body: JSON.stringify(data) }),
  updateAssessment: (id, data) =>
    requestAdmin(`/assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssessment: (id) =>
    requestAdmin(`/assessments/${id}`, { method: 'DELETE' }),
  toggleAssessmentStatus: (id, status) =>
    requestAdmin(`/assessments/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  getAssessmentAttempts: (id) => requestAdmin(`/assessments/${id}/attempts`),

  // Section Management
  createAssessmentSection: (assessmentId, data) =>
    requestAdmin(`/assessments/${assessmentId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
  updateAssessmentSection: (sectionId, data) =>
    requestAdmin(`/assessments/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssessmentSection: (sectionId) =>
    requestAdmin(`/assessments/sections/${sectionId}`, { method: 'DELETE' }),
  addQuestionToSection: (sectionId, data) =>
    requestAdmin(`/assessments/sections/${sectionId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  removeQuestionFromSection: (mappingId) =>
    requestAdmin(`/assessments/sections/questions/${mappingId}`, { method: 'DELETE' }),
  populateRandomQuestions: (sectionId, data) =>
    requestAdmin(`/assessments/sections/${sectionId}/populate-random`, { method: 'POST', body: JSON.stringify(data) }),
};
