import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';
import { processPrivacyStorageCleanup } from '@/lib/privacy/storageCleanup';

const bodySchema = z.object({
  subjectId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(200),
  confirm: z.literal('ERASE'),
});

async function POSTHandler(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.BULK_DELETE);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'A valid customer ID, idempotency key, and ERASE confirmation are required.' },
      { status: 400 },
    );
  }

  const auditedService = createServiceClient({
    audit: {
      actorId: ctx.userId,
      actorRole: ctx.role,
      requestIp: getClientIp(request.headers),
    },
  });
  const { data, error } = await auditedService.rpc('erase_merchant_data_subject', {
    p_merchant_id: ctx.merchantId,
    p_subject_id: parsed.data.subjectId,
    p_actor_user_id: ctx.userId,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_effective_at: new Date().toISOString(),
  });
  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '22023' ? 400 : 500;
    return NextResponse.json(
      { error: status === 404 ? 'Customer not found in this workspace.' : 'Subject erasure failed.' },
      { status },
    );
  }

  const result = data as {
    receipt_id: string;
    counts: Record<string, number>;
    replayed: boolean;
  };
  let storageCleanup: Awaited<ReturnType<typeof processPrivacyStorageCleanup>> | null = null;
  let storageCleanupError: string | null = null;
  try {
    storageCleanup = await processPrivacyStorageCleanup(auditedService, {
      receiptId: result.receipt_id,
    });
  } catch {
    // The leased queue remains observable and retryable by the privacy cron.
    storageCleanupError = 'Storage cleanup remains queued for retry.';
  }

  return NextResponse.json({
    ok: true,
    receiptId: result.receipt_id,
    replayed: result.replayed,
    counts: result.counts,
    storageCleanup,
    storageCleanupError,
  });
}

export const POST = withRequestLogging('/api/settings/data-subject-erasure', POSTHandler);
