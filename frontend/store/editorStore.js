import { create } from 'zustand';

const initialExecution = {
  status: 'idle', // 'idle' | 'running' | 'success' | 'error'
  results: null,
  error: null,
};

const PREFERRED_LANGUAGE_KEY = 'kc_preferred_language';

const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(PREFERRED_LANGUAGE_KEY);
      if (stored) return stored;
    } catch (e) {}
  }
  return 'javascript';
};

export const useEditorStore = create((set) => ({
  codes: {},
  language: getInitialLanguage(),
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

  setLanguage: (language) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PREFERRED_LANGUAGE_KEY, language);
      } catch (e) {}
    }
    set({ 
      language,
      output: '',
      verdict: null,
      testCaseResults: null,
      isExecuting: false,
      execution: { ...initialExecution },
      activePanel: 'testcases',
    });
  },

  setActivePanel: (activePanel) => set({ 
    activePanel: activePanel === 'console' ? 'console' : 'testcases' 
  }),

  setOutput: (output) => set((state) => ({ 
    output,
    execution: { ...state.execution, error: output || null }
  })),

  setIsExecuting: (isExecuting) => set((state) => ({ 
    isExecuting,
    execution: {
      ...state.execution,
      status: isExecuting ? 'running' : (state.execution.status === 'running' ? 'idle' : state.execution.status),
    }
  })),

  setVerdict: (verdict) => set((state) => ({ 
    verdict,
    isExecuting: false,
    execution: {
      ...state.execution,
      status: verdict ? 'success' : 'idle',
      error: null,
    },
    output: '',
    activePanel: 'console',
  })),

  setTestCaseResults: (testCaseResults) => set((state) => ({ 
    testCaseResults,
    execution: { ...state.execution, results: testCaseResults }
  })),

  startExecution: (preferredPanel = 'testcases') => {
    let nextRequestId = 0;
    set((state) => {
      nextRequestId = state.requestId + 1;
      return {
        requestId: nextRequestId,
        isExecuting: true,
        execution: {
          status: 'running',
          results: null, // Clear stale results on new execution
          error: null,   // Clear stale error state
        },
        testCaseResults: null, // Clear stale test results
        output: '',
        verdict: null,
        activePanel: preferredPanel,
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
        verdict: null,
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
          results: null, // Clear results on error
          error: error,
        },
        testCaseResults: null, // Clear test results on error
        output: error,
        verdict: null,
        activePanel: 'console',
      };
    });
  },

  setSubmissionSuccess: (requestId, verdict) => {
    set((state) => {
      if (requestId !== undefined && requestId !== state.requestId) {
        return state;
      }
      return {
        isExecuting: false,
        execution: {
          status: 'success',
          results: null,
          error: null,
        },
        verdict,
        output: '',
        activePanel: 'console',
      };
    });
  },

  setSubmissionError: (requestId, error) => {
    set((state) => {
      if (requestId !== undefined && requestId !== state.requestId) {
        return state;
      }
      return {
        isExecuting: false,
        execution: {
          status: 'error',
          results: null,
          error: error,
        },
        verdict: null,
        output: error,
        activePanel: 'console',
      };
    });
  },

  resetConsole: () => set({ 
    output: '', 
    verdict: null, 
    testCaseResults: null,
    isExecuting: false,
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

