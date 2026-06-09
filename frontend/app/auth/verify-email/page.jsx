'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';

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
      <div className="flex flex-col items-center justify-center space-y-6 py-8">
        <div className="w-16 h-16 border-4 border-[#58a6ff]/30 border-t-[#58a6ff] rounded-full animate-spin"></div>
        <p className="text-lg text-white font-medium animate-pulse">Verifying your email...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="w-20 h-20 bg-[#2ea043]/20 rounded-full flex items-center justify-center mb-2">
          <CheckCircle size={40} className="text-[#3fb950]" />
        </div>
        <div>
          <h3 className="text-white font-bold text-2xl mb-2">Email Verified!</h3>
          <p className="text-[#8b949e] text-sm">
            Thank you for verifying your email address. Your account is now fully active.
          </p>
        </div>
        <button 
          onClick={() => router.push('/auth')}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-[#238636] hover:bg-[#2ea043] transition-colors"
        >
          Go to Sign In <ArrowRight size={16} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <div className="w-20 h-20 bg-[#f85149]/20 rounded-full flex items-center justify-center mb-2">
        <AlertCircle size={40} className="text-[#ff7b72]" />
      </div>
      <div>
        <h3 className="text-white font-bold text-2xl mb-2">Verification Failed</h3>
        <p className="text-[#ff7b72] text-sm mb-4">
          {errorMsg}
        </p>
      </div>

      {resendSuccess ? (
        <div className="w-full p-4 bg-[#2ea043]/10 border border-[#2ea043]/30 rounded-xl">
          <p className="text-[#3fb950] text-sm font-medium">A new verification link has been sent to your email!</p>
        </div>
      ) : (
        emailParam && (
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full py-3 px-4 border border-[#30363d] text-sm font-medium rounded-xl text-[#e6edf3] bg-[#21262d] hover:bg-[#30363d] transition-colors disabled:opacity-50"
          >
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </button>
        )
      )}

      <Link href="/auth" className="text-[#58a6ff] hover:underline text-sm font-medium mt-4">
        Back to Sign In
      </Link>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-[#161b22] p-8 rounded-2xl border border-[#30363d] shadow-xl">
        <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div></div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
