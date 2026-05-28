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
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-65px)] overflow-hidden">
      {/* Left Panel: Problem Info & Chirps */}
      <div className="w-full md:w-1/2 flex flex-col border-r border-[#21262d] bg-[#0d1117] overflow-y-auto">
        <ProblemDescription problem={currentProblem} />
        <TestCases testCases={currentProblem.testCases} />
        <ChirpsSection problemId={currentProblem.id} />
      </div>

      {/* Right Panel: Editor & Console */}
      <div className="w-full md:w-1/2 flex flex-col bg-[#0d1117]">
        <div className="flex items-center justify-between border-b border-[#21262d] bg-[#161b22]">
          <LanguageSelector />
          <div className="flex items-center gap-2 pr-4">
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
