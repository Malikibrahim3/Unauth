import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_PRICING } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

export default function FoundationPricingCredits() {
  const { credits, integration } = FL_PRICING;

  return (
    <section data-nav-theme="light" className={styles.pricingCreditsField}>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-20 sm:px-10 lg:pb-28">
        <ParallaxLayer speed={0.16}>
          <Reveal>
            <div className={styles.pricingCreditsPanel}>
              <h2 className={styles.landingSubsectionTitle}>{credits.heading}</h2>
              <p className={`${styles.landingSectionLead} mt-4 max-w-[42rem]`}>{credits.intro}</p>

              <div className="mt-8 overflow-hidden rounded-lg border border-black/[0.08] bg-white">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-black/[0.08] bg-[rgba(0,0,0,0.02)]">
                      <th className={`${styles.landingSectionEyebrow} px-5 py-3.5 normal-case tracking-[0.06em]`}>
                        Check type
                      </th>
                      <th className={`${styles.landingSectionEyebrow} px-5 py-3.5 normal-case tracking-[0.06em]`}>
                        Credits used
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {credits.rows.map(([type, amount]) => (
                      <tr key={type}>
                        <td className={`${styles.landingSectionBody} px-5 py-3.5 text-[var(--fl-ink)]`}>
                          {type}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[0.9375rem] font-medium text-[var(--fl-ink)]">
                          {amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className={`${styles.landingSectionBody} mt-6 max-w-[42rem]`}>{credits.footer}</p>

              <p className={`${styles.landingSectionBody} mt-8`}>
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
          </Reveal>
        </ParallaxLayer>
      </div>
    </section>
  );
}
