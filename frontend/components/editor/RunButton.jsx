import { Play } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

export const RunButton = ({ disabled: externalDisabled, onRun, onComplete }) => {
  const { isExecuting, handleRunCode } = useEditor();

  const handleClick = async () => {
    if (onRun) {
      await onRun();
    } else {
      await handleRunCode(onComplete);
    }
  };

  return (
    <button 
      type="button"
      onClick={handleClick}
      disabled={isExecuting || externalDisabled}
      aria-label={isExecuting ? 'Running code...' : 'Run code against test cases'}
      className="flex items-center gap-1.5 sm:gap-2 bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-surface-elevated)] border border-[var(--kc-border)] hover:border-[var(--kc-border-hover)] text-[var(--kc-text-primary)] px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group shrink-0"
    >
      <Play size={13} aria-hidden="true" className={`transition-all ${isExecuting ? "animate-pulse text-[var(--kc-text-muted)]" : "text-[var(--kc-accent)] group-hover:scale-105"}`} fill={isExecuting ? "none" : "currentColor"} />
      <span>{isExecuting ? 'Running...' : 'Run'}<span className="hidden sm:inline"> Code</span></span>
    </button>
  );
};
