import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Wordmark from '../Wordmark';
import { HeroDrift } from './ParallaxLayer';
import { FL_HERO, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

function delay(ms: number): React.CSSProperties {
  return { '--d': `${ms}ms` } as React.CSSProperties;
}

/**
 * Full-viewport dusk hero: wordmark + account CTAs along the top (these
 * scroll away; the fixed pill nav persists), three-line display headline
 * stacked left, glass identity phone right, subhead at the lower left.
 * The accent CTA bar lives on the scroll curtain (FoundationHeroCta).
 */
export default function FoundationHero() {
  return (
    <section
      className={`${styles.dusk} relative flex min-h-[100svh] flex-col justify-between overflow-hidden lg:h-[100svh] lg:min-h-0`}
    >
      <div className={styles.grain} aria-hidden />

      {/* top row: wordmark + account CTAs (scrolls with hero) */}
      <div className="relative z-10 mx-auto flex w-full max-w-[100rem] items-center justify-between px-5 pt-6 sm:px-10">
        <Link href="/landing" aria-label="Unauth home" className="flex items-center">
          <Wordmark tone="light" className="text-[1.6rem]" />
        </Link>
        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            href={FL_ROUTES.login}
            className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(26,24,20,0.08)] px-5 py-2.5 text-[0.9375rem] font-medium text-[var(--fl-ink)] transition-colors hover:bg-[rgba(26,24,20,0.14)]"
          >
            {FL_HERO.contactCta}
            <ArrowUpRight size={15} aria-hidden />
          </Link>
          <Link
            href={FL_ROUTES.audit}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--fl-ink)] px-5 py-2.5 text-[0.9375rem] font-semibold text-[var(--fl-paper)] transition-transform hover:scale-[1.02]"
          >
            {FL_HERO.applyCta}
            <ArrowUpRight size={15} aria-hidden />
          </Link>
        </div>
      </div>

      {/* main grid — layers drift at different depths while the page curtain covers them */}
      <div className="relative z-10 mx-auto grid w-full max-w-[100rem] flex-1 items-center gap-12 px-5 pb-12 pt-14 sm:px-10 md:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:pb-16">
        <div className="min-w-0 self-center">
          <HeroDrift factor={-0.36}>
            <h1 className="text-[var(--fl-ink)]">
              {FL_HERO.headlineLines.map((line, i) => (
                <span
                  key={line}
                  className={`${styles.riseIn} ${styles.displayHero} block`}
                  style={delay(80 + i * 110)}
                >
                  {line}{' '}
                </span>
              ))}
            </h1>
          </HeroDrift>

          <HeroDrift factor={-0.22}>
            <p
              className={`${styles.riseIn} mt-10 max-w-[30rem] text-[1.25rem] leading-[1.35] text-[var(--fl-ink-secondary)] sm:text-[1.375rem] lg:mt-8`}
              style={delay(500)}
            >
              {FL_HERO.subheadLight}{' '}
              <strong className="font-semibold text-[var(--fl-ink)]">
                {FL_HERO.subheadBold}
              </strong>
            </p>
            <p
              className={`${styles.riseIn} mt-5 text-[0.875rem] leading-relaxed text-[var(--fl-ink-tertiary)]`}
              style={delay(650)}
            >
              {FL_HERO.ctaNote}
            </p>
          </HeroDrift>
        </div>

        <div className="self-end lg:-mr-10 xl:-mr-16">
          <div
            className={`${styles.phoneIn} flex w-full origin-bottom-right translate-x-[calc(3%+1.875rem)] translate-y-[4%] scale-[1.5] items-center justify-center`}
          >
            <img
              src="/hero-network.png"
              alt="Cross-merchant claim identity network illustration"
              className="h-full w-full object-contain object-right"
            />
          </div>
        </div>
      </div>

    </section>
  );
}
