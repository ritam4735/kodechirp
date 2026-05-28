import { Send } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

export const SubmitButton = ({ problemId }) => {
  const { isExecuting, handleSubmitCode } = useEditor();

  return (
    <button 
      onClick={() => handleSubmitCode(problemId)}
      disabled={isExecuting}
      className="flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Send size={14} className={isExecuting ? "animate-pulse" : ""} />
      {isExecuting ? 'Submitting...' : 'Submit'}
    </button>
  );
};
