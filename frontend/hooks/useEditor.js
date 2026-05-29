// frontend/hooks/useEditor.js
// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: api.submitCode was called without `language`.
// The backend needs { code, language, problem_id } to compile / run correctly.
// ─────────────────────────────────────────────────────────────────────────────

import { useEditorStore } from '../store/editorStore';
import { api } from '../lib/api';

export const useEditor = () => {
  const store = useEditorStore();

  const handleRunCode = async () => {
    store.setIsExecuting(true);
    store.resetConsole();
    try {
      const result = await api.runCode(store.code, store.language);
      store.setOutput(result.output || (result.error ? 'Error: no output' : 'No output'));
    } catch (error) {
      store.setOutput(`Failed to execute code: ${error.message}`);
    } finally {
      store.setIsExecuting(false);
    }
  };

  const handleSubmitCode = async (problemId) => {
    store.setIsExecuting(true);
    store.resetConsole();
    try {
      // BUG FIX: store.language is now passed as the third argument
      const result = await api.submitCode(problemId, store.code, store.language);
      store.setVerdict(result);
    } catch (error) {
      store.setOutput(`Failed to submit code: ${error.message}`);
    } finally {
      store.setIsExecuting(false);
    }
  };

  return { ...store, handleRunCode, handleSubmitCode };
};
