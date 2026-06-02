import Link from 'next/link';
import { DotPattern } from '@/components/ui/dot-pattern';
import { Spotlight } from '@/components/ui/spotlight';
import LandingScreenshotFrame from '../LandingScreenshotFrame';
import Reveal from '../Reveal';
import HeroAuditCta from '../HeroAuditCta';
import { LandingHeroCaseCard } from './LandingHeroCaseCard';

export function LandingHeroSection({ todayISO }: { todayISO: string }) {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="ua-hero-canvas w-full overflow-hidden px-6 md:px-10 lg:px-0 pt-6 md:pt-8 pb-0" suppressHydrationWarning>
        <DotPattern
          width={32} height={32} cx={1} cy={1} cr={1.1}
          className="text-[var(--landing-accent)] opacity-[0.13] [mask-image:radial-gradient(ellipse_68%_60%_at_72%_28%,white,transparent)]"
        />
        <Spotlight fill="rgba(123,45,38,0.18)" className="-z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(430px,560px)_minmax(0,1fr)] gap-8 lg:gap-10 items-start lg:pl-[max(2.5rem,calc((100vw-1400px)/2+2.5rem))]">

        <Reveal delay={40} className="lg:pt-6">
          <p className="ua-landing-hero-eyebrow-inline">
            Cross-merchant fraud graph · ecommerce
            <span className="ua-landing-hero-eyebrow-date">
              Issue 04 · {todayISO}
            </span>
          </p>

          <h1 className="ua-landing-headline">
            Catch serial refund fraud before it{' '}
            <span className="ua-landing-headline-accent">
              costs you again.
            </span>
          </h1>

          <p className="ua-landing-hero-subprose">
            Upload your orders. We link refund abuse, INR claims, and friendly fraud across merchants - and hand you a scored case file.{' '}
            <span className="ua-landing-hero-subprose-strong">Free. No account. No integration.</span>
          </p>

          <div className="flex w-full flex-col gap-3">
            <HeroAuditCta />
            <Link href="#how-it-works" className="ua-landing-hero-cta-secondary">
              See how it works →
            </Link>
          </div>
        </Reveal>

        <Reveal as="div" className="ua-hero-stage relative mt-8 md:mt-14 lg:mt-0" delay={180} noFade>
            <div className="ua-landing-hero-artifact-eyebrow hidden md:flex items-center justify-between mb-3">
              <span>Inbox · matched orders</span>
              <span>25 open · $5,192 order value</span>
            </div>

            <LandingScreenshotFrame
              src="/screenshots/inbox.png"
              alt="Unauth inbox showing 25 open identity-matched cases with confidence grades, values, and crossmerchant signals"
            />

            <LandingHeroCaseCard />

            <div className="ua-landing-hero-artifact-eyebrow hidden flex-wrap items-center gap-x-5 gap-y-2 mt-4">
              <span>sample cluster · 11 orders analysed</span>
              <span className="text-[var(--landing-border)]">·</span>
              <span>pipeline latency: 38ms</span>
              <span className="text-[var(--landing-border)]">·</span>
              <span>Case file ready in browser</span>
            </div>

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
                <span key={chip} className="ua-landing-proof-chip">
                  {chip}
                </span>
              ))}
            </div>
          </Reveal>

        </div>
      </section>
    </>
  );
}
