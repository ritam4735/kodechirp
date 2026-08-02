import { useEditorStore } from '../../store/editorStore';

export const TestCases = ({ testCases }) => {
  const { testCaseResults } = useEditorStore();

  if (testCaseResults && testCaseResults.length > 0) {
    return (
      <div className="space-y-4">
        {testCaseResults.map((tc, idx) => {
          const isPassed = tc.status === 'Passed';
          return (
            <div key={idx} className={`bg-white/[0.02] rounded-xl border p-4 backdrop-blur-sm transition-colors ${
              isPassed ? 'border-emerald-500/20' : 'border-rose-500/20'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">
                  Case {idx + 1}
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                  isPassed
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {tc.status || 'Failed'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-[#8b949e] font-semibold block mb-1.5 uppercase tracking-wider">Input</span>
                  <code className="text-[13px] text-[#e6edf3] font-mono bg-black/40 px-2.5 py-1.5 rounded-lg block overflow-x-auto whitespace-pre-wrap">{tc.input}</code>
                </div>
                <div>
                  <span className="text-xs text-[#8b949e] font-semibold block mb-1.5 uppercase tracking-wider">Expected Output</span>
                  <code className="text-[13px] text-[#58a6ff] font-mono bg-black/40 px-2.5 py-1.5 rounded-lg block overflow-x-auto whitespace-pre-wrap">{tc.expectedOutput}</code>
                </div>
                <div>
                  <span className="text-xs text-[#8b949e] font-semibold block mb-1.5 uppercase tracking-wider">Your Output</span>
                  <code className={`text-[13px] font-mono bg-black/40 px-2.5 py-1.5 rounded-lg block overflow-x-auto whitespace-pre-wrap ${
                    isPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}>{tc.yourOutput ?? 'null'}</code>
                </div>
                {tc.consoleOutput && tc.consoleOutput.trim().length > 0 && (
                  <div>
                    <span className="text-xs text-[#8b949e] font-semibold block mb-1.5 uppercase tracking-wider">Console Output</span>
                    <pre className="text-[12px] text-[#e6edf3] font-mono bg-black/60 p-2.5 rounded-lg border border-white/5 whitespace-pre-wrap overflow-x-auto">{tc.consoleOutput}</pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (!testCases || testCases.length === 0) return null;

  return (
    <div className="space-y-4">
      {testCases.map((tc, idx) => (
        <div key={idx} className="bg-white/[0.02] rounded-xl border border-white/5 p-4 backdrop-blur-sm">
          <div className="mb-3">
            <span className="text-xs text-[#8b949e] font-semibold block mb-1.5 uppercase tracking-wider">Input</span>
            <code className="text-[13px] text-[#e6edf3] font-mono bg-black/40 px-2.5 py-1.5 rounded-lg block overflow-x-auto whitespace-pre-wrap">{tc.input}</code>
          </div>
          <div>
            <span className="text-xs text-[#8b949e] font-semibold block mb-1.5 uppercase tracking-wider">Output</span>
            <code className="text-[13px] text-[#58a6ff] font-mono bg-black/40 px-2.5 py-1.5 rounded-lg block overflow-x-auto whitespace-pre-wrap">{tc.output}</code>
          </div>
        </div>
      ))}
    </div>
  );
};

