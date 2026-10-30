'use client';

import { useAuthStore } from '../store/authStore';

export function getApiBase() {
  if (typeof window !== 'undefined') {
    // If accessed through reverse proxy (e.g. port 80 / 443 / empty port):
    if (!window.location.port || window.location.port === '80' || window.location.port === '443') {
      return '';
    }
    // If accessed via non-localhost IP/domain, use relative path so Next.js rewrites or reverse proxy handles it
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '';
    }
    // If NEXT_PUBLIC_API_URL is explicitly set to an external endpoint, use it
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost:4000')) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    // In Next.js dev server, relative requests are routed seamlessly via Next.js rewrites
    return '';
  }
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://gateway:4000';
}

const requestAdmin = async (path, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kc_token') : null;
  const API_BASE = getApiBase();

  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}/api/admin${path}`, { credentials: 'include', headers, ...options });
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
          credentials: 'include',
          headers,
          ...options,
        });
        data = await res.json().catch(() => ({}));
      } else {
        useAuthStore.getState().logout();
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
    if (data.issues && Array.isArray(data.issues)) {
      errorMessage += `:\n• ` + data.issues.join('\n• ');
    }
    const errorObj = new Error(errorMessage);
    errorObj.issues = data.issues || data.details;
    errorObj.status = res.status;
    errorObj.data = data;
    throw errorObj;
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
  updateUserRole: (id, role, organizationId = null) => {
    const payload = typeof role === 'object' ? role : { role, organizationId };
    return requestAdmin(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify(payload) });
  },
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
  importAssessmentQuestions: (payload) => {
    if (payload instanceof FormData) {
      return requestAdmin('/assessment-questions/import', { method: 'POST', body: payload });
    }
    return requestAdmin('/assessment-questions/import', { method: 'POST', body: JSON.stringify(payload) });
  },

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
  releaseAssessmentResults: (id) =>
    requestAdmin(`/assessments/${id}/release-results`, { method: 'POST' }),
  getAssessmentAttempts: (id) => requestAdmin(`/assessments/${id}/attempts`),
  getAssessmentViolations: (id) => requestAdmin(`/assessments/${id}/violations`),
  getAttemptViolations: (attemptId) => requestAdmin(`/assessments/attempts/${attemptId}/violations`),

  // Section Management
  createAssessmentSection: (assessmentId, data) =>
    requestAdmin(`/assessments/${assessmentId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
  reorderSections: (assessmentId, sectionIds) =>
    requestAdmin(`/assessments/${assessmentId}/sections/reorder`, { method: 'PUT', body: JSON.stringify({ section_ids: sectionIds }) }),
  updateAssessmentSection: (sectionId, data) =>
    requestAdmin(`/assessments/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssessmentSection: (sectionId) =>
    requestAdmin(`/assessments/sections/${sectionId}`, { method: 'DELETE' }),
  addQuestionToSection: (sectionId, data) =>
    requestAdmin(`/assessments/sections/${sectionId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  reorderQuestions: (sectionId, mappingIds) =>
    requestAdmin(`/assessments/sections/${sectionId}/questions/reorder`, { method: 'PUT', body: JSON.stringify({ mapping_ids: mappingIds }) }),
  updateQuestionMapping: (mappingId, data) =>
    requestAdmin(`/assessments/sections/questions/${mappingId}`, { method: 'PUT', body: JSON.stringify(data) }),
  moveQuestionBetweenSections: (mappingId, targetSectionId) =>
    requestAdmin(`/assessments/sections/questions/${mappingId}/move`, { method: 'PUT', body: JSON.stringify({ target_section_id: targetSectionId }) }),
  createQuestionAndAddToSection: (sectionId, data) =>
    requestAdmin(`/assessments/sections/${sectionId}/create-question`, { method: 'POST', body: JSON.stringify(data) }),
  removeQuestionFromSection: (mappingId) =>
    requestAdmin(`/assessments/sections/questions/${mappingId}`, { method: 'DELETE' }),
  populateRandomQuestions: (sectionId, data) =>
    requestAdmin(`/assessments/sections/${sectionId}/populate-random`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Assessment Assignments (Cohorts) ──────────────────────────────────────
  getAssessmentAssignments: (assessmentId) =>
    requestAdmin(`/assessments/${assessmentId}/assignments`),
  createAssessmentAssignment: (assessmentId, data) =>
    requestAdmin(`/assessments/${assessmentId}/assignments`, { method: 'POST', body: JSON.stringify(data) }),
  revokeAssessmentAssignment: (assessmentId, assignmentId) =>
    requestAdmin(`/assessments/${assessmentId}/assignments/${assignmentId}`, { method: 'DELETE' }),

  // ── Assessment Results Export ─────────────────────────────────────────────
  previewExportResults: (assessmentId, params = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.department) qs.set('department', params.department);
    if (params.academicYear) qs.set('academicYear', params.academicYear);
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    return requestAdmin(`/assessments/${assessmentId}/export/preview?${qs.toString()}`);
  },
  getExportHistory: (assessmentId) =>
    requestAdmin(`/assessments/${assessmentId}/export/history`),

  // ── Organizations / Colleges ──────────────────────────────────────────────
  getOrganizations: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset !== undefined) qs.set('offset', params.offset);
    if (params.limit !== undefined) qs.set('limit', params.limit);
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    return requestAdmin(`/organizations?${qs.toString()}`);
  },
  getOrganization: (id) => requestAdmin(`/organizations/${id}`),
  createOrganization: (data) =>
    requestAdmin('/organizations', { method: 'POST', body: JSON.stringify(data) }),
  updateOrganization: (id, data) =>
    requestAdmin(`/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleOrganizationStatus: (id, is_active) =>
    requestAdmin(`/organizations/${id}/status`, { method: 'POST', body: JSON.stringify({ is_active }) }),
  getOrganizationAdmins: (id) => requestAdmin(`/organizations/${id}/admins`),
  assignCollegeAdmin: (id, data) =>
    requestAdmin(`/organizations/${id}/admins`, { method: 'POST', body: JSON.stringify(data) }),
  revokeCollegeAdmin: (id, userId) =>
    requestAdmin(`/organizations/${id}/admins/${userId}`, { method: 'DELETE' }),

  // ── Student Roster Management ─────────────────────────────────────────────
  getRoster: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset !== undefined) qs.set('offset', params.offset);
    if (params.limit !== undefined) qs.set('limit', params.limit);
    if (params.search) qs.set('search', params.search);
    if (params.department) qs.set('department', params.department);
    if (params.academicYear) qs.set('academicYear', params.academicYear);
    if (params.status) qs.set('status', params.status);
    return requestAdmin(`/roster?${qs.toString()}`);
  },
  previewRosterImport: (formData) =>
    requestAdmin('/roster/preview', { method: 'POST', body: formData }),
  confirmRosterImport: (payload) =>
    requestAdmin('/roster/import', { method: 'POST', body: JSON.stringify(payload) }),
  getRosterImportHistory: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset !== undefined) qs.set('offset', params.offset);
    if (params.limit !== undefined) qs.set('limit', params.limit);
    return requestAdmin(`/roster/history?${qs.toString()}`);
  },
  updateStudentEligibility: (studentId, data) =>
    requestAdmin(`/roster/students/${studentId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Administrative Audit Logs ─────────────────────────────────────────────
  getAuditLogs: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset !== undefined) qs.set('offset', params.offset);
    if (params.limit !== undefined) qs.set('limit', params.limit);
    if (params.action) qs.set('action', params.action);
    if (params.targetType) qs.set('targetType', params.targetType);
    if (params.organizationId) qs.set('organizationId', params.organizationId);
    return requestAdmin(`/audit-logs?${qs.toString()}`);
  },

  // ── College Registration Applications (Super Admin) ───────────────────────
  getCollegeApplications: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.offset !== undefined) qs.set('offset', params.offset);
    if (params.limit !== undefined) qs.set('limit', params.limit);
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    return requestAdmin(`/college-applications?${qs.toString()}`);
  },
  getCollegeApplication: (id) => requestAdmin(`/college-applications/${id}`),
  approveCollegeApplication: (id) =>
    requestAdmin(`/college-applications/${id}/approve`, { method: 'POST' }),
  rejectCollegeApplication: (id, reason) =>
    requestAdmin(`/college-applications/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

/**
 * Trigger browser file download from authenticated admin endpoint.
 */
export const downloadAdminFile = async (path, defaultFileName = 'download.xlsx') => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kc_token') : null;
  const API_BASE = getApiBase();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/admin${path}`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Download failed (HTTP ${res.status})`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition');
  let filename = defaultFileName;
  if (disposition && disposition.includes('filename=')) {
    filename = disposition.split('filename=')[1].replace(/["']/g, '');
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

