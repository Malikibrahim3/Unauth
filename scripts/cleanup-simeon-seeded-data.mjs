/**
 * Remove synthetic seed data for simeonmurray123@gmail.com while keeping
 * Shopify-sourced records intact.
 *
 * This is intentionally conservative:
 * - keeps rows explicitly marked source = 'shopify'
 * - keeps Shopify-backed claims if their shopify_order_id exists in Shopify signals
 * - deletes seed/demo profiles, audits, notes, watchlist rows, and evidence packages
 */

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnv() {
  const envPath = '.env.local';
  const raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

readEnv();

const ACCOUNT_EMAIL = process.env.E2E_MERCHANT_EMAIL;
const SHOP_DOMAIN = process.env.E2E_SHOPIFY_STORE_DOMAIN;
if (!ACCOUNT_EMAIL || !SHOP_DOMAIN) {
  throw new Error('E2E_MERCHANT_EMAIL and E2E_SHOPIFY_STORE_DOMAIN are required');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function findUser() {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === ACCOUNT_EMAIL.toLowerCase());
    if (found) return found;
    if ((data.users ?? []).length < 1000) break;
  }
  return null;
}

async function deleteWhere(table, queryBuilder) {
  const { error } = await queryBuilder.delete();
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
}

async function collectIds(table, column, queryBuilder) {
  const { data, error } = await queryBuilder.select(column);
  if (error) throw new Error(`${table} read failed: ${error.message}`);
  return (data ?? []).map((row) => row[column]).filter(Boolean);
}

async function main() {
  const user = await findUser();
  if (!user) throw new Error(`Auth user not found for ${ACCOUNT_EMAIL}`);

  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('id, user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (merchantError) throw new Error(`Merchant lookup failed: ${merchantError.message}`);
  if (!merchant) throw new Error(`Merchant not found for ${ACCOUNT_EMAIL}`);

  const merchantId = merchant.id;

  const [{ data: shopifySignals, error: signalsError }, { data: shopifyClaims, error: claimsError }] =
    await Promise.all([
      supabase
        .from('shopify_order_signals')
        .select('shopify_order_id')
        .eq('shop_domain', SHOP_DOMAIN),
      supabase
        .from('merchant_claims')
        .select('id, shopify_order_id, customer_id, shop_domain')
        .eq('merchant_id', merchantId)
        .eq('shop_domain', SHOP_DOMAIN),
    ]);

  if (signalsError) throw new Error(`Shopify signals lookup failed: ${signalsError.message}`);
  if (claimsError) throw new Error(`Claims lookup failed: ${claimsError.message}`);

  const shopifyOrderIds = new Set((shopifySignals ?? []).map((r) => String(r.shopify_order_id)));
  const claimIdsToKeep = new Set(
    (shopifyClaims ?? [])
      .filter((claim) => claim.shopify_order_id && shopifyOrderIds.has(String(claim.shopify_order_id)))
      .map((claim) => claim.id)
  );

  const { data: profileRows, error: profileError } = await supabase
    .from('customer_profiles')
    .select('id, primary_email, merchant_ids')
    .filter('merchant_ids', 'cs', JSON.stringify([merchantId]));
  if (profileError) throw new Error(`Customer profile lookup failed: ${profileError.message}`);

  const profileIds = (profileRows ?? []).map((row) => row.id);

  const { data: shopifyProfileIdentityRows, error: profileIdentityError } = await supabase
    .from('customer_profile_identities')
    .select('customer_profile_id')
    .eq('merchant_id', merchantId)
    .eq('source', 'shopify');
  if (profileIdentityError) throw new Error(`Profile identity lookup failed: ${profileIdentityError.message}`);

  const shopifyProfileIds = new Set((shopifyProfileIdentityRows ?? []).map((row) => row.customer_profile_id));
  const seedProfileIds = profileIds.filter((id) => !shopifyProfileIds.has(id));

  const { data: jobRows, error: jobError } = await supabase
    .from('processing_jobs')
    .select('id')
    .eq('merchant_id', merchantId);
  if (jobError) throw new Error(`Processing job lookup failed: ${jobError.message}`);
  const jobIds = (jobRows ?? []).map((row) => row.id);

  const cleanupCounts = {
    evidence_packages: 0,
    watchlist_appearances: 0,
    watchlist_entries: 0,
    customer_notes: 0,
    customer_activity_log: 0,
    customer_profile_identities: 0,
    customer_profiles: 0,
    audit_transactions: 0,
    processing_jobs: 0,
    merchant_claims: 0,
    claim_evidence_items: 0,
    merchant_case_outcomes: 0,
    claim_events: 0,
    support_case_intake: 0,
  };

  const { count: evidenceCount } = await supabase
    .from('evidence_packages')
    .delete({ count: 'exact' })
    .eq('merchant_id', merchantId)
    .or(`reference_number.like.UNAUTH-%,reference_number.like.SM-EVD-%,merchant_notes.ilike.%seed%`);
  cleanupCounts.evidence_packages = evidenceCount ?? 0;

  if (seedProfileIds.length) {
    const { count: notesCount } = await supabase
      .from('customer_notes')
      .delete({ count: 'exact' })
      .in('customer_profile_id', seedProfileIds);
    cleanupCounts.customer_notes = notesCount ?? 0;

    const { count: activityCount } = await supabase
      .from('customer_activity_log')
      .delete({ count: 'exact' })
      .in('profile_id', seedProfileIds);
    cleanupCounts.customer_activity_log = activityCount ?? 0;

    const { count: identityCount } = await supabase
      .from('customer_profile_identities')
      .delete({ count: 'exact' })
      .in('customer_profile_id', seedProfileIds);
    cleanupCounts.customer_profile_identities = identityCount ?? 0;

    const { count: notesByProfileCount } = await supabase
      .from('customer_profiles')
      .delete({ count: 'exact' })
      .in('id', seedProfileIds);
    cleanupCounts.customer_profiles = notesByProfileCount ?? 0;
  }

  if (jobIds.length) {
    const { count: appearanceCount } = await supabase
      .from('customer_profile_audit_appearances')
      .delete({ count: 'exact' })
      .in('audit_id', jobIds);
    cleanupCounts.watchlist_appearances = appearanceCount ?? 0;
  }

  const { count: wlCount } = await supabase
    .from('watchlist_entries')
    .delete({ count: 'exact' })
    .eq('merchant_id', merchantId)
    .or('display_email.like.simeon.seed.%,notes.ilike.%Seed watchlist%,notes.ilike.%seed%');
  cleanupCounts.watchlist_entries = wlCount ?? 0;

  if (jobIds.length) {
    const { count: txCount } = await supabase
      .from('audit_transactions')
      .delete({ count: 'exact' })
      .in('job_id', jobIds)
      .neq('source', 'shopify');
    cleanupCounts.audit_transactions = txCount ?? 0;
  }

  if (jobIds.length) {
    const { count: jobCount } = await supabase
      .from('processing_jobs')
      .delete({ count: 'exact' })
      .eq('merchant_id', merchantId);
    cleanupCounts.processing_jobs = jobCount ?? 0;
  }

  if (jobIds.length) {
    const { count: pkgCount } = await supabase
      .from('evidence_packages')
      .delete({ count: 'exact' })
      .eq('merchant_id', merchantId)
      .in('generated_for_order_id', jobIds);
    cleanupCounts.evidence_packages += pkgCount ?? 0;
  }

  if (jobIds.length) {
    const { count: caseCount } = await supabase
      .from('support_case_intake')
      .delete({ count: 'exact' })
      .eq('merchant_id', merchantId)
      .not('shopify_order_id', 'is', null)
      .neq('source', 'shopify');
    cleanupCounts.support_case_intake = caseCount ?? 0;
  }

  // Claims/outcomes/evidence are append-only in some environments, so purge them
  // only when they are not backed by Shopify order IDs.
  const claimIdsToDelete = (shopifyClaims ?? [])
    .filter((claim) => !claim.shopify_order_id || !shopifyOrderIds.has(String(claim.shopify_order_id)) || !claimIdsToKeep.has(claim.id))
    .map((claim) => claim.id);

  if (claimIdsToDelete.length) {
    const { count: evidenceItemCount } = await supabase
      .from('claim_evidence_items')
      .delete({ count: 'exact' })
      .in('claim_id', claimIdsToDelete);
    cleanupCounts.claim_evidence_items = evidenceItemCount ?? 0;

    const { count: outcomeCount } = await supabase
      .from('merchant_case_outcomes')
      .delete({ count: 'exact' })
      .in('claim_id', claimIdsToDelete);
    cleanupCounts.merchant_case_outcomes = outcomeCount ?? 0;

    const { count: eventCount } = await supabase
      .from('claim_events')
      .delete({ count: 'exact' })
      .in('claim_id', claimIdsToDelete);
    cleanupCounts.claim_events = eventCount ?? 0;

    const { count: claimCount } = await supabase
      .from('merchant_claims')
      .delete({ count: 'exact' })
      .in('id', claimIdsToDelete);
    cleanupCounts.merchant_claims = claimCount ?? 0;
  }

  // Keep Shopify tables and Shopify-backed merchant connections intact.
  console.log(JSON.stringify({
    ok: true,
    merchant_id: merchantId,
    kept_shopify_order_signals: shopifyOrderIds.size,
    kept_shopify_claims: claimIdsToKeep.size,
    deleted: cleanupCounts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
