import { useEditor } from '../../hooks/useEditor';
import { useProblemStore } from '../../store/problemStore';
import { formatInput, formatOutput } from '../../lib/testCaseFormatter';
import { Terminal, CheckCircle2, XCircle } from 'lucide-react';

export const ConsolePanel = () => {
  const { output, verdict } = useEditor();
  const { currentProblem } = useProblemStore();
  const signature = currentProblem?.signature_metadata;
  const returnType = signature?.returnType;

  if (!output && !verdict) return null;

  const isAccepted = verdict?.verdict === 'Accepted';
  const hasFailedDetails = Boolean(
    verdict && (verdict.failedInput || verdict.failedExpected || verdict.failedActual)
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent relative">
      <div className="flex-1 p-2 overflow-y-auto font-mono text-sm custom-scrollbar">
        {verdict && (
          <div
            className={`mb-4 bg-white/[0.02] p-5 rounded-xl border shadow-lg backdrop-blur-sm ${
              isAccepted ? 'border-emerald-500/20' : 'border-rose-500/20'
            }`}
          >
            {/* Verdict Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                {isAccepted ? (
                  <CheckCircle2 size={22} className="text-[#4ade80]" />
                ) : (
                  <XCircle size={22} className="text-[#f87171]" />
                )}
                <span
                  className={`font-bold text-xl ${
                    isAccepted ? 'text-[#4ade80]' : 'text-[#f87171]'
                  }`}
                >
                  {verdict.verdict}
                </span>
              </div>
              {verdict.total > 0 && (
                <span className="text-xs text-[#8b949e] font-semibold bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                  {verdict.passed} / {verdict.total} Test Cases Passed
                </span>
              )}
            </div>

            {/* Metrics */}
            {verdict.runtime && (
              <div className="flex gap-4 text-[#8b949e] text-xs font-medium bg-black/40 px-3 py-2 rounded-lg border border-white/5 inline-flex mb-4">
                <span>
                  <strong className="text-[#e6edf3]">Runtime:</strong> {verdict.runtime}
                </span>
                <span>
                  <strong className="text-[#e6edf3]">Memory:</strong> {verdict.memory}
                </span>
              </div>
            )}

            {/* Formatted Failed Test Case Details if available */}
            {hasFailedDetails ? (
              <div className="space-y-3 mt-2 text-xs">
                <div className="text-[#e6edf3] font-semibold mb-2">
                  Failed on test case {(verdict.passed || 0) + 1} of {verdict.total}:
                </div>
                {verdict.failedInput && (
                  <div>
                    <span className="text-[#8b949e] font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                      Input
                    </span>
                    <pre className="text-[13px] text-[#e6edf3] bg-black/40 p-2.5 rounded-lg border border-white/5 whitespace-pre-wrap overflow-x-auto">
                      {formatInput(verdict.failedInput, signature)}
                    </pre>
                  </div>
                )}
                {verdict.failedExpected && (
                  <div>
                    <span className="text-[#8b949e] font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                      Expected Output
                    </span>
                    <pre className="text-[13px] text-[#58a6ff] bg-black/40 p-2.5 rounded-lg border border-white/5 whitespace-pre-wrap overflow-x-auto">
                      {formatOutput(verdict.failedExpected, returnType)}
                    </pre>
                  </div>
                )}
                {verdict.failedActual && (
                  <div>
                    <span className="text-[#8b949e] font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                      Your Output
                    </span>
                    <pre className="text-[13px] text-rose-400 bg-black/40 p-2.5 rounded-lg border border-rose-500/20 whitespace-pre-wrap overflow-x-auto">
                      {formatOutput(verdict.failedActual, returnType)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              verdict.details && (
                <div className="text-[#e6edf3] mt-3 whitespace-pre-wrap leading-relaxed">
                  {verdict.details}
                </div>
              )
            )}
          </div>
        )}
        {output && !verdict && (
          <pre className="text-[#e6edf3] whitespace-pre-wrap font-mono leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">
            {output}
          </pre>
        )}
      </div>
    </div>
  );
};
