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
      className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#3fb950] text-white px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-[0_0_12px_rgba(46,160,67,0.4)] disabled:opacity-50 disabled:cursor-not-allowed group shrink-0"
    >
      <Send size={13} aria-hidden="true" className={`transition-transform ${isExecuting ? "animate-pulse" : "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"}`} />
      <span>{isExecuting ? 'Submitting...' : 'Submit'}<span className="hidden sm:inline"> Chirp</span></span>
    </button>
  );
};
