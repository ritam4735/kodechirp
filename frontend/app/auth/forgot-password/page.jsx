'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../lib/api';

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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-[#161b22] p-8 rounded-2xl border border-[#30363d] shadow-xl"
      >
        <div>
          <h2 className="mt-2 text-center text-3xl font-display font-bold text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-[#8b949e]">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <div className="w-16 h-16 bg-[#2ea043]/20 rounded-full flex items-center justify-center">
              <CheckCircle size={32} className="text-[#3fb950]" />
            </div>
            <div>
              <p className="text-white font-medium text-lg">Check your email</p>
              <p className="text-[#8b949e] text-sm mt-2">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
              <p className="text-[#8b949e] text-xs mt-4 italic">
                If an account exists with this email, you will receive a reset link shortly.
              </p>
            </div>
            <Link href="/auth" className="mt-6 flex items-center gap-2 text-[#58a6ff] hover:underline text-sm font-medium">
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </motion.div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg flex items-center gap-3 text-[#ff7b72] text-sm">
                <AlertCircle size={16} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#8b949e]" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-[#30363d] bg-[#0d1117] text-white placeholder-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff] sm:text-sm transition-colors"
                  placeholder="Email address"
                />
              </div>
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
                  'Send reset link'
                )}
              </button>
            </div>
            
            <div className="text-center">
              <Link href="/auth" className="flex items-center justify-center gap-2 text-[#8b949e] hover:text-[#58a6ff] transition-colors text-sm font-medium">
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
