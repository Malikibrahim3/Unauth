import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { settleException } from '@/lib/exceptions/store';

export const dynamic = 'force-dynamic';

const settleSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  resolution: z.string().trim().max(2000).nullable().optional(),
});

/** POST — resolve or dismiss a single exception (the merchant's decision). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied || !ctx?.merchantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = settleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid resolution' }, { status: 400 });

  const result = await settleException(serviceClient, ctx.merchantId, id, {
    status: parsed.data.status,
    resolution: parsed.data.resolution ?? null,
    resolvedBy: user.id,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.reason === 'not_found' ? 404 : 409 });
  }
  return NextResponse.json({ ok: true, exception: result.exception });
}
