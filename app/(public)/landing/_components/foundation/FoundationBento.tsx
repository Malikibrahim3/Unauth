import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_BENTO, FL_BENTO_SOURCES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/**
 * Compressed stat strip — three headline numbers in a single row.
 * Demoted from a full-bleed bento to a closing credibility beat.
 */
export default function FoundationBento() {
  return (
    <section id="network" aria-labelledby="fl-bento-heading" className="bg-[var(--fl-bg)]">
      <h2 id="fl-bento-heading" className="sr-only">
        Post-checkout claims by the numbers
      </h2>
      <ParallaxLayer speed={0.28}>
      <Reveal>
        <div className="mx-auto w-full max-w-[100rem] px-5 py-20 sm:px-10 lg:py-24">
          <div className="grid grid-cols-1 gap-0 border-t border-[var(--fl-line-strong)] sm:grid-cols-3">
            {FL_BENTO.map((stat) => (
              <div
                key={stat.value}
                className="flex flex-col gap-4 border-b border-[var(--fl-line)] py-10 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-10 sm:first:pl-0 sm:last:pr-0"
              >
                <p className={`${styles.bentoNumeral} text-[var(--fl-ink)]`}>
                  {stat.value}
                </p>
                <p className="text-[0.9375rem] leading-snug text-[var(--fl-ink-secondary)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[0.75rem] leading-relaxed text-[var(--fl-ink-tertiary)]">
            <span className="font-medium text-[var(--fl-ink-secondary)]">Sources:</span>{' '}
            {FL_BENTO_SOURCES.join(' · ')}
          </p>
        </div>
      </Reveal>
      </ParallaxLayer>
    </section>
  );
}
