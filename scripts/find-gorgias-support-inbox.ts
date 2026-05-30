/**
 * READ-ONLY: discover the customer-facing support inbox email(s) for the
 * connected Gorgias account, so a test claim email can be sent to the right
 * address. Prints integration/channel ids, types, and email ADDRESSES only.
 * Never prints API tokens, secrets, or credentials. Mutates nothing.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createServiceClient } from '@/lib/supabase/server';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';

const MERCHANT_ID = 'af070af9-df1a-46ba-89f8-29409926ef61';

// Pull only address-like leaves out of an integration object — no token fields.
function collectEmails(obj: unknown, found: Set<string>, depth = 0): void {
  if (depth > 4 || obj == null) return;
  if (typeof obj === 'string') {
    const m = obj.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g);
    if (m) m.forEach((e) => found.add(e));
    return;
  }
  if (Array.isArray(obj)) { obj.forEach((v) => collectEmails(v, found, depth + 1)); return; }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      // Skip any obviously sensitive keys outright.
      if (/token|secret|password|key|signature|auth/i.test(k)) continue;
      collectEmails(v, found, depth + 1);
    }
  }
}

async function main() {
  const sb = createServiceClient();
  const access = await getActiveGorgiasMerchantApiAccess(sb, MERCHANT_ID);
  if (!access) { console.error('No active Gorgias API access.'); process.exit(1); }
  const apiBase = gorgiasApiBaseUrl(access.providerBaseUrl);
  const creds = { email: access.credentials.email, api_key: access.credentials.api_key };

  console.log(`Gorgias account base: ${access.providerBaseUrl}\n`);

  // 1) Integrations (email channels live here).
  try {
    const integrations = await gorgiasApiRequest<{ data?: Array<Record<string, unknown>> }>(
      apiBase, '/integrations?limit=100', creds, { method: 'GET' }
    );
    const rows = integrations.data ?? [];
    console.log(`Integrations (${rows.length}):`);
    for (const r of rows) {
      const emails = new Set<string>();
      collectEmails(r, emails);
      const type = String(r.type ?? r.integration_type ?? 'unknown');
      console.log(`  id=${r.id} type=${type} name=${typeof r.name === 'string' ? `"${r.name}"` : 'n/a'} emails=[${[...emails].join(', ') || '—'}]`);
    }
  } catch (e) {
    console.log(`  integrations fetch failed: ${(e as Error).message}`);
  }

  // 2) Account contact address (often the default support inbox).
  try {
    const account = await gorgiasApiRequest<Record<string, unknown>>(apiBase, '/account', creds, { method: 'GET' });
    const emails = new Set<string>();
    collectEmails(account, emails);
    console.log(`\nAccount-level email addresses: [${[...emails].join(', ') || '—'}]`);
  } catch (e) {
    console.log(`\n  account fetch failed: ${(e as Error).message}`);
  }

  console.log('\nNote: send the test claim email TO the customer-facing support address above');
  console.log('(typically the *.gorgias.io / custom-domain inbox, NOT the API account email).');
  console.log('No mutations performed.');
}

main().catch((e) => { console.error('Fatal:', (e as Error).message); process.exit(1); });
