import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { loadCanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';
import { financialPeriodBounds } from '@/lib/financial/periods';
import { loadFinancialPeriodPreview } from '@/lib/reconciliation/periodReadModel';

const closeBody = z.object({
  acknowledgedBlockerIds: z.array(z.string().uuid()).max(500).default([]),
  note: z.string().trim().max(2000).optional(),
});

type PeriodParams = { period: string };

async function authorize(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  const service = createServiceClient();
  const result = await requirePermission(service, user.id, permission);
  if (result.denied || !result.ctx) {
    return { response: result.denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  }
  return { service, user, ctx: result.ctx } as const;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<PeriodParams> },
) {
  const auth = await authorize(PERMISSIONS.VIEW_INBOX);
  if ('response' in auth) return auth.response;
  const { period } = await params;
  const bounds = financialPeriodBounds(period);
  if (!bounds) return NextResponse.json({ error: 'Period must use YYYY-MM.' }, { status: 400 });

  const [aggregate, preview] = await Promise.all([
    loadCanonicalFinancialAggregate(auth.service, auth.ctx.merchantId, {
      from: bounds.start.toISOString(),
      to: bounds.end.toISOString(),
    }),
    loadFinancialPeriodPreview(auth.service, auth.ctx.merchantId, bounds),
  ]);
  const closureResult = await
    auth.service
      .from(TABLES.FINANCIAL_PERIOD_CLOSURES)
      .select('id,period,signed_off_at,actor_user_id,acknowledged_blocker_ids,domain_event_id')
      .eq('merchant_id', auth.ctx.merchantId)
      .eq('period', period)
      .maybeSingle();
  const signOff = closureResult.error || !closureResult.data ? null : {
    id: closureResult.data.id,
    signedOffAt: closureResult.data.signed_off_at,
    actorUserId: closureResult.data.actor_user_id,
    acknowledgedBlockerIds: closureResult.data.acknowledged_blocker_ids,
    auditReceipt: { domainEventId: closureResult.data.domain_event_id },
  };

  return NextResponse.json({
    period,
    timezone: 'Europe/London',
    window: { startAt: bounds.start.toISOString(), endAt: bounds.end.toISOString() },
    position: aggregate.source === 'canonical' ? aggregate.currencies : null,
    positionSource: aggregate.source,
    settlements: { state: preview.settlementState, currencies: preview.settlements, observationAuthority: preview.observationAuthority },
    blockers: preview.blockers,
    blockerCount: preview.blockerCount,
    earlierOutstandingCount: preview.earlierOutstandingCount,
    blockersState: preview.blockersState === 'available' ? (preview.blockers.length ? 'open' : 'clear') : preview.blockersState,
    blockersReason: preview.closeBlockedReasons.join(' ') || null,
    signOff,
    signOffState: closureResult.error ? 'unavailable' : 'available',
    status: closureResult.error ? 'unavailable' : signOff ? 'closed' : 'preview',
    capability: 'period_close_available',
    writesPerformed: 0,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<PeriodParams> },
) {
  const auth = await authorize(PERMISSIONS.MANAGE_SETTINGS);
  if ('response' in auth) return auth.response;
  const { period } = await params;
  const bounds = financialPeriodBounds(period);
  if (!bounds) return NextResponse.json({ error: 'Period must use YYYY-MM.', writesPerformed: 0 }, { status: 400 });
  const idempotencyKey = request.headers.get('idempotency-key')?.trim() ?? '';
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.', writesPerformed: 0 }, { status: 400 });
  }
  const parsed = closeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid period-close payload.', details: parsed.error.flatten(), writesPerformed: 0 }, { status: 400 });
  }

  const preview = await loadFinancialPeriodPreview(auth.service, auth.ctx.merchantId, bounds);
  if (preview.closeBlockedReasons.length) {
    return NextResponse.json({
      error: preview.closeBlockedReasons.join(' '),
      code: 'period_close_preview_incomplete',
      writesPerformed: 0,
    }, { status: 503 });
  }
  const expectedBlockers = preview.blockers.map((row) => row.id).toSorted();
  const acknowledgedBlockers = parsed.data.acknowledgedBlockerIds.toSorted();
  if (JSON.stringify(expectedBlockers) !== JSON.stringify(acknowledgedBlockers)) {
    return NextResponse.json({
      error: 'The current-period blocker population changed. Review the refreshed period before closing.',
      code: 'period_close_blockers_changed',
      writesPerformed: 0,
    }, { status: 409 });
  }

  // This reviewed append-only RPC is the sole write boundary. The preview and
  // blocker comparison above must complete before a close can reach it.
  const rpc = await (auth.service as any).rpc('close_financial_period', {
    p_merchant_id: auth.ctx.merchantId,
    p_actor_id: auth.user.id,
    p_period: period,
    p_period_start: bounds.start.toISOString(),
    p_period_end: bounds.end.toISOString(),
    p_acknowledged_blocker_ids: parsed.data.acknowledgedBlockerIds,
    p_note: parsed.data.note ?? null,
    p_idempotency_key: idempotencyKey,
  });
  if (rpc.error) {
    const notBuilt = /close_financial_period|schema cache|function .* does not exist/i.test(rpc.error.message ?? '');
    return NextResponse.json({
      error: notBuilt
        ? 'Period close is not built on this database; no sign-off or money records were written.'
        : 'Period close failed before commit; no sign-off or money records were written.',
      code: notBuilt ? 'period_close_not_built' : 'period_close_failed',
      writesPerformed: 0,
    }, { status: notBuilt ? 503 : 409 });
  }
  const result = rpc.data && typeof rpc.data === 'object' ? rpc.data as Record<string, unknown> : {};
  return NextResponse.json({
    period,
    result,
    replayed: result.replayed === true,
    writesPerformed: result.replayed === true ? 0 : 1,
    auditReceipt: result.auditReceipt ?? null,
  });
}
