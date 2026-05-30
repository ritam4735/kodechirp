'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * BirdCursor
 * Replaces the default cursor with the blue_bird_flying.mp4 video
 * that tracks the mouse position in real-time.
 *
 * Usage: Drop <BirdCursor /> anywhere inside a 'use client' component.
 * It hides the cursor only on the element that contains it (body by default
 * via a CSS class added to the parent container).
 */
export function BirdCursor({ size = 72 }) {
  const videoRef = useRef(null);
  const rafRef   = useRef(null);
  const posRef   = useRef({ x: -200, y: -200 }); // off-screen initially
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.documentElement; // <html>

    // Hide native cursor site-wide while this component is mounted
    el.style.cursor = 'none';

    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    // RAF loop — smoothly update video element position
    const tick = () => {
      if (videoRef.current) {
        const { x, y } = posRef.current;
        // Center the video on the cursor tip
        videoRef.current.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      el.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(rafRef.current);
    };
  }, [size, visible]);

  return (
    <video
      ref={videoRef}
      src="/blue_bird_flying.mp4"
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.15s ease',
        willChange: 'transform',
        // GPU-accelerated composite layer
        transform: 'translate(-200px, -200px)',
      }}
    />
  );
}
