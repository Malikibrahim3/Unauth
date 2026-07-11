import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { getRecoveryCase } from '@/lib/recoveries/store';
import { RECOVERY_STATUS_LABELS, RECOVERY_OWNER_LABELS, type RecoveryCaseEvent } from '@/lib/recoveries/types';
import { RECOVERY_TYPE_LABELS } from '@/lib/partners/types';
import { formatCurrencyNullable } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

export default async function RecoveryDetailPage({ params }: Props) {
  const { id } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied || !ctx) redirect('/dashboard');

  const recovery = await getRecoveryCase(serviceClient, ctx.merchantId, id);
  if (!recovery) redirect('/recoveries');

  const { data: eventRows } = await serviceClient
    .from(TABLES.RECOVERY_CASE_EVENTS)
    .select('id,event_type,from_status,to_status,note,created_at')
    .eq('merchant_id', ctx.merchantId)
    .eq('recovery_case_id', id)
    .order('created_at', { ascending: false });
  const events = (eventRows ?? []) as RecoveryCaseEvent[];

  const missing = recovery.evidence_missing ?? [];

  return (
    <WorkbenchPage
      eyebrow="Recovery"
      title={RECOVERY_TYPE_LABELS[recovery.recovery_type] ?? 'Recovery case'}
      subtitle={`${RECOVERY_OWNER_LABELS[recovery.owner_type] ?? 'Owner'} · ${RECOVERY_STATUS_LABELS[recovery.status] ?? recovery.status}`}
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="recoveries"
      kpiItems={[
        { label: 'Merchant loss', value: formatCurrencyNullable(recovery.merchant_loss_amount, recovery.currency) ?? '-', hint: 'Recorded loss' },
        { label: 'Estimated recovery', value: formatCurrencyNullable(recovery.estimated_recoverable_max ?? null, recovery.currency) ?? '-', hint: 'Upper estimate' },
        { label: 'Recovered', value: formatCurrencyNullable(recovery.amount_recovered ?? null, recovery.currency) ?? '-', hint: 'Synced outcome' },
        { label: 'Evidence gaps', value: missing.length.toLocaleString(), hint: 'Missing items' },
      ]}
      main={
        <div className="flex flex-col gap-6">
          <section className="rounded-lg p-4" style={{ border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))' }}>
            <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recovery details</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Row label="Status" value={RECOVERY_STATUS_LABELS[recovery.status] ?? recovery.status} />
              <Row label="Owner" value={RECOVERY_OWNER_LABELS[recovery.owner_type] ?? recovery.owner_type} />
              <Row label="Type" value={RECOVERY_TYPE_LABELS[recovery.recovery_type] ?? recovery.recovery_type} />
              <Row label="Deadline" value={recovery.deadline_at ? recovery.deadline_at.slice(0, 10) : '—'} />
              <Row label="Next chase" value={recovery.next_chase_at ? recovery.next_chase_at.slice(0, 10) : '—'} />
              <Row label="Evidence complete" value={recovery.evidence_complete ? 'Yes' : 'No'} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <a href={`/claims/${recovery.support_payout_case_id}`} className="rounded-md px-2.5 py-1 no-underline" style={{ border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))', color: 'var(--text-secondary)' }}>
                Open payout case →
              </a>
              {recovery.loss_case_id ? (
                <a href="/losses" className="rounded-md px-2.5 py-1 no-underline" style={{ border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))', color: 'var(--text-secondary)' }}>
                  View loss ledger →
                </a>
              ) : null}
            </div>
          </section>

          {missing.length > 0 ? (
            <section className="rounded-lg p-4" style={{ border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))' }}>
              <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Missing evidence</h2>
              <ul className="flex flex-wrap gap-1.5">
                {missing.map((key) => (
                  <li key={key} className="rounded-md px-2 py-0.5 text-xs" style={{ backgroundColor: 'var(--surface-muted, rgba(0,0,0,0.04))', color: 'var(--text-secondary)' }}>
                    {key.replaceAll('_', ' ')}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-lg p-4" style={{ border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))' }}>
            <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Activity</h2>
            {events.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No recovery activity yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
                    <span style={{ color: 'var(--text-primary)' }}>
                      {event.event_type.replaceAll('_', ' ')}
                      {event.from_status && event.to_status ? (
                        <span style={{ color: 'var(--text-tertiary)' }}> · {event.from_status} → {event.to_status}</span>
                      ) : null}
                      {event.note ? <span style={{ color: 'var(--text-secondary)' }}> — {event.note}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs" style={{ color: 'var(--text-tertiary)' }}>{event.created_at.slice(0, 10)}</span>
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
