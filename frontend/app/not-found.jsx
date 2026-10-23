'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  Code2, 
  ArrowLeft, 
  ArrowRight, 
  Terminal, 
  Layers, 
  BookOpen 
} from 'lucide-react';
import { useEffect } from 'react';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    document.title = '404: Page Not Found | KodeChirp';
  }, []);

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const quickLinks = [
    { label: 'Browse Questions', href: '/questions', icon: Layers, desc: 'Practice algorithmic challenges' },
    { label: 'My Submissions', href: '/submissions', icon: BookOpen, desc: 'Review your submission history' },
  ];

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12 overflow-hidden">
      {/* Background ambient lighting */}
      <AnimatedBackground variant="default" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center">
        {/* Kicker badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold text-[11px] font-mono tracking-wider uppercase mb-6"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
          </span>
          ERR_404 // UNINDEXED_BRANCH
        </motion.div>

        {/* Clean 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="relative mb-3"
        >
          <div className="text-7xl sm:text-8xl md:text-9xl font-display font-bold tracking-tight text-[var(--kc-text-primary)] select-none">
            404
          </div>
        </motion.div>

        {/* Heading & description */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="space-y-2 mb-8 max-w-lg"
        >
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--kc-text-primary)] tracking-tight">
            Lost in Algorithmic Space
          </h1>
          <p className="text-sm sm:text-base text-[var(--kc-text-muted)] leading-relaxed">
            The node you&apos;re looking for doesn&apos;t exist in our route topology. It might have been pruned, renamed, or migrated to a different namespace.
          </p>
        </motion.div>

        {/* Terminal diagnostic card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.28, ease: 'easeOut' }}
          className="w-full max-w-md rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] p-4 text-left shadow-sm mb-8 relative overflow-hidden"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--kc-border)]">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-[var(--kc-accent)]" aria-hidden="true" />
              <span className="text-[11px] font-mono text-[var(--kc-text-muted)]">topology_resolver.ts</span>
            </div>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-[var(--kc-border)]" />
              <span className="w-2 h-2 rounded-full bg-[var(--kc-border)]" />
              <span className="w-2 h-2 rounded-full bg-[var(--kc-border)]" />
            </div>
          </div>
          <pre className="text-[12px] font-mono leading-relaxed text-[var(--kc-text-primary)] overflow-x-auto">
            <code>
              <span className="text-[var(--kc-text-muted)]">{'// Invariant violation: AST traversal failed'}</span>{'\n'}
              <span className="text-rose-700 dark:text-rose-300">const</span> <span className="text-[var(--kc-accent)]">target</span> = router.<span className="text-[var(--kc-text-primary)]">resolve</span>(location.pathname);{'\n'}
              <span className="text-rose-700 dark:text-rose-300">if</span> (!target) {'{'}{'\n'}
              {'  '}<span className="text-rose-700 dark:text-rose-300">return</span> {'{'} status: <span className="text-[var(--kc-accent)]">404</span>, verdict: <span className="text-emerald-700 dark:text-emerald-300">&apos;PATH_UNREACHABLE&apos;</span> {'}'};{'\n'}
              {'}'}
            </code>
          </pre>
        </motion.div>

        {/* Primary and secondary navigation actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.35, ease: 'easeOut' }}
          className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-md mb-8"
        >
          <Link
            href="/questions"
            className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[var(--kc-accent)] hover:opacity-90 text-[var(--kc-on-primary)] text-sm font-medium transition-opacity"
          >
            <Code2 size={15} aria-hidden="true" />
            <span>Explore Questions</span>
            <ArrowRight size={13} className="ml-0.5" aria-hidden="true" />
          </Link>

          <Link
            href="/"
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-surface-hover)] text-[var(--kc-text-primary)] text-sm font-medium transition-colors"
          >
            <Home size={14} aria-hidden="true" />
            <span>Return Home</span>
          </Link>

          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] text-sm font-medium transition-colors"
            title="Navigate to previous page"
            aria-label="Go back to previous page"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Go Back</span>
          </button>
        </motion.div>

        {/* Helpful quick destinations */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.42, ease: 'easeOut' }}
          className="w-full max-w-lg border-t border-[var(--kc-border)] pt-6"
        >
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--kc-text-muted)] mb-3">
            Suggested Safe Coordinates
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex flex-col items-start p-3 rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] hover:border-[var(--kc-accent)]/50 text-left transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--kc-text-primary)] group-hover:text-[var(--kc-accent)] transition-colors mb-0.5">
                    <Icon size={13} className="text-[var(--kc-accent)]" aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[11px] text-[var(--kc-text-muted)] line-clamp-1">
                    {item.desc}
                  </span>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
