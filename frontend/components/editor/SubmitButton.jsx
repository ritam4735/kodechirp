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
      className="flex items-center gap-1.5 sm:gap-2 bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-[0_2px_12px_var(--kc-accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed group shrink-0"
    >
      <Send size={12} aria-hidden="true" className={`transition-transform ${isExecuting ? "animate-pulse" : "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"}`} />
      <span>{isExecuting ? 'Submitting...' : 'Submit'}<span className="hidden sm:inline"> Solution</span></span>
    </button>
  );
};
