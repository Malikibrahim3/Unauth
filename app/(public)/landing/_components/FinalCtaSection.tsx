import Link from 'next/link';
import { FINAL_CTA, ROUTES } from '../_lib/content';
import Reveal from './Reveal';

/**
 * Closer on graphite — the lime button's one full-size appearance on the page.
 */
export default function FinalCtaSection() {
  return (
    <section className="bg-[var(--landing-graphite)]">
      <div className="mx-auto w-full max-w-[70rem] px-5 py-24 text-center sm:px-8 md:py-32">
        <Reveal>
          <h2 className="mx-auto max-w-[26ch] text-[clamp(1.875rem,4.2vw,3rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--ink-inverse)] [font-family:var(--ua-font-display)]">
            {FINAL_CTA.headline}
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mx-auto mt-5 max-w-[34rem] text-[1.0625rem] leading-[1.65] text-[color-mix(in_srgb,var(--ink-inverse)_70%,transparent)]">
            {FINAL_CTA.body}
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-9">
            <Link
              href={ROUTES.signup}
              className="inline-block rounded-[var(--radius-md)] bg-[var(--lime)] px-7 py-3.5 text-[0.9375rem] font-semibold text-[var(--lime-fg)] transition-colors hover:bg-[var(--lime-hover)]"
            >
              {FINAL_CTA.cta}
            </Link>
            <p className="mt-5 font-mono text-xs text-[color-mix(in_srgb,var(--ink-inverse)_50%,transparent)]">
              {FINAL_CTA.subline}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
