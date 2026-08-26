import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeApiIdempotencyKey } from '@/lib/api/v1/ingest/requestIdempotency';
import { transitionExternalAction } from '@/lib/claims/externalAction';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const reportAttemptSchema = z.object({
  expectedVersion: z.number().int().positive(),
  method: z.string().trim().min(2).max(80),
  externalReference: z.string().trim().max(160).nullable().optional(),
  receiptEvidence: z.record(z.string(), z.unknown()).nullable().optional(),
}).strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> },
) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_WORK);
  if (denied) return denied;

  const parsed = reportAttemptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid external-action report' }, { status: 400 });
  }
  const idempotencyKey = normalizeApiIdempotencyKey(request.headers.get('idempotency-key'));
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }

  const { actionId } = await params;
  try {
    const result = await transitionExternalAction(service, {
      merchantId: ctx.merchantId,
      actionId,
      actorUserId: user.id,
      authority: 'merchant',
      targetState: 'merchant_reported_attempt',
      expectedVersion: parsed.data.expectedVersion,
      idempotencyKey,
      method: parsed.data.method,
      externalReference: parsed.data.externalReference ?? null,
      receiptEvidence: parsed.data.receiptEvidence ?? null,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not_found')) return NextResponse.json({ error: 'External action not found' }, { status: 404 });
    if (message.includes('version_conflict') || message.includes('idempotency_conflict')) {
      return NextResponse.json({ error: 'This external action changed. Refresh before retrying.' }, { status: 409 });
    }
    if (message.includes('rejected') || message.includes('transition')) {
      return NextResponse.json({ error: 'That external-action transition is not valid now.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'External action update failed. It is safe to retry.' }, { status: 503 });
  }
}
