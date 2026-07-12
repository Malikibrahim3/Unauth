'use client';

import { useEffect, useState } from 'react';
import { FlowBuilder } from '@/components/rules/FlowBuilder';

type Flow = { id: string; name: string; trigger_event_type: string; active: boolean; version: number; outputs: Array<{ type: string }> };
export function FlowsTab({ canManage }: { canManage: boolean }) {
  const [flows, setFlows] = useState<Flow[]>([]); const [building, setBuilding] = useState(false); const [loading, setLoading] = useState(true);
  async function reload() { const response = await fetch('/api/workflows'); const data = await response.json(); if (response.ok) setFlows(data.workflows ?? []); setLoading(false); }
  useEffect(() => { reload().catch(() => setLoading(false)); }, []);
  if (building) return <FlowBuilder onCancel={() => setBuilding(false)} onSaved={() => { setBuilding(false); reload(); }} />;
  return <div className="space-y-4 py-6"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">Flows</h2><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Route work from normalized events after rules have evaluated the facts.</p></div>{canManage ? <button type="button" onClick={() => setBuilding(true)} className="rounded-md px-3 py-2 text-sm font-medium" style={{ background: 'var(--accent)', color: 'white' }}>New flow</button> : null}</div>
    {loading ? <p className="text-sm">Loading flows…</p> : flows.length ? <ul className="space-y-2">{flows.map((flow) => <li key={flow.id} className="rounded-lg border bg-white p-4"><div className="flex justify-between"><div><p className="text-sm font-semibold">{flow.name}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{flow.trigger_event_type} · {flow.outputs.length} output{flow.outputs.length === 1 ? '' : 's'} · v{flow.version}</p></div><span className="text-xs">{flow.active ? 'Active' : 'Inactive'}</span></div></li>)}</ul> : <p className="rounded-lg border p-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No flows yet.</p>}
  </div>;
}
