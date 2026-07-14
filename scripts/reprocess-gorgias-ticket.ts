/**
 * One-off SAFE repair: re-ingest a single Gorgias ticket so it is reclassified
 * with the fixed claim/order-ref logic, and its customer_claim_summary is built.
 *
 * It fetches the FULL ticket from the Gorgias API (the live webhook payload can
 * be thin / lack body text) and replays it through the EXACT production ingest
 * path (ingestSupportCase). The intake upsert is idempotent on
 * (merchant_id, provider, external_case_id), so re-running is safe.
 *
 * Scope: writes ONLY the one ticket's support_case_intake row + its derived
 * claim-intelligence rows (customer_claim_summary etc.). No migration, no
 * Shopify/profile/widget changes.
 *
 * Usage:
 *   npx ts-node --transpile-only --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
 *     scripts/reprocess-gorgias-ticket.ts
 *
 * Safety: masks emails, prints no secrets/tokens/raw payloads.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createServiceClient } from '@/lib/supabase/server';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { fetchGorgiasTicketById } from '@/lib/support/gorgias/fetchTicket';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { TABLES } from '@/lib/supabase/tables';

const TARGET = {
  merchantId: process.env.E2E_MERCHANT_ID?.trim() ?? '',
  // Ticket id may be overridden via argv[2] or REPROCESS_TICKET_ID.
  ticketId: process.argv[2]?.trim() || process.env.REPROCESS_TICKET_ID?.trim() || '',
  shopDomain: process.env.E2E_SHOPIFY_STORE_DOMAIN?.trim() || '',
};
if (!TARGET.merchantId || !TARGET.ticketId || !TARGET.shopDomain) {
  throw new Error('E2E_MERCHANT_ID, REPROCESS_TICKET_ID, and E2E_SHOPIFY_STORE_DOMAIN are required');
}

const maskHash = (h: string | null) => (h ? `${h.slice(0, 8)}…(${h.length})` : '(none)');

async function main() {
  const supabase = createServiceClient();

  const access = await getActiveGorgiasMerchantApiAccess(supabase, TARGET.merchantId);
  if (!access) {
    console.error('No active Gorgias connection / API access for merchant. Aborting.');
    process.exit(1);
  }

  const { data: conn } = await supabase
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select('id')
    .eq('merchant_id', TARGET.merchantId)
    .eq('provider', 'gorgias')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const providerConnectionId = (conn as { id?: string } | null)?.id;

  console.log(`Fetching full Gorgias ticket ${TARGET.ticketId} via API…`);
  const ticket = await fetchGorgiasTicketById({
    providerBaseUrl: access.providerBaseUrl,
    credentials: access.credentials,
    ticketId: TARGET.ticketId,
  });

  console.log('Replaying through production ingestSupportCase (idempotent upsert)…');
  const result = await ingestSupportCase(supabase, {
    merchant_id: TARGET.merchantId,
    provider: 'gorgias',
    provider_connection_id: providerConnectionId ?? undefined,
    event_type: 'ticket_updated',
    shop_domain: TARGET.shopDomain,
    raw: ticket,
  });

  console.log('\nResult (safe fields only):');
  console.log(`  external_case_id : ${result.external_case_id}`);
  console.log(`  is_claim         : ${result.is_claim}`);
  console.log(`  claim_type       : ${result.claim_type ?? '(null)'}`);
  console.log(`  claim_type_conf  : ${result.claim_type_confidence ?? '(null)'}`);
  console.log(`  claim_reason     : ${result.claim_reason ?? '(null)'}`);
  console.log(`  order_ref        : ${result.order_ref ?? '(null)'}`);
  console.log(`  link_status      : ${result.link_status}`);
  console.log(`  shopify_order_id : ${result.shopify_order_id ?? '(null)'}`);

  // Confirm the downstream summary now exists for this customer (by hash).
  const { data: intakeRow } = await supabase
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select('customer_email_hash')
    .eq('merchant_id', TARGET.merchantId)
    .eq('provider', 'gorgias')
    .eq('external_case_id', result.external_case_id)
    .maybeSingle();
  const emailHash = (intakeRow as { customer_email_hash?: string } | null)?.customer_email_hash ?? null;

  if (emailHash) {
    const { data: summary } = await supabase
      .from(TABLES.CUSTOMER_CLAIM_SUMMARY)
      .select('total_claims, claim_rate, primary_reason, last_claim_at')
      .eq('merchant_id', TARGET.merchantId)
      .eq('customer_email_hash', emailHash)
      .maybeSingle();
    console.log(`\ncustomer_claim_summary for ${maskHash(emailHash)}:`);
    console.log(summary ? `  ${JSON.stringify(summary)}` : '  ❌ still no row');
  }

  console.log('\nDone.');
}

main().catch((e) => { console.error('Fatal:', (e as Error).message); process.exit(1); });
