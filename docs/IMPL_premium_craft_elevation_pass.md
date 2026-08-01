# IMPL — Premium craft elevation pass

- **Status:** forensic implementation handoff — planning artifact only
- **Date:** 31 July 2026
- **Programme:** `PC-00` through `PC-12`
- **Implementation permission:** none; this document does not authorise `PC-00`, script creation, capture, testing, or product changes
- **Repository baseline:** `bc04901cecbe8da9a6cd1f55b04c419ba28d8058`, with a materially dirty working tree
- **Product authority:** [`../PRODUCT.md`](../PRODUCT.md)
- **Visual authority:** [`../DESIGN.md`](../DESIGN.md)
- **Implemented visual baseline:** [`IMPL_decision_ledger_instrument_grade_final_iteration.md`](IMPL_decision_ledger_instrument_grade_final_iteration.md)
- **Inventory authority:** [`APPX_whole_product_visual_coverage_ledger.md`](APPX_whole_product_visual_coverage_ledger.md)
- **Route authority:** [`../scripts/living-precision/manifest.mjs`](../scripts/living-precision/manifest.mjs)
- **Scope:** visual craft, interaction feedback, responsive presentation, state presentation, and audit tooling only
- **Identity:** the current Decision Ledger — Instrument Grade neutral/violet system

This document is a forensic implementation plan for a less capable execution
model. It deliberately leaves no visual-system choice, programme order, review
gate, or verification standard to that model.

No application code was changed while producing this document.

Read the whole document before executing it. Section 0 appears first because it
is the mandatory workflow gate; Sections 2–5 define the constraints and visual
contract that govern every step, including the audit.

---

## 0. `PC-00` — inventory, capture, score, and mandatory stop

Begin `PC-00` only after Malik explicitly authorises it. Once authorised,
`PC-00` may add or adjust audit-only scripts and audit artifacts; it may not
change product runtime, component, style, route, auth, API, or database code.

> **Hard stop — authenticated evidence is not authorised against the current
> database.** Playwright global setup and the existing capture runner call
> `/api/test/e2e-auth`; Supabase magic-link/OTP verification can create or
> update auth session, token, audit, or sign-in metadata. Merely keeping
> `/integrations` open can POST live verification, call providers, and update
> connection records. Under the present visual-only authority, do not run
> authenticated Playwright, authenticated capture, callback exchange, or live
> verification. Malik must separately approve a disposable, loopback-only
> Supabase clone with no user-owned records. Without that approval, run only
> static checks and non-authenticated evidence, issue a blocked `PC-00` packet,
> and do not proceed to `PC-01`.

### 0.1 Preflight

Run from the repository root and persist the output summary in
`docs/audits/premium-craft/00-preflight.md`:

```bash
git rev-parse HEAD
git status --short
node scripts/visual-rebuild/check-coverage-ledger.mjs
npm run verify:decision-ledger
npm run lint:authenticated-design
npm run test:decision-ledger:components
npm run typecheck
npm run lint
npm run verify:ui-parity
npm run validate:marketing-seed
```

Stop conditions:

- If any non-fixture command fails, record the failure and stop. Do not change
  application code to make an audit run.
- At the document date, the fixture validator failed with the counts recorded
  in Section 3.4. Re-run results are authoritative. If it remains red, record
  its exact counts, stop, and ask Malik for a separately authorised clean
  deterministic fixture. Do not run a seed command.
- Verify through non-secret fixture identifiers that Playwright's E2E merchant
  and the deterministic marketing server merchant are the same. If they
  differ, stop; do not edit `.env.local`, switch accounts, or copy identifiers
  into the report.
- Do not use previous screenshots as a substitute for this gate.

The preflight must identify the commit, dirty state, Node version, Next,
Playwright, Chromium revision, locale, timezone, device scale factor, fixture
fingerprint, server mode, and every base URL. Never include secrets.

Because HEAD does not identify this dirty tree, also record a deterministic
source fingerprint: SHA-256 over sorted path + content-hash entries for every
in-scope tracked and untracked source/config/test/doc file. Exclude `.git`,
dependencies, builds, evidence roots, `.env*`, storage state, and secret files.
Persist the tracked-diff hash and an in-scope untracked path/hash manifest; do
not persist file contents or secret identifiers.

### 0.2 Audit-only harness delta

The current strict capture is not an exhaustive Cartesian matrix. Add the
smallest audit-only layer needed to drive the existing manifest and capture
utilities:

```text
scripts/premium-craft/scenarios.mjs
scripts/premium-craft/source-fingerprint.mjs
scripts/premium-craft/launch-evidence.mjs
scripts/premium-craft/capture-matrix.mjs
scripts/premium-craft/validate-scorecard.mjs
scripts/premium-craft/build-comparison-sheet.mjs
```

Do not add capture flags or branches to production components. The scenario
runner may create states only through:

- existing query parameters and deterministic fixture paths;
- navigation to a real invalid identifier when the route already calls
  `notFound()`;
- Playwright request delay, abort, or deterministic response interception for
  loading/error/partial/stale presentation;
- real UI controls for dialogs, drawers, menus, disclosures, tabs, steps,
  expanded rows, filter-empty states, and disabled/read-only states; and
- existing development harnesses on the development server.

It may not POST/PUT/PATCH/DELETE, submit a real mutation, alter a user/session,
or persist state to the fixture. Network interception must be scoped to the
browser context and removed after each scenario.

If Malik separately authorises the disposable loopback clone, install a
default-deny browser request guard before authenticated navigation:

- abort or deterministically fulfil every POST/PUT/PATCH/DELETE before it can
  reach the server;
- always fulfil `/api/integrations/live-verification` with a declared fixture
  response so no provider call or connection write can occur;
- allow `POST /api/imports/csv/validate` only after source audit proves that
  the exact path is write-free, and still compare database fingerprints;
- assert every Supabase and provider origin is loopback/local; and
- treat any unapproved mutation attempt as a fatal evidence failure.

Mutation-state screenshots must be produced by deterministic in-browser
fulfilment or an existing separately authorised isolated harness. No mutation
may reach the shared fixture.

`validate:marketing-seed` checks counts and selected invariants; it does not
prove that every row is unchanged. In the separately approved disposable
environment, compute canonical before/after hashes for every seeded public
table row and relevant auth table without printing row data. Any unexpected
hash difference invalidates the run even when table counts still pass.

The script must fail on:

- console error or unexpected warning;
- unexpected page error, failed request, readiness timeout, or transient UI;
- document-level horizontal overflow at any width;
- privacy/fixture marker mismatch;
- expected route/status/destination mismatch;
- missing screenshot or score row;
- light/dark filename collision;
- a screenshot that is entirely blank, or skeleton-only outside a declared
  loading scenario; or
- a production 200 response from top-level document navigation to a
  development-only route.

### 0.3 Scenario authority

Generate `docs/audits/premium-craft/01-scenario-inventory.json` from, in order:

1. `scripts/living-precision/manifest.mjs` — 65 page entries;
2. `docs/APPX_whole_product_visual_coverage_ledger.md` — 95 route-state
   boundaries, 53 named nested views, 21 stateful owners, 4 embedded
   surfaces, and 34 additional visual owners; and
3. actual route query/control discovery recorded in Section 7 below.

Every scenario has:

```json
{
  "id": "R07.default",
  "routeId": "R07",
  "route": "/dashboard",
  "classification": "production",
  "session": "authenticated",
  "family": "analytical",
  "state": "default",
  "setup": { "kind": "navigate", "path": "/dashboard" },
  "mode": {
    "theme": "light",
    "reducedMotion": false,
    "forcedColors": false,
    "pointer": "fine",
    "textSpacing": "default",
    "zoom": 1
  },
  "expectedRequests": [],
  "expectedDiagnostics": [],
  "settlePolicy": "stable-content",
  "assertions": ["route-ready", "no-transient", "no-document-overflow"],
  "score": true,
  "mutationAllowed": false
}
```

Rules:

- One default scenario exists for every renderable route.
- Redirect routes contain destination/status/query/hash assertions and
  `score: false`. They must prove preservation of arbitrary safe query/hash
  values where the current redirect contract preserves them.
- Development routes run on the development server and separately assert a
  production 404. They use `score: false`; gallery/preview QA is a harness
  contract, not a production craft score.
- Each loading, error, not-found, empty, filtered-empty, stale, partial,
  disconnected, read-only, permission, success, modal, drawer, menu, expanded,
  and multi-step state present in the authoritative ledger receives a stable
  scenario ID.
- Provider detail includes every real provider slug and its connected,
  disconnected, degraded, planned, or unsupported state as supplied by the
  fixture. Do not synthesize missing capabilities.
- Duplicate visual states may share a setup helper but not disappear from the
  inventory; each owner retains a proof row.
- Every scenario names its exact owner file(s). A checked ledger row is not a
  visual pass.
- Loading scenarios use `settlePolicy: declared-loading`, assert the intended
  geometry and busy semantics, and may end skeleton-only. Tooltip/menu/toast
  scenarios use `settlePolicy: declared-transient` and assert that exact
  transient. Injected error scenarios name every expected failed/aborted
  request and expected diagnostic; each expected failure must be observed and
  consumed. Anything undeclared remains fatal.

### 0.4 Capture matrix

Use the existing fixture `UNAUTH_CLOCK_AS_OF`/as-of mechanism, `en-GB`,
`Europe/London`, Chromium, DPR 2, deterministic fixture, animations settled,
and one worker. Do not globally mock `Date` if that can change auth/session/
token expiry; freeze browser display-owned timestamps only after compatibility
is proven and recorded. Use a production build for production evidence and a
separate Next dist directory for development-only evidence. Never reuse an
unidentified running server.

Default production matrix:

| Surface | Viewports | Themes |
|---|---|---|
| Every production route | `1440x900`, `1280x800`, `1024x900`, `768x1024`, `390x844` | light and dark |
| Every production state/overlay scenario | same five widths unless its scenario declares a narrower real host contract | light and dark |
| Every development route | same five widths on development server; production 404 proof | light and dark |
| Four page-module redirects plus callback, proxy, and compatibility redirects | destination/status/query/hash at all five widths; no duplicate destination screenshot | light and dark |
| Chrome/Zendesk/Gorgias visual host surfaces | native `360px` and approximately `300px` host widths | supported light/dark plus forced-colour proof |
| Shopify checkout extension | zero-UI contract assertion only | not applicable |

The three requested desktop widths remain the product-comparison authority.
The 768 and 390 passes exist because current `PRODUCT.md` requires operability
when zoom/text scaling produces a narrower effective width. They do not
authorise a mobile redesign.

The 58 production manifest defaults produce `58 x 5 viewports x 2 themes =
580 screenshots`. R27 additionally requires the other 13 provider slugs, so
the known production default/required-variant floor is `580 + (13 x 5 x 2) =
710 screenshots`. Development, state, overlay, reduced-motion,
forced-colour, zoom, coarse-pointer, non-page redirect, and host proofs are in
addition to that floor. The generated manifest must state its final expected
and actual totals; no hard-coded prose total can waive a missing scenario.

Additional modes:

- reduced motion: every route family, all three signature scenarios, every
  overlay type, skeleton/spinner, chart update, and changed-value highlight;
- forced colours: every route family, all status families, data tables,
  charts, focus rings, overlays, and each embedded host;
- keyboard: every route family plus every menu/dialog/drawer/row-action owner;
- coarse pointer: shared controls and at least one dense owner per route family;
- text spacing: one representative of every layout family; and
- true browser 200% zoom: dashboard, work, case list, case detail, customer
  detail, losses, recoveries, reports, integrations, settings, auth,
  onboarding, and public proof. Viewport emulation alone is not this proof.

Store baseline files under the existing ignored evidence root using a validated,
unique run ID:

```text
artifacts/living-precision/premium-craft/baseline-SOURCE12-YYYYMMDDTHHMMSSZ/
```

The runner may clear only its fully resolved, run-specific output directory.
It must refuse `/`, `~`, the repository root, `artifacts/living-precision`, an
existing directory, or an unresolved environment variable as a deletion
target. Generate the run ID from the source fingerprint prefix and UTC time;
validate it against a narrow alphanumeric/hyphen pattern before path creation.

The manifest reports separate expected/actual totals for screenshots,
redirect/status assertions, non-image interaction proofs, and score rows.

### 0.5 Scorecard schema

Create:

```text
docs/audits/premium-craft/02-baseline-scorecard.json
docs/audits/premium-craft/03-baseline-review.md
```

Each route/state/viewport/theme capture receives one row:

```json
{
  "scenarioId": "R07.default",
  "route": "/dashboard",
  "state": "default",
  "viewport": "1280x800",
  "mode": {
    "theme": "dark",
    "reducedMotion": false,
    "forcedColors": false,
    "pointer": "fine",
    "textSpacing": "default",
    "zoom": 1,
    "overlay": "closed"
  },
  "screenshot": "artifacts/living-precision/premium-craft/baseline-.../R07.default--1280x800--dark--motion-full--colors-normal--pointer-fine--spacing-default--zoom-1--overlay-closed.png",
  "interactionEvidence": [],
  "automatedChecks": {
    "axeViolations": 0,
    "documentOverflow": false,
    "consoleErrors": 0,
    "pageErrors": 0,
    "keyboard": "pass"
  },
  "scores": {
    "typography": 1,
    "spacing": 1,
    "color": 1,
    "elevation": 1,
    "data": 1,
    "states": 1,
    "icons": 1,
    "motion": 1,
    "accessibility": 1,
    "responsive": 1,
    "trust": 1
  },
  "naRationales": {},
  "trustRationale": "Required route/state-specific rationale.",
  "findings": [],
  "provisionalReviewer": "executor:RUN_ID",
  "reviewedAt": "YYYY-MM-DDTHH:mm:ssZ",
  "approval": {
    "status": "pending",
    "reviewer": null,
    "reviewedAt": null
  }
}
```

The machine key is the full tuple `scenarioId + viewport + every mode field`;
`scenarioId` alone is not unique. Serialize the same normalized mode slug into
the filename, capture manifest, trace/video identity, and scorecard key.

Each applicable score is an integer:

| Score | Meaning |
|---:|---|
| 1 | unstyled/default, broken, or actively untrustworthy |
| 2 | substantial inconsistency or missing craft; not shippable |
| 3 | competent internal-tool quality; usable but visibly below the brief |
| 4 | premium, consistent, decision-safe, and shippable |
| 5 | exceptionally resolved at the Stripe/Linear/Mercury/Ramp/Vercel calibration bar without copying them |

An inapplicable dimension is represented only as `null`, with a matching
`naRationales.<dimension> = { "naCode": "APPROVED_CODE", "naReason": "..." }`.
It is allowed only from a route-family allowlist approved in the scenario
inventory before scoring. For example, data craft may be inapplicable to a
legal document. An executor may not mark a weak or absent implementation N/A
after seeing it.

Static screenshots are insufficient evidence for motion, focus, loading, or
keyboard quality. Interactive scenarios must attach a Playwright trace or
short deterministic video plus the relevant assertion results. Accessibility
scores must cite automated checks and manual keyboard/reading-order review;
they may not be assigned from appearance alone.

One row passes only when every applicable dimension is `>=4`, trust is `>=4`,
and there is no open P0/P1 finding. A route passes only when all its rows pass.
The product passes only when all production routes, states, viewports, themes,
and host surfaces pass. Never average a low score away.

For the `PC-00` packet, the executor supplies provisional scores under its run
identity and the validator runs in `packet` mode, which permits
`approval.status = pending`. Malik or a named human reviewer then approves or
returns the packet. Final validation requires `approval.status = approved` and
the named human reviewer/time on every required row.

The baseline review must group findings by root cause and shared owner, then
rank them:

- **P0:** misleading financial/data state, inaccessible critical task,
  production leak, destructive/unsafe interaction, or evidence invalidation;
- **P1:** route/state cannot meet 4 without a system or family fix;
- **P2:** local craft deficiency that does not block safe operation; and
- **P3:** optional refinement after all required rows pass.

### 0.6 Mandatory stop packet

Present exactly these items to Malik before `PC-01`:

1. preflight and blocker summary;
2. generated route/state/owner inventory;
3. capture manifest with expected/actual counts and environment identity;
4. contact sheets grouped by route family, then state, viewport, and theme;
5. complete 1–5 scorecard;
6. P0–P3 root-cause backlog with shared owner and affected scenario IDs;
7. proposed phase order and any estimate changes; and
8. explicit decision `A1`: whether Overview may change its presentation
   default from exposure to recovered cash, with the chart/link implications;
9. the status/owner of every external prerequisite in Section 3.4; and
10. a written statement that no application/runtime code, auth, or data was
   changed.

Wait for Malik to approve or reprioritise. Silence is not approval.

---

## 1. Implementation programme after approval

### `PC-01` — authority and audit enforcement

**Goal:** make this delta contract enforceable before visual migration.

Primary owners:

- this document, `DESIGN.md`, and the current rules/readme pointers;
- `scripts/check-authenticated-design.mjs`;
- `tailwind.config.ts`;
- `scripts/premium-craft/*` from `PC-00`;
- relevant package scripts; and
- `app/(app)/dev/design-system/DesignSystemGalleryClient.tsx`.

Work:

- point active visual-authority comments to this delta without deleting
  Instrument Grade history;
- update stale radius/type/surface comments before delegating component work;
- extend the detector to ordinary CSS literals, inline numeric styles,
  half-step layout utilities, public/auth/onboarding, Chrome/Zendesk, and
  generated Gorgias HTML;
- implement repository-local detector profiles for authenticated/product,
  public/editorial, and Pocket Brief host surfaces; do not force one profile's
  display/host tokens onto another;
- never modify the installed Impeccable skill, its detector source, or any
  global Codex skill file. All enforcement changes live in this repository;
- use a small reviewed exception file for external marks, one-/two-pixel
  strokes, chart geometry, host constraints, and optical transforms;
- make capture console/page/network failures fatal;
- replace the stale `<1024px` blocking assertions with reflow, main visibility,
  intentional-scroll containment, and task-operability assertions; and
- add gallery fixtures for every type, spacing, surface, elevation, state,
  table, chart, icon, theme, motion, and accessibility mode.

Exit:

- the new guard fails on a deliberate off-scale fixture and passes after it is
  removed;
- no allowlist entry is a directory-wide escape;
- no current product contract claims that the workspace is blocked below
  1024; and
- all `PC-00` evidence remains reproducible.

### `PC-02` — foundations and tokens

**Goal:** implement Section 4 at the root, with no route-local fixes.

Primary owners:

- `styles/authenticated/tokens.css`
- `styles/authenticated/typography.css`
- `styles/authenticated/foundations.css`
- `styles/authenticated/surfaces.css`
- `styles/authenticated/controls.css`
- `styles/authenticated/states.css`
- `styles/authenticated/status.css`
- `styles/authenticated/overlays.css`
- `styles/authenticated/tables.css`
- `styles/authenticated/responsive.css`
- `styles/authenticated/contracts.ts`
- `styles/authenticated/index.css`
- `components/ui/tokens.ts`

Work in this order:

1. canonical type roles and weights;
2. 4px layout spacing and controlled optical exceptions;
3. semantic neutral/violet exposure and dark mappings;
4. elevation and radius roles;
5. motion roles and reduced-motion equivalents;
6. focus, forced-colour, coarse-pointer, and z-index contracts; and
7. gallery visual checks in light/dark/forced-colour/reduced-motion.

Do not migrate route CSS until tokens, aliases, detector, and gallery agree.

Exit:

- no duplicate runtime override contradicts the documented role;
- every token is demonstrated in the gallery;
- light and dark hierarchy matches; and
- detector, typecheck, lint, decision-ledger verification, and component tests
  pass.

### `PC-03` — primitives, states, data, and icons

**Goal:** make ordinary consumers inherit the craft upgrade.

Primary owners:

- surfaces: `Surface.tsx`, `Panel.tsx`, `Card.tsx`, `SectionCard.tsx`,
  `AuthenticatedPanel.tsx`, `RegistrySurface.tsx`, `BoardSurface.tsx`,
  `JoinedSection.tsx`, `InsetGroup.tsx`;
- controls: `Button.tsx`, `ButtonLink.tsx`, `buttonStyles.ts`, `IconButton.tsx`,
  `Input.tsx`, `Select.tsx`, `FormField.tsx`, `Tabs.tsx`, `FilterChip.tsx`,
  `SegmentedControl.tsx`, `RowActionsMenu.tsx`;
- states: `LoadingSkeleton.tsx`, `LoadingState.tsx`, `EmptyState.tsx`,
  `OperationalState.tsx`, `Toast.tsx`, `Tooltip.tsx`, `Badge.tsx`,
  `StatusBadge.tsx`, new `StatusWithReason.tsx`, `LivenessIndicator.tsx`;
- overlays: `Drawer.tsx`, `Modal.tsx`, `OverlayPortal.tsx`, and
  `lib/design/useOverlayPresence.ts`;
- data: `DataTable.tsx`, `DataTableServer.tsx`, `FinancialEquation.tsx`,
  `ChartFrame.tsx`, chart tooltip/theme/motion primitives, and chart CSS; and
- icon-glyph consumers identified by `PC-00`.

Do not delete surface APIs merely to reduce the export count. First assign each
existing primitive one semantic job, migrate consumers, then deprecate only a
truly redundant API with tests.

Specific migrations in this phase:

- remove `Toast.tsx`'s 3px semantic side stripe; retain meaning through the
  shared icon, text, and restrained local fill, and move dismiss to the shared
  icon target;
- change the skeleton visual-delay role from the current roughly 180ms to
  about 300ms while keeping immediate `aria-busy`/status semantics;
- remove route/component hover translation and raw `120/190ms` timing in
  dashboard/chart controls in favour of Section 4.5 roles;
- require `description` and `action` in `EmptyState`, require table
  `emptyState`, and add `StatusWithReason` as defined in Section 4.7; and
- migrate text-glyph controls to Lucide without replacing prose notation or
  provider marks.

Exit:

- all ordinary controls pass the state matrix;
- all empty/loading/error/stale/read-only variants have gallery fixtures;
- semantic table columns own alignment;
- charts keep accessible tables and custom tooltips;
- interface glyphs are removed or documented as valid prose/geometry; and
- keyboard, focus return, coarse pointer, reduced motion, and forced colours
  pass at primitive level.

### `PC-04` — shell, navigation, global overlays, and route boundaries

**Goal:** make global ownership consistent without changing shell geometry.

Primary owners:

- `app/layout.tsx`, `app/(app)/layout.tsx`, `app/(app)/template.tsx`;
- `components/system/DesktopRequiredBoundary.tsx`;
- `components/layout/AppHeader.tsx`, `AvatarMenu.tsx`, `CommandPalette*.tsx`,
  `WorkspaceSwitcher.tsx`, `MerchantEnvChip.tsx`, `ContextCreditsBadge.tsx`;
- `components/navigation/AppNavLink.tsx`, `NavigationProvider.tsx`,
  `RouteProgressBar.tsx`, `RoutePendingNotice.tsx`, `ScrollToTop.tsx`;
- app-, family-, and route-level loading/error/not-found modules; and
- global banners, connection gates, billing/upgrade notices, feature gates,
  and permission states from the coverage ledger.

Keep the shell dimensions and navigation behaviour. Apply the system state,
type, spacing, target, and motion contracts; ensure route pending feedback does
not compete with page content.

For existing routes that already call `notFound()`, a scoped visual boundary
may be added without changing the data path. Do not change claims/recovery
missing-record redirects or add new auth/product states in this phase.

Exit:

- no duplicate full-violet action competes with active navigation;
- shell/portal axe scans include the whole document;
- reflow below 1024 keeps navigation and critical actions operable;
- loading/error/not-found geometry matches the destination family; and
- no route has document-level overflow.

### `PC-05` — operating registries and queues

**Routes:** R02 `/claims`, R07 `/dashboard` baseline only, R13
`/notifications`, R21 `/work`.

Principal owners include `ClaimsPageView`, `ClaimsQueueClient`,
`DashboardOverview`, `WorkQueuePulse`, `WorkQueue`, `NotificationCentre`, and
their route loading/error modules.

Work:

- normalise type/spacing/control/table/state/icon use without changing the
  existing composition or query contract;
- preserve every saved view, queue, filter, sort, page, URL state, row action,
  and permission;
- keep attention reasons visible or disclosable at narrow widths;
- make search/filter-empty distinct from true zero-work states; and
- do not apply the Overview signature treatment yet.

Exit: every default/query/empty/loading/error/selection/action state for these
routes is `>=4`; `R07.signature-recovered` remains explicitly deferred to
`PC-10` and blocked on `A1`.

### `PC-06` — cases, customers, financial objects, and connected objects

**Routes:** R01, R04–R06, R09, R11–R12, R14–R20.

Principal families:

- case detail and evidence creation;
- customer registry/profile/preview;
- losses registry/detail and recovery board/detail; and
- order, shipment, refund, return, ticket, and dispute connected-object detail.

Use the existing `DetailPageShell`, `ConnectedObjectDetail`, evidence,
recovery, timeline, action, and relationship owners. Converge labels,
qualifiers, state surfaces, numeric alignment, iconography, and responsive
inspectors. Preserve the case detail composition and defer only the evidence
trail signature treatment to `PC-10`.

Exit:

- no action or trust qualifier disappears during reflow;
- entity detail loading/error/current not-found behaviour remains unchanged;
- financial values never imply zero when unavailable; and
- every evidence source/finding/inference/action remains semantically distinct.

### `PC-07` — reports and chart-heavy analysis

**Routes:** R32 `/reports` and R33 `/reports/records`.

Primary owners:

- `components/reporting/IntelligenceReportView.tsx`
- `components/reporting/DashboardCharts.tsx`
- authenticated chart components/CSS
- `components/ui/FinancialEquation.tsx`
- `components/ui/DataTableServer.tsx`
- report page, records page, exports, loading, and error owners

Normalise the baseline first: chart scale/timing/tooltip/data table, record
alignment, empty/partial/reconciliation state, filters, and export feedback.
Do not promote the recovered-cash signature until `PC-10`.

Exit: all report rows reach `>=4`; single-currency scenario
`R32.signature-recovered-headline` remains explicitly deferred to `PC-10`;
route parameters and records/export destinations remain exact.

### `PC-08` — rules, flows, integrations, and settings

**Routes:** R22–R25, R27–R31, R34–R48, R50–R51; R28 runs in development.

Work by family, not arbitrary route order:

1. rule registries, recovery rulebook, and version workbench;
2. flow registry, builder, runs registry, and run detail;
3. integrations catalogue, provider health/detail, imports, and ShipBob
   selection;
4. settings shell, account/team/billing/privacy/agreements/audit/API/platform/
   notifications; and
5. connector setup routes for Chrome, Freshdesk, Gorgias, Shopify, and Zendesk.

`IntegrationsWorkspace.module.css`, builder workbenches, and settings clients
are high-risk off-scale owners. Migrate their ordinary controls and local type/
spacing values; preserve provider capability, connect/disconnect/sync logic,
secrets handling, validation, mutations, and all disabled/read-only states.

The 14 `/integrations/[provider]` slugs receive explicit scenario proofs.
Planned providers remain planned; never make a planned integration look
connected merely for visual completeness.

Exit:

- builders retain full keyboard/dirty/publish/test/version behaviour;
- integration health gives a plain-language reason locally;
- settings danger/privacy/billing actions remain unambiguous and are not made
  more prominent for style; and
- no auth, secret, provider, database, or billing behaviour changes.

### `PC-09` — public, auth, onboarding, help, legal, and Pocket Briefs

**Routes:** R26, R52–R63, with R65 development/production-status proof.

Keep each mode's established density and composition. Share role values and
behaviour, not authenticated card anatomy.

- Auth: preserve `AuthShell` split/form composition, validation, failure, and
  safe `next` behaviour. Log missing/ambiguous auth states; do not invent or
  fix them in visual code.
- Onboarding: preserve stages, provider actions, success/return logic, and
  separate shell.
- Public: preserve navigation, copy, real proof, plans, and legal meaning. No
  generated imagery or conceptual marketing rewrite.
- Help/legal: optimise reading rhythm, focus, navigation, print, and state
  presentation without changing legal copy.
- Pocket Briefs: derive a small host-specific token subset for Chrome,
  Zendesk, and Gorgias; add focus-visible, hover/active/disabled/loading,
  reduced-motion, forced-colour, and truthful host states at approximately
  `300/360px`. Shopify checkout remains an explicit zero-UI integration;
  audit the install/callback transitional HTML without changing OAuth.

Exit: responsive `390/768/1024/1280/1440`, light/dark where supported,
keyboard, reduced-motion, forced-colour, and host constraints pass.

### `PC-10` — three signature moments only

Implement Section 5 in this order:

1. Overview recovered-cash figure;
2. Case Detail evidence trail; and
3. Reports recovered-cash headline.

Do not begin until the corresponding route baseline is already `>=4`. Use
shared signature type/motion roles; do not create a generic “wow card” or apply
the treatments elsewhere.

Overview work is additionally blocked until `A1` is explicitly approved.
Reports uses its signature only for the safe single-currency scenario; it does
not choose or prioritise a currency in an unselected multi-currency report.

Exit: the A1-approved Overview and Case Detail have exactly one focal
treatment; the single-currency Reports scenario has exactly one, while its
multi-currency scenario uses the safe non-signature fallback. Every treatment
has a reduced-motion equivalent, truthful unavailable/partial/stale state, and
no second competing flourish.

### `PC-11` — cross-product state, responsive, theme, and accessibility sweep

Use the scenario manifest rather than memory. Resolve only remaining shared or
local craft defects. Required focused sweeps:

- long merchant/provider/customer/rule/flow names and unbroken identifiers;
- GBP and non-GBP currency lengths, zero, negative/large values, dates, and
  percentages;
- light, dark, high contrast, forced colours, reduced motion, text spacing,
  200% zoom, coarse pointer, and keyboard-only;
- overlays, portal content, focus trap/return, Escape, outside click, and
  scroll lock;
- loading beyond 300ms, slow-load notice, initial error, refresh error, stale,
  partial, disconnected, read-only, no-permission, first-use empty,
  filtered-empty, success, and not-found;
- intentional table/board horizontal scrolling contained within its owner;
- page and console errors; and
- every link, export, row action, mutation, and permission regression in the
  functional parity manifest.

Exit: there is no known P0/P1 finding and every provisional score row is at
least 4.

### `PC-12` — final evidence, tests, and release packet

Re-run the exact baseline scenario manifest, environment, fixture, viewport,
theme, clock, locale, timezone, DPR, and browser revision. Any justified
manifest change must appear as an explicit baseline/final mapping; never omit
a failed row.

Generate:

```text
docs/audits/premium-craft/04-final-scorecard.json
docs/audits/premium-craft/05-before-after.md
docs/audits/premium-craft/06-final-verification.md
artifacts/living-precision/premium-craft/final-SOURCE12-YYYYMMDDTHHMMSSZ/
```

The before/after sheet uses the same scenario, viewport, theme, crop, fixture,
and browser configuration side by side. Pixel diff is a triage aid, not a
quality score. Include every touched route and every scenario whose shared
primitive changed; because foundations are product-wide, expect whole-product
coverage.

Exit only when Section 9 is fully satisfied.

---


## 2. Scope and non-negotiables

### 2.1 The task is a finish pass, not a redesign

The current product is coherent and substantially implemented. Keep all of the
following unchanged:

- Inter-family typography and the existing central font loading;
- cool neutral surfaces, graphite text, violet interaction language, and the
  existing semantic status colours;
- authenticated shell, route structure, navigation model, page composition,
  information architecture, and current primary objects;
- public, auth, onboarding, authenticated, and embedded product modes;
- data calculations, status meanings, permissions, mutations, APIs, and
  source-versus-inference boundaries;
- real missing, stale, partial, disconnected, read-only, error, and empty
  states; and
- every existing test unless a test demonstrably contradicts newer product
  authority. A contradictory test must be replaced with an equal or stronger
  assertion, never deleted or weakened.

The job is to make the existing product feel precise, calm, expensive, and
decision-safe through scale discipline, rhythm, restrained depth, state craft,
data alignment, icon consistency, and feedback.

### 2.2 Absolute prohibitions

The executor must not:

- change authentication, passwords, credentials, environment secrets, users,
  accounts, merchants, database records, or seeded records;
- run `npm run seed:marketing`, `npm run seed:demo`, release rehearsals, or any
  other database-mutating setup command under this programme;
- print, copy, edit, or commit `.env.local`, an E2E secret, or Playwright
  storage state;
- invent financial values, loss classifications, provider capability, missing
  states, permissions, or product behaviour in presentation code;
- introduce another palette, font, icon library, chart library, visual theme,
  feature flag, screenshot-only production branch, gradient, glass, blur,
  decorative texture, or generated image;
- imitate iOS, macOS, Liquid Glass, SF Symbols, or Apple product chrome;
- restructure the shell or page information architecture to make screenshots
  cleaner;
- use route-local shadows, arbitrary sizes, arbitrary timing, or a second
  component system;
- mass-format the repository, reset the worktree, delete user changes, or fold
  unrelated dirty files into a craft commit; or
- start `PC-01` before the `PC-00` packet has been reviewed and Malik has
  explicitly approved implementation.

### 2.3 Authority resolution for known conflicts

Use these decisions literally:

| Conflict | Decision for this pass |
|---|---|
| Latest brief versus prior visual plans | The latest brief controls craft mechanics. `PRODUCT.md`, real behaviour, and data contracts still control what the product does. |
| Resting elevation versus Instrument Grade flat surfaces | Joined, inset, and document-flow working surfaces remain tonal and flat. A truly isolated top-level card may use the one resting elevation token; an interactive isolated card may use the one hover token. Menus/popovers and modal/drawer surfaces retain their own tiers. Never turn nested sections into cards. |
| Uppercase KPI-label example versus sentence-case identity | Keep sentence case. The uppercase treatment in the brief is an example, not permission to alter the approved language system. |
| Authenticated desktop floor versus accessibility reflow | Optimise for `>=1024px`, but keep the product operable below 1024 for browser zoom, text scaling, and narrow windows. `DesktopRequiredBoundary.tsx` is now a compatibility wrapper. The `<1024px` blocking assertions in `tests/current/accessibility-responsive.spec.ts` are stale and must be replaced with reflow assertions. Do not restore the blocker. |
| Loss-bucket colour request versus data truth | Define presentation tokens only for domain keys already supplied by the reporting/loss models. Never infer, combine, or recalculate carrier loss, warehouse error, repeat claimant, or policy override in UI code. If a route lacks the key, log a data-capability finding and retain its current truthful taxonomy. |
| “Every page” versus redirects/development pages | Score all 58 production page modules. Give the four page-module redirects plus callback/proxy/compatibility URLs redirect proofs, not fake page scores. Verify all three development pages in the correct environment; R65 must be a production 404. Audit the four ledger embedded contracts and the Chrome popup stateful owner at their real host contract. |

### 2.4 Dirty-worktree rule

The current worktree already contains extensive user changes. Before every
phase:

1. record `git status --short` and `git diff --stat` in the phase notes;
2. identify only the files owned by that phase;
3. inspect the pre-existing diff for every file before editing it;
4. edit incrementally without reverting unrelated hunks;
5. review `git diff -- path/to/owned-file` after each coherent change; and
6. do not stage or commit unless Malik separately asks for it.

---

## 3. Evidence-backed baseline

### 3.1 What is already strong and must survive

- The route manifest and whole-product coverage ledger are comprehensive.
- The authenticated system has a central ordered stylesheet, role-based light
  and dark colours, meaningful semantic states, a shared focus treatment,
  forced-colour fallbacks, reduced-motion handling, and geometry-aware
  skeletons.
- Inter is loaded centrally and tabular numerals already apply broadly to the
  authenticated and auth roots.
- The shared data table has semantic headers, sortable ARIA, calm dividers,
  real links/buttons, and numeric alignment support.
- Charts use shared frames, custom tooltips, accessible data tables, theme
  bridging, zero/null distinction, currency guards, and aggregation checks.
- Overlay presence already owns focus trap, Escape, scroll lock, focus return,
  and reduced-motion behaviour.
- `LivenessIndicator` separates connection, activity, freshness, and time
  rather than reducing them to an unexplained status.
- Current `npm run verify:decision-ledger` passes 24 checks; the coverage
  checker reports 65 pages, 7 layouts, 95 route-state boundaries, 53 named
  nested views, 21 stateful owners, 4 embedded surfaces, 34 additional visual
  owners, and 279 required files/entries.
- `npm run lint:authenticated-design` currently passes 505 files with a zero
  ratchet. This proves the existing guard, not the absence of off-scale CSS.

### 3.2 What is not yet proven

Do not quote prior plan scores as current scores. No valid premium-craft score
exists yet.

The current `.impeccable/final-living-precision/run-a` evidence is useful but
incomplete:

- it captures all renderable routes only at 1440 light;
- 1024 coverage is limited to selected edge routes;
- 1280, dark, reduced-motion, and forced-colour captures are limited to seven
  flagships;
- its scorecard is blank, uses an older `0–4` schema, and has no reviewers;
- its manifest is blocked because R65 returned 200 in production and two
  product-proof WebP hashes differ from deterministic candidates; and
- there is no Run B.

Therefore source observations below are priority signals, not fabricated
route scores. `PC-00` must capture first and score second.

### 3.3 Source-level gaps that the audit must confirm visually

| Area | Current evidence | Required outcome |
|---|---|---|
| Type scale | Runtime roles introduce `15/18/20/23/38px`; route CSS contains `10/11/17/22/40/44/48px` and responsive clamps. | Profile-scoped named ladders; no production component literal sizes. |
| Spacing | Tokens expose `2/6/10px`; source scan found hundreds of half-step utilities plus odd CSS literals. | Margin, padding, gap, inset grouping, and designed rhythm use the 4px profile. One- and two-pixel values remain only for borders, strokes, focus rings, and documented optical corrections. |
| Surface ownership | `Surface`, `Panel`, `Card`, `SectionCard`, and `AuthenticatedPanel` overlap; comments disagree with runtime radii. | One documented mapping from semantic surface kind to primitive and elevation. No wholesale API churn merely for naming. |
| Empty states | `EmptyState` permits missing context/action; shared tables can fall back to bare “No matching records.” | Every empty/filtered-empty/disconnected state contains one contextual sentence and a truthful primary recovery action. |
| Trust states | `StatusBadge` can render “degraded” without requiring the adjacent reason. | Vague/qualified states always expose the plain-language cause locally. |
| Loading | Existing delayed skeleton constant is about 180ms. | Busy semantics remain immediate; geometry skeletons become visible only when work remains unsettled at about 300ms. |
| Controls | Source includes many raw buttons and route-specific controls. | Ordinary controls converge on shared primitives; specialised grid/chart controls keep bespoke markup only with the full state contract. |
| Tables | Manual `align` leaves numeric correctness to every caller. | Semantic column kinds automatically own text/numeric/date/status alignment and tabular numerals. |
| Charts | Shared foundation is strong; chart CSS contains off-scale type, spacing, radii, and timing. | Preserve chart contracts; normalise presentation tokens and use explicit domain colour mappings only. |
| Icons | Lucide is canonical, but production controls still use `▲`, `▼`, `✕`, `✓`, `○`, `–`, and other glyphs as interface icons. | Lucide for control/status meaning at one stroke/optical size; prose arrows and chart geometry remain allowed. |
| Responsive | Current code reflows, while one current test still expects a blocking screen. Some narrow dashboard CSS hides explanatory text. | Reflow remains operable; essential reasons disclose or stack and never disappear. Tests reflect the current product contract. |
| Non-auth surfaces | Chrome, Zendesk, and Gorgias use local palettes, off-scale values, incomplete interaction states, or missing accessibility modes. | Host-native token subsets derived from canonical roles, verified at real host widths. |
| Audit tooling | Current guard misses ordinary CSS literals, half-step utilities, public/auth/embedded files, shell/portal axe issues, and collected capture console errors. | Guard, capture, and accessibility tooling enforce the final whole-product contract. |

### 3.4 Current blockers that are not craft work

These findings must appear in the `PC-00` packet. Do not repair them inside a
visual phase:

1. On 31 July 2026, `npm run validate:marketing-seed` reported fixture drift:
   `merchant_users` expected 4/found 5 and `domain_events` expected 2/found 31.
   Deterministic evidence cannot be claimed while this is red. Do not run the
   mutating seed command; ask Malik for a separately authorised clean fixture.
2. R65, `/landing/prototypes/unauth-case-detail`, returned 200 in the existing
   production capture although the manifest requires 404.
3. The two deterministic product-proof image hashes currently disagree with
   the captured WebP files. Do not regenerate or replace images in this pass.
4. `tests/current/accessibility-responsive.spec.ts` still asserts the retired
   desktop-blocking behaviour below 1024. This is test-authority debt; after
   approval, replace it with equal-or-stronger reflow coverage.
5. `tests/reports/results.json` is stale red evidence and cannot be cited as a
   current run.
6. Route audit findings involving login redirects, signup/session behaviour,
   signed customer links, team callback paths, accounts, or user records are
   auth/product findings only. Record them in the audit; never fix them here.

Re-run evidence, not this prose, determines current status. Fixture validity,
R65 production gating, and deterministic product-proof hashes are external
prerequisites owned outside the craft phases. The executor must not repair them
without separate authorisation. `PC-12` and the final definition of done remain
blocked until the relevant owners resolve them and fresh read-only verification
passes.

---

## 4. Final craft system contract

Implement this contract in `PC-01` and `PC-02`; route phases may consume it but
may not redefine it.

### 4.1 Typography

Keep the current family. The authenticated product, product forms, and
onboarding use this core ladder:

| Token role | Size / line height | Weight | Use |
|---|---:|---:|---|
| `metadata` | `12/16` | 500 | timestamps, provenance, qualifiers, compact badge text |
| `caption` | `12/16` | 400 | secondary supporting copy |
| `dense` | `13/18` | 400 | dense tables, compact operational content |
| `label` | `13/18` | 500 | field labels, control labels, metric labels |
| `body` | `14/20` | 400 | default prose and cell text |
| `body-strong` | `14/20` | 600 | genuine row/paragraph anchors |
| `compact-title` | `16/22` | 600 | card title, grouped control heading |
| `section-title` | `18/24` | 600 | page section heading |
| `dialog-title` | `20/28` | 600 | modal/drawer title |
| `detail-identity` | `24/30` | 650 | case/object identity |
| `page-title` | `28/34` | 650 | route title |
| `kpi` | `32/38` | 600 | supporting large numbers |
| `hero-value` | `40/44` | 650 | dominant non-signature value |
| `signature-value` | `48/54` | 650 | only the Overview and single-currency Reports signature figures |

Public/editorial surfaces reuse the core `12–24px` roles and add named display
roles only: `32/38`, `40/46`, `48/54`, `56/62`, `64/70`, and `72/76`, at
600/650. The `56/62` role may also remain on the non-form AuthShell context
panel. Do not force public hero/editorial composition into authenticated page
roles, and do not use a public display role inside an operational table/form.

Pocket Brief host surfaces use a compact profile only: `12/16` metadata,
`13/18` dense, `14/20` body, `16/22` title, `18/24` section, `20/24` value, and
`24/28` host headline. Their tokens derive from the same Inter/neutral/violet
roles but do not import authenticated page/display sizes.

Rules:

- Keep sentence case. Do not add generic uppercase/letter-spaced eyebrows.
- Keep the existing mono face only for technical identifiers, code, hashes,
  and provider references at the `metadata` or `dense` role. Financial values
  and product prose stay in Inter.
- Reserve 600/650 for hierarchy anchors. Do not make whole surfaces semibold.
- Use `font-variant-numeric: tabular-nums` for every numeric series, table
  column, amount, count, percentage, date sequence, duration, and metric.
- Use proportional numerals only for prose in which digit alignment is
  irrelevant.
- Preserve explicit currency codes, scope, time range, freshness, and
  partial/approximate qualifiers adjacent to the value they qualify.
- No production component may declare a literal `font-size`. Components
  consume named, profile-scoped type-role utilities; generic Tailwind text
  sizes are not substitutes because their line heights differ. Provider marks
  and truly external host constraints require a narrow documented exception.
- Recharts/library call sites resolve named roles through one typed JavaScript
  token resolver owned beside `lib/visualisation/chartContract.ts`; do not add
  literal/allowlist exceptions at each chart.

Primary touchpoints:

- `styles/authenticated/typography.css`
- `styles/authenticated/tokens.css`
- `tailwind.config.ts`
- `components/ui/pageShellStyles.ts`
- `app/(app)/dev/design-system/DesignSystemGalleryClient.tsx`
- `scripts/check-authenticated-design.mjs`

### 4.2 Spacing and rhythm

Canonical layout steps are:

```text
0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
```

- Margin, padding, gap, grid gap, logical inset used for layout, and row/section
  spacing must use one of those values.
- The ladder does not govern chart/SVG geometry, data-derived dimensions,
  overlay placement coordinates, breakpoints, responsive widths, percentages,
  `calc()`, or externally imposed host dimensions. Those values still require
  named ownership and may not be used as disguised layout spacing.
- `1px` and `2px` are permitted only for borders, icon strokes, focus rings,
  progress/selection indicators, and a named optical correction. They are not
  layout spacing.
- Deprecate `--ua-space-0-5`, `--ua-space-1-5`, and `--ua-space-2-5` for layout.
- Related label/value/control clusters use `8–12px` internal spacing.
- Independent groups use at least `24px`; major route regions use `32–48px`.
- The dominant decision/value receives the most whitespace. Do not create that
  emphasis through an extra border, background colour, or decorative heading.
- Authenticated gutters are exactly `32px` at `>=1280`, `20px` at
  `1024–1279`, and `16px` below 1024. Public/editorial surfaces preserve their
  current container/breakpoint composition but map all designed spacing to the
  public profile's same 4px ladder.
- Pocket Brief spacing is `4, 8, 12, 16, 20, 24px`. Preserve the host-required
  `38px` visual control height as a documented host-dimension exception, with a
  `44px` accessible hit area. Replace Pocket Brief's current 7/9px radii with
  the shared 8px control and 12px host-card radii.

### 4.3 Colour roles

Keep the existing neutral/violet values. Preserve internal ramp and
compatibility aliases until every consumer is migrated; expose these semantic
roles as the only new-consumer API:

| Role | Meaning |
|---|---|
| `canvas`, `surface-primary`, `surface-secondary`, `surface-muted`, `surface-hover`, `surface-selected` | Neutral depth only |
| `text-primary`, `text-secondary`, `text-tertiary`, `text-disabled`, `text-link` | Existing text hierarchy |
| `accent-wash`, `accent-subtle`, `accent-base`, `accent-hover`, `accent-pressed`, `focus` | Existing violet ramp mapped to interaction purpose |
| existing success/warning/critical/information triplets | Semantic status only, never categorical decoration |

- Full-strength filled violet appears only on the one primary filled action in
  a view and the current filled selection/active navigation treatment. This
  restriction does not suppress accessible violet link text, selection text/
  strokes, focus rings, or the global navigation marker when they are not
  competing filled controls.
- Secondary actions, chart marks, links, filters, badges, and supporting
  emphasis use neutral ink, a violet tint, or a low-opacity wash.
- If two full-violet controls compete in one viewport, demote all but the true
  primary action/current selection.
- No route-level raw hex/RGB/HSL and no new hue.
- Dark mode maps the same semantic roles; do not invert hierarchy mechanically.
- All text and meaningful icons must meet WCAG 2.2 AA in every state.

### 4.4 Elevation, border, and radius

Use exactly these semantic tiers:

| Tier | Treatment | Allowed owners |
|---|---|---|
| `flat` | tonal surface, no shadow | joined, inset, table, chart interior, in-flow working region |
| `resting` | one neutral surface-step shift + `--ua-shadow-raised` | isolated top-level card only |
| `hover` | same surface + new `--ua-shadow-hover`; no translation | clickable isolated card only |
| `floating` | existing `--ua-shadow-float` | tooltip and compact popover |
| `menu` | existing `--ua-shadow-menu` | dropdown and command palette |
| `overlay` | `--ua-shadow-overlay` | modal and drawer |

- Shadows never separate nested sections. Use whitespace, alignment, or one
  low-contrast hairline there.
- Keep radii `4px` small/detail, `8px` control, `12px` card/surface, `16px`
  overlay, and round only for avatar/status pills.
- Metadata tags use the control radius. Status badges alone may use the round
  radius. Do not mix pill and tag anatomy for the same concept.
- No hover lift, scale, glow, gradient, or border-thickening.
- Resting elevation is an explicit semantic prop/class on an eligible isolated
  surface; never make it the default for every `.ua-card`/panel.
- Forced colours replace tonal/shadow separation with visible system-colour
  boundaries; a surface may not disappear when shadows are suppressed.

Primary touchpoints: `tokens.css`, `surfaces.css`, `Surface.tsx`, `Panel.tsx`,
`Card.tsx`, `SectionCard.tsx`, `AuthenticatedPanel.tsx`, `RegistrySurface.tsx`,
and `BoardSurface.tsx`.

### 4.5 Motion and feedback

Use these roles only:

| Role | Duration | Use |
|---|---:|---|
| `instant` | `0ms` | reduced motion / immediate state |
| `press` | `80ms` | pressed feedback |
| `hover` | `150ms` ease-out | hover and focus-visible |
| `base` | `200ms` | local disclosure/state crossfade |
| `panel` | `240ms` | drawer, modal, panel entrance/exit |
| `data` | `360ms` | chart path/value transition after an explicit input change |
| `highlight` | `700ms` | one-shot changed-value wash |

Easing is not left to callers: press/data/highlight use existing
`--ua-ease-standard: cubic-bezier(0.2, 0, 0, 1)`; hover/base/panel entrance use
`--ua-ease-enter: cubic-bezier(0.16, 1, 0.3, 1)`; panel exit uses
`--ua-ease-exit: cubic-bezier(0.4, 0, 1, 1)`.

- Animate only `opacity`, `color`, `background-color`, `border-color`,
  `box-shadow`, and documented overlay transforms. Do not animate layout.
- Never use `transition: all`.
- No continuous ambient motion. Skeleton shimmer and spinner motion stop under
  reduced motion; pending work still has static text/icon feedback.
- Every motion communicates a state change. Content remains understandable
  when motion is removed.
- Route/resource busy state is announced immediately. Show geometry-matched
  skeletons only if the route/resource is still unresolved at about `300ms`.
  Reserve final geometry from first render or retain safe prior content so the
  delay creates neither a blank region nor layout shift.
- The focus ring itself appears immediately; only its colour may transition
  over the hover role.
- Drawers/modals preserve existing focus management and return focus to the
  trigger.

### 4.6 Interactive-state contract

Every button, icon button, link, row action, tab, filter, disclosure, field,
menu item, switch, selectable card, chart control, and embedded-host control
must explicitly cover:

Default, hover, focus-visible, active/pressed, and disabled apply wherever the
element can enter that state. Loading/error/success rows apply only to controls
whose declared product contract includes asynchronous work; do not invent
states or domain outcomes merely to fill the matrix.

| State | Required behaviour |
|---|---|
| Default | correct role, label, affordance, target, and contrast |
| Hover | 150ms role-based colour/surface/shadow change; no layout shift |
| Focus-visible | system focus ring with at least 3:1 adjacent contrast; never browser-default styling |
| Active/pressed | 80ms pressed role; `aria-pressed`, selected state, or current state where applicable |
| Disabled | non-interactive semantics, legible reason/context where consequential, no misleading hover |
| Loading | accessible name remains; `aria-busy`/status as appropriate; duplicate activation blocked |
| Error | specific local cause and truthful recovery action; previous safe data remains visible if available |
| Success | concise confirmation adjacent to the affected region; no colour-only meaning |

Normal desktop controls retain current visual density. Under coarse pointer,
interactive targets become at least `44x44px` without making desktop controls
look oversized.

Use `32px` compact, `36px` default, and `40px` large visual control heights.
Icon-only desktop controls use a `32x32px` target. Retire the current `30px`
control height during primitive migration; do not leave both 30 and 32 as
competing compact sizes. Coarse-pointer hit areas expand to at least `44x44px`
through the shared control contract.

### 4.7 Empty, unavailable, stale, and partial states

Extend the presentation-only `OperationalState` contract with at least the
following variants. It composes existing data/domain states; it does not
replace Next loading/error/not-found boundaries, domain state machines, status
enums, or permission logic:

- `empty-first-use` — why the surface is empty + one setup/create action;
- `empty-filtered` — the active filter/search caused the result + clear/reset;
- `empty-complete` — nothing requires action + one relevant navigation or
  refresh action;
- `disconnected` — source missing + connect/review source action;
- `unavailable` — value cannot be known, explicitly not zero;
- `stale` — last known value remains visible with timestamp and refresh path;
- `partial` — exact coverage limitation adjacent to affected values;
- `read-only`/`no-permission` — what remains viewable and who/what can change it;
- `error-initial` — no data shown, specific failure and retry;
- `error-refresh` — last safe data remains, failed refresh is explained; and
- `not-found` — requested object is unavailable with a truthful route back.

`DataTable` and `DataTableServer` may not silently synthesize a bare “No
matching records.” Every caller supplies a contextual state or uses a shared
default that includes context and a safe action.

The shared empty-state type requires both `description` and `action`; neither
is optional. A route may use a visually quiet text link for the action when a
full primary button would overstate urgency, but it may not omit the recovery
path.

Make the `emptyState` renderable required on both `DataTable` and
`DataTableServer`; remove their internal bare-text fallback after every caller
has migrated. Add `components/ui/StatusWithReason.tsx` as the composition for
qualified/vague status values: it renders the existing `StatusBadge` plus a
required adjacent plain-language `reason`. Keep `StatusBadge` atomic for
self-explanatory states such as a literal recorded outcome.

### 4.8 Tables

Extend the shared column contract to semantic kinds:

```ts
type DataTableColumnKind =
  | "text"
  | "number"
  | "money"
  | "percentage"
  | "date"
  | "status";
```

- `number`, `money`, and `percentage` right-align header and cells and always
  use tabular numerals.
- `text`, `date`, and `status` left-align unless a documented exception exists.
- Preserve the existing trailing `rowActions` contract separately from data
  column kinds; it is end-aligned, labelled for assistive technology, and
  never uses an unlabeled glyph.
- Keep the existing calm anatomy: strong header, generous row height, 1px
  low-contrast row dividers, no zebra striping, no heavy grid.
- Preserve `44px` compact and `56px` rich/comfortable row targets unless
  `PC-00` evidence explicitly approves a family-specific change. Never shrink
  below the readable dense role.
- Long content wraps or truncates with an accessible full-value path. Numeric
  columns never wrap.
- Sorted, selected, loading, empty, disabled, expanded, and row-action states
  must be keyboard and screen-reader complete.

### 4.9 Charts

- Keep `ChartFrame`, shared tooltips, accessible tables, null/zero distinction,
  theme bridging, and aggregation checks.
- No Recharts/browser defaults may leak through.
- Gridlines are low-opacity neutrals. Tooltips expose series, exact value,
  currency/unit, bucket/time, qualifier, and comparison basis.
- Labels and links use real report/loss model keys. Never derive taxonomy in a
  component.
- Add no dead mapping. Only when `PC-00` identifies a real chart consumer whose
  exported domain type contains these keys, define the corresponding named
  chart tokens in one shared mapping:

| Domain key | Visual role | Non-colour distinction |
|---|---|---|
| `carrier_loss` | `chart-loss-carrier`, derived from the violet scale | direct label; solid line/bar; square point |
| `warehouse_error` | `chart-loss-warehouse`, derived from the violet scale | direct label; dashed line; diamond point |
| `repeat_claimant` | `chart-loss-repeat`, derived from a high-contrast neutral | direct label; dash-dot line; circle point |
| `policy_override` | `chart-loss-policy`, derived from a mid neutral | direct label; dotted line; triangle point |

Full-strength action violet is not a chart colour. Do not use semantic
success/warning/critical colours for non-semantic categories. Test the actual
line/bar/point marks for required contrast in light, dark, and forced colours;
do not assume token text contrast proves chart-mark contrast.

### 4.10 Iconography

- Lucide is the single general UI icon set.
- Default optical size is `16px`, stroke width `1.75`, centred inside a `32px`
  desktop target or `44px` coarse-pointer target.
- `20px` is allowed for a section-leading decorative/status icon. Larger marks
  are restricted to true empty states and brand/provider assets.
- Replace control/status glyphs in the audited claim, customer, import,
  rule/flow, chart, Chrome, and Gorgias owners. Preserve prose arrows,
  mathematical signs, provider marks, and chart geometry when they are not
  pretending to be buttons/icons.

---

## 5. The three signature moments

Exactly one focal element may exceed the baseline craft level on each of these
routes. No other route receives a bespoke flourish.

### 5.1 Overview — recovered cash figure

**Owner:** `components/dashboard/DashboardOverview.tsx` and
`components/dashboard/dashboardPilot.module.css`.

Decision:

- Keep the existing `Payout position` composition and metric switcher.
- The brief approves recovered cash as the focal subject, but changing the
  initial local metric from `exposure` to `recovered` also changes initial
  chart state and report-link behaviour. Treat this as approval item `A1` in
  the `PC-00` packet. Do not change the default unless Malik explicitly
  approves `A1`. If declined, stop this signature treatment for revised
  direction rather than inventing a second recovered total beside exposure.
- When `A1` is approved, change only the presentation default to `recovered`;
  do not change the report calculation or derive a new “money kept” total. Add
  parity tests for initial selected metric, chart series, records/report link,
  accessible readout, and user switching back to exposure.
- The existing recovered-cash value becomes the single signature figure at
  `48/54`, 650, tabular numerals. Its sentence-case label, currency, range,
  record count, reconciliation/freshness qualifier, records link, comparison,
  chart, and metric switching remain truthful and functional.
- On subsequent metric selection, the position region keeps the same geometry,
  but only `recovered` uses the signature size. Other metrics use
  `hero-value` so violet/size does not create several competing focal points.
  Reserve a fixed value-line height large enough for `48/54` so switching to a
  `40/44` metric never shifts surrounding content.
- Reveal the initial figure with opacity only over `200ms` after the content is
  ready. Do not count up, translate, blur, bounce, or replay on scroll.
- On an explicit range/currency/comparison change, use the `700ms` neutral or
  low-violet changed-value wash once. Under reduced motion, update instantly.
- Keep `Open work` as the one full-violet primary action. The number itself is
  primary ink, never a violet decorative display.

Acceptance:

- the eye lands on recovered cash before the controls or supporting outcomes;
- no second `48px` figure exists in the first viewport;
- unavailable/stale/qualified states preserve the same footprint and place the
  qualifier beside the value;
- chart table, metric switcher, URL filters, keyboard operation, and record
  links are unchanged; and
- 1440, 1280, 1024, 390 accessibility reflow, light, dark, reduced-motion, and
  forced-colour proofs pass under scenario `R07.signature-recovered`.

### 5.2 Case detail — evidence trail

**Owners:** `components/claims/ClaimReviewPanel.tsx`,
`components/claims/ClaimReviewContextColumn.tsx`, and
`components/claims/payout/ReconciliationSummaryCard.tsx`.

Decision:

- Keep the case header, decision/action rail, forms, comments, and all current
  evidence/recommendation/outcome data.
- Within the existing reconciliation surface, place the relationship trail
  before the independent-recommendation detail so it is visible in the first
  meaningful viewport.
- Render one connected sequence using existing arrays only:
  `Source facts -> Human findings -> Inferences -> Recommendation`.
- The final Recommendation stage contains three independent subitems from the
  existing payload—Customer action, Responsibility, and Recovery. Never merge
  them into one synthetic headline or imply agreement between them.
- Each stage shows its existing truthful count/state, one representative
  label/summary when available, and a direct jump/disclosure to the full
  section. Empty and unavailable stages remain explicit; never imply evidence
  exists because a connector is drawn.
- At `>=1280px`, use a four-stage horizontal trail. At `1024–1279px`, use two
  rows of two with a semantically continuous reading order. At effective
  widths below 1024, use a vertical trail. Do not horizontally scroll the
  whole page.
- Connector lines use neutral/violet-wash roles, never full violet. They reveal
  once with opacity over `240ms` after real data settles; no stagger, travel,
  particle, or continuous animation. Under reduced motion, render complete.
- The recommendation remains advisory and visually distinct from a recorded
  merchant decision. Do not merge stages or imply machine authority.
- Moving this trail ahead of the independent-recommendation detail is the only
  authorised local content reordering on Case Detail.

Acceptance:

- source, finding, inference, and recommendation remain programmatically and
  visually distinct;
- evidence/error/refresh/empty/partial/read-only cases keep truthful labels;
- the existing merchant mutation, version, idempotency, recommendation, and
  outcome flows are untouched;
- focus/reading order follows source to recommendation, then detail/actions;
- the trail is the only bespoke visual moment on the route; and
- all required width/theme/accessibility captures pass without clipping; and
- stable scenario ID is `R01.signature-evidence-trail`.

### 5.3 Reports — recovered cash headline

**Owners:** `components/reporting/IntelligenceReportView.tsx`,
`components/reporting/DashboardCharts.tsx`, and
`components/ui/FinancialEquation.tsx`.

Decision:

- Keep the existing report route, filters, exports, financial equation,
  reconciliation warning, charts, definitions, and records drill-downs.
- When a single real currency bridge exists, promote its existing
  `recoveredMinor`/`recovered_cash` value to the one report headline at
  `48/54`, 650, tabular numerals. Do not sum currencies and do not create a
  cross-currency total.
- When exactly one currency bridge is present, show one signature value followed by
  its explicit currency, range, record count, generated time/reconciliation
  qualifier, and `reports/records` link.
- If the route legitimately presents multiple currencies, show “Recovered
  cash by currency” and render every bridge at `kpi` size. Do not arbitrarily
  privilege the first currency, introduce a visual-only selection, or imply
  comparability. The signature treatment is intentionally unavailable in that
  state because a trustworthy total cannot be shown.
- Keep exposure, confirmed loss, and final net loss as the supporting equation,
  not four equal KPI cards. Do not duplicate the recovered amount immediately
  below the headline.
- Use the same opacity-only `200ms` reveal and `700ms` changed-value wash rules
  as Overview. No count-up or scroll-triggered replay.

Acceptance:

- the recovered total is the first quantitative answer, but all ledger stages
  and definitions remain reachable;
- zero, unavailable, partial, stale, qualified, and multi-currency states are
  impossible to confuse;
- `reports/records` links preserve range, timezone, currency, and metric;
- charts retain custom tooltips and accessible tables; and
- this is the only bespoke visual moment on Reports; and
- stable scenario ID is `R32.signature-recovered-headline`.

---

## 6. Authoritative 65 page-module route-to-phase map

The route IDs, patterns, classifications, sessions, and families below come
from `scripts/living-precision/manifest.mjs`. The page file is the entry owner,
not the complete visual-owner list; use the coverage ledger for every nested
owner and route-state boundary.

Counts: **58 production**, **3 development**, **4 redirects**, **65 total**.

| ID | Route | Class / session | Family | Entry owner | Craft phase |
|---|---|---|---|---|---|
| R01 | `/claims/[id]` | production / authenticated | case detail | `app/(app)/claims/[id]/page.tsx` | PC-06 baseline; PC-10 evidence trail |
| R02 | `/claims` | production / authenticated | operational registry | `app/(app)/claims/page.tsx` | PC-05 |
| R03 | `/customers/[id]/claims` | redirect / authenticated | redirect | `app/(app)/customers/[id]/claims/page.tsx` | PC-00 redirect proof |
| R04 | `/customers/[id]/evidence/new` | production / authenticated | task | `app/(app)/customers/[id]/evidence/new/page.tsx` | PC-06 |
| R05 | `/customers/[id]` | production / authenticated | customer detail | `app/(app)/customers/[id]/page.tsx` | PC-06 |
| R06 | `/customers` | production / authenticated | operational registry | `app/(app)/customers/page.tsx` | PC-06 |
| R07 | `/dashboard` | production / authenticated | analytical | `app/(app)/dashboard/page.tsx` | PC-05 baseline; PC-10 recovered figure |
| R08 | `/dev/design-system` | development / authenticated | development harness | `app/(app)/dev/design-system/page.tsx` | PC-02 gallery proof |
| R09 | `/disputes/[id]` | production / authenticated | connected object | `app/(app)/disputes/[id]/page.tsx` | PC-06 |
| R10 | `/exceptions` | redirect / authenticated | redirect | `app/(app)/exceptions/page.tsx` | PC-00 redirect proof |
| R11 | `/losses/[id]` | production / authenticated | loss detail | `app/(app)/losses/[id]/page.tsx` | PC-06 |
| R12 | `/losses` | production / authenticated | analytical registry | `app/(app)/losses/page.tsx` | PC-06 |
| R13 | `/notifications` | production / authenticated | operational registry | `app/(app)/notifications/page.tsx` | PC-05 |
| R14 | `/orders/[id]` | production / authenticated | connected object | `app/(app)/orders/[id]/page.tsx` | PC-06 |
| R15 | `/recoveries/[id]` | production / authenticated | recovery detail | `app/(app)/recoveries/[id]/page.tsx` | PC-06 |
| R16 | `/recoveries` | production / authenticated | operational board | `app/(app)/recoveries/page.tsx` | PC-06 |
| R17 | `/refunds/[id]` | production / authenticated | connected object | `app/(app)/refunds/[id]/page.tsx` | PC-06 |
| R18 | `/returns/[id]` | production / authenticated | connected object | `app/(app)/returns/[id]/page.tsx` | PC-06 |
| R19 | `/shipments/[id]` | production / authenticated | connected object | `app/(app)/shipments/[id]/page.tsx` | PC-06 |
| R20 | `/tickets/[id]` | production / authenticated | connected object | `app/(app)/tickets/[id]/page.tsx` | PC-06 |
| R21 | `/work` | production / authenticated | operational registry | `app/(app)/work/page.tsx` | PC-05 |
| R22 | `/flows/[id]` | production / authenticated | builder detail | `app/(app)/flows/[id]/page.tsx` | PC-08 |
| R23 | `/flows` | production / authenticated | registry | `app/(app)/flows/page.tsx` | PC-08 |
| R24 | `/flows/runs/[id]` | production / authenticated | run detail | `app/(app)/flows/runs/[id]/page.tsx` | PC-08 |
| R25 | `/flows/runs` | production / authenticated | registry | `app/(app)/flows/runs/page.tsx` | PC-08 |
| R26 | `/help` | production / authenticated | editorial task | `app/(app)/help/page.tsx` | PC-09 |
| R27 | `/integrations/[provider]` | production / authenticated | connector detail | `app/(app)/integrations/[provider]/page.tsx` | PC-08 |
| R28 | `/integrations/dev-preview` | development / authenticated | development harness | `app/(app)/integrations/dev-preview/page.tsx` | PC-08 dev proof |
| R29 | `/integrations/imports` | production / authenticated | task | `app/(app)/integrations/imports/page.tsx` | PC-08 |
| R30 | `/integrations` | production / authenticated | registry | `app/(app)/integrations/page.tsx` | PC-08 |
| R31 | `/integrations/shipbob/select` | production / authenticated | task | `app/(app)/integrations/shipbob/select/page.tsx` | PC-08 |
| R32 | `/reports` | production / authenticated | analytical | `app/(app)/reports/page.tsx` | PC-07 baseline; PC-10 recovered headline |
| R33 | `/reports/records` | production / authenticated | registry | `app/(app)/reports/records/page.tsx` | PC-07 |
| R34 | `/rules/[id]` | production / authenticated | builder detail | `app/(app)/rules/[id]/page.tsx` | PC-08 |
| R35 | `/rules` | production / authenticated | registry | `app/(app)/rules/page.tsx` | PC-08 |
| R36 | `/rules/recovery` | production / authenticated | settings task | `app/(app)/rules/recovery/page.tsx` | PC-08 |
| R37 | `/settings/account` | production / authenticated | settings | `app/(app)/settings/account/page.tsx` | PC-08 |
| R38 | `/settings/agreements` | production / authenticated | settings | `app/(app)/settings/agreements/page.tsx` | PC-08 |
| R39 | `/settings/api-integrations` | production / authenticated | settings | `app/(app)/settings/api-integrations/page.tsx` | PC-08 |
| R40 | `/settings/audit-trail` | production / authenticated | settings | `app/(app)/settings/audit-trail/page.tsx` | PC-08 |
| R41 | `/settings/billing` | production / authenticated | settings | `app/(app)/settings/billing/page.tsx` | PC-08 |
| R42 | `/settings/data-privacy` | production / authenticated | settings | `app/(app)/settings/data-privacy/page.tsx` | PC-08 |
| R43 | `/settings/integrations/chrome` | production / authenticated | connector setup | `app/(app)/settings/integrations/chrome/page.tsx` | PC-08 |
| R44 | `/settings/integrations/freshdesk` | production / authenticated | connector setup | `app/(app)/settings/integrations/freshdesk/page.tsx` | PC-08 |
| R45 | `/settings/integrations/gorgias` | production / authenticated | connector setup | `app/(app)/settings/integrations/gorgias/page.tsx` | PC-08 |
| R46 | `/settings/integrations/shopify` | production / authenticated | connector setup | `app/(app)/settings/integrations/shopify/page.tsx` | PC-08 |
| R47 | `/settings/integrations/zendesk` | production / authenticated | connector setup | `app/(app)/settings/integrations/zendesk/page.tsx` | PC-08 |
| R48 | `/settings/notifications` | production / authenticated | settings | `app/(app)/settings/notifications/page.tsx` | PC-08 |
| R49 | `/settings` | redirect / authenticated | redirect | `app/(app)/settings/page.tsx` | PC-00 redirect proof |
| R50 | `/settings/platform` | production / authenticated | settings | `app/(app)/settings/platform/page.tsx` | PC-08 |
| R51 | `/settings/team` | production / authenticated | settings | `app/(app)/settings/team/page.tsx` | PC-08 |
| R52 | `/login` | production / anonymous | entry | `app/(auth)/login/page.tsx` | PC-09 |
| R53 | `/reset` | production / anonymous | entry | `app/(auth)/reset/page.tsx` | PC-09 |
| R54 | `/reset/update` | production / anonymous | entry | `app/(auth)/reset/update/page.tsx` | PC-09 |
| R55 | `/demo` | production / anonymous | public product | `app/(public)/demo/page.tsx` | PC-09 |
| R56 | `/landing` | production / anonymous | public marketing | `app/(public)/landing/page.tsx` | PC-09 |
| R57 | `/legal/data-handling` | production / anonymous | public editorial | `app/(public)/legal/data-handling/page.tsx` | PC-09 |
| R58 | `/legal/dpa` | production / anonymous | public editorial | `app/(public)/legal/dpa/page.tsx` | PC-09 |
| R59 | `/legal/pilot-terms` | production / anonymous | public editorial | `app/(public)/legal/pilot-terms/page.tsx` | PC-09 |
| R60 | `/legal/privacy` | production / anonymous | public editorial | `app/(public)/legal/privacy/page.tsx` | PC-09 |
| R61 | `/pricing` | production / anonymous | public marketing | `app/(public)/pricing/page.tsx` | PC-09 |
| R62 | `/signup` | production / anonymous | entry | `app/(public)/signup/page.tsx` | PC-09 |
| R63 | `/onboarding` | production / onboarding | onboarding | `app/onboarding/page.tsx` | PC-09 |
| R64 | `/` | redirect / anonymous | redirect | `app/page.tsx` | PC-00 redirect proof |
| R65 | `/landing/prototypes/unauth-case-detail` | development / anonymous | archived research | `app/(public)/landing/prototypes/unauth-case-detail/page.tsx` | PC-00 status; PC-09 dev proof |

### 6.1 URL contracts outside the 65 page-module manifest

These URL surfaces receive status/destination/query-preservation proofs, not
craft scores:

- `GET /callback?code=...` exchanges through the current callback handler and
  redirects to `/onboarding` on success or `/login?error=auth_failed` on
  failure. This is an auth finding/proof only; do not execute it against the
  current database or change its behaviour in this programme.
- Proxy outcomes: unauthenticated protected URLs go to `/login`; authenticated
  `/login` goes to `/dashboard`; `/settings`, `/exceptions`, and the two
  `/customers/:id/claims` outcomes preserve their current alias behaviour.
- `next.config.js` owns 30 compatibility redirects:
  - 5 to `/claims`;
  - 3 to `/dashboard`;
  - 5 to `/customers`;
  - 6 to `/reports`;
  - 2 to `/integrations/imports`;
  - 3 integration aliases;
  - 5 help aliases; and
  - `/partners` to `/rules/recovery`.

The scenario inventory expands each group to its exact source pattern and
asserts status, destination, and current query/hash behaviour. These proofs do
not alter the `65 / 58 / 3 / 4` page-module counts.

### 6.2 Route-wide owners outside page files

The page table is incomplete without these shared owners:

- 7 layouts and the root/template/theme/readiness owners;
- 95 loading/error/not-found route-state modules;
- 53 named nested views and overlays;
- 21 stateful view owners;
- 34 additional visual owners;
- shared banners, connection gates, progress/pending feedback, workspace and
  merchant controls, billing/upgrade/feature states; and
- 4 non-route embedded visual surfaces.

The executor must use the 279-entry coverage ledger as the file checklist and
must update the generated scenario inventory when a visible owner is found
that the ledger missed. Do not hand-copy a reduced replacement inventory into
this plan.

Authenticated route-boundary resolution is currently:

| Boundary | Resolution |
|---|---|
| Loading | 41 page modules own a loader; 7 inherit a family loader; `/exceptions`, `/help`, and `/dev/design-system` use the app-generic loader. |
| Error | 42 own an error boundary; 7 inherit a family boundary; `/exceptions` and `/dev/design-system` have no scoped error boundary. |
| Not found | Only loss detail, ticket detail, and dispute detail own dedicated not-found presentation; the other 48 authenticated pages resolve through the app-generic boundary when they call `notFound()`. |

The seven inherited cases are `/customers/[id]/claims`,
`/integrations/dev-preview`, and the five settings connector routes. Claims
and recovery detail currently redirect missing records to their list; preserve
those redirects. This matrix tells the executor which existing boundary owns
craft—it does not authorise blindly adding one file per route.

### 6.3 Host, embedded, transitional, and zero-UI surfaces

The ledger counts Shopify checkout, Zendesk, Gorgias widget, and Gorgias unlock
as its four embedded contracts. Chrome `PopupApp` is counted among the 21
stateful owners. The table therefore contains five non-route contracts, not
five ledger-embedded rows.

| Surface | Owner | Required proof |
|---|---|---|
| Chrome popup | `extensions/chrome/popup/PopupApp.tsx` and `popup.css` | full state machine at native host size, light/dark if supported, keyboard, loading/error/disabled, reduced motion, forced colours |
| Zendesk host | `extensions/zendesk/assets/iframe.html` | approximately 300/360px, focus-visible, hover/active, error/empty, reduced motion, forced colours |
| Gorgias widget | `lib/gorgias/renderWidgetHtml.ts` | approximately 300/360px, exact host states, full interaction/a11y modes |
| Gorgias unlock | `lib/gorgias/renderWidgetUnlockHtml.ts` | locked/unlock/action/error states at host width |
| Shopify checkout | `extensions/unauth-checkout/src/index.jsx` | explicit zero-UI contract; do not invent checkout UI |

Also inventory the user-visible transitional HTML returned by
`app/api/shopify/install/route.ts` and `app/api/shopify/callback/route.ts` for
failure/transition outcomes. Treat them as generated host/error presentation,
not new page-module routes, and do not change OAuth or connection behaviour.

---

## 7. Query, variant, and state coverage

### 7.1 URL-controlled scenarios

Preserve and enumerate at least:

| Route | Query/hash contract to cover |
|---|---|
| `/dashboard` | `range`, `timezone`, `compare`, `currency` |
| `/work` | `view`, `page`, `q` |
| `/claims` | `search`, `status`, `workflow`, `sort`, `sla`, `page`, `pageSize`, `queue`, `owner`, `viewed`, `focus` |
| `/customers` | `page`, `pageSize`, `q`/`email`, `hasRefunds`, `hasChargebacks`, `openClaims`, `sort`, `preview=customer:<id>` |
| `/customers/[id]` | `audit`, `view_token`, `buildEvidence`, `disputedOrder`, `source`, `ticket_id`, `#cases` |
| `/customers/[id]/evidence/new` | `disputedOrder` |
| connected-object detail | safe same-origin `return` |
| `/losses` | `view`, `attribution` |
| `/flows/runs` | `workflow` |
| `/integrations` | `view=connected|browse`, `shipbob_connected=1`, `shipbob_warning=webhook_subscription_failed` |
| `/integrations/shipbob/select` | `selection` |
| `/reports` | `range`, `timezone`, plus existing filter state owned by the dashboard/report controls |
| `/reports/records` | `kind`, `dimension`, `value`, `metric`, `range`, `timezone`, `currency`, `page` |
| `/settings/integrations/gorgias` | safe `returnTo=/onboarding` |
| `/settings/integrations/shopify` | `shopify_connected`, `shop`, `shopify_error`, `shopify_warning` |
| `/settings/billing` | `checkout=success`, `topup=success`, `action=topup`; retain `required=...` as an explicitly unconsumed finding |
| `/login` | safe `next` |
| `/callback` | `code`, success redirect, and generated `/login?error=auth_failed`; status proof only, never against the current database |
| `/demo` | `step=incoming|evidence|recommendation|decision|recovery` |
| `/onboarding` | `shopify_error` |
| R65 prototype | `v=1|2|3` in development only; production 404 |

Every combination need not be Cartesian if it produces the same owner state,
but every distinct visual/behavioural state needs a named scenario and proof.
The scorecard notes which parameters created it.

### 7.2 Provider variants

`/integrations/[provider]` must enumerate the current provider authority:

```text
shopify, woocommerce, bigcommerce, gorgias, zendesk, freshdesk,
ups, fedex, csv_import, document_upload, self_fulfillment_pack,
shipbob, stripe, carrier_claims
```

`stripe` and `carrier_claims` remain planned catalogue states. Static child
routes such as `/integrations/imports` and `/integrations/dev-preview` retain
precedence. Score each distinct connected/disconnected/degraded/planned state
against the same trust standard.

### 7.3 Required state families

For each visual owner, mark every applicable cell as a scenario, proven absent,
or N/A-with-rationale before capture:

| Family | Required states |
|---|---|
| Route | default, loading, initial error, refresh error, not-found/redirect outcome |
| Data | known, zero, unavailable, stale, partial/qualified, multi-currency/unit where real |
| Collection | populated, first-use empty, filtered/search empty, one row, many rows, pagination edge |
| Integration | connected, disconnected, syncing/loading, degraded with reason, planned/unsupported |
| Permission | editable, read-only, disabled with reason, no permission, locked/upgrade where real |
| Interaction | default, hover, focus-visible, active/selected/current, disabled, loading, success, error |
| Overlay | closed, open, keyboard cycle, Escape, outside click where allowed, focus return, scroll lock |
| Builder/form | pristine, dirty, validation error, submitting, submit failure, success, read-only/version conflict where real |
| Chart/table | data, empty, unavailable, loading, tooltip, keyboard/table alternative, long labels, zero/null |
| Responsive | wide, laptop, compact, accessibility reflow, contained scroll, long text, coarse pointer |
| Theme/a11y | light, dark, reduced motion, forced colours, text spacing, 200% zoom |

### 7.4 Route-state findings that remain outside visual scope

Log, do not fix, any issue that requires changing auth, routing policy, product
semantics, or persistence. The current audit already found examples:

- missing/ambiguous expired reset-link and signup verification states;
- billing `required` context not consumed by the current client;
- signed customer-link logic unreachable through current auth guards;
- login deep links that may not preserve `next` from the proxy;
- `/login?error=auth_failed` is emitted by `/callback` but not consumed by the
  current login client;
- authenticated users are redirected away from `/login` but may still reach
  `/signup`, `/reset`, and `/reset/update` despite those pages' anonymous
  manifest classification;
- team invitations targeting `/auth/callback` while the current route is
  `/callback`;
- missing `/legal` and `/audit-demo` entry routes; and
- claims/recovery missing-record redirects instead of explicit not-found views.

These belong in a separate product/auth backlog. Do not hide them with visual
copy or screenshot interception.

---

## 8. Verification protocol

### 8.1 Per-change loop

For every coherent change:

1. inspect only the owned diff;
2. run the nearest unit/component test;
3. run `npm run lint:authenticated-design`;
4. run `npm run typecheck` after TypeScript/API changes;
5. only in the separately approved disposable environment, capture the
   affected scenarios at 1440, 1280, 1024, light, and dark;
6. exercise hover, focus-visible, active, disabled, loading, error, and reduced
   motion where applicable; and
7. record the scenario IDs and results in the phase note.

Do not run the final design detector repeatedly while the route is half
migrated and then normalise to its noise. Run it once at the end of each
completed shared-system or route-family phase, fix every unapproved finding,
and retain the report.

### 8.2 Phase gate

Every phase runs:

```bash
npm run lint:authenticated-design
npm run verify:design-contract
npm run verify:decision-ledger
npm run test:decision-ledger:components
npm run typecheck
npm run lint
npm run verify:ui-parity
```

Then, only in the separately approved disposable environment with Section 0.2
request guards, run the affected Playwright specs and phase scenario subset.
Without that environment the phase stays blocked; static compilation is not a
substitute for captured score rows and interaction states.

### 8.3 Final static/unit gate

Before running Jest, confirm its database/provider clients are mocked or point
only to the separately approved disposable environment. If a supposedly unit
test can reach the current database/provider, stop and move it behind the same
conditional evidence gate; “test” in the command name is not proof of safety.

Run in this order:

```bash
npm run validate:marketing-seed
npm run verify:decision-ledger
node scripts/visual-rebuild/check-coverage-ledger.mjs
npm run lint:authenticated-design
npm run verify:design-contract
npm run verify:ui-parity
npm run typecheck
npm run lint
npm test -- --runInBand
npm run test:decision-ledger:components
npm run build
```

The fixture validator must pass using an already-authorised deterministic
fixture. Do not repair a red validator from inside this programme.

The expected clean baseline before craft changes was observed as:

- decision ledger: 24 checks passed;
- component gate: 27 suites / 128 tests passed;
- typecheck: passed;
- lint: passed; and
- UI parity: 209 destinations passed.

Those numbers are context, not a waiver. The final run records its own counts.

### 8.4 Final browser/a11y gate

**Do not run this section against the current database.** It is conditional on
Malik's separate approval of the disposable loopback-only clone, source/auth
before/after fingerprints, and the default-deny request guard from Section 0.2.

Build first. `tests/playwright.config.ts` can start `npm run start` without
building and has `reuseExistingServer: true`, so an executor must prove the
server corresponds to the current build before trusting results.

Run:

```bash
npm run test:critical
npm run test:compliance
npm run test:decision-ledger:a11y
npm run test:release-browser
npm run test:e2e
```

Browser requirements:

- one worker for release evidence;
- whole-document axe scan, including shell and portal content;
- fail every WCAG violation except an exact reviewed rule/target allowlist with
  rationale; do not silently filter all moderate issues;
- no console/page error and no unexpected warning;
- no required network failure or unsettled transient;
- no document-level overflow at any required width;
- every intentional table/board overflow is keyboard/pointer accessible and
  contained by its owner;
- keyboard workflows for every route family and overlay type;
- focus trap/return, Escape, scroll lock, and accessible names;
- light, dark, reduced motion, forced colours, coarse pointer, text spacing,
  and true 200% zoom; and
- no workflow, destination, permission, or mutation regression.

Treat 200% zoom as a headed manual Chromium proof unless the evidence harness
implements and validates a real browser-zoom mechanism. CSS viewport emulation
or device scale factor is not labelled “200% zoom.”

Do not use `npm run release:readiness` as a substitute; it includes mutating
setup/rehearsal steps outside this task.

### 8.5 Reproducible evidence servers and captures

After the deterministic disposable fixture and authenticated evidence are
separately approved, use one audit launcher that keeps internal local-only auth
values consistent without placing secrets in CLI arguments, URLs, reports, or
logs:

```bash
node scripts/premium-craft/launch-evidence.mjs \
  --run-id SOURCE12-YYYYMMDDTHHMMSSZ \
  --production-port 3000 \
  --development-port 3001
```

The launcher must:

- validate the run ID, source fingerprint, disposable database identity, and
  request guard;
- refuse occupied ports or an unidentified existing server;
- build once and wait for the build to exit;
- launch production and development as two separately managed child processes
  with separate dist directories;
- record each owned PID, port, source fingerprint, and readiness response;
- pass the same internal, local-only fixture/auth values to both servers and
  the capture process without printing them;
- capture only after both readiness checks pass;
- write to
  `artifacts/living-precision/premium-craft/final-SOURCE12-YYYYMMDDTHHMMSSZ/`;
  and
- in `finally`, terminate only the two recorded owned PIDs and prove the ports
  closed.

Do not run the shown commands as three foreground server commands in one shell;
the first server would block the rest. Do not use `--env-file=.env.local` for
the marketing evidence run: that file currently targets a different E2E
merchant/secret than the deterministic marketing launcher.

Do not use `capture:decision-ledger:verify` as a shortcut. Its `--verify` mode
expects an existing Run A plus approved old-schema `0–4` scorecards before it
creates Run B; that contract is incompatible with the premium `1–5` packet.
The premium harness is the final authority. A one-pass
`capture:decision-ledger` diagnostic is optional only after it receives the
same no-mutation guards in the approved disposable environment.

Never mix the older Apple capture's DPR1 images with strict DPR2 images in a
pixel comparison. Never reuse or overwrite baseline output. The storage state
and E2E secrets remain local, ignored, and unprinted.

### 8.6 Score validation

`validate-scorecard.mjs` must fail when:

- a scenario/capture row is missing;
- a redirect or development status proof is missing;
- an applicable score is absent, non-integer, or below 4;
- a `null` score lacks a pre-approved `naCode` and `naReason`;
- trust lacks a written rationale;
- a P0/P1 finding remains open;
- baseline/final scenario IDs and comparison axes do not map one-to-one; or
- a capture and its own score row disagree on source fingerprint, fixture,
  environment, width, mode, or screenshot path.

Packet-mode validation requires the executor identity and permits pending human
approval. Final-mode validation also fails any row without Malik/named-reviewer
approval. Baseline and final source fingerprints are expected to differ; each
manifest records its own fingerprint and the comparison sheet records the
explicit mapping.

Malik's review remains a human gate. Automated score validation cannot approve
the product on Malik's behalf.

---

## 9. Definition of done

The programme is complete only when all statements below are true.

### Inventory and evidence

- All 65 manifest entries are accounted for: 58 production pages scored, 3
  development pages proven in development and absent in production, and 4
  page-module redirects proven at their exact destinations. Callback, proxy,
  and all 30 compatibility redirects have separate status/destination proofs.
- All 7 layouts, 95 route-state boundaries, 53 named nested views, 21 stateful
  owners, 4 embedded contracts, 34 additional visual owners, and every newly
  discovered visual owner have a scenario/proof. The four visual host surfaces
  are Chrome popup, Zendesk, Gorgias widget, and Gorgias unlock; Shopify
  checkout has its separate zero-UI proof. Chrome is ledger-accounted as a
  stateful owner, while Shopify is one of the four embedded contracts.
- Every applicable scenario is captured at every required viewport and theme.
- The capture manifest has equal expected/actual counts and zero privacy,
  route, readiness, network, console, page-error, transient, or overflow
  failures.
- Baseline and final scorecards are complete, persisted, reviewed, and
  machine-validated.
- Every applicable dimension on every final row is `>=4`; no average hides a
  lower score and no P0/P1 remains.
- The before/after sheet uses identical scenario, fixture, viewport, theme,
  crop, clock, locale, timezone, DPR, and browser configuration.
- Each run records its own dirty-source fingerprint, tracked-diff hash, and
  in-scope untracked manifest; comparison does not pretend both runs share a
  commit/fingerprint.
- Fixture, R65, product-proof hash, and disposable-environment prerequisites
  in Section 3.4 were resolved by separately authorised owners before final
  evidence.

### Identity and craft

- The neutral/violet palette values, Inter family, shell, route structure,
  information architecture, and overall page compositions remain recognisably
  the currently approved system.
- No new hue, font, icon library, chart library, visual theme, gradient, glass,
  generated image, screenshot branch, or parallel production design system
  exists.
- Every production UI font size consumes its canonical authenticated,
  public/editorial, or Pocket Brief profile; every designed layout spacing
  value consumes its 4px profile or has an approved non-layout/host exception.
- Full-strength filled violet is limited to one primary filled action and the
  current filled selection/navigation treatment in a view, with the documented
  link/focus/stroke exceptions.
- Surface elevation follows the flat/resting/hover/floating/overlay contract;
  nested card soup and route-local shadows do not exist.
- Every ordinary interactive element has explicit default, hover,
  focus-visible, active, disabled, and relevant loading/error/success states.
- Every route/resource over the delay threshold uses geometry-matched
  skeletons; every empty state has context and a truthful recovery action.
- All numeric columns are aligned and tabular; all table and chart alternatives
  are accessible; chart colours map only to real domain taxonomy.
- Lucide is the one general UI icon set at the shared optical size/stroke; no
  control/status text glyph remains without an approved reason.
- Every stale, partial, approximate, disconnected, unavailable, and read-only
  value explains its limitation adjacent to the value/status.

### Signature craft

- Overview has exactly one special focal treatment: the existing recovered
  cash figure. `A1` was explicitly approved and its default-metric/chart/link
  parity tests pass.
- Case Detail has exactly one: the truthful source-to-recommendation evidence
  trail.
- Reports has exactly one when a single currency bridge exists: the existing
  recovered-cash headline, without cross-currency summing. Multi-currency
  reports use the documented safe non-signature fallback.
- Each has a reduced-motion equivalent and truthful zero/unavailable/partial/
  stale behaviour.
- No other route or element copies the bespoke treatment merely for visual
  excitement.

### Behaviour, accessibility, and quality

- Routes, destinations, query/hash state, permissions, APIs, calculations,
  mutations, audit records, provider capabilities, and legal meaning are
  unchanged.
- No current/shared/user-owned auth, credential, secret, user, account,
  merchant, provider, or database record was changed. Any expected auth/session
  metadata created for evidence existed only in the separately approved
  disposable loopback clone, was fingerprinted, and contained no user-owned
  record.
- Every existing test remains or is replaced only when stale authority is
  demonstrated, with equal-or-stronger coverage. No test is skipped or
  weakened to land a visual change.
- Static, unit, component, build, parity, browser, compliance, accessibility,
  and full E2E gates all pass from fresh outputs; every authenticated browser
  gate ran only in the approved disposable environment with mutation guards.
- WCAG 2.2 AA, whole-document axe, keyboard, focus visibility/return, reduced
  motion, forced colours, coarse pointer, text spacing, and headed-manual or
  otherwise validated real 200% browser zoom pass.
- Authenticated work is composed at 1440/1280/1024 and remains operable through
  narrow accessibility reflow; public/auth/onboarding and host surfaces pass
  their real responsive widths.
- There are zero console/page errors, zero unexpected warnings, zero required
  network failures, and zero document-level horizontal overflow.
- No stale server, stale Playwright report, prior score, or prior screenshot is
  cited as final evidence.

---

## 10. Lesser-model execution contract

The executor follows these rules exactly:

1. Read this whole document, `PRODUCT.md`, `DESIGN.md`, the Instrument Grade
   authority, route manifest, and whole-product coverage ledger before acting.
2. Begin with `PC-00`; do not jump to a visually interesting route.
3. If the fixture preflight is red, stop and report it. Do not seed, repair,
   bypass, or use a real account.
4. At the `PC-00` stop gate, wait for Malik's explicit approval.
5. After approval, execute one numbered phase at a time and only touch that
   phase's owners.
6. Before editing a dirty file, read its existing diff and preserve every
   unrelated hunk.
7. Prefer the shared token/primitive fix when the same root cause affects more
   than one route. Never “fix” a route by copying a primitive.
8. Do not make a product, auth, data, permission, route, provider, legal, or
   copy decision that this plan does not authorise. Record it as a finding.
9. Run the per-change and phase gates; attach exact commands, exit codes,
   scenario IDs, and evidence paths to the phase report.
10. Do not declare a phase complete with a skipped check, missing state,
    provisional screenshot, unreviewed score, or unexplained N/A.
11. Do not stage, commit, push, open a PR, seed data, or deploy unless Malik
    separately requests that action.
12. If a constraint appears impossible, stop with the exact conflicting files,
    behaviour, and evidence. Do not resolve it through a redesign.

Use this phase-completion template:

```markdown
## PC-XX completion report

- Owned files changed:
- Pre-existing dirty hunks preserved:
- Scenario IDs affected:
- Product/auth/data behaviour changed: No
- Token/primitive contract used:
- Accessibility states verified:
- Commands run and exit codes:
- Capture manifest/path:
- Scores before -> after:
- Open P0/P1 findings:
- Deferred out-of-scope findings:
- Ready for next phase: Yes/No
```

If any line is unknown, the phase is not complete.
