import { Play } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

export const RunButton = () => {
  const { isExecuting, handleRunCode } = useEditor();

  return (
    <button 
      onClick={handleRunCode}
      disabled={isExecuting}
      className="flex items-center gap-2 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Play size={14} className={isExecuting ? "animate-pulse text-[#8b949e]" : "text-[#22c55e]"} />
      {isExecuting ? 'Running...' : 'Run Code'}
    </button>
  );
};
