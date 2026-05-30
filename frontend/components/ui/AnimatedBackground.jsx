'use client';

import { useState, useEffect } from 'react';

/**
 * AnimatedBackground — layered accent glows that sit above the site-wide
 * background image (set on <body> in layout.jsx).
 * Renders decorative glow blobs only — no opaque base layer.
 */
export function AnimatedBackground({ variant = 'default' }) {
  const glows = {
    default: (
      <>
        <div className="absolute top-[-10%] left-[15%] w-[700px] h-[600px] bg-[#58a6ff]/10 rounded-full blur-[130px] mix-blend-screen animate-pulse-soft" />
        <div className="absolute bottom-[-5%] right-[10%] w-[600px] h-[500px] bg-[#a371f7]/10 rounded-full blur-[110px] mix-blend-screen animate-pulse-soft" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[45%] w-[400px] h-[400px] bg-[#22c55e]/5 rounded-full blur-[150px] mix-blend-screen" />
      </>
    ),
    coming_soon: (
      <>
        <div className="absolute top-[-5%] left-[20%] w-[600px] h-[600px] bg-[#a371f7]/12 rounded-full blur-[120px] mix-blend-screen animate-pulse-soft" />
        <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[400px] bg-[#58a6ff]/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
      </>
    ),
    questions: (
      <>
        <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-[#58a6ff]/8 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-[#a371f7]/8 rounded-full blur-[100px] mix-blend-screen" />
      </>
    ),
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {glows[variant] ?? glows.default}
    </div>
  );
}
