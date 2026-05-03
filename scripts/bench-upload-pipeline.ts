/**
 * scripts/bench-upload-pipeline.ts
 *
 * Real-Supabase end-to-end benchmark for the CSV upload + scanning pipeline.
 *
 * Builds a synthetic N-row CSV in memory, runs streamParseCsv → processCsvJob
 * against your live Supabase project (using SUPABASE_SERVICE_ROLE_KEY from
 * .env.local), and prints stage-by-stage timings.
 *
 * Writes go into a real `processing_jobs` row but use a clearly identifiable
 * `merchant_id` (BENCH_MERCHANT_ID env var) so you can clean it up.
 *
 * Usage:
 *   ROW_COUNT=5000 BENCH_MERCHANT_ID=<uuid> \
 *     npx ts-node --transpile-only \
 *       --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
 *       scripts/bench-upload-pipeline.ts
 *
 * If BENCH_MERCHANT_ID is not set the bench will refuse to run, since writing
 * to a random merchant's data is dangerous.
 */

import 'dotenv/config'; // best-effort; falls back to .env.local read below
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';
import { streamParseCsv } from '../lib/processing/streamParser';
import { processCsvJob } from '../lib/processing/worker';
import { createJob, completeJob, updateJobTotalRows } from '../lib/processing/job';

// Load .env.local manually since dotenv/config only reads .env
function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
loadEnvLocal();

const ROW_COUNT = parseInt(process.env.ROW_COUNT ?? '2000', 10);
const MERCHANT_ID = process.env.BENCH_MERCHANT_ID;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MERCHANT_ID) {
  console.error('ERROR: BENCH_MERCHANT_ID env var is required.');
  console.error('Set it to a real merchant UUID you own. The bench will write rows tagged to that merchant.');
  process.exit(2);
}
if (!URL || !KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(2);
}

function genCsv(rows: number): string {
  const header =
    'order_id,order_date,customer_email,customer_name,shipping_address,order_total,' +
    'order_status,currency,refund_status,payment_method,ip_address,card_last4';
  const lines: string[] = [header];
  for (let i = 0; i < rows; i++) {
    const orderId = `BENCH-${Date.now()}-${i}`;
    const email = `bench${i % 1000}@example.com`;
    const ip = `10.${(i / 65000) | 0}.${(i / 250) % 256 | 0}.${i % 250}`;
    const last4 = String(1000 + (i % 9000)).slice(-4);
    lines.push(
      [
        orderId,
        '2026-05-01',
        email,
        `Bench User ${i}`,
        `"${i} Bench St, Town, NY 10001"`,
        (50 + (i % 200)).toFixed(2),
        'completed',
        'USD',
        i % 13 === 0 ? 'full' : 'not_refunded',
        'visa',
        ip,
        last4,
      ].join(',')
    );
  }
  return lines.join('\n');
}

async function main() {
  const client = createClient<Database>(URL!, KEY!);

  console.log(`[bench] generating ${ROW_COUNT}-row CSV...`);
  const csv = genCsv(ROW_COUNT);
  const file = new File([csv], 'bench.csv', { type: 'text/csv' });

  console.log('[bench] streamParseCsv...');
  const tParseStart = Date.now();
  const parseResult = await streamParseCsv(file);
  const tParse = Date.now() - tParseStart;
  console.log(`[bench]   parsed ${parseResult.rowCount} rows in ${tParse}ms`);

  if (!parseResult.valid) {
    console.error('[bench] CSV did not validate:', parseResult.missingRequired);
    process.exit(3);
  }

  console.log('[bench] createJob...');
  const jobId = await createJob(client as any, MERCHANT_ID!, 'bench.csv');
  await updateJobTotalRows(client as any, jobId, parseResult.rowCount);

  console.log('[bench] processCsvJob...');
  const tProcStart = Date.now();
  try {
    const scored = await processCsvJob(parseResult.rows, jobId, client as any, 5, MERCHANT_ID);
    const tProc = Date.now() - tProcStart;
    const flagged = scored.filter((s) => s.flagged).length;
    await completeJob(client as any, jobId, true, undefined, flagged);

    console.log('-------------------------------------------------------');
    console.log(`[bench] ROWS:           ${ROW_COUNT}`);
    console.log(`[bench] parse:          ${tParse}ms`);
    console.log(`[bench] processCsvJob:  ${tProc}ms`);
    console.log(`[bench] total:          ${tParse + tProc}ms`);
    console.log(`[bench] rows/sec:       ${Math.round((ROW_COUNT / (tParse + tProc)) * 1000)}`);
    console.log(`[bench] flagged:        ${flagged}`);
    console.log(`[bench] jobId:          ${jobId}`);
    console.log('-------------------------------------------------------');
    console.log('To clean up:');
    console.log(`  delete from audit_transactions where job_id = '${jobId}';`);
    console.log(`  delete from processing_jobs where id = '${jobId}';`);
  } catch (err) {
    await completeJob(client as any, jobId, false, [
      { message: err instanceof Error ? err.message : String(err) },
    ]);
    throw err;
  }
}

main().catch((err) => {
  console.error('[bench] FAILED:', err);
  process.exit(1);
});
