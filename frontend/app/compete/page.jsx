'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import {
  Trophy,
  Award,
  Clock,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  Building2,
  User,
  Calendar,
  Lock,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Flame,
  ShieldCheck,
} from 'lucide-react';

export default function CompeteArenaPage() {
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filters & State
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'available', 'in_progress', 'completed', 'results'

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

  // Derived filter options
  const categories = useMemo(() => {
    return Array.from(new Set(assessments.map((a) => a.category).filter(Boolean)));
  }, [assessments]);

  const organizations = useMemo(() => {
    return Array.from(
      new Set(assessments.map((a) => a.organization_name).filter(Boolean))
    );
  }, [assessments]);

  // Tab Filtering & Counts
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      // Organization filter
      if (organizationFilter !== 'all') {
        if (organizationFilter === 'platform') {
          if (a.organization_id) return false;
        } else if (a.organization_name !== organizationFilter) {
          return false;
        }
      }

      const uStatus = a.user_status || {};
      const status = uStatus.latest_status;

      if (activeTab === 'in_progress') {
        return status === 'in_progress';
      }
      if (activeTab === 'completed') {
        return status === 'submitted' || status === 'evaluated';
      }
      if (activeTab === 'results') {
        return (status === 'submitted' || status === 'evaluated') && (a.show_results_immediately || a.show_answers_mode !== 'never');
      }
      if (activeTab === 'available') {
        // Can be started: not exhausted and not concluded
        const count = uStatus.attempt_count || 0;
        const exhausted = a.max_attempts && count >= a.max_attempts;
        const now = new Date();
        const concluded = a.ends_at && new Date(a.ends_at) < now;
        return !exhausted && !concluded;
      }

      return true;
    });
  }, [assessments, organizationFilter, activeTab]);

  // Count helper
  const tabCounts = useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    let results = 0;
    let available = 0;
    const now = new Date();

    for (const a of assessments) {
      const uStatus = a.user_status || {};
      const status = uStatus.latest_status;
      const count = uStatus.attempt_count || 0;
      const exhausted = a.max_attempts && count >= a.max_attempts;
      const concluded = a.ends_at && new Date(a.ends_at) < now;

      if (status === 'in_progress') inProgress++;
      if (status === 'submitted' || status === 'evaluated') {
        completed++;
        if (a.show_results_immediately || a.show_answers_mode !== 'never') {
          results++;
        }
      }
      if (!exhausted && !concluded) available++;
    }

    return { all: assessments.length, available, inProgress, completed, results };
  }, [assessments]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Compete Banner Header */}
        <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)] p-8 shadow-sm">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] text-xs font-semibold border border-[var(--kc-accent)]/20">
              <Trophy size={14} className="text-[var(--kc-accent)]" />
              <span>KodeChirp Compete Arena</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Assessments & Competitive Arena
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Participate in institution-authorized evaluations, timed aptitude tests, and technical coding assessments. Build real-world benchmark capability with verifiable results.
            </p>

            {/* Contests Teaser Badge */}
            <div className="pt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-secondary)]">
                <Flame size={13} className="text-amber-500" />
                <span>Coding Contests</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-medium">Coming in v2.5</span>
              </span>
              <span>•</span>
              <span>Official Institutional Assessments Active</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[var(--border-default)] pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'all'
                ? 'bg-[var(--kc-accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <span>All Assessments</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'all' ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}`}>
              {tabCounts.all}
            </span>
          </button>

          {mounted && isAuthenticated && (
            <>
              <button
                onClick={() => setActiveTab('available')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
                  activeTab === 'available'
                    ? 'bg-[var(--kc-accent)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span>Available to Me</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'available' ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}`}>
                  {tabCounts.available}
                </span>
              </button>

              {tabCounts.inProgress > 0 && (
                <button
                  onClick={() => setActiveTab('in_progress')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
                    activeTab === 'in_progress'
                      ? 'bg-[var(--kc-accent)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>In Progress</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'in_progress' ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}`}>
                    {tabCounts.inProgress}
                  </span>
                </button>
              )}

              {tabCounts.completed > 0 && (
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
                    activeTab === 'completed'
                      ? 'bg-[var(--kc-accent)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <span>Completed</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'completed' ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}`}>
                    {tabCounts.completed}
                  </span>
                </button>
              )}

              {tabCounts.results > 0 && (
                <button
                  onClick={() => setActiveTab('results')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
                    activeTab === 'results'
                      ? 'bg-[var(--kc-accent)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <span>Results Released</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'results' ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}`}>
                    {tabCounts.results}
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-default)]">
          <div className="relative sm:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search assessments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
            />
          </div>

          <div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={organizationFilter}
              onChange={(e) => setOrganizationFilter(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
            >
              <option value="all">All Organizations & Authors</option>
              <option value="platform">Platform Public Tests</option>
              {organizations.map((org) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Assessment Cards Grid */}
        {loading ? (
          <div className="p-16 text-center text-[var(--text-muted)] space-y-3">
            <div className="w-8 h-8 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>Loading Compete Arena assessments…</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 bg-rose-500/10 rounded-xl border border-rose-500/20 space-y-2">
            <AlertCircle size={28} className="mx-auto" />
            <p className="font-medium">{error}</p>
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="p-16 text-center text-[var(--text-muted)] space-y-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)]">
            <Award size={36} className="mx-auto text-[var(--text-muted)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">No assessments found</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              There are no published assessments matching your criteria or assigned to your student cohort at this time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((a) => {
              const uStatus = a.user_status || {};
              const hasAttempted = Boolean(uStatus.has_attempted);
              const inProgress = uStatus.latest_status === 'in_progress';
              const isEvaluated = uStatus.latest_status === 'evaluated' || uStatus.latest_status === 'submitted';
              const attemptCount = uStatus.attempt_count || 0;
              const maxAttempts = a.max_attempts || 1;
              const attemptsExhausted = attemptCount >= maxAttempts;

              const now = new Date();
              const hasStarted = !a.starts_at || new Date(a.starts_at) <= now;
              const hasEnded = a.ends_at && new Date(a.ends_at) < now;

              return (
                <div
                  key={a.id}
                  className="flex flex-col justify-between bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-5 hover:border-[var(--kc-accent)]/50 transition-all shadow-sm hover:shadow-md relative group"
                >
                  <div className="space-y-4">
                    {/* Header Badges: Category & Organization / Author */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[var(--kc-accent)]/20">
                        {a.category || 'General'}
                      </span>

                      {a.organization_name ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20" title={`Conducted by ${a.organization_name}`}>
                          <Building2 size={12} />
                          <span className="truncate max-w-[130px]">{a.organization_name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck size={12} />
                          <span>Platform Public</span>
                        </span>
                      )}
                    </div>

                    {/* Title & Author */}
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--kc-accent)] transition-colors leading-snug">
                        {a.title}
                      </h2>
                      {a.author_username && (
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                          <User size={12} />
                          <span>Author: {a.author_display_name || a.author_username}</span>
                        </p>
                      )}
                      {a.description && (
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-2 leading-relaxed">
                          {a.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] p-2.5 rounded-lg border border-[var(--border-default)]">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-[var(--text-secondary)]" />
                        <span>{a.duration_minutes} Mins</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText size={13} className="text-[var(--text-secondary)]" />
                        <span>{a.total_questions_count || 0} Questions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers size={13} className="text-[var(--text-secondary)]" />
                        <span>{a.section_count || 0} Sections</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award size={13} className="text-[var(--text-secondary)]" />
                        <span>{Number(a.total_marks || 0)} Marks</span>
                      </div>
                    </div>

                    {/* Availability Schedule if applicable */}
                    {(a.starts_at || a.ends_at) && (
                      <div className="text-[11px] text-[var(--text-muted)] space-y-0.5">
                        {a.starts_at && (
                          <div className="flex items-center gap-1">
                            <Calendar size={11} />
                            <span>Starts: {new Date(a.starts_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        )}
                        {a.ends_at && (
                          <div className="flex items-center gap-1">
                            <Calendar size={11} />
                            <span>Ends: {new Date(a.ends_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions & Status */}
                  <div className="mt-5 pt-3 border-t border-[var(--border-default)] flex items-center justify-between gap-2">
                    <div className="text-xs text-[var(--text-muted)]">
                      {hasAttempted ? (
                        <span className="font-medium text-[var(--text-secondary)]">
                          Attempt {attemptCount} of {maxAttempts}
                        </span>
                      ) : (
                        <span>{maxAttempts} Attempt Allowed</span>
                      )}
                    </div>

                    <div>
                      {inProgress ? (
                        <Link
                          href={`/assessments/take/${uStatus.latest_attempt_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm"
                        >
                          <RotateCw size={12} className="animate-spin" />
                          <span>Resume Attempt</span>
                        </Link>
                      ) : isEvaluated ? (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/assessments/result/${uStatus.latest_attempt_id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] hover:bg-[var(--kc-accent)] hover:text-white transition-colors"
                          >
                            <span>Result ({Number(uStatus.latest_score || 0)} pts)</span>
                            <ChevronRight size={13} />
                          </Link>
                          {!attemptsExhausted && !hasEnded && (
                            <Link
                              href={`/assessments/${a.id}`}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              title="Retake assessment"
                            >
                              <RotateCw size={13} />
                            </Link>
                          )}
                        </div>
                      ) : hasEnded ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-primary)] rounded-md border border-[var(--border-default)]">
                          <Lock size={12} />
                          <span>Concluded</span>
                        </span>
                      ) : !hasStarted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-md border border-amber-500/20">
                          <Clock size={12} />
                          <span>Upcoming</span>
                        </span>
                      ) : attemptsExhausted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-primary)] rounded-md border border-[var(--border-default)]">
                          <CheckCircle2 size={12} />
                          <span>Max Attempts Used</span>
                        </span>
                      ) : (
                        <Link
                          href={`/assessments/${a.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kc-accent)] text-white hover:opacity-90 transition-opacity shadow-sm"
                        >
                          <span>Start Assessment</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
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
