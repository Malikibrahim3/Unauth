import Link from 'next/link';
import Reveal from '../Reveal';
import {
  LANDING_GOOD_CUSTOMERS_COPY,
  LANDING_PRICING_TEASER,
  LANDING_PRIVACY_NETWORK_COPY,
  LANDING_PRODUCT_LADDER,
  LANDING_UPGRADE_LADDER,
  LANDING_FREE_WEDGE_COPY,
} from '../../landingPageConstants';

export function LandingProductTierSection() {
  return (
    <>
      <section className="ua-section-flow mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
        <Reveal delay={40}>
          <p className="ua-landing-section-eyebrow">Product tiers</p>
          <h2 className="ua-landing-section-title">
            Free chargeback evidence.{' '}
            <span className="ua-landing-section-title-italic">Paid claim confidence.</span>
          </h2>
          <p className="ua-landing-section-body max-w-3xl">
            Unauth is a merchant-side trust network for ecommerce claims, chargebacks, and post-purchase risk —
            without turning genuine customers into false positives.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {LANDING_PRODUCT_LADDER.map((card, i) => (
            <Reveal key={card.tier} delay={80 + i * 60}>
              <article
                className="ua-glass-card h-full flex flex-col p-5 border rounded-xl"
                style={{ borderColor: 'var(--landing-border)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--landing-accent)' }}>
                  {card.tier}
                </p>
                <h3 className="mt-2 text-lg font-semibold" style={{ color: 'var(--landing-ink)' }}>
                  {card.title}
                </h3>
                <p className="mt-2 text-sm flex-1" style={{ color: 'var(--landing-ink-muted)' }}>
                  {card.body}
                </p>
                {card.future ? (
                  <p className="mt-3 text-xs font-medium" style={{ color: 'var(--landing-ink-muted)' }}>
                    Planned — not live in this release
                  </p>
                ) : null}
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="ua-section-quiet mx-auto max-w-[1400px] px-6 md:px-10 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Reveal delay={40}>
            <h3 className="ua-landing-section-title text-2xl">Why merchants upgrade</h3>
            <ul className="mt-4 space-y-3 text-sm" style={{ color: 'var(--landing-ink-muted)' }}>
              {LANDING_UPGRADE_LADDER.map((item) => (
                <li key={item.tier}>
                  <span className="font-semibold" style={{ color: 'var(--landing-ink)' }}>{item.tier}</span>
                  {' — '}
                  {item.copy}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={100}>
            <h3 className="ua-landing-section-title text-2xl">Good customers matter too</h3>
            <p className="mt-4 text-sm" style={{ color: 'var(--landing-ink-muted)' }}>
              {LANDING_GOOD_CUSTOMERS_COPY}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-12 md:py-16">
        <Reveal delay={40}>
          <h3 className="ua-landing-section-title text-2xl">{LANDING_FREE_WEDGE_COPY.title}</h3>
          <p className="mt-4 text-sm max-w-3xl" style={{ color: 'var(--landing-ink-muted)' }}>
            {LANDING_FREE_WEDGE_COPY.body}
          </p>
        </Reveal>
      </section>

      <section className="ua-section-quiet mx-auto max-w-[1400px] px-6 md:px-10 py-12 md:pb-16">
        <Reveal delay={40}>
          <h3 className="ua-landing-section-title text-2xl">Privacy-preserving network intelligence</h3>
          <p className="mt-4 text-sm max-w-3xl" style={{ color: 'var(--landing-ink-muted)' }}>
            {LANDING_PRIVACY_NETWORK_COPY}
          </p>
        </Reveal>
      </section>

      <section id="pricing" className="mx-auto max-w-[1400px] px-6 md:px-10 pb-16 md:pb-20">
        <Reveal delay={40}>
          <p className="ua-landing-section-eyebrow">Planned pricing</p>
          <h2 className="ua-landing-section-title">Starting from</h2>
          <p className="ua-landing-section-body text-sm mb-8">
            Indicative pricing only — no billing or checkout in this release.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LANDING_PRICING_TEASER.map((row) => (
              <div
                key={row.tier}
                className="rounded-xl border p-5"
                style={{ borderColor: 'var(--landing-border)', background: 'var(--landing-surface)' }}
              >
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--landing-accent)' }}>
                  {row.tier}
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: 'var(--landing-ink)' }}>
                  {row.price}
                </p>
                <p className="mt-2 text-xs" style={{ color: 'var(--landing-ink-muted)' }}>
                  {row.note}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/upload" className="ua-landing-link-primary">
              Start free evidence →
            </Link>
            <Link href="/demo" className="ua-landing-link-secondary hover:underline">
              Pro claim confidence demo →
            </Link>
          </div>
        </Reveal>
      </section>

      <hr className="ua-landing-hr-faint" />
    </>
  );
}
