export const TestCases = ({ testCases }) => {
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
