'use client';

import { useRef, useEffect, useState } from 'react';
import { useInView } from 'framer-motion';

const MONO: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };

const MERCHANTS = [
  { name: 'HeyGlow',        value: '$340',   orders: 3, flagged: '2 refunds', angle: -90   },
  { name: 'Murmur Audio',   value: '$1,210', orders: 3, flagged: '2 INR',     angle: -38.6 },
  { name: 'RidgePath',      value: '$612',   orders: 2, flagged: '2 INR',     angle:  12.9 },
  { name: 'Aster & Vale',   value: '$284',   orders: 1, flagged: '1 refund',  angle:  64.3 },
  { name: 'Northbound',     value: '$890',   orders: 2, flagged: '1 INR',     angle: 115.7 },
  { name: '[Redacted]',     value: '$–',     orders: 2, flagged: '–',         angle: 167.1 },
  { name: '[Redacted]',     value: '$–',     orders: 1, flagged: '–',         angle: 218.6 },
];

const CX = 200, CY = 190, R = 138;

function toXY(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

export function NetworkGraph() {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [visible,  setVisible]  = useState(0);
  const [hovered,  setHovered]  = useState<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    let count = 0;
    const id = setInterval(() => {
      count++;
      setVisible(count);
      if (count >= MERCHANTS.length) clearInterval(id);
    }, 280);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <div ref={ref} style={{ width: '100%', maxWidth: '460px', margin: '0 auto' }}>
      <svg viewBox="0 0 400 380" style={{ width: '100%', overflow: 'visible' }}>
        <defs>
          <radialGradient id="ng-buyer" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#8C3129" />
            <stop offset="100%" stopColor="#6A251F" />
          </radialGradient>
          <filter id="ng-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ng-glow-sm" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="ng-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(123,45,38,0.45)" />
          </marker>
        </defs>

        {/* Subtle guide ring */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="rgba(123,45,38,0.07)"
          strokeWidth="1"
          strokeDasharray="3 6"
        />

        {/* Edges */}
        {MERCHANTS.map((m, i) => {
          const { x, y } = toXY(m.angle);
          const isActive = i < visible;
          const isHov    = hovered === i;
          return (
            <line
              key={i}
              x1={CX} y1={CY} x2={x} y2={y}
              stroke={isHov ? 'rgba(123,45,38,0.7)' : 'rgba(123,45,38,0.22)'}
              strokeWidth={isHov ? 1.5 : 1}
              strokeDasharray={isHov ? '0' : '4 3'}
              opacity={isActive ? 1 : 0}
              markerEnd="url(#ng-arrow)"
              style={{ transition: 'opacity 0.45s ease, stroke 0.2s ease, stroke-width 0.2s ease' }}
            />
          );
        })}

        {/* Merchant nodes */}
        {MERCHANTS.map((m, i) => {
          const { x, y } = toXY(m.angle);
          const isActive  = i < visible;
          const isHov     = hovered === i;
          const isRedacted = m.name.startsWith('[');

          // Label anchor
          const ang = m.angle;
          let tx = x, anchor: 'start' | 'middle' | 'end' = 'middle';
          let dy = -14;
          if (ang > -60 && ang < 60)   { tx = x + 18; anchor = 'start'; dy = 4; }
          else if (ang > 120 || ang < -120) { tx = x - 18; anchor = 'end'; dy = 4; }
          else if (ang > 60 && ang < 120)   { dy = 20; }
          else if (ang > -120 && ang < -60) { dy = -16; }

          return (
            <g
              key={i}
              opacity={isActive ? 1 : 0}
              style={{ transition: 'opacity 0.45s ease', cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Outer ring on hover */}
              {isHov && (
                <circle cx={x} cy={y} r={16} fill="none" stroke="rgba(123,45,38,0.25)" strokeWidth="1" />
              )}
              {/* Node */}
              <circle
                cx={x} cy={y}
                r={isHov ? 9 : 6}
                fill={isRedacted ? '#2A2820' : (isHov ? '#7B2D26' : '#EDE8DE')}
                stroke={isRedacted ? '#4A4640' : '#7B2D26'}
                strokeWidth={isHov ? 2 : 1}
                filter={isHov ? 'url(#ng-glow-sm)' : undefined}
                style={{ transition: 'all 0.2s ease' }}
              />
              {/* Label */}
              <text
                x={tx} y={y + dy}
                textAnchor={anchor}
                style={{ ...MONO, fontSize: '9px', fill: isRedacted ? '#5A5448' : (isHov ? '#1A1814' : '#6A6050'), pointerEvents: 'none' }}
              >
                {m.name}
              </text>

              {/* Tooltip */}
              {isHov && !isRedacted && (
                <g>
                  <rect
                    x={x - 56} y={y + 12} width={112} height={40}
                    fill="#1A1814" rx={0}
                    style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
                  />
                  <text x={x} y={y + 28} textAnchor="middle"
                    style={{ ...MONO, fontSize: '9px', fill: '#9A9282' }}>
                    {m.value} · {m.orders} orders
                  </text>
                  <text x={x} y={y + 43} textAnchor="middle"
                    style={{ ...MONO, fontSize: '9px', fill: '#7B2D26' }}>
                    {m.flagged} flagged
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Pulse rings on center */}
        {visible >= MERCHANTS.length && (
          <>
            <circle cx={CX} cy={CY} r={42} fill="none" stroke="rgba(123,45,38,0.12)" strokeWidth="1" />
            <circle cx={CX} cy={CY} r={50} fill="none" stroke="rgba(123,45,38,0.06)" strokeWidth="1" />
          </>
        )}

        {/* Center buyer node */}
        <circle cx={CX} cy={CY} r={34} fill="url(#ng-buyer)" filter="url(#ng-glow)" />
        <circle cx={CX} cy={CY} r={34} fill="none" stroke="rgba(196,147,90,0.35)" strokeWidth="1" />
        <text x={CX} y={CY - 8} textAnchor="middle"
          style={{ ...MONO, fontSize: '9px', fill: '#F4EEE2', fontWeight: 600, letterSpacing: '0.05em' }}>
          #u_kessler
        </text>
        <text x={CX} y={CY + 5} textAnchor="middle"
          style={{ ...MONO, fontSize: '9px', fill: '#F4EEE2', fontWeight: 600, letterSpacing: '0.05em' }}>
          .07
        </text>
        <text x={CX} y={CY + 20} textAnchor="middle"
          style={{ ...MONO, fontSize: '8px', fill: 'rgba(244,238,226,0.45)', letterSpacing: '0.1em' }}>
          RESOLVED
        </text>
      </svg>

      <p style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8472', textAlign: 'center', marginTop: '8px' }}>
        {visible} of {MERCHANTS.length} merchants linked · hover to inspect
      </p>
    </div>
  );
}
