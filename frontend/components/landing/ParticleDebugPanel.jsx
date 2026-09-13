'use client';

import { useState, useEffect } from 'react';
import { FORMATION_NAMES } from '../../lib/particleEngine';

/**
 * ParticleDebugPanel
 * ─────────────────────────────────────────────────────────────
 * Interactive development-only debug panel for the particle engine.
 * Enabled via:
 *   - URL parameter: ?particlesDebug=1
 *   - URL parameter: ?formation=think (locks formation)
 *   - Or clicking the subtle bottom-left toggle pill
 * ─────────────────────────────────────────────────────────────
 */
export default function ParticleDebugPanel({ engineRef }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Check URL parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('particlesDebug') === '1' || params.get('debug') === '1') {
        setOpen(true);
      }
      const initialFormation = params.get('formation');
      if (initialFormation && engineRef?.current) {
        engineRef.current.setFormation(initialFormation.toLowerCase(), true);
      }
    }
  }, [engineRef]);

  useEffect(() => {
    const engine = engineRef?.current;
    if (!engine) return;

    setStatus(engine.getStatus());
    const unsubscribe = engine.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, [engineRef, open]);

  if (!status) return null;

  return (
    <aside
      className="kc-particle-debug-container"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        color: '#E2E8F0',
      }}
    >
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#93C5FD',
            padding: '8px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 500,
          }}
          title="Open Particle Debug Panel (?particlesDebug=1)"
        >
          <span style={{ color: '#3B82F6', fontSize: '14px' }}>⚡</span>
          <span>Particles: {status.particles} ({status.formation})</span>
        </button>
      ) : (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.94)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '16px',
            width: '320px',
            maxWidth: 'calc(100vw - 40px)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#60A5FA' }}>
              <span>⚡</span>
              <span>Particle Engine</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px 6px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Diagnostics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: '14px', fontSize: '11px' }}>
            <div>
              <span style={{ color: '#64748B' }}>Particles: </span>
              <strong style={{ color: '#F1F5F9' }}>{status.particles}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Canvas: </span>
              <strong style={{ color: '#F1F5F9' }}>{status.width} × {status.height}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Status: </span>
              <strong style={{ color: status.animation === 'RUNNING' ? '#4ADE80' : '#F87171' }}>
                {status.animation}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>DPR: </span>
              <strong style={{ color: '#F1F5F9' }}>{status.dpr}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Scroll: </span>
              <strong style={{ color: '#93C5FD' }}>{status.scroll}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Pointer: </span>
              <strong style={{ color: status.pointerActive ? '#4ADE80' : '#64748B' }}>
                {status.pointer}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Theme: </span>
              <strong style={{ color: '#F1F5F9' }}>{status.theme}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Reduced: </span>
              <strong style={{ color: status.reducedMotion === 'TRUE' ? '#FBBF24' : '#64748B' }}>
                {status.reducedMotion}
              </strong>
            </div>
          </div>

          {/* Formation Switcher */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#94A3B8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Formations {status.isManual ? <span style={{ color: '#FBBF24' }}>(Locked)</span> : <span style={{ color: '#64748B' }}>(Scroll-Driven)</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '6px' }}>
              {FORMATION_NAMES.map((fName) => {
                const isSelected = status.formation === fName.toUpperCase();
                return (
                  <button
                    key={fName}
                    onClick={() => engineRef?.current?.setFormation(fName, true)}
                    style={{
                      background: isSelected ? '#2563EB' : 'rgba(255, 255, 255, 0.06)',
                      border: isSelected ? '1px solid #60A5FA' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: isSelected ? '#FFFFFF' : '#CBD5E1',
                      padding: '5px 4px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      textTransform: 'capitalize',
                      transition: 'all 0.15s',
                    }}
                  >
                    {fName}
                  </button>
                );
              })}
            </div>
            {status.isManual && (
              <button
                onClick={() => engineRef?.current?.clearManualFormation()}
                style={{
                  width: '100%',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px dashed #3B82F6',
                  color: '#93C5FD',
                  padding: '5px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                ← Follow Page Scroll
              </button>
            )}
          </div>

          {/* Visual Tuning Controls */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '10px', marginBottom: '3px' }}>
                <span>Particle Size:</span>
                <span>{status.sizeMultiplier.toFixed(1)}x</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1.0, 1.4, 1.8, 2.4].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      if (engineRef?.current) {
                        engineRef.current.sizeMultiplier = sz;
                        engineRef.current._notify();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '3px',
                      fontSize: '10px',
                      background: status.sizeMultiplier === sz ? '#2563EB' : 'rgba(255, 255, 255, 0.06)',
                      border: 'none',
                      borderRadius: '3px',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    {sz}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '10px', marginBottom: '3px' }}>
                <span>Opacity Boost:</span>
                <span>{status.opacityMultiplier.toFixed(1)}x</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1.0, 1.3, 1.6, 2.0].map((op) => (
                  <button
                    key={op}
                    onClick={() => {
                      if (engineRef?.current) {
                        engineRef.current.opacityMultiplier = op;
                        engineRef.current._notify();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '3px',
                      fontSize: '10px',
                      background: status.opacityMultiplier === op ? '#2563EB' : 'rgba(255, 255, 255, 0.06)',
                      border: 'none',
                      borderRadius: '3px',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    {op}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
