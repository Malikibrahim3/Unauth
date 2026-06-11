import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import SetupFlowVisual from './SetupFlowVisual';
import { FL_HOW_IT_WORKS } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/**
 * Editorial setup section: connect store + helpdesk, audit, review evidence.
 * Heading + visual on top; four steps in a horizontal row beneath.
 */
export default function FoundationHowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="fl-how-it-works-heading"
      className="isolate bg-[#efece5]"
    >
      <div className="mx-auto w-full max-w-[100rem] px-5 pb-28 pt-24 sm:px-10 lg:pb-36 lg:pt-32">
        <div className="flex flex-col gap-14 lg:gap-20">
          <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-x-16 xl:gap-x-20">
            <ParallaxLayer speed={0.28} className="min-w-0">
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
                  href={FL_HOW_IT_WORKS.cta.href}
                  className="mt-[5%] inline-flex items-center gap-1.5 rounded-full border border-[var(--fl-line)] bg-[var(--fl-paper)] px-6 py-3 text-[0.9375rem] font-semibold text-[var(--fl-ink)] transition-colors hover:border-[var(--fl-ink)]"
                >
                  {FL_HOW_IT_WORKS.cta.label}
                  <ArrowUpRight size={16} aria-hidden />
                </Link>
              </Reveal>
            </ParallaxLayer>

            <div className="min-w-0 overflow-visible lg:pt-4">
              <Reveal delay={80}>
                <SetupFlowVisual />
              </Reveal>
            </div>
          </div>

          <ParallaxLayer speed={0.2}>
          <Reveal delay={120}>
            <ol className="-mt-[5%] grid grid-cols-1 gap-x-10 gap-y-10 border-t border-[var(--fl-line)] pt-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:pt-14">
              {FL_HOW_IT_WORKS.steps.map((step) => (
                <li
                  key={step.id}
                  className="flex min-w-0 flex-col gap-3 lg:border-r lg:border-[var(--fl-line)] lg:pr-8 lg:last:border-r-0"
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
