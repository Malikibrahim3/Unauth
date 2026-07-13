# IMPL — UI Craft Overhaul: 3.6/10 → ≥9.5/10

**Date:** 13 Jul 2026
**Basis:** Full visual audit of the running app as the demo merchant (Elara & Co Apparel), 13 Jul 2026. Raw findings: rated report artifact (`claude.ai/code/artifact/2b21e8ab-05a6-44f2-8e68-6264b5035934`) — the complete punch list is reproduced in **Appendix A** so this document is self-contained.
**Executor:** any competent coding model. Everything you need is in this file plus the referenced source files. Do not improvise beyond the specs; where a spec is silent, follow the Design Rules in §2.

---

## 0. Mission and non-negotiables

The app's information architecture, queue/kanban patterns, tests, security and a11y are in good shape. The **craft layer is not**: the UI leaks database vocabulary, renders raw identifiers, mixes currencies and date formats, has no coherent status system, no charts, and repeats per-row buttons everywhere. Your job is to fix the craft layer **without regressing the functional layer**.

### 0.1 Relationship to `docs/AUTHENTICATED-APP-FORENSIC-AUDIT-2026-07-13.md`

That document's **functional gates remain binding**: production build, `tsc --noEmit`, `eslint app components lib --max-warnings=0`, the Jest corpus (~2,000 tests), a11y/responsive suites, tenant isolation. Keep them green at every step.
Its **visual/interaction scores (96–97) are superseded** by the 13 Jul visual audit (3.6/10 against a Stripe/Linear bar). Where that doc and this one disagree about what "good" looks like, **this document wins**.

### 0.2 Never touch

- Any scoring formula, weighting, matching or cluster logic (`lib/engine/*`, `lib/scorer.ts` internals) — CLAUDE.md ground rule.
- Table/column names outside `lib/supabase/tables.ts` (SSOT).
- The Gorgias widget's 4-line decision-card format (CLAUDE.md).
- Terminology rules in `docs/product/TERMINOLOGY.md` — no "fraudster/bad actor/blacklist/guilty/scammer" language anywhere you write copy.
- No `as any`. No `// eslint-disable`. Fix types properly.
- Light theme remains the default (binding guardrail). Motion stays restrained.

### 0.3 Working method (follow exactly)

1. Execute workstreams **in order** (WS0 → WS6). Within a workstream, tasks are independently committable.
2. One commit per task, message `ui-overhaul(wsN): <task title>`.
3. After **every** task run the gate: `npx tsc --noEmit && npx eslint app components lib --max-warnings=0 && npx jest --silent`. If a test fails because copy/labels changed intentionally, update the test to the new canonical string — never weaken an assertion to a regex that would also pass for raw enums.
4. After each **workstream**, run the visual verification protocol in §3.3 and check off the relevant Appendix A items.
5. When a task says "verbatim", the string must match character-for-character.

---

## 1. Ground truth — what already exists (use it, don't duplicate it)

| Asset | Location | State |
|---|---|---|
| Design tokens (CSS vars) | `app/globals.css` (`:root` block: `--surface-*`, `--ink-*`, `--border-*`, `--accent-*`, semantic aliases `--bg-*`, `--text-*`, `--shadow-*`) | Good foundation. **No dark-theme token set yet** (1 stray reference). Use these vars for all new styles; do not invent parallel hexes. |
| Legacy token object | `components/ui/tokens.ts` (`uiTokens`) | Landing-era mix (heavy shadows, step badges). Do not extend it; prefer CSS vars. |
| UI primitives | `components/ui/` — `PageHeader.tsx`, `DataTable.tsx`, `Badge.tsx` (has `BadgeTone`, `BadgeVariant`, `BadgeSize`), `Card.tsx`, `Drawer.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `MetricCard.tsx`, `Modal.tsx`, `Select.tsx`, `Tooltip.tsx`, `Input.tsx`, index at `components/ui/index.ts` | Exists but under-adopted and under-specified. WS4 upgrades these in place. |
| Money formatting | `lib/utils/format.ts` (+ `lib/canonical/money.ts`) | **Root cause of the $/£ bug lives here**: `MERCHANT_DISPLAY_LOCALE = 'en-US'`, `DEFAULT_CURRENCY = 'USD'`. WS0.1 fixes. |
| Claim-type labels | `lib/claims/claimTypes.ts` (`CLAIM_TYPE_LABELS`), `components/claims/claimReviewLabels.ts` | Exists but bypassed by the drawer/profile/object pages. WS0.2 centralises. |
| Claim review kit | `components/claims/ClaimReview*.tsx` (Header, Panel, ContextColumn, ActionRail, ManageCard, FormSection, HistoryTable, Toast, labels/logic/reducer/state/styles/types) | The case page (`app/(app)/claims/[id]/page.tsx`) is assembled from these. WS5.1 restructures composition; reuse the kit's logic files. |
| Customer surfaces | `components/customers/` — `CustomerPreviewDrawer.tsx`, `CustomersTableClient.tsx`, `CaseSummaryStrip.tsx`, `CustomerSupportCasesSection.tsx` | WS5.2/5.3 rebuild content of drawer + profile. |
| Charts | `recharts@2.13` **and** `echarts@6` in package.json | Installed, unused in authenticated app ("obsolete chart systems removed"). **Standardise on `recharts`** for WS5.4; do not add a third library. |
| Motion | `framer-motion@12` / `motion@12` | Use `motion` for WS6.1 micro-interactions only. |
| Icons | `lucide-react` | Use exclusively; no hand-authored SVG paths. |
| Toasts | `components/claims/ClaimReviewToast.tsx` (local) | No global toast system. WS4.4 introduces one (see spec). |

### 1.1 Enum inventory (live DB values, demo merchant, 13 Jul 2026)

These are the **actual values** the UI must map. Any enum value not listed must still render humanised via the fallback in WS0.2 (never raw snake_case).

- `support_payout_cases.status`: `open, pending, evidence_needed, awaiting_customer_evidence, awaiting_carrier_response, ready_for_decision, manual_review, escalated, recovery_opened, resolved_refunded, resolved_exchanged, resolved_denied`
- `support_payout_cases.claim_type`: `wrong_item, refund_request, damaged, not_as_described, item_not_received, chargeback, return_abuse` (legacy: `missing_parcel`)
- `support_payout_cases.requested_action`: `replacement, store_credit, discount, refund, investigation`
- `support_payout_cases.recoverability`: `recoverable, possibly_recoverable, needs_more_evidence, not_recoverable, unknown`
- `recovery_cases.status`: `draft, evidence_needed, ready_to_submit, submitted, waiting_response, chase_due, paid`
- `recovery_cases.owner_type`: `carrier, warehouse, payment_dispute_provider, supplier, three_pl`
- `loss_cases.status`: `detected, collecting_evidence, submitted, approved`
- `loss_cases.case_category`: `delivery_loss, chargeback_or_payment_dispute, fulfilment_or_warehouse_error, supplier_or_vendor_issue`
- `loss_cases.attribution`: `carrier_claim, chargeback_evidence, warehouse_error, three_pl_claim, supplier_defect`
- `loss_cases.counterparty_type`: `carrier, payment_processor, warehouse, 3pl, supplier`
- `work_tasks.priority`: `urgent, high` (+ assume `medium, low`)
- `work_tasks`: `status`, `blocking_reason`, `source` — humanise via the same layer.
- Money: `*_minor` integer columns + per-row `currency` (`GBP` in demo). `merchants` has **no** currency column — currency always comes from the row/aggregate (`dominantCurrency()` exists in `format.ts`).

---

## 2. Design rules (apply to every task; these define "9.5")

1. **No raw identifiers.** UUIDs, seed slugs and snake_case enum values never reach the DOM. Objects display as *Customer name · short ref* (see WS2).
2. **One renderer per data type.** Money via `formatMoney`, dates via `formatDate*`, enums via `label()`/`StatusBadge`. Direct `Intl.NumberFormat`/`toLocaleString` calls in `app/` or `components/` are a defect (36 files currently do this — WS0.4 sweeps them).
3. **Status is form.** Exactly five semantic tones (§WS1). Never a sentence inside a pill; never lowercase pill text; opposite meanings never share a tone.
4. **A fact renders once per screen.** If you find yourself printing the same number twice, delete the weaker instance.
5. **Rows are targets.** Tables: whole row clickable, hover reveals a row-action menu, at most one visible inline action. Bulk actions live in a selection bar.
6. **Compact headers.** Title row ≤ 64px tall (breadcrumb + 20–24px title + actions), optional single-line stat strip. Page content must start within 120px of the top bar on all list pages. Delete page subtitles that merely describe the page.
7. **Copy is written from the merchant's side of the screen.** What happened, what it costs, what to do next. §7 dictionary is binding; extend `docs/product/TERMINOLOGY.md` with §7 when done.
8. **Every state is designed.** Skeleton mirrors final layout (including app chrome). Empty state = one sentence + one primary action. Errors appear only after interaction. Every mutation answers back (toast or optimistic update).
9. **Numbers:** Inter with `font-variant-numeric: tabular-nums` in any column of figures. DM Mono only for refs/IDs/hashes. Amounts right-aligned in tables.
10. **Dates:** unambiguous day-month forms — relative under 7 days ("2d ago"), `14 Jun` same year, `14 Jun 2025` otherwise, timestamps (`14 Jun, 09:42`) only in audit/timeline contexts. Never `7/4/2026`, never seconds, never ISO in UI.
11. **Colour:** semantic status tones are separate from the brand accent. The brick accent (`--accent-*`) marks primary actions and selection, not status. Keep the warm paper palette — it's a differentiator.
12. **Motion:** 120–160ms ease-out for reveals; no parallax, no bounce, honour `prefers-reduced-motion` (guardrail: restrained motion).

---

## 3. Verification protocol

### 3.1 Automated gate (after every task)

```bash
npx tsc --noEmit && npx eslint app components lib --max-warnings=0 && npx jest --silent
```

### 3.2 Forbidden-pattern greps (must return zero matches in `app/` + `components/` when WS0–WS2 complete)

```bash
# raw enum leak: snake_case rendered directly (allowlist: className, data-*, hrefs, keys)
grep -rn "awaiting_carrier_response\|ready_for_decision\|item_not_received\|loss_cases" app components --include="*.tsx" | grep -v "label\|Label\|// "
# dev-speak strings that must be gone (verbatim)
grep -rn "Server-filtered view\|server filtered and paginated\|recipient-scoped\|zero writes\|Provenance and freshness\|Canonical loss_cases\|source registry" app components --include="*.tsx"
# UUIDs in breadcrumbs/titles are found by runtime check (3.3), not grep
```

### 3.3 Visual smoke run (after every workstream)

Log in as the demo merchant, viewport 1440×900, and walk: `/dashboard, /work, /claims, /claims/[first case], /customers, [open drawer], /customers/[id], /recoveries, /losses, /losses/[id], /rules, /rules/[id], /reports, /partners, /integrations, /notifications, /settings, /login`. For each screen assert:
- no snake_case or UUID visible anywhere (including breadcrumbs and `<title>`);
- every money value shows the row's currency symbol (demo = £ everywhere);
- every date matches rule §2.10;
- statuses render as `StatusBadge`, priorities/severities are visually distinguishable;
- content starts within 120px of the top bar; no duplicated fact on one screen.

### 3.4 What ≥9.5 means (rubric the final review must pass)

Score each 0–10; all must be ≥9: (a) language/grandma test, (b) object identity, (c) formatting consistency, (d) status system coherence, (e) information density & header economy, (f) table/action ergonomics, (g) state design (loading/empty/error/feedback), (h) dashboard insight (charts + deltas), (i) case page decision flow, (j) customer surfaces, (k) polish (no truncation/casing/alignment defects on the §3.3 walk), (l) keyboard & motion feel. The 13 Jul audit scored (a)–(l) between 2 and 6; Appendix A maps every finding to a workstream.

---

## WS0 — Language & formatting foundation

### WS0.1 Fix money/locale root cause
**File:** `lib/utils/format.ts` (+ call sites of `dominantCurrency`).
- Replace `MERCHANT_DISPLAY_LOCALE = 'en-US'` with `'en-GB'` (unambiguous day-month ordering; currency symbols unaffected).
- **Delete the silent `DEFAULT_CURRENCY = 'USD'` fallback for rendering.** New behaviour: `formatMoney(minor: number, currency: string)` requires currency; add `formatMoneyOrDash(minor: number | null | undefined, currency: string | null | undefined)` returning `'—'` when either is missing. It is better to show a dash than the wrong symbol. Keep a `USD` fallback **only** inside `dominantCurrency()` aggregates where every row lacks currency, and log a console.warn in dev when it fires.
- Add and export:
  ```ts
  formatMoney(minor: number, currency: string): string            // "£214.50"
  formatMoneyOrDash(minor?: number|null, currency?: string|null): string
  formatDate(iso: string): string                                  // "2d ago" | "14 Jun" | "14 Jun 2025"
  formatDateAbsolute(iso: string): string                          // "14 Jun 2026" (tables/exports)
  formatDateTime(iso: string): string                              // "14 Jun, 09:42" (timelines/audit only)
  ```
  Relative threshold: < 7 days → `Nd ago` / `Nh ago` / `just now`. No seconds anywhere.
- **Acceptance:** unit tests for all five (GBP + USD + missing-currency cases; today/yesterday/8-days/last-year dates). Customer profile and `/orders/[id]` show `£` for the demo store (Bug B1).

### WS0.2 One label layer for every enum
**New file:** `lib/ui/labels.ts`. Re-export `CLAIM_TYPE_LABELS` from `lib/claims/claimTypes.ts` (SSOT stays there) and add the maps below **verbatim**, plus a safe fallback:

```ts
export function humanise(value: string): string; // "awaiting_carrier_response" → "Awaiting carrier response" — last-resort fallback, logs dev warning
export function label(family: LabelFamily, value: string): string; // map lookup, falls back to humanise()
```

| family | value → label |
|---|---|
| caseStatus | open → Open · pending → Pending review · evidence_needed → Evidence needed · awaiting_customer_evidence → Waiting on customer · awaiting_carrier_response → Waiting on carrier · ready_for_decision → Ready for decision · manual_review → Manual review · escalated → Escalated · recovery_opened → Recovery opened · resolved_refunded → Refunded · resolved_exchanged → Exchanged · resolved_denied → Denied |
| requestedAction | replacement → Replacement · store_credit → Store credit · discount → Discount · refund → Refund · investigation → Investigation |
| recoverability | recoverable → Recoverable · possibly_recoverable → Possibly recoverable · needs_more_evidence → Needs more evidence · not_recoverable → Not recoverable · unknown → Not yet assessed |
| recoveryStatus | draft → Draft · evidence_needed → Evidence needed · ready_to_submit → Ready to submit · submitted → Submitted · waiting_response → Waiting on response · chase_due → Chase due · paid → Paid |
| ownerType / counterparty | carrier → Carrier · warehouse → Warehouse · payment_dispute_provider → Payment provider · payment_processor → Payment provider · supplier → Supplier · three_pl → 3PL · 3pl → 3PL |
| lossStatus | detected → Detected · collecting_evidence → Collecting evidence · submitted → Submitted · approved → Approved |
| lossCategory | delivery_loss → Delivery loss · chargeback_or_payment_dispute → Chargeback / payment dispute · fulfilment_or_warehouse_error → Fulfilment error · supplier_or_vendor_issue → Supplier issue |
| attribution / recoveryRoute | carrier_claim → Carrier claim · chargeback_evidence → Chargeback evidence · chargeback_evidence_pack → Chargeback evidence pack · warehouse_error → Warehouse error · three_pl_claim → 3PL claim · 3pl_claim → 3PL claim · supplier_defect → Supplier defect · internal_fulfilment_issue → Internal fulfilment issue · supplier_vendor_claim → Supplier claim |
| workPriority | urgent → Urgent · high → High · medium → Medium · low → Low |

The `three_pl`/`3pl` → **3PL** mapping kills the "Three Pl" casing bug (B-class) at the root.
**Acceptance:** greps in §3.2 return zero; drawer, work queue, losses, reports/records, rule detail all show mapped labels.

### WS0.3 `displayRef` — object identity (with WS2)
**New file:** `lib/ui/displayRef.ts`.
```ts
export function shortRef(ref?: string|null, id?: string): string      // prefers ELARA-xxxxx style source ref; else "Case " + last 5 of id, never a slug/UUID
export function caseDisplay(c: {customer_name?: string|null; ref?: string|null; id: string}): string // "Leah Patel · ELARA-07402"
```
Rules: seed slugs (`seed-demo-v2-*`, `smoke-*`) and UUIDs are **storage keys, not names** — if no human ref exists, derive `Case #A1B2C` (last 5, uppercased) and mark the missing source ref as a data task, don't print the slug.

### WS0.4 Call-site sweep
Replace every direct `Intl.NumberFormat` / `.toLocaleString(` / ad-hoc date template in `app/` and `components/` (36 files) with WS0.1/0.2/0.3 helpers. Add ESLint `no-restricted-syntax` rules (pattern: `NewExpression[callee.object.name="Intl"]` in `app/**`, `components/**`; and `CallExpression[callee.property.name="toLocaleString"]`) so regressions fail the gate.
**Acceptance:** eslint passes with the new rules enabled; §3.3 date/money assertions pass on every screen.

### WS0.5 Copy sweep
Apply §7 dictionary. File pointers for the worst strings: `app/(app)/work/page.tsx` ("Server-filtered view", footer sentence, "Case Projection" source values), `app/(app)/losses/page.tsx` ("Canonical loss_cases", truncated captions), `components/relationships/ConnectedObjectDetail.tsx` ("Provenance and freshness", "source registry", "typed evidence items", intro paragraph), `app/(app)/integrations/page.tsx` (subtitle), `app/(app)/notifications/page.tsx` (empty state), flows/rules empty states, `components/claims/ClaimReviewContextColumn.tsx` ("No claim selected" copy), dashboards' "Open matching records →". Also fix `DECISION_LABELS`/`OUTCOME_LABELS` in `components/claims/claimReviewLabels.ts`: every decision currently collapses to "Merchant response recorded" — restore informative labels (approved → "Approved", denied → "Denied under policy", escalated → "Escalated", partial_refund → "Partial refund", full_refund → "Full refund", chargeback_disputed → "Chargeback disputed", no_action → "No action"; outcomes: recovered → "Recovered", loss → "Written off", pending → "Pending", chargeback_won/lost → "Chargeback won/lost") — keep neutral, non-accusatory forms for `blacklist → "Watch internally"`, `internal_watch → "Watch internally"`, `suspected_fraud → "Flagged for review"`, `legitimate → "Cleared"`.
**Acceptance:** §3.2 grep zero; TERMINOLOGY.md appended with §7.

---

## WS1 — Status system

### WS1.1 `StatusBadge`
**New file:** `components/ui/StatusBadge.tsx`, built on existing `Badge` tones. Exactly five tones:

| tone | meaning | use for |
|---|---|---|
| `neutral` | dormant/queued | draft, open, pending, detected, not yet assessed |
| `info` | in progress on our side | collecting_evidence, ready_to_submit, ready_for_decision, manual_review, submitted, investigation |
| `warning` | waiting on someone / time pressure | awaiting_customer_evidence, awaiting_carrier_response, waiting_response, evidence_needed, needs_more_evidence, chase_due, possibly_recoverable |
| `success` | positive terminal | paid, approved, recovered, recoverable, resolved_refunded/exchanged (resolution ≠ praise: use success for *completed*, see denials below) |
| `danger` | negative/overdue/blocked | escalated, overdue (computed), not_recoverable, resolved_denied, blocked |

API: `<StatusBadge family="caseStatus" value={row.status} />` — resolves label via WS0.2 and tone via one exported `STATUS_TONES` map (same file). Dot + label, `sm`/`md`, sentence case, never full sentences.
**Priority chip:** `urgent`/`high` render `danger`/`warning` tone with the label; `medium`/`low` render neutral text (no chip) — a column where everything is a red chip carries no signal.

### WS1.2 Adoption sweep
Replace: plain-text statuses on `/work`, `/losses`, `/reports/records`, partners rows ("Active / 30 day deadline / medium confidence" stack → `StatusBadge` + text meta); the queue's ad-hoc pill zoo (12+ labels/3 colours) with family-mapped badges; kill "Unknown" badges (render "Not yet assessed" neutral or omit); recommendation sentences move out of pills into a labelled text row ("Recommended: approve replacement…") with the rule name.
**Acceptance:** on §3.3 walk, all statuses are StatusBadge; yellow never appears on both a positive and a negative meaning; no lowercase pills; no sentence pills.

---

## WS2 — Object identity everywhere

1. **Breadcrumbs** (`components/layout/AppHeader.tsx` / breadcrumb override context): case pages show `Payout Control › Leah Patel · ELARA-07402`; losses `Losses › Delivery loss · #B6FE4`; customers `Customers › Maya Chen`. Implement by having each detail page set its breadcrumb via the existing `BreadcrumbOverrideProvider` with `caseDisplay()` output. UUIDs in breadcrumbs = defect.
2. **Titles/H1s:** case page hero = claim-type label + customer + ref (WS5.1); loss detail H1 = `Delivery loss` + ref chip (not `· b6fe415d`); recovery detail H1 = `Carrier claim — Leah Patel · ELARA-07400` (not generic "Carrier claim" on every page).
3. **Tables:** `/reports/records` Record column → `caseDisplay()`; Type column → claim-type label (full sentence subject moves to a tooltip/secondary line).
4. **Drawer/profile:** remove `Customer ID <uuid>` and `Source identities: manual · seed-demo-v2-…` rows entirely; source sync detail belongs on the object record page, one line: `From Shopify · updated 2h ago`.
5. **Document titles:** `<title>` follows the same rule (`Leah Patel · ELARA-07402 — Unauth`).
**Acceptance:** runtime walk shows zero UUID/slug fragments anywhere, including tab titles.

---

## WS3 — The 12 functional bugs (fix before layout work)

| # | Symptom (verbatim from audit) | Where to look | Fix + acceptance |
|---|---|---|---|
| B1 | Profile/order pages in $ for a £ store; "$215" beside "$214.50" | `lib/utils/format.ts` defaults; profile summary rounds via different helper | WS0.1; single source for the figure; walk shows £ everywhere, no rounding mismatch |
| B2 | Drawer "2 orders" vs list "5"; profile "No linked support cases" vs rail "Open disputes 2" | `CustomerPreviewDrawer.tsx` counts orders-with-cases; profile helpdesk section queries a different link table | Align both to the list's definitions (orders = source_orders count; open cases = support_payout_cases open set). Same numbers in list, drawer, profile |
| B3 | Deep-link into case shows "No claim selected" until user pokes an accordion | claim selection init in `claimReviewReducer.ts`/`claimReviewState.ts` — auto-select first/URL-designated claim on mount | Arriving from queue always lands hydrated |
| B4 | Rule save: drawer closes, no toast, list stale; rule saved `is_active:false` silently | `components/rules/RulesIndexClient.tsx` + `RuleBuilderDrawer.tsx` — refresh list on save (router.refresh or local insert), success toast "Rule saved as draft", and show Draft badge state | Save → drawer closes → row appears with Draft badge + toast |
| B5 | "A rationale is required" error visible pre-input | `ClaimReviewManageCard.tsx` — validation only after blur/submit attempt | Pristine form shows no red |
| B6 | Recommendation panel loads in "may be outdated — Refresh" warning state | `ClaimDecisionRecommendationCard.tsx` — auto-refresh on mount/case-change; warning only for true staleness after user edits | First load shows recommendation or its empty state, never the warning |
| B7 | Settings profile form fields empty (email, store name) | `app/(app)/settings/account/page.tsx` prefill promise | Fields prefilled for demo user |
| B8 | `/integrations` says "Not connected" while gate/Settings consider Shopify+Gorgias connected | integrations page reads provider-contract registry, not `getConnectionState` | Page consumes `lib/connections/getConnectionState.ts` (or renders both truthfully: "Connected — no sync run yet"). One truth |
| B9 | "awaiting_c" truncated raw enum in profile stat card | dispute-context stat card | WS0.2 label + `min-width:0` + no mid-word clip; stat values never truncate |
| B10 | Gorgias settings infinite skeleton on bad credentials; preview shows retired Store-Check/credits concept | `app/(app)/settings/integrations/gorgias/page.tsx` | Failed decrypt → error card with "Reconnect Gorgias" action; replace preview mock with current 4-line decision card (CLAUDE.md format) |
| B11 | `support@unauth.co` vs `@unauth.app` | settings account page string | Single canonical support address |
| B12 | Object pages back-link hardcoded "← Customers" | `ConnectedObjectDetail.tsx` | Use return-to param/referrer breadcrumb; fallback to the object's own list |

---

## WS4 — Layout & density system

### WS4.1 Compact `PageHeader` (upgrade `components/ui/PageHeader.tsx`)
Variants: `list` (breadcrumb-row + inline 20px title + actions right + optional `statStrip`) and `detail` (adds identity line: title, badges, meta). Delete per-page hand-rolled headers as pages adopt it. Stat strip = one row, each stat `label · value (tabular-nums) · optional delta`; captions are plain English (kill "Server-filtered view", "Synced outcome", "Bounded by the recovery estim…"). Max header cost before content: 120px on list pages, 160px on detail pages.
**Settings:** remove the duplicated in-content breadcrumb + kicker; one trail in the top bar only (fixes quadruple header). Settings sub-nav skeleton must render inside the app chrome (fixes chrome-less flash).

### WS4.2 `DataTable` behaviour contract (upgrade `components/ui/DataTable.tsx`)
- `onRowClick` → whole row navigates (kill dead-zones); `rowActions(row)` → hover/focus-revealed `⋯` menu, keyboard accessible; `selection` → checkbox column + floating selection bar (Assign / Snooze / Complete for `/work`).
- Amount columns: right-aligned, `tabular-nums`, `formatMoneyOrDash`.
- One visible inline action max (default none). Migrate `/work` (removes the 4-button stacks), `/customers` ("View →" becomes the row itself; drawer opens on row click — keep an explicit "Open profile" in the row menu), `/losses`, `/reports/records`, dashboard tables ("Inspect →" ×9 → clickable rows).
- Kill "Rows per page 25/50/100" segmented control wherever row count < 25; use a quiet "Show more" if needed.

### WS4.3 State contract components
- `LoadingState`: skeleton variants per surface (table, detail, kanban) mirroring final geometry — no full-page grey blocks, never hide the sidebar.
- `EmptyState`: icon-optional, ≤ 1 sentence, exactly one primary action. Rules empty state must surface `default_rule_templates` as 3 one-click template cards + "Start from scratch" (templates exist in DB today, unused).
- Error state: sentence + retry/repair action (B10 pattern).

### WS4.4 Global toast
`components/ui/Toast.tsx` + provider in `app/(app)/layout.tsx` (or adopt `sonner` — it is NOT currently installed; adding it is acceptable, one library only). Success/info/danger; every mutation in the app answers (rules save, decision recorded, evidence added, note saved, assignment).

### WS4.5 Type scale + mono discipline
Tokens in `globals.css`: `--text-display: 24px/600` (detail heroes), `--text-title: 20px/600` (page titles), `--text-body: 14px`, `--text-caption: 12px`, uppercase micro-labels only for table headers and stat labels (11px/0.08em). Replace 40px marketing H1s on `/dashboard, /work, /losses, /customers, /reports, /rules, /flows, /partners, /notifications`. DM Mono: refs, IDs, hashes only — emails, dates, workspace name, stat numerals move to Inter (`tabular-nums` where columnar). Fix `Unauth .` logo lockup spacing in `components/ui/UnauthLogo.tsx` (period sits flush: `Unauth.`).

---

## WS5 — Page rebuilds (in this order)

### WS5.1 Case page `/claims/[id]` — the money page
Compose from the existing claim kit; target structure:
- **Hero (PageHeader detail):** `Wrong item` + `StatusBadge(caseStatus)` + ageing chip if >14d open · line 2: `Leah Patel · ELARA-07402 · £64.75 · Requested: Replacement · Opened 14 Jun`. Buttons: `Open customer profile` (secondary), overflow menu (`Back to queue` is the breadcrumb, not a button).
- **Left column (order):** 1) Evidence checklist card — present ✓ / missing ○ with per-item "Request"/"Attach" affordances (this is the product's soul; promote it); 2) Recommendation card — auto-fresh (B6), shows fired rule name + plain-English recommendation + "Why" expander; 3) Timeline (`formatDateTime`); 4) Comments; 5) collapsed "Edit claim details" (the current inline edit form moves behind an explicit Edit action).
- **Right rail:** single **Record decision** flow: outcome select → rationale (validated on submit, B5) → primary brand button; below it Ownership (Assign to me/Unassign) and quiet links: `View source data`, `Manage evidence`. **Demote "View missing data"** from brand-filled to quiet link.
- Kill: the six equal grey mini-cards ("Claim evidence context") — their facts fold into hero/evidence card; "Store-owned claim history" jargon card; duplicate status pill rows (status renders once, in the hero); the claim-selector dropdown moves into the hero as a segmented control only when a case truly has >1 claim.
- "Previous claims: 16" style signals: render as a **warning callout** ("16 previous payout cases for this customer → view history"), not a table cell.

### WS5.2 Customer drawer (`CustomerPreviewDrawer.tsx`)
Top → bottom: identity header (initials avatar, name, email, `First seen 25 May 2026`); **signal strip** of 4 stats (Orders · Payout cases · Refund rate · Chargebacks — same definitions as the list, B2); **Open cases** (StatusBadge rows → case links with amounts); **Recent orders** (ref · date · amount · status, 5 max); footer actions: `Open full profile` (primary), `Open case` if exactly one open. Delete: UUID line, "Fresh as of…", source-identities section, "Needs attention" bare red link (becomes a warning callout only when a rule fired). Everything through WS0 formatters.

### WS5.3 Customer profile `/customers/[id]`
One story, once: PageHeader detail (name, email, first-seen, actions) + **one** stat row + the narrative line (already exists — promote under the header: "5 orders since May 2026; 2 became payout cases (40%) — both refunded.") + tabs or sections: **Orders** (real table — currently missing entirely), **Payout cases** (status rows), **Timeline**, **Notes** (single header, enabled Save with toast). Delete: Evidence-scope duplicate cards, Record rail duplicate, dispute-context raw enums (B9), "Last seen 26d ago" floating band, double breadcrumb, instructional filler paragraph, "Activity: Claim Viewed" self-audit rows. `/customers/[id]/claims` route: redirect to profile #cases section (kills the dead-end empty shell).

### WS5.4 Dashboard `/dashboard` (+ merge `/reports`)
- **Row 1 — value strip:** Payout exposure · Recovered · Prevented · Realised loss, each with delta vs prior period; zero-cells collapse ("Nothing outstanding") instead of six £0.00 cells.
- **Row 2 — charts (recharts):** exposure & recovered over time (30d area, ~240px, faint grid, endpoint emphasis); loss causes horizontal bar using `lossCategory` labels (never ticket-subject sentences); recovery funnel (Detected → Pursued → Recovered with £).
- **Row 3 — Needs attention:** one card listing status rows with counts + amounts (replaces 4–6 identical link-cards; "Open matching records →" dies).
- **Source coverage moves to `/integrations`** as a "Data health" section.
- `/reports` becomes the analytical surface: same header, longer ranges, breakdown tables, CSV export; if that's more than the sprint allows, `/reports` → redirect to `/dashboard` and keep `Export`. `/reports/records` adopts WS2/WS4 table rules.
- Time-range picker: one segmented control (7d/30d/90d/All), styled like every other segmented control (kill the odd outline/black variants).

### WS5.5 Work queue `/work`
PageHeader list + counted filter pills (keep) + DataTable (WS4.2): Priority chip · Task (title + object `caseDisplay` secondary line — dedupe templated descriptions) · Status badge · Owner label · Due (relative, red when overdue) · row menu (Assign/Start/Snooze/Complete) + selection bar. Delete Source/Blocker columns from default view (blocker folds into status tooltip; source is noise — B-class "Case Projection" strings die in WS0.5).

### WS5.6 Remaining sweep (apply systems; ~½ day each)
- **/recoveries:** keep kanban; slim cards to ref+type / £ / deadline / one status badge; actions → card menu; stat captions humanised.
- **/losses:** status → StatusBadge; category label via `lossCategory`; captions fixed (no truncation); detail page: H1 per WS2, one financial row, empty-state copy per WS4.3.
- **/rules detail:** "Readable policy" renders the builder's sentence form ("If claim type is Item not received → Recommend manual review"), never `eq item_not_received`; Draft/Active badge; date via `formatDateTime`.
- **/partners:** confidence → StatusBadge tone (info/warning), deadline text `30-day deadline`; evidence chips Title-case.
- **/integrations + imports:** subtitle per §7; connection truth per B8; stepper shows active step state; slashed-zero mono stats → Inter.
- **/notifications:** drop the two-stat header; empty state per §7.
- **/flows:** copy per §7; builder field labels ("Description (shown to your team)"), the bare `24` input gets a unit label ("hours").
- **/login + /onboarding:** login button geometry matches app buttons (no pill), logo lockup aligned with card, links consolidated; onboarding gains a slim progress bar and inline validation. Keep it minimal — no marketing hero.
- **Object record pages** (`ConnectedObjectDetail.tsx`): kicker "Order record"; facts row via formatters; "Data source" one-liner replaces "Provenance and freshness" card; back-link per B12.

---

## WS6 — Polish to 9.5

1. **Motion:** shared 140ms ease-out for drawer/menu/toast; table-row hover background via CSS transition; count-up ONLY on dashboard stat deltas; all inside `prefers-reduced-motion` guard. No page-level entrance animations.
2. **Command layer:** `⌘K` palette (new `components/ui/CommandPalette.tsx`) — actions: go to page, open case/customer by name/ref (server search endpoint already backs the top-bar search — reuse it); `/work` and `/claims` lists get `j/k` + `Enter` + `a` (assign) `s` (snooze). Register globally in `app/(app)/layout.tsx`.
3. **Focus & a11y parity:** visible focus ring token (`--ring`) on all interactive elements incl. table rows; keep the 59-gate a11y suite green.
4. **Dark theme tokens:** add `[data-theme="dark"]` overrides for the `globals.css` token block (surfaces #141210-ish warm dark, ink inverted, accent lightened for contrast); Settings toggle already exists. Light stays default. Verify §3.3 walk in both themes.
5. **Sidebar chrome:** badge count stable across pages (fetch in layout, not per-page); "elara and co" workspace label Title-cased from merchant name ("Elara & Co"); footer links grouped into a Help menu.
6. **Visual QA gate (release checklist, add to `docs/ROLLOUT_RUNBOOK.md`):** §3.3 walk + §3.2 greps + both themes + 390px width on the 6 core pages; screenshot-diff the walk (extend the existing 13-scenario visual suite to assert the new formats — e.g., a test that fails if `/\$\d/` appears on a GBP workspace or `/[a-z]+_[a-z]+/` appears in a rendered status cell).

---

## 7. Copy dictionary (binding; append to `docs/product/TERMINOLOGY.md`)

| Never render | Render instead |
|---|---|
| Canonical loss_cases | Loss records |
| awaiting_carrier_response (any snake_case) | mapped label (WS0.2) |
| Case Projection / Recovery Projection / Automation (as source) | Payout case / Recovery / Automation rule |
| Server-filtered view · "Results are server filtered and paginated." | (delete) · "Showing 22 items" |
| Executive value bridge and operational attention from canonical merchant records. | What you're owed, what you've recovered, and what needs a decision. |
| One provider contract for capability, account, freshness, provenance and runtime health. Unsupported writes stay visibly unsupported. | Connect your store, helpdesk, and carriers. We'll tell you when data stops flowing. |
| Operational events are recipient-scoped and deduplicated. Configure in-app preferences for each event type. | Nothing needs your attention yet. We'll notify you when a case does. |
| Test runs perform zero writes; publication enables only future matching events. | Test safely — nothing changes until you publish. |
| Each family has at most one published version and one editable draft. | One live version per flow; edits start as drafts. |
| Create a draft, simulate it against a synthetic case, inspect conflicts, then publish explicitly. | Write a rule, try it on a sample case, then publish when it looks right. |
| Provenance and freshness / Canonical row present / source registry | Data source — "From Shopify · updated 2h ago" |
| No typed evidence items are connected through this object's payout cases. | No evidence linked yet. |
| Missing evidence is collected from connected sources or kept unavailable with a reason. | We'll pull missing evidence from your connected tools automatically. |
| claim type eq item_not_received | If the claim type is "Item not received" |
| Open matching records → (repeated) | View 3 cases → (object named + counted, once) |
| Age 29 days open | Open 29 days |
| Store-scoped identity variants | Order history matches for this store |
| Manual source ingestion | Import from CSV |
| every persisted record carries CSV provenance | Each imported row keeps a link to its CSV line |

Voice rules: sentence case everywhere (no Title Case Sentences, no trailing periods in labels/pills); verbs on buttons ("Record decision", not "Review decision"); numbers get referents ("2 of 5 orders (40%)", never bare "5 (100.0%)").

---

## Appendix A — Full audit punch list (13 Jul 2026), mapped to workstreams

Work through this after WS0–WS6; every unchecked line is a release blocker for the 9.5 sign-off. Format: page — finding → workstream.

**Global chrome:** logo "Unauth ." detached period → WS4.5 · "CONTEXT CREDITS 100 of 100" unexplained in top bar → move behind the workspace menu with tooltip copy ("Context credits pay for network checks") → WS4.5 · demo banner restyle (slim, dismissible) → WS4.5 · sidebar badge pop-in → WS6.5 · workspace label lowercase → WS6.5.
**/dashboard:** jargon subtitle → WS0.5 · 6×£0.00 wall → WS5.4 · no charts → WS5.4 · "Inspect →" per row ×9 → WS4.2 · loss-cause rows are Title-Cased ticket sentences w/ trailing periods, Records=1 each → WS5.4 (categorise via `lossCategory`) · Source coverage debug on exec view → WS5.4 · US datetime w/ seconds → WS0.1.
**/work:** header eats 40% → WS4.1 · 10 filter pills w/o counts → add counts (pattern exists on /claims) → WS5.5 · 88 buttons → WS4.2 · "Urgent" ×16 plain text → WS1 · "Case aa0d6b43"/"Recovery" mixed refs → WS2 · templated descriptions repeated → WS5.5 · "Three Pl" → WS0.2 · Source/Blocker noise → WS5.5.
**/claims:** pill vocabulary ≥12 labels/3 colours, opposite meanings share yellow → WS1 · sentence pills w/ periods + lowercase "open" → WS1 · status+amount repeated 3× per screen → WS5.1 · mono exposure stat → WS4.5 · rows-per-page for 13 rows → WS4.2 · black segmented control foreign to system → WS5.4 pattern.
**/claims/[id]:** every finding in WS3-B3/B5/B6 + WS5.1 list (seed slug identity, "No claim selected", loudest-button diagnostic, 6 grey cards, `ready_for_decision · 7/4/2026` in order picker, editable order value, "Check route" icon overlap, inline stepper-as-links).
**Customer drawer:** UUID, "Fresh as of", raw enums, seed slugs, 2-vs-5 orders, no actions, flat sections → WS5.2 + B2.
**/customers:** filter pills green (status colour) → WS1 tone separation · row-click vs View split → WS4.2 · mono emails → WS4.5 · "• 1 open 2" unlabeled pair → WS5.2 stat definitions · "Open cases" ambiguous header CTA → rename "View open cases" or drop → WS0.5.
**/customers/[id]:** $ bug B1 · triple stat duplication → WS5.3 · "awaiting_c" B9 · double breadcrumb → WS4.1 · filler how-to paragraph → WS0.5 · bare percentages → §7 voice · no orders table → WS5.3 · notes double header/disabled save → WS5.3 + WS4.4 · "Claim Viewed" activity noise → WS5.3.
**/customers/[id]/claims dead end → WS5.3 redirect. /customers/[id]/evidence/new:** 10s spinner no skeleton → WS4.3 · `★` delimiter + missing currency symbol + US date in order option → WS0 sweep.
**/losses:** "Canonical loss_cases" → WS0.5 · truncated captions → WS4.1 · statuses plain → WS1 · third link pattern (underline) → WS4.2 · green dot unlabeled → WS1 · detail: hex in H1 → WS2 · 60% empty states → WS4.3 · defensive copy → §7.
**/recoveries:** stat captions pipeline-speak → WS0.5 · sync narration line → WS0.5 · 3 buttons/card → WS5.6 · detail: generic H1 → WS2 · ISO dates → WS0.1 · truncated caption → WS4.1.
**/rules:** empty state jargon + no templates → WS4.3 · save silent + stale list + inactive default B4 · `eq item_not_received` in "Readable policy" → WS5.6 · hex breadcrumb → WS2 · date format #5 → WS0.1.
**/reports:** 85% dashboard duplicate → WS5.4 · native ▶ accordions → restyle or fold into definitions tooltip → WS5.4 · /reports/records UUID column + sentence types + lowercase states + "64.75 GBP" + repeated wrapped timestamp → WS2 + WS0 + WS4.2.
**/partners:** right-aligned text stack → WS1/WS5.6 · "EVIDENCE ROUTES … Unique required evidence items" caption → WS0.5 · lowercase chips → WS5.6.
**/flows:** copy per §7 · "Operator-facing description" label → WS5.6 · bare "24" input → WS5.6 · /flows/runs bare "No flow runs found for this scope." → WS4.3 empty state.
**/integrations:** subtitle → §7 · B8 truth split · slashed-zero mono → WS4.5 · "Warehouse 3pl" → WS0.2 · imports wizard stepless stepper + provenance copy → WS5.6.
**/notifications:** stat header on empty inbox → WS5.6 · copy → §7.
**Object pages:** kicker/copy/back-link/dollars → WS5.6 + B1 + B12 · "Unknown" status pill → WS1.
**/settings:** quadruple trail → WS4.1 · B7 prefill · chrome-less skeleton → WS4.3 · Gorgias B10 · unauth.co B11 · "Financial & workflow defaults" label → "Defaults".
**/help:** "Unauth Gate API endpoint and bearer key" in merchant card copy → §7 · hardcoded "← Dashboard" → B12 pattern.
**/login:** pill button, floating logo, stacked links → WS5.6. **/onboarding:** progress bar + validation → WS5.6.

— End. Sign-off requires: §3.1 gate green · §3.2 greps zero · §3.3 walk clean in light+dark at 1440 and 390 · every Appendix A line checked · rubric §3.4 ≥9 on all twelve axes.
