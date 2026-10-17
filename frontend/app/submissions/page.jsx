'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FileCode2, ChevronRight, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';

const STATUS_CONFIG = {
  'Accepted':            { icon: CheckCircle,    color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
  'Wrong Answer':        { icon: XCircle,        color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  'Runtime Error':       { icon: AlertTriangle,  color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
  'Time Limit Exceeded': { icon: Clock,          color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
  'Compilation Error':   { icon: XCircle,        color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
};

export default function SubmissionsPage() {
  const { user, isAuthenticated } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUserSubmissions();
      setSubmissions(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadSubmissions();
    } else if (mounted) {
      setLoading(false);
    }
  }, [mounted, isAuthenticated]);

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <div className="relative flex-1 overflow-hidden">
        <AnimatedBackground variant="questions" />
        <div className="relative z-10 max-w-2xl mx-auto w-full px-4 py-16 text-center">
          <h1 className="text-2xl font-display font-bold text-[var(--kc-text-primary)] mb-3">My Submissions</h1>
          <p className="text-[var(--kc-text-secondary)] text-sm">Please <Link href="/auth" className="text-[var(--kc-accent)] hover:underline">sign in</Link> to view your submissions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <AnimatedBackground variant="questions" />
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-md bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] flex items-center justify-center">
              <FileCode2 size={13} className="text-[var(--kc-accent)]" />
            </div>
            <span className="text-[11px] font-mono font-semibold text-[var(--kc-accent)] uppercase tracking-wider">Submissions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--kc-text-primary)] mb-1 tracking-tight">My Submissions</h1>
          <p className="text-[var(--kc-text-secondary)] text-sm">Track your coding journey and submission history.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-lg overflow-hidden border border-[var(--kc-border)] bg-[var(--kc-surface)] shadow-sm"
        >
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="w-5 h-5 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-[var(--kc-text-muted)]">Loading submissions…</span>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center px-4">
              <AlertTriangle size={28} className="text-[var(--kc-error, #f87171)]" />
              <p className="text-sm font-semibold text-[var(--kc-error, #f87171)]">{error}</p>
              <p className="text-xs text-[var(--kc-text-muted)]">Unable to fetch your submission history.</p>
              <button
                type="button"
                onClick={loadSubmissions}
                className="mt-2 px-3.5 py-1.5 rounded-md text-xs font-medium bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-border)] text-[var(--kc-text-primary)] border border-[var(--kc-border)] transition-colors"
              >
                Try again
              </button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center px-4">
              <FileCode2 size={24} className="text-[var(--kc-text-muted)]" />
              <p className="text-sm text-[var(--kc-text-secondary)]">No submissions yet. Start solving problems!</p>
              <Link href="/questions" className="text-xs text-[var(--kc-accent)] hover:underline">
                Browse questions →
              </Link>
            </div>
          ) : (
            submissions.map((sub, i) => {
              const cfg = STATUS_CONFIG[sub.status] || { icon: Clock, color: 'var(--kc-text-muted)', bg: 'rgba(255,255,255,0.04)' };
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.02 }}
                  className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-3.5 border-b border-[var(--kc-border)] hover:bg-[var(--kc-surface-subtle)] transition-colors"
                >
                  <Icon size={15} style={{ color: cfg.color, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/problems/${sub.problem_slug}`} className="text-[13px] sm:text-[14px] font-semibold text-[var(--kc-text-primary)] hover:text-[var(--kc-accent)] transition-colors truncate block">
                      {sub.problem_title}
                    </Link>
                    <div className="text-[11px] font-mono text-[var(--kc-text-muted)] mt-0.5 truncate">
                      {sub.language} · {sub.runtime_ms ? `${sub.runtime_ms}ms` : '–'} · {new Date(sub.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="px-2 sm:px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                    {sub.status}
                  </span>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
}
