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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      api.request?.('/api/submissions/user')
        .then(res => setSubmissions(res.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));

      // Fallback: use fetch directly
      const token = localStorage.getItem('kc_token');
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      fetch(`${API_BASE}/api/submissions/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) setSubmissions(data.data || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
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
          <h1 className="text-2xl font-display font-bold text-white mb-4">My Submissions</h1>
          <p className="text-[#8b949e]">Please <Link href="/auth" className="text-[#58a6ff] hover:underline">sign in</Link> to view your submissions.</p>
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
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#a371f7]/15 border border-[#a371f7]/20 flex items-center justify-center">
              <FileCode2 size={14} className="text-[#a371f7]" />
            </div>
            <span className="text-[12px] font-bold text-[#a371f7] uppercase tracking-widest">Submissions</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-white mb-1">My Submissions</h1>
          <p className="text-[#8b949e] text-sm">Track your coding journey and submission history.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl overflow-hidden border border-white/[0.07]"
          style={{
            background: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#a371f7] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[#484f58]">Loading submissions…</span>
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center px-4">
              <FileCode2 size={28} className="text-[#484f58]" />
              <p className="text-sm text-[#8b949e]">No submissions yet. Start solving problems!</p>
              <Link href="/questions" className="text-xs text-[#58a6ff] hover:underline">
                Browse questions →
              </Link>
            </div>
          ) : (
            submissions.map((sub, i) => {
              const cfg = STATUS_CONFIG[sub.status] || { icon: Clock, color: '#8b949e', bg: 'rgba(139,148,158,0.08)' };
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all duration-200"
                >
                  <Icon size={16} style={{ color: cfg.color, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/problems/${sub.problem_slug}`} className="text-[14px] font-semibold text-[#c9d1d9] hover:text-white transition-colors truncate block">
                      {sub.problem_title}
                    </Link>
                    <div className="text-[11px] text-[#484f58] mt-0.5">
                      {sub.language} · {sub.runtime_ms ? `${sub.runtime_ms}ms` : '–'} · {new Date(sub.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
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
