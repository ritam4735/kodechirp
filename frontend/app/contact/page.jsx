'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Github, MessageSquare, Send, ArrowLeft, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
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
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Pre-flight client validation
    if (!form.name.trim()) {
      setError('Please provide your name.');
      return;
    }

    if (!form.email.trim() || !form.email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!form.message.trim() || form.message.trim().length < 10) {
      setError('Please enter a message with at least 10 characters.');
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
            className="inline-flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#58a6ff] transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#58a6ff]/15 border border-[#58a6ff]/20 flex items-center justify-center">
              <Mail size={14} className="text-[#58a6ff]" />
            </div>
            <span className="text-[12px] font-bold text-[#58a6ff] uppercase tracking-widest">Support</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white mb-2">
            Contact & Support
          </h1>
          <p className="text-sm text-[#8b949e]">
            Have a question, feedback, or a bug report? Reach out through our community channels or send us a message.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Column: Direct Project Channels */}
          <div className="md:col-span-2 space-y-4">
            <div
              className="rounded-2xl border border-white/[0.08] p-5 sm:p-6 space-y-4"
              style={{
                background: 'rgba(255,255,255,0.025)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              }}
            >
              <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
                <HelpCircle size={17} className="text-[#58a6ff]" />
                Direct Channels
              </h2>

              <div className="space-y-3.5 text-xs text-[#8b949e]">
                <a
                  href="https://github.com/ritam4735/kodechirp/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all group"
                >
                  <Github size={18} className="text-white shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white group-hover:text-[#58a6ff] transition-colors block text-xs">
                      GitHub Issues & Bug Reports
                    </strong>
                    <span className="text-[#8b949e] text-[11px] mt-0.5 block">
                      Track open bugs, test-case anomalies, and judge worker fixes.
                    </span>
                  </div>
                </a>

                <Link
                  href="/questions"
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all group"
                >
                  <MessageSquare size={18} className="text-[#a371f7] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white group-hover:text-[#a371f7] transition-colors block text-xs">
                      Community Chirps
                    </strong>
                    <span className="text-[#8b949e] text-[11px] mt-0.5 block">
                      Discuss optimal algorithms and ask peers directly on challenge pages.
                    </span>
                  </div>
                </Link>

                <a
                  href="https://github.com/ritam4735"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all group"
                >
                  <ShieldAlert size={18} className="text-[#22c55e] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white group-hover:text-[#22c55e] transition-colors block text-xs">
                      Security & Responsible Disclosure
                    </strong>
                    <span className="text-[#8b949e] text-[11px] mt-0.5 block">
                      Report sandbox vulnerabilities or worker privilege escalation issues.
                    </span>
                  </div>
                </a>
              </div>
            </div>

            {/* Quick Policies Card */}
            <div
              className="rounded-2xl border border-white/[0.08] p-5 text-xs text-[#8b949e] space-y-2"
              style={{
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="font-semibold text-white">Policies & Guidelines</div>
              <p className="leading-relaxed">
                Before reaching out, check our legal policies:
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Link href="/privacy" className="text-[#58a6ff] hover:underline">
                  Privacy Policy →
                </Link>
                <Link href="/terms" className="text-[#58a6ff] hover:underline">
                  Terms of Service →
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Feedback / Message Form */}
          <div className="md:col-span-3">
            <div
              className="rounded-2xl border border-white/[0.08] p-6 sm:p-7"
              style={{
                background: 'rgba(255,255,255,0.025)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <h2 className="text-lg font-display font-bold text-white mb-1">
                Send a Message
              </h2>
              <p className="text-xs text-[#8b949e] mb-6">
                Fill in your details below and our maintainer team will review your note.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <span className="shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-semibold text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    disabled={submitting}
                    placeholder="e.g. Alex Chen"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-sm text-[#e6edf3] placeholder-[#484f58] rounded-xl px-3.5 py-2.5 focus:border-[#58a6ff] focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-semibold text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    disabled={submitting}
                    placeholder="you@domain.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-sm text-[#e6edf3] placeholder-[#484f58] rounded-xl px-3.5 py-2.5 focus:border-[#58a6ff] focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="contact-category" className="block text-xs font-semibold text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Topic / Category
                  </label>
                  <select
                    id="contact-category"
                    disabled={submitting}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-sm text-[#e6edf3] rounded-xl px-3.5 py-2.5 focus:border-[#58a6ff] focus:outline-none transition-colors disabled:opacity-50"
                  >
                    <option value="General Feedback">General Feedback</option>
                    <option value="Bug Report">Bug Report & Test Case Issue</option>
                    <option value="Challenge Suggestion">New Algorithmic Challenge Suggestion</option>
                    <option value="Security Inquiry">Security & Responsible Disclosure</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-semibold text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    disabled={submitting}
                    rows={4}
                    placeholder="Describe your inquiry or feedback in detail..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-sm text-[#e6edf3] placeholder-[#484f58] rounded-xl p-3.5 focus:border-[#58a6ff] focus:outline-none transition-colors resize-none disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
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
