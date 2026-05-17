'use client';

import { useRef, useEffect, useState } from 'react';
import { useInView } from 'framer-motion';

const MONO = 'var(--font-dm-mono, monospace)';
const SANS = 'var(--font-dm-sans, sans-serif)';

// ── Layout constants (viewBox 0 0 860 440) ──────────────────────────────────
const CARD_W  = 192;
const CARD_H  = 82;
const CX      = 334; // center card left edge
const CW      = 192; // center card width
const CY      = 170; // center card top
const CH      = 100; // center card height
const RX      = 668; // right cards left edge

// Source cards: x=0, y offsets
const SOURCES = [
  { name: 'HeyGlow Storefront',  detail: 'ORD-77241 · $340 · INR claim',  y: 22,  col: '#7B2D26' },
  { name: 'Murmur Audio',        detail: 'ORD-88102 · $1,210 · 2 INR',    y: 120, col: '#8C5A28' },
  { name: 'RidgePath Outdoor',   detail: 'ORD-91847 · $612 · 2 INR',      y: 218, col: '#8C5A28' },
  { name: 'Aster & Vale',        detail: 'ORD-65003 · $284 · refund',      y: 316, col: '#6A6050' },
];

// Right output cards
const OUTPUTS = [
  { name: 'Risk Score',      detail: '0.92 · DEFINITE',       y: 60,  accent: true },
  { name: 'Evidence Packet', detail: 'CE 3.0 · 14 signals',   y: 170, accent: false },
  { name: 'Recommended',     detail: 'DECLINE · CE 3.0',      y: 280, accent: false },
];

// Bezier paths: source card right-center → center card left-center
// Center card center: (CX, CY+CH/2) = (334, 220)
const CENTER_CY = CY + CH / 2; // 220

const L_PATHS = SOURCES.map(({ y }) => {
  const sy = y + CARD_H / 2;
  const ex = CX;
  const ey = CENTER_CY;
  const mx = (CARD_W + CX) / 2; // midpoint x ≈ 263
  return `M ${CARD_W},${sy} C ${mx},${sy} ${mx},${ey} ${ex},${ey}`;
});

const R_PATHS = OUTPUTS.map(({ y }) => {
  const oy = y + CARD_H / 2;
  const sx = CX + CW; // 526
  const sy = CENTER_CY;
  const mx = (sx + RX) / 2; // midpoint x ≈ 597
  return `M ${sx},${sy} C ${mx},${sy} ${mx},${oy} ${RX},${oy}`;
});

// ── Animated dashed path ─────────────────────────────────────────────────────

function AnimPath({ d, delay, active }: { d: string; delay: number; active: boolean }) {
  const ref   = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(600);

  useEffect(() => {
    if (ref.current) {
      try { setLen(ref.current.getTotalLength()); } catch {}
    }
  }, []);

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke="rgba(123,45,38,0.28)"
      strokeWidth="1.5"
      strokeDasharray="5 4"
      strokeDashoffset={active ? 0 : len}
      style={{
        transition: active
          ? `stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1) ${delay}s`
          : 'none',
      }}
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FraudCaseMap() {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [lActive, setLActive] = useState([false, false, false, false]);
  const [rActive, setRActive] = useState([false, false, false]);

  // Staggered path reveal
  useEffect(() => {
    if (!inView) return;
    SOURCES.forEach((_, i) => {
      setTimeout(() => {
        setLActive(prev => { const n = [...prev]; n[i] = true; return n; });
      }, i * 200);
    });
    OUTPUTS.forEach((_, i) => {
      setTimeout(() => {
        setRActive(prev => { const n = [...prev]; n[i] = true; return n; });
      }, 900 + i * 180);
    });
  }, [inView]);

  return (
    <div ref={ref} style={{ width: '100%' }}>
      {/* Desktop SVG diagram */}
      <div className="hidden md:block" style={{ position: 'relative' }}>
        <svg
          viewBox="0 0 860 440"
          style={{ width: '100%', maxWidth: '860px', margin: '0 auto', display: 'block', overflow: 'visible' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* ── Connection paths ── */}
          {L_PATHS.map((d, i) => (
            <AnimPath key={`l${i}`} d={d} delay={0} active={lActive[i]} />
          ))}
          {R_PATHS.map((d, i) => (
            <AnimPath key={`r${i}`} d={d} delay={0} active={rActive[i]} />
          ))}

          {/* Arrowheads on center card entry */}
          {inView && (
            <polygon
              points={`${CX - 1},${CENTER_CY} ${CX - 8},${CENTER_CY - 4} ${CX - 8},${CENTER_CY + 4}`}
              fill="rgba(123,45,38,0.4)"
            />
          )}

          {/* ── Source cards (left) ── */}
          {SOURCES.map(({ name, detail, y, col }, i) => (
            <g
              key={i}
              opacity={inView ? 1 : 0}
              style={{ transition: `opacity 0.4s ease ${i * 0.12}s` }}
            >
              {/* Card body */}
              <rect x={0} y={y} width={CARD_W} height={CARD_H}
                fill="#EDE8DE" stroke="#D8D0BD" strokeWidth="1" />
              {/* Left accent bar */}
              <rect x={0} y={y} width={3} height={CARD_H} fill={col} />
              {/* Header row */}
              <rect x={0} y={y} width={CARD_W} height={24} fill="#F4F0E8" />
              {/* Name */}
              <text x={12} y={y + 16}
                style={{ fontFamily: MONO, fontSize: '9px', fill: '#4A4640', letterSpacing: '0.06em' }}>
                {name.toUpperCase()}
              </text>
              {/* Detail */}
              <text x={10} y={y + 42}
                style={{ fontFamily: MONO, fontSize: '10px', fill: '#6A6050' }}>
                {detail}
              </text>
              {/* Merchant badge */}
              <text x={10} y={y + 61}
                style={{ fontFamily: MONO, fontSize: '9px', fill: '#B0A898' }}>
                MERCHANT {String(i + 1).padStart(2, '0')} OF 7
              </text>
            </g>
          ))}

          {/* ── Center Unauth node ── */}
          <rect x={CX} y={CY} width={CW} height={CH}
            fill="#15140F" stroke="#2A2820" strokeWidth="1" />
          {/* Header */}
          <rect x={CX} y={CY} width={CW} height={22}
            fill="#1E1C17" />
          <text x={CX + 10} y={CY + 14}
            style={{ fontFamily: MONO, fontSize: '8px', fill: '#5A5448', letterSpacing: '0.12em' }}>
            UNAUTH · IDENTITY ENGINE
          </text>

          {/* Cluster ID */}
          <text x={CX + CW / 2} y={CY + 50}
            textAnchor="middle"
            style={{ fontFamily: MONO, fontSize: '14px', fill: '#E8E4D8', fontWeight: 600, letterSpacing: '0.02em' }}>
            #u_kessler.07
          </text>
          <text x={CX + CW / 2} y={CY + 68}
            textAnchor="middle"
            style={{ fontFamily: MONO, fontSize: '9px', fill: '#8A8472' }}>
            confidence: 0.96 · 7 merchants
          </text>
          <text x={CX + CW / 2} y={CY + 84}
            textAnchor="middle"
            style={{ fontFamily: MONO, fontSize: '9px', fill: '#7B2D26', fontWeight: 700, letterSpacing: '0.12em' }}>
            DEFINITE
          </text>

          {/* Pulse ring on center card */}
          {inView && (
            <rect x={CX - 4} y={CY - 4} width={CW + 8} height={CH + 8}
              fill="none" stroke="rgba(123,45,38,0.2)" strokeWidth="1">
              <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.8s" repeatCount="indefinite" />
            </rect>
          )}

          {/* ── Output cards (right) ── */}
          {OUTPUTS.map(({ name, detail, y, accent }, i) => (
            <g
              key={i}
              opacity={inView ? 1 : 0}
              style={{ transition: `opacity 0.4s ease ${0.9 + i * 0.15}s` }}
            >
              <rect x={RX} y={y} width={CARD_W} height={CARD_H}
                fill="#EDE8DE"
                stroke={accent ? 'rgba(123,45,38,0.22)' : '#D8D0BD'}
                strokeWidth="1" />
              <rect x={RX} y={y} width={3} height={CARD_H}
                fill={accent ? '#7B2D26' : '#D8D0BD'} />
              <rect x={RX} y={y} width={CARD_W} height={24}
                fill="#F4F0E8" />
              <text x={RX + 12} y={y + 16}
                style={{ fontFamily: MONO, fontSize: '9px', fill: accent ? '#7B2D26' : '#4A4640', letterSpacing: '0.06em', fontWeight: accent ? 700 : 400 }}>
                {name.toUpperCase()}
              </text>
              <text x={RX + 10} y={y + 44}
                style={{ fontFamily: MONO, fontSize: '11px', fill: accent ? '#1A1814' : '#6A6050', fontWeight: accent ? 600 : 400, letterSpacing: accent ? '0.02em' : '0' }}>
                {detail}
              </text>
            </g>
          ))}

          {/* ── Column labels ── */}
          <text x={CARD_W / 2} y={428}
            textAnchor="middle"
            style={{ fontFamily: MONO, fontSize: '9px', fill: '#8A8472', letterSpacing: '0.1em' }}>
            MERCHANT DATA SOURCES
          </text>
          <text x={CX + CW / 2} y={285}
            textAnchor="middle"
            style={{ fontFamily: MONO, fontSize: '9px', fill: '#5A5448', letterSpacing: '0.1em' }}>
            IDENTITY RESOLUTION
          </text>
          <text x={RX + CARD_W / 2} y={376}
            textAnchor="middle"
            style={{ fontFamily: MONO, fontSize: '9px', fill: '#8A8472', letterSpacing: '0.1em' }}>
            INTELLIGENCE OUTPUT
          </text>
        </svg>
      </div>

      {/* Mobile: simple list */}
      <div className="flex flex-col md:hidden" style={{ gap: '12px' }}>
        <div style={{ background: '#15140F', border: '1px solid #2A2820', borderRadius: '12px', padding: '20px', marginBottom: '8px' }}>
          <p style={{ fontFamily: MONO, fontSize: '10px', color: '#5A5448', letterSpacing: '0.12em', marginBottom: '8px' }}>UNAUTH · IDENTITY ENGINE</p>
          <p style={{ fontFamily: MONO, fontSize: '16px', color: '#E8E4D8', fontWeight: 600, letterSpacing: '0.02em', marginBottom: '4px' }}>#u_kessler.07</p>
          <p style={{ fontFamily: MONO, fontSize: '10px', color: '#8A8472', marginBottom: '4px' }}>confidence: 0.96 · 7 merchants</p>
          <p style={{ fontFamily: MONO, fontSize: '10px', color: '#7B2D26', fontWeight: 700, letterSpacing: '0.12em' }}>DEFINITE</p>
        </div>
        {SOURCES.map(({ name, detail, col }) => (
          <div key={name} style={{ background: '#EDE8DE', border: '1px solid #D8D0BD', borderRadius: '12px', borderLeft: `3px solid ${col}`, padding: '14px 16px' }}>
            <p style={{ fontFamily: MONO, fontSize: '9px', color: '#4A4640', letterSpacing: '0.08em', marginBottom: '4px' }}>{name.toUpperCase()}</p>
            <p style={{ fontFamily: MONO, fontSize: '11px', color: '#6A6050' }}>{detail}</p>
          </div>
        ))}
      </div>

      {/* Caption */}
      <p style={{ fontFamily: MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8472', marginTop: '16px', textAlign: 'center' }}>
        4 of 7 merchant sources shown · hover the right column to inspect outputs
      </p>
    </div>
  );
}
