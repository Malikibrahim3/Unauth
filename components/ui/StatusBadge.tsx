import { label, type LabelFamily } from '@/lib/ui/labels';

/**
 * Status system (WS1.1). Exactly five semantic tones — status is form, not a
 * sentence. Opposite meanings never share a tone; the brand accent is reserved
 * for actions/selection and never used for status.
 */
export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';
export type SystemTone = StatusTone;

const TONE_STYLE: Record<StatusTone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: '#f4f3f1', fg: '#64686d', bd: '#e4e3e0' },
  info: { bg: '#edf6f8', fg: '#247388', bd: '#c4dfe5' },
  warning: { bg: '#fff3e9', fg: '#7a5310', bd: '#ead8b6' },
  success: { bg: '#eaf5ef', fg: '#1a6b43', bd: '#bfdecf' },
  // NOTE: danger intentionally stays on the risk-critical-* family so the
  // meaning remains distinct from ordinary warning and success states.
  danger: { bg: '#fdf0e6', fg: '#b0431a', bd: '#edc6b5' },
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
  const fg = colorVar.includes('recovered') || colorVar.includes('verified') || colorVar.includes('connected') ? '#1a6b43'
    : colorVar.includes('realised') || colorVar.includes('breached') || colorVar.includes('error') ? '#b0431a'
      : colorVar.includes('approaching') || colorVar.includes('stale') || colorVar.includes('partial') ? '#7a5310'
        : colorVar.includes('prevented') || colorVar.includes('observed') ? '#247388'
          : '#64686d';
  return {
    fg,
    bg: `color-mix(in srgb, ${fg} 12%, #fff)`,
    bd: `color-mix(in srgb, ${fg} 32%, #fff)`,
  };
}

const OUTCOME_TONE_STYLE: Record<OutcomeTone, ToneStyle> = {
  prevented: axisToneStyle('--authority-outcome-prevented'),
  recovered: axisToneStyle('--authority-outcome-recovered'),
  realised: axisToneStyle('--authority-outcome-realised'),
  open: axisToneStyle('--authority-outcome-open'),
  identified: axisToneStyle('--authority-outcome-identified'),
};

const WORKFLOW_TONE_STYLE: Record<WorkflowTone, ToneStyle> = {
  ready: { fg: '#1a6b43', bg: '#f4f3f1', bd: '#e4e3e0' },
  active: { fg: '#40454a', bg: '#f4f3f1', bd: '#e4e3e0' },
  waiting: { fg: '#40454a', bg: '#f4f3f1', bd: '#e4e3e0' },
  escalated: { fg: '#40454a', bg: '#f4f3f1', bd: '#e4e3e0' },
  blocked: { fg: '#40454a', bg: '#f4f3f1', bd: '#e4e3e0' },
  closed: { fg: '#40454a', bg: '#f4f3f1', bd: '#e4e3e0' },
};

const URGENCY_TONE_STYLE: Record<UrgencyTone, ToneStyle> = {
  breached: axisToneStyle('--authority-urgency-breached'),
  approaching: axisToneStyle('--authority-urgency-approaching'),
  none: axisToneStyle('--authority-urgency-none'),
};

const TRUST_TONE_STYLE: Record<TrustTone, ToneStyle> = {
  verified: axisToneStyle('--authority-trust-verified'),
  partial: axisToneStyle('--authority-trust-partial'),
  stale: axisToneStyle('--authority-trust-stale'),
  unavailable: axisToneStyle('--authority-trust-unavailable'),
  unknown: axisToneStyle('--authority-trust-unknown'),
  withheld: axisToneStyle('--authority-trust-withheld'),
  mixed: axisToneStyle('--authority-trust-mixed'),
};

const SOURCE_TONE_STYLE: Record<SourceTone, ToneStyle> = {
  connected: axisToneStyle('--authority-source-connected'),
  degraded: axisToneStyle('--authority-source-degraded'),
  error: axisToneStyle('--authority-source-error'),
  'not-configured': axisToneStyle('--authority-source-not-configured'),
  observed: axisToneStyle('--authority-source-observed'),
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
export function StatusBadge({ family, value, axis, tone, size = 'md', className: _className }: StatusBadgeProps) {
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
      data-axis={resolvedAxis}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        borderRadius: 6,
        padding: size === 'sm' ? '3px 7px' : '4px 8px',
        fontSize: 10,
        fontWeight: 600,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.fg }} aria-hidden="true" />
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
    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 6, background: '#f4f3f1', padding: size === 'sm' ? '3px 7px' : '4px 8px', color: '#40454a', fontSize: 10, fontWeight: 600 }}>
      {label('workPriority', value)}
    </span>
  );
}
