import { useCallback } from 'react';
import { useProblemStore } from '../store/problemStore';
import { api } from '../lib/api';

export const useProblem = () => {
  const {
    currentProblem,
    problems,
    counts,
    isLoading,
    error,
    pagination,
    setProblems,
    setCounts,
    setCurrentProblem,
    setLoading,
    setError,
    setPagination,
  } = useProblemStore();

  const fetchProblems = useCallback(async (searchQuery = '', { page = 1, limit = 100, difficulty = '' } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProblems(searchQuery, { page, limit, difficulty });
      setProblems(data.problems || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to fetch problems', err);
      setError(err.message || 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setProblems, setPagination, setCounts]);

  const fetchProblemDetails = useCallback(async (slug) => {
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
  }, [setLoading, setError, setCurrentProblem]);

  return { currentProblem, problems, counts, isLoading, error, pagination, fetchProblems, fetchProblemDetails };
};
