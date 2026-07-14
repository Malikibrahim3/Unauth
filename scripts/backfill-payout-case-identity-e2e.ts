/**
 * E2E-merchant-only backfill for support_payout_cases.identity_id.
 * Safe to re-run — idempotent identity resolution.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { backfillPayoutCaseIdentitiesForMerchant } from '@/lib/support/intake/resolvePayoutCaseIdentity';
import { requiredControlledAccountEnv } from '@/scripts/e2e/controlledAccountEnv';

const TARGET_CASE_ID = process.argv[2] ?? requiredControlledAccountEnv('E2E_CASE_ID');

async function main() {
  const merchantId = process.env.E2E_MERCHANT_ID?.trim();
  if (!merchantId) throw new Error('E2E_MERCHANT_ID is required');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: before } = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, merchant_id, identity_id, source_ticket_id, source_order_id')
    .eq('id', TARGET_CASE_ID)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (!before) {
    console.log(JSON.stringify({ error: 'target_case_not_found', case_id: TARGET_CASE_ID, merchant_id: merchantId }, null, 2));
    process.exit(1);
  }

  const results = await backfillPayoutCaseIdentitiesForMerchant(supabase, {
    merchantId,
    claimIds: [TARGET_CASE_ID],
    provider: 'gorgias',
  });

  const { data: after } = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, identity_id')
    .eq('id', TARGET_CASE_ID)
    .maybeSingle();

  let identityDetails: Record<string, unknown> | null = null;
  if (after?.identity_id) {
    const { data: identity } = await supabase
      .from('identities')
      .select('id, confidence_grade, confidence_score, merchant_count, signal_count')
      .eq('id', after.identity_id)
      .maybeSingle();
    const { data: signals } = await supabase
      .from('identity_signals')
      .select('id, merchant_id, identifier_type, source_customer_id, source_order_id, source_ticket_id')
      .eq('merchant_id', merchantId)
      .limit(20);
    const emailSignals = (signals ?? []).filter((s) => s.identifier_type === 'email');
    identityDetails = {
      identity,
      merchant_scoped_signal_count: emailSignals.length,
      cross_merchant_leak: (signals ?? []).some((s) => s.merchant_id !== merchantId),
    };
  }

  console.log(
    JSON.stringify(
      {
        merchant_id: merchantId,
        case_id: TARGET_CASE_ID,
        before_identity_id: before.identity_id,
        after_identity_id: after?.identity_id ?? null,
        backfill: results[0] ?? null,
        identity_details: identityDetails,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
