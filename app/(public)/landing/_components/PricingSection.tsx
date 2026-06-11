import Link from 'next/link';
import { Check } from 'lucide-react';
import { LANDING_PRICING_TIERS } from '@/lib/billing/landingTierChart';
import { PRICING, ROUTES } from '../_lib/content';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

/**
 * Pricing as one ruled grid (not four floating cards) — tiers read as
 * columns of the same table, with Pro lifted by a lime keyline only.
 * Tier data comes from lib/billing/landingTierChart (source of truth).
 */
export default function PricingSection() {
  return (
    <section id="pricing" className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28">
      <Reveal>
        <SectionHeader eyebrow={PRICING.eyebrow} headline={PRICING.headline} body={PRICING.note} />
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-12 grid overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-raised)] sm:grid-cols-2 lg:grid-cols-4">
          {LANDING_PRICING_TIERS.map((tier) => {
            const featured = tier.key === PRICING.featuredKey;
            const custom = tier.price === 'Custom';
            return (
              <div
                key={tier.key}
                className="relative flex flex-col border-[var(--border-default)] p-6 max-sm:[&:not(:first-child)]:border-t sm:max-lg:[&:nth-child(n+3)]:border-t sm:max-lg:[&:nth-child(odd)]:border-r lg:[&:not(:first-child)]:border-l"
              >
                {featured ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-0.5 bg-[var(--lime)]"
                  />
                ) : null}
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[0.9375rem] font-semibold text-[var(--ink-primary)]">
                    {tier.name}
                  </h3>
                  {featured ? (
                    <span className="rounded-full bg-[var(--lime)] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.06em] text-[var(--lime-fg)]">
                      most teams
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 font-mono text-[1.625rem] font-medium leading-none text-[var(--ink-primary)]">
                  {tier.price}
                </p>
                <p className="mt-2 min-h-[1rem] font-mono text-[0.6875rem] text-[var(--ink-tertiary)]">
                  {tier.priceNote ?? '\u00A0'}
                </p>
                <p className="mt-3 text-[0.8125rem] leading-snug text-[var(--ink-secondary)]">
                  {tier.tagline}
                </p>
                <ul className="mt-5 flex-1 space-y-2.5 border-t border-[var(--border-subtle)] pt-5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[0.8125rem] leading-snug text-[var(--ink-secondary)]">
                      <Check size={13} className="mt-0.5 shrink-0 text-[var(--ink-tertiary)]" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={custom ? ROUTES.demo : ROUTES.signup}
                  className={`mt-6 rounded-[var(--radius-md)] px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                    featured
                      ? 'bg-[var(--action-primary)] text-[var(--ink-inverse)] hover:bg-[var(--action-primary-hover)]'
                      : 'border border-[var(--border-default)] text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {custom ? PRICING.ctaCustom : PRICING.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
