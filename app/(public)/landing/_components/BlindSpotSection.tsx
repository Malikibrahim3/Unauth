import { Check, MessageSquare } from 'lucide-react';
import { BLIND_SPOT } from '../_lib/content';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

/**
 * Two rails, told as a diagram: the card network's event stream stops at
 * settlement; the helpdesk rail is where the actual losses accumulate.
 */
export default function BlindSpotSection() {
  return (
    <section className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28">
      <Reveal>
        <SectionHeader
          eyebrow={BLIND_SPOT.eyebrow}
          headline={BLIND_SPOT.headline}
          body={BLIND_SPOT.body}
        />
      </Reveal>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {/* Rail one — card network */}
        <Reveal delay={80}>
          <div className="flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-6">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
              {BLIND_SPOT.railOneLabel}
            </p>
            <ul className="mt-5 space-y-3">
              {BLIND_SPOT.railOneEvents.map((event) => (
                <li key={event} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sev-clear-fill)]">
                    <Check size={12} className="text-[var(--sev-clear)]" />
                  </span>
                  <span className="font-mono text-sm text-[var(--ink-primary)]">
                    {event.replace(' ✓', '')}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex-1 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--surface-overlay)] px-4 py-6 text-center">
              <p className="font-mono text-xs text-[var(--ink-tertiary)]">
                {BLIND_SPOT.railOneEnd}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Rail two — helpdesk */}
        <Reveal delay={160}>
          <div className="flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-6">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
              {BLIND_SPOT.railTwoLabel}
            </p>
            <ul className="mt-5 flex-1 space-y-3">
              {BLIND_SPOT.railTwoEvents.map((event) => {
                const isYou = event.merchant === 'you';
                return (
                  <li key={`${event.merchant}-${event.text}`} className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        isYou ? 'bg-[var(--lime)]' : 'bg-[var(--sev-definite-fill)]'
                      }`}
                    >
                      <MessageSquare
                        size={11}
                        className={isYou ? 'text-[var(--lime-fg)]' : 'text-[var(--sev-definite)]'}
                      />
                    </span>
                    <span
                      className={`w-14 shrink-0 font-mono text-xs ${
                        isYou
                          ? 'font-medium text-[var(--ink-primary)]'
                          : 'text-[var(--ink-secondary)]'
                      }`}
                    >
                      {event.merchant}
                    </span>
                    <span
                      className={`text-sm ${
                        isYou
                          ? 'font-medium text-[var(--ink-primary)]'
                          : 'text-[var(--ink-secondary)]'
                      }`}
                    >
                      {event.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </div>

      <Reveal delay={220}>
        <p className="mt-8 text-[0.9375rem] font-medium text-[var(--ink-primary)]">
          {BLIND_SPOT.footnote}
        </p>
      </Reveal>
    </section>
  );
}
