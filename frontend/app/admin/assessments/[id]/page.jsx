'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '../../../../lib/adminApi';
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
  ChevronUp
} from 'lucide-react';

export default function AssessmentBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params?.id;

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('builder'); // 'builder' | 'preview' | 'attempts'

  // Modals
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionFormData, setSectionFormData] = useState({
    title: '',
    description: '',
    section_type: 'objective',
    duration_minutes: '',
    marks_per_question: 1.0,
    negative_marks_per_question: 0.25,
  });

  // Manual Question Picker Modal
  const [isQuestionPickerOpen, setIsQuestionPickerOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [pickerQuestions, setPickerQuestions] = useState([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');
  const [pickerLoading, setPickerLoading] = useState(false);

  // Coding Problem Picker Modal
  const [isProblemPickerOpen, setIsProblemPickerOpen] = useState(false);
  const [pickerProblems, setPickerProblems] = useState([]);
  const [problemPickerSearch, setProblemPickerSearch] = useState('');
  const [problemPickerDifficulty, setProblemPickerDifficulty] = useState('all');
  const [problemPickerLoading, setProblemPickerLoading] = useState(false);
  const [addingProblemId, setAddingProblemId] = useState(null);

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

  useEffect(() => {
    if (assessmentId) loadAssessment(true);
  }, [assessmentId, loadAssessment]);

  // Load candidate attempts when switching to attempts tab
  useEffect(() => {
    if (activeTab === 'attempts' && assessmentId) {
      setAttemptsLoading(true);
      adminApi.getAssessmentAttempts(assessmentId)
        .then((res) => setAttempts(res.attempts || []))
        .catch((err) => console.error('Failed to load attempts', err))
        .finally(() => setAttemptsLoading(false));
    }
  }, [activeTab, assessmentId]);

  // Global escape key to close any active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAddSectionOpen(false);
        setIsQuestionPickerOpen(false);
        setIsProblemPickerOpen(false);
        setIsRandomModalOpen(false);
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
      alert(err.message || 'Failed to update publication status');
    }
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    try {
      if (editingSection) {
        await adminApi.updateAssessmentSection(editingSection.id, sectionFormData);
      } else {
        await adminApi.createAssessmentSection(assessmentId, {
          ...sectionFormData,
          section_order: assessment.sections?.length || 0,
        });
      }
      setIsAddSectionOpen(false);
      setEditingSection(null);
      loadAssessment();
    } catch (err) {
      alert('Failed to save section: ' + err.message);
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
    setActiveSectionId(sectionId);
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
    try {
      await adminApi.addQuestionToSection(activeSectionId, { question_id: qId });
      loadAssessment();
      setIsQuestionPickerOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to add question');
    }
  };

  const handleOpenProblemPicker = async (sectionId) => {
    setActiveSectionId(sectionId);
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
    try {
      setAddingProblemId(problemId);
      await adminApi.addQuestionToSection(activeSectionId, { problem_id: problemId });
      await loadAssessment();
      setIsProblemPickerOpen(false);
    } catch (err) {
      console.error('Failed to add coding problem', err);
      alert(err.message || 'Failed to add coding problem');
    } finally {
      setAddingProblemId(null);
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
      <div className="p-12 text-center text-rose-500">
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
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              assessment.status === 'Published'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 active:scale-95'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 active:scale-95'
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
              onClick={() => {
                setSectionFormData({
                  title: '',
                  description: '',
                  section_type: 'objective',
                  duration_minutes: '',
                  marks_per_question: 1.0,
                  negative_marks_per_question: 0.25,
                });
                setEditingSection(null);
                setIsAddSectionOpen(true);
              }}
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
                onClick={() => setIsAddSectionOpen(true)}
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
                              isCoding
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {isCoding ? 'DSA Coding' : 'Objective'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {sec.description || 'Configured with marks: +' + sec.marks_per_question + ' / -' + sec.negative_marks_per_question}
                        </p>
                      </div>
                    </div>

                    {/* Section Tools */}
                    <div className="flex flex-wrap items-center gap-2">
                      {!isCoding ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenRandomModal(sec.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-default)] text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            <Sparkles size={13} className="text-amber-400" />
                            <span>Random Populate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenQuestionPicker(sec.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)] transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Add Questions</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenProblemPicker(sec.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors cursor-pointer"
                        >
                          <Code2 size={13} />
                          <span>Add Coding Problem</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSection(sec.id)}
                        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-rose-500 cursor-pointer transition-colors"
                        title="Delete Section"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Section Questions Table */}
                  {secQuestions.length === 0 ? (
                    <div className="py-8 px-4 text-center border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-tertiary)]/20 flex flex-col items-center justify-center gap-3">
                      <p className="text-xs text-[var(--text-muted)]">
                        {isCoding
                          ? 'No coding problems in this section yet. Click below to add problems from the question bank.'
                          : 'No questions in this section yet. Click "Add Questions" or "Random Populate" above.'}
                      </p>
                      {isCoding ? (
                        <button
                          type="button"
                          onClick={() => handleOpenProblemPicker(sec.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-sm cursor-pointer"
                        >
                          <Code2 size={13} />
                          <span>Add Coding Problem</span>
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/30 text-[var(--text-muted)]">
                            <th className="py-2.5 px-3 w-10">#</th>
                            <th className="py-2.5 px-3">Item Statement / Title</th>
                            <th className="py-2.5 px-3 w-36">Topic</th>
                            <th className="py-2.5 px-3 w-24">Difficulty</th>
                            <th className="py-2.5 px-3 w-24">Marks</th>
                            <th className="py-2.5 px-3 w-16 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                          {secQuestions.map((q, qIdx) => {
                            const isCodeProblem = Boolean(q.problem_id);
                            return (
                              <tr key={q.mapping_id} className="hover:bg-[var(--bg-tertiary)]/20">
                                <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">
                                  {qIdx + 1}
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
                                  +{q.marks_override || sec.marks_per_question}
                                  {parseFloat(q.negative_marks_override || sec.negative_marks_per_question) > 0 && (
                                    <span className="text-rose-500 ml-1">
                                      -{q.negative_marks_override || sec.negative_marks_per_question}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestion(q.mapping_id)}
                                    className="p-1 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer transition-colors"
                                    title="Remove from section"
                                  >
                                    <Trash2 size={13} />
                                  </button>
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
                  {(sec.questions || []).map((q, qIdx) => (
                    <div key={q.mapping_id} className="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)] space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          <span className="font-bold mr-2 text-[var(--kc-accent)]">Q{qIdx + 1}.</span>
                          {q.question_text || q.problem_description}
                        </div>
                        <span className="text-xs font-mono text-[var(--text-muted)] shrink-0 ml-4">
                          [{q.marks_override || sec.marks_per_question} Marks]
                        </span>
                      </div>

                      {q.options && Array.isArray(q.options) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className="p-2.5 rounded border border-[var(--border-default)] text-xs flex items-center gap-2 text-[var(--text-secondary)]"
                            >
                              <span className="font-mono uppercase font-semibold text-[var(--text-muted)]">
                                ({opt.id})
                              </span>
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
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
                          <span className={isPassed ? 'text-emerald-500 font-bold' : 'text-rose-500'}>
                            {att.percentage}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-emerald-500 font-mono">{att.correct_count}</td>
                        <td className="py-2.5 px-3 text-center text-rose-500 font-mono">{att.incorrect_count}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isPassed
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}
                          >
                            {isPassed ? 'PASSED' : 'FAILED'}
                          </span>
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

      {/* MODAL 1: ADD SECTION */}
      {isAddSectionOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setIsAddSectionOpen(false)}
        >
          <div
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Add Assessment Section</h3>
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
                  Section Type
                </label>
                <select
                  value={sectionFormData.section_type}
                  onChange={(e) => setSectionFormData({ ...sectionFormData, section_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="objective">Objective (MCQ / Theory Question Bank)</option>
                  <option value="coding">DSA Coding (KodeChirp Judge Problems)</option>
                </select>
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
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL QUESTION PICKER */}
      {isQuestionPickerOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setIsQuestionPickerOpen(false)}
        >
          <div
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

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search questions..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchPicker()}
                className="flex-1 px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
              />
              <button
                type="button"
                onClick={handleSearchPicker}
                className="px-3 py-1.5 text-xs font-semibold bg-[var(--kc-accent)] text-[var(--kc-on-primary)] rounded-lg hover:bg-[var(--kc-accent-hover)] transition-colors cursor-pointer"
              >
                Search
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-default)]">
              {pickerLoading ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">Loading questions...</div>
              ) : pickerQuestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">No questions found.</div>
              ) : (
                pickerQuestions.map((q) => (
                  <div key={q.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-[var(--text-primary)] line-clamp-2">
                        {q.question_text}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {q.category} › {q.topic} • {q.difficulty}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion(q.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)] shrink-0 transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CODING PROBLEM PICKER */}
      {isProblemPickerOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setIsProblemPickerOpen(false)}
        >
          <div
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

              <button
                type="button"
                onClick={() => handleSearchProblemPicker(problemPickerSearch, problemPickerDifficulty)}
                className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors shadow-sm shrink-0 cursor-pointer"
              >
                Search
              </button>
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
                  const diffBadgeClass =
                    p.difficulty === 'Easy'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : p.difficulty === 'Hard'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                  return (
                    <div
                      key={p.id}
                      className="py-3 px-3 flex items-center justify-between gap-3 hover:bg-[var(--bg-tertiary)]/40 rounded-xl transition-colors"
                    >
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
              <span>{pickerProblems.length} problem{pickerProblems.length === 1 ? '' : 's'} available</span>
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
      )}

      {/* MODAL 4: RANDOM POPULATE TOOL */}
      {isRandomModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setIsRandomModalOpen(false)}
        >
          <div
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div className="flex items-center gap-2 text-amber-400">
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
    </div>
  );
}
