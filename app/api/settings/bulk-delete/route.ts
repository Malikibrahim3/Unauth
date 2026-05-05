import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { NextRequest, NextResponse } from 'next/server';

type Body = {
  entity: string;
  ids?: string[];
  confirm?: boolean;
};

const ALLOWED: Record<string, string> = {
  customer_notes: 'customer_notes',
  watchlist: 'watchlist_entries',
  watchlist_entries: 'watchlist_entries',
  audits: 'processing_jobs',
  processing_jobs: 'processing_jobs',
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.BULK_DELETE);
  if (denied) return denied;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { entity, ids, confirm } = body;
  if (!confirm) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });

  const merchantId = ctx.merchantId;

  // Soft-delete flag per table (we never hard-delete merchant-flagged signals)
  const SOFT_DELETE_FIELD: Record<string, string> = {
    customer_notes: 'deleted_by_merchant',
    watchlist_entries: 'removed_by_merchant',
    processing_jobs: 'hidden_by_merchant',
  };

  // If entity === 'all' soft-delete all allowed tables for this merchant
  if (entity === 'all') {
    for (const [, table] of Object.entries(ALLOWED)) {
      const field = SOFT_DELETE_FIELD[table];
      if (!field) continue;
      const { error } = await serviceClient.from(table).update({ [field]: true } as any).eq('merchant_id', merchantId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    logAction({ ctx, action: 'bulk_delete', metadata: { entity: 'all' }, ip });
    return NextResponse.json({ ok: true });
  }

  const table = ALLOWED[entity as string];
  if (!table) return NextResponse.json({ error: 'Invalid entity' }, { status: 400 });

  const softField = SOFT_DELETE_FIELD[table];
  if (!softField) return NextResponse.json({ error: 'Entity does not support deletion' }, { status: 400 });

  let res;
  if (ids && Array.isArray(ids) && ids.length > 0) {
    res = await serviceClient.from(table).update({ [softField]: true } as any).in('id', ids).eq('merchant_id', merchantId);
  } else {
    res = await serviceClient.from(table).update({ [softField]: true } as any).eq('merchant_id', merchantId);
  }

  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'bulk_delete',
    metadata: { entity, idsCount: ids?.length ?? 'all' },
    ip,
  });

  return NextResponse.json({ ok: true });
}
