'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Bird, Code2, Users, PlaySquare, Bookmark, ChevronRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';

const BirdCursor = dynamic(() => import('../components/ui/BirdCursor').then(mod => mod.BirdCursor), {
  ssr: false,
});

/* ─────────────────────────────────────────────────────────────────────────────
   FLOATING BUBBLE CTA
───────────────────────────────────────────────────────────────────────────── */
function FloatingBubble() {
  const controls  = useAnimation();
  const [popped, setPopped]   = useState(false);
  const [stage, setStage]     = useState('idle'); // idle | bird-incoming | popping
  const router = useRouter();

  // Continuous gentle float
  useEffect(() => {
    if (stage !== 'idle') return;
    controls.start({
      y: [0, -14, 0],
      rotate: [0, 1.5, -1.5, 0],
      scale: [1, 1.015, 0.985, 1],
      transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [controls, stage]);

  const handleClick = () => {
    if (stage !== 'idle') return;
    setStage('bird-incoming');

    // Bird arrives → bubble pops → navigate
    setTimeout(() => {
      setStage('popping');
      controls.start({
        scaleX: [1, 1.12, 0.88, 1.4, 0],
        scaleY: [1, 0.88, 1.12, 1.4, 0],
        opacity: [1, 1, 0.8, 0],
        filter: ['blur(0px)', 'blur(0px)', 'blur(3px)', 'blur(14px)'],
        transition: { duration: 0.55, ease: 'easeInOut' },
      }).then(() => {
        setPopped(true);
        router.push('/questions');
      });
    }, 650);
  };

  if (popped) return null;

  return (
    <div className="relative flex justify-center items-center h-72 mt-6 mb-10">

      {/* Bird that flies in on click */}
      <motion.div
        className="absolute z-20 pointer-events-none"
        style={{ left: '50%', top: '50%', marginLeft: '-24px', marginTop: '-24px' }}
        initial={{ x: 260, y: -140, opacity: 0 }}
        animate={
          stage === 'bird-incoming' || stage === 'popping'
            ? { x: 90, y: -60, opacity: 1 }
            : { x: 260, y: -140, opacity: 0 }
        }
        transition={{ type: 'spring', stiffness: 130, damping: 16 }}
      >
        <Bird
          size={46}
          className="drop-shadow-[0_0_18px_rgba(163,113,247,0.9)] -scale-x-100"
          style={{ color: '#a371f7' }}
          fill="currentColor"
        />
      </motion.div>

      {/* Glass sphere */}
      <motion.button
        animate={controls}
        onClick={handleClick}
        aria-label="Explore Problems"
        whileHover={stage === 'idle' ? { scale: 1.04 } : {}}
        whileTap={stage === 'idle' ? { scale: 0.97 } : {}}
        className="group relative w-60 h-60 rounded-full flex flex-col items-center justify-center cursor-pointer z-10 select-none"
        style={{
          /* Near-transparent dark interior — you see through the sphere */
          background: 'radial-gradient(circle at 32% 28%, rgba(100,160,255,0.06) 0%, rgba(5,5,25,0.12) 55%, rgba(0,0,15,0.18) 100%)',
          backdropFilter: 'blur(6px)',
          /* Multi-ring neon rim: hard rings stack outward, then soft atmospheric bloom */
          boxShadow: `
            /* Hard concentric rim rings (outward) */
            0 0 0 2px rgba(88,166,255,0.95),
            0 0 0 4px rgba(120,90,255,0.55),
            0 0 0 7px rgba(163,113,247,0.35),
            0 0 0 13px rgba(88,166,255,0.12),
            /* Outer atmospheric bloom */
            0 0 45px rgba(88,166,255,0.75),
            0 0 90px rgba(88,166,255,0.40),
            0 0 140px rgba(163,113,247,0.30),
            0 0 200px rgba(88,166,255,0.15),
            /* Inner edge glow */
            inset 0 0 0 1.5px rgba(88,166,255,0.55),
            inset 0 0 0 3px rgba(163,113,247,0.25),
            inset 0 0 30px rgba(88,166,255,0.08)
          `,
          border: 'none',
        }}
      >
        {/* Concentric ring overlays on the sphere edge — mimics the reference image streaks */}
        <div className="absolute inset-[4px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(88,166,255,0.22)', boxShadow: 'inset 0 0 8px rgba(88,166,255,0.08)' }} />
        <div className="absolute inset-[10px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(163,113,247,0.12)' }} />

        {/* Specular highlight — top-left like reference */}
        <div className="absolute top-[12%] left-[18%] w-16 h-9 bg-white rounded-[100%] -rotate-45 opacity-25 blur-[3px] pointer-events-none" />
        <div className="absolute top-[8%] left-[22%] w-8 h-4 bg-white rounded-[100%] -rotate-45 opacity-40 blur-[1px] pointer-events-none" />

        <span className="relative z-10 text-xl font-display font-bold text-white drop-shadow-[0_0_12px_rgba(88,166,255,0.8)] mb-2 group-hover:text-[#58a6ff] transition-colors duration-300 text-center leading-tight px-3">
          Explore<br />Problems
        </span>
        <ChevronRight
          size={22}
          className="relative z-10 text-white/70 group-hover:text-[#58a6ff] group-hover:translate-x-1.5 transition-all duration-300 drop-shadow-[0_0_8px_rgba(88,166,255,0.7)]"
        />

        {/* Hover: intensify inner glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-[#58a6ff]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </motion.button>

      {/* Platform glow pool — like the reference image ground reflection */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-52 h-6 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(88,166,255,0.55) 0%, rgba(163,113,247,0.20) 60%, transparent 100%)', filter: 'blur(8px)' }} />

      {/* Neon ripple rings — bright, concentric, like reference */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ width: '160px', height: '28px', borderRadius: '50%', border: '1.5px solid rgba(88,166,255,0.7)', boxShadow: '0 0 10px rgba(88,166,255,0.5)', animation: 'ping 3s cubic-bezier(0,0,0.2,1) infinite' }} />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ width: '210px', height: '38px', borderRadius: '50%', border: '1px solid rgba(163,113,247,0.5)', boxShadow: '0 0 12px rgba(163,113,247,0.4)', animation: 'ping 3.8s cubic-bezier(0,0,0.2,1) infinite 0.8s' }} />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ width: '270px', height: '50px', borderRadius: '50%', border: '1px solid rgba(88,166,255,0.3)', boxShadow: '0 0 16px rgba(88,166,255,0.25)', animation: 'ping 4.5s cubic-bezier(0,0,0.2,1) infinite 1.6s' }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LIQUID GLASS FEATURE CARD
───────────────────────────────────────────────────────────────────────────── */
function LiquidCard({ title, desc, icon: Icon, color, rgb, href, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={href}
        className="group block h-full relative rounded-2xl p-5 cursor-pointer overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(${rgb},0.06) 100%)`,
          border: `1px solid rgba(${rgb},0.18)`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.35), 0 0 0 0px rgba(${rgb},0)`,
          backdropFilter: 'blur(14px)',
          transition: 'box-shadow 0.35s ease, transform 0.2s ease, border-color 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 8px 40px rgba(0,0,0,0.45), 0 0 30px rgba(${rgb},0.15), inset 0 1px 0 rgba(255,255,255,0.1)`;
          e.currentTarget.style.transform = 'translateY(-6px)';
          e.currentTarget.style.borderColor = `rgba(${rgb},0.4)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.35)`;
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.borderColor = `rgba(${rgb},0.18)`;
        }}
      >
        {/* Top specular sheen */}
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-40 pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb},0.5), transparent)` }}
        />

        {/* Ambient corner glow */}
        <div
          className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none blur-xl"
          style={{ background: `rgba(${rgb},1)` }}
        />

        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `rgba(${rgb},0.12)`,
            border: `1px solid rgba(${rgb},0.22)`,
            boxShadow: `0 0 16px rgba(${rgb},0.1)`,
          }}
        >
          <Icon size={20} style={{ color }} />
        </div>

        <h3 className="text-white font-display font-bold text-base mb-1.5 group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="text-[#8b949e] text-[13px] leading-relaxed">
          {desc}
        </p>

        {/* Bottom arrow */}
        <div
          className="mt-4 flex items-center gap-1 text-[12px] font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0"
          style={{ color }}
        >
          Explore <ChevronRight size={12} />
        </div>
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LANDING PAGE
───────────────────────────────────────────────────────────────────────────── */
const FEATURE_CARDS = [
  {
    title: 'Solve Problems',
    desc:  'Sharpen your skills with curated challenges designed to level you up.',
    icon:  Code2,
    color: '#22c55e',
    rgb:   '34,197,94',
    href:  '/questions',
  },
  {
    title: 'Share Chirps',
    desc:  'Post your thoughts, solutions & ideas for the entire flock to see.',
    icon:  MessageSquare,
    color: '#a371f7',
    rgb:   '163,113,247',
    href:  '/coming-soon/chirps',
  },
  {
    title: 'Watch Flights',
    desc:  'Bite-sized video walkthroughs from brilliant developers.',
    icon:  PlaySquare,
    color: '#58a6ff',
    rgb:   '88,166,255',
    href:  '/coming-soon/flights',
  },
  {
    title: 'Join Flocks',
    desc:  'Be part of specialized communities that build and learn together.',
    icon:  Users,
    color: '#eab308',
    rgb:   '234,179,8',
    href:  '/coming-soon/flocks',
  },
  {
    title: 'Save in Nest',
    desc:  'Bookmark your favorite content and revisit them in your personal Nest.',
    icon:  Bookmark,
    color: '#f43f5e',
    rgb:   '244,63,94',
    href:  '/coming-soon/nest',
  },
];

export default function HomePage() {
  return (
    <div className="relative flex-1 overflow-hidden selection:bg-[#58a6ff]/25">
      {/* Flying bird custom cursor — landing page only */}
      <BirdCursor />
      <AnimatedBackground variant="default" />

      <div className="relative z-10 flex flex-col items-center px-4 pt-12 pb-24">

        {/* ── Badge ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md mb-8"
        >
          <Bird size={13} className="text-[#a371f7]" />
          <span className="text-[11px] font-bold text-[#c9d1d9] tracking-[0.18em] uppercase">
            Learn. Share. Grow.
          </span>
        </motion.div>

        {/* ── Hero headline ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight leading-[1.07] mb-5">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-[#8b949e]">
              Chirp your code.{' '}
            </span>
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: 'linear-gradient(135deg, #58a6ff 0%, #a371f7 50%, #58a6ff 100%)',
                backgroundSize: '200% auto',
                animation: 'shimmer 5s linear infinite',
              }}
            >
              Inspire the world.
            </span>
          </h1>
          <p className="text-[#8b949e] text-lg md:text-xl max-w-xl mx-auto leading-relaxed font-medium">
            KodeChirp is where developers learn together, share knowledge, and grow through real conversations.
          </p>
        </motion.div>

        {/* ── Bubble CTA ───────────────────────────────── */}
        <FloatingBubble />

        {/* ── Liquid Glass Feature Cards ───────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-6xl"
        >
          <p className="text-center text-[12px] font-bold text-[#484f58] uppercase tracking-widest mb-5">
            Everything in the ecosystem
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
            {FEATURE_CARDS.map((card, i) => (
              <LiquidCard key={card.title} {...card} delay={0.55 + i * 0.08} />
            ))}
          </div>
        </motion.div>

        {/* ── Quote ────────────────────────────────────── */}
        <motion.blockquote
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="mt-20 max-w-2xl text-center"
        >
          <p className="text-[#484f58] italic text-base leading-relaxed">
            "Code is not just written — it&apos;s shared, discussed, and elevated together."
          </p>
        </motion.blockquote>

      </div>

      {/* Shimmer keyframe */}
      <style jsx global>{`
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
}
