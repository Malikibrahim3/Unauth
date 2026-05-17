'use client';

import { useState } from 'react';
import { JsonHighlight } from './LandingAnimations';

const MONO: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };
const SANS: React.CSSProperties = { fontFamily: 'var(--font-dm-sans, sans-serif)' };
const SERIF: React.CSSProperties = { fontFamily: 'var(--font-serif, serif)' };

// ── Card shell ────────────────────────────────────────────────────────────────

function Card({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: '#EDE8DE',
        border: '1px solid #D8D0BD',
        borderRadius: '12px',
        boxShadow:
          '0 0 0 1px rgba(26,24,20,0.02),' +
          '0 2px 4px -1px rgba(26,24,20,0.04),' +
          '0 10px 24px -4px rgba(26,24,20,0.07)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ label, dot }: { label: string; dot?: string }) {
  return (
    <div
      style={{
        padding: '9px 16px',
        borderBottom: '1px solid #D8D0BD',
        background: '#F4F0E8',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dot,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#4A4640' }}>
        {label}
      </span>
    </div>
  );
}

// ── Signal types for the case file explorer ───────────────────────────────────

type Signal = 'email' | 'address' | 'phone' | 'card' | 'pattern';

const SIGNAL_LABELS: Record<Signal, string> = {
  email:   'Email variant',
  address: 'Address match',
  phone:   'Phone match',
  card:    'Card BIN + last4',
  pattern: 'Refund pattern',
};

const SIGNAL_COLORS: Record<Signal, string> = {
  email:   '#7B2D26',
  address: '#8C5A28',
  phone:   '#6B7F3A',
  card:    '#4A6B82',
  pattern: '#8C3A6B',
};

interface MerchantRow {
  name:    string;
  value:   string;
  orders:  number;
  refunds: string;
  signals: Signal[];
}

const ROWS: MerchantRow[] = [
  { name: 'HeyGlow',       value: '$340',   orders: 3, refunds: '2 refunds', signals: ['email', 'address', 'pattern'] },
  { name: 'Murmur Audio',  value: '$1,210', orders: 3, refunds: '2 INR',     signals: ['email', 'card', 'pattern'] },
  { name: 'RidgePath',     value: '$612',   orders: 2, refunds: '2 INR',     signals: ['phone', 'address', 'pattern'] },
  { name: 'Aster & Vale',  value: '$284',   orders: 1, refunds: '1 refund',  signals: ['email'] },
  { name: 'Northbound',    value: '$890',   orders: 2, refunds: '1 INR',     signals: ['card', 'pattern'] },
];

// ── Interactive case file explorer ────────────────────────────────────────────

function CaseFileExplorer() {
  const [active, setActive] = useState<Signal | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardHeader label="Case file explorer · UN-2026-04-21-0083" dot="#7B2D26" />

      <div style={{ padding: '20px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Subject */}
        <div>
          <p style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8472', marginBottom: '4px' }}>
            SUBJECT
          </p>
          <p style={{ ...MONO, fontSize: '13px', color: '#1A1814' }}>
            Noah K<span style={{ background: '#1A1814', color: 'transparent', userSelect: 'none' }}>████</span>
            {' '}·{' '}
            <span style={{ color: '#7B2D26', fontWeight: 600 }}>#u_kessler.07</span>
            {' '}· risk score{' '}
            <span style={{ color: '#7B2D26', fontWeight: 600 }}>0.92</span>
          </p>
        </div>

        {/* Signal filters */}
        <div>
          <p style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8472', marginBottom: '10px' }}>
            FILTER BY SIGNAL — click to highlight
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(Object.entries(SIGNAL_LABELS) as [Signal, string][]).map(([key, label]) => {
              const isActive = active === key;
              const col = SIGNAL_COLORS[key];
              return (
                <button
                  key={key}
                  onClick={() => setActive(isActive ? null : key)}
                  style={{
                    ...MONO,
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: isActive ? '#EDE8DE' : col,
                    background: isActive ? col : `${col}14`,
                    border: `1px solid ${col}40`,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Merchant rows */}
        <div style={{ flex: 1 }}>
          <div style={{ borderTop: '1px solid #D8D0BD' }}>
            {/* Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 60px 48px 80px auto',
                gap: '0 12px',
                padding: '6px 12px',
                background: '#F4F0E8',
                borderBottom: '1px solid #D8D0BD',
              }}
            >
              {['MERCHANT', 'VALUE', 'ORDERS', 'REFUNDS', 'SIGNALS'].map((h) => (
                <span key={h} style={{ ...MONO, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8472' }}>
                  {h}
                </span>
              ))}
            </div>

            {ROWS.map((row, i) => {
              const isHighlighted = active !== null && row.signals.includes(active);
              const isDimmed      = active !== null && !row.signals.includes(active);
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 60px 48px 80px auto',
                    gap: '0 12px',
                    padding: '9px 12px',
                    borderBottom: '1px solid #E8E2D8',
                    alignItems: 'center',
                    background: isHighlighted ? 'rgba(123,45,38,0.04)' : 'transparent',
                    opacity: isDimmed ? 0.35 : 1,
                    transition: 'all 0.2s ease',
                    borderLeft: isHighlighted ? '2px solid rgba(123,45,38,0.5)' : '2px solid transparent',
                  }}
                >
                  <span style={{ ...MONO, fontSize: '11px', color: isHighlighted ? '#1A1814' : '#4A4640', fontWeight: isHighlighted ? 600 : 400 }}>
                    {row.name}
                  </span>
                  <span style={{ ...MONO, fontSize: '11px', color: '#6A6050' }}>
                    {row.value}
                  </span>
                  <span style={{ ...MONO, fontSize: '11px', color: '#8A8472' }}>
                    {row.orders}
                  </span>
                  <span style={{ ...MONO, fontSize: '10px', color: isHighlighted ? '#7B2D26' : '#8A8472', fontWeight: isHighlighted ? 600 : 400 }}>
                    {row.refunds}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {row.signals.map((sig) => {
                      const col = SIGNAL_COLORS[sig];
                      const lit = active === sig;
                      return (
                        <span
                          key={sig}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: lit ? col : `${col}44`,
                            display: 'inline-block',
                            transition: 'background 0.2s ease',
                            boxShadow: lit ? `0 0 6px ${col}80` : 'none',
                          }}
                          title={SIGNAL_LABELS[sig]}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ ...MONO, fontSize: '9px', color: '#B0A898', marginTop: '8px', paddingLeft: '12px' }}>
            [2 merchants withheld] · 7 total · hover signals to inspect
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Confidence grades tile ────────────────────────────────────────────────────

const GRADES = [
  { label: 'DEFINITE',  score: '≥ 0.90', bar: '100%', col: '#7B2D26'  },
  { label: 'PROBABLE',  score: '≥ 0.70', bar: '78%',  col: '#8C5A28'  },
  { label: 'POSSIBLE',  score: '≥ 0.50', bar: '56%',  col: '#6A6050'  },
  { label: 'WEAK',      score: '≥ 0.30', bar: '34%',  col: '#8A8472'  },
];

function ConfidenceTile() {
  return (
    <Card>
      <CardHeader label="Confidence grades" dot="#C4935A" />
      <div style={{ padding: '20px' }}>
        <p style={{ ...SERIF, fontSize: '13px', color: '#6A6050', lineHeight: 1.55, marginBottom: '20px' }}>
          Every cluster returns a calibrated tier — not a binary flag.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {GRADES.map(({ label, score, bar, col }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ ...MONO, fontSize: '10px', color: col, fontWeight: 600, letterSpacing: '0.08em' }}>
                  {label}
                </span>
                <span style={{ ...MONO, fontSize: '10px', color: '#8A8472' }}>
                  risk {score}
                </span>
              </div>
              <div style={{ height: '4px', background: '#EDE8E0', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0, top: 0, height: '100%',
                    width: bar,
                    background: col,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Evidence packet tile ──────────────────────────────────────────────────────

const EVIDENCE_LINES = [
  { key: 'packet_id',       val: '"UN-2026-04-21-0083"' },
  { key: 'cluster_id',      val: '"u_kessler.07"' },
  { key: 'merchants',       val: '7' },
  { key: 'evidence_items',  val: '14' },
  { key: 'dispute_ready',   val: 'true' },
  { key: 'ce_version',      val: '"3.0"' },
  { key: 'pii_masked',      val: 'true' },
];

function EvidenceTile() {
  return (
    <Card>
      <CardHeader label="Evidence packet · CE 3.0" dot="#6B9E82" />
      <pre
        style={{
          ...MONO,
          fontSize: '11px',
          lineHeight: 1.9,
          padding: '16px 18px',
          margin: 0,
          background: 'transparent',
          color: '#4A4640',
        }}
      >
        <JsonHighlight
          code={`{\n${EVIDENCE_LINES.map(({ key, val }) => `  "${key}": ${val}`).join(',\n')}\n}`}
        />
      </pre>
    </Card>
  );
}

// ── Fraud signal tile ─────────────────────────────────────────────────────────

const SIGNALS_LIST = [
  { label: 'refund_rate_over_60pct',      severity: 'HIGH' },
  { label: 'cross_merchant_inr_pattern',  severity: 'HIGH' },
  { label: 'shipping_address_variant',    severity: 'MED'  },
  { label: 'denial_then_chargeback',      severity: 'HIGH' },
  { label: 'claim_velocity_7d',           severity: 'MED'  },
  { label: 'card_bin_reuse',              severity: 'LOW'  },
];

const SEV_COLOR: Record<string, string> = { HIGH: '#7B2D26', MED: '#8C5A28', LOW: '#6A6050' };

function SignalsTile() {
  return (
    <Card>
      <CardHeader label="Signals fired · ORD-77241" dot="#7B2D26" />
      <div style={{ padding: '16px 0' }}>
        {SIGNALS_LIST.map(({ label, severity }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 18px',
              borderBottom: '1px solid #F0EBE3',
            }}
          >
            <span style={{ ...MONO, fontSize: '10px', color: '#4A4640' }}>
              {label}
            </span>
            <span
              style={{
                ...MONO,
                fontSize: '9px',
                color: SEV_COLOR[severity],
                fontWeight: 600,
                letterSpacing: '0.1em',
                background: `${SEV_COLOR[severity]}12`,
                padding: '2px 8px',
                border: `1px solid ${SEV_COLOR[severity]}30`,
              }}
            >
              {severity}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function ProductBento() {
  return (
    <section
      style={{
        margin: '0 auto',
        maxWidth: '1400px',
        padding: '0 24px 80px',
      }}
    >
      {/* Desktop 3-col grid */}
      <div
        className="hidden md:grid"
        style={{
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'auto auto',
          gap: '16px',
        }}
      >
        {/* Top-left: Case file explorer — spans 2 cols */}
        <div style={{ gridColumn: 'span 2' }}>
          <Card style={{ height: '100%', minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
            <CaseFileExplorer />
          </Card>
        </div>

        {/* Top-right: Fraud signals */}
        <SignalsTile />

        {/* Bottom-left: Confidence grades */}
        <ConfidenceTile />

        {/* Bottom-middle: Evidence packet */}
        <EvidenceTile />

        {/* Bottom-right: Privacy / hashing stat */}
        <Card>
          <CardHeader label="Privacy by design" dot="#6B9E82" />
          <div style={{ padding: '24px 20px' }}>
            <p style={{ ...SERIF, fontSize: '13px', color: '#6A6050', lineHeight: 1.6, marginBottom: '20px' }}>
              All PII hashed client-side with HMAC-SHA256 before any data leaves the merchant's browser.
              We never receive raw email addresses, phone numbers, or card data.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['email', 'phone', 'address', 'card BIN', 'device FP', 'postcode'].map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6B9E82', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ ...MONO, fontSize: '10px', color: '#8A8472', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {f} → hash
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '20px', padding: '14px', background: '#F4F0E8', border: '1px solid #D8D0BD' }}>
              <span style={{ ...MONO, fontSize: '10px', color: '#4A4640', letterSpacing: '0.08em' }}>
                HMAC-SHA256 · per-merchant salt · k-anonymity gating
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Mobile: stacked */}
      <div className="grid md:hidden grid-cols-1 gap-5">
        <Card style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
          <CaseFileExplorer />
        </Card>
        <ConfidenceTile />
        <EvidenceTile />
        <SignalsTile />
      </div>
    </section>
  );
}
