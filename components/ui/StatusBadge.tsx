import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { label, type LabelFamily } from '@/lib/ui/labels';

/**
 * Status system (WS1.1). Exactly five semantic tones — status is form, not a
 * sentence. Opposite meanings never share a tone; the brand accent is reserved
 * for actions/selection and never used for status.
 */
export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';
export type SystemTone = StatusTone;

const TONE_STYLE: Record<StatusTone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: 'var(--uo-route-surface-muted)', fg: 'var(--uo-route-text-secondary)', bd: 'var(--uo-route-border-default)' },
  info: { bg: 'var(--uo-route-info-bg)', fg: 'var(--uo-route-info)', bd: 'var(--uo-route-info-border)' },
  warning: { bg: 'var(--uo-route-warning-bg)', fg: 'var(--uo-route-warning)', bd: 'var(--uo-route-warning-border)' },
  success: { bg: 'var(--uo-route-success-bg)', fg: 'var(--uo-route-success)', bd: 'var(--uo-route-success-border)' },
  // NOTE: danger intentionally stays on the risk-critical-* family, not
  // --uo-route-critical* — --uo-route-critical and --uo-route-risk-critical (etc.) are equal in
  // light mode but diverge in dark mode; forcing this onto --uo-route-critical*
  // would be a real dark-mode colour regression, not a no-op alias swap.
  danger: { bg: 'var(--uo-route-risk-critical-bg)', fg: 'var(--uo-route-risk-critical)', bd: 'var(--uo-route-risk-critical-border)' },
};

/**
 * Value → tone. Keyed by enum value across all families (the audit's tone table
 * is value-based and collisions resolve to the same tone). Unknown values fall
 * back to neutral so a new state never mis-signals as positive/negative.
 *
 * This is the legacy, family-agnostic tone lookup — kept exactly as-is so
 * `statusTone()` stays a stable read for existing consumers. The axis-aware
 * colour a badge actually renders is resolved separately, below, via
 * `STATUS_AXES` — that is where the §17.4 semantic-axis reassignments live.
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
  // §6.3 attention scale: "overdue" fires on most rows in this domain
  // (carrier/3PL waits routinely run a week), so it stays a warning, not a
  // hard-breach danger chip.
  overdue: 'warning',
  // danger — negative / blocked
  escalated: 'danger',
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
  unavailable: 'neutral',
  not_applicable: 'neutral',
};

export function statusTone(value: string | null | undefined): StatusTone {
  if (!value) return 'neutral';
  return STATUS_TONES[value] ?? 'neutral';
}

// ---------------------------------------------------------------------------
// §17.4 axis model. Every indicator on the product belongs to exactly one of
// six semantic families; a value's *family* decides which colour vocabulary
// it draws from, so "ready for decision" (workflow) and "maximum exposure"
// (analytical) can never collide again.
// ---------------------------------------------------------------------------

export type StatusFamily = 'outcome' | 'workflow' | 'urgency' | 'trust' | 'source' | 'system';
export type OutcomeTone = 'prevented' | 'recovered' | 'realised' | 'open' | 'identified';
export type WorkflowTone = 'ready' | 'active' | 'waiting' | 'escalated' | 'blocked' | 'closed';
export type UrgencyTone = 'breached' | 'approaching' | 'none';
export type TrustTone = 'verified' | 'partial' | 'stale' | 'unavailable' | 'unknown' | 'withheld' | 'mixed';
export type SourceTone = 'connected' | 'degraded' | 'error' | 'not-configured' | 'observed';

export type AnyStatusTone = OutcomeTone | WorkflowTone | UrgencyTone | TrustTone | SourceTone | SystemTone;

interface ToneStyle {
  bg: string;
  fg: string;
  bd: string;
}

/** A flat colour token expressed as fg, with bg/border derived via colour-mix — never a hex literal. */
function axisToneStyle(colorVar: string): ToneStyle {
  const fg = `var(${colorVar})`;
  return {
    fg,
    bg: `color-mix(in srgb, ${fg} 12%, var(--uo-route-surface-primary))`,
    bd: `color-mix(in srgb, ${fg} 32%, var(--uo-route-surface-primary))`,
  };
}

const OUTCOME_TONE_STYLE: Record<OutcomeTone, ToneStyle> = {
  prevented: axisToneStyle('--uo-route-outcome-prevented'),
  recovered: axisToneStyle('--uo-route-outcome-recovered'),
  realised: axisToneStyle('--uo-route-outcome-realised'),
  open: axisToneStyle('--uo-route-outcome-open'),
  identified: axisToneStyle('--uo-route-outcome-identified'),
};

const WORKFLOW_TONE_STYLE: Record<WorkflowTone, ToneStyle> = {
  ready: { fg: 'var(--uo-route-workflow-ready)', bg: 'var(--uo-route-workflow-ready-bg)', bd: 'var(--uo-route-workflow-ready-border)' },
  active: { fg: 'var(--uo-route-workflow-active)', bg: 'var(--uo-route-workflow-active-bg)', bd: 'var(--uo-route-workflow-active-border)' },
  waiting: { fg: 'var(--uo-route-workflow-waiting)', bg: 'var(--uo-route-workflow-waiting-bg)', bd: 'var(--uo-route-workflow-waiting-border)' },
  escalated: { fg: 'var(--uo-route-workflow-escalated)', bg: 'var(--uo-route-workflow-escalated-bg)', bd: 'var(--uo-route-workflow-escalated-border)' },
  blocked: { fg: 'var(--uo-route-workflow-blocked)', bg: 'var(--uo-route-workflow-blocked-bg)', bd: 'var(--uo-route-workflow-blocked-border)' },
  closed: { fg: 'var(--uo-route-workflow-closed)', bg: 'var(--uo-route-workflow-closed-bg)', bd: 'var(--uo-route-workflow-closed-border)' },
};

const URGENCY_TONE_STYLE: Record<UrgencyTone, ToneStyle> = {
  breached: axisToneStyle('--uo-route-urgency-breached'),
  approaching: axisToneStyle('--uo-route-urgency-approaching'),
  none: axisToneStyle('--uo-route-urgency-none'),
};

const TRUST_TONE_STYLE: Record<TrustTone, ToneStyle> = {
  verified: axisToneStyle('--uo-route-trust-verified'),
  partial: axisToneStyle('--uo-route-trust-partial'),
  stale: axisToneStyle('--uo-route-trust-stale'),
  unavailable: axisToneStyle('--uo-route-trust-unavailable'),
  unknown: axisToneStyle('--uo-route-trust-unknown'),
  withheld: axisToneStyle('--uo-route-trust-withheld'),
  mixed: axisToneStyle('--uo-route-trust-mixed'),
};

const SOURCE_TONE_STYLE: Record<SourceTone, ToneStyle> = {
  connected: axisToneStyle('--uo-route-source-connected'),
  degraded: axisToneStyle('--uo-route-source-degraded'),
  error: axisToneStyle('--uo-route-source-error'),
  'not-configured': axisToneStyle('--uo-route-source-not-configured'),
  observed: axisToneStyle('--uo-route-source-observed'),
};

function resolveToneStyle(axis: StatusFamily, tone: AnyStatusTone): ToneStyle {
  switch (axis) {
    case 'outcome':
      return OUTCOME_TONE_STYLE[tone as OutcomeTone];
    case 'workflow':
      return WORKFLOW_TONE_STYLE[tone as WorkflowTone];
    case 'urgency':
      return URGENCY_TONE_STYLE[tone as UrgencyTone];
    case 'trust':
      return TRUST_TONE_STYLE[tone as TrustTone];
    case 'source':
      return SOURCE_TONE_STYLE[tone as SourceTone];
    case 'system':
    default:
      return TONE_STYLE[(tone as SystemTone) in TONE_STYLE ? (tone as SystemTone) : 'neutral'];
  }
}

/**
 * §17.4 reassignments required by the forensic audit — a value whose axis
 * differs from its legacy system tone. `published` (F-13), `escalated`
 * (F-12) and `resolved_denied` (§15.1) move off status-shaped colour
 * entirely; `connected` and the qualified-value group move onto the
 * source/trust axes those concepts actually belong to. `paid` defaults to
 * `outcome/recovered` — a caller resolving an order's *payment* status
 * (rather than a recovery) should pass an explicit `axis="source"` override
 * (F-14: one value, two meanings, disambiguated by family, not by value).
 */
const REQUIRED_AXIS_OVERRIDES: Partial<Record<string, { axis: Exclude<StatusFamily, 'system'>; tone: AnyStatusTone }>> = {
  published: { axis: 'workflow', tone: 'active' },
  resolved_denied: { axis: 'outcome', tone: 'prevented' },
  paid: { axis: 'outcome', tone: 'recovered' },
  connected: { axis: 'source', tone: 'connected' },
  escalated: { axis: 'workflow', tone: 'escalated' },
  stale: { axis: 'trust', tone: 'stale' },
  partial: { axis: 'trust', tone: 'partial' },
  no_data: { axis: 'trust', tone: 'unavailable' },
  unavailable: { axis: 'trust', tone: 'unavailable' },
};

/** Every `STATUS_TONES` key, assigned to exactly one axis. */
export const STATUS_AXES: Record<string, { axis: StatusFamily; tone: AnyStatusTone }> = Object.fromEntries(
  Object.entries(STATUS_TONES).map(([value, tone]) => [value, REQUIRED_AXIS_OVERRIDES[value] ?? { axis: 'system' as const, tone }]),
);

interface StatusBadgeProps {
  family: LabelFamily;
  value: string | null | undefined;
  /** Resolved from STATUS_AXES when omitted. */
  axis?: StatusFamily;
  /** Override the auto-resolved tone (e.g. a computed "overdue"). */
  tone?: AnyStatusTone;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Renders an enum value as a sentence-case pill: coloured dot + mapped label.
 * Label resolves via the WS0.2 layer; colour via the value's axis (or an
 * explicit `axis`/`tone` override).
 */
export function StatusBadge({ family, value, axis, tone, size = 'md', className }: StatusBadgeProps) {
  if (!value) return null;
  // An explicit `tone` (with no `axis`) is a legacy-shaped override — it
  // always paired with the flat system tones, so it resolves against
  // `system` rather than the value's own axis (which may differ, e.g. a
  // caller forcing `tone="neutral"` on a value whose default axis is now
  // `outcome`). Only when the caller supplies neither does the value's own
  // `STATUS_AXES` entry — axis and tone together — apply.
  let resolvedAxis: StatusFamily;
  let resolvedTone: AnyStatusTone;
  if (axis !== undefined || tone !== undefined) {
    resolvedAxis = axis ?? 'system';
    resolvedTone = tone ?? STATUS_AXES[value]?.tone ?? statusTone(value);
  } else {
    const defaultEntry = STATUS_AXES[value] ?? { axis: 'system' as const, tone: statusTone(value) };
    resolvedAxis = defaultEntry.axis;
    resolvedTone = defaultEntry.tone;
  }
  const t = resolveToneStyle(resolvedAxis, resolvedTone);
  return (
    <span
      className={cn('ua-status-badge', `ua-status-badge--${size}`, className)}
      data-axis={resolvedAxis}
      style={{
        '--uo-route-status-bg': t.bg,
        '--uo-route-status-fg': t.fg,
        '--uo-route-status-border': t.bd,
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
    return <StatusBadge family="workPriority" value={value} axis="system" tone={value === 'urgent' ? 'danger' : 'warning'} size={size} />;
  }
  return (
    <span className={size === 'sm' ? 'ua-priority-text ua-priority-text--sm' : 'ua-priority-text'}>
      {label('workPriority', value)}
    </span>
  );
}
