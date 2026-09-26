'use client';

import { useState, type CSSProperties } from 'react';
import type { NotificationKind } from '@/lib/collaboration/notificationPreferences';

const KINDS: Array<{ kind: NotificationKind; label: string; description: string }> = [
  { kind: 'assignment', label: 'Assignments', description: 'Work or cases assigned to you.' },
  { kind: 'mention', label: 'Mentions', description: 'A teammate mentions you in a case comment.' },
  { kind: 'approaching_deadline', label: 'Deadlines', description: 'Owned work approaches or passes its due time.' },
  { kind: 'evidence_update', label: 'Evidence updates', description: 'New or missing source evidence changes the next action.' },
  { kind: 'decision_request', label: 'Decision requests', description: 'A case is ready for merchant review.' },
  { kind: 'recovery_outcome', label: 'Recovery outcomes', description: 'A carrier, 3PL, supplier, or payment source reports an outcome.' },
  { kind: 'sync_failure', label: 'Connection health', description: 'A connected provider needs credentials or a retry.' },
  { kind: 'high_value_case_alert', label: 'High-value cases', description: 'Payout exposure exceeds the operational review threshold.' },
];

const GROUPS = [
  { title: 'Your work', description: 'Ownership, collaboration, and due work.', kinds: ['assignment', 'mention', 'approaching_deadline'] as NotificationKind[] },
  { title: 'Case review', description: 'Evidence changes and decisions needing attention.', kinds: ['evidence_update', 'decision_request', 'high_value_case_alert'] as NotificationKind[] },
  { title: 'Recovery and sources', description: 'External outcomes and connection health.', kinds: ['recovery_outcome', 'sync_failure'] as NotificationKind[] },
];

type Pref = { kind: string; in_app_enabled: boolean; email_enabled: boolean };
type SaveNotice = { tone: 'idle' | 'success' | 'error'; message: string };

const shadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';
const heading: CSSProperties = { color: '#64686d', letterSpacing: '.09em', font: "600 10.5px/1 'Inter',sans-serif" };

export function NotificationPreferencesForm({ initial }: { initial: Pref[] }) {
  const [prefs, setPrefs] = useState(() => new Map(initial.map((value) => [value.kind, value])));
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveNotice>({ tone: 'idle', message: '' });

  async function update(kind: NotificationKind, value: boolean) {
    if (saving) return;
    const previous = prefs.get(kind) ?? { kind, in_app_enabled: true, email_enabled: false };
    const next = { ...previous, in_app_enabled: value, email_enabled: false };
    setPrefs((current) => new Map(current).set(kind, next));
    setSaving(kind);
    setStatus({ tone: 'idle', message: 'Saving preference…' });
    try {
      const response = await fetch('/api/notifications/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      if (!response.ok) throw new Error('Unable to save');
      setStatus({ tone: 'success', message: `${KINDS.find((item) => item.kind === kind)?.label ?? kind} preference saved.` });
    } catch {
      setPrefs((current) => new Map(current).set(kind, previous));
      setStatus({ tone: 'error', message: 'Unable to save. Your previous preference was restored.' });
    } finally {
      setSaving(null);
    }
  }

  return <div style={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <section aria-label="Notification preference delivery" style={{ padding: '13px 15px', borderRadius: 10, background: '#f4f3f1', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#9f4f08" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}><path d="M5 8.2a4 4 0 0 1 8 0c0 2.5 1.2 3.8 1.2 3.8H3.8S5 10.7 5 8.2Z"/><path d="M7.4 14.2a2 2 0 0 0 3.2 0"/></svg>
      <div><h2 style={{ margin: 0, color: '#1c1f23', font: "500 13px/1.4 'Inter',sans-serif" }}>In-app events</h2><p style={{ maxWidth: 660, margin: '4px 0 0', color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>Eight implemented event types. Each switch saves independently for your account; there is no master switch and email delivery is unavailable.</p></div>
    </section>
    <p role={status.tone === 'error' ? 'alert' : 'status'} aria-live="polite" style={{ minHeight: 16, margin: 0, padding: '0 2px', color: status.tone === 'error' ? '#b0431a' : status.tone === 'success' ? '#1a6b43' : '#64686d', font: "400 10.5px/1.5 'Inter',sans-serif" }}>{status.message}</p>
    <div aria-label="Notification preferences" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', alignItems: 'start', gap: 12 }}>
      {GROUPS.map((group) => <section key={group.title} style={{ borderRadius: 10, background: '#fff', boxShadow: shadow, overflow: 'hidden' }}>
        <div style={{ padding: '14px 15px 11px' }}><h2 style={{ ...heading, margin: 0 }}>{group.title.toUpperCase()}</h2><p style={{ minHeight: 32, margin: '5px 0 0', color: '#64686d', font: "400 10.5px/1.5 'Inter',sans-serif" }}>{group.description}</p></div>
        <div>{group.kinds.map((kind) => {
          const item = KINDS.find((candidate) => candidate.kind === kind)!;
          const pref = prefs.get(item.kind) ?? { kind: item.kind, in_app_enabled: true, email_enabled: false };
          const isSaving = saving === item.kind;
          return <label key={item.kind} style={{ minHeight: 76, padding: '11px 15px', borderTop: '1px solid #eae8e5', display: 'flex', alignItems: 'center', gap: 10, cursor: saving ? 'wait' : 'pointer' }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', color: '#1c1f23', font: "400 11.5px/1.4 'Inter',sans-serif" }}>{item.label}</span><span style={{ display: 'block', marginTop: 3, color: '#64686d', font: "400 10px/1.45 'Inter',sans-serif" }}>{item.description}</span></span>
            {isSaving ? <span aria-hidden="true" style={{ color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace" }}>saving</span> : null}
            <input type="checkbox" checked={pref.in_app_enabled} disabled={saving !== null} aria-label={`${item.label} in app`} onChange={(event) => void update(item.kind, event.target.checked)} style={{ width: 18, height: 18, flex: 'none', accentColor: '#1c1f23' }}/>

          </label>;
        })}</div>
      </section>)}
    </div>
    <div style={{ padding: '10px 2px 0', borderTop: '1px solid #e4e3e0', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>Preferences affect future in-app items for this account. They do not erase recorded events or change another team member’s inbox.</div>
  </div>;
}
