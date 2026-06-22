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

export const useEditor = () => {
  const store = useEditorStore();
  const { currentProblem } = useProblemStore();
  const { user } = useAuthStore();

  const userId = user?.id || 'guest';
  const problemId = currentProblem?.id || 'unknown';
  const language = store.language;

  const templates = currentProblem?.templates || {};
  
  const cacheKey = `${userId}_${problemId}_${language}`;
  const code = store.codes[cacheKey] ?? (templates[language] || DEFAULT_CODE_SNIPPETS[language] || '');

  const handleRunCode = async () => {
    store.setIsExecuting(true);
    store.resetConsole();
    try {
      const result = await api.runCode(code, language);
      store.setOutput(result.output || (result.error ? 'Error: no output' : 'No output'));
    } catch (error) {
      store.setOutput(`Failed to execute code: ${error.message}`);
    } finally {
      store.setIsExecuting(false);
    }
  };

  const handleSubmitCode = async (probId) => {
    store.setIsExecuting(true);
    store.resetConsole();
    try {
      const result = await api.submitCode(probId, code, language);
      store.setVerdict(result);
    } catch (error) {
      store.setOutput(`Failed to submit code: ${error.message}`);
    } finally {
      store.setIsExecuting(false);
    }
  };

  const setCode = (newCode) => {
    store.setCode(cacheKey, newCode);
  };

  return { ...store, code, setCode, handleRunCode, handleSubmitCode, editorPath: cacheKey };
};
