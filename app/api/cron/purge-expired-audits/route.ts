/**
 * POST /api/cron/purge-expired-audits
 *
 * Deletes public_audits records (and their associated CSV files) where:
 *   - deletion_scheduled_at has passed, AND
 *   - account_created = false
 *
 * Call this once per day from a cron job (Vercel cron, pg_cron, or external scheduler).
 * Secured by a shared secret in the Authorization header: "Bearer <CRON_SECRET>".
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const sc = createServiceClient();

  // Fetch expired, unclaimed audits.
  const { data: expired, error: fetchError } = await sc
    .from('public_audits' as any)
    .select('id, csv_path')
    .lt('deletion_scheduled_at', new Date().toISOString())
    .eq('account_created', false)
    .limit(500);

  if (fetchError) {
    console.error('[purge-expired-audits] fetch error', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const expiredAudits = expired as { id: string; csv_path: string | null }[];
  const ids = expiredAudits.map((r) => r.id);

  // Delete the explicitly recorded CSV files first, then clean up any legacy files under the audit prefix.
  const storageErrors: string[] = [];
  const explicitPaths = expiredAudits
    .map((audit) => audit.csv_path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  if (explicitPaths.length > 0) {
    const { error: removeExplicitError } = await sc.storage
      .from('merchant-csv-uploads-2')
      .remove(explicitPaths);

    if (removeExplicitError) {
      storageErrors.push(`explicit paths: ${removeExplicitError.message}`);
    }
  }

  for (const id of ids) {
    const { data: files } = await sc.storage
      .from('merchant-csv-uploads-2')
      .list(id);
    if (files && files.length > 0) {
      const paths = files.map((f: { name: string }) => `${id}/${f.name}`);
      const { error: removeError } = await sc.storage
        .from('merchant-csv-uploads-2')
        .remove(paths);
      if (removeError) {
        storageErrors.push(`${id}: ${removeError.message}`);
      }
    }
  }

  // Delete the audit rows.
  const { error: deleteError } = await sc
    .from('public_audits' as any)
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('[purge-expired-audits] delete error', deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (storageErrors.length > 0) {
    console.warn('[purge-expired-audits] storage removal errors', storageErrors);
  }

  return NextResponse.json({
    deleted: ids.length,
    storageErrors: storageErrors.length > 0 ? storageErrors : undefined,
  });
}
