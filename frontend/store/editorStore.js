import { create } from 'zustand';

export const useEditorStore = create((set) => ({
  codes: {},
  language: 'javascript',
  output: '',
  isExecuting: false,
  verdict: null,
  testCaseResults: null,
  setCode: (key, code) => set((state) => ({ 
    codes: { ...state.codes, [key]: code } 
  })),
  setLanguage: (language) => set({ language }),
  setOutput: (output) => set({ output }),
  setIsExecuting: (isExecuting) => set({ isExecuting }),
  setVerdict: (verdict) => set({ verdict }),
  setTestCaseResults: (testCaseResults) => set({ testCaseResults }),
  resetConsole: () => set({ output: '', verdict: null, testCaseResults: null }),
  resetAll: () => set({ codes: {}, output: '', verdict: null, testCaseResults: null, isExecuting: false }),
}));

