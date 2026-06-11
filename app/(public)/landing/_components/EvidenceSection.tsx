import { FileText } from 'lucide-react';
import { EVIDENCE } from '../_lib/content';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

/**
 * The anti-feature section: three zeros, stated as telemetry, next to the
 * thing Unauth actually produces — an evidence package manifest.
 */
export default function EvidenceSection() {
  return (
    <section className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Reveal>
            <SectionHeader
              eyebrow={EVIDENCE.eyebrow}
              headline={EVIDENCE.headline}
              body={EVIDENCE.body}
            />
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-10 grid grid-cols-3 divide-x divide-[var(--border-default)] border-y border-[var(--border-default)]">
              {EVIDENCE.counters.map((counter) => (
                <div key={counter.k} className="py-6 pr-4 first:pl-0 [&:not(:first-child)]:pl-4 sm:[&:not(:first-child)]:pl-6">
                  <p className="font-mono text-[2rem] font-medium leading-none text-[var(--ink-primary)] sm:text-[2.5rem]">
                    {counter.v}
                  </p>
                  <p className="mt-2 text-xs leading-snug text-[var(--ink-tertiary)] sm:text-[0.8125rem]">
                    {counter.k}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={160}>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
            <div className="border-b border-[var(--border-subtle)] px-5 py-3.5">
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--ink-secondary)]">
                {EVIDENCE.manifest.title}
              </p>
            </div>
            <ul>
              {EVIDENCE.manifest.files.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <FileText size={14} className="shrink-0 text-[var(--ink-tertiary)]" aria-hidden />
                    <span className="truncate font-mono text-[0.8125rem] text-[var(--ink-primary)]">
                      {file.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[0.6875rem] text-[var(--ink-tertiary)]">
                    {file.meta}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="font-mono text-[0.6875rem] text-[var(--ink-tertiary)]">
                {EVIDENCE.manifest.footer}
              </p>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--lime)]" aria-hidden />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
