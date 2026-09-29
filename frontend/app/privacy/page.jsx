import Link from 'next/link';
import { Shield, Lock, Database, Server, UserCheck, FileCode2, ArrowLeft } from 'lucide-react';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Learn how KodeChirp handles user accounts, code submissions, execution logs, and session cookies.',
};

export default function PrivacyPage() {
  const lastUpdated = 'September 2026';

  const sections = [
    {
      icon: UserCheck,
      title: '1. Information We Collect',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>
            When you register and interact with <strong className="text-white">KodeChirp</strong>, we collect only the minimal data required to provide our algorithmic practice platform:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-[#c9d1d9]">Account Information:</strong> Your username, email address, and encrypted (salted and hashed via bcrypt) password.
            </li>
            <li>
              <strong className="text-[#c9d1d9]">Profile Details:</strong> Optional avatar URL and display name configured in your account settings.
            </li>
            <li>
              <strong className="text-[#c9d1d9]">Code Submissions:</strong> Source code submitted to the judge or sandbox, selected programming language, timestamps, execution verdicts, runtime, and memory metrics.
            </li>
            <li>
              <strong className="text-[#c9d1d9]">Community Chirps:</strong> Publicly posted problem breakdowns, explanations, and code commentary.
            </li>
          </ul>
        </div>
      ),
    },
    {
      icon: Server,
      title: '2. Code Execution & Sandboxing',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>
            KodeChirp runs submitted code in ephemeral, isolated Docker containers managed by our execution workers:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Sandboxes operate with strictly disabled network access to prevent unauthorized outbound or inbound network connections.</li>
            <li>Containers enforce strict CPU quotas, time limits (typically 2–5 seconds), and memory ceilings (typically 256–512 MB).</li>
            <li>Execution containers are torn down and recycled after test completion; code is not shared with any external third-party AI APIs without your explicit consent.</li>
          </ul>
        </div>
      ),
    },
    {
      icon: Database,
      title: '3. How Your Data Is Stored & Used',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>We use your information solely to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Authenticate your sessions and maintain your problem-solving progress.</li>
            <li>Evaluate algorithmic code against test suites and generate submission diagnostics.</li>
            <li>Render your personal submission history on the Submissions and Progress dashboards.</li>
            <li>Display community discussions (Chirps) on relevant problem pages.</li>
          </ul>
          <p className="mt-2">
            Data is stored in our PostgreSQL database and Redis job queues. We do not sell, rent, or monetize your personal data.
          </p>
        </div>
      ),
    },
    {
      icon: Lock,
      title: '4. Authentication & Local Storage',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>
            KodeChirp uses JSON Web Tokens (JWT) for secure authentication. These tokens, along with your interface preferences (such as light/dark theme), are stored locally in your browser&apos;s <code className="text-[#58a6ff] bg-black/40 px-1.5 py-0.5 rounded text-xs">localStorage</code>.
          </p>
          <p>
            We do not use tracking cookies, third-party analytics pixels, or advertising trackers.
          </p>
        </div>
      ),
    },
    {
      icon: Shield,
      title: '5. Your Rights & Data Control',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>
            You retain control over your data. You may review your submissions, update your profile details, or reset your credentials at any time through your <Link href="/settings" className="text-[#58a6ff] hover:underline">Settings</Link>.
          </p>
          <p>
            If you wish to delete your account or have specific privacy inquiries, you can reach out via our <Link href="/contact" className="text-[#58a6ff] hover:underline">Contact page</Link> or through our open-source repository on GitHub.
          </p>
        </div>
      ),
    },
  ];

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
              <Shield size={14} className="text-[#58a6ff]" />
            </div>
            <span className="text-[12px] font-bold text-[#58a6ff] uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#8b949e]">
            Last updated: {lastUpdated} · Open-source and privacy-respecting by design.
          </p>
        </div>

        {/* Policy Content Card */}
        <div
          className="rounded-2xl border border-white/[0.08] p-6 sm:p-8 space-y-8"
          style={{
            background: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div
                key={idx}
                className={idx > 0 ? 'pt-8 border-t border-white/[0.06]' : ''}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <Icon size={18} className="text-[#58a6ff] shrink-0" />
                  <h2 className="text-lg font-display font-bold text-white">
                    {section.title}
                  </h2>
                </div>
                {section.content}
              </div>
            );
          })}

          {/* Contact note */}
          <div className="pt-8 border-t border-white/[0.06] bg-white/[0.01] -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Questions about privacy?</h3>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  Reach out to the maintainers or inspect our codebase on GitHub.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/contact"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#58a6ff]/20 hover:bg-[#58a6ff]/30 border border-[#58a6ff]/30 rounded-lg transition-colors"
                >
                  Contact Us
                </Link>
                <a
                  href="https://github.com/ritam4735/kodechirp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-xs font-semibold text-[#8b949e] hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-lg transition-colors"
                >
                  GitHub Repository
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
