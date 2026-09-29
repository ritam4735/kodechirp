import { create } from 'zustand';

export const useProblemStore = create((set) => ({
  currentProblem: null,
  problems: [],
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 50, total: 0 },
  setProblems: (problems) => set({ problems }),
  setCurrentProblem: (problem) => set({ currentProblem: problem }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setPagination: (pagination) => set({ pagination }),
}));
