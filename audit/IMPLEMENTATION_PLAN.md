# Unauth — Implementation Plan: From 69 → 90+ (ASOS / Enterprise-grade)

Companion to [`report.md`](report.md). This is the engineering remediation plan that turns the audit findings into concrete, sequenced work with real file references, root causes, schema changes, acceptance criteria, and effort estimates.

**Target:** lift the overall ASOS-readiness score from **69 → ~82 after P0/P1**, and **~90 after full polish**, by (a) making the claims workflow actually work and look enterprise-grade, (b) making Shopify sync legible, and (c) closing the polish gaps that read as "amateur."

---

## 0. Guiding constraints (read first)

These are hard rules from `CLAUDE.md`. Every task below respects them:

- **Do not touch scoring/weighting/matching/cluster logic.** No edits to `lib/engine/weights.ts` values, `lib/scorer.ts`, `lib/engine/fastScore.ts` thresholds, or identity-matching algorithms. Where we *filter by* an existing constant (e.g. `FLAG_THRESHOLD`), we read it from `lib/engine/weights.ts` — we never redefine it.
- **No `as any` in new production code.** The existing claims/Shopify code uses `as any` because the generated `Database` types don't include the newer tables (`merchant_claims`, `merchant_shopify_connections`, `shopify_order_signals`, etc.). **Prerequisite task P0-0**: regenerate Supabase types so all new code is fully typed.
- **No `// eslint-disable`.** Fix the underlying type/lint issue.
- **SSOT.** New constants/enums go in a single canonical file and are imported everywhere (mirrors the table in `CLAUDE.md`).
- **Migrations are forward-only and additive** where possible (nullable columns, new tables). No destructive changes to existing claim data.

---

## 1. Root-cause summary (what's actually wrong)

| # | Symptom (from audit) | Root cause (file:line) | Severity |
|---|---|---|---|
| C1 | `Save claim` → `Invalid claim payload` (400) for CSV customers | `createClaimSchema` requires `shop_domain: z.string().min(1)` (`lib/claims/store.ts:13`); panel sends `shop_domain: ''` (`components/claims/ClaimReviewPanel.tsx:202`). Schema fails before anything else. | Critical |
| C2 | Even with a shop, claim 403s for CSV merchants | POST handler gates on `merchantOwnsShopDomain` against `merchant_shopify_connections` (`app/api/claims/route.ts:79`); CSV-only merchants have no connection. | Critical |
| C3 | Claim panel looks like a dev prototype | `ClaimReviewPanel.tsx` renders raw enums, placeholder-only inputs, raw signal name `postDeliveryClaimRate` and unrounded score `31.363636363636363` (`ClaimReviewPanel.tsx:258,260`). | Critical |
| H1 | "Shopify not connected" is the only sync signal | Binary pill in `components/layout/AppHeader.tsx:193`; no sync-status surface anywhere. | High |
| H2 | In-product sample data 403s for new owners | `app/api/demo/route.ts:255` resolves merchant with the **user-scoped** client; the owner's `merchants` row isn't readable that way. Other routes use `requirePermission(serviceClient,…)` and work. | High |
| H3 | Claims model disconnected from audit data | Claims require Shopify orders; CSV produces `audit_transactions`/`customer_profiles`, never `shopify_order_signals`. The two halves don't meet. | High |
| M1 | Signup hidden | `app/(public)/signup/page.tsx:4` → `redirect('/#run-free-audit')`; real signup is the "Request access" toggle in `app/(auth)/login/page.tsx:131`. | Medium |
| M2 | Inbox reads "all caught up" with risky data | `lib/supabase/filters.ts:15` `buildReviewableFilter()` filters on `identity_confidence_grade IN (probable,definite)` only — **risk score is never consulted**; empty-state copy wrongly says "high or critical" (`app/(app)/inbox/page.tsx`). | Medium |
| M3 | First-run dashboard sparse/empty | `components/dashboard/DashboardCharts.tsx` buckets raw transactions at render; one audit = one date → flat charts; no per-chart low-data affordance. | Medium |
| M4 | IA mismatches | Help reuses `WorkbenchPage` nav with `activeNavKey="audits"` (`app/(app)/help/page.tsx:27`); `/evidence`→`/chargebacks`, `/lookup`→`/customers`, `/settings`→`/settings/account` silent redirects. | Medium |
| M5 | Settings "Monthly order volume" blank | Enum mismatch: signup stores `under_10k\|10k_50k\|50k_250k\|over_250k` (`login/page.tsx`), settings select expects `under_500\|500_2000\|2000_10000\|10000_plus` (`settings/account/page.tsx`). Value never matches an option. | Low |
| L1 | Unrounded floats / raw field names app-wide | No shared score formatter or signal-label map. | Low |
| L2 | Cold route / wedged dev build | Turbopack stale-cache deadlock; 7.5s cold dynamic-route compile; 3s claim saves with no skeleton. | Low |

---

## 2. Cross-cutting foundations (build these first — everything else depends on them)

### P0-0 · Regenerate Supabase types (unblocks "no `as any`")
- **Do:** `supabase gen types typescript --project-id <id> > lib/supabase/types.ts` (or the project's existing generation script). Confirm `merchant_claims`, `merchant_case_outcomes`, `claim_evidence_items`, `merchant_shopify_connections`, `shopify_order_signals`, `shopify_refund_fulfillment_events`, `merchant_identities` are present.
- **Then:** delete the `as any` casts in `app/api/claims/route.ts`, `lib/claims/store.ts`, `app/api/customers/[id]/shopify-orders/route.ts`, `app/(app)/layout.tsx`. Replace `serviceClient.from('merchant_claims' as any)` with typed access.
- **Acceptance:** `npm run lint` passes with zero `as any` in the claims/shopify code paths.
- **Effort:** 0.5 day.

### P0-1 · Shared number/score formatter (SSOT)
- **New file:** `lib/utils/format.ts` (or extend the existing `formatCurrencyNullable` home).
  ```ts
  export function formatRiskScore(score: number | null | undefined): string {
    if (typeof score !== 'number' || Number.isNaN(score)) return '—';
    return Math.round(score).toString();          // 31.3636… → "31"
  }
  export function formatPercent(n: number | null | undefined, dp = 1): string { … }
  ```
- **Use everywhere a score renders**, starting with `ClaimReviewPanel.tsx:258`.
- **Acceptance:** no raw float like `31.363636363636363` appears in any UI.
- **Effort:** 0.25 day.

### P0-2 · Human-readable signal labels (SSOT)
- **New file:** `lib/utils/signalLabels.ts` — maps every internal fraud-flag/signal name to `{ label, description }`. Source the key list from the canonical signal names already used by the engine (do **not** change the engine; only label its outputs).
  ```ts
  export const SIGNAL_LABELS: Record<string, { label: string; description: string }> = {
    postDeliveryClaimRate: { label: 'Repeat post-delivery claims', description: 'Customer files refund/INR claims after orders are marked delivered, at an elevated rate.' },
    addressClustering:     { label: 'Shared address cluster',      description: 'This address is shared across multiple accounts/identities.' },
    crossMerchant:         { label: 'Seen at multiple merchants',  description: 'This identity appears in other merchants’ data in the network.' },
    // …one entry per signal the engine can emit
  };
  export function signalLabel(name: string) { return SIGNAL_LABELS[name]?.label ?? humanizeFallback(name); }
  ```
- **Acceptance:** the claim panel and customer profile show "Repeat post-delivery claims", never `postDeliveryClaimRate`. Add a unit test asserting every engine signal name has an entry (fail CI if a new signal lacks a label).
- **Effort:** 0.5 day.

### P0-3 · Canonical "order volume" + "fraud concern" enums (SSOT) — fixes M5
- **New file:** `lib/constants/merchantProfile.ts`:
  ```ts
  export const ORDER_VOLUME_OPTIONS = [
    { value: 'under_10k',  label: 'Under 10,000 / yr' },
    { value: '10k_50k',    label: '10,000–50,000 / yr' },
    { value: '50k_250k',   label: '50,000–250,000 / yr' },
    { value: 'over_250k',  label: 'Over 250,000 / yr' },
  ] as const;
  export const FRAUD_CONCERN_OPTIONS = [ /* refund_abuse | inr_claims | chargebacks | all */ ];
  ```
- **Use in both** `app/(auth)/login/page.tsx` (signup) and `app/(app)/settings/account/page.tsx`. One source of truth → the saved value always matches an option.
- **Migration (data backfill, optional):** map any legacy `under_500/500_2000/…` rows to the canonical set.
- **Acceptance:** set volume at signup → it is pre-selected in Settings.
- **Effort:** 0.25 day.

---

## 3. P0 — Critical (must fix before any pilot)

### P0-A · Make claims work without Shopify (fixes C1, C2, H3)
The product scores customers from CSV but claims demand a Shopify order. Decouple them: a claim is anchored to a **merchant-owned customer profile** plus an **order reference that may come from the audit data, a CSV, or Shopify**.

**Schema** — new migration `…_claims_decouple_shopify.sql` (additive, non-destructive):
- `merchant_claims.shop_domain` → make **nullable**.
- Add `merchant_claims.order_source text` (`'shopify' | 'csv' | 'audit' | 'manual'`).
- Add `merchant_claims.order_ref text` (free-form order number when not a Shopify id).
- Add `merchant_claims.audit_transaction_id uuid null` (FK to `audit_transactions.id`) for audit-sourced orders.
- Mirror nullable `shop_domain` on `merchant_case_outcomes`.
- RLS: keep existing merchant-scoped policies; no widening.

**Validation** — `lib/claims/store.ts`:
- `createClaimSchema`: `shop_domain: z.string().min(1).nullable().optional()`, add `order_source`, `order_ref`, `audit_transaction_id`. Add a refinement: **at least one of** `shopify_order_id`, `order_ref`, or `audit_transaction_id` is present (so a claim still has an order anchor).
- `createOutcomeSchema`: same nullable treatment for `shop_domain`.

**API** — `app/api/claims/route.ts`:
- Replace the `merchantOwnsShopDomain` gate (line 79) with **ownership-by-customer**: verify the `customer_id` profile belongs to the merchant via `fetchMerchantScopedCustomerProfile(service, ctx.merchantId, customer_id, ctx.userId)` (already used in the shopify-orders route). If `shop_domain` *is* supplied, additionally verify ownership of it (keep the existing check as an AND, not the sole gate).
- Return a **specific** error when the order anchor is missing: `{ error: 'Select an order before saving the claim.' }` (422), never the generic `Invalid claim payload`.

**Client** — `components/claims/ClaimReviewPanel.tsx`:
- `orderOptions` already merges `data.orderHistory` (audit transactions) → keep. When the selected order came from audit history, send `order_source:'audit'`, `audit_transaction_id`, `order_ref:<orderNumber>`, and `shop_domain: shopDomain || null`.
- When a Shopify connection exists, keep the current Shopify path.

**Acceptance:**
- On a CSV-imported customer, selecting an audit order → `Save claim` returns 200 and the claim appears in Claim History.
- `Save outcome` (denied / suspected_fraud) and `Save evidence` succeed and persist.
- Re-run `node audit/run-audit-4.js` → `evidence4.json.errorsByRoute` is empty; `51_claim_saved.png` shows a green success banner.
- **Effort:** 2 days.

### P0-B · Redesign the Claim Review panel to the design system (fixes C3, L1)
Rebuild `components/claims/ClaimReviewPanel.tsx` (and split into subcomponents) so it matches the polish of the customer profile (`48_customer_profile`).

**Concrete changes:**
1. **Summary header** uses `formatRiskScore` (no raw floats) and `signalLabel()` (no `postDeliveryClaimRate`). Show confidence grade badge consistent with the rest of the app (`lib/utils/confidenceStyles.ts`).
2. **Order picker**: real labelled select with formatted options; when empty and no Shopify, show an inline helper: "No linked order yet — pick from this customer's audited orders below" (not a dead "No Shopify orders found").
3. **Replace placeholder-as-label inputs** with proper `<label>` + helper text. Drop "Claim id (optional, for update)" from the primary UI (it's an internal concern — derive update vs create from state).
4. **Decision/outcome**: replace bare enum dropdowns with labelled options using human strings (map enum → label, reuse SSOT). Group as a single "Resolve claim" step.
5. **Evidence**: replace the manual `evidence url` / `evidence hash` inputs with a **file drop-zone that auto-hashes** (SHA-256 client-side) and stores to the `evidence-packages` bucket; keep URL as an "or paste a link" secondary path. Hide the key/value metadata rows behind an "Advanced" disclosure.
6. **One primary action per step**; use `var(--accent)` / design tokens already in the file. Add an inline success/error toast consistent with the app's toast (`@radix-ui/react-toast` is already a dependency).
7. **Loading**: disable + spinner on the ~3s saves (skeleton/`loading` state) — addresses L2.

**Acceptance:** side-by-side, the claim screen is visually indistinguishable in quality from the customer profile; no raw enum/field names; a non-technical support agent can complete claim → outcome → evidence unaided. Screenshot `49_claim_panel` re-captured shows the redesigned card.
- **Effort:** 2.5 days.

### P0-C · Fix in-product sample data for new owners (fixes H2)
- **`app/api/demo/route.ts:250-263`:** stop resolving the merchant with the user-scoped client. Mirror the working pattern from `app/api/claims/route.ts:26`: `const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.<appropriate>)` and use `ctx.merchantId`. (`requirePermission` already resolves the merchant for owners — that's why `/api/customers` worked in the audit while `/api/demo` 403'd.)
- **Defense in depth:** add/confirm an RLS policy on `merchants` allowing `select` where `user_id = auth.uid()` so owner reads never depend on membership rows.
- **Acceptance:** a brand-new account can click "Try with sample data" on onboarding and land on a populated dashboard; re-run `node audit/run-audit.js` → `seedDemo` step returns 200, not 403.
- **Effort:** 0.5 day.

---

## 4. P1 — High (before an ASOS-level demo)

### P1-A · Shopify connection & sync visibility (fixes H1)
Build a real sync surface using tables that already exist (`merchant_shopify_connections`, `processed_webhooks`, `shopify_order_signals`, `shopify_refund_fulfillment_events`).

- **New API:** `app/api/shopify/status/route.ts` → returns `{ connected, shopDomain, lastOrderSyncedAt, lastWebhookAt, orderCount, lastError }` (max `created_at_shopify` from `shopify_order_signals`, latest `processed_webhooks` row, counts).
- **New component:** `components/shopify/SyncStatusCard.tsx` — connected shop, last sync (relative + absolute), records pulled, last webhook event, last error with a "Reconnect" CTA.
- **Placement:** (1) a new **Settings → Integrations** tab (`app/(app)/settings/integrations/page.tsx`); (2) a dashboard card shown when connected; (3) make the header pill in `AppHeader.tsx:193` link to Settings → Integrations instead of straight to `/api/shopify/auth`.
- **Acceptance:** a merchant can answer "is data flowing / is it stale / did it fail?" in one screen. When disconnected, the card explains what connecting unlocks (live orders for claims — ties to P0-A).
- **Effort:** 2 days.

### P1-B · Make the review queue reflect risk, not just identity matches (fixes M2)
- **Copy fix (ship immediately, 15 min):** `app/(app)/inbox/page.tsx` empty-state — change "No high or critical transactions need review right now." to language that matches the actual filter, e.g. "No flagged identity matches need review right now."
- **Product fix:** add a **risk-based** inclusion path to the queue. In `lib/supabase/filters.ts`, add `buildRiskQueueFilter()` that also includes transactions/profiles whose score ≥ `FLAG_THRESHOLD` (imported from `lib/engine/weights.ts` — **value unchanged**). Surface a toggle in the inbox: "Identity matches" vs "All flagged" (risk OR identity). This is a query change, not a scoring change.
- **Acceptance:** with the audit fixture (46 medium-risk customers, refund behaviour), the inbox shows actionable rows under "All flagged" instead of "all caught up."
- **Effort:** 1 day.

### P1-C · First-run dashboard that doesn't read empty (fixes M3)
- **Per-chart low-data affordance** in `components/dashboard/DashboardCharts.tsx`: when a chart has < N distinct points, render a subtle "Charts fill in as you run more audits" overlay instead of a flat axis.
- **Sample state:** once P0-C lands, a new account auto-seeds sample data so the first dashboard is populated; gate behind a dismissible "Sample data" banner with a "Clear sample data" action.
- **KPI copy:** when `avgFlagRate === null` etc., show "Awaiting data" (already partly done) consistently.
- **Acceptance:** first real login never shows five empty charts with no explanation.
- **Effort:** 1 day.

### P1-D · Surface signup clearly (fixes M1)
- Make `app/(public)/signup/page.tsx` render the login page in sign-up mode (`<LoginPage initialMode="signup" />`) instead of redirecting to a landing anchor, **or** relabel the login toggle from "Request access" → "Create account" and add a visible "New here? Create an account" link on `/login`.
- Keep the company-email gate (`app/api/account/setup` `PERSONAL_EMAIL_DOMAINS`) but **explain it inline** ("Use your work email to verify your store") rather than failing after submit.
- **Acceptance:** a new merchant reaches a working signup form in ≤1 click from `/login` and understands the email rule before submitting.
- **Effort:** 0.5 day.

---

## 5. P2 — Polish (enterprise trust & consistency)

### P2-A · IA cleanup (fixes M4)
- **Help page** (`app/(app)/help/page.tsx:27`): stop using the workbench `navItems`/`activeNavKey="audits"`. Give Help its own simple header (title + breadcrumb), no audit-workflow tab bar.
- **Redirect hygiene:** `/lookup`→`/customers`, `/evidence`→`/chargebacks`, `/settings`→`/settings/account` are fine as redirects, but audit the codebase for any user-visible link that still points at `/chargebacks` or `/evidence` and standardize on one. Consider renaming the route `/chargebacks` → `/evidence-packages` to match the nav label (larger change; optional).
- **Effort:** 0.5 day.

### P2-B · Evidence as packages, not raw fields
- Already covered structurally by P0-B's drop-zone; additionally wire saved evidence into the existing **Evidence packages** (`/chargebacks`) view so a claim's evidence appears there and can be exported as a CE3.0/chargeback packet (the app already has `@react-pdf/renderer` and an evidence PDF route `app/api/evidence/[id]/pdf`).
- **Effort:** 1 day.

### P2-C · Settings & profile persistence + small consistency passes
- Ship P0-3 (volume enum). Audit casing/labels for consistency (status badges, button verbs). Ensure the merchant name and email render consistently in the sidebar header (the truncated "Audit …" in the logo area).
- **Effort:** 0.5 day.

### P2-D · Performance & resilience (fixes L2)
- **Add `loading.tsx`/Suspense skeletons** for the slow routes (customer profile, claim panel, audit results) so the 3–7s operations show structure, not blank.
- **Dev resilience:** document and script a recovery for the Turbopack stale-cache deadlock observed at audit start (`rm -rf .next && npm run dev`); add a `predev` cache-sanity check or pin a known-good Turbopack version. For demos, run a **production build** (`npm run build && npm start`) so no route compiles on demand.
- **Double-submit guards:** confirm the new claim/outcome/evidence buttons disable during in-flight requests (P0-B includes this).
- **Effort:** 1 day.

---

## 6. Sequencing & milestones

```
Week 1  (Foundations + Criticals)
  P0-0 types ─┬─ P0-1 formatter ─┬─ P0-2 signal labels ─┬─ P0-3 enums
              │                  │                       │
              └──────────────────┴───── P0-A claims-decouple ──── P0-B claim redesign
  P0-C demo/RLS  (parallel)
  → Milestone M1: "Claims work end-to-end for CSV merchants and look enterprise-grade."  (score ≈ 80)

Week 2  (High)
  P1-A shopify sync ── P1-B review queue ── P1-C first-run dashboard ── P1-D signup
  → Milestone M2: "All five personas have a working, legible path."  (score ≈ 82–84)

Week 3  (Polish)
  P2-A IA ── P2-B evidence packages ── P2-C persistence/consistency ── P2-D perf
  → Milestone M3: "ASOS-demo-ready."  (score ≈ 88–90)
```

**Total effort:** ~13–15 engineer-days (one engineer ~3 weeks; parallelizable to ~1.5 weeks with two).

---

## 7. Definition of done & verification

Re-run the audit harness built during this review (kept in `audit/`):

| Check | How | Pass condition |
|---|---|---|
| Claims work for CSV | `node audit/run-audit-4.js` | `evidence4.json.errorsByRoute` empty; success banner in `51_claim_saved.png` |
| Sample data for new owner | `node audit/run-audit.js` | `seedDemo` step status 200 |
| Full nav clean | `node audit/run-audit-5.js` | zero console/network errors (already true except claims) |
| Signal labels | unit test | every engine signal name has a `SIGNAL_LABELS` entry |
| No raw floats | grep UI render paths | `formatRiskScore` used at every score render |
| Lint/types | `npm run lint && tsc --noEmit` | no `as any` in claims/shopify paths, no eslint-disable |
| Visual regression | re-capture `49_claim_panel`, `46_dashboard_populated` | matches design-system quality of `48_customer_profile` |

**Target scorecard after this plan (vs. current):**

| Area | Now | After P0/P1 | After P2 |
|---|---|---|---|
| Claim review workflow (6) | 32 | 78 | 88 |
| Shopify sync visibility (4) | 38 | 80 | 85 |
| Operational readiness (11) | 58 | 78 | 86 |
| Fraud/risk explainability (7) | 80 | 88 | 92 |
| Enterprise trust & polish (9) | 70 | 82 | 90 |
| **Overall** | **69** | **~82** | **~90** |

---

## 8. Risks & watch-outs

- **Claims decoupling touches shared schema.** The migration is additive (nullable + new columns), but verify no existing report/export reads `shop_domain` as non-null. Grep `merchant_claims` consumers before shipping P0-A.
- **Don't let "include risk in the queue" (P1-B) drift into changing what `FLAG_THRESHOLD` *is*.** We only *read* it; the value stays in `lib/engine/weights.ts`.
- **Type regeneration (P0-0) may surface latent type errors** elsewhere that `as any` was hiding. Budget time to fix them properly (the rule forbids re-adding `as any`).
- **Sample-data auto-seed (P1-C)** must be clearly labelled and one-click clearable, or it undermines the "we're careful with your data" trust message.
- **Company-email gate** is a real adoption risk for SMB pilots; confirm with product whether ASOS-tier merchants always have corporate domains before hard-enforcing.
```
