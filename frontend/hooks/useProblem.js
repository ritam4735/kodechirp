import { useProblemStore } from '../store/problemStore';
import { api } from '../lib/api';

export const useProblem = () => {
  const { currentProblem, problems, isLoading, error, pagination, setProblems, setCurrentProblem, setLoading, setError, setPagination } = useProblemStore();

  const fetchProblems = async (searchQuery = '', { page = 1, limit = 50, difficulty = '' } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProblems(searchQuery, { page, limit, difficulty });
      setProblems(data.problems);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch problems', err);
      setError(err.message || 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  const fetchProblemDetails = async (slug) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProblem(slug);
      setCurrentProblem(data.problem);
    } catch (err) {
      console.error('Failed to fetch problem details', err);
      setError(err.message || 'Failed to load problem details');
    } finally {
      setLoading(false);
    }
  };

  return { currentProblem, problems, isLoading, error, pagination, fetchProblems, fetchProblemDetails };
};
