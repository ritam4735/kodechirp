import { create } from 'zustand';

export const useProblemStore = create((set) => ({
  currentProblem: null,
  problems: [],
  isLoading: false,
  pagination: { page: 1, limit: 50, total: 0 },
  setProblems: (problems) => set({ problems }),
  setCurrentProblem: (problem) => set({ currentProblem: problem }),
  setLoading: (isLoading) => set({ isLoading }),
  setPagination: (pagination) => set({ pagination }),
}));
