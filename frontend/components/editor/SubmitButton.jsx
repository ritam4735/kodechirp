import { Send } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

export const SubmitButton = ({ problemId, disabled: externalDisabled }) => {
  const { isExecuting, handleSubmitCode } = useEditor();

  return (
    <button 
      type="button"
      onClick={() => handleSubmitCode(problemId)}
      disabled={isExecuting || externalDisabled}
      aria-label={isExecuting ? 'Submitting solution...' : 'Submit solution for formal evaluation'}
      className="flex items-center gap-1.5 sm:gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-[0_2px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group shrink-0"
    >
      <Send size={12} aria-hidden="true" className={`transition-transform ${isExecuting ? "animate-pulse" : "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"}`} />
      <span>{isExecuting ? 'Submitting...' : 'Submit'}<span className="hidden sm:inline"> Solution</span></span>
    </button>
  );
};
