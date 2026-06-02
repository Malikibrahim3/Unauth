# Implementation Doc — Product Tiers (Phase 0, Non-Enforcing) + CE 3.0 Copy Correction + Landing Repositioning

**Status:** Ready to implement
**Phase:** 0 (dev mode — no enforcement, no billing, no checkout controls)
**Date:** 2026-06-02

---

## 0. Context & Non-Negotiables

Unauth is moving to a Free / Pro / Advanced / Enterprise tier model. This task **prepares** the architecture and language for that model without enforcing anything.

Hard constraints (violating any of these is a failed implementation):

- ❌ Do NOT block, hide, or gate any route, page, API, or widget during dev. Customers, Claims, Watchlist, Reports, Global, API keys, helpdesk widgets all stay fully accessible.
- ❌ Do NOT build checkout controls, checkout embed, or device fingerprinting. Phase 1 is not on the horizon. `CHECKOUT_CONTROLS` exists only as a future-facing entitlement constant labelled "future"/"planned"/"not yet available".
- ❌ Do NOT add Stripe or any live billing/payment provider. No billing migrations unless strictly necessary; if a DB field is added it must be optional and unenforced.
- ❌ Do NOT touch RBAC, tenant isolation, RLS assumptions, merchant scoping, or permission checks. Entitlements ("has this merchant paid for X?") are a separate axis from RBAC ("can this user do X inside the account?").
- ❌ Do NOT claim guaranteed/automatic CE 3.0 qualification anywhere. Phase 0 has no checkout-time IP/device capture, so full CE 3.0 qualification may not be reliably achievable.
- ❌ Do NOT imply raw customer records are shared across merchants, that Unauth makes final refund decisions, or that customers are "fraudsters".
- ❌ Do NOT change scoring formulas, weights, matching, or cluster logic (CLAUDE.md ground rule).
- ✅ App must remain fully testable end-to-end after this work.

---

## PART A — Product-Tier Architecture (no enforcement)

### A1. Entitlement model — new files

Create `lib/product/tiers.ts`:

```ts
export type ProductTier = 'free' | 'pro' | 'advanced' | 'enterprise';
export const TIER_ORDER: Record<ProductTier, number> = { free: 0, pro: 1, advanced: 2, enterprise: 3 };
export const TIER_LABELS: Record<ProductTier, string> = { free: 'Free', pro: 'Pro', advanced: 'Advanced', enterprise: 'Enterprise' };
```

Create `lib/product/entitlements.ts` defining:

```ts
export type Entitlement =
  | 'EVIDENCE_PACKS' | 'STORE_SYNC' | 'CSV_IMPORT_LIMITED' | 'CSV_IMPORT_FULL'
  | 'CE3_READINESS_CHECK' | 'CUSTOMER_SEARCH' | 'CUSTOMER_DOSSIER'
  | 'CLAIM_REVIEW_QUEUE' | 'HELPDESK_WIDGET' | 'WATCHLIST' | 'REPORTS_ADVANCED'
  | 'LIVE_LOOKUP_API' | 'QUICK_SCORE' | 'NETWORK_GRAPH'
  | 'CHECKOUT_CONTROLS'   // FUTURE-FACING ONLY — not built, not live in Phase 0
  | 'SIGNAL_API';
```

Tier → entitlement mapping (cumulative; build each tier from the previous):

| Tier | Adds |
|---|---|
| **free** | EVIDENCE_PACKS, STORE_SYNC, CSV_IMPORT_LIMITED, CE3_READINESS_CHECK |
| **pro** | + CUSTOMER_SEARCH, CUSTOMER_DOSSIER, CLAIM_REVIEW_QUEUE, HELPDESK_WIDGET, WATCHLIST, REPORTS_ADVANCED |
| **advanced** | + CSV_IMPORT_FULL, LIVE_LOOKUP_API, QUICK_SCORE, NETWORK_GRAPH, CHECKOUT_CONTROLS *(future)* |
| **enterprise** | + SIGNAL_API |

Also add per-entitlement metadata for UI labelling:

```ts
export interface EntitlementMeta {
  label: string;                 // human label e.g. "Customer dossiers"
  requiredTier: ProductTier;
  availability: 'live' | 'future';  // CHECKOUT_CONTROLS = 'future'
}
```

### A2. Non-enforcing helpers

In `lib/product/entitlements.ts` (or `lib/product/access.ts`):

- `getPlanEntitlements(plan: ProductTier): Entitlement[]`
- `hasEntitlement(plan: ProductTier, entitlement: Entitlement): boolean`
- `getRequiredTierForEntitlement(entitlement: Entitlement): ProductTier`
- `getFeatureAccessLabel(entitlement: Entitlement): string` — e.g. "Pro", "Advanced · Future"
- `isFeatureCommerciallyGated(entitlement: Entitlement): boolean` — true if requiredTier !== 'free'
- `shouldEnforceProductGates(): boolean` — **returns `false` by default.** Reads `env.ENFORCE_PRODUCT_GATES` (server) / `NEXT_PUBLIC_ENFORCE_PRODUCT_GATES` (client). Absent env var ⇒ `false`. Add the var to the Zod schema in `lib/utils/env.ts` as optional, defaulting falsy (per the env SSOT rule — server code must read via `env`, not `process.env`).

**None of these helpers may be used to block anything in this task.**

### A3. Placeholder plan source

Create `lib/product/getMerchantProductPlan.ts`:

```ts
// TODO(product-gating): replace with database/billing-backed plan lookup.
// Phase 0: every merchant gets 'enterprise' so the full app stays testable in dev.
export async function getMerchantProductPlan(_merchantId: string): Promise<ProductTier> {
  return 'enterprise';
}
```

No Stripe. No migration. (If a `product_plan` column is ever added later it must be nullable and unenforced — out of scope here.)

### A4. Non-blocking route/nav tier metadata

Extend the sidebar nav model (`components/nav/SidebarNavItem.tsx` / `SidebarInner.tsx` and wherever nav items are declared) with an optional `tier?: ProductTier` + `future?: boolean` field:

| Route | Tier metadata |
|---|---|
| `/chargebacks`, `/evidence`, `/evidence-packages` | Free · Evidence |
| `/customers` | Pro · Claim Confidence |
| `/claims`, `/inbox` (claims queue) | Pro · Claim Review |
| `/watchlist` | Pro |
| `/reports` | Pro |
| `/global`, `/graph` | Advanced · Network |
| `/settings/integrations` | Free setup; helpdesk integrations badge Pro |
| API keys / `/lookup` | Advanced / Enterprise |
| Checkout controls | Advanced · **Future only** — do not show as live |

Render as small informational badges only ("Free", "Pro", "Advanced", "Enterprise", "Future", "Dev access"). Routes stay visible and clickable. Match existing sidebar visual language (Ramp-level polish — subtle, not noisy).

### A5. Gate UI components (created, not activated)

New files under `components/product/`:

- `PlanBadge.tsx` — small tier chip.
- `FeatureTierBadge.tsx` — entitlement-aware badge using `getFeatureAccessLabel`.
- `FeatureGate.tsx` — props `{ entitlement, plan, children }`. Behaviour:
  - `shouldEnforceProductGates() === false` (default) → render children unchanged, optionally with a dev/tier badge.
  - `=== true` → render `LockedFeaturePreview`/`UpgradeCard` if `!hasEntitlement(plan, entitlement)`.
- `UpgradeCard.tsx` — upgrade CTA card (copy only, no billing wiring).
- `LockedFeaturePreview.tsx` — blurred/locked preview shell.

Do **not** wrap large app areas in `FeatureGate` yet beyond a couple of low-risk demonstrative spots; everything must be false-safe.

### A6. TODO markers at future enforcement points

Add a one-line TODO (no behaviour change) in each:

| File | Entitlement |
|---|---|
| `app/(app)/customers/page.tsx` | CUSTOMER_SEARCH |
| `app/(app)/customers/[id]/customerProfilePageLoad.ts` | CUSTOMER_DOSSIER |
| `app/(app)/claims/page.tsx` | CLAIM_REVIEW_QUEUE |
| `app/(app)/watchlist/page.tsx` | WATCHLIST |
| `app/(app)/global/page.tsx` | NETWORK_GRAPH |
| `app/api/customers/[id]/route.ts` | CUSTOMER_DOSSIER |
| `app/api/customers/search/route.ts` | CUSTOMER_SEARCH |
| `app/api/lookup/route.ts` | LIVE_LOOKUP_API |
| `app/api/lookup/quick-score/route.ts` | QUICK_SCORE |
| `lib/api/v1/customers.ts` | CUSTOMER_SEARCH / CUSTOMER_DOSSIER |
| `lib/api/v1/lookup.ts` | LIVE_LOOKUP_API |
| `app/api/gorgias/widget/route.ts` | HELPDESK_WIDGET |

Format: `// TODO(product-gating): require <ENTITLEMENT> entitlement when ENFORCE_PRODUCT_GATES is enabled.`

### A7. Tests (entitlement logic only)

New `tests/lib/productEntitlements.test.ts` covering:

1. Each tier's entitlement set matches the table in A1 (including cumulativeness).
2. `hasEntitlement` positive/negative cases per tier.
3. `getRequiredTierForEntitlement` for every entitlement.
4. `shouldEnforceProductGates()` returns `false` when env var absent.
5. Returns `true`/`false` correctly when env var set ('true'/'false'/'1'/'0' handling — pick one convention and test it).
6. `CHECKOUT_CONTROLS` metadata has `availability: 'future'`.

**No tests asserting routes are blocked.**

### A8. RBAC untouched

No edits to `lib/permissions/*`, auth, middleware, RLS, or merchant scoping beyond adding the inert TODO comments above.

---

## PART B — CE 3.0 Copy Correction (Phase 0 honesty)

Phase 0 has no checkout embed / device fingerprinting, so checkout-time IP/device signals may be missing. All CE 3.0 language must distinguish:

1. General chargeback evidence packs
2. CE 3.0 **readiness checks**
3. CE 3.0-qualified evidence **only where required fields are available**
4. Missing CE 3.0 data — especially IP/device signals

**Sweep these files for visible copy** (logic stays untouched — copy-only changes unless a label literally lies):

- `components/evidence/DisputeReadinessPanel.tsx`
- `app/(app)/chargebacks/page.tsx`, `app/(app)/chargebacks/[id]/EvidenceDetailPageView.tsx`, `[id]/page.tsx`
- `app/(app)/dashboard/page.tsx`, `dashboardPageUtils.ts`
- `lib/evidence/ce3.ts`, `lib/evidence/narrative.ts`, `lib/evidence/pdfDocumentView.tsx` (PDF output copy)
- `lib/customers/narrative.ts`
- Landing page CE 3.0 mentions (Part C)

Allowed phrasing: "CE 3.0 readiness", "CE 3.0-style evidence workflow", "where required data is available", "missing evidence fields", "missing IP/device data", "full CE 3.0 qualification may require checkout-time signals".

Banned phrasing: "guaranteed CE 3.0", "automatic CE 3.0 qualification", "CE 3.0-ready for every Shopify merchant", "full CE 3.0 without checkout/device data", "guaranteed dispute win".

`ce3_eligible` binary labels: keep the underlying field; update **visible wording** to graded statuses where easy — "CE 3.0 ready" / "CE 3.0 partial" / "Evidence ready" / "Missing IP/device data" / "Needs stronger checkout-time data". Do **not** refactor the evidence engine.

---

## PART C — Landing Page Repositioning

Files: `app/(public)/landing/page.tsx`, `landingPageConstants.ts`, `_components/sections/*`. **Keep the existing design system, hero artifact direction, and mobile responsiveness — copy/sections/CTAs only, minor layout where copy demands.**

### Positioning

> Unauth is a merchant-side trust network for ecommerce claims, chargebacks, and post-purchase risk.

Ladder language: Free = "after the dispute exists" · Pro = "before you refund" · Advanced = "stronger prevention workflows" (future-leaning) · Enterprise/API = "across the network".

### C1. Hero
- Headline: *"Free chargeback evidence. Paid claim confidence. Network intelligence for ecommerce trust."* (alt: *"Fight chargebacks for free. Upgrade to know who to trust, review, or challenge."*)
- Subheadline: *"Unauth helps merchants turn order, delivery, support, and dispute data into evidence packs, claim-confidence workflows, and privacy-preserving network signals — without turning genuine customers into false positives."*
- Primary CTA → free evidence product; secondary CTA → Pro claim confidence / demo.

### C2. Product ladder section — four cards
1. **Evidence / Recover — Free**: evidence packs; order/delivery/customer/support/dispute context; CE 3.0 readiness checks *where required data exists*; surfaces missing fields incl. IP/device; replaces screenshots/spreadsheets/manual dispute prep.
2. **Claim Confidence / Decide — Pro**: customer history search, claim/refund patterns, trust & risk signals, helpdesk widgets, decide who to trust/review/challenge before refunding. **Merchant keeps the final decision.**
3. **Prevention / Control — Advanced**: future-facing. May include live lookup/scoring, custom rules, review routing, network intelligence, *eventually* checkout controls. Do not imply checkout controls are live.
4. **Network / API — Enterprise**: privacy-preserving trust/risk signal APIs for PSPs/BNPLs/acquirers/platforms/marketplaces/fraud providers; aggregate intelligence without exposing another merchant's private customer records; custom licensing/per-query later.

### C3. "Why merchants upgrade"
Free → recover. Pro → decide. Advanced → prepare to prevent. Enterprise/API → partners query privacy-preserving network signals.

### C4. "Good customers matter too"
Trust signals, claim confidence, consistent history, lower manual review burden — genuine claims resolved faster. Do NOT say good customers are auto-approved across the network.

### C5. "Free replaces the messy evidence workflow"
Spreadsheets, screenshots, manual dispute prep, tracking proof, order timelines. Free is a genuinely valuable wedge ("why are we paying just to prepare chargeback evidence?").

### C6. "Privacy-preserving network intelligence"
"Privacy-preserving", "merchant-scoped records", "aggregate signals", "thresholded network intelligence", "no private customer records exposed across merchants". (Aligns with K_ANONYMITY_MIN=3 thresholding — copy only, no logic.)

### C7. Pricing teaser
No pricing page exists → add a teaser section: Free Evidence — £0 · Pro Claim Confidence — from £99/mo · Advanced Prevention — from £299/mo · Enterprise/API — custom. Mark "planned pricing" / "starting from". No billing wiring.

### C8. Replace old positioning
Remove/rewrite anywhere on landing implying: "fraud graph audit" as the main product, "find out who's been hitting you", "block bad customers", "we identify fraudsters", "cross-merchant blacklist", "shared customer database", "risk score decides refund", "guaranteed/automatic CE 3.0".
Replace with: "identity patterns", "claim confidence", "trust and risk signals", "evidence strength", "support review", "merchant-controlled decisions", "network intelligence", "privacy-preserving signals", "CE 3.0 readiness".
⚠️ Components like `VerdictTicker.tsx`, `MerchantDashboard.tsx`, `NetworkChart.tsx`, `PublicAuditForm.tsx` likely carry the old "audit / who's hitting you" framing — audit each for banned language.

---

## Verification

1. `npx tsc --noEmit`
2. Lint if configured.
3. Run existing test suite + new `productEntitlements.test.ts`; update any landing snapshots.
4. Manual smoke: every app route (Customers, Claims, Watchlist, Reports, Global, Lookup, Chargebacks, Settings) still loads with full content; landing renders desktop + mobile; no lock screens anywhere with env var unset.
5. Grep for banned phrases as a final check: `guaranteed CE 3.0`, `automatic CE 3.0`, `fraudster`, `blacklist`, etc.

## Deliverable checklist (return after implementation)

1. Summary of changes. 2. Files changed. 3. The entitlement model as shipped. 4. Landing sections/copy changed. 5. CE 3.0 wording corrections. 6. Confirmation no gates enforce by default. 7. How to enable enforcement later (`ENFORCE_PRODUCT_GATES=true` / `NEXT_PUBLIC_ENFORCE_PRODUCT_GATES=true` once per-merchant plans come from billing — flip env var, swap `getMerchantProductPlan` to DB-backed, wrap remaining surfaces in `FeatureGate`). 8. Tests run + results. 9. Known follow-ups (billing source of truth, Stripe, per-route enforcement, CE 3.0 graded-status engine work, Phase 1 checkout signals).

## Suggested implementation order

1. A1–A3 (model + helpers + plan stub) → A7 tests green.
2. A5 components (false-safe).
3. A4 nav badges.
4. A6 TODOs.
5. Part B CE 3.0 copy sweep.
6. Part C landing.
7. Verification pass.
