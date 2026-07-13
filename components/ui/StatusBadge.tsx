import type { CSSProperties } from 'react';
import { label, type LabelFamily } from '@/lib/ui/labels';

/**
 * Status system (WS1.1). Exactly five semantic tones — status is form, not a
 * sentence. Opposite meanings never share a tone; the brand accent is reserved
 * for actions/selection and never used for status.
 */
export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const TONE_STYLE: Record<StatusTone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: 'var(--surface-sunken)', fg: 'var(--text-secondary)', bd: 'var(--border)' },
  info: { bg: 'var(--info-bg)', fg: 'var(--info)', bd: 'var(--info-bd)' },
  warning: { bg: 'var(--warning-bg)', fg: 'var(--warning)', bd: 'var(--warning-bd)' },
  success: { bg: 'var(--success-bg)', fg: 'var(--success)', bd: 'var(--success-bd)' },
  danger: { bg: 'var(--risk-critical-bg)', fg: 'var(--risk-critical-fg)', bd: 'var(--risk-critical-bd)' },
};

/**
 * Value → tone. Keyed by enum value across all families (the audit's tone table
 * is value-based and collisions resolve to the same tone). Unknown values fall
 * back to neutral so a new state never mis-signals as positive/negative.
 */
export const STATUS_TONES: Record<string, StatusTone> = {
  // neutral — dormant / queued
  draft: 'neutral',
  open: 'neutral',
  pending: 'neutral',
  detected: 'neutral',
  unknown: 'neutral',
  new: 'neutral',
  inactive: 'neutral',
  disconnected: 'neutral',
  queued: 'neutral',
  paused: 'neutral',
  archived: 'neutral',
  view_only: 'neutral',
  unmatched: 'neutral',
  // info — in progress on our side
  collecting_evidence: 'info',
  ready_to_submit: 'info',
  ready_for_decision: 'info',
  manual_review: 'info',
  submitted: 'info',
  investigation: 'info',
  recovery_opened: 'info',
  in_progress: 'info',
  active: 'info',
  connected: 'success',
  enabled: 'info',
  processing: 'info',
  running: 'info',
  published: 'info',
  proceed: 'success',
  strong: 'success',
  confirmed: 'success',
  // warning — waiting on someone / time pressure
  awaiting_customer_evidence: 'warning',
  awaiting_carrier_response: 'warning',
  awaiting_3pl_response: 'warning',
  awaiting_supplier_response: 'warning',
  waiting_response: 'warning',
  evidence_needed: 'warning',
  needs_more_evidence: 'warning',
  chase_due: 'warning',
  possibly_recoverable: 'warning',
  approaching: 'warning',
  partial: 'warning',
  weak: 'warning',
  probable: 'warning',
  review: 'warning',
  hold: 'warning',
  // success — positive terminal
  paid: 'success',
  approved: 'success',
  recovered: 'success',
  recoverable: 'success',
  resolved_refunded: 'success',
  resolved_exchanged: 'success',
  completed: 'success',
  complete: 'success',
  supported: 'success',
  resolved: 'success',
  normal: 'success',
  // danger — negative / overdue / blocked
  escalated: 'danger',
  overdue: 'danger',
  not_recoverable: 'danger',
  resolved_denied: 'danger',
  blocked: 'danger',
  failed: 'danger',
  error: 'danger',
  disabled: 'danger',
  insufficient: 'danger',
  ambiguous: 'danger',
  // work-task lifecycle extras
  cancelled: 'neutral',
  snoozed: 'neutral',
};

export function statusTone(value: string | null | undefined): StatusTone {
  if (!value) return 'neutral';
  return STATUS_TONES[value] ?? 'neutral';
}

const SIZE_STYLE: Record<'sm' | 'md', CSSProperties> = {
  sm: { height: 18, paddingInline: 6, fontSize: 11, gap: 5 },
  md: { height: 22, paddingInline: 8, fontSize: 12, gap: 6 },
};

interface StatusBadgeProps {
  family: LabelFamily;
  value: string | null | undefined;
  /** Override the auto-resolved tone (e.g. a computed "overdue"). */
  tone?: StatusTone;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Renders an enum value as a sentence-case pill: coloured dot + mapped label.
 * Label resolves via the WS0.2 layer; tone via STATUS_TONES (or an override).
 */
export function StatusBadge({ family, value, tone, size = 'md', className }: StatusBadgeProps) {
  if (!value) return null;
  const resolved = tone ?? statusTone(value);
  const t = TONE_STYLE[resolved];
  const s = SIZE_STYLE[size];
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        height: s.height,
        paddingInline: s.paddingInline,
        fontSize: s.fontSize,
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        borderRadius: 'var(--radius-full)',
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }}
      />
      {label(family, value)}
    </span>
  );
}

/**
 * Priority as signal, not noise (WS1.1): urgent → danger chip, high → warning
 * chip; medium/low render as quiet neutral text (no chip) so a column of red
 * chips can't drown the real signal.
 */
export function PriorityChip({
  value,
  size = 'md',
}: {
  value: string | null | undefined;
  size?: 'sm' | 'md';
}) {
  if (!value) return null;
  if (value === 'urgent' || value === 'high') {
    return <StatusBadge family="workPriority" value={value} tone={value === 'urgent' ? 'danger' : 'warning'} size={size} />;
  }
  return (
    <span style={{ fontSize: size === 'sm' ? 11 : 12, color: 'var(--text-secondary)' }}>
      {label('workPriority', value)}
    </span>
  );
}
