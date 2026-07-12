import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { FL_HERO, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

function delay(ms: number): React.CSSProperties {
  return { '--d': `${ms}ms` } as React.CSSProperties;
}

export default function FoundationHero() {
  return (
    <section
      data-nav-theme="light"
      className={`${styles.dusk} relative min-h-[132svh] overflow-hidden`}
    >
      <div className={styles.heroLayout}>

        {/* Left: text content */}
        <div className={styles.heroCopy}>
          {FL_HERO.eyebrow ? (
            <div className={`${styles.riseIn} mb-8`} style={delay(60)}>
              <span className={styles.heroEyebrow}>{FL_HERO.eyebrow}</span>
            </div>
          ) : null}

          <h1 className={styles.heroHeadline}>
            {FL_HERO.headlineLines.map((line, i) => (
              <span
                key={line}
                className={`${styles.riseIn} ${styles.heroHeadlineLine} ${i === 0 ? styles.heroHeadlineLinePrimary : ''}`}
                style={delay(120 + i * 90)}
              >
                {line}
              </span>
            ))}
          </h1>

          <p className={`${styles.riseIn} ${styles.heroSubtitle} mt-6`} style={delay(420)}>
            {FL_HERO.subtitle}
          </p>

          <div className={`${styles.riseIn} ${styles.heroCtaRow}`} style={delay(560)}>
            <Link href={FL_ROUTES.audit} prefetch={false} className={styles.heroCtaPrimary}>
              {FL_HERO.primaryCta}
              <ChevronRight size={16} aria-hidden />
            </Link>
            <Link href="/landing#how-it-works" className={styles.heroCtaSecondary}>
              {FL_HERO.secondaryCta}
              <ChevronRight size={16} aria-hidden />
            </Link>
          </div>
        </div>

        {/* Right: product artifact */}
        <div className={styles.heroProductOuter}>
          <iframe
            src="/hero-artifact.html"
            scrolling="no"
            className={styles.heroProductFrame}
            title="Product preview"
            tabIndex={-1}
          />
        </div>

      </div>
    </section>
  );
}
