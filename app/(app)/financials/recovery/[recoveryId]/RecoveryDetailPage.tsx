import { notFound, redirect } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { PageFrame } from '@/components/ui';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { getRecoveryCase } from '@/lib/recoveries/store';
import type { RecoveryCaseEvent } from '@/lib/recoveries/types';
import { RECOVERY_OWNER_LABELS } from '@/lib/recoveries/types';
import { RecoveryDetailActions } from '@/components/recoveries/RecoveryDetailActions';
import {
  RecoveryDetailOperations,
  type ProviderCreditEventRow,
  type RecoveryCorrespondenceRow,
  type RecoveryTaskRow,
} from '@/components/recoveries/RecoveryDetailOperations';
import { hashId } from '@/lib/ui/displayRef';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

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
  const [{ data: eventRows }, { data: correspondenceRows }, { data: taskRows }, { data: providerCreditEventRows }] = await Promise.all([
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
  ]);

  const partnerName = recovery.partner?.name ?? RECOVERY_OWNER_LABELS[recovery.owner_type] ?? 'External owner';
  const reference = `REC-${hashId(recovery.id).slice(1)}`;
  const title = `Recovery from ${partnerName}`;

  return (
    <>
      <SetBreadcrumbLabel label={title} />
      <PageFrame
        title={title}
        subtitle="One external recovery: what was sought, what the partner has actually done, which evidence is still required, and what remains claimable before the deadline."
        breadcrumbs={[
          { label: 'Financials', href: '/financials' },
          { label: 'Recovery board', href: '/financials/recovery' },
          { label: reference },
        ]}
        showCurrentBreadcrumb
        actions={<RecoveryDetailActions recovery={recovery} canManage={canManage} />}
        surfaceId="recovery-detail"
        archetype="P7"
      >
        <RecoveryDetailOperations
          recovery={recovery}
          events={(eventRows ?? []) as RecoveryCaseEvent[]}
          correspondence={(correspondenceRows ?? []) as RecoveryCorrespondenceRow[]}
          tasks={(taskRows ?? []) as RecoveryTaskRow[]}
          providerCreditEvents={(providerCreditEventRows ?? []) as ProviderCreditEventRow[]}
        />
      </PageFrame>
    </>
  );
}
