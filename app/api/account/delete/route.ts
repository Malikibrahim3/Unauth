import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient, createServiceClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';
import { enforceRateLimit, limitFromEnv, rateLimitKey, getClientIp } from '@/lib/ratelimit';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

async function listStoragePaths(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  current: string
): Promise<string[]> {
  const { data: objects, error } = await service.storage
    .from(bucket)
    .list(current, { limit: 1000 });
  if (error) {
    console.warn(`[account-delete] non-fatal storage list: ${bucket}/${current}:`, error.message);
    return [];
  }

  const filePaths: string[] = [];
  const subdirs: string[] = [];
  for (const object of objects ?? []) {
    const path = `${current}/${object.name}`;
    if (object.id === null) {
      subdirs.push(path);
    } else {
      filePaths.push(path);
    }
  }

  const nested = await Promise.all(
    subdirs.map((dir) => listStoragePaths(service, bucket, dir))
  );
  return [...filePaths, ...nested.flat()];
}

async function removeStoragePrefix(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  prefix: string
) {
  const paths = await listStoragePaths(service, bucket, prefix);
  const chunks = Array.from({ length: Math.ceil(paths.length / 100) }, (_, i) =>
    paths.slice(i * 100, i * 100 + 100)
  );
  await Promise.all(
    chunks.map(async (chunk) => {
      const { error } = await service.storage.from(bucket).remove(chunk);
      if (error) {
        console.warn(`[account-delete] non-fatal storage remove: ${bucket}:`, error.message);
      }
    })
  );
}

async function removeStorageObjects(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  paths: string[]
) {
  const uniquePaths = Array.from(new Set(paths.filter((path) => path.length > 0)));
  const chunks = Array.from({ length: Math.ceil(uniquePaths.length / 100) }, (_, i) =>
    uniquePaths.slice(i * 100, i * 100 + 100)
  );
  await Promise.all(
    chunks.map(async (chunk) => {
      const { error } = await service.storage.from(bucket).remove(chunk);
      if (error) {
        console.warn(`[account-delete] non-fatal storage remove: ${bucket}:`, error.message);
      }
    })
  );
}

const ACCOUNT_DELETE_TABLES: string[] = [
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
    const fetchQueuePaths = service
      .from(TABLES.CSV_UPLOAD_QUEUE)
      .select('storage_path')
      .eq('merchant_id', merchantId);
    const fetchPublicAuditPaths = service
      .from(TABLES.PUBLIC_AUDITS)
      .select('csv_path')
      .eq('linked_merchant_id', merchantId);
    const fetchEvidencePaths = service
      .from('evidence_packages' as any)
      .select('pdf_storage_path')
      .eq('merchant_id', merchantId);

    const [
      { data: queuePaths },
      { data: publicAuditPaths },
      { data: evidencePaths },
    ] = await Promise.all([fetchQueuePaths, fetchPublicAuditPaths, fetchEvidencePaths]);

    // Remove raw uploaded CSVs and generated PDFs for this account. Database
    // deletes alone leave source files in Storage, which is unacceptable for
    // merchant data deletion.
    await Promise.all([
      ...[STORAGE_BUCKETS.MERCHANT_CSV_UPLOADS, STORAGE_BUCKETS.EVIDENCE_PACKAGES].map((bucket) =>
        removeStoragePrefix(service, bucket, user.id),
      ),
      removeStorageObjects(
        service,
        STORAGE_BUCKETS.MERCHANT_CSV_UPLOADS,
        [
          ...((queuePaths as Array<{ storage_path: string | null }> | null) ?? []).map((row) => row.storage_path ?? ''),
          ...((publicAuditPaths as Array<{ csv_path: string | null }> | null) ?? []).map((row) => row.csv_path ?? ''),
        ],
      ),
      removeStorageObjects(
        service,
        STORAGE_BUCKETS.EVIDENCE_PACKAGES,
        ((evidencePaths as Array<{ pdf_storage_path: string | null }> | null) ?? []).map((row) => row.pdf_storage_path ?? ''),
      ),
    ]);

    // Delete merchant data in dependency order.
    // Non-fatal failures are logged but don't block account deletion.
    const tables = ACCOUNT_DELETE_TABLES;
    const deleteMerchantTables = async (index: number): Promise<void> => {
      if (index >= tables.length) return;
      const table = tables[index]!;
      // All merchant-owned tables (incl. watchlist_entries after the tenancy
      // alignment migration) key off merchants.id — order matters for FK constraints.
      const { error } = await service
        .from(table as any)
        .delete()
        .eq('merchant_id', merchantId);
      if (error) console.warn(`[account-delete] non-fatal: ${table}:`, error.message);
      return deleteMerchantTables(index + 1);
    };
    await deleteMerchantTables(0);

    // Delete customer profiles where this is the only merchant.
    await Promise.all([
      service.rpc('delete_orphan_customer_profiles' as any, { p_merchant_id: merchantId }).maybeSingle(),
      service.from(TABLES.PUBLIC_AUDITS).delete().eq('linked_merchant_id', merchantId),
      service.from(TABLES.MERCHANTS).delete().eq('id', merchantId),
    ]);
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
