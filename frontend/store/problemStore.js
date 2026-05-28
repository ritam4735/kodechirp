import { create } from 'zustand';

export const useProblemStore = create((set) => ({
  currentProblem: null,
  problems: [],
  isLoading: false,
  setProblems: (problems) => set({ problems }),
  setCurrentProblem: (problem) => set({ currentProblem: problem }),
  setLoading: (isLoading) => set({ isLoading }),
}));
