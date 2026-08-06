'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { label } from '@/lib/ui/labels';
import { Select } from '@/components/ui';
import { hashId } from '@/lib/ui/displayRef';

type Candidate = { id: string; entity_type: string; entity_id: string; confidence: number | null };
type Exception = {
  id: string; support_payout_case_id: string | null; exception_type: string; confidence: 'probable' | 'unknown';
  status: string; title: string; detail: string | null; context: Record<string, unknown>; assigned_to: string | null;
  created_at: string;
};

export function ExceptionQueue({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [candidate, setCandidate] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch('/api/ops/exceptions?status=open');
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'Unable to load exceptions');
    setRows(body.exceptions ?? []);
  }
  useEffect(() => { load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load exceptions')).finally(() => setLoading(false)); }, []);

  async function assign(row: Exception, release = false) {
    setBusy(`${row.id}:assign`); setError(null);
    try {
      const response = await fetch(`/api/ops/exceptions/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(release ? { release: true } : { assignToMe: true }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Unable to update assignment');
      setRows((items) => items.map((item) => item.id === row.id ? { ...item, assigned_to: body.assignment.assigned_to } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update assignment'); } finally { setBusy(null); }
  }
  async function act(row: Exception, action: 'confirm' | 'reject' | 'resolve' | 'dismiss') {
    if ((action === 'confirm' || action === 'resolve') && !window.confirm(`${action === 'confirm' ? 'Confirm this match' : 'Resolve this exception'}? This records an audit event.`)) return;
    setBusy(`${row.id}:${action}`); setError(null);
    try {
      const response = await fetch(`/api/ops/exceptions/${row.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, selectedCandidateId: candidate[row.id] ?? null, resolution: note[row.id] ?? null }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Unable to resolve exception');
      setRows((items) => items.filter((item) => item.id !== row.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to resolve exception'); } finally { setBusy(null); }
  }

  if (loading) return <p className="ua-text-body" style={{ color: 'var(--ua-text-tertiary)' }}>Loading exception queue…</p>;
  if (!rows.length) return <p className="ua-text-body rounded-lg border p-6 text-center" style={{ color: 'var(--ua-text-tertiary)' }}>No open exceptions. Connected sources and automation are up to date.</p>;
  const visible = compact ? rows.slice(0, 5) : rows;
  return <div className="space-y-3">{error ? <p role="alert" className="ua-text-body" style={{ color: 'var(--ua-critical)' }}>{error}</p> : null}{visible.map((row) => {
    const candidates = Array.isArray(row.context?.candidates) ? row.context.candidates as Candidate[] : [];
    const isMatch = row.context?.is_match_exception === true;
    return <article key={row.id} className="rounded-lg border bg-[var(--ua-surface-primary)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="ua-text-metadata flex flex-wrap gap-2"><span className="rounded-full border px-2 py-0.5 capitalize">{label('exceptionType', row.exception_type)}</span><span className="rounded-full border px-2 py-0.5 capitalize">{row.confidence}</span>{row.assigned_to ? <span className="rounded-full border px-2 py-0.5">Assigned</span> : null}</div><h3 className="ua-text-working-title mt-2">{row.title}</h3>{row.detail ? <p className="ua-text-body mt-1" style={{ color: 'var(--ua-text-secondary)' }}>{row.detail}</p> : null}{row.support_payout_case_id ? <Link className="ua-text-label mt-2 inline-block underline" href={`/cases/${row.support_payout_case_id}`}>Open full case</Link> : null}</div><button type="button" disabled={busy === `${row.id}:assign`} onClick={() => assign(row, Boolean(row.assigned_to))} className="ua-text-label rounded-md border px-2.5 py-1">{row.assigned_to ? 'Release' : 'Assign to me'}</button></div>
      {isMatch && candidates.length ? <label className="ua-text-label mt-3 block">Candidate<Select value={candidate[row.id] ?? ''} onChange={(event) => setCandidate((current) => ({ ...current, [row.id]: event.target.value }))} className="mt-1 block"><option value="">Select a candidate…</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.entity_type} {hashId(item.entity_id)} · {item.confidence ?? '?'}</option>)}</Select></label> : null}
      <label className="ua-text-label mt-3 block">Resolution note (optional)<input value={note[row.id] ?? ''} onChange={(event) => setNote((current) => ({ ...current, [row.id]: event.target.value }))} className="ua-text-body mt-1 w-full rounded-md border p-2" placeholder="Only the missing decision is needed" /></label>
      <div className="mt-3 flex flex-wrap gap-2">{isMatch ? <><button type="button" disabled={busy === `${row.id}:confirm` || !candidate[row.id]} onClick={() => act(row, 'confirm')} className="ua-text-label rounded-md px-3 py-1.5" style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}>Confirm match</button><button type="button" disabled={busy === `${row.id}:reject`} onClick={() => act(row, 'reject')} className="ua-text-label rounded-md border px-3 py-1.5">Reject match</button></> : <><button type="button" disabled={busy === `${row.id}:resolve`} onClick={() => act(row, 'resolve')} className="ua-text-label rounded-md px-3 py-1.5" style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}>Resolve</button><button type="button" disabled={busy === `${row.id}:dismiss`} onClick={() => act(row, 'dismiss')} className="ua-text-label rounded-md border px-3 py-1.5">Dismiss</button></>}</div>
    </article>;
  })}{compact && rows.length > visible.length ? <Link href="/exceptions" className="ua-text-label underline">View all {rows.length} exceptions</Link> : null}</div>;
}
