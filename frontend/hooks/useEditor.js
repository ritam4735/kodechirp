import { useEditorStore } from '../store/editorStore';
import { api } from '../lib/api';

export const useEditor = () => {
  const store = useEditorStore();

  const handleRunCode = async () => {
    store.setIsExecuting(true);
    store.resetConsole();
    try {
      const result = await api.runCode(store.code, store.language);
      store.setOutput(result.output);
    } catch (error) {
      store.setOutput('Failed to execute code.');
    } finally {
      store.setIsExecuting(false);
    }
  };

  const handleSubmitCode = async (problemId) => {
    store.setIsExecuting(true);
    store.resetConsole();
    try {
      const result = await api.submitCode(problemId, store.code);
      store.setVerdict(result);
    } catch (error) {
      store.setOutput('Failed to submit code.');
    } finally {
      store.setIsExecuting(false);
    }
  };

  return { ...store, handleRunCode, handleSubmitCode };
};
