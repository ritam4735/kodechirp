'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import Logo from '../../../components/ui/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6 bg-[var(--kc-surface)] p-6 sm:p-8 rounded-lg border border-[var(--kc-border)] shadow-sm"
      >
        <div className="flex justify-center mb-2">
          <Logo asLink href="/" size="md" variant="full" ariaLabel="KodeChirp Home" />
        </div>
        <div>
          <h2 className="text-center text-2xl font-display font-bold text-[var(--kc-text-primary)] tracking-tight">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-xs sm:text-sm text-[var(--kc-text-secondary)]">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 text-center py-4"
          >
            <div className="w-12 h-12 bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.25)] rounded-full flex items-center justify-center">
              <CheckCircle size={24} className="text-[#4ade80]" />
            </div>
            <div>
              <p className="text-[var(--kc-text-primary)] font-semibold text-base">Check your email</p>
              <p className="text-[var(--kc-text-secondary)] text-xs mt-1.5">
                We&apos;ve sent password reset instructions to <strong>{email}</strong>
              </p>
              <p className="text-[var(--kc-text-muted)] text-[11px] mt-3 italic">
                If an account exists with this email, you will receive a reset link shortly.
              </p>
            </div>
            <Link href="/auth" className="mt-4 flex items-center gap-1.5 text-[var(--kc-accent)] hover:underline text-xs font-medium">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </motion.div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.25)] rounded-md flex items-center gap-2.5 text-[var(--kc-error, #f87171)] text-xs sm:text-sm">
                <AlertCircle size={15} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                  <Mail className="h-4 w-4 text-[var(--kc-text-muted)]" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2.5 pl-9 border border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] text-[var(--kc-text-primary)] placeholder-[var(--kc-text-muted)] focus:outline-none focus:border-[var(--kc-accent)] text-sm transition-colors"
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                aria-label={loading ? "Sending reset link..." : "Send reset link"}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-[var(--kc-on-primary)] bg-[var(--kc-accent)] hover:opacity-90 focus:outline-none transition-opacity disabled:opacity-50 shadow-xs"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[var(--kc-on-primary)]/30 border-t-[var(--kc-on-primary)] rounded-full animate-spin" aria-hidden="true"></div>
                ) : (
                  'Send reset link'
                )}
              </button>
            </div>
            
            <div className="text-center pt-2">
              <Link href="/auth" className="inline-flex items-center justify-center gap-1.5 text-[var(--kc-text-secondary)] hover:text-[var(--kc-accent)] transition-colors text-xs font-medium">
                <ArrowLeft size={14} aria-hidden="true" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
