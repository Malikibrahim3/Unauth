'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_FAQ } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

export default function FoundationFaq({
  heading = FL_FAQ.heading,
  items = FL_FAQ.items,
  id = 'faq',
}: {
  heading?: string;
  items?: ReadonlyArray<{ readonly q: string; readonly a: string }>;
  id?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section data-nav-theme="light" id={id} aria-labelledby={`${id}-heading`} className={styles.faqField}>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-24 pt-10 sm:px-10 lg:pb-32 lg:pt-16">
        <ParallaxLayer speed={0.24}>
          <Reveal>
            <h2
              id={`${id}-heading`}
              className={`${styles.landingSectionTitle} text-[var(--fl-ink)]`}
            >
              {heading}
            </h2>
          </Reveal>
        </ParallaxLayer>

        <ParallaxLayer speed={0.18}>
        <Reveal delay={80}>
          <dl className="mt-14 max-w-[52rem] divide-y divide-[var(--fl-line)]">
            {items.map((item, i) => {
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
                    className={`${styles.landingSectionFaqAnswer} pb-7`}
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
