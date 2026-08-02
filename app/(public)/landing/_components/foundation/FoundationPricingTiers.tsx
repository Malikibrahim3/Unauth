import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { LANDING_PRICING_TIERS } from '@/lib/billing/landingTierChart';
import Reveal from '../Reveal';
import { FL_PRICING, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

function tierCta(tierKey: string, custom: boolean) {
  if (custom) return { label: FL_PRICING.ctaCustom, href: FL_ROUTES.audit };
  if (tierKey === 'pro') return { label: FL_PRICING.ctaPro, href: FL_ROUTES.signup };
  return { label: FL_PRICING.ctaDefault, href: FL_ROUTES.signup };
}

export default function FoundationPricingTiers() {
  return (
    <section data-nav-theme="light" className={styles.pricingField}>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-16 pt-28 sm:px-10 lg:pb-24 lg:pt-36">
        <Reveal>
          <div className="mb-14 max-w-[52rem]">
            <h1 className={`${styles.landingSectionTitle} text-[var(--fl-ink)]`}>
              {FL_PRICING.headline}
            </h1>
            <p className={`${styles.landingSectionLead} mt-6 text-[var(--fl-ink-secondary)]`}>
              {FL_PRICING.lead}
            </p>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className={styles.pricingLedger}>
            <table>
              <caption className="sr-only">Unauth plans, pricing, included capabilities, and signup actions</caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.pricingLedgerAxis}>Plan</th>
                  {LANDING_PRICING_TIERS.map((tier) => {
                    const featured = tier.key === FL_PRICING.featuredTierKey;
                    return (
                      <th key={tier.key} scope="col" data-featured={featured || undefined}>
                        <h2 className={styles.pricingLedgerPlan}>{tier.name}</h2>
                        {featured ? <span className={styles.pricingTierBadge}>Recommended</span> : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Price</th>
                  {LANDING_PRICING_TIERS.map((tier) => (
                    <td key={tier.key} data-featured={tier.key === FL_PRICING.featuredTierKey || undefined}>
                      <p className={styles.pricingTierPrice}>{tier.price}</p>
                      {tier.priceNote ? <p className={styles.pricingLedgerNote}>{tier.priceNote}</p> : null}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Best for</th>
                  {LANDING_PRICING_TIERS.map((tier) => (
                    <td key={tier.key} data-featured={tier.key === FL_PRICING.featuredTierKey || undefined}>
                      <p className={styles.pricingLedgerTagline}>{tier.tagline}</p>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Included</th>
                  {LANDING_PRICING_TIERS.map((tier) => (
                    <td key={tier.key} data-featured={tier.key === FL_PRICING.featuredTierKey || undefined}>
                      <ul className={styles.pricingTierFeatures}>
                        {tier.features.map((feature) => (
                          <li key={feature}><Check size={15} strokeWidth={2} aria-hidden /><span>{feature}</span></li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row"><span className="sr-only">Choose plan</span></th>
                  {LANDING_PRICING_TIERS.map((tier) => {
                    const featured = tier.key === FL_PRICING.featuredTierKey;
                    const cta = tierCta(tier.key, tier.price === 'Custom');
                    return (
                      <td key={tier.key} data-featured={featured || undefined}>
                        <Link href={cta.href} prefetch={false} className={`${styles.pricingTierCta} ${featured ? styles.pricingTierCtaPrimary : styles.pricingTierCtaSecondary}`}>
                          {cta.label}<ArrowUpRight size={15} aria-hidden />
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.pricingLedgerFootnote}>Create a workspace, then choose your plan in Billing. No customer payout is ever sent without a merchant decision.</p>
        </Reveal>
      </div>
    </section>
  );
}
