'use client';

import { useState } from 'react';

export function FlowBuilder({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('case.updated');
  const [taskTitle, setTaskTitle] = useState('Review case');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await fetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, triggerEventType: trigger, conditions: [], outputs: [{ type: 'create_task', title: taskTitle, priority: 'medium' }] }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Unable to create flow'); onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create flow'); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4 rounded-lg border bg-white p-4">
    <div><label className="text-xs font-medium" htmlFor="flow-name">Flow name</label><input id="flow-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border p-2 text-sm" /></div>
    <div><label className="text-xs font-medium" htmlFor="flow-trigger">Trigger</label><select id="flow-trigger" value={trigger} onChange={(event) => setTrigger(event.target.value)} className="mt-1 w-full rounded-md border p-2 text-sm"><option value="case.created">Case created</option><option value="case.updated">Case updated</option><option value="case.decision_recorded">Decision recorded</option><option value="shipment.exception_recorded">Shipment exception recorded</option><option value="connection.sync_failed">Integration sync failed</option></select></div>
    <div><label className="text-xs font-medium" htmlFor="flow-task">Task to create</label><input id="flow-task" required maxLength={200} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} className="mt-1 w-full rounded-md border p-2 text-sm" /></div>
    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Flows react to events. They can create bounded work and notifications, but they never approve, deny, or issue a refund.</p>
    <div className="flex gap-2"><button type="submit" disabled={saving} className="rounded-md px-3 py-2 text-sm" style={{ background: 'var(--accent)', color: 'white' }}>{saving ? 'Saving…' : 'Create flow'}</button><button type="button" onClick={onCancel} className="rounded-md border px-3 py-2 text-sm">Cancel</button></div>
    {error ? <p role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p> : null}
  </form>;
}
