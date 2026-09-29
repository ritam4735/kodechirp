import Link from 'next/link';
import { FileText, Cpu, AlertTriangle, MessageSquare, Scale, Terminal, ArrowLeft } from 'lucide-react';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';

export const metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions for using KodeChirp’s online judge, code execution sandboxes, and developer community platform.',
};

export default function TermsPage() {
  const lastUpdated = 'September 2026';

  const sections = [
    {
      icon: Scale,
      title: '1. Acceptance of Terms',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>
            By accessing or using <strong className="text-white">KodeChirp</strong> (&ldquo;the platform&rdquo;), you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you should discontinue using the platform.
          </p>
          <p>
            KodeChirp is an open-source, engineering-first online judge and learning platform built for algorithmic practice, technical interview preparation, and peer collaboration.
          </p>
        </div>
      ),
    },
    {
      icon: Cpu,
      title: '2. Code Execution & Acceptable Use Policy',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>
            Our platform provides automated code execution within isolated Docker sandboxes. You are granted access to run and submit code for educational and algorithmic problem-solving purposes.
          </p>
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs space-y-1.5">
            <div className="font-semibold text-rose-200 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Strictly Prohibited Activities:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-rose-300/90">
              <li>Attempting to escape or compromise Docker container isolation or proxy sockets.</li>
              <li>Attempting network calls, socket connections, or lateral scanning within the execution environment.</li>
              <li>Executing fork bombs, infinite allocation loops designed to bypass cgroup memory ceilings, or denial-of-service attacks.</li>
              <li>Interfering with other users&apos; executions, worker queues, or judge infrastructure.</li>
            </ul>
          </div>
          <p>
            Violation of these rules will result in immediate account suspension and IP-level restriction.
          </p>
        </div>
      ),
    },
    {
      icon: MessageSquare,
      title: '3. Intellectual Property & Community Chirps',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>
            You retain ownership of the original code and algorithmic explanations you write and publish on KodeChirp.
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-[#c9d1d9]">License to Execute:</strong> By submitting code to the judge, you grant KodeChirp the technical license to compile, execute, test, and generate runtime diagnostics for your code.
            </li>
            <li>
              <strong className="text-[#c9d1d9]">Community Contributions:</strong> When you share a Chirp on a problem, you grant other developers permission to view, learn from, and discuss your approach in the spirit of open peer learning.
            </li>
            <li>
              <strong className="text-[#c9d1d9]">Community Standards:</strong> Chirps and discussions must remain respectful, constructive, and free of abusive or harmful content.
            </li>
          </ul>
        </div>
      ),
    },
    {
      icon: Terminal,
      title: '4. Service Availability & Limitations',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>
            KodeChirp is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. While we strive for maximum uptime and sub-second queue processing:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Execution throughput is subject to queue capacity, worker load, and sandbox limits.</li>
            <li>We make no guarantees of uninterrupted service or absolute immunity from unexpected execution timeouts.</li>
            <li>Platform maintainers reserve the right to modify challenge definitions, test cases, or starter code templates to improve pedagogical quality.</li>
          </ul>
        </div>
      ),
    },
    {
      icon: FileText,
      title: '5. Open Source & Project License',
      content: (
        <div className="space-y-3 text-sm text-[#8b949e] leading-relaxed">
          <p>
            KodeChirp is an open-source project created by <a href="https://github.com/ritam4735" target="_blank" rel="noopener noreferrer" className="text-[#58a6ff] hover:underline font-medium">Ritam</a>. You can inspect the source code, review architectural diagrams, report issues, and contribute improvements directly on GitHub.
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
            <div className="w-7 h-7 rounded-lg bg-[#a371f7]/15 border border-[#a371f7]/20 flex items-center justify-center">
              <FileText size={14} className="text-[#a371f7]" />
            </div>
            <span className="text-[12px] font-bold text-[#a371f7] uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white mb-2">
            Terms & Conditions
          </h1>
          <p className="text-sm text-[#8b949e]">
            Last updated: {lastUpdated} · Fair usage guidelines for developers and learners.
          </p>
        </div>

        {/* Terms Content Card */}
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
                  <Icon size={18} className="text-[#a371f7] shrink-0" />
                  <h2 className="text-lg font-display font-bold text-white">
                    {section.title}
                  </h2>
                </div>
                {section.content}
              </div>
            );
          })}

          {/* Bottom Card Footer */}
          <div className="pt-8 border-t border-white/[0.06] bg-white/[0.01] -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Need clarification or support?</h3>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  Have questions about acceptable use or our sandbox environment?
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/contact"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#a371f7]/20 hover:bg-[#a371f7]/30 border border-[#a371f7]/30 rounded-lg transition-colors"
                >
                  Contact Support
                </Link>
                <Link
                  href="/privacy"
                  className="px-4 py-2 text-xs font-semibold text-[#8b949e] hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-lg transition-colors"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
