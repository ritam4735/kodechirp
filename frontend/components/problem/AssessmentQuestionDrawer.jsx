'use client';

import React, { useEffect, useRef } from 'react';
import { 
  X, 
  Layers, 
  CheckCircle2, 
  Bookmark, 
  Code2, 
  FileText,
  Send,
  HelpCircle
} from 'lucide-react';

export function AssessmentQuestionDrawer({
  isOpen,
  onClose,
  sections = [],
  currentSectionIdx = 0,
  currentQuestionIdx = 0,
  responses = {},
  onSelectQuestion,
  onSectionChange,
  onOpenSubmitModal,
}) {
  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeSection = sections[currentSectionIdx] || sections[0];
  const questions = activeSection?.questions || [];

  // Calculate totals across whole assessment
  let totalAnswered = 0;
  let totalFlagged = 0;
  let totalQuestions = 0;

  for (const sec of sections) {
    for (const q of sec.questions || []) {
      totalQuestions++;
      const resp = responses[q.id];
      const hasAnswer = Boolean(
        (Array.isArray(resp?.selected_options) ? resp.selected_options.length > 0 : resp?.selected_options) ||
        resp?.text_response ||
        resp?.code_submission_id
      );
      if (hasAnswer) totalAnswered++;
      if (resp?.is_flagged_for_review) totalFlagged++;
    }
  }

  const totalUnanswered = Math.max(0, totalQuestions - totalAnswered);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-stretch justify-start bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Question Navigator Drawer"
      onClick={(e) => {
        // Close on clicking backdrop outside drawer
        if (drawerRef.current && !drawerRef.current.contains(e.target)) {
          onClose();
        }
      }}
    >
      <div 
        ref={drawerRef}
        className="w-full max-w-md sm:max-w-lg bg-[var(--kc-surface)] border-r border-[var(--kc-border)] shadow-2xl flex flex-col h-full overflow-hidden animate-slideRight"
      >
        {/* ── DRAWER HEADER ────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-[var(--kc-border)] bg-[var(--kc-surface)] shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--kc-accent-subtle)] border border-[var(--kc-accent-border)] flex items-center justify-center text-[var(--kc-accent)]">
              <Layers size={16} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--kc-text-primary)] font-display flex items-center gap-2">
                <span>Question Palette</span>
                <span className="text-[11px] font-mono font-medium text-[var(--kc-text-muted)] bg-[var(--kc-surface-subtle)] px-2 py-0.5 rounded border border-[var(--kc-border-subtle)]">
                  {questions.length} Questions
                </span>
              </h2>
              <p className="text-[11px] text-[var(--kc-text-muted)] mt-0.5">
                Navigate questions across sections
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface-subtle)] transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
            aria-label="Close question palette"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── SECTION SWITCHER TABS ────────────────────────────────────── */}
        {sections.length > 1 && (
          <div className="px-4 py-2 border-b border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] shrink-0 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {sections.map((sec, sIdx) => {
              const isSecActive = sIdx === currentSectionIdx;
              const secQuestions = sec.questions || [];
              let secAnswered = 0;
              for (const q of secQuestions) {
                const resp = responses[q.id];
                if (resp?.selected_options || resp?.text_response || resp?.code_submission_id) {
                  secAnswered++;
                }
              }

              return (
                <button
                  key={sec.id || sIdx}
                  type="button"
                  onClick={() => onSectionChange(sIdx)}
                  className={`py-1.5 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSecActive
                      ? 'bg-[var(--kc-surface)] text-[var(--kc-text-primary)] font-semibold border border-[var(--kc-border)] shadow-xs'
                      : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)]'
                  }`}
                >
                  <span>Sec {sIdx + 1}: {sec.title}</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-[var(--kc-surface-subtle)] border border-[var(--kc-border-subtle)] text-[var(--kc-text-secondary)]">
                    {secAnswered}/{secQuestions.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── STATS SUMMARY OVERVIEW ──────────────────────────────────── */}
        <div className="p-3 sm:p-4 border-b border-[var(--kc-border)] bg-[var(--kc-surface)] shrink-0">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-[var(--kc-success-subtle)] border border-[var(--kc-success-border)]">
              <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--kc-success-text)]">
                Answered
              </div>
              <div className="text-base font-bold font-mono text-[var(--kc-success)]">
                {totalAnswered}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[var(--kc-warning-subtle)] border border-[var(--kc-warning-border)]">
              <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--kc-warning-text)]">
                Review
              </div>
              <div className="text-base font-bold font-mono text-[var(--kc-warning)]">
                {totalFlagged}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)]">
              <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--kc-text-muted)]">
                Unanswered
              </div>
              <div className="text-base font-bold font-mono text-[var(--kc-text-secondary)]">
                {totalUnanswered}
              </div>
            </div>
          </div>
        </div>

        {/* ── QUESTION NUMBER PALETTE GRID ─────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--kc-text-secondary)] font-mono">
              {activeSection?.title || 'Section Questions'}
            </span>
            <span className="text-xs text-[var(--kc-text-muted)] font-mono">
              Click any question to view
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
            {questions.map((q, idx) => {
              const resp = responses[q.id];
              const isAnswered = Boolean(
                (Array.isArray(resp?.selected_options) ? resp.selected_options.length > 0 : resp?.selected_options) ||
                resp?.text_response ||
                resp?.code_submission_id
              );
              const isFlagged = Boolean(resp?.is_flagged_for_review);
              const isCurrent = idx === currentQuestionIdx;
              const isCoding = Boolean(q.is_coding || q.problem_id);

              let stateClasses = 'bg-[var(--kc-surface-subtle)] border-[var(--kc-border)] text-[var(--kc-text-secondary)] hover:border-[var(--kc-border-hover)] hover:text-[var(--kc-text-primary)]';

              if (isAnswered && isFlagged) {
                // Both answered and flagged for review
                stateClasses = 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-bold ring-2 ring-emerald-500/80';
              } else if (isAnswered) {
                // Answered
                stateClasses = 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs';
              } else if (isFlagged) {
                // Marked for review
                stateClasses = 'bg-amber-500 text-zinc-950 font-bold border-amber-500 shadow-xs';
              }

              return (
                <button
                  key={q.id || idx}
                  type="button"
                  onClick={() => {
                    onSelectQuestion(currentSectionIdx, idx);
                    onClose();
                  }}
                  title={`Question ${idx + 1}: ${q.title || q.category || 'Problem'} (+${q.marks} marks)`}
                  className={`h-11 rounded-lg border text-xs font-mono transition-all flex flex-col items-center justify-center relative cursor-pointer group ${stateClasses} ${
                    isCurrent ? 'ring-2 ring-[var(--kc-accent)] ring-offset-2 ring-offset-[var(--kc-surface)] scale-105 font-extrabold z-10' : ''
                  }`}
                >
                  <span className="text-xs">{idx + 1}</span>
                  
                  {/* Subtle Question Type Icon */}
                  <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                    {isCoding ? (
                      <Code2 size={9} aria-hidden="true" />
                    ) : (
                      <FileText size={9} aria-hidden="true" />
                    )}
                  </span>

                  {/* Bookmark badge if flagged */}
                  {isFlagged && (
                    <span 
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-[var(--kc-surface)]" 
                      title="Flagged for review" 
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── LEGEND ─────────────────────────────────────────────────── */}
          <div className="pt-4 border-t border-[var(--kc-border)] space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--kc-text-muted)] font-mono block">
              Legend
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--kc-text-secondary)]">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600 shrink-0" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-500 shrink-0" />
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500 ring-1 ring-emerald-500 shrink-0" />
                <span>Answered & Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] shrink-0" />
                <span>Unanswered</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── DRAWER FOOTER ────────────────────────────────────────────── */}
        <div className="p-4 border-t border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--kc-border)] text-[var(--kc-text-secondary)] hover:bg-[var(--kc-surface)] transition-colors cursor-pointer"
          >
            Close Navigator
          </button>

          {onOpenSubmitModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSubmitModal();
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Send size={13} />
              <span>Submit Test</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
