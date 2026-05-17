'use client';

import { useState, useEffect, useRef } from 'react';

const BASE = {
  orders:    2_485_210,
  merchants: 12,
  clusters:  48_392,
  last24h:   12_847,
};

const MONO: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };

export function MetricsTicker() {
  const [m, setM]         = useState(BASE);
  const rafRef            = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      if (Math.random() < 0.06) {
        setM((prev) => ({
          ...prev,
          orders:  prev.orders  + Math.floor(Math.random() * 3) + 1,
          last24h: prev.last24h + (Math.random() < 0.4 ? 1 : 0),
          clusters: prev.clusters + (Math.random() < 0.02 ? 1 : 0),
        }));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const items = [
    `${m.orders.toLocaleString()} ORDERS RESOLVED`,
    `${m.merchants} MERCHANTS IN NETWORK`,
    `${m.clusters.toLocaleString()} IDENTITY CLUSTERS`,
    `LAST 24H +${m.last24h.toLocaleString()} ORDERS`,
    `HASHED · NEVER RAW PII`,
    `${m.orders.toLocaleString()} ORDERS RESOLVED`,
    `${m.merchants} MERCHANTS IN NETWORK`,
    `${m.clusters.toLocaleString()} IDENTITY CLUSTERS`,
    `LAST 24H +${m.last24h.toLocaleString()} ORDERS`,
    `HASHED · NEVER RAW PII`,
  ];

  return (
    <div
      style={{
        borderTop: '1px solid rgba(216,208,189,0.5)',
        borderBottom: '1px solid rgba(216,208,189,0.5)',
        background: 'rgba(242,236,224,0.45)',
        overflow: 'hidden',
        padding: '10px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Fixed label */}
        <div
          style={{
            ...MONO,
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#7B2D26',
            padding: '0 20px',
            whiteSpace: 'nowrap',
            borderRight: '1px solid rgba(216,208,189,0.8)',
            flexShrink: 0,
            fontWeight: 600,
          }}
        >
          PILOT NETWORK ◉
        </div>

        {/* Scrolling strip */}
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div
            style={{
              animation: 'marquee 32s linear infinite',
              display: 'inline-flex',
              whiteSpace: 'nowrap',
            }}
          >
            {items.map((item, i) => (
              <span
                key={i}
                style={{
                  ...MONO,
                  fontSize: '11px',
                  color: '#8A8472',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0 28px',
                }}
              >
                {item}
                <span style={{ color: '#C8C0B0', marginLeft: '28px' }}> · </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
