import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { listDeadLetterDeliveries, runDeadLetterOp } from '@/lib/events/deadLetterOps';

export const dynamic = 'force-dynamic';

const STATUS_VALUES = ['dead_letter', 'failed', 'pending', 'processing', 'completed', 'ignored'] as const;

const actionSchema = z.object({
  action: z.enum(['retry', 'ignore', 'replay']),
  deliveryId: z.string().uuid(),
});

/** GET — list dead-letter (default) or other-status deliveries for the merchant. */
export async function GET(req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied || !ctx?.merchantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const statusParam = req.nextUrl.searchParams.get('status');
  const statuses = statusParam
    ? statusParam.split(',').map((s) => s.trim()).filter((s): s is (typeof STATUS_VALUES)[number] => (STATUS_VALUES as readonly string[]).includes(s))
    : ['dead_letter'];
  if (statuses.length === 0) return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });

  const deliveries = await listDeadLetterDeliveries(serviceClient, ctx.merchantId, { status: statuses });
  return NextResponse.json({ deliveries, count: deliveries.length });
}

/** POST — retry / ignore / replay a single delivery. */
export async function POST(req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied || !ctx?.merchantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid dead-letter action' }, { status: 400 });

  const result = await runDeadLetterOp(serviceClient, ctx.merchantId, parsed.data.action, parsed.data.deliveryId);
  if (!result.ok) {
    const status = result.reason === 'not_found' || result.reason === 'event_not_found' ? 404
      : result.reason === 'not_workable' ? 409 : 422;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
