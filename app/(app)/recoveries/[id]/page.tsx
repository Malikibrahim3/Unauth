import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { WorkbenchPage } from '@/components/ui';
import { getRecoveryCase } from '@/lib/recoveries/store';
import { RECOVERY_STATUS_LABELS, RECOVERY_OWNER_LABELS, type RecoveryCaseEvent } from '@/lib/recoveries/types';
import { RECOVERY_TYPE_LABELS } from '@/lib/partners/types';
import { formatCurrencyNullable, formatDateAbsolute, formatDateTime, formatNumber } from '@/lib/utils/format';
import { recoveryOutstanding } from '@/lib/recoveries/amounts';
import { label } from '@/lib/ui/labels';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { humanizeEvidenceKey } from '@/components/claims/payout/payoutCopy';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--ua-text-tertiary)' }}>{label}</p>
      <p className="text-sm" style={{ color: 'var(--ua-text-primary)' }}>{value}</p>
    </div>
  );
}

export default async function RecoveryDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/dashboard');

  const recovery = await getRecoveryCase(serviceClient, ctx.merchantId, id);
  if (!recovery) redirect('/recoveries');

  const { data: eventRows } = await serviceClient
    .from(TABLES.RECOVERY_CASE_EVENTS)
    .select('id,event_type,from_status,to_status,note,created_at')
    .eq('merchant_id', ctx.merchantId)
    .eq('recovery_case_id', id)
    .order('created_at', { ascending: false });
  const events = (eventRows ?? []) as RecoveryCaseEvent[];
  const [{ data: correspondenceRows }, { data: taskRows }] = await Promise.all([
    recovery.loss_case_id ? serviceClient.from(TABLES.EXTERNAL_CORRESPONDENCE).select('id,direction,channel,source_provider,source_record_id,subject,sent_at,received_at,source_url').eq('merchant_id', ctx.merchantId).eq('loss_case_id', recovery.loss_case_id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    serviceClient.from(TABLES.WORK_TASKS).select('id,title,status,priority,owner_user_id,due_at,blocking_reason').eq('merchant_id', ctx.merchantId).eq('recovery_case_id', id).order('updated_at', { ascending: false }),
  ]);

  const missing = recovery.evidence_missing ?? [];
  const sought = recovery.amount_sought_minor / 100;
  const approved = recovery.amount_approved_minor / 100;
  const recovered = recovery.amount_recovered_minor / 100;
  const writtenOff = recovery.amount_written_off_minor / 100;
  const outstanding = recoveryOutstanding({ sought, recovered, writtenOff });
  const recoveryTitle = RECOVERY_TYPE_LABELS[recovery.recovery_type] ?? 'Recovery case';

  return (
    <WorkbenchPage
      title={recoveryTitle}
      subtitle={`${RECOVERY_OWNER_LABELS[recovery.owner_type] ?? 'Owner'} · ${RECOVERY_STATUS_LABELS[recovery.status] ?? recovery.status}`}
      kpiItems={[
        { label: 'Merchant loss', value: formatCurrencyNullable(recovery.merchant_loss_amount, recovery.currency) ?? '-', hint: 'Recorded loss' },
        { label: 'Amount pursued', value: formatCurrencyNullable(sought, recovery.currency) ?? '-', hint: 'Bounded by the recovery estimate' },
        { label: 'Approved', value: formatCurrencyNullable(approved, recovery.currency) ?? '-', hint: 'Not recovered cash' },
        { label: 'Recovered', value: formatCurrencyNullable(recovered, recovery.currency) ?? '-', hint: 'Actually received or credited' },
        { label: 'Outstanding', value: formatCurrencyNullable(outstanding, recovery.currency) ?? '-', hint: writtenOff > 0 ? 'Closed balance written off' : 'Pursued minus recovered' },
        { label: 'Evidence gaps', value: formatNumber(missing.length), hint: 'Missing items' },
      ]}
      main={
        <div className="flex flex-col gap-3">
          <SetBreadcrumbLabel label={recoveryTitle} />
          <section className="rounded-[var(--ua-radius-surface)] p-4" style={{ border: '1px solid var(--ua-border-subtle)' }}>
            <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>Recovery details</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Row label="Status" value={RECOVERY_STATUS_LABELS[recovery.status] ?? recovery.status} />
              <Row label="Owner" value={RECOVERY_OWNER_LABELS[recovery.owner_type] ?? recovery.owner_type} />
              <Row label="Type" value={RECOVERY_TYPE_LABELS[recovery.recovery_type] ?? recovery.recovery_type} />
              <Row label="Deadline" value={recovery.deadline_at ? formatDateAbsolute(recovery.deadline_at) : '—'} />
              <Row label="Next chase" value={recovery.next_chase_at ? formatDateAbsolute(recovery.next_chase_at) : '—'} />
              <Row label="Evidence complete" value={recovery.evidence_complete ? 'Yes' : 'No'} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <a href={`/claims/${recovery.support_payout_case_id}`} className="rounded-md px-2.5 py-1 no-underline" style={{ border: '1px solid var(--ua-border-subtle)', color: 'var(--ua-text-secondary)' }}>
                Open payout case
              </a>
              {recovery.loss_case_id ? (
                <a href={`/losses/${recovery.loss_case_id}`} className="rounded-md px-2.5 py-1 no-underline" style={{ border: '1px solid var(--ua-border-subtle)', color: 'var(--ua-text-secondary)' }}>
                  Open linked loss
                </a>
              ) : null}
            </div>
          </section>

          {missing.length > 0 ? (
            <section className="rounded-[var(--ua-radius-surface)] p-4" style={{ border: '1px solid var(--ua-border-subtle)' }}>
              <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>Missing evidence</h2>
              <ul className="flex flex-wrap gap-1.5">
                {missing.map((key) => (
                  <li key={key} className="rounded-md px-2 py-0.5 text-xs" style={{ backgroundColor: 'var(--ua-surface-muted)', color: 'var(--ua-text-secondary)' }}>
                    {humanizeEvidenceKey(key)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-lg p-4" style={{ border: '1px solid var(--ua-border-subtle)' }}><h2 className="mb-3 text-sm font-semibold">Correspondence</h2>{(correspondenceRows ?? []).length ? <ul className="space-y-2">{(correspondenceRows ?? []).map((item: { id: string; direction: string; source_provider: string; source_record_id: string; subject: string | null; source_url: string | null }) => <li key={item.id} className="text-sm"><span className="font-medium capitalize">{item.direction}</span> · {item.source_provider} · {item.subject ?? item.source_record_id}{item.source_url ? <a className="ml-2 underline" href={item.source_url}>Source</a> : null}</li>)}</ul> : <p className="text-sm text-[var(--ua-text-tertiary)]">No external correspondence is linked.</p>}</section>
          <section className="rounded-lg p-4" style={{ border: '1px solid var(--ua-border-subtle)' }}><h2 className="mb-3 text-sm font-semibold">Tasks</h2>{(taskRows ?? []).length ? <ul className="space-y-2">{(taskRows ?? []).map((task: { id: string; title: string; status: string; due_at: string | null }) => <li key={task.id} className="text-sm"><span className="font-medium">{task.title}</span> · {label('workflowStatus', task.status)}{task.due_at ? ` · due ${formatDateAbsolute(task.due_at)}` : ''}</li>)}</ul> : <p className="text-sm text-[var(--ua-text-tertiary)]">No recovery tasks are linked.</p>}</section>

          <section className="rounded-lg p-4" style={{ border: '1px solid var(--ua-border-subtle)' }}>
            <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>Activity</h2>
            {events.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--ua-text-tertiary)' }}>No recovery activity yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
                    <span style={{ color: 'var(--ua-text-primary)' }}>
                      {label('workflowStatus', event.event_type)}
                      {event.from_status && event.to_status ? (
                        <span style={{ color: 'var(--ua-text-tertiary)' }}> · from {label('recoveryStatus', event.from_status)} to {label('recoveryStatus', event.to_status)}</span>
                      ) : null}
                      {event.note ? <span style={{ color: 'var(--ua-text-secondary)' }}> — {event.note}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs" style={{ color: 'var(--ua-text-tertiary)' }}>{formatDateTime(event.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      }
    />
  );
}
