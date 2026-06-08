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
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#4ade80]/15 border border-[#4ade80]/20 flex items-center justify-center mx-auto mb-6">
            <TrendingUp size={28} className="text-[#4ade80]" />
          </div>
          <h1 className="text-3xl font-display font-extrabold text-white mb-3">My Progress</h1>
          <p className="text-[#8b949e] text-sm mb-8">Track your learning journey and problem-solving progress.</p>
          <div className="rounded-2xl border border-white/[0.07] p-8" style={{
            background: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(16px)',
          }}>
            <p className="text-[#484f58] text-sm">
              We&apos;re building a detailed progress dashboard with solve statistics, difficulty breakdown, 
              streak tracking, and personalized recommendations. Coming soon! 📊
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
