import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_FIGURES, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/**
 * Two giant figures under heavy top rules — the reference's rate display,
 * repurposed for the engine's benchmark precision and audit turnaround.
 */
export default function FoundationFigures() {
  return (
    <section data-nav-theme="light" id="numbers" className={styles.figuresField}>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-32 pt-10 sm:px-10">
        <Reveal>
          <h2 className={`${styles.landingSectionTitle} text-[var(--fl-ink)]`}>{FL_FIGURES.label}</h2>
          <p className={`${styles.landingSectionLead} mt-8 max-w-[28rem] text-[var(--fl-ink-secondary)]`}>
            {FL_FIGURES.body}
          </p>
        </Reveal>

        <div className="mt-20 grid gap-16 md:grid-cols-2 md:gap-10">
          {FL_FIGURES.figures.map((figure, i) => (
            <ParallaxLayer key={figure.label} speed={0.26 + i * 0.18}>
              <Reveal delay={i * 120}>
              <div className="border-t-4 border-[var(--fl-line-strong)] pt-10">
                <p className={`${styles.figureNumeral} text-[var(--fl-ink)]`}>
                  {figure.value}
                  <sup className="ml-1 align-super text-[0.32em] font-bold tracking-normal">
                    {figure.unit}
                  </sup>
                </p>
                <p className="mt-6 text-[1.75rem] font-medium tracking-normal text-[var(--fl-ink)] sm:text-[2rem]">
                  {figure.label}
                </p>
                <p className="mt-2 font-mono text-[0.75rem] text-[var(--fl-ink-tertiary)]">
                  {figure.note}
                </p>
              </div>
              </Reveal>
            </ParallaxLayer>
          ))}
        </div>

        <Reveal delay={160}>
          <p className="mt-10 max-w-[32rem] font-mono text-[0.75rem] leading-relaxed text-[var(--fl-ink-tertiary)]">
            {FL_FIGURES.disclaimer}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <Link
            href={FL_ROUTES.audit}
            prefetch={false}
            className="mt-16 inline-flex items-center gap-1.5 rounded-full border border-[var(--fl-line)] bg-[var(--fl-paper)] px-6 py-3 text-[0.9375rem] font-semibold text-[var(--fl-ink)] transition-colors hover:border-[var(--fl-ink)]"
          >
            {FL_FIGURES.cta}
            <ArrowUpRight size={16} aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
