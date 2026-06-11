import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_ROUTES, FL_STATEMENT } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/**
 * Editorial statement: one oversized sentence with the brand bolded inline,
 * then a label + paragraph + 01–04 numbered list over hairline rules. Where
 * the reference floats a render, we float the fulfillment facility illustration.
 */
export default function FoundationStatement() {
  return (
    <section id="about" className="isolate bg-[#f5f6f5]">
      <div className="relative mx-auto w-full max-w-[100rem] px-5 pb-12 pt-20 sm:px-10 lg:pb-16 lg:pt-24">
        <ParallaxLayer speed={0.24} className="relative z-10">
          <Reveal>
            <h2 className="text-[var(--fl-ink)]">
              <span className={`${styles.displayHowItWorks} block`}>
                {FL_STATEMENT.displayLines.join(' ')}
              </span>
            </h2>
            <p className={`${styles.statement} mt-10 max-w-[64rem] text-[var(--fl-ink-secondary)]`}>
              <span className="block">
                {FL_STATEMENT.pre}
              </span>
              <span className="block">
                <strong className="font-semibold text-[var(--fl-ink)]">
                  {FL_STATEMENT.brand}
                  <sup className="text-[0.45em] font-semibold">®</sup>
                </strong>{' '}
                {FL_STATEMENT.post}
              </span>
              <span className="block">{FL_STATEMENT.postContinuation} {FL_STATEMENT.postTail}</span>
            </p>
          </Reveal>
        </ParallaxLayer>

        <div className="relative mt-20 grid gap-16 lg:mt-28 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <ParallaxLayer
            speed={0.16}
            className="relative z-10 flex min-w-0 -translate-y-[10%] flex-col lg:max-w-[48rem] lg:pr-4"
          >
              <Reveal>
                <p className="mt-0 text-[1.0625rem] leading-[1.6] text-[var(--fl-ink-secondary)]">
                  {FL_STATEMENT.body}
                </p>
              </Reveal>

              <div className="-translate-y-[5%]">
                <Reveal delay={120}>
                <ol className="mt-16 grid grid-cols-1 gap-x-12">
                  {FL_STATEMENT.features.map((feature) => (
                    <li
                      key={feature.id}
                      className="py-6"
                    >
                      <div className="w-[70%] border-t border-[var(--fl-line)] pt-6">
                        <div className="flex items-baseline gap-4">
                          <span className="font-mono text-sm text-[var(--fl-ink-tertiary)]">
                            {feature.id}
                          </span>
                          <span className="text-[1.0625rem] font-bold leading-snug text-[var(--fl-ink)]">
                            {feature.title}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                </Reveal>
              </div>

              <Reveal delay={180}>
                <Link
                  href={FL_ROUTES.audit}
                  className="mt-12 inline-flex items-center gap-1.5 rounded-full border border-[var(--fl-line)] bg-[var(--fl-paper)] px-6 py-3 text-[0.9375rem] font-semibold text-[var(--fl-ink)] transition-colors hover:border-[var(--fl-ink)]"
                >
                  {FL_STATEMENT.cta}
                  <ArrowUpRight size={16} aria-hidden />
                </Link>
              </Reveal>
          </ParallaxLayer>

          <div className="pointer-events-none relative z-0 lg:justify-self-end lg:self-start">
            <div
              className="w-full max-w-[32rem] origin-bottom-right lg:max-w-[36rem]"
              style={{ transform: 'translate(20%, 70%) scale(2.4)' }}
            >
              <Reveal delay={140}>
                <img
                  id="evidence"
                  src="/statement-facility-v3.png"
                  alt="Fulfillment and claims operations facility illustration"
                  className="pointer-events-none w-full object-contain object-right"
                />
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
