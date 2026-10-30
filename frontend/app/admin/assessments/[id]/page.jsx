'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, downloadAdminFile } from '../../../../lib/adminApi';
import {
  ArrowLeft,
  Award,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Code2,
  Sparkles,
  Eye,
  Users,
  Search,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  GraduationCap,
  UserCheck,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Settings,
  Move,
  CornerDownRight,
  ListOrdered
} from 'lucide-react';

function toLocalDatetimeInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AssessmentBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params?.id;

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('builder'); // 'builder' | 'preview' | 'attempts'

  // Assessment Settings Modal State
  const [isEditSettingsOpen, setIsEditSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState({
    title: '',
    slug: '',
    description: '',
    instructions: '',
    category: 'Placement',
    duration_minutes: 60,
    pass_percentage: 40.0,
    max_attempts: 1,
    starts_at: '',
    ends_at: '',
    randomize_questions: false,
    randomize_options: false,
    default_negative_marking: true,
    show_results_immediately: true,
    show_answers_mode: 'after_submission',
    is_public: false,
    target_audience: 'organization',
  });

  // Section Modals & State
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionFormData, setSectionFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    section_type: 'objective',
    duration_minutes: '',
    marks_per_question: 1.0,
    negative_marks_per_question: 0.25,
  });

  // Question Marks Override Modal State
  const [isEditMarksOpen, setIsEditMarksOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [marksSaving, setMarksSaving] = useState(false);
  const [marksFormData, setMarksFormData] = useState({
    marks_override: '',
    negative_marks_override: '',
  });

  // Move Question to Another Section State
  const [isMoveQuestionOpen, setIsMoveQuestionOpen] = useState(false);
  const [movingMapping, setMovingMapping] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);

  // Create Question Directly in Section State
  const [isCreateQuestionOpen, setIsCreateQuestionOpen] = useState(false);
  const [createQSectionId, setCreateQSectionId] = useState(null);
  const [createQSaving, setCreateQSaving] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState({
    category: 'Quantitative Aptitude',
    topic: 'General',
    difficulty: 'Medium',
    question_type: 'single_choice',
    question_text: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correct_answer: 'A',
    correct_answers_multi: ['A'],
    tags: '',
    explanation: '',
    marks_override: '',
    negative_marks_override: '',
  });

  // Publishing Validation Issues Modal State
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);

  // Manual Question Picker Modal
  const [isQuestionPickerOpen, setIsQuestionPickerOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [pickerQuestions, setPickerQuestions] = useState([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');
  const [pickerLoading, setPickerLoading] = useState(false);
  const [addingQuestionId, setAddingQuestionId] = useState(null);
  const [selectedPickerQuestionIds, setSelectedPickerQuestionIds] = useState(new Set());
  const [batchAddingQuestions, setBatchAddingQuestions] = useState(false);

  // Coding Problem Picker Modal
  const [isProblemPickerOpen, setIsProblemPickerOpen] = useState(false);
  const [pickerProblems, setPickerProblems] = useState([]);
  const [problemPickerSearch, setProblemPickerSearch] = useState('');
  const [problemPickerDifficulty, setProblemPickerDifficulty] = useState('all');
  const [problemPickerLoading, setProblemPickerLoading] = useState(false);
  const [addingProblemId, setAddingProblemId] = useState(null);
  const [problemMarksOverride, setProblemMarksOverride] = useState(10);
  const [selectedPickerProblemIds, setSelectedPickerProblemIds] = useState(new Set());
  const [batchAddingProblems, setBatchAddingProblems] = useState(false);

  // Random Populate Modal
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const [randomForm, setRandomForm] = useState({
    category: 'Quantitative Aptitude',
    topic: 'all',
    difficulty: 'all',
    count: 5,
    marks_override: '',
    negative_marks_override: '',
  });
  const [availableCount, setAvailableCount] = useState(null);

  // Candidate Attempts
  const [attempts, setAttempts] = useState([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  // Cohort Assignments State
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentFormData, setAssignmentFormData] = useState({
    target_type: 'all_organization_students',
    target_value: '',
    max_attempts: '',
    valid_from: '',
    valid_until: '',
  });

  // Results Export State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx'); // 'xlsx' | 'csv'
  const [exportFilters, setExportFilters] = useState({
    status: '',
    department: '',
    academicYear: '',
  });
  const [exportPreview, setExportPreview] = useState(null);
  const [exportPreviewLoading, setExportPreviewLoading] = useState(false);
  const [exportDownloading, setExportDownloading] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);

  const loadAssessment = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const res = await adminApi.getAssessment(assessmentId);
      setAssessment(res.assessment);
    } catch (err) {
      setError(err.message || 'Failed to load assessment');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [assessmentId]);

  const loadAssignments = useCallback(async () => {
    if (!assessmentId) return;
    setAssignmentsLoading(true);
    try {
      const res = await adminApi.getAssessmentAssignments(assessmentId);
      setAssignments(res.assignments || []);
    } catch (err) {
      console.error('Failed to load assignments', err);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (assessmentId) {
      loadAssessment(true);
      loadAssignments();
    }
  }, [assessmentId, loadAssessment, loadAssignments]);

  // Load candidate attempts when switching to attempts tab
  useEffect(() => {
    if (activeTab === 'attempts' && assessmentId) {
      setAttemptsLoading(true);
      adminApi.getAssessmentAttempts(assessmentId)
        .then((res) => setAttempts(res.attempts || []))
        .catch((err) => console.error('Failed to load attempts', err))
        .finally(() => setAttemptsLoading(false));
    }
    if (activeTab === 'assignments' && assessmentId) {
      loadAssignments();
    }
  }, [activeTab, assessmentId, loadAssignments]);

  useEffect(() => {
    const hasUnsavedModal = isEditSettingsOpen || isAddSectionOpen || isCreateQuestionOpen || isEditMarksOpen;
    const handleBeforeUnload = (e) => {
      if (hasUnsavedModal) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditSettingsOpen, isAddSectionOpen, isCreateQuestionOpen, isEditMarksOpen]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setAssignmentSubmitting(true);
    try {
      const payload = {
        target_type: assignmentFormData.target_type,
        target_value: assignmentFormData.target_value ? assignmentFormData.target_value.trim() : null,
        max_attempts: assignmentFormData.max_attempts ? parseInt(assignmentFormData.max_attempts, 10) : null,
        valid_from: assignmentFormData.valid_from ? new Date(assignmentFormData.valid_from).toISOString() : null,
        valid_until: assignmentFormData.valid_until ? new Date(assignmentFormData.valid_until).toISOString() : null,
      };
      await adminApi.createAssessmentAssignment(assessmentId, payload);
      setIsAddAssignmentOpen(false);
      setAssignmentFormData({
        target_type: 'all_organization_students',
        target_value: '',
        max_attempts: '',
        valid_from: '',
        valid_until: '',
      });
      loadAssignments();
    } catch (err) {
      alert(err.message || 'Failed to create cohort assignment');
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const handleRevokeAssignment = async (assignmentId) => {
    if (!confirm('Revoke this assessment assignment? Students in this cohort will lose eligibility.')) return;
    try {
      await adminApi.revokeAssessmentAssignment(assessmentId, assignmentId);
      loadAssignments();
    } catch (err) {
      alert(err.message || 'Failed to revoke assignment');
    }
  };

  const handleOpenExportModal = async () => {
    setIsExportOpen(true);
    setExportPreviewLoading(true);
    try {
      const previewRes = await adminApi.previewExportResults(assessmentId, exportFilters);
      setExportPreview(previewRes);
      const historyRes = await adminApi.getExportHistory(assessmentId);
      setExportHistory(historyRes.history || historyRes.data || []);
    } catch (err) {
      console.error('Failed to load export preview', err);
    } finally {
      setExportPreviewLoading(false);
    }
  };

  const handleFilterExport = async (newFilters) => {
    setExportFilters(newFilters);
    setExportPreviewLoading(true);
    try {
      const previewRes = await adminApi.previewExportResults(assessmentId, newFilters);
      setExportPreview(previewRes);
    } catch (err) {
      console.error('Failed to update export preview', err);
    } finally {
      setExportPreviewLoading(false);
    }
  };

  const handleDownloadExport = async () => {
    setExportDownloading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('format', exportFormat);
      if (exportFilters.status) qs.set('status', exportFilters.status);
      if (exportFilters.department) qs.set('department', exportFilters.department);
      if (exportFilters.academicYear) qs.set('academicYear', exportFilters.academicYear);

      const filename = `assessment_${assessment?.slug || assessmentId}_results.${exportFormat}`;
      await downloadAdminFile(`/assessments/${assessmentId}/export?${qs.toString()}`, filename);
      setIsExportOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to download export');
    } finally {
      setExportDownloading(false);
    }
  };

  // Global escape key to close any active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAddSectionOpen(false);
        setIsQuestionPickerOpen(false);
        setIsProblemPickerOpen(false);
        setIsRandomModalOpen(false);
        setIsEditSettingsOpen(false);
        setIsEditMarksOpen(false);
        setIsMoveQuestionOpen(false);
        setIsCreateQuestionOpen(false);
        setValidationModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleStatus = async () => {
    if (!assessment) return;
    const nextStatus = assessment.status === 'Published' ? 'Draft' : 'Published';
    try {
      const res = await adminApi.toggleAssessmentStatus(assessment.id, nextStatus);
      setAssessment((prev) => ({ ...prev, status: res.assessment.status }));
    } catch (err) {
      if (err.issues && Array.isArray(err.issues) && err.issues.length > 0) {
        setValidationIssues(err.issues);
        setValidationModalOpen(true);
      } else {
        alert(err.message || 'Failed to update publication status');
      }
    }
  };

  const handleReleaseResults = async () => {
    if (!assessment) return;
    if (!confirm('Are you sure you want to release assessment results to all students?')) return;
    try {
      const res = await adminApi.releaseAssessmentResults(assessment.id);
      setAssessment((prev) => ({
        ...prev,
        show_results_immediately: true,
        results_released_at: res.assessment?.results_released_at || new Date().toISOString(),
      }));
      alert('Assessment results have been successfully released to students.');
    } catch (err) {
      alert(err.message || 'Failed to release results');
    }
  };

  const handleOpenEditSettings = () => {
    if (!assessment) return;
    setSettingsFormData({
      title: assessment.title || '',
      slug: assessment.slug || '',
      description: assessment.description || '',
      instructions: assessment.instructions || '',
      category: assessment.category || 'Placement',
      duration_minutes: assessment.duration_minutes || 60,
      pass_percentage: assessment.pass_percentage ?? 40.0,
      max_attempts: assessment.max_attempts || 1,
      starts_at: toLocalDatetimeInput(assessment.starts_at),
      ends_at: toLocalDatetimeInput(assessment.ends_at),
      randomize_questions: !!assessment.randomize_questions,
      randomize_options: !!assessment.randomize_options,
      default_negative_marking: assessment.default_negative_marking !== false,
      show_results_immediately: assessment.show_results_immediately !== false,
      show_answers_mode: assessment.show_answers_mode || 'after_submission',
      is_public: !!assessment.is_public,
      target_audience: assessment.target_audience || (assessment.is_public ? 'public' : 'organization'),
      is_secure_mode: !!assessment.is_secure_mode,
      max_violations: assessment.security_policy?.max_violations ?? 1,
      require_fullscreen: assessment.security_policy?.require_fullscreen !== false,
      prevent_tab_switch: assessment.security_policy?.prevent_tab_switch !== false,
      prevent_clipboard: assessment.security_policy?.prevent_clipboard !== false,
      prevent_navigation: assessment.security_policy?.prevent_navigation !== false,
      auto_submit_on_violation: assessment.security_policy?.auto_submit_on_violation !== false,
    });
    setIsEditSettingsOpen(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const payload = {
        title: settingsFormData.title.trim(),
        slug: settingsFormData.slug?.trim() || undefined,
        description: settingsFormData.description,
        instructions: settingsFormData.instructions,
        category: settingsFormData.category,
        duration_minutes: parseInt(settingsFormData.duration_minutes, 10),
        pass_percentage: parseFloat(settingsFormData.pass_percentage),
        max_attempts: parseInt(settingsFormData.max_attempts, 10),
        starts_at: settingsFormData.starts_at ? new Date(settingsFormData.starts_at).toISOString() : null,
        ends_at: settingsFormData.ends_at ? new Date(settingsFormData.ends_at).toISOString() : null,
        randomize_questions: settingsFormData.randomize_questions,
        randomize_options: settingsFormData.randomize_options,
        default_negative_marking: settingsFormData.default_negative_marking,
        show_results_immediately: settingsFormData.show_results_immediately,
        show_answers_mode: settingsFormData.show_answers_mode,
        is_public: Boolean(settingsFormData.is_public),
        target_audience: settingsFormData.is_public ? 'public' : (settingsFormData.target_audience || 'organization'),
        is_secure_mode: Boolean(settingsFormData.is_secure_mode),
        security_policy: settingsFormData.is_secure_mode
          ? {
              require_fullscreen: Boolean(settingsFormData.require_fullscreen),
              prevent_tab_switch: Boolean(settingsFormData.prevent_tab_switch),
              prevent_clipboard: Boolean(settingsFormData.prevent_clipboard),
              prevent_navigation: Boolean(settingsFormData.prevent_navigation),
              auto_submit_on_violation: Boolean(settingsFormData.auto_submit_on_violation),
              max_violations: Math.max(1, parseInt(settingsFormData.max_violations, 10) || 1),
            }
          : null,
      };
      const res = await adminApi.updateAssessment(assessmentId, payload);
      setAssessment((prev) => ({ ...prev, ...res.assessment, sections: prev?.sections || [] }));
      setIsEditSettingsOpen(false);
      await loadAssessment();
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleOpenEditSection = (sec) => {
    setEditingSection(sec);
    setSectionFormData({
      title: sec.title || '',
      description: sec.description || '',
      instructions: sec.instructions || '',
      section_type: sec.section_type || 'objective',
      duration_minutes: sec.duration_minutes || '',
      marks_per_question: sec.marks_per_question ?? 1.0,
      negative_marks_per_question: sec.negative_marks_per_question ?? 0.25,
    });
    setIsAddSectionOpen(true);
  };

  const handleMoveSection = async (secIdx, direction) => {
    const targetIdx = direction === 'up' ? secIdx - 1 : secIdx + 1;
    if (targetIdx < 0 || targetIdx >= (assessment.sections || []).length) return;
    const newSections = [...assessment.sections];
    const [moved] = newSections.splice(secIdx, 1);
    newSections.splice(targetIdx, 0, moved);
    setAssessment((prev) => ({ ...prev, sections: newSections }));
    try {
      const sectionIds = newSections.map((s) => s.id);
      await adminApi.reorderSections(assessmentId, sectionIds);
    } catch (err) {
      alert(err.message || 'Failed to reorder sections');
      loadAssessment();
    }
  };

  const handleMoveQuestion = async (secId, qIdx, direction) => {
    const sec = (assessment.sections || []).find((s) => s.id === secId);
    if (!sec || !sec.questions) return;
    const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
    if (targetIdx < 0 || targetIdx >= sec.questions.length) return;

    const newQuestions = [...sec.questions];
    const [moved] = newQuestions.splice(qIdx, 1);
    newQuestions.splice(targetIdx, 0, moved);

    const updatedSections = (assessment.sections || []).map((s) =>
      s.id === secId ? { ...s, questions: newQuestions } : s
    );
    setAssessment((prev) => ({ ...prev, sections: updatedSections }));

    try {
      const mappingIds = newQuestions.map((q) => q.mapping_id);
      await adminApi.reorderQuestions(secId, mappingIds);
    } catch (err) {
      alert(err.message || 'Failed to reorder questions');
      loadAssessment();
    }
  };

  const handleOpenEditMarks = (q, sec) => {
    setEditingMapping(q);
    setMarksFormData({
      marks_override: q.marks_override !== null && q.marks_override !== undefined ? q.marks_override : sec.marks_per_question || 1.0,
      negative_marks_override: q.negative_marks_override !== null && q.negative_marks_override !== undefined ? q.negative_marks_override : sec.negative_marks_per_question || 0.25,
    });
    setIsEditMarksOpen(true);
  };

  const handleSaveMarksOverride = async (e) => {
    e.preventDefault();
    setMarksSaving(true);
    try {
      await adminApi.updateQuestionMapping(editingMapping.mapping_id, {
        marks_override: parseFloat(marksFormData.marks_override),
        negative_marks_override: parseFloat(marksFormData.negative_marks_override),
      });
      setIsEditMarksOpen(false);
      setEditingMapping(null);
      loadAssessment();
    } catch (err) {
      alert(err.message || 'Failed to update marks');
    } finally {
      setMarksSaving(false);
    }
  };

  const handleOpenMoveQuestion = (q, currentSecId) => {
    setMovingMapping({ ...q, currentSecId });
    const isCodingProblem = Boolean(q.problem_id);
    const validSections = (assessment.sections || []).filter(
      (s) => s.id !== currentSecId && (isCodingProblem ? s.section_type !== 'objective' : s.section_type !== 'coding')
    );
    setTargetSectionId(validSections.length > 0 ? validSections[0].id : '');
    setIsMoveQuestionOpen(true);
  };

  const handleConfirmMoveQuestion = async (e) => {
    e.preventDefault();
    if (!targetSectionId) {
      alert('Please select a valid destination section');
      return;
    }
    const targetSec = (assessment.sections || []).find((s) => s.id === targetSectionId);
    const isCodingProblem = Boolean(movingMapping?.problem_id);
    if (isCodingProblem && targetSec?.section_type === 'objective') {
      alert('Cannot move a coding problem into an objective section.');
      return;
    }
    if (!isCodingProblem && targetSec?.section_type === 'coding') {
      alert('Cannot move an objective question into a coding section.');
      return;
    }

    setMoveSaving(true);
    try {
      await adminApi.moveQuestionBetweenSections(movingMapping.mapping_id, targetSectionId);
      setIsMoveQuestionOpen(false);
      setMovingMapping(null);
      loadAssessment();
    } catch (err) {
      alert(err.message || 'Failed to move question');
    } finally {
      setMoveSaving(false);
    }
  };

  const handleOpenCreateQuestion = (secId) => {
    const sec = (assessment?.sections || []).find((s) => s.id === secId);
    if (sec && sec.section_type === 'coding') {
      alert('Cannot create objective questions in a coding-only section.');
      return;
    }
    setCreateQSectionId(secId);
    setNewQuestionForm({
      category: 'Quantitative Aptitude',
      topic: 'General',
      difficulty: 'Medium',
      question_type: 'single_choice',
      question_text: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correct_answer: 'A',
      correct_answers_multi: ['A'],
      tags: '',
      explanation: '',
      marks_override: '',
      negative_marks_override: '',
    });
    setIsCreateQuestionOpen(true);
  };

  const handleOpenAddSection = () => {
    setEditingSection(null);
    setSectionFormData({
      title: '',
      description: '',
      instructions: '',
      section_type: 'objective',
      duration_minutes: '',
      marks_per_question: 1.0,
      negative_marks_per_question: 0.25,
    });
    setIsAddSectionOpen(true);
  };

  const handleSaveCreateQuestion = async (e) => {
    e.preventDefault();
    if (!createQSectionId) {
      alert('Please select a section first.');
      return;
    }
    setCreateQSaving(true);
    try {
      const opts = [
        { id: 'a', text: newQuestionForm.optionA?.trim() },
        { id: 'b', text: newQuestionForm.optionB?.trim() },
        { id: 'c', text: newQuestionForm.optionC?.trim() },
        { id: 'd', text: newQuestionForm.optionD?.trim() },
      ].filter((o) => o.text);

      if (opts.length < 2) {
        alert('Please provide at least 2 non-empty options.');
        setCreateQSaving(false);
        return;
      }

      const isMulti = newQuestionForm.question_type === 'multiple_choice';
      let finalCorrectAns;
      if (isMulti) {
        if (!newQuestionForm.correct_answers_multi || newQuestionForm.correct_answers_multi.length === 0) {
          alert('Please select at least one correct option for multiple choice question.');
          setCreateQSaving(false);
          return;
        }
        finalCorrectAns = newQuestionForm.correct_answers_multi.map((a) => a.toLowerCase());
      } else {
        finalCorrectAns = newQuestionForm.correct_answer?.toLowerCase() || 'a';
      }

      const parsedTags = newQuestionForm.tags
        ? newQuestionForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const payload = {
        category: newQuestionForm.category,
        topic: newQuestionForm.topic.trim() || 'General',
        difficulty: newQuestionForm.difficulty || 'Medium',
        question_type: newQuestionForm.question_type || 'single_choice',
        question_text: newQuestionForm.question_text.trim(),
        options: opts,
        correct_answer: finalCorrectAns,
        tags: parsedTags,
        explanation: newQuestionForm.explanation.trim() || undefined,
        marks_override: newQuestionForm.marks_override ? parseFloat(newQuestionForm.marks_override) : undefined,
        negative_marks_override: newQuestionForm.negative_marks_override ? parseFloat(newQuestionForm.negative_marks_override) : undefined,
      };
      await adminApi.createQuestionAndAddToSection(createQSectionId, payload);
      setIsCreateQuestionOpen(false);
      await loadAssessment();
    } catch (err) {
      alert(err.message || 'Failed to create and add question');
    } finally {
      setCreateQSaving(false);
    }
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    try {
      const finalDuration = sectionFormData.duration_minutes !== '' && sectionFormData.duration_minutes !== null && sectionFormData.duration_minutes !== undefined
        ? parseInt(sectionFormData.duration_minutes, 10)
        : null;
      const payload = {
        ...sectionFormData,
        instructions: sectionFormData.instructions?.trim() || null,
        duration_minutes: finalDuration,
        marks_per_question: parseFloat(sectionFormData.marks_per_question) || 1.0,
        negative_marks_per_question: parseFloat(sectionFormData.negative_marks_per_question) || 0.0,
      };
      if (editingSection) {
        await adminApi.updateAssessmentSection(editingSection.id, payload);
      } else {
        await adminApi.createAssessmentSection(assessment?.id || assessmentId, {
          ...payload,
          section_order: assessment?.sections?.length || 0,
        });
      }
      setIsAddSectionOpen(false);
      setEditingSection(null);
      await loadAssessment();
    } catch (err) {
      alert('Failed to save section: ' + (err.message || err));
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Are you sure you want to delete this entire section and its question mappings?')) return;
    try {
      await adminApi.deleteAssessmentSection(sectionId);
      loadAssessment();
    } catch (err) {
      alert('Failed to delete section: ' + err.message);
    }
  };

  const handleOpenQuestionPicker = async (sectionId) => {
    const sec = (assessment?.sections || []).find((s) => s.id === sectionId);
    if (sec && sec.section_type === 'coding') {
      alert('Cannot add objective questions to a coding-only section.');
      return;
    }
    setActiveSectionId(sectionId);
    setSelectedPickerQuestionIds(new Set());
    setIsQuestionPickerOpen(true);
    try {
      setPickerLoading(true);
      const res = await adminApi.getAssessmentQuestions({ limit: 50 });
      setPickerQuestions(res.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPickerLoading(false);
    }
  };

  const handleSearchPicker = async () => {
    try {
      setPickerLoading(true);
      const res = await adminApi.getAssessmentQuestions({
        search: pickerSearch.trim() || undefined,
        category: pickerCategory !== 'all' ? pickerCategory : undefined,
        limit: 50,
      });
      setPickerQuestions(res.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPickerLoading(false);
    }
  };

  const handleAddQuestion = async (qId) => {
    if (!activeSectionId || addingQuestionId) return;
    try {
      setAddingQuestionId(qId);
      await adminApi.addQuestionToSection(activeSectionId, { question_id: qId });
      await loadAssessment();
    } catch (err) {
      alert(err.message || 'Failed to add question');
    } finally {
      setAddingQuestionId(null);
    }
  };

  const togglePickerQuestion = (qId) => {
    setSelectedPickerQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const toggleSelectAllQuestions = () => {
    const unadded = pickerQuestions.filter((q) => !existingQuestionIds.has(q.id));
    if (selectedPickerQuestionIds.size === unadded.length) {
      setSelectedPickerQuestionIds(new Set());
    } else {
      setSelectedPickerQuestionIds(new Set(unadded.map((q) => q.id)));
    }
  };

  const handleBatchAddQuestions = async () => {
    if (!activeSectionId || selectedPickerQuestionIds.size === 0 || batchAddingQuestions) return;
    try {
      setBatchAddingQuestions(true);
      await adminApi.addQuestionToSection(activeSectionId, {
        question_ids: Array.from(selectedPickerQuestionIds),
      });
      setSelectedPickerQuestionIds(new Set());
      await loadAssessment();
    } catch (err) {
      alert(err.message || 'Failed to import selected questions');
    } finally {
      setBatchAddingQuestions(false);
    }
  };

  const handleOpenProblemPicker = async (sectionId) => {
    const sec = (assessment?.sections || []).find((s) => s.id === sectionId);
    if (sec && sec.section_type === 'objective') {
      alert('Cannot add coding problems to an objective-only section.');
      return;
    }
    setActiveSectionId(sectionId);
    setSelectedPickerProblemIds(new Set());
    setIsProblemPickerOpen(true);
    setProblemPickerSearch('');
    setProblemPickerDifficulty('all');
    try {
      setProblemPickerLoading(true);
      const res = await adminApi.getProblems({ limit: 100 });
      const problemsList = res.data || res.problems || (Array.isArray(res) ? res : []);
      setPickerProblems(problemsList);
    } catch (err) {
      console.error('Failed to load coding problems', err);
      setPickerProblems([]);
    } finally {
      setProblemPickerLoading(false);
    }
  };

  const handleSearchProblemPicker = async (searchVal, diffVal) => {
    try {
      setProblemPickerLoading(true);
      const querySearch = searchVal !== undefined ? searchVal : problemPickerSearch;
      const queryDiff = diffVal !== undefined ? diffVal : problemPickerDifficulty;
      const params = { limit: 100 };
      if (querySearch?.trim()) params.search = querySearch.trim();
      if (queryDiff && queryDiff !== 'all') params.difficulty = queryDiff;
      const res = await adminApi.getProblems(params);
      const problemsList = res.data || res.problems || (Array.isArray(res) ? res : []);
      setPickerProblems(problemsList);
    } catch (err) {
      console.error('Failed to search coding problems', err);
      setPickerProblems([]);
    } finally {
      setProblemPickerLoading(false);
    }
  };

  const handleAddProblem = async (problemId) => {
    if (addingProblemId) return;
    if (!activeSectionId) {
      alert('Please select a section first.');
      return;
    }
    try {
      setAddingProblemId(problemId);
      await adminApi.addQuestionToSection(activeSectionId, {
        problem_id: problemId,
        marks_override: parseFloat(problemMarksOverride) || 10.0,
        negative_marks_override: 0.0,
      });
      await loadAssessment();
    } catch (err) {
      console.error('Failed to add coding problem', err);
      alert(err.message || 'Failed to add coding problem');
    } finally {
      setAddingProblemId(null);
    }
  };

  const togglePickerProblem = (pId) => {
    setSelectedPickerProblemIds((prev) => {
      const next = new Set(prev);
      if (next.has(pId)) next.delete(pId);
      else next.add(pId);
      return next;
    });
  };

  const toggleSelectAllProblems = () => {
    const unadded = pickerProblems.filter((p) => !existingProblemIds.has(p.id));
    if (selectedPickerProblemIds.size === unadded.length) {
      setSelectedPickerProblemIds(new Set());
    } else {
      setSelectedPickerProblemIds(new Set(unadded.map((p) => p.id)));
    }
  };

  const handleBatchAddProblems = async () => {
    if (!activeSectionId || selectedPickerProblemIds.size === 0 || batchAddingProblems) return;
    try {
      setBatchAddingProblems(true);
      await adminApi.addQuestionToSection(activeSectionId, {
        problem_ids: Array.from(selectedPickerProblemIds),
        marks_override: parseFloat(problemMarksOverride) || 10.0,
      });
      setSelectedPickerProblemIds(new Set());
      await loadAssessment();
    } catch (err) {
      alert(err.message || 'Failed to import selected coding problems');
    } finally {
      setBatchAddingProblems(false);
    }
  };

  const handleRemoveQuestion = async (mappingId) => {
    try {
      await adminApi.removeQuestionFromSection(mappingId);
      loadAssessment();
    } catch (err) {
      alert('Failed to remove: ' + err.message);
    }
  };

  const handleOpenRandomModal = (sectionId) => {
    const sec = (assessment?.sections || []).find((s) => s.id === sectionId);
    if (sec && sec.section_type === 'coding') {
      alert('Cannot populate objective questions in a coding-only section.');
      return;
    }
    setActiveSectionId(sectionId);
    setRandomForm({
      category: 'Quantitative Aptitude',
      topic: 'all',
      difficulty: 'all',
      count: 5,
      marks_override: '',
      negative_marks_override: '',
    });
    setIsRandomModalOpen(true);
  };

  const handleExecuteRandomPopulate = async (e) => {
    e.preventDefault();
    try {
      const res = await adminApi.populateRandomQuestions(activeSectionId, {
        category: randomForm.category !== 'all' ? randomForm.category : undefined,
        topic: randomForm.topic !== 'all' ? randomForm.topic : undefined,
        difficulty: randomForm.difficulty !== 'all' ? randomForm.difficulty : undefined,
        count: parseInt(randomForm.count, 10),
        marks_override: randomForm.marks_override ? parseFloat(randomForm.marks_override) : undefined,
        negative_marks_override: randomForm.negative_marks_override ? parseFloat(randomForm.negative_marks_override) : undefined,
      });
      alert(res.message);
      setIsRandomModalOpen(false);
      loadAssessment();
    } catch (err) {
      alert(err.message || 'Failed to populate random questions');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-[var(--text-muted)]">Loading assessment builder...</div>;
  }

  if (error || !assessment) {
    return (
      <div className="p-12 text-center text-rose-700 dark:text-rose-400 font-semibold">
        <p>{error || 'Assessment not found'}</p>
        <Link href="/admin/assessments" className="mt-4 inline-block text-sm text-[var(--kc-accent)] hover:underline">
          Return to Assessments
        </Link>
      </div>
    );
  }

  const sections = assessment.sections || [];
  const totalQuestions = sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
  const currentActiveSection = sections.find((s) => s.id === activeSectionId);
  const existingProblemIds = new Set(
    (currentActiveSection?.questions || []).map((q) => q.problem_id).filter(Boolean)
  );
  const existingQuestionIds = new Set(
    (currentActiveSection?.questions || []).map((q) => q.question_id).filter(Boolean)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
        <Link
          href="/admin/assessments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Assessments</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
            <CheckCircle2 size={13} />
            <span>All changes saved</span>
          </div>

          {assessment.results_released_at ? (
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-300">
              ✓ Results Released
            </span>
          ) : (
            <button
              type="button"
              onClick={handleReleaseResults}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25 active:scale-95 cursor-pointer transition-all"
              title="Release results and scores to all participating students"
            >
              📢 Release Results
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              assessment.status === 'Published'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 active:scale-95'
                : 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 active:scale-95'
            }`}
          >
            {assessment.status === 'Published' ? '✓ Published (Click to Unpublish)' : '● Draft (Click to Publish)'}
          </button>
        </div>
      </div>

      {/* Assessment Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[var(--kc-accent)]/20">
                {assessment.category}
              </span>
              <span className="text-xs text-[var(--text-muted)]">Slug: /{assessment.slug}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {assessment.title}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-3xl">
              {assessment.description || 'No description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenEditSettings}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-default)] text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <Settings size={14} />
              <span>Edit Settings</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddSection}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)] active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Section</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--border-default)]/60 text-center">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Total Duration</div>
            <div className="text-lg font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1.5">
              <Clock size={16} className="text-[var(--kc-accent)]" />
              <span>{assessment.duration_minutes} Minutes</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Sections Count</div>
            <div className="text-lg font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1.5">
              <Layers size={16} className="text-emerald-500" />
              <span>{sections.length} Sections</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Total Questions</div>
            <div className="text-lg font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1.5">
              <FileText size={16} className="text-amber-500" />
              <span>{totalQuestions} Questions</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Maximum Marks</div>
            <div className="text-lg font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1.5">
              <Award size={16} className="text-purple-500" />
              <span>{assessment.total_marks} Marks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-[var(--border-default)]">
        <button
          type="button"
          onClick={() => setActiveTab('builder')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'builder'
              ? 'border-[var(--kc-accent)] text-[var(--kc-accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Section & Question Builder
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'preview'
              ? 'border-[var(--kc-accent)] text-[var(--kc-accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Student Preview Mode
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('attempts')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'attempts'
              ? 'border-[var(--kc-accent)] text-[var(--kc-accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Candidate Attempts ({attempts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'assignments'
              ? 'border-[var(--kc-accent)] text-[var(--kc-accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Target Cohorts & Eligibility ({assignments.length})
        </button>
      </div>

      {/* TAB 1: SECTION & QUESTION BUILDER */}
      {activeTab === 'builder' && (
        <div className="space-y-6">
          {sections.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-secondary)]">
              <Layers size={36} className="mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-base font-medium text-[var(--text-primary)]">No sections created in this assessment yet</p>
              <p className="text-sm mt-1">Add sections like Quantitative Aptitude, Logical Reasoning, or DSA Coding.</p>
              <button
                type="button"
                onClick={handleOpenAddSection}
                className="mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)] cursor-pointer"
              >
                Add First Section
              </button>
            </div>
          ) : (
            sections.map((sec, secIdx) => {
              const secQuestions = sec.questions || [];
              const isCoding = sec.section_type === 'coding';
              return (
                <div
                  key={sec.id}
                  data-testid={`section-card-${secIdx}`}
                  data-section-type={sec.section_type}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-5 shadow-sm space-y-4"
                >
                  {/* Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-default)]/60 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold font-mono text-[var(--kc-accent)]">
                        {secIdx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            {sec.title}
                          </h2>
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              sec.section_type === 'coding'
                                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                                : sec.section_type === 'mixed'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                            }`}
                          >
                            {sec.section_type === 'coding' ? 'DSA Coding' : sec.section_type === 'mixed' ? 'Mixed (MCQ + Code)' : 'Objective'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {sec.description || 'Configured with marks: +' + sec.marks_per_question + ' / -' + sec.negative_marks_per_question}
                        </p>
                      </div>
                    </div>

                    {/* Section Tools */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center border border-[var(--border-default)] rounded-lg overflow-hidden bg-[var(--bg-tertiary)]">
                        <button
                          type="button"
                          disabled={secIdx === 0}
                          onClick={() => handleMoveSection(secIdx, 'up')}
                          className="p-1.5 hover:bg-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                          title="Move Section Up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <div className="w-[1px] h-4 bg-[var(--border-default)]" />
                        <button
                          type="button"
                          disabled={secIdx === sections.length - 1}
                          onClick={() => handleMoveSection(secIdx, 'down')}
                          className="p-1.5 hover:bg-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                          title="Move Section Down"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditSection(sec)}
                        className="p-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                        title="Edit Section Details"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* For objective & mixed sections: Random, Add Question, Create Question */}
                      {sec.section_type !== 'coding' && (
                        <>
                          <button
                            type="button"
                            data-testid={`btn-random-${secIdx}`}
                            onClick={() => handleOpenRandomModal(sec.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-default)] text-[var(--text-primary)] transition-colors cursor-pointer"
                            title="Randomly populate objective questions"
                          >
                            <Sparkles size={13} className="text-amber-500 dark:text-amber-400" />
                            <span>Random</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-add-question-${secIdx}`}
                            onClick={() => handleOpenQuestionPicker(sec.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--kc-accent)]/30 bg-[var(--kc-accent)]/10 text-[var(--kc-accent)] hover:bg-[var(--kc-accent)]/20 transition-colors cursor-pointer"
                            title="Add MCQ / theory question from bank"
                          >
                            <Plus size={13} />
                            <span>Add Question</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-create-question-${secIdx}`}
                            onClick={() => handleOpenCreateQuestion(sec.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)] transition-colors cursor-pointer"
                            title="Create new objective question inline"
                          >
                            <Plus size={13} />
                            <span>Create Question</span>
                          </button>
                        </>
                      )}

                      {/* For coding & mixed sections: Add Coding Problem */}
                      {sec.section_type !== 'objective' && (
                        <button
                          type="button"
                          data-testid={`btn-add-coding-${secIdx}`}
                          onClick={() => handleOpenProblemPicker(sec.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer shadow-sm"
                          title="Add DSA coding problem"
                        >
                          <Code2 size={13} />
                          <span>Add Coding Problem</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSection(sec.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer transition-colors"
                        title="Delete Section"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {secQuestions.length === 0 ? (
                    <div className="py-8 px-4 text-center border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-tertiary)]/20 flex flex-col items-center justify-center gap-3">
                      <p className="text-xs text-[var(--text-muted)]">
                        {sec.section_type === 'objective'
                          ? 'No objective questions in this section yet. Choose an action below to add questions.'
                          : sec.section_type === 'coding'
                          ? 'No coding problems in this section yet. Click below to add algorithmic problems.'
                          : 'No items in this section yet. Choose an action below to add questions or coding problems.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {sec.section_type !== 'coding' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenQuestionPicker(sec.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--kc-accent)]/30 bg-[var(--kc-accent)]/10 text-[var(--kc-accent)] hover:bg-[var(--kc-accent)]/20 transition-colors cursor-pointer"
                            >
                              <Plus size={13} />
                              <span>Add Question (Bank)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenCreateQuestion(sec.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)] transition-colors cursor-pointer"
                            >
                              <Plus size={13} />
                              <span>Create Question</span>
                            </button>
                          </>
                        )}
                        {sec.section_type !== 'objective' && (
                          <button
                            type="button"
                            onClick={() => handleOpenProblemPicker(sec.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-sm cursor-pointer"
                          >
                            <Code2 size={13} />
                            <span>Add Coding Problem</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/30 text-[var(--text-muted)]">
                            <th className="py-2.5 px-3 w-16">Order</th>
                            <th className="py-2.5 px-3">Item Statement / Title</th>
                            <th className="py-2.5 px-3 w-32">Topic</th>
                            <th className="py-2.5 px-3 w-20">Difficulty</th>
                            <th className="py-2.5 px-3 w-28">Marks (+ / -)</th>
                            <th className="py-2.5 px-3 w-28 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                          {secQuestions.map((q, qIdx) => {
                            const isCodeProblem = Boolean(q.problem_id);
                            return (
                              <tr key={q.mapping_id} className="hover:bg-[var(--bg-tertiary)]/20">
                                <td className="py-2 px-3 font-mono text-[var(--text-muted)]">
                                  <div className="flex items-center gap-1">
                                    <span className="w-4">{qIdx + 1}</span>
                                    <div className="flex flex-col">
                                      <button
                                        type="button"
                                        disabled={qIdx === 0}
                                        onClick={() => handleMoveQuestion(sec.id, qIdx, 'up')}
                                        className="p-0.5 hover:text-[var(--text-primary)] disabled:opacity-20 cursor-pointer transition-colors"
                                        title="Move question up"
                                      >
                                        <ChevronUp size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={qIdx === secQuestions.length - 1}
                                        onClick={() => handleMoveQuestion(sec.id, qIdx, 'down')}
                                        className="p-0.5 hover:text-[var(--text-primary)] disabled:opacity-20 cursor-pointer transition-colors"
                                        title="Move question down"
                                      >
                                        <ChevronDown size={11} />
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-medium text-[var(--text-primary)] line-clamp-1">
                                    {isCodeProblem ? q.problem_title : q.question_text}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-[var(--text-muted)]">
                                  {isCodeProblem ? 'DSA' : q.question_topic}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                    {q.question_difficulty || q.problem_difficulty}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[var(--text-primary)]">
                                  +{q.marks_override !== null && q.marks_override !== undefined ? q.marks_override : sec.marks_per_question}
                                  {parseFloat(q.negative_marks_override !== null && q.negative_marks_override !== undefined ? q.negative_marks_override : sec.negative_marks_per_question) > 0 && (
                                    <span className="text-rose-500 ml-1">
                                      -{q.negative_marks_override !== null && q.negative_marks_override !== undefined ? q.negative_marks_override : sec.negative_marks_per_question}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditMarks(q, sec)}
                                      className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-amber-500 cursor-pointer transition-colors"
                                      title="Override Marks"
                                    >
                                      <SlidersHorizontal size={13} />
                                    </button>
                                    {sections.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenMoveQuestion(q, sec.id)}
                                        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-blue-500 cursor-pointer transition-colors"
                                        title="Move to another section"
                                      >
                                        <CornerDownRight size={13} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveQuestion(q.mapping_id)}
                                      className="p-1.5 rounded hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer transition-colors"
                                      title="Remove from section"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: STUDENT PREVIEW MODE */}
      {activeTab === 'preview' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-8 space-y-6">
          <div className="border-b border-[var(--border-default)] pb-4">
            <span className="text-xs font-semibold text-[var(--kc-accent)] uppercase tracking-wider">
              Student Preview Mode
            </span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {assessment.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mt-2">
              <span>Duration: {assessment.duration_minutes} Minutes</span>
              <span>•</span>
              <span>Sections: {sections.length}</span>
              <span>•</span>
              <span>Total Questions: {totalQuestions}</span>
              <span>•</span>
              <span>Total Marks: {assessment.total_marks}</span>
            </div>
          </div>

          <div className="space-y-8">
            {sections.map((sec, sIdx) => (
              <div key={sec.id} className="space-y-4">
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    Section {sIdx + 1}: {sec.title} ({sec.questions?.length || 0} Questions, {sec.total_marks} Marks)
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    +{sec.marks_per_question} / -{sec.negative_marks_per_question} per question
                  </span>
                </div>

                <div className="space-y-4 pl-4 border-l-2 border-[var(--border-default)]">
                  {(sec.questions || []).map((q, qIdx) => {
                    const isCodeProblem = Boolean(q.problem_id);
                    return (
                      <div
                        key={q.mapping_id}
                        className={`p-4 bg-[var(--bg-primary)] rounded-xl border space-y-3 ${
                          isCodeProblem ? 'border-purple-500/20' : 'border-[var(--border-default)]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1.5 flex-1 pr-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-[var(--kc-accent)]">Q{qIdx + 1}.</span>
                              <span className="text-sm font-semibold text-[var(--text-primary)]">
                                {isCodeProblem ? (q.problem_title || 'Algorithmic Problem') : q.question_text}
                              </span>
                              {isCodeProblem ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  DSA Coding
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-default)]">
                                  {q.question_type === 'multiple_choice' ? 'Multiple Choice' : 'Single Choice'}
                                </span>
                              )}
                              {(q.problem_difficulty || q.difficulty) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--border-default)] text-[var(--text-muted)]">
                                  {q.problem_difficulty || q.difficulty}
                                </span>
                              )}
                            </div>

                            {isCodeProblem && (
                              <>
                                {q.problem_slug && (
                                  <div className="text-[11px] text-[var(--text-muted)] font-mono">
                                    Slug: {q.problem_slug}
                                  </div>
                                )}
                                <p className="text-xs text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
                                  {q.problem_description || 'Write, test, and submit your code solution using the built-in IDE.'}
                                </p>
                              </>
                            )}
                          </div>
                          <span className="text-xs font-mono text-[var(--text-muted)] shrink-0 font-semibold">
                            [{q.marks_override || sec.marks_per_question} Marks]
                          </span>
                        </div>

                        {!isCodeProblem && q.options && Array.isArray(q.options) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {q.options.map((opt, optIdx) => {
                              const isObj = typeof opt === 'object' && opt !== null;
                              const optId = isObj ? (opt.id || opt.option || String.fromCharCode(65 + optIdx)) : String.fromCharCode(65 + optIdx);
                              const optText = isObj ? (opt.text ?? opt.value ?? opt.label ?? '') : String(opt);
                              const uniqueKey = `${optId}-${optIdx}`;

                              return (
                                <div
                                  key={uniqueKey}
                                  className="p-2.5 rounded-lg border border-[var(--border-default)] text-xs flex items-center gap-2 text-[var(--text-secondary)]"
                                >
                                  <span className="font-mono uppercase font-semibold text-[var(--text-muted)]">
                                    ({optId})
                                  </span>
                                  <span>{optText}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CANDIDATE ATTEMPTS & ANALYTICS */}
      {activeTab === 'attempts' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Student Assessment Attempts</h3>
              <p className="text-xs text-[var(--text-muted)]">All evaluated student submissions for this assessment.</p>
            </div>
            <button
              type="button"
              onClick={handleOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--kc-accent-subtle)] hover:bg-[var(--kc-accent)]/20 text-[var(--kc-accent)] border border-[var(--kc-accent)]/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download size={14} />
              Export Results (.xlsx / .csv)
            </button>
          </div>

          {attemptsLoading ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading candidate submissions...</div>
          ) : attempts.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)]">No student attempts recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3 text-center">Percentage</th>
                    <th className="py-2.5 px-3 text-center">Correct</th>
                    <th className="py-2.5 px-3 text-center">Incorrect</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Submission Mode</th>
                    <th className="py-2.5 px-3 text-right">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {attempts.map((att) => {
                    const isPassed = att.percentage >= assessment.pass_percentage;
                    return (
                      <tr key={att.id} className="hover:bg-[var(--bg-tertiary)]/20">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[var(--text-primary)]">{att.display_name || att.username}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">{att.email}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono text-[var(--text-primary)]">
                          {att.total_score} / {att.max_marks}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className={isPassed ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-rose-700 dark:text-rose-400'}>
                            {att.percentage}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-mono">{att.correct_count}</td>
                        <td className="py-2.5 px-3 text-center text-rose-700 dark:text-rose-400 font-mono">{att.incorrect_count}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isPassed
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isPassed ? 'PASSED' : 'FAILED'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {att.is_terminated_by_violation ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                              title={att.terminated_reason || att.submission_reason}
                            >
                              <ShieldAlert size={10} />
                              <span>Violation ({att.terminated_reason || att.submission_reason})</span>
                            </span>
                          ) : att.submission_reason === 'timer_expired' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Clock size={10} />
                              <span>Timer Expired</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)] font-mono">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--text-muted)]">
                          {att.submitted_at ? new Date(att.submitted_at).toLocaleString() : 'In Progress'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TARGET COHORTS & ELIGIBILITY */}
      {activeTab === 'assignments' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Assessment Cohort Assignments</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Control which student groups, departments, or academic years within your organization are eligible for this assessment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddAssignmentOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent)]/90 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Assign to Cohort
            </button>
          </div>

          {assignmentsLoading ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-default)] rounded-xl">
              <GraduationCap size={32} className="mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No specific cohort assignments configured</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {assessment.is_public
                  ? 'This assessment is currently public and available to all authenticated platform students.'
                  : 'By default, this assessment is open to all enrolled students of its owning organization. Click "Assign to Cohort" to restrict access to specific departments, years, or cohorts.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    <th className="py-2.5 px-3">Target Scope</th>
                    <th className="py-2.5 px-3">Cohort / Value</th>
                    <th className="py-2.5 px-3 text-center">Attempt Limit Override</th>
                    <th className="py-2.5 px-3">Availability Override</th>
                    <th className="py-2.5 px-3">Assigned At</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {assignments.map((asg) => (
                    <tr key={asg.id} className="hover:bg-[var(--bg-tertiary)]/20">
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[var(--kc-accent)]/20 uppercase">
                          {(asg.target_type || asg.assignment_type || 'all_organization').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                        {asg.target_value ||
                          (asg.target_departments?.length ? asg.target_departments.join(', ') :
                           asg.target_academic_years?.length ? asg.target_academic_years.join(', ') :
                           asg.target_student_ids?.length ? asg.target_student_ids.join(', ') : 'All Institution Students')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {(asg.max_attempts ?? asg.max_attempts_override) ? `${asg.max_attempts ?? asg.max_attempts_override} attempts` : 'Default'}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">
                        {(asg.valid_from || asg.starts_at) ? new Date(asg.valid_from || asg.starts_at).toLocaleDateString() : 'Immediate'} →{' '}
                        {(asg.valid_until || asg.ends_at) ? new Date(asg.valid_until || asg.ends_at).toLocaleDateString() : 'No expiry'}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">
                        {asg.created_at ? new Date(asg.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevokeAssignment(asg.id)}
                          className="px-2 py-1 text-[11px] rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-colors cursor-pointer"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD SECTION */}
      {isAddSectionOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setIsAddSectionOpen(false)}
        >
          <div
            data-testid="add-section-modal"
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {editingSection ? 'Edit Section Settings' : 'Add Assessment Section'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSectionOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Section Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quantitative Aptitude, Logical Reasoning, DSA Coding"
                  value={sectionFormData.title}
                  onChange={(e) => setSectionFormData({ ...sectionFormData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary for this section..."
                  value={sectionFormData.description}
                  onChange={(e) => setSectionFormData({ ...sectionFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Section Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Specific rules or guidelines for this section (e.g. all questions mandatory, no calculators)..."
                  value={sectionFormData.instructions || ''}
                  onChange={(e) => setSectionFormData({ ...sectionFormData, instructions: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Section Type
                  </label>
                  <select
                    value={sectionFormData.section_type}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, section_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="objective">Objective (MCQ / Question Bank)</option>
                    <option value="coding">DSA Coding (Judge Problems)</option>
                    <option value="mixed">Mixed (Objective & Coding)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Duration Limit (Mins, Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="None (inherits total)"
                    value={sectionFormData.duration_minutes}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, duration_minutes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Marks per Question
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={sectionFormData.marks_per_question}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, marks_per_question: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Negative Marks
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={sectionFormData.negative_marks_per_question}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, negative_marks_per_question: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsAddSectionOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)] transition-all cursor-pointer"
                >
                  {editingSection ? 'Save Section Changes' : 'Add Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL QUESTION PICKER */}
      {isQuestionPickerOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setIsQuestionPickerOpen(false)}
        >
          <div
            data-testid="question-bank-modal"
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Select Question from Bank</h3>
              <button
                type="button"
                onClick={() => setIsQuestionPickerOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Search questions..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    adminApi.getAssessmentQuestions({
                      search: e.target.value.trim() || undefined,
                      category: pickerCategory !== 'all' ? pickerCategory : undefined,
                      limit: 50,
                    }).then((r) => setPickerQuestions(r.questions || []));
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
              />
              <select
                value={pickerCategory}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setPickerCategory(newCat);
                  setPickerLoading(true);
                  adminApi.getAssessmentQuestions({
                    search: pickerSearch.trim() || undefined,
                    category: newCat !== 'all' ? newCat : undefined,
                    limit: 50,
                  }).then((r) => setPickerQuestions(r.questions || []))
                    .finally(() => setPickerLoading(false));
                }}
                className="px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                <option value="Logical Reasoning">Logical Reasoning</option>
                <option value="Verbal Ability">Verbal Ability</option>
                <option value="Technical MCQ">Technical MCQ</option>
              </select>
              <button
                type="button"
                onClick={handleSearchPicker}
                className="px-3 py-1.5 text-xs font-semibold bg-[var(--kc-accent)] text-[var(--kc-on-primary)] rounded-lg hover:bg-[var(--kc-accent-hover)] transition-colors cursor-pointer"
              >
                Search
              </button>
            </div>

            <div className="flex items-center justify-between py-1 px-1 text-xs text-[var(--text-muted)] border-b border-[var(--border-default)]">
              <span>{pickerQuestions.length} questions loaded</span>
              {pickerQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllQuestions}
                  className="text-[11px] font-semibold text-[var(--kc-accent)] hover:underline cursor-pointer"
                >
                  {selectedPickerQuestionIds.size > 0 &&
                  selectedPickerQuestionIds.size === pickerQuestions.filter((q) => !existingQuestionIds.has(q.id)).length
                    ? 'Deselect All'
                    : 'Select All Unadded'}
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-default)]">
              {pickerLoading ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">Loading questions...</div>
              ) : pickerQuestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">No questions found.</div>
              ) : (
                pickerQuestions.map((q) => {
                  const isAdded = existingQuestionIds.has(q.id);
                  const isCurrentlyAdding = addingQuestionId === q.id;
                  const isChecked = selectedPickerQuestionIds.has(q.id);
                  return (
                    <div key={q.id} className="py-2.5 px-1 flex items-center justify-between gap-3 hover:bg-[var(--bg-tertiary)]/20 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          disabled={isAdded}
                          checked={isChecked}
                          onChange={() => togglePickerQuestion(q.id)}
                          className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--kc-accent)] focus:ring-0 cursor-pointer disabled:opacity-30 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[var(--text-primary)] line-clamp-2">
                            {q.question_text}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            {q.category} › {q.topic} • {q.difficulty}
                          </div>
                        </div>
                      </div>
                      {isAdded ? (
                        <button
                          type="button"
                          disabled
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-muted)] shrink-0 cursor-not-allowed flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span>Added</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isCurrentlyAdding}
                          onClick={() => handleAddQuestion(q.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)] shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isCurrentlyAdding ? 'Adding…' : 'Add'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
              <span className="text-[11px] text-[var(--text-muted)]">
                {selectedPickerQuestionIds.size > 0
                  ? `${selectedPickerQuestionIds.size} question${selectedPickerQuestionIds.size > 1 ? 's' : ''} selected`
                  : 'Select questions using checkboxes or click Add.'}
              </span>
              <div className="flex items-center gap-2">
                {selectedPickerQuestionIds.size > 0 && (
                  <button
                    type="button"
                    disabled={batchAddingQuestions}
                    onClick={handleBatchAddQuestions}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {batchAddingQuestions ? 'Importing…' : `Import Selected (${selectedPickerQuestionIds.size})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsQuestionPickerOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CODING PROBLEM PICKER */}
      {isProblemPickerOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setIsProblemPickerOpen(false)}
        >
          <div
            data-testid="coding-problem-modal"
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <Code2 size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Select DSA Coding Problem</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Select algorithmic problems from the question bank to evaluate coding skills.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProblemPickerOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search & Difficulty Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search problems by title or slug..."
                  value={problemPickerSearch}
                  onChange={(e) => setProblemPickerSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchProblemPicker(e.target.value, problemPickerDifficulty);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <select
                value={problemPickerDifficulty}
                onChange={(e) => {
                  const nextDiff = e.target.value;
                  setProblemPickerDifficulty(nextDiff);
                  handleSearchProblemPicker(problemPickerSearch, nextDiff);
                }}
                className="px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
              >
                <option value="all">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl">
                <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">Marks:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={problemMarksOverride}
                  onChange={(e) => setProblemMarksOverride(e.target.value)}
                  className="w-12 py-1 text-xs bg-transparent text-[var(--text-primary)] font-bold text-center focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSearchProblemPicker(problemPickerSearch, problemPickerDifficulty)}
                className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors shadow-sm shrink-0 cursor-pointer"
              >
                Search
              </button>
            </div>

            <div className="flex items-center justify-between py-1 px-1 text-xs text-[var(--text-muted)] border-b border-[var(--border-default)]">
              <span>{pickerProblems.length} problems available</span>
              {pickerProblems.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllProblems}
                  className="text-[11px] font-semibold text-purple-400 hover:underline cursor-pointer"
                >
                  {selectedPickerProblemIds.size > 0 &&
                  selectedPickerProblemIds.size === pickerProblems.filter((p) => !existingProblemIds.has(p.id)).length
                    ? 'Deselect All'
                    : 'Select All Unadded'}
                </button>
              )}
            </div>

            {/* Problems List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-default)]/60 pr-1 min-h-[220px]">
              {problemPickerLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] gap-2">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading available coding problems...</span>
                </div>
              ) : pickerProblems.length === 0 ? (
                <div className="py-16 text-center text-xs text-[var(--text-muted)] space-y-2">
                  <Code2 size={28} className="mx-auto text-[var(--text-muted)] opacity-40" />
                  <p className="font-semibold text-[var(--text-secondary)] text-sm">No coding problems found</p>
                  <p className="text-xs">Try searching with different keywords or clearing difficulty filters.</p>
                </div>
              ) : (
                pickerProblems.map((p) => {
                  const isAlreadyAdded = existingProblemIds.has(p.id);
                  const isChecked = selectedPickerProblemIds.has(p.id);
                  const diffBadgeClass =
                    p.difficulty === 'Easy'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : p.difficulty === 'Hard'
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';

                  return (
                    <div
                      key={p.id}
                      className="py-3 px-3 flex items-center justify-between gap-3 hover:bg-[var(--bg-tertiary)]/40 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          disabled={isAlreadyAdded}
                          checked={isChecked}
                          onChange={() => togglePickerProblem(p.id)}
                          className="w-4 h-4 rounded border-[var(--border-default)] text-purple-600 focus:ring-0 cursor-pointer disabled:opacity-30 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {p.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${diffBadgeClass}`}>
                              {p.difficulty || 'Medium'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1 font-mono">
                            <span>slug: {p.slug}</span>
                            {p.test_count !== undefined && (
                              <span>• {p.test_count} tests</span>
                            )}
                            {p.status && (
                              <span className="text-[11px] capitalize">• {p.status}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isAlreadyAdded ? (
                        <button
                          type="button"
                          disabled
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-muted)] cursor-not-allowed flex items-center gap-1.5 shrink-0"
                        >
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span>Added</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={addingProblemId === p.id}
                          onClick={() => handleAddProblem(p.id)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          {addingProblemId === p.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Adding...</span>
                            </>
                          ) : (
                            <>
                              <Plus size={13} strokeWidth={2.5} />
                              <span>Add Problem</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>
                {selectedPickerProblemIds.size > 0
                  ? `${selectedPickerProblemIds.size} problem${selectedPickerProblemIds.size > 1 ? 's' : ''} selected`
                  : 'Select problems using checkboxes or click Add Problem.'}
              </span>
              <div className="flex items-center gap-2">
                {selectedPickerProblemIds.size > 0 && (
                  <button
                    type="button"
                    disabled={batchAddingProblems}
                    onClick={handleBatchAddProblems}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    {batchAddingProblems ? 'Importing…' : `Import Selected (${selectedPickerProblemIds.size})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsProblemPickerOpen(false)}
                  className="px-3 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RANDOM POPULATE TOOL */}
      {isRandomModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setIsRandomModalOpen(false)}
        >
          <div
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Sparkles size={18} />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Random Question Generator</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRandomModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Pick questions at random from the 250+ question bank matching your criteria.
            </p>

            <form onSubmit={handleExecuteRandomPopulate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <select
                  value={randomForm.category}
                  onChange={(e) => setRandomForm({ ...randomForm, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="all">Any Category</option>
                  <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                  <option value="Logical Reasoning">Logical Reasoning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Topic (Optional)
                </label>
                <select
                  value={randomForm.topic}
                  onChange={(e) => setRandomForm({ ...randomForm, topic: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="all">All Topics in Category</option>
                  <option value="Unit Digit">Unit Digit</option>
                  <option value="Last Two Digits">Last Two Digits</option>
                  <option value="Factors">Factors</option>
                  <option value="Remainder Theorem">Remainder Theorem</option>
                  <option value="Number of Zeros">Number of Zeros</option>
                  <option value="HCF & LCM">HCF & LCM</option>
                  <option value="Direction and Sense">Direction and Sense</option>
                  <option value="Clock">Clock</option>
                  <option value="Calendar">Calendar</option>
                  <option value="Time and Work, Pipe and Cistern">Time and Work, Pipe and Cistern</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Question Count *
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={randomForm.count}
                  onChange={(e) => setRandomForm({ ...randomForm, count: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsRandomModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 transition-colors cursor-pointer"
                >
                  Populate Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN COHORT */}
      {isAddAssignmentOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setIsAddAssignmentOpen(false)}
        >
          <div
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Assign Assessment to Cohort</h3>
              <button
                type="button"
                onClick={() => setIsAddAssignmentOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Target Scope *
                </label>
                <select
                  value={assignmentFormData.target_type}
                  onChange={(e) => setAssignmentFormData({ ...assignmentFormData, target_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                >
                  <option value="all_organization_students">All Organization Students</option>
                  <option value="department">Specific Department</option>
                  <option value="academic_year">Specific Academic Year</option>
                  <option value="cohort">Named Cohort / Batch</option>
                  <option value="specific_students">Specific Student IDs</option>
                </select>
              </div>

              {assignmentFormData.target_type !== 'all_organization_students' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    {assignmentFormData.target_type === 'department' && 'Department Name (e.g. Computer Science)'}
                    {assignmentFormData.target_type === 'academic_year' && 'Academic Year (e.g. 2025, 2026, 4th Year)'}
                    {assignmentFormData.target_type === 'cohort' && 'Cohort Name (e.g. Honors CS 2026)'}
                    {assignmentFormData.target_type === 'specific_students' && 'Comma-Separated Student IDs (e.g. CS101, CS102)'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter target identifier..."
                    value={assignmentFormData.target_value}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, target_value: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Attempt Limit Override (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Leave blank to use assessment default"
                  value={assignmentFormData.max_attempts}
                  onChange={(e) => setAssignmentFormData({ ...assignmentFormData, max_attempts: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Valid From (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={assignmentFormData.valid_from}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, valid_from: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Valid Until (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={assignmentFormData.valid_until}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, valid_until: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsAddAssignmentOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignmentSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent)]/90 text-white transition-colors cursor-pointer"
                >
                  {assignmentSubmitting ? 'Assigning…' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXPORT ASSESSMENT RESULTS */}
      {isExportOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setIsExportOpen(false)}
        >
          <div
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-[var(--kc-accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Export Assessment Results</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filters */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Export Format *
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] font-semibold"
                  >
                    <option value="xlsx">Excel Workbook (.xlsx)</option>
                    <option value="csv">Comma-Separated (.csv)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Attempt Status Filter
                  </label>
                  <select
                    value={exportFilters.status}
                    onChange={(e) => handleFilterExport({ ...exportFilters, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  >
                    <option value="">All Evaluated Attempts</option>
                    <option value="completed">Completed Only</option>
                    <option value="in_progress">In-Progress Only</option>
                  </select>
                </div>
              </div>

              {/* Statistics Preview Card */}
              {exportPreviewLoading ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">Calculating export statistics...</div>
              ) : exportPreview?.summary ? (
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-default)] space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Report Preview Summary
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)]">
                      <div className="text-lg font-bold text-[var(--text-primary)]">
                        {exportPreview.summary.totalAttempts ?? 0}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">Total Attempts</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)]">
                      <div className="text-lg font-bold text-[var(--kc-accent)]">
                        {exportPreview.summary.averageScore ?? 0}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">Avg Score</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)]">
                      <div className="text-lg font-bold text-emerald-500">
                        {exportPreview.summary.passRate ?? 0}%
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">Pass Rate</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] pt-1">
                    Protected against spreadsheet formula injection (`=`, `+`, `-`, `@` escaped). Scoped strictly to your organization.
                  </div>
                </div>
              ) : null}

              {/* Past export history summary */}
              {exportHistory.length > 0 && (
                <div className="pt-2 text-[11px] text-[var(--text-muted)]">
                  <span>Last exported: {new Date(exportHistory[0].created_at).toLocaleString()} by {exportHistory[0].admin_username || 'Admin'} ({exportHistory[0].record_count} records)</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsExportOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDownloadExport}
                  disabled={exportDownloading || !exportPreview?.summary?.totalAttempts}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent)]/90 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} />
                  {exportDownloading ? 'Generating Report…' : `Download .${exportFormat.toUpperCase()} Report`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSESSMENT SETTINGS */}
      {isEditSettingsOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setIsEditSettingsOpen(false)}
        >
          <div
            data-testid="edit-settings-modal"
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-[var(--kc-accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Edit Assessment Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditSettingsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Assessment Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsFormData.title}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Custom Slug (URL Identifier)
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.slug}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, slug: e.target.value })}
                    placeholder="e.g. tech-placement-mock-2026"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Category *
                  </label>
                  <select
                    value={settingsFormData.category}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="Placement">Placement</option>
                    <option value="Coding Contest">Coding Contest</option>
                    <option value="Aptitude Assessment">Aptitude Assessment</option>
                    <option value="Semester Exam">Semester Exam</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    required
                    value={settingsFormData.duration_minutes}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, duration_minutes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Pass Percentage (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={settingsFormData.pass_percentage}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, pass_percentage: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Max Attempts Per Candidate
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={settingsFormData.max_attempts}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, max_attempts: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Schedule Starts At (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={settingsFormData.starts_at}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, starts_at: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Schedule Ends At (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={settingsFormData.ends_at}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, ends_at: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={2}
                    value={settingsFormData.description}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, description: e.target.value })}
                    placeholder="Brief description of the assessment goals..."
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Instructions for Students
                  </label>
                  <textarea
                    rows={3}
                    value={settingsFormData.instructions}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, instructions: e.target.value })}
                    placeholder="Instructions shown before candidates start the test..."
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-3 p-3 bg-[var(--bg-tertiary)]/50 rounded-xl border border-[var(--border-default)]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsFormData.randomize_questions}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, randomize_questions: e.target.checked })}
                      className="rounded border-[var(--border-default)]"
                    />
                    <span className="text-xs text-[var(--text-primary)]">Randomize Questions Order</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsFormData.randomize_options}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, randomize_options: e.target.checked })}
                      className="rounded border-[var(--border-default)]"
                    />
                    <span className="text-xs text-[var(--text-primary)]">Randomize MCQ Options</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsFormData.default_negative_marking}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, default_negative_marking: e.target.checked })}
                      className="rounded border-[var(--border-default)]"
                    />
                    <span className="text-xs text-[var(--text-primary)]">Apply Negative Marking</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsFormData.show_results_immediately}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, show_results_immediately: e.target.checked })}
                      className="rounded border-[var(--border-default)]"
                    />
                    <span className="text-xs text-[var(--text-primary)]">Show Results Immediately</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsFormData.is_public}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, is_public: e.target.checked, target_audience: e.target.checked ? 'public' : 'organization' })}
                      className="rounded border-[var(--border-default)]"
                    />
                    <span className="text-xs text-[var(--text-primary)]">Publicly Accessible to All Students</span>
                  </label>
                </div>

                {/* Strict Secure Assessment Mode & Configurable Violation Policy */}
                <div className="md:col-span-2 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-700 dark:text-amber-300">
                    <input
                      type="checkbox"
                      checked={settingsFormData.is_secure_mode}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, is_secure_mode: e.target.checked })}
                      className="rounded border-amber-500/40"
                    />
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400" />
                      <span>Strict Secure Assessment Mode (Anti-Cheating & Fullscreen)</span>
                    </span>
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)] pl-5 leading-relaxed">
                    Mandates browser full-screen, blocks clipboard actions on questions, and automatically submits the attempt if the student leaves full-screen or switches tabs.
                  </p>

                  {settingsFormData.is_secure_mode && (
                    <div className="pt-2.5 border-t border-amber-500/20 space-y-3 pl-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-primary)] mb-1">
                            Violation Threshold (Strikes Before Auto-Submit)
                          </label>
                          <select
                            value={settingsFormData.max_violations}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, max_violations: parseInt(e.target.value, 10) || 1 })}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                          >
                            <option value={1}>1 Strike (Zero-Tolerance: Immediate Submission)</option>
                            <option value={2}>2 Strikes (1 Warning Allowed)</option>
                            <option value={3}>3 Strikes (2 Warnings Allowed)</option>
                            <option value={4}>4 Strikes (3 Warnings Allowed)</option>
                            <option value={5}>5 Strikes (4 Warnings Allowed)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)]">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settingsFormData.require_fullscreen}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, require_fullscreen: e.target.checked })}
                            className="rounded border-amber-500/40"
                          />
                          <span>Mandate Full-Screen Mode</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settingsFormData.prevent_tab_switch}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, prevent_tab_switch: e.target.checked })}
                            className="rounded border-amber-500/40"
                          />
                          <span>Prevent Tab Switching / Blur</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settingsFormData.prevent_clipboard}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, prevent_clipboard: e.target.checked })}
                            className="rounded border-amber-500/40"
                          />
                          <span>Restrict Copy / Paste on Questions</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settingsFormData.prevent_navigation}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, prevent_navigation: e.target.checked })}
                            className="rounded border-amber-500/40"
                          />
                          <span>Block Browser Back & Leaving</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={settingsFormData.auto_submit_on_violation}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, auto_submit_on_violation: e.target.checked })}
                            className="rounded border-amber-500/40"
                          />
                          <span>Automatically Submit Attempt on Threshold Reached</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsEditSettingsOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent)]/90 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {settingsSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT QUESTION MARKS OVERRIDE */}
      {isEditMarksOpen && editingMapping && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setIsEditMarksOpen(false)}
        >
          <div
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-amber-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Question Marks</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditMarksOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Override marks for this item in this assessment without altering the master question bank:
            </p>

            <form onSubmit={handleSaveMarksOverride} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Marks Awarded (+) *
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="100"
                  required
                  value={marksFormData.marks_override}
                  onChange={(e) => setMarksFormData({ ...marksFormData, marks_override: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Negative Marks Penalty (-)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="50"
                  value={marksFormData.negative_marks_override}
                  onChange={(e) => setMarksFormData({ ...marksFormData, negative_marks_override: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsEditMarksOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={marksSaving}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent)]/90 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {marksSaving ? 'Saving…' : 'Update Marks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVE QUESTION TO ANOTHER SECTION */}
      {isMoveQuestionOpen && movingMapping && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setIsMoveQuestionOpen(false)}
        >
          <div
            data-testid="move-question-modal"
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div className="flex items-center gap-2">
                <CornerDownRight size={16} className="text-blue-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Move Question</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMoveQuestionOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Move this question to a different section in this assessment:
            </p>

            <form onSubmit={handleConfirmMoveQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Destination Section *
                </label>
                <select
                  required
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer"
                >
                  {(assessment.sections || [])
                    .filter((s) => s.id !== movingMapping.currentSecId)
                    .map((s) => {
                      const isCodingProblem = Boolean(movingMapping.problem_id);
                      const isIncompatible = isCodingProblem ? s.section_type === 'objective' : s.section_type === 'coding';
                      return (
                        <option key={s.id} value={s.id} disabled={isIncompatible}>
                          {s.title} ({s.section_type}){isIncompatible ? ' — Incompatible' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsMoveQuestionOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={moveSaving}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {moveSaving ? 'Moving…' : 'Move to Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE QUESTION DIRECTLY IN SECTION */}
      {isCreateQuestionOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setIsCreateQuestionOpen(false)}
        >
          <div
            data-testid="create-question-modal"
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-[var(--kc-accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Create Question in Section</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateQuestionOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCreateQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Question Type *
                  </label>
                  <select
                    value={newQuestionForm.question_type}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="single_choice">Single Choice</option>
                    <option value="multiple_choice">Multiple Choice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Category *
                  </label>
                  <select
                    value={newQuestionForm.category}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                    <option value="Logical Reasoning">Logical Reasoning</option>
                    <option value="Verbal Ability">Verbal Ability</option>
                    <option value="Technical MCQ">Technical MCQ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Topic *
                  </label>
                  <input
                    type="text"
                    required
                    value={newQuestionForm.topic}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, topic: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Difficulty *
                  </label>
                  <select
                    value={newQuestionForm.difficulty}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Question Text / Statement *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter the question statement..."
                  value={newQuestionForm.question_text}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question_text: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Answer Options *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center font-bold text-[var(--kc-accent)]">A</span>
                    <input
                      type="text"
                      required
                      placeholder="Option A"
                      value={newQuestionForm.optionA}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, optionA: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center font-bold text-[var(--kc-accent)]">B</span>
                    <input
                      type="text"
                      required
                      placeholder="Option B"
                      value={newQuestionForm.optionB}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, optionB: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center font-bold text-[var(--kc-accent)]">C</span>
                    <input
                      type="text"
                      placeholder="Option C (Optional)"
                      value={newQuestionForm.optionC}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, optionC: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center font-bold text-[var(--kc-accent)]">D</span>
                    <input
                      type="text"
                      placeholder="Option D (Optional)"
                      value={newQuestionForm.optionD}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, optionD: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>

              {newQuestionForm.question_type === 'multiple_choice' ? (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Correct Options (Select all that apply) *
                  </label>
                  <div className="flex items-center gap-4 py-1">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const hasOptionText =
                        letter === 'A' ? newQuestionForm.optionA?.trim() :
                        letter === 'B' ? newQuestionForm.optionB?.trim() :
                        letter === 'C' ? newQuestionForm.optionC?.trim() :
                        newQuestionForm.optionD?.trim();
                      if (!hasOptionText && (letter === 'C' || letter === 'D')) return null;
                      const isChecked = (newQuestionForm.correct_answers_multi || []).includes(letter);
                      return (
                        <label key={letter} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const cur = newQuestionForm.correct_answers_multi || [];
                              const next = cur.includes(letter)
                                ? cur.filter((x) => x !== letter)
                                : [...cur, letter];
                              setNewQuestionForm({ ...newQuestionForm, correct_answers_multi: next });
                            }}
                            className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--kc-accent)] focus:ring-0 cursor-pointer"
                          />
                          <span>Option {letter}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Correct Option *
                    </label>
                    <select
                      value={newQuestionForm.correct_answer}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, correct_answer: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer font-bold"
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      {newQuestionForm.optionC?.trim() && <option value="C">Option C</option>}
                      {newQuestionForm.optionD?.trim() && <option value="D">Option D</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Custom Marks (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      placeholder="Default from section"
                      value={newQuestionForm.marks_override}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, marks_override: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Negative Marks (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder="Default from section"
                      value={newQuestionForm.negative_marks_override}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, negative_marks_override: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              )}

              {newQuestionForm.question_type === 'multiple_choice' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Custom Marks (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      placeholder="Default from section"
                      value={newQuestionForm.marks_override}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, marks_override: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Negative Marks (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder="Default from section"
                      value={newQuestionForm.negative_marks_override}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, negative_marks_override: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Tags (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arrays, Sorting, QuickSort"
                  value={newQuestionForm.tags || ''}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, tags: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Explanation / Solution (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Explanation shown to students after evaluation..."
                  value={newQuestionForm.explanation}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, explanation: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsCreateQuestionOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createQSaving}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent)]/90 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {createQSaving ? 'Creating…' : 'Create & Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH INTEGRITY VALIDATION FAILURES */}
      {validationModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setValidationModalOpen(false)}
        >
          <div
            className="bg-[var(--bg-secondary)] border border-rose-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-500 border-b border-[var(--border-default)] pb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Pre-Publish Validation Failed</h3>
                <p className="text-xs text-rose-400">Please resolve the following before publishing</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-[var(--text-muted)]">
                The assessment cannot be made available to candidates until all structural requirements are met:
              </p>
              <ul className="space-y-2 py-2">
                {validationIssues.map((issue, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300"
                  >
                    <span className="font-bold">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setValidationModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--border-default)] text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Review & Fix in Builder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

