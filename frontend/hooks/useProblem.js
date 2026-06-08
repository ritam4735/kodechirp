import { useProblemStore } from '../store/problemStore';
import { api } from '../lib/api';

export const useProblem = () => {
  const { currentProblem, problems, isLoading, pagination, setProblems, setCurrentProblem, setLoading, setPagination } = useProblemStore();

  const fetchProblems = async (searchQuery = '', { page = 1, limit = 50, difficulty = '' } = {}) => {
    setLoading(true);
    try {
      const data = await api.getProblems(searchQuery, { page, limit, difficulty });
      setProblems(data.problems);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch problems', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProblemDetails = async (slug) => {
    setLoading(true);
    try {
      const data = await api.getProblem(slug);
      setCurrentProblem(data.problem);
    } catch (error) {
      console.error('Failed to fetch problem details', error);
    } finally {
      setLoading(false);
    }
  };

  return { currentProblem, problems, isLoading, pagination, fetchProblems, fetchProblemDetails };
};
