import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useProblemStore } from '../../store/problemStore';
import { formatInput, formatOutput } from '../../lib/testCaseFormatter';
import { Check, Copy, CheckCircle2, XCircle, LayoutGrid, Layers } from 'lucide-react';

export const TestCases = ({ testCases: propTestCases, problem: propProblem }) => {
  const { testCaseResults, execution } = useEditorStore();
  const { currentProblem } = useProblemStore();
  const problem = propProblem || currentProblem;
  const signature = problem?.signature_metadata;
  const returnType = signature?.returnType;

  const [activeTab, setActiveTab] = useState(0);
  const [viewAll, setViewAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const isRunning = execution?.status === 'running';
  const effectiveResults = testCaseResults || execution?.results;
  const isResultMode = Boolean(effectiveResults && effectiveResults.length > 0);
  const rawList = isResultMode ? effectiveResults : (propTestCases || problem?.testCases || []);

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
      <div className="flex items-center justify-center p-8 text-sm text-[var(--kc-text-muted)] font-mono">
        No test cases defined for this challenge.
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
    <div className="flex flex-col gap-3">
      {/* Top Bar: Case Pills + View Mode Toggle + Run Status */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[var(--kc-surface-subtle)] p-2 rounded-lg border border-[var(--kc-border)]">
        {/* Case Pills Tabs */}
        <div className="flex items-center flex-wrap gap-1">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--kc-surface)] text-[var(--kc-text-primary)] border border-[var(--kc-border-hover)] shadow-sm'
                    : 'text-[var(--kc-text-secondary)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] border border-transparent'
                }`}
              >
                {isResultMode && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isPassed ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                    }`}
                  />
                )}
                <span>Case {idx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Right side controls: View Mode toggle & Overall Verdict Summary */}
        <div className="flex items-center gap-2.5 ml-auto">
          {isRunning ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[rgba(59,130,246,0.2)]">
              <div className="w-2.5 h-2.5 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
              <span>Running…</span>
            </div>
          ) : isResultMode ? (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border ${
                allPassed
                  ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981] border-[rgba(16,185,129,0.25)]'
                  : 'bg-[rgba(239,68,68,0.1)] text-[#EF4444] border-[rgba(239,68,68,0.25)]'
              }`}
            >
              {allPassed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              <span>
                {passedCount} / {totalCases} Passed
              </span>
            </div>
          ) : null}

          {rawList.length > 1 && (
            <button
              onClick={() => setViewAll(!viewAll)}
              title={viewAll ? 'Switch to single case tab view' : 'View all cases together'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                viewAll
                  ? 'bg-[var(--kc-surface)] text-[var(--kc-text-primary)] border-[var(--kc-border-hover)]'
                  : 'bg-transparent text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] border-[var(--kc-border)]'
              }`}
            >
              {viewAll ? <Layers size={13} /> : <LayoutGrid size={13} />}
              <span className="hidden sm:inline">{viewAll ? 'Tabs' : 'All Cases'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Rendering: View All or Single Active Case */}
      <div className={isRunning ? 'opacity-60 transition-opacity pointer-events-none' : 'opacity-100 transition-opacity'}>
        {viewAll ? (
          <div className="space-y-3">
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
      className={`bg-[var(--kc-surface-subtle)] rounded-lg border p-4 transition-colors ${
        isResultMode
          ? isPassed
            ? 'border-[rgba(16,185,129,0.2)]'
            : 'border-[rgba(239,68,68,0.2)]'
          : 'border-[var(--kc-border)]'
      }`}
    >
      {/* Case Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--kc-border-subtle)]">
        <span className="text-xs font-mono font-bold text-[var(--kc-text-muted)] uppercase tracking-wider">
          Case {idx + 1}
        </span>
        {isResultMode && (
          <span
            className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded border flex items-center gap-1.5 ${
              isPassed
                ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981] border-[rgba(16,185,129,0.25)]'
                : 'bg-[rgba(239,68,68,0.1)] text-[#EF4444] border-[rgba(239,68,68,0.25)]'
            }`}
          >
            {isPassed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {tc.status || 'Failed'}
          </span>
        )}
      </div>

      {/* Case Content Sections */}
      <div className="space-y-3">
        {/* Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[var(--kc-text-muted)] font-mono font-semibold uppercase tracking-wider">
              Input
            </span>
            <button
              onClick={() => onCopy(formattedInput, `input-${idx}`)}
              className="text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] text-xs flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--kc-surface)] cursor-pointer"
              title="Copy input"
            >
              {copiedKey === `input-${idx}` ? (
                <>
                  <Check size={11} className="text-[#10B981]" />
                  <span className="text-[#10B981] text-[10.5px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  <span className="text-[10.5px]">Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-[12.5px] text-[var(--kc-text-primary)] font-mono bg-[var(--kc-bg)] p-2.5 rounded-md border border-[var(--kc-border)] whitespace-pre-wrap break-words max-w-full overflow-x-auto leading-relaxed">
            {formattedInput}
          </pre>
        </div>

        {/* Expected Output */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[var(--kc-text-muted)] font-mono font-semibold uppercase tracking-wider">
              {isResultMode ? 'Expected Output' : 'Output'}
            </span>
            <button
              onClick={() => onCopy(formattedExpected, `expected-${idx}`)}
              className="text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] text-xs flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--kc-surface)] cursor-pointer"
              title="Copy output"
            >
              {copiedKey === `expected-${idx}` ? (
                <>
                  <Check size={11} className="text-[#10B981]" />
                  <span className="text-[#10B981] text-[10.5px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  <span className="text-[10.5px]">Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-[12.5px] text-[var(--kc-accent-hover)] font-mono bg-[var(--kc-bg)] p-2.5 rounded-md border border-[var(--kc-border)] whitespace-pre-wrap break-words max-w-full overflow-x-auto leading-relaxed">
            {formattedExpected}
          </pre>
        </div>

        {/* Your Output (Result Mode Only) */}
        {isResultMode && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--kc-text-muted)] font-mono font-semibold uppercase tracking-wider">
                Your Output
              </span>
              <button
                onClick={() => onCopy(formattedYour, `your-${idx}`)}
                className="text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] text-xs flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--kc-surface)] cursor-pointer"
                title="Copy your output"
              >
                {copiedKey === `your-${idx}` ? (
                  <>
                    <Check size={11} className="text-[#10B981]" />
                    <span className="text-[#10B981] text-[10.5px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span className="text-[10.5px]">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre
              className={`text-[12.5px] font-mono bg-[var(--kc-bg)] p-2.5 rounded-md border whitespace-pre-wrap break-words max-w-full overflow-x-auto leading-relaxed ${
                isPassed
                  ? 'text-[#10B981] border-[rgba(16,185,129,0.25)]'
                  : 'text-[#EF4444] border-[rgba(239,68,68,0.25)]'
              }`}
            >
              {formattedYour ?? 'null'}
            </pre>
          </div>
        )}

        {/* Console / Stdout (Result Mode Only) */}
        {isResultMode && tc.consoleOutput && tc.consoleOutput.trim().length > 0 && (
          <div>
            <span className="text-[11px] text-[var(--kc-text-muted)] font-mono font-semibold block mb-1 uppercase tracking-wider">
              Standard Output
            </span>
            <pre className="text-[12px] text-[var(--kc-text-secondary)] font-mono bg-[var(--kc-bg)] p-2.5 rounded-md border border-[var(--kc-border)] whitespace-pre-wrap break-words max-w-full overflow-x-auto leading-relaxed">
              {tc.consoleOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
