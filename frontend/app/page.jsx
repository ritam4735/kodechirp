'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { Bird, Code2, Users, PlaySquare, Bookmark, ChevronRight } from 'lucide-react';
import Link from 'next/link';

function FloatingBubble() {
  const controls = useAnimation();
  const bubbleRef = useRef(null);
  const [popped, setPopped] = useState(false);
  const [birdPos, setBirdPos] = useState({ x: 400, y: -200 });

  useEffect(() => {
    // Gentle floating animation
    if (!popped) {
      controls.start({
        y: [0, -15, 0],
        rotate: [0, 2, -2, 0],
        scale: [1, 1.02, 0.98, 1],
        transition: {
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
    }
  }, [controls, popped]);

  const handleInteract = () => {
    if (popped) return;
    
    // Bird flies in from top right towards the bubble
    setBirdPos({ x: 120, y: -80 });
    
    setTimeout(() => {
      // Tap the bubble - elastic distortion then pop
      controls.start({
        scaleX: [1, 1.1, 0.9, 1.3, 0],
        scaleY: [1, 0.9, 1.1, 1.3, 0],
        opacity: [1, 1, 0.9, 0],
        filter: ['blur(0px)', 'blur(0px)', 'blur(2px)', 'blur(10px)'],
        transition: { duration: 0.5, ease: "easeInOut" }
      }).then(() => {
        setPopped(true);
        // Redirect to problems page
        window.location.href = '/problems';
      });
    }, 600);
  };

  if (popped) return null;

  return (
    <div className="relative flex justify-center items-center h-80 mt-12 mb-16 perspective-1000">
      {/* Floating Bird */}
      <motion.div
        animate={{ x: birdPos.x, y: birdPos.y, opacity: birdPos.x < 400 ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 15 }}
        className="absolute z-20 pointer-events-none"
        style={{ left: '50%', top: '50%', marginLeft: '-24px', marginTop: '-24px' }}
      >
        <Bird size={48} className="text-[#a371f7] drop-shadow-[0_0_20px_rgba(163,113,247,0.8)] transform -scale-x-100" fill="currentColor" />
      </motion.div>

      {/* Glass Bubble CTA */}
      <motion.button
        ref={bubbleRef}
        animate={controls}
        onClick={handleInteract}
        className="group relative w-64 h-64 rounded-full flex flex-col items-center justify-center cursor-pointer overflow-hidden z-10"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgba(255,255,255,0.05) 60%, rgba(88,166,255,0.2) 100%)',
          boxShadow: 'inset 0 0 20px rgba(255,255,255,0.2), inset 10px 0 40px rgba(163,113,247,0.3), inset -10px 0 40px rgba(88,166,255,0.3), 0 10px 40px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.3)'
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Specular highlight */}
        <div className="absolute top-[10%] left-[20%] w-16 h-8 bg-white rounded-[100%] rotate-[-45deg] opacity-40 blur-[2px]" />
        
        <span className="text-2xl font-display font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] mb-2 group-hover:text-[#58a6ff] transition-colors duration-300">
          Explore Problems
        </span>
        <ChevronRight size={24} className="text-white/70 group-hover:text-[#58a6ff] group-hover:translate-x-2 transition-all duration-300 drop-shadow-md" />
        
        {/* Glow behind text */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#58a6ff]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </motion.button>

      {/* Ripple effects below bubble */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 rounded-full border border-[#58a6ff]/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 h-12 rounded-full border border-[#a371f7]/20 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite_1s]" />
      <div className="absolute bottom-[26px] left-1/2 -translate-x-1/2 w-32 h-2 bg-[#58a6ff]/50 blur-xl rounded-full" />
    </div>
  );
}

function FeatureCard({ title, desc, icon: Icon, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      whileHover={{ y: -10, transition: { duration: 0.2 } }}
      className="relative p-6 rounded-2xl border border-white/10 bg-[#0d1117]/40 backdrop-blur-md overflow-hidden group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      {/* Dynamic background glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
           style={{ background: `radial-gradient(circle at 50% 0%, ${color}, transparent 70%)` }} />
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300"
             style={{ backgroundColor: `${color}15` }}>
          <Icon size={24} color={color} className="drop-shadow-lg" />
        </div>
        <h3 className="text-white font-display font-bold text-lg mb-2">{title}</h3>
        <p className="text-[#8b949e] text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#06090e] overflow-hidden selection:bg-[#58a6ff]/30">
      {/* Mystical Background Layers */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Core dark radial */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#111928_0%,_#06090e_100%)]" />
        
        {/* Nebulous glows */}
        <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-[#58a6ff]/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[500px] bg-[#a371f7]/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[400px] bg-[#22c55e]/5 rounded-full blur-[150px] mix-blend-screen" />
        
        {/* Distant stars / particles */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
      </div>

      <div className="relative z-10 flex flex-col items-center pt-32 pb-20 px-4 min-h-screen">
        
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8"
        >
          <Bird size={14} className="text-[#a371f7]" />
          <span className="text-xs font-semibold text-[#c9d1d9] tracking-widest uppercase">Learn. Share. Grow.</span>
        </motion.div>

        {/* Headlines */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-[#e6edf3] to-[#8b949e] mb-6 drop-shadow-sm leading-tight">
            Chirp your code. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#58a6ff] via-[#a371f7] to-[#58a6ff] animate-gradient-x">
              Inspire the world.
            </span>
          </h1>
          <p className="text-[#8b949e] text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed text-balance">
            KodeChirp is where developers learn together, share knowledge, and grow through real conversations.
          </p>
        </motion.div>

        {/* Bubble CTA Interaction */}
        <FloatingBubble />

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 max-w-7xl w-full px-4 mt-8">
          <FeatureCard 
            title="Solve Problems" 
            desc="Sharpen your skills with curated challenges designed to level you up." 
            icon={Code2} 
            color="#22c55e" 
            delay={0.6}
          />
          <FeatureCard 
            title="Share Chirps" 
            desc="Post your thoughts, solutions & ideas for the entire flock to see." 
            icon={Bird} 
            color="#a371f7" 
            delay={0.7}
          />
          <FeatureCard 
            title="Watch Flights" 
            desc="Learn visually with short, powerful coding videos from top developers." 
            icon={PlaySquare} 
            color="#58a6ff" 
            delay={0.8}
          />
          <FeatureCard 
            title="Join Flocks" 
            desc="Be part of specialized communities that build and learn together." 
            icon={Users} 
            color="#eab308" 
            delay={0.9}
          />
          <FeatureCard 
            title="Save in Nest" 
            desc="Bookmark your favorite content & revisit them later in your Nest." 
            icon={Bookmark} 
            color="#f43f5e" 
            delay={1.0}
          />
        </div>

        {/* Bottom Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="mt-20 px-8 py-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm max-w-2xl text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 mix-blend-overlay" />
          <p className="text-[#8b949e] italic text-lg relative z-10">
            "Code is not just written, it's shared, discussed, and elevated together."
          </p>
        </motion.div>

      </div>
    </div>
  );
}
