import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '../Reveal';
import { FL_PRICING } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

export default function FoundationPricingCredits() {
  const { credits, integration } = FL_PRICING;

  return (
    <section data-nav-theme="light" className={styles.pricingCreditsField}>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-24 sm:px-10 lg:pb-32">
        <Reveal delay={60}>
          <div className="border-t border-[var(--fl-line)] pt-12">
            <h2 className={`${styles.landingSubsectionTitle} mb-8`}>{credits.heading}</h2>

            <ol className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-3">
              {credits.rows.map(([type, amount]) => (
                <li
                  key={type}
                  className="border-t-2 border-[var(--fl-line-strong)] pt-6"
                >
                  <p className={`${styles.pricingTierPrice} text-[1.75rem]`}>{amount}</p>
                  <p className={`${styles.landingSectionBody} mt-3 font-medium text-[var(--fl-ink)]`}>
                    {type}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap items-start justify-between gap-6">
              <p className={`${styles.landingSectionBody} max-w-[38rem] text-[var(--fl-ink-secondary)]`}>
                {credits.footer}
              </p>
              <p className={`${styles.landingSectionBody} shrink-0 text-[var(--fl-ink-secondary)]`}>
                {integration.prefix}{' '}
                <Link
                  href={integration.href}
                  className="inline-flex items-center gap-1 font-semibold text-[var(--fl-ink)] underline decoration-black/20 underline-offset-4 transition-colors hover:decoration-black/50"
                >
                  {integration.linkLabel}
                  <ArrowUpRight size={14} aria-hidden />
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
