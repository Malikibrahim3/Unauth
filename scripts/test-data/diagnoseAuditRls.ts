import { createClient } from '@supabase/supabase-js';

async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    throw new Error('Usage: npm run diagnose:audit-rls -- <job_id>');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY');
  }

  const anonClient = createClient(url, anon);
  const serviceClient = createClient(url, service);

  const [serviceCount, anonCount] = await Promise.all([
    serviceClient.from('audit_transactions').select('*', { count: 'exact', head: true }).eq('job_id', jobId),
    anonClient.from('audit_transactions').select('*', { count: 'exact', head: true }).eq('job_id', jobId),
  ]);

  console.log(JSON.stringify({
    jobId,
    serviceRole: { count: serviceCount.count, error: serviceCount.error?.message ?? null },
    anonOrAuthenticatedContext: { count: anonCount.count, error: anonCount.error?.message ?? null },
    verdict: serviceCount.count === anonCount.count ? 'MATCH' : 'MISMATCH_CHECK_RLS_OR_AUTH_CONTEXT',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
