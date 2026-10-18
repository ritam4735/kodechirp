'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../../lib/adminApi';
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  History,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  HelpCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

export default function AdminQuestionBankPage() {
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [categories, setCategories] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(0);
  const limit = 15;

  // Modals
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingQuestion, setViewingQuestion] = useState(null);
  const [isBatchesOpen, setIsBatchesOpen] = useState(false);
  const [batches, setBatches] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    category: 'Quantitative Aptitude',
    topic: 'Unit Digit',
    subtopic: '',
    difficulty: 'Medium',
    question_type: 'single_choice',
    question_text: '',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correct_answer: 'a',
    explanation: '',
    default_marks: 1.0,
    default_negative_marks: 0.25,
    is_active: true,
  });

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getAssessmentQuestions({
        search: search.trim() || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        topic: selectedTopic !== 'all' ? selectedTopic : undefined,
        difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
        is_active: selectedStatus !== 'all' ? selectedStatus : undefined,
        limit,
        offset: page * limit,
      });

      setQuestions(res.questions || []);
      setTotal(res.total || 0);
      setTotalAll(res.totalAll || 0);
      if (res.categories) setCategories(res.categories);
      if (res.topics) setTopics(res.topics);
    } catch (err) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedTopic, selectedDifficulty, selectedStatus, page]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const loadBatches = async () => {
    try {
      setBatchLoading(true);
      const res = await adminApi.getImportBatches();
      setBatches(res.batches || []);
      setIsBatchesOpen(true);
    } catch (err) {
      alert('Failed to load import batches: ' + err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await adminApi.toggleAssessmentQuestionStatus(id);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, is_active: !q.is_active } : q))
      );
    } catch (err) {
      alert('Failed to toggle status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await adminApi.deleteAssessmentQuestion(id);
      loadQuestions();
    } catch (err) {
      alert('Failed to delete question: ' + err.message);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      category: categories[0] || 'Quantitative Aptitude',
      topic: 'Unit Digit',
      subtopic: '',
      difficulty: 'Medium',
      question_type: 'single_choice',
      question_text: '',
      options: [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
      ],
      correct_answer: 'a',
      explanation: '',
      default_marks: 1.0,
      default_negative_marks: 0.25,
      is_active: true,
    });
    setEditingQuestion(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (q) => {
    let opts = q.options;
    if (typeof opts === 'string') {
      try { opts = JSON.parse(opts); } catch { opts = []; }
    }
    if (!Array.isArray(opts) || opts.length === 0) {
      opts = [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
      ];
    }

    setFormData({
      category: q.category,
      topic: q.topic,
      subtopic: q.subtopic || '',
      difficulty: q.difficulty,
      question_type: q.question_type,
      question_text: q.question_text,
      options: opts,
      correct_answer: q.correct_answer || 'a',
      explanation: q.explanation || '',
      default_marks: parseFloat(q.default_marks) || 1.0,
      default_negative_marks: parseFloat(q.default_negative_marks) || 0.0,
      is_active: q.is_active,
    });
    setEditingQuestion(q);
    setIsCreateOpen(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        await adminApi.updateAssessmentQuestion(editingQuestion.id, formData);
      } else {
        await adminApi.createAssessmentQuestion(formData);
      }
      setIsCreateOpen(false);
      loadQuestions();
    } catch (err) {
      alert('Failed to save question: ' + err.message);
    }
  };

  const filteredTopics = selectedCategory !== 'all'
    ? topics.filter((t) => t.category === selectedCategory).map((t) => t.topic)
    : Array.from(new Set(topics.map((t) => t.topic)));

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Unified Question Bank
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[var(--kc-accent)]/20">
              {totalAll} Questions
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage aptitude, reasoning, verbal, CS fundamentals, and theoretical assessment questions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadBatches}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
          >
            <History size={15} />
            <span>Import History</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span>Create Question</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-default)]">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search questions or keywords..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
          />
        </div>

        {/* Category */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedTopic('all');
              setPage(0);
            }}
            className="w-full py-2 px-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div>
          <select
            value={selectedTopic}
            onChange={(e) => {
              setSelectedTopic(e.target.value);
              setPage(0);
            }}
            className="w-full py-2 px-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
          >
            <option value="all">All Topics</option>
            {filteredTopics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <select
            value={selectedDifficulty}
            onChange={(e) => {
              setSelectedDifficulty(e.target.value);
              setPage(0);
            }}
            className="w-full py-2 px-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(0);
            }}
            className="w-full py-2 px-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
          >
            <option value="all">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Stats summary bar */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
        <div>
          Showing <span className="font-medium text-[var(--text-primary)]">{questions.length}</span> of{' '}
          <span className="font-medium text-[var(--text-primary)]">{total}</span> filtered questions (out of{' '}
          <span className="font-medium text-[var(--text-primary)]">{totalAll}</span> total)
        </div>
        <div className="flex items-center gap-2">
          <span>Page {page + 1} of {totalPages}</span>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-muted)] space-y-3">
            <RefreshCw className="animate-spin mx-auto text-[var(--kc-accent)]" size={28} />
            <p>Loading question bank...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 space-y-2">
            <AlertCircle className="mx-auto" size={28} />
            <p>{error}</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)] space-y-3">
            <HelpCircle className="mx-auto text-[var(--text-muted)]" size={32} />
            <p className="text-base font-medium text-[var(--text-primary)]">No questions matched your filters</p>
            <p className="text-sm">Try clearing your filters or creating a new question.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] font-medium text-xs">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Question</th>
                  <th className="py-3 px-4 w-40">Category / Topic</th>
                  <th className="py-3 px-4 w-28">Difficulty</th>
                  <th className="py-3 px-4 w-24">Marks</th>
                  <th className="py-3 px-4 w-24 text-center">Status</th>
                  <th className="py-3 px-4 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {questions.map((q, idx) => {
                  const opts = Array.isArray(q.options) ? q.options : [];
                  return (
                    <tr key={q.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-[var(--text-muted)]">
                        {page * limit + idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[var(--text-primary)] line-clamp-2">
                          {q.question_text}
                        </div>
                        {opts.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                            {opts.map((opt) => (
                              <span
                                key={opt.id}
                                className={`px-2 py-0.5 rounded border ${
                                  q.correct_answer === opt.id
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold'
                                    : 'bg-[var(--bg-primary)] border-[var(--border-default)]'
                                }`}
                              >
                                {opt.id.toUpperCase()}: {opt.text.slice(0, 30)}{opt.text.length > 30 ? '…' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-[var(--text-primary)]">{q.category}</div>
                        <div className="text-xs text-[var(--text-muted)]">{q.topic}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                            q.difficulty === 'Easy'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : q.difficulty === 'Medium'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        <span className="text-[var(--text-primary)]">+{q.default_marks}</span>
                        {parseFloat(q.default_negative_marks) > 0 && (
                          <span className="text-rose-500 ml-1">-{q.default_negative_marks}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(q.id)}
                          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                            q.is_active
                              ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20'
                          }`}
                        >
                          {q.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingQuestion(q)}
                            title="View Question"
                            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(q)}
                            title="Edit Question"
                            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-[var(--kc-accent)]"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            title="Delete Question"
                            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-rose-500"
                          >
                            <Trash2 size={15} />
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

        {/* Pagination Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border-default)] bg-[var(--bg-tertiary)]/20 text-xs text-[var(--text-secondary)]">
          <div>
            Page <span className="font-semibold text-[var(--text-primary)]">{page + 1}</span> of{' '}
            <span className="font-semibold text-[var(--text-primary)]">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] disabled:opacity-40 hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] disabled:opacity-40 hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Question Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl max-w-2xl w-full p-6 shadow-2xl my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingQuestion ? 'Edit Question' : 'Create Question'}
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Topic *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Default Marks
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={formData.default_marks}
                    onChange={(e) => setFormData({ ...formData, default_marks: e.target.value })}
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
                    value={formData.default_negative_marks}
                    onChange={(e) => setFormData({ ...formData, default_negative_marks: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Question Text * (supports Markdown / Math notation)
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] font-mono"
                  placeholder="e.g. Find the unit digit of (25 × 36 × 47)"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Options & Answer Key
                </label>
                {formData.options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="w-8 text-center font-bold text-xs uppercase px-2 py-2 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                      {opt.id}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={`Option ${opt.id.toUpperCase()}`}
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...formData.options];
                        newOpts[idx].text = e.target.value;
                        setFormData({ ...formData, options: newOpts });
                      }}
                      className="flex-1 px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
                      <input
                        type="radio"
                        name="correct_answer_radio"
                        checked={formData.correct_answer === opt.id}
                        onChange={() => setFormData({ ...formData, correct_answer: opt.id })}
                        className="text-[var(--kc-accent)]"
                      />
                      <span>Correct</span>
                    </label>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Explanation / Solution
                </label>
                <textarea
                  rows={2}
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  placeholder="Step-by-step solution for students after assessment..."
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Active for student assessments</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)]"
                  >
                    {editingQuestion ? 'Update Question' : 'Save Question'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Question Detail Modal */}
      {viewingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div>
                <span className="text-xs font-medium text-[var(--kc-accent)]">
                  {viewingQuestion.category} › {viewingQuestion.topic}
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Question Preview</h3>
              </div>
              <button
                onClick={() => setViewingQuestion(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)]">
              <p className="text-base text-[var(--text-primary)] font-medium whitespace-pre-wrap">
                {viewingQuestion.question_text}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Options</div>
              {(Array.isArray(viewingQuestion.options) ? viewingQuestion.options : []).map((opt) => (
                <div
                  key={opt.id}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    viewingQuestion.correct_answer === opt.id
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-semibold'
                      : 'bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)]">
                      {opt.id}
                    </span>
                    <span>{opt.text}</span>
                  </div>
                  {viewingQuestion.correct_answer === opt.id && (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      Correct Key
                    </span>
                  )}
                </div>
              ))}
            </div>

            {viewingQuestion.explanation && (
              <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)] text-xs space-y-1">
                <span className="font-semibold text-[var(--text-primary)]">Explanation:</span>
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{viewingQuestion.explanation}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-default)]">
              <div>Source: {viewingQuestion.source_file || 'Manual'}</div>
              <div>Marks: +{viewingQuestion.default_marks} / -{viewingQuestion.default_negative_marks}</div>
            </div>
          </div>
        </div>
      )}

      {/* Import Batches Modal */}
      {isBatchesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Import History & Audit Batches</h3>
                <p className="text-xs text-[var(--text-muted)]">Verified batches of imported aptitude and question banks.</p>
              </div>
              <button
                onClick={() => setIsBatchesOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    <th className="py-2.5 px-3">Batch ID</th>
                    <th className="py-2.5 px-3">Source File</th>
                    <th className="py-2.5 px-3 text-center">Discovered</th>
                    <th className="py-2.5 px-3 text-center">Inserted</th>
                    <th className="py-2.5 px-3 text-center">Skipped</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--bg-tertiary)]/20">
                      <td className="py-2.5 px-3 font-mono text-[var(--kc-accent)]">{b.batch_id}</td>
                      <td className="py-2.5 px-3 text-[var(--text-primary)]">{b.source_file}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{b.total_discovered}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-500 font-semibold">{b.total_inserted}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-amber-500">{b.total_skipped}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-semibold">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[var(--text-muted)]">
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setIsBatchesOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border-default)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
