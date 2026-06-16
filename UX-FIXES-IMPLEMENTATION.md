# Unauth UX Fixes — Implementation Doc
**Companion to [UX-AUDIT.md](UX-AUDIT.md).** Execution-ready. Every change below is verified against the current working tree (2026-06-16). Copy-paste-ready before→after blocks.

## Conventions & ground rules
- **UI only.** No scoring/matching/weights touched (frozen SSOT: `lib/engine/*`, `lib/scorer.ts`). No `as any`, no `eslint-disable`.
- **Reference by symbol/key, not just line** — the tree has uncommitted churn; match the `old` string, not the line number.
- **Two upfront decisions** (everything else follows from them):
  - **D1 — error/danger token:** use the **`--risk-critical*`** family (`--risk-critical` solid, `--risk-critical-fg` text, `--risk-critical-bd` border). *Verified defined in every scope* (globals.css:178-180, 638). Avoid `--critical` (only defined in the 593-658 block → undefined in some scopes).
  - **D2 — `--lime`:** it is **undefined everywhere** (grep-confirmed). Repoint all 4 call-sites to the **`--accent`** family (`--accent` / `--accent-hover` / `--accent-fg-on-500`). One decision fixes CTA buttons + table row-selection + empty-state dots.
- **Verify after each phase** in the running preview (`:3100`, authed). Because the local demo merchant has no data, the surest checks are: Storybook-less → trigger the state directly, or grep to confirm no `var(--success)` remains on a failure path.

---

# PHASE 1 — P0 (before the ASOS demo)

## 1.1 Badge danger/critical tones render green → red  · `components/ui/badgeStyles.ts`
Root of the systemic issue. **Do NOT touch the `success` tone (lines 43, 53).**

**CHIP_STYLES (subtle/outline), lines 45-46 — current:**
```ts
  danger: { background: 'var(--sev-definite-fill)', color: 'var(--success)', border: 'var(--risk-critical-bd)' },
  critical: { background: 'var(--sev-definite-fill)', color: 'var(--success)', border: 'var(--success)' },
```
**→ replace with:**
```ts
  danger: { background: 'var(--sev-definite-fill)', color: 'var(--risk-critical-fg)', border: 'var(--risk-critical-bd)' },
  critical: { background: 'var(--risk-critical)', color: 'white', border: 'var(--risk-critical)' },
```
*(danger = red text on red-peach chip; critical = solid red so the two tiers read distinctly.)*

**SOLID_STYLES, lines 55-56 — current:**
```ts
  danger: { background: 'var(--success)', color: 'var(--text-primary)' },
  critical: { background: 'var(--success)', color: 'var(--text-primary)' },
```
**→ replace with:**
```ts
  danger: { background: 'var(--risk-critical)', color: 'white' },
  critical: { background: 'var(--risk-critical)', color: 'white' },
```

## 1.2 Destructive Button is green → red · `components/ui/buttonStyles.ts:50`
**Current:**
```ts
    case 'danger':
      return { background: 'var(--success)', color: 'white', border: '1px solid var(--success)' };
```
**→**
```ts
    case 'danger':
      return { background: 'var(--risk-critical)', color: 'white', border: '1px solid var(--risk-critical)' };
```

## 1.3 Helpdesk connection-error states are green → red · 3 files
Only the **`'error'` branch** changes; leave success/warning branches.

`components/settings/GorgiasSupportSyncClient.tsx` (error branch ~line 210) **and** `components/settings/FreshdeskSupportSyncClient.tsx` (~line 203) — current:
```ts
              state.message.type === 'error'
                ? 'color-mix(in srgb, var(--success) 8%, transparent)'
```
**→** (both files)
```ts
              state.message.type === 'error'
                ? 'color-mix(in srgb, var(--risk-critical) 8%, transparent)'
```

`components/settings/ZendeskSetupClient.tsx` — the **`verifyError`** paragraph only (~line 102). **Leave the two genuine-success paragraphs at ~107/113 alone.**
```ts
      {verifyError && (
        <p className="text-sm" style={{ color: 'var(--success)' }}>
```
**→**
```ts
      {verifyError && (
        <p className="text-sm" style={{ color: 'var(--risk-critical-fg)' }}>
```

## 1.4 Dispute-readiness markers backwards → fix · `components/evidence/DisputeReadinessPanel.tsx` (`readinessMarker`)
Currently a **failed** check (`○`) is green and a **passed** check (`●`) is neutral grey — both backwards.
**Current:**
```ts
function readinessMarker(passed: boolean | 'warning') {
  if (passed === true) return { symbol: '●', color: 'var(--neutral)' };
  if (passed === 'warning') return { symbol: '◐', color: 'var(--warning)' };
  return { symbol: '○', color: 'var(--success)' };
}
```
**→**
```ts
function readinessMarker(passed: boolean | 'warning') {
  if (passed === true) return { symbol: '●', color: 'var(--success)' };
  if (passed === 'warning') return { symbol: '◐', color: 'var(--warning)' };
  return { symbol: '○', color: 'var(--risk-critical-fg)' };
}
```

## 1.5 Onboarding error is green → red · `components/OnboardingClient.tsx` (the `error &&` paragraph, ~line 259)
**Current:**
```tsx
              {error && <p className="md:col-span-2 t-caption" style={{ color: 'var(--success)' }}>{error}</p>}
```
**→**
```tsx
              {error && <p className="md:col-span-2 t-caption" style={{ color: 'var(--risk-critical-fg)' }}>{error}</p>}
```

## 1.6 Claims status/SLA pills: green on negative states · `app/(app)/claims/claimsPageData.ts` (`STATUS_META`, `SLA_COLOUR_MAP`)
Fix the three negative states (match by key). **Leave** `resolved_refunded/won/exchanged` (genuine positives).
**Current:**
```ts
  escalated: { label: 'High evidence', bg: 'var(--sev-definite-fill)', text: 'var(--success)' },
  resolved_lost: { label: 'Resolved: lost', bg: 'var(--sev-definite-fill)', text: 'var(--success)' },
  ...
  overdue: { bg: 'var(--sev-definite-fill)', text: 'var(--success)' },
```
**→**
```ts
  escalated: { label: 'High evidence', bg: 'var(--sev-probable-fill)', text: 'var(--sev-probable)' },
  resolved_lost: { label: 'Resolved: lost', bg: 'var(--risk-critical-bg)', text: 'var(--risk-critical-fg)' },
  ...
  overdue: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
```

## 1.7 Dashboard: confidence-as-verdict copy · `app/(app)/dashboard/DashboardPageCockpit.tsx` (~line 224)
**Current:**
```tsx
                  Customers with prior claims or repeat patterns — high-confidence identity matches surface here
```
**→**
```tsx
                  Customers with linked identity signals or cross-merchant patterns (confidence Definite/Probable). Your team reviews and decides.
```
*(Cross-check against `lib/copy/terms.ts` BANNED_UI_TERMS before committing.)*

## 1.8 Dashboard "Open claim value" green → neutral + mono · same file (~line 196)
**Current:**
```tsx
            <p className="text-xl font-semibold tabular-nums mt-1" style={{ color: exposureAtRisk > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
```
**→**
```tsx
            <p className="text-xl font-semibold tabular-nums mt-1" style={{ color: exposureAtRisk > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
```

## 1.9 Catches feed 500 (NOT a UI edit — owner action) · `public.identity_catch_events`
`/api/catches` 500s locally — table missing in this schema. **Verify prod has the table.** If missing in prod, ship the migration; either way, make the dashboard feed fail to an explicit "unavailable" state rather than a silent 500 ([app/api/catches/route.ts:81](app/api/catches/route.ts:81)). The `/catches` page already degrades to empty.

### Phase 1 verification
- `grep -rn "var(--success)" components/ui/badgeStyles.ts components/ui/buttonStyles.ts` → only the genuine `success` tone (badge lines 43/53) should remain.
- `grep -rn "var(--success)" components/evidence/DisputeReadinessPanel.tsx app/\(app\)/claims/claimsPageData.ts components/OnboardingClient.tsx` → success should appear ONLY on `passed===true` / `resolved_refunded|won|exchanged`.
- Render: a `danger`/`critical` Badge, the account-delete Button, a forced helpdesk error, a not-ready dispute panel, an onboarding validation error — all read red, not green.

---

# PHASE 2 — P1 (high-impact, low-effort)

## 2.1 Define/repoint `--lime` (decision D2) · 4 call-sites
**Option A (recommended): repoint to `--accent`.** No new token; CTAs become the rust accent.
- `components/ui/buttonStyles.ts:22` `hover:bg-[var(--lime-hover)] active:bg-[var(--lime-hover)]` → `hover:bg-[var(--accent-hover)] active:bg-[var(--accent-hover)]`
- `components/ui/buttonStyles.ts:40-42` `background: 'var(--lime)'` → `'var(--accent)'`; `color: 'var(--lime-fg)'` → `'var(--accent-fg-on-500)'`; `border: '1px solid var(--lime)'` → `'1px solid var(--accent)'`
- `components/ui/DataTable.tsx:168` `inset 2px 0 0 var(--lime)` → `inset 2px 0 0 var(--accent)`
- `components/ui/EmptyState.tsx:48` and `components/workbench/WorkbenchEmptyState.tsx:13` accent dot `var(--lime)` → `var(--accent)`

*Option B:* if a distinct lime CTA colour is desired, define `--lime`/`--lime-hover`/`--lime-fg` in both `:root` light blocks of `globals.css`. (Heavier; only if design wants a second accent.)

## 2.2 KPI numerals → DM Mono · `components/ui/MetricCard.tsx` (~line 83)
**Current:** `fontFamily: 'var(--font-sans)',` (overrides the `.num` mono rule).
**→** `fontFamily: 'var(--font-mono)',`

## 2.3 DataTable hover/selected feedback · `components/ui/DataTable.tsx:166,171`
**Current:**
```tsx
                    background: isSelected ? 'var(--surface)' : 'var(--surface)',
                    ...
                  className={onRowClick && !isSelected ? 'hover:bg-[var(--surface)]' : undefined}
```
**→**
```tsx
                    background: isSelected ? 'var(--surface-hover)' : 'var(--surface)',
                    ...
                  className={onRowClick && !isSelected ? 'hover:bg-[var(--surface-hover)]' : undefined}
```
*(plus the `--lime` inset fix from 2.1)*

## 2.4 Grade colours off-SSOT → import `GRADE_COLOURS`
Replace hardcoded risk-palette/local maps with canonical `GRADE_COLOURS` from `lib/utils/confidenceStyles.ts`:
- `app/(app)/help/confidence-grades/page.tsx:85-111` (A/B/C/D currently use risk palette)
- `app/(app)/audit/[runId]/AuditRunOverviewPanel.tsx:28` (local `GRADE_CHART_COLORS`)
Keeps confidence (A–D) visually distinct from risk tiers.

## 2.5 Provider integration pages onto `SettingsPageShell`
Refactor the six non-Shopify pages (`gorgias|zendesk|freshdesk|woocommerce|bigcommerce|chrome` under `app/(app)/settings/integrations/`) to use `SettingsPageShell` with breadcrumbs → `/settings/integrations`, `eyebrow='Integrations'`, title/subtitle; drop the raw `p-8` divs. Pattern to copy: the Shopify page.

## 2.6 Customer-detail provenance honesty
- Per-signal "Observed" window: derive real first/last per signal instead of profile-wide range, or mark the fallback (dashed). `customerProfilePageLoad.ts` (~210-223) + `CustomerProfilePageHero.tsx` (~350-358).
- Relabel linked-identity "confidence" bars → **"Link strength"** + tooltip; they're a co-occurrence heuristic, not match confidence. `CustomerProfilePageMainColumn.tsx` (~227-240).

---

# PHASE 3 — P2/P3 (post-demo)

**System-fixes first (one change, many screens):**
- **Off-4px spacing** → `--space-*`: `SectionCard.tsx:44` (`14px 18px`→`var(--space-3) var(--space-4)`), `DataTable.tsx:177` + `dataTableStyles.ts:20,32` (`0 16px`/`10px 16px`), `Drawer.tsx:104` (`0 18px`), `buttonStyles.ts:10-11` (md `14px`→`var(--space-4)`, lg `18px`→`var(--space-5)`), `badgeStyles.ts:28-29` (`7px`→`var(--space-2)`).
- **Motion off-token** → `duration-[120ms]` → `duration-[var(--duration-fast)]` in `buttonStyles.ts:6` and `Input.tsx:11`.
- **Input/Select focus lift** → add `focus:bg-[var(--surface)]` (Input.tsx) so the field lifts off `--surface-sunken` on focus; mirror in `Select.tsx`.
- **Stale `--font-sans`** → remove the legacy `--font-sans: "DM Sans", …` at `globals.css:109` so all text resolves to Inter (line 254). (DM Sans isn't loaded; some elements currently fall back to a system font.)
- **Card elevation** → decide one rule; stop `SectionCard.tsx:35`/`MetricCard.tsx:55` hardcoding `box-shadow:none`.
- **Border-token aliasing** → document `--border` (structure) vs `--border-muted` (row separators); align `DataTable.tsx:49,121,165`.

**Screen-local (representative):**
- Stale nav refs to deleted routes: remove `VIEW_SAVED → /saved` (`lib/permissions/index.ts:260`); confirm `/inbox` alias (`appRoutes.ts:101`) is intentional URL back-compat.
- Hand-rolled tables → `DataTable`: `IdentityTimeline`, customer-detail hero/linked lists, audit-run overview/customers/transactions panels.
- Dashboard h1 off-scale `text-2xl` → `.text-display-md` (`DashboardPageCockpit.tsx:101`); audit grade tiles `grid-cols-4` → `grid-cols-2 sm:grid-cols-4` (`AuditRunOverviewPanel.tsx:61`).
- Copy: claims outcomes differentiated (`claimsPageData.ts` DECISION_LABELS); audit "Behavioural indicators"→"Behavioural context"; CatchCard "loss/save"→disclaimer-aligned; `/global` empty state states k≥3 gating.

---

## Suggested commit slicing
1. `fix(ui): use risk-critical instead of success for failure states` — Phase 1.1–1.6 (the systemic colour fix; one reviewable diff).
2. `fix(dashboard): confidence-not-verdict copy + neutral exposure value` — 1.7–1.8.
3. `fix(ui): repoint undefined --lime to accent; restore table row feedback` — 2.1, 2.3.
4. `fix(ui): KPI numerals to DM Mono` — 2.2.
5. Remaining P1 / P2 / P3 as separate PRs.

## Rollback / testing
- All Phase 1–2 changes are token/string swaps — trivially revertable per commit.
- No unit tests cover colour tokens; verify visually in `:3100`. If the e2e/compliance suites run, `npm run test:compliance` exercises some agent-facing copy (relevant to 1.7).
