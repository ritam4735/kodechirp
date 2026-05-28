import { useEditor } from '../../hooks/useEditor';

export const ConsolePanel = () => {
  const { output, verdict } = useEditor();

  if (!output && !verdict) return null;

  return (
    <div className="h-48 border-t border-[#30363d] bg-[#0d1117] flex flex-col">
      <div className="px-4 py-2 border-b border-[#21262d] bg-[#161b22] flex items-center gap-4">
        <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Console</span>
      </div>
      <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
        {verdict && (
          <div className="mb-4">
            <span className={`font-bold ${verdict.verdict === 'Accepted' ? 'text-[#22c55e]' : 'text-[#f85149]'}`}>
              {verdict.verdict}
            </span>
            {verdict.runtime && (
              <div className="text-[#8b949e] text-xs mt-1">
                Runtime: {verdict.runtime} | Memory: {verdict.memory}
              </div>
            )}
            <div className="text-[#e6edf3] mt-2">{verdict.details}</div>
          </div>
        )}
        {output && !verdict && (
          <pre className="text-[#e6edf3] whitespace-pre-wrap">{output}</pre>
        )}
      </div>
    </div>
  );
};
