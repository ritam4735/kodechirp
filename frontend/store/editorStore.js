import { create } from 'zustand';

export const useEditorStore = create((set) => ({
  codes: {},
  language: 'javascript',
  output: '',
  isExecuting: false,
  verdict: null,
  setCode: (code) => set((state) => ({ 
    codes: { ...state.codes, [state.language]: code } 
  })),
  setLanguage: (language) => set({ language }),
  setOutput: (output) => set({ output }),
  setIsExecuting: (isExecuting) => set({ isExecuting }),
  setVerdict: (verdict) => set({ verdict }),
  resetConsole: () => set({ output: '', verdict: null }),
}));
