import { useCallback } from 'react';
import { useProblemStore } from '../store/problemStore';
import { api } from '../lib/api';

export const useProblem = () => {
  const {
    currentProblem,
    problems,
    counts,
    topics,
    isLoading,
    error,
    pagination,
    setProblems,
    setCounts,
    setTopics,
    setCurrentProblem,
    setLoading,
    setError,
    setPagination,
  } = useProblemStore();

  const fetchProblems = useCallback(async (searchQuery = '', { page = 1, limit = 50, difficulty = '', topic = '' } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProblems(searchQuery, { page, limit, difficulty, topic });
      setProblems(data.problems || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
      if (data.counts) {
        setCounts(data.counts);
      }
      if (data.topics) {
        setTopics(data.topics);
      }
      return data;
    } catch (err) {
      console.error('Failed to fetch problems', err);
      setError(err.message || 'Failed to load problems');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setProblems, setPagination, setCounts, setTopics]);

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

  return { currentProblem, problems, counts, topics, isLoading, error, pagination, fetchProblems, fetchProblemDetails };
};
