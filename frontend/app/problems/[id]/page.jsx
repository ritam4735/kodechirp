'use client';

import { useEffect, useState } from 'react';
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
import { useEditor } from '../../../hooks/useEditor';
import { Code2, BookOpen, MessageCircle, Activity, FileCheck, Target, ChevronRight, Terminal } from 'lucide-react';
import Link from 'next/link';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

export default function ProblemPage() {
  const { id } = useParams();
  const { currentProblem, isLoading, fetchProblemDetails } = useProblem();
  const { output, verdict, resetConsole } = useEditor();

  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    if (id) {
      resetConsole();
      fetchProblemDetails(id);
    }
    
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center pt-[68px]">
        <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentProblem) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#8b949e] pt-[68px]">
        Problem not found.
      </div>
    );
  }

  const showConsole = !!(output || verdict);

  return (
    <div className="flex-1 flex flex-col p-4 pt-[84px] bg-transparent min-h-screen">
      
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#050812]">
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-[#58a6ff]/5 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-[#a371f7]/5 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="w-full h-[calc(100vh-100px)] min-h-[600px] mb-8">
        {isMobile ? (
          <div className="flex flex-col h-full overflow-hidden gap-4">
            <div className="flex gap-2 bg-white/[0.02] p-1.5 rounded-xl border border-white/10 shrink-0">
              <button onClick={() => setActiveTab('description')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'description' ? 'bg-[#58a6ff]/20 text-white' : 'text-[#8b949e] hover:bg-white/5'}`}>Problem</button>
              <button onClick={() => setActiveTab('editor')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'editor' ? 'bg-[#58a6ff]/20 text-white' : 'text-[#8b949e] hover:bg-white/5'}`}>Code</button>
              <button onClick={() => setActiveTab('tests')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'tests' ? 'bg-[#58a6ff]/20 text-white' : 'text-[#8b949e] hover:bg-white/5'}`}>Tests</button>
            </div>
            <div className="flex-1 min-h-0">
              {activeTab === 'description' && <LeftPanelContent currentProblem={currentProblem} />}
              {activeTab === 'editor' && <EditorContent problemId={currentProblem.id} />}
              {activeTab === 'tests' && <BottomContent testCases={currentProblem.testCases} showConsole={showConsole} />}
            </div>
          </div>
        ) : (
          <PanelGroup id="kodechirp-ide-layout-main" orientation="horizontal" className="h-full w-full">
            <Panel defaultSize={40} minSize={25} className="flex flex-col min-h-0">
              <LeftPanelContent currentProblem={currentProblem} />
            </Panel>

            <ResizeHandle direction="horizontal" />

            <Panel minSize={40} className="flex flex-col min-h-0">
              <PanelGroup id="kodechirp-ide-layout-right" orientation="vertical">
                <Panel defaultSize={75} minSize={30} className="flex flex-col min-h-0">
                  <EditorContent problemId={currentProblem.id} />
                </Panel>

                <ResizeHandle direction="vertical" />

                <Panel defaultSize={25} minSize={15} className="flex flex-col min-h-0">
                  <BottomContent testCases={currentProblem.testCases} showConsole={showConsole} />
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        )}
      </div>

    </div>
  );
}

// Left Panel Content (Problem Description)
const LeftPanelContent = ({ currentProblem }) => (
    <div className="flex flex-col h-full overflow-hidden min-h-0 bg-transparent gap-4">
      {/* Header Card */}
      <div className="shrink-0 bg-white/[0.02] border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8b949e] mb-1">
          <Link href="/questions" className="hover:text-white transition-colors">Problems</Link>
          <ChevronRight size={12} />
          <span className="text-white">{currentProblem.title}</span>
        </div>
        
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold font-display text-white">{currentProblem.title}</h1>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
            currentProblem.difficulty === 'Easy' ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20' :
            currentProblem.difficulty === 'Medium' ? 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/20' :
            'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20'
          }`}>
            {currentProblem.difficulty}
          </span>
        </div>
        
        <div className="flex items-center flex-wrap gap-4 text-xs font-medium text-[#8b949e] mt-2">
          <div className="flex items-center gap-1.5"><Target size={14} className="text-[#a855f7]"/> 12.4K Solves</div>
          <div className="flex items-center gap-1.5"><MessageCircle size={14} className="text-[#58a6ff]"/> Community</div>
          <div className="flex items-center gap-1.5"><Activity size={14} className="text-[#22c55e]"/> {currentProblem.acceptance_rate || 0}% Acceptance</div>
        </div>
      </div>

      {/* Description Container */}
      <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg flex flex-col overflow-hidden min-h-0">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/[0.01] shrink-0">
          <BookOpen size={16} className="text-[#a855f7]" />
          <h2 className="text-sm font-semibold text-[#e6edf3]">Description</h2>
        </div>
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
          <ProblemDescription problem={currentProblem} />
          
          <div className="mt-8 border-t border-white/10 pt-8">
            <ChirpsSection problemId={currentProblem.id} />
          </div>
        </div>
      </div>
    </div>
  );

// Editor Content
const EditorContent = ({ problemId }) => (
    <div className="flex flex-col h-full bg-[#0d1117]/80 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg overflow-hidden min-h-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-[#58a6ff]" />
          <LanguageSelector />
        </div>
        <div className="flex items-center gap-3">
          <RunButton />
          <SubmitButton problemId={problemId} />
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <CodeEditor />
      </div>
    </div>
  );

// Bottom Content (Tests & Console)
const BottomContent = ({ testCases, showConsole }) => (
    <div className="flex flex-col h-full bg-[#0d1117]/80 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg overflow-hidden min-h-0">
      <div className="flex items-center gap-6 px-4 py-3 border-b border-white/10 bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2">
          <FileCheck size={16} className="text-[#22c55e]" />
          <span className="text-sm font-semibold text-[#e6edf3]">Test Cases</span>
        </div>
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-[#8b949e]" />
          <span className="text-sm font-semibold text-[#8b949e]">Console</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-5 flex flex-col gap-6">
        <TestCases testCases={testCases} />
        {showConsole && (
          <div className="border-t border-white/10 pt-4 mt-2">
            <ConsolePanel />
          </div>
        )}
      </div>
    </div>
  );


const ResizeHandle = ({ direction }) => (
  <PanelResizeHandle className={`group flex items-center justify-center transition-colors ${
    direction === 'horizontal' ? 'w-3 cursor-col-resize mx-0' : 'h-3 cursor-row-resize my-0'
  }`}>
    <div className={`rounded-full transition-all bg-white/10 group-hover:bg-[#58a6ff]/80 ${
      direction === 'horizontal' ? 'w-1 h-8 group-hover:h-12' : 'h-1 w-8 group-hover:w-12'
    }`} />
  </PanelResizeHandle>
);
