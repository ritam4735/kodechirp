'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Code2, Github, Home } from 'lucide-react';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'message';

  const titles = {
    contact: 'Message Received!',
    feedback: 'Thank You for Your Feedback!',
    message: 'Thank You for Reaching Out!',
  };

  const descriptions = {
    contact: 'Your message has been sent to the KodeChirp maintainer team. We review all community notes, bug reports, and suggestions carefully.',
    feedback: 'Your feedback helps shape KodeChirp into a better platform for developers worldwide.',
    message: 'We appreciate you connecting with us. You can explore open challenges or follow project updates on GitHub.',
  };

  const title = titles[type] || titles.message;
  const description = descriptions[type] || descriptions.message;

  return (
    <div className="max-w-xl mx-auto w-full rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] p-8 sm:p-10 text-center relative shadow-sm">
      {/* Success Badge */}
      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 size={24} className="text-emerald-400" />
      </div>

      <h1 className="text-2xl font-display font-semibold text-[var(--kc-text-primary)] mb-2">
        {title}
      </h1>

      <p className="text-sm text-[var(--kc-text-muted)] leading-relaxed mb-6 max-w-md mx-auto">
        {description}
      </p>

      {/* Action Buttons */}
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
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <div className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
      <AnimatedBackground variant="questions" />
      <div className="relative z-10 w-full">
        <Suspense fallback={
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ThankYouContent />
        </Suspense>
      </div>
    </div>
  );
}
