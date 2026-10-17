'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';
import Logo from '../../../components/ui/Logo';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token || !emailParam) {
      setStatus('error');
      setErrorMsg('Invalid verification link. Token or email is missing.');
      return;
    }

    const verify = async () => {
      try {
        await api.verifyEmail(emailParam, token);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.message || 'Verification failed. The link may have expired.');
      }
    };

    verify();
  }, [token, emailParam]);

  const handleResend = async () => {
    if (!emailParam) return;
    setResending(true);
    setResendSuccess(false);
    setErrorMsg('');
    try {
      await api.resendVerification(emailParam);
      setResendSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <div className="w-8 h-8 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-[var(--kc-text-muted)] font-medium">Verifying your email...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
          <CheckCircle size={24} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-display font-semibold text-xl mb-1.5">Email Verified</h3>
          <p className="text-[var(--kc-text-muted)] text-sm">
            Thank you for verifying your email address. Your account is now active.
          </p>
        </div>
        <button 
          onClick={() => router.push('/auth')}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-md text-white bg-[var(--kc-accent)] hover:opacity-90 transition-opacity"
        >
          Go to Sign In <ArrowRight size={14} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-5 text-center"
    >
      <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center">
        <AlertCircle size={24} className="text-rose-400" />
      </div>
      <div>
        <h3 className="text-white font-display font-semibold text-xl mb-1.5">Verification Failed</h3>
        <p className="text-rose-400 text-sm">
          {errorMsg}
        </p>
      </div>

      {resendSuccess ? (
        <div className="w-full p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
          <p className="text-emerald-400 text-xs font-medium">A new verification link has been sent to your email.</p>
        </div>
      ) : (
        emailParam && (
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full py-2.5 px-4 border border-[var(--kc-border)] text-sm font-medium rounded-md text-white bg-[var(--kc-surface-subtle)] hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-50"
          >
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </button>
        )
      )}

      <Link href="/auth" className="text-xs text-[var(--kc-text-muted)] hover:text-white transition-colors font-medium">
        Back to Sign In
      </Link>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-[var(--kc-surface)] p-8 rounded-lg border border-[var(--kc-border)] shadow-sm">
        <div className="flex justify-center mb-6">
          <Logo asLink href="/" size="md" variant="full" ariaLabel="KodeChirp Home" />
        </div>
        <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin"></div></div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
