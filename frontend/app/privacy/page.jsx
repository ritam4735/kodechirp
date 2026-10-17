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
      title: '4. Authentication, Cookies & Telemetry Preferences',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>
            KodeChirp uses JSON Web Tokens (JWT) for secure authentication. These tokens, along with your interface preferences (such as light/dark theme and cookie choices), are stored locally in your browser&apos;s <code className="text-[#58a6ff] bg-black/40 px-1.5 py-0.5 rounded text-xs">localStorage</code>.
          </p>
          <p>
            We respect your privacy choices through our Cookie &amp; Privacy Consent banner. With your consent, we collect minimal, anonymized telemetry (page navigation and code execution benchmarks) to improve judge speed and stability. We never deploy invasive third-party ad pixels or sell your data to data brokers. You can adjust your consent choices at any time via the Cookie Preferences link in the footer.
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
            className="inline-flex items-center gap-1.5 text-xs text-[var(--kc-text-muted)] hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-md bg-[var(--kc-accent)]/10 border border-[var(--kc-accent)]/20 flex items-center justify-center">
              <Shield size={13} className="text-[var(--kc-accent)]" />
            </div>
            <span className="text-[11px] font-bold text-[var(--kc-accent)] uppercase tracking-wider">Legal</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--kc-text-muted)]">
            Last updated: {lastUpdated} · Open-source and privacy-respecting by design.
          </p>
        </div>

        {/* Policy Content Card */}
        <div className="rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] p-6 sm:p-8 space-y-8 shadow-sm">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div
                key={idx}
                className={idx > 0 ? 'pt-8 border-t border-[var(--kc-border)]' : ''}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <Icon size={16} className="text-[var(--kc-accent)] shrink-0" />
                  <h2 className="text-base font-display font-semibold text-white">
                    {section.title}
                  </h2>
                </div>
                {section.content}
              </div>
            );
          })}

          {/* Contact note */}
          <div className="pt-6 border-t border-[var(--kc-border)] bg-[var(--kc-surface-subtle)]/50 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-white">Questions about privacy?</h3>
                <p className="text-xs text-[var(--kc-text-muted)] mt-0.5">
                  Reach out to the maintainers or inspect our codebase on GitHub.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Link
                  href="/contact"
                  className="px-3.5 py-2 text-xs font-medium text-white bg-[var(--kc-accent)] hover:opacity-90 rounded-md transition-opacity"
                >
                  Contact Us
                </Link>
                <a
                  href="https://github.com/ritam4735/kodechirp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-xs font-medium text-[var(--kc-text-muted)] hover:text-white bg-[var(--kc-surface-subtle)] hover:bg-[rgba(255,255,255,0.06)] border border-[var(--kc-border)] rounded-md transition-colors"
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
