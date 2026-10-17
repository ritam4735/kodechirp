'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';

export default function ProgressPage() {
  return (
    <div className="relative flex-1 overflow-hidden">
      <AnimatedBackground variant="questions" />
      <div className="relative z-10 max-w-2xl mx-auto w-full px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-12 h-12 rounded-lg bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] flex items-center justify-center mx-auto mb-5">
            <TrendingUp size={22} className="text-[var(--kc-accent)]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--kc-text-primary)] mb-2 tracking-tight">My Progress</h1>
          <p className="text-[var(--kc-text-secondary)] text-sm mb-8">Track your learning journey and problem-solving progress.</p>
          <div className="rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] p-8 text-center shadow-sm">
            <p className="text-[var(--kc-text-secondary)] text-sm leading-relaxed max-w-md mx-auto">
              We&apos;re building a detailed progress dashboard with solve statistics, difficulty breakdown, 
              streak tracking, and personalized recommendations. Coming soon.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
