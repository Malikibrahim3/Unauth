import { MoveRight } from 'lucide-react';
import { HOW_IT_WORKS } from '../_lib/content';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

/**
 * Three numbered steps in one ruled row, with two small artifacts beneath:
 * the hash transform (step 2 made literal) and the A–D grade scale
 * (step 3 made literal).
 */
export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28">
      <Reveal>
        <SectionHeader eyebrow={HOW_IT_WORKS.eyebrow} headline={HOW_IT_WORKS.headline} />
      </Reveal>

      <div className="mt-12 grid divide-y divide-[var(--border-default)] border-y border-[var(--border-default)] md:grid-cols-3 md:divide-x md:divide-y-0">
        {HOW_IT_WORKS.steps.map((step, i) => (
          <Reveal key={step.id} delay={i * 90}>
            <div className="h-full py-7 md:px-7 md:first:pl-0 md:last:pr-0">
              <p className="font-mono text-xs text-[var(--ink-tertiary)]">{step.id}</p>
              <h3 className="mt-3 text-[1.0625rem] font-semibold leading-snug text-[var(--ink-primary)]">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-secondary)]">
                {step.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Hash transform artifact */}
        <Reveal delay={80}>
          <div className="flex h-full flex-col justify-center rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-overlay)] px-6 py-7">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 font-mono text-[0.8125rem]">
              <span className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-1.5 text-[var(--ink-secondary)] line-through decoration-[color-mix(in_srgb,var(--sev-definite)_60%,transparent)]">
                {HOW_IT_WORKS.hashDemo.input}
              </span>
              <MoveRight size={16} className="text-[var(--ink-tertiary)]" aria-hidden />
              <span className="text-[var(--ink-tertiary)]">{HOW_IT_WORKS.hashDemo.fn}</span>
              <MoveRight size={16} className="text-[var(--ink-tertiary)]" aria-hidden />
              <span className="rounded-[var(--radius-sm)] bg-[var(--action-primary)] px-3 py-1.5 text-[var(--ink-inverse)]">
                {HOW_IT_WORKS.hashDemo.output}
              </span>
            </div>
            <p className="mt-4 font-mono text-xs text-[var(--ink-tertiary)]">
              {HOW_IT_WORKS.hashDemo.note}
            </p>
          </div>
        </Reveal>

        {/* Grade scale artifact */}
        <Reveal delay={160}>
          <div className="flex h-full flex-col justify-center rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-overlay)] px-6 py-7">
            <div className="grid grid-cols-4 gap-3">
              {HOW_IT_WORKS.grades.map((g) => {
                const active = g.grade === HOW_IT_WORKS.activeGrade;
                return (
                  <div
                    key={g.grade}
                    className={`rounded-[var(--radius-md)] border px-3 py-3 text-center ${
                      active
                        ? 'border-[var(--border-strong)] bg-[var(--surface-raised)]'
                        : 'border-[var(--border-default)] bg-[var(--surface-raised)] opacity-50'
                    }`}
                  >
                    <p className="font-mono text-lg font-medium text-[var(--ink-primary)]">
                      {g.grade}
                    </p>
                    <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--ink-tertiary)]">
                      {g.label}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-[var(--ink-tertiary)]">
              The grade scores the identity match — never the customer, never the claim.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
