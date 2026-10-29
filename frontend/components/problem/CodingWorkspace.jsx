'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { 
  FileCheck, 
  Terminal, 
  RotateCcw, 
  Lock, 
  Layers 
} from 'lucide-react';
import { LanguageSelector } from '../editor/LanguageSelector';
import { RunButton } from '../editor/RunButton';
import { SubmitButton } from '../editor/SubmitButton';
import { ConsolePanel } from '../editor/ConsolePanel';
import { TestCases } from './TestCases';
import { useEditor } from '../../hooks/useEditor';
import { useAuth } from '../../hooks/useAuth';

const CodeEditor = dynamic(
  () => import('../editor/CodeEditor').then((mod) => mod.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center h-full w-full bg-[var(--kc-surface)] gap-3">
        <div className="w-7 h-7 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-[var(--kc-text-muted)] font-mono text-xs uppercase tracking-wider animate-pulse">
          Initializing editor…
        </span>
      </div>
    ),
  }
);

const STORAGE_KEY_VERTICAL = 'kc_ide_layout_v_v5';
const DEFAULT_VERTICAL_LAYOUT = { 'editor-panel': 65, 'console-panel': 35 };

function validateVerticalLayout(layout) {
  if (!layout || typeof layout !== 'object') return false;
  const e = Number(layout['editor-panel']);
  const c = Number(layout['console-panel']);
  if (!Number.isFinite(e) || !Number.isFinite(c)) return false;
  if (e < 20 || e > 85) return false;
  if (c < 15 || c > 80) return false;
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

// Resizable Divider Handle (Vertical by default inside CodingWorkspace)
export const ResizeHandle = ({ direction = 'vertical' }) => (
  <PanelResizeHandle 
    className={`group flex items-center justify-center transition-colors hover:bg-[var(--kc-surface-subtle)]/60 shrink-0 ${
      direction === 'horizontal' ? 'w-2 cursor-col-resize mx-0.5' : 'h-2 cursor-row-resize my-0.5'
    }`}
  >
    <div 
      className={`rounded-full transition-colors bg-[var(--kc-border)] group-hover:bg-[var(--kc-accent)] ${
        direction === 'horizontal' ? 'w-1 h-8 group-hover:h-12' : 'h-1 w-8 group-hover:w-12'
      }`} 
    />
  </PanelResizeHandle>
);

/**
 * Reusable Coding Workspace Component
 * Used across both KodeChirp's regular problem-solving page and assessments.
 * Houses the CodeEditor, LanguageSelector, execution controls, TestCases panel, and ConsolePanel.
 */
export function CodingWorkspace({
  problem,
  testCases: customTestCases,
  isAssessmentMode = false,
  saveStatus = null,
  language: controlledLanguage,
  onLanguageChange,
  code: controlledCode,
  onCodeChange,
  onReset,
  onRun,
  onRunComplete,
  onSubmit,
  onSubmitSuccess,
  submitLabel = 'Submit',
  submitFullLabel = 'Solution',
  readOnly = false,
  onOpenDrawer,
}) {
  const { isAuthenticated } = useAuth();
  const editor = useEditor();

  const [verticalLayout, setVerticalLayout] = useState(() =>
    loadStoredLayout(STORAGE_KEY_VERTICAL, DEFAULT_VERTICAL_LAYOUT, validateVerticalLayout)
  );

  const handleVerticalLayoutChange = useCallback((layout) => {
    if (validateVerticalLayout(layout)) {
      setVerticalLayout(layout);
      try {
        localStorage.setItem(STORAGE_KEY_VERTICAL, JSON.stringify(layout));
      } catch (e) {}
    }
  }, []);

  const handleResetClick = () => {
    const resetCode = editor.handleResetCode();
    if (onReset) {
      onReset(resetCode);
    }
  };

  const activeProblemId = problem?.id || problem?.problem_id;
  const effectiveTestCases = customTestCases || problem?.testCases || problem?.sample_test_cases || [];

  return (
    <PanelGroup
      id="kodechirp-coding-workspace-layout"
      orientation="vertical"
      defaultLayout={verticalLayout}
      onLayoutChanged={handleVerticalLayoutChange}
      className="h-full w-full min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden"
      style={{ height: '100%', width: '100%' }}
    >
      {/* ── TOP: CODE EDITOR PANEL ────────────────────────────────────── */}
      <Panel
        id="editor-panel"
        defaultSize="65%"
        minSize="30%"
        maxSize="85%"
        className="flex-1 flex flex-col h-full w-full min-h-0 min-w-0 !overflow-hidden"
        style={{ height: '100%' }}
      >
        <div className="flex-1 flex flex-col h-full w-full bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg overflow-hidden min-h-0 min-w-0 relative">
          {/* Editor Control Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {onOpenDrawer && (
                <button
                  type="button"
                  onClick={onOpenDrawer}
                  className="p-1.5 rounded text-[var(--kc-text-secondary)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] transition-colors flex items-center gap-1 text-xs font-mono border border-[var(--kc-border-subtle)]"
                  title="Open Question Navigator"
                  aria-label="Open Question Navigator"
                >
                  <Layers size={13} className="text-[var(--kc-accent)]" />
                  <span>#{String(problem?.serial_number || 1).padStart(2, '0')}</span>
                </button>
              )}

              {/* Language Selector */}
              <LanguageSelector 
                value={controlledLanguage} 
                onChange={onLanguageChange} 
              />

              {/* Reset to starter code */}
              <button
                type="button"
                onClick={handleResetClick}
                disabled={readOnly}
                title="Reset code to starter template"
                aria-label="Reset to starter template"
                className="flex items-center gap-1 text-[11px] font-mono text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] transition-colors px-2 py-1 rounded hover:bg-[var(--kc-surface)] border border-transparent hover:border-[var(--kc-border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            {/* Right: Save Status & Execution Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {saveStatus && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[var(--kc-text-muted)] px-2 py-0.5 rounded bg-[var(--kc-surface)] border border-[var(--kc-border-subtle)]">
                  <span 
                    className={`w-1.5 h-1.5 rounded-full ${
                      saveStatus === 'Saved' 
                        ? 'bg-[var(--kc-success)]' 
                        : 'bg-[var(--kc-warning)] animate-pulse'
                    }`} 
                  />
                  <span className="text-[11px]">{saveStatus}</span>
                </div>
              )}

              <RunButton 
                disabled={(!isAssessmentMode && !isAuthenticated) || readOnly} 
                onRun={onRun}
                onComplete={onRunComplete}
              />

              <SubmitButton 
                problemId={activeProblemId} 
                disabled={(!isAssessmentMode && !isAuthenticated) || readOnly}
                onSubmit={onSubmit}
                onSuccess={onSubmitSuccess}
                label={submitLabel}
                fullLabel={submitFullLabel}
              />
            </div>
          </div>

          {/* Editor Canvas Area */}
          <div className="flex-1 min-h-0 min-w-0 flex flex-col relative w-full overflow-hidden">
            <CodeEditor 
              problemId={activeProblemId}
              value={controlledCode}
              onChange={onCodeChange}
              language={controlledLanguage}
              readOnly={readOnly}
            />

            {/* Auth overlay only for unauthenticated practice mode */}
            {!isAssessmentMode && !isAuthenticated && (
              <div className="absolute inset-0 bg-[var(--kc-surface)]/85 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                <Lock className="w-7 h-7 text-[var(--kc-text-muted)] mb-3" />
                <h3 className="text-base font-semibold text-[var(--kc-text-primary)] mb-1">
                  Authentication Required
                </h3>
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
      </Panel>

      {/* ── DRAGGABLE DIVIDER ─────────────────────────────────────────── */}
      <ResizeHandle direction="vertical" />

      {/* ── BOTTOM: TEST CASES & CONSOLE PANEL ────────────────────────── */}
      <Panel
        id="console-panel"
        defaultSize="35%"
        minSize="15%"
        maxSize="70%"
        className="flex-1 flex flex-col h-full w-full min-h-0 min-w-0 !overflow-hidden"
        style={{ height: '100%' }}
      >
        <WorkspaceBottomContent 
          testCases={effectiveTestCases} 
          problem={problem} 
        />
      </Panel>
    </PanelGroup>
  );
}

// Bottom Panel: Test Cases & Execution Console Tabs
function WorkspaceBottomContent({ testCases, problem }) {
  const { activePanel, setActivePanel, output, verdict, execution } = useEditor();
  const isConsole = activePanel === 'console';
  const hasConsoleContent = Boolean(output || verdict || execution?.error);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg overflow-hidden min-h-0 min-w-0">
      {/* Tab Switcher Header */}
      <div 
        className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] shrink-0" 
        role="tablist" 
        aria-label="Editor panels"
      >
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
          <FileCheck 
            size={13} 
            aria-hidden="true" 
            className={!isConsole ? 'text-[var(--kc-accent)]' : 'text-[var(--kc-text-muted)]'} 
          />
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
          <Terminal 
            size={13} 
            aria-hidden="true" 
            className={isConsole ? 'text-[var(--kc-accent)]' : 'text-[var(--kc-text-muted)]'} 
          />
          <span>Console</span>
          {hasConsoleContent && !isConsole && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--kc-accent)]" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Active Tab Content Area */}
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar p-3.5">
        {!isConsole ? (
          <TestCases testCases={testCases} problem={problem} />
        ) : (
          <ConsolePanel />
        )}
      </div>
    </div>
  );
}
