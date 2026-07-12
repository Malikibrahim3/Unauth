# Codex Handoff — Unauth Launch Work

You are picking up a launch-readiness effort mid-stream. This doc is self-contained:
it tells you the product direction, how to work in this repo safely, exactly what is
already done (don't redo it), and exactly what remains with file-level instructions.

**Companion docs (read once):**
- `docs/product/LAUNCH_BLUEPRINT.md` — the batch plan + running status (source of truth for scope).
- `docs/product/MVP_STEERING.md`, `PRODUCT_PRINCIPLES.md`, `TERMINOLOGY.md` — product direction + language rules.
- `CLAUDE.md` — hard engineering rules (below).

**Branch:** `codex/refocus-claim-gate-map`. Work here; there are already ~50 uncommitted changes from this effort (all verified green). Commit/push only when Malik asks.

> **Completion update (Codex, 2026-07-10):** Batches 2-7 below are complete. Production migrations through `20260710140100` are applied and REST-verified; source typecheck is clean and Jest is 1596/1596. The detailed instructions remain as an execution record, not remaining work. Only the Malik-owned configuration/deploy/smoke-test items in section 5 remain.

---

## 0. Product direction (what "done" means)

Unauth is a **post-purchase loss-accountability** platform (not cross-merchant fraud).
Launch surface: **Shopify + Gorgias + AfterShip + ShipBob**, **paid tiers**, pilot merchants.
Decisions locked with Malik:
1. Tiers: free / pro / growth / enterprise (enterprise = contact-sales). `scale` removed.
2. **Store-scoped only — NO cross-merchant / network** at launch (no data density yet). Keep store-scoped fraud scoring (it's live-wired into customer views + the Gorgias widget).
3. **No CSV upload.** Data arrives via live integrations + a **24-month auto-backfill** on first connect (already built: `INTEGRATION_BACKFILL_MONTHS = 24`).
4. Documents = **PDF upload** (courier/warehouse liability docs → manual terms → what's owed). Extraction stays **manual** (no AI extraction). This is the `agreements` feature, not CSV.
5. ShipBob = build connect/sync → warehouse accountability evidence (feeds `warehouse_error`).
6. Woo/BigCommerce = hide behind "coming soon".
7. Product gating = enforce the existing tier matrix.
8. GDPR account deletion = rebuild on v2 (launch requirement).

---

## 1. How to work in this repo (READ — non-obvious)

### Verify after EVERY change
- `npx tsc --noEmit` — **IGNORE** two classes of false positive: (a) anything under `.next/dev/types/` or `.next/types/` (stale generated route validators — they reference deleted/old routes like `automation-hero` and `network-metrics` and clear on the next real build); (b) the `automation-hero/page.js` ref. Filter with: `npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v '\.next/' | grep -v automation-hero`. That count must be 0.
- `npx jest --silent` — must stay **1596/1596 passing** (add/adjust tests when you change intended behaviour; don't just delete failing ones).
- `npx eslint <files>` — 0 new errors. Pre-existing test-file warnings exist; don't worry about those.

### Database migrations (prod is the only DB — there is no separate staging)
- The Supabase CLI is **linked and authenticated** to project `lquvbikyvmbjbfffrlky` (the committed pooler password was rotated and no longer works, but `supabase db push` / `migration list` work via the CLI's own auth — no password prompt).
- Add a file under `supabase/migrations/` named `YYYYMMDDHHMMSS_desc.sql`, then `npx supabase db push`. Each migration runs in its own transaction; wrap DDL in `BEGIN; … COMMIT;`.
- **Verify DB changes via REST** (don't assume). Keys are in `.env.local`:
  ```bash
  URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')
  SVC=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2- | tr -d '"')
  curl -s -H "apikey: $SVC" -H "Authorization: Bearer $SVC" "$URL/rest/v1/<table>?select=*&limit=0"   # 200 = exists
  curl -s -X POST -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" -d '{...}' "$URL/rest/v1/rpc/<fn>"
  ```
  **Gotcha:** a `404 PGRST202` on an empty `{}` RPC POST does NOT mean the function is missing — PostgREST matches by argument signature, so a function with required params returns 404 for `{}`. Verify RPCs by calling with real args.
- If you smoke-test an RPC against a real row, **restore the state** afterward (the demo merchant is `e464e5b4-544d-4e02-b9fc-0ae56112d784`).

### CLAUDE.md hard rules (enforced)
- **No `as any`** in production code — fix the type. **No `// eslint-disable`.**
- **Do NOT change scoring/weighting/matching/cluster logic** without explicit instruction (SIGNAL_WEIGHTS, fastScore thresholds, scorer.ts, linker.ts, weights.ts).
- All server env vars go through `lib/utils/env.ts` (Zod), not `process.env`.
- Before deleting an "unused" file, check `git log --diff-filter=A --format=%ci -1 -- <file>` — recent files are usually unwired new scaffolding, not dead code.
- Gorgias widget can only render native primitives (text/card/list), **no HTML/CSS**.

---

## 2. Already DONE this effort (do NOT redo — all verified green)

**DB (applied to prod, verified via REST):**
- Applied 3 stuck migrations: accountability/agreements/recovery-tasks suite (9 tables), `loss_attribution` enum (+`delivery_confirmed_evidence`/`repeat_claimant`/`policy_override`), `rule_evaluations.rule_snapshot`.
- `20260708120000_missing_account_eval_rpcs.sql` rewritten to guard its two functions on `customer_profiles`/`eval_history` existing (both absent in v2 → skipped cleanly). It no longer blocks the chain.
- Created `founding_merchant_applications` table + grants (`20260710120000`, `20260710120100`) → landing apply form no longer 500s.
- Created `pack-confirmation-photos` storage bucket.
- **Restored the 5 credit RPCs** (`20260710130000_restore_context_credit_rpcs.sql`): `consume_context_credits_if_available`, `deduct_merchant_credits`, `reset/set_merchant_monthly_credits`, `add_merchant_topup_credits`. They were lost in the June v2 rebuild; re-created verbatim from the tested `20260603200000_billing_lifecycle` migration. Verified working live.

**Code (tsc + 1596 tests green):**
- Cron routes: all 5 accept GET (Vercel's method); scheduled `billing-lifecycle` + `mark-stale-claims` in `vercel.json`.
- Shopify webhook returns **500 on processing failure** (retries instead of silently dropping) — `app/api/shopify/webhooks/route.ts`. `claimProcessedWebhook` treats only `completed` as duplicate, so retries reprocess.
- Registered `user_action_log` + `user_permission_grants` in `lib/supabase/scoped.ts` COLUMN_SCOPES (audit-trail + team-permissions APIs no longer throw).
- Collector script uses `getAppUrl()` not hardcoded prod URL — `app/api/shopify/collector-init/route.ts`.
- Added 6 env vars to the Zod schema (`AFTERSHIP_API_KEY`, `SHIPBOB_PAT`, `SHIPBOB_SANDBOX`, `PACK_CONFIRMATION_NOTIFY_URL`, `APP_URL`, `NEXT_PUBLIC_DEMO_MERCHANT_ID`).
- **Gorgias gate**: unknown claim types → manual review (no longer forced to `item_not_received`); gate auto-eval guarded on a mapped type — `app/api/gorgias/support-webhook/route.ts`.
- **Tiers → 4**: removed `scale` from `lib/billing/tiers.ts` (folded its full feature set into `enterprise`). Fixed a **latent crash**: PlanId `scale` (kept as the internal top-plan id — matches DB/Stripe) now maps to the `enterprise` Tier via `normalizeTier`; before, it resolved to a non-existent tier and crashed `can()`. Touched: `tiers.ts`, `normalizeTier.ts`, `plans.ts`, `subscriptionAccess.ts`, `contextCredits.ts`, `contextUnlockFlow.ts`, `resolveMonthlyCreditAllowance.ts`, `product/tiers.ts`, `product/devPreview.ts`, `DevTierSwitcher.tsx`, `ApiIntegrationsAdvancedSection.tsx`, + 7 tests.
- **Product gating wired** via new `lib/product/requireEntitlement.ts` `enforceEntitlement(client, merchantId, entitlement)` guard (no-op unless `ENFORCE_PRODUCT_GATES`): `customers/search` → `CUSTOMER_SEARCH`, `customers/[id]` → `CUSTOMER_DOSSIER`, `gorgias/widget` → `HELPDESK_WIDGET`.
- **Batch 2 started**: deleted `app/(internal)/network-metrics/` and `app/api/customers/[id]/cross-merchant/route.ts`.

---

## 3. Completed execution record (Batches 2-7)

### Batch 2 — finish cross-merchant/network removal

**2a. Widget network — DISABLE THE DATA SOURCE (my call; do this, not a state-machine rewrite).**
- File: `lib/gorgias/widgetDataV2.ts`. The k-anon network RPC is called at ~line 155 (`service.rpc('lookup_network_identity', …)`); the `network: NetworkStats | null` result is populated in the block starting `let network: NetworkStats | null = null;` (~line 248) through ~line 276, returned at ~286.
- Change: introduce a module const `const NETWORK_DISCLOSURE_ENABLED = false;` and wrap the network-population block so `network` stays `null` when disabled. Optionally skip the RPC call entirely when disabled to save the round-trip. Result: the widget never enters `network_match` (that state keys off `result.data.network !== null`), so it shows store-scoped context only. Reversible by flipping the flag.
- Do NOT delete the `network_match` state machine in `lib/gorgias/widgetData.ts` — leaving it dormant is intentional and low-risk.
- Verify: `npx jest tests/lib/widgetDataV2.test.ts` and the other gorgias/widget tests; adjust any test that asserted a network disclosure to expect none.

**2b. Tier network features + taglines** (compiler-guided, same method as the `scale` removal).
- `lib/billing/tiers.ts`: remove `network_signal_enrichment` and `identity_graph` from the `FeatureKey` union and from every tier's `features`. Reword taglines that say "network history / network participation" to store-scoped language (see `TERMINOLOGY.md`).
- `lib/billing/entitlementBridge.ts`: remove `NETWORK_GRAPH: 'identity_graph'` from `ENTITLEMENT_TO_FEATURE`.
- `lib/product/entitlements.ts`: remove `NETWORK_GRAPH` from `ENTITLEMENT_META`.
- `lib/product/entitlements.types.ts`: remove `NETWORK_GRAPH` from the `Entitlement` union.
- Run `npx tsc --noEmit` and fix every reference it flags (there will be a handful in tests: `tests/lib/billingTiers.test.ts`, `tests/lib/merchantLookupPrivacy.test.ts` — update assertions that reference `network_signal_enrichment`/`NETWORK_GRAPH`). Grep first: `grep -rn "network_signal_enrichment\|identity_graph\|NETWORK_GRAPH" app lib components tests`.

**2c. Checkout-signal cross-merchant device hits.**
- `app/api/checkout-signals/ingest/route.ts`: `updateCrossMerchantDeviceHits` (~line 326) and its call (~line 431). Remove the cross-merchant hit computation (and the missing `set_checkout_signal_cross_merchant_hits` RPC dependency); keep the store-scoped signal ingest. This route also depends on the missing `bulk_upsert_identity_identifiers` RPCs — see Batch 3 note. Decide with Batch 3 whether checkout-signal ingest ships at launch at all.

**2d. Copy.** `app/(app)/chargebacks/[id]/EvidenceDetailPageView.tsx:237` — reword the "cross-merchant identity match data" disclaimer to store-scoped language. (Landing FAQ `foundationContent.ts:552` already correctly says "no cross-merchant profile" — leave it.)

**2e. Legacy fraud-audit UI** (`crossMerchantTxIds` in `app/(app)/audit/[runId]/*`) — overlaps Batch 3; handle there.

### Batch 3 — remove CSV / fraud-upload surface
- Remove the CSV upload UI entry points and the fraud worker path: `lib/processing/worker.ts` (writes dropped v1 `fraud_entities`/`co_occurrences`), the chunk pipeline (`lib/processing/chunkedDispatch.ts` / `chunkQueue.ts` POST to the **nonexistent** `/api/process-csv-chunk`), and `review_worthy`/`order_value` in `lib/supabase/merchantHelpers.ts` + `lib/supabase/filters.ts` (`buildReviewableFilter`) + `COLUMNS.REVIEW_WORTHY` in `tables.ts` — those columns don't exist on v2 `source_orders` (`order_value` → the real column is `total_price`).
- The two lookup routes: `/api/lookup` depends on the **missing `search_customer_profiles` RPC**; `/api/lookup/quick-score` runs the legacy fraud scorer (`buildFastContext`/`scoreBatch` → dead `fraud_entities`). Decide: remove these routes, or (for `/api/lookup`) re-point to a store-scoped search. Both currently have `NOTE(product-gating)` headers explaining this.
- Then audit the remaining fraud-audit pages (`/watchlist`, `/audit/[runId]`, `/store`) and remove/keep per the store-scoped model. **Do not change scoring math** — only remove the dead cross-merchant/CSV wiring around it.
- ⚠️ Per `CLAUDE.md`, `lib/scorer.ts` and `lib/engine/fastScore.ts` thresholds are calibration-frozen. Removing the CSV *entry point* is fine; do not retune the scorer.

### Batch 4 — evidence & documents
- Rebuild `evidence_packages` + `evidence_download_tokens` on v2 and re-point the evidence create/list/PDF/download routes (`app/api/evidence/*`, `lib/api/v1/evidence.ts`, `lib/api/v1/issueEvidenceDownloadUrl.ts`, `app/(app)/dashboard/dashboardPageUtils.ts`). Author the missing `generate_evidence_reference` RPC. Also missing: `profile_view_tokens` (used by `customerProfilePageLoad.ts`, `profile-link` route, `widgetData.ts`).
- Verify + complete the PDF document feature end-to-end: upload (`integration-documents` bucket, exists) → manual terms → `agreements`/`agreement_rules` (tables exist) → attribution. The extract endpoint `app/api/integrations/documents/[id]/extract/route.ts` is intentionally a manual stub — keep manual.
- Tie AfterShip/ShipBob evidence "available" flags to actual fetch success, not credential presence — `lib/claim-gate/buildEvidence.ts` ~line 496 `connections`.

### Batch 5 — ShipBob warehouse accountability
- Add connect + api-key + sync branches mirroring AfterShip: `app/api/integrations/[provider]/connect/route.ts` (flip the reject ~line 44), `.../api-key/route.ts` (only allows `aftership` today, ~line 21), `.../sync/route.ts` (no shipbob branch, ~line 112–139). Pull ShipBob pick/pack/ship + fulfillment → warehouse evidence feeding `warehouse_error` attribution. `lib/integrations/providers/shipbob.ts` already declares `buildStatus: 'live'` and `buildEvidence` (`lib/claim-gate/buildEvidence.ts` `fetchShipBobEvidence`) already consumes a `SHIPBOB_PAT`; wire the merchant-credential path.

### Batch 6 — Gorgias email-match + GDPR account deletion
- Gorgias gate: when no order ref, match the order by customer email (most-recent; guard against ambiguous matches to avoid mis-attribution), then auto-evaluate — `app/api/gorgias/support-webhook/route.ts` (currently only evaluates when `order_ref || shopify_order_id`).
- Rebuild the account-delete cascade + orphan cleanup onto v2 tables — `app/api/account/delete/route.ts` references dropped v1 tables (`public_audits`, `csv_upload_queue`, `customer_profile_audit_appearances`, `customer_profiles`) and the guarded `delete_orphan_customer_profiles` RPC. Map to v2 equivalents (`customer_profiles` → `identity_profiles`, etc.) or drop the steps that no longer apply. Also `/eval` page needs `get_eval_history` + an `eval_history` table, or retire the page.

### Batch 7 — hide Woo/BigCommerce
- Hide `/settings/integrations/woocommerce` + `bigcommerce` pages and connect UI behind "coming soon"; leave the webhook routes dormant (they write dropped v1 tables — do not wire them).

---

## 4. Domain gotchas that will bite you

- **Tier vs PlanId duality:** `Tier` (`lib/billing/tiers.ts`) = free/pro/growth/enterprise (gating + display). `PlanId` (`lib/billing/plans.ts`) = free/pro/growth/**scale** (DB `plans` table + Stripe products — `scale` is the internal id for the Enterprise plan). `normalizeTier` maps planId `scale` → tier `enterprise`; `normalizePlanId` maps `enterprise` → `scale`. Don't "fix" this by renaming PlanId `scale` — that needs a DB/Stripe data migration.
- **Credit model:** materialized balance in `merchant_credits` (what the read path reads) + append-only ledger `context_credit_events`. `consume_context_credits_if_available` updates both atomically (advisory lock). Allowance comes from the plan/subscription, passed in as `p_monthly_allowance`.
- **Scoped client is fail-closed:** `lib/supabase/scoped.ts` throws on any `.from()` table not in `COLUMN_SCOPES` or `CALLER_SCOPED_TABLES`. If you route a new table through `createScopedClient`, register it (with its real `merchant_id` column) or it throws at runtime.
- **`plans` table pricing is stale:** seeded Pro £99 / Growth £399, but `tiers.ts` says £249 / £599. Reconcile before enabling paid billing (Malik config — see §5).
- **Stale `.next` type validators:** after deleting any route, `tsc` will show `.next/.../validator.ts` errors referencing the deleted path. Not real. `rm -rf .next` or a real build clears them.
- **Two independent scoring paths** (don't conflate): `lib/engine/fastScore.ts` (CSV pipeline) and `lib/scorer.ts` (identity resolution). Both are calibration-frozen.

---

## 5. Malik-only (cannot be coded — blockers for go-live)

- Vercel env: `SHOPIFY_WEBHOOK_SECRET` **must equal** `SHOPIFY_API_SECRET` (Shopify signs API-registered webhooks with the API secret; a mismatch 401s every webhook silently).
- Vercel env: confirm `CRON_SECRET` + `NEXT_PUBLIC_APP_URL` set; set `STRIPE_PRICE_GROWTH` / `STRIPE_PRICE_PRO` / `STRIPE_PRICE_TOPUP`.
- Reconcile `plans` table pricing with `tiers.ts` (§4).
- Commit + deploy (crons/webhook/migration code only take effect on deploy).
- Prod smoke test: Shopify order→webhook 200→case; Gorgias INR ticket→widget 4-line card→gate; trigger all 5 crons; Stripe test purchase→credits granted; two-merchant isolation (A can't see B); widget renders inside a real Gorgias account.

---

## 6. Suggested commit checkpoints
Commit after each batch (or sub-batch) with tsc+jest green, so regressions are bisectable. Example messages: `feat(billing): simplify to 4 tiers + wire product gating`, `chore(network): remove cross-merchant surface`, etc. End commit messages with the Co-Authored-By trailer per repo convention.
