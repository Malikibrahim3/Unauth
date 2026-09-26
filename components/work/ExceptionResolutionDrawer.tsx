'use client';

import { useMemo, useState } from 'react';
import Link from '@/components/navigation/AppNavLink';
import type { WorkQueueItem } from '@/lib/work/types';
import { humanise, label } from '@/lib/ui/labels';
import { formatConfidencePercent, formatDateTime } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';

type Candidate = { id: string; entity_type?: string; entity_id?: string; confidence?: number | null };
type ResolutionAction = 'confirm' | 'reject' | 'resolve' | 'dismiss';
type ExceptionWorkItem = Omit<Pick<WorkQueueItem, 'id' | 'title' | 'description' | 'status' | 'source' | 'createdAt' | 'ownerUserId' | 'dueAt' | 'objectHref' | 'supportPayoutCaseId' | 'exceptionType' | 'exceptionContext' | 'exceptionStateVersion'>, 'createdAt'> & { createdAt: string | null };

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";
const line = '1px solid #eae8e5';

function candidatesFor(item: ExceptionWorkItem): Candidate[] {
  const value = item.exceptionContext?.candidates;
  if (!Array.isArray(value)) return [];
  return value.filter((candidate): candidate is Candidate => Boolean(candidate && typeof candidate === 'object' && typeof (candidate as Record<string, unknown>).id === 'string'));
}

function isMatchException(item: ExceptionWorkItem) {
  return item.exceptionContext?.is_match_exception === true || item.exceptionType === 'match_uncertainty';
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><span style={{ display: 'block', color: '#64686d', letterSpacing: '.06em', font: `500 9.5px/1 ${sans}` }}>{label.toUpperCase()}</span><strong style={{ display: 'block', marginTop: 6, color: '#1c1f23', font: `500 11.5px/1.4 ${sans}` }}>{value}</strong></div>;
}

export function ExceptionResolutionDrawer({ item, onClose, onUpdated }: { item: ExceptionWorkItem | null; onClose: () => void; onUpdated: () => void }) {
  const [candidateId, setCandidateId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<ResolutionAction | 'assign' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const candidates = useMemo(() => item ? candidatesFor(item) : [], [item]);
  const matchException = item ? isMatchException(item) : false;

  function close() {
    setCandidateId(''); setNote(''); setError(null); setBusy(null); onClose();
  }

  async function assign(release = false) {
    if (!item) return;
    setBusy('assign'); setError(null);
    try {
      const response = await fetch(`/api/ops/exceptions/${item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(release ? { release: true } : { assignToMe: true }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Unable to update assignment');
      onUpdated();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update assignment'); }
    finally { setBusy(null); }
  }

  async function resolve(action: ResolutionAction) {
    if (!item) return;
    if (action === 'confirm' && !candidateId) { setError('Select the candidate that matches this exception before confirming.'); return; }
    setBusy(action); setError(null);
    try {
      const response = await fetch(`/api/ops/exceptions/${item.id}`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': `exception-${item.id}-${action}` }, body: JSON.stringify({ action, selectedCandidateId: candidateId || null, resolution: note.trim() || null, expectedStateVersion: item.exceptionStateVersion ?? null }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Unable to resolve exception');
      onUpdated(); close();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to resolve exception'); }
    finally { setBusy(null); }
  }

  if (!item) return null;
  const control = { height: 31, border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.12)', color: '#40454a', font: `400 12px/1 ${sans}` } as const;

  return <div data-overlay-id="integration-exception-resolution-drawer" role="dialog" aria-modal="true" aria-label="Review integration exception" style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'flex-end', background: 'rgba(28,27,25,.28)' }}>
    <section style={{ width: 'min(560px,100vw)', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', boxShadow: '-18px 0 48px rgba(28,27,25,.18)' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '17px 20px', borderBottom: line }}><div style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 5, background: '#fff3e9', color: '#7a5310', font: `500 10px/1.5 ${sans}` }}>{label('exceptionType', item.exceptionType ?? 'other').toUpperCase()}</span><h2 style={{ margin: '8px 0 0', color: '#1c1f23', font: `500 15px/1.3 ${sans}` }}>{item.title}</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>{item.description ?? 'The source and ledger facts need a person’s review.'}</p></div><button type="button" onClick={close} aria-label="Close" style={{ width: 28, height: 28, border: 0, background: 'transparent', color: '#64686d', cursor: 'pointer', font: `400 20px/1 ${sans}` }}>×</button></header>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 13, borderRadius: 10, background: '#f4f3f1' }}><Detail label="Source" value={humanise(item.source ?? 'automation')}/><Detail label="Raised" value={item.createdAt ? formatDateTime(item.createdAt) : '—'}/><Detail label="Owner" value={item.ownerUserId ? 'Assigned' : 'Unassigned'}/><Detail label="Deadline" value={item.dueAt ? formatDateTime(item.dueAt) : 'No deadline recorded'}/></section>
        {item.objectHref ? <Link href={item.objectHref} style={{ color: '#9b470d', textDecoration: 'none', font: `500 12px/1.4 ${sans}` }}>Open linked case →</Link> : <p style={{ margin: 0, padding: 12, borderRadius: 9, background: '#fff3e9', color: '#7a5310', font: `400 11.5px/1.5 ${sans}` }}>This exception is not linked to a case yet. The source record remains unchanged until an action succeeds.</p>}
        {matchException && candidates.length ? <label style={{ color: '#40454a', font: `500 11.5px/1.4 ${sans}` }}>Candidate match <span style={{ color: '#b0431a' }}>*</span><select value={candidateId} onChange={(event) => setCandidateId(event.target.value)} style={{ ...control, display: 'block', width: '100%', marginTop: 6, padding: '0 9px' }}><option value="">Select a candidate…</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{humanise(candidate.entity_type ?? 'record')} {candidate.entity_id ? hashId(candidate.entity_id) : hashId(candidate.id)}{candidate.confidence != null ? ` · ${formatConfidencePercent(candidate.confidence)} confidence` : ''}</option>)}</select><span style={{ display: 'block', marginTop: 5, color: '#64686d', font: `400 10.5px/1.4 ${sans}` }}>Confirming writes the selected relationship and audit event together.</span></label> : null}
        <label style={{ color: '#40454a', font: `500 11.5px/1.4 ${sans}` }}>Resolution note <span style={{ color: '#64686d', fontWeight: 400 }}>(optional)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record the missing decision or source detail" maxLength={2000} style={{ ...control, display: 'block', width: '100%', marginTop: 6, padding: '0 10px' }}/></label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingTop: 14, borderTop: line }}><button type="button" onClick={() => void assign(Boolean(item.ownerUserId))} disabled={busy === 'assign'} style={{ ...control, padding: '0 10px', cursor: 'pointer' }}>{busy === 'assign' ? 'Updating…' : item.ownerUserId ? 'Release assignment' : 'Assign to me'}</button>{item.supportPayoutCaseId ? <span style={{ color: '#64686d', font: `400 10.5px/1.4 ${mono}` }}>case-linked decisions also appear in its audit timeline</span> : null}</div>
        {error ? <p role="alert" style={{ margin: 0, padding: 11, borderRadius: 8, background: '#fdf0e6', color: '#b0431a', font: `400 11.5px/1.5 ${sans}` }}>{error}</p> : null}
      </div>
      <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: line }}><button type="button" onClick={() => void resolve(matchException ? 'reject' : 'dismiss')} disabled={Boolean(busy)} style={{ ...control, padding: '0 11px', cursor: 'pointer' }}>{busy === 'reject' || busy === 'dismiss' ? 'Recording…' : matchException ? 'Reject match' : 'Dismiss'}</button><button type="button" onClick={() => void resolve(matchException ? 'confirm' : 'resolve')} disabled={Boolean(busy) || (matchException && !candidateId)} style={{ ...control, padding: '0 12px', background: '#1c1f23', color: '#fff', opacity: matchException && !candidateId ? .45 : 1, cursor: 'pointer' }}>{busy === 'confirm' || busy === 'resolve' ? 'Recording…' : matchException ? 'Confirm match' : 'Resolve exception'}</button></footer>
    </section>
  </div>;
}
