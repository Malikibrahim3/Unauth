import ParallaxLayer from './ParallaxLayer';
import Reveal from '../Reveal';
import { FL_BENTO } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

const SPEEDS = [0.12, 0.22, 0.30, 0.16, 0.26, 0.34];

export default function FoundationBento() {
  return (
    <section
      data-nav-theme="light"
      id="network"
      aria-labelledby="fl-bento-heading"
      className={styles.metricBridgeWhite}
    >
      <h2 id="fl-bento-heading" className="sr-only">
        Claim pressure by the numbers
      </h2>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-20 pt-16 sm:px-10 sm:pb-28 lg:pb-40 lg:pt-24">
        <div className={styles.metricCardGridSix}>
          {FL_BENTO.map((stat, i) => (
            <ParallaxLayer key={stat.value} speed={SPEEDS[i]}>
              <Reveal delay={i * 70}>
                <div className={styles.metricCardBlack}>
                  <p
                    className={`${styles.metricCardValue} ${
                      stat.value.length > 4 ? styles.metricCardValueLong : ''
                    }`}
                  >
                    {stat.value}
                  </p>
                  <div className={styles.metricCardFooter}>
                    <p className={styles.metricCardLabel}>{stat.label}</p>
                    <p className={styles.metricCardSource}>{stat.source}</p>
                  </div>
                </div>
              </Reveal>
            </ParallaxLayer>
          ))}
        </div>
      </div>
    </section>
  );
}
