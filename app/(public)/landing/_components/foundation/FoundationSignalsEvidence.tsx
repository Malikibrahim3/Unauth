'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_SIGNALS_EVIDENCE } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/**
 * Espresso editorial section: one graded evidence pack per signal type,
 * presented as a case file — giant letter grade, one-line pattern story,
 * hairline detail grid — in the page's display vocabulary.
 */
export default function FoundationSignalsEvidence() {
  const [active, setActive] = useState(0);
  const panel = FL_SIGNALS_EVIDENCE.tabs[active];

  const moveTo = (index: number) => {
    setActive(index);
    document.getElementById(`fl-ev-tab-${FL_SIGNALS_EVIDENCE.tabs[index].key}`)?.focus();
  };

  const onTablistKeyDown = (e: React.KeyboardEvent) => {
    const last = FL_SIGNALS_EVIDENCE.tabs.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    else if (e.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    moveTo(next);
  };

  return (
    <section
      id="signals-evidence"
      aria-labelledby="fl-signals-evidence-heading"
      className={`${styles.espresso} relative isolate overflow-x-clip`}
    >
      <img
        src="/signals-hero-left-33r18z-2.png"
        alt=""
        aria-hidden="true"
        width={1376}
        height={768}
        className="pointer-events-none absolute bottom-[calc(-2%_-_5rem)] left-[-10%] z-0 hidden w-[73.6rem] max-w-none opacity-95 lg:block"
      />
      <div className="mx-auto grid w-full max-w-[100rem] gap-12 px-5 pb-24 pt-28 sm:px-10 sm:pt-32 lg:min-h-[min(105.8svh,64.4rem)] lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-14 lg:pb-32 lg:pt-36">
        <div className="relative z-10 min-w-0 lg:-translate-y-24 xl:-translate-y-28">
          <ParallaxLayer speed={0.17}>
            <Reveal>
              <h2 id="fl-signals-evidence-heading" className="text-[var(--fl-dusk-ink)]">
                {FL_SIGNALS_EVIDENCE.displayLines.map((line) => (
                  <span key={line} className={`${styles.displayEspresso} block`}>
                    {line}{' '}
                  </span>
                ))}
              </h2>
              <p className="mt-7 max-w-[24rem] text-[1.0625rem] leading-[1.65] text-[var(--fl-dusk-ink-dim)]">
                {FL_SIGNALS_EVIDENCE.subhead}
              </p>
              <Link
                href={FL_SIGNALS_EVIDENCE.cta.href}
                className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-[rgba(246,243,238,0.28)] px-6 py-3 text-[0.9375rem] font-semibold text-[var(--fl-dusk-ink)] transition-colors hover:border-[rgba(246,243,238,0.5)] hover:bg-[rgba(246,243,238,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fl-dusk-ink)] lg:-mt-2 lg:ml-80 xl:ml-96"
              >
                {FL_SIGNALS_EVIDENCE.cta.label}
                <ArrowUpRight size={16} aria-hidden />
              </Link>
            </Reveal>
          </ParallaxLayer>
        </div>

        <div className="relative z-10 min-w-0">
          <Reveal delay={100}>
            <div className={`relative z-10 ${styles.espressoCard}`}>
              <div
                role="tablist"
                aria-label="Evidence signal types"
                onKeyDown={onTablistKeyDown}
                className="flex w-full gap-1 overflow-x-auto overscroll-x-contain rounded-t-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {FL_SIGNALS_EVIDENCE.tabs.map((tab, i) => {
                  const isActive = i === active;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      id={`fl-ev-tab-${tab.key}`}
                      aria-selected={isActive}
                      aria-controls={`fl-ev-panel-${tab.key}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setActive(i)}
                      className={`min-w-[7.25rem] shrink-0 whitespace-nowrap rounded-t-md px-3 py-3.5 text-left text-[0.75rem] font-bold uppercase tracking-[0.02em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fl-dusk-ink)] sm:min-w-0 sm:flex-1 sm:px-5 sm:py-4 sm:text-[0.8125rem] ${
                        isActive
                          ? 'bg-[var(--fl-paper)] text-[var(--fl-ink)]'
                          : 'bg-[rgba(246,243,238,0.1)] text-[rgba(246,243,238,0.58)] backdrop-blur-sm hover:bg-[rgba(246,243,238,0.16)]'
                      }`}
                    >
                      {tab.tab}
                    </button>
                  );
                })}
              </div>

              <div
                role="tabpanel"
                id={`fl-ev-panel-${panel.key}`}
                aria-labelledby={`fl-ev-tab-${panel.key}`}
                className="rounded-b-md border border-[rgba(26,24,20,0.08)] bg-[var(--fl-paper)]"
              >
                <div className="p-7 sm:p-10 sm:pb-8">
                  {/* Case kicker */}
                  <div className="flex items-start justify-between gap-4">
                    <p className="min-w-0 font-mono text-[0.8125rem] leading-relaxed text-[var(--fl-ink-secondary)]">
                      {panel.caseLine.join(' · ')}
                    </p>
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--fl-spark)]"
                    />
                  </div>

                  {/* Grade + pattern story */}
                  <div className="mt-8 grid grid-cols-1 items-start gap-x-7 gap-y-5 sm:grid-cols-[auto_1fr] sm:gap-x-10">
                    <div>
                      <p className={`${styles.gradeLetter} text-[var(--fl-ink)]`}>
                        {panel.gradeLetter}
                      </p>
                      <p className="mt-2 whitespace-nowrap text-[0.8125rem] font-bold uppercase tracking-[0.04em] text-[var(--fl-ink-tertiary)]">
                        {panel.gradeTier}
                      </p>
                    </div>
                    <p className="text-[1.125rem] font-medium leading-[1.45] text-[var(--fl-ink)] sm:self-center sm:text-[1.1875rem]">
                      {panel.mainLine}
                    </p>
                  </div>

                  {/* Hairline detail grid */}
                  <dl className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                    {panel.details.map((detail) => (
                      <div key={detail.k} className="border-t border-[var(--fl-line)] pt-4">
                        <dt className="text-[0.8125rem] font-bold uppercase tracking-[0.04em] text-[var(--fl-ink-tertiary)]">
                          {detail.k}
                        </dt>
                        <dd className="mt-1.5 text-[0.9375rem] text-[var(--fl-ink-secondary)]">
                          {detail.v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Decision band */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-b-md border-t border-[var(--fl-line)] bg-[rgba(26,24,20,0.03)] px-7 py-4 sm:px-10">
                  <p className="whitespace-nowrap text-[0.8125rem] font-bold uppercase tracking-[0.04em] text-[var(--fl-ink-tertiary)]">
                    Decision
                    <span className="ml-3 normal-case tracking-normal text-[0.9375rem] font-semibold text-[var(--fl-ink)]">
                      Your team
                    </span>
                  </p>
                  <p className="whitespace-nowrap font-mono text-[0.75rem] text-[var(--fl-ink-tertiary)]">
                    assembled in {panel.assembledIn}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="relative z-0 mt-10 lg:hidden">
            <img
              src={FL_SIGNALS_EVIDENCE.image.src}
              alt={FL_SIGNALS_EVIDENCE.image.alt}
              width={880}
              height={1100}
              className="mx-auto h-auto w-full max-w-sm object-contain opacity-85"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
