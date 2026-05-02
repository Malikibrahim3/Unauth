import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://saeueexkqmubnveacepr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZXVlZXhrcW11Ym52ZWFjZXByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3MDA1OSwiZXhwIjoyMDkzMTQ2MDU5fQ.mrjxDjY8wYxcoP-mSKPL1owjl5BnwrlgzvN9k145ROk'
);

async function check() {
  const r1 = await (supabase as any).rpc('increment_job_progress', {
    p_job_id: '00000000-0000-0000-0000-000000000000',
    p_processed_delta: 0,
    p_failed_delta: 0
  });
  console.log('increment_job_progress:', r1.error?.code ?? 'OK', r1.error?.message ?? '');

  const r2 = await (supabase as any).rpc('bulk_upsert_fraud_entities', { p_entities: [] });
  console.log('bulk_upsert_fraud_entities:', r2.error?.code ?? 'OK', r2.error?.message ?? '');

  const r3 = await (supabase as any).rpc('bulk_upsert_co_occurrences', { p_pairs: [] });
  console.log('bulk_upsert_co_occurrences:', r3.error?.code ?? 'OK', r3.error?.message ?? '');
}

check().catch(console.error);
