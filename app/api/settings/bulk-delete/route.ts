import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/log';

type Body = {
  entity: string;
  ids?: string[];
  confirm?: boolean;
};

// Map user-facing entity -> canonical v2 table name. All targets carry a
// merchant_id column and are tenant-scoped by createScopedClient.
const ALLOWED: Record<string, string> = {
  customer_notes: 'customer_notes',
  watchlist: TABLES.WATCHLIST_ENTRIES,
  watchlist_entries: TABLES.WATCHLIST_ENTRIES,
  audits: TABLES.PROCESSING_JOBS,
  processing_jobs: TABLES.PROCESSING_JOBS,
};

const SOFT_DELETE_FIELD: Record<string, string> = {
  customer_notes: 'deleted_by_merchant',
  [TABLES.WATCHLIST_ENTRIES]: 'removed_by_merchant',
  [TABLES.PROCESSING_JOBS]: 'hidden_by_merchant',
};

async function POSTHandler(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.BULK_DELETE);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { entity, ids, confirm } = body;
  if (!confirm) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });

  // If entity === 'all' soft-delete all allowed tables for this merchant.
  // Every target table is merchant_id-scoped by the scoped client, so the
  // .eq('merchant_id', …) constraint is injected automatically.
  const softDeletePatch = (field: string): Record<string, boolean> => ({ [field]: true });

  if (entity === 'all') {
    const tables = Array.from(new Set(Object.values(ALLOWED)));
    const softDeleteAllTables = async (index: number): Promise<NextResponse | null> => {
      if (index >= tables.length) return null;
      const table = tables[index]!;
      const field = SOFT_DELETE_FIELD[table];
      if (!field) return softDeleteAllTables(index + 1);
      const { error } = await scopedClient.from(table).update(softDeletePatch(field));
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return softDeleteAllTables(index + 1);
    };
    const bulkDeleteError = await softDeleteAllTables(0);
    if (bulkDeleteError) return bulkDeleteError;
    logAction({ ctx, action: 'bulk_delete', metadata: { entity: 'all' }, ip });
    return NextResponse.json({ ok: true });
  }

  const table = ALLOWED[entity as string];
  if (!table) return NextResponse.json({ error: 'Invalid entity' }, { status: 400 });

  const softField = SOFT_DELETE_FIELD[table];
  if (!softField) return NextResponse.json({ error: 'Entity does not support deletion' }, { status: 400 });

  const res =
    ids && Array.isArray(ids) && ids.length > 0
      ? await scopedClient.from(table).update(softDeletePatch(softField)).in('id', ids)
      : await scopedClient.from(table).update(softDeletePatch(softField));

  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'bulk_delete',
    metadata: { entity, idsCount: ids?.length ?? 'all' },
    ip,
  });

  return NextResponse.json({ ok: true });
}

export const POST = withRequestLogging('/api/settings/bulk-delete', POSTHandler);
