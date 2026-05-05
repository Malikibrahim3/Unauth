# ASOS-Ready UI/UX Forensic Audit and Implementation Plan

Date: 2026-05-05
Scope: authenticated merchant app, public/legal pages, seeded audit data, Playwright interaction pass, Jest, and production build.
Constraint followed: no application code changes were made. This document is the only intentional deliverable.

## Audit Plan

### Phase 1 - Establish a trustworthy test merchant
- Start the local app and authenticate with a real Supabase-backed merchant account.
- Seed realistic audit data through the UI, not by bypassing the product.
- Capture setup/test harness failures as product-readiness findings.
- Verify that the app can support a repeatable merchant demo account.

### Phase 2 - Route and interaction inventory
- Visit every top-level route in the authenticated shell.
- Visit public/legal routes a large merchant would inspect before trusting the product.
- Discover and visit dynamic audit, transaction, customer, and evidence routes from live data.
- Capture screenshots and structured inventories of headings, controls, small targets, redirects, console errors, failed network requests, and mobile behavior.

### Phase 3 - Forensic interaction pass
- Exercise login invalid state and sign-up toggle.
- Exercise global search/command palette and sidebar collapse/expand.
- Exercise upload template download, CSV mapping, upload context, processing, and result navigation.
- Exercise customer filters, drawer open/close, customer full page, investigation status, evidence generation entry point.
- Exercise audit result links, transaction detail pages, customer grouping pages, dismiss/watchlist-style controls where safe in a test merchant.
- Exercise settings routes and forms without deleting the account.

### Phase 4 - Quality gates
- Run Jest to catch scoring/regression failures.
- Run production build to catch deploy blockers.
- Record Playwright/global setup breakages.
- Treat console/hydration errors as release blockers, not cosmetic noise.

### Phase 5 - Implementation plan
- Separate true blockers from polish.
- Prioritize fixes required before showing this to a major merchant.
- Include exact files, reproduction notes, and acceptance criteria.

## Evidence Captured

Primary artifacts live in:

- `test-results/codex-audit/exploratory-audit.json`
- `test-results/codex-audit/seed-summary-v3.json`
- `test-results/codex-audit/evidence-pass.json`
- `test-results/codex-audit/*.png`

Representative screenshots:

- `test-results/codex-audit/meta-375-mobile-dashboard.png`
- `test-results/codex-audit/meta-375-mobile-customers.png`
- `test-results/codex-audit/meta-375-mobile-audit-b5c8618c-d15e-4a57-bf88-e1377dc59142.png`
- `test-results/codex-audit/meta-1440-audit-b5c8618c-d15e-4a57-bf88-e1377dc59142.png`
- `test-results/codex-audit/meta-1440-audit-b5c8618c-d15e-4a57-bf88-e1377dc59142-transaction-309e158e-4b1c-47d2-a350-39461a01a993.png`
- `test-results/codex-audit/customer-detail-for-evidence.png`
- `test-results/codex-audit/evidence-new-empty.png`

Routes covered: dashboard, upload, history, inbox, customers, watchlist, chargebacks, saved views, settings redirects, settings account, help, CSV guide, how-it-works, legal privacy, legal data handling, legal DPA, demo, onboarding, internal eval/network metrics gates, audit result, audit customers, transaction detail pages, customer drawer, customer detail, and evidence generation entry.

## Executive Summary

The app has a credible analytical core, and the upload-to-audit path did complete with seeded data. It is not yet ready to put in front of a major merchant like ASOS. The largest issues are not just visual polish. There are release blockers: production build fails, core tests fail, Playwright setup is stale, an audit customer route hydrates incorrectly, evidence generation cannot find orders for a customer that visibly has orders, settings team/audit-trail routes are dead, and mobile layout is effectively unusable.

Once those are fixed, the product needs a focused premium pass: remove internal scoring jargon from merchant-facing surfaces, make evidence and inbox workflows coherent, tighten responsive behavior, make charts reliable and meaningful, and replace raw technical details with a guided investigation narrative.

## P0 Release Blockers

### 1. Production build fails

Command:

```bash
npm run build
```

Failure:

```text
app/(app)/audit/[runId]/transaction/[id]/page.tsx:76:103
Type error: Argument of type 'number | null' is not assignable to parameter of type 'number'.
```

Recommended fix:
- Update the transaction detail page to handle nullable `order_value` before calling `formatCurrency`.
- Decide the display state for missing order values: `-`, `Unknown`, or `Not provided`.
- Add a unit or component-level guard so nullable monetary fields cannot break builds.

Acceptance:
- `npm run build` exits 0.
- Transaction detail renders gracefully when `order_value` is null.

### 2. Core Jest suite fails

Command:

```bash
npm test -- --runInBand
```

Failures:
- `tests/engine/cross_merchant_no_leak.test.ts`: expected cross-merchant score >= 30, received 24.
- `tests/engine/addressClustering.test.ts`: expected shared-address signal to fire, did not.
- `tests/engine/addressClustering.test.ts`: expected score 60 for more distinct emails, received 41.
- `tests/eval/regression.test.ts`: expected F1 >= 0.7, received 0.6667.

Recommended fix:
- Treat this as a scoring regression, not a test annoyance.
- Review recent signal-weight changes in `lib/engine/signals/addressClustering.ts`, `lib/engine/signals/crossMerchant.ts`, and aggregate scoring.
- Either restore expected behavior or deliberately update thresholds with documented calibration.

Acceptance:
- All engine and eval tests pass.
- If thresholds change, the product copy and risk-tier explanations are updated to match.

### 3. Playwright setup is stale against the database schema

Failure:

```text
Failed to create merchant profile: Could not find the 'store_name' column of 'merchants' in the schema cache
```

Relevant file:
- `tests/global-setup.ts`, lines 47-57 insert `store_name`.

Recommended fix:
- Remove `store_name` from the seed merchant upsert or reintroduce a compatible migration if the column is intended.
- Add a minimal smoke test for Playwright global setup itself.
- Store generated credentials only after the merchant row succeeds, and clean up orphaned auth users on setup failure.

Acceptance:
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --config=tests/playwright.config.ts ...` can create a merchant and seed data from scratch.

### 4. Playwright upload helpers no longer match the actual upload UI

Relevant file:
- `tests/utils/test-fixtures.ts`, lines 67-74.

Problems:
- The file input is intentionally hidden, but the helper waits for it as if it should be visible.
- The helper waits for `[data-testid="column-mapping"]`, `[data-testid="upload-context"]`, or text `Column mapping`, but the actual UI says "We found 19 columns..." and does not expose the expected test IDs.

Recommended fix:
- Wait for the file input with `{ state: 'attached' }`.
- Add stable `data-testid` values to upload mapping, upload context, submit, date fields, upload label, and result root.
- Update selectors to match the actual UI text.

Acceptance:
- Upload Playwright tests complete without custom workarounds.

### 5. Audit customers route has hydration errors

Observed on:
- `/audit/b5c8618c-d15e-4a57-bf88-e1377dc59142/customers`

Console/page errors:

```text
In HTML, <button> cannot be a descendant of <button>.
Hydration failed because the initial UI does not match what was rendered on the server.
```

Relevant files:
- `components/audit/CustomerProfileCard.tsx`, lines 49-65.
- `components/audit/WatchlistStarButton.tsx`, lines 123-140.

Cause:
- The entire customer card header is a `<button>`, and it contains `WatchlistStarButton`, which renders another `<button>`.

Recommended fix:
- Convert the outer expandable header to a non-button container with a dedicated expand button, or move the watchlist control outside the clickable header.
- Add an accessibility regression test for nested interactive elements.

Acceptance:
- No hydration errors on audit customer pages.
- Watchlist and expand controls are separately focusable and clickable.

### 6. Evidence generation cannot find orders for a customer that visibly has orders

Observed:
- Customer detail page for `/customers/ae4e5dc1-b091-4892-bcd0-0aa92fb19f51` shows 5 orders.
- Clicking "Generate evidence package" opens `/customers/ae4e5dc1-b091-4892-bcd0-0aa92fb19f51/evidence/new`.
- Evidence page says "No orders found for this customer" and disables generation.

Artifacts:
- `test-results/codex-audit/customer-detail-for-evidence.png`
- `test-results/codex-audit/evidence-new-empty.png`

Recommended fix:
- Align the evidence route's order query with the customer profile data model used by customer detail.
- Confirm whether the route should query by customer profile ID, cluster ID, email hash, audit appearance, or transaction customer email.
- Add an end-to-end test: customer with visible order history can generate an evidence package.

Acceptance:
- Evidence page lists the same orders shown on the customer detail page.
- Selecting an order produces a chargeback/evidence package and redirects to `/chargebacks/[id]`.

### 7. Mobile app shell is not usable

Observed at 375x812:
- The fixed 240px sidebar remains permanently visible.
- The content area is squeezed into roughly one third of the viewport.
- Dashboard cards, audit legends, tables, and customer rows become unreadable.

Artifacts:
- `test-results/codex-audit/meta-375-mobile-dashboard.png`
- `test-results/codex-audit/meta-375-mobile-customers.png`
- `test-results/codex-audit/meta-375-mobile-audit-b5c8618c-d15e-4a57-bf88-e1377dc59142.png`

Recommended fix:
- Add a mobile shell: collapsed rail or hamburger drawer below `md`.
- Make the sidebar overlay content on mobile instead of consuming layout width.
- Add responsive treatments for tables, audit legends, metric grids, and drawer widths.

Acceptance:
- Core routes are usable at 375px, 768px, 1024px, and desktop.
- No text is forced into one-word columns.

## P1 Product Workflow Fixes

### 8. Inbox is empty while audits contain definite/probable flagged transactions

Observed:
- Audit result shows 9 flagged customers/transactions in the latest run.
- `/inbox` says "You're all caught up" and "No high or critical transactions need review."

Risk:
- The app says it has an operational review inbox, but flagged work does not arrive there. This breaks the day-to-day merchant workflow.

Recommended fix:
- Define the inbox contract: which risk grades/statuses should appear.
- Populate inbox from current reviewable transactions/customers, not only a missing status flag.
- Show a clear empty state only when there are truly no reviewable items.

Acceptance:
- A newly completed audit with definite/probable findings creates inbox items or explains why it does not.

### 9. Settings team and audit-trail routes are dead

Observed:
- `/settings/team` redirects to `/settings/account`.
- `/settings/audit-trail` redirects to `/settings/account`.

Relevant files:
- `app/(app)/settings/team/page.tsx`
- `app/(app)/settings/audit-trail/page.tsx`

Recommended fix:
- Either implement team and audit-trail pages or remove/avoid surfacing those routes.
- If team management is not ready, show a polished "coming soon/contact us" state rather than redirecting to Account.
- If audit trail exists via API, expose it as a real page with filters and event details.

Acceptance:
- Every settings route has a route-specific page and breadcrumb.

### 10. Settings account does not load merchant setup fields

Observed:
- Account page shows "Monthly order volume" and "Primary fraud concern" as blank even though the test merchant was created with values.

Relevant file:
- `app/(app)/settings/account/page.tsx`, lines 46-58 select only `id, name` but then try to read `monthly_order_volume` and `primary_fraud_concern`.

Recommended fix:
- Select `id, name, monthly_order_volume, primary_fraud_concern, setup_complete`.
- Normalize old values such as `500-2000` vs current option values like `500_2000`.
- Rename "Primary fraud concern" in the UI if merchant-facing copy should avoid that word.

Acceptance:
- Saved setup values load correctly and round-trip through the form.

### 11. Internal eval redirect sends non-internal users to `/home`, which 404s

Observed:
- `/eval` redirects to `/home`.
- `/home` returns 404.

Relevant file:
- `app/(internal)/eval/page.tsx`.

Recommended fix:
- Redirect to `/dashboard`, `/login`, or a real "not authorized" page.
- Keep internal pages unlinked and gated, but avoid dead redirects.

Acceptance:
- Non-internal users never land on a 404 from a known internal route.

### 12. Chargebacks/evidence packages route is empty and disconnected

Observed:
- `/chargebacks` says no packages exist.
- Evidence generation entry exists on customer detail but cannot generate for the first high-risk customer.

Recommended fix:
- Fix evidence generation first.
- Add a happy-path package to demo/test seed data.
- Make `/chargebacks` a confident evidence workspace: package status, reference, customer, order, created date, CE3.0 status, download action.

Acceptance:
- Seeded merchant has at least one package or a working path to create one.

## P1 Merchant-Facing Copy and Trust Fixes

### 13. Merchant-facing UI exposes internal jargon and banned/problematic terms

Observed examples:
- Upload page: "suspicious refund patterns".
- Customer drawer: "Identity signals", raw `disputeHistory`.
- Transaction detail: "Signals matched", `card`, `email`, `ip`, `elevated_refund_rate`, `value_escalation`, `Cluster ID`.
- Settings: "Primary fraud concern".
- Help/legal pages contain "entity", "signals", "hash", "normalisation", and related internal concepts.

Recommended fix:
- Define a merchant-facing language system.
- Replace internal field names with plain labels:
  - `disputeHistory` -> "Dispute history"
  - `elevated_refund_rate` -> "High refund claim rate"
  - `value_escalation` -> "Order values increased quickly"
  - `Cluster ID` -> remove from merchant UI or move behind debug/internal mode.
  - "Signals matched" -> "Why this was flagged for review"
- Decide where legally precise technical language belongs. Legal/security pages can be more technical, but they still need clearer explanations and no contradictions.

Acceptance:
- No raw enum/camelCase/snake_case labels appear in merchant-facing app surfaces.
- Confidence grade labels are consistently Definite, Probable, Possible, Weak.

### 14. Legal/privacy pages need a trust pass before enterprise review

Observed:
- DPA page says "draft" and "final review".
- Privacy page says Unauth does not collect payment card data, while the upload UI and field guide collect card last 4, BIN, and card fingerprint.
- Public pages use a separate plain style and do not feel like the same premium product.

Recommended fix:
- Reconcile privacy language with actual collected fields. If the intent is "no full PAN/CVV", say that clearly.
- Remove draft language before enterprise demos or clearly gate the page.
- Add security posture, subprocessors, retention, deletion SLA, data residency, and contact process.
- Style legal pages with the same product design system.

Acceptance:
- Legal pages are accurate, polished, and consistent with upload/evidence data fields.

## P1 Responsive and Interaction Polish

### 15. Too many interactive targets are tiny

Observed:
- The structured crawl counted many tiny controls, especially on audit pages and customer tables.
- Audit result desktop: 49 tiny targets.
- Audit customers desktop: 96 tiny targets.

Recommended fix:
- Establish a minimum hit target of 32x32 desktop and 44x44 touch.
- Replace tiny text links/icons with aligned action buttons or row-level actions.
- Add hover/focus states that make row click behavior obvious.

Acceptance:
- Playwright control inventory shows no critical action under target size.

### 16. Tables are not mobile transformed

Observed:
- Customer and audit tables remain table-like on narrow screens and become clipped/squeezed.

Recommended fix:
- On mobile, convert core tables to stacked rows/cards with primary metadata first.
- Keep desktop tables dense, but add sticky headers and clearer row affordances.

Acceptance:
- Customers, history, audit results, and transaction lists are scannable on mobile and tablet.

### 17. Global search is useful but limited

Observed:
- Command palette supports navigation and customer search, but does not include audit IDs, evidence packages, settings subpages, or recent entities.

Recommended fix:
- Add recent audits, recent customers, evidence packages, and settings subroutes.
- Show keyboard hints, result categories, and empty-state recovery.

Acceptance:
- A merchant can reach major workflows and known entities from the palette.

## P2 Visual Design and Premium Readiness

### 18. Dashboard lacks executive narrative

Current feel:
- Functional, clean, but generic.
- "Audit Runs" as the main heading undersells the product.
- Charts are minimal and hard to interpret with only two runs.

Recommended fix:
- Reframe the dashboard around merchant decisions:
  - "Review priority"
  - "Exposure found"
  - "Customers to review"
  - "Evidence ready"
  - "Upload health"
- Add a clear primary next action and secondary review action.
- Use trend cards only when enough data exists; otherwise show explanation.

Acceptance:
- A new merchant knows what to do within 5 seconds.

### 19. Audit result page needs stronger triage hierarchy

Current feel:
- The page has useful data but too many surfaces at equal weight.
- Risk legend and data quality banners compete with summary metrics.
- Chart rendering showed inconsistent risk distribution visibility during screenshots.

Recommended fix:
- Top section should answer:
  - What did we find?
  - What is the estimated exposure?
  - Which customers/orders should be reviewed first?
  - What is the next action?
- Move the risk legend into a compact help popover or persistent inline scale.
- Add a "Review queue" section for top cases before raw tables.

Acceptance:
- Audit page reads like an investigation briefing, not a table dump.

### 20. Customer profile should become an investigation workspace

Current feel:
- Strong data, but raw and static.
- It shows the evidence, but not enough decision guidance.

Recommended fix:
- Structure around:
  - Summary verdict
  - Why this customer needs review
  - Related identities/accounts
  - Order/refund timeline
  - Recommended next action
  - Evidence generation
- Keep raw identifiers available but visually secondary.
- Fix evidence generation so this page is a real workflow, not a dead end.

Acceptance:
- An analyst can decide what to do next without reading every field.

### 21. Empty states need more commercial confidence

Observed:
- Watchlist empty, chargebacks empty, saved views empty, demo coming soon.

Recommended fix:
- Empty states should be specific and task-oriented:
  - What this page is for.
  - Why it is empty now.
  - What action creates content here.
  - How this helps a merchant.
- For demo, either implement a demo or remove the promise from visible paths.

Acceptance:
- Empty pages still feel intentional and enterprise-ready.

## Recommended Implementation Order

### Sprint 0 - Stabilize the app
1. Fix production build nullable value failure.
2. Fix failing engine/eval tests or recalibrate thresholds deliberately.
3. Fix Playwright global setup schema mismatch.
4. Fix Playwright upload selectors/test IDs.
5. Fix audit customer hydration error.
6. Restart and verify a clean dev/build/test cycle.

### Sprint 1 - Repair broken merchant workflows
1. Fix evidence order lookup and package generation.
2. Fix inbox population or redefine inbox behavior.
3. Implement or remove settings team/audit-trail routes.
4. Fix internal redirects away from `/home`.
5. Fix account settings field selection and value normalization.

### Sprint 2 - Merchant language and trust pass
1. Replace raw technical labels across transaction, customer, audit, filters, upload, and help.
2. Align confidence/risk language everywhere.
3. Review legal/privacy pages for accuracy.
4. Remove draft DPA language from enterprise-facing routes.

### Sprint 3 - Responsive shell and data surfaces
1. Implement mobile navigation drawer/rail.
2. Convert tables to mobile row cards.
3. Fix audit legends/banners on narrow widths.
4. Add viewport-specific Playwright screenshot assertions.

### Sprint 4 - Premium product polish
1. Redesign dashboard hierarchy around decisions and exposure.
2. Rework audit result page as a triage briefing.
3. Rework customer detail as an investigation workspace.
4. Upgrade empty/loading/error states.
5. Add reliable charts and remove chart console warnings.

## Route Inventory Summary

| Route | Current status | Action |
|---|---|---|
| `/dashboard` | Loads, but generic and weak on mobile | Reframe around review priorities and exposure |
| `/upload` | Core flow works after selector workarounds | Add stable test IDs, reduce jargon, improve mapping guidance |
| `/history` | Loads | Improve scanning, filters, and relationship to dashboard |
| `/inbox` | Empty despite flagged audit results | Fix workflow contract |
| `/customers` | Loads with powerful filters | Fix mobile, tiny targets, raw labels, row clarity |
| `/customers/[id]` | Loads and shows orders | Fix evidence link/data mismatch and copy polish |
| `/customers/[id]/evidence/new` | Loads but cannot find orders | P0 workflow fix |
| `/watchlist` | Empty state loads | Ensure star actions populate it, improve management workflow |
| `/chargebacks` | Empty state loads | Fix evidence creation and seed/demo package |
| `/lookup` | Redirects to `/customers` | Remove stale docs/references or provide clear migration behavior |
| `/saved` | Empty state loads | Implement saved views or remove until ready |
| `/settings` | Redirects to account | OK if intentional |
| `/settings/account` | Loads but missing stored values | Fix selected fields and labels |
| `/settings/team` | Dead redirect to account | Implement or hide |
| `/settings/audit-trail` | Dead redirect to account | Implement or hide |
| `/help` | Loads | Update IA and language |
| `/help/csv-export` | Loads, dense | Make more scannable and less technical |
| `/help/how-it-works` | Loads, jargon-heavy | Rewrite for merchants |
| `/legal/privacy` | Loads | Accuracy/trust review |
| `/legal/data-handling` | Loads | Accuracy/trust review |
| `/legal/dpa` | Loads, says draft | Not enterprise-ready as-is |
| `/demo` | "Demo coming soon" | Implement or remove visible path |
| `/onboarding` | Accessible even after setup | Decide if users should revisit or redirect after completion |
| `/eval` | Redirects to `/home` 404 for non-internal users | Redirect safely |
| `/network-metrics` | Internal gate behavior inconsistent in crawl | Verify and route unauthorized users clearly |
| `/audit/[runId]` | Loads | Improve hierarchy, chart reliability, copy |
| `/audit/[runId]/customers` | Hydration failure | P0 nested button fix |
| `/audit/[runId]/transaction/[id]` | Loads in dev but build fails type check | P0 nullable value fix and copy cleanup |

## Definition of Done Before Enterprise Demo

- `npm run build` passes.
- `npm test -- --runInBand` passes or has explicitly accepted threshold updates.
- Playwright global setup can create a merchant, upload seed CSVs, generate evidence, and clean up.
- No console errors or hydration errors on visited routes.
- Evidence packages can be generated from at least one seeded high-risk customer.
- Inbox reflects newly flagged review work.
- Mobile navigation and core pages are usable at 375px.
- Settings subroutes are real or hidden.
- Legal pages are accurate and no longer marked draft if public.
- Merchant-facing UI has no raw enums, hashes, cluster IDs, or internal signal names.
- Screenshots of dashboard, upload, audit, customers, customer detail, evidence, chargebacks, settings, and mobile views look coherent enough to show to a major merchant without narration.
