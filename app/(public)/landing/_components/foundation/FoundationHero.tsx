import Image from 'next/image';
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
      className={`${styles.dusk} relative overflow-hidden`}
    >
      <div className={styles.heroLayout}>
        <div className={styles.heroCopy}>
          {FL_HERO.eyebrow ? (
            <div className={`${styles.riseIn} mb-8`} style={delay(60)}>
              <span className={styles.heroEyebrow}>{FL_HERO.eyebrow}</span>
            </div>
          ) : null}

          <h1 className={styles.heroHeadline}>
            <span className={styles.riseIn} style={delay(120)}>
              {FL_HERO.headlineLines.join(' ')}
            </span>
          </h1>

          <p className={`${styles.riseIn} ${styles.heroSubtitle} mt-6`} style={delay(420)}>
            {FL_HERO.subtitle}
          </p>

          <div className={`${styles.riseIn} ${styles.heroCtaRow}`} style={delay(560)}>
            <Link href={FL_ROUTES.signup} prefetch={false} className={styles.heroCtaPrimary}>
              {FL_HERO.primaryCta}
              <ChevronRight size={16} aria-hidden />
            </Link>
            <Link href={FL_ROUTES.demo} prefetch={false} className={styles.heroCtaSecondary}>
              {FL_HERO.secondaryCta}
              <ChevronRight size={16} aria-hidden />
            </Link>
          </div>
          <p className={`${styles.riseIn} ${styles.heroAssurance}`} style={delay(640)}>
            {FL_HERO.assurance}
          </p>
        </div>

        <div className={styles.heroProductOuter}>
          <div className={styles.productProofTopline}>
            <span>Live product capture</span>
            <span>Fictional merchant workspace</span>
          </div>
          <Image
            src="/product-proof/case-evidence.webp"
            width={1520}
            height={950}
            priority
            sizes="(min-width: 1280px) 1180px, (min-width: 768px) 92vw, 94vw"
            className={styles.heroProductImage}
            alt="Unauth case review showing source-labelled commerce, helpdesk, warehouse, and carrier evidence for a deterministic fictional merchant"
          />
        </div>
      </div>
    </section>
  );
}
