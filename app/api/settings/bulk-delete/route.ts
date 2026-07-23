import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/log';

type Body = {
  entity: string;
  ids?: string[];
  confirm?: boolean;
};

type RemovalTarget = {
  table: string;
  idColumn: 'id' | 'identity_id';
  patch: () => Record<string, boolean | string | null>;
};

// These are view-level removal controls, not data-subject erasure. Use the
// canonical columns that active read paths actually filter.
const TARGETS: Record<string, RemovalTarget> = {
  customer_notes: {
    table: 'identity_notes',
    idColumn: 'id',
    patch: () => ({ deleted_at: new Date().toISOString() }),
  },
  watchlist: {
    table: TABLES.WATCHLIST_ENTRIES,
    idColumn: 'identity_id',
    patch: () => ({ on_watchlist: false, display_name: null, display_email: null }),
  },
  watchlist_entries: {
    table: TABLES.WATCHLIST_ENTRIES,
    idColumn: 'identity_id',
    patch: () => ({ on_watchlist: false, display_name: null, display_email: null }),
  },
  audits: {
    table: TABLES.PROCESSING_JOBS,
    idColumn: 'id',
    patch: () => ({ hidden: true }),
  },
  processing_jobs: {
    table: TABLES.PROCESSING_JOBS,
    idColumn: 'id',
    patch: () => ({ hidden: true }),
  },
};

async function POSTHandler(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.BULK_DELETE);
  if (denied) return denied;
  const scopedClient = createScopedClient(
    ctx.merchantId,
    createServiceClient({ audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip } }),
  );

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { entity, ids, confirm } = body;
  if (!confirm) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });

  if (entity === 'all') {
    const targets = [TARGETS.customer_notes, TARGETS.watchlist, TARGETS.processing_jobs];
    const removeAllTargets = async (index: number): Promise<NextResponse | null> => {
      if (index >= targets.length) return null;
      const target = targets[index]!;
      const { error } = await scopedClient.from(target.table).update(target.patch());
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return removeAllTargets(index + 1);
    };
    const bulkDeleteError = await removeAllTargets(0);
    if (bulkDeleteError) return bulkDeleteError;
    return NextResponse.json({ ok: true });
  }

  const target = TARGETS[entity as string];
  if (!target) return NextResponse.json({ error: 'Invalid entity' }, { status: 400 });
  if (ids && (!Array.isArray(ids) || ids.length > 500 || ids.some((id) => typeof id !== 'string'))) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }

  const res =
    ids && Array.isArray(ids) && ids.length > 0
      ? await scopedClient.from(target.table).update(target.patch()).in(target.idColumn, ids)
      : await scopedClient.from(target.table).update(target.patch());

  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export const POST = withRequestLogging('/api/settings/bulk-delete', POSTHandler);
