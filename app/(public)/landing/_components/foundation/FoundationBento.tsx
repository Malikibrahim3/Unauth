import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_BENTO, FL_BENTO_SOURCES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

const toneClass = {
  purple: styles.metricCardPurple,
  dark: styles.metricCardDark,
  light: styles.metricCardLight,
} as const;

/**
 * Sourced metric cards — a staggered bridge between the pale editorial intro
 * and the dark evidence section, echoing the oversized numbered-card system.
 */
export default function FoundationBento() {
  return (
    <section
      id="network"
      aria-labelledby="fl-bento-heading"
      className={styles.metricBridge}
    >
      <h2 id="fl-bento-heading" className="sr-only">
        Post-checkout claims by the numbers
      </h2>
      <ParallaxLayer speed={0.28}>
      <Reveal>
        <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-20 pt-12 sm:px-10 sm:pb-24 lg:pb-36 lg:pt-20">
          <div className={styles.metricCardGrid}>
            {FL_BENTO.map((stat) => (
              <div
                key={stat.value}
                className={`${styles.metricCard} ${toneClass[stat.tone]}`}
              >
                <p
                  className={`${styles.metricCardValue} ${
                    stat.value.length > 4 ? styles.metricCardValueLong : ''
                  }`}
                >
                  {stat.value}
                </p>
                <div className={styles.metricCardFooter}>
                  <p className={styles.metricCardLabel}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
          <p className={`${styles.metricSources} mt-12 text-[0.75rem] leading-relaxed lg:mt-24`}>
            <span className="font-medium text-[var(--fl-dusk-ink-dim)]">Sources:</span>{' '}
            {FL_BENTO_SOURCES.join(' · ')}
          </p>
        </div>
      </Reveal>
      </ParallaxLayer>
    </section>
  );
}
