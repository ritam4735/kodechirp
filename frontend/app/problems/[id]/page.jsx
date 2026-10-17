'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useProblem } from '../../../hooks/useProblem';
import { ProblemDescription } from '../../../components/problem/ProblemDescription';
import { TestCases } from '../../../components/problem/TestCases';
import { ChirpsSection } from '../../../components/chirps/ChirpsSection';
import dynamic from 'next/dynamic';
import { LanguageSelector } from '../../../components/editor/LanguageSelector';

const CodeEditor = dynamic(
  () => import('../../../components/editor/CodeEditor').then((mod) => mod.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center h-full w-full bg-[var(--kc-surface)] gap-3">
        <div className="w-7 h-7 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-[var(--kc-text-muted)] font-mono text-xs uppercase tracking-wider animate-pulse">Initializing editor…</span>
      </div>
    ),
  }
);
import { RunButton } from '../../../components/editor/RunButton';
import { SubmitButton } from '../../../components/editor/SubmitButton';
import { ConsolePanel } from '../../../components/editor/ConsolePanel';
import { useEditor } from '../../../hooks/useEditor';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Code2, 
  BookOpen, 
  MessageCircle, 
  Activity, 
  FileCheck, 
  Target, 
  ChevronRight, 
  Terminal, 
  Lock, 
  AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

function DifficultyBadge({ difficulty }) {
  if (difficulty === 'Easy') return <span className="kc-diff-badge kc-diff-easy">Easy</span>;
  if (difficulty === 'Hard') return <span className="kc-diff-badge kc-diff-hard">Hard</span>;
  return <span className="kc-diff-badge kc-diff-medium">Medium</span>;
}

export default function ProblemPage() {
  const { id } = useParams();
  const { currentProblem, isLoading, error, fetchProblemDetails } = useProblem();
  const { resetConsole } = useEditor();

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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-[var(--kc-bg)] gap-3">
        <div className="w-7 h-7 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-[var(--kc-text-muted)] uppercase tracking-wider">
          Loading challenge workspace…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4 min-h-[calc(100vh-64px)] bg-[var(--kc-bg)]">
        <AlertTriangle size={32} className="text-[#EF4444]" />
        <p className="text-base font-semibold text-[#EF4444]">{error}</p>
        <p className="text-xs text-[var(--kc-text-muted)]">Unable to load this challenge from the cluster.</p>
        <button
          type="button"
          onClick={() => fetchProblemDetails(id)}
          className="kc-btn-secondary"
          style={{ padding: '6px 16px', fontSize: '12px', marginTop: '8px' }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!currentProblem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--kc-text-secondary)] min-h-[calc(100vh-64px)] bg-[var(--kc-bg)]">
        <p className="text-sm">Challenge not found.</p>
        <Link href="/questions" className="text-xs text-[var(--kc-accent)] hover:underline">
          Return to challenges repository →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-[var(--kc-bg)] p-2 sm:p-3 overflow-hidden">
      <div className="w-full h-full min-h-0 flex flex-col">
        {isMobile ? (
          <div className="flex flex-col h-full overflow-hidden gap-2 relative">
            <div className="flex gap-1 bg-[var(--kc-surface-subtle)] p-1 rounded-md border border-[var(--kc-border)] shrink-0" role="tablist" aria-label="Problem views">
              <button 
                type="button" 
                role="tab" 
                aria-selected={activeTab === 'description'} 
                onClick={() => setActiveTab('description')} 
                className={`flex-1 py-1.5 text-xs font-mono font-medium rounded transition-colors ${
                  activeTab === 'description' ? 'bg-[var(--kc-surface)] text-[var(--kc-text-primary)] border border-[var(--kc-border)] shadow-sm' : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)]'
                }`}
              >
                Problem
              </button>
              <button 
                type="button" 
                role="tab" 
                aria-selected={activeTab === 'editor'} 
                onClick={() => setActiveTab('editor')} 
                className={`flex-1 py-1.5 text-xs font-mono font-medium rounded transition-colors ${
                  activeTab === 'editor' ? 'bg-[var(--kc-surface)] text-[var(--kc-text-primary)] border border-[var(--kc-border)] shadow-sm' : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)]'
                }`}
              >
                Code
              </button>
              <button 
                type="button" 
                role="tab" 
                aria-selected={activeTab === 'tests'} 
                onClick={() => setActiveTab('tests')} 
                className={`flex-1 py-1.5 text-xs font-mono font-medium rounded transition-colors ${
                  activeTab === 'tests' ? 'bg-[var(--kc-surface)] text-[var(--kc-text-primary)] border border-[var(--kc-border)] shadow-sm' : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)]'
                }`}
              >
                Tests
              </button>
            </div>

            <div className="flex-1 min-h-0">
              {activeTab === 'description' && <LeftPanelContent currentProblem={currentProblem} isMobile={isMobile} />}
              {activeTab === 'editor' && <EditorContent problemId={currentProblem.id} />}
              {activeTab === 'tests' && <BottomContent testCases={currentProblem.testCases} problem={currentProblem} />}
            </div>

            {/* Mobile CTA: Switch to Editor */}
            {activeTab === 'description' && (
              <div className="fixed bottom-3 left-3 right-3 z-30 md:hidden pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className="w-full py-2.5 px-4 bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-white font-semibold rounded-lg shadow-md flex items-center justify-center gap-2 text-xs transition-colors"
                >
                  <Code2 size={14} aria-hidden="true" />
                  <span>Open Code Workspace</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <PanelGroup id="kodechirp-ide-layout-main" orientation="horizontal" className="h-full w-full">
            <Panel defaultSize={42} minSize={28} className="flex flex-col min-h-0">
              <LeftPanelContent currentProblem={currentProblem} isMobile={false} />
            </Panel>

            <ResizeHandle direction="horizontal" />

            <Panel minSize={40} className="flex flex-col min-h-0">
              <PanelGroup id="kodechirp-ide-layout-right" orientation="vertical">
                <Panel defaultSize={68} minSize={30} className="flex flex-col min-h-0">
                  <EditorContent problemId={currentProblem.id} />
                </Panel>

                <ResizeHandle direction="vertical" />

                <Panel defaultSize={32} minSize={18} className="flex flex-col min-h-0">
                  <BottomContent testCases={currentProblem.testCases} problem={currentProblem} />
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        )}
      </div>
    </div>
  );
}

// Left Panel Content (Problem Description & Meta)
const LeftPanelContent = ({ currentProblem, isMobile }) => (
  <div className="flex flex-col h-full bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg overflow-hidden min-h-0">
    {/* Problem Header Information */}
    <div className="p-4 sm:p-5 border-b border-[var(--kc-border)] shrink-0 flex flex-col gap-2.5 bg-[var(--kc-surface)]">
      <div className="flex items-center gap-1.5 text-xs text-[var(--kc-text-muted)] font-mono">
        <Link href="/questions" className="hover:text-[var(--kc-text-primary)] transition-colors">
          Challenges
        </Link>
        <ChevronRight size={11} />
        <span className="text-[var(--kc-text-secondary)] truncate max-w-[240px]">{currentProblem.title}</span>
      </div>
      
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-bold font-display text-[var(--kc-text-primary)] tracking-tight">
          {currentProblem.title}
        </h1>
        <DifficultyBadge difficulty={currentProblem.difficulty} />
      </div>
      
      <div className="flex items-center flex-wrap gap-4 text-xs font-mono text-[var(--kc-text-muted)] mt-0.5">
        <div className="flex items-center gap-1.5">
          <Target size={13} className="text-[var(--kc-accent)]" />
          <span>Verified Sandbox</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity size={13} className="text-[#10B981]" />
          <span>{currentProblem.acceptance_rate || 0}% Acceptance</span>
        </div>
      </div>
    </div>

    {/* Scrollable Problem Description & Community Chirps */}
    <div className={`p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar ${isMobile ? 'pb-24' : ''}`}>
      <ProblemDescription problem={currentProblem} />
      
      <div className="mt-8 border-t border-[var(--kc-border)] pt-6">
        <ChirpsSection problemId={currentProblem.id} />
      </div>
    </div>
  </div>
);

// Editor Content Panel
const EditorContent = ({ problemId }) => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="flex flex-col h-full bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg overflow-hidden min-h-0 relative">
      {/* Editor Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] shrink-0">
        <LanguageSelector />
        <div className="flex items-center gap-2">
          <RunButton disabled={!isAuthenticated} />
          <SubmitButton problemId={problemId} disabled={!isAuthenticated} />
        </div>
      </div>

      {/* Editor Canvas Area */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        <CodeEditor />
        {!isAuthenticated && (
          <div className="absolute inset-0 bg-[var(--kc-surface)]/85 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
            <Lock className="w-7 h-7 text-[var(--kc-text-muted)] mb-3" />
            <h3 className="text-base font-semibold text-[var(--kc-text-primary)] mb-1">Authentication Required</h3>
            <p className="text-xs text-[var(--kc-text-muted)] mb-4 max-w-xs">
              Log in to run code against the judge sandbox cluster and submit verified solutions.
            </p>
            <Link 
              href="/auth" 
              className="kc-btn-primary" 
              style={{ padding: '8px 18px', fontSize: '12px' }}
            >
              Sign In to Code
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// Bottom Panel: Test Cases & Console Output
const BottomContent = ({ testCases, problem }) => {
  const { activePanel, setActivePanel, output, verdict, execution } = useEditor();
  const isConsole = activePanel === 'console';
  const hasConsoleContent = Boolean(output || verdict || execution?.error);

  return (
    <div className="flex flex-col h-full bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg overflow-hidden min-h-0">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] shrink-0" role="tablist" aria-label="Editor panels">
        <button
          type="button"
          role="tab"
          aria-selected={!isConsole}
          aria-label="Test Cases panel"
          onClick={() => setActivePanel('testcases')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
            !isConsole
              ? 'bg-[var(--kc-surface)] text-[var(--kc-text-primary)] border border-[var(--kc-border)] shadow-sm'
              : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)]'
          }`}
        >
          <FileCheck size={13} aria-hidden="true" className={!isConsole ? 'text-[var(--kc-accent)]' : 'text-[var(--kc-text-muted)]'} />
          <span>Test Cases</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isConsole}
          aria-label="Execution Console panel"
          onClick={() => setActivePanel('console')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors relative cursor-pointer ${
            isConsole
              ? 'bg-[var(--kc-surface)] text-[var(--kc-text-primary)] border border-[var(--kc-border)] shadow-sm'
              : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)]'
          }`}
        >
          <Terminal size={13} aria-hidden="true" className={isConsole ? 'text-[var(--kc-accent)]' : 'text-[var(--kc-text-muted)]'} />
          <span>Console</span>
          {hasConsoleContent && !isConsole && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--kc-accent)]" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-3.5">
        {!isConsole ? (
          <TestCases testCases={testCases} problem={problem} />
        ) : (
          <ConsolePanel />
        )}
      </div>
    </div>
  );
};

// Subtle Resizable Divider Handle
const ResizeHandle = ({ direction }) => (
  <PanelResizeHandle className={`group flex items-center justify-center transition-colors ${
    direction === 'horizontal' ? 'w-2 cursor-col-resize mx-0.5' : 'h-2 cursor-row-resize my-0.5'
  }`}>
    <div className={`rounded-full transition-colors bg-[var(--kc-border)] group-hover:bg-[var(--kc-accent)] ${
      direction === 'horizontal' ? 'w-0.5 h-6 group-hover:h-10' : 'h-0.5 w-6 group-hover:w-10'
    }`} />
  </PanelResizeHandle>
);
