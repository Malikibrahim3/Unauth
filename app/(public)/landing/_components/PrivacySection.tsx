import { PRIVACY } from '../_lib/content';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

/**
 * Privacy as architecture — the page's one dark section (graphite, not
 * black) so the structural guarantee reads as a different register from
 * the marketing around it. The salt demo makes "hashed" concrete.
 */
export default function PrivacySection() {
  return (
    <section id="privacy" className="bg-[var(--landing-graphite)]">
      <div className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28">
        <Reveal>
          <SectionHeader
            tone="dark"
            eyebrow={PRIVACY.eyebrow}
            headline={PRIVACY.headline}
            body={PRIVACY.body}
          />
        </Reveal>

        {/* Salt demo */}
        <Reveal delay={120}>
          <div className="mt-12 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--landing-graphite-2)] bg-[color-mix(in_srgb,var(--landing-graphite-2)_45%,var(--landing-graphite))]">
            <div className="border-b border-[var(--landing-graphite-2)] px-5 py-3">
              <p className="font-mono text-xs text-[color-mix(in_srgb,var(--ink-inverse)_55%,transparent)]">
                input&nbsp;&nbsp;<span className="text-[var(--ink-inverse)]">{PRIVACY.demo.input}</span>
                &nbsp;&nbsp;· same email, two tenants
              </p>
            </div>
            <div className="grid sm:grid-cols-2">
              {PRIVACY.demo.rows.map((row, i) => (
                <div
                  key={row.tenant}
                  className={`px-5 py-4 ${
                    i === 0
                      ? 'border-b border-[var(--landing-graphite-2)] sm:border-b-0 sm:border-r'
                      : ''
                  }`}
                >
                  <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--ink-inverse)_48%,transparent)]">
                    {row.tenant} · {row.salt}
                  </p>
                  <p className="mt-2 font-mono text-[0.9375rem] text-[var(--lime)]">{row.digest}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--landing-graphite-2)] px-5 py-3">
              <p className="text-xs leading-relaxed text-[color-mix(in_srgb,var(--ink-inverse)_60%,transparent)]">
                {PRIVACY.demo.note}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Four structural facts */}
        <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {PRIVACY.facts.map((fact, i) => (
            <Reveal key={fact.title} delay={i * 70}>
              <div className="border-t border-[var(--landing-graphite-2)] pt-5">
                <h3 className="text-[0.9375rem] font-semibold text-[var(--ink-inverse)]">
                  {fact.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[color-mix(in_srgb,var(--ink-inverse)_65%,transparent)]">
                  {fact.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
