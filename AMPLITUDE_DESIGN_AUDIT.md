# Amplitude-Inspired Design Audit

Date: 2026-05-05
Scope: fresh Playwright design pass after the latest pushed changes. No app code was changed.

Fresh screenshots and crawl data:

- `test-results/amplitude-design-audit/design-crawl.json`
- `test-results/amplitude-design-audit/*.png`

Reference brief:

- Amplitude positions its analytics product around fast answers, clear real-time insights, actionable highlights, funnels, retention, event segmentation, data tables, and shared analytics workflows.
- Sources used for the design benchmark:
  - https://www.amplitude.com/amplitude-analytics
  - https://amplitude.com/templates/product-analytics-dashboard

## Executive Read

The product is much closer than the previous pass. The mobile shell is substantially improved, the legal pages are more procurement-ready, transaction detail copy is less raw, and the evidence route now loads as a real workflow surface rather than a hard empty error. The app now feels credible.

It still does not yet feel like an Amplitude-inspired analytics product. It feels like a clean operational fraud review tool with some charts. To hit the brief, the product needs to make analysis feel self-serve: clear questions, segments, time ranges, comparisons, saved views, chart-to-table drilldowns, and guided findings. Amplitude’s feel is not just white cards and a sidebar; it is the sense that the user can ask a question, slice the data, see a trend, and immediately act.

## What Is Working Now

- The desktop shell is calm, restrained, and generally professional.
- The sidebar IA is much better than the earlier wide/mobile-blocking layout.
- The customer table is dense in an appropriate way for repeated analyst use.
- The customer drawer is directionally strong: right-side detail while preserving list context is the right pattern.
- Legal pages no longer read as obviously unfinished; the DPA no longer says draft.
- Transaction detail headings are improved: "Why this was flagged for review" is much better than "Signals matched".
- Mobile dashboard and audit pages are now usable in the basic sense, which is a major improvement.

## Main Design Gap Against Amplitude

Amplitude-like products are built around exploration. Your app is still built around records.

Current mental model:

- Upload file.
- See audit result.
- Review table rows.
- Open customer or transaction.
- Generate evidence.

Amplitude-inspired target model:

- Monitor the health of claims, disputes, and exposure over time.
- Segment by upload, risk tier, data quality, customer behavior, status, and evidence readiness.
- Notice anomalies or changes.
- Drill from chart to cohort to customer to evidence.
- Save views and repeat workflows.

That means the biggest design changes should be structural, not decorative.

## Priority 1 - Dashboard Should Become an Analytics Home, Not an Audit Count Page

Current screenshot:

- `test-results/amplitude-design-audit/1440-dashboard.png`

What I see:

- The page is clean but underpowered.
- The H1 "Audit Runs" makes the product feel like a file processor rather than an intelligence platform.
- The summary cards are useful but generic.
- The charts show data, but they do not answer a strong business question.
- There is no time range, segment, comparison, or insight callout.

What I would change:

1. Rename the page from "Audit Runs" to something like "Risk Overview" or "Review Overview".
2. Add a top query/control bar: time range, upload type, status, risk tier, data quality.
3. Replace the first row with decision metrics:
   - Exposure needing review
   - Customers needing review
   - Evidence-ready disputes
   - Data quality score
   - Review completion rate
4. Add an "Insights" strip above charts:
   - "Flagged rate increased from 0.0% to 3.4% in the latest upload."
   - "5 customers are high-confidence and unresolved."
   - "Evidence package creation is blocked for X profiles."
5. Make the main dashboard chart a time-series trend, not isolated mini charts.
6. Add a cohort-style breakdown:
   - By confidence
   - By review status
   - By refund claim behavior
   - By evidence readiness

Amplitude fit:

- This turns the page into a self-service analytics starting point: monitor, segment, then drill in.

## Priority 2 - Audit Results Need Tabs and a Stronger Analytical Story

Current screenshot:

- `test-results/amplitude-design-audit/1440-audit-b5c8618c-d15e-4a57-bf88-e1377dc59142.png`

What I see:

- The page has the right ingredients, but the hierarchy is too flat.
- The risk legend consumes too much attention.
- Two banners sit above the metrics, so the first impression is warnings rather than findings.
- The "See all customers from this upload" card is useful, but it looks like a broad navigation block instead of a natural analytical next step.
- The chart grid is present, but the page does not yet feel like an investigation briefing.

What I would change:

1. Add tabs:
   - Overview
   - Customers
   - Transactions
   - Evidence
   - Data quality
2. Make the hero area an audit summary:
   - "89 orders analyzed"
   - "9 review-worthy transactions"
   - "5 definite customers"
   - "£974.99 exposure"
   - "Completed 05 May 2026"
3. Move the risk legend into a compact info popover or right-side glossary.
4. Replace the blue/yellow stacked banners with one calm "Audit quality" module.
5. Add chart-to-table behavior:
   - Click "Definite" bar -> filters table to definite rows.
   - Click "Data quality warning" -> opens field coverage view.
6. Add a sticky secondary nav or filter row for risk tier, status, and review state.

Amplitude fit:

- Amplitude dashboards work because every visualization feels queryable. This page should make every summary number clickable and explainable.

## Priority 3 - Customer Table Should Become a Cohort Workspace

Current screenshot:

- `test-results/amplitude-design-audit/1440-customers.png`

What I see:

- The table is clean and dense.
- The filter controls are compact, but not very expressive.
- The user has no visual summary of active filters.
- The risk and status controls are useful, but they make every row feel operational rather than analytical.
- The table does not expose why this cohort matters.

What I would change:

1. Add cohort summary cards above the table:
   - New customers to review
   - Repeat refund claimants
   - Linked-account groups
   - Evidence-ready profiles
2. Add filter chips below the search bar:
   - `Risk: Probable+`
   - `Status: New`
   - `Refunds: Has refunds`
   - `Data quality: Strong`
3. Add saved views:
   - "High-confidence unresolved"
   - "Evidence-ready"
   - "Repeat refund claims"
   - "Linked identities"
4. Make row click behavior visually obvious. Keep "View ->", but give rows hover affordance and consistent spacing.
5. Add column controls/density controls for analyst workflows.

Amplitude fit:

- This turns Customers into a segmented cohort table rather than a flat database view.

## Priority 4 - Drawer Is Good, But Needs Stronger Triage

Current screenshot:

- `test-results/amplitude-design-audit/1440-customers-drawer.png`

What I see:

- The drawer pattern is the right one.
- It preserves list context, which is excellent.
- The drawer is still too fact-list-first.
- The top summary bars are visually heavy and not immediately meaningful.
- "Identity signals" still exposes an internal frame and `disputeHistory` still looks like an enum.

What I would change:

1. Replace the two progress bars with one compact confidence block:
   - Grade
   - Why
   - Review status
   - Next action
2. Put the recommended action in the drawer header, not buried lower down.
3. Convert `disputeHistory` to "Prior dispute/refund pattern".
4. Add a mini timeline chart for order/refund sequence.
5. Make "Generate evidence" visible in the drawer when eligible, disabled with a clear reason when not.

Amplitude fit:

- The drawer should feel like a chart drilldown: summary, reason, supporting events, action.

## Priority 5 - Customer Detail Should Be a Case Page

Current screenshot:

- `test-results/amplitude-design-audit/1440-customers-ae4e5dc1-b091-4892-bcd0-0aa92fb19f51.png`

What I see:

- The page has useful raw information.
- The layout is balanced, but it still feels like a profile record.
- The left column has the most useful case data, the right column has identity metadata, but the relationship between them is not narrative.
- The "Generate evidence package" button is prominent, which is good.

What I would change:

1. Add a "Case summary" panel at the top:
   - "5 orders, 5 refund claims, 100% refund claim rate"
   - "Probable review priority"
   - "Evidence package available for X orders"
2. Replace raw "Identity Overview" with "Why this customer needs review".
3. Show a chronological order/refund timeline, not just stacked order cards.
4. Add right-side action panel:
   - Status
   - Watchlist
   - Generate evidence
   - Add note
   - Last activity
5. Keep identity data, but make it secondary and collapsible.

Amplitude fit:

- This mirrors the analytics flow: cohort -> user/customer -> event timeline -> action.

## Priority 6 - Evidence Page Needs a Clear Loading and Eligibility State

Current screenshot:

- `test-results/amplitude-design-audit/1440-customers-ae4e5dc1-b091-4892-bcd0-0aa92fb19f51-evidence-new.png`

What I see:

- The page layout is simple and readable.
- The "Order in dispute" field appears as a blank/skeleton-like area with a disabled button.
- It is unclear whether orders are loading, unavailable, or failing.
- This is a high-trust workflow; ambiguity here feels risky.

What I would change:

1. Add explicit states:
   - Loading orders...
   - No eligible orders found
   - Orders loaded
   - Eligibility check failed
2. If disabled, explain why directly below the button.
3. Add a preview panel showing what the package will include:
   - Order history
   - Identity evidence
   - CE3.0 eligibility
   - Merchant note
4. After selecting an order, show a checklist and confidence/eligibility badge.

Amplitude fit:

- This is the "act" moment. Amplitude-like UX makes the next step obvious and trustworthy.

## Priority 7 - Upload Mapping Is Functional But Too Spreadsheet-Like

Current screenshot:

- `test-results/amplitude-design-audit/1440-upload-rich-mapping.png`

What I see:

- The mapping is clearer than before.
- Required fields are obvious.
- Optional fields are still a long vertical list of dropdowns.
- The user cannot quickly see "how good is this upload?" without reading the list.

What I would change:

1. Add a top "Data quality" scorecard:
   - Required fields complete
   - Identity strength
   - Evidence readiness
   - Missing high-value fields
2. Convert optional fields into collapsible groups with completion counts:
   - Identity fields 4/6
   - Payment fields 4/4
   - Device fields 1/5
   - Refund fields 4/4
3. Add platform presets for Shopify, WooCommerce, Magento, BigCommerce.
4. Add a preview panel showing first 3 parsed rows after mapping.
5. Use Amplitude-style setup guidance: "This upload can support customer matching and evidence packages" rather than just "fields mapped".

Amplitude fit:

- Amplitude setup flows are about making data useful quickly. Your upload flow should tell the user what analysis will be possible.

## Priority 8 - Mobile Is Better, But Tables Still Need a Native Mobile Treatment

Current screenshots:

- `test-results/amplitude-design-audit/390-mobile-dashboard.png`
- `test-results/amplitude-design-audit/390-mobile-customers.png`
- `test-results/amplitude-design-audit/390-mobile-audit-b5c8618c-d15e-4a57-bf88-e1377dc59142.png`

What improved:

- The sidebar no longer permanently eats the viewport.
- Dashboard and audit pages are basically readable.
- The mobile header is compact.

What still needs work:

- The mobile customers page is still a desktop table squeezed into a phone.
- The status dropdowns are clipped off the right edge.
- The dashboard chart labels are too small and angled.
- The audit legend is readable but too large for mobile priority.

What I would change:

1. Convert mobile customer rows into cards:
   - Email/name
   - Risk badge and score
   - Status
   - Orders/refunds
   - One tap target
2. On mobile dashboard, hide axis labels that cannot fit and use simpler summary trends.
3. Make audit result metrics two-column cards, then put review queue before charts.
4. Move the risk legend into a collapsible "About grades" row on mobile.

Amplitude fit:

- Amplitude mobile is not the main reference, but enterprise users still expect responsive views not to look broken.

## Priority 9 - Command Palette Should Search the Product, Not Just Pages

Current screenshot:

- `test-results/amplitude-design-audit/1440-command-palette-refund.png`

What I see:

- Visually polished.
- Good keyboard feel.
- Searching "refund" only offers customer search and says no pages match.

What I would change:

1. Search across:
   - Customers
   - Audits
   - Orders
   - Evidence packages
   - Help docs
   - Saved views
2. Add result groups:
   - Navigate
   - Customers
   - Audits
   - Help
3. Show recent objects by default.
4. Let users jump straight to "High refund-rate customers" as a saved query.

Amplitude fit:

- Command search should become a self-service exploration entry point, not just navigation.

## Priority 10 - Empty States Should Explain the Workflow

Screens:

- Inbox
- Watchlist
- Chargebacks
- Saved views

What I see:

- The empty states are clean but too thin.
- They do not connect the pages into a workflow.

What I would change:

- Inbox: "No customers currently require review" plus why, last audit, and links to audit results.
- Watchlist: show example of what watchlist monitoring will surface.
- Chargebacks: show the three-step generation flow.
- Saved views: show suggested views and a button to create one from Customers.

Amplitude fit:

- Empty states should teach the user what analysis loop exists.

## Concrete Layout Recommendations

### New Dashboard Layout

1. Header: "Risk Overview" + time range + upload segment.
2. Insight strip: 2-3 generated observations.
3. KPI row: exposure, review queue, evidence-ready, data quality.
4. Main chart: risk/exposure trend over time.
5. Two-column analysis:
   - Confidence distribution
   - Review status distribution
6. Cohort table: "Top customers needing review".
7. Footer: recent uploads.

### New Audit Layout

1. Header: audit name/date/status + actions.
2. Tabs: Overview, Customers, Transactions, Evidence, Data quality.
3. Overview:
   - KPI row
   - Findings summary
   - Data quality module
   - Chart grid
   - Top review queue
4. Customers tab:
   - Cohort controls and grouped customer table.
5. Transactions tab:
   - Filterable transaction table with row preview.

### New Customer Detail Layout

1. Top action bar: status, watchlist, generate evidence.
2. Case summary: risk grade, reason, activity, exposure.
3. Timeline: orders, refunds, disputes.
4. Evidence readiness panel.
5. Identity data collapsed by default.
6. Activity and notes.

## Visual System Notes

- Keep the quiet monochrome base. It is working.
- Reduce border-heavy cards by grouping sections with whitespace and subtle dividers.
- Use color only for state and risk. Currently orange/red/green compete with chart colors.
- Make chart titles more question-like:
  - "How has review volume changed?"
  - "Which confidence levels dominate this audit?"
  - "Which customers create most exposure?"
- Treat chart cards as interactive, with hover and click states.
- Preserve density on desktop, but make hierarchy stronger through section headers and tabbed surfaces.

## Best Next Design Sprint

If I were sequencing this, I would do one focused design sprint before more feature work:

1. Redesign dashboard around Amplitude-style monitoring and segmentation.
2. Add audit tabs and chart-to-table filtering.
3. Convert Customers into a saved cohort workspace.
4. Rework customer drawer/detail around case summary and timeline.
5. Build mobile card layouts for customers and audit tables.
6. Add explicit evidence loading/eligibility states.
7. Expand command palette to search real objects and saved views.

This would move the app from "competent fraud audit dashboard" to "merchant intelligence workspace".
