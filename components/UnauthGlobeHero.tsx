'use client';

import Reveal from '@/app/(public)/landing/_components/Reveal';
import { UnauthNetworkCanvas } from './UnauthNetworkCanvas';
import styles from '@/app/(public)/landing/_components/foundation/foundation.module.css';

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
    </section>
  );
}
