# Phase 27 — Cross-product shell, states, dark mode, accessibility, and responsive sweep

Status: implemented; Phase 28 deterministic capture, final runtime-integrity,
and independent release review remain pending. Scope per §12.4/§12.7 of
`docs/IMPL_living_precision_product_ui.md`.

## Scope and implementation

- The authenticated shell now owns workspace identity and source health in one
  place: the sidebar. Multiple workspaces retain the existing switch action;
  single-workspace and collapsed states retain a named identity. Source health
  now evaluates commerce and helpdesk sources together, remains available when
  collapsed, and no longer reports a healthy shell when only one source is
  connected.
- Case and notification counts use quiet neutral surfaces instead of a
  permanently high-contrast action treatment. Active destinations expose
  `aria-current="page"`, and keyboard focus temporarily expands a collapsed
  sidebar without changing the saved collapse preference.
- The root authenticated fallback is now a shell-only header rhythm: it does
  not guess KPIs, charts, tables, or detail rails before the destination family
  is known. Report records, recovery-rule configuration, provider setup,
  imports, and ShipBob selection have focused nested loading/error boundaries.
  Settings list/form geometry no longer inherits an obsolete guidance rail.
  Login and Shopify connection feedback no longer use a blank Suspense
  fallback.
- Legacy `ErrorBoundaryUI` delegates to the canonical focused operational error
  anatomy. Loading buttons keep their accessible action name and expose
  `aria-busy`; report/result skeleton markup and metric definition-list
  structure are valid; linked ranked charts use a labelled group rather than
  an image role with focusable descendants.
- Light-mode tertiary ink was adjusted from `#71717A` to `#6B6B75`, preserving
  the tertiary relationship while reaching at least 4.55:1 on the lightest
  failing neutral wash. Filter counts no longer reduce otherwise compliant
  text through opacity. The dark unsupported-width boundary now receives the
  same relational neutral roles as the product shell, and forced-colour rules
  cover current navigation and chart marks.
- Theme preference is applied before hydration. Reduced-motion and capture
  modes disable animations and transitions instead of compressing them to a
  near-zero duration. Page gutters are 24px normally and 16px from
  1024–1279px; secondary workbench rails appear at 1280px; the product subtree
  is explicitly absent below 1024px.

## Route-state coverage added

| Route | Loading geometry | Focused recovery destination |
|---|---|---|
| `/reports/records` | report summary/export/table registry | `/reports` |
| `/rules/recovery` | configuration task, no settings rail or KPI guess | `/rules` |
| `/integrations/[provider]` | provider-detail geometry | `/integrations` |
| `/integrations/imports` | upload/import task geometry | `/integrations` |
| `/integrations/shipbob/select` | channel-selection configuration | `/integrations/shipbob` |

The authenticated root fallback remains intentionally family-neutral and
shell-only. This is the safe inheritance path for a route without a closer
boundary and is not the prohibited generic KPI-and-table fallback.

## Verification

| Command/check | Result |
|---|---|
| `npx jest tests/components/phase27CrossProductSweep.test.tsx tests/components/phase26LegalEditorial.test.tsx tests/components/phase23NotificationsHelp.test.tsx tests/components/phase21CoreSettings.test.tsx tests/components/phase06Charts.test.tsx tests/components/registrySurface.test.tsx --runInBand` | Pass — 6 suites, 37 tests. Phase 27 covers shell identity/health, quiet counters, loading-button semantics, route-family skeletons, canonical errors, definition-list/chart semantics, motion preference/capture mode, and shared CSS contracts |
| `npm run lint:authenticated-design` | Pass — 486 files checked; arbitrary-value and uppercase-eyebrow ratchets remain 0/0, hand-rolled-table ratchet improves to 8/10 |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| Focused ESLint on the Phase 27 browser/component tests and changed metric/filter/chart owners | Pass |
| `npm run build` | Pass — optimized production build, TypeScript, the 93/93 static-generation pass, and route collection complete. One existing generated Tailwind arbitrary-value optimization warning remains outside this phase |
| `npx playwright test --config=tests/playwright.config.ts --project=desktop tests/current/accessibility-responsive.spec.ts` | Pass — 59/59: 29 authenticated route families have no serious/critical Axe violation; each passes 320, 390, 768, 1024, and 1440px containment; product UI is absent below 1024px; command-palette Escape behavior passes |
| `npx playwright test --config=tests/playwright.config.ts --project=desktop tests/current/phase27-cross-product.spec.ts` | Pass — 5/5: single source-health owner, quiet count computation, collapsed-sidebar keyboard focus, dark-mode Axe across analytical/operational/settings families, forced colours, reduced motion/capture mode, and the 1024px effective viewport used by 200% zoom |
| `git diff --check` | Pass |
| `npm run verify:ui-parity` | Retains the documented baseline false positives for `/partners`, `/`, and source-counted `router.push` calls (22→20). None is produced by a Phase 27 destination, redirect, or mutation change |

The first complete browser pass was intentionally retained as a repair loop:
50/59 passed and nine Axe checks exposed three shared causes (tertiary contrast,
definition-list structure, and nested interaction under an image role). After
repairing those owners, the complete second pass was 59/59.

## Regression and remaining evidence

No scoring, matching, financial calculation, data mutation, permission,
provider request, redirect, or merchant-authority contract changed. The new
collapsed source-health link uses the same `/integrations` destination as its
expanded counterpart. All route-state recovery actions return to existing safe
parents.

The safe E2E database still logs two route-owner schema mismatches already
outside this visual sweep: the claims investigation summary references
`case_clarification_requests.partner_id`, and recovery settings reference
`merchants.investigation_response_sla_hours`. Claims continue with their
existing partial summary behavior; recovery rules exercise the new focused
error boundary. These caught environment/domain-schema issues did not produce
an uncaught browser error or fail the state/accessibility matrix, and Phase 27
does not change their contracts.

Phase 28 still owns the 58-route deterministic capture set, pinned browser
environment, frozen clock, privacy scan, runtime request/console gate,
side-by-side scorecards, and independent final design/engineering approval.
This phase does not claim `LIVING-PRECISION COMPLETE / CAPTURE-READY`.

## File and module budget

- New reusable production modules: 0
- New route-owned production modules: 10 mechanical Next.js state boundaries
- Production files changed: 34
  - Shell and bootstrap (7):
    `app/(app)/layout.tsx`, `app/(app)/loading.tsx`, `app/layout.tsx`,
    `components/layout/AppHeader.tsx`, `components/nav/SidebarInner.tsx`,
    `components/nav/SidebarAside.tsx`, `components/nav/SidebarNavItem.tsx`
  - Shared state/control/visual owners (9):
    `components/navigation/skeletons/pageSkeletons.tsx`,
    `components/states/OperationalRouteError.tsx`,
    `components/ui/LoadingState.tsx`, `components/ui/Button.tsx`,
    `components/ui/FilterChip.tsx`, `components/ui/MetricGroup.tsx`,
    `components/charts/authenticated/RankedContributionChart.tsx`,
    `components/shopify/ShopifyIntegrationBanner.tsx`,
    `app/(auth)/login/page.tsx`
  - Existing route owners (3):
    `app/(app)/rules/loading.tsx`,
    `app/(app)/settings/audit-trail/loading.tsx`,
    `app/(app)/settings/integrations/shopify/page.tsx`
  - Route-state boundaries (10):
    loading/error pairs under `reports/records`, `rules/recovery`,
    `integrations/[provider]`, `integrations/imports`, and
    `integrations/shipbob/select`
  - Shared authenticated styles (5):
    `styles/authenticated/tokens.css`,
    `styles/authenticated/foundations.css`,
    `styles/authenticated/surfaces.css`,
    `styles/authenticated/composition.css`,
    `components/authenticated/AuthenticatedPageChrome.module.css`

The normal 12-file budget is exceeded because Phase 27 is explicitly the
cross-product release sweep. Ten files are unavoidable mechanical route-state
boundaries, no reusable module was added, and the remaining edits repair the
existing canonical owners rather than introduce another shell, state, theme,
motion, or accessibility system. Tests and phase evidence do not count toward
the production-file budget.
