// frontend/hooks/useEditor.js
// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: api.submitCode was called without `language`.
// The backend needs { code, language, problem_id } to compile / run correctly.
// ─────────────────────────────────────────────────────────────────────────────

import { useEditorStore } from '../store/editorStore';
import { useProblemStore } from '../store/problemStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { DEFAULT_CODE_SNIPPETS } from '../lib/constants';
import { generateStarterCode } from '../lib/codeGenerator';

export const useEditor = () => {
  const store = useEditorStore();
  const { currentProblem } = useProblemStore();
  const { user } = useAuthStore();

  const userId = user?.id || 'guest';
  const problemId = currentProblem?.id || 'unknown';
  const language = store.language;

  const templates = currentProblem?.templates || {};
  const judgeMode = currentProblem?.judge_mode;
  const signature = currentProblem?.signature_metadata;
  
  const cacheKey = `${userId}_${problemId}_${language}`;
  
  let defaultCode;
  if (judgeMode === 'FUNCTION') {
    defaultCode = generateStarterCode(judgeMode, signature, language) || templates[language] || DEFAULT_CODE_SNIPPETS[language] || '';
  } else {
    defaultCode = templates[language] || DEFAULT_CODE_SNIPPETS[language] || '';
  }

  const code = store.codes[cacheKey] ?? defaultCode;

  const handleRunCode = async () => {
    const reqId = store.startExecution();
    try {
      const result = await api.runCode(code, language, '', currentProblem?.id, judgeMode, signature);
      
      // Discard stale responses if a newer execution started
      if (reqId !== useEditorStore.getState().requestId) {
        return;
      }

      const hasCompileError = Boolean(result.compileError);
      const isExitError = result.exitCode !== undefined && result.exitCode !== 0;
      const isExplicitError = Boolean(result.error && (!result.testCaseResults || result.testCaseResults.length === 0));

      if (hasCompileError || isExitError || isExplicitError) {
        const errorMsg = result.compileError || result.stderr || result.output || (result.error ? 'Error: execution failed' : 'Execution failed');
        store.setExecutionError(reqId, errorMsg);
      } else if (result.testCaseResults && result.testCaseResults.length > 0) {
        store.setExecutionSuccess(reqId, result.testCaseResults);
      } else {
        if (result.stderr && !result.stdout) {
          store.setExecutionError(reqId, result.stderr);
        } else {
          store.setExecutionSuccess(reqId, []);
          store.setOutput(result.stdout || result.output || 'Execution completed with no output');
          store.setActivePanel('console');
        }
      }
    } catch (error) {
      if (reqId === useEditorStore.getState().requestId) {
        store.setExecutionError(reqId, `Failed to execute code: ${error.message}`);
      }
    }
  };

  const handleSubmitCode = async (probId) => {
    const reqId = store.startExecution();
    store.setActivePanel('console');
    try {
      const result = await api.submitCode(probId, code, language);
      if (reqId === useEditorStore.getState().requestId) {
        store.setVerdict(result);
        store.setIsExecuting(false);
      }
    } catch (error) {
      if (reqId === useEditorStore.getState().requestId) {
        store.setExecutionError(reqId, `Failed to submit code: ${error.message}`);
      }
    }
  };

  const setCode = (newCode) => {
    store.setCode(cacheKey, newCode);
  };

  return { ...store, code, setCode, handleRunCode, handleSubmitCode, editorPath: cacheKey };
};
