'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_FAQ } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

export default function FoundationFaq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" aria-labelledby="fl-faq-heading" className={styles.faqField}>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-24 pt-10 sm:px-10 lg:pb-32 lg:pt-16">
        <ParallaxLayer speed={0.24}>
          <Reveal>
            <h2
              id="fl-faq-heading"
              className={`${styles.displayHowItWorks} text-[var(--fl-ink)]`}
            >
              {FL_FAQ.heading}
            </h2>
          </Reveal>
        </ParallaxLayer>

        <ParallaxLayer speed={0.18}>
        <Reveal delay={80}>
          <dl className="mt-14 max-w-[52rem] divide-y divide-[var(--fl-line)]">
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
                      className="flex w-full items-start justify-between gap-6 py-7 text-left"
                    >
                      <span className="text-[1.0625rem] font-semibold leading-snug text-[var(--fl-ink)]">
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
                    className="pb-7 text-[0.9375rem] leading-[1.7] text-[var(--fl-ink-secondary)]"
                  >
                    {item.a}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Reveal>
        </ParallaxLayer>
      </div>
    </section>
  );
}
