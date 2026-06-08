'use client';

import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';

export default function SettingsPage() {
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
          <div className="w-16 h-16 rounded-2xl bg-[#58a6ff]/15 border border-[#58a6ff]/20 flex items-center justify-center mx-auto mb-6">
            <Settings size={28} className="text-[#58a6ff]" />
          </div>
          <h1 className="text-3xl font-display font-extrabold text-white mb-3">Settings</h1>
          <p className="text-[#8b949e] text-sm mb-8">Account settings and preferences are coming soon.</p>
          <div className="rounded-2xl border border-white/[0.07] p-8" style={{
            background: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(16px)',
          }}>
            <p className="text-[#484f58] text-sm">
              We&apos;re building a comprehensive settings panel where you can customize your profile, 
              notification preferences, editor theme, and more. Stay tuned! 🐦
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
