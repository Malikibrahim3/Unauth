/**
 * READ-ONLY: dump the Unauth widget HTTP integration config from Gorgias to
 * debug why the sidebar panel isn't loading. Prints structural/config fields
 * only; redacts the widget token in any URL. No mutations.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createServiceClient } from '@/lib/supabase/server';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';

const MERCHANT_ID = 'af070af9-df1a-46ba-89f8-29409926ef61';
const WIDGET_INTEGRATION_ID = '104747';

const redactToken = (s: string) =>
  s.replace(/((?:wt|token|widget_token)=)[^&"'\s]+/gi, '$1***');

function show(obj: unknown, indent = ''): void {
  if (obj == null) { console.log(`${indent}(null)`); return; }
  if (typeof obj !== 'object') { console.log(`${indent}${redactToken(String(obj))}`); return; }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (/token|secret|password|signature/i.test(k)) { console.log(`${indent}${k}: ***`); continue; }
    if (v && typeof v === 'object') {
      console.log(`${indent}${k}:`);
      show(v, indent + '  ');
    } else {
      console.log(`${indent}${k}: ${redactToken(String(v))}`);
    }
  }
}

async function main() {
  const sb = createServiceClient();
  const access = await getActiveGorgiasMerchantApiAccess(sb, MERCHANT_ID);
  if (!access) { console.error('No Gorgias API access.'); process.exit(1); }
  const apiBase = gorgiasApiBaseUrl(access.providerBaseUrl);
  const creds = { email: access.credentials.email, api_key: access.credentials.api_key };

  const integ = await gorgiasApiRequest<Record<string, unknown>>(
    apiBase, `/integrations/${WIDGET_INTEGRATION_ID}`, creds, { method: 'GET' }
  );

  console.log(`=== Integration ${WIDGET_INTEGRATION_ID} (full config, token redacted) ===\n`);
  show(integ);

  // Highlight the key flags.
  const blob = JSON.stringify(integ);
  const url = blob.match(/https?:\/\/[^"'\\ ]+\/api\/gorgias\/widget[^"'\\ ]*/)?.[0] ?? '(widget URL not found)';
  console.log('\n=== Key checks ===');
  console.log('type            :', integ.type ?? integ.integration_type);
  console.log('active/enabled  :', integ.active ?? integ.enabled ?? '(field not present)');
  console.log('deactivated_*   :', integ.deactivated_datetime ?? integ.deleted_datetime ?? '(none)');
  console.log('widget URL      :', redactToken(url));
  console.log('  _cb           :', url.match(/[?&]_cb=([^&]+)/)?.[1] ?? '(none)');
  console.log('  email param   :', /email=\{\{\s*ticket\.sender\.email\s*\}\}/.test(blob));
  console.log('  customer_email:', /customer_email=\{\{\s*ticket\.customer\.email\s*\}\}/.test(blob));
  console.log('  ticket_id     :', /ticket_id=\{\{\s*ticket\.id\s*\}\}/.test(blob));
  console.log('\nNo mutations performed.');
}

main().catch((e) => { console.error('Fatal:', (e as Error).message); process.exit(1); });
