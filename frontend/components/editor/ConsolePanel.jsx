import { useEditor } from '../../hooks/useEditor';
import { useProblemStore } from '../../store/problemStore';
import { formatInput, formatOutput } from '../../lib/testCaseFormatter';
import { Terminal, CheckCircle2, XCircle } from 'lucide-react';

export const ConsolePanel = () => {
  const { output, verdict, execution } = useEditor();
  const { currentProblem } = useProblemStore();
  const signature = currentProblem?.signature_metadata;
  const returnType = signature?.returnType;

  const isRunning = execution?.status === 'running';
  const errorMessage = output || execution?.error;

  const isAccepted = verdict?.verdict === 'Accepted';
  const hasFailedDetails = Boolean(
    verdict && (verdict.failedInput || verdict.failedExpected || verdict.failedActual)
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent relative">
      <div className="flex-1 p-2 overflow-y-auto font-mono text-sm custom-scrollbar">
        {isRunning && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--kc-text-muted)]">
            <div className="w-6 h-6 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium text-[var(--kc-text-primary)]">Executing in sandbox…</p>
            <p className="text-xs mt-1 text-[var(--kc-text-muted)]">Testing code against verification cluster</p>
          </div>
        )}

        {!isRunning && verdict && (
          <div
            className={`mb-4 bg-[var(--kc-surface-subtle)] p-4 rounded-lg border ${
              isAccepted ? 'border-[var(--kc-success-border)]' : 'border-[var(--kc-error-border)]'
            }`}
          >
            {/* Verdict Header */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-[var(--kc-border-subtle)]">
              <div className="flex items-center gap-2">
                {isAccepted ? (
                  <CheckCircle2 size={18} className="text-[var(--kc-success-text)]" />
                ) : (
                  <XCircle size={18} className="text-[var(--kc-error-text)]" />
                )}
                <span
                  className={`font-bold text-lg font-mono ${
                    isAccepted ? 'text-[var(--kc-success-text)]' : 'text-[var(--kc-error-text)]'
                  }`}
                >
                  {verdict.verdict}
                </span>
              </div>
              {verdict.total > 0 && (
                <span className="text-xs text-[var(--kc-text-secondary)] font-mono bg-[var(--kc-surface)] px-2.5 py-1 rounded border border-[var(--kc-border)]">
                  {verdict.passed} / {verdict.total} Test Cases Passed
                </span>
              )}
            </div>

            {/* Metrics */}
            {verdict.runtime && (
              <div className="flex flex-wrap gap-4 text-[var(--kc-text-secondary)] text-xs font-mono bg-[var(--kc-surface)] px-3 py-1.5 rounded-md border border-[var(--kc-border)] inline-flex mb-3">
                <span>
                  <strong className="text-[var(--kc-text-primary)] font-semibold">Runtime:</strong> {verdict.runtime}
                </span>
                <span>
                  <strong className="text-[var(--kc-text-primary)] font-semibold">Memory:</strong> {verdict.memory}
                </span>
              </div>
            )}

            {/* Formatted Failed Test Case Details if available */}
            {hasFailedDetails ? (
              <div className="space-y-3 mt-2 text-xs">
                <div className="text-[var(--kc-text-primary)] font-semibold font-mono">
                  Failed on test case {(verdict.passed || 0) + 1} of {verdict.total}:
                </div>
                {verdict.failedInput && (
                  <div>
                    <span className="text-[var(--kc-text-secondary)] font-mono font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                      Input
                    </span>
                    <pre className="text-[12.5px] text-[var(--kc-text-primary)] font-mono bg-[var(--kc-surface)] p-2.5 rounded-md border border-[var(--kc-border)] whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                      {formatInput(verdict.failedInput, signature)}
                    </pre>
                  </div>
                )}
                {verdict.failedExpected && (
                  <div>
                    <span className="text-[var(--kc-text-secondary)] font-mono font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                      Expected Output
                    </span>
                    <pre className="text-[12.5px] text-[var(--kc-success-text)] font-mono bg-[var(--kc-surface)] p-2.5 rounded-md border border-[var(--kc-border)] whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                      {formatOutput(verdict.failedExpected, returnType)}
                    </pre>
                  </div>
                )}
                {verdict.failedActual && (
                  <div>
                    <span className="text-[var(--kc-text-secondary)] font-mono font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                      Your Output
                    </span>
                    <pre className="text-[12.5px] text-[var(--kc-error-text)] font-mono bg-[var(--kc-surface)] p-2.5 rounded-md border border-[var(--kc-error-border)] whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                      {formatOutput(verdict.failedActual, returnType)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              verdict.details && (
                <div className="text-[var(--kc-text-primary)] font-mono text-xs mt-3 whitespace-pre-wrap leading-relaxed bg-[var(--kc-surface)] p-2.5 rounded-md border border-[var(--kc-border)]">
                  {verdict.details}
                </div>
              )
            )}
          </div>
        )}

        {!isRunning && !verdict && errorMessage && (
          <div className="bg-[var(--kc-surface-subtle)] border border-[var(--kc-error-border)] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-mono font-semibold text-[var(--kc-error-text)]">
              <XCircle size={14} className="text-[var(--kc-error-text)] shrink-0" />
              <span>Execution / Diagnostics Log</span>
            </div>
            <pre className="text-[var(--kc-error-text)] text-xs font-mono leading-relaxed bg-[var(--kc-surface)] p-3 rounded-md border border-[var(--kc-error-border)] whitespace-pre-wrap overflow-x-auto">
              {errorMessage}
            </pre>
          </div>
        )}

        {!isRunning && !verdict && !errorMessage && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--kc-text-muted)]">
            <Terminal size={26} className="mb-2 text-[var(--kc-text-muted)] opacity-70" />
            <p className="text-sm font-medium text-[var(--kc-text-primary)]">Ready for execution</p>
            <p className="text-xs mt-1 text-[var(--kc-text-secondary)] max-w-sm">
              Run your code to evaluate against test cases or submit a solution to verify correctness.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
