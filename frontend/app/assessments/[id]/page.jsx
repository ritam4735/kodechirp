'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import {
  ArrowLeft,
  Clock,
  Layers,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Play,
  ShieldCheck,
  FileText,
  RotateCcw,
  ShieldAlert,
  Maximize2,
  Lock,
  EyeOff,
  CopyX
} from 'lucide-react';
import { enterFullscreen, isFullscreenSupported } from '../../../lib/securityAssessment';

export default function AssessmentInstructionsPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params?.id;
  const { user, isAuthenticated } = useAuth();

  const [assessment, setAssessment] = useState(null);
  const [existingAttempt, setExistingAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getAssessmentOverview(assessmentId);
        setAssessment(data.assessment);
        if (data.existingAttempt) {
          setExistingAttempt(data.existingAttempt);
        }
      } catch (err) {
        setError(err.message || 'Failed to load assessment overview');
      } finally {
        setLoading(false);
      }
    }
    if (assessmentId) loadData();
  }, [assessmentId]);

  const handleStartAttempt = async () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    try {
      setStarting(true);
      setError(null);

      // Pre-Exam Fullscreen Enforcement for Secure Mode
      if (assessment?.is_secure_mode) {
        if (!isFullscreenSupported()) {
          setError(
            'Full-Screen API is not supported on this browser or device. Secure Assessment Mode requires full-screen enforcement and cannot proceed without it.'
          );
          setStarting(false);
          return;
        }

        try {
          await enterFullscreen();
        } catch (fsErr) {
          setError(
            'Full-Screen Required: ' +
            (fsErr.message || 'You must grant full-screen access to begin this secure assessment.')
          );
          setStarting(false);
          return;
        }
      }

      // Start attempt on backend (Authoritative timer starts now)
      const res = await api.startAssessmentAttempt(assessment.id);
      router.push(`/assessments/take/${res.attemptId}`);
    } catch (err) {
      setError(err.message || 'Could not start assessment');
      setStarting(false);
    }
  };

  const handleResumeAttempt = async (attemptId) => {
    if (assessment?.is_secure_mode) {
      if (!isFullscreenSupported()) {
        setError(
          'Full-Screen API is not supported on this browser. Cannot resume secure assessment without full-screen.'
        );
        return;
      }
      try {
        await enterFullscreen();
      } catch (fsErr) {
        setError(
          'Full-Screen Required: ' +
          (fsErr.message || 'Please grant full-screen access to resume your secure assessment.')
        );
        return;
      }
    }
    router.push(`/assessments/take/${attemptId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-[var(--text-muted)]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Loading assessment instructions...</p>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-6 flex items-center justify-center">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-8 max-w-md w-full text-center space-y-4">
          <AlertTriangle size={36} className="mx-auto text-rose-500" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Assessment Unavailable</h2>
          <p className="text-xs text-[var(--text-muted)]">{error || 'Assessment not found'}</p>
          <Link
            href="/assessments"
            className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border-default)]"
          >
            Back to Assessments
          </Link>
        </div>
      </div>
    );
  }

  const sections = assessment.sections || [];
  const isInProgress = existingAttempt?.status === 'in_progress';
  const isCompleted = existingAttempt?.is_finalized;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>All Assessments</span>
        </Link>

        {/* Assessment Card */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-8 shadow-sm space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[var(--kc-accent)]/20">
                {assessment.category}
              </span>
              {assessment.is_secure_mode && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-sm">
                  <ShieldAlert size={13} className="text-rose-500" />
                  <span>Strict Secure Mode Active</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight mt-2">
              {assessment.title}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
              {assessment.description || 'Comprehensive assessment designed to evaluate problem solving, aptitude, and technical prowess.'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] text-center">
            <div>
              <div className="text-xs text-[var(--text-muted)]">Duration</div>
              <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1">
                <Clock size={14} className="text-[var(--kc-accent)]" />
                <span>{assessment.duration_minutes} Mins</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">Total Sections</div>
              <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1">
                <Layers size={14} className="text-emerald-500" />
                <span>{sections.length}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">Max Marks</div>
              <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1">
                <Award size={14} className="text-purple-500" />
                <span>{assessment.total_marks}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">Pass Score</div>
              <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1">
                <ShieldCheck size={14} className="text-amber-500" />
                <span>{assessment.pass_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Section Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Section Breakdown
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-default)] text-[var(--text-secondary)]">
                    <th className="py-2.5 px-4">Section Name</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4 text-center">Questions</th>
                    <th className="py-2.5 px-4 text-center">Marks / Question</th>
                    <th className="py-2.5 px-4 text-center">Negative Marks</th>
                    <th className="py-2.5 px-4 text-right">Section Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {sections.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-[var(--bg-tertiary)]/20">
                      <td className="py-2.5 px-4 font-medium text-[var(--text-primary)]">
                        {idx + 1}. {s.title}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="capitalize text-[var(--text-secondary)]">{s.section_type}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono">{s.total_questions}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-semibold text-emerald-700 dark:text-emerald-400">+{s.marks_per_question}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-semibold text-rose-700 dark:text-rose-400">-{s.negative_marks_per_question}</td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono text-[var(--text-primary)]">
                        {s.total_marks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pre-Exam Security Screen Briefing (Strict Secure Mode) */}
          {assessment.is_secure_mode && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-950/20 via-[var(--bg-primary)] to-amber-950/15 border-2 border-rose-500/35 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0 mt-0.5">
                  <ShieldAlert size={22} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>Pre-Exam Security Protocol & Requirements</span>
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded bg-rose-500 text-white shadow-xs">
                      Strict Mode
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    This assessment is strictly proctored with browser security controls. Please read the terms below carefully before initiating full-screen mode.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-start gap-3">
                  <Maximize2 size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">
                      {assessment.security_policy?.max_violations > 1
                        ? `Violation Policy: ${assessment.security_policy.max_violations} Strikes Allowed`
                        : 'Full-Screen Strict Enforcement'}
                    </div>
                    <p className="text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      {assessment.security_policy?.max_violations > 1
                        ? `The assessment requires full-screen. You are granted up to ${assessment.security_policy.max_violations - 1} warning(s); reaching ${assessment.security_policy.max_violations} violations automatically finalizes and submits your attempt.`
                        : 'The assessment runs exclusively in full-screen. Exiting full-screen or switching tabs will immediately finalize and submit your assessment.'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-start gap-3">
                  <EyeOff size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Tab Switching Monitored</div>
                    <p className="text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      Switching to another browser tab, minimizing the window, or navigating away records a violation against your attempt limit.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-start gap-3">
                  <CopyX size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Clipboard & Interaction Restrictions</div>
                    <p className="text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      Copy, cut, paste, dragging text, and context menus are restricted. Normal code editor shortcuts remain supported.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-start gap-3">
                  <Clock size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Authoritative Server Timer</div>
                    <p className="text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      The timer starts ONLY after you successfully enter full-screen and backend confirms attempt activation. Saved responses are never lost.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions Block */}
          <div className="space-y-3 p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText size={16} className="text-[var(--kc-accent)]" />
              <span>Assessment Rules & Instructions</span>
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed list-disc list-inside">
              <li>The assessment timer starts the moment you click <strong>Start Assessment</strong>.</li>
              <li>Timer is enforced by the server; all answers are auto-saved as you select or type them.</li>
              <li>You can navigate back and forth between questions and flag questions to review later.</li>
              <li>Negative marking is applied for incorrect answers according to section configurations.</li>
              <li>Do not close or switch browser tabs unnecessarily. If disconnected, resume promptly.</li>
              <li>When time expires, the assessment is automatically finalized and submitted.</li>
            </ul>
          </div>

          {/* CTA Bar */}
          <div className="pt-4 border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[var(--text-muted)]">
              {isAuthenticated ? (
                <span>Logged in as <strong>{user?.username}</strong> ({user?.email})</span>
              ) : (
                <span className="text-amber-500">You must sign in to save your attempt and score.</span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isInProgress ? (
                <button
                  onClick={() => handleResumeAttempt(existingAttempt.id)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-sm shadow-md transition-all"
                >
                  {assessment.is_secure_mode ? (
                    <>
                      <Maximize2 size={16} />
                      <span>Enter Fullscreen & Resume Assessment</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      <span>Resume In-Progress Attempt</span>
                    </>
                  )}
                </button>
              ) : isCompleted ? (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Link
                    href={`/assessments/result/${existingAttempt.id}`}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold text-xs"
                  >
                    <span>View Previous Result</span>
                  </Link>
                  {existingAttempt.attempt_number < assessment.max_attempts && (
                    <button
                      onClick={handleStartAttempt}
                      disabled={starting}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] font-bold text-xs shadow-md transition-all disabled:opacity-50"
                    >
                      <span>Retake ({existingAttempt.attempt_number + 1}/{assessment.max_attempts})</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleStartAttempt}
                  disabled={starting}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 ${
                    assessment.is_secure_mode
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-950/20'
                      : 'bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)]'
                  }`}
                >
                  {assessment.is_secure_mode ? (
                    <>
                      <Maximize2 size={16} />
                      <span>
                        {starting ? 'Entering Full-Screen…' : 'Start Secure Assessment (Full-Screen)'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      <span>{starting ? 'Starting Attempt…' : 'Start Assessment Now'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
