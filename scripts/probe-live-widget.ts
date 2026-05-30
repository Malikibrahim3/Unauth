/**
 * READ-ONLY: call the LIVE production /api/gorgias/widget exactly as Gorgias
 * would (using the registered integration URL + ticket_id), and report the
 * claim stats it returns plus the deploy cache-buster. Masks emails, never
 * prints the widget token or raw payloads.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createServiceClient } from '@/lib/supabase/server';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';

const MERCHANT_ID = 'af070af9-df1a-46ba-89f8-29409926ef61';
const WIDGET_INTEGRATION_ID = '104747';
// `… probe-live-widget.ts <ticketId> <shopperEmail>`
const TICKET_ID = process.argv[2]?.trim() || '63291904';
const SHOPPER_EMAIL = process.argv[3]?.trim() || 'simeonmurray123@gmail.com';

const redactEmails = (s: string) => s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>');

async function main() {
  const sb = createServiceClient();
  const access = await getActiveGorgiasMerchantApiAccess(sb, MERCHANT_ID);
  if (!access) { console.error('No Gorgias API access.'); process.exit(1); }
  const apiBase = gorgiasApiBaseUrl(access.providerBaseUrl);
  const creds = { email: access.credentials.email, api_key: access.credentials.api_key };

  // Read the registered widget integration to get the exact base URL + token.
  const integ = await gorgiasApiRequest<Record<string, unknown>>(
    apiBase, `/integrations/${WIDGET_INTEGRATION_ID}`, creds, { method: 'GET' }
  );
  const blob = JSON.stringify(integ);
  const urlMatch = blob.match(/https?:\/\/[^"'\\ ]+\/api\/gorgias\/widget[^"'\\ ]*/);
  if (!urlMatch) { console.error('Widget URL not found in integration.'); process.exit(1); }
  const registeredUrl = urlMatch[0];

  const cb = registeredUrl.match(/[?&]_cb=([^&]+)/)?.[1] ?? '(none)';
  console.log(`Registered widget _cb (deploy marker): ${cb}`);

  // Resolve Gorgias template params to concrete values for this ticket.
  const liveUrl = new URL(registeredUrl);
  liveUrl.searchParams.set('email', SHOPPER_EMAIL);
  liveUrl.searchParams.set('customer_email', SHOPPER_EMAIL);
  liveUrl.searchParams.set('ticket_id', TICKET_ID);
  liveUrl.searchParams.set('name', '');
  liveUrl.searchParams.set('order_id', '');

  console.log(`Calling live widget for ticket ${TICKET_ID} (token + email omitted)…`);
  const res = await fetch(liveUrl.toString(), { headers: { Accept: 'application/json' } });
  console.log(`  HTTP ${res.status}`);
  console.log(`  x-vercel-id: ${res.headers.get('x-vercel-id') ?? '(none)'}`);
  console.log(`  cache: ${res.headers.get('cache-control') ?? '(none)'} age=${res.headers.get('age') ?? '(none)'} x-vercel-cache=${res.headers.get('x-vercel-cache') ?? '(none)'}`);

  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text); } catch { /* not json */ }

  if (json) {
    // Print only the claim-stat fields; redact any stray emails.
    const safe = redactEmails(JSON.stringify(json, null, 2));
    console.log('\nWidget JSON response:');
    console.log(safe.length > 2000 ? safe.slice(0, 2000) + '\n…(truncated)' : safe);
  } else {
    console.log('\nNon-JSON response (first 300 chars, emails redacted):');
    console.log(redactEmails(text).slice(0, 300));
  }
  console.log('\nNo mutations performed.');
}

main().catch((e) => { console.error('Fatal:', (e as Error).message); process.exit(1); });
