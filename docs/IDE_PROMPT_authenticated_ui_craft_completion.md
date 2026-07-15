# IDE execution prompt — authenticated UI craft completion

You are continuing the authenticated Unauth redesign in `/Users/malikibrahim/Downloads/Unauth`.

This is an implementation task, not another audit or planning exercise. Fix the actual application until the complete authenticated product feels deliberately crafted by a senior product engineer: restrained, dense, operational and Ramp-inspired without copying Ramp assets, copy or source. Do not stop after producing documentation.

## Protect the current build

- Work on `ui-craft-overhaul`.
- Confirm `eabc8110` exists locally and at `origin/ui-craft-overhaul`. This is the protected snapshot of the newest local build; `main` is older. Do not reset to `main` or replace local files from remote.
- The backup `backup-pre-slop-fix-20260714-0056.tar.gz` already exists and is ignored. Do not recreate, delete or commit it.
- Inspect `git status`, recent commits and all diffs before editing. Preserve unrelated/user-owned work; do not reset, stash or broadly reformat it.
- Expected intentional documentation changes are:
  - `docs/IMPL_ui_craft_overhaul.md`
  - `docs/HANDOFF_ui_craft_overhaul.md`
  - `docs/design/authenticated-redesign-manifest.md`
  - `docs/design/authenticated-redesign-validation.md`
- Review and checkpoint those four tracked documentation corrections separately if intact.
- `docs/IMPL_slop_eradication.md` is an incomplete, untracked Claude draft ending at C9. Do not stage, commit or execute it as a complete plan.
- If `.git/index.lock` exists, remove it only after confirming no Git process is active.
- Make small, verified commits and push only `ui-craft-overhaul`. Do not merge to `main` or deploy production until the complete gate passes and I explicitly confirm release.

## Read before editing

Read completely:

1. `/Users/malikibrahim/.codex/attachments/c030688b-0faf-4405-a104-fa494fa1373d/pasted-text.txt`
2. `CLAUDE.md`
3. `docs/IMPL_ui_craft_overhaul.md`
4. `docs/HANDOFF_ui_craft_overhaul.md`
5. `docs/design/authenticated-redesign-manifest.md`
6. `docs/design/ramp-interface-reference-study.md`
7. `docs/design/authenticated-component-system.md`
8. `docs/product/PRODUCT_PRINCIPLES.md`
9. `docs/product/MVP_STEERING.md`
10. `docs/product/TERMINOLOGY.md`
11. `screenshots-app-2026-07-14/README.md` and its authenticated screenshots

The original full-product brief remains binding. Everything merchant-reachable after authentication is in scope: onboarding, shell, canonical and hidden routes, dynamic records, redirects, tabs, drawers, modals, builders, forms, charts, tables, command/search, settings, loading/empty/stale/error states and responsive variations. Public marketing and landing pages are out of scope and must remain visually and functionally unchanged.

Treat all audit findings as hypotheses. Current code, real data contracts and the rendered authenticated application are ground truth.

## Working method

1. Launch the app and use the authenticated browser continuously.
2. Independently rediscover reachable authenticated surfaces from routes, registries, redirects, links, permissions, tests, notifications, search and legacy paths.
3. Reproduce each alleged defect at a controlled CSS viewport. Classify it as `confirmed`, `already fixed`, `data-specific`, `not reproducible` or `needs product decision`, with evidence.
4. Implement confirmed fixes in this order:
   - broken loading/chrome states and functional regressions;
   - authoritative tokens, typography, formatting, status and feedback systems;
   - shell, headers, tables, forms, drawers, modals and state components;
   - case workspace, customer surfaces, Dashboard/Reports and Work;
   - every remaining manifest surface;
   - optional net-new polish only after the core gate passes.
5. After each meaningful batch, run focused tests and inspect matched before/after browser screenshots.
6. Continue through the full manifest. Documentation updates do not count as implementation.

## Preserve product truth

Do not alter RLS, tenant isolation, permissions, financial calculations, reconciliation, connectors, OAuth/webhooks, audit history, rules, flows, case lifecycles, scoring formulas or `lib/engine/*`.

Do not add fake charts, guessed currency, invented metrics, hardcoded merchant data, dead actions, synthetic success, decorative controls or untraceable totals.

Trace every metric and state to its existing definition/query:

- Keep `/reports` as a first-class analytical workspace; do not redirect or merge it into Dashboard.
- Do not classify previous cases as a warning unless an existing rule or policy actually fired. History alone is neutral context.
- Render refund rate, chargebacks, rule templates, context credits and freshness only when their definitions, source data and actions reconcile across surfaces.
- Test a dense Recovery list/table against the current board with real workloads. Keep Kanban only if it demonstrably improves stage-based work.
- Unknown values are unavailable, never zero.

Use existing dependencies and primitives. Do not add another toast, command, chart or component library:

- Reuse `components/ui/Toast.tsx`.
- Refine the existing `components/layout/CommandPalette*`; do not create another palette.
- Reuse Recharts, Lucide and the authenticated token scope.
- Queue shortcuts are optional until the complete core pass is green.
- The appearance setting already exposes dark mode. Verify the actual toggle: `.ua-app` currently declares light-scoped values that may override root dark tokens. Fix authenticated dark selectors/tokens if broken; never leave a cosmetic control that does nothing.
- Shared components such as `SectionCard` also have public consumers. Make authenticated changes scoped or variant-safe so `/demo` and public landing surfaces do not change.

## Eliminate the visible AI-slop patterns

Remove or correct:

- oversized marketing headings and duplicated title/breadcrumb systems;
- walls of identical rounded KPI cards, accent bars, gradients and ordinary-card shadows;
- badge/pill overload and opposite meanings sharing colours;
- raw enums, UUIDs, seed slugs and internal vocabulary;
- inconsistent currency/date formatting and monospace financial values;
- repeated values, repeated actions and row-level button clutter;
- self-referential design copy, vague subtitles, textual arrows and fake operational narration;
- silent mutations, bare empty states and geometry-breaking skeletons;
- clipped labels, dead gutters, excessive whitespace and responsive overflow;
- arbitrary colour, decorative animation and financial count-up;
- page-specific mini design systems;
- default-library chart styling.

Every visible action must work, be honestly disabled with a reason, or be removed.

## Dashboard and Reports chart contract

The current `DashboardCharts.tsx` is not acceptable: it uses three equal template cards, default tooltips, raw ticks, smoothed areas, a faux funnel, fake empty-state bars and a fabricated GBP fallback.

Implement the binding WS5.4 contract:

- Use only canonical reporting data. Remove guessed currency fallbacks and separate mixed currencies.
- Reconcile displayed chart totals with the value strip, `MoneyBridge`, breakdown tables and drill-down records in tests.
- At 1280px+, use a 12-column composition: primary exposure/recovered trend across eight columns and ranked loss causes across four. Stack cleanly below that.
- Make the primary plot approximately 280px high on desktop and at least 220px when stacked.
- Use unsmoothed 2px lines, restrained semantic colour, no chart animation and no unjustified gradient.
- Show 4–6 compact currency y-axis ticks, adaptive canonical date ticks, horizontal hairline grid only and margins that prevent clipping.
- Replace the default tooltip with an accessible, token-aligned tooltip containing the full date and exact formatted values.
- Render loss causes as descending horizontal bars using humanised categories, dynamic row height and direct value labels.
- Replace the decorative “funnel” with a reconciled stepped financial ledger for Detected, Pursued and Recovered, including conversion only when denominators are valid.
- Design distinct loading, empty, partial-data, reconciliation-error and request-error states. Never show fake chart shapes as empty data.
- Provide an accessible text/table interpretation.
- Verify 7d/30d/90d/All, each supported currency, zero, one-point, partial and populated data.
- Keep drill-down URLs, exports, filters and displayed totals synchronized.

## Browser and quality gates

For every manifest surface, verify representative populated, loading, empty, partial/stale and error states at:

- 1440px
- 1280px
- 1024px
- tablet/768px
- critical mobile/390px
- light theme
- dark theme wherever exposed

Controlled recaptures are required; do not infer CSS viewport dimensions from the old screenshot files.

After each task run focused tests. At phase boundaries and before completion run:

```bash
npm run typecheck
npm run lint
npm run lint:authenticated-design
npm test -- --runInBand
npm run build
npm run test:redesign
npm run test:critical
npm run test:compliance
npm run evidence:redesign
git diff --check
```

Run additional relevant Playwright, accessibility, responsive and workflow tests. Never weaken assertions, delete coverage or hide failures. Jest may mutate `tests/fixtures/generated/large_merchant_scale_PERFORMANCE.json`; do not stage that generated change.

Store fresh, masked evidence in a new dated directory. Update the defect register and manifest with exact evidence paths. Independently rediscover all routes again at the end.

## Completion standard

Do not claim “9.5 achieved.” Completion is binary:

- every reachable authenticated surface has fresh browser evidence;
- the second inventory reconciles with the manifest;
- no unresolved P0/P1 defect remains;
- no old authenticated theme residue or obvious AI-slop pattern remains;
- charts and financial totals reconcile to source data;
- all actions and mutations behave truthfully;
- public pages are unchanged;
- business/security behavior is preserved;
- all automated and browser gates pass;
- remaining P2 limitations, if any, are explicitly evidenced and owned.

Keep working autonomously through normal in-scope implementation decisions. If one item genuinely requires a product decision, record it and continue all unrelated work.

Finish with a concise report containing commits, pushed feature-branch state, routes and states verified, test results, evidence location, remaining limitations and one honest status: fully verified, verified with documented limitations, or not verified.
