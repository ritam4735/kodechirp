'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, X, Check } from 'lucide-react';
import { getConsentState, setConsentState } from '../../lib/analytics';

export function CookieBanner() {
  const pathname = usePathname();
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

  // Do not show cookie banner during active assessment
  if (!mounted || pathname?.startsWith('/assessments/take/')) return null;

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
          <div className="bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg p-5 shadow-xl text-[var(--kc-text-primary)] relative">
            <div className="flex items-start gap-3.5 mb-3">
              <div className="w-8 h-8 rounded-md bg-[var(--kc-accent)]/10 border border-[var(--kc-accent)]/20 flex items-center justify-center shrink-0 text-[var(--kc-accent)]">
                <Cookie size={16} aria-hidden="true" />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="text-sm font-display font-semibold tracking-tight text-[var(--kc-text-primary)] mb-1">
                  Cookie & Privacy Preferences
                </h3>
                <p className="text-xs text-[var(--kc-text-muted)] leading-relaxed">
                  We use essential local tokens for authentication and optional anonymized telemetry to optimize sandbox execution. No third-party data broker tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={handleEssentialOnly}
                aria-label="Dismiss and use essential cookies only"
                className="absolute top-4 right-4 text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] p-1 rounded-md hover:bg-[var(--kc-surface-subtle)] transition-colors"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--kc-text-muted)] pb-3 mb-3 border-b border-[var(--kc-border)]">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                <ShieldCheck size={13} aria-hidden="true" />
                <span>GDPR & CCPA Compliant</span>
              </div>
              <Link
                href="/privacy"
                className="text-[var(--kc-accent)] hover:underline"
              >
                Privacy Policy →
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-[var(--kc-accent)] hover:opacity-90 text-[var(--kc-on-primary)] text-xs font-medium transition-opacity"
              >
                <Check size={13} aria-hidden="true" />
                <span>Accept All</span>
              </button>
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-md border border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-surface-hover)] text-[var(--kc-text)] hover:text-[var(--kc-text-primary)] text-xs font-medium transition-colors"
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
