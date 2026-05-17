'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const MONO: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };

// ── §1: Animated identity resolution feed ─────────────────────────────────

const FEED_ROWS = [
  { id: 'ORD-77241', identity: 'u_kessler.07', merchants: 7, score: 0.92, action: 'DECLINE' as const },
  { id: 'ORD-88102', identity: 'u_marlowe.12', merchants: 4, score: 0.81, action: 'REVIEW'  as const },
  { id: 'ORD-91847', identity: 'u_chen.03',    merchants: 5, score: 0.88, action: 'DECLINE' as const },
  { id: 'ORD-65003', identity: 'u_patel.21',   merchants: 3, score: 0.74, action: 'REVIEW'  as const },
  { id: 'ORD-54129', identity: 'u_okafor.08',  merchants: 6, score: 0.95, action: 'DECLINE' as const },
  { id: 'ORD-62918', identity: 'u_santos.04',  merchants: 4, score: 0.83, action: 'DECLINE' as const },
  { id: 'ORD-71304', identity: 'u_hayes.19',   merchants: 3, score: 0.69, action: 'REVIEW'  as const },
];

export function IdentityFeed() {
  const [phase, setPhase] = useState<'loading' | 'resolving'>('loading');
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('resolving'), 900);
    const t2 = setTimeout(() => {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setVisibleCount(count);
        if (count >= FEED_ROWS.length) clearInterval(interval);
      }, 520);
      return () => clearInterval(interval);
    }, 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const isLoading = phase === 'loading';

  return (
    <div
      className="transition-all duration-500 ease-out hover:scale-[1.015]"
      style={{
        background: '#EDE8DE',
        border: '1px solid #D8D0BD',
        boxShadow:
          '0 0 0 1px rgba(26,24,20,0.03),' +
          '0 4px 8px -2px rgba(26,24,20,0.06),' +
          '0 20px 48px -8px rgba(26,24,20,0.09)',
      }}
    >
      {/* Header bar */}
      <div style={{
        padding: '9px 16px',
        borderBottom: '1px solid #D8D0BD',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#F4F0E8',
      }}>
        <span style={{ ...MONO, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4A4640' }}>
          IDENTITY RESOLUTION · AUDIT RUN
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...MONO, fontSize: '10px', color: isLoading ? '#8A8472' : '#7B2D26' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
            background: isLoading ? '#8A8472' : '#7B2D26',
          }} />
          {isLoading ? 'INITIALISING' : 'RESOLVING'}
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: '20px 16px' }}>
          <p style={{ ...MONO, fontSize: '12px', color: '#8A8472', margin: 0 }}>
            Hashing 3,000 orders client-side...
          </p>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '96px 1fr 72px 58px 72px',
            padding: '7px 16px',
            borderBottom: '1px solid #D8D0BD',
          }}>
            {['ORDER', 'CLUSTER ID', 'SEEN AT', 'SCORE', 'ACTION'].map(h => (
              <span key={h} style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8472' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {FEED_ROWS.map((row, i) => (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '96px 1fr 72px 58px 72px',
                padding: '10px 16px',
                borderBottom: i < FEED_ROWS.length - 1 ? '1px solid #D8D0BD' : 'none',
                alignItems: 'center',
                opacity: i < visibleCount ? 1 : 0,
                transform: i < visibleCount ? 'translateY(0)' : 'translateY(4px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
              }}
            >
              <span style={{ ...MONO, fontSize: '11px', color: '#4A4640' }}>{row.id}</span>
              <span style={{ ...MONO, fontSize: '11px', color: '#1A1814' }}>#{row.identity}</span>
              <span style={{ ...MONO, fontSize: '11px', color: '#4A4640' }}>{row.merchants} stores</span>
              <span style={{
                ...MONO, fontSize: '12px',
                color: row.score >= 0.85 ? '#7B2D26' : '#4A4640',
                fontWeight: row.score >= 0.85 ? 600 : 400,
              }}>
                {row.score.toFixed(2)}
              </span>
              <span style={{
                ...MONO, fontSize: '10px', letterSpacing: '0.05em',
                color: row.action === 'DECLINE' ? '#7B2D26' : '#4A4640',
                fontWeight: row.action === 'DECLINE' ? 600 : 400,
              }}>
                {row.action}
              </span>
            </div>
          ))}

          {/* Footer */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #D8D0BD' }}>
            <span style={{ ...MONO, fontSize: '10px', color: '#8A8472' }}>
              {visibleCount} of {FEED_ROWS.length} flagged · 2,995 cleared · processing complete
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── §2 Charts: shared tooltip style ───────────────────────────────────────

const DARK_TOOLTIP = {
  contentStyle: {
    background: '#1A1814', border: '1px solid #2A2820',
    borderRadius: '12px', padding: '8px 12px',
  },
  labelStyle: { fontFamily: 'monospace', fontSize: 11, color: '#E8E4D8', marginBottom: 2 },
  itemStyle:  { fontFamily: 'monospace', fontSize: 11, color: '#8A8472' },
  cursor: { stroke: '#2A2820', strokeWidth: 1 },
};

// ── §2: Network growth area chart (dark bg) ────────────────────────────────

// Industry fraud loss estimates — Visa / LexisNexis sector research
const GROWTH_DATA = [
  { year: '2021', losses: 52, inr: 28 },
  { year: '2022', losses: 65, inr: 36 },
  { year: '2023', losses: 73, inr: 41 },
  { year: '2024', losses: 81, inr: 46 },
  { year: '2025', losses: 89, inr: 51 },
];

export function NetworkGrowthChart() {
  return (
    <div className="transition-all duration-500 ease-out hover:scale-[1.015] hover:ring-1 hover:ring-white/[.07]">
      <p style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8472', marginBottom: '20px' }}>
        REFUND FRAUD LOSSES — INDUSTRY ESTIMATES · $B
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={GROWTH_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="clusterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="10%" stopColor="#7B2D26" stopOpacity={0.3} />
              <stop offset="90%" stopColor="#7B2D26" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#2A2820" />
          <XAxis dataKey="year" tick={{ fontFamily: 'monospace', fontSize: 10, fill: '#8A8472' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontFamily: 'monospace', fontSize: 10, fill: '#8A8472' }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `$${v}B`}
          />
          <Tooltip {...DARK_TOOLTIP} formatter={(v: number) => [`$${v}B`, undefined]} />
          <Area
            type="monotone" dataKey="losses" name="Total fraud losses"
            stroke="#7B2D26" strokeWidth={2} fill="url(#clusterGrad)"
            dot={false} activeDot={{ r: 4, fill: '#7B2D26', strokeWidth: 0 }}
          />
          <Area
            type="monotone" dataKey="inr" name="INR & refund abuse"
            stroke="#4A4640" strokeWidth={1.5} fill="none"
            strokeDasharray="4 3" dot={false}
            activeDot={{ r: 3, fill: '#4A4640', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
        {[
          { color: '#7B2D26', dash: false,  label: 'total fraud losses' },
          { color: '#4A4640', dash: true,   label: 'INR & refund abuse' },
        ].map(({ color, dash, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', ...MONO, fontSize: '10px', color: '#8A8472' }}>
            <span style={{
              width: 14, height: 0,
              borderTop: dash ? `1.5px dashed ${color}` : `2px solid ${color}`,
              display: 'inline-block',
            }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── §2: Fraud claim breakdown bar chart (dark bg) ─────────────────────────

const CLAIM_DATA = [
  { type: 'INR claims',   pct: 58 },
  { type: 'Refund abuse', pct: 31 },
  { type: 'Chargeback',   pct: 11 },
];

export function FraudBreakdownChart() {
  return (
    <div className="transition-all duration-500 ease-out hover:scale-[1.015] hover:ring-1 hover:ring-white/[.07]">
      <p style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8472', marginBottom: '20px' }}>
        CLAIM TYPE DISTRIBUTION — INDUSTRY ESTIMATE
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={CLAIM_DATA} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="2 4" stroke="#2A2820" horizontal={false} />
          <XAxis
            type="number" domain={[0, 65]}
            tick={{ fontFamily: 'monospace', fontSize: 10, fill: '#8A8472' }}
            tickFormatter={v => `${v}%`} axisLine={false} tickLine={false}
          />
          <YAxis
            type="category" dataKey="type" width={90}
            tick={{ fontFamily: 'monospace', fontSize: 10, fill: '#8A8472' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip {...DARK_TOOLTIP} formatter={(v: number) => [`${v}%`, 'Share']} />
          <Bar dataKey="pct" fill="#7B2D26" radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── §4: Before / after bars (Murmur Audio case study) ─────────────────────

const BEFORE_AFTER = [
  { metric: 'INR CLAIM RATE',      before: 9.4, after: 2.1, max: 12,  lowerBetter: true  },
  { metric: 'CHARGEBACK WIN RATE', before: 18,  after: 64,  max: 75,  lowerBetter: false },
];

export function BeforeAfterBars() {
  return (
    <div>
      <p style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#4A4640', marginBottom: '24px' }}>
        MURMUR AUDIO · 90-DAY BEFORE / AFTER
      </p>

      {BEFORE_AFTER.map(({ metric, before, after, max, lowerBetter }) => {
        const delta = lowerBetter
          ? `↓ ${(((before - after) / before) * 100).toFixed(0)}%`
          : `↑ ${(((after - before) / before) * 100).toFixed(0)}%`;
        return (
          <div key={metric} style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4A4640' }}>{metric}</span>
              <span style={{ ...MONO, fontSize: '12px', color: '#7B2D26', fontWeight: 600 }}>{delta}</span>
            </div>
            {[
              { label: 'BEFORE', value: before, color: '#8A8472' },
              { label: 'AFTER',  value: after,  color: '#7B2D26' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <span style={{ ...MONO, fontSize: '9px', color, width: '38px', textTransform: 'uppercase' }}>{label}</span>
                <div style={{ flex: 1, position: 'relative', height: '10px', background: '#F0ECE4' }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0,
                    width: `${(value / max) * 100}%`, height: '100%',
                    background: color,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <span style={{ ...MONO, fontSize: '12px', color, fontWeight: label === 'AFTER' ? 600 : 400, width: '36px', textAlign: 'right' }}>
                  {value}%
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
