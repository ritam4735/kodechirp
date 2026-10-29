'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { SUPPORTED_LANGUAGES, DEFAULT_CODE_SNIPPETS } from '../../../../lib/constants';
import { generateStarterCode } from '../../../../lib/codeGenerator';
import { CodingWorkspace, ResizeHandle } from '../../../../components/problem/CodingWorkspace';
import { ProblemDescription } from '../../../../components/problem/ProblemDescription';
import { AssessmentQuestionDrawer } from '../../../../components/problem/AssessmentQuestionDrawer';
import { useProblemStore } from '../../../../store/problemStore';
import { useEditorStore } from '../../../../store/editorStore';
import { Panel, Group as PanelGroup } from 'react-resizable-panels';
import {
  isFullscreenActive,
  enterFullscreen,
  FULLSCREEN_CHANGE_EVENTS,
  getViolationMeta,
} from '../../../../lib/securityAssessment';
import {
  Clock,
  CheckCircle2,
  Bookmark,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Code2,
  Check,
  Layers,
  Cpu,
  Menu,
  FileCheck,
  Terminal,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Maximize,
  ArrowRight,
} from 'lucide-react';

function getStarterCode(question, language) {
  if (question?.judge_mode === 'FUNCTION') {
    const gen = generateStarterCode(question.judge_mode, question.signature_metadata, language);
    if (gen) return gen;
  }
  return DEFAULT_CODE_SNIPPETS[language] || '# Write your solution here\n';
}

function parseSelectedOptions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).toLowerCase());
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((x) => String(x).toLowerCase());
      } catch {}
    }
    return [trimmed.toLowerCase()];
  }
  return [];
}

const STORAGE_KEY_HORIZONTAL_SPLIT = 'kc_assessment_split_h_v1';
const DEFAULT_HORIZONTAL_SPLIT = { 'assessment-problem-pane': 42, 'assessment-workspace-pane': 58 };

function validateHorizontalSplit(layout) {
  if (!layout || typeof layout !== 'object') return false;
  const p = Number(layout['assessment-problem-pane']);
  const w = Number(layout['assessment-workspace-pane']);
  if (!Number.isFinite(p) || !Number.isFinite(w)) return false;
  if (p < 25 || p > 65) return false;
  if (w < 35 || w > 75) return false;
  const sum = p + w;
  if (sum < 90 || sum > 110) return false;
  return true;
}

function loadStoredSplit(key, fallback, validator) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validator(parsed)) return parsed;
    }
  } catch (e) {}
  return fallback;
}

function DifficultyBadge({ difficulty }) {
  if (difficulty === 'Easy') return <span className="kc-diff-badge kc-diff-easy">Easy</span>;
  if (difficulty === 'Hard') return <span className="kc-diff-badge kc-diff-hard">Hard</span>;
  return <span className="kc-diff-badge kc-diff-medium">Medium</span>;
}

export default function AssessmentTakingArena() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId;

  const [attempt, setAttempt] = useState(null);
  const [sections, setSections] = useState([]);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Authoritative countdown timer (seconds)
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Secure Assessment Mode state
  const isSecureMode = Boolean(attempt?.is_secure_mode);
  const [violationModal, setViolationModal] = useState({
    open: false,
    violationType: null,
    violationDetails: '',
    isFinalizing: false,
    error: null,
  });
  const [toast, setToast] = useState(null);
  const [needsFullscreenPrompt, setNeedsFullscreenPrompt] = useState(false);

  const isSubmittingRef = useRef(false);
  const hasTriggeredViolationRef = useRef(false);
  const pendingSaveRef = useRef(null);
  const isTransitioningFullscreenRef = useRef(false);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  }, []);

  // Mobile layout switcher for coding questions ('problem' | 'code')
  const [mobileViewTab, setMobileViewTab] = useState('problem');
  const [isMobile, setIsMobile] = useState(false);

  // Local student responses: { [itemKey]: { selected_options, text_response, code_submission_id, is_flagged_for_review } }
  const [responses, setResponses] = useState({});

  // Coding draft code & languages per question: { [qId]: code / lang }
  const [codeDrafts, setCodeDrafts] = useState({});
  const [codeLanguages, setCodeLanguages] = useState({});

  // Resizable split layout
  const [splitLayout, setSplitLayout] = useState(() =>
    loadStoredSplit(STORAGE_KEY_HORIZONTAL_SPLIT, DEFAULT_HORIZONTAL_SPLIT, validateHorizontalSplit)
  );

  const saveTimeoutRef = useRef(null);

  const handleSplitLayoutChange = useCallback((layout) => {
    if (validateHorizontalSplit(layout)) {
      setSplitLayout(layout);
      try {
        localStorage.setItem(STORAGE_KEY_HORIZONTAL_SPLIT, JSON.stringify(layout));
      } catch (e) {}
    }
  }, []);

  // Screen resize listener for mobile breakpoint
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load attempt data
  const loadAttempt = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAttemptData(attemptId);

      if (data.attempt.is_finalized || data.attempt.status === 'evaluated' || data.attempt.is_terminated_by_violation) {
        router.push(`/assessments/result/${attemptId}`);
        return;
      }

      setAttempt(data.attempt);
      setSections(data.sections || []);
      setTimeLeft(data.attempt.remaining_seconds || 0);

      if (data.attempt.is_secure_mode && !isFullscreenActive()) {
        setNeedsFullscreenPrompt(true);
      }

      // Reconstruct student responses state & code drafts
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
            const starter = getStarterCode(q, 'python');
            initialCode[key] = q.saved_response?.text_response || starter;
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

  // Execute Final Submit (Standard / Manual)
  const executeFinalSubmit = useCallback(async (reasonArg = 'manual') => {
    const finalReason = (typeof reasonArg === 'string' && reasonArg.trim()) ? reasonArg.trim() : 'manual';
    if (isSubmitting || isSubmittingRef.current || hasTriggeredViolationRef.current) return;
    try {
      setIsSubmitting(true);
      isSubmittingRef.current = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      // Flush pending save if any
      if (pendingSaveRef.current?.itemKey && pendingSaveRef.current?.fields) {
        try {
          const { fields } = pendingSaveRef.current;
          const curSec = sections[currentSectionIdx];
          const curQ = curSec?.questions?.[currentQuestionIdx];
          if (curSec && curQ) {
            await api.saveAssessmentResponse(attemptId, {
              section_id: curSec.id,
              question_id: curQ.question_id || null,
              problem_id: curQ.problem_id || null,
              ...fields,
            });
          }
        } catch (_) {}
      }

      await api.submitAssessmentAttempt(attemptId, {
        submission_reason: finalReason,
      });
      router.push(`/assessments/result/${attemptId}`);
    } catch (err) {
      alert('Error during submission: ' + err.message);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [attemptId, isSubmitting, router, sections, currentSectionIdx, currentQuestionIdx]);

  // Trigger Immediate Automatic Violation Submission (Strict Mode)
  const triggerViolationSubmission = useCallback(async (violationType, violationDetails) => {
    if (hasTriggeredViolationRef.current || isSubmittingRef.current) return;
    hasTriggeredViolationRef.current = true;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setViolationModal({
      open: true,
      violationType,
      violationDetails: violationDetails || 'Security rule triggered automatic submission',
      isFinalizing: true,
      error: null,
    });

    // Flush any pending unsaved draft before finalizing
    if (pendingSaveRef.current?.itemKey && pendingSaveRef.current?.fields) {
      try {
        const { fields } = pendingSaveRef.current;
        const curSec = sections[currentSectionIdx];
        const curQ = curSec?.questions?.[currentQuestionIdx];
        if (curSec && curQ) {
          await api.saveAssessmentResponse(attemptId, {
            section_id: curSec.id,
            question_id: curQ.question_id || null,
            problem_id: curQ.problem_id || null,
            ...fields,
          });
        }
      } catch (flushErr) {
        console.warn('[Security] Autosave flush failed before violation submission:', flushErr);
      }
    }

    try {
      await api.submitAssessmentAttempt(attemptId, {
        submission_reason: violationType,
        violation_type: violationType,
        violation_details: {
          reason: violationType,
          details: violationDetails,
          client_timestamp: new Date().toISOString(),
        },
      });
      setViolationModal((prev) => ({ ...prev, isFinalizing: false }));
    } catch (err) {
      console.error('[Security] Finalize violation error:', err);
      setViolationModal((prev) => ({
        ...prev,
        isFinalizing: false,
        error: err.message || 'Assessment successfully recorded and finalized on server',
      }));
    }
  }, [attemptId, sections, currentSectionIdx, currentQuestionIdx]);

  // Re-enter Fullscreen Handler
  const handleReEnterFullscreen = async () => {
    try {
      isTransitioningFullscreenRef.current = true;
      await enterFullscreen();
      setNeedsFullscreenPrompt(false);
    } catch (err) {
      showToast('error', 'Failed to enter full-screen mode: ' + (err.message || 'Permission denied'));
    } finally {
      setTimeout(() => {
        isTransitioningFullscreenRef.current = false;
      }, 500);
    }
  };

  // Authoritative countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeFinalSubmit('timer_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, executeFinalSubmit]);

  // Secure Mode Proactive Event Listeners
  useEffect(() => {
    if (!isSecureMode || !attempt || attempt.is_finalized || violationModal.open) return;

    // 1. Initial fullscreen check
    if (!isFullscreenActive()) {
      setNeedsFullscreenPrompt(true);
    }

    // 2. Fullscreen change listener
    const handleFullscreenChange = () => {
      if (isTransitioningFullscreenRef.current) return;
      const active = isFullscreenActive();
      if (!active) {
        if (!isSubmittingRef.current && !hasTriggeredViolationRef.current) {
          triggerViolationSubmission('fullscreen_exited', 'Browser exited full-screen mode during active assessment.');
        }
      } else {
        setNeedsFullscreenPrompt(false);
      }
    };

    for (const evt of FULLSCREEN_CHANGE_EVENTS) {
      document.addEventListener(evt, handleFullscreenChange);
    }

    // 3. Tab switch / document visibility listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!isSubmittingRef.current && !hasTriggeredViolationRef.current) {
          triggerViolationSubmission('tab_hidden', 'Document visibility changed to hidden (switched tabs or minimized browser).');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Popstate / back button trap
    window.history.pushState(null, '', window.location.href);
    const handlePopState = (e) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      if (!isSubmittingRef.current && !hasTriggeredViolationRef.current) {
        triggerViolationSubmission('navigation_attempt', 'Attempted browser back/forward navigation away from assessment.');
      }
    };
    window.addEventListener('popstate', handlePopState);

    // 5. Beforeunload confirmation & beacon
    const handleBeforeUnload = (e) => {
      if (!isSubmittingRef.current && !hasTriggeredViolationRef.current) {
        try {
          navigator.sendBeacon?.(
            `/api/assessments/attempts/${attemptId}/violation`,
            JSON.stringify({
              violation_type: 'navigation_attempt',
              details: { event: 'beforeunload', timestamp: new Date().toISOString() },
            })
          );
        } catch (_) {}
        e.preventDefault();
        e.returnValue = 'Assessment is in progress. Leaving will submit your test.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 6. Scoped Clipboard & Context Menu listeners
    const isMonacoEditorEvent = (target) => {
      return Boolean(
        target?.closest?.('.monaco-editor') ||
        target?.closest?.('.monaco-inputbox') ||
        target?.closest?.('.monaco-list')
      );
    };

    const handleCopyCutPaste = (e) => {
      if (isMonacoEditorEvent(e.target)) {
        return; // Allow Monaco to handle normal editor code edits & shortcuts
      }
      e.preventDefault();
      showToast('warning', `Action '${e.type.toUpperCase()}' is restricted in Secure Assessment Mode.`);
      api.recordAssessmentViolation(attemptId, {
        violation_type: 'clipboard_action',
        details: { action: e.type, tag: e.target?.tagName || 'element' },
      }).catch(() => {});
    };

    const handleContextMenu = (e) => {
      if (isMonacoEditorEvent(e.target)) {
        return;
      }
      e.preventDefault();
      showToast('warning', 'Context menu is disabled in Secure Assessment Mode.');
    };

    const handleDragStart = (e) => {
      if (isMonacoEditorEvent(e.target)) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      for (const evt of FULLSCREEN_CHANGE_EVENTS) {
        document.removeEventListener(evt, handleFullscreenChange);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [isSecureMode, attempt, attemptId, triggerViolationSubmission, showToast, violationModal.open]);

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
      if (pendingSaveRef.current?.itemKey === itemKey) {
        pendingSaveRef.current = null;
      }
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

  // Sync active question with useProblemStore & useEditorStore when question changes
  useEffect(() => {
    if (!currentQuestion) return;

    if (currentQuestion.is_coding) {
      const activeLang = codeLanguages[currentQuestion.id] || 'python';
      const starter = getStarterCode(currentQuestion, activeLang);
      const activeCode = codeDrafts[currentQuestion.id] ?? (currentQuestion.saved_response?.text_response || starter);

      const probData = {
        id: currentQuestion.problem_id || currentQuestion.id,
        problem_id: currentQuestion.problem_id,
        title: currentQuestion.title || 'Coding Problem',
        slug: currentQuestion.slug,
        difficulty: currentQuestion.difficulty || 'Medium',
        description: currentQuestion.question_text,
        input_format: currentQuestion.input_format,
        output_format: currentQuestion.output_format,
        constraints: currentQuestion.constraints,
        judge_mode: currentQuestion.judge_mode || 'STDIN_STDOUT',
        signature_metadata: currentQuestion.signature_metadata,
        testCases: currentQuestion.sample_test_cases || [],
        sample_test_cases: currentQuestion.sample_test_cases || [],
        serial_number: currentQuestionIdx + 1,
      };

      useProblemStore.setState({ currentProblem: probData });

      // Synchronize editor store language and code
      const editorStore = useEditorStore.getState();
      if (editorStore.language !== activeLang) {
        editorStore.setLanguage(activeLang);
      }

      // Populate store code if not present
      const userId = 'student';
      const cacheKey = `${userId}_${probData.id}_${activeLang}`;
      if (!editorStore.codes[cacheKey]) {
        editorStore.setCode(cacheKey, activeCode);
      }
    }
  }, [currentSectionIdx, currentQuestionIdx, currentQuestion, codeLanguages, codeDrafts]);

  // Handle MCQ selection
  const handleSelectOption = (optId) => {
    const curQ = currentQuestion;
    if (!curQ) return;
    const isMulti = curQ.question_type === 'multiple_choice';
    const normOptId = String(optId || '').toLowerCase();
    const currentSelected = responses[curQ.id]?.selected_options;

    if (isMulti) {
      const selectedList = parseSelectedOptions(currentSelected);
      const nextList = selectedList.includes(normOptId)
        ? selectedList.filter((x) => x !== normOptId)
        : [...selectedList, normOptId];
      saveAnswer(curQ.id, { selected_options: nextList.length > 0 ? nextList : null });
    } else {
      const isAlreadySelected = String(currentSelected || '').toLowerCase() === normOptId;
      const nextVal = isAlreadySelected ? null : normOptId;
      saveAnswer(curQ.id, { selected_options: nextVal });
    }
  };

  // Handle numerical / short-answer text response
  const handleTextAnswerChange = (val) => {
    const curQ = currentQuestion;
    if (!curQ) return;
    pendingSaveRef.current = { itemKey: curQ.id, fields: { text_response: val || null } };
    setSaveStatus('Unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveAnswer(curQ.id, { text_response: val || null });
    }, 800);
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
    pendingSaveRef.current = { itemKey: qId, fields: { text_response: newCode } };
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

  const handleResetCode = (qId, resetCode) => {
    const lang = codeLanguages[qId] || 'python';
    const nextSnippet = resetCode || getStarterCode(currentQuestion, lang);
    setCodeDrafts((prev) => ({ ...prev, [qId]: nextSnippet }));
    saveAnswer(qId, { text_response: nextSnippet });
  };

  const handleAssessmentCodeSubmitted = async (qId, result) => {
    const subId = result.submissionId || result.id;
    const curCode = codeDrafts[qId];
    if (subId) {
      await saveAnswer(qId, {
        code_submission_id: subId,
        text_response: curCode,
      });
    }
  };

  // Navigation handlers
  const handleNavigateNext = () => {
    if (currentQuestionIdx < currentSection.questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx(currentSectionIdx + 1);
      setCurrentQuestionIdx(0);
    } else {
      setIsConfirmSubmitOpen(true);
    }
  };

  const handleNavigatePrev = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(currentQuestionIdx - 1);
    } else if (currentSectionIdx > 0) {
      const prevSec = sections[currentSectionIdx - 1];
      setCurrentSectionIdx(currentSectionIdx - 1);
      setCurrentQuestionIdx(prevSec.questions.length - 1);
    }
  };

  const handleSelectFromDrawer = (secIdx, qIdx) => {
    setCurrentSectionIdx(secIdx);
    setCurrentQuestionIdx(qIdx);
  };

  // Statistics calculation
  const totalQuestions = sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
  let answeredCount = 0;
  let flaggedCount = 0;

  for (const s of sections) {
    for (const q of s.questions || []) {
      const resp = responses[q.id];
      const hasAnswer = Boolean(
        (Array.isArray(resp?.selected_options) ? resp.selected_options.length > 0 : resp?.selected_options) ||
        resp?.text_response ||
        resp?.code_submission_id
      );
      if (hasAnswer) answeredCount++;
      if (resp?.is_flagged_for_review) flaggedCount++;
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
      <div className="min-h-screen bg-[var(--kc-bg)] flex items-center justify-center p-6 text-[var(--kc-text-muted)]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--kc-text-primary)]">
            Initializing assessment arena…
          </p>
        </div>
      </div>
    );
  }

  if (error || !currentQuestion) {
    return (
      <div className="min-h-screen bg-[var(--kc-bg)] p-6 flex items-center justify-center">
        <div className="bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-lg">
          <AlertTriangle size={36} className="mx-auto text-[var(--kc-error)]" />
          <h2 className="text-lg font-bold text-[var(--kc-text-primary)]">Assessment Error</h2>
          <p className="text-xs text-[var(--kc-text-secondary)]">{error || 'No questions available'}</p>
          <button
            type="button"
            onClick={() => loadAttempt()}
            className="kc-btn-secondary"
            style={{ padding: '6px 16px', fontSize: '12px' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const curResp = responses[currentQuestion.id] || {};
  const isCurrentFlagged = Boolean(curResp.is_flagged_for_review);
  const selectedOpt = curResp.selected_options;
  const isLastQuestion =
    currentQuestionIdx === currentSection.questions.length - 1 &&
    currentSectionIdx === sections.length - 1;

  // Active coding question object for CodingWorkspace
  const activeCodingProblem = currentQuestion.is_coding
    ? {
        id: currentQuestion.problem_id || currentQuestion.id,
        problem_id: currentQuestion.problem_id,
        title: currentQuestion.title || 'Coding Problem',
        slug: currentQuestion.slug,
        difficulty: currentQuestion.difficulty || 'Medium',
        description: currentQuestion.question_text,
        input_format: currentQuestion.input_format,
        output_format: currentQuestion.output_format,
        constraints: currentQuestion.constraints,
        judge_mode: currentQuestion.judge_mode || 'STDIN_STDOUT',
        signature_metadata: currentQuestion.signature_metadata,
        testCases: currentQuestion.sample_test_cases || [],
        sample_test_cases: currentQuestion.sample_test_cases || [],
        serial_number: currentQuestionIdx + 1,
      }
    : null;

  return (
    <div className="h-screen w-screen bg-[var(--kc-bg)] flex flex-col select-none overflow-hidden font-sans">
      {/* ── QUESTION PALETTE DRAWER (Hidden by default, triggered by hamburger) ─ */}
      <AssessmentQuestionDrawer
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        sections={sections}
        currentSectionIdx={currentSectionIdx}
        currentQuestionIdx={currentQuestionIdx}
        responses={responses}
        onSelectQuestion={handleSelectFromDrawer}
        onSectionChange={(sIdx) => {
          setCurrentSectionIdx(sIdx);
          setCurrentQuestionIdx(0);
        }}
        onOpenSubmitModal={() => setIsConfirmSubmitOpen(true)}
      />

      {/* ── 1. COMPACT TOP ARENA HEADER BAR ───────────────────────────────── */}
      <header className="h-12 bg-[var(--kc-surface)] border-b border-[var(--kc-border)] px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 z-30 shadow-xs">
        {/* Left: Assessment Title & Autosave Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--kc-success)] animate-pulse shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-bold text-[var(--kc-text-primary)] truncate font-display">
                {attempt.assessment_title}
              </h1>
              {isSecureMode && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shrink-0" title="Secure Assessment Mode Active">
                  <ShieldCheck size={11} />
                  <span className="hidden sm:inline">Secure Mode</span>
                </span>
              )}
            </div>
            <div className="text-[10px] text-[var(--kc-text-muted)] flex items-center gap-1 font-mono">
              <span>Status:</span>
              <span
                className={
                  saveStatus === 'Saved'
                    ? 'text-[var(--kc-success)] font-medium'
                    : 'text-[var(--kc-warning)] font-medium animate-pulse'
                }
              >
                {saveStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Authoritative Countdown Timer */}
        <div className="flex items-center justify-center shrink-0">
          <div
            className={`px-3 py-1 rounded-lg font-mono text-xs sm:text-sm font-bold flex items-center gap-1.5 border transition-colors shadow-xs ${
              isCriticalTime
                ? 'bg-[var(--kc-error-subtle)] text-[var(--kc-error-text)] border-[var(--kc-error-border)] animate-pulse'
                : isLowTime
                ? 'bg-[var(--kc-warning-subtle)] text-[var(--kc-warning-text)] border-[var(--kc-warning-border)]'
                : 'bg-[var(--kc-surface-subtle)] text-[var(--kc-text-primary)] border-[var(--kc-border)]'
            }`}
          >
            <Clock size={13} className="shrink-0" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Right: Progress Stats & Submit Test Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-[var(--kc-success-subtle)] text-[var(--kc-success-text)] font-semibold border border-[var(--kc-success-border)] text-[11px]">
              {answeredCount} Answered
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--kc-warning-subtle)] text-[var(--kc-warning-text)] font-semibold border border-[var(--kc-warning-border)] text-[11px]">
              {flaggedCount} Review
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsConfirmSubmitOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Send size={12} />
            <span>Submit Test</span>
          </button>
        </div>
      </header>

      {/* ── 2. SECTION TABS BAR WITH HAMBURGER BUTTON ───────────────────────── */}
      <div className="h-10 bg-[var(--kc-surface-subtle)] border-b border-[var(--kc-border)] px-3 sm:px-5 flex items-center gap-2 shrink-0 z-20">
        {/* HAMBURGER BUTTON IMMEDIATELY BESIDE SECTION TABS */}
        <button
          type="button"
          onClick={() => setIsPaletteOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded-md bg-[var(--kc-surface)] hover:bg-[var(--kc-surface-hover)] border border-[var(--kc-border)] text-[var(--kc-text-primary)] hover:border-[var(--kc-accent)] transition-colors shadow-xs cursor-pointer shrink-0 group"
          title="Open Question Palette Drawer (Question Numbers)"
          aria-label="Open Question Palette Drawer"
        >
          <Menu size={14} className="text-[var(--kc-accent)] group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Questions</span>
          <span className="text-[10px] font-mono bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] px-1.5 py-0.2 rounded border border-[var(--kc-accent-border)]">
            {currentQuestionIdx + 1}/{currentSection.questions.length}
          </span>
        </button>

        {/* Vertical Divider */}
        <div className="h-4 w-px bg-[var(--kc-border)] shrink-0" />

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-1 min-w-0">
          {sections.map((sec, idx) => {
            const isActive = idx === currentSectionIdx;
            return (
              <button
                key={sec.id || idx}
                type="button"
                onClick={() => {
                  setCurrentSectionIdx(idx);
                  setCurrentQuestionIdx(0);
                }}
                className={`py-1 px-3 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--kc-surface)] text-[var(--kc-accent)] font-semibold border border-[var(--kc-border)] shadow-xs'
                    : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)]'
                }`}
              >
                <span>Section {idx + 1}: {sec.title}</span>
                <span className="text-[10px] font-mono text-[var(--kc-text-muted)]">
                  ({sec.questions?.length || 0})
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile View Switcher for Coding Questions */}
        {currentQuestion.is_coding && isMobile && (
          <div className="flex items-center gap-1 bg-[var(--kc-surface)] p-0.5 rounded border border-[var(--kc-border)] shrink-0">
            <button
              type="button"
              onClick={() => setMobileViewTab('problem')}
              className={`px-2 py-0.5 text-[11px] font-mono rounded ${
                mobileViewTab === 'problem'
                  ? 'bg-[var(--kc-accent)] text-white font-bold'
                  : 'text-[var(--kc-text-muted)]'
              }`}
            >
              Problem
            </button>
            <button
              type="button"
              onClick={() => setMobileViewTab('code')}
              className={`px-2 py-0.5 text-[11px] font-mono rounded ${
                mobileViewTab === 'code'
                  ? 'bg-[var(--kc-accent)] text-white font-bold'
                  : 'text-[var(--kc-text-muted)]'
              }`}
            >
              Code
            </button>
          </div>
        )}
      </div>

      {/* ── 3. MAIN ARENA BODY (FULL VIEWPORT HEIGHT UTILIZATION) ───────────── */}
      <main className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden relative">
        {/* CASE A: CODING QUESTIONS — SPLIT PANE WORKSPACE */}
        {currentQuestion.is_coding ? (
          <div className="flex-1 min-h-0 min-w-0 flex flex-col h-full w-full overflow-hidden">
            {isMobile ? (
              // Mobile View: Problem or Code Switcher
              <div className="flex-1 min-h-0 min-w-0 flex flex-col h-full w-full overflow-hidden">
                {mobileViewTab === 'problem' ? (
                  <div className="flex-1 min-h-0 flex flex-col h-full bg-[var(--kc-surface)] overflow-hidden">
                    {/* Problem Meta Header */}
                    <div className="p-4 border-b border-[var(--kc-border)] shrink-0 flex flex-col gap-2 bg-[var(--kc-surface)]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[var(--kc-accent-border)]">
                          Question {currentQuestionIdx + 1} of {currentSection.questions.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[var(--kc-success)]">
                            +{currentQuestion.marks} Marks
                          </span>
                          <DifficultyBadge difficulty={currentQuestion.difficulty} />
                        </div>
                      </div>
                      <h2 className="text-base font-bold text-[var(--kc-text-primary)] font-display">
                        {currentQuestion.title || 'Coding Problem Statement'}
                      </h2>
                    </div>

                    {/* Problem Description Content */}
                    <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
                      <ProblemDescription problem={{ description: currentQuestion.question_text }} />
                      {/* Formats & Examples */}
                      <CodingSpecifications question={currentQuestion} />
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-3 border-t border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] shrink-0 flex items-center justify-between gap-2">
                      <NavigationActionButtons
                        isCurrentFlagged={isCurrentFlagged}
                        onToggleFlag={handleToggleFlag}
                        onNavigatePrev={handleNavigatePrev}
                        onNavigateNext={handleNavigateNext}
                        isPrevDisabled={currentQuestionIdx === 0 && currentSectionIdx === 0}
                        isLastQuestion={isLastQuestion}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
                    <CodingWorkspace
                      problem={activeCodingProblem}
                      isAssessmentMode={true}
                      readOnly={isSubmitting || violationModal.open}
                      saveStatus={saveStatus}
                      language={codeLanguages[currentQuestion.id] || 'python'}
                      onLanguageChange={(newLang) => handleLanguageChange(currentQuestion.id, newLang)}
                      code={codeDrafts[currentQuestion.id]}
                      onCodeChange={(newCode) => handleCodeChange(currentQuestion.id, newCode)}
                      onReset={(resetCode) => handleResetCode(currentQuestion.id, resetCode)}
                      onSubmitSuccess={(res) => handleAssessmentCodeSubmitted(currentQuestion.id, res)}
                      submitLabel="Submit"
                      submitFullLabel="Code"
                      onOpenDrawer={() => setIsPaletteOpen(true)}
                    />
                  </div>
                )}
              </div>
            ) : (
              // Desktop View: Draggable Split-Pane Layout
              <PanelGroup
                id="assessment-coding-split-layout"
                orientation="horizontal"
                defaultLayout={splitLayout}
                onLayoutChanged={handleSplitLayoutChange}
                className="h-full w-full min-h-0 min-w-0 flex-1 flex overflow-hidden"
                style={{ height: '100%', width: '100%' }}
              >
                {/* LEFT PANE: Coding Problem Description (ONLY ONCE!) */}
                <Panel
                  id="assessment-problem-pane"
                  defaultSize="42%"
                  minSize="28%"
                  maxSize="60%"
                  className="flex-1 flex flex-col h-full w-full min-h-0 min-w-0 !overflow-hidden bg-[var(--kc-surface)] border-r border-[var(--kc-border)]"
                  style={{ height: '100%' }}
                >
                  {/* Problem Meta Header */}
                  <div className="p-4 sm:p-5 border-b border-[var(--kc-border)] shrink-0 flex flex-col gap-2.5 bg-[var(--kc-surface)]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[var(--kc-accent-border)]">
                          Question {currentQuestionIdx + 1} of {currentSection.questions.length}
                        </span>
                        <span className="text-xs text-[var(--kc-text-muted)] font-mono">
                          {currentQuestion.category || currentSection.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[var(--kc-success)]">
                          +{currentQuestion.marks} Marks
                        </span>
                        {parseFloat(currentQuestion.negative_marks) > 0 && (
                          <span className="text-xs font-mono font-bold text-[var(--kc-error)]">
                            -{currentQuestion.negative_marks}
                          </span>
                        )}
                        <DifficultyBadge difficulty={currentQuestion.difficulty} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base sm:text-lg font-bold text-[var(--kc-text-primary)] font-display tracking-tight">
                        {currentQuestion.title || 'Coding Problem Statement'}
                      </h2>

                      <div className="flex items-center gap-3 text-xs text-[var(--kc-text-muted)] font-mono shrink-0">
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-[var(--kc-accent)]" />
                          <span>{currentQuestion.time_limit_ms || 2000}ms</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Cpu size={12} className="text-[var(--kc-accent)]" />
                          <span>{currentQuestion.memory_limit_mb || 256}MB</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Problem Statement & Specifications (Scrolls independently!) */}
                  <div className="p-4 sm:p-5 flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar space-y-5">
                    {/* Rendered markdown problem statement (Only once!) */}
                    <ProblemDescription problem={{ description: currentQuestion.question_text }} />

                    {/* Input/Output Formats, Constraints, and Sample Examples */}
                    <CodingSpecifications question={currentQuestion} />
                  </div>

                  {/* Bottom Action Controls */}
                  <div className="p-3 sm:p-4 border-t border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] shrink-0 flex items-center justify-between gap-2">
                    <NavigationActionButtons
                      isCurrentFlagged={isCurrentFlagged}
                      onToggleFlag={handleToggleFlag}
                      onNavigatePrev={handleNavigatePrev}
                      onNavigateNext={handleNavigateNext}
                      isPrevDisabled={currentQuestionIdx === 0 && currentSectionIdx === 0}
                      isLastQuestion={isLastQuestion}
                    />
                  </div>
                </Panel>

                {/* DRAGGABLE DIVIDER */}
                <ResizeHandle direction="horizontal" />

                {/* RIGHT PANE: Reused Coding Workspace (CodeEditor + TestCases + ConsolePanel) */}
                <Panel
                  id="assessment-workspace-pane"
                  defaultSize="58%"
                  minSize="40%"
                  maxSize="72%"
                  className="flex-1 flex flex-col h-full w-full min-h-0 min-w-0 !overflow-hidden"
                  style={{ height: '100%' }}
                >
                  <CodingWorkspace
                    problem={activeCodingProblem}
                    isAssessmentMode={true}
                    readOnly={isSubmitting || violationModal.open}
                    saveStatus={saveStatus}
                    language={codeLanguages[currentQuestion.id] || 'python'}
                    onLanguageChange={(newLang) => handleLanguageChange(currentQuestion.id, newLang)}
                    code={codeDrafts[currentQuestion.id]}
                    onCodeChange={(newCode) => handleCodeChange(currentQuestion.id, newCode)}
                    onReset={(resetCode) => handleResetCode(currentQuestion.id, resetCode)}
                    onSubmitSuccess={(res) => handleAssessmentCodeSubmitted(currentQuestion.id, res)}
                    submitLabel="Submit"
                    submitFullLabel="Code"
                    onOpenDrawer={() => setIsPaletteOpen(true)}
                  />
                </Panel>
              </PanelGroup>
            )}
          </div>
        ) : (
          /* CASE B: MCQ & NUMERICAL QUESTIONS — RESPONSIVE TWO-COLUMN LAYOUT */
          <div className="h-full w-full flex-1 min-h-0 min-w-0 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Question Statement Panel (45%) */}
            <div className="w-full md:w-[45%] flex-1 flex flex-col h-full bg-[var(--kc-surface)] border-b md:border-b-0 md:border-r border-[var(--kc-border)] min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[var(--kc-border)] shrink-0 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[var(--kc-accent-border)]">
                    Question {currentQuestionIdx + 1} of {currentSection.questions.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--kc-success)]">
                      +{currentQuestion.marks} Marks
                    </span>
                    {parseFloat(currentQuestion.negative_marks) > 0 && (
                      <span className="text-xs font-mono font-bold text-[var(--kc-error)]">
                        -{currentQuestion.negative_marks}
                      </span>
                    )}
                    <DifficultyBadge difficulty={currentQuestion.difficulty} />
                  </div>
                </div>

                <div className="text-xs text-[var(--kc-text-muted)] font-mono">
                  {currentQuestion.category || currentSection.title} › {currentQuestion.topic || 'General'}
                </div>
              </div>

              {/* Scrollable Question Text */}
              <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <ProblemDescription problem={{ description: currentQuestion.question_text }} />
              </div>
            </div>

            {/* Right Column: Full-Width Answer Response Panel (55%) */}
            <div className="w-full md:w-[55%] flex-1 flex flex-col h-full bg-[var(--kc-bg)] min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[var(--kc-border)] bg-[var(--kc-surface)] shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--kc-text-secondary)] font-mono">
                    {currentQuestion.question_type === 'multiple_choice'
                      ? 'Select One or More Options (Multiple Choice)'
                      : currentQuestion.question_type === 'short_answer' || currentQuestion.question_type === 'numerical'
                      ? 'Enter Your Answer'
                      : 'Select One Option'}
                  </h3>
                  <p className="text-[11px] text-[var(--kc-text-muted)] mt-0.5">
                    Your choice will be autosaved immediately
                  </p>
                </div>

                {curResp.selected_options || curResp.text_response ? (
                  <span className="text-[11px] font-mono text-[var(--kc-success)] flex items-center gap-1 font-semibold">
                    <CheckCircle2 size={13} />
                    <span>Response Recorded</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-[var(--kc-text-muted)]">
                    Not answered yet
                  </span>
                )}
              </div>

              {/* Option Selection List or Numerical Input */}
              <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3">
                {/* MCQ Options */}
                {currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="space-y-2.5 max-w-2xl">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const isObj = typeof opt === 'object' && opt !== null;
                      const optId = String(
                        isObj ? opt.id || opt.option || String.fromCharCode(97 + optIdx) : String.fromCharCode(97 + optIdx)
                      ).toLowerCase();
                      const optText = String(isObj ? opt.text ?? opt.value ?? opt.label ?? '' : opt);
                      const isMulti = currentQuestion.question_type === 'multiple_choice';
                      const selectedList = parseSelectedOptions(selectedOpt);
                      const isSelected = isMulti
                        ? selectedList.includes(optId)
                        : String(selectedOpt || '').toLowerCase() === optId;

                      return (
                        <div
                          key={`${optId}-${optIdx}`}
                          onClick={() => {
                            if (isSubmitting || violationModal.open) return;
                            handleSelectOption(optId);
                          }}
                          className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                            isSubmitting || violationModal.open
                              ? 'cursor-not-allowed opacity-60'
                              : 'cursor-pointer'
                          } ${
                            isSelected
                              ? 'border-[var(--kc-accent)] bg-[var(--kc-accent-subtle)] shadow-xs'
                              : 'border-[var(--kc-border)] bg-[var(--kc-surface)] hover:border-[var(--kc-border-hover)] hover:bg-[var(--kc-surface-hover)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-[var(--kc-accent)] text-[var(--kc-on-primary)]'
                                  : 'bg-[var(--kc-surface-subtle)] text-[var(--kc-text-secondary)] group-hover:text-[var(--kc-text-primary)]'
                              }`}
                            >
                              {optId}
                            </span>
                            <span
                              className={`text-sm leading-relaxed ${
                                isSelected
                                  ? 'font-semibold text-[var(--kc-text-primary)]'
                                  : 'text-[var(--kc-text-secondary)] group-hover:text-[var(--kc-text-primary)]'
                              }`}
                            >
                              {optText}
                            </span>
                          </div>

                          <div
                            className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                              isMulti ? 'rounded-md' : 'rounded-full'
                            } border ${
                              isSelected
                                ? 'border-[var(--kc-accent)] bg-[var(--kc-accent)] text-[var(--kc-on-primary)]'
                                : 'border-[var(--kc-border)] group-hover:border-[var(--kc-text-muted)]'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Numerical / Short Answer Input */}
                {(!currentQuestion.options || currentQuestion.options.length === 0) && (
                  <div className="max-w-md space-y-3 pt-2">
                    <label 
                      htmlFor="assessment-numerical-input"
                      className="block text-xs font-mono font-medium text-[var(--kc-text-secondary)]"
                    >
                      Numerical or Short Answer Value:
                    </label>
                    <input
                      id="assessment-numerical-input"
                      type="text"
                      disabled={isSubmitting || violationModal.open}
                      value={curResp.text_response || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setResponses((prev) => ({
                          ...prev,
                          [currentQuestion.id]: {
                            ...(prev[currentQuestion.id] || {}),
                            text_response: val,
                          },
                        }));
                        handleTextAnswerChange(val);
                      }}
                      placeholder="Type your answer here..."
                      className="w-full bg-[var(--kc-surface)] border border-[var(--kc-border)] focus:border-[var(--kc-accent)] rounded-lg p-3 text-sm text-[var(--kc-text-primary)] placeholder-[var(--kc-text-muted)] focus:outline-none transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-[11px] text-[var(--kc-text-muted)]">
                      Make sure your answer matches the expected format (e.g. integer or precision).
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Action Controls */}
              <div className="p-3 sm:p-4 border-t border-[var(--kc-border)] bg-[var(--kc-surface)] shrink-0 flex items-center justify-between gap-2">
                <NavigationActionButtons
                  isCurrentFlagged={isCurrentFlagged}
                  onToggleFlag={handleToggleFlag}
                  onClearResponse={
                    (Array.isArray(selectedOpt) ? selectedOpt.length > 0 : Boolean(selectedOpt)) ||
                    Boolean(curResp.text_response)
                      ? handleClearResponse
                      : null
                  }
                  onNavigatePrev={handleNavigatePrev}
                  onNavigateNext={handleNavigateNext}
                  isPrevDisabled={currentQuestionIdx === 0 && currentSectionIdx === 0}
                  isLastQuestion={isLastQuestion}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── 4. FINAL SUBMIT CONFIRMATION MODAL ────────────────────────────── */}
      {isConfirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[var(--kc-warning-subtle)] border border-[var(--kc-warning-border)] flex items-center justify-center mx-auto text-[var(--kc-warning)]">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-lg font-bold text-[var(--kc-text-primary)] font-display">
                Submit Assessment?
              </h2>
              <p className="text-xs text-[var(--kc-text-secondary)] leading-relaxed">
                Review your progress summary before finalizing. Once submitted, your answers cannot be altered.
              </p>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-3 gap-2 py-3 px-4 rounded-xl bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] text-center font-mono">
              <div>
                <div className="text-[10px] text-[var(--kc-text-muted)] uppercase">Answered</div>
                <div className="text-lg font-bold text-[var(--kc-success)]">{answeredCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--kc-text-muted)] uppercase">Review</div>
                <div className="text-lg font-bold text-[var(--kc-warning)]">{flaggedCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--kc-text-muted)] uppercase">Unanswered</div>
                <div className="text-lg font-bold text-[var(--kc-text-muted)]">{unansweredCount}</div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-2.5 rounded-lg bg-[var(--kc-warning-subtle)] border border-[var(--kc-warning-border)] text-center text-xs text-[var(--kc-warning-text)] font-medium">
                ⚠️ You have <strong>{unansweredCount} unanswered questions</strong>.
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-[var(--kc-border)] text-[var(--kc-text-secondary)] hover:bg-[var(--kc-surface-subtle)] transition-colors cursor-pointer"
              >
                Return to Test
              </button>
              <button
                type="button"
                onClick={() => executeFinalSubmit('manual')}
                disabled={isSubmitting}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Finalizing…' : 'Yes, Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. FULL-SCREEN REQUIREMENT PROMPT OVERLAY ──────────────────────── */}
      {needsFullscreenPrompt && !violationModal.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn select-none">
          <div className="bg-[var(--kc-surface)] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto">
              <Maximize size={24} />
            </div>
            <h2 className="text-lg font-bold text-[var(--kc-text-primary)] font-display">
              Full-Screen Mode Required
            </h2>
            <p className="text-xs text-[var(--kc-text-secondary)] leading-relaxed">
              This assessment is running under <strong>Secure Assessment Mode</strong>. You must remain in full-screen mode at all times. Exiting full-screen will automatically finalize and submit your assessment.
            </p>
            <button
              type="button"
              onClick={handleReEnterFullscreen}
              className="w-full py-2.5 text-xs font-bold rounded-xl bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-white shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Maximize size={14} />
              <span>Enter Full-Screen to Continue</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 6. UNCLOSABLE SECURITY VIOLATION AUTOMATIC SUBMISSION MODAL ─────── */}
      {violationModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn select-none">
          <div className="bg-[var(--kc-surface)] border border-rose-500/50 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto animate-pulse">
              <ShieldAlert size={32} />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                Assessment Terminated & Submitted
              </div>
              <h2 className="text-xl font-bold text-[var(--kc-text-primary)] font-display">
                Security Violation Triggered
              </h2>
              <p className="text-xs text-[var(--kc-text-secondary)] leading-relaxed">
                A security rule was triggered: <strong>{getViolationMeta(violationModal.violationType).title}</strong>. As configured by the exam security policy, the assessment has been automatically finalized.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] text-left space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px] text-[var(--kc-text-muted)] border-b border-[var(--kc-border-subtle)] pb-2">
                <span>Trigger Event:</span>
                <span className="font-bold text-rose-700 dark:text-rose-400">{violationModal.violationType}</span>
              </div>
              <div className="text-[11px] text-[var(--kc-text-secondary)] font-sans leading-relaxed pt-1">
                {violationModal.violationDetails}
              </div>
            </div>

            {/* Authoritative assurance: saved responses are kept and scored */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-left text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Your responses have been saved</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[var(--kc-text-secondary)]">
                All question answers, numerical responses, and code submissions saved prior to this violation were recorded and evaluated normally according to assessment scoring rules.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={violationModal.isFinalizing}
                onClick={() => router.push(`/assessments/result/${attemptId}`)}
                className="w-full py-3 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {violationModal.isFinalizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Finalizing Submission…</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={14} />
                    <span>View Assessment Results</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. RESTRICTED CLIPBOARD TOAST NOTIFICATION ─────────────────────── */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] max-w-sm p-3.5 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-medium animate-slideUp bg-[var(--kc-surface)] text-[var(--kc-text-primary)] border-[var(--kc-border)]">
          {toast.type === 'error' ? (
            <ShieldAlert size={18} className="text-rose-500 shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          )}
          <span className="flex-1 leading-relaxed">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Formats, Constraints, and Sample Test Cases for Coding Questions
function CodingSpecifications({ question }) {
  return (
    <div className="space-y-4 pt-1">
      {/* Input / Output Formats */}
      {(question.input_format || question.output_format) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.input_format && (
            <div className="p-3 rounded-lg bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)]">
              <div className="text-[11px] font-bold text-[var(--kc-text-secondary)] uppercase tracking-wider mb-1 font-mono">
                Input Format
              </div>
              <div className="text-xs text-[var(--kc-text-primary)] whitespace-pre-wrap font-mono leading-relaxed">
                {question.input_format}
              </div>
            </div>
          )}
          {question.output_format && (
            <div className="p-3 rounded-lg bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)]">
              <div className="text-[11px] font-bold text-[var(--kc-text-secondary)] uppercase tracking-wider mb-1 font-mono">
                Output Format
              </div>
              <div className="text-xs text-[var(--kc-text-primary)] whitespace-pre-wrap font-mono leading-relaxed">
                {question.output_format}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Constraints */}
      {question.constraints && (
        <div>
          <div className="text-[11px] font-bold text-[var(--kc-text-secondary)] uppercase tracking-wider mb-1.5 font-mono">
            Constraints
          </div>
          <div className="p-3 rounded-lg bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] font-mono text-xs text-[var(--kc-text-primary)] whitespace-pre-wrap leading-relaxed">
            {question.constraints}
          </div>
        </div>
      )}

      {/* Sample Examples */}
      {question.sample_test_cases && question.sample_test_cases.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="text-[11px] font-bold text-[var(--kc-text-secondary)] uppercase tracking-wider font-mono">
            Sample Examples
          </div>
          <div className="space-y-2.5">
            {question.sample_test_cases.map((sample, sIdx) => (
              <div
                key={sIdx}
                className="p-3 rounded-lg bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] text-xs font-mono space-y-2"
              >
                <div className="text-[11px] font-bold text-[var(--kc-accent)]">
                  Example {sIdx + 1}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase text-[var(--kc-text-muted)] block mb-0.5">Input:</span>
                    <pre className="p-2 rounded bg-[var(--kc-surface)] border border-[var(--kc-border-subtle)] overflow-x-auto text-[var(--kc-text-primary)] font-mono">
                      {sample.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[var(--kc-text-muted)] block mb-0.5">Expected Output:</span>
                    <pre className="p-2 rounded bg-[var(--kc-surface)] border border-[var(--kc-border-subtle)] overflow-x-auto text-[var(--kc-success-text)] font-mono">
                      {sample.output}
                    </pre>
                  </div>
                </div>
                {sample.explanation && (
                  <div className="text-[11px] text-[var(--kc-text-secondary)] pt-1 italic font-sans leading-relaxed">
                    Explanation: {sample.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Navigation Action Buttons (Previous, Mark for Review, Save & Next)
function NavigationActionButtons({
  isCurrentFlagged,
  onToggleFlag,
  onClearResponse,
  onNavigatePrev,
  onNavigateNext,
  isPrevDisabled,
  isLastQuestion,
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleFlag}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
            isCurrentFlagged
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
              : 'border-[var(--kc-border)] bg-[var(--kc-surface)] text-[var(--kc-text-secondary)] hover:bg-[var(--kc-surface-hover)] hover:text-[var(--kc-text-primary)]'
          }`}
        >
          <Bookmark size={13} className={isCurrentFlagged ? 'fill-amber-400 text-amber-500' : ''} />
          <span>{isCurrentFlagged ? 'Flagged' : 'Mark for Review'}</span>
        </button>

        {onClearResponse && (
          <button
            type="button"
            onClick={onClearResponse}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-[var(--kc-text-muted)] hover:text-[var(--kc-error-text)] hover:bg-[var(--kc-surface)] transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPrevDisabled}
          onClick={onNavigatePrev}
          className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] hover:bg-[var(--kc-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--kc-text-primary)] transition-colors cursor-pointer"
        >
          <ChevronLeft size={14} />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={onNavigateNext}
          className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] shadow-xs transition-colors cursor-pointer"
        >
          <span>{isLastQuestion ? 'Review & Submit' : 'Save & Next'}</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </>
  );
}
