import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { parseCsvText } from '@/lib/imports/csv/parse';
import { processCsvRows } from '@/lib/imports/csv/processor';
import { CSV_DATASETS, isCsvDataset } from '@/lib/imports/csv/entitySchemas';
import { validateHeaderMapping } from '@/lib/imports/csv/mapping';
import { validateCsvSize, looksBinary, MAX_CSV_ROWS } from '@/lib/imports/csv/fileValidation';
import { commitCsvImport } from '@/lib/imports/csv/commitImport';
import { TABLES } from '@/lib/supabase/tables';
import { createHash } from 'node:crypto';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  dataset: z.string(),
  mapping: z.record(z.string()),
  csv: z.string().min(1),
  import_name: z.string().trim().max(200).optional(),
  file_name: z.string().trim().max(255).optional(),
  file_size: z.number().int().nonnegative().optional(),
  import_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const { dataset, mapping, csv, import_name, file_name, file_size, import_id } = parsed.data;

  if (!isCsvDataset(dataset)) return NextResponse.json({ error: 'unsupported_dataset' }, { status: 400 });
  if (dataset === 'refunds') return NextResponse.json({ error: 'dataset_validation_only', message: 'Refund CSVs can be validated but cannot be committed.' }, { status: 400 });
  const size = validateCsvSize(Buffer.byteLength(csv, 'utf8'));
  if (!size.ok) return NextResponse.json({ error: size.code }, { status: 400 });
  if (looksBinary(csv)) return NextResponse.json({ error: 'binary_content' }, { status: 400 });
  const mv = validateHeaderMapping(mapping, CSV_DATASETS[dataset]);
  if (!mv.ok) return NextResponse.json({ error: mv.code, message: mv.message }, { status: 400 });

  const { rows, parseErrors } = parseCsvText(csv);
  if (parseErrors.length || rows.length === 0) return NextResponse.json({ error: 'invalid_csv', message: 'The CSV is empty or malformed.' }, { status: 400 });
  if (rows.length > MAX_CSV_ROWS) return NextResponse.json({ error: 'too_many_rows' }, { status: 400 });
  const result = processCsvRows(dataset, mapping, rows);
  const fileHash = createHash('sha256').update(csv, 'utf8').digest('hex');

  const merchantId = ctx.merchantId;

  // A client keeps this identity across an uncertain response. The job primary
  // key arbitrates concurrent requests; a replay only observes, never re-runs.
  async function replayJob() {
    const { data: existing, error } = await serviceClient.from(TABLES.PROCESSING_JOBS)
      .select('id,merchant_id,job_kind,file_hash,column_map,cursor,status,processed_rows,failed_rows')
      .eq('id', import_id!).eq('merchant_id', merchantId).maybeSingle();
    if (error) return NextResponse.json({ error: 'job_read_unavailable' }, { status: 503 });
    if (!existing) return null;
    const sortedMap = (value: Record<string, string>) => JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    if (existing.job_kind !== 'csv_import' || existing.file_hash !== fileHash || existing.cursor?.dataset !== dataset || sortedMap(existing.column_map ?? {}) !== sortedMap(mapping)) {
      return NextResponse.json({ error: 'import_identity_conflict' }, { status: 409 });
    }
    const completed = existing.status === 'completed';
    return NextResponse.json({
      job_id: existing.id, status: existing.status, replayed: true,
      persisted: existing.processed_rows, error_count: existing.failed_rows,
      message: completed ? 'This import already completed.' : 'This import already exists. Open the job to review progress or partial results before importing again.',
    }, { status: completed ? 200 : 202 });
  }
  if (import_id) {
    const replay = await replayJob();
    if (replay) return replay;
  }

  // Create a durable csv_import job.
  const { data: job, error: jobError } = await serviceClient
    .from(TABLES.PROCESSING_JOBS)
    .insert({
      ...(import_id ? { id: import_id } : {}),
      merchant_id: ctx.merchantId,
      job_kind: 'csv_import',
      source: 'csv',
      status: 'running',
      label: import_name ?? `CSV import (${dataset})`,
      total_rows: result.totalRows,
      failed_rows: result.errors.length,
      started_at: new Date().toISOString(),
      file_hash: fileHash,
      column_map: mapping,
      error_log: result.errors,
      cursor: {
        dataset,
        file_name: file_name ?? null,
        file_size: file_size ?? Buffer.byteLength(csv, 'utf8'),
        imported_by: ctx.userId,
        duplicates_skipped: result.duplicatesSkipped,
        validation_valid_rows: result.valid.length,
      },
    })
    .select('id')
    .single();
  if (jobError) {
    if (import_id && jobError.code === '23505') {
      const replay = await replayJob();
      if (replay) return replay;
      return NextResponse.json({ error: 'import_identity_conflict' }, { status: 409 });
    }
    return NextResponse.json({ error: 'job_create_failed', detail: jobError.message }, { status: 500 });
  }
  const jobId = (job as { id: string }).id;

  try {
    const commit = await commitCsvImport(serviceClient, ctx.merchantId, dataset, result.valid, fileHash);
    const { error: completionError } = await serviceClient.from(TABLES.PROCESSING_JOBS)
      .update({ status: 'completed', processed_rows: commit.persisted, completed_at: new Date().toISOString() })
      .eq('id', jobId).eq('merchant_id', ctx.merchantId);
    if (completionError) return NextResponse.json({ error: 'job_completion_unconfirmed', job_id: jobId, message: 'Rows were processed, but job completion could not be recorded. Review this job before importing again.' }, { status: 503 });
    return NextResponse.json({
      job_id: jobId,
      dataset,
      persisted: commit.persisted,
      dataset_supported: commit.datasetSupported,
      error_count: result.errors.length,
      duplicates_skipped: result.duplicatesSkipped,
      errors: result.errors.slice(0, 100),
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'commit_failed';
    await serviceClient.from(TABLES.PROCESSING_JOBS).update({ status: 'failed', last_error_code: 'commit_failed' }).eq('id', jobId).eq('merchant_id', ctx.merchantId);
    return NextResponse.json({ error: 'commit_failed', detail: message, job_id: jobId }, { status: 500 });
  }
}
