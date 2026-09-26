'use client';

import type { ReactNode } from 'react';
import { getClaimSlaState } from '@/lib/claims/sla';
import { Card, Select, Textarea } from '@/components/ui';
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
    <label htmlFor={htmlFor} style={{ display: 'block', marginBottom: 4, color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>
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
      style={{
        overflow: 'hidden',
        padding: 0,
        borderRadius: id === 'manage' ? 0 : 12,
        borderLeft: id === 'manage' ? 0 : undefined,
        borderRight: id === 'manage' ? 0 : undefined,
        borderColor: highlighted ? '#1c1f23' : '#eae8e5',
        boxShadow: undefined,
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', border: 0, padding: '12px 16px', background: '#fff', textAlign: 'left' }}
        aria-expanded={open}
      >
        <span style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 6 }}>
          <span style={{ overflow: 'hidden', color: '#1c1f23', fontSize: 13, fontWeight: 500, lineHeight: '20px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          {badge}
        </span>
        {/* Styled disclosure, not a raw triangle glyph (C11) — matches
         * components/ui/Disclosure's chevron-rotation convention. */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginLeft: 8, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 120ms ease' }}><path d="m3.5 5.25 3.5 3.5 3.5-3.5" /></svg>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #eae8e5', padding: '16px 16px 16px' }}>
          {children}
        </div>
      )}
    </Card>
  );
}

export function CaseIntelTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card unstyled variant="muted" style={{ minWidth: 0, padding: '10px 12px' }}>
      <p style={{ margin: '0 0 4px', color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>{label}</p>
      <div style={{ color: '#1c1f23', fontSize: 12, lineHeight: 1.45 }}>{children}</div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0, color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>Case archived. Reopen to continue evidence review.</p>
        <Textarea
          id="claim-reopen-note"
          style={{ ...inputStyle(), resize: 'none' }}
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
          style={{ ...btnStyle(submitIsPrimary ? 'primary' : 'secondary'), width: '100%', padding: '6px 12px', borderRadius: 6, color: '#1c1f23', fontSize: 13, fontWeight: 500, lineHeight: '20px', opacity: busy || !claimId || !canReopen ? .6 : 1 }}
        >
          Reopen case
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ display: 'block' }}>
        <FieldLabel htmlFor="claim-lifecycle-status">Review status</FieldLabel>
        <Select
          id="claim-lifecycle-status"
          style={inputStyle()}
          value={statusToSet}
          onChange={(e) => setStatusToSet(e.target.value as ClaimStatus)}
          aria-label="Case lifecycle status"
        >
          {operatorLifecycleOptions(currentStatus).map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </label>
      <label style={{ display: 'block' }}>
        <FieldLabel htmlFor="claim-status-note">Status note (required)</FieldLabel>
        <input
          id="claim-status-note"
          type="text"
          style={{ ...inputStyle(), boxSizing: 'border-box', width: '100%', padding: '6px 8px', borderRadius: 6, color: '#40454a', fontSize: 13, lineHeight: '20px' }}
          placeholder="e.g. Awaiting delivery proof or customer evidence"
          value={statusNote}
          onChange={(e) => setStatusNote(e.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={onStatusChange}
        disabled={busy || !claimId}
        style={{ ...btnStyle(submitIsPrimary && claimId ? 'primary' : claimId ? 'secondary' : 'disabled'), width: '100%', padding: '6px 12px', borderRadius: 6, color: '#1c1f23', fontSize: 13, fontWeight: 500, lineHeight: '20px', opacity: busy || !claimId ? .6 : 1 }}
      >
        Update review status
      </button>
      <fieldset style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: 0, border: 0, padding: 0 }}>
        <legend className="sr-only">Quick status shortcuts</legend>
        {QUICK_LIFECYCLE_STATUSES.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={busy || !claimId}
            onClick={() => setStatusToSet(item.value)}
            style={{
              borderWidth: 1,
              borderStyle: 'solid',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 500,
              lineHeight: '16px',
              opacity: busy || !claimId ? .5 : 1,
              borderColor: statusToSet === item.value ? '#9f4f08' : '#eae8e5',
              background: '#fff',
              color: statusToSet === item.value ? '#9f4f08' : '#64686d',
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
