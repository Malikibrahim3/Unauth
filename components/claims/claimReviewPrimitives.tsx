'use client';

import type { ReactNode } from 'react';
import { getClaimSlaState } from '@/lib/claims/sla';
import {
  EVIDENCE_SOURCE_LABELS,
  EVIDENCE_TYPE_LABELS,
  QUICK_LIFECYCLE_STATUSES,
  STATUS_LABELS,
} from '@/components/claims/claimReviewLabels';
import { SLA_COLOUR_MAP, STATUS_COLOUR_MAP, btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import type { ClaimRecord, ClaimStatus, EvidenceSource, EvidenceType } from '@/components/claims/claimReviewTypes';

export function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const c = STATUS_COLOUR_MAP[status] ?? { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      {label}
    </span>
  );
}

export function SlaBadge({ claim }: { claim: ClaimRecord }) {
  const sla = getClaimSlaState(claim);
  const c = SLA_COLOUR_MAP[sla.state] ?? SLA_COLOUR_MAP.normal;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      {sla.label}
    </span>
  );
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
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
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: highlighted ? 'var(--copper-bright)' : 'var(--border-subtle)',
        background: 'var(--bg-surface)',
        boxShadow: highlighted ? '0 0 0 1px var(--copper-bright)' : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        style={{ background: 'var(--bg-surface)' }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--ink-secondary)' }}>{title}</span>
          {badge}
        </span>
        <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function CaseIntelTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border px-3 py-2.5 min-w-0" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="text-sm leading-snug" style={{ color: 'var(--text)' }}>{children}</div>
    </div>
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
}) {
  if (claimIsClosed) {
    return (
      <div className="space-y-2">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Claim closed. Reopen to return to active queue.</p>
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
        <FieldLabel htmlFor="claim-lifecycle-status">Status</FieldLabel>
        <select
          id="claim-lifecycle-status"
          className="w-full px-2 py-1.5 rounded-md text-xs"
          style={inputStyle()}
          value={statusToSet}
          onChange={(e) => setStatusToSet(e.target.value as ClaimStatus)}
          aria-label="Claim lifecycle status"
        >
          {(Object.entries(STATUS_LABELS) as [ClaimStatus, string][]).map(([value, label]) => (
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
          placeholder="e.g. Awaiting carrier POD"
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
        Update status
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
              borderColor: statusToSet === item.value ? 'var(--accent)' : 'var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: statusToSet === item.value ? 'var(--accent)' : 'var(--text-muted)',
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
