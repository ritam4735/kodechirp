import { Send } from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

export const SubmitButton = ({ problemId }) => {
  const { isExecuting, handleSubmitCode } = useEditor();

  return (
    <button 
      onClick={() => handleSubmitCode(problemId)}
      disabled={isExecuting}
      className="flex items-center gap-2 bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#3fb950] text-white px-5 py-1.5 rounded-md text-sm font-semibold transition-all shadow-sm hover:shadow-[0_0_12px_rgba(46,160,67,0.4)] disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <Send size={14} className={`transition-transform ${isExecuting ? "animate-pulse" : "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"}`} />
      {isExecuting ? 'Submitting...' : 'Submit Chirp'}
    </button>
  );
};
