import Link from 'next/link';
import Reveal from '../Reveal';
import Counter from '../Counter';
import HeroNotificationArtifact from '../HeroNotificationArtifact';
import VerdictTicker from '../VerdictTicker';

const PATTERN_STATS = [
  { v: 89, prefix: '$', suffix: 'B', dec: 0, l: 'Estimated annual loss to refund and INR fraud across US ecommerce', n: 3 },
  { v: 20, prefix: '', suffix: '%', dec: 0, l: 'Of DTC refund claims attributed to repeat abusers across multiple stores', n: 4 },
  { v: 2.7, prefix: '', suffix: '×', dec: 1, l: 'True cost of a lost chargeback', n: 5 },
] as const;

export function LandingPatternSection() {
  return (
    <>
      <section className="ua-landing-pattern-section ua-why-matters w-full -mt-[0vh] pb-6 md:pb-20">
        <VerdictTicker />
        <style>{`
          @media (min-width: 1024px) {
            .ua-why-matters-grid { transform: translateY(-5vh); }
          }
        `}</style>
        <div className="ua-why-matters-grid mx-auto max-w-[1400px] px-6 md:px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-8 md:mt-14">
          <div className="lg:col-span-3">
            <p className="ua-landing-pattern-eyebrow">
              § 1 - WHY IT MATTERS
            </p>
            <h2 className="ua-landing-pattern-title">
              One buyer.{' '}
              <span className="ua-landing-headline-accent">Seven stores.</span>{' '}
              One pattern.
            </h2>
            <p className="ua-landing-pattern-body">
              Alone, every order looks normal. Across the network, the same card, address variants, and INR pattern resolve into one identity.
            </p>

            <div className="ua-landing-pattern-stats-divider grid grid-cols-1 min-[390px]:grid-cols-3 gap-4 min-[390px]:gap-6 mt-7 pt-6">
              {PATTERN_STATS.map((s, i) => (
                <Reveal key={s.l} delay={120 + i * 80}>
                  <p className="ua-landing-stat-value">
                    <Counter value={s.v} prefix={s.prefix} suffix={s.suffix} decimals={s.dec} duration={1100} format="plain" />
                    <sup className="ua-landing-stat-footnote-sup">
                      <Link href={`#note-${s.n}`} className="ua-landing-stat-footnote-link">{s.n}</Link>
                    </sup>
                  </p>
                  <p className="ua-landing-stat-label">
                    {s.l}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal className="lg:col-span-9" delay={140}>
            <HeroNotificationArtifact />
          </Reveal>
        </div>
      </section>

    </>
  );
}
