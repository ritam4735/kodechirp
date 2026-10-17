'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !emailParam) {
      setError('Invalid or missing reset token.');
    }
  }, [token, emailParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !emailParam) return;
    
    setLoading(true);
    setError('');
    
    try {
      await api.resetPassword(emailParam, token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The token may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !emailParam) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-[#f85149]/20 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={32} className="text-[#ff7b72]" />
        </div>
        <p className="text-[#ff7b72] font-medium">{error || 'Invalid reset link'}</p>
        <Link href="/auth/forgot-password" className="text-[#58a6ff] hover:underline text-sm font-medium flex items-center justify-center gap-2">
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
          <CheckCircle size={24} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-medium text-base">Password Reset Successfully</p>
          <p className="text-[var(--kc-text-muted)] text-sm mt-1.5">
            Your password has been securely updated. You can now sign in with your new password.
          </p>
        </div>
        <button 
          onClick={() => router.push('/auth')}
          className="mt-4 w-full py-2.5 px-4 text-sm font-medium rounded-md text-white bg-[var(--kc-accent)] hover:opacity-90 transition-opacity"
        >
          Go to Sign In
        </button>
      </motion.div>
    );
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center gap-2.5 text-rose-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="sr-only">Email address</label>
        <input
          type="email"
          disabled
          value={emailParam || ''}
          className="appearance-none rounded-md relative block w-full px-3 py-2.5 border border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] text-[var(--kc-text-muted)] sm:text-sm cursor-not-allowed opacity-75 font-mono"
        />
      </div>

      <div>
        <label htmlFor="new-password" className="sr-only">New Password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-[var(--kc-text-muted)]" />
          </div>
          <input
            id="new-password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none rounded-md relative block w-full px-3 py-2.5 pl-9 border border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] text-white placeholder-[var(--kc-text-muted)] focus:outline-none focus:border-[var(--kc-accent)] sm:text-sm transition-colors"
            placeholder="New password"
          />
        </div>
        <p className="mt-1.5 text-xs text-[var(--kc-text-muted)]">Must be at least 8 characters, with 1 uppercase and 1 number.</p>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-2.5 px-4 text-sm font-medium rounded-md text-white bg-[var(--kc-accent)] hover:opacity-90 focus:outline-none transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            'Reset Password'
          )}
        </button>
      </div>
      
      <div className="text-center">
        <Link href="/auth" className="inline-flex items-center justify-center gap-1.5 text-[var(--kc-text-muted)] hover:text-white transition-colors text-xs font-medium">
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6 bg-[var(--kc-surface)] p-8 rounded-lg border border-[var(--kc-border)] shadow-sm"
      >
        <div>
          <h2 className="text-center text-2xl font-display font-semibold text-white">
            Set new password
          </h2>
          <p className="text-center text-xs text-[var(--kc-text-muted)] mt-1">
            Choose a strong, unique password for your account
          </p>
        </div>
        
        <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin"></div></div>}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
