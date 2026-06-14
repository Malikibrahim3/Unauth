import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { LANDING_PRICING_TIERS } from '@/lib/billing/landingTierChart';
import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_PRICING, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

function tierCta(tierKey: string, custom: boolean) {
  if (custom) return { label: FL_PRICING.ctaCustom, href: FL_ROUTES.audit };
  if (tierKey === 'pro') return { label: FL_PRICING.ctaTrial, href: FL_ROUTES.signup };
  return { label: FL_PRICING.ctaDefault, href: FL_ROUTES.signup };
}

export default function FoundationPricingTiers() {
  return (
    <section data-nav-theme="light" className={styles.pricingField}>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-16 sm:px-10 lg:pb-24">
        <ParallaxLayer speed={0.18}>
          <Reveal delay={80}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              {LANDING_PRICING_TIERS.map((tier) => {
                const featured = tier.key === FL_PRICING.featuredTierKey;
                const custom = tier.price === 'Custom';
                const cta = tierCta(tier.key, custom);

                const mobileOrder =
                  tier.key === 'pro'
                    ? 'order-1'
                    : tier.key === 'unauth'
                      ? 'order-2'
                      : tier.key === 'growth'
                        ? 'order-3'
                        : 'order-4';

                return (
                  <article
                    key={tier.key}
                    className={`${styles.pricingTierCard} ${mobileOrder} lg:order-none ${
                      featured ? styles.pricingTierCardFeatured : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className={styles.landingSubsectionTitle}>{tier.name}</h2>
                      {featured ? (
                        <span className={styles.pricingTierBadge}>Recommended</span>
                      ) : null}
                    </div>

                    <div className="mt-8">
                      <p className={styles.pricingTierPrice}>{tier.price}</p>
                      {tier.priceNote ? (
                        <p className={`${styles.landingSectionBody} mt-4 font-medium text-[var(--fl-ink)]`}>
                          {tier.priceNote}
                        </p>
                      ) : null}
                      <p className={`${styles.landingSectionBody} mt-3`}>{tier.tagline}</p>
                    </div>

                    <ul className={styles.pricingTierFeatures}>
                      {tier.features.map((feature) => (
                        <li key={feature}>
                          <Check size={15} strokeWidth={2} aria-hidden />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      <Link
                        href={cta.href}
                        className={
                          featured ? styles.pricingTierCtaPrimary : styles.pricingTierCtaSecondary
                        }
                      >
                        {cta.label}
                        <ArrowUpRight size={15} aria-hidden />
                      </Link>
                      {featured ? (
                        <p className={`${styles.landingSectionBody} mt-3 text-center text-[0.8125rem]`}>
                          {FL_PRICING.trialNote}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </Reveal>
        </ParallaxLayer>
      </div>
    </section>
  );
}
