'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '../../../../lib/api';
import { SUPPORTED_LANGUAGES, DEFAULT_CODE_SNIPPETS } from '../../../../lib/constants';
import { generateStarterCode } from '../../../../lib/codeGenerator';

function getStarterCode(question, language) {
  if (question?.judge_mode === 'FUNCTION') {
    const gen = generateStarterCode(question.judge_mode, question.signature_metadata, language);
    if (gen) return gen;
  }
  return DEFAULT_CODE_SNIPPETS[language] || '# Write your solution here\n';
}
import {
  Clock,
  CheckCircle2,
  Bookmark,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Code2,
  Play,
  RotateCcw,
  Check,
  HelpCircle,
  Layers,
  Terminal,
  Copy,
  XCircle,
  FileCode,
  Sparkles,
  Cpu
} from 'lucide-react';

const CodeEditor = dynamic(
  () => import('../../../../components/editor/CodeEditor').then((mod) => mod.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 min-h-[380px] flex flex-col items-center justify-center w-full bg-[var(--kc-surface)] gap-3 border border-[var(--border-default)] rounded-xl">
        <div className="w-7 h-7 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-wider animate-pulse">Initializing code editor…</span>
      </div>
    ),
  }
);

export default function AssessmentTakingArena() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId;

  const [attempt, setAttempt] = useState(null);
  const [sections, setSections] = useState([]);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Remaining Seconds (server authoritative timer)
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local state for responses: { [itemKey]: { selected_options, text_response, code_submission_id, is_flagged_for_review } }
  const [responses, setResponses] = useState({});

  // Coding execution state for DSA questions
  const [codeDrafts, setCodeDrafts] = useState({});
  const [codeLanguages, setCodeLanguages] = useState({});
  const [runningCode, setRunningCode] = useState(false);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [runOutput, setRunOutput] = useState(null);
  const [submissionVerdict, setSubmissionVerdict] = useState(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState('testcases');
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(0);
  const [copiedInput, setCopiedInput] = useState(false);

  const saveTimeoutRef = useRef(null);

  // Load attempt data
  const loadAttempt = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAttemptData(attemptId);

      if (data.attempt.is_finalized || data.attempt.status === 'evaluated') {
        router.push(`/assessments/result/${attemptId}`);
        return;
      }

      setAttempt(data.attempt);
      setSections(data.sections || []);
      setTimeLeft(data.attempt.remaining_seconds || 0);

      // Reconstruct student responses state
      const initialResp = {};
      const initialCode = {};
      const initialLang = {};
      for (const sec of data.sections || []) {
        for (const q of sec.questions || []) {
          const key = q.id;
          if (q.saved_response) {
            initialResp[key] = {
              selected_options: q.saved_response.selected_options,
              text_response: q.saved_response.text_response,
              code_submission_id: q.saved_response.code_submission_id,
              is_flagged_for_review: q.saved_response.is_flagged_for_review || false,
            };
          } else {
            initialResp[key] = {
              selected_options: null,
              text_response: null,
              code_submission_id: null,
              is_flagged_for_review: false,
            };
          }
          if (q.is_coding) {
            initialLang[key] = 'python';
            initialCode[key] = q.saved_response?.text_response || DEFAULT_CODE_SNIPPETS['python'] || '# Write your solution here\n';
          }
        }
      }
      setResponses(initialResp);
      setCodeDrafts(initialCode);
      setCodeLanguages(initialLang);
    } catch (err) {
      setError(err.message || 'Failed to load assessment attempt');
    } finally {
      setLoading(false);
    }
  }, [attemptId, router]);

  useEffect(() => {
    if (attemptId) loadAttempt();
  }, [attemptId, loadAttempt]);

  // Handle final submission
  const executeFinalSubmit = useCallback(async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await api.submitAssessmentAttempt(attemptId);
      router.push(`/assessments/result/${attemptId}`);
    } catch (err) {
      alert('Error during submission: ' + err.message);
      setIsSubmitting(false);
    }
  }, [attemptId, isSubmitting, router]);

  // Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, executeFinalSubmit]);

  // Save response to backend
  const saveAnswer = async (itemKey, updatedFields) => {
    const curSec = sections[currentSectionIdx];
    const curQ = curSec?.questions?.[currentQuestionIdx];
    if (!curSec || !curQ) return;

    const newResp = {
      ...(responses[itemKey] || {}),
      ...updatedFields,
    };

    setResponses((prev) => ({
      ...prev,
      [itemKey]: newResp,
    }));

    try {
      setIsSaving(true);
      setSaveStatus('Saving…');
      await api.saveAssessmentResponse(attemptId, {
        section_id: curSec.id,
        question_id: curQ.question_id || null,
        problem_id: curQ.problem_id || null,
        selected_options: newResp.selected_options,
        text_response: newResp.text_response,
        code_submission_id: newResp.code_submission_id,
        is_flagged_for_review: newResp.is_flagged_for_review,
      });
      setSaveStatus('Saved');
    } catch (err) {
      setSaveStatus('Save error');
      console.error('Failed to save response', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentSection = sections[currentSectionIdx];
  const currentQuestion = currentSection?.questions?.[currentQuestionIdx];

  const handleSelectOption = (optId) => {
    const curQ = currentQuestion;
    if (!curQ) return;
    const currentSelected = responses[curQ.id]?.selected_options;
    const nextVal = currentSelected === optId ? null : optId;
    saveAnswer(curQ.id, { selected_options: nextVal });
  };

  const handleClearResponse = () => {
    const curQ = currentQuestion;
    if (!curQ) return;
    saveAnswer(curQ.id, { selected_options: null, text_response: null });
  };

  const handleToggleFlag = () => {
    const curQ = currentQuestion;
    if (!curQ) return;
    const currentFlag = Boolean(responses[curQ.id]?.is_flagged_for_review);
    saveAnswer(curQ.id, { is_flagged_for_review: !currentFlag });
  };

  // Coding handlers
  const handleCodeChange = (qId, newCode) => {
    setCodeDrafts((prev) => ({ ...prev, [qId]: newCode }));
    setSaveStatus('Unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveAnswer(qId, { text_response: newCode });
    }, 1200);
  };

  const handleLanguageChange = (qId, newLang) => {
    setCodeLanguages((prev) => ({ ...prev, [qId]: newLang }));
    const curDraft = codeDrafts[qId];
    const prevStarter = getStarterCode(currentQuestion, codeLanguages[qId] || 'python');
    const isStarter =
      !curDraft ||
      curDraft.trim() === prevStarter.trim() ||
      Object.values(DEFAULT_CODE_SNIPPETS).some((s) => s.trim() === curDraft.trim()) ||
      curDraft.trim() === '# Write your solution here';
    if (isStarter) {
      const nextSnippet = getStarterCode(currentQuestion, newLang);
      setCodeDrafts((prev) => ({ ...prev, [qId]: nextSnippet }));
      saveAnswer(qId, { text_response: nextSnippet });
    }
  };

  const handleResetCode = (qId) => {
    const lang = codeLanguages[qId] || 'python';
    const nextSnippet = getStarterCode(currentQuestion, lang);
    setCodeDrafts((prev) => ({ ...prev, [qId]: nextSnippet }));
    saveAnswer(qId, { text_response: nextSnippet });
  };

  const handleRunCode = async () => {
    const curQ = currentQuestion;
    if (!curQ?.problem_id) return;
    const lang = codeLanguages[curQ.id] || 'python';
    const code = codeDrafts[curQ.id] ?? (curQ.saved_response?.text_response || getStarterCode(curQ, lang));

    try {
      setRunningCode(true);
      setRunOutput(null);
      setSubmissionVerdict(null);
      setSelectedTestCaseIdx(0);

      // Save draft immediately
      await saveAnswer(curQ.id, { text_response: code });

      const res = await api.runCode({
        code,
        language: lang,
        problem_id: curQ.problem_id,
        stdin: '',
        judgeMode: curQ.judge_mode,
        signatureMetadata: curQ.signature_metadata,
      });

      setRunOutput(res);
      if (res.compileError || res.stderr || (res.error && (!res.testCaseResults || res.testCaseResults.length === 0))) {
        setActiveConsoleTab('console');
      } else {
        setActiveConsoleTab('testcases');
      }
    } catch (err) {
      setRunOutput({ error: err.message || 'Execution error' });
      setActiveConsoleTab('console');
    } finally {
      setRunningCode(false);
    }
  };

  const handleSubmitCode = async () => {
    const curQ = currentQuestion;
    if (!curQ?.problem_id) return;
    const lang = codeLanguages[curQ.id] || 'python';
    const code = codeDrafts[curQ.id] ?? (curQ.saved_response?.text_response || getStarterCode(curQ, lang));

    try {
      setSubmittingCode(true);
      setSubmissionVerdict(null);
      setActiveConsoleTab('verdict');

      // Save draft
      await saveAnswer(curQ.id, { text_response: code });

      const res = await api.submitCode({
        problem_id: curQ.problem_id,
        code,
        language: lang,
      });

      setSubmissionVerdict(res);
      const subId = res.submissionId || res.id;
      if (subId) {
        await saveAnswer(curQ.id, {
          code_submission_id: subId,
          text_response: code,
        });
      }
    } catch (err) {
      setSubmissionVerdict({ error: err.message || 'Submission failed' });
    } finally {
      setSubmittingCode(false);
    }
  };

  // Helper stats
  const totalQuestions = sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
  let answeredCount = 0;
  let flaggedCount = 0;

  for (const s of sections) {
    for (const q of s.questions || []) {
      const resp = responses[q.id];
      if (resp?.selected_options || resp?.text_response || resp?.code_submission_id) {
        answeredCount++;
      }
      if (resp?.is_flagged_for_review) {
        flaggedCount++;
      }
    }
  }

  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  // Format timer
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isLowTime = timeLeft < 300; // < 5 mins
  const isCriticalTime = timeLeft < 60; // < 1 min

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-[var(--text-muted)]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Initializing secure assessment environment...</p>
        </div>
      </div>
    );
  }

  if (error || !currentQuestion) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-6 flex items-center justify-center">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-8 max-w-md w-full text-center space-y-4">
          <AlertTriangle size={36} className="mx-auto text-rose-500" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Assessment Error</h2>
          <p className="text-xs text-[var(--text-muted)]">{error || 'No questions available'}</p>
        </div>
      </div>
    );
  }

  const curResp = responses[currentQuestion.id] || {};
  const isCurrentFlagged = Boolean(curResp.is_flagged_for_review);
  const selectedOpt = curResp.selected_options;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col select-none">
      {/* ── TOP ARENA HEADER BAR ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[var(--bg-secondary)]/95 backdrop-blur-md border-b border-[var(--border-default)] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Test Title & Auto-Save */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h1 className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">
              {attempt.assessment_title}
            </h1>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
              <span>Status:</span>
              <span className={isSaving ? 'text-amber-400 font-medium' : 'text-emerald-500 font-medium'}>
                {saveStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Countdown Timer */}
        <div className="flex items-center justify-center">
          <div
            className={`px-4 py-1.5 rounded-xl font-mono text-sm font-extrabold flex items-center gap-2 shadow-inner border transition-colors ${
              isCriticalTime
                ? 'bg-rose-500/20 text-rose-500 border-rose-500/50 animate-pulse'
                : isLowTime
                ? 'bg-amber-500/20 text-amber-500 border-amber-500/50'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-default)]'
            }`}
          >
            <Clock size={15} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Right: Status Counts & Finish Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
              {answeredCount} Answered
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
              {flaggedCount} Review
            </span>
          </div>

          <button
            onClick={() => setIsConfirmSubmitOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
          >
            <Send size={13} />
            <span>Submit Test</span>
          </button>
        </div>
      </header>

      {/* ── SECTION TABS BAR ───────────────────────────────────────────────── */}
      <div className="bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-default)] px-4 sm:px-6 flex items-center gap-2 overflow-x-auto">
        {sections.map((sec, idx) => {
          const isActive = idx === currentSectionIdx;
          return (
            <button
              key={sec.id}
              onClick={() => {
                setCurrentSectionIdx(idx);
                setCurrentQuestionIdx(0);
              }}
              className={`py-2 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-[var(--kc-accent)] text-[var(--kc-accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Section {idx + 1}: {sec.title}
            </button>
          );
        })}
      </div>

      {/* ── MAIN ARENA BODY (SPLIT VIEW) ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT / CENTER: QUESTION STATEMENT & INTERACTIVE RESPONSE AREA */}
        <main className={`flex-1 overflow-y-auto p-6 space-y-6 ${currentQuestion?.is_coding ? 'max-w-6xl w-full' : 'max-w-4xl'}`}>
          {/* Question Meta Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)]">
                Question {currentQuestionIdx + 1} of {currentSection.questions.length}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {currentQuestion.category} › {currentQuestion.topic}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-semibold">
              <span className="text-emerald-500">+{currentQuestion.marks}</span>
              {parseFloat(currentQuestion.negative_marks) > 0 && (
                <span className="text-rose-500">-{currentQuestion.negative_marks}</span>
              )}
            </div>
          </div>

          {/* Question Text */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-6 shadow-sm">
            <div className="text-base text-[var(--text-primary)] font-medium leading-relaxed whitespace-pre-wrap">
              {currentQuestion.question_text}
            </div>
          </div>

          {/* MCQ Options (If Objective Question) */}
          {!currentQuestion.is_coding && currentQuestion.options && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Select One Option:
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOpt === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--kc-accent)] bg-[var(--kc-accent-subtle)] shadow-sm'
                          : 'border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs uppercase transition-colors ${
                            isSelected
                              ? 'bg-[var(--kc-accent)] text-[var(--kc-on-primary)]'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span className={`text-sm ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                          {opt.text}
                        </span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-[var(--kc-accent)] bg-[var(--kc-accent)] text-[var(--kc-on-primary)]'
                            : 'border-[var(--border-default)]'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Coding Problem Arena (If DSA Question) */}
          {currentQuestion.is_coding && (
            <div className="space-y-6">
              {/* Problem Statement & Specifications */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-default)]">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[var(--text-primary)]">
                      {currentQuestion.title || 'Coding Problem Statement'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                      currentQuestion.difficulty === 'Easy'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : currentQuestion.difficulty === 'Hard'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {currentQuestion.difficulty || 'Medium'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-mono">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{currentQuestion.time_limit_ms || 2000}ms limit</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu size={12} />
                      <span>{currentQuestion.memory_limit_mb || 256}MB</span>
                    </div>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-sans">
                  {currentQuestion.question_text}
                </div>

                {/* Input / Output Formats */}
                {(currentQuestion.input_format || currentQuestion.output_format) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {currentQuestion.input_format && (
                      <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
                        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                          Input Format
                        </div>
                        <div className="text-xs text-[var(--text-primary)] whitespace-pre-wrap font-mono">
                          {currentQuestion.input_format}
                        </div>
                      </div>
                    )}
                    {currentQuestion.output_format && (
                      <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
                        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                          Output Format
                        </div>
                        <div className="text-xs text-[var(--text-primary)] whitespace-pre-wrap font-mono">
                          {currentQuestion.output_format}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Constraints */}
                {currentQuestion.constraints && (
                  <div className="pt-2">
                    <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                      Constraints
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] font-mono text-xs text-[var(--text-primary)] whitespace-pre-wrap">
                      {currentQuestion.constraints}
                    </div>
                  </div>
                )}

                {/* Sample Test Cases */}
                {currentQuestion.sample_test_cases && currentQuestion.sample_test_cases.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Sample Examples
                    </div>
                    <div className="space-y-2">
                      {currentQuestion.sample_test_cases.map((sample, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)] text-xs font-mono space-y-2"
                        >
                          <div className="text-[11px] font-bold text-[var(--kc-accent)]">
                            Example {sIdx + 1}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] uppercase text-[var(--text-muted)] block mb-0.5">Input:</span>
                              <pre className="p-2 rounded bg-[var(--bg-tertiary)] overflow-x-auto text-[var(--text-primary)]">{sample.input}</pre>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-[var(--text-muted)] block mb-0.5">Expected Output:</span>
                              <pre className="p-2 rounded bg-[var(--bg-tertiary)] overflow-x-auto text-[var(--text-primary)]">{sample.output}</pre>
                            </div>
                          </div>
                          {sample.explanation && (
                            <div className="text-[11px] text-[var(--text-muted)] pt-1 italic font-sans">
                              Explanation: {sample.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Monaco Code Editor Workspace */}
              <div className="border border-[var(--border-default)] rounded-xl overflow-hidden bg-[var(--bg-secondary)] shadow-sm flex flex-col">
                {/* Editor Header Toolbar */}
                <div className="px-4 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/70 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      <Code2 size={16} className="text-[var(--kc-accent)]" />
                      <span>Code Solution</span>
                    </div>

                    {/* Language Selector */}
                    <div className="relative">
                      <select
                        value={codeLanguages[currentQuestion.id] || 'python'}
                        onChange={(e) => handleLanguageChange(currentQuestion.id, e.target.value)}
                        className="py-1 px-3 text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)] font-mono font-medium focus:outline-none focus:border-[var(--kc-accent)] cursor-pointer"
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <option key={lang.id} value={lang.id}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reset Button */}
                    <button
                      type="button"
                      onClick={() => handleResetCode(currentQuestion.id)}
                      title="Reset to starter template"
                      className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-secondary)]"
                    >
                      <RotateCcw size={12} />
                      <span>Reset</span>
                    </button>
                  </div>

                  {/* Actions & Save Indicator */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1 mr-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'Saved' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                      {saveStatus}
                    </span>

                    <button
                      type="button"
                      onClick={handleRunCode}
                      disabled={runningCode || submittingCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--border-default)] text-[var(--text-primary)] transition-all shadow-sm disabled:opacity-50"
                    >
                      <Play size={12} className={runningCode ? 'animate-spin' : 'text-emerald-400 fill-emerald-400'} />
                      <span>{runningCode ? 'Running…' : 'Run Tests'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitCode}
                      disabled={runningCode || submittingCode}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] transition-all shadow-sm disabled:opacity-50"
                    >
                      <Send size={12} className={submittingCode ? 'animate-pulse' : ''} />
                      <span>{submittingCode ? 'Evaluating…' : 'Submit Code'}</span>
                    </button>
                  </div>
                </div>

                {/* Monaco Editor Container */}
                <div className="h-[420px] w-full relative min-h-0 bg-[var(--kc-surface)]">
                  <CodeEditor
                    problemId={currentQuestion.id || currentQuestion.problem_id}
                    path={`assessment_${currentQuestion.id}_${codeLanguages[currentQuestion.id] || 'python'}`}
                    value={codeDrafts[currentQuestion.id] ?? (currentQuestion.saved_response?.text_response || getStarterCode(currentQuestion, codeLanguages[currentQuestion.id] || 'python'))}
                    onChange={(val) => handleCodeChange(currentQuestion.id, val)}
                    language={codeLanguages[currentQuestion.id] || 'python'}
                    height="420px"
                  />
                </div>
              </div>

              {/* Execution Console & Test Cases Panel */}
              <div className="border border-[var(--border-default)] rounded-xl overflow-hidden bg-[var(--bg-secondary)] shadow-sm">
                {/* Console Navigation Tabs */}
                <div className="px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] flex items-center gap-4 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveConsoleTab('testcases')}
                    className={`flex items-center gap-1.5 py-1 px-2.5 rounded-md transition-colors ${
                      activeConsoleTab === 'testcases'
                        ? 'bg-[var(--bg-secondary)] text-[var(--kc-accent)] font-bold shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>Test Cases</span>
                    {runOutput?.testCaseResults && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        runOutput.allPassed ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'bg-rose-500/20 text-rose-400 font-bold'
                      }`}>
                        {runOutput.testCaseResults.filter(tc => (tc.passed ?? tc.status === 'Passed')).length}/{runOutput.testCaseResults.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveConsoleTab('console')}
                    className={`flex items-center gap-1.5 py-1 px-2.5 rounded-md transition-colors ${
                      activeConsoleTab === 'console'
                        ? 'bg-[var(--bg-secondary)] text-[var(--kc-accent)] font-bold shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Terminal size={13} />
                    <span>Console Output</span>
                  </button>

                  {submissionVerdict && (
                    <button
                      type="button"
                      onClick={() => setActiveConsoleTab('verdict')}
                      className={`flex items-center gap-1.5 py-1 px-2.5 rounded-md transition-colors ${
                        activeConsoleTab === 'verdict'
                          ? 'bg-[var(--bg-secondary)] text-purple-400 font-bold shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Sparkles size={13} />
                      <span>Verdict: {submissionVerdict.verdict || 'Result'}</span>
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                <div className="p-4">
                  {/* TAB 1: TEST CASES */}
                  {activeConsoleTab === 'testcases' && (
                    <div>
                      {runningCode ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] gap-2">
                          <div className="w-5 h-5 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
                          <span>Running test cases in sandbox container…</span>
                        </div>
                      ) : runOutput?.testCaseResults && runOutput.testCaseResults.length > 0 ? (
                        <div className="space-y-3">
                          {/* Case buttons */}
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {runOutput.testCaseResults.map((tc, idx) => {
                              const isPassed = tc.passed ?? tc.status === 'Passed';
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedTestCaseIdx(idx)}
                                  className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all flex items-center gap-1.5 ${
                                    selectedTestCaseIdx === idx
                                      ? 'border-[var(--kc-accent)] bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] font-bold'
                                      : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                                  }`}
                                >
                                  {isPassed ? (
                                    <Check size={12} className="text-emerald-400 stroke-[3]" />
                                  ) : (
                                    <XCircle size={12} className="text-rose-400" />
                                  )}
                                  <span>Case {idx + 1}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Case Inspection */}
                          {runOutput.testCaseResults[selectedTestCaseIdx] && (() => {
                            const curTc = runOutput.testCaseResults[selectedTestCaseIdx];
                            const isCurPassed = curTc.passed ?? curTc.status === 'Passed';
                            const actualOut = curTc.actualOutput || curTc.yourOutput || curTc.output || curTc.actual || '(none)';
                            const expectedOut = curTc.expectedOutput || curTc.expected || '(none)';
                            const inputVal = curTc.input || curTc.stdin || '(none)';

                            return (
                              <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] font-mono text-xs space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    isCurPassed
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  }`}>
                                    {isCurPassed ? 'PASSED' : 'FAILED'}
                                  </span>
                                  {curTc.executionTimeMs !== undefined && (
                                    <span className="text-[11px] text-[var(--text-muted)]">
                                      Time: {curTc.executionTimeMs} ms
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">
                                    Standard Input:
                                  </span>
                                  <pre className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] overflow-x-auto whitespace-pre-wrap">
                                    {inputVal}
                                  </pre>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">
                                      Expected Output:
                                    </span>
                                    <pre className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                                      {expectedOut}
                                    </pre>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">
                                      Actual Output:
                                    </span>
                                    <pre className={`p-2.5 rounded-lg bg-[var(--bg-tertiary)] overflow-x-auto whitespace-pre-wrap ${
                                      isCurPassed ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                      {actualOut}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                          <Play size={20} className="mx-auto mb-2 opacity-40 text-emerald-400" />
                          <p>Click &quot;Run Tests&quot; to test your code implementation against sample test cases.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CONSOLE OUTPUT */}
                  {activeConsoleTab === 'console' && (
                    <div className="font-mono text-xs">
                      {runOutput?.compileError ? (
                        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 whitespace-pre-wrap">
                          <div className="text-[10px] uppercase font-bold text-rose-400 mb-1">Compilation / Syntax Error:</div>
                          {runOutput.compileError}
                        </div>
                      ) : runOutput?.stderr ? (
                        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 whitespace-pre-wrap">
                          <div className="text-[10px] uppercase font-bold text-rose-400 mb-1">Runtime Stderr:</div>
                          {runOutput.stderr}
                        </div>
                      ) : runOutput?.stdout || runOutput?.output ? (
                        <div className="p-3.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)] whitespace-pre-wrap">
                          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Standard Output:</div>
                          {runOutput.stdout || runOutput.output}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                          <Terminal size={20} className="mx-auto mb-2 opacity-40" />
                          <p>Standard output stream is empty.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: SUBMISSION VERDICT */}
                  {activeConsoleTab === 'verdict' && (
                    <div>
                      {submittingCode ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] gap-2">
                          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          <span>Submitting code and polling judge worker for formal evaluation…</span>
                        </div>
                      ) : submissionVerdict ? (
                        <div className="space-y-4">
                          <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                            submissionVerdict.verdict === 'Accepted'
                              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
                              : 'bg-rose-950/30 border-rose-500/40 text-rose-400'
                          }`}>
                            <div className="flex items-center gap-2.5">
                              {submissionVerdict.verdict === 'Accepted' ? (
                                <CheckCircle2 size={22} className="text-emerald-400" />
                              ) : (
                                <XCircle size={22} className="text-rose-400" />
                              )}
                              <div>
                                <div className="text-base font-bold font-mono">
                                  {submissionVerdict.verdict || 'Evaluation Complete'}
                                </div>
                                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                  {submissionVerdict.verdict === 'Accepted'
                                    ? 'All test cases passed successfully! Score will be tallied upon exam submission.'
                                    : 'Some test cases did not pass. You can revise your code and submit again.'}
                                </div>
                              </div>
                            </div>

                            {submissionVerdict.runtime && (
                              <div className="text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-default)]">
                                <span>Runtime: {submissionVerdict.runtime}</span>
                              </div>
                            )}
                          </div>

                          <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-400" />
                              <span>Code solution securely recorded in assessment attempt draft</span>
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">Marked Answered</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Action Control Bar */}
          <div className="pt-6 border-t border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFlag}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  isCurrentFlagged
                    ? 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                    : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Bookmark size={14} className={isCurrentFlagged ? 'fill-amber-400' : ''} />
                <span>{isCurrentFlagged ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>

              {selectedOpt && (
                <button
                  onClick={handleClearResponse}
                  className="px-3 py-2 text-xs font-medium rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Clear Choice
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentQuestionIdx === 0 && currentSectionIdx === 0}
                onClick={() => {
                  if (currentQuestionIdx > 0) {
                    setCurrentQuestionIdx(currentQuestionIdx - 1);
                  } else if (currentSectionIdx > 0) {
                    const prevSec = sections[currentSectionIdx - 1];
                    setCurrentSectionIdx(currentSectionIdx - 1);
                    setCurrentQuestionIdx(prevSec.questions.length - 1);
                  }
                }}
                className="flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-40 text-[var(--text-primary)]"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <button
                onClick={() => {
                  if (currentQuestionIdx < currentSection.questions.length - 1) {
                    setCurrentQuestionIdx(currentQuestionIdx + 1);
                  } else if (currentSectionIdx < sections.length - 1) {
                    setCurrentSectionIdx(currentSectionIdx + 1);
                    setCurrentQuestionIdx(0);
                  } else {
                    setIsConfirmSubmitOpen(true);
                  }
                }}
                className="flex items-center gap-1 px-5 py-2 text-xs font-bold rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] shadow-sm"
              >
                <span>
                  {currentQuestionIdx === currentSection.questions.length - 1 && currentSectionIdx === sections.length - 1
                    ? 'Review & Submit'
                    : 'Save & Next'}
                </span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR: QUESTION PALETTE GRID */}
        <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Question Palette
              </h2>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {currentSection.title} ({currentSection.questions.length} Questions)
              </p>
            </div>

            {/* Grid of question buttons */}
            <div className="grid grid-cols-5 gap-2">
              {currentSection.questions.map((q, idx) => {
                const resp = responses[q.id];
                const isAnswered = Boolean(resp?.selected_options || resp?.text_response || resp?.code_submission_id);
                const isFlagged = Boolean(resp?.is_flagged_for_review);
                const isCurrent = idx === currentQuestionIdx;

                let btnClass = 'bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-secondary)]';
                if (isAnswered && isFlagged) {
                  btnClass = 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold';
                } else if (isAnswered) {
                  btnClass = 'bg-emerald-500 text-white font-bold border-emerald-500';
                } else if (isFlagged) {
                  btnClass = 'bg-amber-500 text-zinc-950 font-bold border-amber-500';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`h-9 rounded-lg border text-xs font-mono transition-all flex items-center justify-center ${btnClass} ${
                      isCurrent ? 'ring-2 ring-[var(--kc-accent)] ring-offset-2 ring-offset-[var(--bg-secondary)]' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-4 border-t border-[var(--border-default)]/60 text-[11px] text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 shrink-0"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-500 shrink-0"></span>
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[var(--bg-primary)] border border-[var(--border-default)] shrink-0"></span>
                <span>Unanswered</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--border-default)]/60">
            <button
              onClick={() => setIsConfirmSubmitOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors text-center"
            >
              Finish & Submit Test
            </button>
          </div>
        </aside>
      </div>

      {/* ── SUBMIT CONFIRMATION MODAL ────────────────────────────────────── */}
      {isConfirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <AlertTriangle size={36} className="mx-auto text-amber-500" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Submit Assessment?</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Please review your progress before finalizing. Once submitted, answers cannot be edited.
              </p>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-3 gap-2 py-3 px-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] text-center">
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Answered</div>
                <div className="text-base font-bold text-emerald-500">{answeredCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Review</div>
                <div className="text-base font-bold text-amber-500">{flaggedCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Unanswered</div>
                <div className="text-base font-bold text-[var(--text-muted)]">{unansweredCount}</div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="text-xs text-amber-400/90 text-center">
                ⚠️ You have <strong>{unansweredCount} unanswered questions</strong>.
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              >
                Return to Test
              </button>
              <button
                type="button"
                onClick={executeFinalSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'Evaluating…' : 'Yes, Final Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
