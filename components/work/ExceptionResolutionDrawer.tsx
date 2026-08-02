'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, UserRound, X } from 'lucide-react';
import { Drawer, Button, Input, Select, StatusBadge } from '@/components/ui';
import type { WorkQueueItem } from '@/components/work/WorkQueue';
import { humanise, label } from '@/lib/ui/labels';
import { formatConfidencePercent, formatDateTime } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';

type Candidate = {
  id: string;
  entity_type?: string;
  entity_id?: string;
  confidence?: number | null;
};

type ResolutionAction = 'confirm' | 'reject' | 'resolve' | 'dismiss';

function candidatesFor(item: WorkQueueItem): Candidate[] {
  const value = item.exceptionContext?.candidates;
  if (!Array.isArray(value)) return [];
  return value.filter((candidate): candidate is Candidate => {
    if (!candidate || typeof candidate !== 'object') return false;
    const row = candidate as Record<string, unknown>;
    return typeof row.id === 'string';
  });
}

function isMatchException(item: WorkQueueItem) {
  return item.exceptionContext?.is_match_exception === true || item.exceptionType === 'match_uncertainty';
}

export function ExceptionResolutionDrawer({
  item,
  onClose,
  onUpdated,
}: {
  item: WorkQueueItem | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [candidateId, setCandidateId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<ResolutionAction | 'assign' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => (item ? candidatesFor(item) : []), [item]);
  const matchException = item ? isMatchException(item) : false;

  function resetForNextItem() {
    setCandidateId('');
    setNote('');
    setError(null);
    setBusy(null);
  }

  async function assign(release = false) {
    if (!item) return;
    setBusy('assign');
    setError(null);
    try {
      const response = await fetch(`/api/ops/exceptions/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(release ? { release: true } : { assignToMe: true }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Unable to update assignment');
      onUpdated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update assignment');
    } finally {
      setBusy(null);
    }
  }

  async function resolve(action: ResolutionAction) {
    if (!item) return;
    if (action === 'confirm' && !candidateId) {
      setError('Select the candidate that matches this exception before confirming.');
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/ops/exceptions/${item.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': `exception-${item.id}-${action}` },
        body: JSON.stringify({
          action,
          selectedCandidateId: candidateId || null,
          resolution: note.trim() || null,
          expectedStateVersion: item.exceptionStateVersion ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Unable to resolve exception');
      onUpdated();
      resetForNextItem();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to resolve exception');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Drawer
      open={Boolean(item)}
      onClose={() => {
        resetForNextItem();
        onClose();
      }}
      title={item ? 'Review integration exception' : undefined}
      width="min(600px, 100vw)"
      footer={item ? (
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3">
          <Button variant="secondary" size="sm" onClick={() => void resolve(matchException ? 'reject' : 'dismiss')} loading={busy === 'reject' || busy === 'dismiss'}>
            {matchException ? 'Reject match' : 'Dismiss'}
          </Button>
          {/* Confirming an identity match or resolving an exception is recorded
              in audit history and is not casually undone — commit (§3.2). */}
          <Button variant="commit" size="sm" onClick={() => void resolve(matchException ? 'confirm' : 'resolve')} loading={busy === 'confirm' || busy === 'resolve'} disabled={matchException && !candidateId}>
            {matchException ? 'Confirm match' : 'Resolve exception'}
          </Button>
        </div>
      ) : undefined}
      aria-label="Review integration exception"
    >
      {item ? (
        <div className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge family="workflowStatus" value={item.status} size="sm" />
                <span className="ua-text-metadata">{label('exceptionType', item.exceptionType ?? 'other')}</span>
              </div>
              <h3 className="ua-text-section-title mt-2 text-[var(--ua-text-primary)]">{item.title}</h3>
              {item.description ? <p className="ua-text-body mt-1 leading-6 text-[var(--ua-text-secondary)]">{item.description}</p> : null}
            </div>
            <AlertTriangle className="mt-1 shrink-0 text-[var(--ua-warning)]" size={18} aria-hidden="true" />
          </div>

          <div className="ua-text-dense grid gap-3 rounded-lg border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-3 sm:grid-cols-2">
            <div>
              <div className="ua-text-metadata">Source</div>
              <div className="mt-1 font-medium text-[var(--ua-text-primary)]">{humanise(item.source ?? 'automation')}</div>
            </div>
            <div>
              <div className="ua-text-metadata">Raised</div>
              <div className="mt-1 font-medium text-[var(--ua-text-primary)]">{item.createdAt ? formatDateTime(item.createdAt) : '—'}</div>
            </div>
            <div>
              <div className="ua-text-metadata">Owner</div>
              <div className="mt-1 font-medium text-[var(--ua-text-primary)]">{item.ownerUserId ? 'Assigned' : 'Unassigned'}</div>
            </div>
            <div>
              <div className="ua-text-metadata">Deadline</div>
              <div className="mt-1 font-medium text-[var(--ua-text-primary)]">{item.dueAt ? formatDateTime(item.dueAt) : 'No deadline recorded'}</div>
            </div>
          </div>

          {item.objectHref ? (
            <Link href={item.objectHref} className="ua-text-body inline-flex items-center gap-1.5 font-medium text-[var(--ua-text-primary)] underline underline-offset-2">
              Open linked case <ExternalLink size={14} aria-hidden="true" />
            </Link>
          ) : (
            <p className="ua-text-body rounded-md border border-[var(--ua-warning-border)] bg-[var(--ua-warning-bg)] p-3 text-[var(--ua-warning)]">
              This exception is not linked to a case yet. Resolve the missing decision here; the underlying source record remains unchanged until the action succeeds.
            </p>
          )}

          {matchException && candidates.length > 0 ? (
            <label className="ua-text-body block font-medium text-[var(--ua-text-primary)]">
              Candidate match <span className="text-[var(--ua-critical)]" aria-hidden="true">*</span>
              <Select value={candidateId} onChange={(event) => setCandidateId(event.target.value)} className="mt-1">
                <option value="">Select a candidate…</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {humanise(candidate.entity_type ?? 'record')} {candidate.entity_id ? hashId(candidate.entity_id) : hashId(candidate.id)}{candidate.confidence != null ? ` · ${formatConfidencePercent(candidate.confidence)} confidence` : ''}
                  </option>
                ))}
              </Select>
              <span className="ua-text-metadata mt-1 block font-normal">Confirming writes the selected relationship and audit event together.</span>
            </label>
          ) : null}

          <label className="ua-text-body block font-medium text-[var(--ua-text-primary)]">
            Resolution note <span className="ua-text-metadata font-normal">(optional)</span>
            <Input value={note} onChange={(event) => setNote(event.target.value)} className="mt-1" placeholder="Record the missing decision or source detail" maxLength={2000} />
          </label>

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--ua-border-subtle)] pt-4">
            <Button variant="secondary" size="sm" onClick={() => void assign(Boolean(item.ownerUserId))} loading={busy === 'assign'} leadingIcon={item.ownerUserId ? <X size={14} /> : <UserRound size={14} />}>
              {item.ownerUserId ? 'Release assignment' : 'Assign to me'}
            </Button>
            {item.supportPayoutCaseId ? <span className="ua-text-metadata">Case-linked decisions also appear in the case audit timeline.</span> : null}
          </div>

          {error ? <p role="alert" className="ua-text-body rounded-md border border-[var(--ua-critical)] bg-[var(--ua-risk-critical-bg)] p-3 text-[var(--ua-risk-critical)]">{error}</p> : null}
        </div>
      ) : null}
    </Drawer>
  );
}
