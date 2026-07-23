# 04 — Implementation Backlog

Ordered by **dependency and risk**, not product area. Sizes: XS/S/M/L/XL. Each item lists linked requirement IDs, the merchant outcome, the problem, scope, likely files, dependencies, acceptance criteria, verification, and risk.

> Scope note: this backlog reflects the **audited** surface (Security, Integrations/providers, Financial/Recovery core, IA, RBAC, legacy) plus the audit-completion work. Additional P0/P1 items will surface once the 11 un-audited domains are audited (item B0).

---

## Launch-blocking (P0)

### B0 — Complete the truncated audit *(process, do first)*
- **Linked:** all `NOT VERIFIED` rows in `01`.
- **Outcome:** a launch decision made on a fully-audited P0 surface.
- **Problem:** 14 of 16 domain audits did not run (org spend limit); ~55% of requirements are unverified.
- **Scope:** re-run the domain audits for canonical-model, case/decision/evidence, rules/flows, customers/identity, overview/work/states, reports drill-down, search/notifications, ingestion/jobs, non-functional.
- **Files:** n/a (audit).
- **Dependencies:** budget/credits.
- **Acceptance:** every P0 requirement has an evidence-backed status.
- **Verification:** matrix has no P0 `NOT VERIFIED`.
- **Size:** L · **Risk:** high (decisions made on incomplete data otherwise).

### B1 — Truthful integration catalogue
- **Linked:** INT-002, INT-003, INT-004, REL-010, CON-002, SCN-014, QAT-005.
- **Outcome:** merchants only see "live" for sources that actually work end-to-end.
- **Problem:** Zendesk, Freshdesk, UPS, FedEx are `buildStatus:'live'` without controlled proof, effective-health probes, or (helpdesks) reconciliation; carriers report "verified" after only a token refresh.
- **Scope:** downgrade the four to `partial` (or `planned` where connect isn't real); enumerate supported/missing capabilities (INT-003); add real effective-health probes for Zendesk/Freshdesk and account-scoped tracking reads for UPS/FedEx before reporting "verified".
- **Files:** `lib/integrations/providers/{zendesk,freshdesk,ups,fedex}.ts`, `lib/connections/liveVerification.ts`, `lib/connectors/catalogue.ts (stageFor)`.
- **Dependencies:** none (metadata + probe change).
- **Acceptance:** no provider shows "live" without a controlled-account run proving connect/import/update/reconcile/disconnect (QAT-005); health derives from a real probe, not a stored flag.
- **Verification:** provider matrix re-run; a catalogue test asserts `live` ⇒ (executable adapter ∧ health probe ∧ e2e coverage).
- **Size:** M · **Risk:** low code risk, high trust risk if unfixed.

### B2 — Systematise tenant isolation
- **Linked:** SEC-001, GOV-012, ACC-001, SCP-011.
- **Outcome:** a single omitted filter cannot leak cross-tenant data.
- **Problem:** only 16/179 routes use the scoped client; ~163 rely on manual `.eq('merchant_id')`; RLS covers ~32 tables.
- **Scope:** route merchant reads/writes through `createScopedClient` **or** add `is_merchant_member` RLS to every `merchant_id` table as a backstop; add a static guard forbidding raw `createServiceClient().from(<merchant table>)` without a filter.
- **Files:** `lib/supabase/scoped.ts`, all `app/api/**/route.ts`, `supabase/migrations/*` (RLS), a new lint rule/test.
- **Dependencies:** none.
- **Acceptance:** every `merchant_id` table has RLS *or* a static check proves no unscoped service-role query; documented per-table decision.
- **Verification:** the new static guard passes; migration adds RLS; live test (B3).
- **Size:** L · **Risk:** medium (broad change; do incrementally with the guard as ratchet).

### B3 — Live authenticated cross-merchant isolation suite
- **Linked:** SEC-010, SCN-013, REL-008, QAT-002, QAT-009.
- **Outcome:** the real cross-tenant attack is proven impossible in CI.
- **Problem:** the only cross-tenant DB test is skipped and checks anon-only; SCN-013 is never exercised.
- **Scope:** staging suite where merchant B supplies merchant A's IDs across routes/APIs/search/exports/storage URLs/jobs/callbacks; standardise not-found responses so existence never leaks; un-skip `sourceAgnosticRls`.
- **Files:** `tests/security/*`, a new live suite; CI config.
- **Dependencies:** B2 (scoping to prove), live-DB harness.
- **Acceptance:** the suite runs (not skipped) and proves no read/write/existence/mutation/job/notification crosses tenants.
- **Size:** L · **Risk:** medium (needs isolated staging merchants).

### B4 — Durable, complete audit trail
- **Linked:** AUD-001, AUD-002, AUD-003, AUD-004, GOV-009, ACC-003, SEC-007.
- **Outcome:** every sensitive action leaves an immutable record.
- **Problem:** `logAction` is fire-and-forget (silent loss) and its action set omits decisions/reversals/attribution/recovery-transitions/identity-links/rule-publishes/exports.
- **Scope:** await audit writes (or route through the existing domain-event outbox with retry); extend the action enum + emit events at each site; add correlation id + effective/recorded time + system-actor flag; audit evidence export issuance & download.
- **Files:** `lib/permissions/audit.ts`, decision/recovery/rules/identity/export routes.
- **Dependencies:** OBS correlation ids (B-later).
- **Acceptance:** a test asserts each action class writes a durable append-only audit row; audit-insert failure is surfaced/retried.
- **Size:** L · **Risk:** low.

### B5 — Fix the red release gate + commit the auth refactor
- **Linked:** SEC-002, SEC-010, QAT-009.
- **Outcome:** `release:readiness` is green and represents reality.
- **Problem:** 2 suites fail — `routeSecurity` asserts the pre-refactor `{ denied }` page pattern; `caseContextDrawer` fails; and `lib/auth/requestContext.ts` (the refactor) is uncommitted/untracked.
- **Scope:** update `routeSecurity` assertions to the `requirePagePermission`/`if(!ctx) redirect` pattern (assert behaviour, not symbol names); fix `caseContextDrawer`; commit `requestContext.ts` + the modified pages.
- **Files:** `tests/api/routeSecurity.test.ts`, `tests/components/caseContextDrawer.test.tsx`, `lib/auth/requestContext.ts`, `app/(app)/{dashboard,claims}/page.tsx`.
- **Dependencies:** none.
- **Acceptance:** `npm test` and `npm run release:readiness` pass; no uncommitted auth code.
- **Size:** S · **Risk:** low.

### B6 — Webhook hardening
- **Linked:** SEC-004, SEC-005, SEC-009, CON-004.
- **Outcome:** forged/replayed webhooks cannot inject case signals; secrets don't leak.
- **Scope:** verify signature/secret **before** `JSON.parse` for BigCommerce + Gorgias/Zendesk/Freshdesk; add timestamp+nonce (or per-delivery dedupe) to support webhooks; stop accepting secrets via URL query param (header-only).
- **Files:** `app/api/bigcommerce/webhooks/route.ts`, `app/api/{gorgias,zendesk,freshdesk}/support-webhook/route.ts`, `lib/support/*/webhookAuth.ts`.
- **Dependencies:** provider capabilities (some helpdesks only send query-param secrets).
- **Acceptance:** each handler rejects unsigned/mis-signed bodies before parse; a replayed support delivery is rejected; no secret appears in a logged URL.
- **Size:** M · **Risk:** medium (must not break live Gorgias intake — coordinate with the working e2e suite).

### B7 — Canonical data removal + subject erasure
- **Linked:** PRV-002, PRV-004, PRV-003.
- **Outcome:** merchants can remove/hide operational data and honour a customer erasure request without deleting the workspace.
- **Scope:** repoint merchant bulk-removal at canonical v2 tables (soft-delete/hide preserving financial/audit rows); add a subject-erasure routine that pseudonymises `source_customers`/identity PII while keeping `case_financial_entries`/audit intact; implement a real retention job (replace the no-op purge cron); surface post-disconnect data consequences.
- **Files:** `app/api/settings/bulk-delete/route.ts`, new subject-erasure route, `app/api/cron/purge-expired-audits/route.ts`, integration disconnect routes + UI.
- **Dependencies:** identity hashing; financial invariants.
- **Acceptance:** merchant can hide canonical data; subject erasure masks PII + keeps reconcilable financial/audit rows + is itself audited; retention job records counts.
- **Size:** L · **Risk:** medium (must not violate append-only invariants — use the flag-gated purge pattern).

### B8 — Resolve the legacy fraud surface (decision needed)
- **Linked:** GOV-002, GOV-006, LIF-001, IA-006, TAX-002 + Register G.
- **Outcome:** no competing fraud-verdict product model can confuse merchants or drive recommendations.
- **Scope:** prove (via call-site + access-log analysis) whether `lib/engine`/`scorer`/`confidence`/`rules-engine.ts`, `app/api/v1/*`, `claim-gate`, `fraud-feedback`, `checkout-signals` are still wired; retire or firewall those that are; migrate the dual claim-status vocabulary to canonical-only on write paths; remove unused fraud RBAC capabilities; rename `parcelclaim` + relocate fraud fixtures.
- **Files:** Register G paths in `06-feature-inventory.md`.
- **Dependencies:** B0 (rules/canonical audit) to confirm recommendation independence.
- **Acceptance:** no recommendation/case path reads the fraud engine; a test asserts canonical-only statuses on write; legacy routes return 410/redirect.
- **Size:** L · **Risk:** high (must not remove a still-load-bearing path — the contract forbids treating legacy as dead without proof).

---

## MVP+ (P1)

### B9 — In-app PII masking by role/grant *(PRV-006)* — add a `VIEW_PII` capability; mask in-app for roles lacking it. Files: `lib/permissions`, `lib/privacy/mask.ts`, customer pages. Size: M.
### B10 — Right-size the viewer role *(ACC-002)* — remove default `EXPORT_AUDIT`/`VIEW_SETTINGS`/`VIEW_TEAM` from viewer; make audit/export grant-gated. Files: `lib/permissions/index.ts`. Size: S.
### B11 — Denied-state UX + attempt logging *(SCN-012)* — replace silent redirect with an explicit access-denied explanation + safe destination; log denied attempts. Files: RSC pages, `requirePagePermission`, `logAction`. Size: S.
### B12 — Shopify disputes capability honesty *(INT-003)* — mark the disputes capability scope-gated/unavailable when the grant lacks `read_shopify_payments_disputes`. Files: `lib/integrations/providers/shopify.ts`, sync route. Size: S.
### B13 — Upload validation confirmation *(SEC-006)* — verify/enforce MIME/size/content + attachment disposition on document/photo uploads; add tests. Files: `app/api/integrations/documents/upload`, `app/api/fulfillment/pack-confirmation`. Size: M.
### B14 — CSRF/SameSite posture *(SEC-008)* — confirm SameSite on the auth cookie; add step-up re-auth for account deletion + permission grants. Size: M.

---

## P2 hardening & polish

- **B15** — `/flows` UI ↔ `workflows` backend naming unification (dev clarity only). Size: S.
- **B16** — Audit-export content verification/implementation (AUD-005). Size: S.
- **B17** — Data-minimisation field-purpose map + prune unused raw payload fields (PRV-001). Size: M.
- **B18** — Correlation IDs across requests/webhooks/jobs (OBS-001) — unblocks richer audit (feeds B4). Size: M.

---

## Post-MVP (do not treat as gaps)

Cross-merchant benchmarking/network, autonomous refund/submit, no-code automation platform, customer-facing portal, native mobile, automatic contract extraction, accounting write-back — all correctly deferred by the contract and **not** currently exposed in conflict (Stripe held `slot_only`, no autonomous refund found). Keep them out.
