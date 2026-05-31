// frontend/lib/api.js
// ─────────────────────────────────────────────────────────────────────────────
// Real API client. All mock functions have been removed.
// Set NEXT_PUBLIC_API_URL in your .env.local (default: http://localhost:4000).
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kc_token') : null;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    let errorMessage = data.error || `HTTP ${res.status}`;
    if (data.details && Array.isArray(data.details)) {
      const detailsStr = data.details.map(d => `${d.path || d.param}: ${d.msg}`).join(', ');
      errorMessage += ` - ${detailsStr}`;
    }
    throw new Error(errorMessage);
  }

  return data;
}

export const api = {
  // ── Problems ────────────────────────────────────────────────────────────────

  getProblems: async (searchQuery = '') => {
    const qs = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
    const data = await request(`/api/problems${qs}`);
    // Backend returns { success, data: [...], meta }
    return { problems: data.data };
  },

  getProblem: async (slug) => {
    const data = await request(`/api/problems/${slug}`);
    // Backend returns { success, data: { ...problem, sample_test_cases: [...] } }
    const problem = data.data;
    // Normalise test cases to the shape the frontend already uses: { input, output }
    problem.testCases = (problem.sample_test_cases || []).map((tc) => ({
      input: tc.input,
      output: tc.expected_output,
    }));
    return { problem };
  },

  // ── Code execution ──────────────────────────────────────────────────────────

  // BUG FIX: was a mock that always returned 'Mock execution successful.'
  runCode: async (code, language, stdin = '') => {
    const data = await request('/api/submissions/run', {
      method: 'POST',
      body: JSON.stringify({ code, language, stdin }),
    });
    // Backend returns { success, output, error (bool), stderr }
    return {
      output: data.output || '',
      error: data.error || false,
    };
  },

  // BUG FIX: was a mock using Math.random() > 0.3 — always "passed"
  //          Also: was missing `language` in the payload.
  submitCode: async (problemId, code, language) => {
    const data = await request('/api/submissions/submit', {
      method: 'POST',
      body: JSON.stringify({ problem_id: problemId, code, language }),
    });
    // Backend returns { success, data: { verdict, passed, total, ... } }
    const result = data.data;
    return {
      verdict: result.verdict,                              // 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded'
      runtime: result.runtime || 'N/A',
      memory: result.memory || 'N/A',
      details: buildDetails(result),
    };
  },

  // ── Chirps ──────────────────────────────────────────────────────────────────

  getChirps: async (problemId) => {
    const data = await request(`/api/chirps?problem_id=${problemId}`);
    return data.data || [];
  },

  postChirp: async (problemId, content) => {
    const data = await request('/api/chirps', {
      method: 'POST',
      body: JSON.stringify({ problem_id: problemId, content }),
    });
    return data.data;
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
      result.failedInput    ? `\nInput:    ${result.failedInput}`    : '',
      result.failedExpected ? `\nExpected: ${result.failedExpected}` : '',
      result.failedActual   ? `\nGot:      ${result.failedActual}`   : '',
    ].join('');
  }

  if (result.verdict === 'Runtime Error') {
    return `Runtime error on test case ${result.passed + 1} of ${result.total}.\n${result.error || ''}`;
  }

  if (result.verdict === 'Time Limit Exceeded') {
    return `Time limit exceeded on test case ${result.passed + 1} of ${result.total}.`;
  }

  return result.verdict;
}
