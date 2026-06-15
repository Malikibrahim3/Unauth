import Link from 'next/link';
import { ChevronRight, Network } from 'lucide-react';
import Reveal from '@/app/(public)/landing/_components/Reveal';
import { FL_NETWORK_HERO, FL_ROUTES } from '@/app/(public)/landing/_lib/foundationContent';
import styles from '@/app/(public)/landing/_components/foundation/foundation.module.css';

export function UnauthNetworkHero() {
  return (
    <section
      id="network"
      className={`${styles.networkHeroField} min-h-[100svh] scroll-mt-24 border-t border-black/[0.07]`}
      data-nav-theme="light"
      aria-labelledby="fl-network-hero-heading"
    >


      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[100rem] flex-col justify-center px-5 py-24 sm:px-10 sm:py-28">
        <div className="max-w-[46rem]">

          {/* Eyebrow — pill badge to match FoundationHero register */}
          <Reveal>
            <span className={styles.heroEyebrow}>
              <Network size={13} strokeWidth={2} className={styles.heroEyebrowIcon} aria-hidden />
              Cross-merchant intelligence
            </span>
          </Reveal>

          {/* Heading — larger than section title, smaller than hero headline */}
          <Reveal delay={80}>
            <h2
              id="fl-network-hero-heading"
              className={`${styles.networkHeroHeading} mt-6`}
            >
              {FL_NETWORK_HERO.title}
            </h2>
          </Reveal>

          {/* Lead */}
          <Reveal delay={200}>
            <p className={`${styles.landingSectionLead} mt-5`}>
              {FL_NETWORK_HERO.lead}
            </p>
          </Reveal>

          {/* CTAs */}
          <Reveal delay={340}>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Link href={FL_ROUTES.audit} prefetch={false} className={styles.heroCtaPrimary}>
                Get a Demo
                <ChevronRight size={16} aria-hidden />
              </Link>
              <Link href="/landing#how-it-works" className={styles.heroCtaSecondary}>
                See how it works
                <ChevronRight size={16} aria-hidden />
              </Link>
            </div>
          </Reveal>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-1 gap-0 sm:grid-cols-3">
            {FL_NETWORK_HERO.stats.map((stat, i) => (
              <Reveal key={stat.value} delay={420 + i * 80}>
                <div className={`${styles.networkStatRow} sm:pr-6`}>
                  <p className={styles.networkStatValue}>{stat.value}</p>
                  <p className={styles.networkStatLabel}>{stat.label}</p>
                  <p className={styles.networkStatSource}>{stat.source}</p>
                </div>
              </Reveal>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
