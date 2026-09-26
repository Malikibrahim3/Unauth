import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { resolveExceptionAction } from '@/lib/exceptions/resolveExceptionAction';
import { assignException } from '@/lib/exceptions/store';
import { TABLES } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum(['confirm', 'reject', 'resolve', 'dismiss']),
  selectedCandidateId: z.string().uuid().nullable().optional(),
  resolution: z.string().trim().max(2000).nullable().optional(),
  expectedStateVersion: z.number().int().positive().nullable().optional(),
});

const STATUS_BY_REASON: Record<string, number> = {
  not_found: 404,
  already_settled: 409,
  not_a_match_exception: 422,
  candidate_required: 422,
  version_conflict: 409,
};

/**
 * POST — the merchant's decision on an exception. confirm/reject settle a match
 * exception through resolveMatch (updating records, case, financials, audit);
 * resolve/dismiss settle any exception.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied || !ctx?.merchantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid exception action' }, { status: 400 });
  const idempotencyKey = req.headers.get('idempotency-key')?.trim() ?? '';
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required' }, { status: 400 });
  }

  const result = await resolveExceptionAction(serviceClient, {
    merchantId: ctx.merchantId,
    exceptionId: id,
    action: parsed.data.action,
    selectedCandidateId: parsed.data.selectedCandidateId ?? null,
    resolution: parsed.data.resolution ?? null,
    expectedStateVersion: parsed.data.expectedStateVersion ?? null,
    actorUserId: user.id,
    idempotencyKey,
  });
  if (!result.ok) {
    if (result.reason === 'already_settled') {
      const replay = await serviceClient
        .from(TABLES.DOMAIN_EVENTS)
        .select('payload')
        .eq('merchant_id', ctx.merchantId)
        .eq('idempotency_key', `case.exception_resolved:${id}`)
        .maybeSingle();
      const payload = replay.data?.payload && typeof replay.data.payload === 'object'
        ? replay.data.payload as Record<string, unknown>
        : null;
      const expectedStatus = parsed.data.action === 'dismiss' || parsed.data.action === 'reject' ? 'dismissed' : 'resolved';
      if (
        !replay.error
        && payload?.request_idempotency_key === idempotencyKey
        && payload.action === parsed.data.action
        && payload.resolution === (parsed.data.resolution ?? null)
        && payload.selected_candidate_id === (parsed.data.selectedCandidateId ?? null)
        && payload.settle_status === expectedStatus
      ) {
        return NextResponse.json({ ok: true, replayed: true, matchStatus: payload.match_status ?? null, settleStatus: expectedStatus });
      }
    }
    return NextResponse.json({ error: result.reason }, { status: STATUS_BY_REASON[result.reason ?? ''] ?? 422 });
  }
  return NextResponse.json({ ok: true, replayed: false, exception: result.exception, matchStatus: result.matchStatus, settleStatus: result.settleStatus });
}

/** PATCH — claim/release an open exception for the current operator. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied || !ctx?.merchantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null) as { assignToMe?: unknown; release?: unknown } | null;
  if (!body || (body.assignToMe !== true && body.release !== true)) return NextResponse.json({ error: 'Invalid assignment request' }, { status: 400 });
  const assignment = await assignException(serviceClient, ctx.merchantId, id, body.release === true ? null : user.id);
  if (!assignment) return NextResponse.json({ error: 'Open exception not found' }, { status: 404 });
  return NextResponse.json({ assignment });
}
