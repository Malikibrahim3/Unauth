import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_FINAL, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/** Accent closer: display headline on the purple field, single CTA. */
export default function FoundationFinalCta() {
  return (
    <section className={styles.finalField}>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 py-28 sm:px-10 lg:py-36">
        <ParallaxLayer speed={0.3}>
          <Reveal>
            <h2 className="text-[var(--fl-on-color)]">
              {FL_FINAL.headlineLines.map((line) => (
                <span key={line} className={`${styles.displayFinal} block`}>
                  {/* trailing space keeps the accessible name word-separated */}
                  {line}{' '}
                </span>
              ))}
            </h2>
          </Reveal>
        </ParallaxLayer>
        <ParallaxLayer speed={0.14}>
        <Reveal delay={120}>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-8">
            <p className="max-w-[30rem] text-[1.0625rem] leading-[1.6] text-[rgba(251,251,250,0.85)]">
              {FL_FINAL.body}
            </p>
            <Link
              href={FL_ROUTES.audit}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--fl-paper)] px-7 py-4 text-[1.0625rem] font-semibold text-[var(--fl-ink)] transition-transform hover:scale-[1.02]"
            >
              {FL_FINAL.cta}
              <ArrowUpRight size={18} aria-hidden />
            </Link>
          </div>
        </Reveal>
        </ParallaxLayer>
      </div>
    </section>
  );
}
