'use client';

import { useState } from 'react';

const MONO: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };
const SANS: React.CSSProperties = { fontFamily: 'var(--font-dm-sans, sans-serif)' };
const SERIF: React.CSSProperties = { fontFamily: 'var(--font-serif, serif)' };

function ImportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h14M3 9h14M3 13h8" />
      <path d="M14 15l2 2 4-4" />
    </svg>
  );
}

function NormaliseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h5M4 10h12M4 14h8" />
      <circle cx="15" cy="6" r="2.5" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="2" />
      <circle cx="4" cy="5" r="1.5" />
      <circle cx="16" cy="5" r="1.5" />
      <circle cx="4" cy="15" r="1.5" />
      <circle cx="16" cy="15" r="1.5" />
      <line x1="5.5" y1="6.2" x2="8.5" y2="8.8" />
      <line x1="14.5" y1="6.2" x2="11.5" y2="8.8" />
      <line x1="5.5" y1="13.8" x2="8.5" y2="11.2" />
      <line x1="14.5" y1="13.8" x2="11.5" y2="11.2" />
    </svg>
  );
}

function ScoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,15 7,10 10,13 13,7 17,12" />
      <line x1="3" y1="17" x2="17" y2="17" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" />
      <line x1="7" y1="8" x2="13" y2="8" />
      <line x1="7" y1="11" x2="13" y2="11" />
      <line x1="7" y1="14" x2="11" y2="14" />
    </svg>
  );
}

const STEPS = [
  {
    n: '01', title: 'Import', caption: 'CSV or API stream',
    Icon: ImportIcon,
    detail: 'Upload a CSV export of your last 90 days of orders, or stream via real-time API. Accepts standard order, refund, return, delivery, and payment exports from any ecommerce platform.',
  },
  {
    n: '02', title: 'Normalise', caption: 'Address, email, phone',
    Icon: NormaliseIcon,
    detail: 'Every PII field reduced to canonical form: email variants, phone formats, address fuzzy-matching, postcode normalisation, card BIN + last4. Hashed client-side with a per-merchant salt before any data leaves your browser.',
  },
  {
    n: '03', title: 'Graph', caption: 'Cross-merchant clusters',
    Icon: GraphIcon,
    detail: 'Orders linked through strong signals (phone, device, account) corroborated by soft signals (email, address, postcode). Union-find clustering assigns deterministic cluster IDs that persist across all network merchants.',
  },
  {
    n: '04', title: 'Score', caption: 'Behavioural signals',
    Icon: ScoreIcon,
    detail: 'Behavioural flags: refund rate, claim velocity, denial-then-chargeback, value escalation, reason rotation, chargeback count. Confidence grades: DEFINITE / PROBABLE / POSSIBLE / WEAK with full signal breakdown.',
  },
  {
    n: '05', title: 'Export', caption: 'Evidence + review',
    Icon: ExportIcon,
    detail: 'Analyst review inbox, CSV audit export, CE 3.0 evidence packet with PII masking. Every lookup is hashed and logged. Nothing is written back to your systems.',
  },
];

export function PipelineFlow() {
  const [active, setActive] = useState(0);

  return (
    <div>
      {/* Desktop — horizontal flow */}
      <div className="hidden md:block">
        {/* Node row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 0,
            position: 'relative',
            marginBottom: '28px',
          }}
        >
          {STEPS.map((step, i) => {
            const isActive  = active === i;
            const isPast    = active > i;
            const { Icon }  = step;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                }}
                onClick={() => setActive(i)}
              >
                {/* Connector (not after last) */}
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '28px',
                      left: '50%',
                      right: '-50%',
                      height: '1px',
                      background: isPast
                        ? 'linear-gradient(90deg, #7B2D26, rgba(123,45,38,0.3))'
                        : isActive
                          ? 'linear-gradient(90deg, rgba(123,45,38,0.4), rgba(216,208,189,0.6))'
                          : 'rgba(216,208,189,0.7)',
                      transition: 'background 0.5s ease',
                      zIndex: 0,
                    }}
                  />
                )}

                {/* Circle */}
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: isActive
                      ? '#7B2D26'
                      : isPast
                        ? 'rgba(123,45,38,0.12)'
                        : '#F4F0E8',
                    border: isActive
                      ? '2px solid #7B2D26'
                      : isPast
                        ? '1px solid rgba(123,45,38,0.3)'
                        : '1px solid #D8D0BD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                    position: 'relative',
                    boxShadow: isActive ? '0 4px 16px rgba(123,45,38,0.28)' : 'none',
                    transition: 'all 0.3s ease',
                    color: isActive ? '#E8E4D8' : isPast ? '#7B2D26' : '#8A8472',
                  }}
                >
                  <Icon />
                </div>

                <p
                  style={{
                    ...MONO,
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: isActive ? '#7B2D26' : '#8A8472',
                    textAlign: 'center',
                    marginTop: '10px',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'color 0.2s ease',
                  }}
                >
                  {step.n} · {step.title}
                </p>
                <p
                  style={{
                    ...MONO,
                    fontSize: '9px',
                    color: '#B0A898',
                    textAlign: 'center',
                    marginTop: '2px',
                    letterSpacing: '0.06em',
                  }}
                >
                  {step.caption}
                </p>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div
          style={{
            background: '#EDE8DE',
            border: '1px solid #D8D0BD',
            borderRadius: '12px',
            padding: '24px 28px',
            boxShadow: '0 2px 8px rgba(26,24,20,0.04), 0 8px 24px rgba(26,24,20,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '10px',
            }}
          >
            <span style={{ ...MONO, fontSize: '11px', color: '#7B2D26', fontWeight: 600, letterSpacing: '0.06em' }}>
              {STEPS[active].n}
            </span>
            <span style={{ ...SANS, fontSize: '15px', fontWeight: 600, color: '#1A1814' }}>
              {STEPS[active].title}
            </span>
          </div>
          <p
            style={{
              ...SERIF,
              fontSize: '15px',
              color: '#4A4640',
              lineHeight: 1.65,
              maxWidth: '640px',
              margin: 0,
            }}
          >
            {STEPS[active].detail}
          </p>
        </div>
      </div>

      {/* Mobile — vertical list */}
      <div className="block md:hidden">
        {STEPS.map(({ n, title, detail }) => (
          <div
            key={n}
            style={{
              display: 'grid',
              gridTemplateColumns: '3.5rem 1fr',
              gap: '0 16px',
              borderTop: '1px solid #D8D0BD',
              padding: '20px 0',
            }}
          >
            <span
              style={{
                ...MONO,
                fontSize: '13px',
                color: '#7B2D26',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}
            >
              {n}
            </span>
            <div>
              <p
                style={{
                  ...SANS,
                  fontWeight: 600,
                  fontSize: '15px',
                  color: '#1A1814',
                  marginBottom: '6px',
                }}
              >
                {title}
              </p>
              <p
                style={{
                  ...SERIF,
                  fontSize: '14px',
                  color: '#4A4640',
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {detail}
              </p>
            </div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #D8D0BD' }} />
      </div>
    </div>
  );
}
