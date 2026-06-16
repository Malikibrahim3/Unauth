'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Network,
  Fingerprint,
  ShieldCheck,
  Users,
  Share2,
  AlertTriangle,
  Link2,
  BarChart2,
  Search,
} from 'lucide-react';
import Reveal from '@/app/(public)/landing/_components/Reveal';
import { FL_NETWORK_HERO, FL_ROUTES } from '@/app/(public)/landing/_lib/foundationContent';
import styles from '@/app/(public)/landing/_components/foundation/foundation.module.css';

const INCIDENT_TILES = [
  { Icon: Network,       className: 'left-[90px]   top-[56px]  rotate-[-6deg]'  },
  { Icon: ShieldCheck,   className: 'left-[294px]  top-[30px]  rotate-0'        },
  { Icon: Users,         className: 'right-[82px]  top-[58px]  rotate-[6deg]'   },
  { Icon: Share2,        className: 'left-[24px]   top-[206px] rotate-[-10deg]' },
  { Icon: AlertTriangle, className: 'left-[206px]  top-[178px] rotate-[-4deg]'  },
  { Icon: Link2,         className: 'right-[204px] top-[176px] rotate-[4deg]'   },
  { Icon: BarChart2,     className: 'right-[16px]  top-[204px] rotate-[10deg]'  },
];

// Each tile's starting translate — all begin stacked at the center flame
const TILE_ORIGINS: Record<number, string> = {
  0: 'translate(-155px, 218px)',
  1: 'translate(-81px,  244px)',
  2: 'translate(207px,  216px)',
  3: 'translate(-141px, 68px)',
  4: 'translate(-59px,  96px)',
  5: 'translate(59px,   98px)',
  6: 'translate(199px,  70px)',
};

function IncidentTileCluster() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35, rootMargin: '0px 0px -30% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @keyframes tile-emerge {
          0%   { opacity: 0; transform: var(--tile-origin) scale(0.65); }
          65%  { opacity: 1; }
          100% { opacity: 1; transform: translate(0, 0) scale(1); }
        }
      `}</style>
      <div ref={ref} className="relative h-[365px] w-[650px] shrink-0">
        {/* Center flame — always visible, tiles emerge from behind it */}
        <div className="absolute left-1/2 top-[274px] -translate-x-1/2 h-[82px] w-[82px] rounded-[8px] bg-[#1A1814] shadow-[0_8px_28px_-8px_rgba(0,0,0,0.32),0_2px_6px_rgba(0,0,0,0.14)] flex items-center justify-center z-0">
          <Search size={26} className="text-white" strokeWidth={1.75} />
        </div>

        {INCIDENT_TILES.map(({ Icon, className }, index) => (
          <div
            key={index}
            className={`absolute h-[82px] w-[82px] rounded-[8px] bg-white border border-black/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.05)] flex items-center justify-center z-10 ${className}`}
            style={
              {
                '--tile-origin': TILE_ORIGINS[index],
                ...(visible
                  ? {
                      animation: `tile-emerge 0.9s cubic-bezier(0.34, 1.45, 0.64, 1) ${index * 98}ms both`,
                    }
                  : {
                      opacity: 0,
                      transform: `${TILE_ORIGINS[index]} scale(0.65)`,
                    }),
              } as unknown as React.CSSProperties
            }
          >
            <Icon
              size={22}
              strokeWidth={1.75}
              className="text-[#a85040]"
            />
          </div>
        ))}
      </div>
    </>
  );
}

export function UnauthNetworkHero() {
  return (
    <section
      id="network"
      className={`${styles.networkHeroField} min-h-[100svh] scroll-mt-24 border-t border-black/[0.07]`}
      data-nav-theme="light"
      aria-labelledby="fl-network-hero-heading"
    >
      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[100rem] flex-row items-center justify-between px-5 py-24 sm:px-10 sm:py-28">
        <div className="max-w-[46rem]">

          <Reveal>
            <span className={styles.heroEyebrow}>
              <Network size={13} strokeWidth={2} className={styles.heroEyebrowIcon} aria-hidden />
              Cross-merchant intelligence
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h2
              id="fl-network-hero-heading"
              className={`${styles.networkHeroHeading} mt-6`}
            >
              {FL_NETWORK_HERO.title}
            </h2>
          </Reveal>

          <Reveal delay={200}>
            <p className={`${styles.landingSectionLead} mt-5`}>
              {FL_NETWORK_HERO.lead}
            </p>
          </Reveal>

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

        {/* Right column — icon tile cluster, scroll-triggered */}
        <div className="hidden lg:flex items-center justify-center pl-10">
          <IncidentTileCluster />
        </div>
      </div>
    </section>
  );
}
