'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { AnimatedBackground } from '../../../components/ui/AnimatedBackground';
import { Home, ChevronRight, MessageSquare, Play, Users, Leaf } from 'lucide-react';
import Logo from '../../../components/ui/Logo';
import { use } from 'react';

const COMING_SOON_CONFIG = {
  chirps: {
    icon: MessageSquare,
    accent: '#a371f7',
    accentRgb: '163,113,247',
    title: 'Chirps',
    tagline: 'A new way for developers to share ideas.',
    description: "We're crafting a beautiful space where your thoughts, solutions, and discoveries can fly free — and inspire the whole flock.",
  },
  flights: {
    icon: Play,
    accent: '#58a6ff',
    accentRgb: '88,166,255',
    title: 'Flights',
    tagline: 'Short-form coding explanations, landing soon.',
    description: 'Bite-sized video walkthroughs from brilliant minds. Learn concepts at the speed of flight.',
  },
  flocks: {
    icon: Users,
    accent: '#eab308',
    accentRgb: '234,179,8',
    title: 'Flocks',
    tagline: 'Developer communities, preparing to take flight.',
    description: 'Find your flock. Build with purpose. Grow alongside developers who share your curiosity.',
  },
  nest: {
    icon: Leaf,
    accent: '#22c55e',
    accentRgb: '34,197,94',
    title: 'Nest',
    tagline: 'Your saved knowledge hub, under construction.',
    description: 'Your personal sanctuary for saved chirps, bookmarked problems, and curated learning paths.',
  },
};

export default function ComingSoonPage({ params }) {
  // Next.js 15+ passes params as a Promise — unwrap it
  const resolvedParams = use(params);
  const slug = resolvedParams?.feature;
  const config = COMING_SOON_CONFIG[slug];

  if (!config) {
    return (
      <div className="relative flex-1 flex items-center justify-center min-h-[60vh]">
        <AnimatedBackground variant="coming_soon" />
        <div className="relative z-10 text-center">
          <p className="text-[var(--kc-text-muted)] text-lg">Page not found.</p>
          <Link href="/" className="mt-4 inline-block text-[var(--kc-accent)] hover:underline text-sm font-medium">Go Home</Link>
        </div>
      </div>
    );
  }

  const { icon: FeatureIcon, title, tagline, description } = config;

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 py-12 overflow-hidden">
      <AnimatedBackground variant="coming_soon" />

      {/* Central card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 max-w-lg w-full text-center"
      >
        <div className="rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] p-8 sm:p-10 shadow-sm">
          {/* Icon badge */}
          <div className="w-12 h-12 rounded-lg bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] flex items-center justify-center mx-auto mb-5 text-[var(--kc-accent)]">
            <FeatureIcon size={22} className="text-[var(--kc-accent)]" />
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md mb-4 text-[11px] font-mono tracking-wider uppercase text-[var(--kc-accent)] bg-[var(--kc-accent)]/10 border border-[var(--kc-accent)]/20">
            <Logo size={14} variant="symbol" />
            <span>Coming Soon</span>
          </div>

          <h1 className="text-3xl font-display font-bold text-[var(--kc-text-primary)] mb-2">
            {title}
          </h1>

          <p className="text-sm font-medium text-[var(--kc-accent)] mb-3">
            {tagline}
          </p>

          <p className="text-sm text-[var(--kc-text-muted)] leading-relaxed mb-4">
            {description}
          </p>

          <p className="text-xs text-[var(--kc-text-muted)]/70 mb-8">
            We&apos;re crafting this feature with care. Stay tuned.
          </p>

          <div className="flex gap-2.5 justify-center flex-wrap">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-medium text-[var(--kc-text-primary)] bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] hover:bg-[var(--kc-surface-hover)] transition-colors"
            >
              <Home size={14} />
              <span>Go Home</span>
            </Link>
            <Link
              href="/questions"
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-medium text-[var(--kc-on-primary)] bg-[var(--kc-accent)] hover:opacity-90 transition-opacity"
            >
              <span>Explore Questions</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
