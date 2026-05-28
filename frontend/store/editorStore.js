import { create } from 'zustand';

export const useEditorStore = create((set) => ({
  code: '',
  language: 'javascript',
  output: '',
  isExecuting: false,
  verdict: null,
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setOutput: (output) => set({ output }),
  setIsExecuting: (isExecuting) => set({ isExecuting }),
  setVerdict: (verdict) => set({ verdict }),
  resetConsole: () => set({ output: '', verdict: null }),
}));
