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

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  dataset: z.string(),
  mapping: z.record(z.string()),
  csv: z.string().min(1),
  import_name: z.string().trim().max(200).optional(),
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
  const { dataset, mapping, csv, import_name } = parsed.data;

  if (!isCsvDataset(dataset)) return NextResponse.json({ error: 'unsupported_dataset' }, { status: 400 });
  const size = validateCsvSize(Buffer.byteLength(csv, 'utf8'));
  if (!size.ok) return NextResponse.json({ error: size.code }, { status: 400 });
  if (looksBinary(csv)) return NextResponse.json({ error: 'binary_content' }, { status: 400 });
  const mv = validateHeaderMapping(mapping, CSV_DATASETS[dataset]);
  if (!mv.ok) return NextResponse.json({ error: mv.code, message: mv.message }, { status: 400 });

  const { rows } = parseCsvText(csv);
  if (rows.length > MAX_CSV_ROWS) return NextResponse.json({ error: 'too_many_rows' }, { status: 400 });
  const result = processCsvRows(dataset, mapping, rows);

  // Create a durable csv_import job.
  const { data: job, error: jobError } = await serviceClient
    .from(TABLES.PROCESSING_JOBS)
    .insert({
      merchant_id: ctx.merchantId,
      job_kind: 'csv_import',
      source: 'csv',
      status: 'running',
      label: import_name ?? `CSV import (${dataset})`,
      total_rows: result.totalRows,
      failed_rows: result.errors.length,
    })
    .select('id')
    .single();
  if (jobError) return NextResponse.json({ error: 'job_create_failed', detail: jobError.message }, { status: 500 });
  const jobId = (job as { id: string }).id;

  try {
    const commit = await commitCsvImport(serviceClient, ctx.merchantId, dataset, result.valid, jobId);
    await serviceClient.from(TABLES.PROCESSING_JOBS)
      .update({ status: 'completed', processed_rows: commit.persisted, completed_at: new Date().toISOString() })
      .eq('id', jobId);
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
    await serviceClient.from(TABLES.PROCESSING_JOBS).update({ status: 'failed', last_error_code: 'commit_failed' }).eq('id', jobId);
    return NextResponse.json({ error: 'commit_failed', detail: message, job_id: jobId }, { status: 500 });
  }
}
