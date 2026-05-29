'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useProblem } from '../../../hooks/useProblem';
import { ProblemDescription } from '../../../components/problem/ProblemDescription';
import { TestCases } from '../../../components/problem/TestCases';
import { ChirpsSection } from '../../../components/chirps/ChirpsSection';
import { CodeEditor } from '../../../components/editor/CodeEditor';
import { LanguageSelector } from '../../../components/editor/LanguageSelector';
import { RunButton } from '../../../components/editor/RunButton';
import { SubmitButton } from '../../../components/editor/SubmitButton';
import { ConsolePanel } from '../../../components/editor/ConsolePanel';

export default function ProblemPage() {
  const { id } = useParams();
  const { currentProblem, isLoading, fetchProblemDetails } = useProblem();

  useEffect(() => {
    if (id) {
      fetchProblemDetails(id);
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentProblem) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#8b949e]">
        Problem not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Left Panel: Problem Info & Chirps */}
      <div className="w-full md:w-1/2 flex flex-col border-r border-white/[0.05] bg-[#06090e] overflow-y-auto">
        <ProblemDescription problem={currentProblem} />
        <TestCases testCases={currentProblem.testCases} />
        <ChirpsSection problemId={currentProblem.id} />
      </div>

      {/* Right Panel: Editor & Console */}
      <div className="w-full md:w-1/2 flex flex-col bg-[#06090e] shadow-[-4px_0_32px_rgba(0,0,0,0.6)] z-10 relative">
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-gradient-to-r from-[#07090f] via-[#0e1420] to-[#0e1420] h-14 shrink-0">
          <LanguageSelector />
          <div className="flex items-center gap-3 pr-5">
            <RunButton />
            <SubmitButton problemId={currentProblem.id} />
          </div>
        </div>

        <CodeEditor />
        <ConsolePanel />
      </div>
    </div>
  );
}
