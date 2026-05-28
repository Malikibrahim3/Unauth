/**
 * Live in-process Gorgias ingest + linking (uses .env.local service role).
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ingestGorgiasSupportWebhook } from '@/lib/support/gorgias/ingestWebhook';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal(): void {
  const envPath = join(__dirname, '../.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  process.env.GORGIAS_SUPPORT_WEBHOOK_SECRET =
    process.env.GORGIAS_SUPPORT_WEBHOOK_SECRET ?? process.env.INTERNAL_HMAC_SECRET;

  if (!process.env.GORGIAS_SUPPORT_WEBHOOK_SECRET) {
    throw new Error('Set GORGIAS_SUPPORT_WEBHOOK_SECRET or INTERNAL_HMAC_SECRET in .env.local');
  }

  const accountId = process.argv.includes('--account-id')
    ? process.argv[process.argv.indexOf('--account-id') + 1]
    : 'live-link-verify';
  const shopDomain = process.argv.includes('--shop-domain')
    ? process.argv[process.argv.indexOf('--shop-domain') + 1]
    : 'unauth-test.myshopify.com';
  const ticketId = process.argv.includes('--ticket-id')
    ? process.argv[process.argv.indexOf('--ticket-id') + 1]
    : `g-live-${Date.now()}`;

  const ticket = {
    id: ticketId,
    subject: 'Refund for Shopify order #1007',
    status: 'open',
    tags: ['refund'],
    customer: { email: 'shopper@example.com' },
    messages: [{ body: 'Please refund Shopify order #1007', from_agent: false }],
    created_datetime: '2026-05-28T09:00:00.000Z',
    updated_datetime: '2026-05-28T09:30:00.000Z',
  };

  const headers = new Headers({
    'x-unauth-gorgias-secret': process.env.GORGIAS_SUPPORT_WEBHOOK_SECRET,
    'x-gorgias-account-id': accountId,
  });

  const ingestResult = await ingestGorgiasSupportWebhook({
    headers,
    body: ticket,
    shopDomain,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: intake } = await supabase
    .from('support_case_intake')
    .select(
      'id, merchant_id, shop_domain, order_ref, link_status, shopify_order_id, customer_profile_id, merchant_claim_id, link_metadata, claim_reason, external_case_id, provider, customer_message_summary, agent_notes_summary, tags, external_url, case_status'
    )
    .eq('id', ingestResult.support_case_id)
    .single();

  const { data: events } = await supabase
    .from('support_case_events')
    .select('event_type, event_summary, metadata')
    .eq('support_case_id', ingestResult.support_case_id)
    .order('created_at', { ascending: false })
    .limit(20);

  const { listSupportCasesForClaimContext } = await import(
    '@/lib/support/intake/supportCaseReadModel'
  );
  const { listSupportCasesForCustomerProfile } = await import(
    '@/lib/support/intake/supportCaseReadModel'
  );

  let claimContext: unknown[] = [];
  if (intake?.merchant_claim_id) {
    claimContext = await listSupportCasesForClaimContext(supabase, intake.merchant_id, {
      merchantClaimId: intake.merchant_claim_id,
    });
  } else if (intake?.shopify_order_id) {
    claimContext = await listSupportCasesForClaimContext(supabase, intake.merchant_id, {
      shopifyOrderId: intake.shopify_order_id,
      orderRef: intake.order_ref,
      shopDomain: intake.shop_domain,
    });
  }

  let customerCases: unknown[] = [];
  if (intake?.customer_profile_id) {
    customerCases = await listSupportCasesForCustomerProfile(
      supabase,
      intake.merchant_id,
      intake.customer_profile_id
    );
  }

  console.log(
    JSON.stringify(
      {
        ingest: ingestResult,
        intake,
        link_events: (events ?? []).filter((event) =>
          [
            'linked_shopify_order',
            'linked_customer_profile',
            'linked_merchant_claim',
            'claim_candidate_identified',
            'link_not_found',
            'link_ambiguous',
            'link_failed',
          ].includes(String(event.event_type))
        ),
        claim_context_read_model: claimContext,
        customer_support_cases_read_model: customerCases,
        safe_check: {
          intake_json_has_at: JSON.stringify(intake ?? {}).includes('@'),
          events_json_has_at: JSON.stringify(events ?? []).includes('@'),
        },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
