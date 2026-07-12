'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus, Minus } from 'lucide-react';
import Reveal from '../Reveal';
import { FL_FINAL, FL_FIGURES, FL_FAQ, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/**
 * Combined FAQ + closing CTA — two-column on desktop, stacked on mobile.
 * Pass hideFaq to suppress the embedded FAQ accordion (e.g. on the pricing
 * page, which renders its own FAQ above this section).
 */
export default function FoundationFinalCta({ hideFaq = false }: { hideFaq?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section data-nav-theme="light" id="faq" aria-labelledby="fl-closer-faq-heading" className={`${styles.finalField} scroll-mt-24 border-t border-black/[0.07]`}>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 py-24 sm:px-10 lg:py-32">
        <div className={`grid grid-cols-1 gap-x-20 gap-y-20 lg:items-start xl:gap-x-28 ${hideFaq ? '' : 'lg:grid-cols-[1fr_0.72fr]'}`}>

          {/* ── Left: FAQ ───────────────────────────────────────────────── */}
          {!hideFaq && (
          <div>
            <Reveal>
              <h2
                id="fl-closer-faq-heading"
                className={`${styles.landingSectionTitle} text-[var(--fl-ink)]`}
              >
                {FL_FAQ.heading}
              </h2>
            </Reveal>

            <Reveal delay={80}>
              <dl className="mt-10 divide-y divide-[var(--fl-line)]">
                {FL_FAQ.items.map((item, i) => {
                  const isOpen = open === i;
                  return (
                    <div key={item.q}>
                      <dt>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={`fl-faq-answer-${i}`}
                          id={`fl-faq-question-${i}`}
                          onClick={() => setOpen(isOpen ? null : i)}
                          className="flex w-full items-start justify-between gap-6 py-6 text-left"
                        >
                          <span className={styles.landingSectionFaqQuestion}>
                            {item.q}
                          </span>
                          <span className="mt-0.5 shrink-0 text-[var(--fl-ink-tertiary)]">
                            {isOpen ? <Minus size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
                          </span>
                        </button>
                      </dt>
                      <dd
                        id={`fl-faq-answer-${i}`}
                        role="region"
                        aria-labelledby={`fl-faq-question-${i}`}
                        hidden={!isOpen}
                        className={`${styles.landingSectionFaqAnswer} pb-6`}
                      >
                        {item.a}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </Reveal>
          </div>
          )}

          {/* ── Right: CTA ──────────────────────────────────────────────── */}
          <div>
            <Reveal delay={40}>
              <h2 className={`${styles.landingSectionTitle} text-[var(--fl-ink)]`} aria-hidden>
                {FL_FINAL.headlineLines.map((line) => (
                  <span key={line} className="block">
                    {line}{' '}
                  </span>
                ))}
              </h2>
            </Reveal>

            <Reveal delay={100}>
              <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-7 border-t border-[var(--fl-line-strong)] pt-8">
                {FL_FIGURES.figures.map((figure) => (
                  <div key={figure.label}>
                    <p className="text-[2.25rem] font-bold leading-none tracking-tight text-[var(--fl-ink)] sm:text-[2.75rem]">
                      {figure.value}
                      <sup className="ml-0.5 align-super text-[0.4em] font-bold tracking-normal">
                        {figure.unit}
                      </sup>
                    </p>
                    <p className="mt-2 text-[0.9375rem] font-semibold text-[var(--fl-ink)]">
                      {figure.label}
                    </p>
                    <p className="mt-1 font-mono text-[0.6875rem] leading-snug text-[var(--fl-ink-tertiary)]">
                      {figure.note}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono text-[0.6875rem] leading-relaxed text-[var(--fl-ink-tertiary)]">
                {FL_FIGURES.disclaimer}
              </p>
            </Reveal>

            <Reveal delay={160}>
              <p className={`${styles.landingSectionLead} mt-10 text-[var(--fl-ink-secondary)]`}>
                {FL_FINAL.body}
              </p>
              <Link
                href={FL_ROUTES.audit}
                prefetch={false}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--fl-ink)] px-7 py-4 text-[1.0625rem] font-semibold text-white shadow-[0_16px_36px_rgba(0,0,0,0.16)] transition-transform hover:scale-[1.02]"
              >
                {FL_FINAL.cta}
                <ArrowUpRight size={18} aria-hidden />
              </Link>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}
