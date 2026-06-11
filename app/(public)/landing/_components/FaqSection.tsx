import { Plus } from 'lucide-react';
import { FAQ } from '../_lib/content';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';
import styles from './landing.module.css';

/**
 * Native details/summary — no JS, fully accessible, ruled list.
 */
export default function FaqSection() {
  return (
    <section className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
        <Reveal>
          <SectionHeader eyebrow={FAQ.eyebrow} headline={FAQ.headline} />
        </Reveal>

        <Reveal delay={100}>
          <div className="divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
            {FAQ.items.map((item) => (
              <details key={item.q} className={styles.faqItem}>
                <summary className="flex items-center justify-between gap-4 py-5">
                  <span className="text-[0.9375rem] font-medium text-[var(--ink-primary)]">
                    {item.q}
                  </span>
                  <Plus
                    size={16}
                    aria-hidden
                    className={`${styles.faqIcon} shrink-0 text-[var(--ink-tertiary)]`}
                  />
                </summary>
                <p className="max-w-[40rem] pb-6 text-sm leading-relaxed text-[var(--ink-secondary)]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
