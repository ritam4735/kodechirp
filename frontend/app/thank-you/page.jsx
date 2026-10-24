'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  ArrowRight, 
  Code2, 
  Github, 
  Home, 
  LogIn, 
  ShieldCheck 
} from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';
import { useAuth } from '../../hooks/useAuth';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const { initAuth } = useAuth();

  // Ensure unauthenticated state is verified on mount & refresh
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Support contact / feedback form thank you messages
  if (type === 'contact' || type === 'feedback') {
    const isFeedback = type === 'feedback';
    const title = isFeedback ? 'Thank You for Your Feedback!' : 'Message Received!';
    const description = isFeedback
      ? 'Your feedback helps shape KodeChirp into a better platform for developers worldwide.'
      : 'Your message has been sent to the KodeChirp maintainer team. We review all community notes, bug reports, and suggestions carefully.';

    return (
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-xl mx-auto w-full rounded-xl border border-[var(--kc-border)] bg-[var(--kc-surface)] p-8 sm:p-10 text-center relative shadow-sm"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
        </div>

        <h1 className="text-2xl font-display font-semibold text-[var(--kc-text-primary)] mb-2">
          {title}
        </h1>

        <p className="text-sm text-[var(--kc-text-muted)] leading-relaxed mb-6 max-w-md mx-auto">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link
            href="/questions"
            className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-[var(--kc-accent)] hover:opacity-90 text-[var(--kc-on-primary)] text-xs sm:text-sm font-medium transition-opacity flex items-center justify-center gap-2"
          >
            <Code2 size={15} />
            <span>Solve Problems</span>
            <ArrowRight size={13} />
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-surface-hover)] border border-[var(--kc-border)] text-[var(--kc-text-primary)] text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Home size={14} />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="mt-8 pt-5 border-t border-[var(--kc-border)] flex items-center justify-center gap-1.5 text-xs text-[var(--kc-text-muted)]">
          <span>Check open source progress on</span>
          <a
            href="https://github.com/ritam4735/kodechirp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--kc-accent)] hover:underline inline-flex items-center gap-1 font-medium"
          >
            <Github size={13} />
            <span>GitHub</span>
          </a>
        </div>
      </motion.div>
    );
  }

  // Dedicated "Thank You for Visiting" / Signed Out page
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-lg mx-auto w-full rounded-2xl border border-[var(--kc-border)] bg-[var(--kc-surface)] p-8 sm:p-10 text-center relative shadow-lg"
    >
      {/* Brand Logo */}
      <div className="flex justify-center mb-6">
        <Logo size="lg" variant="full" asLink href="/" ariaLabel="KodeChirp" priority />
      </div>

      {/* Signout Confirmation Badge */}
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={28} />
      </div>

      {/* Main Heading */}
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--kc-text-primary)] mb-3 tracking-tight">
        Thank You for Visiting!
      </h1>

      {/* Farewell message */}
      <p className="text-sm sm:text-base text-[var(--kc-text-secondary)] leading-relaxed mb-4 max-w-md mx-auto">
        You&apos;ve successfully signed out of KodeChirp. We hope to see you again soon!
      </p>

      {/* Session Security Confirmation Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 mb-8">
        <ShieldCheck size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>Session ended safely • Local tokens cleared</span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <Link
          href="/auth"
          id="signInAgainBtn"
          className="px-5 py-2.5 rounded-lg bg-[var(--kc-accent)] hover:opacity-90 text-[var(--kc-on-primary)] text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <LogIn size={15} />
          <span>Sign In Again</span>
          <ArrowRight size={14} />
        </Link>

        <Link
          href="/"
          id="backToHomeBtn"
          className="px-5 py-2.5 rounded-lg bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-surface-hover)] border border-[var(--kc-border)] text-[var(--kc-text-primary)] text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Home size={15} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Footer reassurance & Open Source link */}
      <div className="mt-8 pt-5 border-t border-[var(--kc-border)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--kc-text-muted)]">
        <span>KodeChirp Platform</span>
        <a
          href="https://github.com/ritam4735/kodechirp"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--kc-accent)] hover:underline inline-flex items-center gap-1 font-medium"
        >
          <Github size={13} />
          <span>GitHub Repository</span>
        </a>
      </div>
    </motion.div>
  );
}

export default function ThankYouPage() {
  return (
    <div className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden min-h-[calc(100vh-64px)]">
      <AnimatedBackground variant="questions" />
      <div className="relative z-10 w-full">
        <Suspense fallback={
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ThankYouContent />
        </Suspense>
      </div>
    </div>
  );
}
