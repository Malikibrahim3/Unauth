# IMPL — Authenticated product: AI-slop eradication and craft pass

> **Status: INCOMPLETE, NON-AUTHORITATIVE DRAFT.** This file ends at C9 and contains dangling references to sections that were never written. It is Claude's untracked supplemental audit, not the complete 363-line implementation plan described in the later GPT response. Do not execute, add or commit it as-is. Use the reopened `docs/IMPL_ui_craft_overhaul.md` and `docs/HANDOFF_ui_craft_overhaul.md` as the execution authority, and transfer only findings reproduced in current code and the authenticated browser.

**Scope if completed:** authenticated app only, with shared-component changes isolated so they cannot alter public/landing surfaces · **Out of scope:** public landing pages, marketing site, scoring logic and unrelated business architecture

This document was produced from (a) a full review of the 2026-07-14 screenshot set in `screenshots-app-2026-07-14/`, and (b) a read-only code trace of the repo on branch `ui-craft-overhaul`. Every defect below is either traced to an exact file/line or to a named file with instructions for locating it. Execute it as written; where judgement is required the intent is stated so you can act like a senior product engineer, not a template generator.

---

## 0. Context you must internalise before editing

### 0.1 What this app is
Unauth is a **post-purchase loss accountability platform** for ecommerce merchants: support payout cases, evidence checklists, merchant rules, attribution/recoverability, recovery cases, dashboards. Read `docs/product/MVP_STEERING.md`, `docs/product/PRODUCT_PRINCIPLES.md`, and `docs/product/TERMINOLOGY.md` before writing any copy. The root `CLAUDE.md` ground rules are binding (no `as any`, no `eslint-disable`, do not touch scoring formulas/weights, SSOT tables for constants).

### 0.2 What happened
The committed branch snapshot is `eabc8110` (`wip: snapshot before AI-slop fix pass`). It already contains the prior redesign work, the older complete UI-craft plan and the 14 Jul screenshots. Claude's subsequent pass left only this untracked draft and no application edits. The structure is broadly right, but the rendered product shows recognisable "AI slop": self-referential design-rationale copy, snake_case leakage, repeated KPI-card templates, badge/pill overload, cobalt saturation, chatty subtitles, terminology drift, monospace money, decorative count-up animations, inconsistent skeletons and several states that look broken. Each causal diagnosis below still requires controlled reproduction before editing.

1. **Go Ramp-neutral.** Near-black primary actions, quiet neutral selection tints, the cobalt `#3157d5` family removed from non-semantic roles. Colour is reserved for semantic status (success/warning/critical/info) and used sparingly.
2. **Rewrite all merchant-facing copy** that exhibits the slop patterns (not just the literal defects). Page subtitles, jargon, self-referential text — all of it.

### 0.3 Safety constraints (from the product owner, binding)
- **Do not break anything.** Work in small increments; run verification after every phase (see §8). The app has real business logic — presentational changes only unless a defect is itself behavioural.
- The working tree already contains uncommitted work. **Do not revert, stash, or reformat unrelated files.** Keep diffs surgical.
- A full pre-edit backup exists at `backup-pre-slop-fix-20260714-0056.tar.gz` in the repo root and is already ignored. Do not delete or commit it.
- If `.git/index.lock` exists, confirm no Git process is active before removing a genuinely stale lock. Do not assume removal is safe merely because a previous sandbox used Git.
- Commit in small, phase-scoped commits on `ui-craft-overhaul`. Do not push to `main`.
- Do not weaken or delete failing assertions to make tests pass; update tests only where they assert copy/classnames this document explicitly changes (see §8.3).

### 0.4 Key facts about the codebase
- Next.js App Router. Authenticated shell: `app/(app)/layout.tsx` → `components/nav/Sidebar.tsx` → `SidebarInner.tsx` → `SidebarAside.tsx`, plus `components/layout/AppHeader.tsx`. Main scroll container: `<main id="app-scroll-container">` (layout.tsx ~line 262).
- All authenticated theming lives in `app/(app)/authenticated.css` scoped under `.ua-app` / `.ua-auth-surface`. Public landing tokens live in `app/globals.css` and **must not change**.
- Shared primitives: `components/ui/*` (`MetricCard.tsx`, `Card.tsx`, `SectionCard.tsx`, `ModuleCard.tsx`, `StatusBadge.tsx`, `EmptyState.tsx`, `tokens.ts`, `pageShellStyles.ts`), workbench chrome: `components/workbench/WorkbenchPage.tsx`, `WorkbenchKpiStrip.tsx`.
- Route names currently exist in more than one place: `lib/navigation/appRoutes.ts` exposes `getPageTitleForPath()`, while `components/layout/AppHeader.tsx` also contains route-title logic. Consolidation is a task; do not assume AppHeader already consumes the route registry.
- Canonical formatters: `lib/utils/format.ts` (`formatMoney`, `formatMoneyOrDash`, `formatNumber`, `formatCurrency*`). Money is intentionally null-safe ("— " for unknown). Keep that behaviour.
- Design-lint script exists: `npm run lint:authenticated-design` (`scripts/check-authenticated-design.mjs`). Extend it, don't bypass it.
- Verification scripts: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:redesign`, `npm run test:critical`, `npm run test:compliance`, `npm run evidence:redesign`, plus `design-audit:*` capture scripts.

### 0.5 Screenshot evidence referenced below
`screenshots-app-2026-07-14/` is outcome evidence, but its README does not establish the claimed CSS viewport/DPR mapping. Reproduce issues with a controlled capture at explicit CSS viewports before attributing them to a breakpoint. The README lists routes that failed to capture; do not treat those failures as app bugs without re-testing (`/customers/[id]`, `/settings/team`, `/settings/audit-trail`, `/settings/api-integrations`, `/settings/integrations/gorgias`, `/reports/records`, `/help/integrations/yuma`).

---

## 1. Defect register — traced, with fix specs

Severity: **P0** = looks broken / embarrassing in front of a merchant. **P1** = clearly AI-generated tell. **P2** = craft polish.

### A. Shell and structure

**A1 (P0) — Sidebar Suspense fallback width mismatch creates a "dead gutter" ghost shell.**
`components/nav/Sidebar.tsx:9-11` and `components/nav/SidebarInner.tsx:165` render fallback `<div className="hidden md:block w-16 shrink-0" />` while the real aside is `w-60` (240px, `SidebarAside.tsx:50`). While the client sidebar is suspended (it depends on `useSearchParams`/`useFetchJson`, `SidebarInner.tsx:44,56`), pages paint with a 64px empty rail — this is the "no-sidebar legacy shell" look in `app_notifications.png`, `app_settings_account.png`, `app_settings_notifications.png`, `app_apply.png`, `app_global.png`, `app_catches.png`.
**Fix:** make the fallback a responsive skeleton that mirrors the effective real sidebar: `md:w-14 lg:w-60` by default, with the same logo/workspace/nav/account geometry and background. Never let fallback and real widths differ at the same viewport/preference. Extract a shared `SidebarSkeleton`.

**A2 (P0 hypothesis) — Cold-load shell timing may make content/chrome appear inconsistent.**
`app/(app)/layout.tsx` already parallelises several merchant/jobs/flags/connection/membership/permission calls, and jobs/connection state participate in setup gating. The blank captures do not prove a server waterfall.
**Investigation/fix:** capture server timing and a throttled browser trace first. Preserve auth, onboarding, permissions and RLS semantics. Move only data proven non-blocking (unread count is a candidate) or further parallelise calls whose independence is demonstrated. Acceptance: sidebar and header paint in stable geometry before page data without changing gates or connection truth.

**A3 (P0) — No responsive sidebar behaviour between 768px and ~1100px.**
`SidebarInner.tsx:128` — aside is `hidden md:block`, fixed `w-60`; collapse is manual-only (`STORAGE_KEY='unauth.sidebar.collapsed'`, `SidebarInner.tsx:24,48-72`). At narrow desktop widths the sidebar eats ~37% of the viewport and KPI rows clip (see `app_work.png`, `app_losses.png`, `app_recoveries.png` — truncated KPI labels, horizontally cut cards).
**Fix:** use a tri-state preference (`expanded | collapsed | unset`) so “explicitly expanded” is distinguishable from “no preference”. When unset, auto-collapse to the existing `w-14` icon rail below `lg`; keep manual toggle at all widths. Ensure KPI rows wrap instead of clipping (the missing E4 reference is one reason this draft is non-authoritative).

**A4 (P1) — Payout Control split view: detail rail is not pinned; ~2,000px of dead space.**
`app/(app)/claims/ClaimsQueueClient.tsx:110-113` — container is `flex` with only `minHeight: 560`; list pane `:116` is `lg:max-h-none`; detail pane `:211` is `overflow-y-auto` but never constrained, so both panes grow and the whole page scrolls (`app_claims.png` is 2806px tall with an empty right column for most of it).
**Fix:** on `lg+`, bound the split container to the viewport: `lg:h-[calc(100dvh-<header+kpi offset>)]` (measure the real offset; the header is sticky) and let **each pane scroll internally** (`overflow-y-auto` on both). Keep the current stacked behaviour below `lg`. Test with 25+ cases and with 1 case.

**A5 (P2) — Help pages read as broken: 672px column centred in the content area.**
`app/(app)/help/page.tsx:44` — `p-8 max-w-2xl mx-auto` centres a narrow column in the wide main area, producing a huge dead left gutter next to the sidebar (`app_help.png`, `app_help_integrations_siena.png`).
**Fix:** left-align content pages against the page gutter like every operational page: use the standard page container (same `px` as WorkbenchPage) with `max-w-3xl` and **no** `mx-auto`. Apply the same to `/apply` (`app/(app)/apply/page.tsx:34-35`) and any other `mx-auto max-w-*` authenticated page (`/rules` `rules/page.tsx:86`, `/integrations`, `/flows`) — pick one rule: content-page max-width aligned left with consistent gutters. Fix code blocks on help/siena to wrap (`whitespace-pre-wrap break-all` on the `POST https://…` and `Authorization: Bearer …` blocks).

**A6 (P2) — Route aliases are fine; do not "fix" them.**
`/catches→/claims`, `/chargebacks→/claims`, `/exceptions→/work?view=integration-exceptions`, `/global→/customers`, `/lookup→/customers?q=…`, `/watchlist→/customers`, `/store→/dashboard`, `/settings→/settings/account`, `/help/{how-it-works,confidence-grades,identity-matching}→/help`. These are correct legacy redirects. The blank captures on some of them were the A1/A2 race, not the redirects. Leave them; A1/A2 fixes the symptom.

**A7 (P1) — Two title systems render at once (header vs page).**
`AppHeader` has its own route-title logic even though `lib/navigation/appRoutes.ts` exposes route metadata, and pages also render eyebrow + title + subtitle (`WorkbenchPage.tsx`, `components/ui/pageShellStyles.ts`). Breadcrumbs appear in both app header and page content on settings/imports/flows-runs pages, plus “Back” links as a third navigation affordance. Consolidate route naming onto one source while applying the composition fix below.
**Fix (one composition rule, apply everywhere):**
- App header: breadcrumb trail only (parent › current), small, plus global controls. It is the ONLY breadcrumb.
- Page content: one `PageHeader` with title (~24-28px, not 34), optional one-line description ONLY where it adds information (see §5 copy rules — most pages lose the subtitle), actions right-aligned.
- Delete in-content breadcrumbs and "← Back" links on pages that have the header breadcrumb (`SettingsPageShell.tsx:41-50` renders its own PageHeader breadcrumb — remove the duplicate trail, keep section title; imports page `app/(app)/integrations/imports/page.tsx` "← Integrations" link — remove; flows runs page — remove "← Flows").
- Eyebrows ("Operations", "Configuration", "Support payout control", "Partner rulebook", "Manual source ingestion"): **delete the eyebrow row entirely.** They duplicate the sidebar section labels and drift from them (sidebar says "Reports and setup", eyebrow says "Configuration").

### B. Visual system (tokens) — Ramp-neutral migration

All in `app/(app)/authenticated.css` unless noted. The current file is well-organised; this is a value migration, not a rewrite. **Landing tokens in `app/globals.css` and `components/ui/tokens.ts` `colors.brand/*`, `stepBadges`, `typography.landing*`, `shadows.panel/board/browser` are landing-page assets — do not touch.**

**B1 (P1) — Kill the cobalt accent as a brand/action colour.** Current: `--accent/--primary/--action-primary/--brand-signal: #3157d5`, hover `#2949b8`, soft `#eef2ff`, border `#cbd5ff`, `--bg-selected/--surface-selected: #e7ecff`, `--focus-ring: #456ce5`, selection `#cbd5ff`.
**Replace with:**
```css
/* Actions: near-black, Ramp-style */
--primary: #171816;            /* primary button bg */
--primary-hover: #2b2c29;
--primary-foreground: #ffffff;
--accent: #171816;             /* accent-as-action == ink */
--accent-hover: #2b2c29;
--accent-soft: #ECECE7;        /* neutral tint, not lavender */
--accent-border: #d9d9d2;
--bg-selected: #ECECE7;        /* selected nav/rows: pale neutral */
--surface-selected: #ECECE7;
--focus-ring: #171816;         /* or keep a blue ring ONLY for focus if contrast testing prefers it */
--text-link: #17418f;          /* links stay a quiet functional blue */
--info: #2f5fc4; --info-bg: #eef3fb; --info-bd: #c9d8f0;  /* informational only */
```
Selection (`::selection`) → neutral `#e3e3dd`. Keep the semantic ramp (success/warning/critical/risk-*) exactly as is — it is already restrained and correct. `--privacy-*`, `--watchlist-*`, `--info-*` may keep a blue family since they are semantic-informational, but move them to the new quiet blue above so nothing references `#3157d5`/`#eef2ff`/`#cbd5ff`/`#e7ecff` afterwards. Grep for those hexes plus `#2949b8`, `#456ce5`, `#899ff0`, `#f4f6ff` across authenticated scopes; shared components must be variant/scoped so public `/demo` and landing surfaces do not change.

**B2 (P1) — Warm the neutral canvas.** Current canvas is cool blue-grey (`--bg/--surface-base: #f5f6f8`, alts `#f1f2f4/#eff1f4`, borders `#dde1e6`). The agreed direction (and the original brief) is a warm off-white.
**Replace:** canvas `#F7F7F4`; muted surface `#F3F3EF`; sunken `#F0F0EC`; hover `#EEEEEA`; inset `#F9F9F6`; borders `#E4E4DE` (muted `#EBEBE5`, subtle `#F0F0EA`, strong `#B9B9B0`); text stays near-black but retune: primary `#171816`, secondary `#5D5F5A`, tertiary `#8A8C85`, disabled `#B4B6AF`; icons `#565853`. Update the sidebar gradient (B4) and header rgba to match the new canvas. Check contrast (AA) for secondary/tertiary on the new surfaces.

**B3 (P1) — Delete the metric-card accent bar and hover bars.**
`authenticated.css:291-297` — `.ua-metric-card::before` paints a 3px `--brand-signal` left bar on EVERY KPI card (visible on every page capture). `authenticated.css:303-316` — `.ua-table-row::before` paints a blue bar on row hover/focus.
**Fix:** remove both `::before` rules entirely. Metric blocks separate with hairline borders (`border-right` between blocks inside one container — see E4). Row hover = `--surface-hover` background only (already present). Keep `:focus-visible` outline for keyboard users.

**B4 (P2) — De-decorate the shell.** `authenticated.css:243-246` sidebar has a vertical gradient + inset white shadow; `:248-251` header uses backdrop blur; `.ua-identity-tile` (259-266) has gradient + two shadows; `.ua-empty-visual` (318-324) has a radial cobalt gradient.
**Fix:** sidebar = flat `#F3F3EF` with a right hairline border, no gradient/inset; header = flat `rgba(247,247,244,0.97)` + bottom hairline (keep blur if you like, it's cheap); identity tile = flat `--surface-muted` bg + hairline border, no gradient; empty-visual = flat `--surface-muted` + hairline border, no radial gradient.

**B5 (P1) — MetricCard component (`components/ui/MetricCard.tsx`).** Currently: `boxShadow: var(--shadow-md)` (line ~56), mono font for values (line ~84 `fontFamily: var(--font-mono)`), 30/40px values, count-up animation via `useCountUp` (lines 43-46), gradient icon tile (line 71).
**Fix:**
- Shadow → none; `border: 1px solid var(--border)`; or better, convert KPI rows to a single bordered container with internal dividers (E4).
- Value font → `var(--font-sans)` with `tabular-nums` (keep `tabular-nums`, drop mono). Size 22-24px, weight 600, letter-spacing -0.01em. Financial values are operational, not marketing stats.
- **Remove `useCountUp`** — no number animation on financial data. Render the value directly.
- Icon tiles on metrics → remove (icons add nothing on KPI blocks; Integrations page `app_integrations.png` shows the tile pattern).
- Label: keep 12px but `font-weight: 500`, sentence case ("Open payout cases", not `uppercase tracking-wider`) — uppercase micro-labels stay ONLY for tiny metadata eyebrows inside detail panels, not KPI labels. **Labels must never truncate** — see E4.

**B6 (P2) — Shadows.** Keep `--shadow-*` tokens but audit usage: ordinary cards (`components/ui/Card.tsx`, `SectionCard.tsx`, `ModuleCard.tsx`, `uiTokens.app.card` in `components/ui/tokens.ts:96-97`) must use border + background, `--shadow-xs` at most. Reserve `--shadow-lg/overlay/drawer/modal` for actual overlays (drawer, modal, command menu, popover). The Flows list card (`app_flows.png`) shows a large soft shadow on a plain list card — that class of usage goes.

**B7 (P2) — Radii.** Cards/panels currently `--radius-lg: 8px` with some 16px (`uiTokens.radius.panel` = 16px is landing-only; ensure no authenticated usage). Standardise: controls 6px, cards/tables 8px, pills only for status badges and filter chips. Flows list card in `app_flows.png` looks ~14-16px — bring to 8px.

### C. Copy and language (all merchant-facing strings)

Voice rules for every rewrite: plain, specific, operational. No em-dash asides, no "we'll", no self-description, no internal jargon (`scope`, `ingestion`, `persisted`, `provenance`, `denominator`), no exclamation marks, no arrows in labels. Terminology per `docs/product/TERMINOLOGY.md`. British-neutral spelling consistent with existing docs ("Ageing" is fine as a word but see D1 for the badge itself).

**C1 (P0) — Self-referential design copy rendered in product.**
`app/(app)/claims/ClaimsPageView.tsx:287` — "Counts stay actionable; no decorative chart or mixed denominator." and `:308-309` — card titled "Request types in this page" with body "A compact table preserves exact values and works with assistive technology." (read the block `:282-330` for the second card's exact body).
**Fix:** delete both explanatory sentences outright. The "Queue health" card keeps its title + the dl rows (they're good). The second card: retitle "Request types" and show the ranked type/count rows with no meta-commentary. Sweep the whole repo for more self-referential UI copy: grep rendered strings for "decorative", "assistive", "denominator", "tabular", "density", "this page", "this view", "compact" used in body copy. (`app_claims.png` bottom shows both cards.)

**C2 (P0) — snake_case leaking into merchant sentences.**
Payout case detail "Recovery chase-up" card renders: "Gather tracking, proof_of_delivery, carrier_identified, customer_statement, delivery_scan_timeline to assess recovery." followed immediately by the humanised duplicate "Evidence needed: tracking, proof of delivery, carrier identified, customer statement, delivery scan timeline" (`app_claims.png` tile 2). Sources to check: `components/claims/claimReviewLabels.ts` (has the snake_case tokens), `lib/claims/decision/format.ts`, `lib/claims/decision/ensureEvidence.ts`, `lib/payouts/recommendation.ts` — the sentence is assembled from raw evidence keys somewhere in that chain; the humanised list proves a label map already exists.
**Fix:** route every evidence key through the existing humanisation (`claimReviewLabels.ts` label map or `humanizeEnumValue`), then **delete one of the two duplicate lines** — keep a single "Evidence needed: tracking, proof of delivery, carrier identified…" line. Add a unit test that fails if a rendered recommendation string matches `/[a-z]+_[a-z]+/`.

**C3 (P1) — Duplicate recommendation chips.**
Detail panel chip row renders "Request customer evidence" twice plus "No recovery needed" (`app_claims.png` tile 1). Source: chips come from `app/(app)/claims/claimsPageLogic.ts` / `lib/payouts/recommendation.ts` (both contain the string).
**Fix:** dedupe the actions array at build site (`Array.from(new Set(...))` on label or action id) and cap at 3 distinct chips. Investigate WHY two identical actions exist (two rules emitting the same action?) — if so, dedupe at merge, not render.

**C4 (P1) — Page subtitles: delete or shrink.** Traced examples:
- `ClaimsPageView.tsx:113` "Review support payout cases, check evidence, and record decisions — one queue." → **delete** (title + queue is self-evident).
- `app/(app)/recoveries/page.tsx:109-…` title "Recovery board" + subtitle "The losses you can still do something about: what needs chasing, who owes you, and what came back." → title "Recovery" (match nav, see C6), **delete subtitle**.
- Flows (`app_flows.png`): "Route tasks, evidence, deadlines, and notifications. Test safely — nothing changes…" → delete; the floating helper line "Each family has at most one published version and one editable draft." → move into a muted caption inside the list header area or delete.
- Integrations (`app_integrations.png`): "Connect your store, helpdesk, and carriers. We'll tell you…" → delete ("We'll tell you" voice is banned).
- Customers: "Order, claim, and payout history for every customer." → delete.
- Partners: "Define the carriers, 3PLs, warehouses, suppliers, and in…" → delete.
- Imports (`app/(app)/integrations/imports/page.tsx:47` eyebrow "Manual source ingestion", long subtitle mentioning validation/persistence) → eyebrow deleted (A7), title "Import records" stays, subtitle → one plain line: "Upload a CSV of orders, refunds, or customers. Rows are validated and mapped before anything is saved." Remove "provenance"/"persisted" phrasing.
- `PageConnectionGate` description in `ClaimsPageView.tsx:109` is acceptable but trim "so Unauth can detect support payout moments" → "so Unauth can create payout cases from support tickets, assemble evidence, and apply your rules."
Sweep every `subtitle=`/`description=` prop under `app/(app)` and apply the same standard: a subtitle survives only if it tells the merchant something non-obvious about THIS page's data.

**C5 (P1) — Kill "→" inside labels.** `ClaimsPageView.tsx:289` "Open work queue →", plus "Review evidence →", "Build evidence →", "Profile ↗" in claims components (`components/claims/ClaimReviewPanel.tsx`, `ClaimReviewNextStepCard.tsx`, evidence panel). Grep `→` and `↗` across `app/(app)` and `components` (excluding landing). Buttons/links use words only; if an affordance is needed use a real icon component (lucide `ArrowRight`, 12px, `aria-hidden`) — never a text arrow. Prefer no arrow at all.

**C6 (P0) — One name per surface (terminology table).** Current drift: nav "Overview" vs header/route "Dashboard" (`app_store.png`, `app_dashboard.png`); nav "Recoveries" vs page "Recovery board"; nav "Payout Control" everywhere but eyebrow "Support payout control"; settings nav "Workspace & account" vs breadcrumb "Account"; breadcrumb "Platform" vs page "Financial & workflow defaults"; sidebar section "Reports and setup" vs eyebrow "Configuration".
**Fix — canonical names, enforced from `lib/navigation/appRoutes.ts` (single source):**
| Route | Canonical name everywhere |
|---|---|
| /dashboard | **Overview** |
| /work | Work |
| /claims | Payout Control |
| /losses | Losses |
| /recoveries | **Recovery** |
| /customers | Customers |
| /rules | Rules |
| /flows | Flows |
| /reports | Reports |
| /integrations | Integrations |
| /settings/account | **Workspace & account** (breadcrumb "Workspace & account", not "Account") |
| /settings/platform | **Financial & workflow defaults** (breadcrumb matches page title; if the URL slug says platform, that's fine) |
Update `pageTitle` fields in `appRoutes.ts`, the sidebar labels, `AppHeader` breadcrumbs, and page `<h1>`s to read from the same constant. `CODEBASE_STABILISATION_AUDIT.md:181` confirms `pageTitle: 'Recovery board'` currently lives in `appRoutes.ts` — change it there. Note: tests snapshot sidebar labels (`appRoutes › sidebar labels snapshot`) — update snapshots deliberately, and check `tests/current/content-compliance.spec.ts` for copy assertions.

**C7 (P1) — Empty states are bare sentences.**
`app/(app)/flows/runs/page.tsx:53` `<p>No flow runs found for this scope.</p>` → use the shared `EmptyState`/`WorkbenchEmptyState` with: title "No runs yet", body "Runs appear here after a flow executes. Publish a flow and its trigger fires automatically.", primary action "View flows". Kill the word "scope". Audit every bare-`<p>` empty branch under `app/(app)` (grep `No .* found`) and normalise onto the shared component. Also restyle `.ua-empty-visual` per B4.

**C8 (P2) — Money display.** `US$185.00` (mono, bold) in the claims list/detail. Cause: `MERCHANT_DISPLAY_LOCALE` (en-GB) renders USD as "US$". Decide with intent: if merchants are US-first, format with `currencyDisplay: 'narrowSymbol'` so USD → `$185.00` while non-ambiguous codes keep their symbol; keep "US$" only if the workspace genuinely mixes currencies. Implement inside `getMoneyFormatter`/`getCurrencyFormatter` in `lib/utils/format.ts` — one place. Remove `font-mono` from money/IDs in UI (`ClaimsPageView.tsx:301` `font-mono` on dl values; claims list rows use mono for id + type + amount): money = sans + `tabular-nums` + weight 600; IDs = sans, `--text-tertiary`, 12px. Keep the `—` null convention exactly as is.

**C9 (P2) — Header workspace pill truncation.** Header shows “Unauth Test DEVE” (`app_claims.png` top right) because `components/layout/MerchantEnvChip.tsx` slices the environment label. Render “Dev” without truncation and add an accessible “Development environment” tooltip; `AppHeader` is only the consumer.
