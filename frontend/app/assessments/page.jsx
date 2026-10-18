'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import {
  Award,
  Clock,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Search,
  Filter
} from 'lucide-react';

export default function StudentAssessmentsPortal() {
  const { user, isAuthenticated } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    async function fetchAssessments() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getPublishedAssessments({
          search: search.trim() || undefined,
          category: category !== 'all' ? category : undefined,
        });
        setAssessments(data);
      } catch (err) {
        setError(err.message || 'Failed to load assessments');
      } finally {
        setLoading(false);
      }
    }
    fetchAssessments();
  }, [search, category]);

  const categories = Array.from(new Set(assessments.map((a) => a.category).filter(Boolean)));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-[var(--kc-accent-subtle)] border border-[var(--border-default)] p-8 shadow-sm">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] text-xs font-semibold border border-[var(--kc-accent)]/20">
              <Sparkles size={13} />
              <span>KodeChirp Assessment Arena</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Assessments & Placement Tests
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Test your quantitative aptitude, logical reasoning, verbal ability, and DSA coding skills under timed conditions. Build interview readiness with real placement evaluation.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-default)]">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full sm:w-48 py-2 px-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Assessments List */}
        {loading ? (
          <div className="p-16 text-center text-[var(--text-muted)] space-y-3">
            <div className="w-8 h-8 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>Loading available assessments...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-500 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)]">
            <AlertCircle size={32} className="mx-auto mb-2" />
            <p className="font-semibold">{error}</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-16 text-center text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl space-y-3">
            <Award size={40} className="mx-auto text-[var(--text-muted)]" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">No Published Assessments</h3>
            <p className="text-sm max-w-md mx-auto">
              There are currently no active assessments published. Check back soon or browse coding problems.
            </p>
            <Link
              href="/questions"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--kc-accent)] text-[var(--kc-on-primary)] hover:bg-[var(--kc-accent-hover)]"
            >
              <span>Practice DSA Problems</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assessments.map((a) => {
              const userStatus = a.user_status || {};
              const hasAttempted = userStatus.has_attempted;
              const isInProgress = userStatus.latest_status === 'in_progress';
              const isEvaluated = userStatus.latest_status === 'evaluated' || userStatus.latest_status === 'submitted';

              return (
                <div
                  key={a.id}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:border-[var(--kc-accent)]/50 rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[var(--kc-accent)]/20">
                        {a.category}
                      </span>
                      {hasAttempted && (
                        <span
                          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            isInProgress
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          }`}
                        >
                          {isInProgress ? 'In Progress' : `Score: ${userStatus.latest_score}`}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--kc-accent)] transition-colors line-clamp-1">
                        {a.title}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2 leading-relaxed">
                        {a.description || 'Comprehensive assessment covering quantitative aptitude, reasoning, and core skills.'}
                      </p>
                    </div>

                    {/* Metadata Strip */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--border-default)]/60 text-center">
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Duration</div>
                        <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1">
                          <Clock size={12} className="text-[var(--kc-accent)]" />
                          <span>{a.duration_minutes}m</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Sections</div>
                        <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1">
                          <Layers size={12} className="text-emerald-500" />
                          <span>{a.section_count}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Marks</div>
                        <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5 flex items-center justify-center gap-1">
                          <Award size={12} className="text-purple-500" />
                          <span>{a.total_marks}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-2">
                    {isInProgress ? (
                      <Link
                        href={`/assessments/take/${userStatus.latest_attempt_id}`}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold text-xs transition-colors"
                      >
                        <span>Resume In-Progress Attempt</span>
                        <ArrowRight size={14} />
                      </Link>
                    ) : isEvaluated ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/assessments/result/${userStatus.latest_attempt_id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-medium transition-colors"
                        >
                          <span>View Results</span>
                        </Link>
                        <Link
                          href={`/assessments/${a.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] text-xs font-medium transition-colors"
                        >
                          <span>Details</span>
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/assessments/${a.id}`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] font-semibold text-xs shadow-sm transition-colors"
                      >
                        <span>Start Assessment</span>
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
