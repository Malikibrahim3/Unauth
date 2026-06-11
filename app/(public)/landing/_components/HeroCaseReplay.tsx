import styles from './landing.module.css';
import { HERO_PANEL, HERO_TICKET } from '../_lib/content';

/**
 * The hero artifact: a helpdesk ticket arrives, and the Unauth identity
 * panel answers it. Staged with pure CSS animation-delay (server component,
 * no JS) — the ticket lands first, the panel replies ~0.5s later, exactly
 * the rhythm the product has inside Gorgias/Zendesk.
 */

function delay(ms: number): React.CSSProperties {
  return { '--d': `${ms}ms` } as React.CSSProperties;
}

export default function HeroCaseReplay() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem]">
      {/* Helpdesk ticket */}
      <div
        className={`${styles.riseIn} relative z-0 mr-6 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 pb-14 shadow-[var(--shadow-0)] sm:mr-12`}
        style={delay(100)}
      >
        <div className="flex items-center justify-between font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--ink-tertiary)]">
          <span>{HERO_TICKET.channel}</span>
          <span>{HERO_TICKET.age}</span>
        </div>
        <p className="mt-3 text-[0.9375rem] font-semibold text-[var(--ink-primary)]">
          {HERO_TICKET.subject}
        </p>
        <p className="mt-1 text-[0.8125rem] text-[var(--ink-secondary)]">
          {HERO_TICKET.from} · {HERO_TICKET.fromMeta}
        </p>
        <p className="mt-2 font-mono text-xs text-[var(--ink-tertiary)]">{HERO_TICKET.order}</p>
        <p className="mt-3 border-l-2 border-[var(--border-default)] pl-3 text-[0.8125rem] leading-relaxed text-[var(--ink-secondary)]">
          {HERO_TICKET.body}
        </p>
      </div>

      {/* Unauth identity panel */}
      <div
        className={`${styles.riseIn} relative z-10 -mt-8 ml-6 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-raised)] shadow-[0_16px_40px_-16px_color-mix(in_srgb,var(--ink-primary)_22%,transparent)] sm:ml-12`}
        style={delay(650)}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--ink-secondary)]">
            {HERO_PANEL.title}
          </span>
          <span className="rounded-full bg-[var(--lime)] px-2 py-0.5 font-mono text-[0.6875rem] font-medium text-[var(--lime-fg)]">
            {HERO_PANEL.latency}
          </span>
        </div>

        <div className={`${styles.riseIn} flex items-center gap-3 px-5 pt-4`} style={delay(900)}>
          <span
            className={`${styles.gradePulse} flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--sev-probable-fill)] font-mono text-lg font-medium text-[var(--sev-probable)]`}
          >
            {HERO_PANEL.grade}
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--ink-primary)]">
              {HERO_PANEL.gradeLabel}
            </p>
            <p className="text-xs text-[var(--ink-tertiary)]">identity grade · network-wide</p>
          </div>
        </div>

        <div
          className={`${styles.riseIn} mx-5 mt-4 grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-overlay)]`}
          style={delay(1050)}
        >
          {HERO_PANEL.stats.map((s) => (
            <div key={s.k} className="px-3 py-2.5">
              <p className="font-mono text-[0.9375rem] font-medium text-[var(--ink-primary)]">
                {s.v}
              </p>
              <p className="mt-0.5 text-[0.625rem] uppercase tracking-[0.06em] text-[var(--ink-tertiary)]">
                {s.k}
              </p>
            </div>
          ))}
        </div>

        <ul className={`${styles.riseIn} mt-4 space-y-1.5 px-5`} style={delay(1200)}>
          {HERO_PANEL.signals.map((s) => (
            <li key={s.name} className="flex items-baseline justify-between gap-3 font-mono text-xs">
              <span className="text-[var(--ink-primary)]">{s.name}</span>
              <span className="truncate text-[var(--ink-tertiary)]">{s.detail}</span>
            </li>
          ))}
        </ul>

        <div className={`${styles.riseIn} mt-4 border-t border-[var(--border-subtle)]`} style={delay(1350)}>
          {HERO_PANEL.history.map((h) => (
            <div
              key={h.merchant}
              className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-2 text-xs"
            >
              <span className="font-mono text-[var(--ink-secondary)]">
                {h.merchant} <span className="text-[var(--ink-tertiary)]">· {h.vertical}</span>
              </span>
              <span className="hidden text-[var(--ink-tertiary)] sm:inline">{h.claim}</span>
              <span className="font-mono text-[var(--ink-primary)]">{h.amount}</span>
              <span
                className={`font-mono text-[0.6875rem] ${
                  h.outcome === 'evidence filed'
                    ? 'text-[var(--sev-clear)]'
                    : 'text-[var(--sev-definite)]'
                }`}
              >
                {h.outcome}
              </span>
            </div>
          ))}
        </div>

        <div
          className={`${styles.riseIn} flex items-center justify-between gap-3 px-5 py-3.5`}
          style={delay(1500)}
        >
          <p className="text-xs text-[var(--ink-tertiary)]">{HERO_PANEL.footer}</p>
          <span className="shrink-0 rounded-[var(--radius-md)] bg-[var(--action-primary)] px-3 py-1.5 text-xs font-medium text-[var(--ink-inverse)]">
            {HERO_PANEL.action}
          </span>
        </div>
      </div>
    </div>
  );
}
