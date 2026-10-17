'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { trackEvent } from '../../lib/analytics';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
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

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSuccessMessage('');
    setUnverifiedEmail('');
    setResendSuccess('');

    const newFieldErrors = {};

    // Client-side field validations
    if (!identifier.trim()) {
      newFieldErrors.identifier = isLogin ? 'Please enter your username or email.' : 'Please enter your email.';
    } else if (!isLogin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
      newFieldErrors.identifier = 'Please enter a valid email format (e.g. name@domain.com).';
    }

    if (!isLogin && name.trim().length < 3) {
      newFieldErrors.name = 'Username must be at least 3 characters long.';
    }

    if (password.length < 6) {
      newFieldErrors.password = 'Password must be at least 6 characters long.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError('Please resolve the highlighted fields before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      let data;
      if (isLogin) {
        data = await api.login(identifier, password);
        trackEvent('login_success', { role: data.user?.role });
      } else {
        data = await api.signup(identifier, password, name);
        trackEvent('signup_success');
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
      setError(err.message || 'Authentication failed. Please verify your credentials.');
      if (err.message?.includes('not verified')) {
        setUnverifiedEmail(identifier);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-8 sm:py-12 px-3 sm:px-4">
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 sm:p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-xl sm:text-2xl font-bold font-display text-[#e6edf3] mb-6 text-center">
          {isLogin ? 'Welcome Back' : 'Create an Account'}
        </h1>

        {successMessage && (
          <div className="bg-[#2ea043]/10 border border-[#2ea043]/30 text-[#3fb950] p-3 rounded-xl mb-4 text-sm" role="status">
            {successMessage}
          </div>
        )}

        {resendSuccess && (
          <div className="bg-[#2ea043]/10 border border-[#2ea043]/30 text-[#3fb950] p-3 rounded-xl mb-4 text-sm" role="status">
            {resendSuccess}
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-3 rounded-xl mb-4 text-xs sm:text-sm flex flex-col gap-2" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-400 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
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

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!isLogin && (
            <div>
              <label htmlFor="username-field" className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-1.5">
                Username
              </label>
              <input
                id="username-field"
                required
                disabled={submitting}
                minLength={3}
                maxLength={50}
                autoComplete="username"
                type="text"
                value={name}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'username-error' : undefined}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError('name');
                }}
                className={`w-full bg-[#0d1117] text-[#e6edf3] text-sm rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors disabled:opacity-50 ${
                  fieldErrors.name
                    ? 'border-2 border-[#f85149] focus:ring-2 focus:ring-[#f85149]/30'
                    : 'border border-[#30363d] focus:border-[#58a6ff]'
                }`}
              />
              {fieldErrors.name && (
                <p id="username-error" role="alert" className="text-xs text-[#ff7b72] mt-1.5 flex items-center gap-1">
                  <span>{fieldErrors.name}</span>
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="identifier-field" className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-1.5">
              {isLogin ? 'Username or Email' : 'Email Address'}
            </label>
            <input
              id="identifier-field"
              required
              disabled={submitting}
              autoComplete={isLogin ? 'username' : 'email'}
              type={isLogin ? 'text' : 'email'}
              value={identifier}
              aria-invalid={!!fieldErrors.identifier}
              aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
              onChange={(e) => {
                setIdentifier(e.target.value);
                clearFieldError('identifier');
              }}
              className={`w-full bg-[#0d1117] text-[#e6edf3] text-sm rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors disabled:opacity-50 ${
                fieldErrors.identifier
                  ? 'border-2 border-[#f85149] focus:ring-2 focus:ring-[#f85149]/30'
                  : 'border border-[#30363d] focus:border-[#58a6ff]'
              }`}
            />
            {fieldErrors.identifier && (
              <p id="identifier-error" role="alert" className="text-xs text-[#ff7b72] mt-1.5 flex items-center gap-1">
                <span>{fieldErrors.identifier}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="password-field" className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                Password
              </label>
              {isLogin && (
                <Link href="/auth/forgot-password" className="text-xs text-[#58a6ff] hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                id="password-field"
                required
                disabled={submitting}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                type={showPassword ? 'text' : 'password'}
                value={password}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
                className={`w-full bg-[#0d1117] text-[#e6edf3] text-sm rounded-xl px-3.5 py-2.5 pr-10 focus:outline-none transition-colors disabled:opacity-50 ${
                  fieldErrors.password
                    ? 'border-2 border-[#f85149] focus:ring-2 focus:ring-[#f85149]/30'
                    : 'border border-[#30363d] focus:border-[#58a6ff]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" role="alert" className="text-xs text-[#ff7b72] mt-1.5 flex items-center gap-1">
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 text-sm"
          >
            {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>
              {submitting
                ? isLogin
                  ? 'Signing In...'
                  : 'Creating Account...'
                : isLogin
                ? 'Sign In'
                : 'Sign Up'}
            </span>
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#8b949e]">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setError('');
              setFieldErrors({});
              setSuccessMessage('');
              setIsLogin(!isLogin);
            }}
            className="text-[#58a6ff] hover:underline disabled:opacity-50 font-medium"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
