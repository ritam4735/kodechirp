import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  getProblems: async (searchQuery = '') => {
    try {
      const { data } = await apiClient.get(`/problems${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
      return { problems: data.data || [] };
    } catch (error) {
      console.error('Error fetching problems:', error);
      return { problems: [] };
    }
  },
  
  getProblem: async (slug) => {
    try {
      const { data } = await apiClient.get(`/problems/${slug}`);
      return { problem: data.data };
    } catch (error) {
      console.error('Error fetching problem details:', error);
      throw new Error(error.response?.data?.error || 'Problem not found');
    }
  },

  runCode: async (code, language) => {
    try {
      const { data } = await apiClient.post('/execute', { code, language });
      if (data.success) {
        return { output: data.stdout, error: false };
      } else {
        return { output: data.stderr || data.error || 'Execution failed', error: true };
      }
    } catch (error) {
      console.error('Error running code:', error);
      return { output: error.response?.data?.error || 'Execution error.', error: true };
    }
  },

  submitCode: async (problemId, code, language) => {
    try {
      const { data } = await apiClient.post('/submissions/submit', { problem_id: problemId, code, language });
      return {
        verdict: data.data?.status || 'Unknown',
        runtime: data.data?.runtime_ms ? `${data.data.runtime_ms}ms` : 'N/A',
        memory: data.data?.memory_kb ? `${(data.data.memory_kb / 1024).toFixed(1)}MB` : 'N/A',
        details: data.data?.failed_test_actual 
          ? `Failed test case. Expected: ${data.data.failed_test_expected}, Actual: ${data.data.failed_test_actual}` 
          : 'All test cases passed!'
      };
    } catch (error) {
      console.error('Error submitting code:', error);
      return {
        verdict: 'Error',
        runtime: 'N/A',
        memory: 'N/A',
        details: 'Failed to submit code.'
      };
    }
  },

  getChirps: async (problemId) => {
    try {
      const { data } = await apiClient.get(`/chirps/${problemId}`);
      return data.data || [];
    } catch (error) {
      console.error('Error fetching chirps:', error);
      return [];
    }
  },

  postChirp: async (problemId, content, author = 'Anonymous') => {
    try {
      const { data } = await apiClient.post('/chirps', { problem_id: problemId, content });
      return data.data;
    } catch (error) {
      console.error('Error posting chirp:', error);
      throw new Error('Failed to post chirp');
    }
  }
};
