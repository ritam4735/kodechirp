export const TestCases = ({ testCases }) => {
  if (!testCases || testCases.length === 0) return null;

  return (
    <div className="border-t border-[#21262d] bg-[#161b22] p-6">
      <h3 className="text-sm font-semibold text-[#e6edf3] mb-4 uppercase tracking-wider">Sample Test Cases</h3>
      <div className="space-y-4">
        {testCases.map((tc, idx) => (
          <div key={idx} className="bg-[#0d1117] rounded-lg border border-[#21262d] p-4">
            <div className="mb-2">
              <span className="text-xs text-[#8b949e] block mb-1">Input:</span>
              <code className="text-sm text-[#e6edf3] font-mono">{tc.input}</code>
            </div>
            <div>
              <span className="text-xs text-[#8b949e] block mb-1">Output:</span>
              <code className="text-sm text-[#58a6ff] font-mono">{tc.output}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
