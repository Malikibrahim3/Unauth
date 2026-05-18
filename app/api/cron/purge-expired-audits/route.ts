/**
 * POST /api/cron/purge-expired-audits
 *
 * Full cascade delete for expired unclaimed public audits:
 *   customer_profile_audit_appearances → watchlist_appearances →
 *   audit_transactions → csv_upload_queue → processing_jobs →
 *   storage files → public_audits
 *
 * Secured by Authorization: Bearer <CRON_SECRET>.
 * Run once daily (see vercel.json cron config).
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

  // 1. Fetch expired, unclaimed public_audits
  const { data: expired, error: fetchError } = await sc
    .from('public_audits' as any)
    .select('id, csv_path')
    .lt('deletion_scheduled_at', new Date().toISOString())
    .eq('account_created', false)
    .limit(500);

  if (fetchError) {
    console.error('[purge] fetch error', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const audits = expired as { id: string; csv_path: string | null }[];
  const auditIds = audits.map((r) => r.id);

  // 2. Find all processing_jobs linked to these public audits
  const { data: jobs } = await sc
    .from('processing_jobs')
    .select('id')
    .in('public_audit_id', auditIds);

  const jobIds = (jobs ?? []).map((j: { id: string }) => j.id);

  // 3. Cascade delete downstream rows (order matters for FK constraints)
  if (jobIds.length > 0) {
    const tables: Array<{ table: string; column: string }> = [
      { table: 'customer_profile_audit_appearances', column: 'audit_id' },
      { table: 'watchlist_appearances', column: 'audit_id' },
      { table: 'audit_transactions', column: 'job_id' },
      { table: 'csv_upload_queue', column: 'job_id' },
    ];

    for (const { table, column } of tables) {
      const { error } = await sc
        .from(table as any)
        .delete()
        .in(column, jobIds);
      if (error) {
        console.error(`[purge] delete ${table} error`, error);
      }
    }

    // 4. Delete the processing_jobs themselves
    const { error: jobsError } = await sc
      .from('processing_jobs')
      .delete()
      .in('id', jobIds);
    if (jobsError) {
      console.error('[purge] delete processing_jobs error', jobsError);
    }
  }

  // 5. Delete storage files
  const storageErrors: string[] = [];
  const explicitPaths = audits
    .map((a) => a.csv_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);

  if (explicitPaths.length > 0) {
    const { error } = await sc.storage.from('merchant-csv-uploads-2').remove(explicitPaths);
    if (error) storageErrors.push(`explicit paths: ${error.message}`);
  }

  for (const id of auditIds) {
    const { data: files } = await sc.storage.from('merchant-csv-uploads-2').list(id);
    if (files && files.length > 0) {
      const paths = files.map((f: { name: string }) => `${id}/${f.name}`);
      const { error } = await sc.storage.from('merchant-csv-uploads-2').remove(paths);
      if (error) storageErrors.push(`${id}: ${error.message}`);
    }
  }

  // 6. Delete the public_audit rows
  const { error: deleteError } = await sc
    .from('public_audits' as any)
    .delete()
    .in('id', auditIds);

  if (deleteError) {
    console.error('[purge] delete public_audits error', deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (storageErrors.length > 0) {
    console.warn('[purge] storage removal errors', storageErrors);
  }

  return NextResponse.json({
    deleted: auditIds.length,
    jobsCleaned: jobIds.length,
    storageErrors: storageErrors.length > 0 ? storageErrors : undefined,
  });
}
