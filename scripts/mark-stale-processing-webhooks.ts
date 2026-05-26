import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('processed_webhooks')
    .update({ status: 'failed', last_error: 'stale_processing_timeout', updated_at: new Date().toISOString() })
    .eq('status', 'processing')
    .lt('updated_at', cutoff)
    .select('webhook_id');
  if (error) throw error;

  console.log(JSON.stringify({ cutoff, marked_failed: (data ?? []).length, webhook_ids: (data ?? []).map((r: any) => r.webhook_id) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
