import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { RECOVERY_CASE_STATUSES } from '@/lib/recoveries/types';
import { listRecoveryCases } from '@/lib/recoveries/store';
import { deriveRecoveryAgeing } from '@/lib/capabilities/derived';
import { TABLES } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const statusParam = sp.get('status');
  const status = (RECOVERY_CASE_STATUSES as readonly string[]).includes(statusParam ?? '')
    ? (statusParam as (typeof RECOVERY_CASE_STATUSES)[number])
    : undefined;

  const recoveries = await listRecoveryCases(serviceClient, ctx.merchantId, {
    status,
    supportPayoutCaseId: sp.get('supportPayoutCaseId') ?? undefined,
    partnerId: sp.get('partnerId') ?? undefined,
  });
  const recoveryIds = recoveries.map((recovery) => recovery.id);
  const eventsByRecovery = new Map<string, Array<{ to_status: string | null; created_at: string | null }>>();
  if (recoveryIds.length > 0) {
    const { data: events, error } = await serviceClient
      .from(TABLES.RECOVERY_CASE_EVENTS)
      .select('recovery_case_id,to_status,created_at')
      .eq('merchant_id', ctx.merchantId)
      .in('recovery_case_id', recoveryIds);
    if (error) return NextResponse.json({ error: 'Recovery history unavailable' }, { status: 503 });
    for (const event of (events ?? []) as Array<{ recovery_case_id: string; to_status: string | null; created_at: string | null }>) {
      const list = eventsByRecovery.get(event.recovery_case_id) ?? [];
      list.push({ to_status: event.to_status, created_at: event.created_at });
      eventsByRecovery.set(event.recovery_case_id, list);
    }
  }
  const enriched = recoveries.map((recovery) => ({
    ...recovery,
    ageing: deriveRecoveryAgeing({
      createdAt: recovery.created_at,
      status: recovery.status,
      deadlineAt: recovery.deadline_at,
      events: eventsByRecovery.get(recovery.id),
    }),
  }));
  return NextResponse.json({ recoveries: enriched });
}

/**
 * Recovery/loss cases are automation-created from source-backed case events.
 * This endpoint remains as a compatibility guard so old clients receive a clear
 * answer instead of silently creating manual operational facts.
 */
export async function POST(_request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  // Write action — must not be reachable by a read-only viewer, even though the
  // handler is currently a disabled stub.
  const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  return NextResponse.json({
    error: 'Manual loss case creation is disabled. Cases are detected from connected source events and sync jobs.',
    unavailableBecause: 'automation_setting_disabled',
  }, { status: 405 });
}
