# 02 — Merchant Journeys

Each journey: goal · preconditions · expected path · observed implementation · friction/failure points · recovery · status · evidence · required changes · acceptance scenarios.

**Coverage note:** journeys touching Security/Isolation and Integrations are agent+lead verified; the operational-UX journeys (onboarding, case review, exceptions, reporting UI) are `NOT VERIFIED` because those domain agents did not complete (spend limit). They are included with what is known from source + the required verification.

---

## J1 — Brand-new merchant signs up → first value  *(SCN-018, ONB-*, JRN-001..006)*
- **Goal:** reach a trustworthy first case without an engineering project.
- **Expected:** create/accept workspace → confirm name/tz/currency/role → recommended source categories → skippable connectors with honest limited states → starter rule or manual-review → "complete" only when healthy data exists.
- **Observed:** `app/onboarding/*` + `ensureMerchantContextForUser` + `ACTIVE_MERCHANT_COOKIE` exist; setup-progress/merchant-setup-state libs exist.
- **Status:** ⚪ **NOT VERIFIED** — onboarding domain agent did not run.
- **Friction (suspected):** ONB-003 "complete requires healthy capability + useful data" and JRN-002 "skipping produces honest limited state, not fake 100%" need verification; no evidence yet either way.
- **Required:** audit onboarding for skip-consequences, resumability, and no-fake-live-data.
- **Acceptance:** SCN-018 — with no sources connected, the shell works, every page has an honest first-use state, and no live totals/fake records appear.

## J2 — Connect a store → import → webhook/pull → reconcile → reconnect → disconnect  *(JRN-010..015, INT-*, CON-*)*
- **Goal:** connect once, trust health, repair without duplicating data.
- **Observed / status:** 🟢🔵 **PARTIAL.**
  - **Shopify:** OAuth connect, backfill, HMAC webhook, sync-audit reconcile, disconnect, real `/shop.json` health probe — genuinely live for orders/refunds/fulfilments. Disputes capability advertised beyond pilot scope.
  - **Gorgias:** connect, backfill, auto webhook registration, deleted-ticket reconciliation, real `/users/me` probe, disable — genuinely live.
  - **ShipBob:** verified adapter, import/sync/webhook/disconnect (removes provider subscriptions), controlled validation script — live (labelled "beta", honest under-claim).
- **Failure points:** **Zendesk/Freshdesk/UPS/FedEx advertised "live" but not** — no controlled proof, no real health probe (helpdesks), no reconciliation; carriers proof-lookup only. Generic disconnect route may fail for Zendesk/Freshdesk (connection lives in a different table).
- **Recovery:** reconnect via re-run of install/verify; disconnect retains history (category-driven revoke).
- **Required:** B1 (downgrade false-live + real probes); verify reconnect-no-duplication (INT-006/SCN-008) at runtime.
- **Acceptance:** SCN-007 (stale/revoked), SCN-008 (reconnect no dup), SCN-014 (partial/planned honest).

## J3 — Connection succeeds but initial sync is slow  *(JRN-004, UX-006, RLY-002)*
- **Status:** ⚪ **NOT VERIFIED** — background-job observability (job states/progress/attempts/last-error, navigate-away safety) is the un-run ingestion domain. `sync_jobs` table + `cron/process-sync-jobs` exist; merchant-facing progress not verified.

## J4 — Connection / sync partially fails  *(JRN-015, CON-007/012, STA "import partially failed")*
- **Status:** ⚪ **NOT VERIFIED** — differentiation of rate-limit/outage/credential/mapping/internal failure and the "successful vs failed records, downloadable errors, retry subset" state not audited. CSV partial-import (SCN-015) also unverified.

## J5 — Credentials expire / permissions revoked  *(SCN-007, FRS-002, INT-004)*
- **Status:** 🟢 **PARTIAL.** Real effective-health verification exists for Shopify/Gorgias/ShipBob (probes, `last_verified_at`, `cron/verify-connections`). **Absent for Zendesk/Freshdesk** (health from a stored flag) and **weak for UPS/FedEx** (token-refresh only, no data read). So a revoked Zendesk/Freshdesk token can keep showing healthy.
- **Required:** B1 — real probes for all `live` providers.

## J6 — Import real customers/orders/products  *(OBJ-005/006, canonical model)*
- **Status:** ⚪ **NOT VERIFIED** — canonical object-model read/write completeness is un-audited. Tables exist (`source_customers/orders/order_lines/payments/…`); population from each source not runtime-traced. `e2eOrder1013Chain.test.ts` suggests a traced chain exists — run it.

## J7 — Duplicate / conflicting customer identities  *(SCN-004, IDN-003, JRN-080)*
- **Status:** ⚪ **NOT VERIFIED** — identity/exceptions domain un-audited. `record_match_candidates`/`record_match_resolutions` tables + `matchScorer` + `identityMatchGating` test exist, suggesting weak-evidence → candidate/exception is modelled; **must verify** no auto-merge on weak signals and merge/unmerge reversibility (CUS-003).

## J8 — Build & save a segment
- **Status:** OUT_OF_SCOPE / N/A — the MVP+ contract has **no segmentation/campaign product** (Unauth is payout-control, not marketing). The generic audit brief's "segment" journey does not map to this product; the analogous surface is **saved filters on Payout Control** (PCL-006), which is ⚪ NOT VERIFIED. No fabricated segmentation feature should be built.

## J9 — Segment is empty / changes over time
- **Status:** N/A (see J8). Analogous: empty/partial/stale queue states (STA-*) — ⚪ NOT VERIFIED.

## J10 — Create → preview → test → edit → activate a rule/flow  *(RUL-*, FLW-*, SCN-005/017)*
- **Status:** ⚪ **NOT VERIFIED** — rules/flows domain un-audited. `lib/rules/versioning.ts` (draft/published/retired), `rules/simulate`, `workflows/test`, `merchant_rule_versions` exist, suggesting versioning + simulation are implemented; **must verify** rule-version-as-evaluated snapshot (SCN-017) and override-preserves-original (SCN-005), and that a rule/flow cannot itself execute a refund/external message (RUL-006/FLW-006).

## J11 — Some recipients cannot legally/safely receive a communication
- **Status:** N/A at MVP+ — Unauth records decisions; the merchant communicates via its own channels (GOV-001/SCP-103/SCP-109). No customer-messaging pipeline exists to gate. Confirm during the un-run journeys audit that no eligibility gate is implied elsewhere.

## J12 — A send partially fails / retries / delivers twice
- **Status:** N/A for customer sends (no send pipeline). The analogous integrity requirement — **one refund/webhook cannot create two financial entries** — is 🔵 PARTIAL (webhook idempotency proven; full duplicate-financial-effect guard recommended in `05 §4`).

## J13 — Pause / cancel / edit something already scheduled  *(recovery chase, snooze)*
- **Status:** 🔵 **PARTIAL.** Recovery: `chase_due` scheduling is idempotent and does not fabricate a chase (SCN-016, PASS). Case snooze route exists (`claims/[claimId]/snooze`) — LIF-003 "snooze changes visibility not truth" not fully verified.

## J14 — Interpret results & attribution  *(reporting, MET, RPT)*
- **Status:** 🔵 **PARTIAL.** Dashboard + reports share one metric service (RPT-004 PASS). **Drill-down to underlying cases/ledger (REL-007/JRN-100), metric definitions, and export reconciliation (RPT-001/002/003) are ⚪ NOT VERIFIED** — reports domain un-audited.

## J15 — Two merchants simultaneously; neither sees the other's data  *(SCN-013, GOV-012)*
- **Status:** 🟢 **PARTIAL / High risk.** Scoping holds in every reviewed vector (customer search, evidence download, connector callbacks) and there is broad unit isolation coverage. **But** isolation is by hand-written convention on ~163/179 routes with partial RLS, and **the authenticated cross-merchant boundary is never exercised live** (`sourceAgnosticRls` skipped). This is the single most important assurance gap.
- **Required:** B2 (systematise) + B3 (live suite).
- **Acceptance:** SCN-013 — no read/write/existence/mutation/job/notification crosses the boundary, proven by a live suite.

## J16 — Team member with restricted permissions  *(SCN-012, ACC-002)*
- **Status:** 🔵 **PARTIAL.** Server denies via `requirePermission`/`requirePagePermission` (no state change on denial). **Gaps:** viewer role is over-permissioned by default (has `EXPORT_AUDIT`/`VIEW_SETTINGS`/`VIEW_TEAM`); denied deep-links redirect **silently** (no explanation); denied attempts are **not logged**; two denial tests are stale/red.
- **Required:** B10 (right-size viewer), B11 (denied UX + logging), B5 (fix tests).

## J17 — External platform delayed / unavailable / sends duplicate events  *(SCN-002, RLY-006, CON-004)*
- **Status:** 🔵 **PARTIAL.** Duplicate webhook deliveries are deduped (`claimProcessedWebhook`, proven). **Out-of-order handling (SCN-002), provider-outage graceful degradation (RLY-006), and full reconciliation are ⚪ NOT VERIFIED** (ingestion domain un-audited). Webhook replay defence is missing for support providers (B6).

## J18 — Disconnect a store / close the account  *(PRV-002/003, SET-004, INT-007)*
- **Status:** 🔵 **PARTIAL.** Full account deletion is thorough and owner-only (strength). Provider disconnect is category-driven and retains history; **but** only ShipBob writes a disconnect audit event, the generic route may fail for Zendesk/Freshdesk, and the UI does not state post-disconnect data consequences. Merchant-facing data removal targets **legacy tables only** (PRV-002), and there is **no per-customer erasure** (PRV-004).
- **Required:** B7.

---

## Cross-cutting acceptance scenario status (from `01 §17`)

Proven/PASS: SCN-016. Partial (code correct, live/UX unverified): SCN-002, SCN-007, SCN-009, SCN-010, SCN-011, SCN-012, SCN-013, SCN-014. Not verified: SCN-001, SCN-003, SCN-004, SCN-005, SCN-006, SCN-008, SCN-015, SCN-017, SCN-018.

**The single most important trace — source → case → decision → outcome → loss → recovery → payment/write-off — is NOT end-to-end verified in this pass.** The model and arithmetic for its financial and recovery segments are proven correct in code, and an `e2eOrder1013Chain` test exists, but the full chain was not traced on a running/controlled merchant. Completing that trace (SCN-001 + SCN-009) is a launch precondition.
