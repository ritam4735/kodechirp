'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProblem } from '../../../hooks/useProblem';
import { ProblemDescription } from '../../../components/problem/ProblemDescription';
import { ChirpsSection } from '../../../components/chirps/ChirpsSection';
import { QuestionNavigatorDrawer } from '../../../components/problem/QuestionNavigatorDrawer';
import { CodingWorkspace, ResizeHandle } from '../../../components/problem/CodingWorkspace';
import { useEditor } from '../../../hooks/useEditor';
import { 
  Code2, 
  Activity, 
  Target, 
  ChevronRight, 
  ChevronLeft,
  AlertTriangle,
  Layers,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { Panel, Group as PanelGroup } from 'react-resizable-panels';

const STORAGE_KEY_HORIZONTAL = 'kc_ide_layout_h_v5';
const STORAGE_KEY_VERTICAL = 'kc_ide_layout_v_v5';

const DEFAULT_HORIZONTAL_LAYOUT = { 'problem-panel': 40, 'workspace-panel': 60 };
const DEFAULT_VERTICAL_LAYOUT = { 'editor-panel': 65, 'console-panel': 35 };

function validateHorizontalLayout(layout) {
  if (!layout || typeof layout !== 'object') return false;
  const p = Number(layout['problem-panel']);
  const w = Number(layout['workspace-panel']);
  if (!Number.isFinite(p) || !Number.isFinite(w)) return false;
  if (p < 20 || p > 70) return false;
  if (w < 30 || w > 80) return false;
  const sum = p + w;
  if (sum < 90 || sum > 110) return false;
  return true;
}

function validateVerticalLayout(layout) {
  if (!layout || typeof layout !== 'object') return false;
  const e = Number(layout['editor-panel']);
  const c = Number(layout['console-panel']);
  if (!Number.isFinite(e) || !Number.isFinite(c)) return false;
  if (e < 25 || e > 85) return false;
  if (c < 15 || c > 75) return false;
  const sum = e + c;
  if (sum < 90 || sum > 110) return false;
  return true;
}

function loadStoredLayout(key, fallback, validator) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validator(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore invalid JSON / storage errors
  }
  return fallback;
}

function DifficultyBadge({ difficulty }) {
  if (difficulty === 'Easy') return <span className="kc-diff-badge kc-diff-easy">Easy</span>;
  if (difficulty === 'Hard') return <span className="kc-diff-badge kc-diff-hard">Hard</span>;
  return <span className="kc-diff-badge kc-diff-medium">Medium</span>;
}

export default function ProblemPage() {
  const router = useRouter();
  const { id } = useParams();
  const { currentProblem, isLoading, error, fetchProblemDetails } = useProblem();
  const { resetConsole } = useEditor();

  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSelectProblem = useCallback((problem) => {
    setIsDrawerOpen(false);
    if (problem && problem.slug) {
      router.push(`/problems/${problem.slug}`);
    }
  }, [router]);

  const [horizontalLayout, setHorizontalLayout] = useState(() => 
    loadStoredLayout(STORAGE_KEY_HORIZONTAL, DEFAULT_HORIZONTAL_LAYOUT, validateHorizontalLayout)
  );

  const [verticalLayout, setVerticalLayout] = useState(() =>
    loadStoredLayout(STORAGE_KEY_VERTICAL, DEFAULT_VERTICAL_LAYOUT, validateVerticalLayout)
  );

  const handleHorizontalLayoutChange = useCallback((layout) => {
    if (validateHorizontalLayout(layout)) {
      setHorizontalLayout(layout);
      try {
        localStorage.setItem(STORAGE_KEY_HORIZONTAL, JSON.stringify(layout));
      } catch (e) {}
    }
  }, []);

  const handleVerticalLayoutChange = useCallback((layout) => {
    if (validateVerticalLayout(layout)) {
      setVerticalLayout(layout);
      try {
        localStorage.setItem(STORAGE_KEY_VERTICAL, JSON.stringify(layout));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (id) {
      resetConsole();
      fetchProblemDetails(id);
    }
    
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [id, fetchProblemDetails, resetConsole]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] min-h-[calc(100dvh-var(--kc-nav-height,64px))] bg-[var(--kc-bg)] gap-3">
        <div className="w-7 h-7 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-[var(--kc-text-muted)] uppercase tracking-wider">
          Loading challenge workspace…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4 min-h-[calc(100vh-64px)] min-h-[calc(100dvh-var(--kc-nav-height,64px))] bg-[var(--kc-bg)]">
        <AlertTriangle size={32} className="text-[var(--kc-error)]" />
        <p className="text-base font-semibold text-[var(--kc-error)]">{error}</p>
        <p className="text-xs text-[var(--kc-text-secondary)]">Unable to load this challenge from the cluster.</p>
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
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--kc-text-secondary)] min-h-[calc(100vh-64px)] min-h-[calc(100dvh-var(--kc-nav-height,64px))] bg-[var(--kc-bg)]">
        <p className="text-sm">Challenge not found.</p>
        <Link href="/questions" className="text-xs text-[var(--kc-accent)] hover:underline">
          Return to challenges repository →
        </Link>
      </div>
    );
  }

  return (
    <div 
      className="kc-workspace-root w-full flex-1 flex flex-col overflow-hidden"
      style={{ 
        height: 'calc(100vh - var(--kc-nav-height, 64px))', 
        minHeight: 'calc(100vh - var(--kc-nav-height, 64px))' 
      }}
    >
      <div 
        className="kc-workspace-inner w-full h-full flex-1 flex flex-col overflow-hidden"
        style={{ height: '100%', minHeight: '100%' }}
      >
        {isMobile ? (
          <div className="flex flex-col h-full w-full min-h-0 min-w-0 overflow-hidden gap-2 relative">
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

            <div className="flex-1 min-h-0 min-w-0 flex flex-col h-full w-full overflow-hidden relative">
              {activeTab === 'description' && (
                <LeftPanelContent 
                  currentProblem={currentProblem} 
                  isMobile={isMobile}
                  isDrawerOpen={isDrawerOpen}
                  setIsDrawerOpen={setIsDrawerOpen}
                  onSelectProblem={handleSelectProblem}
                />
              )}
              {activeTab === 'editor' && (
                <CodingWorkspace 
                  problem={currentProblem}
                  onOpenDrawer={() => setIsDrawerOpen(true)}
                />
              )}
              {activeTab === 'tests' && (
                <CodingWorkspace 
                  problem={currentProblem}
                  onOpenDrawer={() => setIsDrawerOpen(true)}
                />
              )}
            </div>

            {/* Mobile CTA: Switch to Editor */}
            {activeTab === 'description' && (
              <div className="fixed bottom-3 left-3 right-3 z-30 md:hidden pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className="w-full py-2.5 px-4 bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] font-semibold rounded-lg shadow-md flex items-center justify-center gap-2 text-xs transition-colors"
                >
                  <Code2 size={14} aria-hidden="true" />
                  <span>Open Code Workspace</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <PanelGroup
            id="kodechirp-ide-layout-main"
            orientation="horizontal"
            defaultLayout={horizontalLayout}
            onLayoutChanged={handleHorizontalLayoutChange}
            className="h-full w-full min-h-0 min-w-0 flex-1"
            style={{ height: '100%', width: '100%' }}
          >
            <Panel
              id="problem-panel"
              defaultSize="40%"
              minSize="25%"
              maxSize="60%"
              className="flex-1 flex flex-col h-full w-full min-h-0 min-w-0 !overflow-hidden relative"
              style={{ height: '100%' }}
            >
              <LeftPanelContent 
                currentProblem={currentProblem} 
                isMobile={false} 
                isDrawerOpen={isDrawerOpen}
                setIsDrawerOpen={setIsDrawerOpen}
                onSelectProblem={handleSelectProblem}
              />
            </Panel>

            <ResizeHandle direction="horizontal" />

            <Panel
              id="workspace-panel"
              defaultSize="60%"
              minSize="40%"
              maxSize="75%"
              className="flex-1 flex flex-col h-full w-full min-h-0 min-w-0 !overflow-hidden"
              style={{ height: '100%' }}
            >
              <CodingWorkspace 
                problem={currentProblem} 
                onOpenDrawer={() => setIsDrawerOpen(true)} 
              />
            </Panel>
          </PanelGroup>
        )}
      </div>
    </div>
  );
}

// Left Panel Content (Problem Description & Meta)
const LeftPanelContent = ({ 
  currentProblem, 
  isMobile, 
  isDrawerOpen, 
  setIsDrawerOpen, 
  onSelectProblem 
}) => (
  <div className="flex-1 flex flex-col h-full w-full bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg overflow-hidden min-h-0 min-w-0 relative">
    {/* Question Navigator Drawer — Overlays the description pane without shifting or resizing editor */}
    <QuestionNavigatorDrawer
      isOpen={isDrawerOpen}
      onClose={() => setIsDrawerOpen(false)}
      currentProblem={currentProblem}
      onSelectProblem={onSelectProblem}
    />

    {/* Problem Header Information */}
    <div className="p-4 sm:p-5 border-b border-[var(--kc-border)] shrink-0 flex flex-col gap-2.5 bg-[var(--kc-surface)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[var(--kc-text-muted)] font-mono min-w-0">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="hover:text-[var(--kc-text-primary)] transition-colors flex items-center gap-1 font-semibold group cursor-pointer focus:outline-none shrink-0"
            title="Open Question Navigator"
            aria-label="Open Question Navigator"
          >
            <Layers size={13} className="text-[var(--kc-accent)] shrink-0" aria-hidden="true" />
            <span className="hover:underline">Challenges</span>
            <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="text-[var(--kc-text-secondary)] hover:text-[var(--kc-text-primary)] truncate max-w-[180px] sm:max-w-[260px] transition-colors cursor-pointer text-left font-mono"
            title="Click to switch question"
          >
            #{String(currentProblem.serial_number || 1).padStart(2, '0')} {currentProblem.title}
          </button>
        </div>

        {/* Quick Prev / Next problem buttons right in header */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            disabled={!currentProblem.prevProblem}
            onClick={() => currentProblem.prevProblem && onSelectProblem(currentProblem.prevProblem)}
            className="p-1 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface-subtle)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title={currentProblem.prevProblem ? `Previous: #${currentProblem.prevProblem.serial_number} ${currentProblem.prevProblem.title}` : 'First challenge'}
            aria-label="Previous challenge"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            disabled={!currentProblem.nextProblem}
            onClick={() => currentProblem.nextProblem && onSelectProblem(currentProblem.nextProblem)}
            className="p-1 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface-subtle)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title={currentProblem.nextProblem ? `Next: #${currentProblem.nextProblem.serial_number} ${currentProblem.nextProblem.title}` : 'Last challenge'}
            aria-label="Next challenge"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="text-left group cursor-pointer focus:outline-none"
          title="Click to open question navigator"
        >
          <h1 className="text-lg sm:text-xl font-bold font-display text-[var(--kc-text-primary)] group-hover:text-[var(--kc-accent)] transition-colors tracking-tight flex items-center gap-2">
            <span className="text-xs sm:text-sm font-mono font-medium text-[var(--kc-accent)] bg-[var(--kc-accent-subtle)] px-2 py-0.5 rounded border border-[var(--kc-accent-border)] shrink-0">
              #{String(currentProblem.serial_number || 1).padStart(2, '0')}
            </span>
            <span className="group-hover:underline">{currentProblem.title}</span>
          </h1>
        </button>
        <DifficultyBadge difficulty={currentProblem.difficulty} />
      </div>
      
      <div className="flex items-center flex-wrap gap-4 text-xs font-mono text-[var(--kc-text-secondary)] mt-0.5">
        <div className="flex items-center gap-1.5">
          <Target size={13} className="text-[var(--kc-accent)]" />
          <span>Verified Sandbox</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity size={13} className="text-[var(--kc-success)]" />
          <span>{currentProblem.acceptance_rate || 0}% Acceptance</span>
        </div>
        {currentProblem.is_solved && (
          <div className="flex items-center gap-1.5 text-[var(--kc-success)] font-semibold">
            <CheckCircle2 size={13} />
            <span>Solved</span>
          </div>
        )}
      </div>
    </div>

    {/* Scrollable Problem Description & Community Chirps */}
    <div className={`p-4 sm:p-5 flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar ${isMobile ? 'pb-24' : ''}`}>
      <ProblemDescription problem={currentProblem} />
      
      <div className="mt-8 border-t border-[var(--kc-border)] pt-6">
        <ChirpsSection problemId={currentProblem.id} />
      </div>
    </div>
  </div>
);

