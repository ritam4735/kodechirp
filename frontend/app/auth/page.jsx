'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';

import { api } from '../../lib/api';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { handleLogin } = useAuth();
  const router = useRouter();

  const handleResend = async () => {
    setResending(true);
    setResendSuccess('');
    setError('');
    try {
      await api.resendVerification(unverifiedEmail);
      setResendSuccess('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setUnverifiedEmail('');
    setResendSuccess('');

    // Client-side form validation
    if (!identifier.trim()) {
      setError(isLogin ? 'Please enter your username or email.' : 'Please enter your email.');
      return;
    }

    if (!isLogin && name.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      let data;
      if (isLogin) {
        data = await api.login(identifier, password);
      } else {
        data = await api.signup(identifier, password, name);
        if (data.verificationRequired) {
          setSuccessMessage(data.message);
          setIsLogin(true); // Switch to login view automatically
          return;
        }
      }
      
      handleLogin(data.user, data.accessToken);
      
      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err.message);
      if (err.message?.includes('not verified')) {
        // Provide the identifier (usually email, but could be username)
        setUnverifiedEmail(identifier);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-8 sm:py-12 px-3 sm:px-4">
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 sm:p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-xl sm:text-2xl font-bold text-[#e6edf3] mb-6 text-center">
          {isLogin ? 'Welcome Back' : 'Create an Account'}
        </h2>
        {successMessage && <div className="bg-[#2ea043]/10 border border-[#2ea043]/30 text-[#3fb950] p-3 rounded mb-4 text-sm">{successMessage}</div>}
        {resendSuccess && <div className="bg-[#2ea043]/10 border border-[#2ea043]/30 text-[#3fb950] p-3 rounded mb-4 text-sm">{resendSuccess}</div>}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm flex flex-col gap-2">
            <span>{error}</span>
            {unverifiedEmail && !resendSuccess && (
              <button 
                type="button"
                onClick={handleResend}
                disabled={resending || submitting}
                className="self-start text-[#58a6ff] hover:underline text-xs font-medium disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="username-field" className="block text-sm font-medium text-[#8b949e] mb-1">Username</label>
              <input
                id="username-field"
                required
                disabled={submitting}
                minLength={3}
                maxLength={50}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded p-2 focus:border-[#58a6ff] focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>
          )}
          <div>
            <label htmlFor="identifier-field" className="block text-sm font-medium text-[#8b949e] mb-1">
              {isLogin ? 'Username or Email' : 'Email'}
            </label>
            <input
              id="identifier-field"
              required
              disabled={submitting}
              type={isLogin ? "text" : "email"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded p-2 focus:border-[#58a6ff] focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="password-field" className="block text-sm font-medium text-[#8b949e]">Password</label>
              {isLogin && (
                <Link href="/auth/forgot-password" className="text-xs text-[#58a6ff] hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              id="password-field"
              required
              disabled={submitting}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded p-2 focus:border-[#58a6ff] focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 rounded transition-colors mt-2 flex items-center justify-center gap-2"
          >
            {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{submitting ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Sign Up')}</span>
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-[#8b949e]">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            disabled={submitting}
            onClick={() => {
              setError('');
              setSuccessMessage('');
              setIsLogin(!isLogin);
            }} 
            className="text-[#58a6ff] hover:underline disabled:opacity-50"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
