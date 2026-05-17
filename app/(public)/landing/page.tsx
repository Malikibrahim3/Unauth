import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { Lock, EyeOff, FileText, Scale } from 'lucide-react';
import NetworkChart from './_components/NetworkChart';
import Reveal from './_components/Reveal';
import Counter from './_components/Counter';
import AnimatedBar from './_components/AnimatedBar';

export const metadata = {
  title: 'Unauth — Fraud Intelligence for Ecommerce',
  description:
    'Cross-merchant identity resolution. Friendly fraud, refund abuse, and INR-claim rings caught by linking identities across stores.',
};

export default function LandingPage() {
  const today = new Date();
  const todayLong = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const todayISO = today.toISOString().slice(0, 10);

  return (
    <div
      style={{
        background: '#F8F5EE',
        color: '#1A1814',
        minHeight: '100vh',
      }}
    >
      {/* ── Header strip ────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: '1px solid #ECE5D4',
          background: 'rgba(248, 245, 238, 0.85)',
          backdropFilter: 'saturate(140%) blur(8px)',
          WebkitBackdropFilter: 'saturate(140%) blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
        className="py-4"
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <UnauthLogo variant="wordmark-light" size={28} />
            <nav className="hidden md:flex items-center gap-7" style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '15.5px', color: '#4A4640' }}>
              <a href="#how-it-works" className="ua-nav-link">How it works</a>
              <a href="#network" className="ua-nav-link">Network</a>
              <a href="#evidence" className="ua-nav-link">Evidence</a>
              <a href="#security" className="ua-nav-link">Security</a>
            </nav>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="/login"
              style={{ color: '#4A4640', fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '15.5px' }}
              className="hover:underline"
            >
              Sign in
            </a>
            <a
              href="mailto:hello@unauth.app?subject=Unauth%20pilot%20request"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '13px',
                fontWeight: 500,
                color: '#E8E4D8',
                background: '#1A1814',
                padding: '7px 14px',
                border: '1px solid #1A1814',
                textDecoration: 'none',
              }}
              className="hover:bg-[#2B2922]"
            >
              Request access →
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-12 md:pt-16 pb-0">

        {/* Top — copy block */}
        <Reveal delay={40}>
          {/* Eyebrow */}
          <p
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#4A4640',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            Cross-merchant fraud graph · ecommerce
            <span
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '10px',
                letterSpacing: '0.08em',
                color: '#8A8472',
                fontWeight: 400,
                textTransform: 'none',
              }}
            >
              Issue 04 · {todayISO}
            </span>
          </p>

          {/* Headline */}
          <h1
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 'clamp(44px, 5.6vw, 80px)',
              fontWeight: 500,
              letterSpacing: '-0.028em',
              lineHeight: 0.97,
              color: '#1A1814',
              marginBottom: '22px',
              maxWidth: '14ch',
            }}
          >
            Resolve the buyer your store has{' '}
            <span style={{ color: '#7B2D26', fontStyle: 'italic', fontFamily: 'var(--font-serif, serif)', fontWeight: 400 }}>
              never seen.
            </span>
          </h1>

          {/* Sub-prose */}
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(16px, 1.2vw, 18px)',
              color: '#4A4640',
              lineHeight: 1.55,
              marginBottom: '28px',
              maxWidth: '52ch',
            }}
          >
            Upload your order and refund history. Unauth links repeat abusers across the network and returns CE&nbsp;3.0 evidence packets before your chargeback window closes.
          </p>

          {/* CTA row */}
          <div className="flex flex-wrap items-center gap-4" style={{ marginBottom: '20px' }}>
            <a
              href="mailto:hello@unauth.app?subject=Unauth%20pilot%20request"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#1A1814',
                color: '#F8F5EE',
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '14px',
                fontWeight: 500,
                padding: '14px 22px',
                border: '1px solid #1A1814',
                borderRadius: 0,
                textDecoration: 'none',
                boxShadow: '0 1px 0 #1A1814, 0 8px 24px -12px rgba(26,24,20,0.35)',
                transition: 'background 160ms ease',
              }}
              className="hover:bg-[#2B2922]"
            >
              Request access
              <span aria-hidden style={{ fontFamily: 'var(--font-dm-mono, monospace)' }}>→</span>
            </a>
            <a
              href="#evidence"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '14px',
                color: '#4A4640',
                textDecoration: 'none',
                padding: '14px 4px',
                borderBottom: '1px solid transparent',
              }}
              className="hover:border-b hover:border-[#4A4640]"
            >
              View evidence packet ↓
            </a>
          </div>

          {/* Proof chips */}
          <div className="flex flex-wrap gap-2">
            {[
              'No checkout integration',
              'CSV pilot · ~10 min',
              'Client-side HMAC hashing',
              'CE 3.0 evidence output',
            ].map((chip) => (
              <span
                key={chip}
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '10.5px',
                  color: '#4A4640',
                  background: '#F2EDE3',
                  border: '1px solid #D8D0BD',
                  padding: '4px 10px',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </Reveal>

        {/* Bottom — large product artifact */}
        <Reveal as="div" className="relative mt-14 md:mt-20" delay={180}>
            {/* Floating eyebrow above artifact */}
            <div
              className="flex items-center justify-between mb-3"
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '10.5px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#8A8472',
              }}
            >
              <span>
                <span
                  className="ua-pulse"
                  style={{ display: 'inline-block', width: 6, height: 6, background: '#34A853', marginRight: '8px', verticalAlign: 'middle' }}
                />
                Live engine output · synthetic example
              </span>
              <span>Cluster #u_kessler.07</span>
            </div>

            <div
              className="ua-hover-glow"
              style={{
                background: '#FDFBF6',
                border: '1px solid #D8D0BD',
                borderRadius: 0,
                boxShadow:
                  '0 1px 0 #D8D0BD, 0 20px 40px -20px rgba(26,24,20,0.14), 0 40px 80px -40px rgba(26,24,20,0.10)',
                position: 'relative',
              }}
            >
              {/* Header bar with status chips */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #D8D0BD',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  background: '#F8F5EE',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '11.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#4A4640',
                    margin: 0,
                  }}
                >
                  <span style={{ color: '#7B2D26' }}>●</span>{' '}
                  CASE FILE · UN-2026-04-21-0083
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      color: '#FFFFFF',
                      background: '#7B2D26',
                      border: '1px solid #7B2D26',
                      padding: '3px 9px',
                      lineHeight: 1.4,
                      fontWeight: 500,
                    }}
                  >
                    DEFINITE
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      color: '#4A4640',
                      background: '#F2EDE3',
                      border: '1px solid #D8D0BD',
                      padding: '3px 9px',
                      lineHeight: 1.4,
                    }}
                  >
                    RISK 0.92
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      color: '#4A4640',
                      background: '#F2EDE3',
                      border: '1px solid #D8D0BD',
                      padding: '3px 9px',
                      lineHeight: 1.4,
                    }}
                  >
                    CONF 0.96
                  </span>
                </div>
              </div>

              {/* Two-column body: subject + sparkbars */}
              <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1fr]">
                {/* Subject column */}
                <div style={{ padding: '20px 22px', borderRight: '1px solid #D8D0BD' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: '#8A8472',
                      marginBottom: '8px',
                    }}
                  >
                    SUBJECT
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif, serif)',
                      fontSize: '20px',
                      color: '#1A1814',
                      marginBottom: '6px',
                      lineHeight: 1.3,
                    }}
                  >
                    Noah K
                    <span
                      style={{
                        background: '#1A1814',
                        color: 'transparent',
                        userSelect: 'none',
                        padding: '0 4px',
                      }}
                    >
                      ████
                    </span>
                    <sup>
                      <a href="#note-1" style={{ color: '#7B2D26', textDecoration: 'none' }}>1</a>
                    </sup>
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '13px',
                      color: '#7B2D26',
                      letterSpacing: '0.02em',
                      marginBottom: '14px',
                    }}
                  >
                    → #u_kessler.07
                  </p>

                  {/* Identity fragment grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px 12px',
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '11.5px',
                      color: '#4A4640',
                    }}
                  >
                    {[
                      ['emails', '3 variants'],
                      ['addresses', '3 variants'],
                      ['payment', 'Chase ••4419'],
                      ['devices', '2 fingerprints'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <span style={{ color: '#8A8472', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '10px', display: 'block', marginBottom: '2px' }}>{k}</span>
                        <span style={{ color: '#1A1814' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk score column */}
                <div style={{ padding: '20px 22px' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: '#8A8472',
                      marginBottom: '8px',
                    }}
                  >
                    SIGNALS FIRED — 4 / 12
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {[
                      { l: 'refund_rate_over_60pct', v: 0.92, on: true },
                      { l: 'cross_merchant_inr_pattern', v: 0.88, on: true },
                      { l: 'shipping_address_variant', v: 0.74, on: true },
                      { l: 'denial_then_chargeback', v: 0.68, on: true },
                      { l: 'velocity_burst_24h', v: 0.21, on: false },
                    ].map(({ l, v, on }, i) => (
                      <div key={l} style={{ display: 'grid', gridTemplateColumns: '1fr 36px', gap: '10px', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                background: on ? '#7B2D26' : '#D8D0BD',
                                display: 'inline-block',
                                borderRadius: '50%',
                              }}
                            />
                            <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: on ? '#1A1814' : '#8A8472' }}>
                              {l}
                            </span>
                          </div>
                          <AnimatedBar
                            value={v}
                            color={on ? '#7B2D26' : '#B8B2A0'}
                            track="#ECE5D4"
                            height={3}
                            delay={300 + i * 90}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: 'var(--font-dm-mono, monospace)',
                            fontSize: '10.5px',
                            color: on ? '#1A1814' : '#8A8472',
                            fontVariantNumeric: 'tabular-nums',
                            textAlign: 'right',
                          }}
                        >
                          <Counter value={v} decimals={2} duration={900} delay={300 + i * 90} format="plain" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Network footprint */}
              <div style={{ borderTop: '1px solid #D8D0BD', padding: '16px 22px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '10px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: '#8A8472',
                      margin: 0,
                    }}
                  >
                    NETWORK FOOTPRINT
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10px',
                      letterSpacing: '0.06em',
                      color: '#8A8472',
                      margin: 0,
                    }}
                  >
                    7 merchants · $3,337 lifetime · 11 orders
                  </p>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '12px',
                    color: '#4A4640',
                    lineHeight: 1.85,
                  }}
                >
                  {[
                    { m: 'HeyGlow Skincare',     o: '3 ord · 2 ref',  v: '$340',   r: 0.55 },
                    { m: 'Murmur Audio',         o: '3 ord · 2 INR',  v: '$1,210', r: 0.92, note: true },
                    { m: 'RidgePath Outfitters', o: '2 ord · 2 INR',  v: '$613',   r: 0.80 },
                    { m: 'Aster & Vale',         o: '1 ord · 1 ref',  v: '$284',   r: 0.42 },
                    { m: 'Northbound Goods',     o: '2 ord · 1 INR',  v: '$890',   r: 0.71 },
                  ].map((row, i) => (
                    <div
                      key={row.m}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) 60px auto',
                        gap: '12px',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ color: '#1A1814', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.m}
                        {row.note ? (
                          <sup style={{ fontFamily: 'var(--font-serif, serif)' }}>
                            <a href="#note-2" style={{ color: '#7B2D26', textDecoration: 'none' }}>2</a>
                          </sup>
                        ) : null}
                      </span>
                      <span style={{ color: '#4A4640' }}>{row.o}</span>
                      <AnimatedBar
                        value={row.r}
                        color={row.r > 0.7 ? '#7B2D26' : row.r > 0.5 ? '#B6512A' : '#8A8472'}
                        track="#ECE5D4"
                        height={3}
                        delay={500 + i * 70}
                      />
                      <span style={{ color: '#1A1814', fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: '46px' }}>
                        {row.v}
                      </span>
                    </div>
                  ))}
                  <p style={{ color: '#8A8472', fontSize: '11px', marginTop: '8px' }}>
                    + 2 more merchants withheld (k-anonymity gate)
                  </p>
                </div>
              </div>

              {/* Recommended action */}
              <div
                style={{
                  borderTop: '1px solid #D8D0BD',
                  padding: '14px 22px',
                  background: 'linear-gradient(90deg, #F8F0EE 0%, #F4E8E5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '11.5px',
                    color: '#7B2D26',
                    letterSpacing: '0.06em',
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  ▸ DECLINE NEXT ORDER · ASSEMBLE CE 3.0 PACKET FOR 2 OPEN DISPUTES
                </p>
                <span
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '10.5px',
                    color: '#7B2D26',
                    background: '#FFFFFF',
                    border: '1px solid #E3C9C3',
                    padding: '2px 8px',
                  }}
                >
                  packet.pdf · 2.4mb
                </span>
              </div>

              {/* Footer meta */}
              <div style={{ borderTop: '1px solid #D8D0BD', padding: '10px 22px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '10.5px',
                    color: '#8A8472',
                    letterSpacing: '0.02em',
                    margin: 0,
                  }}
                >
                  generated 2026-05-15 09:42 EST · pipeline latency 38ms
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '10.5px',
                    color: '#8A8472',
                    margin: 0,
                  }}
                >
                  HMAC-SHA256 · per-tenant salt
                </p>
              </div>
            </div>

            {/* Tiny meta row under card */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#8A8472', letterSpacing: '0.04em' }}>
              <span>1 of 312 resolved this week</span>
              <span style={{ color: '#D8D0BD' }}>·</span>
              <span>median resolution: 38s</span>
              <span style={{ color: '#D8D0BD' }}>·</span>
              <span>CE 3.0 packet ready in browser</span>
            </div>
          </Reveal>
      </section>

      {/* ── §1 · The pattern your store can't see — VISUAL ───────── */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '40px' }} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <p
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#7B2D26',
                marginBottom: '14px',
              }}
            >
              § 1 — THE PROBLEM
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 'clamp(26px, 2.6vw, 36px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                color: '#1A1814',
                marginBottom: '20px',
              }}
            >
              One buyer.{' '}
              <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif, serif)', color: '#7B2D26' }}>Seven stores.</span>{' '}
              Zero shared signal.
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontSize: 'clamp(16px, 1.2vw, 18px)',
                lineHeight: 1.6,
                color: '#4A4640',
                marginBottom: '20px',
              }}
            >
              A serial refund abuser doesn&rsquo;t behave like one at your store. They behave like a good customer — at your store. They behave like a good customer at six other stores too. The pattern only resolves when orders are stacked side by side.
            </p>

            {/* Three stats inline */}
            <div className="grid grid-cols-3 gap-3 mt-7 pt-5" style={{ borderTop: '1px solid #D8D0BD' }}>
              {[
                { v: 89, prefix: '$', suffix: 'B', dec: 0, l: 'lost annually to refund / INR fraud', n: 3 },
                { v: 5,  prefix: '1 in ', suffix: '', dec: 0, l: 'DTC refund claims tied to repeat abusers', n: 4 },
                { v: 2.7, prefix: '', suffix: '×', dec: 1, l: 'true cost of a lost chargeback', n: 5 },
              ].map((s, i) => (
                <Reveal key={s.l} delay={120 + i * 80}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: 'clamp(20px, 1.8vw, 26px)',
                      fontWeight: 500,
                      color: '#1A1814',
                      lineHeight: 1,
                      marginBottom: '6px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <Counter value={s.v} prefix={s.prefix} suffix={s.suffix} decimals={s.dec} duration={1100} format="plain" />
                    <sup style={{ fontSize: '0.4em' }}>
                      <a href={`#note-${s.n}`} style={{ color: '#7B2D26', textDecoration: 'none' }}>{s.n}</a>
                    </sup>
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif, serif)',
                      fontSize: '12px',
                      color: '#8A8472',
                      lineHeight: 1.4,
                      fontStyle: 'italic',
                    }}
                  >
                    {s.l}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Right: ledger visualization — same buyer across 7 stores */}
          <Reveal className="lg:col-span-7" delay={140}>
            <div
              className="ua-hover-glow"
              style={{
                background: '#FDFBF6',
                border: '1px solid #D8D0BD',
                padding: '20px 22px',
                boxShadow: '0 1px 0 #D8D0BD, 0 12px 32px -20px rgba(26,24,20,0.10)',
              }}
            >
              <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '10.5px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#8A8472',
                    margin: 0,
                  }}
                >
                  Same Buyer · Seven Identities Observed Independently
                </p>
                <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: '#8A8472', margin: 0 }}>
                  → resolved to #u_kessler.07
                </p>
              </div>

              {(() => {
                const ledgerRows = [
                  { merchant: 'HeyGlow Skincare',     email: 'noah.kessler@protonmail.com', addr: '4421 Larkspur Ln, Apt 3B',     card: '••4419' },
                  { merchant: 'Murmur Audio',         email: 'n.kessler@protonmail.com',    addr: '4421 Larspur Lane Apt 3B',     card: '••4419' },
                  { merchant: 'RidgePath Outfitters', email: 'noah_kessler@gmail.com',      addr: '4421 Larkspur Ln #3B',         card: '••4419' },
                  { merchant: 'Aster & Vale',         email: 'n.k@gmail.com',               addr: '4421 Larkspur Ln Apt 3B',      card: '••4419' },
                  { merchant: 'Northbound Goods',     email: 'noah.kessler@protonmail.com', addr: '4421 Larkspur Ln #3B',         card: '••4419' },
                  { merchant: 'Petalwood Co.',        email: 'n.kessler+1@protonmail.com',  addr: '4421 Larkspur Ln, Apt 3B',     card: '••4419' },
                  { merchant: 'Otterline',            email: 'noah.kessler@protonmail.com', addr: '4421 Larkspur Lane, Apt 3B',   card: '••4419' },
                ];
                return (
                  <>
                    {/* ── Desktop / tablet ledger grid (≥sm) ── */}
                    <div className="hidden sm:block">
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(110px, 1fr) minmax(0, 1.5fr) minmax(0, 1.2fr) 60px 70px',
                          gap: '12px',
                          fontFamily: 'var(--font-dm-mono, monospace)',
                          fontSize: '10px',
                          color: '#8A8472',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          padding: '0 0 6px 0',
                          borderBottom: '1px solid #D8D0BD',
                          marginBottom: '2px',
                        }}
                      >
                        <span>Merchant</span>
                        <span>Email</span>
                        <span>Address</span>
                        <span>Card</span>
                        <span>Status</span>
                      </div>
                      {ledgerRows.map((row, i) => (
                        <Reveal
                          key={i}
                          delay={220 + i * 70}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(110px, 1fr) minmax(0, 1.5fr) minmax(0, 1.2fr) 60px 70px',
                            gap: '12px',
                            alignItems: 'center',
                            fontFamily: 'var(--font-dm-mono, monospace)',
                            fontSize: '11.5px',
                            padding: '7px 0',
                            borderBottom: i < ledgerRows.length - 1 ? '1px dashed #ECE5D4' : 'none',
                            color: '#4A4640',
                          }}
                        >
                          <span style={{ color: '#1A1814', fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '12px' }}>{row.merchant}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.email}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.addr}</span>
                          <span>{row.card}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#3D6F4A', fontSize: '10.5px' }}>
                            <span style={{ width: 5, height: 5, background: '#3D6F4A', borderRadius: '50%' }} />
                            ok
                          </span>
                        </Reveal>
                      ))}
                    </div>

                    {/* ── Mobile stacked identity cards (<sm) ── */}
                    <div className="sm:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {ledgerRows.map((row, i) => (
                        <Reveal
                          key={`m-${i}`}
                          delay={220 + i * 70}
                          style={{
                            background: '#F8F5EE',
                            border: '1px solid #ECE5D4',
                            padding: '12px 14px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', fontWeight: 600, color: '#1A1814' }}>
                              {row.merchant}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#3D6F4A', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', letterSpacing: '0.04em' }}>
                              <span style={{ width: 5, height: 5, background: '#3D6F4A', borderRadius: '50%' }} />
                              ok
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '4px 10px', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#4A4640' }}>
                            <span style={{ color: '#8A8472', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '9.5px' }}>email</span>
                            <span style={{ wordBreak: 'break-all', color: '#1A1814' }}>{row.email}</span>
                            <span style={{ color: '#8A8472', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '9.5px' }}>address</span>
                            <span style={{ color: '#1A1814' }}>{row.addr}</span>
                            <span style={{ color: '#8A8472', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '9.5px' }}>card</span>
                            <span style={{ color: '#7B2D26' }}>{row.card}</span>
                          </div>
                        </Reveal>
                      ))}
                    </div>
                  </>
                );
              })()}

              {/* Resolution arrow */}
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '14px',
                  borderTop: '1px solid #D8D0BD',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-serif, serif)',
                    fontStyle: 'italic',
                    fontSize: '13px',
                    color: '#8A8472',
                    margin: 0,
                  }}
                >
                  At each store, a normal customer. Across the network — a single identity, 6 refunds, 4 INRs.
                </p>
                <span
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '11px',
                    color: '#7B2D26',
                    background: '#F4E8E5',
                    border: '1px solid #E3C9C3',
                    padding: '3px 10px',
                  }}
                >
                  RISK 0.92 · DEFINITE
                </span>
              </div>
            </div>

            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: '#8A8472', marginTop: '10px', letterSpacing: '0.04em' }}>
              ledger view · synthetic · pii redacted in network surfaces
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── §2 · Network observation (dark inversion) ───────────── */}
      <section
        id="network"
        style={{ background: '#15140F', color: '#E8E4D8', scrollMarginTop: '72px' }}
        className="py-16 md:py-24"
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10 md:mb-12">
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#B6512A',
                  marginBottom: '12px',
                }}
              >
                § 2 — THE NETWORK
              </p>
              <h2
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: 'clamp(28px, 2.8vw, 40px)',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                  color: '#E8E4D8',
                  marginBottom: '12px',
                  maxWidth: '720px',
                }}
              >
                What 12 weeks of cross-merchant clustering looks like in production.
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '12px',
                  color: '#8A8472',
                  margin: 0,
                  letterSpacing: '0.06em',
                }}
              >
                founding merchant cohort · network is being built · k-anonymity gated (≥3 merchants)
              </p>
            </div>
            <div style={{ display: 'flex', gap: '24px', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#B8B2A0' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 8, height: 8, background: '#34A853', borderRadius: '50%', display: 'inline-block' }} />
                LIVE · 217ms p95
              </span>
              <span>v3.2.1</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px" style={{ marginBottom: '0', background: '#2B2922', border: '1px solid #2B2922' }}>
            {/* Chart spans 8 */}
            <Reveal noFade className="lg:col-span-8 ua-chart-draw" style={{ background: '#15140F', padding: '24px 24px 16px' }} threshold={0.25}>
              <NetworkChart />
            </Reveal>

            {/* Metrics column 4 */}
            <div className="lg:col-span-4 grid grid-cols-1" style={{ background: '#2B2922', gap: '1px' }}>
              {[
                { v: 0, l: 'identity clusters resolved', s: 'network is being built with founding merchants' },
                { v: 0, l: 'network-known abusers', s: 'published once the founding cohort is live' },
                { v: 0, l: 'CE 3.0 packets prepared', s: 'internal synthetic benchmark · 38ms pipeline latency' },
              ].map((m, i) => (
                <Reveal key={m.l} delay={120 + i * 90} style={{ background: '#15140F', padding: '22px 22px 22px' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: '#8A8472',
                      marginBottom: '10px',
                    }}
                  >
                    {m.l}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: 'clamp(28px, 2.6vw, 38px)',
                      fontWeight: 500,
                      color: '#E8E4D8',
                      marginBottom: '8px',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                    }}
                  >
                    <Counter value={m.v} duration={1400} format="comma" delay={200 + i * 90} />
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif, serif)',
                      fontStyle: 'italic',
                      fontSize: '13px',
                      color: '#B8B2A0',
                      lineHeight: 1.4,
                      margin: 0,
                    }}
                  >
                    {m.s}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(14px, 1vw, 15px)',
              color: '#8A8472',
              maxWidth: '720px',
              lineHeight: 1.6,
              marginTop: '24px',
            }}
          >
            The network is being built with founding merchants now. Published network figures will appear once the cohort is live; until then, output remains illustrative and k-anonymity gated. The network does not publish merchant names, raw order data, or buyer identities.
          </p>
        </div>
      </section>

      {/* ── §3 · How it works ───────────────────────────────────── */}
      <section id="how-it-works" style={{ scrollMarginTop: '72px' }} className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '40px' }} />

        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <p
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#7B2D26',
                marginBottom: '12px',
              }}
            >
              § 3 — THE PIPELINE
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 'clamp(28px, 2.8vw, 40px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
                color: '#1A1814',
                marginBottom: '10px',
                maxWidth: '720px',
              }}
            >
              Four stages — CSV in, signed evidence out.
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontSize: 'clamp(15px, 1.1vw, 17px)',
                color: '#4A4640',
                lineHeight: 1.55,
                margin: 0,
                maxWidth: '560px',
              }}
            >
              PII never leaves the browser in clear text
              <sup>
                <a href="#note-6" style={{ color: '#7B2D26', textDecoration: 'none' }}>6</a>
              </sup>
              . Every step is logged with a hashed audit trail.
            </p>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '11px',
              color: '#8A8472',
              letterSpacing: '0.06em',
            }}
          >
            avg total · 38s · 11ms per order
          </div>
        </div>

        {/* 4-step card flow with visual flow indicator */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px"
          style={{ background: '#D8D0BD', border: '1px solid #D8D0BD', marginBottom: '40px' }}
        >
          {[
            {
              n: '01',
              t: '11ms',
              title: 'Upload',
              body: 'CSV of orders, refunds, returns, and deliveries — or a real-time API stream.',
              detail: 'No schema changes. No webhooks. No checkout integration required.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                  <path d="M3 14v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="#7B2D26" strokeWidth="1.4"/>
                  <path d="M7 8l4-4 4 4M11 4v12" stroke="#7B2D26" strokeWidth="1.4"/>
                </svg>
              ),
            },
            {
              n: '02',
              t: '4ms',
              title: 'Hash in browser',
              body: 'Email, phone, address, and card-reference fields are HMAC-SHA256 hashed with a salt only your tenant holds.',
              detail: 'Unauth never sees the raw values.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                  <rect x="4" y="9" width="14" height="9" stroke="#7B2D26" strokeWidth="1.4"/>
                  <path d="M7 9V6a4 4 0 0 1 8 0v3" stroke="#7B2D26" strokeWidth="1.4"/>
                </svg>
              ),
            },
            {
              n: '03',
              t: '17ms',
              title: 'Resolve cluster',
              body: 'Hashes resolve against the cross-merchant identity graph using strong signals corroborated by soft signals.',
              detail: 'k-anonymity gated — surfaces only at 3+ merchants.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                  <circle cx="11" cy="11" r="3" stroke="#7B2D26" strokeWidth="1.4"/>
                  <circle cx="4" cy="5" r="1.6" stroke="#7B2D26" strokeWidth="1.4"/>
                  <circle cx="18" cy="5" r="1.6" stroke="#7B2D26" strokeWidth="1.4"/>
                  <circle cx="4" cy="17" r="1.6" stroke="#7B2D26" strokeWidth="1.4"/>
                  <circle cx="18" cy="17" r="1.6" stroke="#7B2D26" strokeWidth="1.4"/>
                  <path d="M5.2 6.2l3.6 3.6M16.8 6.2l-3.6 3.6M5.2 15.8l3.6-3.6M16.8 15.8l-3.6-3.6" stroke="#7B2D26" strokeWidth="1.4"/>
                </svg>
              ),
            },
            {
              n: '04',
              t: '6ms',
              title: 'Return evidence',
              body: 'Single signed object: risk_score, cluster_id, signals_fired, evidence-packet eligibility.',
              detail: 'CE 3.0 packet renders into your dispute response.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                  <path d="M5 3h9l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="#7B2D26" strokeWidth="1.4"/>
                  <path d="M14 3v4h4M8 13l2 2 4-4" stroke="#7B2D26" strokeWidth="1.4"/>
                </svg>
              ),
            },
          ].map((step, i) => (
            <Reveal
              key={step.n}
              delay={80 + i * 80}
              className="ua-hover-lift"
              style={{
                background: '#FDFBF6',
                padding: '22px 22px 22px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '244px',
                position: 'relative',
              }}
            >
              {i < 3 && (
                <span
                  className="hidden lg:flex"
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: -10,
                    top: 36,
                    width: 20,
                    height: 20,
                    background: '#F8F5EE',
                    color: '#7B2D26',
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '14px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #D8D0BD',
                    zIndex: 1,
                  }}
                >
                  →
                </span>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '11px',
                    color: '#7B2D26',
                    letterSpacing: '0.1em',
                    background: '#F4E8E5',
                    padding: '3px 8px',
                    border: '1px solid #E3C9C3',
                  }}
                >
                  STEP {step.n}
                </span>
                <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#8A8472' }}>
                  {step.t}
                </span>
              </div>
              <div style={{ marginBottom: '12px' }}>{step.icon}</div>
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontWeight: 600,
                  fontSize: '18px',
                  color: '#1A1814',
                  letterSpacing: '-0.005em',
                  marginBottom: '8px',
                }}
              >
                {step.title}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontSize: '14px',
                  color: '#4A4640',
                  lineHeight: 1.5,
                  marginBottom: '10px',
                }}
              >
                {step.body}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontStyle: 'italic',
                  fontSize: '12.5px',
                  color: '#8A8472',
                  lineHeight: 1.5,
                  marginTop: 'auto',
                }}
              >
                {step.detail}
              </p>
            </Reveal>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-10">
          {/* Left — request / response */}
          <div className="lg:col-span-7">
            <p
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '11px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#8A8472',
                marginBottom: '12px',
              }}
            >
              § 3.2 — ENGINE RESPONSE
            </p>

            <div
              style={{
                background: '#15140F',
                border: '1px solid #2B2922',
                boxShadow: '0 1px 0 #15140F, 0 16px 32px -20px rgba(26,24,20,0.18)',
              }}
            >
              {/* Editor chrome */}
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid #2B2922',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '11px',
                  color: '#8A8472',
                }}
              >
                <span style={{ display: 'inline-flex', gap: '5px' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3A372E', display: 'inline-block' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3A372E', display: 'inline-block' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3A372E', display: 'inline-block' }} />
                </span>
                <span style={{ marginLeft: '10px' }}>POST /v1/score</span>
                <span style={{ marginLeft: 'auto', color: '#34A853' }}>200 OK · 38ms</span>
              </div>

              <pre
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '12.5px',
                  color: '#B8B2A0',
                  lineHeight: 1.75,
                  padding: '18px 20px',
                  margin: 0,
                  overflowX: 'auto',
                  background: 'transparent',
                }}
              >
<span>{'{'}</span>{'\n'}
<span>{'  '}<span style={{ color: '#8A8472' }}>{'"order_id"'}</span>: <span style={{ color: '#E8E4D8' }}>{'"ORD-77241"'}</span>,</span>{'\n'}
<span>{'  '}<span style={{ color: '#8A8472' }}>{'"risk_score"'}</span>: <span style={{ color: '#B6512A' }}>0.92</span>,</span>{'\n'}
<span>{'  '}<span style={{ color: '#8A8472' }}>{'"cluster_id"'}</span>: <span style={{ color: '#E8E4D8' }}>{'"u_kessler.07"'}</span>,</span>{'\n'}
<span>{'  '}<span style={{ color: '#8A8472' }}>{'"confidence_grade"'}</span>: <span style={{ color: '#B6512A' }}>{'"DEFINITE"'}</span>,</span>{'\n'}
<span>{'  '}<span style={{ color: '#8A8472' }}>{'"signals_fired"'}</span>: [</span>{'\n'}
<span>{'    '}<span style={{ color: '#E8E4D8' }}>{'"refund_rate_over_60pct"'}</span>,</span>{'\n'}
<span>{'    '}<span style={{ color: '#E8E4D8' }}>{'"cross_merchant_inr_pattern"'}</span>,</span>{'\n'}
<span>{'    '}<span style={{ color: '#E8E4D8' }}>{'"shipping_address_variant"'}</span>,</span>{'\n'}
<span>{'    '}<span style={{ color: '#E8E4D8' }}>{'"denial_then_chargeback"'}</span></span>{'\n'}
<span>{'  '}],</span>{'\n'}
<span>{'  '}<span style={{ color: '#8A8472' }}>{'"merchants_seen_at"'}</span>: <span style={{ color: '#B6512A' }}>7</span>,</span>{'\n'}
<span>{'  '}<span style={{ color: '#8A8472' }}>{'"evidence_packet_eligible"'}</span>: <span style={{ color: '#34A853' }}>true</span></span>{'\n'}
<span>{'}'}</span>
              </pre>
            </div>

            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '11px',
                color: '#8A8472',
                letterSpacing: '0.04em',
              }}
            >
              <span>signed · ed25519</span>
              <span style={{ color: '#D8D0BD' }}>·</span>
              <span>idempotent</span>
              <span style={{ color: '#D8D0BD' }}>·</span>
              <span>SDK: JS · Python · Ruby · Go</span>
            </div>
          </div>

          {/* Right — explanation + grades */}
          <div className="lg:col-span-5">
            <p
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '11px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#8A8472',
                marginBottom: '12px',
              }}
            >
              § 3.3 — YOUR DECISION
            </p>
            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontSize: 'clamp(15px, 1.1vw, 17px)',
                lineHeight: 1.6,
                color: '#1A1814',
                marginBottom: '24px',
              }}
            >
              We don&rsquo;t decline orders. We don&rsquo;t move money. We don&rsquo;t write to your checkout. We surface the cluster, the signals, and the evidence — what you do with it depends on your risk appetite. Most teams set a score threshold and let the rest pass.
            </p>

            {/* Confidence grade table */}
            <div style={{ border: '1px solid #D8D0BD', background: '#FDFBF6' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid #D8D0BD',
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '10.5px',
                  color: '#8A8472',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                Confidence grades · score thresholds
              </div>
              {[
                { g: 'DEFINITE', r: '0.85 – 1.00', a: 'decline + assemble CE 3.0', c: '#7B2D26' },
                { g: 'PROBABLE', r: '0.65 – 0.84', a: 'route to analyst review',     c: '#B6512A' },
                { g: 'POSSIBLE', r: '0.40 – 0.64', a: 'flag · let through',          c: '#8A8472' },
                { g: 'WEAK',     r: '0.00 – 0.39', a: 'no action',                   c: '#8A8472' },
              ].map((row, i) => (
                <div
                  key={row.g}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 92px 1fr',
                    gap: '10px',
                    padding: '10px 14px',
                    borderTop: i > 0 ? '1px solid #ECE5D4' : 'none',
                    alignItems: 'center',
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '11.5px',
                  }}
                >
                  <span style={{ color: row.c, fontWeight: 500 }}>{row.g}</span>
                  <span style={{ color: '#4A4640' }}>{row.r}</span>
                  <span style={{ color: '#1A1814', fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontSize: '13px' }}>
                    {row.a}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Sample evidence packet · full case-file artifact ─────── */}
      <section id="evidence" style={{ scrollMarginTop: '72px' }} className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '40px' }} />

        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <p
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#7B2D26',
                marginBottom: '12px',
              }}
            >
              § 4 — THE EVIDENCE PACKET
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 'clamp(28px, 2.8vw, 40px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
                color: '#1A1814',
                marginBottom: '10px',
                maxWidth: '720px',
              }}
            >
              The full case file, formatted for chargeback representment.
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontSize: 'clamp(15px, 1.1vw, 17px)',
                color: '#4A4640',
                lineHeight: 1.55,
                margin: 0,
                maxWidth: '620px',
              }}
            >
              Email variants, address misspellings, payment fingerprint, network footprint, behavioural pattern, recommended action — rendered directly into your dispute response.
            </p>
          </div>
          <a
            href="mailto:hello@unauth.app?subject=Unauth%20sample%20evidence%20packet"
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '11.5px',
              color: '#1A1814',
              padding: '8px 14px',
              border: '1px solid #1A1814',
              textDecoration: 'none',
              letterSpacing: '0.06em',
            }}
            className="hover:bg-[#1A1814] hover:text-[#F8F5EE]"
          >
            REQUEST SAMPLE PDF →
          </a>
        </div>

        <div
          style={{
            background: '#FDFBF6',
            border: '1px solid #D8D0BD',
            borderRadius: 0,
            boxShadow:
              '0 1px 0 #D8D0BD, 0 16px 32px -20px rgba(26,24,20,0.12), 0 32px 64px -32px rgba(26,24,20,0.08)',
          }}
        >
          {/* Artifact header */}
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid #D8D0BD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#4A4640',
                margin: 0,
              }}
            >
              <span style={{ color: '#7B2D26' }}>●</span>{' '}
              CASE FILE · UN-2026-04-21-0083 · SYNTHETIC EXAMPLE
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: '#7B2D26',
                  background: '#F4E8E5',
                  border: '1px solid #E3C9C3',
                  padding: '2px 8px',
                  lineHeight: 1.4,
                }}
              >
                DEFINITE
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: '#4A4640',
                  background: '#F2EDE3',
                  border: '1px solid #D8D0BD',
                  padding: '2px 8px',
                  lineHeight: 1.4,
                }}
              >
                RISK 0.92
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: '#4A4640',
                  background: '#F2EDE3',
                  border: '1px solid #D8D0BD',
                  padding: '2px 8px',
                  lineHeight: 1.4,
                }}
              >
                CONFIDENCE 0.96
              </span>
            </div>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 md:grid-cols-[60%_40%] p-5 md:p-10 gap-8 md:gap-0">
            {/* Left — Subject */}
            <div className="md:pr-10 md:border-r md:border-[#D8D0BD]">
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                SUBJECT
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontSize: '16px',
                  color: '#1A1814',
                  marginBottom: '20px',
                }}
              >
                Noah K
                <span
                  style={{
                    background: '#1A1814',
                    color: 'transparent',
                    userSelect: 'none',
                  }}
                >
                  ████
                </span>
                <sup>
                  <a href="#note-1" style={{ color: '#7B2D26', textDecoration: 'none' }}>1</a>
                </sup>
                {' '}· resolved identity{' '}
                <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '15px' }}>
                  #u_kessler.07
                </span>
              </p>

              <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 16px 0' }} />

              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                KNOWN EMAIL VARIANTS
              </p>
              <pre
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '13px',
                  color: '#4A4640',
                  lineHeight: 1.7,
                  margin: '0 0 20px 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
{`noah.kessler@protonmail.com    [primary, observed 4 merchants]
n.kessler@protonmail.com       [observed 2 merchants]
noah_kessler@gmail.com         [observed 1 merchant]
n.k@gmail.com                  [observed 1 merchant, flagged synthetic]`}
              </pre>

              <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 16px 0' }} />

              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                SHIPPING ADDRESSES (3 variants — same residence)
              </p>
              <pre
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '13px',
                  color: '#4A4640',
                  lineHeight: 1.7,
                  margin: '0 0 20px 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
{`4421 Larkspur Ln, Apt 3B, Portland OR 97214
4421 Larspur Lane Apt 3B, Portland OR 97214      [misspelt — confidence 0.98]
4421 Larkspur Ln #3B, Portland, OR 97214         [normalised match]`}
              </pre>

              <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 16px 0' }} />

              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                PAYMENT
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '13px',
                  color: '#4A4640',
                }}
              >
                Chase Sapphire Reserve  ••••  4419
              </p>
            </div>

            {/* Right — Behavior */}
            <div className="md:pl-10">
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                NETWORK FOOTPRINT
              </p>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as never }}>
                <pre
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '12px',
                    color: '#4A4640',
                    lineHeight: 1.8,
                    margin: '0 0 20px 0',
                    whiteSpace: 'pre',
                    minWidth: 0,
                  }}
                >
{`HeyGlow Skincare         $340.00     3 orders     2 refunds claimed
Murmur Audio           $1,210.00     3 orders     2 INR filed [2]
RidgePath Outfitters     $612.50     2 orders     2 INR filed
Aster & Vale             $284.00     1 order      1 refund claimed
Northbound Goods         $890.00     2 orders     1 INR filed
[2 more merchants withheld]`}
                </pre>
              </div>

              <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 16px 0' }} />

              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                PATTERN
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontStyle: 'italic',
                  fontSize: '14px',
                  color: '#4A4640',
                  lineHeight: 1.6,
                  marginBottom: '20px',
                }}
              >
                Files INR claim within 2.4 days of marked delivery, on average. 6 of 8 most recent orders disputed. First seen at HeyGlow Skincare on Feb 09, 2026. Most recent activity 4 days ago.
              </p>

              <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 16px 0' }} />

              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                RECOMMENDED ACTION
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '12px',
                  color: '#7B2D26',
                  letterSpacing: '0.04em',
                }}
              >
                Illustrative output · assemble CE 3.0 packet for open disputes
              </p>
            </div>
          </div>

          {/* Artifact footer */}
          <div style={{ borderTop: '1px solid #D8D0BD', padding: '10px 20px' }}>
            <p
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '12px',
                color: '#4A4640',
                margin: 0,
              }}
            >
              File generated 2026-05-15 09:42 EST · risk_score: 0.92 · cluster_confidence: 0.96
            </p>
          </div>
        </div>
      </section>

      {/* ── §5 · Two case studies ────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '40px' }} />

        <div className="mb-10">
          <p
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#7B2D26',
              marginBottom: '12px',
            }}
          >
            § 5 — SAMPLE AUDIT OUTPUT
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 'clamp(28px, 2.8vw, 40px)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: '#1A1814',
              marginBottom: '10px',
              maxWidth: '760px',
            }}
          >
            Two illustrative audits.{' '}
            <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif, serif)', color: '#7B2D26' }}>Modeled from pilot workflow.</span>
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(15px, 1.1vw, 17px)',
              lineHeight: 1.55,
              color: '#4A4640',
              maxWidth: '600px',
              margin: 0,
            }}
          >
            Illustrative engine output for two anonymized merchant profiles. All metrics, merchants, and analysts are synthetic.
            <sup>
              <a href="#note-7" style={{ color: '#7B2D26', textDecoration: 'none' }}>7</a>
            </sup>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px" style={{ background: '#D8D0BD', border: '1px solid #D8D0BD' }}>
          {/* Case 1 — Northbound Goods */}
          <Reveal className="ua-hover-lift" delay={60} style={{ background: '#FDFBF6', padding: '24px 26px' }}>
            <div className="flex items-center justify-between mb-5">
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '10.5px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#8A8472',
                  margin: 0,
                }}
              >
                Profile A · DTC outdoor · sample
              </p>
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '10.5px',
                  color: '#7B2D26',
                  background: '#F4E8E5',
                  border: '1px solid #E3C9C3',
                  padding: '2px 8px',
                  letterSpacing: '0.04em',
                }}
              >
                $40K/mo recovered
              </span>
            </div>

            {/* Three metrics inline */}
            <div className="grid grid-cols-3 gap-4 mb-6 pb-5" style={{ borderBottom: '1px solid #ECE5D4' }}>
              {[
                { l: 'abusers clustered',  v: 312, suffix: '',  s: '14 days' },
                { l: 'active at 3+ brands', v: 156, suffix: '', s: '50%' },
                { l: 'CE 3.0 packet readiness',    v: 71,  suffix: '%', s: 'illustrative of expected engine output, not live results' },
              ].map((m, i) => (
                <div key={m.l}>
                  <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '24px', fontWeight: 500, color: '#1A1814', margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    <Counter value={m.v} suffix={m.suffix} duration={1100} delay={140 + i * 80} format="plain" />
                  </p>
                  <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '11px', color: '#8A8472', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '6px', marginBottom: 0 }}>
                    {m.l}
                  </p>
                  <p style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '12px', fontStyle: 'italic', color: '#8A8472', marginTop: '2px', marginBottom: 0 }}>
                    {m.s}
                  </p>
                </div>
              ))}
            </div>

            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontStyle: 'italic',
                fontSize: '16px',
                lineHeight: 1.55,
                color: '#1A1814',
                marginBottom: '14px',
              }}
            >
              <span style={{ color: '#7B2D26', fontStyle: 'normal', marginRight: '6px' }}>§</span>
              Profile A shows illustrative engine output only. The visual demonstrates how cross-merchant clustering and packet assembly are presented, not a live result.
            </p>

            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11.5px', color: '#4A4640', margin: 0 }}>
              Synthetic audit · modeled from pilot workflow
            </p>
          </Reveal>

          {/* Case 2 — Murmur Audio */}
          <Reveal className="ua-hover-lift" delay={140} style={{ background: '#FDFBF6', padding: '24px 26px' }}>
            <div className="flex items-center justify-between mb-5">
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '10.5px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#8A8472',
                  margin: 0,
                }}
              >
                Profile B · DTC hardware · sample
              </p>
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '10.5px',
                  color: '#7B2D26',
                  background: '#F4E8E5',
                  border: '1px solid #E3C9C3',
                  padding: '2px 8px',
                  letterSpacing: '0.04em',
                }}
              >
                Illustrative workflow
              </span>
            </div>

            {/* Before / After bars */}
            <div className="space-y-4 mb-6 pb-5" style={{ borderBottom: '1px solid #ECE5D4' }}>
              {[
                { l: 'INR claim rate',     before: 9.4, after: 2.1, max: 12, unit: '%', dec: 1 },
                { l: 'CE 3.0 packet readiness',    before: 18,  after: 64,  max: 100, unit: '%', dec: 0 },
                { l: 'time to evidence',   before: 4.2, after: 0.6, max: 5,  unit: ' d', dec: 1 },
              ].map(({ l, before, after, max, unit, dec }, ri) => (
                <div key={l}>
                  <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '12px', color: '#1A1814', marginBottom: '6px', fontWeight: 500 }}>
                    {l}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 56px', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#8A8472', letterSpacing: '0.06em' }}>BEFORE</span>
                    <AnimatedBar value={before / max} color="#8A8472" track="#ECE5D4" height={4} delay={140 + ri * 110} />
                    <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11.5px', color: '#4A4640', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <Counter value={before} decimals={dec} duration={900} delay={140 + ri * 110} format="plain" /><span>{unit}</span>
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 56px', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#7B2D26', letterSpacing: '0.06em' }}>AFTER</span>
                    <AnimatedBar value={after / max} color="#7B2D26" track="#ECE5D4" height={4} delay={320 + ri * 110} />
                    <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11.5px', color: '#1A1814', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <Counter value={after} decimals={dec} duration={900} delay={320 + ri * 110} format="plain" /><span>{unit}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontStyle: 'italic',
                fontSize: '15px',
                lineHeight: 1.55,
                color: '#4A4640',
                marginBottom: '8px',
              }}
            >
              Profile B is illustrative of expected engine output, not a live result. It shows the shape of the workflow and the kind of packet the system produces.
            </p>

            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11.5px', color: '#4A4640', margin: 0 }}>
              90-day modeled window
              <sup />
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── §6 · What data we need ──────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '40px' }} />

        <div className="mb-10">
          <p
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#7B2D26',
              marginBottom: '12px',
            }}
          >
            § 6 — DATA SCHEMA
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 'clamp(28px, 2.8vw, 40px)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: '#1A1814',
              marginBottom: '10px',
              maxWidth: '760px',
            }}
          >
            What the engine needs. <span style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', color: '#7B2D26' }}>Nothing your platform doesn&rsquo;t already log.</span>
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(15px, 1.1vw, 17px)',
              color: '#4A4640',
              lineHeight: 1.55,
              maxWidth: '620px',
              margin: 0,
            }}
          >
            Standard order, refund, return, delivery, and payment exports. No schema changes. No webhooks. No integration.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px" style={{ background: '#D8D0BD', border: '1px solid #D8D0BD' }}>
          {/* Required */}
          <div className="lg:col-span-8" style={{ background: '#FDFBF6', padding: '22px 24px' }}>
            <div className="flex items-center justify-between mb-4">
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: '#7B2D26',
                  margin: 0,
                }}
              >
                REQUIRED — CORE FIELDS (23)
              </p>
              <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: '#8A8472', letterSpacing: '0.06em' }}>
                shopify · woocommerce · custom OMS · stripe
              </span>
            </div>

            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2"
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '12px',
                color: '#4A4640',
              }}
            >
              {[
                'order_id', 'order_date', 'customer_id', 'email',
                'phone', 'shipping_name', 'shipping_address', 'shipping_postcode',
                'billing_name', 'billing_address', 'billing_postcode', 'order_value',
                'item_count', 'sku / category', 'payment_method', 'card_bin',
                'card_last4', 'refund_requested', 'refund_reason', 'return_reason',
                'chargeback_status', 'carrier', 'tracking_number', 'delivery_status',
              ].map((f) => (
                <span key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: 3, height: 3, background: '#7B2D26', display: 'inline-block', borderRadius: '50%' }} />
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Optional */}
          <div className="lg:col-span-4" style={{ background: '#FDFBF6', padding: '22px 24px' }}>
            <p
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: '#4A4640',
                marginBottom: '14px',
              }}
            >
              OPTIONAL — ENRICHMENT
            </p>
            <div
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '12px',
                color: '#4A4640',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginBottom: '16px',
              }}
            >
              {[
                'ip_address', 'device_fingerprint', 'payment_fingerprint',
                'browser_fingerprint', 'delivery_photo_metadata', 'courier_gps_proof',
              ].map((f) => (
                <span key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: 3, height: 3, background: '#8A8472', display: 'inline-block', borderRadius: '50%' }} />
                  {f}
                </span>
              ))}
            </div>
            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontStyle: 'italic',
                fontSize: '13px',
                color: '#8A8472',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Improves resolution for clusters where email + address alone don&rsquo;t meet the DEFINITE threshold.
            </p>
          </div>
        </div>
      </section>

      {/* ── §7 · Security & data handling (dark inversion) ─────── */}
      <section
        id="security"
        style={{ background: '#15140F', color: '#E8E4D8', scrollMarginTop: '72px' }}
        className="py-16 md:py-24"
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#B6512A',
                  marginBottom: '12px',
                }}
              >
                § 7 — SECURITY &amp; DATA HANDLING
              </p>
              <h2
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: 'clamp(28px, 2.8vw, 40px)',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                  color: '#E8E4D8',
                  marginBottom: '10px',
                  maxWidth: '720px',
                }}
              >
                Your data is hashed before it leaves the browser.
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '12px',
                  color: '#8A8472',
                  margin: 0,
                  letterSpacing: '0.06em',
                }}
              >
                client-side HMAC-SHA256 · per-tenant salt · k-anonymity gated network surface
              </p>
            </div>
            <a
              href="/legal/data-handling"
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '11.5px',
                color: '#E8E4D8',
                padding: '8px 14px',
                border: '1px solid #2B2922',
                textDecoration: 'none',
                letterSpacing: '0.06em',
                background: '#1A1814',
              }}
              className="hover:bg-[#2B2922]"
            >
              FULL CONTROLS DOC →
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ marginBottom: '40px', background: '#2B2922', border: '1px solid #2B2922' }}>
            {([
              {
                Icon: Lock,
                label: 'CLIENT-SIDE HASHING',
                body: 'Email, phone, address, and card-reference fields are HMAC-SHA256 hashed in your browser with a per-merchant salt before transmission. Unauth never sees your raw values.',
              },
              {
                Icon: EyeOff,
                label: 'K-ANONYMITY GATING',
                body: 'Cross-merchant signals surface only when a cluster has been observed at 3 or more network merchants. Single-merchant patterns are returned to the originating merchant only.',
              },
              {
                Icon: FileText,
                label: 'AUDIT LOGGING',
                body: 'Every lookup is logged as a hashed record. No plaintext PII appears in audit logs. Merchants see their full query history in the dashboard.',
              },
              {
                Icon: Scale,
                label: 'LEGAL FRAMEWORK',
                body: (
                  <>
                    DPA available at{' '}
                    <a
                      href="/legal/dpa"
                      style={{ color: '#E8E4D8', textDecoration: 'underline' }}
                    >
                      /legal/dpa
                    </a>
                    . Processing designed for UK GDPR compliance. Countersigned DPA returned within two business days on request.
                  </>
                ),
              },
            ] as const).map(({ Icon, label, body }) => (
              <div key={label} style={{ background: '#15140F', padding: '24px 24px 28px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '14px',
                  }}
                >
                  <Icon size={16} strokeWidth={1.5} color="#B6512A" />
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#8A8472',
                      margin: 0,
                    }}
                  >
                    {label}
                  </p>
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-serif, serif)',
                    fontSize: '15px',
                    color: '#B8B2A0',
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>

          <p
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '12px',
              color: '#8A8472',
              letterSpacing: '0.04em',
              marginBottom: '20px',
              maxWidth: '680px',
            }}
          >
            ALSO: 4-role RBAC with 26 granular permissions · per-IP + per-merchant rate limits · chunked bulk CSV processing
          </p>

          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(15px, 1.2vw, 17px)',
              color: '#8A8472',
              maxWidth: '680px',
              lineHeight: 1.6,
            }}
          >
              SOC 2 audit in progress. The system is designed with these standards as the target architecture. Full controls documentation available on request.
          </p>
        </div>
      </section>

      {/* ── §8 · Comparison matrix ──────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '40px' }} />

        <div className="mb-10">
          <p
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#7B2D26',
              marginBottom: '12px',
            }}
          >
            § 8 — HOW UNAUTH COMPARES
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 'clamp(28px, 2.8vw, 40px)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: '#1A1814',
              marginBottom: '10px',
              maxWidth: '760px',
            }}
          >
            Most fraud tools watch checkout. Unauth watches what happens after.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(15px, 1.1vw, 17px)',
              color: '#4A4640',
              lineHeight: 1.55,
              maxWidth: '640px',
              margin: 0,
            }}
          >
            Friendly fraud, refund abuse, and INR cycles only become visible weeks after a transaction clears — which is when our post-purchase identity graph kicks in.
          </p>
        </div>

        {/* Comparison data */}
        {(() => {
          const rows = [
            { cap: 'Resolves cross-merchant identity',       a: 'no',      b: 'no',      c: 'yes', note: '7+ stores observed per cluster' },
            { cap: 'Catches friendly fraud / INR cycles',    a: 'no',      b: 'partial', c: 'yes', note: 'post-purchase patterns' },
            { cap: 'Surfaces network-known abusers',         a: 'partial', b: 'no',      c: 'yes', note: 'k-anon gated at 3+ merchants' },
            { cap: 'Explainable signals (no black box)',     a: 'yes',     b: 'no',      c: 'yes', note: 'every flag documented' },
            { cap: 'Generates CE 3.0 evidence packet',       a: 'no',      b: 'no',      c: 'yes', note: 'representment-ready PDF' },
            { cap: 'Requires checkout integration',          a: 'no',      b: 'yes',     c: 'no',  note: 'CSV is enough' },
            { cap: 'Auto-declines orders for you',           a: 'yes',     b: 'yes',     c: 'no',  note: 'you keep the decision' },
            { cap: 'PII leaves the merchant in clear text',  a: 'yes',     b: 'yes',     c: 'no',  note: 'client-side HMAC-SHA256' },
          ];
          const icon = (v: string) => v === 'yes'
            ? <span style={{ color: '#3D6F4A', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '14px' }}>●</span>
            : v === 'partial'
              ? <span style={{ color: '#B6512A', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '14px' }}>◐</span>
              : <span style={{ color: '#D8D0BD', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '14px' }}>○</span>;
          const iconLabel = (v: string) => v === 'yes' ? 'Supported' : v === 'partial' ? 'Partial' : 'Not supported';

          return (
            <>
              {/* ── Desktop / tablet grid (hidden below sm) ── */}
              <div className="hidden sm:block" style={{ border: '1px solid #D8D0BD', background: '#FDFBF6', overflow: 'hidden' }}>
                {/* Header row */}
                <div
                  className="grid grid-cols-[1.6fr_1fr_1fr_1fr]"
                  style={{ background: '#F8F5EE', borderBottom: '1px solid #D8D0BD' }}
                >
                  <div style={{ padding: '14px 18px' }}>
                    <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: '#8A8472', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                      Capability
                    </span>
                  </div>
                  {[
                    { name: 'Blocklists', sub: 'email · IP · device' },
                    { name: 'Checkout scoring', sub: 'card testing · CNP' },
                    { name: 'Unauth', sub: 'post-purchase graph', highlight: true },
                  ].map((col) => (
                    <div
                      key={col.name}
                      style={{
                        padding: '14px 16px',
                        borderLeft: '1px solid #D8D0BD',
                        background: col.highlight ? '#F4E8E5' : 'transparent',
                      }}
                    >
                      <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', fontWeight: 600, color: col.highlight ? '#7B2D26' : '#1A1814', margin: 0 }}>
                        {col.name}
                      </p>
                      <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: '#8A8472', margin: '2px 0 0 0', letterSpacing: '0.04em' }}>
                        {col.sub}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Body rows */}
                {rows.map(({ cap, a, b, c, note }, i) => (
                  <Reveal
                    key={i}
                    delay={60 + i * 50}
                    className="grid grid-cols-[1.6fr_1fr_1fr_1fr]"
                    style={{ borderBottom: i < 7 ? '1px solid #ECE5D4' : 'none', background: '#FDFBF6' }}
                  >
                    <div style={{ padding: '14px 18px' }}>
                      <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', color: '#1A1814', margin: 0, fontWeight: 500 }}>
                        {cap}
                      </p>
                      <p style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontSize: '12.5px', color: '#8A8472', margin: '2px 0 0 0' }}>
                        {note}
                      </p>
                    </div>
                    <div style={{ padding: '14px 16px', borderLeft: '1px solid #ECE5D4', display: 'flex', alignItems: 'center' }}>{icon(a)}</div>
                    <div style={{ padding: '14px 16px', borderLeft: '1px solid #ECE5D4', display: 'flex', alignItems: 'center' }}>{icon(b)}</div>
                    <div style={{ padding: '14px 16px', borderLeft: '1px solid #ECE5D4', background: '#FBF4F2', display: 'flex', alignItems: 'center' }}>{icon(c)}</div>
                  </Reveal>
                ))}
              </div>

              {/* ── Mobile stacked cards (hidden above sm) ── */}
              <div className="sm:hidden" style={{ border: '1px solid #D8D0BD', background: '#FDFBF6' }}>
                {rows.map(({ cap, a, b, c, note }, i) => (
                  <Reveal
                    key={`m-${i}`}
                    delay={60 + i * 50}
                    style={{
                      padding: '16px 18px',
                      borderBottom: i < 7 ? '1px solid #ECE5D4' : 'none',
                    }}
                  >
                    <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', color: '#1A1814', fontWeight: 500, marginBottom: '2px' }}>
                      {cap}
                    </p>
                    <p style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontSize: '12px', color: '#8A8472', marginBottom: '12px' }}>
                      {note}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { label: 'Blocklists', val: a },
                        { label: 'Checkout scoring', val: b },
                        { label: 'Unauth', val: c, highlight: true },
                      ].map(({ label, val, highlight }) => (
                        <div
                          key={label}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: highlight ? '#FBF4F2' : '#F8F5EE',
                            border: `1px solid ${highlight ? '#E3C9C3' : '#ECE5D4'}`,
                          }}
                        >
                          <span style={{
                            fontFamily: 'var(--font-dm-sans, sans-serif)',
                            fontSize: '13px',
                            fontWeight: highlight ? 600 : 400,
                            color: highlight ? '#7B2D26' : '#4A4640',
                          }}>
                            {label}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#4A4640' }}>
                            {icon(val)}
                            <span style={{ color: '#8A8472' }}>{iconLabel(val)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </Reveal>
                ))}
              </div>
            </>
          );
        })()}

        <div className="flex items-center gap-5 mt-5 flex-wrap" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#8A8472' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#3D6F4A', fontSize: '14px' }}>●</span> supported
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#B6512A', fontSize: '14px' }}>◐</span> partial
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#D8D0BD', fontSize: '14px' }}>○</span> not supported
          </span>
        </div>
      </section>

      {/* ── §9 · CTA ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
        <div
          style={{
            background: '#15140F',
            color: '#E8E4D8',
            padding: 'clamp(40px, 5vw, 64px) clamp(28px, 4vw, 56px)',
            border: '1px solid #15140F',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#B6512A',
                  marginBottom: '14px',
                }}
              >
                § 9 — RUN AN AUDIT
              </p>
              <h2
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: 'clamp(32px, 3.4vw, 48px)',
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.05,
                  color: '#E8E4D8',
                  marginBottom: '18px',
                }}
              >
                Run a fraud-graph audit on{' '}
                <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif, serif)', color: '#B6512A' }}>
                  your own data
                </span>
                .
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontSize: 'clamp(16px, 1.2vw, 18px)',
                  lineHeight: 1.55,
                  color: '#B8B2A0',
                  maxWidth: '560px',
                  margin: 0,
                }}
              >
                Send us a CSV of your last 5,000&ndash;50,000 orders. We&rsquo;ll return a fraud-resolution report — linked identities, refund-abuse clusters, risk scores, and evidence packets. About ten minutes upload to report.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div
                style={{
                  background: '#1A1814',
                  border: '1px solid #2B2922',
                  padding: '22px',
                }}
              >
                <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: '#8A8472', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '14px' }}>
                  Join the founding merchant cohort — no card required, no commitment
                </p>
                <a
                  href="mailto:hello@unauth.app?subject=Unauth%20pilot%20request"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#E8E4D8',
                    color: '#15140F',
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: '15px',
                    fontWeight: 500,
                    padding: '14px 18px',
                    border: '1px solid #E8E4D8',
                    textDecoration: 'none',
                    marginBottom: '12px',
                  }}
                  className="hover:bg-white"
                >
                  Request access
                  <span aria-hidden style={{ fontFamily: 'var(--font-dm-mono, monospace)' }}>→</span>
                </a>
                <a
                  href="mailto:hello@unauth.app"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    color: '#E8E4D8',
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: '15px',
                    fontWeight: 500,
                    padding: '14px 18px',
                    border: '1px solid #2B2922',
                    textDecoration: 'none',
                  }}
                  className="hover:bg-[#2B2922]"
                >
                  Email us first
                  <span aria-hidden style={{ fontFamily: 'var(--font-dm-mono, monospace)' }}>→</span>
                </a>
                <p
                  style={{
                    fontFamily: 'var(--font-serif, serif)',
                    fontStyle: 'italic',
                    fontSize: '12.5px',
                    color: '#8A8472',
                    lineHeight: 1.5,
                    marginTop: '14px',
                    marginBottom: 0,
                  }}
                >
                  hello@unauth.app — response inside two business hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── § NOTES ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-12 md:pt-16 pb-10">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '32px' }} />

        <p
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#7B2D26',
            marginBottom: '24px',
          }}
        >
          § NOTES &amp; SOURCES
        </p>

        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontFamily: 'var(--font-serif, serif)',
            fontSize: '14px',
            color: '#4A4640',
            lineHeight: 1.65,
          }}
        >
          {[
            [1, 'The case file shown is a synthetic example constructed to illustrate how Unauth presents a resolved identity cluster. It does not represent a real buyer or real merchant. The cluster ID format and all signal patterns are representative of live engine output.'],
            [2, 'INR = Item Not Received. The most common chargeback reason code abused at scale in DTC ecommerce.'],
            [3, 'Visa, Friendly Fraud Annual Index, 2024. Includes refund abuse and INR fraud across all card types.'],
            [4, 'Industry estimates sourced from Visa and Mastercard published fraud data. Unauth network figures will be published once the founding merchant cohort is live.'],
            [5, 'Mastercard Merchant Survey, 2024. True cost includes fulfilment, reversed acquisition spend, and dispute fees.'],
            [6, 'Hashing is performed client-side using a per-merchant salt that Unauth never sees. The hashed values are queried against the network; raw PII never leaves the merchant’s browser.'],
            [7, 'The case studies in §5 are synthetic examples illustrating engine output format. They do not represent any real merchant, integration, or outcome.'],
          ].map(([n, text]) => (
            <li
              key={n}
              id={`note-${n}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.8rem 1fr',
                gap: '0 8px',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '13px',
                  color: '#7B2D26',
                  paddingTop: '2px',
                }}
              >
                {n}
              </span>
              <span>{text as string}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-[1400px] px-6 md:px-10 py-8">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '24px' }} />
        <div
          className="flex flex-col md:flex-row md:justify-between gap-4"
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '12px',
            color: '#4A4640',
          }}
        >
          <span>
            Unauth ·{' '}
            <a href="/legal/privacy" style={{ color: '#4A4640' }} className="hover:underline">privacy</a>
            {' · '}
            <a href="/legal/dpa" style={{ color: '#4A4640' }} className="hover:underline">DPA</a>
            {' · '}
            <a href="/legal/data-handling" style={{ color: '#4A4640' }} className="hover:underline">data handling</a>
          </span>
          <a
            href="mailto:hello@unauth.app"
            style={{ color: '#4A4640' }}
            className="hover:underline"
          >
            hello@unauth.app
          </a>
          <span>
            © 2026 — Issue 04 ·{' '}
            <span style={{ fontFamily: 'var(--font-dm-mono, monospace)' }}>{todayISO}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
