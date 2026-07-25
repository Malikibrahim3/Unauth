import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * KeyInsightCallout — the compact "key insight" band that operational pages show
 * in place of a hero chart. Reads the page's already-loaded data and states the
 * one thing worth acting on as a short sentence (numbers emphasised via <strong>),
 * not a graph. Non-interactive; sits in `WorkbenchPage.primaryVisual`.
 *
 * Tone tints only the leading icon chip — the card itself stays a neutral bordered
 * panel so the line reads as context, not as an alert banner. Tones mirror the five
 * StatusBadge tones so meaning stays consistent across the product.
 */
export type KeyInsightTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const TONE: Record<KeyInsightTone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: 'var(--ua-surface-muted)', fg: 'var(--ua-text-secondary)', bd: 'var(--ua-border-default)' },
  info: { bg: 'var(--ua-info-bg)', fg: 'var(--ua-info)', bd: 'var(--ua-info-border)' },
  warning: { bg: 'var(--ua-warning-bg)', fg: 'var(--ua-warning)', bd: 'var(--ua-warning-border)' },
  success: { bg: 'var(--ua-success-bg)', fg: 'var(--ua-success)', bd: 'var(--ua-success-border)' },
  // danger follows the risk-critical family, not --ua-critical — they match in
  // light mode but diverge in dark (see StatusBadge for the same note).
  danger: { bg: 'var(--ua-risk-critical-bg)', fg: 'var(--ua-risk-critical)', bd: 'var(--ua-risk-critical-border)' },
};

interface KeyInsightCalloutProps {
  /** The insight sentence. Emphasise figures with <strong> (rendered in mono/tabular). */
  children: ReactNode;
  /** Small sentence-case metadata label above the sentence, e.g. "Needs attention". */
  eyebrow?: string;
  /** Optional leading icon (e.g. a lucide icon at size 16). Tinted by tone. */
  icon?: ReactNode;
  tone?: KeyInsightTone;
  /** Optional trailing muted clause, right-aligned on wide viewports. */
  detail?: ReactNode;
  className?: string;
}

export function KeyInsightCallout({
  children,
  eyebrow,
  icon,
  tone = 'neutral',
  detail,
  className,
}: KeyInsightCalloutProps) {
  const t = TONE[tone];
  return (
    <section
      className={cn('flex flex-wrap items-center gap-3', className)}
      data-auth-visual="key-insight"
      style={{
        padding: '12px 14px',
        border: '1px solid var(--ua-border-default)',
        borderRadius: 'var(--ua-radius-surface)',
        background: 'var(--ua-surface-primary)',
        boxShadow: 'none',
      }}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="inline-flex shrink-0 items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: 'var(--ua-radius-surface)',
            background: t.bg,
            color: t.fg,
            border: `1px solid ${t.bd}`,
          }}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p
            className="m-0"
            style={{
              color: 'var(--ua-text-tertiary)',
              fontSize: 'var(--ua-text-micro-size)',
              fontWeight: 'var(--ua-text-micro-weight)' as unknown as number,
              letterSpacing: 'var(--ua-text-micro-tracking)',
              lineHeight: 'var(--ua-text-micro-leading)',
              marginBottom: 4,
            }}
          >
            {eyebrow}
          </p>
        ) : null}
        <p
          className="m-0 [&_strong]:font-semibold [&_strong]:tabular-nums [&_strong]:text-[var(--ua-text-primary)]"
          style={{ color: 'var(--ua-text-secondary)', fontSize: 13, lineHeight: 1.45 }}
        >
          {children}
        </p>
      </div>
      {detail ? (
        <div
          className="shrink-0"
          style={{ color: 'var(--ua-text-tertiary)', fontSize: 11, lineHeight: 1.4 }}
        >
          {detail}
        </div>
      ) : null}
    </section>
  );
}
