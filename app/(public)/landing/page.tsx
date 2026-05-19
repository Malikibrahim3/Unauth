import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { DotPattern } from '@/components/ui/dot-pattern';
import { Spotlight } from '@/components/ui/spotlight';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { Meteors } from '@/components/ui/meteors';
import { BorderBeam } from '@/components/ui/border-beam';
import { Lock, EyeOff, FileText, Scale } from 'lucide-react';
import type { CSSProperties } from 'react';
import NetworkChart from './_components/NetworkChart';
import Reveal from './_components/Reveal';
import Counter from './_components/Counter';
import AnimatedBar from './_components/AnimatedBar';
import TypedText from './_components/TypedText';
import ParallaxController from './_components/ParallaxController';
import AuditForm from './AuditForm';

export const metadata = {
  title: 'Unauth — Fraud Intelligence for Ecommerce',
  description:
    'Find repeat refund abuse and INR rings hiding across stores. Upload a CSV and get a free fraud graph audit.',
};

export default function LandingPage() {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const heroSubjectFields = [
    {
      label: 'emails',
      rows: [
        ['noah.k*****@protonmail.com', 'primary · 4 merchants'],
        ['n.ke*****@protonmail.com', '2 merchants'],
        ['noah_k*****@gmail.com', '1 merchant'],
        ['n.k*****@gmail.com', '1 merchant · low confidence'],
      ],
    },
    {
      label: 'addresses',
      rows: [
        ['4421 Larkspur Ln, Apt 3B, P*****', 'primary'],
        ['4421 Larspur Lane Apt 3B, P*****', 'misspelt · conf 0.98'],
        ['4421 Larkspur Ln #3B, P*****', 'normalised match'],
      ],
    },
    {
      label: 'payment',
      rows: [
        ['Chase Sapphire Reserve •••• 4419', 'primary'],
      ],
    },
    {
      label: 'devices',
      rows: [
        ['dev_hmac_71c2a8****', 'iPhone · Safari 17'],
        ['dev_hmac_9f3b12****', 'iPhone · Chrome 124'],
      ],
    },
    {
      label: 'phone',
      rows: [
        ['+44 7*** ***1184', 'primary'],
        ['+44 7*** ***2209', 'variant · 2 merchants'],
      ],
    },
    {
      label: 'ip / geo',
      rows: [
        ['82.***.***.114', 'LDN · AS15169'],
        ['81.***.***.203', 'MAN · AS15169'],
        ['91.***.***.77', 'LDN · AS15169'],
      ],
    },
    {
      label: 'browser',
      rows: [
        ['Safari 17 · iPhone', 'primary'],
        ['Chrome 124 · iPhone', 'observed once'],
      ],
    },
    {
      label: 'delivery',
      rows: [
        ['DPD · photo proof requested x3', ''],
        ['Royal Mail · no proof · 1 dispute'],
      ],
    },
  ];
  const heroSubjectRowDelay = (rowIndex: number) => `${220 + rowIndex * 58}ms`;
  const heroSubjectRowCount = heroSubjectFields.reduce((count, field) => count + field.rows.length, 0);
  const heroMatchedDelay = 220 + heroSubjectRowCount * 58 + 180;
  const heroNetworkDelay = heroMatchedDelay + 170;
  const heroActionDelay = heroNetworkDelay + 5 * 60 + 180;
  const heroFooterDelay = heroActionDelay + 160;

  return (
    <div
      className="ua-landing-shell"
      style={{
        background: '#F8F5EE',
        color: '#1A1814',
        minHeight: '100vh',
      }}
    >
      <ParallaxController />
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
          <div className="flex items-center gap-4">
            <a
              href="/login"
              style={{ color: '#4A4640', fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '15.5px' }}
              className="hover:underline"
            >
              Sign in
            </a>
            <a
              href="#audit"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '12px',
                fontWeight: 500,
                color: '#F8F5EE',
                background: '#7B2D26',
                padding: '6px 12px',
                border: '1px solid #7B2D26',
                textDecoration: 'none',
              }}
              className="md:hidden hover:bg-[#5E2018]"
            >
              Audit →
            </a>
            <a
              href="#audit"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '13px',
                fontWeight: 500,
                color: '#F8F5EE',
                background: '#7B2D26',
                padding: '7px 14px',
                border: '1px solid #7B2D26',
                textDecoration: 'none',
              }}
              className="hidden md:inline-flex hover:bg-[#5E2018]"
            >
              Run free audit →
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="ua-hero-canvas ua-parallax-field mx-auto max-w-[1400px] px-6 md:px-10 pt-6 md:pt-8 pb-0" data-ua-parallax-depth="34">
        {/* DotPattern — precision grid atmosphere, masked to top-right quadrant */}
        <DotPattern
          width={32} height={32} cx={1} cy={1} cr={1.1}
          className="text-[#7B2D26] opacity-[0.13] [mask-image:radial-gradient(ellipse_68%_60%_at_72%_28%,white,transparent)]"
        />
        {/* Single-hue burgundy spotlight — replaces the old rainbow conic blob */}
        <Spotlight fill="rgba(123,45,38,0.18)" className="-z-10" />

        {/* Side-by-side grid at lg+ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

        {/* Left — copy block */}
        <Reveal delay={40} className="lg:col-span-5 lg:pt-6">
          {/* Eyebrow */}
          <p
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#4A4640',
              marginBottom: '6px',
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

          {/* Headline — tighter for narrower column */}
          <h1
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 'clamp(32px, 3.6vw, 54px)',
              fontWeight: 500,
              letterSpacing: '-0.030em',
              lineHeight: 1.05,
              color: '#1A1814',
              marginBottom: '16px',
              maxWidth: '22ch',
            }}
          >
            Find repeat abusers before they{' '}
            <span style={{ color: '#7B2D26', fontStyle: 'italic', fontFamily: 'var(--font-serif, serif)', fontWeight: 400, whiteSpace: 'nowrap' }}>
              strike again.
            </span>
          </h1>

          {/* Sub-prose */}
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(15px, 1.15vw, 18px)',
              color: '#4A4640',
              lineHeight: 1.55,
              marginBottom: '20px',
              maxWidth: '44ch',
            }}
          >
            Upload orders. Unauth links refund abuse, INR claims, and friendly-fraud patterns across stores.{' '}
            <span style={{ color: '#1A1814', fontWeight: 500, fontStyle: 'normal' }}>Free audit. No account. Results emailed.</span>
          </p>

          {/* CTA row */}
          <div className="flex items-center flex-wrap gap-3">
            <a
              href="#audit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#7B2D26',
                color: '#F8F5EE',
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '14px',
                fontWeight: 500,
                padding: '11px 20px',
                border: '1px solid #7B2D26',
                borderRadius: 0,
                textDecoration: 'none',
                boxShadow: '0 1px 0 #7B2D26, 0 8px 24px -12px rgba(123,45,38,0.4)',
                transition: 'background 160ms ease',
              }}
              className="hover:bg-[#5E2018]"
            >
              Run free audit
              <span aria-hidden style={{ fontFamily: 'var(--font-dm-mono, monospace)' }}>→</span>
            </a>
            <a
              href="#how-it-works"
              style={{
                marginLeft: 16,
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 14,
                color: '#4A4640',
                textDecoration: 'none',
              }}
            >
              See how it works →
            </a>
          </div>
        </Reveal>

        {/* Right — large product artifact */}
        <Reveal as="div" className="ua-hero-stage relative mt-10 md:mt-14 lg:mt-0 lg:col-span-7" delay={180} noFade>
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
                Case file · example output
              </span>
              <span>Cluster #u_kessler.07</span>
            </div>

            <div
              className="ua-hover-glow ua-case-card ua-premium-surface ua-parallax-layer"
              data-ua-parallax-depth="-12"
              style={{
                background: 'rgba(253, 251, 246, 0.96)',
                border: '1px solid rgba(123,45,38,0.15)',
                borderRadius: 0,
                boxShadow:
                  '0 1px 0 rgba(123,45,38,0.10), 0 4px 12px -4px rgba(123,45,38,0.08), 0 28px 68px -24px rgba(26,24,20,0.18), 0 62px 130px -54px rgba(123,45,38,0.14)',
                position: 'relative',
                backdropFilter: 'saturate(138%) blur(18px)',
                WebkitBackdropFilter: 'saturate(138%) blur(18px)',
              }}
            >
              {/* Header bar with status chips */}
              <div
                style={{
                  padding: '12px 16px',
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
              <div className="grid grid-cols-1 md:grid-cols-[1.18fr_0.82fr]">
                {/* Subject column */}
                <div style={{ padding: '16px 18px', borderRight: '1px solid #D8D0BD' }}>
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
                    className="ua-case-step"
                    style={{
                      fontFamily: 'var(--font-serif, serif)',
                      fontSize: '20px',
                      color: '#1A1814',
                      marginBottom: '6px',
                      lineHeight: 1.3,
                      ['--ua-case-delay' as string]: '120ms',
                      ['--ua-case-duration' as string]: '220ms',
                      ['--ua-case-steps' as string]: 14,
                      ['--ua-type-delay' as string]: '120ms',
                      ['--ua-type-duration' as string]: '260ms',
                      ['--ua-type-steps' as string]: 14,
                      ['--ua-type-width' as string]: '14ch',
                    } as CSSProperties}
                  >
                    <TypedText text="Noah K████" delay={120} speed={18} />
                    <sup>
                      <a href="#note-1" style={{ color: '#7B2D26', textDecoration: 'none' }}>1</a>
                    </sup>
                  </p>
                  <p
                    className="ua-case-step"
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '13px',
                      color: '#7B2D26',
                      letterSpacing: '0.02em',
                      marginBottom: '6px',
                      ['--ua-case-delay' as string]: '180ms',
                      ['--ua-case-duration' as string]: '180ms',
                      ['--ua-case-steps' as string]: 12,
                      ['--ua-type-delay' as string]: '220ms',
                      ['--ua-type-duration' as string]: '220ms',
                      ['--ua-type-steps' as string]: 13,
                      ['--ua-type-width' as string]: '14ch',
                    } as CSSProperties}
                  >
                    <TypedText text="→ #u_kessler.07" delay={260} speed={14} />
                  </p>
                  <p
                    className="ua-case-step"
                    style={{
                      fontFamily: 'var(--font-serif, serif)',
                      fontSize: '12px',
                      fontStyle: 'italic',
                      color: '#8A8472',
                      lineHeight: 1.45,
                      margin: '0 0 14px 0',
                      ['--ua-case-delay' as string]: '220ms',
                      ['--ua-case-duration' as string]: '300ms',
                      ['--ua-case-steps' as string]: 42,
                      ['--ua-type-delay' as string]: '340ms',
                      ['--ua-type-duration' as string]: '520ms',
                      ['--ua-type-steps' as string]: 58,
                      ['--ua-type-width' as string]: '58ch',
                    } as CSSProperties}
                  >
                    <TypedText text="Peer merchants anonymized · raw identifiers shown as hashes." delay={420} speed={9} />
                  </p>

                  {/* Identity fragment grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px 16px',
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '11px',
                      color: '#4A4640',
                    }}
                  >
                    {heroSubjectFields.map((field) => {
                      const previousRowCount = heroSubjectFields
                        .slice(0, heroSubjectFields.findIndex((item) => item.label === field.label))
                        .reduce((count, item) => count + item.rows.length, 0);

                      return (
                      <div key={field.label}>
                        <span
                          className="ua-case-step"
                          style={{
                            color: '#8A8472',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            fontSize: '10px',
                            display: 'block',
                            marginBottom: '4px',
                            ['--ua-case-delay' as string]: heroSubjectRowDelay(previousRowCount),
                            ['--ua-case-duration' as string]: '90ms',
                            ['--ua-case-steps' as string]: 8,
                            ['--ua-type-delay' as string]: heroSubjectRowDelay(previousRowCount),
                            ['--ua-type-duration' as string]: '120ms',
                            ['--ua-type-steps' as string]: 9,
                            ['--ua-type-width' as string]: '10ch',
                          } as CSSProperties}
                        >
                          <TypedText text={field.label} delay={220 + previousRowCount * 58} speed={12} />
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {field.rows.map(([value, note], rowIndex) => (
                            <div
                              key={`${field.label}-${value}`}
                              className="ua-case-step"
                              style={{
                                display: 'grid',
                                gridTemplateColumns: note ? 'minmax(0, 1fr) auto' : '1fr',
                                gap: '8px',
                                alignItems: 'baseline',
                                ['--ua-case-delay' as string]: heroSubjectRowDelay(previousRowCount + rowIndex),
                                ['--ua-case-duration' as string]: `${Math.min(360, Math.max(160, value.length * 10))}ms`,
                                ['--ua-case-steps' as string]: Math.min(34, Math.max(12, value.length)),
                              } as CSSProperties}
                            >
                              <TypedText
                                text={value}
                                delay={220 + (previousRowCount + rowIndex) * 58}
                                speed={12}
                                style={{
                                  color: '#1A1814',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              />
                              {note ? (
                                <TypedText
                                  text={note}
                                  delay={350 + (previousRowCount + rowIndex) * 58}
                                  speed={13}
                                  style={{
                                    color: '#8A8472',
                                    fontSize: '10px',
                                    textAlign: 'right',
                                    whiteSpace: 'nowrap',
                                  }}
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Risk score column */}
                <div style={{ padding: '16px 18px' }}>
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
                    SIGNALS FIRED — 8 / 12
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {[
                      { l: 'refund_rate_over_60pct', v: 0.92, on: true },
                      { l: 'cross_merchant_inr_pattern', v: 0.88, on: true },
                      { l: 'shipping_address_variant', v: 0.74, on: true },
                      { l: 'denial_then_chargeback', v: 0.68, on: true },
                      { l: 'payment_fingerprint_match', v: 0.64, on: true },
                      { l: 'address_normalization_match', v: 0.58, on: true },
                      { l: 'device_reuse_observed', v: 0.51, on: true },
                      { l: 'velocity_burst_24h', v: 0.21, on: false },
                    ].map(({ l, v, on }, i) => (
                      <div key={l} className="ua-case-row-hover" style={{ display: 'grid', gridTemplateColumns: '1fr 36px', gap: '10px', alignItems: 'center', padding: '4px 2px', borderTop: i > 0 ? '1px solid rgba(123,45,38,0.07)' : 'none', transition: 'background 140ms ease', margin: '0 -2px' }}>
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
                            <TypedText
                              text={l}
                              delay={260 + i * 58}
                              speed={10}
                              style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: on ? '#1A1814' : '#8A8472' }}
                            />
                          </div>
                          <AnimatedBar
                            className="ua-case-signal-bar"
                            value={v}
                            color={on ? '#7B2D26' : '#B8B2A0'}
                            track="#ECE5D4"
                            height={3}
                            delay={520 + i * 130}
                            duration={1050}
                            transitionWidth
                            waitForVisibility
                          />
                        </div>
                        <span
                          className="ua-case-score"
                          style={{
                            fontFamily: 'var(--font-dm-mono, monospace)',
                            fontSize: '10.5px',
                            color: on ? '#1A1814' : '#8A8472',
                            fontVariantNumeric: 'tabular-nums',
                            textAlign: 'right',
                            ['--ua-case-score-delay' as string]: `${1500 + i * 130}ms`,
                          } as CSSProperties}
                        >
                          <TypedText text={v.toFixed(2)} delay={1500 + i * 130} speed={28} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tracked datapoints */}
              <div style={{ borderTop: '1px solid #D8D0BD', padding: '14px 18px' }}>
                <p
                  className="ua-case-step"
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '11px',
                    letterSpacing: '0.06em',
                    color: '#4A4640',
                    margin: 0,
                    lineHeight: 1.6,
                    ['--ua-case-delay' as string]: `${heroMatchedDelay}ms`,
                    ['--ua-case-duration' as string]: '520ms',
                    ['--ua-case-steps' as string]: 58,
                    ['--ua-type-delay' as string]: `${heroMatchedDelay}ms`,
                    ['--ua-type-duration' as string]: '760ms',
                    ['--ua-type-steps' as string]: 72,
                    ['--ua-type-width' as string]: '92ch',
                  } as CSSProperties}
                >
                  <TypedText text="MATCHED · email · phone · address · card · ip · device · browser · asn · INR · 13.1" delay={heroMatchedDelay} speed={10} />
                </p>
              </div>

              {/* Network footprint */}
              <div style={{ borderTop: '1px solid #D8D0BD', padding: '18px 22px', background: '#F8F5EE' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '12px',
                    flexWrap: 'wrap',
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
                    7 merchants · aggregate only · 11 orders
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
                    { m: 'your_store',  o: '3 ord · 2 ref',  v: '$340',   r: 0.55 },
                    { m: 'merchant_04', o: '3 ord · 2 INR',  v: '$1,210', r: 0.92, note: true },
                    { m: 'merchant_02', o: '2 ord · 2 INR',  v: '$613',   r: 0.80 },
                    { m: 'merchant_03', o: '2 ord · 1 INR',  v: '$890',   r: 0.71 },
                  ].map((row, i) => (
                    <div
                      key={row.m}
                      className="ua-case-step ua-case-row-hover"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) 60px auto',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '4px 0',
                        margin: '0 -4px',
                        paddingLeft: '4px',
                        paddingRight: '4px',
                        borderTop: i > 0 ? '1px solid rgba(123,45,38,0.08)' : 'none',
                        transition: 'background 140ms ease',
                        ['--ua-case-delay' as string]: `${heroNetworkDelay + i * 60}ms`,
                        ['--ua-case-duration' as string]: '260ms',
                        ['--ua-case-steps' as string]: 24,
                        ['--ua-type-delay' as string]: `${heroNetworkDelay + i * 80}ms`,
                        ['--ua-type-duration' as string]: '420ms',
                        ['--ua-type-steps' as string]: 34,
                        ['--ua-type-width' as string]: '62ch',
                      } as CSSProperties}
                    >
                      <TypedText
                        text={row.note ? `${row.m}²` : row.m}
                        delay={heroNetworkDelay + i * 80}
                        speed={12}
                        style={{ color: '#1A1814', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      />
                      <TypedText text={row.o} delay={heroNetworkDelay + i * 80 + 120} speed={13} style={{ color: '#4A4640' }} />
                      <AnimatedBar
                        value={row.r}
                        color={row.r > 0.7 ? '#7B2D26' : row.r > 0.5 ? '#B6512A' : '#8A8472'}
                        track="#ECE5D4"
                        height={3}
                        delay={500 + i * 70}
                      />
                      <TypedText text={row.v} delay={heroNetworkDelay + i * 80 + 220} speed={20} style={{ color: '#1A1814', fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: '46px' }} />
                    </div>
                  ))}
                  <p style={{ color: '#8A8472', fontSize: '11px', marginTop: '8px' }}>
                    + 3 more merchants withheld
                  </p>
                </div>
              </div>

              {/* Recommended action */}
              <div
                className="ua-case-step"
                style={{
                  borderTop: '1px solid #D8D0BD',
                  padding: '14px 22px',
                  background: 'linear-gradient(90deg, #F8F0EE 0%, #F4E8E5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  ['--ua-case-delay' as string]: `${heroActionDelay}ms`,
                  ['--ua-case-duration' as string]: '320ms',
                  ['--ua-case-steps' as string]: 36,
                  ['--ua-type-delay' as string]: `${heroActionDelay}ms`,
                  ['--ua-type-duration' as string]: '620ms',
                  ['--ua-type-steps' as string]: 64,
                  ['--ua-type-width' as string]: '92ch',
                } as CSSProperties}
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
                  <TypedText text="▸ DECLINE NEXT ORDER · ASSEMBLE CASE FILE FOR 2 OPEN DISPUTES" delay={heroActionDelay} speed={10} />
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
                  <TypedText text="packet.pdf · 2.4mb" delay={heroActionDelay + 460} speed={14} />
                </span>
              </div>

              {/* Footer meta */}
              <div
                className="ua-case-step"
                style={{
                  borderTop: '1px solid #D8D0BD',
                  padding: '10px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  ['--ua-case-delay' as string]: `${heroFooterDelay}ms`,
                  ['--ua-case-duration' as string]: '280ms',
                  ['--ua-case-steps' as string]: 36,
                  ['--ua-type-delay' as string]: `${heroFooterDelay}ms`,
                  ['--ua-type-duration' as string]: '520ms',
                  ['--ua-type-steps' as string]: 62,
                  ['--ua-type-width' as string]: '96ch',
                } as CSSProperties}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '10.5px',
                    color: '#8A8472',
                    letterSpacing: '0.02em',
                    margin: 0,
                  }}
                >
                  <TypedText text="generated 2026-05-15 09:42 EST · pipeline latency 38ms" delay={heroFooterDelay} speed={10} />
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '10.5px',
                    color: '#8A8472',
                    margin: 0,
                  }}
                >
                  <TypedText text="HMAC-SHA256 · per-tenant salt" delay={heroFooterDelay + 360} speed={12} />
                </p>
              </div>
            </div>

            {/* Tiny meta row under card */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#8A8472', letterSpacing: '0.04em' }}>
              <span>sample cluster · 11 orders analysed</span>
              <span style={{ color: '#D8D0BD' }}>·</span>
              <span>pipeline latency: 38ms</span>
              <span style={{ color: '#D8D0BD' }}>·</span>
              <span>Case file ready in browser</span>
            </div>

            {/* Proof chips — below artifact */}
            <div className="flex flex-wrap gap-2 mt-5">
              {[
                'No checkout integration',
                'CSV audit · ~20 min',
                'Client-side HMAC hashing',
                'Evidence-ready output',
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

        </div>{/* end lg:grid */}
      </section>

      {/* ── Founding merchant cohort logo bar ───────────────────── */}
      <section
        style={{
          borderTop: '1px solid rgba(123,45,38,0.12)',
          borderBottom: '1px solid rgba(123,45,38,0.12)',
          padding: '20px 0',
        }}
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <p
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '9.5px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#8A8472',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            Founding merchant cohort
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(24px, 4vw, 56px)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '17px', color: '#8A8472', letterSpacing: '-0.01em' }}>Kessler</span>
            <span style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '17px', color: '#8A8472', letterSpacing: '-0.01em' }}>Midform</span>
            <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '13px', color: '#8A8472', letterSpacing: '0.18em', textTransform: 'uppercase' }}>NORTHRUN</span>
            <span style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '17px', color: '#8A8472', fontStyle: 'italic', letterSpacing: '-0.01em' }}>Prime &amp; Co</span>
            <span style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '17px', color: '#8A8472', letterSpacing: '-0.01em' }}>Oakshelf</span>
            <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '13px', color: '#8A8472', letterSpacing: '0.18em', textTransform: 'uppercase' }}>BRIDLEWORKS</span>
          </div>
        </div>
      </section>

      {/* ── §1 · The pattern your store can't see — VISUAL ───────── */}
      <section className="ua-section-prism ua-parallax-field mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" data-ua-parallax-depth="28">

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
              § 1 — WHY IT MATTERS
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
              <span style={{ color: '#7B2D26' }}>Seven stores.</span>{' '}
              One pattern.
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
              Alone, every order looks normal. Across the network, the same card, address variants, and INR pattern resolve into one identity.
            </p>

            {/* Three stats inline */}
            <div className="grid grid-cols-3 gap-6 mt-7 pt-6" style={{ borderTop: '1px solid rgba(123,45,38,0.12)' }}>
              {[
                { v: 89,  prefix: '$', suffix: 'B', dec: 0, l: 'Lost annually to refund / INR fraud', n: 3 },
                { v: 20,  prefix: '',  suffix: '%', dec: 0, l: 'Of DTC refund claims tied to repeat abusers', n: 4 },
                { v: 2.7, prefix: '',  suffix: '×', dec: 1, l: 'True cost of a lost chargeback', n: 5 },
              ].map((s, i) => (
                <Reveal key={s.l} delay={120 + i * 80}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: 'clamp(40px, 4.2vw, 72px)',
                      fontWeight: 500,
                      color: '#1A1814',
                      lineHeight: 1,
                      marginBottom: '8px',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    <Counter value={s.v} prefix={s.prefix} suffix={s.suffix} decimals={s.dec} duration={1100} format="plain" />
                    <sup style={{ fontSize: '0.28em', letterSpacing: 0 }}>
                      <a href={`#note-${s.n}`} style={{ color: '#7B2D26', textDecoration: 'none' }}>{s.n}</a>
                    </sup>
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10px',
                      color: '#8A8472',
                      lineHeight: 1.4,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {s.l}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Right: force-graph visualization — same buyer across 7 stores */}
          <Reveal className="lg:col-span-7" delay={140}>
            <div
              style={{
                background: '#FDFBF6',
                border: '1px solid #D8D0BD',
                padding: '20px 22px',
              }}
            >
              {/* Header row */}
              <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A8472', margin: 0 }}>
                  ONE BUYER · 7 IDENTITIES
                </p>
                <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: '#8A8472', margin: 0 }}>
                  → #u_kessler.07
                </p>
              </div>

              {/* Force-style graph SVG */}
              <svg
                viewBox="0 0 560 380"
                style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 340 }}
                aria-label="Identity graph: one buyer across 7 merchants"
                role="img"
              >
                {/* Satellite nodes arranged in a circle of radius 140 around center 280,200 */}
                {(() => {
                  const cx = 280, cy = 200, r = 140;
                  const merchants = [
                    { name: 'your_store',   strong: true  },
                    { name: 'merchant_04',  strong: true  },
                    { name: 'merchant_02',  strong: true  },
                    { name: 'merchant_07',  strong: true  },
                    { name: 'merchant_03',  strong: false },
                    { name: 'merchant_09',  strong: false },
                    { name: 'merchant_05',  strong: false },
                  ];
                  const nodes = merchants.map((m, i) => {
                    const angle = (2 * Math.PI * i) / merchants.length - Math.PI / 2;
                    return { ...m, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
                  });
                  return (
                    <g>
                      {/* Connection lines */}
                      {nodes.map((node) => (
                        <line
                          key={`line-${node.name}`}
                          x1={cx} y1={cy}
                          x2={node.x} y2={node.y}
                          stroke={node.strong ? 'rgba(123,45,38,0.55)' : 'rgba(123,45,38,0.22)'}
                          strokeWidth="1"
                          strokeDasharray={node.strong ? undefined : '4 4'}
                        />
                      ))}
                      {/* Central node */}
                      <circle cx={cx} cy={cy} r={28} fill="none" stroke="rgba(123,45,38,0.18)" strokeWidth="1" />
                      <circle cx={cx} cy={cy} r={16} fill="#7B2D26" />
                      <text x={cx} y={cy + 34} textAnchor="middle" fill="#4A4640" fontFamily="var(--font-dm-mono, monospace)" fontSize="9.5" letterSpacing="0.04em">#u_kessler.07</text>
                      {/* Satellite nodes */}
                      {nodes.map((node) => (
                        <g key={`node-${node.name}`}>
                          <circle cx={node.x} cy={node.y} r={10} fill="#F8F5EE" stroke="#7B2D26" strokeWidth="1" />
                          <text
                            x={node.x}
                            y={node.y + (node.y > cy ? 22 : -14)}
                            textAnchor="middle"
                            fill="#8A8472"
                            fontFamily="var(--font-dm-mono, monospace)"
                            fontSize="8.5"
                            letterSpacing="0.02em"
                          >
                            {node.name.replace('merchant_', 'm_')}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>

              {/* Legend */}
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ECE5D4', display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: '#8A8472', letterSpacing: '0.04em' }}>
                <span>── card: ••4419</span>
                <span>── addr_hash_91c2</span>
                <span>·· INR pattern x3</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── §1.5 · Founding merchant testimonial ────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-20">
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#7B2D26',
              marginBottom: '24px',
            }}
          >
            § 1.5 — A FOUNDING MERCHANT
          </p>
          <blockquote
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(22px, 2vw, 30px)',
              lineHeight: 1.35,
              color: '#1A1814',
              margin: '0 0 28px 0',
            }}
          >
            &ldquo;We were chasing the same refund abuser across three of our stores without knowing. Unauth surfaced him in the second cluster we ran — and the next chargeback came back with a ready-made evidence packet attached.&rdquo;
          </blockquote>
          <p
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: '#4A4640',
              marginBottom: '6px',
            }}
          >
            Daniel Merwick · Head of Trust &amp; Safety · Kessler
          </p>
          <p
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#8A8472',
            }}
          >
            Founding merchant · joined Feb 2026
          </p>
        </div>
      </section>

      {/* ── §2 · Network observation (dark inversion) ───────────── */}
      <section
        id="network"
        style={{ background: '#15140F', color: '#E8E4D8', scrollMarginTop: '72px' }}
        className="ua-network-canvas ua-parallax-field py-16 md:py-24"
        data-ua-parallax-depth="32"
      >
        {/* AnimatedGridPattern — cells lighting up reads as fraud detection in action */}
        <AnimatedGridPattern
          width={80} height={80}
          numSquares={12}
          maxOpacity={0.04}
          duration={7}
          strokeWidth={0.3}
          className="text-[#B85C4A] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,white,transparent)]"
        />
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
                See the pattern your store cannot see alone.
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
                founding merchant cohort · k-anonymity gated · raw identities protected
              </p>
            </div>
            <div style={{ display: 'flex', gap: '24px', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#B8B2A0' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 8, height: 8, background: '#7B2D26', borderRadius: '50%', display: 'inline-block' }} />
                AUDIT PIPELINE · 38ms p95
              </span>
              <span>v3.2.1</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px" style={{ marginBottom: '0', background: '#2B2922', border: '1px solid #2B2922' }}>
            {/* Chart spans 8 */}
            <Reveal noFade className="lg:col-span-8 ua-chart-draw ua-parallax-layer" data-ua-parallax-depth="-8" style={{ background: '#15140F', padding: '24px 24px 16px' }} threshold={0.25}>
              <NetworkChart />
            </Reveal>

            {/* Metrics column 4 — single hero metric + security strip */}
            <div className="lg:col-span-4" style={{ background: '#15140F', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Reveal delay={120} style={{ padding: '32px 24px 24px', flex: 1 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: 'clamp(80px, 8vw, 120px)',
                    fontWeight: 500,
                    color: '#E8E4D8',
                    lineHeight: 1,
                    letterSpacing: '-0.04em',
                    margin: '0 0 12px 0',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  38ms
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#B8B2A0',
                    margin: '0 0 8px 0',
                  }}
                >
                  MEDIAN PER-ORDER RESOLUTION · P95
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-serif, serif)',
                    fontSize: '13px',
                    fontStyle: 'italic',
                    color: '#B8B2A0',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  From CSV row to scored cluster.
                </p>
              </Reveal>
              {/* Security strip */}
              <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  padding: '14px 24px',
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '10.5px',
                  letterSpacing: '0.04em',
                  color: '#B8B2A0',
                  lineHeight: 1.6,
                }}
              >
                SHA-256 hashing · per-tenant salt · PII never leaves browser · k ≥ 3 cluster gate
              </div>
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
            Cross-merchant signals surface only when the evidence is strong enough to act on.
          </p>
        </div>
      </section>

      {/* ── §2.5 · Pipeline demo ────────────────────────────────── */}
      <section className="ua-section-prism mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
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
            § 2.5 — THE PIPELINE IN MOTION
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 'clamp(28px, 2.8vw, 40px)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: '#1A1814',
            }}
          >
            From CSV to case file in{' '}
            <span style={{ color: '#7B2D26', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>38ms</span>
          </h2>
        </div>

        {/* Three cards */}
        <div className="flex flex-col md:flex-row gap-0 md:gap-0 items-stretch" style={{ border: '1px solid #D8D0BD' }}>

          {/* Card 1 — UPLOAD */}
          <div style={{ flex: 1, padding: '18px 20px', background: '#FDFBF6', borderRight: '1px solid #D8D0BD', minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8472', marginBottom: '14px' }}>
              1 · UPLOAD
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#4A4640', fontVariantNumeric: 'tabular-nums', borderCollapse: 'collapse', width: '100%', minWidth: 340 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ECE5D4' }}>
                    {['order_id', 'email_hmac', 'addr_hash', 'card_last4', 'total'].map((h) => (
                      <th key={h} style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A8472', padding: '0 8px 6px 0', textAlign: 'left', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['8723941', 'abc…d3', '91c2', '4419', '$112.00'],
                    ['8723995', 'abc…d3', '91c2', '4419', '$89.00'],
                    ['8724111', 'ef9…22', '91c2', '4419', '$213.00'],
                    ['8724302', '7b1…91', '91c2', '4419', '$76.00'],
                  ].map((row) => (
                    <tr key={row[0]} style={{ borderBottom: '1px solid rgba(123,45,38,0.06)' }}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: '5px 8px 5px 0', color: ci === 0 ? '#1A1814' : '#4A4640' }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#8A8472', marginTop: '10px' }}>orders.csv · 11 rows</p>
          </div>

          {/* Arrow desktop */}
          <div className="hidden md:flex items-center justify-center" style={{ padding: '0 12px', flexShrink: 0, fontSize: '14px', color: '#8A8472', background: '#FDFBF6' }}>→</div>
          {/* Arrow mobile */}
          <div className="md:hidden flex items-center justify-center" style={{ padding: '10px 0', fontSize: '14px', color: '#8A8472', background: '#FDFBF6', borderTop: '1px solid #D8D0BD' }}>↓</div>

          {/* Card 2 — GRAPH */}
          <div style={{ flex: 1, padding: '18px 20px', background: '#FDFBF6', borderRight: '1px solid #D8D0BD', minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8472', marginBottom: '14px' }}>
              2 · GRAPH
            </p>
            <svg viewBox="0 0 320 280" style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 220 }} aria-label="Identity graph small" role="img">
              {(() => {
                const cx = 160, cy = 148, r = 95;
                const mNodes = [
                  { name: 'your_store', strong: true },
                  { name: 'm_04', strong: true },
                  { name: 'm_02', strong: true },
                  { name: 'm_07', strong: true },
                  { name: 'm_03', strong: false },
                  { name: 'm_09', strong: false },
                  { name: 'm_05', strong: false },
                ].map((m, i) => {
                  const angle = (2 * Math.PI * i) / 7 - Math.PI / 2;
                  return { ...m, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
                });
                return (
                  <g>
                    {mNodes.map((n) => (
                      <line key={`l-${n.name}`} x1={cx} y1={cy} x2={n.x} y2={n.y}
                        stroke={n.strong ? 'rgba(123,45,38,0.55)' : 'rgba(123,45,38,0.22)'}
                        strokeWidth="1" strokeDasharray={n.strong ? undefined : '4 4'} />
                    ))}
                    <circle cx={cx} cy={cy} r={20} fill="none" stroke="rgba(123,45,38,0.18)" strokeWidth="1" />
                    <circle cx={cx} cy={cy} r={11} fill="#7B2D26" />
                    {mNodes.map((n) => (
                      <g key={`n-${n.name}`}>
                        <circle cx={n.x} cy={n.y} r={8} fill="#F8F5EE" stroke="#7B2D26" strokeWidth="1" />
                        <text x={n.x} y={n.y + (n.y > cy ? 18 : -11)} textAnchor="middle" fill="#8A8472" fontFamily="var(--font-dm-mono, monospace)" fontSize="7.5">{n.name}</text>
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Arrow desktop */}
          <div className="hidden md:flex items-center justify-center" style={{ padding: '0 12px', flexShrink: 0, fontSize: '14px', color: '#8A8472', background: '#FDFBF6' }}>→</div>
          {/* Arrow mobile */}
          <div className="md:hidden flex items-center justify-center" style={{ padding: '10px 0', fontSize: '14px', color: '#8A8472', background: '#FDFBF6', borderTop: '1px solid #D8D0BD' }}>↓</div>

          {/* Card 3 — CASE FILE */}
          <div style={{ flex: 1, padding: '18px 20px', background: '#FDFBF6', minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8472', marginBottom: '14px' }}>
              3 · CASE FILE
            </p>
            {/* Mini case file */}
            <div style={{ border: '1px solid #D8D0BD', background: '#F8F5EE' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #D8D0BD', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#FFFFFF', background: '#7B2D26', padding: '2px 7px', letterSpacing: '0.06em' }}>DEFINITE</span>
                <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#4A4640', background: '#F2EDE3', border: '1px solid #D8D0BD', padding: '2px 7px' }}>RISK 0.92</span>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '14px', color: '#1A1814', marginBottom: '10px' }}>Noah K████</p>
                {[
                  { l: 'refund_rate_over_60pct', v: 0.92 },
                  { l: 'cross_merchant_inr_pattern', v: 0.88 },
                  { l: 'shipping_address_variant', v: 0.74 },
                ].map((sig) => (
                  <div key={sig.l} style={{ display: 'grid', gridTemplateColumns: '1fr 32px', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#4A4640', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sig.l}</span>
                    <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#1A1814', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{sig.v.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 12px', borderTop: '1px solid #D8D0BD' }}>
                <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#7B2D26', letterSpacing: '0.06em' }}>EVIDENCE PACKET → READY</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── §3 · How it works ───────────────────────────────────── */}
      <section id="how-it-works" style={{ scrollMarginTop: '72px' }} className="ua-section-flow ua-parallax-field mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" data-ua-parallax-depth="24">
        {/* DotPattern offset from hero to read as a distinct texture */}
        <DotPattern
          width={40} height={40} cx={2} cy={2} cr={1}
          className="text-[#7B2D26] opacity-[0.09] [mask-image:radial-gradient(ellipse_80%_70%_at_88%_18%,white,transparent)]"
        />

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
              CSV in. Actionable cases out.
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
              Hash sensitive fields in browser
              <sup>
                <a href="#note-6" style={{ color: '#7B2D26', textDecoration: 'none' }}>6</a>
              </sup>
              . Get scored clusters, signals, and case files back.
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
            no checkout integration
          </div>
        </div>

        {/* 4-step card flow with visual flow indicator */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px"
          style={{
            background: '#D8D0BD',
            border: '1px solid #D8D0BD',
            marginBottom: '40px',
          }}
        >
          {[
            {
              n: '01',
              t: '11ms',
              title: 'Upload',
              body: 'Upload orders, refunds, returns, and deliveries.',
              detail: 'No schema changes. No checkout work.',
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
              body: 'Email, phone, address, and card references are HMAC-SHA256 hashed.',
              detail: 'Raw values stay out of Unauth.',
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
              body: 'Signals resolve against the cross-merchant identity graph.',
              detail: 'Only strong clusters surface.',
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
              body: 'Get risk score, cluster ID, fired signals, and evidence eligibility.',
              detail: 'Ready for review or dispute response.',
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
              className="ua-hover-lift ua-glass-card"
              style={{
                background: 'rgba(253, 251, 246, 0.9)',
                padding: '22px 22px 22px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '244px',
                position: 'relative',
                backdropFilter: 'saturate(126%) blur(10px)',
                WebkitBackdropFilter: 'saturate(126%) blur(10px)',
              }}
            >
              {/* BorderBeam on the first step — marks the entry point */}
              {i === 0 && <BorderBeam duration={14} colorFrom="rgba(123,45,38,0.60)" colorTo="transparent" />}
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
                  paddingBottom: '14px',
                  borderBottom: '2px solid rgba(123,45,38,0.18)',
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
              className="ua-dark-panel ua-parallax-layer"
              data-ua-parallax-depth="-7"
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
                <span style={{ marginLeft: 'auto', color: '#8A8472' }}>200 OK · 38ms</span>
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
<span>{'  '}<span style={{ color: '#8A8472' }}>{'"evidence_packet_eligible"'}</span>: <span style={{ color: '#E8E4D8' }}>true</span></span>{'\n'}
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
              Unauth surfaces the cluster, signals, and evidence. You choose the threshold and keep control of the decision.
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
                { g: 'DEFINITE', r: '0.85 – 1.00', a: 'decline · assemble case file',  c: '#7B2D26' },
                { g: 'PROBABLE', r: '0.65 – 0.84', a: 'hold for manual review',       c: '#B6512A' },
                { g: 'POSSIBLE', r: '0.40 – 0.64', a: 'flag · accept order',          c: '#8A8472' },
                { g: 'WEAK',     r: '0.00 – 0.39', a: 'no action',                    c: '#8A8472' },
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
      <section id="evidence" style={{ scrollMarginTop: '72px' }} className="ua-section-evidence ua-parallax-field mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" data-ua-parallax-depth="30">
        <DotPattern
          width={36} height={36} cx={1} cy={1} cr={1}
          className="text-[#7B2D26] opacity-[0.08] [mask-image:radial-gradient(ellipse_60%_50%_at_80%_20%,white,transparent)]"
        />

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
              Evidence that is ready to use.
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
              Email variants, address matches, payment fingerprint, network footprint, pattern, and recommended action in one case file.
            </p>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '11.5px',
              color: '#8A8472',
              padding: '8px 14px',
              border: '1px solid #D8D0BD',
              letterSpacing: '0.06em',
            }}
          >
            CASE FILE OUTPUT
          </span>
        </div>

        {/* Delivery context chip */}
        <p
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '10.5px',
            color: '#8A8472',
            letterSpacing: '0.04em',
            marginBottom: '16px',
          }}
        >
          delivered to founders@kessler.com · 09:42 EST
        </p>

        <div
          className="ua-glass-card ua-parallax-layer"
          data-ua-parallax-depth="-8"
          style={{
            background: 'rgba(253, 251, 246, 0.91)',
            border: '1px solid #D8D0BD',
            borderRadius: 0,
            boxShadow:
              '0 1px 0 #D8D0BD, 0 22px 54px -26px rgba(26,24,20,0.18), 0 44px 96px -48px rgba(123,45,38,0.12)',
            backdropFilter: 'saturate(132%) blur(12px)',
            WebkitBackdropFilter: 'saturate(132%) blur(12px)',
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
              CASE FILE · UN-2026-04-21-0083
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

              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '12px',
                  color: '#8A8472',
                  lineHeight: 1.6,
                  letterSpacing: '0.02em',
                }}
              >
                email · addr_hash_91c2 · card ••4419 · 3 variants normalized
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
{`your_store             $340.00     3 orders     2 refunds claimed
merchant_04          $1,210.00     3 orders     2 INR filed [2]
merchant_02            $612.50     2 orders     2 INR filed
merchant_06            $284.00     1 order      1 refund claimed
merchant_03            $890.00     2 orders     1 INR filed
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
                Files INR claim within 2.4 days of marked delivery, on average. 6 of 8 most recent orders disputed. First seen in the network on Feb 09, 2026. Most recent activity 4 days ago.
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
                Assemble case file for open disputes
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
      <section className="ua-section-quiet ua-parallax-field mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" data-ua-parallax-depth="22">

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
            What a completed audit{' '}
            <span style={{ color: '#7B2D26' }}>shows.</span>
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
            Linked identities, risk scores, and case-file readiness from anonymized merchant profiles.
            <sup>
              <a href="#note-7" style={{ color: '#7B2D26', textDecoration: 'none' }}>7</a>
            </sup>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: '#D8D0BD', border: '1px solid #D8D0BD' }}>
          {/* Summary card 1 */}
          <Reveal delay={60} style={{ background: '#FDFBF6', padding: '24px 26px' }}>
            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A8472', marginBottom: '14px' }}>
              CLUSTER #u_kessler.07
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 500, color: '#1A1814', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>
                $1,210 recovered
              </span>
              <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#4A4640', background: '#F2EDE3', border: '1px solid #D8D0BD', padding: '3px 9px', letterSpacing: '0.06em' }}>
                RISK 0.92
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
              {['Same card across 4 merchants', 'Address variants normalize', 'INR within 4 days'].map((b) => (
                <p key={b} style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontSize: '13px', color: '#4A4640', margin: 0 }}>{b}</p>
              ))}
            </div>
            <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#7B2D26', letterSpacing: '0.08em' }}>
              EVIDENCE PACKET → READY
            </span>
          </Reveal>

          {/* Summary card 2 */}
          <Reveal delay={140} style={{ background: '#FDFBF6', padding: '24px 26px' }}>
            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A8472', marginBottom: '14px' }}>
              CLUSTER #u_patel.12
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 500, color: '#1A1814', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>
                $890 recovered
              </span>
              <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#4A4640', background: '#F2EDE3', border: '1px solid #D8D0BD', padding: '3px 9px', letterSpacing: '0.06em' }}>
                RISK 0.87
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
              {['3 merchants · same device hash', 'Refund claimed day of delivery', 'Phone variant matched across 2 stores'].map((b) => (
                <p key={b} style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontSize: '13px', color: '#4A4640', margin: 0 }}>{b}</p>
              ))}
            </div>
            <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', color: '#7B2D26', letterSpacing: '0.08em' }}>
              EVIDENCE PACKET → READY
            </span>
          </Reveal>
        </div>
      </section>

      {/* ── §6 · What data we need ──────────────────────────────── */}
      <section className="ua-section-prism ua-parallax-field mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" data-ua-parallax-depth="26">

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
            Use data you already have.
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
            Standard order, refund, return, delivery, and payment exports. No integration required.
          </p>
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-px"
          style={{
            background: '#D8D0BD',
            border: '1px solid #D8D0BD',
          }}
        >
          {/* Required */}
          <div className="lg:col-span-8 ua-glass-card" style={{ background: 'rgba(253, 251, 246, 0.92)', padding: '22px 24px' }}>
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
          <div className="lg:col-span-4 ua-glass-card" style={{ background: 'rgba(253, 251, 246, 0.92)', padding: '22px 24px' }}>
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
        className="ua-network-canvas ua-parallax-field py-16 md:py-24"
        data-ua-parallax-depth="28"
      >
        <AnimatedGridPattern
          width={56} height={56}
          numSquares={16}
          maxOpacity={0.05}
          duration={6}
          className="text-[#B85C4A] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,white,transparent)]"
        />
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
                Sensitive data is hashed in browser.
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
                HMAC-SHA256 · per-tenant salt · k-anonymity gated
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
                body: 'Email, phone, address, and card references are hashed before transmission. Unauth never sees raw values.',
              },
              {
                Icon: EyeOff,
                label: 'K-ANONYMITY GATING',
                body: 'Cross-merchant signals surface only after a cluster clears the network threshold.',
              },
              {
                Icon: FileText,
                label: 'AUDIT LOGGING',
                body: 'Every lookup is logged as a hashed record. No plaintext PII appears in audit logs.',
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
              <div key={label} className="ua-dark-panel" style={{ background: '#15140F', padding: '24px 24px 28px' }}>
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
            ALSO: RBAC · rate limits · chunked bulk CSV processing
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
              SOC 2 audit in progress. Full controls documentation available on request.
          </p>
        </div>
      </section>

      {/* ── §8 · Comparison matrix ──────────────────────────────── */}
      <section className="ua-section-flow ua-parallax-field mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" data-ua-parallax-depth="20">

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
            Checkout tools miss what happens after.
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
            Unauth finds refund abuse, friendly fraud, and INR cycles after the transaction clears.
          </p>
        </div>

        {/* Comparison data */}
        {(() => {
          const rows = [
            { cap: 'Resolves cross-merchant identity',       a: 'no',      b: 'no',      c: 'yes', note: '7+ stores observed per cluster' },
            { cap: 'Catches friendly fraud / INR cycles',    a: 'no',      b: 'partial', c: 'yes', note: 'post-purchase patterns' },
            { cap: 'Surfaces network-known abusers',         a: 'partial', b: 'no',      c: 'yes', note: 'k-anon gated at 3+ merchants' },
            { cap: 'Explainable signals (no black box)',     a: 'yes',     b: 'no',      c: 'yes', note: 'every flag documented' },
            { cap: 'Generates representment-ready case file', a: 'no',      b: 'no',      c: 'yes', note: 'chargeback evidence packet' },
            { cap: 'Requires checkout integration',          a: 'no',      b: 'yes',     c: 'no',  note: 'CSV is enough' },
            { cap: 'Auto-declines orders for you',           a: 'yes',     b: 'yes',     c: 'no',  note: 'you keep the decision' },
            { cap: 'PII leaves the merchant in clear text',  a: 'yes',     b: 'yes',     c: 'no',  note: 'client-side HMAC-SHA256' },
          ];
          const icon = (v: string) => v === 'yes'
            ? <span style={{ color: '#1A1814', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '14px' }}>●</span>
            : v === 'partial'
              ? <span style={{ color: '#8A8472', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '14px' }}>◐</span>
              : <span style={{ color: '#D8D0BD', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '14px' }}>○</span>;
          const iconLabel = (v: string) => v === 'yes' ? 'Supported' : v === 'partial' ? 'Partial' : 'Not supported';

          return (
            <>
              {/* ── Desktop / tablet grid (hidden below sm) ── */}
              <div className="hidden sm:block ua-glass-card ua-parallax-layer" data-ua-parallax-depth="-6" style={{ border: '1px solid #D8D0BD', background: 'rgba(253, 251, 246, 0.92)', overflow: 'hidden' }}>
                {/* Header row */}
                <div
                  className="grid grid-cols-[1.6fr_1fr_1fr_1fr]"
                  style={{
                    background: 'linear-gradient(90deg, rgba(248,245,238,0.96), rgba(255,234,190,0.62), rgba(244,232,229,0.94))',
                    borderBottom: '1px solid #D8D0BD',
                  }}
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
            <span style={{ color: '#1A1814', fontSize: '14px' }}>●</span> supported
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#8A8472', fontSize: '14px' }}>◐</span> partial
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#D8D0BD', fontSize: '14px' }}>○</span> not supported
          </span>
        </div>
      </section>

      {/* ── §9 · CTA ─────────────────────────────────────────────── */}
      <section id="audit" style={{ scrollMarginTop: '72px' }} className="ua-audit-canvas ua-parallax-field mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" data-ua-parallax-depth="30">
        <div
          className="ua-dark-panel ua-parallax-layer"
          data-ua-parallax-depth="-10"
          style={{
            background: '#15140F',
            color: '#E8E4D8',
            padding: 'clamp(40px, 5vw, 64px) clamp(28px, 4vw, 56px)',
            border: '1px solid #15140F',
            boxShadow: '0 34px 86px -46px rgba(26,24,20,0.42)',
          }}
        >
          {/* Sparse rust-colored meteors — restricted to action-zone palette */}
          <Meteors number={6} color="#B85C4A" />
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
                Find hidden abuse in{' '}
                <span style={{ color: '#B6512A' }}>
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
                Upload a CSV. Get linked identities, risk scores, refund-abuse clusters, and case files in about 20 minutes.
              </p>
            </div>

            <div className="lg:col-span-5">
              <AuditForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── § NOTES ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-12 md:pt-16 pb-10">

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
            [1, 'Names and identifiers are redacted. The cluster ID format, evidence hierarchy, and signal patterns match the case-file structure Unauth returns.'],
            [2, 'INR = Item Not Received. The most common chargeback reason code abused at scale in DTC ecommerce.'],
            [3, 'Visa, Friendly Fraud Annual Index, 2024. Includes refund abuse and INR fraud across all card types.'],
            [4, 'Industry estimates sourced from Visa and Mastercard published fraud data. Unauth network figures will be published once the founding merchant cohort is live.'],
            [5, 'Mastercard Merchant Survey, 2024. True cost includes fulfilment, reversed acquisition spend, and dispute fees.'],
            [6, 'Hashing is performed client-side using a per-merchant salt that Unauth never sees. The hashed values are queried against the network; raw PII never leaves the merchant’s browser.'],
            [7, 'The profiles in §5 show the audit output shape. Merchant names are omitted.'],
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
        <div
          className="flex flex-col md:flex-row md:justify-between gap-4"
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '12px',
            color: '#4A4640',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontStyle: 'italic',
              fontSize: '12px',
              color: '#8A8472',
              margin: '0 0 12px',
              width: '100%',
            }}
          >
            Case files, audit outputs, and network figures shown on this page are illustrative.
          </p>
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
