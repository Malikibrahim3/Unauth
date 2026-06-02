/**
 * INTERNAL / DEV USE ONLY.
 * This script triggers the production chunked pipeline without UI/form upload.
 * Never expose this as a public endpoint.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { TABLES, STORAGE_BUCKETS } from '../lib/supabase/tables';
import { streamParseCsv } from '../lib/processing/streamParser';
import { createJob, updateJobTotalRows } from '../lib/processing/job';
import { uploadChunkRows, dispatchChunk } from '../lib/processing/chunkedDispatch';
import { registerProcessingJobChunks } from '../lib/processing/chunkQueue';

function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;
      const delayMs = 500 * 2 ** (attempt - 1) + Math.random() * 250;
      console.warn(`${label} retry ${attempt + 1}/${attempts}: ${err instanceof Error ? err.message : String(err)}`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

interface CliArgs {
  csvPath: string;
  resumeJobId: string | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  let csvPath = '';
  let resumeJobId: string | null = null;
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--resume') {
      const next = argv[++i];
      if (!next) throw new Error('Missing value for --resume <jobId>');
      resumeJobId = next;
      continue;
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (!csvPath) csvPath = arg;
  }
  if (!csvPath) {
    throw new Error(
      'Usage: ts-node scripts/trigger-production-run.ts <csvPath> [--resume <jobId>] [--dry-run]'
    );
  }
  return { csvPath, resumeJobId, dryRun };
}

async function main() {
  loadEnvLocal();
  const { csvPath, resumeJobId, dryRun } = parseArgs(process.argv);
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const merchantId = process.env.PUBLIC_INTAKE_MERCHANT_ID || process.env.BENCH_MERCHANT_ID;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  if (!merchantId) throw new Error('Missing PUBLIC_INTAKE_MERCHANT_ID or BENCH_MERCHANT_ID');

  const fileName = path.basename(csvPath);
  if (dryRun && !resumeJobId) {
    // Strict dry-run (new run mode): no Supabase calls and no writes.
    const stats = fs.statSync(csvPath);
    console.log(JSON.stringify({
      mode: 'new-dry-run',
      csvPath,
      fileName,
      csvBytes: stats.size,
      wouldCreateJob: true,
      wouldStageChunks: true,
      wouldDispatchFromChunk: 0,
      note: 'No Supabase calls were made in this dry-run mode.',
    }, null, 2));
    return;
  }

  const sc = createClient(url, key, { auth: { persistSession: false } });
  let jobId: string;
  let storagePath: string;
  let totalChunks = 0;
  let totalRows = 0;
  let stagedChunks = 0;
  let startChunkIndex = 0;

  if (resumeJobId) {
    jobId = resumeJobId;
    const { data: job, error: jobError } = await sc
      .from(TABLES.PROCESSING_JOBS)
      .select('id, total_rows')
      .eq('id', jobId)
      .single();
    if (jobError || !job) throw new Error(`Resume job not found: ${jobId}`);

    const { data: bg, error: bgError } = await sc
      .from('background_intelligence_jobs')
      .select('chunk_index,status')
      .eq('job_id', jobId)
      .order('chunk_index');
    if (bgError) throw new Error(`Failed reading background_intelligence_jobs: ${bgError.message}`);

    const completed = new Set((bg ?? []).filter((r) => r.status === 'completed').map((r) => r.chunk_index));
    const chunkRows = 10000;
    totalRows = job.total_rows ?? 0;
    totalChunks = totalRows > 0 ? Math.ceil(totalRows / chunkRows) : 0;
    while (completed.has(startChunkIndex)) startChunkIndex++;
    storagePath = `${merchantId}/${jobId}_${fileName}`;
    console.log(
      `Resume mode for job ${jobId}: completedChunks=${completed.size}, resumeFromChunk=${startChunkIndex}, totalChunks=${totalChunks}`
    );
    if (dryRun) {
      console.log(JSON.stringify({
        mode: 'resume-dry-run',
        jobId,
        totalRows,
        totalChunks,
        completedChunks: completed.toSorted((a, b) => a - b),
        resumeFromChunk: startChunkIndex,
        note: 'Read-only dry run: no writes, no dispatch.',
      }, null, 2));
      return;
    }
  } else {
    storagePath = `${merchantId}/${Date.now()}_${fileName}`;
    const raw = fs.readFileSync(csvPath);
    const upload = new File([raw], fileName, { type: 'text/csv' });
    const { error: uploadError } = await retry('Storage upload', async () => {
      const result = await sc.storage
        .from(STORAGE_BUCKETS.MERCHANT_CSV_UPLOADS)
        .upload(storagePath, upload, { contentType: 'text/csv', upsert: false, cacheControl: '3600' });
      if (result.error) throw new Error(result.error.message);
      return result;
    });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: fileData, error: downloadError } = await retry('Storage download', async () => {
      const result = await sc.storage.from(STORAGE_BUCKETS.MERCHANT_CSV_UPLOADS).download(storagePath);
      if (result.error) throw new Error(result.error.message);
      return result;
    });
    if (downloadError || !fileData) throw new Error(`Storage download failed: ${downloadError?.message ?? 'no data'}`);
    const file = new File([fileData], fileName, { type: 'text/csv' });

    jobId = await createJob(sc as any, merchantId, { filename: fileName, uploadType: 'standard', label: 'Internal trigger run' });
    const parse = await streamParseCsv(file, null, async (chunkRows, chunkIdx) => {
      await uploadChunkRows(sc as any, jobId, chunkIdx, chunkRows);
      stagedChunks = Math.max(stagedChunks, chunkIdx + 1);
    });
    if (!parse.valid) throw new Error(`CSV invalid: missing ${parse.missingRequired.join(', ')}`);
    totalRows = parse.rowCount;
    totalChunks = parse.totalChunks;

    await updateJobTotalRows(sc as any, jobId, parse.rowCount);
    await sc.from(TABLES.PROCESSING_JOBS).update({ status: 'processing' } as any).eq('id', jobId);
    console.log(`Prepared job ${jobId} with ${parse.rowCount.toLocaleString()} rows across ${parse.totalChunks} chunks`);

  }

  const chunkPayload = {
    jobId,
    chunkIndex: startChunkIndex,
    totalChunks,
    merchantId,
    storagePath,
    columnMap: null,
  };
  await registerProcessingJobChunks(sc as any, chunkPayload);
  await dispatchChunk(appOrigin, chunkPayload);
  console.log(`Dispatched job ${jobId} from chunk ${startChunkIndex}/${Math.max(totalChunks - 1, 0)}`);

  const started = Date.now();
  while (true) {
    const { data: job, error } = await sc
      .from(TABLES.PROCESSING_JOBS)
      .select('id,status,total_rows,processed_rows,failed_rows,started_at,completed_at,error_log,created_at')
      .eq('id', jobId)
      .single();
    if (error) throw error;
    const elapsed = Math.round((Date.now() - started) / 1000);
    const processed = job?.processed_rows ?? 0;
    const total = job?.total_rows ?? 0;
    const approxChunk = total > 0 ? Math.min(totalChunks, Math.floor(processed / 10000) + 1) : 0;
    console.log(`[poll ${elapsed}s] status=${job?.status} rows=${processed}/${total} approxChunk=${approxChunk}/${totalChunks}`);
    if (job?.status === 'completed' || job?.status === 'failed') break;
    await sleep(5000);
  }

  const { data: finalJob } = await sc
    .from(TABLES.PROCESSING_JOBS)
    .select('id,status,total_rows,processed_rows,failed_rows,started_at,completed_at,created_at,error_log')
    .eq('id', jobId)
    .single();
  if (!finalJob) throw new Error('Could not fetch final job record');

  const { count: identitiesWritten } = await sc
    .from('customer_profile_audit_appearances')
    .select('*', { count: 'exact', head: true })
    .eq('audit_id', jobId);
  const { data: grades } = await sc
    .from(TABLES.AUDIT_TRANSACTIONS)
    .select('identity_confidence_grade')
    .eq('job_id', jobId);

  const gradeCounts: Record<string, number> = {};
  for (const row of grades ?? []) {
    const grade = (row as any).identity_confidence_grade ?? 'null';
    gradeCounts[grade] = (gradeCounts[grade] ?? 0) + 1;
  }

  const summary = {
    jobId,
    startedAt: finalJob.started_at ?? finalJob.created_at,
    endedAt: finalJob.completed_at ?? null,
    status: finalJob.status,
    rowsProcessed: finalJob.processed_rows ?? 0,
    rowsFailed: finalJob.failed_rows ?? 0,
    totalRows: finalJob.total_rows ?? 0,
    stagedChunks,
    resumeFromChunk: startChunkIndex,
    identitiesWritten: identitiesWritten ?? 0,
    confidenceGrades: gradeCounts,
    errors: finalJob.error_log ?? [],
  };
  console.log(JSON.stringify(summary, null, 2));
  if (finalJob.status !== 'completed') {
    throw new Error(`Job failed: ${JSON.stringify(finalJob.error_log ?? [])}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
