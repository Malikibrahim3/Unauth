'use client';

import { useEffect, useState } from 'react';
import { ConnectionCard, type HealthConnection } from '@/components/integrations/ConnectionCard';
import { CoverageTable } from '@/components/integrations/CoverageTable';

type Health = { connections: HealthConnection[]; coverage: Array<{ category: string; status: string; recordCount: number }>; issues: Array<{ id: string; event_type: string | null; last_error: string | null }> };
export function IntegrationCentre() {
  const [health, setHealth] = useState<Health | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch('/api/integrations/health').then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Unable to load integration health'); setHealth(body); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load integration health')); }, []);
  return <section className="space-y-5"><div><h2 className="text-base font-semibold">Connection health</h2><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Runtime status, source freshness, imported records, and active ingestion failures.</p></div>{error ? <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : !health ? <p className="text-sm">Loading connection health…</p> : <><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{health.connections.map((connection) => <ConnectionCard key={connection.id} connection={connection} />)}</div><div><h3 className="mb-2 text-sm font-semibold">Coverage by category</h3><CoverageTable rows={health.coverage} /></div>{health.issues.length ? <div><h3 className="mb-2 text-sm font-semibold">Active sync issues</h3><ul className="space-y-2">{health.issues.map((issue) => <li key={issue.id} className="rounded-md border p-3 text-sm">{issue.event_type ?? 'Ingestion event'} · {issue.last_error ?? 'Needs attention'}</li>)}</ul></div> : null}</>}
  </section>;
}
