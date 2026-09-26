'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { formatConfidencePercent, formatDateTime, formatMoney } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import { providerLabel } from '@/lib/ui/merchantCopy';

type Candidate = {
  id: string;
  entity_type?: string;
  entity_id?: string;
  confidence?: number | null;
  amount_minor?: number | null;
  currency?: string | null;
  source_system?: string | null;
};

type ReconciliationException = {
  id: string;
  support_payout_case_id: string | null;
  exception_type: string;
  confidence: string;
  status: string;
  title: string;
  detail: string | null;
  context: Record<string, unknown> | null;
  source_system: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  priority?: string | null;
  due_at?: string | null;
  state_version?: number | null;
  created_at: string;
  resolved_at?: string | null;
};

type ResolutionAction = 'confirm' | 'reject' | 'resolve' | 'dismiss';

const FACTS = [
  ['record_id', 'Record reference'],
  ['record_type', 'Record type'],
  ['amount_minor', 'Amount'],
  ['state', 'Financial state'],
  ['effective_at', 'Effective time'],
] as const;

function candidateRows(row: ReconciliationException): Candidate[] {
  const value = row.context?.candidates;
  if (!Array.isArray(value)) return [];
  return value.filter((candidate): candidate is Candidate => Boolean(candidate && typeof candidate === 'object' && typeof (candidate as Candidate).id === 'string'));
}

function candidateEntityLabel(value: string | null | undefined) {
  if (!value) return 'Record';
  const words = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Record';
}

function nestedValue(context: Record<string, unknown> | null, side: 'source' | 'ledger', key: string): unknown {
  if (!context) return null;
  const camel = key.replace(/(^|_)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());
  for (const directKey of [`${side}_${key}`, `${side}Record${camel}`]) {
    if (context[directKey] != null) return context[directKey];
  }
  for (const nestedKey of [side, `${side}_record`]) {
    const nested = context[nestedKey];
    if (nested && typeof nested === 'object' && (nested as Record<string, unknown>)[key] != null) return (nested as Record<string, unknown>)[key];
  }
  return null;
}

function currencyFor(row: ReconciliationException, side: 'source' | 'ledger') {
  const value = nestedValue(row.context, side, 'currency');
  if (typeof value === 'string' && /^[A-Za-z]{3}$/.test(value)) return value.toUpperCase();
  return typeof row.context?.currency === 'string' && /^[A-Za-z]{3}$/.test(row.context.currency) ? row.context.currency.toUpperCase() : null;
}

function renderFact(row: ReconciliationException, side: 'source' | 'ledger', key: string) {
  const value = nestedValue(row.context, side, key);
  if (key === 'amount_minor') return typeof value === 'number' && Number.isSafeInteger(value) && currencyFor(row, side) ? formatMoney(value, currencyFor(row, side)!) : 'Unavailable';
  if (key === 'effective_at' && typeof value === 'string') return formatDateTime(value);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : 'Unavailable';
}

function factsDiffer(row: ReconciliationException, key: string) {
  const source = nestedValue(row.context, 'source', key);
  const ledger = nestedValue(row.context, 'ledger', key);
  return source != null && ledger != null && String(source) !== String(ledger);
}

function actionLabel(action: ResolutionAction) {
  if (action === 'confirm') return 'Confirm match';
  if (action === 'reject') return 'Reject match';
  if (action === 'resolve') return 'Resolve exception';
  return 'Dismiss exception';
}

function actionCopy(action: ResolutionAction) {
  if (action === 'confirm') return 'Confirm the selected source-to-ledger match. The decision and note are retained in the audit trail.';
  if (action === 'reject') return 'Reject the proposed match. The source record stays separate and the rejection is audited.';
  if (action === 'resolve') return 'Record the reason this difference is resolved. Only confirmed results enter the ledger.';
  return 'Dismiss without changing a financial result. The dismissal and note are audited.';
}

function CloseGlyph() {
  return <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4"/></svg>;
}

export function ExceptionQueue() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedStatus = searchParams.get('status');
  const status = ['open', 'resolved', 'dismissed', 'all'].includes(requestedStatus ?? '') ? requestedStatus! : 'open';
  const requestedSelectedRef = useRef(searchParams.get('selected'));
  requestedSelectedRef.current = searchParams.get('selected');
  const [rows, setRows] = useState<ReconciliationException[]>([]);
  const [selected, setSelected] = useState<ReconciliationException | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'assign' | ResolutionAction | null>(null);
  const [candidateId, setCandidateId] = useState('');
  const [note, setNote] = useState('');
  const [pendingAction, setPendingAction] = useState<ResolutionAction | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  function updateLocation(input: { selected?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if (input.selected) params.set('selected', input.selected); else params.delete('selected');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function close() {
    if (!busy) updateLocation({ selected: null });
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statuses = status === 'all' ? ['open', 'resolved', 'dismissed'] : [status];
      const responses = await Promise.all(statuses.map(async (scope) => {
        const response = await fetch(`/api/ops/exceptions?status=${scope}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Unable to load reconciliation exceptions');
        return (body.exceptions ?? []) as ReconciliationException[];
      }));
      const nextRows = responses.flat();
      setRows(nextRows);
      const requested = requestedSelectedRef.current;
      setSelected(nextRows.find((row) => row.id === requested) ?? nextRows[0] ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load reconciliation exceptions');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const requested = searchParams.get('selected');
    const next = rows.find((row) => row.id === requested)
      ?? (!requested && selected && rows.some((row) => row.id === selected.id) ? selected : null)
      ?? (!requested ? rows[0] ?? null : null);
    if (next?.id === selected?.id) return;
    setSelected(next);
    setCandidateId('');
    setNote('');
    setReceipt(null);
    setPendingAction(null);
  }, [rows, searchParams, selected?.id]);

  const candidates = useMemo(() => selected ? candidateRows(selected) : [], [selected]);
  const isMatch = selected?.context?.is_match_exception === true || selected?.exception_type === 'match_uncertainty';
  const isSettled = selected != null && selected.status !== 'open';

  async function assign(release = false) {
    if (!selected) return;
    setBusy('assign');
    setError(null);
    try {
      const response = await fetch(`/api/ops/exceptions/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(release ? { release: true } : { assignToMe: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Unable to update assignment');
      const assignedTo = body.assignment?.assigned_to ?? null;
      setRows((items) => items.map((item) => item.id === selected.id ? { ...item, assigned_to: assignedTo } : item));
      setSelected({ ...selected, assigned_to: assignedTo });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update assignment');
    } finally {
      setBusy(null);
    }
  }

  function requestResolution(action: ResolutionAction) {
    if (!selected) return;
    if (action === 'confirm' && !candidateId) {
      setError('Select the candidate that matches the source record before confirming.');
      return;
    }
    setError(null);
    setPendingAction(action);
  }

  async function resolve() {
    if (!selected || !pendingAction) return;
    setBusy(pendingAction);
    setError(null);
    try {
      const response = await fetch(`/api/ops/exceptions/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `reconciliation-${selected.id}-${pendingAction}` },
        body: JSON.stringify({ action: pendingAction, selectedCandidateId: candidateId || null, resolution: note.trim(), expectedStateVersion: selected.state_version ?? null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Unable to settle reconciliation exception');
      const settledStatus = body.exception?.status ?? (pendingAction === 'dismiss' ? 'dismissed' : 'resolved');
      setRows((items) => items.map((item) => item.id === selected.id ? { ...item, status: settledStatus } : item));
      setSelected({ ...selected, status: settledStatus });
      setReceipt(`${pendingAction === 'dismiss' || pendingAction === 'reject' ? 'Dismissal' : 'Resolution'} recorded · audit receipt ${hashId(selected.id)}`);
      setPendingAction(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to settle reconciliation exception');
    } finally {
      setBusy(null);
    }
  }

  const shell: CSSProperties = { width: 760, maxWidth: 'calc(100vw - 40px)', maxHeight: 'calc(100vh - 40px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 14, background: '#fff', boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)' };

  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }} style={{ position: 'fixed', inset: 0, zIndex: 96, padding: 20, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section data-overlay-id="reconciliation-resolution-drawer" role="dialog" aria-modal="true" aria-labelledby="reconciliation-resolution-title" style={shell}>
        <header style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}><div id="reconciliation-resolution-title" style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{selected?.title ?? (loading ? 'Loading difference…' : 'Difference unavailable')}</div><div style={{ marginTop: 4, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>{selected ? `Exception ${hashId(selected.id)} · ${selected.status} · ${selected.source_system ? providerLabel(selected.source_system) : 'source unavailable'}` : 'No ledger or source decision has been changed.'}</div></div>
          {selected && !isSettled ? <button type="button" disabled={busy === 'assign'} onClick={() => void assign(Boolean(selected.assigned_to))} style={{ padding: '6px 10px', border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 11.5px/1 'Inter',sans-serif", color: '#40454a', cursor: busy ? 'wait' : 'pointer' }}>{selected.assigned_to ? 'Release' : 'Assign to me'}</button> : null}
          <button type="button" aria-label="Close reconciliation review" disabled={Boolean(busy)} onClick={close} style={{ width: 18, height: 18, padding: 0, border: 0, background: 'transparent', cursor: busy ? 'wait' : 'pointer' }}><CloseGlyph/></button>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          {loading ? <div data-state-id="reconciliation-loading-empty-states" aria-busy="true" style={{ minHeight: 420, borderRadius: 12, background: '#f4f3f1', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "400 11px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>loading the source and ledger facts…</div> : null}
          {!loading && error && !selected ? <div data-state-id="reconciliation-error" role="alert" style={{ padding: 14, borderRadius: 12, background: '#fdf0e6', font: "400 12px/1.5 'Inter',sans-serif", color: '#b0431a' }}>{error}<button type="button" onClick={() => void load()} style={{ display: 'block', marginTop: 10, padding: '6px 10px', border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a' }}>Try again</button></div> : null}
          {!loading && !selected ? <div data-state-id="reconciliation-zero-work" style={{ minHeight: 340, borderRadius: 12, background: '#f4f3f1', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}><div><strong style={{ display: 'block', font: "500 13px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>This difference is no longer in the queue</strong><span style={{ display: 'block', marginTop: 5, font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>It may have been resolved in another session. No new decision was recorded here.</span></div></div> : null}

          {selected ? <>
            <section style={{ padding: 11, borderRadius: 12, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}><span style={{ flex: 1, font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>SOURCE AND LEDGER FACTS</span><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>unknown stays unavailable</span></div>
              <div role="table" aria-label="Source and ledger comparison" style={{ overflow: 'hidden', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
                <div role="row" style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 0 }}><span/><span style={{ padding: '9px 11px', borderLeft: '1px solid #eae8e5', font: "500 10.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>SOURCE RECORD</span><span style={{ padding: '9px 11px', borderLeft: '1px solid #eae8e5', font: "500 10.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>CONFIRMED LEDGER</span></div>
                {FACTS.map(([key, factLabel]) => {
                  const differs = factsDiffer(selected, key);
                  return <div role="row" key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 0, borderTop: '1px solid #eae8e5' }}><span style={{ padding: '9px 11px', font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{factLabel}</span><span style={{ padding: '9px 11px', borderLeft: '1px solid #eae8e5', background: differs ? '#fff3e9' : '#fff', font: "400 11.5px/1.45 'Inter',sans-serif", color: '#40454a' }}>{renderFact(selected, 'source', key)}</span><span style={{ padding: '9px 11px', borderLeft: '1px solid #eae8e5', background: differs ? '#fff3e9' : '#fff', font: "400 11.5px/1.45 'Inter',sans-serif", color: '#40454a' }}>{renderFact(selected, 'ledger', key)}</span></div>;
                })}
              </div>
              <span style={{ font: "400 10.5px/1.45 'IBM Plex Mono',monospace", color: '#64686d' }}>{selected.detail ?? 'Two known values are highlighted only when they differ.'} · raised {formatDateTime(selected.created_at)}</span>
            </section>

            {isMatch ? <section style={{ padding: 11, borderRadius: 12, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 9 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}><span style={{ flex: 1, font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>CANDIDATE MATCHES</span><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{candidates.length} candidates · advisory until confirmed</span></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>{candidates.length ? candidates.map((candidate) => <label key={candidate.id} style={{ padding: '11px 12px', borderRadius: 10, background: '#fff', boxShadow: candidateId === candidate.id ? 'inset 0 0 0 1.3px rgba(159,79,8,.6)' : '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}><input type="radio" name="candidate" checked={candidateId === candidate.id} onChange={() => setCandidateId(candidate.id)}/><span style={{ minWidth: 0 }}><span style={{ display: 'block', font: "500 12px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{candidateEntityLabel(candidate.entity_type)} {hashId(candidate.entity_id ?? candidate.id)}</span><span style={{ display: 'block', marginTop: 3, font: "400 10px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{candidate.confidence == null ? 'confidence unavailable' : `${formatConfidencePercent(candidate.confidence)} confidence`}{candidate.amount_minor != null && candidate.currency ? ` · ${formatMoney(candidate.amount_minor, candidate.currency)}` : ''}</span></span></label>) : <div style={{ gridColumn: '1 / -1', padding: '11px 12px', borderRadius: 10, background: '#fff', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>No candidate is available. Unauth will not infer a financial relationship.</div>}</div></section> : null}

            {receipt ? <div role="status" style={{ padding: '10px 12px', borderRadius: 10, background: '#eef6f1', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#1a6b43' }}>{receipt}</div> : null}
            {error ? <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: '#fdf0e6', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#b0431a' }}>{error}</div> : null}
          </> : null}
        </div>

        <footer style={{ padding: '13px 18px', borderTop: '1px solid #eae8e5', background: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, font: "400 10.5px/1.45 'IBM Plex Mono',monospace", color: '#64686d' }}>{selected?.assigned_to ? 'assigned · decision is recorded against the operator' : 'unassigned · every decision creates an audit consequence'}</span>
          {selected?.support_payout_case_id ? <Link href={`/cases/${selected.support_payout_case_id}`} style={{ padding: '7px 11px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12px/1 'Inter',sans-serif", color: '#40454a', textDecoration: 'none' }}>Open linked case</Link> : null}
          {selected && !isSettled ? isMatch ? <><button type="button" disabled={!candidateId || Boolean(busy)} onClick={() => requestResolution('confirm')} style={{ padding: '7px 11px', border: 0, borderRadius: 9, background: candidateId ? '#1c1f23' : '#f2f0ed', color: candidateId ? '#fff' : '#64686d', font: "500 12px/1 'Inter',sans-serif" }}>Confirm selected match</button><button type="button" disabled={Boolean(busy)} onClick={() => requestResolution('reject')} style={{ padding: '7px 11px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12px/1 'Inter',sans-serif" }}>Reject match</button></> : <><button type="button" disabled={Boolean(busy)} onClick={() => requestResolution('resolve')} style={{ padding: '7px 11px', border: 0, borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12px/1 'Inter',sans-serif" }}>Resolve exception</button><button type="button" disabled={Boolean(busy)} onClick={() => requestResolution('dismiss')} style={{ padding: '7px 11px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12px/1 'Inter',sans-serif" }}>Dismiss</button></> : null}
          <button type="button" disabled={Boolean(busy)} onClick={close} style={{ padding: '7px 12px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12px/1 'Inter',sans-serif" }}>Close</button>
        </footer>
      </section>

      {pendingAction && selected ? <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 97, padding: 40, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><section role="alertdialog" aria-modal="true" aria-labelledby="reconciliation-confirm-title" style={{ width: 560, maxWidth: 'calc(100vw - 40px)', borderRadius: 14, background: '#fff', boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)', overflow: 'hidden' }}><header style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5' }}><div id="reconciliation-confirm-title" style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{actionLabel(pendingAction)}</div><div style={{ marginTop: 4, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>{actionCopy(pendingAction)}</div></header><div style={{ padding: '14px 18px' }}><label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em', color: '#64686d' }}>AUDIT NOTE · REQUIRED</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record the source evidence and decision rationale" style={{ minHeight: 96, resize: 'vertical', padding: '9px 10px', border: 0, outline: 0, borderRadius: 9, background: '#f4f3f1', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', font: "400 12px/1.5 'Inter',sans-serif", color: '#1c1f23' }}/></label>{error ? <div role="alert" style={{ marginTop: 10, color: '#b0431a', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{error}</div> : null}</div><footer style={{ padding: '13px 18px', borderTop: '1px solid #eae8e5', background: '#ffffff', display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" disabled={Boolean(busy)} onClick={() => setPendingAction(null)} style={{ padding: '7px 12px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif" }}>Cancel</button><button type="button" disabled={Boolean(busy) || note.trim().length < 3} onClick={() => void resolve()} style={{ padding: '7px 13px', border: 0, borderRadius: 9, background: note.trim().length >= 3 ? '#1c1f23' : '#f2f0ed', color: note.trim().length >= 3 ? '#fff' : '#64686d', font: "500 12.5px/1 'Inter',sans-serif" }}>{busy ? 'Recording…' : 'Record decision'}</button></footer></section></div> : null}
    </div>
  );
}
