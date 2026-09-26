'use client';

import { useMemo, useState, type ReactNode } from 'react';

export type FlowConditionDraft = { field: string; operator: 'eq' | 'neq' | 'in' | 'exists'; value?: unknown; _editorKey?: string };
export type FlowOutputDraft = (
  | { type: 'create_task'; title: string; priority: 'low' | 'medium' | 'high' | 'urgent'; dueInHours?: number }
  | { type: 'request_evidence'; evidenceType: string; title?: string }
  | { type: 'set_deadline'; dueInHours: number }
  | { type: 'request_notification'; recipientUserId: string; kind: 'assignment' | 'mention' | 'approaching_deadline' | 'evidence_update' | 'decision_request' | 'recovery_outcome' | 'sync_failure' | 'high_value_case_alert'; title: string; body?: string }
) & { _editorKey?: string };
export type FlowDraftPayload = { name: string; description?: string; triggerEventType: string; conditions: FlowConditionDraft[]; outputs: FlowOutputDraft[]; active: boolean };
export type FlowEditable = { name: string; description: string | null; trigger_event_type: string; conditions: FlowConditionDraft[]; outputs: FlowOutputDraft[] };

const TRIGGERS = [
  ['case.created', 'Case created'],
  ['case.updated', 'Case updated'],
  ['case.decision_recorded', 'Decision recorded'],
  ['shipment.exception_recorded', 'Shipment exception recorded'],
  ['connection.sync_failed', 'Integration sync failed'],
] as const;

const inputStyle = { width: '100%', minWidth: 0, height: 34, border: 0, borderRadius: 8, padding: '0 9px', background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#1c1f23', font: "400 12px/1.3 'Inter',sans-serif", outline: 'none' } as const;
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em' } as const;
const paleButtonStyle = { padding: '6px 10px', border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 11.5px/1 'Inter',sans-serif", cursor: 'pointer' } as const;

let editorKeySequence = 0;
function nextEditorKey(prefix: string) { editorKeySequence += 1; return `${prefix}-${editorKeySequence}`; }
function blankOutput(): FlowOutputDraft { return { type: 'create_task', title: 'Review case', priority: 'medium', dueInHours: 24, _editorKey: nextEditorKey('action') }; }
function outputLabel(output: FlowOutputDraft) {
  if (output.type === 'create_task') return `Create task · ${output.title || 'Untitled'}`;
  if (output.type === 'request_evidence') return `Request evidence · ${output.evidenceType || 'Choose type'}`;
  if (output.type === 'set_deadline') return `Set deadline · ${output.dueInHours || '—'} hours`;
  return `Notify team member · ${output.title || 'Untitled'}`;
}

function EditorSection({ title, note, action, children }: { title: string; note: string; action?: ReactNode; children: ReactNode }) {
  return <section style={{ background: '#f4f3f1', borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}><span style={{ flex: 1, font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>{title}</span><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{note}</span>{action}</div>{children}</section>;
}

export function FlowEditor({ initial, fixedName = false, submitLabel = 'Save draft', onSubmit, onCancel }: { initial?: FlowEditable | null; fixedName?: boolean; submitLabel?: string; onSubmit: (payload: FlowDraftPayload) => Promise<boolean>; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [trigger, setTrigger] = useState(initial?.trigger_event_type ?? 'case.created');
  const [conditions, setConditions] = useState<FlowConditionDraft[]>(() => (initial?.conditions ?? []).map((condition) => ({ ...condition, _editorKey: condition._editorKey ?? nextEditorKey('condition') })));
  const [outputs, setOutputs] = useState<FlowOutputDraft[]>(() => initial?.outputs?.length ? initial.outputs.map((output) => ({ ...output, _editorKey: output._editorKey ?? nextEditorKey('action') })) : [blankOutput()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(() => [TRIGGERS.find(([value]) => value === trigger)?.[1] ?? trigger, conditions.length ? `${conditions.length} condition${conditions.length === 1 ? '' : 's'}` : 'No conditions (every event matches)', `${outputs.length} action${outputs.length === 1 ? '' : 's'}`], [conditions.length, outputs.length, trigger]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Flow name is required.'); return; }
    if (!outputs.length) { setError('Add at least one bounded action.'); return; }
    if (conditions.some((condition) => !condition.field.trim())) { setError('Every condition needs a field.'); return; }
    setSaving(true);
    const ok = await onSubmit({ name: name.trim(), description: description.trim() || undefined, triggerEventType: trigger, conditions: conditions.map(({ _editorKey: _key, ...condition }) => condition), outputs: outputs.map(({ _editorKey: _key, ...output }) => output), active: false });
    setSaving(false);
    if (!ok) setError('Draft could not be saved. Check the highlighted configuration and try again.');
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <EditorSection title="TRIGGER AND IDENTITY" note="the source event starts evaluation">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
          <label style={labelStyle}>FLOW NAME<input aria-label="Flow name" style={inputStyle} value={name} onChange={(event) => setName(event.target.value)} disabled={fixedName} placeholder="e.g. Chase carrier evidence" /></label>
          <label style={labelStyle}>TRIGGER<select aria-label="Trigger" style={inputStyle} value={trigger} onChange={(event) => setTrigger(event.target.value)}>{TRIGGERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>DESCRIPTION (SHOWN TO YOUR TEAM)<textarea aria-label="Description (shown to your team)" style={{ ...inputStyle, height: 58, padding: 9, resize: 'vertical' }} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What work does this route, and why?" /></label>
        </div>
      </EditorSection>

      <EditorSection title="WHEN" note="every condition must be true" action={<button type="button" onClick={() => setConditions((current) => [...current, { field: 'case.status', operator: 'eq', value: 'evidence_needed', _editorKey: nextEditorKey('condition') }])} style={paleButtonStyle}>+ Add condition</button>}>
        {conditions.length ? conditions.map((condition, index) => <div key={condition._editorKey} style={{ display: 'grid', gridTemplateColumns: '38px minmax(150px,1.3fr) minmax(110px,1fr) minmax(140px,.9fr) 20px', gap: 9, alignItems: 'end' }}>
          <span style={{ color: '#64686d', font: "400 10px/34px 'IBM Plex Mono',monospace", textAlign: 'right' }}>{index ? 'AND' : ''}</span>
          <label style={labelStyle}>SUBJECT<input aria-label={`Condition ${index + 1} field`} style={inputStyle} value={condition.field} onChange={(event) => setConditions((current) => current.map((item, i) => i === index ? { ...item, field: event.target.value } : item))} /></label>
          <label style={labelStyle}>TEST<select aria-label={`Condition ${index + 1} operator`} style={inputStyle} value={condition.operator} onChange={(event) => setConditions((current) => current.map((item, i) => i === index ? { ...item, operator: event.target.value as FlowConditionDraft['operator'] } : item))}><option value="eq">equals</option><option value="neq">does not equal</option><option value="in">is one of</option><option value="exists">is present</option></select></label>
          <label style={labelStyle}>VALUE{condition.operator === 'exists' ? <span style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: '#64686d' }}>No value</span> : <input aria-label={`Condition ${index + 1} value`} style={inputStyle} value={Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value ?? '')} onChange={(event) => setConditions((current) => current.map((item, i) => i === index ? { ...item, value: condition.operator === 'in' ? event.target.value.split(',').map((value) => value.trim()).filter(Boolean) : event.target.value } : item))} />}</label>
          <button type="button" aria-label={`Remove condition ${index + 1}`} onClick={() => setConditions((current) => current.filter((_, i) => i !== index))} style={{ marginBottom: 9, border: 0, padding: 0, background: 'transparent', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4" /></svg></button>
        </div>) : <div style={{ padding: '10px 12px', borderRadius: 10, background: '#fff3e9', color: '#7a5310', font: "400 11.5px/1.5 'Inter',sans-serif" }}>No conditions: every event with this trigger will run the actions below.</div>}
      </EditorSection>

      <EditorSection title="THEN" note="bounded actions only" action={<button type="button" onClick={() => setOutputs((current) => [...current, blankOutput()])} style={paleButtonStyle}>+ Add action</button>}>
        {outputs.map((output, index) => <ActionEditor key={output._editorKey} index={index} output={output} update={(next) => setOutputs((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))} remove={() => setOutputs((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}
      </EditorSection>

      <EditorSection title="READABLE SUMMARY" note="flows move work · people decide">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>{summary.map((item, index) => <div key={item} style={{ display: 'flex', gap: 8, padding: '9px 10px', borderRadius: 9, background: '#fff', color: '#40454a', font: "400 11.5px/1.4 'Inter',sans-serif" }}><span style={{ color: '#64686d', fontFamily: "'IBM Plex Mono',monospace" }}>{index + 1}</span>{item}</div>)}</div>
        <div style={{ color: '#64686d', font: "400 10.5px/1.5 'Inter',sans-serif" }}>{outputs.map((output, index) => <div key={output._editorKey}>Action {index + 1}: {outputLabel(output)}</div>)}</div>
      </EditorSection>

      {error ? <div role="alert" style={{ padding: '9px 11px', borderRadius: 9, background: '#fdf0e6', color: '#b0431a', font: "400 11.5px/1.4 'Inter',sans-serif" }}>{error}</div> : null}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" onClick={onCancel} disabled={saving} style={paleButtonStyle}>Cancel</button><button type="submit" disabled={saving} style={{ ...paleButtonStyle, background: '#1c1f23', color: '#fff', boxShadow: 'none', opacity: saving ? .55 : 1 }}>{saving ? 'Saving…' : submitLabel}</button></div>
    </form>
  );
}

function ActionEditor({ index, output, update, remove }: { index: number; output: FlowOutputDraft; update: (output: FlowOutputDraft) => void; remove: () => void }) {
  function changeType(type: FlowOutputDraft['type']) {
    if (type === 'create_task') update({ ...blankOutput(), _editorKey: output._editorKey });
    else if (type === 'request_evidence') update({ type, evidenceType: 'proof_of_delivery', title: 'Collect proof of delivery', _editorKey: output._editorKey });
    else if (type === 'set_deadline') update({ type, dueInHours: 24, _editorKey: output._editorKey });
    else update({ type, recipientUserId: '', kind: 'assignment', title: 'Flow needs attention', body: '', _editorKey: output._editorKey });
  }
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 10, borderRadius: 10, background: '#fff' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ color: '#64686d', font: "400 10px/1 'IBM Plex Mono',monospace" }}>ACTION {index + 1}</span><select aria-label={`Action ${index + 1} type`} style={{ ...inputStyle, width: 190 }} value={output.type} onChange={(event) => changeType(event.target.value as FlowOutputDraft['type'])}><option value="create_task">Create task</option><option value="request_evidence">Request evidence</option><option value="set_deadline">Set deadline</option><option value="request_notification">Notify team member</option></select><span style={{ flex: 1 }} /><button type="button" aria-label={`Remove action ${index + 1}`} onClick={remove} style={{ border: 0, padding: 2, background: 'transparent', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4" /></svg></button></div>
    {output.type === 'create_task' ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 128px 128px', gap: 9 }}><input aria-label={`Action ${index + 1} task title`} style={inputStyle} value={output.title} onChange={(event) => update({ ...output, title: event.target.value })} /><select aria-label={`Action ${index + 1} priority`} style={inputStyle} value={output.priority} onChange={(event) => update({ ...output, priority: event.target.value as typeof output.priority })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select><input aria-label={`Action ${index + 1} due hours`} style={inputStyle} type="number" min={1} max={8760} value={output.dueInHours ?? ''} onChange={(event) => update({ ...output, dueInHours: event.target.value ? Number(event.target.value) : undefined })} /></div> : output.type === 'request_evidence' ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}><input aria-label={`Action ${index + 1} evidence type`} style={inputStyle} value={output.evidenceType} onChange={(event) => update({ ...output, evidenceType: event.target.value })} /><input aria-label={`Action ${index + 1} title`} style={inputStyle} value={output.title ?? ''} onChange={(event) => update({ ...output, title: event.target.value })} /></div> : output.type === 'set_deadline' ? <input aria-label={`Action ${index + 1} deadline hours`} style={{ ...inputStyle, width: 180 }} type="number" min={1} max={8760} value={output.dueInHours} onChange={(event) => update({ ...output, dueInHours: Number(event.target.value) })} /> : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}><input aria-label={`Action ${index + 1} recipient user ID`} style={inputStyle} value={output.recipientUserId} onChange={(event) => update({ ...output, recipientUserId: event.target.value })} /><select aria-label={`Action ${index + 1} notification kind`} style={inputStyle} value={output.kind} onChange={(event) => update({ ...output, kind: event.target.value as typeof output.kind })}><option value="assignment">Assignment</option><option value="approaching_deadline">Approaching deadline</option><option value="evidence_update">Evidence update</option><option value="decision_request">Decision request</option><option value="recovery_outcome">Recovery outcome</option><option value="sync_failure">Sync failure</option></select><input aria-label={`Action ${index + 1} notification title`} style={inputStyle} value={output.title} onChange={(event) => update({ ...output, title: event.target.value })} /><input aria-label={`Action ${index + 1} notification body`} style={inputStyle} value={output.body ?? ''} onChange={(event) => update({ ...output, body: event.target.value })} /></div>}
  </div>;
}
