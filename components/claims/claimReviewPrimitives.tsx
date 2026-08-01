'use client';

import type { ReactNode } from 'react';
import { getClaimSlaState } from '@/lib/claims/sla';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  EVIDENCE_SOURCE_LABELS,
  EVIDENCE_TYPE_LABELS,
  QUICK_LIFECYCLE_STATUSES,
  operatorLifecycleOptions,
} from '@/components/claims/claimReviewLabels';
import { btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import type { ClaimRecord, ClaimStatus } from '@/components/claims/claimReviewTypes';

export function StatusPill({ status }: { status: string }) {
  return <StatusBadge family="caseStatus" value={status} />;
}

export function SlaBadge({ claim }: { claim: ClaimRecord }) {
  const sla = getClaimSlaState(claim);
  const value = sla.state === 'overdue' || sla.state === 'approaching' || sla.state === 'resolved' ? sla.state : 'normal';
  return <StatusBadge family="workflowStatus" value={value} />;
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold mb-1" style={{ color: 'var(--ua-text-secondary)' }}>
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
    <Card unstyled
      variant="panel"
      className={`overflow-hidden p-0 ${id === 'manage' ? 'ua-focal-panel rounded-none border-x-0 shadow-none' : ''}`}
      style={{
        borderColor: highlighted ? 'var(--ua-text-primary)' : 'var(--ua-border-subtle)',
        boxShadow: undefined,
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        style={{ background: 'var(--ua-surface-primary)' }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-[length:var(--ua-text-chart-title-size)] font-semibold" style={{ color: 'var(--ua-text-primary)' }}>{title}</span>
          {badge}
        </span>
        <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--ua-text-secondary)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-4" style={{ borderColor: 'var(--ua-border-subtle)' }}>
          {children}
        </div>
      )}
    </Card>
  );
}

export function CaseIntelTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card unstyled variant="muted" className="min-w-0 px-3 py-2.5">
      <p className="text-[length:var(--ua-text-metadata-size)] font-semibold mb-1" style={{ color: 'var(--ua-text-secondary)' }}>{label}</p>
      <div className="text-sm leading-snug" style={{ color: 'var(--ua-text-primary)' }}>{children}</div>
    </Card>
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
        <p className="text-xs" style={{ color: 'var(--ua-text-secondary)' }}>Case archived. Reopen to continue evidence review.</p>
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
          Reopen case
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
          aria-label="Case lifecycle status"
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
              borderColor: statusToSet === item.value ? 'var(--ua-action-primary)' : 'var(--ua-border-subtle)',
              background: 'var(--ua-surface-primary)',
              color: statusToSet === item.value ? 'var(--ua-action-primary)' : 'var(--ua-text-secondary)',
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
