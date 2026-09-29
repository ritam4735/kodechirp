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
    <div
      className="max-w-xl mx-auto w-full rounded-2xl border border-white/[0.08] p-8 sm:p-10 text-center relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Success Badge */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <CheckCircle2 size={36} className="text-emerald-400" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white mb-3">
        {title}
      </h1>

      <p className="text-sm text-[#8b949e] leading-relaxed mb-8 max-w-md mx-auto">
        {description}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/questions"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#1d4ed8] hover:to-[#2563eb] text-white text-xs sm:text-sm font-semibold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2"
        >
          <Code2 size={16} />
          <span>Solve Problems</span>
          <ArrowRight size={14} />
        </Link>

        <Link
          href="/"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Home size={15} />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-center gap-2 text-xs text-[#8b949e]">
        <span>Check open source progress on</span>
        <a
          href="https://github.com/ritam4735/kodechirp"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#58a6ff] hover:underline inline-flex items-center gap-1 font-medium"
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
            <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ThankYouContent />
        </Suspense>
      </div>
    </div>
  );
}
