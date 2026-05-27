import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, History, ShieldCheck } from 'lucide-react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { SectionCard } from '@/components/ui';
import { claimEventLabel } from '@/lib/claims/events';

function renderMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return '—';
  const entries = Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 4);
  if (entries.length === 0) return '—';
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ');
}

export default async function AuditTrailPage() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT_TRAIL);
  if (denied) redirect('/settings');

  const [{ data: actionRows }, { data: claimEventRows }] = await Promise.all([
    serviceClient
      .from('user_action_log' as any)
      .select('id,actor_user_id,action,resource_type,resource_id,metadata,created_at')
      .eq('merchant_id', ctx.merchantId)
      .order('created_at', { ascending: false })
      .limit(40),
    serviceClient
      .from('claim_events' as any)
      .select('id,claim_id,event_type,previous_status,new_status,previous_decision,new_decision,previous_outcome,new_outcome,note,actor_user_id,metadata,created_at')
      .eq('merchant_id', ctx.merchantId)
      .order('created_at', { ascending: false })
      .limit(40),
  ]);

  const rows = [
    ...((actionRows ?? []) as any[]).map((row) => ({
      id: row.id,
      action: row.action,
      resourceType: row.resource_type ?? 'system',
      resourceId: row.resource_id ?? null,
      actorUserId: row.actor_user_id ?? null,
      metadata: row.metadata ?? null,
      createdAt: row.created_at,
    })),
    ...((claimEventRows ?? []) as any[]).map((event) => ({
      id: event.id,
      action: claimEventLabel(event.event_type),
      resourceType: 'claim',
      resourceId: event.claim_id,
      actorUserId: event.actor_user_id ?? null,
      metadata: {
        previous_status: event.previous_status,
        new_status: event.new_status,
        previous_decision: event.previous_decision,
        new_decision: event.new_decision,
        previous_outcome: event.previous_outcome,
        new_outcome: event.new_outcome,
        note: event.note,
        ...(event.metadata ?? {}),
      },
      createdAt: event.created_at,
    })),
  ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 60);

  return (
    <div className="max-w-6xl space-y-6 p-8">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: 'var(--ink-secondary)' }}
        >
          <ArrowLeft className="h-3 w-3" /> Settings
        </Link>
        <div className="flex items-center gap-3">
          <History className="h-5 w-5" style={{ color: 'var(--privacy-ink)' }} />
          <h1 className="t-heading" style={{ color: 'var(--ink-primary)' }}>Audit trail</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Review merchant-scoped user actions and claim lifecycle events with actor attribution.
        </p>
      </div>

      <SectionCard
        title="Claim and user actions"
        description="Append-only claim events are shown alongside system audit entries."
        actions={<span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--privacy-ink)' }}><ShieldCheck className="h-3.5 w-3.5" /> Merchant scoped</span>}
      >
        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>No audit events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border" style={{ borderColor: 'var(--surface-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-muted)', color: 'var(--ink-tertiary)' }}>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Resource</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Actor</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.resourceType}-${row.id}`} className="border-t" style={{ borderColor: 'var(--surface-border)' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-tertiary)' }}>{new Date(row.createdAt).toLocaleString('en-GB')}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--ink-primary)' }}>{row.action}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--data-id)' }}>{row.resourceType}{row.resourceId ? `:${String(row.resourceId).slice(0, 8)}` : ''}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--ink-secondary)' }}>{row.actorUserId ? String(row.actorUserId).slice(0, 8) : 'system'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-secondary)' }}>{renderMetadata(row.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
