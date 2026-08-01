'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus, Minus } from 'lucide-react';
import Reveal from '../Reveal';
import { FL_FINAL, FL_FAQ, FL_PRODUCT_TRUTHS, FL_ROUTES } from '../../_lib/foundationContent';
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
              <ul className="mt-12 divide-y divide-[var(--fl-line)] border-y border-[var(--fl-line)]">
                {FL_PRODUCT_TRUTHS.map((truth) => (
                  <li key={truth.title} className="grid gap-1 py-5 sm:grid-cols-[9rem_1fr] sm:gap-5">
                    <p className="text-[0.9375rem] font-semibold text-[var(--fl-ink)]">
                      {truth.title}
                    </p>
                    <p className="text-[0.9375rem] leading-6 text-[var(--fl-ink-secondary)]">
                      {truth.body}
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={160}>
              <p className={`${styles.landingSectionLead} mt-10 text-[var(--fl-ink-secondary)]`}>
                {FL_FINAL.body}
              </p>
              <Link
                href={FL_ROUTES.signup}
                prefetch={false}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[var(--fl-brand)] px-7 py-4 text-[1.0625rem] font-semibold text-white transition-colors hover:bg-[var(--fl-brand-deep)]"
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
