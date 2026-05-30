'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * BirdCursor — Premium cinematic cursor using transparent WebM (VP9 alpha).
 *
 * Architecture:
 * - Zero React state updates during mousemove (no rerender storm)
 * - All animation via direct DOM style mutation in RAF loop
 * - GSAP-style lerp interpolation for momentum/inertia
 * - Velocity-based rotation (tilt L/R, pitch U/D)
 * - Subtle autonomous floating oscillation
 * - Soft glow + trailing particle effects
 * - GPU-only transforms (translate3d, rotate, scale)
 * - Disabled on touch + low-end devices
 */

/* ─── Tuning constants ───────────────────────────────────────────────────── */
const LERP_FACTOR   = 0.085;   // lower = more lag/inertia (0–1)
const FLOAT_RADIUS  = 3.5;     // px amplitude of idle float
const FLOAT_SPEED   = 0.0018;  // radians per ms — gentle breathing
const MAX_TILT      = 22;      // degrees max rotation from velocity
const VELOCITY_SCALE = 0.18;   // how aggressively velocity drives rotation
const BIRD_SIZE     = 96;      // display size in px
const TRAIL_COUNT   = 6;       // number of ghost trail particles
const TRAIL_SPACING = 0.06;    // lerp lag between trail particles

/* ─── Device capability check ───────────────────────────────────────────── */
function isCapableDevice() {
  if (typeof window === 'undefined') return false;
  // Disable on mobile/small screens as a safe fallback
  if (window.innerWidth < 768) return false;
  return true;
}

/* ─── Lerp helper ───────────────────────────────────────────────────────── */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function BirdCursor() {
  const [mounted, setMounted] = useState(false);
  const containerRef  = useRef(null);
  const videoRef      = useRef(null);
  const glowRef       = useRef(null);
  const trailRefs     = useRef([]);
  const rafRef        = useRef(null);
  const activeRef     = useRef(false);

  // State carried in refs (no React state = no rerenders on mousemove)
  const mouse         = useRef({ x: -300, y: -300 });
  const bird          = useRef({ x: -300, y: -300 }); // smoothed bird position
  const smoothVel     = useRef({ x: 0, y: 0 });       // low-pass filtered velocity
  const trail         = useRef(
    Array.from({ length: TRAIL_COUNT }, () => ({ x: -300, y: -300 }))
  );
  const floatPhase    = useRef(0);
  const lastTimestamp = useRef(0);

  const startRAF = useCallback(() => {
    if (rafRef.current) return;

    const tick = (timestamp) => {
      const dt = lastTimestamp.current ? Math.min(timestamp - lastTimestamp.current, 50) : 16;
      lastTimestamp.current = timestamp;

      /* ── Advance float phase ─── */
      floatPhase.current += FLOAT_SPEED * dt;

      /* ── Lerp bird toward mouse ─── */
      const prevX = bird.current.x;
      const prevY = bird.current.y;

      bird.current.x = lerp(bird.current.x, mouse.current.x, LERP_FACTOR);
      bird.current.y = lerp(bird.current.y, mouse.current.y, LERP_FACTOR);

      /* ── Autonomous floating offset ─── */
      const floatX = Math.sin(floatPhase.current * 1.3) * FLOAT_RADIUS;
      const floatY = Math.sin(floatPhase.current) * FLOAT_RADIUS;

      /* ── Compute per-frame velocity ─── */
      const vx = (bird.current.x - prevX) / Math.max(dt, 1);
      const vy = (bird.current.y - prevY) / Math.max(dt, 1);

      /* ── Low-pass filter velocity (smoothing) ─── */
      smoothVel.current.x = lerp(smoothVel.current.x, vx, 0.12);
      smoothVel.current.y = lerp(smoothVel.current.y, vy, 0.12);

      /* ── Derive rotation from smoothed velocity ─── */
      const rawRotateZ = smoothVel.current.x * VELOCITY_SCALE * MAX_TILT;
      const rawRotateX = -smoothVel.current.y * VELOCITY_SCALE * (MAX_TILT * 0.45);
      const rotateZ = Math.max(-MAX_TILT, Math.min(MAX_TILT, rawRotateZ));
      const rotateX = Math.max(-MAX_TILT * 0.5, Math.min(MAX_TILT * 0.5, rawRotateX));

      /* ── Speed-based opacity/scale ─── */
      const speed  = Math.sqrt(smoothVel.current.x ** 2 + smoothVel.current.y ** 2);
      const scale  = 1 + Math.min(speed * 0.008, 0.06); // slight scale on fast move
      const opacity = activeRef.current ? Math.min(0.92 + speed * 0.01, 1) : 0;

      /* ── Apply transform to bird ─── */
      const bx = bird.current.x + floatX - BIRD_SIZE / 2;
      const by = bird.current.y + floatY - BIRD_SIZE / 2;

      if (videoRef.current) {
        videoRef.current.style.transform =
          `translate3d(${bx}px, ${by}px, 0) rotateZ(${rotateZ}deg) rotateX(${rotateX}deg) scale(${scale})`;
        videoRef.current.style.opacity = opacity;
      }

      /* ── Sync glow ─── */
      if (glowRef.current) {
        const glowPulse = 0.55 + Math.sin(floatPhase.current * 2.5) * 0.12;
        glowRef.current.style.transform =
          `translate3d(${bx + BIRD_SIZE * 0.15}px, ${by + BIRD_SIZE * 0.15}px, 0)`;
        glowRef.current.style.opacity = opacity * glowPulse;
      }

      /* ── Trail particles ─── */
      for (let i = 0; i < TRAIL_COUNT; i++) {
        const source = i === 0 ? bird.current : trail.current[i - 1];
        trail.current[i].x = lerp(trail.current[i].x, source.x, TRAIL_SPACING * (1 - i * 0.1));
        trail.current[i].y = lerp(trail.current[i].y, source.y, TRAIL_SPACING * (1 - i * 0.1));

        const tEl = trailRefs.current[i];
        if (tEl) {
          const tSize  = BIRD_SIZE * (0.38 - i * 0.045);
          const tAlpha = activeRef.current ? Math.max(0, (0.12 - i * 0.018) * Math.min(speed * 0.5, 1)) : 0;
          const tx = trail.current[i].x + floatX - tSize / 2;
          const ty = trail.current[i].y + floatY - tSize / 2;
          tEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotateZ(${rotateZ * 0.6}deg)`;
          tEl.style.opacity   = tAlpha;
          tEl.style.width     = `${tSize}px`;
          tEl.style.height    = `${tSize}px`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopRAF = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Mount guard — runs only on the client after first paint.
  // Server always returns null → no hydration mismatch.
  useEffect(() => {
    if (isCapableDevice()) setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    /* ── Hide native cursor ─── */
    document.documentElement.style.cursor = 'none';

    /* ── Mouse tracking ─── */
    const onMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      if (!activeRef.current) {
        // Teleport bird to cursor on first move to avoid fly-in from offscreen
        bird.current.x = e.clientX;
        bird.current.y = e.clientY;
        for (const t of trail.current) {
          t.x = e.clientX;
          t.y = e.clientY;
        }
        activeRef.current = true;
      }
    };

    const onMouseLeave = () => { activeRef.current = false; };
    const onMouseEnter = () => { activeRef.current = true; };

    document.addEventListener('mousemove',  onMouseMove,  { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });
    document.addEventListener('mouseenter', onMouseEnter, { passive: true });

    startRAF();

    return () => {
      document.documentElement.style.cursor = '';
      document.removeEventListener('mousemove',  onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      stopRAF();
    };
  }, [mounted, startRAF, stopRAF]);

  // Server render + first client paint → null (matches SSR, no hydration error)
  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 999999,
        overflow: 'hidden',
      }}
    >
      {/* ── Soft glow bloom beneath the bird ─── */}
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width:  `${BIRD_SIZE * 0.7}px`,
          height: `${BIRD_SIZE * 0.7}px`,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(88,166,255,0.35) 0%, rgba(163,113,247,0.18) 50%, transparent 80%)',
          filter: 'blur(12px)',
          willChange: 'transform, opacity',
          transform: 'translate3d(-300px, -300px, 0)',
          opacity: 0,
        }}
      />

      {/* ── Trail ghost particles ─── */}
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { trailRefs.current[i] = el; }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width:  `${BIRD_SIZE * 0.38}px`,
            height: `${BIRD_SIZE * 0.38}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(88,166,255,0.5) 0%, rgba(163,113,247,0.3) 60%, transparent 100%)',
            filter: `blur(${4 + i * 2}px)`,
            willChange: 'transform, opacity',
            transform: 'translate3d(-300px, -300px, 0)',
            opacity: 0,
          }}
        />
      ))}

      {/* ── Bird video (VP9 WebM with alpha) ─── */}
      <video
        ref={videoRef}
        src="/bird-cursor.webm"
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width:  `${BIRD_SIZE}px`,
          height: `${BIRD_SIZE}px`,
          objectFit: 'contain',
          willChange: 'transform, opacity',
          transform: 'translate3d(-300px, -300px, 0)',
          opacity: 0,
          /* Smooth transition only for opacity fade-in/out, NOT for position */
          transition: 'opacity 0.25s ease',
          /* Preserve alpha channel — mix-blend-mode: normal ensures transparency shows */
          mixBlendMode: 'normal',
          /* Drop shadow acting as subtle glow ring around the bird */
          filter: 'drop-shadow(0 0 8px rgba(88,166,255,0.6)) drop-shadow(0 0 16px rgba(163,113,247,0.3))',
        }}
      />
    </div>
  );
}
