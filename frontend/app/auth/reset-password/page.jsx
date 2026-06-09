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
        <div className="w-16 h-16 bg-[#2ea043]/20 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-[#3fb950]" />
        </div>
        <div>
          <p className="text-white font-medium text-lg">Password Reset Successfully</p>
          <p className="text-[#8b949e] text-sm mt-2">
            Your password has been securely updated. You can now sign in with your new password.
          </p>
        </div>
        <button 
          onClick={() => router.push('/auth')}
          className="mt-6 w-full py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-[#58a6ff] hover:bg-[#3182ce] transition-colors"
        >
          Go to Sign In
        </button>
      </motion.div>
    );
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg flex items-center gap-3 text-[#ff7b72] text-sm">
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
          className="appearance-none rounded-xl relative block w-full px-3 py-3 border border-[#30363d] bg-[#21262d] text-[#8b949e] sm:text-sm cursor-not-allowed opacity-70"
        />
      </div>

      <div>
        <label htmlFor="new-password" className="sr-only">New Password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-[#8b949e]" />
          </div>
          <input
            id="new-password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-[#30363d] bg-[#0d1117] text-white placeholder-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff] sm:text-sm transition-colors"
            placeholder="New password"
          />
        </div>
        <p className="mt-2 text-xs text-[#8b949e]">Must be at least 8 characters, with 1 uppercase and 1 number.</p>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#3fb950] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2ea043] focus:ring-offset-[#0d1117] transition-all disabled:opacity-50 shadow-lg"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            'Reset Password'
          )}
        </button>
      </div>
      
      <div className="text-center">
        <Link href="/auth" className="flex items-center justify-center gap-2 text-[#8b949e] hover:text-[#58a6ff] transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-[#161b22] p-8 rounded-2xl border border-[#30363d] shadow-xl"
      >
        <div>
          <h2 className="mt-2 text-center text-3xl font-display font-bold text-white">
            Set new password
          </h2>
        </div>
        
        <Suspense fallback={<div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div></div>}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
