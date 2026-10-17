'use client';

import { useState, useEffect } from 'react';

/**
 * AnimatedBackground — layered accent glows that sit above the site-wide
 * background image (set on <body> in layout.jsx).
 * Renders decorative glow blobs only — no opaque base layer.
 */
export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Restrained subtle blue atmospheric depth */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full blur-[160px] opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
