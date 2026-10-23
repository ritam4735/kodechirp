import { create } from 'zustand';

export const useProblemStore = create((set) => ({
  currentProblem: null,
  problems: [],
  counts: { total: 0, Easy: 0, Medium: 0, Hard: 0 },
  topics: [],
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 50, total: 0 },
  setProblems: (problems) => set({ problems }),
  setCounts: (counts) => set({ counts }),
  setTopics: (topics) => set({ topics }),
  setCurrentProblem: (problem) => set({ currentProblem: problem }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setPagination: (pagination) => set({ pagination }),
}));
