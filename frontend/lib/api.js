// frontend/lib/api.js
// ─────────────────────────────────────────────────────────────────────────────
// Real API client. All mock functions have been removed.
// Set NEXT_PUBLIC_API_URL in your .env.local (default: http://localhost:4000).
// ─────────────────────────────────────────────────────────────────────────────

import { useAuthStore } from '../store/authStore';

export function getApiBase() {
  if (typeof window !== 'undefined') {
    if (!window.location.port || window.location.port === '80' || window.location.port === '443') {
      return '';
    }
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '';
    }
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost:4000')) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return '';
  }
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://gateway:4000';
}

async function request(path, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kc_token') : null;
  const API_BASE = getApiBase();
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });

  let data = await res.json().catch(() => ({}));

  if (res.status === 401 && data.code === 'TOKEN_EXPIRED') {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData.accessToken;
        
        localStorage.setItem('kc_token', newToken);
        localStorage.setItem('kc_user', JSON.stringify(refreshData.user));
        useAuthStore.getState().login(refreshData.user, newToken);

        // Retry original request
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${API_BASE}${path}`, {
          credentials: 'include',
          ...options,
          headers,
        });
        data = await res.json().catch(() => ({}));
      } else {
        useAuthStore.getState().logout();
        localStorage.removeItem('kc_token');
        localStorage.removeItem('kc_user');
      }
    } catch (e) {
      console.error('Failed to refresh token', e);
    }
  }

  if (!res.ok) {
    let errorMessage = data.error || `HTTP ${res.status}`;
    if (data.details && Array.isArray(data.details)) {
      const detailsStr = data.details.map(d => `${d.field || d.path || d.param}: ${d.message || d.msg}`).join(', ');
      errorMessage += ` - ${detailsStr}`;
    }
    throw new Error(errorMessage);
  }

  return data;
}

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  login: async (identifier, password) => {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    return data;
  },

  logout: async () => {
    try {
      return await request('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.warn('[Auth] Remote logout request failed non-fatally:', e);
      return { success: false, error: e.message };
    }
  },

  signup: async (email, password, username) => {
    const data = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    });
    return data;
  },

  forgotPassword: async (email) => {
    const data = await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data;
  },

  resetPassword: async (email, token, newPassword) => {
    const data = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, token, newPassword }),
    });
    return data;
  },

  verifyEmail: async (email, token) => {
    const data = await request('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, token }),
    });
    return data;
  },

  registerCollege: async (data) => {
    return request('/api/auth/register-college', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyCollegeEmail: async (token) => {
    return request(`/api/auth/register-college/verify-email?token=${encodeURIComponent(token)}`);
  },

  resendVerification: async (email) => {
    const data = await request('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data;
  },

  // ── Profile ─────────────────────────────────────────────────────────────────
  getProfile: async () => {
    const data = await request('/api/profile');
    return data;
  },

  updateProfile: async (updates) => {
    const data = await request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data;
  },

  changePassword: async (current_password, new_password) => {
    const data = await request('/api/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password }),
    });
    return data;
  },

  updateAvatar: async (avatar_url) => {
    const data = await request('/api/profile/avatar', {
      method: 'POST',
      body: JSON.stringify({ avatar_url }),
    });
    return data;
  },

  // ── Problems ────────────────────────────────────────────────────────────────

  getProblems: async (searchQuery = '', { page = 1, limit = 50, difficulty = '', topic = '' } = {}) => {
    const qs = new URLSearchParams();
    if (searchQuery) qs.set('search', searchQuery);
    if (page) qs.set('page', page);
    if (limit) qs.set('limit', limit);
    if (difficulty) qs.set('difficulty', difficulty);
    if (topic) qs.set('topic', topic);
    const queryStr = qs.toString() ? `?${qs.toString()}` : '';
    const data = await request(`/api/problems${queryStr}`);
    // Backend returns { success, data: [...], pagination: { page, limit, total }, counts: { total, Easy, Medium, Hard }, topics: [...] }
    return { problems: data.data, pagination: data.pagination, counts: data.counts, topics: data.topics };
  },

  getProblem: async (slug) => {
    const data = await request(`/api/problems/${slug}`);
    // Backend returns { success, data: { ...problem, testCases: [...] } }
    const problem = data.data;
    // Normalise test cases to the shape the frontend already uses: { input, output }
    problem.testCases = (problem.testCases || []).map((tc) => ({
      input: tc.input,
      output: tc.expected_output,
    }));
    return { problem };
  },

  // ── Code execution ──────────────────────────────────────────────────────────

  runCode: async (codeOrObj, language, stdin = '', problemId = null, judgeMode = null, signatureMetadata = null) => {
    let body;
    if (codeOrObj && typeof codeOrObj === 'object') {
      body = {
        code: codeOrObj.code || '',
        language: codeOrObj.language || 'python',
        stdin: codeOrObj.stdin || '',
      };
      if (codeOrObj.problem_id || codeOrObj.problemId) body.problem_id = codeOrObj.problem_id || codeOrObj.problemId;
      if (codeOrObj.judgeMode) body.judgeMode = codeOrObj.judgeMode;
      if (codeOrObj.signatureMetadata) body.signatureMetadata = codeOrObj.signatureMetadata;
    } else {
      body = { code: codeOrObj, language, stdin };
      if (problemId) body.problem_id = problemId;
      if (judgeMode) body.judgeMode = judgeMode;
      if (signatureMetadata) body.signatureMetadata = signatureMetadata;
    }

    const data = await request('/api/submissions/run', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return {
      output: data.output || '',
      stdout: data.stdout || '',
      error: data.error || false,
      stderr: data.stderr || '',
      exitCode: data.exitCode,
      timedOut: data.timedOut || false,
      testCaseResults: data.testCaseResults || [],
      allPassed: data.allPassed,
      compileError: data.compileError,
    };
  },

  submitCode: async (problemIdOrObj, code, language) => {
    let body;
    if (problemIdOrObj && typeof problemIdOrObj === 'object') {
      body = {
        problem_id: problemIdOrObj.problem_id || problemIdOrObj.problemId,
        code: problemIdOrObj.code,
        language: problemIdOrObj.language,
      };
    } else {
      body = { problem_id: problemIdOrObj, code, language };
    }

    const data = await request('/api/submissions/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    // Backend returns { success, data: { submissionId, status, testCasesTotal, queueId } }
    const result = data.data;
    
    let currentStatus = result.status;
    let submission = result;
    const maxAttempts = 30; // 30 seconds max polling
    let attempts = 0;
    
    // Poll until status is not queued or running
    while (currentStatus === 'queued' || currentStatus === 'running' || currentStatus === 'processing') {
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error('Submission evaluation timed out. Please check your submissions tab.');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollData = await request(`/api/submissions/${result.submissionId}`);
      submission = pollData.data;
      currentStatus = submission.status;
    }

    return {
      submissionId: submission.id || result.submissionId,
      id: submission.id || result.submissionId,
      verdict: submission.status,
      runtime: submission.runtime_ms ? `${submission.runtime_ms} ms` : 'N/A',
      memory: submission.memory_kb ? `${(submission.memory_kb / 1024).toFixed(1)} MB` : 'N/A',
      failedInput: submission.failed_test_input,
      failedExpected: submission.failed_test_expected,
      failedActual: submission.failed_test_actual,
      passed: submission.test_cases_passed || 0,
      total: submission.test_cases_total || 0,
      errorMessage: submission.error_message,
      details: buildDetails({
        verdict: submission.status,
        passed: submission.test_cases_passed || 0,
        total: submission.test_cases_total || 0,
        error: submission.error_message,
        failedInput: submission.failed_test_input,
        failedExpected: submission.failed_test_expected,
        failedActual: submission.failed_test_actual,
      }),
    };
  },

  getUserSubmissions: async () => {
    const data = await request('/api/submissions/user');
    return data.data || [];
  },

  // ── Chirps (Community Engine) ─────────────────────────────────────────────

  getChirps: async (params = {}) => {
    let query = '';
    if (typeof params === 'string') {
      query = `?problem_id=${encodeURIComponent(params)}`;
    } else if (params && typeof params === 'object') {
      const qs = new URLSearchParams();
      if (params.problem_id) qs.set('problem_id', params.problem_id);
      if (params.sort) qs.set('sort', params.sort);
      if (params.tag) qs.set('tag', params.tag);
      if (params.search) qs.set('search', params.search);
      if (params.parent_id) qs.set('parent_id', params.parent_id);
      if (params.page) qs.set('page', params.page);
      if (params.limit) qs.set('limit', params.limit);
      const str = qs.toString();
      if (str) query = `?${str}`;
    }
    const data = await request(`/api/chirps${query}`);
    return data.data || [];
  },

  getChirpsFeed: async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.problem_id) qs.set('problem_id', params.problem_id);
    if (params.sort) qs.set('sort', params.sort);
    if (params.tag) qs.set('tag', params.tag);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    const data = await request(`/api/chirps?${qs.toString()}`);
    return data;
  },

  getChirp: async (id) => {
    const data = await request(`/api/chirps/${id}`);
    return data.data;
  },

  getChirpReplies: async (id) => {
    const data = await request(`/api/chirps/${id}/replies`);
    return data.data || [];
  },

  postChirp: async (payloadOrProblemId, content, codeSnippet, approachTag, parentId) => {
    let bodyPayload = {};
    if (typeof payloadOrProblemId === 'object' && payloadOrProblemId !== null) {
      bodyPayload = payloadOrProblemId;
    } else {
      bodyPayload = {
        problem_id: payloadOrProblemId,
        content,
        code_snippet: codeSnippet,
        approach_tag: approachTag,
        parent_id: parentId,
      };
    }
    const data = await request('/api/chirps', {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
    });
    return data.data;
  },

  updateChirp: async (id, payload) => {
    const data = await request(`/api/chirps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data.data;
  },

  deleteChirp: async (id) => {
    const data = await request(`/api/chirps/${id}`, {
      method: 'DELETE',
    });
    return data;
  },

  upvoteChirp: async (id) => {
    const data = await request(`/api/chirps/${id}/upvote`, {
      method: 'POST',
    });
    return data;
  },

  getChirpTags: async () => {
    const data = await request('/api/chirps/tags');
    return data.data || [];
  },

  // ── Assessments ─────────────────────────────────────────────────────────

  getPublishedAssessments: async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.search) qs.set('search', params.search);
    const data = await request(`/api/assessments?${qs.toString()}`);
    return data.assessments || [];
  },

  getAssessmentOverview: async (id) => {
    const data = await request(`/api/assessments/${id}`);
    return data;
  },

  startAssessmentAttempt: async (id) => {
    const data = await request(`/api/assessments/${id}/start`, { method: 'POST' });
    return data;
  },

  getActiveAssessmentAttempt: async () => {
    const data = await request('/api/assessments/active-attempt');
    return data;
  },

  getAttemptData: async (attemptId) => {
    const data = await request(`/api/assessments/attempts/${attemptId}`);
    return data;
  },

  saveAssessmentResponse: async (attemptId, payload) => {
    const data = await request(`/api/assessments/attempts/${attemptId}/save-response`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data;
  },

  submitAssessmentAttempt: async (attemptId, payload = {}) => {
    const safePayload = (payload && typeof payload === 'object' && !payload.nativeEvent && !payload.target)
      ? { ...payload }
      : {};
    if (typeof safePayload.submission_reason !== 'string') {
      safePayload.submission_reason = 'manual';
    }
    const data = await request(`/api/assessments/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify(safePayload),
    });
    return data;
  },

  recordAssessmentViolation: async (attemptId, payload = {}) => {
    const safePayload = (payload && typeof payload === 'object' && !payload.nativeEvent && !payload.target)
      ? { ...payload }
      : {};
    const eventType = safePayload.event_type || safePayload.violation_type;
    if (eventType) {
      safePayload.event_type = eventType;
      safePayload.violation_type = eventType;
    }
    const data = await request(`/api/assessments/attempts/${attemptId}/violation`, {
      method: 'POST',
      body: JSON.stringify(safePayload),
    });
    return data;
  },

  getAttemptResult: async (attemptId) => {
    const data = await request(`/api/assessments/attempts/${attemptId}/result`);
    return data;
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildDetails(result) {
  if (result.verdict === 'Accepted') {
    return `All ${result.total} test case${result.total !== 1 ? 's' : ''} passed!`;
  }

  if (result.verdict === 'Wrong Answer') {
    return [
      `Failed on test case ${result.passed + 1} of ${result.total}.`,
      result.failedInput ? `\nInput:    ${result.failedInput}` : '',
      result.failedExpected ? `\nExpected: ${result.failedExpected}` : '',
      result.failedActual ? `\nGot:      ${result.failedActual}` : '',
    ].join('');
  }

  if (result.verdict === 'Runtime Error') {
    return `Runtime error on test case ${result.passed + 1} of ${result.total}.\n${result.error || ''}`;
  }

  if (result.verdict === 'Time Limit Exceeded') {
    return `Time limit exceeded on test case ${result.passed + 1} of ${result.total}.`;
  }

  if (result.verdict === 'Internal Error') {
    return `Internal Error: ${result.error || 'Unknown error occurred on the server.'}`;
  }

  return result.verdict;
}
