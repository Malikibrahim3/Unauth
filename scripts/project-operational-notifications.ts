import { createClient } from '@supabase/supabase-js';
import { projectOperationalNotifications } from '../lib/notifications/projectOperational';

async function main() {
  const merchantId = process.argv[2];
  if (!merchantId) throw new Error('Usage: tsx scripts/project-operational-notifications.ts <merchant-id>');
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials are required');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await projectOperationalNotifications(client, merchantId);
  process.stdout.write(`${JSON.stringify({ merchantId, ...result })}\n`);
}

void main();
