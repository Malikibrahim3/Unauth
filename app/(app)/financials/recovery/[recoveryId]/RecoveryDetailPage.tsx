import { notFound, redirect } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { getRecoveryCase } from '@/lib/recoveries/store';
import type { RecoveryCaseEvent } from '@/lib/recoveries/types';
import { RECOVERY_OWNER_LABELS, RECOVERY_STATUS_LABELS } from '@/lib/recoveries/types';
import { RECOVERY_TYPE_LABELS } from '@/lib/partners/types';
import { RecoveryDetailActions } from '@/components/recoveries/RecoveryDetailActions';
import {
  RecoveryDetailOperations,
  type ProviderCreditEventRow,
  type RecoveryCorrespondenceRow,
  type RecoveryTaskRow,
} from '@/components/recoveries/RecoveryDetailOperations';
import { hashId } from '@/lib/ui/displayRef';
import type { SupabaseClient } from '@supabase/supabase-js';
import { derivePartnerStatistics, deriveRecoveryAgeing } from '@/lib/capabilities/derived';
import { formatDateAbsolute } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

type PayoutRow = {
  id: string;
  claim_type: string;
  status: string;
  amount_at_risk: number | null;
  total_estimated_loss: number | null;
  currency: string | null;
  source_order_id: string | null;
  source_ticket_id: string | null;
};

export default async function RecoveryDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/overview');

  const [recovery, canManage] = await Promise.all([
    getRecoveryCase(serviceClient, ctx.merchantId, id),
    hasPermission(serviceClient, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS),
  ]);
  if (!recovery) notFound();

  const eventsClient = serviceClient as unknown as SupabaseClient;
  const [{ data: eventRows }, { data: correspondenceRows }, { data: taskRows }, { data: providerCreditEventRows }, { data: payoutRow }] = await Promise.all([
    serviceClient
      .from(TABLES.RECOVERY_CASE_EVENTS)
      .select('id,event_type,from_status,to_status,note,metadata,created_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('recovery_case_id', id)
      .order('created_at', { ascending: false }),
    recovery.loss_case_id
      ? serviceClient
        .from(TABLES.EXTERNAL_CORRESPONDENCE)
        .select('id,direction,source_provider,source_record_id,subject,sent_at,received_at,source_url')
        .eq('merchant_id', ctx.merchantId)
        .eq('loss_case_id', recovery.loss_case_id)
        .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    serviceClient
      .from(TABLES.WORK_TASKS)
      .select('id,title,status,due_at,blocking_reason')
      .eq('merchant_id', ctx.merchantId)
      .eq('recovery_case_id', id)
      .order('updated_at', { ascending: false }),
    eventsClient
      .from(TABLES.PROVIDER_CREDIT_EVENTS)
      .select('id,event_type,from_status,to_status,amount_minor,currency,reason,source_record_id,evidence_item_id,financial_entry_id,created_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('recovery_case_id', id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    serviceClient
      .from(TABLES.MERCHANT_CLAIMS)
      .select('id,claim_type,status,amount_at_risk,total_estimated_loss,currency,source_order_id,source_ticket_id')
      .eq('merchant_id', ctx.merchantId)
      .eq('id', recovery.support_payout_case_id)
      .maybeSingle(),
  ]);

  const partnerName = recovery.partner?.name ?? RECOVERY_OWNER_LABELS[recovery.owner_type] ?? 'External owner';
  const reference = `REC-${hashId(recovery.id).slice(1)}`;
  const typedEvents = (eventRows ?? []) as RecoveryCaseEvent[];
  const ageing = deriveRecoveryAgeing({
    createdAt: recovery.created_at,
    status: recovery.status,
    deadlineAt: recovery.deadline_at,
    events: typedEvents,
  });
  const partnerRows = recovery.partner_id
    ? (await serviceClient
      .from(TABLES.RECOVERY_CASES)
      .select('status,created_at,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('partner_id', recovery.partner_id)
      .limit(500)).data ?? []
    : [];
  const partnerStatistics = derivePartnerStatistics((partnerRows as Array<{ status: string | null; created_at: string | null; updated_at: string | null }>).map((row) => ({
    status: row.status,
    createdAt: row.created_at,
    respondedAt: /approved|rejected|paid|credited|reconciled/i.test(row.status ?? '') ? row.updated_at : null,
  })));
  const payout = payoutRow as PayoutRow | null;
  const [{ data: orderRow }, { data: ticketRow }] = await Promise.all([
    payout?.source_order_id
      ? serviceClient.from(TABLES.SOURCE_ORDERS).select('order_number').eq('merchant_id', ctx.merchantId).eq('id', payout.source_order_id).maybeSingle()
      : Promise.resolve({ data: null }),
    payout?.source_ticket_id
      ? serviceClient.from(TABLES.SOURCE_TICKETS).select('external_id').eq('merchant_id', ctx.merchantId).eq('id', payout.source_ticket_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const recoveryWithDerived = {
    ...recovery,
    ageing,
    partner_statistics: partnerStatistics,
    support_payout_case: payout ? {
      ...payout,
      order_number: (orderRow as { order_number?: string | null } | null)?.order_number ?? null,
      ticket_external_id: (ticketRow as { external_id?: string | null } | null)?.external_id ?? null,
    } : null,
  };
  const typeLabel = RECOVERY_TYPE_LABELS[recovery.recovery_type];
  const statusLabel = RECOVERY_STATUS_LABELS[recovery.status].toUpperCase();
  const statusContext = ['submitted', 'waiting_response', 'chase_due'].includes(recovery.status)
    ? 'AWAITING PARTNER'
    : ['approved', 'partially_approved'].includes(recovery.status)
      ? 'AWAITING CREDIT'
      : recovery.status === 'paid'
        ? 'CREDIT OBSERVED'
        : recovery.status === 'closed_unrecoverable'
          ? 'CLOSED'
          : 'PRE-SUBMISSION';
  const caseReference = `CASE-${hashId(recovery.support_payout_case_id).slice(1)}`;
  const orderReference = payout?.source_order_id
    ? (recoveryWithDerived.support_payout_case?.order_number ?? hashId(payout.source_order_id))
    : null;
  const breadcrumbDetail = recovery.last_source_event_at
    ? `${statusLabel.toLowerCase()} · source seen ${formatDateAbsolute(recovery.last_source_event_at)}`
    : `${statusLabel.toLowerCase()} · source freshness unavailable`;

  return (
    <div data-screen-label="Recovery detail" data-visual-world="supplied-package" data-surface-id="recovery-detail" data-archetype="P7" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff', color: '#1c1f23' }}>
      <SetBreadcrumbLabel label={reference} detail={breadcrumbDetail} />
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <span style={{ padding: '2px 7px', borderRadius: 5, background: '#fff3e9', font: "500 10px/1.5 'Inter',sans-serif", color: '#7a5310' }}>{statusLabel} · {statusContext}</span>
        <span style={{ font: "500 14.5px/1.2 'Inter',sans-serif", color: '#1c1f23' }}>{partnerName} claim · {typeLabel.toLowerCase()}</span>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 12px/1.4 'Inter',sans-serif", color: '#64686d' }}>{caseReference}{orderReference ? ` · ${orderReference}` : ''} · {recovery.internal_owner_user_id ? 'assigned owner' : 'unassigned'}</span>
        <div style={{ flex: 1 }}/>
        <RecoveryDetailActions recovery={recoveryWithDerived} canManage={canManage} />
      </div>
        <RecoveryDetailOperations
          recovery={recoveryWithDerived}
          events={typedEvents}
          correspondence={(correspondenceRows ?? []) as RecoveryCorrespondenceRow[]}
          tasks={(taskRows ?? []) as RecoveryTaskRow[]}
          providerCreditEvents={(providerCreditEventRows ?? []) as ProviderCreditEventRow[]}
        />
    </div>
  );
}
