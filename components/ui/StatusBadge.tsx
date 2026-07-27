import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { label, type LabelFamily } from '@/lib/ui/labels';

/**
 * Status system (WS1.1). Exactly five semantic tones — status is form, not a
 * sentence. Opposite meanings never share a tone; the brand accent is reserved
 * for actions/selection and never used for status.
 */
export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const TONE_STYLE: Record<StatusTone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: 'var(--ua-surface-muted)', fg: 'var(--ua-text-secondary)', bd: 'var(--ua-border-default)' },
  info: { bg: 'var(--ua-info-bg)', fg: 'var(--ua-info)', bd: 'var(--ua-info-border)' },
  warning: { bg: 'var(--ua-warning-bg)', fg: 'var(--ua-warning)', bd: 'var(--ua-warning-border)' },
  success: { bg: 'var(--ua-success-bg)', fg: 'var(--ua-success)', bd: 'var(--ua-success-border)' },
  // NOTE: danger intentionally stays on the risk-critical-* family, not
  // --ua-critical* — --ua-critical and --ua-risk-critical (etc.) are equal in
  // light mode but diverge in dark mode; forcing this onto --ua-critical*
  // would be a real dark-mode colour regression, not a no-op alias swap.
  danger: { bg: 'var(--ua-risk-critical-bg)', fg: 'var(--ua-risk-critical)', bd: 'var(--ua-risk-critical-border)' },
};

/**
 * Value → tone. Keyed by enum value across all families (the audit's tone table
 * is value-based and collisions resolve to the same tone). Unknown values fall
 * back to neutral so a new state never mis-signals as positive/negative.
 */
export const STATUS_TONES: Record<string, StatusTone> = {
  // neutral — dormant / queued
  draft: 'neutral',
  unconfirmed: 'neutral',
  corrected: 'info',
  sent: 'warning',
  response_received: 'warning',
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
  not_connected: 'neutral',
  sync_pending: 'neutral',
  verification_unavailable: 'neutral',
  // info — in progress on our side
  collecting_evidence: 'info',
  ready_to_submit: 'info',
  ready_for_decision: 'info',
  submitted: 'info',
  investigation: 'info',
  recovery_opened: 'info',
  in_progress: 'info',
  active: 'info',
  connected: 'success',
  connection_verified: 'info',
  enabled: 'info',
  processing: 'info',
  running: 'info',
  published: 'info',
  proceed: 'success',
  strong: 'success',
  confirmed: 'success',
  healthy: 'success',
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
  manual_review: 'warning',
  stale: 'warning',
  no_data: 'warning',
  attention_required: 'warning',
  not_syncing: 'warning',
  sync_failed: 'warning',
  degraded: 'warning',
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
  connection_error: 'danger',
  revoked: 'danger',
  // work-task lifecycle extras
  cancelled: 'neutral',
  snoozed: 'neutral',
  // provider lifecycle-capability evidence levels
  implemented: 'warning',
  automated_tested: 'info',
  controlled_runtime_verified: 'success',
  unavailable: 'danger',
  not_applicable: 'neutral',
};

export function statusTone(value: string | null | undefined): StatusTone {
  if (!value) return 'neutral';
  return STATUS_TONES[value] ?? 'neutral';
}

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
  return (
    <span
      className={cn('ua-status-badge', `ua-status-badge--${size}`, className)}
      style={{
        '--ua-status-bg': t.bg,
        '--ua-status-fg': t.fg,
        '--ua-status-border': t.bd,
      } as CSSProperties}
    >
      <span className="ua-status-badge__dot" aria-hidden="true" />
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
    <span className={size === 'sm' ? 'ua-priority-text ua-priority-text--sm' : 'ua-priority-text'}>
      {label('workPriority', value)}
    </span>
  );
}
