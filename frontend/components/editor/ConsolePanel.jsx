import { useEditor } from '../../hooks/useEditor';
import { Terminal } from 'lucide-react';

export const ConsolePanel = () => {
  const { output, verdict } = useEditor();

  if (!output && !verdict) return null;

  return (
    <div className="h-56 border-t border-[#30363d] bg-[#0d1117] flex flex-col shadow-[inset_0_4px_6px_rgba(0,0,0,0.1)] relative">
      <div className="px-5 py-2.5 border-b border-[#30363d] bg-gradient-to-r from-[#161b22] to-[#0d1117] flex items-center gap-2">
        <Terminal size={15} className="text-[#8b949e]" />
        <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">Console Output</span>
      </div>
      <div className="flex-1 p-5 overflow-y-auto font-mono text-sm custom-scrollbar">
        {verdict && (
          <div className="mb-4 bg-[#161b22] p-4 rounded-lg border border-[#30363d] shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className={`font-bold text-lg ${verdict.verdict === 'Accepted' ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                {verdict.verdict}
              </span>
            </div>
            {verdict.runtime && (
              <div className="flex gap-4 text-[#8b949e] text-xs font-medium bg-[#0d1117] px-3 py-2 rounded border border-[#21262d] inline-flex mt-1">
                <span><strong className="text-[#c9d1d9]">Runtime:</strong> {verdict.runtime}</span>
                <span><strong className="text-[#c9d1d9]">Memory:</strong> {verdict.memory}</span>
              </div>
            )}
            {verdict.details && <div className="text-[#e6edf3] mt-3 whitespace-pre-wrap">{verdict.details}</div>}
          </div>
        )}
        {output && !verdict && (
          <pre className="text-[#e6edf3] whitespace-pre-wrap font-mono leading-relaxed">{output}</pre>
        )}
      </div>
    </div>
  );
};
