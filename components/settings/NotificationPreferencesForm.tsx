'use client';

import { useState } from 'react';
import { Bell, MailX } from 'lucide-react';
import { InsetGroup, JoinedSection, Surface, Switch } from '@/components/ui';
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
  { kind: 'daily_work_summary', label: 'Daily work summary', description: 'A compact summary of owned and overdue work.' },
  { kind: 'scheduled_report', label: 'Scheduled reports', description: 'A requested report is ready to review.' },
];
const GROUPS = [
  { title: 'Review and ownership', kinds: ['assignment', 'mention', 'approaching_deadline', 'decision_request', 'high_value_case_alert'] as NotificationKind[] },
  { title: 'Evidence and operations', kinds: ['evidence_update', 'recovery_outcome', 'sync_failure', 'daily_work_summary', 'scheduled_report'] as NotificationKind[] },
];
type Pref = { kind: string; in_app_enabled: boolean; email_enabled: boolean };

export function NotificationPreferencesForm({ initial }: { initial: Pref[] }) {
  const [prefs, setPrefs] = useState(() => new Map(initial.map((value) => [value.kind, value])));
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  async function update(kind: NotificationKind, value: boolean) {
    const previous = prefs.get(kind) ?? { kind, in_app_enabled: true, email_enabled: false };
    const next = { ...previous, in_app_enabled: value, email_enabled: false };
    setPrefs((current) => new Map(current).set(kind, next));
    setSaving(kind); setStatus('Saving preference…');
    try {
      const response = await fetch('/api/notifications/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      if (!response.ok) throw new Error('Unable to save');
      setStatus(`${KINDS.find((item) => item.kind === kind)?.label ?? kind} preference saved.`);
    } catch {
      setPrefs((current) => new Map(current).set(kind, previous));
      setStatus('Unable to save. Your previous preference was restored.');
    } finally { setSaving(null); }
  }

  return <div className="space-y-3">
    <p aria-live="polite" className="min-h-4 px-1 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">{status}</p>
    <Surface structure="working" aria-label="Notification preferences">
      <JoinedSection className="flex items-start gap-3 p-4 sm:p-5"><Bell className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ua-accent-600)]" aria-hidden /><div><h2 className="ua-text-section-title">In-app delivery</h2><p className="ua-text-caption-role mt-1">Choose which operational events appear in your inbox. These controls apply only to your account.</p></div></JoinedSection>
      {GROUPS.map((group) => <JoinedSection key={group.title} className="p-0"><h2 className="ua-text-label px-4 pb-2 pt-4 text-[var(--ua-text-tertiary)] sm:px-5">{group.title}</h2><div className="divide-y divide-[var(--ua-border-subtle)]">
        {group.kinds.map((kind) => {
          const item = KINDS.find((candidate) => candidate.kind === kind)!;
          const pref = prefs.get(item.kind) ?? { kind: item.kind, in_app_enabled: true, email_enabled: false };
          const isSaving = saving === item.kind;
          return (
            <div key={item.kind} className="flex min-h-[64px] items-center gap-3 px-4 py-3 sm:px-5">
              <Switch
                className="min-w-0 flex-1"
                label={item.label}
                description={item.description}
                checked={pref.in_app_enabled}
                disabled={isSaving}
                aria-label={`${item.label} in app`}
                onChange={(event) => void update(item.kind, event.target.checked)}
              />
              {isSaving ? <StatusBadge family="workflowStatus" value="saving" size="sm" /> : null}
            </div>
          );
        })}
      </div></JoinedSection>)}
      <JoinedSection className="p-4 sm:p-5"><InsetGroup className="flex items-start gap-3 p-3"><MailX className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ua-icon-secondary)]" aria-hidden /><div><h2 className="ua-text-working-title">Email delivery is not enabled</h2><p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">Your inbox preferences remain active. Email delivery will be offered as a separate channel when available.</p></div></InsetGroup></JoinedSection>
    </Surface>
  </div>;
}
