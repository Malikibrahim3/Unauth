# Ramp Cohesion Audit - 2026-06-09

## Verdict

The app is not yet close enough to the Ramp reference. The foundation moved in the right direction, but the product still reads as several UI generations stitched together:

- The authenticated shell is recognizable, but pages do not share one layout model.
- There are still multiple page header systems, multiple card/table systems, and many raw inline styles.
- The strongest pages are dense, neutral, and operational. The weakest pages still look like warm SaaS cards or form pages.
- The Ramp references are table-first and workflow-first. Unauth still uses too many panel/card compositions where the reference uses one page frame, one toolbar, and one dense data surface.

This needs a consolidation pass before more visual polish. The next pass should reduce components, not add more decorative treatment.

## Reference Standard

The attached Ramp screenshots set a clear target:

- **Shell:** fixed pale rail, tiny icons, quiet active states, nested nav with count pills.
- **Page Header:** small eyebrow/breadcrumb, very large black title, sparse right actions.
- **Tabs:** inline text tabs with a single black underline and small lime count pills.
- **Toolbar:** search/filter row immediately above data; controls are compact and neutral.
- **Tables:** dense rows, faint grid lines, strong first column, subtle selectable cells, no ornamental card framing.
- **Charts:** large but quiet, often on the same page plane as the table, with minimal borders.
- **Accent:** lime only for counts and primary actions, not a general theme wash.
- **Radii:** mostly 0-8px. No soft marketing card language inside the app.
- **Typography:** black, large, tight headings; compact labels; tabular numerals.

## Evidence Gathered

Reference files reviewed:

- `/Users/malikibrahim/Downloads/2ba76a4cce5864552fcf1877357b6960e480950290a1fdc415b999e9dd4f7398.jpg`
- `/Users/malikibrahim/Downloads/54e72ed01317106417a6881fee405a734ec119a37faadbd820bf6ae6c34bb0a4.webp`
- `/Users/malikibrahim/Downloads/budgets_01.webp`
- `/Users/malikibrahim/Downloads/ramp_ramp-388364686_expense-management-software_1756085576615_1.png`

Repository visual evidence reviewed:

- `reports/ux-audit/screenshots/dashboard.png`
- `reports/ux-audit/screenshots/customers.png`
- `reports/ux-audit/screenshots/audit-results-overview.png`
- `reports/ux-audit/screenshots/upload-column-mapping.png`
- `reports/ux-audit/screenshots/settings.png`
- Existing `reports/ux-audit/ux-audit-evidence.json`
- Existing `reports/deployment-readiness/UX_PLAYWRIGHT_EVIDENCE.json`

Fresh capture limitation:

- A fresh `npm run ux:screenshots` run was attempted on 2026-06-09.
- It failed before test execution because the command deletes `.next` while another dev server is already running on port 3000, leaving that server with missing build manifests.
- This audit therefore combines existing screenshots, live browser auth/session inspection where possible, route inventory, and current code inspection.

## Quantitative Drift

Current app/code inventory:

| Metric | Count | Why it matters |
|---|---:|---|
| Page routes inventoried | 71 | The audit covered all page route files, including app, auth, public, legal, and internal routes. |
| Raw `<table>` implementations | 14 | Data surfaces are not routed through one table primitive. |
| Raw `<section>` surfaces | 107 | Many pages still hand-roll page/card structure. |
| `rounded-xl` / `rounded-2xl` hits | 4 | Low count, but still a signal of older softer UI. |
| Hard-coded hex hits in `app`/`components` | 210 | Token source of truth is not enforced. Some are brand logos, but many are old UI colors. |
| Text arrow glyph hits | 114 | Links/actions still use text glyphs rather than icon primitives where they are controls. |
| Deep `@/components/ui/*` imports | 69 | The barrel rule exists but is not enforced. |

## Primary Findings

### P0 - There is no single page scaffold

The app currently uses at least these layout systems:

- `components/workbench/WorkbenchPage.tsx`
- `components/ui/PageHeader.tsx`
- `components/common/PageHeader.tsx`
- `components/workbench/DetailPageShell.tsx`
- Page-local `p-6 md:p-8` wrappers
- Public/auth custom wrappers

This is the biggest reason the app does not feel cohesive. Ramp's screens use one dominant page grammar: shell, header, tabs/actions, toolbar, data/body. Unauth alternates between card dashboards, narrow form pages, broad workbench pages, and legacy headers.

Files/surfaces observed:

- `app/(app)/reports/ReportsPageView.tsx` uses `WorkbenchPage`.
- `app/(app)/upload/page.tsx` uses `WorkbenchPage`.
- `app/(app)/store/page.tsx` uses `PageHeader` plus custom sections.
- `app/(app)/watchlist/page.tsx` uses `PageHeader` plus `SectionCard`.
- Settings subpages use `SectionCard` without `WorkbenchPage`.
- Help pages use raw sections.
- Chargeback detail and transaction detail pages use page-local wrappers.

Impact:

- Different pages have different title scale, padding, card boundaries, action placement, and page width.
- The user perceives these as different products even when tokens match.

### P0 - Tables are still fragmented

The Ramp references are table-first. Unauth still has raw tables in:

- `components/audit/AuditCustomersTableClient.tsx`
- `components/audit/AuditHistoryTableClient.tsx`
- `components/claims/ClaimReviewHistoryTable.tsx`
- `components/customers/IdentityTimeline.tsx`
- `components/settings/AuditTrailClient.tsx`
- `app/(app)/audit/[runId]/AuditRunTransactionsPanel.tsx`
- `app/(public)/demo/page.tsx`
- `app/(public)/audit/[runId]/report/page.tsx`
- `app/(internal)/eval/page.tsx`

Impact:

- Headers, row heights, sort indicators, empty rows, hover states, action cells, and mobile behavior differ.
- This blocks a true Ramp-style data surface because the table system is not the single source of truth.

### P0 - Workbench cards still fight the Ramp reference

Current screenshots show too many framed cards on pages that should read as operational workspaces:

- Dashboard has KPI tiles, large banners, chart panels, right-rail modules, and repeated framed surfaces.
- Audit results use metric cards plus chart cards plus success/warning banners.
- Settings account is a narrow form in large cards, not a dense settings workspace.
- Upload mapping is a boxed form stack, not a dense mapping tool.

Ramp uses cards when they are repeated objects or contained tools. It does not turn every page section into a card. Unauth still does.

### P1 - Header hierarchy does not match the references

Reference pattern:

- Small category label.
- Large title (`Overview`, `Reporting`, `Ramp Card`, `2026 Budget`).
- Actions right aligned.
- Tabs directly below title or page header.

Current drift:

- Some pages have a sticky app breadcrumb header plus an in-page header.
- Some pages show `Claim overview`, `New Audit`, `Account & Profile` at smaller scale.
- Some page titles are inside cards or constrained wrappers.
- Some routes use old naming (`Home`, `Dashboard`, `Claim overview`, `Risk Overview`) inconsistently.

Impact:

- Page transitions do not feel like moving through one app.
- The page does not get the Ramp-like first-viewport signal.

### P1 - Shell is closer, but still not Ramp-quality

The sidebar improved, but it still differs from the reference:

- The app logo block is heavier than Ramp's tiny mark.
- Group labels make the IA feel enterprise/admin rather than Ramp's compact operational rail.
- The active state varies across screenshots and code history.
- Footer legal links create visual clutter in the rail.
- Search exists in the header, not integrated into the left rail as in the references.

Recommendation:

- Treat shell as a product surface, not just nav.
- Move to a strict rail spec with compact count chips, selected group expansion, and one active state.

### P1 - Accent color is not disciplined enough

Ramp uses lime sparingly:

- Count badges.
- Primary CTA.
- Occasional status emphasis.

Unauth still has:

- Rust/maroon legacy surfaces.
- Warning/success cards that dominate the viewport.
- Hard-coded brand/provider colors.
- Green/red/yellow confidence fills competing with lime.

This makes the app feel less like Ramp and more like a generic risk dashboard.

### P1 - Auth/public surfaces are a separate product

Auth and public pages still carry older warm-cream, marketing, or serif-era styling:

- `components/signup/SignupFlow.tsx`
- `components/signup/SignupFlowSteps.tsx`
- `components/signup/SignupFlowAccountStep.tsx`
- `components/signup/SignupFlowUploadStep.tsx`
- `app/(auth)/login/page.tsx`
- public audit/demo/legal pages

Impact:

- Signup/login do not prepare the user for the in-product visual system.
- The product feels like it changes visual identity after authentication.

### P1 - Detail pages are too bespoke

The customer profile, chargeback detail, transaction detail, global graph, and claim review surfaces all have page-local structures:

- `app/(app)/customers/[id]/CustomerProfilePageHero.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx`
- `app/(app)/chargebacks/[id]/EvidenceDetailPageView.tsx`
- `app/(app)/audit/[runId]/transaction/[id]/page.tsx`
- `components/claims/*`
- `components/global/GlobalIdentityGraphClient.tsx`

These screens need a shared detail-page pattern:

- Header rail with identity/record title.
- Left/main dense content.
- Right sticky action/context rail.
- Shared section headers.
- Shared evidence/timeline/table primitives.

### P2 - Text glyphs and inline styles still leak old craft

Examples:

- `components/dashboard/SavingsCard.tsx` has `Methodology ↓`.
- `components/audit/AuditCustomersTableClient.tsx` has `Orders ↓`.
- `components/claims/ClaimReviewNextStepCard.tsx` uses `›`.
- Multiple components use link text ending in `→`.
- Many components set `fontSize`, `background`, `border`, and `padding` inline.

Not all arrows are bad in instructional copy. But as controls, they should be icons or button primitives.

### P2 - Charts are not yet systematized

Some chart work moved to ECharts, but chart primitives are split:

- `components/analytics/*`
- `components/charts/*`
- Recharts in `components/internal/NetworkMetricsChartsClient.tsx`
- Custom SVG charts in `components/customers/BehaviorRoadmap.tsx`, `components/audit/RiskDistributionStrip.tsx`

Reference quality requires one chart vocabulary:

- Same axes.
- Same tooltip.
- Same empty state.
- Same gauge arc width.
- Same table-adjacent placement.

## Route Family Assessment

| Family | Routes | Current quality | Main issue |
|---|---|---|---|
| Core workbench | `/dashboard`, `/reports`, `/upload`, `/history`, `/customers`, `/claims`, `/chargebacks` | Mixed | Some use `WorkbenchPage`; dashboard and detail surfaces still hand-roll too much. |
| Audit results | `/audit/[runId]`, `/audit/[runId]/customers`, `/audit/[runId]/transaction/[id]` | Mixed/old | Raw tables, legacy risk wording, page-local panels. |
| Customer detail | `/customers/[id]`, `/customers/[id]/claims`, `/customers/[id]/evidence/new` | Mixed | Bespoke hero/sidebar/main; not integrated with table-first Ramp grammar. |
| Claims review | `/claims`, claim review components | Mixed | Serious workflow, but form/card density differs from workbench pages. |
| Evidence/chargebacks | `/chargebacks`, `/chargebacks/[id]`, `/evidence-packages`, `/evidence` | Mixed | List pages use workbench; detail page is bespoke. |
| Settings | `/settings/*` | Old/mixed | Narrow card forms and varied headers; integration pages have hard-coded provider colors. |
| Help/legal | `/help/*`, `/legal/*` | Old | Raw sections and content-page styling outside app grammar. |
| Auth/signup | `/login`, `/signup`, `/onboarding`, `/reset` | Old | Separate visual identity. |
| Public marketing/audit | `/landing`, `/demo`, `/audit`, `/audit-demo` | Separate | Landing is its own system; public audit/demo carry old cards/tables. |
| Internal | `/eval`, `/network-metrics` | Low priority | Raw table/chart surfaces acceptable only if hidden/internal. |

## What Good Looks Like For Unauth

Unauth should not become a fake Ramp clone. The right target is:

- Ramp-like operational density.
- Unauth-specific identity/evidence language.
- One neutral shell.
- One page scaffold.
- One table system.
- One chart system.
- One detail-page system.
- Lime as a small precision accent.
- No marketing-style card stacks inside authenticated workflows.

## Non-Negotiable Acceptance Criteria

1. Every authenticated page uses one of:
   - `WorkbenchPage`
   - `DetailPageShell`
   - `SettingsPageShell`
   - `PublicFlowShell` for auth/public only
2. No authenticated page may use `components/common/PageHeader`.
3. No new raw `<table>` in authenticated product code.
4. Raw `<section>` is allowed only inside a sanctioned shell/component, not page-local layout.
5. No `rounded-xl` or `rounded-2xl` in authenticated product pages.
6. No hard-coded hex for UI colors outside brand logos/provider icons.
7. Text glyph arrows are allowed only in prose/instructions, not controls.
8. All UI primitives import from `@/components/ui` barrel unless explicitly exempted.
9. Page title scale and header spacing match the Ramp reference.
10. Table pages have toolbar, tabs, counts, and dense rows in a shared pattern.

## Recommended Priority

Do not start with micro-polish. Start with architecture:

1. Build the layout primitives.
2. Migrate all list/table pages.
3. Migrate all settings/forms pages.
4. Migrate all detail pages.
5. Retoken public/auth.
6. Only then do chart and empty-state polish.

