# Dashboard Light Workbench Redesign Implementation

Audience: a follow-on implementation model.  
Scope: redesign the authenticated `/dashboard` only. Do not redesign Customers, Audit detail, History, Chargebacks, Sidebar, or AppHeader in this pass.

## Source Inspiration

Use the Claude artifact in [MerchantDashboard.tsx](/Users/malikibrahim/Downloads/Unauth/app/(public)/landing/_components/MerchantDashboard.tsx) as the structural reference, especially:

- top product nav with `Overview`, `Cases`, `Clusters`, `Audits`, `Reports`
- compact KPI strip
- dense bordered workbench, not loose marketing cards
- left primary work area plus right intelligence rail
- row/card hybrids with mono metadata, status chips, thin dividers, tabular numbers
- live activity, top signals, cluster/network exposure summaries

Important: do **not** copy the dark palette from the artifact. The in-app dashboard must be light.

## Current App Anchors

Read these before coding:

- Current dashboard: [page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/dashboard/page.tsx)
- Existing tokens: [TOKENS.md](/Users/malikibrahim/Downloads/Unauth/docs/internal/design/TOKENS.md) and [globals.css](/Users/malikibrahim/Downloads/Unauth/app/globals.css)
- Existing shared primitives: [MetricCard.tsx](/Users/malikibrahim/Downloads/Unauth/components/ui/MetricCard.tsx), [SectionCard.tsx](/Users/malikibrahim/Downloads/Unauth/components/ui/SectionCard.tsx), [DataTable.tsx](/Users/malikibrahim/Downloads/Unauth/components/ui/DataTable.tsx), [Badge.tsx](/Users/malikibrahim/Downloads/Unauth/components/ui/Badge.tsx), [ConfidenceBadge.tsx](/Users/malikibrahim/Downloads/Unauth/components/ui/ConfidenceBadge.tsx)
- Safe merchant-scoped helpers: [merchantHelpers.ts](/Users/malikibrahim/Downloads/Unauth/lib/supabase/merchantHelpers.ts)

## Design Target

Make `/dashboard` feel like a light version of the §4 artifact: operational, dense, audit-console-like, and immediately useful.

The page should read as a dashboard workbench, not a landing page and not a stack of unrelated cards. Keep the surface calm, light, and financial-grade.

## Non-Goals

- Do not introduce dark mode or dark section styling.
- Do not copy inline style constants from the landing artifact.
- Do not add new database schema or migrations.
- Do not change fraud scoring, linker, worker, evidence narrative, permissions, or RLS behavior.
- Do not rename existing routes yet.
- Do not replace the global app sidebar or sticky app header.

## Light Style Translation

Map the artifact’s visual language to existing light tokens:

| Artifact idea | Light app implementation |
|---|---|
| `SHELL`, dark outer frame | `var(--bg-canvas)` page, `var(--bg-surface)` workbench |
| dark section headers | `var(--bg-surface-alt)` or `var(--bg-canvas)` header strips |
| dark card body | `var(--bg-surface)` |
| dark borders | `var(--border-default)` and `var(--border-subtle)` |
| near-white text | `var(--text)` / `var(--text-primary)` |
| dim metadata | `var(--text-muted)` / `var(--text-subtle)` |
| red/rust artifact accent | use risk tokens only for risk/status; use `var(--accent)` only for primary actions |

Rules:

- Use 1px borders heavily.
- Use `borderRadius: 4` or `var(--radius-1)` for dashboard panels.
- Use shadows sparingly. Prefer dividers and surface changes.
- Use mono, tabular numerics for IDs, counts, scores, percentages, timestamps.
- Use 9-11px uppercase overline labels for compact panel headers.
- Keep row heights around 36-44px where possible.
- No gradients, decorative blobs, large hero marketing sections, or dark cards.
- Do not hard-code new hex colors. Existing legacy hard-coded rust appears in the codebase, but new dashboard work should prefer CSS variables.

## New Dashboard IA

Inside the `/dashboard` page content, add a local workbench nav row inspired by the artifact:

- `Overview` active, links to `/dashboard`
- `Cases`, links to `/customers?risk=high&status=new`
- `Clusters`, links to `/customers?merchantsMin=2`
- `Audits`, links to `/history`
- `Reports`, links to `/chargebacks`

This is a dashboard-level navigation strip only. Do not build new tab routes in this pass.

## Target Layout

Replace the current loose page stack with this shape:

1. **Workbench Header**
   - compact local nav on the left: `Overview`, `Cases`, `Clusters`, `Audits`, `Reports`
   - right side: graph/status dot, merchant or workspace label if already available, last sync/latest audit date, `New Audit` CTA
   - keep it inside the page, below the global `AppHeader`

2. **KPI Strip**
   - five compact metrics in one bordered row
   - recommended labels:
     - `Exposure at risk`
     - `Customers to review`
     - `Transactions analysed`
     - `Evidence ready`
     - `Avg match rate`
   - use current dashboard calculations where possible
   - show `Unavailable` for failed helper results; never coerce helper failures to zero

3. **Main Workbench Grid**
   - desktop: `minmax(0, 1fr) 320px`
   - left: dense review/cases table or row-card list
   - right: intelligence rail with cluster exposure, top signals, activity, and trend
   - mobile: stack sections in this order: KPI strip, cases, rail sections

4. **Status Footer**
   - compact metadata row like the artifact
   - include real-safe copy only, for example: latest audit timestamp, number of runs loaded, `k >= 3 gate`, `HMAC-SHA256`, `0 PII fields stored`

## Data Plan

Preserve the current dashboard data first. The current page already computes:

- `typedRuns`
- `totalTransactions`
- `totalFlagged`
- `avgFlagRate`
- `latestRun`, `latestFlagRate`, `prevFlagRate`
- evidence package counts
- watchlist appearance count
- `reviewQueue`
- `exposureAtRisk`
- `exposurePrev30d`
- `insights`

Add only lightweight dashboard-specific reads, all merchant-scoped:

### Review Cases

Use existing helpers from `lib/supabase/merchantHelpers.ts`:

- `fetchMerchantReviewQueueRows(serviceClient, ctx.merchantId, { from: 0, to: 5 })`
- `fetchReviewQueueProfileIds(serviceClient, ownedJobIds, txIds)`

Render the top 5-6 review-worthy rows as the dashboard’s dense case list. Suggested fields:

- profile/customer display: `customer_name` or `customer_email` fallback
- `order_id`
- `order_value`
- confidence grade/status
- `identity_score`
- `signals_matched` count or summary
- `processed_at`
- link/open target: `/customers/[profileId]` when profile id exists, else `/audit/[jobId]/transaction/[id]`

If helper calls fail, render an empty/error state in that panel only. Do not break the whole dashboard.

### Cluster Exposure

Reuse the customer profile query pattern from [customers page](/Users/malikibrahim/Downloads/Unauth/app/(app)/customers/page.tsx). Query up to 6 profiles owned by the merchant, ordered by `total_merchants_seen_at desc`, then `risk_score desc`.

Suggested selected fields:

```ts
'id, primary_email, names, risk_score, risk_level, total_orders, total_refund_claims, total_chargebacks, refund_rate, total_merchants_seen_at, last_seen, investigation_status'
```

Use the same merchant array filter strategy as the customers page:

- match current `ctx.merchantId`
- include legacy `user.id` fallback only if needed and already available in the dashboard

Do not query `fraud_identity_clusters` directly unless a safe merchant-scoped helper already exists.

### Top Signals

Derive from `signals_matched` on the review queue rows if present. Count signal frequency and show the top 5.

If no signal data exists, hide the panel or show a quiet `No signal breakdown yet` state.

### Activity

Build a compact activity feed from real existing data:

- latest completed audit
- review-worthy transaction rows
- CE3 eligible evidence packages count
- watchlist appearance count

Do not invent timestamps or fake customer records in the authenticated app.

## Component Plan

Prefer adding dashboard-specific composite components instead of bloating `page.tsx`.

Recommended files:

- `components/dashboard/DashboardWorkbench.tsx`
- `components/dashboard/DashboardKpiStrip.tsx`
- `components/dashboard/DashboardCaseQueue.tsx`
- `components/dashboard/DashboardInsightRail.tsx`
- optionally `components/dashboard/dashboardTypes.ts`

Keep the Supabase reads in `app/(app)/dashboard/page.tsx` or safe helper functions. Client components should receive serialized data only.

`DashboardCaseQueue` may be a client component if it opens `CustomerIntelligenceDrawer`; otherwise keep it server-rendered with links.

## Detailed Section Specs

### Workbench Header

Use a single bordered panel header:

- background: `var(--bg-surface)`
- bottom border: `var(--border-default)`
- height: roughly 44-52px
- local nav items: 12-13px sans, active item has 2px bottom border
- CTA: existing `btn-accent` or `Button`
- no large title block here; the dashboard itself should be the product surface

Keep page title accessible with an `h1`, but visually compact. Example: `Identity review overview`.

### KPI Strip

A single grid row, not five floating cards.

Desktop:

```css
grid-template-columns: 1.35fr repeat(4, 1fr);
```

Mobile:

```css
grid-template-columns: repeat(2, minmax(0, 1fr));
```

Metric cell contents:

- overline label
- mono value
- tiny hint or delta
- vertical borders between cells on desktop

Do not use huge hero type. The artifact density is the goal.

### Cases Panel

This is the visual heart of the dashboard.

Use the artifact’s case-card structure, but make it lighter and real:

- panel header: `Cases requiring attention`, count summary, compact filters/links
- rows/cards: 44-76px high depending on available data
- left side: customer/profile, order id, timestamp
- middle: amount, grade/status, signal count
- right side: action link (`Open`, `Evidence`, or `Review`)
- status chips: use `Badge` / `ConfidenceBadge`
- row hover: `var(--bg-hover)` or `var(--bg-subtle)`

If rendering richer row-cards, avoid nested-card styling. Each case row can be bordered by dividers inside one parent panel.

### Right Insight Rail

Use four compact sections:

1. `Cluster exposure`
   - list top linked profiles/clusters
   - columns: name/email, merchants, orders/refunds, score badge

2. `Top signals`
   - signal name, tiny horizontal bar, count
   - use `var(--risk-critical-fg)` or tier tokens only when signal severity requires it

3. `Activity`
   - dense 3-5 item feed
   - type label, detail, relative time

4. `Trend`
   - reuse `SparklineChip` or a tiny SVG
   - show latest match-rate or review-queue trend from existing runs

Each rail section should have its own header strip and dividers, but all can live inside one right-column panel.

### Empty State

If there are no audits:

- keep a light workbench shell so the layout still teaches the product
- show a compact first-run prompt in the cases panel
- primary action: `Upload a CSV`
- include 2-3 placeholder rows as skeletons only if clearly marked as setup state
- avoid the current oversized empty hero feel

## Implementation Sequence

1. Create `dashboardTypes.ts` with serializable props for KPIs, cases, clusters, signals, activity.
2. Extract the current dashboard calculations from `page.tsx` into typed objects.
3. Add the safe review queue read using `fetchMerchantReviewQueueRows`.
4. Add the cluster/profile summary query using the existing customers merchant filter pattern.
5. Build `DashboardWorkbench` with static layout and pass existing KPI values.
6. Build `DashboardKpiStrip`.
7. Build `DashboardCaseQueue`.
8. Build `DashboardInsightRail`.
9. Replace the old dashboard render tree with the new workbench.
10. Keep `InsightsStrip` only if it can be restyled into the workbench; otherwise fold insights into the right rail/activity panel.
11. Preserve `SavingsCard` feature flag behavior, but place it below the workbench or in the right rail only if it does not fight density.
12. Run verification.

## Code Quality Guardrails

- Keep `app/(app)/dashboard/page.tsx` readable. If the render body gets large, move UI into components.
- Do not pass raw Supabase rows directly into client components if they contain unnecessary fields.
- Use null-safe formatters from `lib/utils/format.ts` and `lib/utils/formatCurrency.ts`.
- Keep all dashboard data merchant-scoped through `ctx.merchantId`, owned job IDs, or helpers.
- Keep the current error policy: `Unavailable` for failed important metrics, quiet panel-level fallback for optional rail data.
- Avoid adding global CSS unless a repeated utility is clearly needed.
- No `any` unless the current Supabase generated types force it; isolate casts near queries.

## Acceptance Criteria

Visual:

- `/dashboard` is light, dense, and visibly related to the §4 artifact.
- Top local nav shows `Overview`, `Cases`, `Clusters`, `Audits`, `Reports`; `Overview` is active.
- KPI strip is a single compact bordered row.
- Main content uses a left cases/work queue plus right intelligence rail on desktop.
- There is no dark dashboard panel or copied landing artifact palette.
- Text does not overflow inside KPI cells, nav items, badges, or case rows at mobile widths.

Behavior:

- Existing authenticated redirect and `VIEW_DASHBOARD` permission behavior still works.
- Existing dashboard metrics preserve their meaning.
- Helper failures do not turn into false zeroes.
- Dashboard links route to existing app pages only.
- Empty state still gives a clear path to upload a CSV.

Verification:

- `npm run lint`
- `npm run build`
- run the app and inspect `/dashboard` in desktop and mobile widths
- if Playwright is practical, run the existing dashboard/full-tour screenshot path and confirm no obvious visual regressions

## Things To Avoid

- Do not make the page dark.
- Do not make a large hero landing section.
- Do not create a card grid with lots of empty space.
- Do not use fake data in the authenticated app.
- Do not hard-code the artifact’s dark colors.
- Do not create new route files for Cases/Clusters/Audits/Reports in this pass.
- Do not bypass merchant ownership checks for transactions or customer profiles.
