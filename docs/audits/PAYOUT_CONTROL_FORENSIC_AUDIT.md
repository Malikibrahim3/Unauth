# Unauth Payout-Control Forensic Audit

## Executive Summary

This repository only partially matches the new payout-control product direction described in `docs/product/MVP_STEERING.md` and `README.md`.

The product docs and several new implementation slices are pointed in the right direction: `support_payout_cases` exists as the mapped case table, payout/recovery fields have been added, `/claims`, `/recoveries`, `/partners`, `/rules`, and `/dashboard` contain new payout-control copy, the Gorgias widget template is a four-row payout card, and the required verification commands all pass.

The live product is not yet end-to-end payout-control. The core workbench, APIs, rule engine, status model, tests, and many shipped routes still come from the older claim/customer/identity/network product. The highest-risk gaps are not cosmetic: merchant recommendations are still generated through a risk-score/identity rule engine by default; recovery cases can be created as a side effect of evaluating a claim decision; the recovery board omits active statuses; live APIs still accept `blacklist` and `suspected_fraud`; and there is no first-class support payout case detail route independent of customer identity pages.

Bottom line: the repo has a credible payout-control scaffold, but it still behaves like a partially re-skinned identity/claim-intelligence app. It is not MVP-ready for the new product direction without focused stabilization across routing, domain vocabulary, rule evaluation, recovery workflow, schema artifacts, and acceptance tests.

## Severity Counts

| Severity | Count |
| --- | ---: |
| Critical | 4 |
| High | 15 |
| Medium | 10 |
| Low | 5 |

## Critical Issues

### CR-1. Core case workflow is still claim/customer/identity rooted

The source of truth says the top-level object is a support payout case, with the customer only as context. The live workflow still routes the full review under `/customers/[id]/claims`, exposes `/api/claims` everywhere, maps `identity_id` to `customer_id`, and uses customer identity/risk context as a primary workbench column.

Evidence:

- `app/(app)/claims/ClaimsQueueClient.tsx` sends review links to `/customers/${claim.customer_id}/claims?claimId=${claim.id}`.
- `components/claims/claimReviewState.ts` fetches `/api/customers/${profileId}` before `/api/claims`.
- `app/(app)/customers/[id]/claims/page.tsx` hosts the full claim review.
- There is no first-class `/claims/[id]` or `/support-payout-cases/[id]` route in the build output.

Impact: agents still experience the product as "review this customer/claim" rather than "control this payout case." This conflicts with the new hierarchy in `MVP_STEERING.md`.

### CR-2. Merchant recommendations are still risk-score and identity/network driven

The rules page and default rules still center risk score bands and identity/network fields. `lib/rules-engine.ts` describes a fraud rules engine and exposes fields like `network_claim_count`, `has_cross_merchant_identity`, `network_merchant_count`, `is_network_flagged`, and `evidence_score` labeled as risk score.

Evidence:

- `lib/rules-engine.ts:4` says "Merchant-configurable fraud rules engine."
- `lib/rules-engine.ts:81-92` labels identity/network/risk-score fields.
- `lib/rules/riskBands.ts:61` formats conditions as "risk score is between..."
- `components/rules/RulesPageClient.tsx:243` titles the page "Risk Controls."
- `components/rules/RulesPageClient.tsx:283` says higher scores mean stronger behavioural risk and network signals.
- `app/api/rules/defaults/route.ts` creates `DEFAULT_RISK_CONTROLS`.

Impact: the recommendation line can still be driven by the old "risk controls" model, not by merchant payout policy such as amount at risk, requested action, evidence strength, claim type, loss attribution, and recoverability.

### CR-3. Recovery workflow can hide active cases and creates cases as a decision side effect

Recovery is a core MVP workflow, but the board omits valid active statuses and the decision endpoint can create a recovery case merely by evaluating a recommendation.

Evidence:

- `lib/recoveries/types.ts` defines statuses including `draft`, `waiting_response`, `partially_approved`, `rejected`, and `appealed`.
- `lib/recoveries/status.ts` board columns omit `draft`, `waiting_response`, `partially_approved`, `rejected`, and `appealed`.
- `app/(app)/recoveries/RecoveryBoardClient.tsx` has quick actions that move cards into omitted statuses, making them disappear from the board.
- `app/api/claims/[claimId]/decision/route.ts:44` calls `maybeCreateRecoveryCaseFromSupportPayoutCase` during decision evaluation.
- `lib/recoveries/status.ts:16` maps `chase_due` to event type `chased`, which records a chase as done when the status is only due.

Impact: the recovery board can lose visible work, and recovery cases are not clearly agent-created or decision-created. That undermines the MVP requirement for a recoverable workflow with clear ownership and outcome tracking.

### CR-4. Prohibited outcome vocabulary remains in live decision paths

The new product direction avoids fraud accusations and blacklisting language. Live schemas and handlers still accept and process those concepts.

Evidence:

- `lib/claims/store.ts:21-22` accepts decisions including `blacklist` and outcomes including `suspected_fraud`.
- `app/api/claims/[claimId]/reverse/route.ts:11-12` accepts the same values.
- `lib/claims/statusMachine.ts:53-54` treats `blacklist` and `legitimate` as status inputs.
- `lib/claims/customerResponses.ts:40` branches on `blacklist` and `suspected_fraud`.
- `lib/claims/events.ts:137` labels `blacklist` as "Blacklisted" and `lib/claims/events.ts:148` labels `suspected_fraud`.

Impact: a live agent or API path can still record and potentially expose old accusation-style semantics. That is both a product-direction conflict and a compliance/copy risk.

## High Issues

### H-1. Support payout case status taxonomy is not aligned

The steering doc expects a payout case lifecycle such as `new`, `waiting_evidence`, `manual_review`, `recovery_opened`, and `closed`. The live queue still uses `pending`, `open`, `escalated`, and resolved claim statuses.

Evidence: `lib/claims/sla.ts:1`, `app/api/claims/[claimId]/status/route.ts:12-17`, `app/(app)/claims/page.tsx` allowed statuses.

### H-2. `/api/claims` prevents multiple payout events per order and misses core fields

`app/api/claims/route.ts` deduplicates by `source_order_id` and returns a 409 if a claim already exists for that order. The payload schema and route also do not capture first-class `requested_action`, evidence checklist inputs, recommendation inputs, or explicit payout outcome fields.

Impact: one order can have multiple post-purchase payout events, but the API treats the order as having only one active/resolved claim.

### H-3. Decision endpoint formats legacy recommendations

`app/api/claims/[claimId]/decision/route.ts:43` calls `formatClaimDecisionRecommendation(result.evaluation, result.ruleCount)` without `result.payoutCase`. The formatter only emits payout-specific language when a `SupportPayoutCase` is passed.

Impact: the API can return the old `Approve payout / Manual review / Deny under policy` style even when payout case data exists.

### H-4. Gorgias widget is four rows, but the data contract still carries legacy identity context

The registered widget template is aligned with the four-row direction:

- `lib/support/gorgias/registerSidebarWidget.ts:125-128` labels `Case`, `Evidence`, `Rule`, and `Recovery`.
- `lib/support/gorgias/registerSidebarWidget.ts:160-163` renders exactly those four fields.

However, `lib/gorgias/widgetJson.ts` still defines and returns a much larger legacy payload containing `identity`, `claims`, `orders`, `claim_rate`, `primary_reason`, `recent_activity`, `ce3_evidence`, `evidence_summary`, `evidence_breakdown`, and `watchlisted`. `app/api/gorgias/widget/route.ts` also has an identity fallback path that evaluates rules from widget identity signals when no claim is resolved.

Impact: the registered card is close, but the underlying contract and fallback behavior still allow old identity-context behavior to drive helpdesk output.

### H-5. Helpdesk intake creates claims without payout-case primitives

`lib/support/intake/v2Bridge.ts` creates records through `TABLES.MERCHANT_CLAIMS` with `claim_type`, `status: 'open'`, `detection_method`, and `requires_review`, but does not set requested action, amount at risk, evidence state, attribution, or recoverability.

Impact: Gorgias/Freshdesk ingestion can create the row, but the row is not a complete support payout case without later inference.

### H-6. Merchant claim-tag config is hard-coded and uses old trigger language

`lib/support/intake/tagClaimDetection.ts` says the per-merchant config table was dropped and every merchant uses built-in defaults. Default tags include `fraud` and `fraud_suspected`.

Impact: merchants cannot tune their support payout case detection, and helpdesk case creation still starts from old claim/fraud semantics.

### H-7. Evidence checklist is not fully integration-backed

`lib/payouts/evidenceChecklist.ts` can render a broader template, but many steering-required items are only `not_tracked` placeholders unless already represented by old evidence probes. Examples include delivery-photo proof, signature detail, pick/pack record, packaging condition, received-item photos, and return labels.

Impact: the MVP "evidence checklist" exists visually but is not yet a reliable operational checklist.

### H-8. Partner rulebook is create/read only and create permissions are too broad

`app/api/partners/route.ts` and `app/api/partner-recovery-rules/route.ts` use a shared `requireSettingsContext` that checks `PERMISSIONS.VIEW_SETTINGS` for both GET and POST. The store exposes create/list but no update, delete, deactivate, or versioning path.

Impact: users with view-only settings permission can create partners/rules, while admins cannot maintain a real operational rulebook.

### H-9. Recovery API is not full workflow API

Only `app/api/recoveries/[id]/status/route.ts` exists under `app/api/recoveries`. There is no list/create/detail/edit endpoint, no evidence attachment route, no partner submission route, and no direct recovery case creation route.

Impact: the recovery board cannot support a complete recovery workflow without relying on server-rendered pages and status-only mutation.

### H-10. Schema artifacts are inconsistent

The migration set adds payout/recovery objects, but schema artifacts are not stable.

Evidence:

- `supabase/full_schema.sql` has 0 lines.
- `lib/supabase/types.ts` lacks `recommended_payout_action`, `recommended_rule_name`, `recommended_rule_id` on `support_payout_cases`, and lacks `recommended_payout_action` / `followed_recommendation` on `claim_outcomes`, despite `supabase/migrations/20260619140000_payout_recommendation_outcomes.sql`.
- Older migrations still reference `public.claims`, for example `supabase/migrations/20260616100000_merchant_rules.sql:78`.

Impact: fresh rebuilds, generated types, and runtime migrations can drift. The build passes because several code paths use loose typing or table shims.

### H-11. Reports are still audit/network intelligence, not payout/recovery analytics

`app/(app)/reports/ReportsPageView.tsx:31` says "Store and network intelligence from customer, order, claim, and source-case records." `app/(app)/reports/page.tsx` still loads processing jobs, audit transactions, grade buckets, match-rate trends, and identity confidence data.

Impact: the analytics page does not yet match the new business KPIs: payout exposure reviewed, prevented payouts, recovered amount, unrecovered amount, partner win rate, evidence gaps, and rule performance.

### H-12. Customers remains a primary identity/network surface

The navigation includes Customers under Operations, and the customer profile still exposes identity confidence, network footprint, linked identities, watchlist action, raw PII details, and cross-merchant context.

Impact: customers are not merely context. They remain a primary investigation product, which conflicts with the steering doc unless deliberately gated as legacy/admin context.

### H-13. Legacy routes and APIs still ship

The production build includes `/lookup`, `/global`, `/watchlist`, `/catches`, `/chargebacks`, `/audit`, `/network-metrics`, `/api/fraud-feedback`, `/api/lookup`, `/api/watchlist`, `/api/catches`, and many `/api/v1/*` identity/evidence endpoints.

Impact: the product still exposes old surfaces unless hidden by entitlement or navigation only. Hidden routes are still route-addressable.

### H-14. Permission names and gates still reflect the old product

Core payout case actions use `PERMISSIONS.SUBMIT_FRAUD_FEEDBACK` in `app/api/claims/route.ts`, `app/api/claims/[claimId]/outcome/route.ts`, `app/api/claims/[claimId]/status/route.ts`, and related handlers. Partner and partner-rule creation use `VIEW_SETTINGS`.

Impact: permission intent is unclear and least-privilege behavior is likely wrong.

### H-15. Tests are green but do not prove payout-control readiness

`npm test` passes 170 suites and 1,464 tests. The suite is still dominated by identity, linker, eval, fraud-language, customer, and old claim semantics. There are some payout unit tests, but no broad end-to-end acceptance test for:

- Gorgias ticket to support payout case.
- Four-line widget output for resolved and unresolved payout cases.
- Agent decision to outcome.
- Recovery case creation by explicit agent action.
- Partner rulebook match to recovery board.
- Dashboard/reports payout metrics.

Impact: CI can be green while the new MVP flow is broken or incomplete.

## Medium Issues

### M-1. Payout enums do not fully match steering

`lib/payouts/types.ts` uses requested actions such as `refund`, `reship`, `replacement`, `discount`, `store_credit`, `escalation`, and `unknown`, but the steering doc also expects `return_label` and `investigation`. Evidence strength uses `moderate` and `missing` while steering expects `medium` and `unknown`. Recoverability uses `not_recoverable` and `needs_more_evidence` while steering expects `unrecoverable`, `prevention_only`, and `unknown`.

### M-2. Claim type taxonomy is incomplete

`components/claims/claimReviewTypes.ts` and helpdesk classifiers still use older types such as `missing_parcel`, `damaged`, `wrong_item`, `refund_request`, `chargeback`, and `return_abuse`. Steering expects broader support payout case types including `missing_item`, `late_delivery`, `replacement_request`, `returnless_refund`, `store_credit_request`, `chargeback_related`, and `policy_exception`.

### M-3. Claims list still centers customer and confidence

The queue shows customer display names and a confidence/risk badge prominently. The payout-specific work exists, but the primary scan pattern is still customer identity first, requested action/loss owner second.

### M-4. Dashboard is closer, but metrics are partial and status-dependent

`app/(app)/dashboard/page.tsx` and `lib/dashboard/payoutDashboardMetrics.ts` contain good payout/recovery metrics, but the calculations depend on legacy status values and do not yet cover complete partner performance, rule performance, final unrecovered loss, or all closed recovery states consistently.

### M-5. Recovery status event semantics are off

`lib/recoveries/status.ts` maps `chase_due` to the event type `chased` and updates `last_chased_at` when setting status to `chase_due`. That makes a due action look completed.

### M-6. Logged-in `/login` redirect points to old/nonexistent route

`proxy.ts` redirects an already logged-in user from `/login` to `/upload`. The production build output does not include `/upload`; the current product default appears to be dashboard/claims oriented.

### M-7. Navigation still carries legacy command entries

`lib/navigation/appRoutes.ts` hides some old routes from primary navigation, but still includes legacy command-palette entries such as evidence packages under `/chargebacks`.

### M-8. Package and script identity is still `parcelclaim`

`package.json` still uses `"name": "parcelclaim"`, and verification output reports `parcelclaim@0.1.0`.

### M-9. Support intake response shape still returns `merchant_claim_id`

`lib/support/intake/ingestSupportCase.ts` returns `merchant_claim_id`, `claim_reason`, `is_claim`, and `claim_type`. This is acceptable during transition, but the public shape does not match the new support payout case language.

### M-10. Help pages still foreground identity matching

The build includes `/help/identity-matching`, `/help/confidence-grades`, and `/help/how-it-works`. If those pages remain accessible in the new MVP, they reinforce the old product frame.

## Low Issues

### L-1. Internal comments and tests still contain old terminology

Internal-only references to fraud, fraud entities, identity scores, and ParcelClaim remain throughout tests and scripts. Some may be acceptable as archived or internal fixtures, but they make future audits noisy.

### L-2. Test output is noisy

`npm test` passes but emits repeated console warnings/errors, including mocked `captureTicketIdentitySignalsV2 failed`, in-memory rate-limit warnings, legacy eval logs, and identity/linker debug output.

### L-3. `supabase/rebuild` snapshots amplify stale search hits

The broad banned-term and product-term searches are heavily amplified by rebuild snapshots. That is not necessarily a runtime issue, but it makes forensic review harder.

### L-4. Product-gating TODOs remain

Several app routes and APIs contain `TODO(product-gating)` comments for customer, lookup, global, and claim surfaces. This suggests legacy-route access is known but unresolved.

### L-5. README is directionally aligned but not backed by all shipped surfaces

`README.md` now describes payout control well, but the codebase still ships legacy identity, lookup, watchlist, audit, and network intelligence experiences.

## A. Product-Direction Mismatch

The repo has moved its docs and some UI copy toward payout control, but the behavioral center is still mixed.

Aligned areas:

- `README.md` and `docs/product/MVP_STEERING.md` clearly define post-purchase payout control and recovery.
- `lib/supabase/tables.ts` maps `MERCHANT_CLAIMS` to `support_payout_cases`.
- `/claims` uses "Payout Control" copy and includes payout exposure, recoverability, attribution, and recovery fields.
- `/recoveries` and `/partners` are new operational surfaces.
- The Gorgias registered widget is a four-row payout decision card.

Not aligned areas:

- The full case review is customer-scoped.
- Customers are still primary navigation and a major identity/network investigation surface.
- Rule recommendations are still "Risk Controls."
- Reports still emphasize store/network intelligence and audit jobs.
- Legacy routes still build and ship.

Conclusion: the repo is in a transition state, not a completed product pivot.

## B. Domain Model Terminology Drift

Terminology is inconsistent across layers.

Old terms still live in public or semi-public surfaces:

- `/api/claims`, `merchant_claim_id`, `claim_type`, `claim_outcomes`, `claim_events`, `claim_evidence`.
- `SUBMIT_FRAUD_FEEDBACK`.
- `blacklist`, `suspected_fraud`, `fraud_flags`.
- `Risk Controls`, `risk score`, `network signals`, `identity confidence`.

Some of this can remain internally during a staged rename, but the current drift affects API behavior, page copy, permissions, and agent workflows.

## C. Route/Navigation Mismatch

The route tree is much broader than the new MVP:

- New surfaces: `/claims`, `/recoveries`, `/partners`, `/rules`, `/dashboard`.
- Legacy surfaces still built: `/lookup`, `/global`, `/watchlist`, `/catches`, `/chargebacks`, `/audit`, `/store`, `/network-metrics`, `/eval`.
- Legacy APIs still built: `/api/fraud-feedback`, `/api/lookup`, `/api/watchlist`, `/api/catches`, `/api/evidence`, `/api/v1/customers`, `/api/v1/lookup`, `/api/v1/evidence`.

`proxy.ts` exists and protects routes, but it does not product-gate these legacy surfaces. It also redirects logged-in `/login` users to `/upload`, which is not in the build output.

## D. Data Model/Schema Drift

There is real schema progress:

- `support_payout_cases` exists.
- `partners`, `partner_recovery_rules`, `recovery_cases`, and `recovery_case_events` exist.
- Payout columns exist on the renamed case table.
- Recovery status and owner enums exist.

The drift risks are substantial:

- `supabase/full_schema.sql` is empty.
- `lib/supabase/types.ts` is stale relative to latest payout recommendation migrations.
- Child tables still use `claim_id` by design, but older migrations also reference `public.claims`.
- `rule_evaluations` still audits identity signals and legacy recommendation values.
- `claim_outcomes` still uses claim decision/outcome enums, not the steering agent-decision model.

## E. Claims/Payout Case Workflow Gaps

The workbench includes payout details, but the workflow is still claim-first.

Key gaps:

- No first-class support payout case detail route.
- Case lifecycle statuses do not match steering.
- `/api/claims` dedupes by order.
- Outcome decisions still use legacy values.
- Recommendation follow-through compares against values that the schema does not accept, such as `manual_review`.
- Review forms and state live under customer profile state.

The product needs a clean "support payout case" contract before the UI can be trusted.

## F. Evidence Checklist/Integration Gaps

The checklist is a useful start, but it is not yet a full evidence system.

Current evidence support appears strongest for:

- Tracking.
- Proof of delivery.
- Carrier/delivery status.
- Customer statement/evidence.
- Order contents and inspection-style evidence where present.

Weak or placeholder areas:

- Delivery-photo proof beyond basic delivered-scan support.
- Signature and delivery photo detail.
- Pick/pack record and packing slip.
- Packaging condition and item photos.
- Return labels and return receipt data.
- Chargeback-specific evidence package continuity.

The Gorgias widget and case review can therefore imply evidence completeness that is only partially backed by integration data.

## G. Rules/Recommendation Gaps

The new product requires merchant-rule-led recommendations. The repo has a rule system, but it is not yet the right rule system.

Gaps:

- Rule builder categories still include identity and network fields.
- Defaults are risk score bands.
- Recommendation actions are internally `approve`, `manual_review`, and `deny`, then mapped to payout recommendations later.
- The decision endpoint formatting bug can return the old recommendation wording.
- `formatFollowedRecommendation` style logic does not fully match accepted outcome decisions.

The recommendation model should be refactored around payout-case facts and merchant policy, not retrofitted from identity risk controls.

## H. Recovery Workflow Gaps

The recovery domain is promising but incomplete.

What exists:

- Recovery case table and store helpers.
- Recovery board.
- Partner rule matching.
- Status mutation endpoint.
- Dashboard metrics that read recovery data.

What is missing or risky:

- Board columns omit valid statuses.
- Status-only API, no complete CRUD/submission workflow.
- Auto-create side effect during decision evaluation.
- No explicit agent action to open recovery.
- Partner rulebook is not maintainable after creation.
- Status semantics for `chase_due` and `chased` are mixed.

## I. Dashboard/Reporting Gaps

The dashboard is closer to the target than reports.

Dashboard:

- Good payout/recovery KPIs are present.
- Metrics still depend on legacy status and outcome values.
- Partner/rule/evidence performance is incomplete.

Reports:

- Still loads audit jobs and identity grade buckets.
- Still frames itself as store/network intelligence.
- Does not yet provide a clean payout-control reporting experience.

## J. Integrations/Webhook Gaps

Shopify/Gorgias/Freshdesk plumbing exists, but the support payout case model is not fully captured at ingestion time.

Gaps:

- Gorgias/Freshdesk intake creates or confirms claims, not complete payout cases.
- Helpdesk tag configuration is hard-coded and defaults to old claim/fraud tags.
- Widget fallback can show identity context only when claim resolution fails.
- The widget payload is larger than the four-line payout card and retains old fields.
- Case creation does not capture requested action, amount requested, or full evidence state from the ticket.

## K. Tests/Build Gaps

Required commands:

- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm test`: passed, 170 suites and 1,464 tests.

The green result does not prove MVP readiness. The suite still contains a large identity/eval/compliance legacy footprint, with only partial payout/recovery unit coverage and no complete acceptance path for the steering-doc workflow.

Missing test coverage:

- Gorgias ticket to support payout case to widget decision.
- Case review under first-class payout case route.
- Evidence checklist completeness.
- Merchant payout rules without identity/risk fields.
- Agent decision outcome vocabulary.
- Explicit recovery creation and board visibility across every status.
- Partner rulebook update/deactivate.
- Dashboard and report payout KPIs.

## L. Privacy/Compliance Risk

The main privacy/compliance risk is not just wording. It is product shape.

Risks:

- Customers and customer profiles expose identity details, linked identities, network footprint, watchlist controls, and raw PII.
- Cross-merchant/network context remains prominent in customer and rule surfaces.
- `blacklist` and `suspected_fraud` still exist in live APIs.
- Helpdesk defaults include `fraud` tags.
- Legacy lookup/watchlist/global routes still build.

These may be acceptable as internal/admin legacy surfaces only if strongly gated and removed from the MVP path. They are not safe as default support-agent surfaces for payout control.

## Recommended Fix Order

1. Establish the first-class support payout case contract.
   Create or complete a case detail route, API namespace, statuses, requested-action taxonomy, agent-decision taxonomy, and outcome model that match `MVP_STEERING.md`. Keep any claim aliases internal only.

2. Replace the risk-control recommendation engine with payout-policy rules.
   Remove identity/network/risk-score defaults from merchant-facing rule configuration. Base recommendations on amount at risk, requested action, evidence strength, merchant policy, attribution, recoverability, and partner rules.

3. Stabilize recovery as an explicit workflow.
   Add complete recovery case CRUD/detail/submission APIs, show all statuses on the board, fix `chase_due` semantics, and remove recovery creation as a passive decision-evaluation side effect.

4. Align schema artifacts and generated types.
   Regenerate `lib/supabase/types.ts`, rebuild `supabase/full_schema.sql`, verify fresh migration order, and make latest recommendation/outcome columns typed.

5. Collapse legacy identity/customer/network surfaces out of the MVP path.
   Gate or hide lookup, global, watchlist, catches, chargebacks, audit, identity help pages, and customer identity views unless explicitly needed as admin/context.

6. Rebuild Gorgias/support intake around payout cases.
   Capture requested action, amount, case type, evidence state, ticket/order references, and merchant tag config at ingestion time.

7. Replace reports with payout-control analytics.
   Prioritize payout exposure reviewed, prevented payouts, recovered amount, unrecovered amount, evidence gaps, partner recovery rate, and rule follow-through.

8. Add product acceptance tests.
   Keep existing safety tests, but add steering-doc workflow tests that fail when the product regresses into identity/risk behavior.

## Do Not Fix Yet

Per the audit prompt, no product code, schema, route, test, migration, copy, or refactor fixes were applied during this pass.

Do not start by renaming every `claim` identifier. Several child tables intentionally retain `claim_id`, and a broad rename would create noise before the product contract is stable.

Do not delete legacy routes before deciding whether they are admin-only, archived, or still needed for migrations/support.

Do not rework tests before defining the new acceptance cases; otherwise the suite may become less informative.

Do not change permissions piecemeal. First define payout-case, recovery, partner-rule, and settings permission boundaries.

The only file created by this audit is this report: `docs/audits/PAYOUT_CONTROL_FORENSIC_AUDIT.md`.

## Appendices

### Commands Run

```bash
npm run typecheck
```

Result: passed.

Key output:

```text
> parcelclaim@0.1.0 typecheck
> tsc --noEmit
```

```bash
npm run build
```

Result: passed.

Key output:

```text
Next.js 16.2.7 (Turbopack)
Compiled successfully
Generating static pages (79/79)
```

Relevant route evidence from build output:

```text
/claims
/customers
/customers/[id]/claims
/recoveries
/partners
/rules
/reports
/lookup
/global
/watchlist
/catches
/chargebacks
/audit
/api/fraud-feedback
/api/lookup
/api/watchlist
/api/catches
/api/partner-recovery-rules
/api/partners
/api/recoveries/[id]/status
```

```bash
npm test
```

Result: passed.

Key output:

```text
Test Suites: 170 passed, 170 total
Tests: 1464 passed, 1464 total
Snapshots: 1 passed, 1 total
```

Other audit commands:

```bash
find . -maxdepth 2 \( -name 'middleware.ts' -o -name 'middleware.js' -o -name 'proxy.ts' -o -name 'proxy.js' \) -print
```

Result:

```text
./proxy.ts
```

```bash
find app -maxdepth 3 -type d | sed 's#^app##' | sort
```

Used to map live route groups and legacy route surfaces.

```bash
wc -l supabase/full_schema.sql lib/supabase/types.ts README.md docs/product/MVP_STEERING.md package.json
```

Result:

```text
0 supabase/full_schema.sql
2791 lib/supabase/types.ts
92 README.md
1156 docs/product/MVP_STEERING.md
130 package.json
```

```bash
find app/api/recoveries app/api/partners app/api/partner-recovery-rules app/api/rules -maxdepth 4 -type f | sort
```

Used to verify recovery/partner/rule API coverage.

```bash
git status --short
```

Result: worktree was already dirty before the audit report was written. Existing modifications were not changed or reverted.

### Search Terms Used

Broad product-direction and legacy vocabulary searches:

```bash
rg -n "fraudster|bad actor|blacklist|suspicious|offender|abuser|verdict|fraud score|risk profile" app components lib docs README.md tests supabase || true
rg -n "fraudster|bad actor|blacklist|suspicious|offender|abuser|verdict|fraud score|risk profile" app components lib docs README.md tests supabase/migrations supabase/full_schema.sql || true
```

Payout/control vocabulary:

```bash
rg -n "claim|claims|support_payout_case|support_payout_cases|payout|recovery|recoveries|partner|rulebook" app components lib docs README.md tests supabase/migrations supabase/full_schema.sql || true
```

Customer/identity/network vocabulary:

```bash
rg -n "customer|identity|network|cross-merchant|cross merchant" app components lib docs README.md tests supabase/migrations supabase/full_schema.sql || true
```

Legacy/TODO searches:

```bash
rg -n "TODO|FIXME|HACK|temporary|legacy|compat" app components lib docs README.md tests supabase/migrations supabase/full_schema.sql || true
```

Recommendation/schema drift searches:

```bash
rg -n "recommended_payout_action|recommended_rule_name|recommended_rule_id|followed_recommendation" lib/supabase/types.ts supabase/migrations app lib components tests || true
rg -n "public\.claims|support_payout_cases|recovery_cases|recovery_case_status|recommended_payout_action|claim_outcomes|claim_evidence|rule_evaluations" supabase/migrations supabase/full_schema.sql lib/supabase/types.ts || true
```

Rules/risk searches:

```bash
rg -n "Risk Controls|risk score|identity|network|fraud|Default Policy|Use Default Policy|cross-merchant" app/'(app)'/rules components/rules lib/rules lib/rules-engine.ts tests/unit/claimDecision.test.ts tests/unit/payouts tests/lib/recommendedActionDeprecation.test.ts || true
```

Outcome/status searches:

```bash
rg -n "PAYOUT_RECOMMENDATION_VALUES|AGENT_DECISION|OUTCOME|blacklist|suspected_fraud|manual_review|approved|denied|escalated" lib/claims lib/payouts components/claims app/api/claims supabase/migrations/20260619140000_payout_recommendation_outcomes.sql supabase/migrations/20260619120000_rename_claims_to_support_payout_cases.sql || true
```

Test-shape search:

```bash
find tests -type f | sed 's#^tests/##' | cut -d/ -f1 | sort | uniq -c | sort -nr
rg -n "Payout|Recovery|support payout|merchant rule|recommended_payout|followed_recommendation|risk score|identity|network|fraud" tests | head -n 240
```
