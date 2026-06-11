'use client';

import { useState } from 'react';
import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_PROGRAMS } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/**
 * Full-bleed sky section: giant display title (parallaxed), breadcrumb of
 * the three context layers, then the program tab bar fused to a white
 * detail card. Tabs follow the WAI-ARIA pattern: roving tabindex with
 * Left/Right/Home/End moving both focus and selection.
 */
export default function FoundationPrograms() {
  const [active, setActive] = useState(0);
  const program = FL_PROGRAMS.tabs[active];

  const moveTo = (index: number) => {
    setActive(index);
    document.getElementById(`fl-tab-${FL_PROGRAMS.tabs[index].key}`)?.focus();
  };

  const onTablistKeyDown = (e: React.KeyboardEvent) => {
    const last = FL_PROGRAMS.tabs.length - 1;
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
    <section id="programs" className={`${styles.sky} relative overflow-hidden`}>
      <div className="mx-auto w-full max-w-[100rem] px-5 pb-24 pt-32 sm:px-10 lg:pb-32 lg:pt-44">
        <ParallaxLayer speed={0.28}>
          <Reveal>
            <h2 className="text-[var(--fl-sky-ink)]">
              {FL_PROGRAMS.displayLines.map((line) => (
                <span key={line} className={`${styles.displayProgram} block`}>
                  {/* trailing space keeps the accessible name word-separated */}
                  {line}{' '}
                </span>
              ))}
            </h2>
            <p className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-[1.0625rem] font-medium text-[var(--fl-sky-crumb)]">
              {FL_PROGRAMS.breadcrumb.map((crumb, i) => (
                <span key={crumb} className="flex items-center gap-2">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  {crumb}
                </span>
              ))}
            </p>
          </Reveal>
        </ParallaxLayer>

        <Reveal delay={120}>
          <div className="mt-16 lg:ml-auto lg:max-w-[60rem]">
            {/* tab bar — spans the card, one-line labels, translucent inactive */}
            <div
              role="tablist"
              aria-label="Claim programs"
              onKeyDown={onTablistKeyDown}
              className={`${styles.tabFade} flex w-full gap-1 overflow-x-auto`}
            >
              {FL_PROGRAMS.tabs.map((tab, i) => {
                const isActive = i === active;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    id={`fl-tab-${tab.key}`}
                    aria-selected={isActive}
                    aria-controls={`fl-panel-${tab.key}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActive(i)}
                    className={`min-w-max flex-1 whitespace-nowrap rounded-t-md px-6 py-4 text-left text-[0.875rem] font-bold uppercase tracking-[0.01em] transition-colors sm:px-7 ${
                      isActive
                        ? 'bg-[var(--fl-paper)] text-[var(--fl-ink)]'
                        : 'bg-[var(--fl-sky-tab)] text-[var(--fl-sky-tab-ink)] backdrop-blur-sm hover:bg-[rgba(255,255,255,0.45)]'
                    }`}
                  >
                    {tab.tab}
                  </button>
                );
              })}
            </div>

            {/* detail panel */}
            <div
              role="tabpanel"
              id={`fl-panel-${program.key}`}
              aria-labelledby={`fl-tab-${program.key}`}
              className="rounded-b-md bg-[var(--fl-paper)] p-7 sm:p-10"
            >
              <div className="flex flex-wrap items-start justify-between gap-6">
                <h3 className={`${styles.displayCard} max-w-[14ch] text-[var(--fl-ink)]`}>
                  {program.title}
                </h3>
                <p className="text-[1.125rem] font-medium leading-snug text-[var(--fl-ink)] sm:max-w-[14rem]">
                  {program.kicker}
                </p>
                <span className="font-mono text-sm text-[var(--fl-ink-tertiary)]">
                  {program.index}
                </span>
              </div>

              <dl className="mt-14 grid gap-x-12 gap-y-8 sm:grid-cols-2">
                {program.details.map((detail) => (
                  <div key={detail.k} className="border-t border-[var(--fl-line)] pt-4">
                    <dt className="text-[0.9375rem] font-bold text-[var(--fl-ink)]">
                      {detail.k}
                    </dt>
                    <dd className="mt-1 text-[0.9375rem] text-[var(--fl-ink-secondary)]">
                      {detail.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
