'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  AuthorityStamp,
  FilterChip,
  Input,
  Modal,
  MoneyValue,
  OperationalState,
  StatusBadge,
  Textarea,
  UnavailableValue,
} from '@/components/ui';
import { formatConfidencePercent, formatDateTime } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import { label } from '@/lib/ui/labels';
import { ENTITY_LABELS, providerLabel } from '@/lib/ui/merchantCopy';

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
  { key: 'record_id', label: 'Record reference' },
  { key: 'record_type', label: 'Record type' },
  { key: 'amount_minor', label: 'Amount' },
  { key: 'state', label: 'Financial state' },
  { key: 'effective_at', label: 'Effective time' },
] as const;

function candidateRows(row: ReconciliationException): Candidate[] {
  const value = row.context?.candidates;
  if (!Array.isArray(value)) return [];
  return value.filter((candidate): candidate is Candidate => Boolean(candidate && typeof candidate === 'object' && typeof (candidate as Candidate).id === 'string'));
}

function candidateEntityLabel(value: string | null | undefined) {
  if (!value) return 'Record';
  if (value in ENTITY_LABELS) return ENTITY_LABELS[value as keyof typeof ENTITY_LABELS].singular;
  const words = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Record';
}

function nestedValue(context: Record<string, unknown> | null, side: 'source' | 'ledger', key: string): unknown {
  if (!context) return null;
  const directKeys = [`${side}_${key}`, `${side}Record${key.replace(/(^|_)([a-z])/g, (_, __, letter: string) => letter.toUpperCase())}`];
  for (const directKey of directKeys) {
    if (context[directKey] != null) return context[directKey];
  }
  const nested = context[side];
  if (nested && typeof nested === 'object' && (nested as Record<string, unknown>)[key] != null) return (nested as Record<string, unknown>)[key];
  const nestedRecord = context[`${side}_record`];
  if (nestedRecord && typeof nestedRecord === 'object' && (nestedRecord as Record<string, unknown>)[key] != null) return (nestedRecord as Record<string, unknown>)[key];
  return null;
}

function currencyFor(row: ReconciliationException, side: 'source' | 'ledger') {
  const scoped = nestedValue(row.context, side, 'currency');
  if (typeof scoped === 'string') return scoped;
  return typeof row.context?.currency === 'string' ? row.context.currency : null;
}

function renderFact(row: ReconciliationException, side: 'source' | 'ledger', key: string) {
  const value = nestedValue(row.context, side, key);
  if (key === 'amount_minor') {
    return typeof value === 'number' && Number.isSafeInteger(value)
      ? <MoneyValue minorUnits={value} currency={currencyFor(row, side)} />
      : <UnavailableValue reason={`${side === 'source' ? 'Source' : 'Ledger'} amount is not available for this exception`} />;
  }
  if (key === 'effective_at' && typeof value === 'string') return formatDateTime(value);
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return <UnavailableValue reason={`${side === 'source' ? 'Source' : 'Ledger'} ${key.replaceAll('_', ' ')} is unavailable`} />;
}

function factsDiffer(row: ReconciliationException, key: string) {
  const source = nestedValue(row.context, 'source', key);
  const ledger = nestedValue(row.context, 'ledger', key);
  return source != null && ledger != null && String(source) !== String(ledger);
}

function actionCopy(action: ResolutionAction, matchException: boolean) {
  if (action === 'confirm') return 'Confirm this candidate as the source-to-ledger match. This can update linked records, case financials and audit history.';
  if (action === 'reject') return 'Reject the proposed match. The exception is settled as unmatched and the source record remains separate.';
  if (action === 'resolve') return 'Resolve this exception with the recorded note. Only confirmed results can enter the ledger.';
  return matchException
    ? 'Dismiss this exception without confirming a match. The source record remains separate and the dismissal is audited.'
    : 'Dismiss this exception without creating or changing a financial result. The dismissal and note are audited.';
}

export function ExceptionQueue() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedStatus = searchParams.get('status');
  const status = ['open', 'resolved', 'dismissed', 'all'].includes(requestedStatus ?? '') ? requestedStatus! : 'open';
  const source = searchParams.get('source');
  const requestedSearch = searchParams.get('search') ?? '';
  const [rows, setRows] = useState<ReconciliationException[]>([]);
  const [selected, setSelected] = useState<ReconciliationException | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'assign' | ResolutionAction | null>(null);
  const [query, setQuery] = useState(requestedSearch);
  const [candidateId, setCandidateId] = useState('');
  const [note, setNote] = useState('');
  const [pendingAction, setPendingAction] = useState<ResolutionAction | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const requestedSelectedRef = useRef(searchParams.get('selected'));
  requestedSelectedRef.current = searchParams.get('selected');

  function updateLocation(input: { status?: string | null; source?: string | null; search?: string | null; selected?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(input)) {
      if (value && !(key === 'status' && value === 'open')) params.set(key, value); else params.delete(key);
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statuses = status === 'all' ? ['open', 'resolved', 'dismissed'] : [status];
      const responses = await Promise.all(statuses.map(async (status) => {
        const response = await fetch(`/api/ops/exceptions?status=${status}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Unable to load reconciliation exceptions');
        return (body.exceptions ?? []) as ReconciliationException[];
      }));
      const nextRows = responses.flat();
      setRows(nextRows);
      const requestedSelected = requestedSelectedRef.current;
      setSelected((current) => nextRows.find((row) => row.id === requestedSelected)
        ?? (current && nextRows.some((row) => row.id === current.id) ? current : nextRows[0] ?? null));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load reconciliation exceptions');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => setQuery(requestedSearch), [requestedSearch]);
  useEffect(() => {
    const requestedSelected = searchParams.get('selected');
    const next = rows.find((row) => row.id === requestedSelected);
    if (!next || next.id === selected?.id) return;
    setSelected(next);
    setCandidateId('');
    setNote('');
    setReceipt(null);
    setPendingAction(null);
  }, [rows, searchParams, selected?.id]);

  const sourceOptions = useMemo(() => [...new Set(rows.map((row) => row.source_system ?? 'unavailable'))].sort(), [rows]);
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (source && (row.source_system ?? 'unavailable') !== source) return false;
      return !normalized || [row.title, row.detail, row.exception_type, row.source_system, row.support_payout_case_id, row.id].filter(Boolean).join(' ').toLowerCase().includes(normalized);
    });
  }, [query, rows, source]);

  const candidates = selected ? candidateRows(selected) : [];
  const isMatch = selected?.context?.is_match_exception === true || selected?.exception_type === 'match_uncertainty';
  const isSettled = selected != null && selected.status !== 'open';

  function choose(row: ReconciliationException) {
    setSelected(row);
    setCandidateId('');
    setNote('');
    setReceipt(null);
    setPendingAction(null);
    updateLocation({ selected: row.id });
  }

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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update assignment');
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
        body: JSON.stringify({
          action: pendingAction,
          selectedCandidateId: candidateId || null,
          resolution: note.trim(),
          expectedStateVersion: selected.state_version ?? null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Unable to settle reconciliation exception');
      const settledStatus = body.exception?.status ?? (pendingAction === 'dismiss' ? 'dismissed' : 'resolved');
      setRows((items) => items.filter((item) => item.id !== selected.id));
      setSelected({ ...selected, status: settledStatus });
      setReceipt(`${pendingAction === 'dismiss' || pendingAction === 'reject' ? 'Dismissal' : 'Resolution'} recorded. Audit receipt ${hashId(selected.id)} retains the note and decision boundary.`);
      setPendingAction(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to settle reconciliation exception');
    } finally {
      setBusy(null);
    }
  }

  function advance() {
    const next = visibleRows.find((row) => row.id !== selected?.id) ?? null;
    setSelected(next);
    setCandidateId('');
    setNote('');
    setReceipt(null);
    updateLocation({ selected: next?.id ?? null });
  }

  if (loading) {
    return (
      <div className="grid min-h-[520px] gap-0 overflow-hidden rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-default)] lg:grid-cols-[340px_minmax(0,1fr)]" data-state-id="reconciliation-loading-empty-states" aria-busy="true">
        <div className="border-b border-[var(--uo-route-border-subtle)] p-4 lg:border-b-0 lg:border-r"><div className="skeleton h-9 w-full" /><div className="mt-4 space-y-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton h-16 w-full" />)}</div></div>
        <div className="p-5"><div className="skeleton h-6 w-56" /><div className="mt-5 grid grid-cols-2 gap-3">{Array.from({ length: 10 }, (_, index) => <div key={index} className="skeleton h-12 w-full" />)}</div></div>
      </div>
    );
  }

  if (error && rows.length === 0) {
    return <div data-state-id="reconciliation-error"><OperationalState kind="error" title="Reconciliation exceptions could not be loaded" description="No source match, ledger result or audit decision was changed." action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>} /></div>;
  }

  if (rows.length === 0 && !selected) {
    return <div data-state-id="reconciliation-zero-work"><OperationalState kind="zero" title={status === 'open' ? 'No reconciliation exceptions need review' : 'No exceptions exist in this status scope'} description={status === 'open' ? 'Connected source records and confirmed ledger entries have no open differences in this queue.' : 'The query completed without a matching resolved or dismissed exception. This is a verified zero, not unavailable data.'} action={<Link href="/financials/reports" className="ua-text-working-title text-[var(--uo-route-action-primary)] underline underline-offset-2">Open financial reports</Link>} /></div>;
  }

  return (
    <div>
      <div className="grid min-h-[560px] overflow-hidden rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="min-w-0 border-b border-[var(--uo-route-border-subtle)] lg:border-b-0 lg:border-r" aria-label="Reconciliation exception queue">
        <div className="border-b border-[var(--uo-route-border-subtle)] p-3">
          <Input aria-label="Search reconciliation exceptions" placeholder="Search source, case or exception" value={query} onChange={(event) => { setQuery(event.target.value); updateLocation({ search: event.target.value }); }} />
          <div className="mt-2 flex flex-wrap items-center gap-1"><span className="ua-text-metadata mr-1">Status</span>{['open', 'resolved', 'dismissed', 'all'].map((item) => <FilterChip key={item} active={status === item} onClick={() => updateLocation({ status: item, selected: null })}>{item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}</FilterChip>)}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1"><span className="ua-text-metadata mr-1">Source</span><FilterChip active={!source} onClick={() => updateLocation({ source: null, selected: null })}>All</FilterChip>{sourceOptions.map((item) => <FilterChip key={item} active={source === item} onClick={() => updateLocation({ source: item, selected: null })}>{item === 'unavailable' ? 'Unavailable' : providerLabel(item)}</FilterChip>)}</div>
          <p className="ua-text-metadata mt-2" role="status">{visibleRows.length} {visibleRows.length === 1 ? 'exception' : 'exceptions'} in this URL scope</p>
        </div>
        {visibleRows.length ? (
          <ol className="max-h-[680px] overflow-y-auto">
            {visibleRows.map((row) => (
              <li key={row.id} className="border-b border-[var(--uo-route-border-hairline)]">
                <button type="button" onClick={() => choose(row)} className="w-full px-4 py-3 text-left hover:bg-[var(--uo-route-surface-hover)] focus-visible:shadow-[var(--uo-route-shadow-focus)]" aria-current={selected?.id === row.id ? 'true' : undefined} data-signal-rail={selected?.id === row.id ? 'true' : undefined}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0"><span className="ua-text-working-title block truncate text-[var(--uo-route-text-primary)]">{row.title}</span><span className="ua-text-caption-role mt-1 block">{label('exceptionType', row.exception_type)} · {row.source_system ? providerLabel(row.source_system) : 'Source unavailable'}</span></span>
                    <StatusBadge family="workflowStatus" value={row.status} size="sm" />
                  </span>
                  <span className="ua-text-metadata mt-2 flex flex-wrap gap-x-3 gap-y-1"><span>{row.assigned_to ? 'Assigned' : 'Unassigned'}</span><span>{formatDateTime(row.created_at)}</span></span>
                </button>
              </li>
            ))}
          </ol>
        ) : <div data-state-id="reconciliation-no-result"><OperationalState kind="filtered-empty" title="No exception matches these controls" description="Clear search or source, or choose another status. No reconciliation decision was changed." /></div>}
      </section>

      <section className="min-w-0" aria-label="Selected reconciliation comparison">
        {selected ? (
          <div data-signal-rail="true" className="ua-reconciliation-selection">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--uo-route-border-subtle)] px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><StatusBadge family="workflowStatus" value={selected.status} size="sm" /><span className="ua-text-metadata">Exception {hashId(selected.id)}</span></div>
                <h2 className="ua-text-section-title mt-2">{selected.title}</h2>
                {selected.detail ? <p className="ua-text-body mt-1 max-w-[72ch] text-[var(--uo-route-text-secondary)]">{selected.detail}</p> : null}
              </div>
              {!isSettled ? <Button variant="secondary" size="sm" loading={busy === 'assign'} onClick={() => void assign(Boolean(selected.assigned_to))}>{selected.assigned_to ? 'Release' : 'Assign to me'}</Button> : null}
            </header>

            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-[minmax(110px,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] border-y border-[var(--uo-route-border-subtle)]" role="table" aria-label="Source versus confirmed ledger">
                <div className="ua-text-metadata p-3" role="columnheader">Compared fact</div>
                <div className="ua-text-label border-l border-[var(--uo-route-border-subtle)] p-3" role="columnheader"><AuthorityStamp authority="source" /> <span className="mt-2 block">Source record</span></div>
                <div className="ua-text-label border-l border-[var(--uo-route-border-subtle)] p-3" role="columnheader"><AuthorityStamp authority="ledger-outcome" /> <span className="mt-2 block">Confirmed ledger</span></div>
                {FACTS.map((fact) => {
                  const differs = factsDiffer(selected, fact.key);
                  return (
                    <div key={fact.key} className="contents" role="row">
                      <div className="ua-text-metadata border-t border-[var(--uo-route-border-hairline)] p-3" role="rowheader">{fact.label}</div>
                      <div className={`ua-text-dense border-l border-t border-[var(--uo-route-border-hairline)] p-3 ${differs ? 'bg-[var(--uo-route-warning-bg)]' : ''}`} role="cell">{renderFact(selected, 'source', fact.key)}</div>
                      <div className={`ua-text-dense border-l border-t border-[var(--uo-route-border-hairline)] p-3 ${differs ? 'bg-[var(--uo-route-warning-bg)]' : ''}`} role="cell">{renderFact(selected, 'ledger', fact.key)}</div>
                    </div>
                  );
                })}
              </div>
              <p className="ua-text-caption-role mt-2">Highlighted rows contain two known values that differ. An unavailable side is never treated as zero or as a confirmed match.</p>

              {isMatch ? (
                <section className="mt-5" aria-labelledby="candidate-matches-title">
                  <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 id="candidate-matches-title" className="ua-text-working-title">Candidate matches</h3><p className="ua-text-caption-role mt-1">Candidates are advisory until an operator confirms one.</p></div><span className="ua-text-metadata">{candidates.length} candidates</span></div>
                  {candidates.length ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {candidates.map((candidate) => (
                        <label key={candidate.id} className={`grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-[var(--uo-route-radius-control)] border p-3 ${candidateId === candidate.id ? 'border-[var(--uo-route-border-focus)] bg-[var(--uo-route-accent-soft)]' : 'border-[var(--uo-route-border-default)]'}`}>
                          <input type="radio" name="candidate" value={candidate.id} checked={candidateId === candidate.id} onChange={() => setCandidateId(candidate.id)} />
                          <span className="min-w-0"><span className="ua-text-dense block font-medium">{candidateEntityLabel(candidate.entity_type)} {candidate.entity_id ? hashId(candidate.entity_id) : hashId(candidate.id)}</span><span className="ua-text-metadata mt-1 block">{candidate.confidence == null ? 'Confidence unavailable' : `${formatConfidencePercent(candidate.confidence)} confidence`}{candidate.source_system ? ` · ${providerLabel(candidate.source_system)}` : ''}</span>{candidate.amount_minor != null ? <span className="mt-1 block"><MoneyValue minorUnits={candidate.amount_minor} currency={candidate.currency ?? currencyFor(selected, 'source')} /></span> : null}</span>
                        </label>
                      ))}
                    </div>
                  ) : <div className="mt-3"><OperationalState kind="unavailable" title="No candidate match is available" description="Reject or dismiss the exception, or repair source coverage. Unauth will not infer a financial relationship." /></div>}
                </section>
              ) : null}

              <section className="mt-5 border-t border-[var(--uo-route-border-subtle)] pt-4" aria-labelledby="reconciliation-decision-title">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><AuthorityStamp authority="merchant-decision" /><h3 id="reconciliation-decision-title" className="ua-text-working-title mt-2">Decision boundary</h3><p className="ua-text-caption-role mt-1">Every resolution records the operator note, selected candidate where applicable, state version and audit consequence.</p></div>
                  {selected.support_payout_case_id ? <Link href={`/cases/${selected.support_payout_case_id}`} className="ua-text-label text-[var(--uo-route-action-primary)] underline underline-offset-2">Open linked case</Link> : null}
                </div>
                {error && !pendingAction ? <p role="alert" className="ua-text-body mt-3 text-[var(--uo-route-critical)]">{error}</p> : null}
                {receipt ? <div className="mt-3 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-success-bg)] p-3 text-[var(--uo-route-success-text)]" role="status"><p className="ua-text-working-title">Decision recorded</p><p className="ua-text-body mt-1">{receipt}</p></div> : null}
                {isSettled ? (
                  <div className="mt-4"><Button variant="primary" onClick={advance} disabled={rows.length === 0}>{rows.length ? 'Advance to next exception' : 'Queue complete'}</Button></div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {isMatch ? <><Button variant="commit" disabled={!candidateId} onClick={() => requestResolution('confirm')}>Confirm selected match</Button><Button variant="secondary" onClick={() => requestResolution('reject')}>Reject match</Button></> : <><Button variant="commit" onClick={() => requestResolution('resolve')}>Resolve exception</Button><Button variant="secondary" onClick={() => requestResolution('dismiss')}>Dismiss</Button></>}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : <OperationalState kind="empty" title="Choose an exception to compare" description="Select one unresolved record from the queue. No financial result is inferred before review." />}
      </section>

      <Modal
        open={pendingAction != null}
        onClose={() => { if (!busy) setPendingAction(null); }}
        title={pendingAction ? `${pendingAction === 'confirm' ? 'Confirm match' : pendingAction === 'reject' ? 'Reject match' : pendingAction === 'resolve' ? 'Resolve exception' : 'Dismiss exception'}` : 'Confirm reconciliation decision'}
        description={pendingAction ? actionCopy(pendingAction, isMatch) : undefined}
        overlayId="reconciliation-resolution-drawer"
        actions={pendingAction ? [{ label: busy ? 'Recording…' : 'Record decision', variant: pendingAction === 'dismiss' || pendingAction === 'reject' ? 'secondary' : 'commit', disabled: Boolean(busy) || note.trim().length < 3, onClick: () => void resolve() }] : []}
      >
        <div className="space-y-4">
          {error ? <p role="alert" className="ua-text-body rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-critical-bg)] p-3 text-[var(--uo-route-critical)]">{error}</p> : null}
          <dl className="ua-text-dense grid gap-3 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-surface-muted)] p-3 sm:grid-cols-2"><div><dt className="ua-text-metadata">Exception</dt><dd className="mt-1 font-mono">{selected ? hashId(selected.id) : '—'}</dd></div><div><dt className="ua-text-metadata">Candidate</dt><dd className="mt-1">{candidateId ? hashId(candidateId) : 'No candidate selected'}</dd></div></dl>
          <label className="ua-text-label block">Audit note <span aria-hidden="true">*</span><Textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-24" placeholder="Record the source evidence and decision rationale" required /><span className="ua-text-metadata mt-1 block font-normal">Required. This note is retained with the resolution or dismissal.</span></label>
        </div>
      </Modal>
      </div>
    </div>
  );
}
