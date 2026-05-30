import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient, createServiceClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';
import { enforceRateLimit, limitFromEnv, rateLimitKey, getClientIp } from '@/lib/ratelimit';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

async function removeStoragePrefix(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  prefix: string
) {
  const paths: string[] = [];
  const stack = [prefix];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const { data: objects, error } = await service.storage
      .from(bucket)
      .list(current, { limit: 1000 });
    if (error) {
      console.warn(`[account-delete] non-fatal storage list: ${bucket}/${current}:`, error.message);
      continue;
    }
    for (const object of objects ?? []) {
      const path = `${current}/${object.name}`;
      if (object.id === null) {
        stack.push(path);
      } else {
        paths.push(path);
      }
    }
  }

  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await service.storage.from(bucket).remove(paths.slice(i, i + 100));
    if (error) {
      console.warn(`[account-delete] non-fatal storage remove: ${bucket}:`, error.message);
    }
  }
}

async function removeStorageObjects(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  paths: string[]
) {
  const uniquePaths = Array.from(new Set(paths.filter((path) => path.length > 0)));
  for (let i = 0; i < uniquePaths.length; i += 100) {
    const { error } = await service.storage.from(bucket).remove(uniquePaths.slice(i, i + 100));
    if (error) {
      console.warn(`[account-delete] non-fatal storage remove: ${bucket}:`, error.message);
    }
  }
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(
    rateLimitKey('account-delete', getClientIp(request.headers)),
    limitFromEnv('RL_ACCOUNT_DELETE_PER_HOUR', 3, 3600)
  );
  if (limited) return limited;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { confirm?: string };
  if (body.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Confirmation phrase required.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.GRANT_PERMISSIONS);
  if (denied) return denied;

  // Account deletion is owner-only. Use the resolved caller context so team
  // members cannot delete a merchant account by sharing the owner's session UI.
  const merchantId = ctx.merchantId;

  if (merchantId) {
    const { data: queuePaths } = await service
      .from(TABLES.CSV_UPLOAD_QUEUE)
      .select('storage_path')
      .eq('merchant_id', merchantId);
    const { data: publicAuditPaths } = await service
      .from(TABLES.PUBLIC_AUDITS)
      .select('csv_path')
      .eq('linked_merchant_id', merchantId);
    const { data: evidencePaths } = await service
      .from('evidence_packages' as any)
      .select('pdf_storage_path')
      .eq('merchant_id', merchantId);

    // Remove raw uploaded CSVs and generated PDFs for this account. Database
    // deletes alone leave source files in Storage, which is unacceptable for
    // merchant data deletion.
    for (const bucket of [STORAGE_BUCKETS.MERCHANT_CSV_UPLOADS, STORAGE_BUCKETS.EVIDENCE_PACKAGES]) {
      await removeStoragePrefix(service, bucket, user.id);
    }
    await removeStorageObjects(
      service,
      STORAGE_BUCKETS.MERCHANT_CSV_UPLOADS,
      [
        ...((queuePaths as Array<{ storage_path: string | null }> | null) ?? []).map((row) => row.storage_path ?? ''),
        ...((publicAuditPaths as Array<{ csv_path: string | null }> | null) ?? []).map((row) => row.csv_path ?? ''),
      ]
    );
    await removeStorageObjects(
      service,
      STORAGE_BUCKETS.EVIDENCE_PACKAGES,
      ((evidencePaths as Array<{ pdf_storage_path: string | null }> | null) ?? []).map((row) => row.pdf_storage_path ?? '')
    );

    // Delete merchant data in dependency order.
    // Non-fatal failures are logged but don't block account deletion.
    const tables: string[] = [
      'watchlist_appearances',
      'watchlist_entries',
      'customer_profile_audit_appearances',
      'evidence_packages',
      'customer_notes',
      'customer_activity_log',
      'audit_transactions',
      'csv_upload_queue',
      'processing_jobs',
      'merchant_members',
      'access_audit_log',
      'normalisation_learning',
    ];
    for (const table of tables) {
      const ownerColumnValue = table === 'watchlist_entries' ? user.id : merchantId;
      const { error } = await service
        .from(table as any)
        .delete()
        .eq('merchant_id', ownerColumnValue);
      if (error) console.warn(`[account-delete] non-fatal: ${table}:`, error.message);
    }

    // Delete customer profiles where this is the only merchant.
    await service.rpc('delete_orphan_customer_profiles' as any, { p_merchant_id: merchantId }).maybeSingle();

    await service.from(TABLES.PUBLIC_AUDITS).delete().eq('linked_merchant_id', merchantId);
    await service.from(TABLES.MERCHANTS).delete().eq('id', merchantId);
  }

  // Delete the auth user last — this invalidates all sessions.
  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('[account-delete] auth.admin.deleteUser failed:', deleteError.message);
    return NextResponse.json({ error: 'Failed to delete account. Contact support@unauth.co.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
