# Unauth — Merchant Experience Implementation Plan

This document translates the merchant-experience audit into a sequenced, build-ready plan. It covers every finding **except finding #1 (landing page)**, which is deliberately out of scope here.

Each phase is self-contained: it can ship on its own without breaking the app. Phases are ordered by dependency first, then by effort.

> **Scope guardrails** — Features that are **out of scope** in the audit remain out of scope here. No checkout integration, no platform plugin, no API for merchants, no email alerts, no multi-user, no billing, no mobile, no auto-blocking, no third-party integrations.

---

## Phase sequencing at a glance

| Phase | Theme | Findings covered | Blocking? |
|---|---|---|---|
| 0 | Branding & navigation | #2, #26 | No |
| 1 | Language & copy cleanup | #6, #7, #8, #14, #15, #16, #22, #23, #24, #25, #27, #28 | No |
| 2 | Upload flow | #10, #11, #12, #21, #32 | No |
| 3 | Audit results polish | #9, #17, #18, #19, #20 | Depends on Phase 1 (signal labels) |
| 4 | New features (watchlist, notes, cross-merchant teaser) | #3, #4, #5 | Requires new DB tables |
| 5 | Dashboard redesign | #13, #36 | Depends on Phase 1 (copy) and Phase 4 (watchlist for top-customers list) |
| 6 | Nice-to-have | #29, #30, #31, #33, #34, #35 | No |

---

# Phase 0 — Branding & navigation

Small, pure-UI work. Ship first so every later screenshot shows the correct product name.

## 0.1 Consolidate brand to "Unauth" (Finding #2)

**Files to change**

- `app/layout.tsx` — `metadata.title` → `"Unauth — Refund Fraud Audit"`.
- `app/(auth)/login/page.tsx:56` — `<h1>ParcelClaim</h1>` → `<h1>Unauth</h1>`. Update subtitle to `"Refund fraud audit for ecommerce merchants"` (keep).
- `components/nav/Sidebar.tsx:31` — sidebar brand label → `"Unauth"`.
- `app/(app)/dashboard/page.tsx:57` — `"What ParcelClaim does"` → `"What Unauth does"`.
- `README.md` / `SETUP_GUIDE.md` — replace remaining references.

**Acceptance**
- Grep for `ParcelClaim` across `app/`, `components/`, `lib/` returns zero matches.
- Login, sidebar, dashboard empty state, and browser tab all say "Unauth".

## 0.2 Expand sidebar navigation (Finding #26)

**Files to change**
- `components/nav/Sidebar.tsx:23-26` — add new nav items. Final list:

  | Route | Label | Icon | Notes |
  |---|---|---|---|
  | `/dashboard` | Dashboard | `LayoutDashboard` | Existing |
  | `/upload` | New Audit | `Upload` | Existing |
  | `/customers` | Customers | `Users` | New — aggregated across all audits (Phase 5) |
  | `/watchlist` | Watchlist | `Star` | New (Phase 4) |
  | `/history` | History | `Clock` | New — the audit runs table (Phase 5) |

**Acceptance**
- All five items visible in the sidebar.
- Clicking each navigates to the correct page (stubs acceptable if the full implementation ships in Phase 4/5).

---

# Phase 1 — Language & copy cleanup

Pure UI. No DB changes. Unblocks every later phase by giving us one canonical set of labels.

## 1.1 Signal label dictionary (Finding #6)

**New file** — `lib/copy/signalLabels.ts`

Export one function:

```ts
export function signalLabel(name: string): { title: string; short: string; recommended: string }
```

**Mapping (authoritative source — every UI must consume this):**

| Internal name | `short` (for tables) | `title` (for detail views) | `recommended` (next step) |
|---|---|---|---|
| `inrSpeed` | Suspiciously fast 'not received' claim | Claimed 'not received' too fast to be real | Review this refund manually before approving |
| `inrAbuse` | Repeat 'not received' claims | Repeat 'item not received' claims | Hold any pending refund and contact the customer |
| `refundRate` | Unusually high refund rate | Refunds far more than typical customers | Add to watchlist and review next order manually |
| `velocity` | Burst of orders in one day | Unusual burst of orders in a short window | Manually review the most recent orders |
| `addressClustering` | Delivery address shared with other accounts | Same address used by many separate accounts | Treat as a possible organised refund ring |
| `emailPattern` | Disposable or aliased email | Email address looks disposable or aliased | Require a second confirmation before future refunds |
| `paymentChurn` | Switched payment methods often | Many different cards in a short window | Review for possible stolen card testing |
| `valueAnomaly` | Order value far above normal | Order far larger than this customer's usual | Manually verify before fulfilling |
| `crossMerchant` | Flagged at other stores | Flagged at other UK stores | Treat as high risk — full manual review |
| `refundPattern` | Refund behaviour matches known abusers | Refund pattern matches known abuse profiles | Add to watchlist and require manual approval |

**Fallback** — if `name` is unknown, return `{ title: name, short: name, recommended: 'Review this order manually' }` (never silently hide).

**Files to change — replace every raw signal name render:**
- `app/(app)/audit/[runId]/page.tsx:162-164` — use `signalLabel(topFlag).short`.
- `app/(app)/audit/[runId]/transaction/[id]/page.tsx:87-92` — use `signalLabel(sig.name).title`.
- `components/audit/CustomerProfileCard.tsx` — already uses human titles from `customerIntelligence.ts`; leave.

**Acceptance**
- No route in `app/(app)/` renders a raw camelCase signal name anywhere.
- Storybook or manual pass: every known signal produces a sentence a non-technical person can read.

## 1.2 Strip engineering output from transaction detail (Finding #7)

**File** — `app/(app)/audit/[runId]/transaction/[id]/page.tsx`

Changes:
1. Remove the `Email hash` row from the `Order details` table (line 71).
2. Replace `{sig.name}` mono font with `signalLabel(sig.name).title`. Remove the `font-mono` class on signal name.
3. Remove the `<details>` JSON evidence block entirely (lines 94-99). If debug evidence is needed internally, gate behind `searchParams.debug === '1'`.
4. Remove the `ground_truth_label` block (lines 106-118). This is eval-only data; merchants must never see "false positive" / "false negative".

**Add** — a "Recommended action" panel below the signals section:

```
┌─ Recommended action ──────────────────────────────┐
│ {highest-scoring signal's `recommended` text}     │
│ [ Add customer to watchlist ]  [ Open profile → ] │
└───────────────────────────────────────────────────┘
```

**Acceptance**
- No `email_hash`, `ground_truth_label`, or JSON visible on the page.
- Each fired signal shows a title + plain-English reason. No monospace except for the order ID at the top.

## 1.3 Customer detail page uses email, not hash (Finding #8)

**File** — `app/(app)/audit/[runId]/customer/[hash]/page.tsx`

Changes:
1. Lookup the customer's email and name from the first transaction row (already queried).
2. Replace `<h1>{params.hash.slice(0, 20)}…</h1>` with the email (masked if required): `j***@gmail.com`. If a name exists, render it above the email as the H1; email becomes the subtitle.
3. Remove the second full-hash line entirely.
4. Relabel the `INR claims` stat card → `'Not received' claims` (plain English).

> This page is superseded by the card-based view in Phase 3.2. Until that ships, fix the headline so it's not a hash dump.

**Acceptance**
- Page title is `Jane Smith` / `j***@gmail.com`, never a hex string.

## 1.4 Remove F1 from merchant-facing dashboard (Finding #14)

**File** — `app/(app)/dashboard/page.tsx:81, 105-107`

Remove the `F1` column from the runs table. If required for internal QA, render only when `searchParams.debug === '1'`.

**Acceptance**
- Default dashboard has no `F1` header or values.

## 1.5 Risk tier legend + tooltips (Finding #15)

**New file** — `components/common/RiskLegend.tsx`

Renders a single dismissible info strip:

> *"Risk score is 0–100. **Low** (0–24): normal. **Medium** (25–49): worth watching. **High** (50–74): likely abuse. **Critical** (75+): act now."*

Dismissible via `localStorage.setItem('unauth.riskLegend.dismissed','1')`.

**Add** — a `<RiskTierBadge tier="high" />` wrapper component in `components/common/RiskTierBadge.tsx` that renders the existing coloured pill **plus** a `?` tooltip (native `title=` is acceptable for MVP) with the one-line definition of that tier.

**Files to change**
- Replace every inline `riskTierBadge()` render in:
  - `app/(app)/audit/[runId]/page.tsx`
  - `app/(app)/audit/[runId]/customer/[hash]/page.tsx`
  - `app/(app)/audit/[runId]/transaction/[id]/page.tsx`
  - `components/audit/CustomerProfileCard.tsx`
  with the new `<RiskTierBadge>` component.
- Render `<RiskLegend />` at the top of the audit results page (once per audit).

**Acceptance**
- First visit to an audit shows the legend.
- Every tier badge across the app has a hover tooltip explaining what it means.

## 1.6 Score format: `72 / 100` and tier-word (Finding #16)

**New helper** — `lib/utils/format.ts` add `formatScore(score: number, tier: string): string` returning `"72 / 100 — High risk"`.

**Files to change**
- `app/(app)/audit/[runId]/page.tsx:156` — table cell shows `{tx.fraud_score.toFixed(0)}` only, but the tier column is adjacent so keep the number-only format here (space-constrained).
- `app/(app)/audit/[runId]/transaction/[id]/page.tsx:47` — replace `{txData.fraud_score.toFixed(1)}` with `{Math.round(txData.fraud_score)} / 100`.
- `components/audit/CustomerProfileCard.tsx:202` — score in the order history table: show integer only (`{Math.round(order.fraudScore)}`).

**Acceptance**
- All standalone score displays show `/ 100`. Table cells show integer only. No `.1`/`.3` decimals.

## 1.7 Relabel identity fields on customer card (Finding #22)

**File** — `components/audit/CustomerProfileCard.tsx:112-123`

Relabel:
- `Email addresses` → keep.
- `Names used` → keep.
- `Delivery addresses` → keep.
- `IP addresses` → **`Devices used`** with helper text under label: *"Different networks this customer ordered from."*
- `Card details` → **`Cards used`** with helper text: *"Same card across multiple accounts is a strong link."*
- `Payment methods` → keep.

Extend `IdentityField` to accept an optional `hint?: string` prop and render it as a small muted line under the `<dt>`.

**Acceptance**
- Expanded card shows friendly labels with one-line hints for IP and card rows.

## 1.8 Remove monospace from evidence items (Finding #23)

**File** — `components/audit/CustomerProfileCard.tsx:153`

Change `<li className="text-xs font-mono opacity-80">` → `<li className="text-xs text-gray-700">`.

**Acceptance**
- Evidence lists read as prose, not code.

## 1.9 Rewrite dashboard empty-state body (Finding #24)

**File** — `app/(app)/dashboard/page.tsx:58-62`

Replace the current copy with:

> *"Upload a CSV of your last 6 months of orders. We'll flag customers who refund too often, claim items never arrived unusually fast, or share delivery addresses with other accounts you haven't linked. Every flag comes with plain-English reasoning — no black box."*

**Acceptance**
- No occurrence of "INR", "clustering", "velocity" in merchant-visible copy.

## 1.10 Rename "Customer Intelligence" CTA (Finding #25)

**File** — `app/(app)/audit/[runId]/page.tsx:90-103`

- Heading → `"See all customers from this upload"`.
- Subtitle → `"Grouped by identity, with linked accounts detected."`
- Keep the gradient styling; it's fine as visual emphasis.

Also update `app/(app)/audit/[runId]/customers/page.tsx:52-57`:
- Breadcrumb label → `"Customers"`.
- `<h1>` → `"Customers in this upload"`.

**Acceptance**
- The phrase "Customer Intelligence" does not appear in any merchant-facing page.

## 1.11 Demo-data banner (Finding #27)

**New file** — `components/common/DemoBanner.tsx`

A yellow sticky banner at the top of the main scroll area:

> *"You're viewing demo data. [Upload your own CSV →](/upload) to see your store."*

**Trigger** — the existing `LoadDemoButton` (`components/dashboard/LoadDemoButton.tsx`) seeds an audit run. Mark demo runs with a flag:

**Schema change (small)** — add `audit_runs.is_demo BOOLEAN DEFAULT false` (migration `0013_audit_is_demo.sql`). `LoadDemoButton` inserts with `is_demo: true`.

Render `<DemoBanner />` in `app/(app)/layout.tsx` whenever the most recent viewed run (or current URL's run) is demo. Simplest first-pass: show it whenever **any** run in the merchant's account has `is_demo = true` and no non-demo runs exist.

**Acceptance**
- Loading demo data triggers the banner on every authenticated page.
- After the first real upload, banner disappears.

## 1.12 Filter chip explainers on Customers page (Finding #28)

**File** — `components/audit/CustomerList.tsx:49-84`

Under the filter chip row, render a muted one-line description of the **currently selected** filter:

| Filter | Description |
|---|---|
| All customers | Every customer found in this upload, highest-risk first. |
| Suspicious | Customers with at least one behaviour flag (name changes, high refunds, linked accounts). |
| Linked accounts | Customers who used different emails but shared a delivery address or card. |
| High refunders | Customers who refunded more than 30% of their orders. |

**Acceptance**
- Clicking any chip updates the description line immediately beneath.

---

# Phase 2 — Upload flow

Highest single risk to pilot success: a platform CSV fails out of the box. This phase fixes it.

## 2.1 Column mapping (Finding #10)

**UX flow**

1. Merchant drops file → immediate client-side header parse (papaparse `preview: 1`).
2. Show a **pre-flight mapping panel** *before* upload:

   ```
   We found 14 columns in your CSV. Match them to what we need:

     order_id          ← [ Name ▼ ]               ✓ auto-matched
     order_date        ← [ Paid at ▼ ]             ✓ auto-matched
     customer_email    ← [ Email ▼ ]               ✓ auto-matched
     customer_name     ← [ Billing Name ▼ ]        ⚠ you chose this
     shipping_address  ← [ Shipping Address1 ▼ ]   ✓ auto-matched
     order_total       ← [ Total ▼ ]               ✓ auto-matched
     currency          ← [ Currency ▼ ]            ✓ auto-matched
     order_status      ← [ Financial Status ▼ ]    ✓ auto-matched

   Optional columns — leave blank if not in your file:
     customer_phone    ← [ — not mapped — ▼ ]
     …

   [ Cancel ]   [ Upload and run audit ]
   ```

3. Auto-guess mapping from a built-in dictionary keyed by common header variants:

   **New file** — `lib/csv/headerAliases.ts`

   ```ts
   export const HEADER_ALIASES: Record<RequiredField, string[]> = {
     order_id: ['order_id', 'order id', 'name', 'order number', 'order_name'],
     order_date: ['order_date', 'order date', 'paid at', 'created at', 'processed at'],
     customer_email: ['customer_email', 'email', 'customer email', 'buyer email'],
     customer_name: ['customer_name', 'billing name', 'customer name', 'shipping name'],
     shipping_address: ['shipping_address', 'shipping address1', 'shipping street'],
     order_total: ['order_total', 'total', 'subtotal', 'lineitem price'],
     currency: ['currency'],
     order_status: ['order_status', 'financial status', 'status', 'fulfillment status'],
     // optional
     customer_phone: ['customer_phone', 'phone', 'billing phone', 'shipping phone'],
     refund_status: ['refund_status', 'refunded amount', 'refund status'],
     refund_reason: ['refund_reason', 'refund notes'],
     refund_date: ['refund_date', 'refunded at'],
     refund_amount: ['refund_amount', 'refunded amount'],
     payment_method: ['payment_method', 'payment method', 'payment gateway'],
     ip_address: ['ip_address', 'buyer ip', 'browser ip'],
     device_id: ['device_id', 'device fingerprint'],
   };
   ```

   Match case-insensitively on trimmed headers.

4. On submit, client sends a `columnMap` JSON alongside the upload that the server uses to remap headers before piping to the existing parser.

**Server change** — `app/api/process-csv-job/route.ts` (or `lib/processing/worker.ts`): accept `column_map` on the queue row and rename columns in-stream before scoring.

**Schema change** — add `csv_upload_queue.column_map JSONB` (migration `0014_csv_column_map.sql`).

**Acceptance**
- A raw, unmodified store orders export uploads successfully.
- When a required field cannot be auto-matched and the merchant leaves it blank, the upload button is disabled and the unmapped field is highlighted red.

## 2.2 Export guidance (Finding #11)

**File** — `components/upload/UploadClient.tsx` — above the dropzone, add a collapsible panel:

```
▸ How do I export this from your platform?
```

Expanded content:

> 1. In your store admin (e.g., Shopify), go to **Orders**.
> 2. Click **Export** in the top right.
> 3. Under "Export", choose **Orders by date** and pick the last 6 months.
> 4. Choose **Plain CSV file**.
> 5. Click **Export orders**. Your platform may email the file to you; download it and drop it below.

Plus one sentence under the dropzone: *"Exporting from WooCommerce, BigCommerce or Magento? Any CSV with orders, customers and refund info will work — we'll help you match the columns."*

**Acceptance**
- Panel is present, defaults to collapsed, remembers state in `localStorage`.

## 2.3 Human-readable upload errors (Finding #12)

**New file** — `lib/copy/uploadErrors.ts`

```ts
export function friendlyUploadError(raw: string, code?: string): { headline: string; body: string; code: string }
```

Maps internal error patterns to merchant-facing copy. Examples:

| Raw pattern | Headline | Body |
|---|---|---|
| `row-level security`, `RLS`, `permission denied` | Something went wrong | We couldn't save your file. Please try again. If it keeps happening, contact us with code **UA-101**. |
| `duplicate key`, `unique constraint` | We've seen this upload already | You've uploaded a file with the same name today. Rename it and try again. |
| `invalid input syntax`, `parse` | We couldn't read this file | Your CSV has rows we couldn't parse. Check for missing commas and try again. Code **UA-201**. |
| `bucket not found`, `storage` | Storage unavailable | Please try again in a minute. Code **UA-301**. |
| any other | Something went wrong | Please try again. If it keeps happening, contact us with code **UA-999**. |

**File** — `components/upload/UploadClient.tsx` — replace every `setError(...)` with `setError(friendlyUploadError(...))` and render headline + body + code.

**Acceptance**
- No merchant sees the string `row-level security`, `duplicate key`, `violates`, `storage`, `queue record`, or any Supabase detail.
- Every error has a support code.

## 2.4 ETA + "leave this page" copy on progress (Finding #21)

**File** — `components/upload/UploadClient.tsx:284-300`

Inside the `processing` block:
- Track a start timestamp when `processing` begins.
- Compute rows/sec from `processed_rows / elapsed`. ETA = `(total - processed) / rate` seconds.
- Render: `Processing 340 of 1,200 orders · about 2 minutes left`.
- Add a second line under the bar: *"You can leave this page — we'll keep processing in the background. Find results on the dashboard when done."*

If ETA < 10 s, show *"Nearly done…"* instead of a number.

**Acceptance**
- ETA updates every poll and reads naturally.
- Navigating away and back to `/dashboard` shows the run as `processing` with the same progress.

## 2.5 Indeterminate shimmer during upload/queue phase (Finding #32)

**File** — `components/upload/UploadClient.tsx:290-295`

Until `total_rows > 0`, replace the `width: ${progress}%` bar with a CSS-only shimmer animation (full-width, animated gradient). Swap to the determinate bar once rows start processing.

**Acceptance**
- No "stuck at 0%" feeling. The bar is visually alive from upload start.

---

# Phase 3 — Audit results polish

Depends on Phase 1 for the signal-label dictionary.

## 3.1 Recommended actions per tier + per flag (Finding #9)

**Component** — `components/audit/RecommendedAction.tsx`

Inputs: `tier: 'low'|'medium'|'high'|'critical'`, `topSignalName?: string`, `customerId?: string`.

Renders:
- One-line recommendation pulled from:
  1. `signalLabel(topSignalName).recommended` if provided (preferred — more specific).
  2. Otherwise the tier default:
     - **Critical** → *"Hold any pending refund and contact the customer."*
     - **High** → *"Review this refund claim manually before approving."*
     - **Medium** → *"Keep this customer on your watchlist for their next order."*
     - **Low** → *"No action needed."*
- Two buttons: `Add to watchlist` (Phase 4), `Open customer profile`.

**Render in:**
- `app/(app)/audit/[runId]/transaction/[id]/page.tsx` — below the Signals block.
- Expanded `CustomerProfileCard` — below the Suspicious activity block.

**Acceptance**
- Every flagged result surfaces one clear next step. Nothing says "here are the facts, figure it out."

## 3.2 Consolidate customer views (Finding #17)

**Goal** — one canonical customer view: the card-based `CustomerProfileCard`.

**Actions**
1. Delete the page at `app/(app)/audit/[runId]/customer/[hash]/page.tsx`. It targets an old `transactions` table and conflicts with `fraud_transactions`.
2. Update every link to `/audit/[runId]/customer/[hash]` to instead deep-link into the card view: `/audit/[runId]/customers?focus={profileId}` and have `CustomerList` auto-expand the card whose `profile.id === focus` and scroll to it.
3. Update `app/(app)/audit/[runId]/transaction/[id]/page.tsx:121-126` "View customer profile →" link accordingly.
4. Update the "Top 20 flagged customers" table on `app/(app)/audit/[runId]/page.tsx:178-206` rows to link to `?focus=...`.

**Acceptance**
- No route pattern `/audit/*/customer/*` remains.
- Clicking a customer from any surface opens the card view with the correct card expanded.

## 3.3 Fix fake "View" link in flagged customers table (Finding #18)

**File** — `app/(app)/audit/[runId]/page.tsx:184, 198-200`

- Rename column header `"Email hash"` → `"Customer"`.
- Replace the dead `<span>View</span>` with a `<Link>` to `/audit/{runId}/customers?focus={profile.id}` (wired via 3.2).

**Acceptance**
- Every row's "View" is clickable and lands on the correct card.

## 3.4 Sort, filter, pagination on flagged transactions (Finding #19)

**File** — `app/(app)/audit/[runId]/page.tsx:132-176`

Convert the current server-rendered table into a client component `components/audit/FlaggedTransactionsTable.tsx`:

- **Sort** — clickable column headers for Date, Total, Score. Default sort: Score desc.
- **Filter chips** — `All / Critical / High / Medium / Low` (use the existing tier badge styling).
- **Refund toggle** — checkbox *"Only show refunded"*.
- **Pagination** — server query uses `range()`; UI shows `Page 1 of N` with prev/next. Page size: 25.
- Remove the hard `limit(50)` on line 37. Total count comes from a `count: 'exact', head: true` query.

**Acceptance**
- Merchant can page beyond 50 flagged rows.
- Filter + sort combine correctly and update the URL via searchParams (so refresh preserves state).

## 3.5 Zero-flagged audit empty state (Finding #20)

**File** — `app/(app)/audit/[runId]/page.tsx`

When `tierCounts.high + tierCounts.critical + tierCounts.medium === 0`:
- Skip the two tables.
- Render a single celebratory panel:

> *"Good news — no customers in this upload showed suspicious patterns. Upload a longer date range to surface slower repeat abusers."*

- Still render the stat grid and the tier breakdown (all zero).

**Acceptance**
- An empty audit looks intentional, not broken.

---

# Phase 4 — New features

Introduces three features that are in scope but currently missing from the UI.

## 4.1 Watchlist (Finding #3)

**New table** — migration `0015_watchlist.sql`:

```sql
CREATE TABLE watchlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email_hash TEXT, -- fallback when no profile row exists yet
  display_name TEXT,
  display_email TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_risk TEXT, -- 'low'|'medium'|'high'|'critical'
  last_seen_at TIMESTAMPTZ,
  UNIQUE (merchant_id, customer_profile_id),
  UNIQUE (merchant_id, email_hash)
);

CREATE INDEX ON watchlist_entries(merchant_id, added_at DESC);
ALTER TABLE watchlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant reads own watchlist" ON watchlist_entries
  FOR SELECT USING (merchant_id = auth.uid());
CREATE POLICY "merchant writes own watchlist" ON watchlist_entries
  FOR ALL USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());
```

**API routes**
- `POST /api/watchlist` — body `{ customerProfileId?, emailHash?, displayName?, displayEmail?, lastSeenRisk? }`. Upserts.
- `DELETE /api/watchlist/:id`.
- `GET /api/watchlist` — returns the merchant's entries (used by the Watchlist page).

**UI changes**
- **Star button** on `CustomerProfileCard` (next to the risk badge). Filled when starred. Optimistic toggle.
- **Star button** on transaction detail's "Recommended action" panel.
- **Star button** on each row of the "Top 20 flagged customers" table.
- **New page** — `app/(app)/watchlist/page.tsx`: table of `display_name`, `display_email`, `last_seen_risk` (with badge), `added_at`, row action `Remove`. Empty state copy:

  > *"Your watchlist is empty. Star any customer on an audit to keep an eye on them — they'll appear here with their latest risk level every time you upload new orders."*

- Audit processing step: after profile upsert, for any transaction whose customer is on the merchant's watchlist, update `watchlist_entries.last_seen_risk` and `last_seen_at`. This is how the watchlist stays fresh across uploads.

**Acceptance**
- Star toggles persist across reloads.
- Watchlist page lists starred customers, newest first, each with an up-to-date risk level reflecting the most recent audit.
- Removing from watchlist is instant and reversible (undo toast for 5 s).

## 4.2 Merchant notes (Finding #4)

**New table** — migration `0016_customer_notes.sql`:

```sql
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email_hash TEXT, -- fallback
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON customer_notes(merchant_id, customer_profile_id, created_at DESC);
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant rw own notes" ON customer_notes
  FOR ALL USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());
```

**API routes**
- `GET /api/customers/:id/notes`
- `POST /api/customers/:id/notes` — body `{ body: string }`.
- `DELETE /api/customers/notes/:id`.

**UI — new component** `components/audit/CustomerNotes.tsx`

Renders inside `CustomerProfileCard`'s expanded section, below "Recommended action":

```
┌─ Notes ──────────────────────────────────────────┐
│ • 2 May 2026 — "Refunded as goodwill, won't      │
│   approve again"                            [×]  │
│ • 28 Apr 2026 — "Chargeback pending"         [×] │
│                                                   │
│ [ Add a note…                                   ] │
│ [ Save note ]           Saved just now  ✓         │
└───────────────────────────────────────────────────┘
```

- Debounced autosave **or** explicit "Save note" button — pick explicit for MVP (safer). Show a 3-second "Saved just now ✓" confirmation after save.
- Empty state: *"No notes yet. Add a quick note to remind yourself — these stay private to your store."*

**Acceptance**
- A note typed and saved re-appears on refresh.
- The same note is visible on the same customer in a **subsequent** audit (because notes are keyed to the customer profile, which persists across uploads).
- Deletion requires a confirm step.

## 4.3 Cross-merchant "coming soon" teaser (Finding #5)

No new tables — this is pure UI copy until the real signal ships.

**New component** — `components/common/CrossMerchantTeaser.tsx`

Variant A — inline strip on expanded `CustomerProfileCard` (below Notes):

> ![lock icon] **Cross-store signals — coming soon**
> We'll tell you when this customer has also refunded at other UK merchants. Opt in below to be notified when it's live.
> [ Notify me when live ]

Variant B — summary card on the audit results grid (`app/(app)/audit/[runId]/page.tsx:105-117`), styled as "soon":

> **Cross-store signals** · Coming soon
> *Spot customers flagged at other UK stores.*

**Acceptance**
- The word "beta" does not appear. Copy is honest: coming soon, not "live."
- Clicking "Notify me when live" stores a preference (reuse a `merchant_preferences` row or `localStorage` — the prompt disallows email alerts, so this just records intent silently).
- Teaser never promises scores, counts, or a date.

---

# Phase 5 — Dashboard redesign

Replaces the "audit runs table" dashboard with a store-health dashboard. Depends on Phase 1 copy and Phase 4 watchlist.

## 5.1 Dashboard rebuild (Finding #13)

**File** — `app/(app)/dashboard/page.tsx` — rewrite to render four stacked sections:

### Section 1 — Headline risk snapshot (most recent audit)

Three stat cards side-by-side, each with an arrow delta vs the previous audit:

- **Orders flagged** — `128 (+14 vs last upload)`
- **Critical-risk customers** — `6 (+2)`
- **Value at risk** — `£3,420 (−£210)`

### Section 2 — Flagged % trend line

Line chart (recharts) — X: last 6 audit runs by date; Y: `flagged_count / row_count`. Y-axis shown as `%`. Tooltip on hover: date, filename, flagged count, total rows.

Title: *"Flagged share of orders, last 6 uploads"*.

Empty state (<2 runs): *"Upload at least two audits to see a trend here."*

### Section 3 — Top 10 customers to watch right now

Aggregated across **all** audits. Query:

```sql
SELECT cp.id, cp.risk_score, cp.risk_level, cp.total_orders,
       COALESCE(we.id, NULL) AS watchlist_id
FROM customer_profiles cp
LEFT JOIN watchlist_entries we
  ON we.customer_profile_id = cp.id AND we.merchant_id = $1
WHERE cp.merchant_id = $1
ORDER BY cp.risk_score DESC
LIMIT 10;
```

Render as rows with: display name/email, risk badge, total orders, star toggle (Phase 4), "Open profile →".

### Section 4 — Recent uploads

A compact 3-row version of the current runs table (Date · Filename · Flagged · View). A *"See all history →"* link sends to `/history`.

**New page** — `app/(app)/history/page.tsx`: the full runs table, moved out of the dashboard.

**Acceptance**
- Dashboard reads as a store-health overview, not a log.
- Empty state (no audits yet) still works — shows the existing "What Unauth does" copy from 1.9 plus the `LoadDemoButton`, with the four sections hidden.

## 5.2 "Last updated" timestamp (Finding #36)

Under the dashboard H1:

> *"Last audit uploaded 3 days ago · [Upload new CSV]"*

Use `formatDistanceToNow(latestRun.created_at)`.

**Acceptance**
- Reads as relative time, updates on navigation.

---

# Phase 6 — Nice-to-have

Ship after pilot conversations have started. Each is small and independent.

## 6.1 Expand / collapse all on customer cards (Finding #29)

**File** — `components/audit/CustomerList.tsx`

Lift `expanded` state from `CustomerProfileCard` up to `CustomerList` (keyed by `profile.id`). Add a toolbar:

> `[ Expand all ]  [ Collapse all ]  ·  4 of 128 expanded`

## 6.2 Export flagged customers CSV (Finding #30)

**New API route** — `GET /api/audit/:runId/export?scope=flagged|all`

Returns a CSV with headers: `customer_email, customer_name, risk_tier, risk_score, top_flag, recommended_action, total_orders, total_spend, refund_count`.

**UI** — "Export" button on:
- Audit results page (top-right of flagged transactions table).
- Customers page toolbar.
- Watchlist page.

`recommended_action` column uses `signalLabel().recommended`.

## 6.3 Delta on Customers-page summary cards (Finding #31)

**File** — `app/(app)/audit/[runId]/customers/page.tsx`

Query the previous run's `buildCustomerProfiles` counts (or cache aggregates on `processing_jobs`) and render `+N since last upload` under each summary card.

## 6.4 Keyboard shortcuts on customer list (Finding #33)

**File** — `components/audit/CustomerList.tsx`

- `j` / `↓` — next card, scroll into view.
- `k` / `↑` — previous.
- `Enter` — toggle expand.
- `/` — focus search.
- `?` — open shortcut help modal.

Use a single `useEffect` with a `keydown` listener on `document`, skipped when focus is inside an input or textarea.

## 6.5 Visual timeline on customer card (Finding #34)

**File** — `components/audit/CustomerProfileCard.tsx`

Above the existing order history table, add a horizontal strip: one dot per order positioned along the min-to-max date range, coloured by risk tier, with a small red ring for refunded orders. Hover → tooltip with order ID, date, amount. Existing table stays beneath.

## 6.6 Currency per transaction (Finding #35)

**File** — `components/audit/CustomerProfileCard.tsx:26-28`

Replace the hard-coded `currency: 'GBP'` with the order's actual currency (already in `fraud_transactions` via `currency_code` column if mapped in Phase 2.1). Fallback: `'GBP'`.

Same fix in `lib/utils/format.ts` `formatCurrency` — already accepts a `currency` param; ensure every caller passes it.

---

# Cross-cutting: files created vs modified

**New files**

| Path | Purpose | Phase |
|---|---|---|
| `lib/copy/signalLabels.ts` | Single source of truth for plain-English signal names + recommended actions | 1.1 |
| `lib/copy/uploadErrors.ts` | Human error mapper | 2.3 |
| `lib/csv/headerAliases.ts` | Platform / Woo / generic header → internal field mapping | 2.1 |
| `components/common/RiskLegend.tsx` | Dismissible risk-tier explainer strip | 1.5 |
| `components/common/RiskTierBadge.tsx` | Badge + tooltip wrapper | 1.5 |
| `components/common/DemoBanner.tsx` | Demo-data banner | 1.11 |
| `components/common/CrossMerchantTeaser.tsx` | "Coming soon" teaser | 4.3 |
| `components/audit/RecommendedAction.tsx` | Next-step panel | 3.1 |
| `components/audit/FlaggedTransactionsTable.tsx` | Client-side sort/filter/paging | 3.4 |
| `components/audit/CustomerNotes.tsx` | Notes UI on customer profile | 4.2 |
| `app/(app)/watchlist/page.tsx` | Watchlist screen | 4.1 |
| `app/(app)/history/page.tsx` | Full runs table | 5.1 |
| `app/api/watchlist/route.ts` + `[id]/route.ts` | Watchlist API | 4.1 |
| `app/api/customers/[id]/notes/route.ts` + `../notes/[id]/route.ts` | Notes API | 4.2 |
| `app/api/audit/[runId]/export/route.ts` | CSV export | 6.2 |
| `supabase/migrations/0013_audit_is_demo.sql` | `is_demo` flag on runs | 1.11 |
| `supabase/migrations/0014_csv_column_map.sql` | Column map storage | 2.1 |
| `supabase/migrations/0015_watchlist.sql` | Watchlist table | 4.1 |
| `supabase/migrations/0016_customer_notes.sql` | Notes table | 4.2 |

**Files to delete**

| Path | Reason | Phase |
|---|---|---|
| `app/(app)/audit/[runId]/customer/[hash]/page.tsx` | Superseded by card view, references stale schema | 3.2 |

**Primary files modified** (non-exhaustive)

- `app/layout.tsx`, `app/(auth)/login/page.tsx`, `components/nav/Sidebar.tsx` — Phase 0.
- `app/(app)/dashboard/page.tsx` — Phases 1.4, 1.9, 5.1, 5.2.
- `app/(app)/audit/[runId]/page.tsx` — Phases 1.1, 1.5, 1.6, 1.10, 3.3, 3.4, 3.5, 4.3.
- `app/(app)/audit/[runId]/transaction/[id]/page.tsx` — Phases 1.1, 1.2, 1.5, 1.6, 3.1.
- `app/(app)/audit/[runId]/customers/page.tsx` — Phase 1.10, 6.3.
- `components/audit/CustomerProfileCard.tsx` — Phases 1.6, 1.7, 1.8, 3.1, 4.1, 4.2, 4.3, 6.5, 6.6.
- `components/audit/CustomerList.tsx` — Phases 1.12, 6.1, 6.4.
- `components/upload/UploadClient.tsx` — Phases 2.1, 2.2, 2.3, 2.4, 2.5.
- `lib/utils/format.ts` — Phases 1.6, 6.6.
- `app/(app)/layout.tsx` — Phase 1.11.

---

# Copy register — single source of truth

All merchant-facing copy lives in one of these files. No ad-hoc strings in components.

- **Signals** → `lib/copy/signalLabels.ts`
- **Upload errors** → `lib/copy/uploadErrors.ts`
- **Risk tiers & recommended actions** → `lib/copy/riskTiers.ts` (new — extract the tier defaults from 3.1 and the legend text from 1.5):

  ```ts
  export const RISK_TIER_COPY = {
    low:      { label: 'Low',      description: 'Normal customer behaviour.',                 default: 'No action needed.' },
    medium:   { label: 'Medium',   description: 'Worth watching — something looks off.',      default: 'Keep on watchlist for their next order.' },
    high:     { label: 'High',     description: 'Likely abuse pattern.',                       default: 'Review this refund claim manually before approving.' },
    critical: { label: 'Critical', description: 'Act now — strong evidence of abuse.',        default: 'Hold any pending refund and contact the customer.' },
  } as const;
  ```

- **Empty states** → `lib/copy/emptyStates.ts` (dashboard, watchlist, notes, zero-flagged audit).

Every component imports from these files. A single PR can later change tone/language without touching UI.

---

# Definition of done per phase

A phase is shippable when:

1. All findings in its row are implemented.
2. No merchant-facing surface in that phase renders any of: `inrSpeed`, `inrAbuse`, `refundRate`, `addressClustering`, `emailPattern`, `paymentChurn`, `valueAnomaly`, `crossMerchant`, `refundPattern`, `velocity`, `email_hash`, `ground_truth_label`, `F1`, `ParcelClaim`, raw JSON, raw Supabase error strings.
3. Every new button has an empty/loading/error state.
4. Every new DB migration is idempotent and has an RLS policy restricting to `auth.uid()`.
5. The demo-data flow (`LoadDemoButton` → dashboard → audit → customers → watchlist → notes) still works end-to-end.

---

# Suggested delivery order for a pilot

If a pilot is imminent and you cannot ship everything:

1. **Day 1–2** — Phase 0 + Phase 1 (branding + copy cleanup). Gets every screen presentable.
2. **Day 3–4** — Phase 2 (upload). Prevents the most common first-run failure.
3. **Day 5–7** — Phase 4 (watchlist, notes, teaser). Fills the three most visible feature gaps.
4. **Day 8–9** — Phase 3 (audit polish). Makes results actionable.
5. **Day 10+** — Phase 5 (dashboard rebuild). Reason-to-come-back.
6. **Post-pilot** — Phase 6.

This order deliberately front-loads copy/language so that every demo screenshot from day 2 onwards is merchant-ready, and back-loads the dashboard rebuild because it depends on the most other work.
