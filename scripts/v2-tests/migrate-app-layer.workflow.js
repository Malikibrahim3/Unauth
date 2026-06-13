export const meta = {
  name: 'migrate-app-layer-v2',
  description: 'Port remaining legacy .from() reads across the app to the v2 schema, in disjoint file clusters',
  phases: [
    { title: 'Migrate' },
    { title: 'Verify' },
  ],
};

const SCHEMA = `
V2 SCHEMA FACTS (public schema = rebuilt v2; legacy tables DROPPED):
- claims: id, merchant_id, source_ticket_id, source_order_id, identity_id, claim_type (enum item_not_received|damaged|wrong_item|not_as_described|refund_request|chargeback|return_abuse|other), status (pending|open|escalated|resolved_refunded|resolved_won|resolved_lost|resolved_denied|resolved_exchanged|voided|stale), detection_method (tag|keyword|manual|platform_dispute|platform_refund|model), detection_detail jsonb, reason_raw, reason_normalized, amount_at_risk numeric, currency, requires_review, assigned_to (auth.users), assigned_at, snoozed_until, first_viewed_at, submitted_at, created_at, updated_at. NO customer_id / shop_domain / shopify_order_id columns. Order linkage: source_order_id -> source_orders(id). source_orders has: external_id, order_number, email, phone, financial_status, fulfillment_state, total_price, placed_at, source, merchant_id. Customer email for display = source_orders.email (or via source_customers).
- claim_outcomes: claim_id UNIQUE, decision, outcome, amount_refunded, amount_recovered, notes, decided_by, decided_at, updated_at. (replaces merchant_case_outcomes; ONE row per claim, no need to dedupe by updated_at.)
- claim_evidence: claim_id, merchant_id, evidence_type CHECK(tracking|proof_of_delivery|customer_message|support_ticket|return_label|warehouse_scan|payment_dispute|note|other), storage_path, evidence_hash, metadata, added_by. (replaces claim_evidence_items.)
- identities: id, confidence_grade (weak|possible|probable|definite), confidence_score, merchant_count, signal_count, first_seen_at, last_seen_at, superseded_by. identity_profiles: identity_id PK, total_orders, total_claims, total_chargebacks, total_refund_amount, claim_rate, fastest_claim_days, avg_claim_days, claim_type_counts jsonb, merchant_count. identity_members: identity_id, identifier_type, identifier_hash. (replaces customer_profiles + customer_profile_identities.) These four + identity_signals/edges/network_access_log are SERVICE-ROLE-ONLY (RLS denies authenticated) -> server code must use createServiceClient() AND apply k-anonymity: only surface cross-merchant aggregates when merchant_count>=3 OR the merchant has its own signals (mirror lookup_network_identity RPC: supabase.rpc('lookup_network_identity',{p_merchant_id, p_identifier_hashes:[{type,hash}], p_request_ip:null})). The merchant's OWN data = source_customers/source_orders/claims (merchant-scoped RLS).
- store_connections: id, merchant_id, platform (shopify|woocommerce|bigcommerce), store_key (=shop_domain / store url host / store hash), store_url, status (active|disabled|revoked|error), credentials_encrypted, scopes jsonb, installed_at, uninstalled_at, last_sync_at, last_error. unique(platform, store_key). REPLACES shopify_merchants + merchant_shopify_connections + commerce_store_connections. (Shopify legacy stored access_token plaintext in shopify_merchants; v2 stores credentials_encrypted. For shopify, the connection 'active' = status='active' and uninstalled_at is null.)
- merchant_users (=TABLES.MERCHANT_MEMBERS): id, merchant_id, user_id, invited_email, role (member_role: owner|admin|analyst|viewer), invite_status (pending|active|revoked), invited_by, accepted_at. REPLACES merchant_members. NOTE merchants has NO user_id column (ownership = merchant_users role='owner').
- identity_notes: id, merchant_id, identity_id, body, created_by, deleted_at. (replaces customer_notes.)
- merchant_identity_state: merchant_id+identity_id PK, on_watchlist, investigation_status, display_name, display_email.
- sync_jobs / sync_job_chunks: REPLACE processing_jobs / processing_job_chunks / background_intelligence_jobs. sync_jobs cols: id, merchant_id, job_kind (csv_audit|platform_backfill|helpdesk_backfill|reprocess), source, status (pending|running|completed|failed), label, storage_path, file_hash, column_map, total_rows, processed_rows, failed_rows, error_log, hidden, completed_at.
- user_permission_grants (RECREATED): id, merchant_id, grantee_user_id, permission, granted_by, revoked bool, created_at, revoked_at.
- user_action_log (RECREATED): id, merchant_id, actor_user_id, actor_role, action, resource_type, resource_id, metadata jsonb, request_ip, created_at.
- access_audit_log (RECREATED): id, merchant_id, identity_id, query_type, k_anonymity_satisfied, result_returned, queried_hashes text[], matched_merchant_count, lookup_type, request_ip, created_at.
- NO v2 equivalent (degrade gracefully -> return empty/zero, NEVER fabricate): evidence_packages, customer_profile_audit_appearances, audit_customer_summaries, audit_result_summaries, fraud_entities, fraud_entity_co_occurrences, fraud_identity_clusters, global_identity_*, signal_performance, order_claim_context, merchant_claim_tag_configs (tagClaimDetection already has a default-config path; treat a missing/empty table as 'use default'), customer_activity_log, public_audits, network_metrics_snapshots, identity_false_positive_reports.

CANONICAL MODULES (do not duplicate): import { hashIdentifier } from '@/lib/identity/hash'; import { normaliseEmail, emailRoot, normaliseAddress } from '@/lib/identity/normalise'; createServiceClient from '@/lib/supabase/server'.

RULES: no \`as any\` and no \`as never\` casts in production code (fix the type properly — read lib/supabase/types.ts shapes); no eslint-disable; do not alter UI/JSX structure or scoring/weights; preserve exported function names+signatures (adapt internals). When a legacy column has no v2 source, omit it / render an honest empty state — do not invent values. After editing, run \`npx tsc --noEmit\` and iterate until it reports ZERO errors repo-wide (other clusters run in parallel touching different files, so if you see errors ONLY in files outside your list, note them but do not edit those files).`;

const CLUSTERS = [
  {
    key: 'claims-reports-dashboard',
    files: [
      'app/(app)/claims/page.tsx',
      'app/(app)/reports/page.tsx',
      'app/api/reports/claims/route.ts',
      'app/(app)/dashboard/page.tsx',
      'app/(app)/dashboard/dashboardPageUtils.ts',
    ],
    extra: `These read merchant_claims (->claims), merchant_case_outcomes (->claim_outcomes), TABLES.CUSTOMER_PROFILES (->identities, service client + k-anon), TABLES.AUDIT_TRANSACTIONS (->source_orders), evidence_packages (NO v2 equiv -> degrade: no evidence badge/count). The claims queue page (app/(app)/claims/page.tsx) is the hardest: claims no longer have customer_id/shop_domain/shopify_order_id. Rework enrichment: for each claim, join source_orders via source_order_id to get order_number + email (customer display) and the identity_id for grade (read identities via service client only when merchant_count>=3 OR own signals). claim_outcomes has exactly one row per claim (claim_id UNIQUE) — fetch by .in('claim_id', ids) without the latest-by-updated_at dedupe. Remove the merchant_case_outcomes/evidence_packages fallback-query hacks and the \`as any\` casts. Read the imported ClaimRow/CustomerProfileSummary/EvidencePackageRow types and the client component (ClaimsQueueClient) to keep the rendered shape stable — map v2 fields onto the same view-model the JSX expects (e.g. provide customer display name/email from source_orders.email, order ref from source_orders.order_number, grade from identities.confidence_grade; evidence -> null).`,
  },
  {
    key: 'shopify-connection-and-orders',
    files: [
      'lib/shopify/connectionStatus.ts',
      'lib/shopify/persistOAuthConnection.ts',
      'lib/shopify/auditBridge.ts',
      'lib/shopify/profileLinking.ts',
      'lib/shopify/backfill.ts',
      'lib/shopify/identity.ts',
      'app/api/shopify/disconnect/route.ts',
      'app/api/shopify/status/route.ts',
      'app/api/customers/[id]/shopify-orders/route.ts',
      'lib/customers/commerceOrders.ts',
      'lib/support/intake/commerceOrderLookup.ts',
    ],
    extra: `shopify_merchants + merchant_shopify_connections -> store_connections (platform='shopify', store_key=shop_domain, status, uninstalled_at, credentials_encrypted). shopify_order_signals + merchant_identities + TABLES.AUDIT_TRANSACTIONS -> source_orders (and source_customers for customer fields); order lookups become source_orders by (merchant_id, source='shopify', external_id or order_number). persistOAuthConnection: upsert store_connections onConflict (platform,store_key); encrypt the token — REUSE an existing credential encrypt helper if one exists for shopify, else store via the same scheme other platforms use in lib/commerce/credentialCrypto.ts (do NOT store plaintext). connectionStatus/disconnect: read/update store_connections (disconnect -> status='revoked', uninstalled_at=now). profileLinking.ts may be large and partly dead — port the reachable reads; if a function is unreachable/dead on v2, you may delete it (note deletions). lib/shopify/identity.ts upsertMerchantIdentityRows writes the dropped merchant_identities table — if still imported by reachable code, repoint to source_customers/source_orders or make it a documented no-op only if truly unused (grep importers first).`,
  },
  {
    key: 'commerce-connections',
    files: [
      'lib/commerce/connectionStore.ts',
      'lib/commerce/resolveMerchantForStore.ts',
      'lib/commerce/connectionStatus.ts',
      'lib/commerce/woocommerce/auditBridge.ts',
      'lib/commerce/woocommerce/settingsConnection.ts',
      'lib/commerce/bigcommerce/connectionSettings.ts',
      'lib/commerce/bigcommerce/auditBridge.ts',
      'app/api/bigcommerce/callback/route.ts',
    ],
    extra: `commerce_store_connections -> store_connections. Keep platform discrimination (woocommerce|bigcommerce; this cluster must NOT touch shopify rows beyond shared helpers). Preserve credential encrypt/decrypt via lib/commerce/credentialCrypto.ts. settingsConnection/connectionStatus read connection state -> map to store_connections columns (status, last_sync_at, last_error, scopes). bigcommerce/callback upserts the connection after OAuth -> store_connections onConflict (platform,store_key=store_hash). Remove \`as never\` casts; type against lib/supabase/types.ts.`,
  },
  {
    key: 'search-audit-pages',
    files: [
      'app/api/search/route.ts',
      'app/(app)/audit/[runId]/page.tsx',
      'app/api/audit/[runId]/customer/route.ts',
      'lib/analysis/entityResolution.ts',
      'lib/supabase/merchantHelpers.ts',
    ],
    extra: `customer_profiles -> identities (+identity_profiles) via service client + k-anon; customer_profile_audit_appearances / audit_customer_summaries / audit_result_summaries -> NO v2 equiv: the audit-run "appearances/summaries" are derivable from source_orders + identity_signals provenance, but if non-trivial, degrade the section to empty rather than fabricate. audit_transactions -> source_orders. evidence_packages (search) -> degrade. search/route.ts: search the merchant's own source_customers/source_orders by email/order; identity grade enrichment via hashed-email lookup (hashIdentifier(normaliseEmail(x))) against identity_members -> identities (service client). Keep result JSON shape stable.`,
  },
  {
    key: 'team-audit-presence-support',
    files: [
      'app/api/team/route.ts',
      'app/api/team/[memberId]/permissions/route.ts',
      'app/api/audit-trail/route.ts',
      'lib/permissions/audit.ts',
      'app/(app)/settings/audit-trail/page.tsx',
      'lib/supabase/getMerchantDataPresence.ts',
      'lib/support/intake/linkSupportCase.ts',
    ],
    extra: `merchant_members -> merchant_users (use TABLES.MERCHANT_MEMBERS which already maps; columns: id, merchant_id, user_id, invited_email, role, invite_status, invited_by, accepted_at — there is no separate "name"; use invited_email). user_action_log + user_permission_grants NOW EXIST in v2 (recreated) with the columns in the schema facts — keep using them. merchant_claims -> claims; customer_profile_identities -> identity_members; shopify_order_signals -> source_orders; customer_activity_log -> NO v2 equiv (degrade to empty in getMerchantDataPresence). linkSupportCase.ts: it links support tickets to claims/customers — repoint merchant_claims->claims and customer_profile_identities->identity_members; if it references legacy customer_profiles linkage that no longer maps, prefer source_customers (merchant_id, external_id/email) + identity_members hash lookup. getMerchantDataPresence: "does this merchant have any data" — count source_orders / claims / source_tickets instead of legacy tables.`,
  },
  {
    key: 'degradations-misc',
    files: [
      'lib/evidence/buildPackage.ts',
      'lib/customers/activityLog.ts',
      'app/api/customer/report-false-positive/route.ts',
      'app/api/cron/process-csv-queue/route.ts',
      'lib/support/intake/tagClaimDetection.ts',
      'lib/api/v1/lookup.ts',
      'app/api/customers/[id]/cross-merchant/route.ts',
      'app/api/account/delete/route.ts',
      'lib/api/v1/audit.ts',
      'lib/api/lookup/performMerchantLookup.ts',
      'lib/api/gorgias/performWidgetContextUnlock.ts',
      'app/api/lookup/quick-score/route.ts',
    ],
    extra: `customer_notes -> identity_notes (buildPackage). customer_activity_log -> NO v2 equiv: make activityLog.ts writes/reads a safe no-op/empty (do not throw). processing_jobs -> sync_jobs; processing_job_chunks -> sync_job_chunks (report-false-positive, cron/process-csv-queue). merchant_claim_tag_configs -> degrade to the existing default-config path (tagClaimDetection already supports usingDefaultConfig). order_claim_context (v1/lookup) -> NO v2 equiv: drop that enrichment, keep the lookup working from claims + identity_profiles. fraud_entities (cross-merchant route) -> use lookup_network_identity RPC / identities+identity_profiles for cross-merchant counts (k-anon). evidence_packages (account/delete) -> drop that delete step (table gone). access_audit_log NOW EXISTS (recreated) — keep those audit-insert writers (v1/audit, performMerchantLookup, performWidgetContextUnlock, quick-score) writing to it with the schema-fact columns.`,
  },
];

phase('Migrate');
const results = await parallel(
  CLUSTERS.map((c) => () =>
    agent(
      `You are migrating ONE disjoint cluster of files to the Unauth v2 Supabase schema. Repo root: /Users/malikibrahim/Downloads/Unauth.\n\nCLUSTER: ${c.key}\nFILES YOU OWN (edit only these; other clusters own other files in parallel):\n${c.files.map((f) => '  - ' + f).join('\n')}\n\n${SCHEMA}\n\nCLUSTER-SPECIFIC GUIDANCE:\n${c.extra}\n\nPROCEDURE: (1) Read each file you own AND any types/client-components it imports that determine the rendered/returned shape. (2) Repoint every legacy .from() and column reference to v2 per the facts above; remove as any/as never. (3) For no-v2-equivalent data, degrade to honest empty/zero. (4) Run \`npx tsc --noEmit\` and fix every error in YOUR files; iterate. Report errors that remain ONLY in files you do not own.\n\nReturn a STRICT JSON object: {"cluster":"${c.key}","filesChanged":[...],"filesDeleted":[...],"degraded":["table: what you did"],"tscErrorsInMyFiles":0,"tscErrorsOtherFiles":["path: msg"],"notes":"<=400 chars"}`,
      { label: `migrate:${c.key}`, phase: 'Migrate' }
    )
  )
);

phase('Verify');
log('Migration cluster agents complete. Returning structured results for central verification.');
return { clusters: results };
