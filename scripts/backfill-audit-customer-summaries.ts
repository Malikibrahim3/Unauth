import { createServiceClient } from '@/lib/supabase/server';
import { paginateAll, refreshAuditCustomerSummaries } from '@/lib/supabase/merchantHelpers';

async function main() {
  const supabase = createServiceClient();
  const jobs = await paginateAll<{ id: string; merchant_id: string }>((from, to) =>
    supabase
      .from('processing_jobs')
      .select('id,merchant_id')
      .eq('status', 'completed')
      .not('merchant_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, to) as Promise<{
        data: Array<{ id: string; merchant_id: string }> | null;
        error: unknown;
      }>
  );

  let refreshed = 0;
  for (const job of jobs) {
    try {
      const rows = await refreshAuditCustomerSummaries(supabase, job.id, job.merchant_id);
      refreshed += 1;
      console.log(`[audit-summary-backfill] ${job.id}: ${rows} customer summaries`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[audit-summary-backfill] ${job.id}: failed - ${message}`);
    }
  }

  console.log(`[audit-summary-backfill] complete: ${refreshed}/${jobs.length} audits refreshed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
