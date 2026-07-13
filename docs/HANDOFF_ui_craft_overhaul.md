# HANDOFF — UI Craft Overhaul (for the next agent / codex)

**Spec:** `docs/IMPL_ui_craft_overhaul.md` (the full plan — read it; this handoff assumes it).
**Branch:** `ui-craft-overhaul` (off `main`). 15 commits so far, message convention `ui-overhaul(wsN): <title>`.
**Gate (green as of handoff — 2026 tests pass, 0 fail):**
```bash
npx tsc --noEmit && npx eslint app components lib --max-warnings=0 && npx jest --silent
```
Run it after **every** task. If a test fails only because copy/labels changed intentionally, update the test to the new canonical string — never weaken the assertion (see the two updates already made in `tests/utils/formatCurrency.test.ts` and `tests/components/claimReviewManageCard.test.tsx`).

**Dev/verify:** dev server runs on `:3000` (`.claude/launch.json` → `next-dev`). Demo merchant session is usually already authenticated (Elara & Co, **GBP**). See memory `project_demo_auth`. Verify each surface in-browser at **1440×900 and 390×844**, light **and** dark (dark toggle: set `document.documentElement.dataset.theme='dark'`). The doc's §3.3 walk + §3.2 greps + §3.4 rubric are the sign-off bar.

---

## 1. What is DONE (committed, gate-green, most browser-verified)

**Foundation helpers — reuse these; do NOT hand-roll formatting/labels again:**
- `lib/utils/format.ts`: `formatMoney(minor, currency)`, `formatMoneyOrDash(minor?, currency?)` (currency REQUIRED; dash, never a guessed symbol), `formatNumber(n)` (en-GB counts), `formatDate(iso, now?)` (relative <7d / "14 Jun" / "14 Jun 2025"), `formatDateAbsolute(iso)` ("14 Jun 2026"), `formatDateTime(iso)` ("14 Jun, 09:42"). Locale is **en-GB** (USD renders `US$…` — intentional). Legacy `formatCurrency*` still exist but new code must use the above. Tests: `tests/unit/formatCanonical.test.ts`.
- `lib/ui/labels.ts`: `label(family, value)` + `humanise()`. Families: caseStatus, requestedAction, recoverability, recoveryStatus, ownerType, counterparty, lossStatus, lossCategory, attribution, recoveryRoute, workPriority, claimType. Tests: `tests/unit/uiLabels.test.ts`.
- `lib/ui/displayRef.ts`: `shortRef(ref, id)` / `caseDisplay({customer_name, ref, id})` / `hashId(id)` → never emit a UUID/slug. Tests: `tests/unit/displayRef.test.ts`.

**Components:**
- `components/ui/StatusBadge.tsx` — 5-tone `StatusBadge` (+ `STATUS_TONES`, `statusTone()`) and `PriorityChip`. **Adopt via deep import** `@/components/ui/StatusBadge`. The barrel `@/components/ui` still exports the OLD landing `StatusBadge` (variant-based, `statusBadgeVariantFor`) used by ~25 files — see §3.
- `components/ui/RowActionsMenu.tsx` — accessible `⋯` menu; also available on `DataTable` via the `rowActions={(row)=>RowAction[]}` prop.
- `components/ui/Toast.tsx` — `ToastProvider` (wired in `app/(app)/layout.tsx`) + `useToast()`. Every mutation should call it.

**Global chrome (all `WorkbenchPage` surfaces):** 20px titles, Inter tabular-nums stat numerals (`components/ui/pageShellStyles.ts`, `components/workbench/WorkbenchKpiStrip.tsx`), flush "Unauth." logo (`app/globals.css` `.ua-mark`), Title-cased workspace label (`app/(app)/layout.tsx`).

**Surfaces reworked & browser-verified:** `/losses` (LossLedger StatusBadge + row-click + copy), `/losses/[id]` (money/labels/hashId), `/work` (PriorityChip, StatusBadge, `shortRef` objects, RowActionsMenu, removed Source/Blocker cols, copy), `/recoveries` (plain captions/copy), `/integrations` + `/notifications` (§7 subtitles/empty state), `/dashboard` (subtitle/title only).

**Copy/bugs:** decision/outcome labels restored (`components/claims/claimReviewLabels.ts` — were all "Merchant response recorded"); §7 dictionary appended to `docs/product/TERMINOLOGY.md`; **B5** fixed (case decision form: no pre-input validation, `Record decision` button); case-page **breadcrumb** via `caseDisplay` (WS2).

**WS0.4 fully done:** every `.toLocaleString`/inline `Intl` in app+components migrated; **ESLint guard** now bans them (`eslint.config.js` — `NO_INLINE_INTL_SELECTOR`, `NO_TO_LOCALE_STRING_SELECTOR`). New code that reaches for `.toLocaleString`/`new Intl.*` in app|components will fail lint by design.

---

## 2. VERIFIED CAVEATS (don't waste time re-discovering)

- **Dark theme already exists and renders** (`app/globals.css` `:root[data-theme="dark"]` ~line 728). The doc's "no dark tokens yet" is STALE. WS6.4 is mostly a verification pass, not a build. Spot-check surfaces in dark; only add missing token overrides if a specific surface breaks.
- **B3 / B6 are likely demo-DATA issues, not UI bugs.** On the case page most demo cases show "No claim selected" and the recommendation loads in the stale-warning state. `pickPriorityClaim` (`lib/claims/priority.ts`) already auto-selects when claims exist — the demo cases have `is_claim=false` (see memory `project_gorgias_1008_claim_classification`). **Verify against a properly-classified case before changing** `components/claims/claimReviewState.ts` (selection + `decisionData` fetch effect, ~lines 135-221). B6's fix, if real, is auto-fetch on mount + only mark stale after edits — in that effect.
- **A `CommandPalette` already exists** (`components/layout/CommandPalette*.tsx`, ⌘K wired). WS6.2 is largely present — verify j/k/Enter/a/s list shortcuts on `/work` + `/claims`, don't rebuild the palette.
- Running jest mutates `tests/fixtures/generated/large_merchant_scale_PERFORMANCE.json` — do NOT stage it.

---

## 3. REMAINING WORK (priority order; each is one commit + gate + browser-verify)

### A. StatusBadge migration sweep (WS1.2) — highest leverage
~25 files still import the OLD `StatusBadge` (variant API) from the barrel. Migrate each to the new `family`/`value` `StatusBadge` (deep import), then retire the landing one from `components/ui/index.ts` + `LandingPrimitives` + `tokens.ts` (`statusBadgeVariantFor`, `StatusBadgeVariant`). Consumers (from `grep -rn "statusBadgeVariantFor\|StatusBadge" app components`): RecoveryBoardClient, ClaimsPageView/ClaimsQueueClient/claimsPageUi, CustomersTableClient, ConnectedObjectDetail, settings sync-connection details (Gorgias/Freshdesk/Zendesk), NotificationCentre, CanonicalCsvImportClient, RuleBuilderDrawer, the claim payout cards (EvidenceChecklistCard, RecoveryCaseCard, PayoutCaseLeadBlock, GateRecommendationPanel, LossAttributionCard, IntegrationEvidenceSourcePanel), ClaimReviewContextColumn/EvidenceRail, MatchStatusBadge, PlatformSettingsClient, BehaviorRoadmap. Map each variant→family/value. Kill "Unknown" badges (render "Not yet assessed" neutral or omit).

### B. Page rebuilds (WS5) — the big ones, browser-verify heavily
- **WS5.1 Case page `/claims/[id]`** (#1 priority): compose the hero (claim-type + StatusBadge + `caseDisplay` line: name · ref · £ · requested · opened), promote the **evidence checklist**, auto-fresh recommendation (B6 — see caveat), single Record-decision rail, kill the six grey "Claim evidence context" cards + "Store-owned claim history" jargon, demote "View missing data" to a quiet link. Files: `app/(app)/claims/[id]/page.tsx` + the `components/claims/ClaimReview*` + `components/claims/payout/*` kit. Reuse the kit's logic files.
- **WS5.2 Customer drawer** `components/customers/CustomerPreviewDrawer.tsx` + **WS5.3 profile** `app/(app)/customers/[id]/*`: identity header, 4-stat signal strip, open cases, recent orders (real table — currently missing), notes with Save+toast. **Fixes B1** (currency — already GBP via formatMoney, verify), **B2** (drawer "2 orders" vs list "5" / profile vs rail count mismatch — align to list definitions), **B9** ("awaiting_c" truncated enum → `label()` + no clip). `/customers/[id]/claims` → redirect to profile #cases.
- **WS5.4 Dashboard** `app/(app)/dashboard/page.tsx` + `components/reporting/IntelligenceReportView.tsx`: value strip with deltas, **recharts** charts (exposure/recovered over time, loss causes via `lossCategory` labels, recovery funnel), consolidate the 4-6 "Needs attention" link-cards into one, kill "Open matching records →" (§7), zero-cells collapse. `recharts@2.13` is installed. The subtitle/title are already done; the value cards + "Generated <US date>" + Title-Case status cards + loss-cause rows live in `IntelligenceReportView`.
- **WS5.5 Work queue** — mostly done; remaining: counted filter pills (pattern on `/claims`), dedupe templated task descriptions, whole-row navigation.
- **WS5.6 Sweep:** `/recoveries` cards → new StatusBadge + card `⋯` menu; `/rules` detail "Readable policy" renders builder sentence form not `eq item_not_received` (`components/rules/RuleVersionWorkbench.tsx` / `FlowVersionWorkbench.tsx` line ~423 renders `condition.operator` raw); `/partners` confidence → StatusBadge tone; `/integrations` **B8** (connection truth — page vs `lib/connections/getConnectionState.ts`) + slashed-zero stat cards → Inter; `/flows` copy + field labels + `24` unit label; `/login` + `/onboarding` button geometry/progress; object record pages `components/relationships/ConnectedObjectDetail.tsx` ("Provenance and freshness" → "Data source" one-liner, back-link B12, kicker).

### C. Remaining WS0.5 copy
Not yet swept: `ConnectedObjectDetail.tsx` ("Provenance and freshness", "source registry", "typed evidence items", intro para), flows empty states, `ClaimReviewContextColumn.tsx` "No claim selected" copy. Apply §7 table in `docs/product/TERMINOLOGY.md`.

### D. Remaining functional bugs (WS3)
B1 (verify £ everywhere post-formatMoney), B2, B3/B6 (see caveats), B7 (settings profile prefill — `app/(app)/settings/account/page.tsx`), B8 (integrations connection truth), B9, B10 (Gorgias settings error card + retire Store-Check preview → 4-line decision card), B11 (`support@unauth.co` → `@unauth.app`), B12 (object back-link). B4/B5 done.

### E. WS4 remainder
WS4.1 `PageHeader` detail variant + settings quadruple-header fix; WS4.2 migrate more tables to `DataTable` + selection bar where missing; WS4.3 `EmptyState`/`LoadingState` variants + rules empty-state 3 template cards from `default_rule_templates` (DB, unused); WS4.5 remaining mono→Inter (DM Mono only for refs/IDs/hashes).

### F. WS6 polish
Motion (shared 140ms; count-up on dashboard deltas only); ⌘K/list shortcuts (verify — palette exists); focus-ring parity; dark-theme verification (§2 caveat); sidebar badge fetched in layout not per-page; **visual QA gate** — add §3.3 walk + screenshot-diff to `docs/ROLLOUT_RUNBOOK.md`, extend the visual suite to fail on `/\$\d/` (GBP workspace) or `/[a-z]+_[a-z]+/` in a rendered status cell.

---

## 4. Guardrails (CLAUDE.md — enforced)
No `as any`; no `// eslint-disable` (console.warn is fine — no `no-console` rule). Raw Tailwind color classes are banned in `components/**` (use `var(--token)` utilities). Never touch scoring/matching/cluster logic or `lib/supabase/tables.ts` names. Keep the Gorgias widget's 4-line format. TERMINOLOGY.md language rules (no "fraudster/blacklist/guilty" etc.). Light theme stays default; motion restrained.
