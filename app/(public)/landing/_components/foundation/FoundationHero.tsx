import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Layers } from 'lucide-react';
import UnauthEvidenceHeroCards from '@/components/UnauthEvidenceHeroCards';
import { HeroDrift } from './ParallaxLayer';
import { FL_HERO, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

function delay(ms: number): React.CSSProperties {
  return { '--d': `${ms}ms` } as React.CSSProperties;
}

/**
 * Full-viewport hero: photography fills the section; badge, headline, subhead,
 * and CTAs stacked left over the image's negative space.
 */
export default function FoundationHero() {
  return (
    <section
      data-nav-theme="light"
      className={`${styles.dusk} relative flex min-h-[100svh] flex-col justify-end overflow-hidden lg:h-[100svh] lg:min-h-0 lg:justify-center`}
    >
      <Image
        src="/hero-background.png"
        alt=""
        fill
        sizes="100vw"
        className={styles.heroImage}
        priority
        aria-hidden
      />
      <UnauthEvidenceHeroCards />
      <div className="relative z-20 mx-auto flex w-full max-w-[100rem] flex-1 flex-col justify-center px-5 pb-14 pt-[72px] sm:px-10 sm:pb-16 lg:pb-16 lg:pt-[88px]">
        <div className="min-w-0 max-w-[42.5rem] self-start">
          <HeroDrift factor={-0.22}>
            <div className={`${styles.riseIn} mb-7`} style={delay(60)}>
              <span className={styles.heroEyebrow}>
                <Layers size={14} strokeWidth={2} className={styles.heroEyebrowIcon} aria-hidden />
                {FL_HERO.eyebrow}
              </span>
            </div>
          </HeroDrift>

          <HeroDrift factor={-0.36}>
            <h1 className={styles.heroHeadline}>
              {FL_HERO.headlineLines.map((line, i) => (
                <span
                  key={line}
                  className={`${styles.riseIn} block`}
                  style={delay(120 + i * 90)}
                >
                  {line}
                </span>
              ))}
            </h1>
          </HeroDrift>

          <HeroDrift factor={-0.22}>
            <p className={`${styles.riseIn} ${styles.heroSubhead} mt-6`} style={delay(420)}>
              {FL_HERO.subcopy}
            </p>

            <div
              className={`${styles.riseIn} mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6`}
              style={delay(560)}
            >
              <Link href={FL_ROUTES.audit} prefetch={false} className={styles.heroCtaPrimary}>
                {FL_HERO.primaryCta}
                <ChevronRight size={16} aria-hidden />
              </Link>
              <Link href="/landing#how-it-works" className={styles.heroCtaSecondary}>
                {FL_HERO.secondaryCta}
                <ChevronRight size={16} aria-hidden />
              </Link>
            </div>
          </HeroDrift>
        </div>
      </div>
    </section>
  );
}
