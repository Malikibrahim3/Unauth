'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { JoinedSection, Surface, Switch } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
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

export function NotificationPreferencesForm({ initial }: { initial: Pref[] }) {
  const [prefs, setPrefs] = useState(() => new Map(initial.map((value) => [value.kind, value])));
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveNotice>({ tone: 'idle', message: '' });

  async function update(kind: NotificationKind, value: boolean) {
    if (saving) return;
    const previous = prefs.get(kind) ?? { kind, in_app_enabled: true, email_enabled: false };
    const next = { ...previous, in_app_enabled: value, email_enabled: false };
    setPrefs((current) => new Map(current).set(kind, next));
    setSaving(kind); setStatus({ tone: 'idle', message: 'Saving preference…' });
    try {
      const response = await fetch('/api/notifications/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      if (!response.ok) throw new Error('Unable to save');
      setStatus({ tone: 'success', message: `${KINDS.find((item) => item.kind === kind)?.label ?? kind} preference saved.` });
    } catch {
      setPrefs((current) => new Map(current).set(kind, previous));
      setStatus({ tone: 'error', message: 'Unable to save. Your previous preference was restored.' });
    } finally { setSaving(null); }
  }

  return <div className="space-y-3">
    <p role={status.tone === 'error' ? 'alert' : 'status'} aria-live="polite" className={`min-h-4 px-1 text-[length:var(--uo-route-text-metadata-size)] ${status.tone === 'error' ? 'text-[var(--uo-route-risk-critical)]' : status.tone === 'success' ? 'text-[var(--uo-route-success)]' : 'text-[var(--uo-route-text-secondary)]'}`}>{status.message}</p>
    <Surface structure="working" aria-label="Notification preferences">
      <JoinedSection className="flex items-start gap-3 p-4 sm:p-5"><Bell className="mt-0.5 h-4 w-4 shrink-0 text-[var(--uo-route-accent-600)]" aria-hidden /><div><h2 className="ua-text-section-title">In-app events</h2><p className="ua-text-caption-role mt-1">Eight implemented event types. Each switch saves independently for your account; there is no master switch and email delivery is unavailable.</p></div></JoinedSection>
      {GROUPS.map((group) => <JoinedSection key={group.title} className="p-0"><div className="px-4 pb-2 pt-4 sm:px-5"><h2 className="ua-text-label text-[var(--uo-route-text-primary)]">{group.title}</h2><p className="ua-text-metadata mt-1">{group.description}</p></div><div className="divide-y divide-[var(--uo-route-border-subtle)]">
        {group.kinds.map((kind) => {
          const item = KINDS.find((candidate) => candidate.kind === kind)!;
          const pref = prefs.get(item.kind) ?? { kind: item.kind, in_app_enabled: true, email_enabled: false };
          const isSaving = saving === item.kind;
          return (
            <div key={item.kind} className="grid min-h-[72px] items-center gap-3 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <Switch
                  className="min-w-0 flex-1"
                  label={`${item.label} · In app`}
                  description={item.description}
                  checked={pref.in_app_enabled}
                  disabled={saving !== null}
                  aria-label={`${item.label} in app`}
                  onChange={(event) => void update(item.kind, event.target.checked)}
                />
                {isSaving ? <StatusBadge family="workflowStatus" value="saving" size="sm" /> : null}
              </div>
            </div>
          );
        })}
      </div></JoinedSection>)}
    </Surface>
  </div>;
}
