'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { AnimatedBackground } from '../../../components/ui/AnimatedBackground';
import { Bird, Home, ChevronRight } from 'lucide-react';

const COMING_SOON_CONFIG = {
  chirps: {
    icon: '💬',
    accent: '#a371f7',
    accentRgb: '163,113,247',
    title: 'Chirps',
    tagline: 'A new way for developers to share ideas.',
    description: "We're crafting a beautiful space where your thoughts, solutions, and discoveries can fly free — and inspire the whole flock.",
  },
  flights: {
    icon: '▶️',
    accent: '#58a6ff',
    accentRgb: '88,166,255',
    title: 'Flights',
    tagline: 'Short-form coding explanations, landing soon.',
    description: 'Bite-sized video walkthroughs from brilliant minds. Learn concepts at the speed of flight.',
  },
  flocks: {
    icon: '🐦',
    accent: '#eab308',
    accentRgb: '234,179,8',
    title: 'Flocks',
    tagline: 'Developer communities, preparing to take flight.',
    description: 'Find your flock. Build with purpose. Grow alongside developers who share your curiosity.',
  },
  nest: {
    icon: '🪺',
    accent: '#22c55e',
    accentRgb: '34,197,94',
    title: 'Nest',
    tagline: 'Your saved knowledge hub, under construction.',
    description: 'Your personal sanctuary for saved chirps, bookmarked problems, and curated learning paths.',
  },
};

export default function ComingSoonPage({ params }) {
  const slug = params?.feature;
  const config = COMING_SOON_CONFIG[slug];

  if (!config) {
    return (
      <div className="relative flex-1 flex items-center justify-center min-h-[60vh]">
        <AnimatedBackground variant="coming_soon" />
        <div className="relative z-10 text-center">
          <p className="text-[#8b949e] text-lg">Page not found.</p>
          <Link href="/" className="mt-4 inline-block text-[#58a6ff] hover:underline text-sm">Go Home</Link>
        </div>
      </div>
    );
  }

  const { icon, accent, accentRgb, title, tagline, description } = config;

  // Floating particle dots
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    delay: Math.random() * 4,
    duration: Math.random() * 8 + 6,
  }));

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 overflow-hidden">
      <AnimatedBackground variant="coming_soon" />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full opacity-30"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              bottom: '-20px',
              backgroundColor: accent,
              boxShadow: `0 0 ${p.size * 2}px ${accent}`,
            }}
            animate={{ y: [0, -window?.innerHeight - 40 ?? -800] }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Central glass card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-lg w-full text-center"
      >
        {/* Icon orb */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex justify-center mb-8"
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15), rgba(${accentRgb},0.15) 70%)`,
              boxShadow: `0 0 40px rgba(${accentRgb},0.3), inset 0 0 20px rgba(255,255,255,0.08)`,
              border: `1px solid rgba(${accentRgb},0.35)`,
              backdropFilter: 'blur(8px)',
            }}
          >
            {icon}
          </div>
        </motion.div>

        {/* Text */}
        <div
          className="px-8 py-10 rounded-3xl border"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(${accentRgb},0.05) 100%)`,
            borderColor: `rgba(${accentRgb},0.2)`,
            boxShadow: `0 0 60px rgba(${accentRgb},0.08), inset 0 1px 0 rgba(255,255,255,0.08)`,
            backdropFilter: 'blur(16px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-xs font-bold uppercase tracking-widest"
            style={{
              color: accent,
              background: `rgba(${accentRgb},0.12)`,
              border: `1px solid rgba(${accentRgb},0.25)`,
            }}
          >
            <Bird size={11} />
            Coming Soon
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl md:text-5xl font-display font-extrabold text-white mb-3"
          >
            {title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg font-medium mb-4"
            style={{ color: accent }}
          >
            {tagline}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-[#8b949e] text-sm leading-relaxed mb-8"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex gap-3 justify-center flex-wrap"
          >
            <Link
              href="/"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-white/10 border border-white/10 hover:bg-white/15 transition-all duration-200"
            >
              <Home size={14} />
              Go Home
            </Link>
            <Link
              href="/questions"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, rgba(${accentRgb},0.8), rgba(${accentRgb},0.5))`,
                boxShadow: `0 0 20px rgba(${accentRgb},0.3)`,
              }}
            >
              Explore Questions
              <ChevronRight size={14} />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
