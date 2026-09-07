import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useProblemStore } from '../../store/problemStore';
import { formatInput, formatOutput } from '../../lib/testCaseFormatter';
import { Check, Copy, CheckCircle2, XCircle, LayoutGrid, Layers } from 'lucide-react';

export const TestCases = ({ testCases: propTestCases, problem: propProblem }) => {
  const { testCaseResults } = useEditorStore();
  const { currentProblem } = useProblemStore();
  const problem = propProblem || currentProblem;
  const signature = problem?.signature_metadata;
  const returnType = signature?.returnType;

  const [activeTab, setActiveTab] = useState(0);
  const [viewAll, setViewAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const isResultMode = Boolean(testCaseResults && testCaseResults.length > 0);
  const rawList = isResultMode ? testCaseResults : (propTestCases || problem?.testCases || []);

  // Ensure active tab is within bounds
  useEffect(() => {
    if (activeTab >= rawList.length) {
      setActiveTab(0);
    }
  }, [rawList.length, activeTab]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (!rawList || rawList.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-[#8b949e]">
        No test cases available.
      </div>
    );
  }

  // Calculate results summary
  const totalCases = rawList.length;
  const passedCount = isResultMode
    ? rawList.filter((tc) => tc.status === 'Passed').length
    : 0;
  const allPassed = isResultMode && passedCount === totalCases;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: Case Pills + View Mode Toggle + Run Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-2 rounded-xl border border-white/5 backdrop-blur-sm">
        {/* Case Pills Tabs */}
        <div className="flex items-center flex-wrap gap-1.5">
          {rawList.map((tc, idx) => {
            const isPassed = tc.status === 'Passed';
            const isActive = !viewAll && activeTab === idx;

            return (
              <button
                key={idx}
                onClick={() => {
                  setViewAll(false);
                  setActiveTab(idx);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#58a6ff]/20 text-white border border-[#58a6ff]/40 shadow-sm'
                    : 'bg-white/[0.03] text-[#8b949e] hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                {isResultMode && (
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isPassed ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]'
                    }`}
                  />
                )}
                <span>Case {idx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Right side controls: View Mode toggle & Overall Verdict Summary */}
        <div className="flex items-center gap-3 ml-auto">
          {isResultMode && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                allPassed
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {allPassed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              <span>
                {passedCount} / {totalCases} Passed
              </span>
            </div>
          )}

          {rawList.length > 1 && (
            <button
              onClick={() => setViewAll(!viewAll)}
              title={viewAll ? 'Switch to single case tab view' : 'View all cases together'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                viewAll
                  ? 'bg-[#a855f7]/20 text-white border-[#a855f7]/40'
                  : 'bg-white/[0.02] text-[#8b949e] hover:text-white border-white/5'
              }`}
            >
              {viewAll ? <Layers size={13} /> : <LayoutGrid size={13} />}
              <span className="hidden sm:inline">{viewAll ? 'Tabs View' : 'View All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Rendering: View All or Single Active Case */}
      {viewAll ? (
        <div className="space-y-4">
          {rawList.map((tc, idx) => (
            <TestCaseCard
              key={idx}
              tc={tc}
              idx={idx}
              signature={signature}
              returnType={returnType}
              isResultMode={isResultMode}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
          ))}
        </div>
      ) : (
        <TestCaseCard
          tc={rawList[activeTab] || rawList[0]}
          idx={activeTab}
          signature={signature}
          returnType={returnType}
          isResultMode={isResultMode}
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      )}
    </div>
  );
};

// ── Individual Test Case Card Component ───────────────────────────────────────

const TestCaseCard = ({ tc, idx, signature, returnType, isResultMode, copiedKey, onCopy }) => {
  if (!tc) return null;

  const isPassed = tc.status === 'Passed';
  const formattedInput = formatInput(tc.input, signature);
  const formattedExpected = formatOutput(tc.expectedOutput ?? tc.output, returnType);
  const formattedYour = isResultMode ? formatOutput(tc.yourOutput, returnType) : null;

  return (
    <div
      className={`bg-white/[0.02] rounded-xl border p-4 backdrop-blur-sm transition-all duration-200 ${
        isResultMode
          ? isPassed
            ? 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.03)]'
            : 'border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.03)]'
          : 'border-white/5'
      }`}
    >
      {/* Case Header */}
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-white/5">
        <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">
          Case {idx + 1}
        </span>
        {isResultMode && (
          <span
            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border flex items-center gap-1.5 ${
              isPassed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {isPassed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {tc.status || 'Failed'}
          </span>
        )}
      </div>

      {/* Case Content Sections */}
      <div className="space-y-4">
        {/* Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#8b949e] font-semibold uppercase tracking-wider">
              Input
            </span>
            <button
              onClick={() => onCopy(formattedInput, `input-${idx}`)}
              className="text-[#8b949e] hover:text-white text-xs flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
              title="Copy input"
            >
              {copiedKey === `input-${idx}` ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-[13px] text-[#e6edf3] font-mono bg-black/40 p-3 rounded-lg border border-white/5 whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {formattedInput}
          </pre>
        </div>

        {/* Expected Output */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#8b949e] font-semibold uppercase tracking-wider">
              {isResultMode ? 'Expected Output' : 'Output'}
            </span>
            <button
              onClick={() => onCopy(formattedExpected, `expected-${idx}`)}
              className="text-[#8b949e] hover:text-white text-xs flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
              title="Copy output"
            >
              {copiedKey === `expected-${idx}` ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-[13px] text-[#58a6ff] font-mono bg-black/40 p-3 rounded-lg border border-white/5 whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {formattedExpected}
          </pre>
        </div>

        {/* Your Output (Result Mode Only) */}
        {isResultMode && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#8b949e] font-semibold uppercase tracking-wider">
                Your Output
              </span>
              <button
                onClick={() => onCopy(formattedYour, `your-${idx}`)}
                className="text-[#8b949e] hover:text-white text-xs flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
                title="Copy your output"
              >
                {copiedKey === `your-${idx}` ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre
              className={`text-[13px] font-mono bg-black/40 p-3 rounded-lg border whitespace-pre-wrap overflow-x-auto leading-relaxed ${
                isPassed
                  ? 'text-emerald-400 border-emerald-500/20'
                  : 'text-rose-400 border-rose-500/20'
              }`}
            >
              {formattedYour ?? 'null'}
            </pre>
          </div>
        )}

        {/* Console / Stdout (Result Mode Only) */}
        {isResultMode && tc.consoleOutput && tc.consoleOutput.trim().length > 0 && (
          <div>
            <span className="text-xs text-[#8b949e] font-semibold block mb-1.5 uppercase tracking-wider">
              Console Output
            </span>
            <pre className="text-[12px] text-[#e6edf3] font-mono bg-black/60 p-3 rounded-lg border border-white/5 whitespace-pre-wrap overflow-x-auto leading-relaxed">
              {tc.consoleOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
