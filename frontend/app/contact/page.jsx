'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Github, MessageSquare, Send, ArrowLeft, HelpCircle, ShieldAlert } from 'lucide-react';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';

export default function ContactPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    category: 'General Feedback',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const clearFieldError = (f) => {
    if (fieldErrors[f]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[f];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const newFieldErrors = {};

    // Pre-flight client validation
    if (!form.name.trim()) {
      newFieldErrors.name = 'Please provide your name.';
    }

    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newFieldErrors.email = 'Please provide a valid email address (e.g. name@domain.com).';
    }

    if (!form.message.trim() || form.message.trim().length < 10) {
      newFieldErrors.message = 'Please enter a message with at least 10 characters.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError('Please resolve the highlighted field errors below.');
      return;
    }

    setSubmitting(true);

    try {
      // Simulate submission network handshake
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
      router.push('/thank-you?type=contact');
    } catch (err) {
      setError('An unexpected error occurred. Please try submitting via our GitHub repository.');
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <AnimatedBackground variant="questions" />

      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-md bg-[var(--kc-accent)]/10 border border-[var(--kc-accent)]/20 flex items-center justify-center">
              <Mail size={13} className="text-[var(--kc-accent)]" />
            </div>
            <span className="text-[11px] font-bold text-[var(--kc-accent)] uppercase tracking-wider">Support</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-[var(--kc-text-primary)] mb-2">
            Contact & Support
          </h1>
          <p className="text-sm text-[var(--kc-text-muted)]">
            Have a question, feedback, or a bug report? Reach out through our community channels or send us a message.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Column: Direct Project Channels */}
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-display font-semibold text-[var(--kc-text-primary)] flex items-center gap-2">
                <HelpCircle size={16} className="text-[var(--kc-accent)]" />
                Direct Channels
              </h2>

              <div className="space-y-3 text-xs text-[var(--kc-text-muted)]">
                <a
                  href="mailto:support@kodechirp.com"
                  className="flex items-start gap-3 p-3 rounded-md bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-surface-hover)] border border-[var(--kc-border)] transition-colors group"
                >
                  <Mail size={16} className="text-[var(--kc-accent)] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[var(--kc-text-primary)] group-hover:text-[var(--kc-accent)] transition-colors block text-xs">
                      Official Support Email
                    </strong>
                    <span className="text-[var(--kc-text)] font-mono text-[11px] mt-0.5 block">
                      support@kodechirp.com
                    </span>
                    <span className="text-[var(--kc-text-muted)] text-[10px] mt-0.5 block">
                      Response window: Mon–Fri within 24–48h
                    </span>
                  </div>
                </a>

                <a
                  href="https://github.com/ritam4735/kodechirp/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-md bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-surface-hover)] border border-[var(--kc-border)] transition-colors group"
                >
                  <Github size={16} className="text-[var(--kc-text-primary)] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[var(--kc-text-primary)] group-hover:text-[var(--kc-accent)] transition-colors block text-xs">
                      GitHub Issues & Bug Tracker
                    </strong>
                    <span className="text-[var(--kc-text-muted)] text-[11px] mt-0.5 block">
                      Track open bugs, test-case anomalies, and judge worker fixes.
                    </span>
                  </div>
                </a>

                <Link
                  href="/questions"
                  className="flex items-start gap-3 p-3 rounded-md bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-surface-hover)] border border-[var(--kc-border)] transition-colors group"
                >
                  <MessageSquare size={16} className="text-[var(--kc-accent)] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[var(--kc-text-primary)] group-hover:text-[var(--kc-accent)] transition-colors block text-xs">
                      Community Chirps
                    </strong>
                    <span className="text-[var(--kc-text-muted)] text-[11px] mt-0.5 block">
                      Discuss optimal algorithms and ask peers directly on challenge pages.
                    </span>
                  </div>
                </Link>

                <a
                  href="mailto:security@kodechirp.com"
                  className="flex items-start gap-3 p-3 rounded-md bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-surface-hover)] border border-[var(--kc-border)] transition-colors group"
                >
                  <ShieldAlert size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[var(--kc-text-primary)] group-hover:text-emerald-400 transition-colors block text-xs">
                      Security & Responsible Disclosure
                    </strong>
                    <span className="text-[var(--kc-text)] font-mono text-[11px] mt-0.5 block">
                      security@kodechirp.com
                    </span>
                    <span className="text-[var(--kc-text-muted)] text-[10px] mt-0.5 block">
                      Report sandbox vulnerabilities or worker escalation issues.
                    </span>
                  </div>
                </a>
              </div>
            </div>

            {/* Maintainer Info Card */}
            <div className="rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] p-5 text-xs text-[var(--kc-text-muted)] space-y-2 shadow-sm">
              <div className="font-medium text-[var(--kc-text-primary)]">Project Maintainer</div>
              <p className="leading-relaxed text-[var(--kc-text)]">
                Created and maintained by <strong>Ritam Chatterjee</strong> (<a href="https://github.com/ritam4735" target="_blank" rel="noopener noreferrer" className="text-[var(--kc-accent)] hover:underline">@ritam4735</a>).
              </p>
              <p className="text-[11px] text-[var(--kc-text-muted)]">
                Location: Kolkata, India · UTC+05:30
              </p>
            </div>

            {/* Quick Policies Card */}
            <div className="rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] p-5 text-xs text-[var(--kc-text-muted)] space-y-2 shadow-sm">
              <div className="font-medium text-[var(--kc-text-primary)]">Policies & Guidelines</div>
              <p className="leading-relaxed">
                Before reaching out, check our legal policies:
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Link href="/privacy" className="text-[var(--kc-accent)] hover:underline">
                  Privacy Policy →
                </Link>
                <Link href="/terms" className="text-[var(--kc-accent)] hover:underline">
                  Terms of Service →
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Feedback / Message Form */}
          <div className="md:col-span-3">
            <div className="rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] p-6 sm:p-7 shadow-sm">
              <h2 className="text-base font-display font-semibold text-[var(--kc-text-primary)] mb-1">
                Send a Message
              </h2>
              <p className="text-xs text-[var(--kc-text-muted)] mb-5">
                Fill in your details below and our maintainer team will review your note.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-md flex items-center gap-2">
                  <ShieldAlert size={14} className="shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-medium text-[var(--kc-text-muted)] mb-1.5 uppercase tracking-wider">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    disabled={submitting}
                    placeholder="e.g. Alex Chen"
                    value={form.name}
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      clearFieldError('name');
                    }}
                    className={`w-full bg-[var(--kc-surface-subtle)] text-sm text-[var(--kc-text-primary)] placeholder-[var(--kc-text-muted)] rounded-md px-3.5 py-2.5 focus:outline-none transition-colors disabled:opacity-50 ${
                      fieldErrors.name
                        ? 'border border-rose-500'
                        : 'border border-[var(--kc-border)] focus:border-[var(--kc-accent)]'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p id="contact-name-error" role="alert" className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                      <span>{fieldErrors.name}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-medium text-[var(--kc-text-muted)] mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    disabled={submitting}
                    placeholder="you@domain.com"
                    value={form.email}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      clearFieldError('email');
                    }}
                    className={`w-full bg-[var(--kc-surface-subtle)] text-sm text-[var(--kc-text-primary)] placeholder-[var(--kc-text-muted)] rounded-md px-3.5 py-2.5 focus:outline-none transition-colors disabled:opacity-50 ${
                      fieldErrors.email
                        ? 'border border-rose-500'
                        : 'border border-[var(--kc-border)] focus:border-[var(--kc-accent)]'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p id="contact-email-error" role="alert" className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-category" className="block text-xs font-medium text-[var(--kc-text-muted)] mb-1.5 uppercase tracking-wider">
                    Topic / Category
                  </label>
                  <select
                    id="contact-category"
                    disabled={submitting}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] text-sm text-[var(--kc-text-primary)] rounded-md px-3.5 py-2.5 focus:border-[var(--kc-accent)] focus:outline-none transition-colors disabled:opacity-50"
                  >
                    <option value="General Feedback">General Feedback</option>
                    <option value="Bug Report">Bug Report & Test Case Issue</option>
                    <option value="Challenge Suggestion">New Algorithmic Challenge Suggestion</option>
                    <option value="Security Inquiry">Security & Responsible Disclosure</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-medium text-[var(--kc-text-muted)] mb-1.5 uppercase tracking-wider">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    disabled={submitting}
                    rows={4}
                    placeholder="Describe your inquiry or feedback in detail..."
                    value={form.message}
                    aria-invalid={!!fieldErrors.message}
                    aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
                    onChange={(e) => {
                      setForm({ ...form, message: e.target.value });
                      clearFieldError('message');
                    }}
                    className={`w-full bg-[var(--kc-surface-subtle)] text-sm text-[var(--kc-text-primary)] placeholder-[var(--kc-text-muted)] rounded-md p-3.5 focus:outline-none transition-colors resize-none disabled:opacity-50 ${
                      fieldErrors.message
                        ? 'border border-rose-500'
                        : 'border border-[var(--kc-border)] focus:border-[var(--kc-accent)]'
                    }`}
                  />
                  {fieldErrors.message && (
                    <p id="contact-message-error" role="alert" className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                      <span>{fieldErrors.message}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[var(--kc-accent)] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-[var(--kc-on-primary)] font-medium py-2.5 px-4 rounded-md transition-opacity flex items-center justify-center gap-2 text-sm mt-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[var(--kc-on-primary)]/30 border-t-[var(--kc-on-primary)] rounded-full animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
