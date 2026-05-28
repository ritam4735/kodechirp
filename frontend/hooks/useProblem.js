import { useProblemStore } from '../store/problemStore';
import { api } from '../lib/api';

export const useProblem = () => {
  const { currentProblem, problems, isLoading, setProblems, setCurrentProblem, setLoading } = useProblemStore();

  const fetchProblems = async (searchQuery = '') => {
    setLoading(true);
    try {
      const data = await api.getProblems(searchQuery);
      setProblems(data.problems);
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

  return { currentProblem, problems, isLoading, fetchProblems, fetchProblemDetails };
};
