import { Spotlight } from '@/components/ui/spotlight';
import { Cta } from '../ui/Cta';
import { Tag } from '../ui/Tag';
import { ProductFrame } from '../ui/ProductFrame';
import { LandingHeroCaseCard } from './LandingHeroCaseCard';

const HERO_TAGS = [
  { label: 'Order source connected', variant: 'status-live' as const },
  { label: 'Helpdesk connected', variant: 'status-live' as const },
  { label: 'HMAC-SHA256 hashing', variant: 'info' as const },
  { label: 'k-anonymity gating', variant: 'info' as const },
] as const;

const HERO_ANNOTATIONS = [
  { label: 'Confidence grade', x: '40%', y: '40%' },
];

export function LandingHeroSection({ todayISO: _todayISO }: { todayISO: string }) {
  return (
    <section
      className="ua-hero-canvas w-full overflow-hidden px-6 md:px-10 lg:px-0 pt-6 md:pt-8 pb-0"
      suppressHydrationWarning
    >
      <Spotlight fill="rgba(123,45,38,0.12)" className="-z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(430px,560px)_minmax(0,1fr)] gap-8 lg:gap-10 items-start lg:pl-[max(2.5rem,calc((100vw-1400px)/2+2.5rem))]">

        {/* ── Left column — static, always in first paint ── */}
        <div className="lg:pt-6">
          <p className="ua-landing-section-eyebrow">
            Live claim intelligence for ecommerce teams
          </p>

          <h1
            style={{
              fontFamily: 'var(--ua-font-display)',
              fontSize: 'var(--text-display-1)',
              fontWeight: 700,
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 'var(--leading-display)',
              color: 'var(--landing-ink)',
              marginBottom: '16px',
              maxWidth: '20ch',
            }}
          >
            Connect your store and helpdesk. Know which claims to trust.
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 'clamp(15px, 1.15vw, 18px)',
              color: 'var(--landing-ink-secondary)',
              lineHeight: '1.6',
              marginBottom: '28px',
              maxWidth: '44ch',
            }}
          >
            Unauth syncs orders, fulfillment, refunds, chargebacks, and support context into one
            merchant-controlled workspace.{' '}
            <strong style={{ color: 'var(--landing-ink)', fontWeight: 500 }}>
              Start with live sources; CSV is only for historical backfill.
            </strong>
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Cta href="/signup" variant="primary">Create workspace →</Cta>
            <Cta href="/demo" variant="secondary">View demo</Cta>
          </div>

          <div className="flex flex-wrap gap-2">
            {HERO_TAGS.map((t) => (
              <Tag key={t.label} variant={t.variant} showDot={t.variant === 'status-live'}>
                {t.label}
              </Tag>
            ))}
          </div>
        </div>

        {/* ── Right column — product frame ── */}
        <div className="ua-hero-stage relative mt-8 md:mt-14 lg:mt-0">
          <div className="ua-landing-hero-artifact-eyebrow hidden md:flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-4">
              <Tag variant="status-live" showDot>25 open</Tag>
              <span style={{ color: 'var(--landing-ink-tertiary)', fontSize: '12px' }}>evidence ready</span>
            </span>
            <span style={{ color: 'var(--landing-ink-tertiary)', fontSize: '12px' }}>pipeline latency: 38ms</span>
          </div>

          <ProductFrame
            src="/screenshots/inbox.png"
            alt="Unauth inbox showing 25 open identity-matched cases with confidence grades, values, and cross-merchant signals"
            chrome="browser"
            priority
            annotations={HERO_ANNOTATIONS}
          />

          <LandingHeroCaseCard />
        </div>

      </div>
    </section>
  );
}
