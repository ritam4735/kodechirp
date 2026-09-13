'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ParticleEngine } from '../../lib/particleEngine';
import { getActiveTheme } from '../../lib/theme';
import ParticleDebugPanel from './ParticleDebugPanel';

/**
 * ParticleCanvas
 * ──────────────────────────────────────────────────────
 * React wrapper for the standalone ParticleEngine.
 * Mounts a full-viewport fixed <canvas>, wires mouse/scroll
 * events, and connects the interactive debug panel.
 *
 * Props:
 *   engineRef: React ref — assigned the active ParticleEngine instance
 * ──────────────────────────────────────────────────────
 */
export default function ParticleCanvas({ engineRef }) {
  const canvasRef = useRef(null);
  const localEngineRef = useRef(null);

  // Mouse move handler — throttled to ~60fps
  const lastMouse = useRef(0);
  const handleMouseMove = useCallback((e) => {
    const now = performance.now();
    if (now - lastMouse.current < 16) return;
    lastMouse.current = now;
    if (localEngineRef.current) {
      localEngineRef.current.setPointer(e.clientX, e.clientY);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (localEngineRef.current) {
      localEngineRef.current.clearPointer();
    }
  }, []);

  // Touch handlers for mobile
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && localEngineRef.current) {
      localEngineRef.current.setPointer(
        e.touches[0].clientX,
        e.touches[0].clientY
      );
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (localEngineRef.current) {
      localEngineRef.current.clearPointer();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new ParticleEngine();
    localEngineRef.current = engine;
    if (engineRef) engineRef.current = engine;

    // Apply active theme immediately
    engine.setTheme(getActiveTheme());
    engine.init(canvas);

    // Scroll progress mapping
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
      engine.setScrollProgress(progress);
    };

    // Theme mutation observer on <html>
    const themeObserver = new MutationObserver(() => {
      engine.setTheme(getActiveTheme());
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Pause on tab hidden, resume on tab visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        engine.pause();
      } else {
        engine.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    // Initial scroll setup
    handleScroll();

    return () => {
      engine.destroy();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [engineRef, handleMouseMove, handleMouseLeave, handleTouchMove, handleTouchEnd]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="kc-particle-canvas"
        aria-hidden="true"
      />
      <ParticleDebugPanel engineRef={localEngineRef} />
    </>
  );
}
