# Unauth — Targeted Re-Audit Report
**Date:** 2026-05-27  
**Baseline:** `./audit/report.md` (27 May 2026)  
**Method:** Playwright browser automation (Chromium, 1440×900) + full source-code review of all changed components  
**Account:** `r***@***.com` (new account, `unauth-test.com` domain)  
**Screenshots:** `./audit/screenshots/reaudit/` (`r01_` → `r25_`)

---

## 1. Re-Audit Summary

**Revised overall score: 77 / 100** (+7 from baseline 70)

The fixes landed, and landed meaningfully. The two areas that were genuinely broken — Claim Review (32) and Shopify Sync Visibility (38) — are both now functional and coherent. Every P0 and P1 item shows at least some progress. The `/api/demo` 403 is gone, the claim panel no longer exposes raw enum strings, the Integrations page exists and is reachable, and the Help page is finally IA-clean.

What moved the most: Shopify Sync (+34 points) and Claim Review (+32 points), driven by previously missing pages now existing and a panel redesign that looks like actual ops software. What still needs attention: Claims discoverability (the nav entry hides itself for new users), two persistent silent redirects (`/evidence` and `/lookup`), and the inability to fully end-to-end verify the CSV claim save — the demo data loaded but did not build customer profiles in the test account, so the live claim-save path couldn't be exercised.

---

## 2. Re-Scored Areas

---

### Area 1 — Claim Review Workflow
**Score: 64 / 100** (baseline: 32 | +32)

#### What changed vs baseline
The panel was completely redesigned. From source (`ClaimReviewPanel.tsx`):

- **Human-readable labels throughout.** All enum values are mapped through label objects: `CLAIM_TYPE_LABELS`, `DECISION_LABELS`, `OUTCOME_LABELS`, `EVIDENCE_TYPE_LABELS`, `EVIDENCE_SOURCE_LABELS`. No raw `missing_parcel` or `post_delivery_claim_rate` strings exposed in the UI.
- **Risk score formatted.** `formatRiskScore(riskScore)` is called — not the raw float.
- **Spinner/loading state.** `animate-spin` CSS class applied on the save button when `state === 'busy'`. All three save buttons (claim, outcome, evidence) show "Saving…" with a spinner.
- **Buttons correctly disabled.** "Save outcome" and "Save evidence" buttons are `disabled={busy || !claimId}` — locked until a claim is saved first. Inline guidance text appears below each: *"Save a claim first to record the outcome."*
- **Hash field behind an Advanced disclosure.** "▼ Advanced — hash & metadata" toggle hides the SHA-256 hash field and metadata key-value editor. Default collapsed.
- **Evidence URL field has a proper label.** `<FieldLabel>Evidence URL (optional)</FieldLabel>` — not a bare placeholder-as-label.
- **History table updates after save.** `refreshHistory()` is called in the `onClaim`, `onOutcome` callbacks.
- **History row click resumes.** Clicking a history row sets `claimId` — the form reconnects to that claim.
- **Draft persistence.** Form state is saved to `localStorage` on every change and reloaded on mount.
- **P0-A CSV fix.** `order_source` defaults to `'audit'` when no Shopify connection; `order_ref` is set for non-Shopify orders. This is the fix that unblocked CSV customers.
- **Inline validation.** `showMsg('Select an order before saving the claim.', 'error')` fires before the API call if no order is selected.

#### What is still unresolved
- **Live save could not be verified.** The demo API loaded 3000 rows but did not build customer profiles on the Customers page for the test account. No customer could be opened, so the full claim-save path (HTTP 200 vs 400) could not be exercised live. Score reflects code analysis + confidence in the P0-A fix.
- **Order picker edge case.** When `orderOptions.length === 0` (customer has no prior audit orders and no Shopify connection), the panel shows a passive message — *"No linked orders yet — pick from this customer's audited orders below, or connect Shopify for live orders."* The order field is then a disabled text box with no way to enter a free-text reference. This means a CSV-only customer with zero prior orders still cannot submit a claim.
- **No amount_at_risk field** in the claim form — the `merchant_claims` table has this column but the panel never captures it, so KPIs on the /claims page always show `—` for "Total at risk."
- **Panel is functional but not opulent.** Visually consistent with the rest of the app, but the customer risk summary is sparse (4 metrics, no risk grade badge, no cluster link).

#### Screenshots
`r10_customers_list.png` — customers page (no profiles in test account post-demo)

---

### Area 2 — Merchant Onboarding
**Score: 80 / 100** (baseline: 78 | +2)

#### What changed vs baseline
- **`/api/demo` now returns HTTP 200.** Confirmed. Response: `{"runId":"…","flaggedCount":40,"rowCount":3000}`. The dashboard populated with charts and data immediately. This was the critical P0-C fix.
- **"Create account" toggle is present.** The login page shows `New here? **Create account**` link which toggles the signup form inline. The label is correct — not "Request access."
- **Work email requirement explained inline.** When the signup form is open, a line appears below the email field: *"Use your work email to verify your store — personal email addresses are not accepted."* This is the P1-D fix.
- **Dashboard reaches a non-sparse, chart-populated state** after demo data loads. Fraud rate over time, transaction volume, identity match breakdown donut, chargeback trend, and risk score distribution are all visible.

#### What is still unresolved
- **`/signup` redirects to `/login`, not `/login?signup=1`.** The fix spec said the redirect should land on `/login?signup=1` to pre-open the signup form. What actually happens: navigating to `/signup` lands on the plain `/login` page with the sign-in form showing, requiring the user to then click "Create account" to reveal the signup fields. Suboptimal but not broken.
- **Signup form requires 4 fields beyond email/password.** Store name (text), platform (select), annual order volume (select), primary concern (select) — all required before the submit button enables. High friction for a first impression, though appropriate for the B2B context.
- **New account lands on `/onboarding`**, not the dashboard, before viewing the app. Navigation away requires clicking through or knowing the URL.

#### Screenshots
`r01_landing_page.png`, `r02_signup_redirect_check.png`, `r03_login_page_default.png`, `r04_signup_form_expanded.png`, `r06_dashboard_state.png`

---

### Area 3 — Shopify Data Sync Visibility
**Score: 72 / 100** (baseline: 38 | +34)

#### What changed vs baseline
Biggest improvement in this re-audit. An entirely new `SyncStatusCard` component and `/settings/integrations` route were added.

- **`/settings/integrations` is accessible and IA-correct.** Clean page: breadcrumb `← Settings`, heading "Integrations", subtitle "Connected platforms and data sources." Settings sub-nav shows Account, Team, **Integrations** (active), Data & privacy.
- **`SyncStatusCard` renders a clear not-connected state.** Grey dot indicator, "Shopify not connected" heading, value explanation: *"Connect Shopify to pull live orders into the claim workflow, see real-time webhooks, and enrich identity signals."*
- **"Connect Shopify →" CTA** links to `/api/shopify/install`.
- **Header pill present on all non-dashboard pages.** "Shopify not connected" pill in top-right header, links to `/settings/integrations`. Confirmed visible on Customers and Claims pages.
- **Integrations findable within 2 clicks from anywhere:** sidebar → Settings → Integrations tab.
- **Connected state (code-verified).** If Shopify is connected, the card shows: shop domain, green dot, order count ("X orders synced"), last order synced timestamp, last webhook, and an error card if `lastError` is set.

#### What is still unresolved
- **`SyncStatusCard` returns `null` on API error.** The component does `if (!status) return null` — if `/api/shopify/status` 500s or 404s, the merchant sees a blank section with just the "Shopify" heading, no error or guidance. This is a silent failure.
- **Integrations page is very sparse.** One card. No explanation of what other integrations are planned, no "coming soon" section, no visual of what a connected state looks like before connecting. A merchant reviewing this page for the first time might wonder if it's still being built.
- **Header pill shows "Shopify not connected" on every page**, including Help and Settings — the context is sometimes irrelevant. The pill text is also slightly mismatched: when not connected it says "Shopify not connected" (informational) but the CTA on the integrations page says "Connect Shopify →" (action). A button rather than a link label in the header would be clearer.

#### Screenshots
`r07_settings_integrations_full.png`, `r08_settings_integrations_loaded.png` (card visible), `r09_header_shopify_pill.png`

---

### Area 4 — Operational Readiness / Claims Page
**Score: 68 / 100** (baseline: 58 | +10)

#### What changed vs baseline
A `/claims` page now exists with a proper workbench layout.

- **KPI strip present.** Four tiles: "OPEN / IN REVIEW: 0 — Needs action", "TOTAL AT RISK: — — All claims", "RESOLVED: 0 — All time", "TOTAL CLAIMS: 0 — All time." Correct data model, human labels, correct hint text.
- **Status filter tabs.** All, Open, Under review, Resolved, Closed — URL-driven (`?status=open`), styled as pill links.
- **Table columns correct.** Order ref (monospace), Type (human label via `CLAIM_TYPE_LABELS`), Status (coloured pill), Decision, At risk (formatted currency), Updated (en-GB date), Review link → `/customers/{id}/claims`.
- **Empty state is excellent.** "No claims yet. Claims appear here when filed from a customer profile. Open a customer, go to the Claims tab, and file your first claim." with "Browse customers →" link. Precise, actionable, purposeful.
- **Page visually consistent** with the rest of the app (WorkbenchPage component, same typography and surface colours).

#### What is still unresolved
- **Claims not in sidebar nav for new accounts.** The sidebar conditionally adds the Claims entry only when `claimsCount > 0`. For a new merchant (or any merchant with zero claims), the sidebar shows no Claims entry. The page is only reachable by: (a) knowing the URL, (b) the WorkbenchPage tab bar shown inside the Claims page itself, or (c) the "Browse customers →" link from an empty state. This undercuts discoverability and contradicts the fix spec ("Claims added to main nav").
- **Total at risk always shows `—`.** The `amount_at_risk` field is never populated from the claim form (not captured), so the KPI always shows a dash regardless of claim activity.
- **No sorting on the table.** Columns are fixed-order, no sort control. Fine for low volume but insufficient for a support agent working 50+ claims.

#### Screenshots
`r11_claims_page_full.png`, `r12_claims_sidebar_nav.png`

---

### Area 5 — Navigation & IA
**Score: 76 / 100** (baseline: 74 | +2)

#### What changed vs baseline
- **Help page is IA-clean.** Confirmed: "Help & Docs" heading, "Guides to get the most out of Unauth." subtitle, four article cards (How Unauth works, Exporting your orders CSV, Understanding confidence grades, How identity matching works), support email fallback. No audit workflow tab bar. Significant fix.
- **Integrations reachable from settings.** Settings sub-nav shows Account, Team, Integrations, Data & privacy — all correct. `/settings/integrations` is a real, working route.
- **Claims page exists** and is internally consistent with the workbench tab bar showing Overview → Cases → Claims → Clusters → Audits → Reports.

#### What is still unresolved
- **`/evidence` silently redirects to `/chargebacks`.** The sidebar still labels this "Evidence packages" (href `/chargebacks`), but the route `/evidence` silently redirects. This is a holdover — the nav label already says "Evidence packages" so the mismatch isn't user-visible, but the redirect is unnecessary noise.
- **`/lookup` silently redirects to `/customers`.** Same pattern — unresolved.
- **`/signup` redirects to `/login` (not `/login?signup=1`).** As noted in Area 2 — the toggle doesn't pre-open.
- **`/settings` redirects to `/settings/account`.** The breadcrumb shows "Settings > Account" on arrival. Not a merchant-facing problem, but another silent redirect.
- **Claims nav entry is conditional.** As noted in Area 4 — hidden when `claimsCount === 0`. This means the IA has a new asymmetry: the route exists, the workbench tab bar references it, but the sidebar nav doesn't.

#### Screenshots
`r13_dashboard.png`, `r14_inbox.png`, `r15_claims.png`, `r16_customers.png`, `r18_help.png`, `r19_settings.png`, `r20_settings_integrations.png`, `r21_evidence_redirect.png`, `r22_lookup_redirect.png`, `r23_help_page_close.png`, `r24_settings_page.png`

---

## 3. Revised Scorecard

| Area | Original Score | New Score | Delta | Notes |
|------|---------------|-----------|-------|-------|
| 1. First impression / visual credibility | 86 | 86 | — | Not re-tested |
| 2. Navigation & IA | 74 | 76 | +2 | Help clean; redirects remain |
| 3. Merchant onboarding | 78 | 80 | +2 | Demo fix confirmed; signup redirect partial |
| 4. Shopify data sync visibility | 38 | 72 | +34 | SyncStatusCard + header pill |
| 5. Customer profile experience | 88 | 88 | — | Not re-tested |
| 6. Claim review workflow | 32 | 64 | +32 | Panel redesigned; live save unverified |
| 7. Fraud / risk explainability | 80 | 80 | — | Not re-tested |
| 8. Shortest path to value | 72 | 72 | — | Not re-tested |
| 9. Enterprise trust & polish | 70 | 70 | — | Not re-tested |
| 10. Data / privacy / security | 84 | 84 | — | Not re-tested |
| 11. Operational readiness | 58 | 68 | +10 | Claims page solid; nav discovery gap |
| 12. Broken / friction points | n/a | n/a | — | — |
| 13. Performance & responsiveness | 82 | 82 | — | Not re-tested |
| 14. ASOS impression (composite) | 70 | **77** | **+7** | Mean of 12 scored areas |

**Revised overall: 77 / 100**  
_(Sum: 86 + 76 + 80 + 72 + 88 + 64 + 80 + 72 + 70 + 84 + 68 + 82 = 922 ÷ 12 = 76.8, rounded to 77)_

---

## 4. Remaining Gaps

### Critical

| # | Gap | Detail |
|---|-----|--------|
| C-1 | Claims nav hidden for new users | `claimsCount === 0` removes the Claims sidebar entry entirely. The fix spec says "Claims added to main nav (conditionally shown)" — but the condition is too strict. A new merchant opening the app after onboarding will see no Claims entry and may never find the page. |
| C-2 | Claim save end-to-end unverified | Demo data did not create customer profiles on the test account (3000 rows processed but Customers page shows 0). Could not navigate to any customer → claims tab → save claim. The P0-A code fix is correct in principle but live HTTP success rate is unknown. |

### High

| # | Gap | Detail |
|---|-----|--------|
| H-1 | Order picker fails when no prior audit orders | If a customer has zero audit orders and no Shopify connection, the order field becomes a read-only "no linked orders" message. Free-text order reference entry is not possible. CSV-only customers with no history cannot submit a claim. |
| H-2 | `SyncStatusCard` silent failure | Returns `null` if `/api/shopify/status` returns a non-2xx. Merchant sees a blank section — not "not connected", not an error. Should degrade to the not-connected state on API error. |
| H-3 | `amount_at_risk` never captured | The claim form has no field for it. `/claims` KPI "Total at risk" will always show `—` until this is added. |
| H-4 | `/signup` redirect incomplete | Navigating to `/signup` lands on `/login` without `?signup=1` — the toggle doesn't pre-open. Requires an extra click to reach the account creation form. |

### Medium

| # | Gap | Detail |
|---|-----|--------|
| M-1 | `/evidence` and `/lookup` silent redirects | Both still redirect silently. The nav labels are already aligned (`Evidence packages` → `/chargebacks`, `Customers` → `/customers`), but clean the routes. |
| M-2 | Integrations page is sparse | One card, no future roadmap section, no visual of connected state. Feels thin for a settings page that will presumably grow. |
| M-3 | Header pill shows on irrelevant pages | "Shopify not connected" appears on Help, Settings, and other pages where the Shopify status is not meaningful context. Consider limiting to Customers, Claims, Inbox. |
| M-4 | No sorting on /claims table | Single-column (updated_at desc), no sort controls. Insufficient for 20+ claims. |

### Low

| # | Gap | Detail |
|---|-----|--------|
| L-1 | `/settings` silent redirect to `/settings/account` | Minor, user-invisible, but a holdover redirect worth cleaning. |
| L-2 | Signup form requires 4 fields | Correct for B2B but adds friction. Consider deferring platform/volume/concern to the onboarding step. |
| L-3 | Panel has no amount_at_risk capture | Noted above at H-3; also means the "At risk" column on /claims is always blank until corrected. |

---

## 5. Revised Verdict

**Strong pilot-ready** (approaching, but not yet confirmed)

| Metric | Value |
|--------|-------|
| Revised score | **77 / 100** |
| Baseline score | 70 / 100 |
| Delta | **+7 points** |
| Largest single gain | Shopify sync visibility: +34 |
| Second largest | Claim review workflow: +32 |

The app has moved from "controlled pilot-ready only" to the edge of "strong pilot-ready." The two previously-broken pillars — claims and Shopify sync — are now coherent and functional. The demo path works. The Help page is IA-correct. The onboarding copy has the right guidance inline.

The remaining gap to **ASOS-demo-ready** is approximately 8–10 points. To close it:

1. **Must fix before any pilot:** Verify the CSV claim save end-to-end with real customer data (C-2). Fix Claims nav so it's always visible to any logged-in merchant (C-1). Add free-text order reference input as a fallback in the order picker (H-1).

2. **Should fix before expansion:** Add `amount_at_risk` to the claim form (H-3). Fix the `SyncStatusCard` null-on-error case (H-2). Complete the `/signup → /login?signup=1` redirect (H-4).

3. **Polish for ASOS-demo:** Sort controls on /claims table, sparse integrations page, header pill scoping.

---

## Appendix: Console & Network Errors

### Errors by route

| Route | Type | Message |
|-------|------|---------|
| `/login` | console_error | `Failed to load resource: the server responded with a status of 400 ()` |

**Cause:** The 400 on `/login` is the Supabase auth endpoint rejecting a duplicate signup attempt (the test account was being recreated on a second run). Not a product bug — expected for a retry against an existing account.

### API errors during session

None recorded ≥ 400 during the authenticated portion of the audit. `/api/demo` returned 200. `/api/shopify/status` returned data sufficient for the SyncStatusCard to render the not-connected state.

### Routes that silently redirect

| Requested | Landed on | Issue |
|-----------|-----------|-------|
| `/signup` | `/login` | Should be `/login?signup=1` |
| `/evidence` | `/chargebacks` | Silent redirect, nav label already aligned |
| `/lookup` | `/customers` | Silent redirect |
| `/settings` | `/settings/account` | Silent redirect |

### No page errors or request failures recorded

No `pageerror` or `requestfailed` events were captured on any authenticated route.
