'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  Code2, 
  ArrowLeft, 
  ArrowRight, 
  Compass, 
  Terminal, 
  Sparkles,
  Layers,
  BookOpen
} from 'lucide-react';
import { useEffect } from 'react';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    document.title = '404: Page Not Found | KodeChirp';
  }, []);

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const quickLinks = [
    { label: 'Browse Questions', href: '/questions', icon: Layers, desc: 'Practice algorithmic challenges' },
    { label: 'Upcoming Chirps', href: '/coming-soon/chirps', icon: Sparkles, desc: 'Developer idea exchanges' },
    { label: 'My Submissions', href: '/submissions', icon: BookOpen, desc: 'Review your submission history' },
  ];

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12 overflow-hidden">
      {/* Background ambient lighting */}
      <AnimatedBackground variant="default" />

      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center">
        {/* Kicker badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#f85149]/30 bg-[#f85149]/10 text-[#ff7b72] text-[11px] font-mono tracking-widest uppercase mb-6 shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f85149] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f85149]" />
          </span>
          ERR_404 // UNINDEXED_BRANCH
        </motion.div>

        {/* Big Stylized 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="relative mb-3"
        >
          <div className="text-7xl sm:text-8xl md:text-9xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-[#58a6ff] via-white to-[#a371f7] select-none drop-shadow-sm">
            404
          </div>
          <div 
            className="absolute -inset-2 bg-gradient-to-r from-[#58a6ff]/15 via-transparent to-[#a371f7]/15 blur-2xl -z-10 rounded-full pointer-events-none"
            aria-hidden="true"
          />
        </motion.div>

        {/* Heading & description */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="space-y-3 mb-8 max-w-lg"
        >
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Lost in Algorithmic Space
          </h1>
          <p className="text-sm sm:text-base text-[#8b949e] leading-relaxed">
            The node you&apos;re looking for doesn&apos;t exist in our route topology. It might have been pruned, renamed, or migrated to a different namespace.
          </p>
        </motion.div>

        {/* Terminal diagnostic card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.28, ease: 'easeOut' }}
          className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#161b22]/70 backdrop-blur-xl p-4 text-left shadow-2xl mb-8 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-[#58a6ff]" aria-hidden="true" />
              <span className="text-[11px] font-mono text-[#8b949e]">topology_resolver.ts</span>
            </div>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-[#f85149]/60" />
              <span className="w-2 h-2 rounded-full bg-[#eab308]/60" />
              <span className="w-2 h-2 rounded-full bg-[#22c55e]/60" />
            </div>
          </div>
          <pre className="text-[12px] font-mono leading-relaxed text-[#c9d1d9] overflow-x-auto">
            <code>
              <span className="text-[#8b949e]">{'// Invariant violation: AST traversal failed'}</span>{'\n'}
              <span className="text-[#ff7b72]">const</span> <span className="text-[#79c0ff]">target</span> = router.<span className="text-[#d2a8ff]">resolve</span>(location.pathname);{'\n'}
              <span className="text-[#ff7b72]">if</span> (!target) {'{'}{'\n'}
              {'  '}<span className="text-[#ff7b72]">return</span> {'{'} status: <span className="text-[#79c0ff]">404</span>, verdict: <span className="text-[#a5d6ff]">&apos;PATH_UNREACHABLE&apos;</span> {'}'};{'\n'}
              {'}'}
            </code>
          </pre>
        </motion.div>

        {/* Primary and secondary navigation actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.35, ease: 'easeOut' }}
          className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md mb-8"
        >
          <Link
            href="/questions"
            className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-[#238636]/20 hover:shadow-[#2ea043]/30 hover:-translate-y-0.5"
          >
            <Code2 size={16} aria-hidden="true" />
            <span>Explore Questions</span>
            <ArrowRight size={14} className="ml-0.5" aria-hidden="true" />
          </Link>

          <Link
            href="/"
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
          >
            <Home size={15} aria-hidden="true" />
            <span>Return Home</span>
          </Link>

          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-transparent hover:border-white/[0.08] text-[#8b949e] hover:text-white text-sm font-medium transition-all duration-200"
            title="Navigate to previous page"
            aria-label="Go back to previous page"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Go Back</span>
          </button>
        </motion.div>

        {/* Helpful quick destinations */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.42, ease: 'easeOut' }}
          className="w-full max-w-lg border-t border-white/[0.06] pt-6"
        >
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#484f58] mb-3">
            Suggested Safe Coordinates
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex flex-col items-start p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] text-left transition-all duration-200"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#c9d1d9] group-hover:text-[#58a6ff] transition-colors mb-0.5">
                    <Icon size={13} className="text-[#58a6ff]" aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] text-[#484f58] group-hover:text-[#8b949e] transition-colors line-clamp-1">
                    {item.desc}
                  </span>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
