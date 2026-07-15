'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { humanise } from '@/lib/ui/labels';

type Candidate = { id: string; entity_type: string; entity_id: string; confidence: number | null };
type Exception = {
  id: string; support_payout_case_id: string | null; exception_type: string; confidence: 'probable' | 'unknown';
  status: string; title: string; detail: string | null; context: Record<string, unknown>; assigned_to: string | null;
  created_at: string;
};

function label(value: string) { return humanise(value); }

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

  if (loading) return <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading exception queue…</p>;
  if (!rows.length) return <p className="rounded-lg border p-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No open exceptions. Connected sources and automation are up to date.</p>;
  const visible = compact ? rows.slice(0, 5) : rows;
  return <div className="space-y-3">{error ? <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}{visible.map((row) => {
    const candidates = Array.isArray(row.context?.candidates) ? row.context.candidates as Candidate[] : [];
    const isMatch = row.context?.is_match_exception === true;
    return <article key={row.id} className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full border px-2 py-0.5 capitalize">{label(row.exception_type)}</span><span className="rounded-full border px-2 py-0.5 capitalize">{row.confidence}</span>{row.assigned_to ? <span className="rounded-full border px-2 py-0.5">Assigned</span> : null}</div><h3 className="mt-2 text-sm font-semibold">{row.title}</h3>{row.detail ? <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{row.detail}</p> : null}{row.support_payout_case_id ? <Link className="mt-2 inline-block text-xs underline" href={`/claims/${row.support_payout_case_id}`}>Open full case</Link> : null}</div><button type="button" disabled={busy === `${row.id}:assign`} onClick={() => assign(row, Boolean(row.assigned_to))} className="rounded-md border px-2.5 py-1 text-xs">{row.assigned_to ? 'Release' : 'Assign to me'}</button></div>
      {isMatch && candidates.length ? <label className="mt-3 block text-xs">Candidate<select value={candidate[row.id] ?? ''} onChange={(event) => setCandidate((current) => ({ ...current, [row.id]: event.target.value }))} className="mt-1 w-full rounded-md border p-2 text-sm"><option value="">Select a candidate…</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.entity_type} {item.entity_id.slice(0, 8)} · {item.confidence ?? '?'}</option>)}</select></label> : null}
      <label className="mt-3 block text-xs">Resolution note (optional)<input value={note[row.id] ?? ''} onChange={(event) => setNote((current) => ({ ...current, [row.id]: event.target.value }))} className="mt-1 w-full rounded-md border p-2 text-sm" placeholder="Only the missing decision is needed" /></label>
      <div className="mt-3 flex flex-wrap gap-2">{isMatch ? <><button type="button" disabled={busy === `${row.id}:confirm` || !candidate[row.id]} onClick={() => act(row, 'confirm')} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--accent)', color: 'white' }}>Confirm match</button><button type="button" disabled={busy === `${row.id}:reject`} onClick={() => act(row, 'reject')} className="rounded-md border px-3 py-1.5 text-xs">Reject match</button></> : <><button type="button" disabled={busy === `${row.id}:resolve`} onClick={() => act(row, 'resolve')} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--accent)', color: 'white' }}>Resolve</button><button type="button" disabled={busy === `${row.id}:dismiss`} onClick={() => act(row, 'dismiss')} className="rounded-md border px-3 py-1.5 text-xs">Dismiss</button></>}</div>
    </article>;
  })}{compact && rows.length > visible.length ? <Link href="/exceptions" className="text-sm underline">View all {rows.length} exceptions</Link> : null}</div>;
}
