import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { DotPattern } from '@/components/ui/dot-pattern';
import { Spotlight } from '@/components/ui/spotlight';
import type { CSSProperties } from 'react';
import PipelineTabs from './_components/PipelineTabs';
import LandingScreenshotFrame from './_components/LandingScreenshotFrame';
import Reveal from './_components/Reveal';
import Counter from './_components/Counter';
import AnimatedBar from './_components/AnimatedBar';
import TypedText from './_components/TypedText';
import HeroNotificationArtifact from './_components/HeroNotificationArtifact';
import VerdictTicker from './_components/VerdictTicker';
import HeroAuditCta from './_components/HeroAuditCta';
import { t } from './_tokens';

export const metadata = {
  title: 'Unauth — Fraud Intelligence for Ecommerce',
  description:
    'Find repeat refund abuse and INR rings hiding across stores. Upload a CSV and get a free fraud graph audit.',
};

export default function LandingPage() {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const faqFeatured = [
    {
      q: 'What exactly is Unauth?',
      a: 'Unauth is a cross-merchant identity resolution platform. We take your order and transaction data, link identities across signals — email, device, address, card, phone — and tell you which customers have a history of refund abuse, INR claims, or chargebacks at other stores. We do not block orders. We give you the intelligence to make better decisions yourself.',
    },
    {
      q: 'How do you get data from other merchants?',
      a: "Every merchant who runs an audit contributes anonymised, hashed identity signals to the shared graph. No raw customer data, no PII in clear text — everything is hashed client-side before it leaves your system. You benefit from every other merchant's history, and they benefit from yours. The network gets more valuable with every participant.",
    },
    {
      q: "Can you see my customers' data?",
      a: "No. PII is hashed on your side before upload using HMAC-SHA256. We receive hashed signals, not names, emails, or addresses in readable form. We cannot reverse the hash, we cannot read your customer list, and we cannot sell or expose it. The audit report you receive shows you the patterns — not the underlying data of other merchants.",
    },
    {
      q: 'Is this GDPR compliant?',
      a: 'Yes. Because PII is hashed client-side before upload and we never store raw customer data, we are not a data processor of personal information under GDPR. The hashed signals we store cannot be used to identify any individual. We recommend reviewing our data processing documentation with your legal team if you operate in the EU.',
    },
    {
      q: 'Do I need to integrate anything?',
      a: 'No. You export a CSV from your store — Shopify, WooCommerce, Magento, or any platform — and upload it. No API keys, no developer, no checkout plugin. If you can export an order report you can run an audit.',
    },
    {
      q: 'How long does an audit take?',
      a: "Around 20 minutes for most datasets. Larger files with 50,000+ orders may take slightly longer. You do not need to stay on the page — we'll have the results ready when you come back.",
    },
  ];
  const faqMore = [
    {
      q: 'How is this different from a blocklist?',
      a: "Blocklists flag signals you've already seen — an email or device that caused you a problem before. That only catches repeat offenders at your store. Unauth links identities across multiple merchants, so we can surface a customer who has never defrauded you but has hit five other stores in the last 90 days. You catch them before they cost you anything.",
    },
    {
      q: 'What does a confidence grade actually mean?',
      a: 'Every identity cluster gets a grade — Definite, Probable, Possible, or Weak — based on how many signals match and how strong those matches are. Definite means we have high certainty this is the same person across multiple merchants with a documented abuse pattern. Weak means there is a partial signal worth watching but not worth acting on yet. You decide what threshold you act on.',
    },
    {
      q: 'What do I actually get at the end?',
      a: 'A full audit report showing every identity cluster we found, their confidence grade, the signals that linked them, their abuse history across the network, and a representment-ready case file for any cluster you want to dispute. You can export the report and the case files directly.',
    },
    {
      q: 'What is a representment-ready case file?',
      a: "If you want to dispute a chargeback, card networks require documented evidence that the order was legitimate and the customer has a pattern of abuse. Unauth generates that evidence packet automatically — transaction history, linked identity signals, cross-merchant abuse pattern, confidence grade. It's formatted to meet Visa's Compelling Evidence 3.0 requirements.",
    },
    {
      q: 'Does Unauth block orders automatically?',
      a: 'No, and deliberately so. We believe merchants should keep the decline decision. We surface the intelligence, you decide what to do with it. This also means we never create false positives that cost you a legitimate sale — that is your call to make, not ours.',
    },
    {
      q: 'How does pricing work?',
      a: 'Pricing is based on order volume processed. The first audit is free with no card required. Paid plans are available for merchants who want ongoing monitoring, API access, and automatic flagging on new orders. Get in touch for a quote based on your volume.',
    },
    {
      q: 'Who is Unauth for?',
      a: "Primarily US ecommerce merchants processing more than 1,000 orders a month who are seeing refund abuse, INR fraud, or chargeback rates they cannot explain with their current tools. If you're a small merchant just starting out, a free audit is still worth running — you might be surprised what is already in your data.",
    },
    {
      q: 'How do I get started?',
      a: 'Run a free audit — no account, no card, no integration required. Export your order history as a CSV and upload it. You will have a full report in about 20 minutes.',
    },
  ];
  const heroSubjectFields = [
    {
      label: 'emails',
      rows: [
        ['customer.a*****@examplemail.com', 'primary · 4 merchants'],
        ['c.a*****@examplemail.com', '2 merchants'],
        ['customer_a*****@example.com', '1 merchant'],
        ['c.a*****@example.com', '1 merchant · low confidence'],
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
        background: t.bg,
        color: t.ink,
        minHeight: '100vh',
      }}
    >
      {/* ── Header strip ────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: `1px solid ${t.border}`,
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
            <nav className="hidden md:flex items-center gap-7" style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '15.5px', color: t.inkSecondary }}>
              <a href="#how-it-works" className="ua-nav-link">How it works</a>
              <a href="#network" className="ua-nav-link">Network</a>
              <a href="#evidence" className="ua-nav-link">Evidence</a>
              <a href="#security" className="ua-nav-link">Security</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/login"
              style={{ color: t.inkSecondary, fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '15.5px' }}
              className="hover:underline"
            >
              Sign in
            </a>
            <a
              href="/audit-demo"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '12px',
                fontWeight: 500,
                color: t.bg,
                background: t.accent,
                padding: '6px 12px',
                border: `1px solid ${t.accent}`,
                textDecoration: 'none',
              }}
              className="md:hidden hover:bg-[var(--landing-accent-hover)]"
            >
              Audit →
            </a>
            <a
              href="/audit-demo"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '13px',
                fontWeight: 500,
                color: t.bg,
                background: t.accent,
                padding: '7px 14px',
                border: `1px solid ${t.accent}`,
                textDecoration: 'none',
              }}
              className="hidden md:inline-flex hover:bg-[var(--landing-accent-hover)]"
            >
              Run free audit →
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="ua-hero-canvas w-full overflow-hidden px-6 md:px-10 lg:px-0 pt-6 md:pt-8 pb-0" suppressHydrationWarning>
        {/* DotPattern — precision grid atmosphere, masked to top-right quadrant */}
        <DotPattern
          width={32} height={32} cx={1} cy={1} cr={1.1}
          className="text-[var(--landing-accent)] opacity-[0.13] [mask-image:radial-gradient(ellipse_68%_60%_at_72%_28%,white,transparent)]"
        />
        {/* Single-hue burgundy spotlight — replaces the old rainbow conic blob */}
        <Spotlight fill="rgba(123,45,38,0.18)" className="-z-10" />

        {/* Side-by-side grid at lg+ */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(430px,560px)_minmax(0,1fr)] gap-8 lg:gap-10 items-start lg:pl-[max(2.5rem,calc((100vw-1400px)/2+2.5rem))]">

        {/* Left — copy block */}
        <Reveal delay={40} className="lg:pt-6">
          {/* Eyebrow */}
          <p
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: t.inkSecondary,
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
                color: t.inkTertiary,
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
              color: t.ink,
              marginBottom: '16px',
              maxWidth: '22ch',
            }}
          >
            Find repeat abusers before they{' '}
            <span style={{ color: t.accent, fontStyle: 'italic', fontFamily: 'var(--font-serif, serif)', fontWeight: 400, whiteSpace: 'nowrap' }}>
              strike again.
            </span>
          </h1>

          {/* Sub-prose */}
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(15px, 1.15vw, 18px)',
              color: t.inkSecondary,
              lineHeight: 1.55,
              marginBottom: '20px',
              maxWidth: '44ch',
            }}
          >
            Upload orders. Unauth links refund abuse, INR claims, and friendly-fraud patterns across stores.{' '}
            <span style={{ color: t.ink, fontWeight: 500, fontStyle: 'normal' }}>Free audit. No account. Results emailed.</span>
          </p>

          {/* CTA row */}
          <div className="flex w-full flex-col gap-3">
            <HeroAuditCta />
            <a
              href="#how-it-works"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 14,
                color: t.inkSecondary,
                textDecoration: 'none',
              }}
            >
              See how it works →
            </a>
          </div>
        </Reveal>

        {/* Right — large product artifact */}
        <Reveal as="div" className="ua-hero-stage relative mt-10 md:mt-14 lg:mt-0" delay={180} noFade>
            {/* Floating eyebrow above artifact */}
            <div
              className="flex items-center justify-between mb-3"
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '10.5px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: t.inkTertiary,
              }}
            >
              <span>Inbox · identity-flagged cases</span>
              <span>25 open · £5,192 at risk</span>
            </div>

            <LandingScreenshotFrame
              src="/screenshots/inbox.png"
              alt="Unauth inbox showing 25 open identity-flagged cases with risk scores, values, and crossmerchant signals"
            />

            <div className="hidden lg:w-full lg:max-h-[720px] overflow-hidden">
              <div
                className="ua-hover-glow ua-case-card ua-premium-surface"
               
                suppressHydrationWarning
                style={{
                  background: 'rgba(253, 251, 246, 0.96)',
                  border: '1px solid rgba(123,45,38,0.15)',
                  borderRadius: 6,
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
                  padding: '10px 14px',
                  borderBottom: `1px solid ${t.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  background: t.bg,
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '11.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: t.inkSecondary,
                    margin: 0,
                  }}
                >
                  <span style={{ color: t.accent }}>●</span>{' '}
                  CASE FILE · UN-2026-04-21-0083
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      color: t.paper,
                      background: t.accent,
                      border: `1px solid ${t.accent}`,
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
                      color: t.inkSecondary,
                      background: t.surfaceAlt,
                      border: `1px solid ${t.border}`,
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
                      color: t.inkSecondary,
                      background: t.surfaceAlt,
                      border: `1px solid ${t.border}`,
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
                <div style={{ padding: '12px 14px', borderRight: `1px solid ${t.border}` }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: t.inkTertiary,
                      marginBottom: '8px',
                    }}
                  >
                    SUBJECT
                  </p>
                  <p
                    className="ua-case-step"
                    style={{
                      fontFamily: 'var(--font-serif, serif)',
                      fontSize: '18px',
                      color: t.ink,
                      marginBottom: '4px',
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
                      <a href="#note-1" style={{ color: t.accent, textDecoration: 'none' }}>1</a>
                    </sup>
                  </p>
                  <p
                    className="ua-case-step"
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '12px',
                      color: t.accent,
                      letterSpacing: '0.02em',
                      marginBottom: '4px',
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
                      fontSize: '11px',
                      fontStyle: 'italic',
                      color: t.inkTertiary,
                      lineHeight: 1.45,
                      margin: '0 0 10px 0',
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
                      gap: '10px 14px',
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10px',
                      color: t.inkSecondary,
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
                            color: t.inkTertiary,
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                                  color: t.ink,
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
                                    color: t.inkTertiary,
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
                <div style={{ padding: '12px 14px' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: t.inkTertiary,
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
                      <div key={l} className="ua-case-row-hover" style={{ display: 'grid', gridTemplateColumns: '1fr 36px', gap: '10px', alignItems: 'center', padding: '3px 2px', borderTop: i > 0 ? '1px solid rgba(123,45,38,0.07)' : 'none', transition: 'background 140ms ease', margin: '0 -2px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                background: on ? t.accent : t.border,
                                display: 'inline-block',
                                borderRadius: '50%',
                              }}
                            />
                            <TypedText
                              text={l}
                              delay={260 + i * 58}
                              speed={10}
                              style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: on ? t.ink : t.inkTertiary }}
                            />
                          </div>
                          <AnimatedBar
                            className="ua-case-signal-bar"
                            value={v}
                            color={on ? t.accent : t.border}
                            track={t.border}
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
                            color: on ? t.ink : t.inkTertiary,
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
              <div style={{ borderTop: `1px solid ${t.border}`, padding: '10px 14px' }}>
                <p
                  className="ua-case-step"
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '11px',
                    letterSpacing: '0.06em',
                    color: t.inkSecondary,
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
              <div style={{ borderTop: `1px solid ${t.border}`, padding: '14px 16px', background: t.bg }}>
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
                      color: t.inkTertiary,
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
                      color: t.inkTertiary,
                      margin: 0,
                    }}
                  >
                    7 merchants · aggregate only · 11 orders
                  </p>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '11px',
                    color: t.inkSecondary,
                    lineHeight: 1.65,
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
                          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) 54px auto',
                          gap: '12px',
                          alignItems: 'center',
                          paddingTop: '3px',
                          paddingBottom: '3px',
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
                        style={{ color: t.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      />
                      <TypedText text={row.o} delay={heroNetworkDelay + i * 80 + 120} speed={13} style={{ color: t.inkSecondary }} />
                      <AnimatedBar
                        value={row.r}
                        color={row.r > 0.7 ? t.accent : row.r > 0.5 ? t.accent : t.inkTertiary}
                        track={t.border}
                        height={3}
                        delay={500 + i * 70}
                      />
                      <TypedText text={row.v} delay={heroNetworkDelay + i * 80 + 220} speed={20} style={{ color: t.ink, fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: '46px' }} />
                    </div>
                  ))}
                  <p style={{ color: t.inkTertiary, fontSize: '10px', marginTop: '6px' }}>
                    + 3 more merchants withheld
                  </p>
                </div>
              </div>

              {/* Signal summary */}
              <div
                className="ua-case-step"
                style={{
                  borderTop: `1px solid ${t.border}`,
                  padding: '14px 22px',
                  background: `linear-gradient(90deg, ${t.surfacePink} 0%, ${t.surfacePink2} 100%)`,
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
                    color: t.accent,
                    letterSpacing: '0.06em',
                    margin: 0,
                    fontWeight: 500,
                  }}
                  >
                  <TypedText text="▸ SIGNAL PATTERN DETECTED · COMPILE SIGNAL DATA FOR 2 OPEN DISPUTES" delay={heroActionDelay} speed={10} />
                </p>
                <span
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '10.5px',
                    color: t.accent,
                    background: t.paper,
                    border: `1px solid ${t.borderWarm}`,
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
                  borderTop: `1px solid ${t.border}`,
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
                    color: t.inkTertiary,
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
                    color: t.inkTertiary,
                    margin: 0,
                  }}
                >
                  <TypedText text="HMAC-SHA256 · per-tenant salt" delay={heroFooterDelay + 360} speed={12} />
                </p>
              </div>
              </div>
            </div>

            {/* Tiny meta row under card */}
            <div className="hidden flex-wrap items-center gap-x-5 gap-y-2 mt-4" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: t.inkTertiary, letterSpacing: '0.04em' }}>
              <span>sample cluster · 11 orders analysed</span>
              <span style={{ color: t.border }}>·</span>
              <span>pipeline latency: 38ms</span>
              <span style={{ color: t.border }}>·</span>
              <span>Case file ready in browser</span>
            </div>

            {/* Proof chips — below artifact */}
            <div className="hidden flex-wrap gap-2 mt-5">
              {[
                'No checkout integration',
                'CSV audit · ~20 min',
                'Client-side HMAC hashing',
                'k-anonymity privacy gating',
                'Tenant-scoped salts',
                'Hashed audit trail',
                'Evidence-ready output',
              ].map((chip) => (
                <span
                  key={chip}
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '10.5px',
                    color: t.inkSecondary,
                    background: t.surfaceAlt,
                    border: `1px solid ${t.border}`,
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

      {/* ── §1 · The pattern your store can't see — VISUAL ───────── */}
      <section
        className="w-full -mt-[0vh] pb-16 md:pb-20"
        style={{ background: t.darkBg, position: 'relative', zIndex: 1 }}
      >
        <VerdictTicker />
        <div className="mx-auto max-w-[1400px] px-2 md:px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-10 md:mt-14" style={{ transform: 'translateY(-5vh)' }}>
          <div className="lg:col-span-3">
            <p
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: t.darkLabel,
                marginBottom: '14px',
              }}
            >
              § 1 — WHY IT MATTERS
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 'clamp(28px, 2.8vw, 42px)',
                fontWeight: 500,
                letterSpacing: '-0.030em',
                lineHeight: 1.05,
                color: t.bg,
                marginBottom: '20px',
              }}
            >
              One buyer.{' '}
              <span style={{ color: t.accent, fontStyle: 'italic', fontFamily: 'var(--font-serif, serif)', fontWeight: 400, whiteSpace: 'nowrap' }}>Seven stores.</span>{' '}
              One pattern.
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontSize: 'clamp(15px, 1.15vw, 18px)',
                lineHeight: 1.55,
                color: t.darkText,
                marginBottom: '20px',
              }}
            >
              Alone, every order looks normal. Across the network, the same card, address variants, and INR pattern resolve into one identity.
            </p>

            {/* Three stats inline */}
            <div className="grid grid-cols-3 gap-6 mt-7 pt-6" style={{ borderTop: '1px solid rgba(212,199,175,0.24)' }}>
              {[
                { v: 89,  prefix: '$', suffix: 'B', dec: 0, l: 'Lost annually to refund / INR fraud', n: 3 },
                { v: 20,  prefix: '',  suffix: '%', dec: 0, l: 'Of DTC refund claims tied to repeat abusers', n: 4 },
                { v: 2.7, prefix: '',  suffix: '×', dec: 1, l: 'True cost of a lost chargeback', n: 5 },
              ].map((s, i) => (
                <Reveal key={s.l} delay={120 + i * 80}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: 'clamp(22px, 1.8vw, 32px)',
                      fontWeight: 500,
                      color: t.bg,
                      lineHeight: 1,
                      marginBottom: '8px',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    <Counter value={s.v} prefix={s.prefix} suffix={s.suffix} decimals={s.dec} duration={1100} format="plain" />
                    <sup style={{ fontSize: '0.28em', letterSpacing: 0 }}>
                      <a href={`#note-${s.n}`} style={{ color: t.accent, textDecoration: 'none' }}>{s.n}</a>
                    </sup>
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10px',
                      color: t.darkLabel,
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

          {/* Right: rolling notifications — same buyer across 7 stores */}
          <Reveal className="lg:col-span-9" delay={140}>
            <HeroNotificationArtifact />
          </Reveal>
        </div>
      </section>

      {/* ── §1.5 · Founding merchant testimonial ────────────────── */}
      <PipelineTabs />

      {/* ── § 6 — Data Schema ───────────────────────────────────────── */}
      <section style={{ background: t.bg }}>
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-24">
          <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.accent, marginBottom: '10px' }}>§ 6 — Data Schema</p>
              <h2 style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 'clamp(22px, 2vw, 32px)', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.08, color: t.ink, margin: 0 }}>Use data you already have.</h2>
            </div>
            <p style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '14px', color: t.inkSecondary, lineHeight: 1.6, maxWidth: '380px', margin: 0 }}>Standard order, refund, delivery, and payment exports. No integration required.</p>
          </div>

          <div style={{ background: t.darkCard, border: `1px solid ${t.darkBorder}`, borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', borderBottom: `1px solid ${t.darkBorder}`, background: t.darkBg, gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: t.darkBright, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.darkText }}>Required — 24 core fields</span>
              </div>
              <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', letterSpacing: '0.06em', color: t.darkSubtle }}>shopify · woocommerce · custom OMS · stripe</span>
            </div>
            {([
              { label: 'Identity',      sensitive: true,  fields: ['email', 'phone', 'shipping_name', 'billing_name', 'customer_id'] },
              { label: 'Order',                           fields: ['order_id', 'order_date', 'order_value', 'item_count', 'sku / category'] },
              { label: 'Address',       sensitive: true,  fields: ['shipping_address', 'shipping_postcode', 'billing_address', 'billing_postcode'] },
              { label: 'Payment',       sensitive: true,  fields: ['payment_method', 'card_bin', 'card_last4'] },
              { label: 'Fulfillment',                     fields: ['carrier', 'tracking_number', 'delivery_status'] },
              { label: 'Abuse signals',                   fields: ['refund_requested', 'refund_reason', 'return_reason', 'chargeback_status'] },
            ] as { label: string; sensitive?: boolean; fields: string[] }[]).map((cat, ci) => (
              <div key={cat.label} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', borderTop: ci > 0 ? `1px solid ${t.darkBorder2}` : 'none' }}>
                <div style={{ padding: '12px 16px 12px 18px', borderRight: `1px solid ${t.darkBorder2}`, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: cat.sensitive ? t.darkBright : t.darkSubtle, lineHeight: 1.8 }}>{cat.label}</span>
                </div>
                <div style={{ padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: '5px 6px', alignContent: 'flex-start' }}>
                  {cat.fields.map((f) => (
                    <span key={f} style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11.5px', letterSpacing: '0.01em', color: cat.sensitive ? t.darkText : t.darkMuted, background: cat.sensitive ? 'rgba(212,160,120,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${cat.sensitive ? 'rgba(212,160,120,0.22)' : t.darkBorder2}`, borderRadius: '3px', padding: '2px 7px', lineHeight: 1.7 }}>{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: t.darkCard, border: `1px dashed ${t.darkBorder}`, borderRadius: '6px', padding: '16px 18px', display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '110px', flexShrink: 0 }}>
              <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: t.darkSubtle, margin: 0, lineHeight: 1.8 }}>Optional</p>
              <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.darkSubtle, margin: 0, lineHeight: 1.8 }}>Enrichment</p>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 6px', marginBottom: '10px' }}>
                {['ip_address', 'device_fingerprint', 'payment_fingerprint', 'browser_fingerprint', 'delivery_photo_metadata', 'courier_gps_proof'].map((f) => (
                  <span key={f} style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11.5px', letterSpacing: '0.01em', color: t.darkMuted, background: 'rgba(255,255,255,0.06)', border: `1px solid ${t.darkBorder}`, borderRadius: '3px', padding: '2px 7px', lineHeight: 1.7 }}>{f}</span>
                ))}
              </div>
              <p style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontSize: '13px', color: t.darkLabel, lineHeight: 1.55, margin: 0 }}>Improves resolution for clusters where email + address alone don&rsquo;t meet the DEFINITE threshold.</p>
            </div>
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${t.lineFaint}`, margin: 0 }} />

      {/* ── §4 · Merchant dashboard ────────────────────────────────── */}
      <section className="ua-section-quiet mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" suppressHydrationWarning>
        <div className="mb-10 grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12 items-start">
          <p
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: t.accent,
              paddingTop: '6px',
              lineHeight: 1.6,
            }}
          >
            § 4 —<br />Merchant<br />Dashboard
          </p>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 'clamp(28px, 2.8vw, 40px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
                color: t.ink,
                marginBottom: '10px',
              }}
            >
              Everything you need.{' '}
              <span style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontWeight: 400, color: t.inkMuted }}>Nothing you don&rsquo;t.</span>
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontSize: 'clamp(15px, 1.1vw, 17px)',
                lineHeight: 1.55,
                color: t.inkSecondary,
                maxWidth: '600px',
                margin: 0,
              }}
            >
              Flagged identities, risk scores, evidence packets, and network exposure — all in one audit view.
            </p>
          </div>
        </div>
        <LandingScreenshotFrame
          src="/screenshots/dashboard.png"
          alt="Unauth merchant dashboard showing fraud rate, transaction volume, chargeback trend, and identity match breakdown"
        />
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${t.lineFaint}`, margin: 0 }} />

      {/* ── §8 · Comparison matrix ──────────────────────────────── */}
      <section className="ua-section-flow mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" suppressHydrationWarning>

        <div className="mb-10 grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12 items-start">
          <p
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: t.accent,
              paddingTop: '6px',
              lineHeight: 1.6,
            }}
          >
            § 8 —<br />How Unauth<br />Compares
          </p>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 'clamp(28px, 2.8vw, 40px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
                color: t.ink,
                marginBottom: '10px',
              }}
            >
              Checkout tools miss what happens after.
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontSize: 'clamp(15px, 1.1vw, 17px)',
                color: t.inkSecondary,
                lineHeight: 1.55,
                maxWidth: '640px',
                margin: 0,
              }}
            >
              Unauth finds refund abuse, friendly fraud, and INR cycles after the transaction clears.
            </p>
          </div>
        </div>

        {/* Comparison data */}
        {(() => {
          const rows = [
            { cap: 'Resolves cross-merchant identity',       a: 'no',      b: 'no',      c: 'yes', note: '7+ stores observed per cluster' },
            { cap: 'Catches friendly fraud / INR cycles',    a: 'no',      b: 'partial', c: 'yes', note: 'post-purchase patterns' },
            { cap: 'Surfaces network-known abusers',         a: 'partial', b: 'no',      c: 'yes', note: 'k-anon gated at 3+ merchants' },
            { cap: 'Explainable signals (no black box)',     a: 'partial', b: 'no',      c: 'yes', note: 'every flag documented' },
            { cap: 'Generates representment-ready case file', a: 'no',      b: 'no',      c: 'yes', note: 'chargeback evidence packet' },
            { cap: 'Works from CSV upload — no code required', a: 'no',    b: 'no',      c: 'yes', note: 'start with exports you already have' },
            { cap: 'You keep the decline decision — no black box blocks', a: 'no', b: 'no', c: 'yes', note: 'advises, never auto-blocks' },
            { cap: 'PII stays encrypted — never exposed in transit', a: 'no', b: 'no', c: 'yes', note: 'client-side HMAC-SHA256' },
          ];
          const indicator = (v: string, highlight = false) => {
            const baseStyle: CSSProperties = {
              width: '18px',
              height: '18px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '11px',
              lineHeight: 1,
              flexShrink: 0,
            };

            if (v === 'yes') {
              return (
                <span
                  aria-hidden="true"
                  style={{
                    ...baseStyle,
                    background: highlight ? t.accent : t.ink,
                    border: `1px solid ${highlight ? t.accent : t.ink}`,
                    color: t.bg,
                  }}
                >
                  ●
                </span>
              );
            }

            if (v === 'partial') {
              return (
                <span
                  aria-hidden="true"
                  style={{
                    ...baseStyle,
                    width: '20px',
                    height: '20px',
                    background: t.surfacePink2,
                    border: `1.5px solid ${t.accent}`,
                    color: t.accent,
                    fontSize: '15px',
                    fontWeight: 700,
                  }}
                >
                  −
                </span>
              );
            }

            return (
              <span
                aria-hidden="true"
                style={{
                  ...baseStyle,
                  background: 'transparent',
                  border: `1px solid ${t.border}`,
                  color: t.border,
                }}
              >
                ○
              </span>
            );
          };
          const iconLabel = (v: string) => v === 'yes' ? 'Included' : v === 'partial' ? 'Partial coverage' : 'Not included';

          return (
            <>
              {/* ── Desktop / tablet grid (hidden below sm) ── */}
              <div className="hidden sm:block ua-glass-card" suppressHydrationWarning style={{ border: `1px solid ${t.border}`, background: '#ffffff', overflow: 'hidden' }}>
                {/* Header row */}
                <div
                  className="grid grid-cols-[1.6fr_1fr_1fr_1fr]"
                  style={{
                    background: 'linear-gradient(90deg, rgba(248,245,238,0.96), rgba(255,234,190,0.62), rgba(244,232,229,0.94))',
                    borderBottom: `1px solid ${t.border}`,
                  }}
                >
                  <div style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: t.inkTertiary, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                        Capability
                      </span>
                      <div className="flex items-center gap-4 flex-wrap" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: t.inkTertiary }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {indicator('yes', true)}
                          Included
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {indicator('partial')}
                          Partial
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {indicator('no')}
                          Not included
                        </span>
                      </div>
                    </div>
                  </div>
                  {[
                    { name: 'Blocklists', sub: 'Flags repeat emails, IPs, or devices you have already seen' },
                    { name: 'Checkout scoring', sub: 'Scores orders at checkout to catch payment fraud before approval' },
                    { name: 'Unauth', sub: 'Finds post-purchase abuse patterns across refunds, INR, and linked stores', highlight: true, logo: true },
                  ].map((col) => (
                    <div
                      key={col.name}
                      style={{
                        padding: '14px 16px',
                        borderLeft: `1px solid ${t.border}`,
                        background: col.highlight ? 'linear-gradient(180deg, rgba(123,45,38,0.10), rgba(123,45,38,0.04))' : 'transparent',
                      }}
                    >
                      {col.logo ? (
                        <div style={{ marginBottom: '2px' }}>
                          <UnauthLogo className="h-[16px] w-auto" />
                        </div>
                      ) : (
                        <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', fontWeight: 600, color: col.highlight ? t.accent : t.ink, margin: 0 }}>
                          {col.name}
                        </p>
                      )}
                      <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '11.5px', color: t.inkSecondary, margin: '4px 0 0 0', lineHeight: 1.45 }}>
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
                    style={{ borderBottom: i < 7 ? `1px solid ${t.border}` : 'none', background: t.surfaceWarm }}
                  >
                    <div style={{ padding: '14px 18px' }}>
                      <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', color: t.ink, margin: 0, fontWeight: 500 }}>
                        {cap}
                      </p>
                      <p style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontSize: '12.5px', color: t.inkTertiary, margin: '2px 0 0 0' }}>
                        {note}
                      </p>
                    </div>
                    <div style={{ padding: '14px 16px', borderLeft: `1px solid ${t.border}`, display: 'flex', alignItems: 'center' }}>{indicator(a)}</div>
                    <div style={{ padding: '14px 16px', borderLeft: `1px solid ${t.border}`, display: 'flex', alignItems: 'center' }}>{indicator(b)}</div>
                    <div style={{ padding: '14px 16px', borderLeft: `1px solid ${t.border}`, background: 'linear-gradient(180deg, rgba(123,45,38,0.08), rgba(123,45,38,0.04))', display: 'flex', alignItems: 'center' }}>{indicator(c, true)}</div>
                  </Reveal>
                ))}
              </div>

              {/* ── Mobile stacked cards (hidden above sm) ── */}
              <div className="sm:hidden ua-glass-card" style={{ border: `1px solid ${t.border}`, background: '#ffffff', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: '10px', flexWrap: 'wrap', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: t.inkSecondary }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{indicator('yes', true)} Included</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{indicator('partial')} Partial</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{indicator('no')} Not included</span>
                </div>
                {rows.map(({ cap, a, b, c, note }, i) => (
                  <Reveal
                    key={`m-${i}`}
                    delay={60 + i * 50}
                    style={{
                      padding: '16px 18px',
                      borderBottom: i < 7 ? `1px solid ${t.border}` : 'none',
                    }}
                  >
                    <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', color: t.ink, fontWeight: 500, marginBottom: '2px' }}>
                      {cap}
                    </p>
                    <p style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontSize: '12px', color: t.inkTertiary, marginBottom: '12px' }}>
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
                            background: highlight ? 'rgba(123,45,38,0.06)' : t.surfaceWarm,
                            border: `1px solid ${highlight ? t.accent : t.border}`,
                            borderRadius: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                              fontFamily: 'var(--font-dm-sans, sans-serif)',
                              fontSize: '13px',
                              fontWeight: highlight ? 600 : 400,
                              color: highlight ? t.accent : t.ink,
                            }}>
                              {label}
                            </span>
                            <span style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '11.5px', color: t.inkSecondary, lineHeight: 1.4 }}>
                              {label === 'Blocklists' ? 'Flags known emails, IPs, or devices' : label === 'Checkout scoring' ? 'Scores orders before approval' : 'Finds post-purchase abuse across stores'}
                            </span>
                          </div>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: t.inkSecondary }}>
                            {indicator(val, Boolean(highlight))}
                            <span style={{ color: t.inkTertiary }}>{iconLabel(val)}</span>
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
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section
        style={{ background: t.darkBg, position: 'relative', zIndex: 1 }}
      >
        <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-16 md:py-24 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16 xl:gap-20">

          {/* Left — sticky heading block */}
          <div className="mb-12 lg:mb-0">
            <div className="lg:sticky lg:top-24">
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: t.accent,
                  marginBottom: '16px',
                }}
              >
                § Frequent Questions
              </p>
              <h2
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: 'clamp(26px, 2.4vw, 36px)',
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.08,
                  color: t.darkText,
                  marginBottom: '14px',
                }}
              >
                Everything you&rsquo;d ask<br />
                <span style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontWeight: 400, color: t.darkLabel }}>before committing.</span>
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontSize: '15px',
                  color: t.darkLabel,
                  lineHeight: 1.6,
                  marginBottom: '24px',
                }}
              >
                Data handling, privacy, integration, evidence — answered directly.
              </p>
              <a
                href="/audit-demo"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: t.accent,
                  textDecoration: 'none',
                  borderBottom: `1px solid ${t.accent}`,
                  paddingBottom: '2px',
                }}
              >
                Run a free audit →
              </a>
            </div>
          </div>

          {/* Right — accordion list */}
          <div>
            {[...faqFeatured, ...faqMore].map((item, i) => (
              <details
                key={item.q}
                className="ua-faq-item group"
                style={{
                  borderTop: i === 0 ? `1px solid ${t.darkBorder}` : 'none',
                  borderBottom: `1px solid ${t.darkBorder}`,
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    listStyle: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '18px 0',
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: t.darkText,
                    userSelect: 'none',
                  }}
                >
                  <span style={{ flex: 1 }}>{item.q}</span>
                  <span
                    aria-hidden="true"
                    className="ua-faq-icon"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      flexShrink: 0,
                      border: `1px solid ${t.darkBorder}`,
                      borderRadius: '3px',
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '14px',
                      lineHeight: 1,
                      color: t.darkMuted,
                      transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease',
                    }}
                  />
                </summary>
                <p
                  style={{
                    margin: '0 0 18px',
                    fontFamily: 'var(--font-serif, serif)',
                    fontSize: '15px',
                    lineHeight: 1.65,
                    color: t.darkLabel,
                    maxWidth: '68ch',
                  }}
                >
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        <style>{`
          .ua-faq-item[open] > summary .ua-faq-icon {
            background: var(--landing-accent);
            border-color: var(--landing-accent);
            color: var(--landing-accent-fg);
          }
          .ua-faq-item[open] > summary .ua-faq-icon::after {
            content: '−';
          }
          .ua-faq-item > summary .ua-faq-icon::after {
            content: '+';
          }
.ua-faq-item summary::-webkit-details-marker { display: none; }
          .ua-faq-item summary::marker { display: none; }
          .ua-faq-item > summary:hover .ua-faq-icon {
            background: rgba(255,255,255,0.06);
          }
          .ua-faq-item[open] > summary:hover .ua-faq-icon {
            background: var(--landing-accent-hover);
          }
        `}</style>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer style={{ background: t.darkBg, borderTop: `1px solid ${t.darkBorder}` }}>
        <div
          className="mx-auto max-w-[1100px] px-6 md:px-10 py-8 flex flex-col md:flex-row md:justify-between gap-4"
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '12px',
            color: t.darkSubtle,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontStyle: 'italic',
              fontSize: '12px',
              color: t.darkSubtle,
              margin: '0 0 12px',
              width: '100%',
            }}
          >
            Case files, audit outputs, and network figures shown on this page are illustrative.
          </p>
          <span>
            Unauth ·{' '}
            <a href="/legal/privacy" style={{ color: t.darkMuted }} className="hover:underline">privacy</a>
            {' · '}
            <a href="/legal/dpa" style={{ color: t.darkMuted }} className="hover:underline">DPA</a>
            {' · '}
            <a href="/legal/data-handling" style={{ color: t.darkMuted }} className="hover:underline">data handling</a>
          </span>
          <a
            href="mailto:hello@unauth.app"
            style={{ color: t.darkMuted }}
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
