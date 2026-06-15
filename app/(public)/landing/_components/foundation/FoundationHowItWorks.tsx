import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import SetupFlowVisual from './SetupFlowVisual';
import { FL_HOW_IT_WORKS } from '../../_lib/foundationContent';
import styles from './foundation.module.css';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

/**
 * Editorial setup section: connect store + helpdesk, audit, review evidence.
 * Heading + visual on top; four steps in a horizontal row beneath.
 */
export default function FoundationHowItWorks() {
  return (
    <section
      data-nav-theme="light"
      id="how-it-works"
      aria-labelledby="fl-how-it-works-heading"
      className={`${styles.howField} isolate`}
    >
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-14 pt-12 sm:px-10 lg:pb-[4.5rem] lg:pt-16">
        <div className="flex flex-col gap-14 lg:gap-20">
          <div className="grid min-h-[58svh] grid-cols-1 items-start gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-x-16 xl:gap-x-20">
            <ParallaxLayer speed={0.14} className="min-w-0 translate-y-[10%]">
              <Reveal>
                <h2 id="fl-how-it-works-heading" className="text-[var(--fl-ink)]">
                  {FL_HOW_IT_WORKS.displayLines.map((line) => (
                    <span key={line} className={`${styles.displayHowItWorks} block`}>
                      {line}{' '}
                    </span>
                  ))}
                </h2>
                <p className="mt-8 max-w-[32rem] text-[1.0625rem] leading-[1.65] text-[var(--fl-ink-secondary)]">
                  {FL_HOW_IT_WORKS.subhead}
                </p>
                <Link
                  href="/audit"
                  prefetch={false}
                  className="mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--fl-line-strong)] px-5 py-3 text-[0.9375rem] font-semibold text-[var(--fl-ink)] transition-colors hover:bg-[rgba(26,24,20,0.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fl-ink)]"
                >
                  Review a claim example
                  <ArrowUpRight size={15} aria-hidden />
                </Link>
              </Reveal>
            </ParallaxLayer>

            <div className="min-w-0 overflow-visible lg:pt-4">
              <Reveal delay={80}>
                <SetupFlowVisual />
              </Reveal>
            </div>
          </div>

          <ParallaxLayer speed={0.2} className="-translate-y-[20%]">
          <Reveal delay={120}>
            <ol className="-mt-[5%] grid grid-cols-1 gap-x-10 gap-y-6 border-t border-[var(--fl-line)] pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:pt-12">
              {FL_HOW_IT_WORKS.steps.map((step) => (
                <li
                  key={step.id}
                  className="flex min-w-0 flex-col gap-3 border-l-2 border-[var(--fl-line)] pl-5 lg:border-l-0 lg:border-r lg:border-[var(--fl-line)] lg:pl-0 lg:pr-8 lg:last:border-r-0"
                >
                  <span className="font-mono text-sm text-[var(--fl-ink-tertiary)]">
                    {step.id}
                  </span>
                  <p className="text-[1.0625rem] font-bold leading-snug text-[var(--fl-ink)]">
                    {step.title}
                  </p>
                  <p className="text-[0.9375rem] leading-[1.6] text-[var(--fl-ink-secondary)]">
                    {step.body}
                  </p>
                  {step.note && (
                    <p className="mt-1 text-[0.8125rem] leading-snug text-[var(--fl-ink-tertiary)]">
                      {step.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Reveal>
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
}
