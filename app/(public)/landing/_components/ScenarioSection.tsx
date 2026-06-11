import { SCENARIO } from '../_lib/content';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

/**
 * Specificity instead of testimonials: one reconstructed case file,
 * set as a ledger. The punchline carries the network argument.
 */
export default function ScenarioSection() {
  return (
    <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-overlay)]">
      <div className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28">
        <Reveal>
          <SectionHeader
            eyebrow={SCENARIO.eyebrow}
            headline={SCENARIO.headline}
            body={SCENARIO.body}
          />
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  {['date', 'merchant', 'event', 'amount', 'outcome'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 font-mono text-[0.6875rem] font-normal uppercase tracking-[0.1em] text-[var(--ink-tertiary)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCENARIO.rows.map((row) => (
                  <tr
                    key={`${row.date}-${row.amount}`}
                    className="border-b border-[var(--border-subtle)] last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[var(--ink-secondary)]">
                      {row.date}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[var(--ink-primary)]">
                      {row.merchant}
                      <span className="text-[var(--ink-tertiary)]"> · {row.vertical}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[var(--ink-secondary)]">{row.event}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-sm text-[var(--ink-primary)]">
                      {row.amount}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 font-mono text-[0.6875rem] ${
                          row.outcome === 'chargeback'
                            ? 'bg-[var(--sev-definite-fill)] text-[var(--sev-definite)]'
                            : 'bg-[var(--sev-probable-fill)] text-[var(--sev-probable)]'
                        }`}
                      >
                        {row.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="font-mono text-xs text-[var(--ink-tertiary)]">{SCENARIO.total}</p>
            <p className="max-w-[30rem] text-[0.9375rem] font-medium leading-relaxed text-[var(--ink-primary)]">
              {SCENARIO.punchline}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
