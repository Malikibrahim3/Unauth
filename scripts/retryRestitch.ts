import { createClient } from '@supabase/supabase-js';
import { restitchAuditIdentityFromChunks } from '../lib/processing/restitchAuditIdentity';

async function main() {
  const jobId = process.argv[2];
  const totalChunks = Number(process.argv[3] ?? '0');

  if (!jobId || !totalChunks) {
    throw new Error('Usage: ts-node scripts/retryRestitch.ts <jobId> <totalChunks>');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars are missing');
  }

  const serviceClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const result = await restitchAuditIdentityFromChunks(serviceClient as any, jobId, totalChunks);
  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
