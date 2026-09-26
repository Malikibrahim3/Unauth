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
  neutral: { bg: '#f4f3f1', fg: '#64686d', bd: '#e4e3e0' },
  info: { bg: '#edf6f8', fg: '#247388', bd: '#c4dfe5' },
  warning: { bg: '#fff3e9', fg: '#7a5310', bd: '#ead8b6' },
  success: { bg: '#eaf5ef', fg: '#1a6b43', bd: '#bfdecf' },
  // danger follows the risk-critical family, not --authority-critical — they match in
  // light mode but diverge in dark (see StatusBadge for the same note).
  danger: { bg: '#fdf0e6', fg: '#b0431a', bd: '#edc6b5' },
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
        border: '1px solid #e4e3e0',
        borderRadius: '12px',
        background: '#fff',
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
            borderRadius: '12px',
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
              color: '#6f6a63',
              fontSize: '10.5px',
              fontWeight: '#1c1f23' as unknown as number,
              letterSpacing: '#1c1f23',
              lineHeight: '1.4',
              marginBottom: 4,
            }}
          >
            {eyebrow}
          </p>
        ) : null}
        <p
          className="m-0 [&_strong]:font-semibold [&_strong]:tabular-nums [&_strong]:text-[#1c1f23]"
          style={{ color: '#64686d', fontSize: 13, lineHeight: 1.45 }}
        >
          {children}
        </p>
      </div>
      {detail ? (
        <div
          className="shrink-0"
          style={{ color: '#6f6a63', fontSize: 11, lineHeight: 1.4 }}
        >
          {detail}
        </div>
      ) : null}
    </section>
  );
}
