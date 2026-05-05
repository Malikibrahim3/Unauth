# App Cohesion Audit
**Date:** 5 May 2026  
**Auditor:** GitHub Copilot (Playwright + Code Scan)  
**Method:** End-to-end Playwright simulation (13 pages visited, 15 user flows recorded, 22 screenshots captured) + full codebase static analysis

---

## Evidence Summary

| Signal | Value |
|---|---|
| Pages visited by Playwright | 13 (dashboard → upload → history → audit → tabs) |
| Screenshots captured | 22 |
| Click flows recorded | 15 |
| Limitations noted | 4 |
| Upload flow completion | Seeded via `/api/demo` — results found via history fallback |
| Customer drawer opened | ❌ No "View" button found (client-side rendering race) |

Playwright evidence file: `reports/ux-audit/ux-audit-evidence.json`  
Screenshots: `reports/ux-audit/screenshots/`

---

## Executive Summary

The app works, but it does not feel cohesive. The same concept — a **customer** — is represented in at least **four different components** across three different layers, none of which share code. Every page that needs to show a risk badge, format a date, or render a currency value re-implements those helpers from scratch. Navigation between audit results, customer profiles, and back again feels circular and inconsistent. A `PageHeader` component exists but is used **nowhere**. An `EmptyState` component exists but is used **nowhere**. The app has the bones of a well-structured system but has accumulated enough technical debt that a user investigating a customer has to mentally re-orient themselves every time they switch view.

The biggest risks are:
1. A user investigating a customer from the audit view sees different UI than when they reach the same customer from the Customers page.
2. The "View all customers" route (`/audit/[runId]/customers`) and the audit page's Customers tab show overlapping data in completely different formats — users don't understand why both exist.
3. Navigation can loop: Audit → Customer (drawer) → "View full profile" → `/customers/[id]?audit=...` → Back → `/customers` (not back to audit).

---

## Top 10 Most Serious Issues

### 1. 🔴 CRITICAL — Three-headed Customer Profile

**Severity:** Critical  
**Pages affected:** Audit results, `/audit/[runId]/customers`, `/customers/[id]`

There are **three distinct UI representations** of a customer:

| Component | Location | What it shows | Entry point |
|---|---|---|---|
| `CustomerIntelligenceDrawer` | `components/customers/CustomerIntelligenceDrawer.tsx` (478 lines) | Full slide-out panel: timeline, score, transactions, notes, watchlist | Clicking a row in `AuditCustomersTableClient` or `CustomersTableClient` |
| `CustomerProfileCard` | `components/audit/CustomerProfileCard.tsx` | Accordion card: emails, risk bar, order history | `/audit/[runId]/customers` page via `CustomerList` |
| Full page | `app/(app)/customers/[id]/page.tsx` (660 lines) | Same info as drawer but as a full page, standalone | Direct URL, breadcrumb from drawer |

**Why it's a problem:**
- Same customer, three different layouts. A user who opens a customer from the Audit page sees the drawer. Another user who navigates from History → Audit → View All Customers sees an accordion card. A third path leads to a full standalone page. They feel like three different products.
- All three re-implement `riskTok`, `riskBadgeStyle`, `riskBarStyle`, `formatCurrency`, `formatDate` independently.
- The drawer and the full page are nearly identical in content but completely different in structure.

**What should happen:** One canonical `<CustomerProfilePanel>` server component. The drawer wraps it, the full page renders it without a wrapper.

---

### 2. 🔴 CRITICAL — Duplicate Customer List Views

**Severity:** Critical  
**Pages affected:** `/audit/[runId]?tab=customers` vs `/audit/[runId]/customers`

There are **two separate pages** that list customers from the same audit:

| Route | Component | Format | Entry |
|---|---|---|---|
| `/audit/[runId]?tab=customers` | `AuditCustomersTableClient` | Compact table with email, grade, score, "View" button | Default Customers tab on audit results |
| `/audit/[runId]/customers` | `CustomerList` + `CustomerProfileCard` | Accordion cards with full details inline | "View all" link on the customers tab header |

**Why it's a problem:**
- Users think they're looking at the same data but in two completely different visual formats.
- The `/audit/[runId]/customers` page is a **dead-end** — there's no clear path back that doesn't break the audit context. Its breadcrumb goes to the audit, but since it's a separate page, the browser back button works unexpectedly.
- Two different filtering UIs: the tab has a search + grade filter; the `/customers` page has All / Suspicious / Linked / Refunders tabs.
- `CustomerProfileCard` (accordion) and `AuditCustomersTableClient` (table row) render the same customer data in two completely different affordances.

**Files involved:**
- `components/audit/AuditCustomersTableClient.tsx`
- `components/audit/CustomerList.tsx`
- `components/audit/CustomerProfileCard.tsx`
- `app/(app)/audit/[runId]/customers/page.tsx`

---

### 3. 🔴 CRITICAL — Risk Helpers Triplicated Across Files

**Severity:** Critical (technical debt + consistency risk)

The following helper functions are independently re-defined in **3+ files**:

| Function | Files |
|---|---|
| `riskTok(level)` | `CustomerProfileCard.tsx`, `CustomerIntelligenceDrawer.tsx` |
| `riskBadgeStyle(level)` | `CustomerProfileCard.tsx`, `CustomerIntelligenceDrawer.tsx`, `customers/[id]/page.tsx` |
| `riskBarStyle(level)` | `CustomerProfileCard.tsx`, `CustomerIntelligenceDrawer.tsx`, `customers/[id]/page.tsx` |
| `formatCurrency(n)` | `CustomerProfileCard.tsx`, `CustomerIntelligenceDrawer.tsx`, `customers/[id]/page.tsx`, `dashboard/page.tsx`, `AuditCustomersTableClient.tsx` |
| `formatDate(iso)` | `CustomerProfileCard.tsx`, `CustomerIntelligenceDrawer.tsx`, `customers/[id]/page.tsx` |
| `scoreToGrade(score)` | `audit/[runId]/page.tsx` (locally defined) vs `ConfidenceGrade.tsx` (has `riskLevelToGrade`) |

Note: `lib/utils/format.ts` already exports `formatDate` and `formatCurrency` — these are simply not being imported by all files that need them.

**Why it's a problem:** Any styling change to how risk is displayed must be made in 3+ places. Badge inconsistencies are already visible — `CustomerProfileCard` uses `severityStyle` with an extra map layer that `CustomerIntelligenceDrawer` doesn't have.

---

### 4. 🟠 HIGH — `PageHeader` and `EmptyState` Components Are Never Used

**Severity:** High

The following shared components exist but have **zero usages** in the app:

| Component | File | Purpose |
|---|---|---|
| `PageHeader` | `components/common/PageHeader.tsx` | Consistent page title + breadcrumbs + actions |
| `EmptyState` | `components/common/EmptyState.tsx` | Consistent empty content state |

Every page builds its own breadcrumbs inline. Every page builds its own empty state inline. This means:
- Breadcrumb styling differs page-to-page (some use `gap-2`, some use `gap-1.5`, some use different text colours)
- Empty states have no consistent visual language
- `EmptyDashboardHero.tsx` is yet another bespoke empty state just for the dashboard

**Files involved:**
- `components/common/PageHeader.tsx` (unused)
- `components/common/EmptyState.tsx` (unused)
- `components/EmptyDashboardHero.tsx` (bespoke — used once)

---

### 5. 🟠 HIGH — Broken Back Navigation from Customer Full Page

**Severity:** High  
**Flow:** Audit → Customer drawer → "View full profile" → `/customers/[id]?audit=runId` → Back

When a user opens a customer drawer inside the Audit results page and clicks "View full profile", they are taken to `/customers/[id]?audit=runId`. This full page:
- Has a breadcrumb showing `Customers / Customer Name`, not `Audit / Customers / Customer Name`
- Has a Back link that goes to `/customers`, not back to the audit

The `?audit=runId` query param is accepted but the breadcrumb does not use it to contextualise the back path. The user has lost their audit context.

**File:** `app/(app)/customers/[id]/page.tsx`

```tsx
// Line 233 — always goes to /customers, never back to audit
<Link href="/customers">← All Customers</Link>
```

---

### 6. 🟠 HIGH — `/audit/[runId]/customer/[hash]` Is a Hidden Redirect Nobody Knows About

**Severity:** High  
**File:** `app/(app)/audit/[runId]/customer/[hash]/page.tsx`

This route exists solely to redirect:
```
/audit/[runId]/customer/[hash] → /customers/[id]?audit=[runId]
```

It has no UI. It's a legacy route that works via `email_hash` → `customer_profile.id` lookup. The existence of this redirect layer means there are **two parallel ways** to reach a customer profile from an audit — one via `email_hash` (legacy), one via `customer_profile.id` (current). The hash URL is still being linked to from some places and creates confusion in browser history.

---

### 7. 🟠 HIGH — "Risk Overview" Breadcrumb Leads to Dashboard, Not to Audit Overview

**Severity:** High  
**Playwright finding:** The "Risk Overview" breadcrumb on audit results navigates to `/dashboard`, not to an Audit overview or list page.

From the audit results page, the breadcrumb trail reads:
```
Risk Overview > Audit results
```

Clicking "Risk Overview" takes you to `/dashboard`. But the audit results page IS an audit overview — the user's mental model is that they're drilling into something from the audit. The breadcrumb implies they can go "up" to a parent audit view, but there is no parent audit view — it goes all the way back to the global dashboard, losing context.

**Expected:** Either rename to "Dashboard" (honest) or create `/history` as the canonical audit list and use that as the parent.

---

### 8. 🟡 MEDIUM — Audit Tab Navigation Uses URL Query Params but Feels Like SPA Tabs

**Severity:** Medium  
**File:** `app/(app)/audit/[runId]/page.tsx`

The tabs (Overview / Customers / Transactions / Data quality) change via URL query params (`?tab=...`). This means:
- Every tab switch is a **full server round-trip** (Next.js server component re-render)
- But they **look** like SPA tabs (instant-feeling with client-side routing)
- The `AuditTabs` component renders with the active tab, but switching tabs causes layout flicker because the entire page refetches

Additionally, the "Transactions" tab has 146 buttons visible to Playwright — each transaction has dismiss/view buttons inline. These are heavy client-side components. The page would benefit from making tab content lazy-loaded.

---

### 9. 🟡 MEDIUM — `scoreToGrade` Defined Locally in Audit Page Instead of Using `riskLevelToGrade`

**Severity:** Medium  
**File:** `app/(app)/audit/[runId]/page.tsx` (line 36)

```tsx
function scoreToGrade(score: number): 'definite' | 'probable' | 'possible' | 'weak' {
  if (score >= 85) return 'definite';
  if (score >= 70) return 'probable';
  if (score >= 55) return 'possible';
  return 'weak';
}
```

This converts a numeric score to a grade string. `ConfidenceGrade.tsx` already has `riskLevelToGrade` which converts text risk levels to grades. Neither is a canonical source of truth for the score-to-grade mapping. The thresholds (85/70/55) are duplicated in `lib/scorer.ts` and possibly elsewhere.

---

### 10. 🟡 MEDIUM — `/audit/[runId]/customers` Page Is Unreachable From Standard Navigation

**Severity:** Medium

The route `/audit/[runId]/customers` is linked to from the Customers tab:
```tsx
href={`/audit/${runData.id}?tab=customers`}
// and in the header:
href={`/audit/${runData.id}?tab=customers&...`}
```

But the `/customers` sub-route is only accessible from:
- A "View all" style link inside the Customers tab (not clearly visible)
- Direct URL

In the Playwright audit, Playwright found the "Customers (46)" tab and the "View all transactions" link, but no "View all customers" link was detectable. This sub-route may effectively be a dead page that most users never find.

---

## Duplicate UI / Component Issues

| # | Issue | Files | Severity |
|---|---|---|---|
| D1 | 3 separate customer profile renderers | `CustomerProfileCard.tsx`, `CustomerIntelligenceDrawer.tsx`, `customers/[id]/page.tsx` | 🔴 |
| D2 | 2 customer list views for the same audit | `AuditCustomersTableClient.tsx` + `CustomerList.tsx` + `/audit/[runId]/customers` page | 🔴 |
| D3 | `formatCurrency` defined in 5+ files | dashboard, CustomerProfileCard, CustomerIntelligenceDrawer, customers/[id], AuditCustomersTableClient | 🔴 |
| D4 | `formatDate` defined in 3+ files (and exists in `lib/utils/format.ts`) | CustomerProfileCard, CustomerIntelligenceDrawer, customers/[id] | 🔴 |
| D5 | `riskBadgeStyle` / `riskBarStyle` / `riskTok` defined in 3 files | CustomerProfileCard, CustomerIntelligenceDrawer, customers/[id] | 🔴 |
| D6 | `PageHeader` exists but unused — all pages inline their own breadcrumbs | `components/common/PageHeader.tsx` vs every page file | 🟠 |
| D7 | `EmptyState` exists but unused — pages build their own inline | `components/common/EmptyState.tsx`, `EmptyDashboardHero.tsx` | 🟠 |
| D8 | `ConfidenceGrade` used correctly everywhere, but `riskBadgeStyle` is used as a duplicate badge in some places | Various | 🟡 |
| D9 | Two separate table client components for customers: `AuditCustomersTableClient` and `CustomersTableClient` — different schemas, different UI | Both in `components/` | 🟠 |
| D10 | `CustomerNotes` and `WatchlistStarButton` are shared BUT only imported by audit components, not by the customers page | `components/audit/CustomerNotes.tsx`, `WatchlistStarButton.tsx` | 🟡 |

---

## Broken / Circular Flow Issues

| # | Flow | Issue | Severity |
|---|---|---|---|
| F1 | Audit → Customers tab → "View" → drawer → "View full profile" → `/customers/[id]` → Back → `/customers` (not audit) | Back navigation loses audit context | 🔴 |
| F2 | Audit → "Risk Overview" breadcrumb → Dashboard | "Risk Overview" should be "Dashboard" or link to `/history` | 🟠 |
| F3 | `/audit/[runId]/customers` → breadcrumb "Audit" → `/audit/[runId]` → Customers tab → same list again | Circular — two ways to see the same customer list | 🔴 |
| F4 | Dashboard → "View latest audit" → audit results → "View all customers" → `/audit/[runId]/customers` → back to audit → back to dashboard | Extra page in flow that adds no value beyond what the Customers tab already shows | 🟠 |
| F5 | Watchlist → customer → "View audit" → audit page → "View customer" → drawer → close → audit page (correct, but the watchlist entry "View audit" link links to the audit, not the customer) | Confusing — user wants to go from watchlist to customer detail, but lands in audit first | 🟡 |
| F6 | Upload → processing (stays on /upload) → no visible redirect to results | Upload processing state stays on `/upload`; redirect to `/audit/[runId]` only happens after timeout in our test. Real flow unclear. | 🟡 |

---

## Inconsistent Design Patterns

### Breadcrumb Styles Vary Page to Page

| Page | Breadcrumb approach |
|---|---|
| `audit/[runId]` | Custom inline with `gap-1` and opacity hover |
| `audit/[runId]/customers` | Different inline structure with `gap-2` |
| `audit/[runId]/transaction/[id]` | Another custom inline breadcrumb |
| `customers/[id]` | Another custom inline breadcrumb going to `/customers` |

None use `PageHeader`. All are slightly different.

### Empty States Vary Page to Page

| Page | Empty state approach |
|---|---|
| Dashboard | `EmptyDashboardHero` component |
| Customers | Inline JSX in page.tsx |
| Audit | Inline JSX in page.tsx |
| Others | No empty state / null rendering |

### Button / CTA Labels Are Inconsistent

| Action | Label used |
|---|---|
| Open customer detail | "View" (with ArrowRight icon) in `AuditCustomersTableClient` |
| Open customer detail | Row `onClick` (no button label) in `CustomersTableClient` |
| Navigate to customer full page | "View full profile" in drawer |
| Navigate to customer from watchlist | Row click (no button) |

The same action — "view more about this customer" — has 3 different interaction models across the app.

### Risk Display Is Inconsistent

| Place | Risk display method |
|---|---|
| `AuditCustomersTableClient` | `<ConfidenceGrade>` component |
| `CustomersTableClient` | `<ConfidenceGrade>` component |
| `CustomerProfileCard` | Inline `riskBadgeStyle()` span |
| `customers/[id]/page.tsx` | Both `<ConfidenceGrade>` AND `riskBadgeStyle()` inline spans on the same page |
| Transactions table | `<ConfidenceGrade>` component |

`customers/[id]/page.tsx` uses BOTH the canonical `ConfidenceGrade` component and the local `riskBadgeStyle` inline helper on different parts of the same page. This means the same risk level can look different within a single page.

---

## Playwright-Observed Specific Issues

From evidence at `reports/ux-audit/ux-audit-evidence.json`:

1. **"Export CSV" button not found on audit results** — Either the button is not in the visible viewport, or it only appears conditionally (e.g., requires scrolling or a specific tab). Playwright looked for it on the Overview tab.

2. **Upload always times out before redirecting** — The upload processing route (`/upload`) stays on the upload page during processing. The test had to fall back to the history page to find the completed audit. Users may not know where to look after clicking "Upload and run audit."

3. **"Risk Overview" breadcrumb click timed out** — After clicking the breadcrumb on the data quality tab, Playwright timed out waiting for navigation to complete. This suggests slow server-side rendering on the dashboard route after a tab navigation.

4. **Customers tab shows "Customers (46)" but no individual View buttons found** — `AuditCustomersTableClient` is a client component that renders after hydration. Playwright's `waitForNetworkIdle` was not sufficient to wait for React hydration of the customer rows.

---

## Component Standardisation Plan

### Proposed Canonical Component System

#### `CustomerProfilePanel` — Single Source of Truth
**Replace:** `CustomerProfileCard`, `CustomerIntelligenceDrawer` content, `customers/[id]/page.tsx` main content  
**Usage:**
- In `CustomerIntelligenceDrawer.tsx` → wrap in slide-out panel shell
- In `customers/[id]/page.tsx` → render directly in page body
- Remove `CustomerProfileCard.tsx` and `/audit/[runId]/customers` page entirely

#### `RiskBadge` — Canonical Risk Display
**Replace:** `riskBadgeStyle()` inline helper in CustomerProfileCard, CustomerIntelligenceDrawer, customers/[id]  
**Usage:** Everywhere a risk level needs a coloured badge — consolidate around `<ConfidenceGrade>` which already exists  
**Remove:** All local `riskBadgeStyle()`, `riskBarStyle()`, `riskTok()` functions — move any logic differences into `ConfidenceGrade` props

#### `PageHeader` — Already Exists, Start Using It
**File:** `components/common/PageHeader.tsx`  
**Action:** Adopt in every page that has inline breadcrumbs: `audit/[runId]`, `audit/[runId]/customers`, `audit/[runId]/transaction/[id]`, `customers/[id]`, `customers/[id]/evidence/new`

#### `EmptyState` — Already Exists, Start Using It
**File:** `components/common/EmptyState.tsx`  
**Action:** Replace `EmptyDashboardHero.tsx` and all inline empty states with this component  
**Remove:** `components/EmptyDashboardHero.tsx`

#### `CustomerRiskTable` — Single Customer List Component
**Replace:** Both `AuditCustomersTableClient` and `CustomersTableClient`  
**Key difference to merge:** `AuditCustomersTableClient` works with flat email+stats data; `CustomersTableClient` works with `customer_profiles` rows. They should share the same table UI with different data adapters.

---

## Quick Wins (Low Effort, High Impact)

These can be done safely without large rewrites:

1. **Fix back navigation in `customers/[id]/page.tsx`** — Read `?audit=runId` query param and show "Back to Audit" breadcrumb instead of "Back to Customers" when the param is present. (~10 lines)

2. **Use `lib/utils/format.ts` everywhere** — Replace all local `formatCurrency` and `formatDate` functions with imports from `lib/utils/format.ts`. (~5 file edits, mechanical)

3. **Rename "Risk Overview" breadcrumb to "Dashboard"** — The link goes to `/dashboard`. Name it honestly. (~1 line change in `audit/[runId]/page.tsx`)

4. **Add `TODO` comments on duplicate components** — Mark `CustomerProfileCard.tsx`, `CustomerList.tsx`, and `customers/[id]/page.tsx` with refactor intent so future contributors don't add more code to dead-end components.

5. **Show upload progress redirect** — After clicking "Upload and run audit," poll the job status client-side and redirect to `/audit/[runId]` when complete. Currently the user is left on `/upload` with no indication of what comes next.

6. **Remove `/audit/[runId]/customers` page or redirect it** — Either deprecate it and redirect to `/audit/[runId]?tab=customers`, or make it definitively better than the tab. Currently it's a confusing parallel path.

---

## High-Impact Refactors (Planned Work)

| Priority | Refactor | Effort | Impact |
|---|---|---|---|
| P1 | Merge `CustomerIntelligenceDrawer` content and `customers/[id]/page.tsx` into a shared `CustomerProfilePanel` component | Large | Very high — eliminates the #1 source of UX confusion |
| P2 | Delete `CustomerProfileCard` + `CustomerList` + `/audit/[runId]/customers` page; consolidate to `AuditCustomersTableClient` + drawer | Medium | Removes a confusing parallel navigation path |
| P3 | Adopt `PageHeader` everywhere — remove inline breadcrumbs | Medium | Consistency, easier maintenance |
| P4 | Move all risk styling to CSS variables + `ConfidenceGrade` — remove local helpers | Small | Prevents future inconsistency |
| P5 | Make `EmptyState` the single empty state component — remove `EmptyDashboardHero` | Small | Consistency |
| P6 | Fix upload-to-results redirect flow | Medium | High user trust impact — users currently don't know where results go |

---

## Refactor Roadmap

```
Phase 1 — Quick Wins (1–2 days)
  ├── Fix back navigation from customers/[id] (reads ?audit param)
  ├── Centralise formatCurrency + formatDate to lib/utils/format.ts
  ├── Rename "Risk Overview" to "Dashboard" in audit breadcrumb
  ├── Add TODO refactor comments on CustomerProfileCard, CustomerList
  └── Show upload progress / redirect on completion

Phase 2 — Component Consolidation (3–5 days)
  ├── Create unified CustomerProfilePanel
  ├── Remove CustomerProfileCard.tsx
  ├── Remove /audit/[runId]/customers page (redirect to tab)
  └── Adopt PageHeader in all page files

Phase 3 — Design System Alignment (2–3 days)
  ├── Remove all local riskBadgeStyle / riskBarStyle / riskTok
  ├── Adopt EmptyState everywhere (remove EmptyDashboardHero)
  └── Unify customer table affordances (single CTA pattern)
```

---

## Biggest UX Risks in Current App

1. **User loses audit context when drilling into a customer** — The back button doesn't go back to the audit. High risk of user confusion and lost workflow.

2. **Upload completion has no visible redirect** — After clicking "Upload and run audit", the user is left on `/upload`. Without knowing to check `/history`, they may think the upload failed or is stuck.

3. **Two customer list views for the same audit** — When a user navigates to "View all customers" from the audit, they see a completely different UI to the tab they were just on. This breaks mental models and erodes trust in the data's consistency.

4. **Risk badge inconsistency within a single page** — `customers/[id]/page.tsx` uses both `<ConfidenceGrade>` and local `riskBadgeStyle()` on the same page for similar data. A user can see two different visual treatments for the same "high risk" label on one screen.

5. **No empty states or loading states in several key pages** — When the customers page has no customers, or audit results have no flagged transactions, there are no helpful messages guiding the user to next steps.

---

## Files to Delete (After Refactor)

| File | Reason |
|---|---|
| `components/audit/CustomerProfileCard.tsx` | Replaced by `CustomerProfilePanel` |
| `components/audit/CustomerList.tsx` | Replaced by `AuditCustomersTableClient` |
| `app/(app)/audit/[runId]/customers/page.tsx` | Replaced by tab on audit page |
| `components/EmptyDashboardHero.tsx` | Replaced by `EmptyState` component |

## Files to Centralise Logic Into

| File | What should move here |
|---|---|
| `lib/utils/format.ts` | All `formatCurrency`, `formatDate` (already there, just not used everywhere) |
| `lib/utils/riskStyles.ts` (create) | `riskTok`, `riskBadgeStyle`, `riskBarStyle` — or just use CSS variables + `ConfidenceGrade` |
| `components/common/PageHeader.tsx` | All inline breadcrumb patterns (already there, zero usages) |
| `components/common/EmptyState.tsx` | All empty state patterns (already there, zero usages) |
