import { create } from 'zustand';

const initialExecution = {
  status: 'idle', // 'idle' | 'running' | 'success' | 'error'
  results: null,
  error: null,
};

export const useEditorStore = create((set) => ({
  codes: {},
  language: 'javascript',
  output: '',
  isExecuting: false,
  verdict: null,
  testCaseResults: null,
  execution: { ...initialExecution },
  activePanel: 'testcases', // 'testcases' | 'console'
  requestId: 0,

  setCode: (key, code) => set((state) => ({ 
    codes: { ...state.codes, [key]: code } 
  })),
  setLanguage: (language) => set({ language }),
  setActivePanel: (activePanel) => set({ 
    activePanel: activePanel === 'console' ? 'console' : 'testcases' 
  }),
  setOutput: (output) => set((state) => ({ 
    output,
    execution: { ...state.execution, error: output || null }
  })),
  setIsExecuting: (isExecuting) => set({ isExecuting }),
  setVerdict: (verdict) => set({ verdict }),
  setTestCaseResults: (testCaseResults) => set((state) => ({ 
    testCaseResults,
    execution: { ...state.execution, results: testCaseResults }
  })),

  startExecution: () => {
    let nextRequestId = 0;
    set((state) => {
      nextRequestId = state.requestId + 1;
      return {
        requestId: nextRequestId,
        isExecuting: true,
        execution: {
          status: 'running',
          results: state.execution.results, // Preserve previous results while running
          error: null, // Clear stale compiler/runtime error state
        },
        output: '',
        verdict: null,
      };
    });
    return nextRequestId;
  },

  setExecutionSuccess: (requestId, results) => {
    set((state) => {
      // Discard stale responses to prevent race conditions
      if (requestId !== undefined && requestId !== state.requestId) {
        return state;
      }
      return {
        isExecuting: false,
        execution: {
          status: 'success',
          results: results,
          error: null,
        },
        testCaseResults: results,
        output: '',
        activePanel: 'testcases',
      };
    });
  },

  setExecutionError: (requestId, error) => {
    set((state) => {
      // Discard stale responses to prevent race conditions
      if (requestId !== undefined && requestId !== state.requestId) {
        return state;
      }
      return {
        isExecuting: false,
        execution: {
          status: 'error',
          results: state.execution.results,
          error: error,
        },
        output: error,
        activePanel: 'console',
      };
    });
  },

  resetConsole: () => set({ 
    output: '', 
    verdict: null, 
    testCaseResults: null,
    execution: { ...initialExecution },
    activePanel: 'testcases',
  }),

  resetAll: () => set({ 
    codes: {}, 
    output: '', 
    verdict: null, 
    testCaseResults: null, 
    isExecuting: false,
    execution: { ...initialExecution },
    activePanel: 'testcases',
  }),
}));

