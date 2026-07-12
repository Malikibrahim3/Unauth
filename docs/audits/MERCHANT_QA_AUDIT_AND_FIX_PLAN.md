# Merchant QA Audit & Implementation Fix Plan

**Auditor:** Opus 4.8, acting as a skeptical ecommerce merchant / ops lead evaluating the product for adoption.
**Method:** Live in-browser walkthrough (authenticated as the seeded demo merchant) + adversarial codebase forensics (12 dimensions, 3 fully completed by background agents before an org spend limit halted the rest; the remaining 9 completed by direct inspection).
**Date:** 2026-06-20
**Scope:** No code was changed. This document is the fix plan for everything found.

> **One-line verdict:** The *engine* (rules, integrations, evidence, decision support) is real and unusually honest. The *experience a buyer actually sees* is a completely empty app — the flagship seeded demo merchant renders blank dashboards, a connect-wall on the core workflow, and three contradictory account-status messages at once. The product is **not currently demo-ready or sales-call-ready** because the canonical demo path shows nothing. Fixing ~6 P0/P1 data-plumbing bugs would flip it from "looks broken" to "looks strong."

---

## 1. Executive Verdict

### Blunt readiness calls

| Question | Answer |
|---|---|
| Merchant-ready (a real merchant could run daily loss ops)? | **No** — core workflow is connect-gated and the seeded data never reaches the UI. |
| Demo-ready (click around and be impressed)? | **No** — the canonical demo merchant shows empty dashboards everywhere except Rules. |
| Sales-call-ready? | **No, today. Yes, after the P0 seed/connection fixes.** A live screen-share would currently show a blank product. |
| Investor-demo-ready? | **Partial** — Rules + the honest integration architecture demo well; everything data-driven is empty. |
| Production-ready? | **No** — schema-cutover debt (seed and two product queries point at dropped v1 tables), `as any`/`as never` casts hiding dead table names, no root error boundary. |
| Would a real merchant understand what to do? | **Partial** — copy is clear, but "demo data" + "PROD" + "Setup incomplete" + "Showing existing data" simultaneously is disorienting. |
| Would a real merchant trust it? | **Mostly yes on substance** (no fake "connected" states, evidence-not-verdicts framing, merchant-decides disclaimer) — **but the contradictory status chrome and stale "Order Identity Review" title undercut it.** |

### Top 5 conversion killers
1. **The seeded/demo experience is empty everywhere** (dashboard, claims, customers, recoveries, reports all show "—"/0/connect-walls). A buyer self-serving a demo concludes the product does nothing. *(P0)*
2. **Core workflow is a connect-wall.** `/claims` ("Payout Control") renders only "Connect Shopify + Gorgias to use Payout Control" — there is no way to see the product's main value before completing OAuth for two external systems. *(P0)*
3. **Three contradictory account-status framings on every page** ("You're viewing demo data" + "PROD" badge + "Showing existing data"). Erodes trust in every number. *(P1)*
4. **Stale product title** "Unauth — Order Identity Review" in every authenticated browser tab — advertises a product that no longer exists. *(P3, but a credibility tell on a sales call)*
5. **Slow first paint on the make-or-break page** — `/settings/integrations` sits on "Loading integrations…" for >30s on cold load. The one page every empty-state CTA funnels to is the slowest. *(P2)*

### Top 5 retention killers
1. **No data ever appears even after seeding** — the seed scripts write to dropped v1 tables; the app reads v2 tables. A merchant who "set it up" still sees nothing. *(P0)*
2. **No proof of recovered money** — recovery outcomes depend on payment-dispute/chargeback/carrier-claim connectors that are slot-only (not built), so the headline ROI metric (`Amount recovered`) can never populate from real data today. *(P1)*
3. **Reports show "LIVE SOURCE" badges over empty sections** and mix "—" with "0" for the same empty state — the analytics that justify the spend look broken. *(P2)*
4. **Stale old-product surface leaks in** — "identity catches" UI still mounts inside the claim detail; `/audit`, `/catches`, `/global`, `/lookup`, `/watchlist` routes still exist; 85 `fraud`-word references remain in app/components. *(P2)*
5. **Semi-manual correspondence** — the claims flow still relies on a "copy customer response" paste step and manual order linking, despite recovery being marketed as "automation-first." *(P3)*

### Top 5 genuinely strong things
1. **Integrations are real and honest.** Shopify (OAuth+HMAC+token exchange+webhooks+Payments-dispute pull), Gorgias/Freshdesk/Zendesk (credential-verified, webhook-registered, backfilled), AfterShip/UPS/FedEx (live proof-of-delivery/signature). Nothing fabricates a "connected" state; a `verify-connections` cron decays revoked tokens to `error`. This is the rare product that *can't* show a fake green chip.
2. **Rules / decision support is excellent.** Fully explainable ("Why this matched" with actual values), configurable + persisted CRUD, complete audit trail of evaluations, graceful degradation (asks for evidence instead of inventing a verdict), and an explicit "Unauth applies your rules — your team makes the final decision" disclaimer.
3. **Evidence-not-verdicts discipline.** `blacklist`/accusation vocabulary is write-prohibited and read-mapped to neutral labels ("Denied under policy"); the product surfaces signals, not guilt.
4. **Honest empty-state transparency on integrations** — "Connected live evidence: none" is cleanly separated from a ~25-item "Slot-only coverage" list. No overpromising in the connector UI itself.
5. **Destructive actions are well-guarded** — account deletion requires typing `DELETE` and states plainly what is permanently removed.

### Scorecard

| Area | Score /10 | Verdict |
|---|---|---|
| First impression | 3 | Clean visual craft, but empty everywhere + contradictory status chrome. |
| Merchant clarity | 6 | Copy is clear and on-message; undermined by mixed signals. |
| Navigation | 6 | Sensible sidebar; duplicated by a workbench sub-nav; stale orphan routes. |
| Core workflow | 2 | Payout Control is a connect-wall; unusable for the seeded merchant. |
| Claims handling | 4 | Strong logic underneath, but unreachable in the demo; stale "catches" UI leaks in. |
| Evidence handling | 6 | Real evidence pack assembly + provenance; most evidence types are slot-only. |
| Integrations | 8 | Real, honest, self-verifying. Registry drift (Zendesk/Big/Woo) costs 2 points. |
| Trustworthiness | 6 | Substance is trustworthy; chrome (demo/PROD/title) is not. |
| Speed/friction | 4 | Cold compiles + slow integration list + slow report charts. |
| Conversion readiness | 3 | Empty demo path is fatal to self-serve conversion. |
| Retention potential | 4 | Strong if data flows; today nothing flows. |
| Production readiness | 4 | Schema-cutover debt, `as any`, no root error boundary. |

---

## 2. Test Environment

| Field | Value |
|---|---|
| App URL | `http://localhost:3000` (Next.js 16.2.7 dev, webpack) |
| Branch | `cleanup/current-direction-stabilisation` |
| HEAD at start | `9b7ebe65` (working tree dirty; **`lib/navigation/appRoutes.ts` changed mid-session** — `recoveries` label flipped `Loss Cases`→`Recoveries` while auditing) |
| Environment | Local dev against **live Supabase v2** (`lquvbikyvmbjbfffrlky`), live Shopify + Gorgias API keys present in `.env.local` |
| Browser | Preview Chromium, viewport 1440×900 (desktop) |
| Auth state | Authenticated as `demo@unauth.app` (Elara & Co Apparel; `primary_demo:true`, `setup_complete:true`) via injected `@supabase/ssr` session cookie (the login form is flaky for automation) |
| Seeded data | Demo merchant exists with `setup_complete=true` but **no `store_connections`/`helpdesk_connections` rows and no v2 source data** |
| Integrations connected | **None** (this is the root of the empty experience) |

### Major testing limitations (read before trusting "PASS"es)
- **The connected/happy-path data experience is `NOT TESTABLE` from the browser.** Completing Shopify + Gorgias OAuth requires external systems I cannot drive. Every data surface was exercised only in its *empty/unconnected* state. Claims about connected behaviour are inferred from code, not observed.
- **Adversarial verification did not complete.** The background forensics workflow hit the org's monthly spend limit after 3 of 12 dimensions; the P0/P1 cross-check pass did not run. The 3 completed dimensions (integrations, mock-data, rules) are high-confidence; the other 9 were re-derived by direct grep/read in the main session and are marked with confidence where relevant.
- The preview dev server crashed twice (memory pressure on Next 16 webpack dev) and was restarted; some first-load timings reflect cold compiles, not production latency.

---

## 3. Merchant Journey Map (as tested)

| Stage | Expected merchant goal | Actual experience | Status | Friction | Severity |
|---|---|---|---|---|---|
| Landing | Understand the product in 30s | Landing title correct ("Post-Purchase Payout Control"); uses **Unsplash stock face photos** as social proof | PARTIAL | Stock-photo testimonials read as fake | P3 |
| Login | Sign in | Works; form controlled-input state is flaky for automation; tab title is stale "Order Identity Review" | PARTIAL | — | P3 |
| Onboarding | Guided setup | `setup_complete=true` skips onboarding; but sidebar still says "Setup incomplete" (different signal) | PARTIAL | Two conflicting "setup" concepts | P2 |
| Integration setup | Connect store + helpdesk | Clear copy + honest coverage list, but **>30s "Loading integrations…"** on cold load | PARTIAL | Slowest page is the most important | P2 |
| Dashboard | See losses/recovery at a glance | **Every KPI "—"/"Missing"; 3 contradictory banners** | FAIL | Looks broken | P0 |
| Claims review | Work the payout queue | **Connect-wall only** ("Connect Shopify + Gorgias to use Payout Control") | FAIL | No value before OAuth | P0 |
| Evidence review | See evidence present/missing | Unreachable (gated); evidence pack logic exists in code | BLOCKED | — | P0 |
| Recommendation/action | Decide on a case | Unreachable in demo; logic is strong in code | BLOCKED | — | P0 |
| Correspondence visibility | See carrier/customer/processor threads | Recoveries page renders (empty); correspondence is "generated requests only" + manual copy step | PARTIAL | Semi-manual | P3 |
| Recovery/dispute workflow | Track recoverable losses | Recoveries board renders, all 0/—; outcomes depend on slot-only connectors | PARTIAL | No real outcomes possible today | P1 |
| Reporting/analytics | Justify the spend | Rich layout, all empty; "LIVE SOURCE" on empty; mixed "—"/"0"; slow charts | PARTIAL | ROI unprovable in demo | P2 |
| Settings/team/rules | Configure | **Rules is excellent**; Settings IA is clean; team/billing present | PASS | — | — |
| Repeat-usage loop | A reason to return daily | None today (no work queue populates) | FAIL | — | P1 |

---

## 4. Full Route Audit

Legend: **Linked** = reachable from sidebar/workbench/command-palette. **Orphan** = on disk, not in primary nav. **Redirect** = 307 to a canonical route.

| Route | Purpose | Loads | Clear | Functional (demo) | Status | Notes |
|---|---|---|---|---|---|---|
| `/dashboard` | Payout overview | ✅ | ⚠️ | ❌ empty | FAIL | All KPIs "—"; 3 contradictory banners. |
| `/claims` ("Payout Control") | Case queue | ✅ | ✅ | ❌ connect-wall | FAIL | Core workflow gated. |
| `/claims/[id]` | Case detail | (gated) | ✅ | BLOCKED | BLOCKED | Strong logic in code; stale "identity catches" UI mounts here. |
| `/recoveries` ("Recoveries") | Loss/recovery board | ✅ | ✅ | ❌ empty | PARTIAL | Honest "automation-first" copy; 0/—. Label was "Loss Cases" earlier this session. |
| `/customers` | Customer history/context | ✅ | ✅ | ❌ empty | PARTIAL | **No longer crashes** (prior bug fixed); "No customer history yet". |
| `/customers/[id]` (+ `/claims`, `/evidence/new`) | Customer drill-down | (gated) | ✅ | BLOCKED | BLOCKED | Evidence package builder lives here. |
| `/partners` | Partner rulebook | ✅ | ✅ | partial | PARTIAL | Config surface (not data-gated). |
| `/rules` | Merchant payout rules | ✅ | ✅ | ✅ | **PASS** | Best surface in the app. |
| `/reports` | Analytics | ✅ | ✅ | ❌ empty | PARTIAL | Mixed "—"/"0"; "LIVE SOURCE" on empty; slow charts; has Export + 7/30/90/all. |
| `/settings/*` (account, billing, team, integrations, data-privacy, audit-trail) | Config | ✅ | ✅ | ✅ | PASS | Clean settings sub-nav; account delete well-guarded. |
| `/integrations` (top-level) | Integration Hub | ✅ | ⚠️ | ✅ | PARTIAL | **Duplicates `/settings/integrations`** — two integration surfaces. |
| `/help`, `/help/how-it-works` | Help | ✅ | ✅ | — | PASS | — |
| `/help/identity-matching`, `/help/confidence-grades` | Help | ✅ | ❌ | — | PARTIAL | **Old fraud/identity-product help content.** |
| `/apply` | Founding-merchant application | ✅ | ✅ | — | PASS | Likely intentional. |
| `/audit/[runId]`, `/audit/[runId]/customers`, `/audit/[runId]/transaction/[id]` | OLD "audit run" identity review | (orphan) | ❌ | — | FAIL | Stale old-product surface; not in nav. |
| `/catches` | OLD "identity catches" | redirect→`/claims` | ❌ | — | PARTIAL | Page + components still exist; mounted in claim detail. |
| `/chargebacks`, `/chargebacks/[id]` | OLD evidence packages | redirect→`/claims` | — | — | PARTIAL | Legacy. |
| `/global` | OLD cross-merchant pattern | redirect→`/customers` | — | — | PARTIAL | Legacy network framing. |
| `/lookup` | OLD API lookup | redirect→`/customers` | — | — | PARTIAL | Legacy. |
| `/watchlist` | OLD watchlist | redirect→`/customers` | — | — | PARTIAL | Legacy. |
| `/store` | Store overview | redirect→`/dashboard` | — | — | PARTIAL | Legacy. |
| `/(internal)/eval`, `/(internal)/network-metrics` | Internal | (orphan) | — | — | NOT TESTABLE | Internal tooling. |

**Metadata defect:** root `app/layout.tsx` hardcodes `title`/openGraph/twitter to **"Unauth — Order Identity Review"** for the entire authenticated shell. Only the public landing page (`app/(public)/landing/page.tsx`) sets the correct payout title.

---

## 5. Navigation & Information Architecture

| Item | Status | Evidence / Problem | Fix |
|---|---|---|---|
| Merchant knows where to start | PARTIAL | "Setup incomplete" chip points to `/settings/integrations`, which is correct — but the dashboard's primary CTA, the empty-state CTAs, and the chip all say slightly different things. | Single canonical "Finish setup" CTA + destination. |
| Main workflow is obvious | PASS | "Payout Control" is prominent in Operations group. | — |
| Nav labels match merchant language | PARTIAL | "Recoveries" vs "Loss Cases" was inconsistent within one session; command-palette still describes it as "Loss recovery". | Pick one term, apply across sidebar/workbench/command-palette/page H1. |
| Return from detail pages | PASS | Breadcrumbs present in settings; workbench sub-nav aids lateral nav. | — |
| No dead ends | PARTIAL | Empty states all dead-end into the same "connect" CTA. | — |
| CTAs specific and useful | PARTIAL | Multiple "Reconnect sources"/"Connect Shopify + Gorgias"/"Complete setup" variants. | Consolidate. |
| No duplicate/conflicting concepts | FAIL | **Two navigations** (sidebar + workbench sub-nav) list overlapping routes; **two integration pages** (`/integrations` + `/settings/integrations`); legacy concepts (catches/chargebacks/watchlist/global/lookup) still routed. | Collapse to one nav model; retire one integration surface; delete legacy routes. |
| Sidebar reflects actual product | PASS | Overview/Operations/Outcomes grouping is coherent and on-message. | — |

---

## 6. First-Time Merchant Experience

| Item | Status | Notes |
|---|---|---|
| Clear product purpose | PASS | "Connect one order source and one helpdesk to enable payout control inside support tickets." is excellent. |
| Clear setup path | PARTIAL | The path exists but the "Setup incomplete" vs `setup_complete=true` split is confusing. |
| Clear merchant value | PARTIAL | Value is *described* well but never *shown* (everything empty pre-connect). |
| No fake confidence | PASS | No fabricated "connected" states; honest slot-only list. |
| No confusing empty state | FAIL | Dashboard "—"/"Missing" with "demo data" + "PROD" simultaneously is confusing. |
| No unexplained jargon | PARTIAL | "Context credits 100 of 100", "Slot-only coverage", "policy leakage" are unexplained on first contact. |
| Clear integration dependency | PASS | Each empty state names exactly what to connect. |
| Clear CTA hierarchy | PARTIAL | Too many competing connect CTAs. |

**The core problem:** there is essentially **no value before connecting two external systems.** Combined with the seed bug, even connecting doesn't help. A first-time merchant has no "aha" moment available in the demo.

---

## 7. Claims (Payout Control) Workflow

| Item | Status | Details |
|---|---|---|
| Claims easy to scan | BLOCKED | List unreachable in demo (connect-wall). |
| Merchant can tell what needs attention | BLOCKED | `nav-counts` would badge it, but list is gated. |
| Claim reasons clear | PASS (code) | Claim type/requested action/amount-at-risk modeled. |
| Claim status clear | PASS (code) | Status machine enforced (`6f43ddf6` enforces transition guards). |
| Evidence status clear | PASS (code) | Evidence present/missing computed in `assembleEvidencePack`. |
| Next action clear | PASS (code) | Recommendation card shows fired rule + next step. |
| Detail answers what/why/what-to-do | PASS (code) | "Why this matched" with actual values. |
| Filters / search / sort | NOT TESTABLE | Present on `/customers` (search, sort, saved views, status filters); claims list gated. |
| State persistence on refresh | NOT TESTABLE | — |
| Decision/outcome/reopen/reverse/snooze APIs | PASS (code) | Real mutating routes exist (`app/api/claims/[claimId]/*`); `reverse` explicitly rejects accusation vocabulary. |
| No unsupported fraud verdicts | PASS | `blacklist` write-prohibited; mapped to neutral labels. |
| **Stale "identity catches" UI in detail** | FAIL | `components/claims/ClaimReviewContextColumn.tsx` mounts the old `RecentCatchesFeed`/`IdentityCatchSection`/`CatchCard` ("Recent identity catches") — old fraud-network language in a live surface. |

---

## 8. Evidence Workflow

Real evidence machinery exists: `lib/payouts/assembleEvidencePack.ts` groups tracking/delivery-proof from `integration_evidence_items`, computes `missingEvidence` per provider; evidence package builder UI (`components/evidence/*`: `BuildEvidencePackageDrawer`, `EvidenceStrengthMeter`, `EvidencePackagePreview`, `DisputeReadinessPanel`), CE3 check, and PDF generation routes (`app/api/evidence/[id]/pdf`, `app/api/v1/evidence/*`).

| Evidence type | Source clear | Timestamped | Verified vs inferred | Live vs unavailable | Status |
|---|---|---|---|---|---|
| Order data | ✅ (Shopify) | ✅ | verified | live (when connected) | PASS (code) |
| Helpdesk ticket | ✅ (Gorgias/Fresh/Zendesk) | ✅ | verified | live (when connected) | PASS (code) |
| Tracking / delivery scans | ✅ (AfterShip/UPS/FedEx) | ✅ | verified | live (when connected) | PASS (code) |
| Delivery proof / signature | ✅ (UPS/FedEx POD) | ✅ | verified | live | PASS (code) |
| Carrier response/clarification | — | — | — | **slot-only** | PARTIAL |
| Payment-dispute data | — | — | — | **slot-only** (Stripe/PayPal/Adyen connectors are metadata-only) | FAIL (gap) |
| Chargeback data | — | — | — | **slot-only** | FAIL (gap) |
| Refund data | partial (Shopify) | ✅ | verified | live | PARTIAL |
| Customer history | ✅ | ✅ | verified | live | PASS (code) |
| Timeline | ✅ (claim_events) | ✅ | verified | live | PASS (code) |

**Provenance posture is good** ("Unavailable evidence is tracked as unavailable, not manually filled" — `app/(app)/recoveries/page.tsx`), but the highest-value recovery evidence (chargeback/dispute/carrier-claim/3PL/returns) is **not built** — see §9.

---

## 9. Integration Audit

This is the **strongest, most honest** dimension. Verified in code:

| Integration | Real connector | Auth flow | Status honest | Data pulled | Disconnect/sync | Verdict |
|---|---|---|---|---|---|---|
| Shopify | ✅ | OAuth + HMAC (`timingSafeEqual`) + token exchange | ✅ | orders, customers, Payments **disputes** (GraphQL 2026-01) | ✅ + webhooks | PASS |
| Gorgias | ✅ | API auth, registers sidebar widget | ✅ (throws on bad creds) | tickets, backfill | ✅ + webhook | PASS |
| Freshdesk | ✅ | `/api/v2`, throws on 401 | ✅ | tickets, backfill | ✅ + webhook | PASS |
| Zendesk | ✅ (full connector) | credential-validated | ❌ **registry says slot_only → shows "Not connected"** | tickets, backfill | ✅ | **FAIL (under-reports a working integration)** |
| AfterShip / UPS / FedEx | ✅ | API key / client_credentials OAuth | ✅ | tracking + POD/signature | sync | PASS |
| BigCommerce / WooCommerce | ✅ | OAuth / API | ✅ (honest `connected:false`) | orders/webhooks | ✅ | PARTIAL — **absent from Hub + coverage doc** |
| Stripe (billing) | ✅ | webhook signature verify | ✅ | billing | — | PASS |
| Stripe/PayPal/Adyen (dispute provider) | ❌ metadata only | — | ✅ (slot-only) | — | — | PARTIAL — correctly inert, value-prop gap |
| Carrier-claims / WMS / 3PL / Returns | ❌ metadata only | — | ✅ (slot-only) | — | — | PARTIAL — correctly inert |
| Document upload | ❌ hard-disabled | — | ❌ **coverage doc claims it's "Live"** | — | — | FAIL (doc drift) |

**No integration fabricates a connected state** (`lib/integrations/auth.ts` forces `not_connected` for slot-only; `assertLiveProvider` rejects slot routes). A `verify-connections` cron makes real API calls and decays revoked tokens to `error` (Shopify + Gorgias today; **not yet** AfterShip/UPS/FedEx/Zendesk/Freshdesk).

---

## 10. Automation & Correspondence

| Area | Automatic | Manual | Source | Gap | Severity |
|---|---|---|---|---|---|
| Carrier clarification | partial (generated request) | send is manual | generated draft | no auto-send/auto-ingest of reply | P2 |
| Customer replies | ingested via helpdesk webhook | **"copy response" paste step** (`customer_response_copied` event) | helpdesk | agent copies generated reply into Gorgias by hand | P3 |
| Helpdesk ticket updates | ✅ webhook | — | helpdesk | — | — |
| Payment-dispute updates | ❌ | n/a | none | **no processor connector** | P1 |
| Refund updates | partial (Shopify) | — | Shopify | — | P3 |
| Chargeback updates | ❌ | n/a | none | **no chargeback connector** | P1 |
| Recovery outcome updates | partial | status can be merchant-typed | recovery_cases | outcomes not synced from external systems | P2 |

The recoveries page **markets** "automation-first" and "synced recovery outcomes," but the connectors that would sync those outcomes (processor/chargeback/carrier-claims) are slot-only. The claims flow retains a manual copy-paste correspondence step.

---

## 11. Rules / Recommendations / Decision Support — **strongest dimension**

| Item | Status | Notes |
|---|---|---|
| Recommendation logic explainable | PASS | "Why this matched" lists each condition with actual value. |
| Merchant sees why a rule appeared | PASS | Fired rule name + matched conditions shown. |
| No unsupported accusations | PASS | Neutral vocabulary; merchant-decides disclaimer. |
| Merchant remains decision-maker | PASS | "Unauth applies your rules… Your team makes the final decision." |
| Rules configurable + persisted | PASS | Real CRUD, merchant-scoped, validated, reorderable; default rules + templates. |
| Fired rules visible | PASS | On the recommendation card. |
| Confidence explained | PASS | Evidence strength surfaced. |
| Evidence supports recommendation | PASS | Evidence-gap checks run *before* the verdict. |
| No black-box verdicts | PASS | Full `rule_evaluations` audit trail with per-rule trace + hashes + dedupe. |
| Copy legally careful | PASS (user-facing) | — |
| **Internal vocabulary drift** | PARTIAL | Engine still evaluates to fraud-era `approve\|manual_review\|deny`; persisted to `rule_evaluations.recommendation`; 85 `fraud` refs + "legacy/network" labels remain. *(P2)* |
| **Dead parallel eval path** | PARTIAL | `/api/rules/evaluate` + `widgetDataToSignals` (partial 4-field map, zero prod callers) is a latent foot-gun; handoff doc still cites it as the widget path. *(P2)* |
| **No-rules fallback uses legacy risk bands** | PARTIAL | A merchant who never seeds defaults gets evidence-score bands, not payout-fact rules. *(P3)* |

---

## 12. Analytics / Reporting

`/reports` has the right *shape* (KPI tiles, decision completion, recovery win rate, source coverage, requested-payout-action mix, evidence-gap trends, 7/30/90/all range, **Export**). Aggregation in `lib/dashboard/payoutDashboardMetrics.ts` is real and merchant-scoped, no fabricated numbers.

| Analytics item | Status | Problem |
|---|---|---|
| Loss amount / exposure | PARTIAL | Renders "—" empty (no data). |
| Recovery amount | FAIL | Can't populate without dispute/chargeback connectors. |
| Carrier / claim-type / SKU / region breakdown | PARTIAL | Layout present; empty. |
| Trend over time | PARTIAL | Charts load slowly then render empty. |
| Evidence coverage | PASS (concept) | "Source coverage" tile exists. |
| Action backlog | PARTIAL | "Manual reviews 0", "Evidence requested 0". |
| ROI / value proof | FAIL | Unprovable in demo. |
| Export / reporting | PASS | Export button present. |
| **Consistency** | FAIL | Same empty state renders as "—" on some tiles and "0" on others. |
| **"LIVE SOURCE" badges on empty sections** | FAIL | Misleading — labels empty data as live. |

---

## 13. Conversion Killers (prioritised)

| # | Issue | Location | Sev | Why it kills conversion | Fix ref |
|---|---|---|---|---|---|
| C1 | Seeded demo dashboard fully empty | `app/(app)/dashboard/page.tsx` + `lib/connections/setupState.ts` | P0 | Buyer's first screen looks broken | F1 |
| C2 | Seed writes dropped v1 tables; app reads v2 | `scripts/seed-demo-merchant.mjs` vs `lib/supabase/getMerchantDataPresence.ts` | P0 | Even after setup, nothing shows | F2 |
| C3 | Core workflow is a connect-wall | `/claims` empty state | P0 | No value before dual OAuth | F1/F3 |
| C4 | 3 contradictory status framings | `app/(app)/layout.tsx`, `components/layout/MerchantEnvChip.tsx`, `dashboardPageUtils.ts` | P1 | Distrust of all data | F4 |
| C5 | "Load Demo" fabricates random data into dead table | `app/api/demo/route.ts` | P1 | The one "show me it works" button shows nothing or fake numbers | F5 |
| C6 | Stale "Order Identity Review" tab title | `app/layout.tsx` | P3 | Advertises a dead product | F6 |
| C7 | Slow integration-list load (>30s cold) | `/settings/integrations` (8 parallel status calls) | P2 | Friction on the funnel's pivot page | F7 |
| C8 | Stock-photo "testimonials" | landing (`images.unsplash.com`) | P3 | Reads as fake social proof | F8 |

---

## 14. Retention Killers (prioritised)

| # | Issue | Location | Sev | Why it kills retention | Fix ref |
|---|---|---|---|---|---|
| R1 | No data ever flows (seed/schema split) | seed + read model | P0 | "I set it up and still see nothing" | F2 |
| R2 | No recovered-money proof possible | slot-only dispute/chargeback/carrier connectors | P1 | Headline ROI never populates | F9 |
| R3 | Reports look broken (LIVE SOURCE on empty, mixed —/0) | `/reports` | P2 | Spend can't be justified | F10 |
| R4 | Stale old-product surface leaks | catches UI in claim detail, `/audit`,`/global`,`/lookup`,`/watchlist`, 85 fraud refs | P2 | Erodes "this is a finished product" feel | F11 |
| R5 | Semi-manual correspondence | `customer_response_copied`, manual order ref | P3 | Less time-saving than promised | F12 |
| R6 | No daily work queue populates | claims gated/empty | P1 | No reason to return | F1/F2 |

---

## 15. Trust, Privacy & Legal-Risk

| Item | Status | Notes |
|---|---|---|
| No unnecessary PII exposure | PASS (likely) | Identity hashing pipeline present (`lib/identity/*`); UI renders resolved profiles, not raw dumps. *(connected-state not observed → medium confidence)* |
| Cross-merchant data carefully framed | PASS | k-anonymity (`K_ANONYMITY_MIN=3`); cross-merchant route exists but legacy `/global` is being retired. |
| No other merchant's name exposed | PASS (code) | k-anon gating. |
| No unsupported fraud accusations | PASS | `blacklist`/accusation vocabulary write-prohibited; neutral read labels. |
| Data source visible | PASS | Evidence provenance + "unavailable" tracking. |
| Integration permissions explained | PARTIAL | Shopify scopes documented in `.env.example`; in-UI scope explanation thin. |
| Disconnect behaviour clear | PASS | Disconnect routes exist + honest messaging. |
| Sensitive actions confirmed | PASS | Account delete requires typing `DELETE`. |
| Audit trail exists | PASS | `rule_evaluations` + `user_action_log` + `claim_events`, CSV export gated by `EXPORT_AUDIT`. |
| Role/team permissions | PASS | `lib/permissions` + `app/api/team/*`. |
| **Legal/brand risk: residual fraud vocabulary** | PARTIAL | 85 `fraud` refs + fraud-trio recommendation values persisted to DB; stale "identity catches" UI. *(P2)* |
| **Stale legal/product framing** | PARTIAL | `/help/identity-matching`, `/help/confidence-grades` describe the old identity/fraud product. *(P3)* |

---

## 16. UX Friction

| Flow | Friction | Severity | Simplification |
|---|---|---|---|
| Cold navigation between routes | Multi-second compiles (dev) + slow data calls | P2 | Prod build mitigates; still parallelise `/settings/integrations` status calls behind one endpoint with a fast skeleton. |
| Status messaging | 3–4 connect/demo/prod messages per page | P1 | One status model, one banner. |
| Two navs | Sidebar + workbench sub-nav overlap | P3 | Keep one. |
| Empty-state CTAs | Several wordings for the same action | P2 | One canonical "Finish setup". |
| Reports zero-rendering | "—" vs "0" inconsistency | P3 | One empty convention. |
| Mobile | Hard <1024px block ("optimised for screens 1024px and wider") | P3 | Acceptable for ops tool; ensure the block is graceful. |

---

## 17. Empty / Loading / Error / Edge States

| Page | Empty state | Loading state | Error state | Verdict |
|---|---|---|---|---|
| Dashboard | ✅ (heroes) | ✅ | route `error.tsx` | PASS structurally; content empty for wrong reason |
| Claims | ✅ connect-wall | ✅ | ✅ | PARTIAL |
| Customers | ✅ "No customer history yet" + saved views | ✅ | ✅ `error.tsx` present | PASS |
| Recoveries | ✅ | ✅ | ✅ | PASS |
| Reports | ⚠️ mixed "—"/"0", LIVE SOURCE on empty | ⚠️ slow charts | ✅ | PARTIAL |
| Integrations | ✅ honest coverage list | ⚠️ >30s skeleton | ✅ | PARTIAL |

**Coverage:** 22 `error.tsx` + 18 `loading.tsx` + 2 `not-found.tsx`. **Gap:** no root `app/error.tsx` and no `app/global-error.tsx` — an uncaught error in the root shell falls back to the default Next error page. *(P3)*

---

## 18. Data Integrity & State

| Check | Status | Notes |
|---|---|---|
| Counts match lists | RISK | `nav-counts` reads `support_payout_cases` directly (ungated), but `/claims` is connection-gated — a badge count could appear while the list shows a connect-wall. *(P2)* |
| Filters update counts | NOT TESTABLE | (data gated) |
| Search matches rows | NOT TESTABLE | — |
| Refresh preserves state | NOT TESTABLE | — |
| Timestamps/currency consistent | PARTIAL | Currency formatting helper used; mixed "—"/"0" zero-rendering is the visible inconsistency. |
| IDs stable | PASS (code) | — |
| Duplicate identities merged | PASS | Customers list now collapses by resolved identity (prior bug fixed). |
| **v1/v2 table coherence** | FAIL | `dashboardPageUtils.ts` and `app/api/audit-trail/route.ts` query raw `'merchant_claims'` (dropped) via `as never`/`as any`; `getMerchantDataPresence` + `nav-counts` correctly use `TABLES.MERCHANT_CLAIMS` (`support_payout_cases`). Inconsistent table targeting across the read model. *(P1)* |

---

# Implementation Plan (the fix backlog)

Ordered by severity. Each item lists the concrete change. **No code has been changed; this is the spec.**

## P0 — Blocks the entire demo/usefulness story

### F1 — Decouple metric/workflow rendering from live-connection presence
**Files:** `app/(app)/dashboard/page.tsx`, `lib/connections/setupState.ts`, `app/(app)/dashboard/dashboardPageUtils.ts`, `app/(app)/claims/*` empty-state gate.
- Today the dashboard short-circuits to empty heroes whenever `bothConnected` is false, regardless of whether data exists.
- **Fix:** if `getMerchantDataPresence().hasAnyData` is true, always run `loadPayoutDashboardMetrics()` and render KPIs; demote "connect" messaging to a dismissible non-blocking banner. Apply the same rule to the `/claims` connect-wall: render the case list whenever cases exist, even if connections are absent.
- **Acceptance:** the seeded merchant (with v2 data, see F2) shows populated dashboard + claims with no OAuth.

### F2 — Make seed data target the v2 schema the app actually reads
**Files:** `scripts/seed-demo-merchant.mjs` (and any other `scripts/*seed*`), `lib/supabase/tables.ts` (SSOT).
- Seed currently inserts into dropped v1 tables (`audit_transactions`, `customer_profiles`, `processing_jobs`, old `claims`/`evidence_packages`). The read model counts `source_orders`, `source_customers`, `sync_jobs`, `support_payout_cases`, `source_tickets`.
- **Fix:** rewrite seed to `import { TABLES } from '@/lib/supabase/tables'` and insert into v2 tables only. Also insert active `store_connections` + `helpdesk_connections` rows for the demo merchant so `bothConnected` is true (belt-and-braces with F1).
- **Guardrail:** add a CI check asserting every `.from('…')` literal in `scripts/` ⊆ `TABLES` values.
- **Acceptance:** after reseed, `getMerchantDataPresence` returns `hasAnyData=true` and all surfaces populate.

### F3 — Provide a real "value before connect" path for prospects
**Files:** dashboard/claims empty states, `app/api/demo/route.ts` (see F5).
- **Fix:** ship a read-only **sample/tour dataset** that renders the full populated UI for an unconnected prospect, clearly labelled "Sample data — connect to see yours." This is the demo affordance; do not gate the entire product behind dual OAuth.

## P1 — Major trust / conversion / retention killers

### F4 — One coherent account-status model (kill the demo/PROD/stale contradiction)
**Files:** `app/(app)/layout.tsx`, `components/layout/MerchantEnvChip.tsx`, `app/(app)/dashboard/dashboardPageUtils.ts`, `components/common/DemoBanner.tsx`.
- `MerchantEnvChip` defaults to `'production'` because `AppHeader` never passes an `environment` prop → every tenant shows "PROD". `DemoBanner` shows for any `is_demo` tenant. `setupState` independently shows "Showing existing data."
- **Fix:** derive one `accountStatus` enum (`demo | live | stale | unconnected`) from a single resolver; render exactly one banner + one (accurate) env chip. Pass real `environment` (e.g. `VERCEL_ENV`/tenant flag) into `MerchantEnvChip`; suppress/relabel the chip for demo tenants.

### F5 — Stop "Load Demo" fabricating random data into a dead table
**Files:** `app/api/demo/route.ts`, `components/dashboard/LoadDemoButton.tsx`.
- Route uses `Math.random()` for IPs/order totals and inserts `LegacyAuditTransactionInsert` (v1).
- **Fix:** repoint to v2 tables via `TABLES`, replace random fabrication with a deterministic fixture, OR remove the button if the seeded merchant is the canonical demo. Never present `Math.random` numbers as merchant data.

### F6 — Fix the stale product title
**Files:** `app/layout.tsx` (`title`, `openGraph.title`, `twitter.title`).
- **Fix:** "Unauth — Post-Purchase Payout Control" (align with `app/(public)/landing/page.tsx`).

### F11a — Stop persisting fraud-era recommendation values & remove stale "catches" UI
**Files:** `lib/rules-engine.ts` (`RuleAction`, header comment, `FIELD_LABELS`), `lib/rules/store.ts` (`recommendation` written to `rule_evaluations`), `components/claims/ClaimReviewContextColumn.tsx`.
- **Fix:** store the resolved payout-vocabulary recommendation (not raw `approve\|manual_review\|deny`) in `rule_evaluations` (or document the trio as an explicitly-bridged internal primitive in CLAUDE.md). Remove/replace the mounted `RecentCatchesFeed`/`IdentityCatchSection`/`CatchCard` ("identity catches") from the claim detail. Sweep the 85 `fraud` refs in `app/` + `components/` for user-facing/audit-facing leakage.

### F9 — Be explicit that recovery/dispute outcomes need unbuilt connectors
**Files:** dashboard recovery tiles, `/reports` recovery section, `docs/product/INTEGRATION_COVERAGE.md`.
- **Fix:** when the relevant provider is slot-only, render "Recovery reporting requires a payment-dispute or carrier-claims connector (available on request)" instead of a bare "—", so empty never reads as broken. Decide MVP scope: either build one processor/chargeback connector or stop implying synced recovery outcomes are live.

### F-DB — Fix the dropped-table queries & `as any`/`as never` casts
**Files:** `app/(app)/dashboard/dashboardPageUtils.ts` (`.from('merchant_claims' as never)`), `app/api/audit-trail/route.ts` (`.from('merchant_claims' as any)`), `app/api/nav-counts/route.ts` (`as never` casts).
- **Fix:** use `TABLES.MERCHANT_CLAIMS` everywhere; remove all casts (the cast is hiding the dead table name — a direct CLAUDE.md ground-rule violation). Add an ESLint `no-restricted-syntax` rule banning raw table-name string literals in `.from()`.

## P2 — Significant friction

- **F7 — Integration-list cold load:** collapse the 8 parallel status calls (`/api/integrations`, shopify/gorgias/zendesk/freshdesk/woo/bigcommerce status, api-keys) into one batched endpoint; show connector cards immediately with per-card status skeletons. *(`/settings/integrations`)*
- **F10 — Reports honesty:** remove "LIVE SOURCE" badges from empty sections (only show when a source is connected + returning rows); standardise empty rendering to one convention. *(`/reports`)*
- **F-ZEN — Promote Zendesk (and Freshdesk/BigCommerce/WooCommerce) to first-class live providers** in `lib/integrations/registry.ts`; have `getStoredIntegrationViews()` read their real connection rows so the Hub stops showing a working connector as "Not connected." Add them to `INTEGRATION_COVERAGE.md`.
- **F-DOC — Move "document uploads" out of "Live in this phase"** in `INTEGRATION_COVERAGE.md` (route is hard-disabled), or re-enable the upload route.
- **F-EVAL — Remove the dead `/api/rules/evaluate` + `widgetDataToSignals` path** (or route it through `claimDecisionContextToSignals`); update `EVIDENCE_SCORING_ENGINE_HANDOFF.md` which still names it as the widget path.
- **F-NAV — Resolve nav duplication:** retire either `/integrations` or `/settings/integrations`; decide whether the workbench sub-nav stays alongside the sidebar.
- **F-COUNT — Align `nav-counts` gating with the claims page** so a badge count never appears while the list shows a connect-wall.
- **F-CRON — Extend `verify-connections`** live token checks to AfterShip/UPS/FedEx/Zendesk/Freshdesk (today only Shopify + Gorgias decay to `error`).

## P3 — Minor / polish

- **F6b — Naming unification:** "Recoveries" vs "Loss Cases" vs "Loss recovery" — pick one across sidebar, workbench, command-palette, page H1.
- **F8 — Replace Unsplash stock faces** on the landing page with real logos/quotes or remove.
- **F-404 — Add root `app/error.tsx` + `app/global-error.tsx`.**
- **F11b — Delete/redirect-and-remove stale routes & help content:** `/audit/*`, `/catches`, `/chargebacks`, `/global`, `/lookup`, `/watchlist`, `/store` (pages, not just redirects), `/help/identity-matching`, `/help/confidence-grades`. Remove orphaned old marketing components (`UnauthNetworkHero`, `UnauthNetworkCanvas`, `UnauthGlobeHero`, `UnauthStripeGlobe`) if confirmed unwired. *(Check git creation dates first — some "unused" components are new scaffolding, not dead code.)*
- **F12 — Reduce manual correspondence:** auto-post generated customer responses via the helpdesk API instead of the `customer_response_copied` paste step where the provider supports it.
- **F-DEFAULTS — Unify default policy:** make the no-rules fallback use payout-fact defaults (or auto-seed `DEFAULT_PAYOUT_RULES` on merchant creation) instead of legacy evidence-score risk bands.

## P4 — Confirmed strengths (do not regress)

- Real, self-verifying integration layer with no fakeable "connected" state.
- Explainable, auditable, configurable rules engine with merchant-decides framing.
- Evidence-not-verdicts vocabulary discipline (`blacklist` write-prohibited).
- Guarded destructive actions; k-anonymity on cross-merchant context.

---

## Appendix — Re-test checklist after fixes

1. Reseed demo merchant → `/dashboard` shows non-zero KPIs with no OAuth. *(F1+F2)*
2. `/claims` shows a populated case queue for the seeded merchant. *(F1+F2)*
3. Exactly one status banner + one accurate env chip per page. *(F4)*
4. Tab title reads "Post-Purchase Payout Control" on `/dashboard` and `/login`. *(F6)*
5. `grep -rn "merchant_claims" app lib` returns no raw string literals; `grep -rn "as any" app lib` returns nothing in product code. *(F-DB)*
6. `/settings/integrations` renders connector cards <3s with per-card skeletons. *(F7)*
7. Connecting Zendesk shows "Connected" in the Hub. *(F-ZEN)*
8. `/reports` shows no "LIVE SOURCE" badge on an empty section; empty cells use one convention. *(F10)*
9. No "identity catches" copy anywhere in the claim detail; `rule_evaluations.recommendation` stores payout vocabulary. *(F11a)*
