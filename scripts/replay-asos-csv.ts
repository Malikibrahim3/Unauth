import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { streamParseCsv } from '@/lib/processing/streamParser';
import { processCsvJob } from '@/lib/processing/worker';
import { createJob, updateJobTotalRows, completeJob } from '@/lib/processing/job';

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^"|"$/g, '');
    }
  }
}

async function run(): Promise<void> {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const merchantId = process.env.BENCH_MERCHANT_ID ?? '466df79d-9bdf-485e-91c8-a697f6c84130';
  const csvPath = process.env.ASOS_CSV_PATH ?? '/Users/malikibrahim/Downloads/asos_level_50k_fraud_stress_test.csv';
  const concurrency = Number(process.env.ASOS_CONCURRENCY ?? 3);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log('[replay] parse start');
  const csvBytes = fs.readFileSync(csvPath);
  const file = new File([csvBytes], path.basename(csvPath), { type: 'text/csv' });
  const parsed = await streamParseCsv(file);
  if (!parsed.valid) {
    throw new Error(`CSV validation failed. Missing required: ${parsed.missingRequired.join(', ')}`);
  }
  console.log(`[replay] parsed rows=${parsed.rowCount}`);

  const jobId = await createJob(supabase as any, merchantId, {
    filename: path.basename(csvPath),
    label: 'ASOS replay validation',
    uploadType: 'standard',
  });
  await updateJobTotalRows(supabase as any, jobId, parsed.rowCount);
  console.log(`[replay] jobId=${jobId} concurrency=${concurrency}`);

  let success = false;
  try {
    const scored = await processCsvJob(parsed.rows, jobId, supabase as any, concurrency, merchantId);
    const flaggedCount = scored.filter((row) => row.flagged).length;
    await completeJob(supabase as any, jobId, true, [], flaggedCount);
    success = true;

    const { data: jobRow, error: jobErr } = await supabase
      .from('processing_jobs')
      .select('id,status,total_rows,processed_rows,failed_rows,flagged_count,updated_at')
      .eq('id', jobId)
      .single();
    if (jobErr) throw jobErr;

    const txRows: Array<{ identity_match_grade: string | null; match_status: string | null }> = [];
    const PAGE_SIZE = 1000;
    let from = 0;
    while (true) {
      const { data: pageRows, error: txErr } = await supabase
        .from('audit_transactions')
        .select('identity_match_grade,match_status')
        .eq('job_id', jobId)
        .range(from, from + PAGE_SIZE - 1);
      if (txErr) throw txErr;
      if (!pageRows || pageRows.length === 0) break;
      txRows.push(...(pageRows as Array<{ identity_match_grade: string | null; match_status: string | null }>));
      if (pageRows.length < PAGE_SIZE) break;
      from += pageRows.length;
    }

    const gradeCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    for (const row of txRows ?? []) {
      const grade = (row as any).identity_match_grade ?? 'null';
      const status = (row as any).match_status ?? 'null';
      gradeCounts[grade] = (gradeCounts[grade] ?? 0) + 1;
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    console.log(
      '[replay] summary=' +
        JSON.stringify(
          {
            jobId,
            txCount: txRows.length,
            job: jobRow,
            gradeCounts,
            statusCounts,
          },
          null,
          2
        )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await completeJob(supabase as any, jobId, false, [{ message }]);
    throw error;
  } finally {
    console.log(`[replay] done success=${success}`);
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error('[replay] failed', message);
  process.exit(1);
});
