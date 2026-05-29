import { Play } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

export const RunButton = () => {
  const { isExecuting, handleRunCode } = useEditor();

  return (
    <button 
      onClick={handleRunCode}
      disabled={isExecuting}
      className="flex items-center gap-2 bg-[#1c2128] hover:bg-[#22272e] border border-[#444c56] hover:border-[#8b949e] text-[#e6edf3] px-5 py-1.5 rounded-md text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <Play size={15} className={`transition-all ${isExecuting ? "animate-pulse text-[#8b949e]" : "text-[#22c55e] group-hover:scale-110"}`} fill={isExecuting ? "none" : "currentColor"} />
      {isExecuting ? 'Running...' : 'Run Code'}
    </button>
  );
};
