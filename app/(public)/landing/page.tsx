import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { DotPattern } from '@/components/ui/dot-pattern';
import { Spotlight } from '@/components/ui/spotlight';
import type { CSSProperties } from 'react';
import PipelineTabs from './_components/PipelineTabs';
import LandingScreenshotFrame from './_components/LandingScreenshotFrame';
import Reveal from './_components/Reveal';
import Counter from './_components/Counter';
import AnimatedBar from './_components/AnimatedBar';
<<<<<<< Updated upstream
import TypedText from './_components/TypedText';
import HeroNotificationArtifact from './_components/HeroNotificationArtifact';
import VerdictTicker from './_components/VerdictTicker';
import HeroAuditCta from './_components/HeroAuditCta';
import { t } from './_tokens';
=======
import PublicAuditForm from './PublicAuditForm';
>>>>>>> Stashed changes

export const metadata = {
  title: 'Unauth — Fraud Intelligence for Ecommerce',
  description:
<<<<<<< Updated upstream
    'Find repeat refund abuse and INR rings hiding across stores. Upload a CSV and get a free fraud graph audit.',
=======
    'Cross-merchant identity resolution. Friendly fraud, refund abuse, and INR (Item Not Received) claim rings caught by linking identities across stores.',
>>>>>>> Stashed changes
};

export default function LandingPage() {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const footerVariant: 'espresso' | 'cream' | 'split' = 'espresso';
  const footerStyles = {
    espresso: {
      shellBg: t.darkBg,
      shellBorder: t.darkBorder,
      text: 'rgba(245, 239, 229, 0.78)',
      heading: 'rgba(248, 242, 233, 0.96)',
      title: 'rgba(251, 247, 240, 0.98)',
      link: 'rgba(244, 237, 226, 0.9)',
      bottomBg: 'transparent',
    },
    cream: {
      shellBg: t.bg,
      shellBorder: t.border,
      text: t.inkSecondary,
      heading: t.ink,
      title: t.ink,
      link: t.inkSecondary,
      bottomBg: 'transparent',
    },
    split: {
      shellBg: t.bg,
      shellBorder: t.border,
      text: t.inkSecondary,
      heading: t.ink,
      title: t.ink,
      link: t.inkSecondary,
      bottomBg: t.darkBg,
    },
  }[footerVariant];
  const faqFeatured = [
    {
      q: 'What exactly is Unauth?',
      a: 'Unauth is a cross-merchant identity resolution platform. We take your order and transaction history, link identities across signals — email, address, card, phone — and tell you which customers have a documented pattern of refund abuse, INR claims, or chargebacks at other stores. We don\'t block orders. We give you the intelligence to make better decisions yourself.',
    },
    {
      q: 'How do you get data from other merchants?',
      a: "Every merchant who runs an audit contributes anonymised, hashed identity signals to the shared graph. Raw customer records remain scoped to the uploading merchant, and cross-merchant matching exposes aggregate k-safe signals rather than another merchant's customer list. You benefit from every other merchant's history, and they benefit from yours.",
    },
    {
      q: "Can you see my customers' data?",
      a: "Your raw upload is processed inside your merchant workspace and is not exposed to other merchants. Network comparison uses HMAC-SHA256 identifiers, k-anonymity gates, and masked outputs so reports show relevant risk patterns without revealing another merchant's customer records.",
    },
    {
      q: 'Is this GDPR compliant?',
      a: 'Unauth is designed around data minimisation, merchant-scoped processing, and hashed network signals. You should review the data processing documentation with your legal team before using live EU customer data.',
    },
    {
      q: 'Do I need to integrate anything?',
      a: 'No. Export a CSV from your store — Shopify, WooCommerce, Stripe, or any platform — and upload it. No API keys, no developer, no checkout plugin. If you can export an order report, you can run an audit.',
    },
    {
      q: 'How long does an audit take?',
      a: "Around 20 minutes for most datasets. Files with 50,000+ orders may take slightly longer. You don't need to stay on the page — results will be ready when you return.",
    },
  ];
  const faqMore = [
    {
      q: 'How is this different from a blocklist?',
      a: "Blocklists only flag signals you've already seen — an email or device that caused you a problem before. That catches repeat offenders at your store. Unauth links identities across merchants, so we can surface a customer who has never touched you but has hit five other stores in the last 90 days. You see the threat before it costs you anything.",
    },
    {
      q: 'What does a confidence grade actually mean?',
      a: 'Every identity cluster gets a grade — Definite, Probable, Possible, or Weak — based on how many signals match and how strong those matches are. Definite means high certainty: the same person, across multiple merchants, with a documented abuse pattern. Weak means a partial signal worth watching but not worth acting on yet. You decide what threshold you act on.',
    },
    {
      q: 'What do I actually get at the end?',
      a: 'A full audit report showing every identity cluster found, their confidence grade, the signals that linked them, their abuse history across the network, and a representment-ready case file for any cluster you want to dispute. Everything exportable.',
    },
    {
      q: 'What is a representment-ready case file?',
      a: 'To dispute a chargeback, you need documented evidence of order history and linked identity signals. Unauth generates an identity evidence export automatically — transaction history, cross-merchant match data, confidence grade, and prior-order signal overlap — for you to use in dispute review at your discretion.',
    },
    {
      q: 'Does Unauth block orders automatically?',
      a: 'No, and deliberately so. We believe merchants should keep the decline decision. We surface the intelligence, you decide what to do with it. This also means we never create false positives that cost you a legitimate sale — that is your call to make, not ours.',
    },
    {
      q: 'How does pricing work?',
      a: 'The first audit is free — no card required. Paid plans are based on order volume and cover ongoing monitoring, automatic flagging on new orders, and full API access. Get in touch for a quote based on your volume.',
    },
    {
      q: 'Who is Unauth for?',
      a: "US ecommerce merchants processing more than 1,000 orders a month who are seeing refund abuse, INR fraud, or chargeback rates they can't explain with their current tools. If you're smaller, a free audit is still worth running — you might be surprised what's already in your data.",
    },
    {
      q: 'How do I get started?',
      a: 'Export your order history as a CSV and upload it. No account, no card, no integration. You\'ll have a full report in around 20 minutes.',
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
              href="/audit"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '12px',
                fontWeight: 500,
                color: t.bg,
                background: t.accent,
                padding: '6px 12px',
                border: `1px solid ${t.accent}`,
                borderRadius: '6px',
                textDecoration: 'none',
              }}
              className="md:hidden hover:bg-[var(--landing-accent-hover)]"
            >
              Audit →
            </a>
            <a
              href="/audit"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '13px',
                fontWeight: 500,
                color: t.bg,
                background: t.accent,
                padding: '7px 16px',
                border: `1px solid ${t.accent}`,
                borderRadius: '6px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
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
            Catch serial refund fraud before it{' '}
            <span style={{ color: t.accent, fontStyle: 'italic', fontFamily: 'var(--font-serif, serif)', fontWeight: 400, whiteSpace: 'nowrap' }}>
              costs you again.
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
<<<<<<< Updated upstream
            Upload your orders. We link refund abuse, INR claims, and friendly fraud across merchants — and hand you a scored case file.{' '}
            <span style={{ color: t.ink, fontWeight: 500, fontStyle: 'normal' }}>Free. No account. No integration.</span>
=======
            Drop your CSV. We surface every store they&rsquo;ve hit, hash your PII client-side, and return a signed case file in minutes.{' '}
            <span style={{ color: '#1A1814', fontWeight: 500, fontStyle: 'normal' }}>First upload free.</span>
>>>>>>> Stashed changes
          </p>

          {/* CTA row */}
          <div className="flex w-full flex-col gap-3">
            <HeroAuditCta />
            <a
<<<<<<< Updated upstream
              href="#how-it-works"
=======
              href="#evidence"
>>>>>>> Stashed changes
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
        <Reveal as="div" className="ua-hero-stage relative mt-8 md:mt-14 lg:mt-0" delay={180} noFade>
            {/* Floating eyebrow above artifact — hidden on mobile, the mobile card has its own header */}
            <div
              className="hidden md:flex items-center justify-between mb-3"
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '10.5px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: t.inkTertiary,
              }}
            >
<<<<<<< Updated upstream
              <span>Inbox · matched orders</span>
              <span>25 open · $5,192 order value</span>
=======
              <span>
                <span
                  className="ua-pulse"
                  style={{ display: 'inline-block', width: 6, height: 6, background: '#34A853', marginRight: '8px', verticalAlign: 'middle' }}
                />
                Live engine output
              </span>
              <span>Cluster #u_kessler.07</span>
>>>>>>> Stashed changes
            </div>

            <LandingScreenshotFrame
              src="/screenshots/inbox.png"
              alt="Unauth inbox showing 25 open identity-matched cases with confidence grades, values, and crossmerchant signals"
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
<<<<<<< Updated upstream
                <div style={{ padding: '12px 14px', borderRight: `1px solid ${t.border}` }}>
=======
                <div style={{ padding: '28px 22px', borderRight: '1px solid #D8D0BD' }}>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                    <TypedText text="Noah K████" delay={120} speed={18} />
                    <sup>
                      <a href="#note-1" style={{ color: t.accent, textDecoration: 'none' }}>1</a>
                    </sup>
=======
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
                    {[
                      ['emails', '3 variants'],
                      ['addresses', '3 variants'],
                      ['payment', 'Chase ••4419'],
                      ['devices', '2 fingerprints'],
                      ['phone', '+44 •• 1184'],
                      ['ip / geo', '3 IPs · LDN / MAN'],
                      ['browser', 'Safari 17 · iPhone'],
                      ['delivery', 'DPD photo proof'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <span style={{ color: '#8A8472', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '10px', display: 'block', marginBottom: '2px' }}>{k}</span>
                        <span style={{ color: '#1A1814' }}>{v}</span>
>>>>>>> Stashed changes
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Risk score column */}
<<<<<<< Updated upstream
                <div style={{ padding: '12px 14px' }}>
=======
                <div style={{ padding: '28px 22px' }}>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                      { l: 'payment_fingerprint_match', v: 0.64, on: true },
                      { l: 'address_normalization_match', v: 0.58, on: true },
                      { l: 'device_reuse_observed', v: 0.51, on: true },
=======
                      { l: 'payment_fingerprint_reuse', v: 0.64, on: true },
                      { l: 'device_fingerprint_match', v: 0.59, on: true },
                      { l: 'browser_fingerprint_overlap', v: 0.53, on: true },
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
              <div
                style={{
                  borderTop: '1px solid #D8D0BD',
                  padding: '18px 22px',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
                  gap: '18px',
                  background: '#FCFAF4',
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: '#8A8472',
                      marginBottom: '10px',
                    }}
                  >
                    FIELD PROVENANCE
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '8px 12px',
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10.5px',
                      color: '#4A4640',
                    }}
                  >
                    {[
                      'order_id', 'order_date', 'order_value', 'sku/category',
                      'refund_reason', 'chargeback_status', 'device_fingerprint', 'payment_fingerprint',
                      'ip_address', 'browser_fingerprint', 'carrier', 'delivery_status',
                    ].map((field) => (
                      <span key={field} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {field}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: '#8A8472',
                      marginBottom: '10px',
                    }}
                  >
                    ORDER / CLAIM TIMELINE
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '90px 1fr 80px',
                      gap: '8px 10px',
                      alignItems: 'center',
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '10.5px',
                      color: '#4A4640',
                    }}
                  >
                    {[
                      ['2026-04-21', 'order_0083 placed', 'HeyGlow'],
                      ['2026-04-24', 'refund requested', 'HeyGlow'],
                      ['2026-05-02', 'INR (Item Not Received) filed', 'Murmur'],
                      ['2026-05-07', 'chargeback opened', 'Northbound'],
                    ].map(([d, event, merchant]) => (
                      <div key={`${d}-${event}-${merchant}`} style={{ display: 'contents' }}>
                        <span style={{ color: '#8A8472' }}>{d}</span>
                        <span style={{ color: '#1A1814' }}>{event}</span>
                        <span style={{ color: '#7B2D26', textAlign: 'right' }}>{merchant}</span>
                      </div>
                    ))}
                  </div>
                </div>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                      <TypedText
                        text={row.note ? `${row.m}²` : row.m}
                        delay={heroNetworkDelay + i * 80}
                        speed={12}
                        style={{ color: t.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      />
                      <TypedText text={row.o} delay={heroNetworkDelay + i * 80 + 120} speed={13} style={{ color: t.inkSecondary }} />
=======
                      <span style={{ color: '#1A1814', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.m}
                      </span>
                      <span style={{ color: '#4A4640' }}>{row.o}</span>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                  >
                  <TypedText text="▸ SIGNAL PATTERN DETECTED · COMPILE SIGNAL DATA FOR 2 OPEN DISPUTES" delay={heroActionDelay} speed={10} />
=======
                >
                  ▸ EXPORT CASE FILE · 2 OPEN DISPUTES
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#8A8472', letterSpacing: '0.04em' }}>
              <span>median resolution: 38s</span>
              <span style={{ color: '#D8D0BD' }}>·</span>
              <span>case file ready in browser</span>
>>>>>>> Stashed changes
            </div>
          </Reveal>

        </div>{/* end lg:grid */}
      </section>

      {/* ── Shopify Connect ─────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="mx-auto max-w-[1400px] px-6 md:px-10 pt-14 md:pt-16 pb-10 md:pb-12"
        style={{ background: t.bg }}
      >
        <Reveal delay={40} className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 items-start">
          <div>
            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.accent, marginBottom: '10px' }}>
              § 2 — SHOPIFY INTEGRATION
            </p>
            <h2 style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 'clamp(24px,2.1vw,34px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: 0, color: t.ink }}>
              Connect Shopify in under a minute.
            </h2>
            <p style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '15px', color: t.inkSecondary, lineHeight: 1.6, marginTop: '14px', maxWidth: '62ch' }}>
              No engineering lift. Connect once, sync orders and dispute evidence automatically, and move straight into case review.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="ua-schema-chip" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: t.inkSecondary, background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: '4px', padding: '4px 8px' }}>Read-only scopes</span>
              <span className="ua-schema-chip" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: t.inkSecondary, background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: '4px', padding: '4px 8px' }}>No checkout changes</span>
              <span className="ua-schema-chip" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: t.inkSecondary, background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: '4px', padding: '4px 8px' }}>No CSV after connect</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/settings/integrations"
                style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', fontWeight: 600, color: t.bg, background: t.accent, padding: '9px 14px', border: `1px solid ${t.accent}`, borderRadius: '6px', textDecoration: 'none' }}
                className="hover:bg-[var(--landing-accent-hover)]"
              >
                Connect Shopify →
              </a>
              <a
                href="/demo"
                style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', fontWeight: 600, color: t.inkSecondary, background: t.surfaceAlt, padding: '9px 14px', border: `1px solid ${t.border}`, borderRadius: '6px', textDecoration: 'none' }}
                className="hover:underline"
              >
                Watch 30-sec demo
              </a>
            </div>
          </div>

          <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: '6px', overflow: 'hidden' }}>
            {[
              ['1', 'Connect store', 'Install app and authorize your Shopify store.'],
              ['2', 'Auto-sync data', 'Orders, fulfillment, and claim context start syncing immediately.'],
              ['3', 'Review and close cases', 'Fraud team works a live queue with status + evidence links.'],
            ].map(([step, title, copy], i) => (
              <div key={title} style={{ padding: '14px 16px', borderTop: i === 0 ? 'none' : `1px solid ${t.border}` }}>
                <div className="flex items-start gap-3">
                  <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: t.bg, background: t.accent, borderRadius: '3px', padding: '2px 6px', lineHeight: 1.4 }}>{step}</span>
                  <div>
                    <p style={{ margin: 0, fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', fontWeight: 600, color: t.ink }}>{title}</p>
                    <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif, serif)', fontSize: '13px', color: t.inkSecondary, lineHeight: 1.5 }}>{copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── §1 · The pattern your store can't see — VISUAL ───────── */}
      <section
        className="ua-why-matters w-full -mt-[0vh] pb-6 md:pb-20"
        style={{ background: t.darkBg, position: 'relative', zIndex: 1 }}
      >
        <VerdictTicker />
        <style>{`
          @media (min-width: 1024px) {
            .ua-why-matters-grid { transform: translateY(-5vh); }
          }
        `}</style>
        <div className="ua-why-matters-grid mx-auto max-w-[1400px] px-6 md:px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-8 md:mt-14">
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
            <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-4 min-[390px]:gap-6 mt-7 pt-6" style={{ borderTop: '1px solid rgba(212,199,175,0.24)' }}>
              {[
                { v: 89,  prefix: '$', suffix: 'B', dec: 0, l: 'Estimated annual loss to refund and INR fraud across US ecommerce', n: 3 },
                { v: 20,  prefix: '',  suffix: '%', dec: 0, l: 'Of DTC refund claims attributed to repeat abusers across multiple stores', n: 4 },
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

<<<<<<< Updated upstream
          {/* Right: rolling notifications — same buyer across 7 stores */}
          <Reveal className="lg:col-span-9" delay={140}>
            <HeroNotificationArtifact />
=======
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
                          key={row.merchant}
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
                          key={`m-${row.merchant}`}
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
                  At each store, a normal customer. Across the network — a single identity, 6 refunds, 4 INR (Item Not Received) claims.
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

>>>>>>> Stashed changes
          </Reveal>
        </div>
      </section>

      {/* ── §1.5 · Founding merchant testimonial ────────────────── */}
      <PipelineTabs />

      {/* ── §3 · Data Schema ───────────────────────────────────────── */}
      <section style={{ background: t.bg }}>
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
          <Reveal delay={40} style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div>
<<<<<<< Updated upstream
              <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.accent, marginBottom: '10px' }}>§ 3 — DATA SCHEMA</p>
              <h2 style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 'clamp(22px, 2vw, 32px)', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.08, color: t.ink, margin: 0 }}>Use data you already have.</h2>
            </div>
            <p style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '14px', color: t.inkSecondary, lineHeight: 1.6, maxWidth: '380px', margin: 0 }}>Standard order, refund, delivery, and payment exports. No integration required.</p>
          </Reveal>

          <Reveal delay={120} className="ua-hover-glow" style={{ background: t.darkCard, border: `1px solid ${t.darkBorder}`, borderRadius: '6px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 10px 36px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', borderBottom: `1px solid ${t.darkBorder}`, background: t.darkBg, gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: t.darkBright, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ffffff' }}>● CSV UPLOAD — WORKS TODAY</span>
              </div>
              <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', letterSpacing: '0.06em', color: '#ffffff', opacity: 0.7 }}>shopify · woocommerce · stripe · custom OMS</span>
            </div>
            <p style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '13px', color: '#ffffff', opacity: 0.72, lineHeight: 1.55, margin: 0, padding: '0 24px 16px', textAlign: 'left' }}>
              Works with partial data — every additional field strengthens identity confidence. Nothing is mandatory.
            </p>
=======
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
            </div>
            <div />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px" style={{ marginBottom: '0', background: '#2B2922', border: '1px solid #2B2922' }}>
            {/* Chart spans 8 */}
            <Reveal noFade className="lg:col-span-8 ua-chart-draw" style={{ background: '#15140F', padding: '24px 24px 16px' }} threshold={0.25}>
              <NetworkChart />
            </Reveal>

            {/* Metrics column 4 */}
            <div className="lg:col-span-4 grid grid-cols-1" style={{ background: '#2B2922', gap: '1px' }}>
              {[
                { l: 'pipeline latency', s: '38ms p95' },
                { l: 'hashing', s: 'HMAC-SHA256 · client-side only' },
                { l: 'k-anonymity gate', s: '≥3 merchants required to surface' },
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
                      fontSize: '16px',
                      color: '#E8E4D8',
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
            Network counts will publish once the founding cohort is live.
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
              body: 'Single signed object: risk_score, cluster_id, signals_fired, case file eligibility.',
              detail: 'Case file exports directly into your dispute response.',
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
                { g: 'DEFINITE', r: '0.85 – 1.00', a: 'Decline + export case file', c: '#7B2D26' },
                { g: 'PROBABLE', r: '0.65 – 0.84', a: 'hold order 24h · manual review',   c: '#B6512A' },
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
            <p
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '11px',
                color: '#8A8472',
                letterSpacing: '0.04em',
                marginTop: '10px',
                marginBottom: 0,
              }}
            >
              Built toward CE 3.0 representment. Founding merchants will be first to access the formatted packet once the framework is validated.
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
            Request access →
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
n.k@gmail.com                  [observed 1 merchant, low confidence]`}
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
Murmur Audio           $1,210.00     3 orders     2 INR filed
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
                Export case file · 2 open disputes
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
      <section id="run-free-audit" className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
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
            Two sample audits.
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
            Two audit views showing the shape of the output.
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
                { l: 'CASE FILE READINESS',    v: 71,  suffix: '%', s: '71%' },
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
              <div />
            </div>

            {/* Before / After bars */}
            <div className="space-y-4 mb-6 pb-5" style={{ borderBottom: '1px solid #ECE5D4' }}>
              {[
                { l: 'INR claim rate',     before: 9.4, after: 2.1, max: 12, unit: '%', dec: 1 },
                { l: 'case file readiness',    before: 18,  after: 64,  max: 100, unit: '%', dec: 0 },
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
>>>>>>> Stashed changes
            {([
              { label: 'Identity',      sensitive: true,  fields: ['email', 'phone', 'shipping_name', 'billing_name', 'customer_id'] },
              { label: 'Order',                           fields: ['order_id', 'order_date', 'order_value', 'item_count', 'sku / category'] },
              { label: 'Address',       sensitive: true,  fields: ['shipping_address', 'shipping_postcode', 'billing_address', 'billing_postcode'] },
              { label: 'Payment',       sensitive: true,  fields: ['payment_method', 'card_bin', 'card_last4'] },
              { label: 'Fulfillment',                     fields: ['carrier', 'tracking_number', 'delivery_status'] },
              { label: 'Abuse signals',                   fields: ['refund_requested', 'refund_reason', 'return_reason', 'chargeback_status'] },
            ] as { label: string; sensitive?: boolean; fields: string[] }[]).map((cat, ci) => (
              <div key={cat.label} className="ua-schema-row grid grid-cols-1 sm:grid-cols-[110px_minmax(0,1fr)]" style={{ borderTop: ci > 0 ? `1px solid ${t.darkBorder2}` : 'none' }}>
                <div style={{ padding: '12px 16px 12px 18px', borderRight: 'none', display: 'flex', alignItems: 'flex-start' }} className="sm:[border-right:1px_solid_var(--landing-dark-border-2)]">
                  <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: cat.sensitive ? '#d4a078' : '#ffffff', opacity: cat.sensitive ? 1 : 0.7, lineHeight: 1.8 }}>{cat.label}</span>
                </div>
                <div style={{ padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: '5px 6px', alignContent: 'flex-start' }}>
                  {cat.fields.map((f) => (
                    <span key={f} className="ua-schema-chip" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11.5px', letterSpacing: '0.01em', color: '#ffffff', background: cat.sensitive ? 'rgba(212,160,120,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${cat.sensitive ? 'rgba(212,160,120,0.3)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '3px', padding: '2px 7px', lineHeight: 1.7 }}>{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </Reveal>

          <Reveal delay={200} className="ua-hover-glow grid grid-cols-1 md:grid-cols-[auto_1fr_auto]" style={{ background: 'rgba(19, 18, 16, 0.95)', border: `1px dashed ${t.darkBorder}`, borderRadius: '6px', padding: '16px 18px', alignItems: 'center', gap: '14px', boxShadow: '0 10px 36px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)' }}>
            <div style={{ minWidth: '110px', flexShrink: 0 }}>
              <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ffffff', opacity: 0.7, margin: 0, lineHeight: 1.8 }}>◯ CHECKOUT EMBED — COMING SOON</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 6px' }}>
              {['device_fingerprint', 'browser_fingerprint', 'session_id', 'checkout_timestamp'].map((f) => (
                <span key={f} className="ua-schema-chip" style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11.5px', letterSpacing: '0.01em', color: '#ffffff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '3px', padding: '2px 7px', lineHeight: 1.7 }}>{f}</span>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontSize: '13px', color: '#ffffff', opacity: 0.8, lineHeight: 1.55, margin: 0, maxWidth: '290px', textAlign: 'left' }} className="md:text-right">Captures device, session, and behavioural signals at the moment of transaction — stronger identity links, no CSV needed.</p>
          </Reveal>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${t.lineFaint}`, margin: 0 }} />

      {/* ── §4 · Merchant Dashboard ────────────────────────────────── */}
      <section className="ua-section-quiet mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" suppressHydrationWarning>
        <div className="grid grid-cols-1 lg:grid-cols-[38fr_62fr] gap-8 md:gap-12 items-center">
          <Reveal delay={40}>
            <p style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '11px', fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: t.accent, marginBottom: '20px', lineHeight: 1.6,
            }}>
              § 4 — MERCHANT DASHBOARD
            </p>
            <h2 style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 'clamp(28px, 2.8vw, 40px)',
              fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.05,
              color: t.ink, marginBottom: '10px',
            }}>
              Your fraud exposure,{' '}
              <span style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontWeight: 400, color: t.inkMuted }}>
                ranked and ready to act on.
              </span>
            </h2>
            <p style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(15px, 1.1vw, 17px)',
              lineHeight: 1.55, color: t.inkSecondary, margin: 0,
            }}>
              Linked identities, confidence grades, claims history, evidence packets, and network exposure — all in one audit view.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              {[
                ['$8.8k', 'order value linked'],
                ['4', 'customers to review'],
                ['292', 'transactions analysed'],
                ['6', 'evidence packets ready'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  style={{
                    border: `1px solid ${t.border}`,
                    background: t.paper,
                    borderRadius: '6px',
                    padding: '14px 13px',
                    boxShadow: '0 10px 30px rgba(26,24,20,0.08)',
                  }}
                >
                  <p style={{ fontFamily: t.sans, fontSize: '24px', lineHeight: 1, color: t.ink, margin: '0 0 8px', fontWeight: 500 }}>{value}</p>
                  <p style={{ fontFamily: t.mono, fontSize: '9px', lineHeight: 1.45, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.inkTertiary, margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>
            <div className="ua-hover-glow hidden sm:block" style={{
              border: `1px solid ${t.border}`,
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 10px 36px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.07)',
            }}>
              <img
                src="/screenshots/dashboard.png"
                alt="Unauth merchant dashboard showing fraud rate, transaction volume, chargeback trend, and identity match breakdown"
                loading="lazy"
                width={2880}
                height={1800}
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${t.lineFaint}`, margin: 0 }} />

      {/* ── §5 · Comparison matrix ──────────────────────────────── */}
      <section className="ua-section-flow mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" suppressHydrationWarning>

        <Reveal delay={40} className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-12 items-start lg:items-center mb-6">
          <div>
            <p style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '11px', fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: t.accent, marginBottom: '12px', lineHeight: 1.6,
            }}>
              § 5 — HOW UNAUTH COMPARES
            </p>
            <h2 style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 'clamp(28px, 2.8vw, 40px)',
              fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.05,
              color: t.ink, margin: 0,
            }}>
              Checkout tools miss what happens after.
            </h2>
          </div>
          <p style={{
            fontFamily: 'var(--font-serif, serif)',
            fontSize: 'clamp(15px, 1.1vw, 17px)',
            color: t.inkSecondary, lineHeight: 1.55, margin: 0,
          }}>
            Unauth finds refund abuse, friendly fraud, and INR cycles after the transaction clears.
          </p>
        </Reveal>

        {/* Comparison data */}
        {(() => {
          const rows = [
            { cap: 'Resolves cross-merchant identity',       a: 'no',      b: 'no',      c: 'yes', note: 'linked across multiple merchants' },
            { cap: 'Catches friendly fraud / INR cycles',    a: 'no',      b: 'partial', c: 'yes', note: 'post-purchase patterns' },
<<<<<<< Updated upstream
            { cap: 'Surfaces network-known abusers',         a: 'partial', b: 'no',      c: 'yes', note: 'only surfaces when confirmed across 3+ merchants' },
            { cap: 'Explainable signals (no black box)',     a: 'partial', b: 'no',      c: 'yes', note: 'every flag documented' },
            { cap: 'Generates representment-ready case file', a: 'no',      b: 'no',      c: 'yes', note: 'chargeback evidence packet' },
            { cap: 'Works from CSV upload — no code required', a: 'no',    b: 'no',      c: 'yes', note: 'start with exports you already have' },
            { cap: 'You keep the decline decision — no black box blocks', a: 'no', b: 'no', c: 'yes', note: 'advises, never auto-blocks' },
            { cap: 'PII stays encrypted — never exposed in transit', a: 'no', b: 'no', c: 'yes', note: 'client-side HMAC-SHA256' },
=======
            { cap: 'Surfaces network-known abusers',         a: 'partial', b: 'no',      c: 'yes', note: 'k-anon gated at 3+ merchants' },
            { cap: 'Explainable signals (no black box)',     a: 'yes',     b: 'no',      c: 'yes', note: 'every flag documented' },
            { cap: 'CE 3.0 evidence packet',       a: 'no',      b: 'no',      c: 'partial', note: 'in development' },
            { cap: 'Requires checkout integration',          a: 'no',      b: 'yes',     c: 'no',  note: 'CSV is enough' },
            { cap: 'Auto-declines orders for you',           a: 'yes',     b: 'yes',     c: 'no',  note: 'you keep the decision' },
            { cap: 'PII leaves the merchant in clear text',  a: 'yes',     b: 'yes',     c: 'no',  note: 'client-side HMAC-SHA256' },
>>>>>>> Stashed changes
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
          return (
            <>
              {/* ── Desktop / tablet grid (hidden below sm) ── */}
              <Reveal delay={120} className="hidden sm:block ua-glass-card ua-hover-glow" style={{ border: `1px solid ${t.border}`, background: '#ffffff', overflow: 'hidden', boxShadow: '0 10px 36px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.07)' }}>
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
                    key={cap}
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
              </Reveal>

              {/* ── Mobile compact matrix (hidden above sm) ── */}
              <Reveal delay={120} className="sm:hidden ua-glass-card ua-hover-glow" style={{ border: `1px solid ${t.border}`, background: '#ffffff', overflow: 'hidden', boxShadow: '0 10px 36px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.07)' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: '10px', flexWrap: 'wrap', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '10.5px', color: t.inkSecondary }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{indicator('yes', true)} Included</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{indicator('partial')} Partial</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{indicator('no')} Not included</span>
                </div>
                {rows.map(({ cap, a, b, c, note }, i) => (
                  <Reveal
                    key={`m-${cap}`}
                    delay={60 + i * 50}
                    style={{
                      padding: '15px 16px',
                      borderBottom: i < 7 ? `1px solid ${t.border}` : 'none',
                    }}
                  >
                    <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', color: t.ink, fontWeight: 500, marginBottom: '3px', lineHeight: 1.3 }}>
                      {cap}
                    </p>
                    <p style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontSize: '12px', color: t.inkTertiary, marginBottom: '10px', lineHeight: 1.35 }}>
                      {note}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                      {[
                        { label: 'Lists', val: a },
                        { label: 'Scoring', val: b },
                        { label: 'Unauth', val: c, highlight: true },
                      ].map(({ label, val, highlight }) => (
                        <div
                          key={label}
                          style={{
                            minHeight: '58px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 6px',
                            background: highlight ? 'rgba(123,45,38,0.06)' : t.surfaceWarm,
                            border: `1px solid ${highlight ? t.accent : t.border}`,
                            borderRadius: '4px',
                          }}
                        >
                          {indicator(val, Boolean(highlight))}
                          <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: highlight ? t.accent : t.inkTertiary, textAlign: 'center' }}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Reveal>
                ))}
              </Reveal>
            </>
          );
        })()}
      </section>

<<<<<<< Updated upstream
      {/* ── §6 · Frequent Questions ─────────────────────────────── */}
      <section
        style={{ background: t.darkBg, position: 'relative', zIndex: 1 }}
      >
        <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-16 md:py-24 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-12 xl:gap-16">

          {/* Left — sticky heading block */}
          <div className="mb-12 lg:mb-0">
            <Reveal className="lg:sticky lg:top-24" delay={40}>
=======
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
          <div style={{ maxWidth: '760px' }}>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                § 6 — FREQUENT QUESTIONS
=======
                § 9 — RUN A FREE AUDIT
>>>>>>> Stashed changes
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
                  maxWidth: '320px',
                }}
              >
<<<<<<< Updated upstream
                <span style={{ whiteSpace: 'nowrap' }}>Everything you&rsquo;d ask</span>
                <br />
                <span style={{ fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', fontWeight: 400, color: t.darkLabel, whiteSpace: 'nowrap' }}>before committing.</span>
=======
                Find out who&apos;s been hitting you.
>>>>>>> Stashed changes
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
<<<<<<< Updated upstream
                  fontSize: '15px',
                  color: t.darkLabel,
                  lineHeight: 1.6,
                  marginBottom: '24px',
                }}
              >
                Data handling, privacy, integration, evidence — answered directly.
              </p>
              <a
                href="/audit"
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
            </Reveal>
          </div>

          {/* Right — accordion list */}
          <div>
            {[...faqFeatured, ...faqMore].map((item, i) => (
              <Reveal
                key={item.q}
                delay={Math.min(320, 60 + i * 22)}
              >
              <details
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
              </Reveal>
            ))}
=======
                  fontSize: 'clamp(16px, 1.2vw, 18px)',
                  lineHeight: 1.55,
                  color: '#B8B2A0',
                  maxWidth: '600px',
                  margin: 0,
                }}
              >
                Upload your last 90 days of orders and refunds. We&apos;ll run a fraud-resolution audit on your store data and email you the results — linked identities, repeat abuser clusters, and risk scores. Free. No account. No card. No integration.
              </p>

              <div
                style={{
                  background: '#1A1814',
                  border: '1px solid #2B2922',
                  padding: '22px',
                  marginTop: '24px',
                }}
              >
                <PublicAuditForm />
                <p
                  style={{
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: '12.5px',
                    color: '#8A8472',
                    lineHeight: 1.5,
                    marginTop: '14px',
                    marginBottom: 0,
                  }}
                >
                  Results land in your inbox in around 20 minutes. Your data is hashed before it leaves your browser. Unauth never sees raw PII.
                </p>
              </div>
>>>>>>> Stashed changes
          </div>
        </div>

<<<<<<< Updated upstream
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
      <footer style={{ background: footerStyles.shellBg, borderTop: `1px solid ${footerStyles.shellBorder}` }}>
=======
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
            [3, 'Visa, Friendly Fraud Annual Index, 2024. Includes refund abuse and INR fraud across all card types.'],
            [4, 'Industry estimates sourced from Visa and Mastercard published fraud data. Unauth network figures will be published once the founding merchant cohort is live.'],
            [5, 'Mastercard Merchant Survey, 2024. True cost includes fulfilment, reversed acquisition spend, and dispute fees.'],
            [6, 'Hashing is performed client-side using a per-merchant salt that Unauth never sees. The hashed values are queried against the network; raw PII never leaves the merchant’s browser.'],
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
        <p
          style={{
            fontFamily: 'var(--font-serif, serif)',
            fontStyle: 'italic',
            fontSize: '13px',
            color: '#8A8472',
            marginBottom: '16px',
          }}
        >
          Case files, audit outputs, and network figures shown are illustrative.
        </p>
>>>>>>> Stashed changes
        <div
          className="mx-auto max-w-[1100px] px-6 md:px-10 py-12 md:py-14"
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '13px',
            color: footerStyles.text,
          }}
        >
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div style={{ margin: 0 }}>
                <UnauthLogo variant="wordmark-dark" size={24} />
              </div>
              <p style={{ margin: '10px 0 0', lineHeight: 1.65, maxWidth: '42ch' }}>
                Risk intelligence for dispute-heavy commerce teams. We turn raw transaction logs into
                case-ready evidence and customer-level risk context in one workflow.
              </p>
              <p
                style={{
                  margin: '14px 0 0',
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '11px',
                  color: footerStyles.link,
                }}
              >
                Version issue-04 · build date {todayISO}
              </p>
            </div>

            <div>
              <p style={{ margin: 0, color: footerStyles.heading, fontWeight: 600, letterSpacing: '0.02em' }}>Product</p>
              <div className="mt-3 flex flex-col gap-2">
                <a href="/audit" style={{ color: footerStyles.link }} className="hover:underline">Audit portal</a>
                <a href="/signup" style={{ color: footerStyles.link }} className="hover:underline">Book a pilot</a>
                <a href="/demo" style={{ color: footerStyles.link }} className="hover:underline">Interactive demo</a>
              </div>
            </div>

            <div>
              <p style={{ margin: 0, color: footerStyles.heading, fontWeight: 600, letterSpacing: '0.02em' }}>Trust & legal</p>
              <div className="mt-3 flex flex-col gap-2">
                <a href="/legal/privacy" style={{ color: footerStyles.link }} className="hover:underline">Privacy notice</a>
                <a href="/legal/dpa" style={{ color: footerStyles.link }} className="hover:underline">Data Processing Addendum</a>
                <a href="/legal/data-handling" style={{ color: footerStyles.link }} className="hover:underline">Data handling</a>
                <a href="/legal/pilot-terms" style={{ color: footerStyles.link }} className="hover:underline">Pilot terms</a>
              </div>
            </div>

            <div>
              <p style={{ margin: 0, color: footerStyles.heading, fontWeight: 600, letterSpacing: '0.02em' }}>Contact</p>
              <div className="mt-3 flex flex-col gap-2">
                <a href="mailto:hello@unauth.co" style={{ color: footerStyles.link }} className="hover:underline">hello@unauth.co</a>
                <span style={{ color: footerStyles.link }}>London, UK</span>
                <span style={{ color: footerStyles.link }}>Support window: Mon-Fri, 09:00-18:00 GMT</span>
              </div>
            </div>
          </div>

          <div
            className="mt-10 pt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            style={{
              borderTop: `1px solid ${footerStyles.shellBorder}`,
              background: footerStyles.bottomBg,
              marginInline: footerStyles.bottomBg === 'transparent' ? 0 : '-24px',
              paddingInline: footerStyles.bottomBg === 'transparent' ? 0 : '24px',
              paddingBlock: footerStyles.bottomBg === 'transparent' ? 0 : '18px',
            }}
          >
            <p style={{ margin: 0, fontStyle: 'italic', fontFamily: 'var(--font-serif, serif)', fontSize: '12px' }}>
              Case files, audit outputs, and network figures shown on this page are illustrative examples only.
            </p>
            <span style={{ color: footerStyles.link }}>© 2026 Unauth. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
