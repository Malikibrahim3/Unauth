'use client';

import type { ReactNode } from 'react';
import { getClaimSlaState } from '@/lib/claims/sla';
import { PanelCard, StatusBadge, statusBadgeVariantFor } from '@/components/ui';
import {
  EVIDENCE_SOURCE_LABELS,
  EVIDENCE_TYPE_LABELS,
  QUICK_LIFECYCLE_STATUSES,
  STATUS_LABELS,
  operatorLifecycleOptions,
} from '@/components/claims/claimReviewLabels';
import { btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import type { ClaimRecord, ClaimStatus } from '@/components/claims/claimReviewTypes';

export function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  return <StatusBadge variant={statusBadgeVariantFor(status)}>{label}</StatusBadge>;
}

const SLA_DISPLAY_LABEL: Record<string, string> = {
  Overdue: 'Ageing',
  'Approaching SLA': 'Approaching threshold',
  Resolved: 'Outcome recorded',
  Normal: 'Within threshold',
  'SLA unknown': 'Age unknown',
};

export function SlaBadge({ claim }: { claim: ClaimRecord }) {
  const sla = getClaimSlaState(claim);
  const label = SLA_DISPLAY_LABEL[sla.label] ?? sla.label;
  const variant = sla.state === 'overdue' ? 'blocked' : sla.state === 'approaching' ? 'flagged' : sla.state === 'resolved' ? 'cleared' : 'held';
  return <StatusBadge variant={variant}>{label}</StatusBadge>;
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </label>
  );
}

export function RailSection({
  id,
  title,
  open,
  onToggle,
  children,
  badge,
  highlighted,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
  badge?: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <PanelCard
      variant="app"
      className="overflow-hidden p-0"
      style={{
        borderColor: highlighted ? 'var(--text-primary)' : 'var(--border-muted)',
        boxShadow: highlighted ? '0 0 0 1px var(--text-primary)' : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        style={{ background: 'var(--surface)' }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--text-secondary)' }}>{title}</span>
          {badge}
        </span>
        <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--text-secondary)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: 'var(--border-muted)' }}>
          {children}
        </div>
      )}
    </PanelCard>
  );
}

export function CaseIntelTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <PanelCard variant="appInset" className="min-w-0 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <div className="text-sm leading-snug" style={{ color: 'var(--text)' }}>{children}</div>
    </PanelCard>
  );
}

export function ClaimLifecycleStatusBar({
  claimId,
  busy,
  claimIsClosed,
  statusToSet,
  setStatusToSet,
  statusNote,
  setStatusNote,
  onStatusChange,
  reopenNote,
  setReopenNote,
  onReopen,
  canReopen,
  submitIsPrimary,
  currentStatus,
}: {
  claimId: string;
  busy: boolean;
  claimIsClosed: boolean;
  statusToSet: ClaimStatus;
  setStatusToSet: (status: ClaimStatus) => void;
  statusNote: string;
  setStatusNote: (note: string) => void;
  onStatusChange: () => void;
  reopenNote: string;
  setReopenNote: (note: string) => void;
  onReopen: () => void;
  canReopen: boolean;
  submitIsPrimary?: boolean;
  currentStatus?: string | null;
}) {
  if (claimIsClosed) {
    return (
      <div className="space-y-2">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Claim archived. Reopen to continue evidence review.</p>
        <textarea
          id="claim-reopen-note"
          className="w-full px-2 py-1.5 rounded-md text-xs resize-none"
          style={inputStyle()}
          rows={2}
          placeholder="Reason for reopening"
          value={reopenNote}
          onChange={(e) => setReopenNote(e.target.value)}
          aria-label="Reason for reopening"
        />
        <button
          type="button"
          onClick={onReopen}
          disabled={busy || !claimId || !canReopen}
          className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60"
          style={btnStyle(submitIsPrimary ? 'primary' : 'secondary')}
        >
          Reopen claim
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <FieldLabel htmlFor="claim-lifecycle-status">Review status</FieldLabel>
        <select
          id="claim-lifecycle-status"
          className="w-full px-2 py-1.5 rounded-md text-xs"
          style={inputStyle()}
          value={statusToSet}
          onChange={(e) => setStatusToSet(e.target.value as ClaimStatus)}
          aria-label="Claim lifecycle status"
        >
          {operatorLifecycleOptions(currentStatus).map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <FieldLabel htmlFor="claim-status-note">Status note (required)</FieldLabel>
        <input
          id="claim-status-note"
          type="text"
          className="w-full px-2 py-1.5 rounded-md text-xs"
          style={inputStyle()}
          placeholder="e.g. Awaiting delivery proof or customer evidence"
          value={statusNote}
          onChange={(e) => setStatusNote(e.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={onStatusChange}
        disabled={busy || !claimId}
        className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60"
        style={btnStyle(submitIsPrimary && claimId ? 'primary' : claimId ? 'secondary' : 'disabled')}
      >
        Update review status
      </button>
      <fieldset className="flex flex-wrap gap-1 border-0 p-0 m-0">
        <legend className="sr-only">Quick status shortcuts</legend>
        {QUICK_LIFECYCLE_STATUSES.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={busy || !claimId}
            onClick={() => setStatusToSet(item.value)}
            className="rounded-md border px-2 py-0.5 text-xs font-semibold disabled:opacity-50"
            style={{
              borderColor: statusToSet === item.value ? 'var(--accent)' : 'var(--border-muted)',
              background: 'var(--surface)',
              color: statusToSet === item.value ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {item.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}

export { EVIDENCE_SOURCE_LABELS, EVIDENCE_TYPE_LABELS };
