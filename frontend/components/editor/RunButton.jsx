import { Play } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

export const RunButton = ({ disabled: externalDisabled }) => {
  const { isExecuting, handleRunCode } = useEditor();

  return (
    <button 
      type="button"
      onClick={handleRunCode}
      disabled={isExecuting || externalDisabled}
      aria-label={isExecuting ? 'Running code...' : 'Run code against test cases'}
      className="flex items-center gap-1.5 sm:gap-2 bg-[#1c2128] hover:bg-[#22272e] border border-[#444c56] hover:border-[#8b949e] text-[#e6edf3] px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group shrink-0"
    >
      <Play size={14} aria-hidden="true" className={`transition-all ${isExecuting ? "animate-pulse text-[#8b949e]" : "text-[#22c55e] group-hover:scale-110"}`} fill={isExecuting ? "none" : "currentColor"} />
      <span>{isExecuting ? 'Running...' : 'Run'}<span className="hidden sm:inline"> Code</span></span>
    </button>
  );
};
