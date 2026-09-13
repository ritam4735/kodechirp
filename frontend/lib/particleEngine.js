/**
 * KodeChirp Particle Engine
 * ─────────────────────────────────────────────────────────────
 * Standalone Canvas 2D particle system.
 * Communicates with UI through a small public API:
 *   init(canvas) / setFormation() / setScrollProgress() /
 *   setTheme() / setPointer() / pause() / resume() / destroy()
 *
 * Design principles:
 *   - Physical field behavior with natural inertia & settling
 *   - Cursor interaction feels like disturbing a fluid/field
 *   - 6 abstract algorithmic formations mapped to scroll progress
 *   - Unmistakably visible points: crisp charcoal on light, off-white on dark
 *   - Restrained blue accent particles (~8%)
 *   - Viewport-anchored sizing with DPR scaling
 * ─────────────────────────────────────────────────────────────
 */

// ── Fast Simplex/Perlin-style 2D noise ───────────────────────
const NOISE_PERM = new Uint8Array(512);
(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) NOISE_PERM[i] = p[i & 255];
})();

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function grad2d(hash, x, y) {
  const h = hash & 3;
  return (h & 1 ? -x : x) + (h & 2 ? -y : y);
}

function noise2d(x, y) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = NOISE_PERM[NOISE_PERM[xi] + yi];
  const ab = NOISE_PERM[NOISE_PERM[xi] + yi + 1];
  const ba = NOISE_PERM[NOISE_PERM[xi + 1] + yi];
  const bb = NOISE_PERM[NOISE_PERM[xi + 1] + yi + 1];
  return lerp(
    lerp(grad2d(aa, xf, yf), grad2d(ba, xf - 1, yf), u),
    lerp(grad2d(ab, xf, yf - 1), grad2d(bb, xf - 1, yf - 1), u),
    v
  );
}


// ── 6 Abstract Algorithmic Formations ────────────────────────
// Each returns { x, y } offset relative to viewport center
export const formations = {
  /**
   * 01. UNSOLVED (0%–20% scroll)
   * Atmospheric computational field surrounding the hero typography.
   * Wide golden-ratio distribution with a low-density breathing zone
   * for the left-aligned headline and higher density on the perimeter.
   */
  unsolved(i, total, w, h) {
    const phi = 1.618033988749895;
    const angle = i * phi * Math.PI * 2;
    const maxR = Math.min(w, h) * 0.62;
    const r = Math.pow(i / total, 0.58) * maxR;

    let x = Math.cos(angle) * r * 1.35;
    let y = Math.sin(angle) * r * 0.95;

    // Breathing room around hero headline (offset to the left-center)
    const textCenterX = -w * 0.16;
    const textCenterY = 0;
    const dx = x - textCenterX;
    const dy = (y - textCenterY) * 1.6;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const exclusionRadius = w * 0.22;

    if (dist < exclusionRadius) {
      const push = (1 - dist / exclusionRadius) * (w * 0.16);
      x += (dx / (dist || 1)) * push;
      y += (dy / (dist || 1)) * push;
    }

    const nx = noise2d(i * 0.14, 12) * w * 0.035;
    const ny = noise2d(12, i * 0.14) * h * 0.035;
    return { x: x + nx, y: y + ny };
  },

  /**
   * 02. THINK (20%–40% scroll)
   * Abstract decision tree / branching graph.
   * Radiating structure evoking exploration of solution paths.
   */
  think(i, total, w, h) {
    const levels = 6;
    const level = i % levels;
    const posInLevel = Math.floor(i / levels);
    const countInLevel = Math.ceil(total / levels);

    const spreadX = w * 0.62;
    const spreadY = h * 0.70;

    const normLevel = (level / (levels - 1)) - 0.5; // -0.5 to 0.5
    const normPos = (posInLevel / (countInLevel - 1 || 1)) - 0.5;

    // Branches fan out horizontally and vertically to the right
    const x = normLevel * spreadX + (w * 0.08);
    const fan = 0.25 + (level / levels) * 0.75;
    const y = normPos * spreadY * fan;

    const nx = noise2d(i * 0.2, level) * 20;
    const ny = noise2d(level, i * 0.2) * 18;
    return { x: x + nx, y: y + ny };
  },

  /**
   * 03. CODE (40%–60% scroll)
   * Structured 2D algorithmic matrix / AST grid.
   * Precise horizontal/vertical rhythm with subtle indentation shifts.
   */
  code(i, total, w, h) {
    const cols = Math.ceil(Math.sqrt(total * 1.6));
    const rows = Math.ceil(total / cols);
    const col = i % cols;
    const row = Math.floor(i / cols);

    const spacingX = (w * 0.72) / cols;
    const spacingY = (h * 0.65) / rows;

    const startX = -((cols - 1) * spacingX) / 2 + (w * 0.04);
    const startY = -((rows - 1) * spacingY) / 2;

    // Indentation rhythm evoking structured code blocks
    const indent = (row % 4 === 1 || row % 4 === 2) ? spacingX * 0.7 : 0;
    const jx = noise2d(col * 0.4, row * 0.4) * spacingX * 0.12;
    const jy = noise2d(col * 0.4 + 20, row * 0.4 + 20) * spacingY * 0.12;

    return {
      x: startX + col * spacingX + indent + jx,
      y: startY + row * spacingY + jy,
    };
  },

  /**
   * 04. SUBMIT (60%–75% scroll)
   * Focal convergence: particles compress inward along logarithmic streamlines
   * toward a focal target, evoking unification and compilation.
   */
  submit(i, total, w, h) {
    const angle = (i / total) * Math.PI * 6.5;
    const t = Math.pow(i / total, 0.85);
    const maxR = Math.min(w, h) * 0.44;
    const r = t * maxR;

    const focalX = w * 0.12;
    const focalY = 0;

    return {
      x: focalX + Math.cos(angle) * r,
      y: focalY + Math.sin(angle) * r * 0.85,
    };
  },

  /**
   * 05. IMPROVE (75%–90% scroll)
   * Ascending flow streams: rising S-curves progressing from bottom-left
   * toward top-right, representing deliberate practice and performance gains.
   */
  improve(i, total, w, h) {
    const t = i / total;
    const streams = 5;
    const stream = i % streams;

    const spreadX = w * 0.76;
    const spreadY = h * 0.68;

    const x = (t - 0.5) * spreadX;
    const curve = Math.sin(t * Math.PI * 0.96 - Math.PI * 0.48);
    const streamOffset = (stream - (streams - 1) / 2) * (h * 0.07);
    const y = -curve * (spreadY * 0.46) + streamOffset;

    const nx = noise2d(i * 0.16, stream) * 16;
    const ny = noise2d(stream, i * 0.16) * 16;

    return { x: x + nx, y: y + ny };
  },

  /**
   * 06. MASTER (90%–100% scroll)
   * Concentric harmonic orbits with balanced geometric equilibrium.
   */
  master(i, total, w, h) {
    const rings = 5;
    const ring = i % rings;
    const posInRing = Math.floor(i / rings);
    const particlesInRing = Math.ceil(total / rings);
    const angle = (posInRing / particlesInRing) * Math.PI * 2;

    const maxR = Math.min(w, h) * 0.38;
    const r = ((ring + 1) / rings) * maxR;

    const rx = r * 1.25;
    const ry = r * 0.88;
    const phase = ring * 0.3;

    return {
      x: Math.cos(angle + phase) * rx,
      y: Math.sin(angle + phase) * ry,
    };
  },
};

export const FORMATION_NAMES = ['unsolved', 'think', 'code', 'submit', 'improve', 'master'];


// ── Visible Theme Palette ────────────────────────────────────
// Crisp, unmistakably visible points without gaudy glow or neon
const THEMES = {
  light: {
    particle:       { r: 35,  g: 38,  b: 44 },     // refined deep charcoal
    particleAlpha:  0.58,                          // clearly visible on warm white
    accent:         { r: 37,  g: 99,  b: 235 },    // KodeChirp royal blue
    accentAlpha:    0.85,
  },
  dark: {
    particle:       { r: 230, g: 232, b: 236 },    // refined off-white
    particleAlpha:  0.52,                          // clearly visible on near-black
    accent:         { r: 96,  g: 165, b: 250 },    // luminous cyan-blue
    accentAlpha:    0.85,
  },
};


// ── Particle Class ───────────────────────────────────────────
class Particle {
  constructor(x, y, index, total) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.vx = 0;
    this.vy = 0;
    // 1.5px – 2.4px crisp points
    this.baseSize = 1.5 + Math.random() * 0.9;
    this.opacity = 0.7 + Math.random() * 0.3;
    // ~8% blue accent particles
    this.isAccent = Math.random() < 0.08;
    this.noisePhase = Math.random() * 1000;
    this.index = index;
  }
}


// ── Standalone Particle Engine ───────────────────────────────
export class ParticleEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.formation = 'unsolved';
    this.manualFormation = null; // When non-null, overrides scroll
    this.scrollProgress = 0;
    this.mouse = { x: -9999, y: -9999, active: false };
    this.theme = 'dark';
    this.dpr = 1;
    this.width = 0;
    this.height = 0;
    this.reducedMotion = false;
    this.paused = false;
    this.animId = null;
    this.time = 0;
    this.listeners = new Set();

    // Physics parameters — physical, springy, naturally settled
    this.spring = 0.024;
    this.friction = 0.88;
    this.cursorRadius = 140;       // 140 CSS px radius of influence
    this.cursorStrength = 1.4;      // clear physical deflection
    this.noiseStrength = 0.03;     // subtle organic life
    this.noiseScale = 0.0015;

    // Visual overrides for debugging
    this.sizeMultiplier = 1.0;
    this.opacityMultiplier = 1.0;

    this._onResize = this._handleResize.bind(this);
    this._onMotionQuery = this._handleMotionQuery.bind(this);
    this._tick = this._tick.bind(this);
  }

  // ── Public API ─────────────────────────────────────────────

  init(canvas) {
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mq.matches;
    try { mq.addEventListener('change', this._onMotionQuery); } catch (e) {}

    window.addEventListener('resize', this._onResize);
    this._handleResize();
    this._initParticles();
    this._tick();

    // Attach to window for diagnostics
    if (typeof window !== 'undefined') {
      window.__KC_PARTICLES__ = this;
    }
  }

  setFormation(name, manual = true) {
    if (formations[name]) {
      this.formation = name;
      if (manual) {
        this.manualFormation = name;
      }
      this._updateTargets();
      this._notify();
    }
  }

  clearManualFormation() {
    this.manualFormation = null;
    this._updateFormationFromScroll();
    this._notify();
  }

  setScrollProgress(progress) {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
    if (!this.manualFormation) {
      this._updateFormationFromScroll();
    }
    this._notify();
  }

  setTheme(theme) {
    this.theme = theme === 'light' ? 'light' : 'dark';
    this._notify();
  }

  setPointer(clientX, clientY) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = (clientX - rect.left) * this.dpr;
    this.mouse.y = (clientY - rect.top) * this.dpr;
    this.mouse.active = true;
    this._notify();
  }

  clearPointer() {
    this.mouse.active = false;
    this._notify();
  }

  pause() {
    this.paused = true;
    this._notify();
  }

  resume() {
    if (this.paused) {
      this.paused = false;
      this._tick();
      this._notify();
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getStatus() {
    return {
      particles: this.particles.length,
      width: Math.round(this.width / this.dpr),
      height: Math.round(this.height / this.dpr),
      dpr: this.dpr,
      animation: this.paused ? 'PAUSED' : 'RUNNING',
      formation: (this.manualFormation || this.formation).toUpperCase(),
      isManual: Boolean(this.manualFormation),
      scroll: Number(this.scrollProgress.toFixed(2)),
      pointer: this.mouse.active
        ? `(${Math.round(this.mouse.x / this.dpr)}, ${Math.round(this.mouse.y / this.dpr)})`
        : 'IDLE',
      pointerActive: this.mouse.active,
      theme: this.theme,
      reducedMotion: this.reducedMotion ? 'TRUE' : 'FALSE',
      sizeMultiplier: this.sizeMultiplier,
      opacityMultiplier: this.opacityMultiplier,
    };
  }

  destroy() {
    this.paused = true;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    window.removeEventListener('resize', this._onResize);
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.removeEventListener('change', this._onMotionQuery);
    } catch (e) {}
    if (typeof window !== 'undefined' && window.__KC_PARTICLES__ === this) {
      delete window.__KC_PARTICLES__;
    }
  }

  // ── Internal Methods ───────────────────────────────────────

  _notify() {
    if (this.listeners.size === 0) return;
    const status = this.getStatus();
    this.listeners.forEach((fn) => fn(status));
  }

  _handleResize() {
    if (!this.canvas) return;
    const w = window.innerWidth || document.documentElement.clientWidth || 1200;
    const h = window.innerHeight || document.documentElement.clientHeight || 800;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.round(w * this.dpr);
    this.height = Math.round(h * this.dpr);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    if (this.particles.length === 0) {
      this._initParticles();
    } else {
      this._updateTargets();
    }
    this._notify();
  }

  _handleMotionQuery(e) {
    this.reducedMotion = e.matches;
    this._notify();
  }

  _getParticleCount() {
    const w = this.width / this.dpr;
    if (this.reducedMotion) return 120;
    if (w > 1200) return 500;
    if (w > 800)  return 380;
    if (w > 500)  return 240;
    return 140;
  }

  _initParticles() {
    const count = this._getParticleCount();
    this.particles = [];
    const fn = formations[this.formation] || formations.unsolved;
    const cx = this.width / 2;
    const cy = this.height / 2;

    for (let i = 0; i < count; i++) {
      const pos = fn(i, count, this.width, this.height);
      const p = new Particle(cx + pos.x, cy + pos.y, i, count);
      this.particles.push(p);
    }
    this._notify();
  }

  _updateTargets() {
    const targetFormation = this.manualFormation || this.formation;
    const fn = formations[targetFormation];
    if (!fn) return;

    const count = this.particles.length;
    const cx = this.width / 2;
    const cy = this.height / 2;

    for (let i = 0; i < count; i++) {
      const pos = fn(i, count, this.width, this.height);
      this.particles[i].targetX = cx + pos.x;
      this.particles[i].targetY = cy + pos.y;
    }
  }

  _updateFormationFromScroll() {
    if (this.manualFormation) return;

    const segments = FORMATION_NAMES.length - 1; // 5 transitions
    const raw = this.scrollProgress * segments;
    const segIndex = Math.min(Math.floor(raw), segments - 1);
    const segProgress = raw - segIndex;

    const fromName = FORMATION_NAMES[segIndex];
    const toName = FORMATION_NAMES[Math.min(segIndex + 1, segments)];
    this.formation = segProgress > 0.5 ? toName : fromName;

    const fromFn = formations[fromName];
    const toFn = formations[toName];
    const count = this.particles.length;
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Smooth cubic interpolation
    const t = segProgress * segProgress * (3 - 2 * segProgress);

    for (let i = 0; i < count; i++) {
      const from = fromFn(i, count, this.width, this.height);
      const to = toFn(i, count, this.width, this.height);
      this.particles[i].targetX = cx + lerp(from.x, to.x, t);
      this.particles[i].targetY = cy + lerp(from.y, to.y, t);
    }
  }

  _tick() {
    if (this.paused) return;

    this.time += 0.01;
    const { ctx, width, height, particles, mouse, reducedMotion } = this;
    if (!ctx || width === 0 || height === 0) {
      this.animId = requestAnimationFrame(this._tick);
      return;
    }

    const themeColors = THEMES[this.theme] || THEMES.dark;

    // Clear full canvas buffer
    ctx.clearRect(0, 0, width, height);

    const spring = this.spring;
    const friction = this.friction;
    const cursorR = this.cursorRadius * this.dpr;
    const cursorStr = this.cursorStrength;
    const noiseStr = reducedMotion ? 0 : this.noiseStrength;
    const noiseScl = this.noiseScale;

    for (let i = 0, len = particles.length; i < len; i++) {
      const p = particles[i];

      if (!reducedMotion) {
        // 1. Spring force toward target formation
        let ax = (p.targetX - p.x) * spring;
        let ay = (p.targetY - p.y) * spring;

        // 2. Physical cursor repulsion (fluid displacement)
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          const rSq = cursorR * cursorR;

          if (distSq < rSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const norm = (1 - dist / cursorR);
            // Quadratic falloff for smooth physical field pressure
            const force = norm * norm * cursorStr * this.dpr * 22;
            ax += (dx / dist) * force;
            ay += (dy / dist) * force;
          }
        }

        // 3. Subtle ambient noise drift
        const nx = noise2d(p.x * noiseScl + p.noisePhase, this.time);
        const ny = noise2d(this.time, p.y * noiseScl + p.noisePhase);
        ax += nx * noiseStr * this.dpr;
        ay += ny * noiseStr * this.dpr;

        // 4. Verlet-style integration with friction damping
        p.vx = (p.vx + ax) * friction;
        p.vy = (p.vy + ay) * friction;
        p.x += p.vx;
        p.y += p.vy;
      } else {
        // Reduced motion: smooth exponential glide, no velocity physics
        p.x += (p.targetX - p.x) * 0.12;
        p.y += (p.targetY - p.y) * 0.12;
      }

      // 5. Draw crisp point
      const color = p.isAccent ? themeColors.accent : themeColors.particle;
      const baseAlpha = p.isAccent
        ? themeColors.accentAlpha * p.opacity
        : themeColors.particleAlpha * p.opacity;

      const alpha = Math.min(1, Math.max(0, baseAlpha * this.opacityMultiplier));
      ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;

      const size = p.baseSize * this.dpr * this.sizeMultiplier;
      ctx.fillRect(
        Math.round(p.x - size * 0.5),
        Math.round(p.y - size * 0.5),
        Math.max(1, Math.round(size)),
        Math.max(1, Math.round(size))
      );
    }

    this.animId = requestAnimationFrame(this._tick);
  }
}
