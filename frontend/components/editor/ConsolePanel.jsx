import { useEditor } from '../../hooks/useEditor';
import { Terminal } from 'lucide-react';

export const ConsolePanel = () => {
  const { output, verdict } = useEditor();

  if (!output && !verdict) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent relative">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02] shrink-0">
        <Terminal size={16} className="text-[#8b949e]" />
        <span className="text-sm font-semibold text-[#e6edf3]">Console Output</span>
      </div>
      <div className="flex-1 p-5 overflow-y-auto font-mono text-sm custom-scrollbar bg-[#0d1117]/50">
        {verdict && (
          <div className="mb-4 bg-white/[0.02] p-4 rounded-xl border border-white/10 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className={`font-bold text-lg ${verdict.verdict === 'Accepted' ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                {verdict.verdict}
              </span>
            </div>
            {verdict.runtime && (
              <div className="flex gap-4 text-[#8b949e] text-xs font-medium bg-black/40 px-3 py-2 rounded-lg border border-white/5 inline-flex">
                <span><strong className="text-[#e6edf3]">Runtime:</strong> {verdict.runtime}</span>
                <span><strong className="text-[#e6edf3]">Memory:</strong> {verdict.memory}</span>
              </div>
            )}
            {verdict.details && <div className="text-[#e6edf3] mt-3 whitespace-pre-wrap leading-relaxed">{verdict.details}</div>}
          </div>
        )}
        {output && !verdict && (
          <pre className="text-[#e6edf3] whitespace-pre-wrap font-mono leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">{output}</pre>
        )}
      </div>
    </div>
  );
};
