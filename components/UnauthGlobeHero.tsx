'use client';

import Link from 'next/link';
import Reveal from '@/app/(public)/landing/_components/Reveal';
import { UnauthNetworkCanvas } from './UnauthNetworkCanvas';
import styles from '@/app/(public)/landing/_components/foundation/foundation.module.css';
import { MobileExpandableFeature } from '@/components/landing/MobileExpandableFeature';

const PRIVATE_ITEMS = [
  'Customer details',
  'Order records',
  'Payment data',
  'Chargeback history',
];

const NETWORK_ITEMS = [
  'Claim pattern type',
  'Timing signal',
  'Address cluster match',
  'Cross-merchant frequency',
];

export function UnauthGlobeHero() {
  return (
    <section
      className="relative min-h-[100svh] overflow-hidden bg-white border-t border-black/[0.07]"
      data-nav-theme="light"
      aria-labelledby="fl-globe-hero-heading"
    >
      <div className="md:hidden">
        <div className="relative min-h-[100svh] overflow-hidden">
          <MobileExpandableFeature
            className="relative z-10 mx-auto max-w-[100rem] px-5 pb-14 pt-24"
            title="Every merchant that joins makes the evidence stronger."
            summary="Signals cross the network. Customer data never does."
            expandLabel="Open privacy details"
            preview={<MobileGlobePreview />}
          >
            <p className={styles.landingSectionLead}>
              The same patterns repeat across stores. Unauth connects the signals no single merchant could see alone.
            </p>
            <p className={`${styles.landingSectionLead} mt-4`}>
              Behavioural signals cross the network. Customer data never does.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-8">
              <div>
                <p className={`${styles.landingSectionEyebrow} mb-4`}>What stays in your store</p>
                <ul className="space-y-2.5">
                  {PRIVATE_ITEMS.map((item) => (
                    <li key={item} className={`${styles.landingSectionBody} flex items-center gap-3`}>
                      <span className="h-px w-4 shrink-0 bg-black/25" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className={`${styles.landingSectionEyebrow} mb-4`}>What the network sees</p>
                <ul className="space-y-2.5">
                  {NETWORK_ITEMS.map((item) => (
                    <li key={item} className={`${styles.landingSectionBody} flex items-center gap-3`}>
                      <span className="h-px w-4 shrink-0 bg-black/25" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/landing#evidence" className={styles.heroCtaSecondary}>
                See the evidence flow
              </Link>
            </div>
          </MobileExpandableFeature>
        </div>
      </div>

      <div className="hidden md:block">
        {/* Globe fills the section */}
        <div className="absolute inset-0">
          <UnauthNetworkCanvas />
        </div>

        {/* Scrim — keeps text readable over the globe */}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_right,rgba(246,245,243,1)_0%,rgba(246,245,243,0.97)_32%,rgba(246,245,243,0.75)_50%,rgba(246,245,243,0.18)_64%,transparent_76%)]" />

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-48 bg-gradient-to-b from-transparent to-white" />

        {/* Content */}
        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[100rem] flex-col justify-center px-5 py-24 sm:px-10 sm:py-28">
          <div className="max-w-[46rem]">

          <Reveal>
            <h2
              id="fl-globe-hero-heading"
              className={`${styles.networkHeroHeading}`}
            >
              Every merchant that joins makes the evidence stronger.
            </h2>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-10">
            <Reveal delay={80}>
              <p className={styles.landingSectionLead}>
                The same patterns repeat across stores. Unauth connects the signals no single merchant could see alone.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <p className={styles.landingSectionLead}>
                Behavioural signals cross the network. Customer data never does.
              </p>
            </Reveal>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <Reveal delay={240}>
              <div>
                <p className={`${styles.landingSectionEyebrow} mb-4`}>What stays in your store</p>
                <ul className="space-y-2.5">
                  {PRIVATE_ITEMS.map((item) => (
                    <li key={item} className={`${styles.landingSectionBody} flex items-center gap-3`}>
                      <span className="h-px w-4 shrink-0 bg-black/25" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div>
                <p className={`${styles.landingSectionEyebrow} mb-4`}>What the network sees</p>
                <ul className="space-y-2.5">
                  {NETWORK_ITEMS.map((item) => (
                    <li key={item} className={`${styles.landingSectionBody} flex items-center gap-3`}>
                      <span className="h-px w-4 shrink-0 bg-black/25" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          </div>
        </div>
      </div>
    </section>
  );
}

function MobileGlobePreview() {
  return (
    <div className="relative h-[360px] overflow-hidden rounded-[16px] border border-black/8 bg-[#f6f5f3]">
      <div className="absolute inset-0 scale-[1.28] translate-x-[-30%] translate-y-[2%]">
        <UnauthNetworkCanvas />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_58%_42%,transparent_0%,transparent_34%,rgba(246,245,243,0.1)_58%,rgba(246,245,243,0.72)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f6f5f3] via-[#f6f5f3]/82 to-transparent" />
    </div>
  );
}
