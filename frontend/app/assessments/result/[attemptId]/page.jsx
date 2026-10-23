'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowLeft,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function AssessmentResultPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId;

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('all');

  useEffect(() => {
    async function fetchResult() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getAttemptResult(attemptId);
        setResult(data.result);
      } catch (err) {
        setError(err.message || 'Failed to retrieve assessment results');
      } finally {
        setLoading(false);
      }
    }
    if (attemptId) fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-[var(--text-muted)]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Compiling your assessment report and section analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-6 flex items-center justify-center">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-8 max-w-md w-full text-center space-y-4">
          <AlertTriangle size={36} className="mx-auto text-rose-500" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Result Unavailable</h2>
          <p className="text-xs text-[var(--text-muted)]">{error || 'Could not locate score for this attempt'}</p>
          <Link
            href="/assessments"
            className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
          >
            Back to Assessments
          </Link>
        </div>
      </div>
    );
  }

  if (result.results_withheld) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-6 flex items-center justify-center">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-8 max-w-lg w-full text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <Clock size={28} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{result.assessment_title}</h2>
          <div className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            Submission Received — Results Pending Release
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {result.message || 'Results for this assessment have not been released yet by your instructor or college administrator. Please check back later.'}
          </p>
          <div className="pt-2">
            <Link
              href="/assessments"
              className="inline-block px-5 py-2.5 text-xs font-semibold rounded-xl bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)] transition-colors"
            >
              Back to Assessments Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPassed = result.is_passed;
  const timeMins = Math.floor((result.time_taken_seconds || 0) / 60);
  const timeSecs = (result.time_taken_seconds || 0) % 60;
  const sectionScores = Array.isArray(result.section_scores) ? result.section_scores : [];
  const questionsReview = result.questions_review || [];

  const filteredQuestions = selectedSectionFilter !== 'all'
    ? questionsReview.filter((q) => q.section_id === selectedSectionFilter)
    : questionsReview;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation link */}
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Assessments Portal</span>
        </Link>

        {/* ── SCORE BANNER ─────────────────────────────────────────────────── */}
        <div
          className={`rounded-2xl border p-8 shadow-sm transition-all ${
            isPassed
              ? 'bg-[var(--bg-secondary)] border-emerald-500/40'
              : 'bg-[var(--bg-secondary)] border-rose-500/40'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                  {result.assessment_category}
                </span>
                <span
                  className={`px-3 py-0.5 text-xs font-bold rounded-full border ${
                    isPassed
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  }`}
                >
                  {isPassed ? 'PASSED' : 'NOT QUALIFIED'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
                {result.assessment_title}
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Completed on {new Date(result.submitted_at || Date.now()).toLocaleString()} • Time taken:{' '}
                {timeMins}m {timeSecs}s
              </p>
            </div>

            {/* Score Ring / Block */}
            <div className="flex items-center gap-6 bg-[var(--bg-primary)]/80 p-5 rounded-2xl border border-[var(--border-default)] text-center shrink-0">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Final Score
                </div>
                <div className="text-3xl font-black font-mono text-[var(--text-primary)] mt-0.5">
                  {result.total_score}
                  <span className="text-sm font-normal text-[var(--text-muted)]"> / {result.max_marks}</span>
                </div>
              </div>
              <div className="w-px h-10 bg-[var(--border-default)]"></div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Percentage
                </div>
                <div
                  className={`text-3xl font-black font-mono mt-0.5 ${
                    isPassed ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {result.percentage}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KEY PERFORMANCE STATS ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4 text-center">
            <div className="text-xs text-[var(--text-muted)]">Total Questions</div>
            <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1">
              {result.total_questions}
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4 text-center">
            <div className="text-xs text-[var(--text-muted)]">Correct Answers</div>
            <div className="text-xl font-bold font-mono text-emerald-500 mt-1 flex items-center justify-center gap-1">
              <CheckCircle2 size={18} />
              <span>{result.correct_count}</span>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4 text-center">
            <div className="text-xs text-[var(--text-muted)]">Incorrect Answers</div>
            <div className="text-xl font-bold font-mono text-rose-500 mt-1 flex items-center justify-center gap-1">
              <XCircle size={18} />
              <span>{result.incorrect_count}</span>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4 text-center">
            <div className="text-xs text-[var(--text-muted)]">Unanswered</div>
            <div className="text-xl font-bold font-mono text-[var(--text-muted)] mt-1">
              {result.unanswered_count}
            </div>
          </div>
        </div>

        {/* ── SECTION PERFORMANCE BREAKDOWN ─────────────────────────────────── */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Section-wise Performance Breakdown
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Detailed view of marks and questions by category and topic section.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/40 text-[var(--text-secondary)] font-medium">
                  <th className="py-3 px-4">Section Name</th>
                  <th className="py-3 px-4 text-center">Correct</th>
                  <th className="py-3 px-4 text-center">Incorrect</th>
                  <th className="py-3 px-4 text-center">Unanswered</th>
                  <th className="py-3 px-4 text-center">Score / Max</th>
                  <th className="py-3 px-4 w-44">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {sectionScores.map((sec) => {
                  const pct = sec.max_marks > 0 ? Math.round((sec.score / sec.max_marks) * 100) : 0;
                  return (
                    <tr key={sec.section_id} className="hover:bg-[var(--bg-tertiary)]/20">
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                        {sec.title}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-500 font-bold">
                        {sec.correct_count}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-rose-500">
                        {sec.incorrect_count}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[var(--text-muted)]">
                        {sec.unanswered_count}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[var(--text-primary)]">
                        {sec.score} / {sec.max_marks}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden border border-[var(--border-default)]">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-[10px] text-[var(--text-muted)] w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── DETAILED PER-QUESTION REVIEW (WHEN PERMITTED) ─────────────────── */}
        {result.can_view_answers && questionsReview.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Question Review & Solutions
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Inspect your submitted response, the authoritative answer key, and solution explanations.
                </p>
              </div>

              {/* Section Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedSectionFilter}
                  onChange={(e) => setSelectedSectionFilter(e.target.value)}
                  className="py-1.5 px-3 text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                >
                  <option value="all">All Sections ({questionsReview.length})</option>
                  {sectionScores.map((s) => (
                    <option key={s.section_id} value={s.section_id}>{s.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => {
                const isCorrect = q.is_correct === true;
                const isUnanswered = !q.selected_options && !q.text_response && !q.code_submission_id;
                const opts = Array.isArray(q.options) ? q.options : [];

                return (
                  <div
                    key={idx}
                    className={`bg-[var(--bg-secondary)] border rounded-2xl p-6 shadow-sm space-y-4 ${
                      isCorrect
                        ? 'border-emerald-500/30'
                        : isUnanswered
                        ? 'border-[var(--border-default)]'
                        : 'border-rose-500/30'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCorrect
                              ? 'bg-emerald-500 text-white'
                              : isUnanswered
                              ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                              : 'bg-rose-500 text-white'
                          }`}
                        >
                          {isCorrect ? '✓' : isUnanswered ? '—' : '✕'}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            Question {idx + 1}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-2">
                            {q.section_title} • {q.topic || 'DSA'}
                          </span>
                        </div>
                      </div>

                      <div className="font-mono text-xs font-semibold">
                        <span className={isCorrect ? 'text-emerald-500' : q.score_awarded < 0 ? 'text-rose-500' : 'text-[var(--text-muted)]'}>
                          {q.score_awarded > 0 ? `+${q.score_awarded}` : q.score_awarded} Marks
                        </span>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="text-sm font-medium text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {q.question_text || q.problem_title}
                    </div>

                    {/* Options Grid */}
                    {opts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                        {opts.map((opt, oIdx) => {
                          const isObj = typeof opt === 'object' && opt !== null;
                          const optId = String(isObj ? (opt.id || opt.option || String.fromCharCode(97 + oIdx)) : String.fromCharCode(97 + oIdx)).toLowerCase();
                          const optText = String(isObj ? (opt.text ?? opt.value ?? opt.label ?? '') : String(opt));

                          const studentChoices = Array.isArray(q.selected_options)
                            ? q.selected_options.map((s) => String(s).toLowerCase())
                            : [String(q.selected_options || '').toLowerCase()];
                          const rightKeys = Array.isArray(q.correct_answer)
                            ? q.correct_answer.map((s) => String(s).toLowerCase())
                            : [String(q.correct_answer || '').toLowerCase()];

                          const isStudentChoice = studentChoices.includes(optId);
                          const isRightKey = rightKeys.includes(optId);

                          let optBorder = 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)]';
                          if (isRightKey) {
                            optBorder = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold';
                          } else if (isStudentChoice && !isRightKey) {
                            optBorder = 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold';
                          }

                          return (
                            <div
                              key={optId || oIdx}
                              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${optBorder}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-bold uppercase w-5 text-center">
                                  {optId}
                                </span>
                                <span>{optText}</span>
                              </div>
                              {isRightKey && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                  Correct Key
                                </span>
                              )}
                              {isStudentChoice && !isRightKey && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300">
                                  Your Choice
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] text-xs space-y-1">
                        <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Sparkles size={13} className="text-amber-600 dark:text-amber-400" />
                          <span>Detailed Solution / Explanation:</span>
                        </div>
                        <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Back Link bottom */}
        <div className="text-center pt-4">
          <Link
            href="/assessments"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] font-semibold text-xs transition-colors"
          >
            <span>Back to Assessments Portal</span>
            <ArrowLeft size={14} className="rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
