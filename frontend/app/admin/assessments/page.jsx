'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '../../../lib/adminApi';
import {
  Award,
  Plus,
  Search,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Users,
  Edit3,
  Trash2,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileText
} from 'lucide-react';

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    instructions: '1. This assessment is timed.\n2. Do not refresh or close the tab.\n3. Each section contains negative marking for wrong answers.',
    category: 'Placement',
    duration_minutes: 60,
    pass_percentage: 40.0,
    max_attempts: 1,
    randomize_questions: false,
    randomize_options: false,
    default_negative_marking: true,
    show_results_immediately: true,
    show_answers_mode: 'after_submission',
  });

  const loadAssessments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getAssessments({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setAssessments(res.assessments || []);
    } catch (err) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, [statusFilter, search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await adminApi.createAssessment(formData);
      setIsCreateOpen(false);
      loadAssessments();
      // Redirect to builder
      window.location.href = `/admin/assessments/${res.assessment.id}`;
    } catch (err) {
      alert('Failed to create assessment: ' + err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
    try {
      await adminApi.toggleAssessmentStatus(id, nextStatus);
      loadAssessments();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to delete assessment "${title}"?`)) return;
    try {
      await adminApi.deleteAssessment(id);
      loadAssessments();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Assessment Builder
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[var(--kc-accent)]/20">
              {assessments.length} Tests
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Build and publish multi-section placement tests, aptitude assessments, and DSA coding challenges.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] shadow-sm transition-colors"
        >
          <Plus size={16} />
          <span>New Assessment</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-default)]">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search assessments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 py-2 px-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
          >
            <option value="all">All Status</option>
            <option value="Published">Published Only</option>
            <option value="Draft">Drafts Only</option>
            <option value="Archived">Archived Only</option>
          </select>
        </div>
      </div>

      {/* Assessment Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-[var(--text-muted)]">Loading assessments...</div>
      ) : error ? (
        <div className="p-12 text-center text-rose-500">{error}</div>
      ) : assessments.length === 0 ? (
        <div className="p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-secondary)]">
          <Award size={36} className="mx-auto mb-2 text-[var(--text-muted)]" />
          <p className="text-base font-medium text-[var(--text-primary)]">No assessments created yet</p>
          <p className="text-sm mt-1">Create your first assessment to start building sections and question pools.</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)]"
          >
            Create Assessment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assessments.map((a) => {
            const isPub = a.status === 'Published';
            return (
              <div
                key={a.id}
                className="bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:border-[var(--border-active)]/50 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[var(--bg-tertiary)] text-[var(--kc-accent)] border border-[var(--border-default)]">
                      {a.category}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                        isPub
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : a.status === 'Draft'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--kc-accent)] transition-colors line-clamp-1">
                    {a.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2">
                    {a.description || 'No description provided.'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-[var(--border-default)]/60 text-center">
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Duration</div>
                      <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center justify-center gap-1 mt-0.5">
                        <Clock size={12} className="text-[var(--kc-accent)]" />
                        <span>{a.duration_minutes}m</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Sections</div>
                      <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center justify-center gap-1 mt-0.5">
                        <Layers size={12} className="text-emerald-500" />
                        <span>{a.section_count}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Questions</div>
                      <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center justify-center gap-1 mt-0.5">
                        <FileText size={12} className="text-amber-500" />
                        <span>{a.total_questions_count}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      <span>{a.attempt_count} attempts</span>
                    </span>
                    <span>Max Marks: <strong className="text-[var(--text-primary)]">{a.total_marks}</strong></span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border-default)]/40 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleStatus(a.id, a.status)}
                    className={`text-xs px-2.5 py-1 rounded font-medium border transition-colors ${
                      isPub
                        ? 'border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
                        : 'border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10'
                    }`}
                  >
                    {isPub ? 'Unpublish' : 'Publish'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(a.id, a.title)}
                      className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-rose-500"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                    <Link
                      href={`/admin/assessments/${a.id}`}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] transition-colors"
                    >
                      <span>Build & Edit</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Assessment Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer animate-in fade-in duration-150"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8 space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Create Assessment</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Placement Assessment 2026 — General Aptitude & Coding"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Total Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    min="5"
                    max="600"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief overview of the test scope..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Instructions for Students
                </label>
                <textarea
                  rows={3}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Max Attempts per Student
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_attempts}
                    onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Pass Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.pass_percentage}
                    onChange={(e) => setFormData({ ...formData, pass_percentage: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.randomize_questions}
                    onChange={(e) => setFormData({ ...formData, randomize_questions: e.target.checked })}
                  />
                  <span>Randomize question order for each student</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_results_immediately}
                    onChange={(e) => setFormData({ ...formData, show_results_immediately: e.target.checked })}
                  />
                  <span>Show score immediately upon submission</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
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
                  Create & Open Builder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
