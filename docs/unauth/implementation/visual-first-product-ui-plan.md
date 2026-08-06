---
title: Unauth Visual-First UI Rebuild Plan
version: 2.1
date: 2026-08-04
status: Binding lean autonomous implementation contract
product: Unauth — Post-Purchase Payout Control
mode: Operate
supersedes_version: 1.2
supersedes_sha256: 3acc6ae06192edde91a2ea549f6e676a4cdbe64639eefe9342f7691dbe0a17da
---

# Unauth Visual-First UI Rebuild Plan

This is a focused frontend rebuild, not a company-governance, backend-rewrite or release-certification programme.

The outcome is a premium financial interface that feels calm, exact and unmistakably designed for post-purchase payout control. Analytical pages become chart-led. Tables become precise operating and verification surfaces. Existing financial calculations, API meanings, permissions, mutations, audit behaviour and persisted data remain authoritative.

Version 2.1 replaces every earlier version of this plan.

## Migration from versions 1.0–1.2

Earlier plans used different phase meanings and created governance records, certificates, standalone reference screens and certification obligations. Keep those files as historical evidence, but they are not dependencies, gates or proof of completion under version 2.1.

- Do not infer version 2.1 phase status from an older phase with the same ID.
- In particular, version 2.1 P02 is **Shared UI, chart and table systems**. There is no version 2.1 phase named **Financial, authority and API contracts**.
- The version 1.2 P01 certificate covers standalone visual references and explicitly reports that no product route was created. It does not complete version 2.1 P01, which operates on real application routes.
- On first use of version 2.1, start at P00. Reuse valid repository inventories and evidence instead of recreating them, map the current implementation against the P00 exit criteria, close only real gaps and continue without questions.
- When asked what remains, report status using only the version 2.1 phase names and current executable code. Never recommend an older phase.
- Files under `docs/unauth/implementation/p00/`, `p01/`, `certificates/`, `historical/` and `evidence/` remain read-only historical context unless a version 2.1 phase explicitly reuses their factual evidence.

## Exact IDE instruction

Use this instruction for one phase at a time:

> Read this entire file. Implement Phase PNN only. Do not ask me questions. Resolve ambiguity using the Autonomy Protocol and the safest reversible default. Keep existing backend and business semantics unchanged. Run the lean verification required for this phase, issue the Phase Completion Report, and stop without beginning the next phase.

Replace `PNN` with `P00` through `P07`.

“Continue” means continue the current phase. The IDE starts another phase only when explicitly instructed with that phase ID.

# Operating rules

## Autonomy Protocol

The IDE MUST make progress without asking the user for owners, approvals, staffing, funding, reviewers, design preferences, fixtures, API decisions or test strategy.

For every unknown:

1. Inspect the repository and running application.
2. Preserve confirmed product and backend truth.
3. Choose the safest reversible interpretation.
4. Isolate it behind an existing component, token, configuration value, fixture or typed frontend adapter.
5. Record the assumption in `docs/unauth-ui/assumptions.md` or the closest existing project documentation location.
6. Continue the phase.

Use this precedence order:

1. Explicit requirements in this file.
2. Current executable application behaviour and API types.
3. Existing repository conventions and shared components.
4. Apple-aligned platform conventions.
5. The simplest accessible and reversible implementation.

### Mandatory fallbacks

| Missing or unclear input | IDE action |
|---|---|
| Design documentation | Derive and document the visual system from this file and the current app; continue |
| Owner, approval or sign-off | Ignore it for implementation; no governance artifact is required |
| API response in local development | Add a typed development-only `DemoAdapter` using the canonical synthetic fixture; keep the production adapter unchanged |
| Backend capability | Build the complete UI state and adapter seam; show **Unavailable** in production until the capability exists; never claim it is live |
| Financial meaning | Use only a semantically equivalent existing field; otherwise show **Unavailable** or synthetic demo data; never invent a production formula |
| External service or credential | Use a deterministic local fixture and continue; never request or expose a secret for UI work |
| Optional image or icon | Reuse the existing icon set or platform symbol; do not block for custom art |
| New library | Use the existing stack first, browser-native capability second, and a small pinned dependency only when the existing stack cannot do the job |
| Broken external integration | Isolate it with the existing interface and a local adapter; complete the UI and record the release hold |
| Conflicting evidence | Prefer this file for UI direction and the executable backend for product semantics |
| No version-control revision | Report `NOT VERSIONED` plus the file manifest; continue |
| No established documentation path | Use `docs/unauth-ui/` |

Do not create owner registries, approval matrices, staffing plans, certification locks, hardware-lab plans, user-research programmes or large ADR sets. A short decision note is enough only when the phase introduces a new dependency or a durable frontend architecture boundary.

## Hard boundaries

Do not stop the whole rebuild for an isolated problem. Stop only the dependent action when it would:

- delete, overwrite or corrupt user data, repository history or unrelated user changes;
- change financial calculations, business rules, API semantics, permissions, audit behaviour or persisted production data;
- mutate production, deploy, publish, charge money or trigger another irreversible external effect;
- require unavailable secrets or disclosure of live personal/customer data; or
- force a financial or merchant-authority claim for which neither the repository nor this file provides a truthful interpretation.

Before using `HARD_STOP`, attempt the repository implementation, a compatibility-preserving frontend adapter and a deterministic local fixture. Use `HARD_STOP` only when no safe in-scope work remains. Do not ask a question; report the exact boundary and the fallback attempts. Every unaffected surface continues.

## Scope

In scope:

- visual hierarchy, layout, typography, density, colour and motion;
- shell, navigation, responsive behaviour and route composition;
- charts, tables, filters, saved views, forms, drawers, dialogs and operating states;
- frontend adapters that preserve existing API meaning;
- loading, empty, partial, stale, unavailable, permission, error and recovery presentation;
- accessibility, keyboard/focus behaviour and responsive reflow;
- deterministic synthetic fixtures and landing-page captures; and
- frontend-only view models and typed adapters that leave backend files, endpoints and semantics unchanged.

Out of scope:

- rewriting the backend, database, authentication or permission model;
- changing financial formulae or promotion rules;
- database migrations, production rollout, feature-flag cohorts or deployment;
- organisational governance, formal certification or regulatory/legal conclusions;
- exhaustive browser/state matrices, formal user studies or arbitrary test-count targets; and
- redesigning product capabilities that are not required for the UI rebuild.

# Product truth

Unauth is a post-purchase payout-control workspace for ecommerce merchants. It reconciles order, ticket, shipment, refund, return, dispute and recovery evidence; exposes financial exposure; recommends a policy outcome; and leaves the final payout decision with an authorised merchant operator.

The product spine is:

> Source facts → classification → recommendation → merchant decision → recovery handoff → ledger outcome

Every surface preserves four boundaries:

1. Recommendation is not merchant authority.
2. Approved is not received.
3. Estimated or modelled is not actual.
4. Connected or validated is not reconciled or decision-safe.

# Visual direction

## Point of view

The product should feel like a premium financial instrument: quiet, compact, exact, confident and authored for this domain. It must not resemble a generic admin dashboard, a grid of cards or a prose-heavy compliance tool.

Analytical pages answer the primary question visually in the first viewport. Exact tables, provenance and methodology remain one action away as verification—not as the opening experience.

| Surface type | Intended composition |
|---|---|
| Overview, Losses, Recovery, Reconciliation, Reports | 55–70% visual analysis; 20–35% exact data/table; minimal explanatory copy |
| Work, Cases, Rules impact | Task surface first with 20–40% visual context |
| Registries, Sources, Imports, Customers, Settings, Audit, Help | Task-led table/form/detail; charts only when they answer a real question |

## Layout rules

- Use a 4 px base grid with 4, 8, 12, 16, 24, 32, 40 and 48 px steps.
- Sidebar is 224 px expanded and 64 px collapsed. Default to collapsed at 1280 px and an accessible drawer below 1024 px.
- Use 32 px page gutters at wide desktop, 24 px around 1280 px, 20 px around 1024 px and 16 px on narrow screens.
- Use 8 px radii for controls/panels and 12 px for drawers/dialogs. Full pills are statuses only.
- Prefer alignment and spacing over nested cards. Do not place cards inside cards.
- Use one clear primary action per page header.
- Keep the first meaningful visual above the fold at 1440×900.
- Use progressive disclosure for methodology, provenance and infrequent actions.
- Keep touch-relevant controls at least 44×44 px.
- Motion is brief: 160 ms interaction, 200 ms overlay and 240 ms maximum layout transition. Reduced motion removes translation.

## Text budgets

- Page title: 8 words maximum.
- Context line: 18 words maximum.
- KPI label: 3 words maximum.
- Chart title: 8 words maximum.
- Chart question/takeaway: 14 words maximum.
- Annotation: 8 words maximum, up to three per chart.
- Row reason: 16 words maximum or two compact lines.
- No explanatory paragraph above an analytical hero or operating table.

Never shorten a decisive financial qualifier, state, amount or authority boundary merely to satisfy a copy budget.

## Core tokens

| Token | Value | Use |
|---|---|---|
| ink.950 | `#101828` | Primary text and money |
| ink.800 | `#1D2939` | Navigation and strong secondary text |
| ink.600 | `#475467` | Supporting text |
| ink.500 | `#667085` | Metadata only |
| canvas | `#F7F8FA` | App background |
| surface | `#FFFFFF` | Tables, panels and overlays |
| border | `#D0D5DD` | Controls and strong separation |
| hairline | `#E4E7EC` | Rows and quiet separation |
| action | `#4338CA` | Primary actions, links and selected state |
| actionTint | `#EEF2FF` | Selected surface |
| recovered | `#067647` / `#ECFDF3` | Ledger-confirmed Recovered only |
| estimate | `#175CD3` / `#EFF8FF` | Estimated actual |
| modelled | `#6941C6` / `#F4F3FF` | Counterfactual modelled |
| attention | `#B54708` / `#FFFAEB` | Stale, due or review required |
| critical | `#B42318` / `#FEF3F2` | Failed, blocked or destructive |
| unknown | `#344054` / `#F2F4F7` | Unavailable or insufficient evidence |

Use the repository's existing Inter face first, with system UI and Segoe UI fallbacks; do not import or bundle SF fonts. Use tabular numerals for money, dates, counts and percentages. Default body is 14/20 px, table text 13/18 px and metadata 12/18 px. Page title is 24/32 px and the single primary money total is 28/34 px. Do not introduce a display font.

Green is exclusive to fully qualified ledger-confirmed Recovered. Every status also has text and a non-colour cue.

# Visual systems

## Closed chart grammar

Route code uses these variants instead of arbitrary chart configuration:

| ID | Use | Contract |
|---|---|---|
| V01 | Financial bridge | Currency waterfall. First/final totals start at zero; signed steps float. Net loss uses Gross realised loss → Recovered applied → Net loss. Reconciliation uses Source → documented adjustments → visibly hatched Unresolved residual → Ledger. |
| V02 | Actual over time | Unsmoothed 2 px lines, maximum three compatible actual series. Stocks and period flows never share a plot. Missing periods are gaps. |
| V03 | Estimated actual | Dotted point line with hatched lower/upper range, method, confidence, exclusions and as-of. Never enters actual. |
| V04 | Counterfactual model | Dashed point line with a distinct patterned range, baseline, model/version, assumptions and as-of. Never enters actual, recovered or net. |
| V05 | Ranked categories | Zero-based horizontal bars sorted by exact value, then stable category code. Full data remains available. |
| V06 | Recovery position | Five zero-based horizontal bars: Sought, Approved, Pending receipt, Recovered and Outstanding. It is not a funnel. |
| V07 | Ageing | Zero-based bars for 0–1, 2–7, 8–14, 15–30, 31–60 and 61+ days, showing exact amount and count. |
| V08 | Rule impact | Separate live/draft recommendation-count panel and current reconciled-exposure transition panel. It never predicts approvals or payments. |

Prohibited: pie/doughnut, gauge, radar, 3D, decorative sparklines, dual axes, smoothed lines, gradients, count-up money animation and more than three series in one plot.

Every chart has:

- a clear title, scope, period/as-of, unit and data state;
- an adjacent or one-action **View data** table;
- identical values, filters, ordering, gaps and qualifiers in chart/table/export;
- an accessible summary and keyboard-reachable data;
- labels/patterns in addition to colour; and
- truthful loading, empty, partial, stale, unavailable and error states when relevant.

At 400% zoom the exact table may replace the graphic without losing information.

## Route composition

| Route/surface | Required approach |
|---|---|
| Overview | V01 Net loss bridge; V02 Realised loss/Recovered applied/Net loss; separate V03 and V04; four-value trust strip; five-row attention queue |
| Work | Pressure strip plus decisive operating table; no decorative chart |
| Case detail | EvidenceSpine, qualified exposure, recommendation and merchant-decision boundary; no generic analytics |
| Losses | V01 loss bridge, V02 trend and V05 cause ranking above the ledger |
| Recovery | V06 position, cumulative V02, V07 ageing and exact portfolio table |
| Reconciliation | V01 source-to-ledger bridge, V07 unresolved ageing, exact exception metrics and comparison workspace |
| Reports | Only purposeful combinations of V01–V07 with View data |
| Rules test/impact | V08 plus exact fixtures and affected-case table |

All other routes are task-led.

## Financial display rules

- Existing backend/API financial values are authoritative. The browser formats and renders; it does not invent, repair, promote or aggregate money.
- Map a field only when its meaning is semantically equivalent. A similar label is insufficient.
- Exact zero is distinct from unavailable.
- Partial scope shows the known subtotal and missing scope.
- Estimated actual and modelled counterfactual remain visually and structurally separate from exact actual.
- Pending receipt is excluded from Recovered and Net loss.
- Credits and reversals retain their sign.
- Approved never resembles received cash.
- Recommendation never resembles a merchant decision.
- If production data lacks a required meaning, show **Unavailable**. The demo adapter may supply a clearly synthetic display fixture for development and screenshots.

## Tables and operating surfaces

- Use one canonical DataTable rather than page-specific table systems.
- Right-align money/counts, left-align identity/reasons, use tabular numerals and keep column headers short.
- Standard density is 48 px; compact density is 40 px with 44 px interactive target zones.
- Keep headers and decisive identity/context sticky where it helps the task.
- Preserve filter/query state in the URL where the current router supports it.
- Put Exposure, Why now, State, Evidence, Owner, Due and safe Actions ahead of low-value metadata.
- Use row preview for inspection and a review step for consequential bulk actions.
- Loading preserves column geometry; empty and no-match states are different; errors retain the last safe context.
- Do not turn every state into a pill or wrap every table in multiple panels.

## Shared states

Implement a state only where the surface can genuinely reach it. Use one shared pattern for:

- loading and delayed loading;
- genuine empty and filter no-match;
- partial, stale and unavailable;
- permission denied;
- error, timeout/offline and recovered-from-error;
- form validation and retained failed submission;
- conflict/unknown outcome for consequential actions; and
- success with one durable receipt where the existing backend provides it.

Do not manufacture a Cartesian product of every state for every component.

# Lean verification contract

Quality comes from high-signal checks and visual inspection, not a large test count.

## Risk levels

| Risk | Examples | Verification depth |
|---|---|---|
| R1 Critical | Money display, authority boundary, mutation, export, privacy, audit | Targeted automated scenarios plus fixture parity and visual proof |
| R2 Important | Primary workflow, routing, table/filter behaviour, recovery states | Primary path, highest-risk failure and visual/accessibility smoke |
| R3 Presentational | Layout, typography, colour, copy, non-critical interaction | Visual review and interaction smoke; no dedicated E2E unless behaviour changed |

## Test budget

- There is no test-count quota.
- There is no minimum number of new tests. A purely visual change with adequate existing coverage may add none.
- A normal phase may add up to four automated scenario families when changed behaviour lacks coverage.
- A phase that actually changes R1 frontend behaviour may add up to eight families.
- More than eight new families requires a short risk note explaining the genuinely distinct failure modes.
- One table-driven family may cover multiple values without becoming dozens of separate tests.
- Do not test static styling in unit tests; verify it visually.
- Do not duplicate the same assertion in unit, component and end-to-end layers.
- Run targeted tests during phases. Run the existing full regression suite once in P07 and earlier only when a shared foundation makes it necessary.
- Record pre-existing failures in P00. They do not stop the rebuild; the phase must introduce no new failure in changed scope.
- If a preferred test tool is absent, use the repository's existing runner plus browser/keyboard verification. Do not add a testing platform merely to satisfy this plan.

## Required checks per changed phase

1. One primary workflow succeeds.
2. One realistic adverse state fails safely or recovers.
3. Changed routes do not become blank, trapped or falsely successful.
4. Changed controls work by keyboard with sensible focus.
5. Normal and stress visual states retain the intended hierarchy.
6. Any defect fixed during the phase receives one regression test when behaviour—not styling—caused it.

For changed financial presentation, additionally prove with the single canonical fixture:

- chart and View data show identical values;
- exact zero differs from unavailable;
- estimated/modelled never enter actual;
- Approved, Pending receipt and Recovered remain distinct;
- negative values retain their sign; and
- no new client-authored money calculation was introduced.

## Bounded visual QA

For each changed route, capture:

- primary state at 1440×900;
- the riskier of 1024 px or direct 390/320 px;
- one adverse state; and
- one stress state only when dense rows, long content or large values are material.

Review desktop and narrow captures together at phase end. Prefer one batched correction and one confirmation. If confirmation still exposes a concrete failed acceptance criterion, run another focused correction/confirmation batch; continue until the criterion passes. Do not keep generating captures after the gate passes or polish details that do not affect an acceptance criterion.

Each phase also runs one keyboard smoke and an automated accessibility check on changed routes. Final P07 uses VoiceOver/Safari when macOS is available and NVDA/Chrome when Windows is available; otherwise use the primary platform's native screen reader plus automated checks and record the unavailable secondary environment as a non-blocking coverage gap. P07 also checks 200% text and 400% zoom on supported critical journeys. Forced colours and reduced motion are tested when colour/motion changed and once in P07.

No fixed physical performance lab is required. Use the existing production build tooling and browser performance traces. Block obvious regressions: accidental large dependencies, multi-second local UI stalls, layout shift, broken virtualisation or charts that lock interaction.

# Phase index

| Phase | Outcome |
|---|---|
| P00 | UI reality lock |
| P01 | Visual North Star and shell |
| P02 | Shared UI, chart and table systems |
| P03 | Overview, Work and Cases complete |
| P04 | Losses and Recovery complete |
| P05 | Reconciliation and Reports complete |
| P06 | Controls and supporting surfaces complete |
| P07 | Integrated hardening and landing-page captures |

# Phase P00 — UI reality lock

## Objective

Understand the real frontend quickly and freeze the boundary: rebuild the UI while preserving backend/business semantics.

## Implement

- Identify framework, package manager and existing build/typecheck/lint/test/dev commands.
- Inventory reachable routes, redirects, shared shell, tables, charts, forms, overlays and state utilities.
- Inventory current API/client types used by financial and authority-sensitive surfaces.
- Capture baseline screenshots for Overview, Work, Case detail, Losses, Recovery, Reconciliation and Rules impact when runnable.
- If the full app depends on unavailable external services, use its existing mock path or create a small development-only adapter so the relevant routes render.
- Record current reusable strengths, visible design failures and components to keep/replace in `docs/unauth-ui/reality-lock.md`.
- Record assumptions/fallbacks in `docs/unauth-ui/assumptions.md`.
- Freeze non-goals: no backend rewrite, financial formula change, permission change, database migration, production deployment or unrelated cleanup.

If the application cannot run after repository-local diagnosis, create an isolated route/component harness inside the existing frontend stack and continue. Use `HARD_STOP` only if the project is unreadable/unwritable and neither the app nor a safe harness can be built.

## Verify

- Run discovered typecheck/lint/build commands that already exist and are relevant.
- Prove at least one real route or isolated existing-stack harness renders with actual types or the typed DemoAdapter.
- Confirm no business/backend file was changed.

## Complete when

- The route/component/data inventory and baseline proof exist.
- The frontend-safe boundary is explicit.
- The app or safe harness renders.
- P01 can start without asking the user anything.

# Phase P01 — Visual North Star and shell

## Objective

Establish the definitive visual direction in the real app before scaling it.

## Implement

- Add the core colour, typography, spacing, radius, focus and motion tokens.
- Implement the responsive shell, sidebar, utility bar, page gutters, navigation states, breadcrumbs and route-level loading/error boundary.
- Redesign the normal states of Overview, Work and Case detail directly on their real routes.
- Overview proves the chart-led analytical direction.
- Work proves the operating-table direction.
- Case detail proves EvidenceSpine and recommendation-versus-decision hierarchy.
- Use existing data contracts or the typed DemoAdapter; do not wait for APIs/assets.
- Remove generic card grids, oversized headings, repetitive explanatory text and legacy/new visual hybrids from these three surfaces.

## Verify

- Use existing coverage and add no more than four focused scenario families where shell/navigation or changed interaction behaviour lacks coverage.
- Primary 1440×900 plus one narrow capture for each surface.
- Keyboard shell/navigation smoke and automated accessibility check.
- One batched defect correction and one confirmation pass.

## Complete when

- Overview, Work and Case detail feel like one premium financial product.
- The first viewport communicates position, trust and next action.
- Desktop and narrow layouts reflow without clipped qualifiers or dead navigation.
- No business semantics changed.

# Phase P02 — Shared UI, chart and table systems

## Objective

Turn the North Star into reusable components without creating a giant design-system project.

## Implement

- Extract only the primitives already proven necessary: Stack, Inline, Grid, Divider, ScrollRegion and VisuallyHidden.
- Build only the controls P01 already consumes: Button, Link, IconButton, FieldControl, Tabs, Disclosure, Tooltip, Status and responsive Drawer. Add Menu, Dialog or Toast later at the first real route that needs each one.
- Build FinancialValue, QualifierStack, ProvenanceStrip, EvidenceSpine, DecisionBoundary and durable feedback/receipt treatments.
- Build one canonical DataTable and FilterBar from the P01 Work implementation. Defer SavedView, row preview and bulk review to P03 where they gain real route consumers.
- Build AccessibleChartFigure, View data and V01–V04 because P01 Overview already consumes them. Defer V05–V07 to P04 and V08 to P06; do not build a variant before its owning route needs it.
- Add the shared loading, empty, partial, stale, unavailable, denied, error and recovery treatments used by real routes.
- Replace the P01 route-local patterns with shared implementations.

Do not build unused abstractions, theme editors, plugin APIs, arbitrary chart builders or variants without a named route consumer.

## Verify

- Use existing coverage and add no more than four component scenario families for changed behaviour that is otherwise unproved.
- One canonical golden financial fixture for chart/View-data parity.
- Keyboard/focus smoke for the table, drawer and one representative additional control actually implemented in P02.
- Visual confirmation that P01 surfaces did not regress during extraction.

## Complete when

- All shared pieces have at least one real route consumer.
- Charts and tables share exact data and qualifiers.
- No duplicate table, money formatter, overlay or route-local visual token remains on P01 surfaces.

# Phase P03 — Overview, Work and Cases complete

## Objective

Finish the product's main orientation and decision workflow.

## Implement

### Overview

- Four KPIs: Payout exposure, Ledger-confirmed Recovered, Modelled avoided exposure and Realised loss.
- V01 Net loss bridge; V02 actual period-flow trend; separate V03/V04; trust strip; five-row Needs attention queue.
- One obvious next action and no explanatory paragraph before the hero.

### Work

- Header with open count and safe assign-next action where already authorised.
- Pressure strip: Overdue, Due today, Blocked and Unassigned.
- Operating table with Priority, Work item, Exposure, Why now, State, Evidence, Owner, Due and Actions.
- Implement SavedView, row preview, selection and bulk review as extensions of the P02 table/filter patterns.

### Cases

- Complete case list, preview and detail continuity.
- EvidenceSpine, qualified financial exposure, recovery, activity and comments.
- Recommendation and merchant-decision regions remain visibly separate.
- Existing review/commit mutation preserves permissions, consequence and durable feedback.
- Do not add a chart merely to fill space.

## Verify

- Use existing coverage and add no more than six focused scenario families for uncovered table/filter, case-review or recovery behaviour.
- One exact chart/View-data parity check.
- Keyboard smoke through Work → Case → existing decision review.
- Primary, narrow and one adverse capture per surface family.

## Complete when

- A user can understand current financial position and next action immediately.
- Work scanning is faster and denser without becoming cramped.
- Case evidence, recommendation and authority are unambiguous.

# Phase P04 — Losses and Recovery complete

## Objective

Replace ledger-first pages with visual financial control surfaces backed by exact operating tables.

## Implement

### Losses

- Implement reusable V05 for ranked loss causes.
- V01 Gross realised loss → Recovered applied → Net loss.
- V02 actual trend and V05 cause ranking.
- Exact ledger immediately below analysis.
- Detail view exposes existing source, case, posting, allocation and reversal data.
- Estimated/modelled values stay outside actual visuals.

### Recovery

- Implement reusable V06 recovery position and V07 ageing variants before composing the routes.
- V06 Sought, Approved, Pending receipt, Recovered and Outstanding without funnel semantics.
- Cumulative Recovered V02 and V07 ageing.
- Portfolio table and existing detail/context views.
- Pending receipt stays outside Recovered; approved never looks received.

## Verify

- Use existing coverage and add no more than six focused scenario families for uncovered financial-display or recovery behaviour.
- Exact chart/View-data parity for one canonical scope.
- Keyboard table/detail smoke.
- Desktop/narrow/adverse captures for Losses and Recovery.

## Complete when

- Visuals answer “where is loss?” and “where is recovery?” before the tables.
- Every financial distinction remains truthful.
- No new client-authored aggregation exists.

# Phase P05 — Reconciliation and Reports complete

## Objective

Create a strong financial command centre and a reusable chart-led report experience.

## Implement

### Reconciliation

- Wide layout: exception queue, comparison workspace and resolution rail.
- V01 Source → documented adjustments → visibly separate Unresolved residual → Ledger.
- Show difference, matched value, unresolved positive, negative, gross, net and count together.
- V07 unresolved ageing.
- Preserve existing candidate matching, split/many-to-one flows, locks, conflict handling and resolution mutation.
- At narrow/zoomed layouts, order queue → comparison → resolution without losing context.

### Reports

- Chart-led report index and detail using only V01–V07.
- Actual, estimated and modelled content in separate panels.
- View data one action away from every chart.
- Preserve existing filters, record links, provenance and export semantics.

## Verify

- Because reconciliation is R1, use existing coverage and add no more than eight focused scenario families for genuinely uncovered compare/resolve, conflict, unresolved-metric or report-parity behaviour.
- One canonical API/UI/chart/View-data/export parity check where the existing export is available.
- Keyboard smoke through exception selection, comparison and resolution.
- Desktop/narrow/adverse captures for Reconciliation and Reports.

## Complete when

- The residual is never disguised as an adjustment.
- Opposing unresolved values cannot disappear behind net.
- Reports remain exact and visually legible without arbitrary chart configuration.

# Phase P06 — Controls and supporting surfaces complete

## Objective

Bring every remaining reachable route into the same system without forcing analytics onto task-led pages.

## Implement

### Controls

- Implement reusable V08 before composing Rules impact.
- Rules registry/detail/editor/test with When, If and Recommend structure.
- V08 impact plus exact affected-case/fixture data.
- Keep rule recommendations separate from merchant decisions/payments.
- Flows use a structured vertical sequence, not an infinite canvas; preserve existing capabilities and run history.

### Sources and Imports

- Connected-source registry with separate connection, permission, schema, mapping, freshness and reconciliation impact.
- Setup, recovery and import states use focused forms/tables and existing behaviour.
- Never imply “connected” means financially trusted.

### Customers, Settings and utilities

- Customers, previews/details, Settings, Team, Billing, Notifications, API access, Legal, Privacy and Audit use the shared table/form/detail system.
- Search, Notifications and Help use concise task-led layouts.
- Keep secrets redacted and existing permission boundaries unchanged.
- Do not add generic risk charts or decorative analytics.

## Verify

- Use existing coverage and add no more than six scenario families across the highest-risk uncovered behaviours, not one suite per route.
- Route smoke for every reachable supporting route.
- Keyboard/accessibility smoke for one rule workflow, one source workflow and one settings workflow.
- Representative desktop/narrow/adverse captures, capped at eight unless a real defect needs evidence.

## Complete when

- No reachable route retains the legacy visual language.
- No route gained an invented capability or financial claim.
- Task-led pages remain concise, useful and visually consistent.

# Phase P07 — Integrated hardening and landing-page captures

## Objective

Finish the rebuild, correct material inconsistencies and produce the five landing-page images.

## Implement

- Run the existing full regression suite once.
- Run six critical journeys when the existing product supports them: Overview orientation, Case decision, Recovery receipt, Reconciliation resolution, Rule test/publish and authority/settings change. When a capability does not exist, verify the truthful Unavailable state, typed adapter seam and absence of a false live claim instead of adding backend functionality.
- Run cross-route financial fixture parity and scan for client-authored financial arithmetic.
- Run automated accessibility on changed routes, keyboard journeys, an available native screen-reader/browser smoke, 200% text and 400% zoom. Use both VoiceOver/Safari and NVDA/Chrome only when those platforms already exist locally or in project CI.
- Check current stable browsers available locally or in existing CI with pairwise route coverage. Previous-stable or secondary-platform coverage is required only when the project already provides it; otherwise record a non-blocking coverage gap. Exhaustive route × browser × state × viewport testing is prohibited.
- Review every changed route at 1440 and its riskiest narrow width. Use pairwise coverage across route families so 1024, 390 and 320 px are all represented without testing every route at every width.
- Run a batched visual defect pass and confirmation. If a named craft-gate criterion still fails, repeat a focused correction/confirmation batch until it passes; never lower or manipulate the score.
- Remove dead legacy styles/components introduced solely by the old UI when repository-safe.
- Produce the five fixed captures from `unauth-demo-v1`: Hero Overview, Cases workbench, Recovery portfolio, Reconciliation command centre and Rule impact proof.

The DemoAdapter may populate an existing semantically validated capability with synthetic values; it may not invent a capability, route, authority or financial meaning for a screenshot. If one fixed capture is unsupported by the production adapter, replace it without asking from this ordered list: Losses analysis, Reports detail, Work queue, Sources command view. Record the substitution and why it is truthful.

## Landing capture requirements

- 1440×900 CSS pixels at DPR 2, yielding 2880×1800 PNG masters.
- Deterministic clock, ordering, fonts, icons and demo fixture.
- No personal data, secret, debug control, unresolved loader, clipped qualifier or misleading state.
- Provide WebP derivatives and value-led alt text.
- Do not crop away evidence, as-of, warning or authority boundaries.
- The five images use the same fixture and reconcile exactly.

## Final craft gate

Score every materially distinct changed route from 0–10 for Financial truth, Hierarchy, Workflow clarity, Visual craft, Accessibility/resilience and Product specificity. Routes that share the same template may be reviewed as one surface family, but each route must still be inspected for route-specific data, copy, state and clipping defects. Score each of the five landing captures individually using the same dimensions.

- Every category must be at least 9.5.
- Every reviewed route/surface-family average and every capture average must be at least 9.5.
- A misleading financial/authority state, generic-dashboard feel, clipping or unfinished loading/error state is an automatic failure.
- Correct every named failure in focused batches and re-review until the gate passes. Stop iterating once it passes; never lower a score, waive a category or add decorative complexity merely to claim improvement.

## Complete when

- Changed routes and supported critical journeys meet WCAG 2.2 AA with zero critical or serious accessibility defects.
- No critical financial, authority, privacy or route-break defect remains.
- Every supported critical journey passes; unsupported capabilities show truthful Unavailable states and complete frontend adapter seams. Lean cross-cutting checks pass.
- The app has one coherent visual language.
- Every reviewed route or surface family passes the 9.5 craft gate.
- All five captures pass the craft gate and are reproducible.
- No deployment or landing-page publication was performed.

# Canonical synthetic fixture

Use `unauth-demo-v1` only for development, visual checks and screenshots of capabilities whose production adapter and semantics already exist. It supplies synthetic values, never synthetic product capability. It is GBP data for 2026-01-01 inclusive through 2026-07-01 exclusive, as-of `2026-06-30T11:00:00Z`.

| Result | Value |
|---|---:|
| Payout exposure | £284,620.00 |
| Ledger-confirmed Recovered | £118,400.00 |
| Gross/Realised loss | £164,800.00 |
| Recovered applied | £118,400.00 |
| Net loss | £46,400.00 |
| Estimated realised loss | £21,600.00; range £18,200.00–£24,900.00 |
| Modelled avoided exposure | £84,000.00; range £76,000.00–£92,000.00 |

| Month | Realised loss | Recovered applied | Net loss |
|---|---:|---:|---:|
| Jan | £24,000.00 | £14,000.00 | £10,000.00 |
| Feb | £28,500.00 | £18,000.00 | £10,500.00 |
| Mar | £30,000.00 | £20,000.00 | £10,000.00 |
| Apr | £27,300.00 | £21,400.00 | £5,900.00 |
| May | £25,000.00 | £20,000.00 | £5,000.00 |
| Jun | £30,000.00 | £25,000.00 | £5,000.00 |

Recovery positions: Sought £246,000.00; Approved £190,000.00; Pending receipt £71,600.00; Recovered £118,400.00; Outstanding £71,600.00.

Reconciliation: Source £1,284,500.00; documented adjustments −£2,100.00; Unresolved residual −£750.00; Ledger £1,281,650.00. Unresolved positive £1,250.00; negative magnitude £500.00; gross £1,750.00; net £750.00; count 4.

Rule impact live/draft counts: Request evidence 80/55; Pursue recovery 70/92; Manual review 60/58; No action 40/45. Changed-case reconciled exposure totals £83,000.00.

Case capture: `CASE-24017`, Payout exposure £18,400.00, recommendation **Request evidence**, no merchant decision, incomplete carrier proof and next action **Request carrier proof**.

# Phase Completion Report

End every phase with this compact report and then stop:

```text
# Phase PNN Completion Report

Status: COMPLETE | COMPLETE_WITH_ASSUMPTIONS | HARD_STOP
Candidate revision: commit/hash | NOT VERSIONED
Changed routes/components:
Primary visual proof:
Checks run and results:
Financial/business-semantics preservation: PASS | NOT APPLICABLE
Accessibility/keyboard smoke:
Assumptions and fallbacks used:
Remaining defects: none critical | list
Hard boundary, if any: none | exact action and attempted safe fallbacks
Next phase started: NO
```

`COMPLETE_WITH_ASSUMPTIONS` is a valid phase outcome and does not require a question or approval. Assumptions remain replaceable through their documented adapter/token seam.

Use `HARD_STOP` only for the Hard boundaries in this file after every safe fallback and unaffected task is complete. It is not valid for missing owners, approvals, documentation, optional assets, API availability in development, fixtures, test infrastructure, reviewers or design choices.

# Final directive

Rebuild the interface, not the company around it.

Make the product visual-first, exact and distinctly Unauth. Preserve backend truth. Prefer one strong component over a framework, one golden fixture over dozens, and one high-signal test over ten redundant tests. Make reversible decisions, record assumptions and keep moving.
