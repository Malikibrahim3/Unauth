# Unauth Launch Blueprint

> **Execution is being handed to Codex — see [`CODEX_HANDOFF.md`](./CODEX_HANDOFF.md)** for file-level
> instructions, tooling/verification protocol, and domain gotchas. This doc holds the scope + status.
> Widget-network decision (locked): **disable the data source**, don't rewrite the state machine.

> Decision-locked execution spec from the 2026-07-10 audit. Each **batch** is a
> coherent unit that lands complete + typecheck/tests-green before the next.
> Legend: 🔴 BLOCKER · 🟠 MAJOR · ⚪ MINOR · ✅ done.
>
> **Launch surface:** Shopify + Gorgias + AfterShip + ShipBob, paid tiers, pilot
> merchants. **Store-scoped only** — no cross-merchant/network at launch (data
> density not there yet). **No CSV upload** — data arrives via live integrations
> plus a 24-month auto-backfill on first connect (already built:
> `INTEGRATION_BACKFILL_MONTHS = 24`).

---

## Locked decisions
1. Billing: **free trial + growth + pro + enterprise (contact sales)**. Drop the `scale` tier.
2. Documents: **PDF upload** (courier/warehouse liability docs → manual terms → what's owed). **No AI extraction** yet (steering). **CSV is dead.**
3. Cross-merchant / network: **removed** for launch. Keep **store-scoped fraud scoring** (it's live-wired into customer views + the Gorgias widget).
4. ShipBob: **build** connect/sync → warehouse accountability evidence (feeds `warehouse_error`).
5. Woo/BigCommerce: **hide** (webhook routes + settings pages) behind "coming soon".
6. Product gating: **enforce** the existing tier matrix.
7. `review_worthy`/`order_value`: **remove** (set by the dead CSV/fraud worker).
8. Gorgias gate: unknown types → manual review ✅; match order by email when no ref (Batch 6).
9. Account deletion / GDPR: **rebuild** on v2.
10. Old DB password in history: **leave** (rotated, dead).

> **MVP+ source architecture override (see `docs/product/SOURCE_AGNOSTIC_MVP_PLUS.md`).**
> Revises locked decisions #2 and #5 for architecture only: a **new canonical CSV
> importer** (distinct from the dead fraud-worker CSV) plus canonical webhook / API /
> manual intake are now in scope, and WooCommerce/BigCommerce are registered truthfully in
> the connector runtime while their merchant-facing cards stay "coming soon"
> (`launchVisible: false`). Launch connector set (Shopify/Gorgias) is unchanged; the
> architecture must simply not depend on it.

---

## ✅ Done (2026-07-10)
- Applied the 3 stuck migrations (accountability suite, loss-attribution enum, `rule_evaluations.rule_snapshot`); unblocked + applied the buggy 20260708; created `founding_merchant_applications` (+grants) and the `pack-confirmation-photos` bucket.
- All 5 cron routes accept GET; scheduled the 2 that never ran.
- Shopify webhook returns 500 on failure (retries instead of dropping).
- Registered `user_action_log` + `user_permission_grants` in the scoped client.
- Collector uses `getAppUrl()`; added 6 env vars to the Zod schema.
- Gorgias gate: unknown claim types → manual review (no more forced `item_not_received`).
- **Tiers simplified to 4** (free / pro / growth / enterprise). `scale` folded into `enterprise` as the full top tier; internal PlanId `scale` retained (matches DB/Stripe) and now resolves to the `enterprise` tier — fixed a latent crash where a `scale` plan resolved to a non-existent tier. Updated 7 tests to the 4-tier model + the Shopify 500-retry behavior.
- Typecheck + lint clean, 1596 tests pass.

- **Product-gating wired** on the applicable routes via a shared `enforceEntitlement` guard (`lib/product/requireEntitlement.ts`): customers search → `CUSTOMER_SEARCH`, customer dossier → `CUSTOMER_DOSSIER`, Gorgias widget → `HELPDESK_WIDGET`. These features are on all tiers, so it's a no-op today but enforces correctly once tiers diverge / `ENFORCE_PRODUCT_GATES` is on. `/api/lookup` + `/api/lookup/quick-score` deliberately NOT gated: they're the in-app credit-metered path (not the enterprise API) AND are already broken under v2 (missing `search_customer_profiles` RPC / dead `fraud_entities`) — deferred to Batch 2/3.

- **Credit RPCs restored** (`20260710130000_restore_context_credit_rpcs.sql`). Root cause: the 5 functions (`consume_context_credits_if_available`, `deduct_merchant_credits`, `reset/set_merchant_monthly_credits`, `add_merchant_topup_credits`) were defined pre-cutover but lost in the 2026-06-11 v2 rebuild — their tables (`merchant_credits`, `context_credit_events`, `credit_topup_log`) survived, the functions didn't. Re-created verbatim from the team's tested `billing_lifecycle` migration. Model matches choice (A): materialised `merchant_credits` balance + append-only `context_credit_events` ledger. Verified live: `set` → ok, `consume 2` → `{ok, used:2, remaining:498}` decrementing correctly and writing a ledger row.

- **Batches 2-7 completed by Codex.** Network disclosure data sources are disabled in the widget and customer surfaces; CSV/fraud-upload and legacy audit routes are retired; evidence/profile-token artifacts are restored on v2 (`20260710140000`, `20260710140100`) and REST-verified; PDF agreements now use merchant-entered approved terms; ShipBob PAT connect/sync writes warehouse evidence; Gorgias uses a guarded email-order fallback; GDPR deletion targets production-confirmed v2 tables/storage; `/eval` is retired; WooCommerce/BigCommerce are coming-soon only.
- Final engineering gate: 0 source TypeScript errors, 0 lint errors in changed files (pre-existing hub warnings only), and exactly 1596/1596 Jest tests passing.

**✅ Batch 1 COMPLETE.** Remaining config is Malik-only: set Stripe price IDs for growth/pro (+ top-up) in Vercel; note the `plans` table still carries old seed pricing (pro 99 / growth 399) that differs from `tiers.ts` (249 / 599) — reconcile pricing before enabling paid billing.

---

## Batch 1 — Billing, tiers & gating 🔴 (paid launch depends on this)
- Simplify `lib/billing/tiers.ts` to 4 tiers (remove `scale`; fix `TIER_ORDER`, `minimumTierForFeature`, pricing UI).
- Strip network features from the matrix (`network_signal_enrichment`, `identity_graph`) and rewrite taglines to store-scoped language (no "network history").
- Wire the 5 `TODO(product-gating)` routes to `can()` / entitlement: customers search, customer detail, lookup, quick-score, gorgias widget.
- Author the missing credit RPCs against the existing model: `consume_context_credits_if_available`, `reset/set_merchant_monthly_credits`, `add_merchant_topup_credits`. Migration + push + verify.
- **Malik:** set `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TOPUP` in Vercel; confirm enterprise = contact-sales form.

## Batch 2 — Remove cross-merchant / network surface ✅ COMPLETE
**Complete.** The widget and customer network data sources are disabled, network entitlements/copy and checkout cross-merchant hits are removed, and legacy audit/lookup surfaces are retired. The dormant widget state machine remains intentionally intact.
Done:
- ✅ Deleted `/network-metrics` (unlinked internal dashboard, queried the nonexistent `network_metrics_snapshots`).
- ✅ Deleted `app/api/customers/[id]/cross-merchant/route.ts` (zero frontend callers).
- `/global` already just redirects to `/customers` (harmless legacy stub — left as-is so old links don't 404).
- Verified: 0 source type errors, 1596 tests pass. (Stale `.next/` validator refs to the deleted routes clear on next build.)

Remaining (deep / interconnected — needs focused attention + real widget verification):
- **Widget `network_match` state** — woven into `lib/gorgias/widgetData.ts`'s state machine + confidence-grade resolution and `computeWidgetReviewLevel`. RECOMMEND: disable the network *data source* (make the k-anon `lookup_network_identity` path return null so the widget naturally never enters `network_match`) rather than ripping out the state machine — far lower risk, reversible.
- **Tier network features** — `network_signal_enrichment` + `identity_graph` in `tiers.ts`, plus `NETWORK_GRAPH` in `entitlementBridge`/`entitlements`/`entitlements.types` and their tests, plus "network history" taglines. Compiler-guided chain (like the `scale` removal).
- **checkout-signal cross-merchant device hits** (`app/api/checkout-signals/ingest/route.ts` `updateCrossMerchantDeviceHits`).
- **Legacy fraud-audit UI** `crossMerchantTxIds` in `app/(app)/audit/[runId]/*` (overlaps Batch 3 fraud removal).
- **Copy**: chargebacks `EvidenceDetailPageView.tsx:237` cross-merchant disclaimer → reword to store-scoped. (Landing FAQ already correctly says "no cross-merchant profile".)
- The two broken lookup routes (`/api/lookup`, `/api/lookup/quick-score`) — resolved here or Batch 3.

## Batch 3 — Remove CSV / fraud-upload surface ✅ COMPLETE
**Complete.** CSV entry points, worker/chunk processing, legacy audit/inbox routes, and dropped v1 table dependencies are removed without changing frozen scoring calibration.
- Remove CSV upload UI + `lib/processing/worker.ts` fraud path + chunk pipeline + the missing `/api/process-csv-chunk` references + `review_worthy`/`order_value` in `merchantHelpers`.
- Then audit the remaining legacy fraud-audit pages (`/watchlist`, `/audit/[runId]`, `/lookup`, `/store`) and decide keep vs remove — data now comes from live integrations + the 24-month backfill.

## Batch 4 — Evidence & documents ✅ COMPLETE
**Complete.** Production has v2 evidence packages/download tokens/profile tokens/reference RPCs; create/PDF/download paths are merchant-scoped; agreement PDFs require manual approved terms; provider availability reflects fetch success.
- Rebuild `evidence_packages` + `evidence_download_tokens` on v2; re-point the evidence create/list/PDF/download routes; author `generate_evidence_reference`.
- Verify + complete the PDF document feature end-to-end: upload (`integration-documents` bucket) → manual terms → `agreements`/`agreement_rules` → attribution. Extraction stays manual.
- Tie AfterShip (and ShipBob) evidence "available" flags to actual fetch success, not just credential presence.

## Batch 5 — ShipBob warehouse accountability ✅ COMPLETE
**Complete.** ShipBob PAT verification, encrypted merchant credentials, reference-order sync, timeline/return normalization, and warehouse evidence are wired.
- Add connect + api-key + sync branches (mirror AfterShip structure) pulling pick/pack/ship + fulfillment → warehouse evidence feeding `warehouse_error` attribution. Flip the reject in `connect/route.ts` + `api-key/route.ts`.

## Batch 6 — Gorgias email-match + account deletion ✅ COMPLETE
**Complete.** Gorgias falls back to the newest unambiguous merchant order for the requester email; GDPR deletion purges production-confirmed v2 rows/storage; the missing-schema `/eval` page is retired.
- Gorgias gate: when no order ref, match the order by customer email (most-recent, with a guard against ambiguous matches to avoid mis-attribution), then auto-evaluate.
- Rebuild the account-delete cascade + orphan cleanup onto v2 tables (`identity_profiles` etc.); build or retire `/eval` (`eval_history`).

## Batch 7 — Hide Woo/BigCommerce ✅ COMPLETE
**Complete.** Both platforms are non-connectable coming-soon cards, direct settings pages redirect to the hub, and dormant backend/webhook routes remain untouched.
- Hide the `/settings/integrations/woocommerce` + `bigcommerce` pages and connect UI behind "coming soon"; leave webhook routes dormant.

---

## Config & verification — Malik (cannot be coded)
- Vercel: `SHOPIFY_WEBHOOK_SECRET` = `SHOPIFY_API_SECRET`.
- Vercel: `CRON_SECRET` + `NEXT_PUBLIC_APP_URL` set; Stripe price IDs (Batch 1).
- Commit + deploy (crons/webhook/migrations only take effect on deploy).
- Prod smoke test: Shopify order→webhook, Gorgias ticket→widget→gate, 5 crons run, Stripe test purchase→credits, two-merchant isolation, widget in a real Gorgias account.
