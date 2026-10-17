'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, X, Check } from 'lucide-react';
import { getConsentState, setConsentState } from '../../lib/analytics';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const existing = getConsentState();
    if (!existing) {
      // Delay presentation slightly for pleasant entrance
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleReopen = () => {
      setVisible(true);
    };
    window.addEventListener('kc-reopen-cookie-banner', handleReopen);
    return () => window.removeEventListener('kc-reopen-cookie-banner', handleReopen);
  }, []);

  const handleAcceptAll = () => {
    setConsentState('all');
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    setConsentState('essential');
    setVisible(false);
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          role="dialog"
          aria-live="polite"
          aria-label="Cookie preferences"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 pointer-events-auto"
        >
          <div className="bg-[#161b22]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-5 shadow-[0_16px_48px_rgba(0,0,0,0.6)] text-white relative">
            <div className="flex items-start gap-3.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#58a6ff]/15 border border-[#58a6ff]/25 flex items-center justify-center shrink-0 text-[#58a6ff]">
                <Cookie size={18} aria-hidden="true" />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="text-sm font-display font-bold tracking-tight text-white mb-1">
                  Cookie & Privacy Preferences
                </h3>
                <p className="text-xs text-[#8b949e] leading-relaxed">
                  We use essential local tokens for authentication and optional anonymized telemetry to optimize sandbox execution. No third-party data broker tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={handleEssentialOnly}
                aria-label="Dismiss and use essential cookies only"
                className="absolute top-4 right-4 text-[#8b949e] hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#8b949e] pb-3.5 mb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck size={13} aria-hidden="true" />
                <span>GDPR & CCPA Compliant</span>
              </div>
              <Link
                href="/privacy"
                className="text-[#58a6ff] hover:underline"
              >
                Privacy Policy →
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-md shadow-[#238636]/20 transition-all hover:scale-[1.01]"
              >
                <Check size={13} aria-hidden="true" />
                <span>Accept All</span>
              </button>
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[#c9d1d9] hover:text-white text-xs font-medium transition-all"
              >
                <span>Essential Only</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
