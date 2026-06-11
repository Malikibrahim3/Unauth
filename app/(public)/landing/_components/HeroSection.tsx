import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HERO, ROUTES } from '../_lib/content';
import HeroCaseReplay from './HeroCaseReplay';
import styles from './landing.module.css';

/**
 * THE ONE DELIBERATE RISK (named per the design brief):
 * Instead of a static product screenshot, the hero is a staged forensic
 * case replay — a real helpdesk ticket "arrives" and the Unauth identity
 * panel answers it ~0.5s later, with a live network tape running beneath
 * the fold. The risk: hero animation usually reads as decoration. The
 * justification: the entire product IS this moment (claim arrives →
 * context appears in 38ms), so replaying it once, quietly, in CSS only,
 * communicates the product faster than any headline. If the motion fails,
 * the layout degrades to a perfectly legible static ticket + panel
 * (prefers-reduced-motion renders everything instantly).
 */

function delay(ms: number): React.CSSProperties {
  return { '--d': `${ms}ms` } as React.CSSProperties;
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-[70rem] items-center gap-14 px-5 pb-20 pt-16 sm:px-8 md:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28">
        <div>
          <p
            className={`${styles.riseIn} font-mono text-xs uppercase tracking-[0.14em] text-[var(--ink-secondary)]`}
            style={delay(0)}
          >
            {HERO.eyebrow}
          </p>
          <h1
            className={`${styles.riseIn} mt-5 text-[clamp(2.5rem,5.2vw,4.125rem)] font-semibold leading-[1.04] tracking-[-0.025em] text-[var(--ink-primary)] [font-family:var(--ua-font-display)]`}
            style={delay(80)}
          >
            {HERO.headline}
          </h1>
          <p
            className={`${styles.riseIn} mt-6 max-w-[34rem] text-[1.0625rem] leading-[1.65] text-[var(--ink-secondary)] md:text-lg`}
            style={delay(160)}
          >
            {HERO.subhead}
          </p>

          <div className={`${styles.riseIn} mt-8 flex flex-wrap items-center gap-4`} style={delay(240)}>
            <Link
              href={ROUTES.signup}
              className="rounded-[var(--radius-md)] bg-[var(--action-primary)] px-5 py-3 text-[0.9375rem] font-medium text-[var(--ink-inverse)] transition-colors hover:bg-[var(--action-primary-hover)]"
            >
              {HERO.primaryCta}
            </Link>
            <a
              href="#network"
              className="group inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-[var(--ink-primary)]"
            >
              {HERO.secondaryCta}
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </a>
          </div>

          <ul
            className={`${styles.riseIn} mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border-subtle)] pt-5`}
            style={delay(320)}
          >
            {HERO.factRow.map((fact) => (
              <li
                key={fact}
                className="font-mono text-xs text-[var(--ink-secondary)]"
              >
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <HeroCaseReplay />
      </div>
    </section>
  );
}
