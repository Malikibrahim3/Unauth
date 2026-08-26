import Image from 'next/image';
import Link from 'next/link';
import { FL_HERO, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

function delay(ms: number): React.CSSProperties {
  return { '--d': `${ms}ms` } as React.CSSProperties;
}

export default function FoundationHero() {
  return (
    <section
      id="gate"
      data-nav-theme="light"
      className={`${styles.dusk} relative overflow-hidden`}
    >
      <div className={styles.heroLayout}>
        <div className={styles.heroCopy}>
          {FL_HERO.eyebrow ? (
            <div className={`${styles.riseIn} ${styles.heroEyebrowWrap}`} style={delay(60)}>
              <span className={styles.heroEyebrow}>{FL_HERO.eyebrow}</span>
            </div>
          ) : null}

          <h1 className={styles.heroHeadline}>
            {FL_HERO.headlineLines.map((line, index) => (
              <span
                key={line}
                className={`${styles.riseIn} ${styles.heroHeadlineLine}`}
                style={delay(120 + index * 60)}
              >
                {line}{index < FL_HERO.headlineLines.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h1>

          <div className={styles.heroPitch}>
            <p className={`${styles.riseIn} ${styles.heroSubtitle}`} style={delay(300)}>
              {FL_HERO.subtitle}
            </p>

            <div className={`${styles.riseIn} ${styles.heroCtaRow}`} style={delay(360)}>
              <Link href={FL_ROUTES.gateInAction} prefetch={false} className={styles.heroCtaPrimary}>
                {FL_HERO.primaryCta}
              </Link>
            </div>

            {FL_HERO.assurance ? (
              <p className={`${styles.riseIn} ${styles.heroAssurance}`} style={delay(520)}>
                {FL_HERO.assurance}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.heroStage}>
          <div className={styles.heroProductOuter}>
            <div className={styles.heroProductFrame}>
              <div className={styles.heroProductChrome} aria-hidden="true">
                <span className={styles.heroProductTrafficLights}>
                  <span className={styles.heroProductTrafficLight} />
                  <span className={styles.heroProductTrafficLight} />
                  <span className={styles.heroProductTrafficLight} />
                </span>
              </div>
              <div className={styles.heroProductViewport}>
                <Image
                  src="/product-proof/hero-case-gate-hold-signal-3420x1920.png"
                  width={3420}
                  height={1920}
                  priority
                  fetchPriority="high"
                  quality={90}
                  sizes="(min-width: 1280px) 1280px, (min-width: 768px) 92vw, 94vw"
                  className={styles.heroProductImage}
                  alt="Unauth Case Review Workbench for fictional Asterlane Commerce Group showing a £128 refund request awaiting carrier clarification, with four of five evidence items present and no merchant decision recorded."
                />
              </div>
            </div>
            <div className={styles.heroProvenance}>
              <span>Fictional case · CASE-1ECF9 · £128 refund · Evidence 4/5</span>
              <span>Rule: Missing delivery evidence · External action: none</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
