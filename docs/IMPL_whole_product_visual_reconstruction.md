# IMPL — Whole-product visual reconstruction

- **Status:** Approved visual direction — ready for implementation
- **Date:** 31 July 2026
- **Programme:** `VR-00` through `VR-14`
- **Scope:** every production page, page state, shared shell, overlay, embedded
  product view, and screenshot-producing surface
- **Change boundary:** presentation only
- **Product authority:** [`../PRODUCT.md`](../PRODUCT.md)
- **Visual authority:** [`../DESIGN.md`](../DESIGN.md)
- **Calibration surface:** [`IMPL_dashboard_overview_decision_surface_iteration.md`](IMPL_dashboard_overview_decision_surface_iteration.md)
- **Route registry:** [`../scripts/living-precision/manifest.mjs`](../scripts/living-precision/manifest.mjs)
- **Exhaustive coverage ledger:** [`APPX_whole_product_visual_coverage_ledger.md`](APPX_whole_product_visual_coverage_ledger.md)
- **Implementation model:** one source-level reconstruction followed by one
  atomic visual cutover; no merchant-facing visual feature flag
- **Creative north star:** **The Quiet Evidence Desk**
- **Operating composition:** **The Decision Briefing**

No visual-direction decision remains open. This document makes the decisions
required to rebuild the complete interface while preserving product truth and
functionality.

---

## 0. Executive decision

Unauth will be visually reconstructed as one coherent product.

The new dashboard is the quality and hierarchy reference, but it is not a page
template. The rest of the application will inherit its discipline:

- one dominant object per view;
- calm, exact typography;
- joined work surfaces instead of card grids;
- visibly ordered state, money, evidence, and action;
- tonal planes instead of decorative elevation;
- one restrained violet interaction voice;
- direct, browser-native controls;
- complete loading, empty, error, permission, stale, and degraded states; and
- screenshot-quality composition that remains usable for sustained work.

“Tear it down” means the old visual architecture is not protected. Existing
page shells, local palettes, duplicate cards, route-specific spacing systems,
inline appearance, and inconsistent component anatomy may all be removed.

“Build it back up” does **not** mean rewriting the product. Routes, data,
permissions, workflows, queries, mutations, content truth, and financial
semantics stay intact. The work replaces presentation, not capability.

The rebuild ships only when the entire visual system is coherent. It must not
release as a half-new, half-old product.

---

## 1. Exact scope

### 1.1 Included

The programme includes:

1. **58 production page routes**, **4 redirects**, and **2 development
   harnesses** in the current 64-route manifest, plus the unregistered
   case-detail prototype lab: **65 page modules in total**.
2. Root, public, authentication, onboarding, authenticated, settings, and
   legal layouts.
3. Every page-level `loading`, `error`, `not-found`, empty, filtered-empty,
   stale, partial, disconnected, permission, locked, and success state.
4. The authenticated sidebar, utility toolbar, banners, command palette,
   navigation feedback, toasts, menus, tooltips, dialogs, drawers, and
   contextual inspectors.
5. Tables, registries, boards, charts, timelines, evidence groups, forms,
   builders, activity histories, and record-detail compositions.
6. Marketing, pricing, demo, signup, login, reset, onboarding, help, and legal
   surfaces.
7. The Chrome extension popup and its setup, loading, lookup, results, error,
   and settings views.
8. Helpdesk widget HTML and unlock/error states, plus any visible checkout
   extension surface.
9. The design-system gallery and integration preview harnesses as internal
   visual QA tools.
10. Real deterministic product captures used on the landing page.

The coverage appendix additionally assigns all **7 layouts**, **95 route-state
boundaries**, **53 named nested views/overlays**, **21 stateful subview owners**,
and **4 non-route embedded renderers** to an implementation phase. Its
filesystem-backed checker must remain green throughout the programme.

### 1.2 Excluded

This programme does not change:

- database schema, API contracts, server actions, provider behaviour, billing
  rules, permissions, entitlements, or merchant isolation;
- decision logic, recommendations, case transitions, financial calculations,
  recovery logic, audit behaviour, or source reconciliation;
- route taxonomy, redirects, deep links, query semantics, exports, or browser
  history behaviour;
- product capability, factual claims, pricing, legal meaning, or release
  promises;
- native mobile product scope; or
- transactional email and generated PDF design unless a later brief explicitly
  adds them.

Presentation code may derive a display-only view model from existing data. It
may not invent data, change its meaning, or make a read path mutate state.

### 1.3 Copy boundary

Product copy is frozen except for:

- typo and grammar correction;
- accessibility labels;
- truthful truncation, wrapping, or progressive disclosure; and
- replacing a visually ambiguous label with an existing canonical term from
  the product contract.

New claims, promises, outcomes, proof, customers, benchmarks, and capabilities
are prohibited.

---

## 2. Authority and cutover

### 2.1 What remains

- [`../PRODUCT.md`](../PRODUCT.md) owns product truth.
- Functional implementation documents own workflow and behavioural truth.
- [`../DESIGN.md`](../DESIGN.md) owns the durable visual language.
- The completed Overview dashboard owns the practical quality calibration for
  hierarchy, restraint, information density, trust treatment, and supported
  desktop composition.

### 2.2 What this programme supersedes

When `VR-00` begins, this document becomes the active implementation authority
for every product-facing visual surface. Earlier visual programmes become
historical evidence only, including:

- Living Precision;
- Quiet Precision;
- the authenticated Apple-quality migration;
- the earlier product-polish route phases; and
- the old Chrome-extension brown/orange visual system.

The dashboard iteration remains a calibration reference, not a conflicting
programme.

### 2.3 Hard-cutover rule

- No `ui_v3`, visual cohort, theme fork, screenshot route, or merchant-facing
  appearance flag.
- Functional rollout flags remain unchanged and never choose a visual system.
- Route families may be migrated in source over several phases, but production
  release waits for `VR-14`.
- Rollback is a deployment rollback, not a permanent second theme.
- Old visual code is deleted only after its final consumer is migrated and the
  replacement passes its phase gate.

---

## 3. The visual world

### 3.1 Creative thesis

Unauth should feel like a modern evidence and recovery workspace assembled by
one meticulous product team: quiet at rest, decisive at the moment of judgment,
and visibly honest about provenance and uncertainty.

Its distinctive visual material is not decoration. It is the relationship
between:

`source fact → evidence → judgment → financial consequence → next action`

Every surface must make its part of that chain legible.

### 3.2 Apple practice, translated correctly

Use:

- strong information hierarchy;
- familiar browser controls;
- immediate and restrained feedback;
- careful fit at every supported size;
- progressive disclosure;
- consistent component anatomy;
- low cognitive friction; and
- state quality equal to the happy path.

Do not use:

- iOS tab bars, large mobile navigation titles, bottom sheets, or floating
  pill toolbars;
- macOS traffic lights, fake windows, desktop wallpaper, or SF Symbols;
- excessive blur, glass, translucency, glow, gradients, or springy motion;
- swipe-, hover-, or long-press-only actions;
- mobile cards stretched into a desktop application; or
- Apple styling as a substitute for Unauth’s own evidence structure.

### 3.3 Surface modes

One design system supports several jobs. The modes change composition, not
identity.

| Mode | Surfaces | Composition |
| --- | --- | --- |
| **Operate** | Overview, Work, Cases, Losses, Recovery, Customers, connected records | Decision Briefing: one dominant work object, concise context, exact next action |
| **Build** | Rules, Flows, integration setup | Construction Workbench: object/version identity, canvas or form, contextual preview, history |
| **Configure** | Settings and governance | Settings Ledger: stable local navigation, readable form/table column, explicit save and consequence |
| **Enter** | Login, signup, reset, onboarding | Quiet Threshold: focused task, visible progress and trust, minimal distraction |
| **Persuade** | Landing, pricing, demo | Reconciled Story: demonstrate the live product mechanism, then proof and action |
| **Read** | Help and legal | Evidence Folio: strong reading hierarchy, persistent wayfinding, restrained line length |
| **Embed** | Helpdesk widget and browser extension | Pocket Brief: identity, confidence, decisive facts, and one safe next action in constrained space |

### 3.4 Non-negotiable visual rules

1. Every page has one dominant object.
2. The largest type identifies the page, record, or decision—not the product
   category or a decorative slogan.
3. Inline content is flat. Only floating layers receive elevation.
4. Parent surfaces own perimeters; children join with dividers and tonal
   changes.
5. Violet means current selection, focus, primary action, or product-owned
   primary data. It never means success, risk, freshness, or warning.
6. Semantic colours always carry semantic meaning and never decorate.
7. One filled primary action is allowed per local decision region.
8. Money is tabular, currency-explicit, and never silently aggregated.
9. Missing, stale, partial, unsupported, and unavailable are visually distinct.
10. No route is “finished” while its loading, empty, error, narrow, dark, or
    keyboard state still belongs to the old system.

---

## 4. Foundation reconstruction

### 4.1 Token architecture

The rebuild keeps one `--ua-*` namespace and promotes it from an authenticated
theme to the product-wide visual language.

The canonical token layers will be:

1. **Core roles:** canvas, paper, supporting plane, ink, line, focus, accent,
   semantic state, and overlay depth.
2. **Typography roles:** page identity, record identity, section title, body,
   label, metadata, financial lead, tabular value, and code/identifier.
3. **Geometry roles:** control, surface, overlay, round indicator.
4. **Density roles:** compact, standard, and relaxed component padding.
5. **Motion roles:** press, control, disclosure, route settle, data change, and
   skeleton.
6. **Surface scopes:** app, entry, public, read, and embed. A scope may alter
   page-scale spacing or tonal balance; it may not redefine component anatomy.

The extension build consumes the same published token subset rather than
maintaining a separate palette.

### 4.2 Fixed foundation decisions

- **Typeface:** Inter for interface and product demonstration; system fallback
  retained.
- **Monospace:** DM Mono or the existing approved mono stack only for source
  identifiers, hashes, API keys, payloads, and code.
- **Accent:** existing action violet.
- **Neutral world:** cool grey work canvas, white primary paper, darker tonal
  navigation plane.
- **Type:** 28px page identity, 22–24px record identity, 17–18px primary
  section title, 14px operating body, 12px minimum metadata.
- **Control height:** 34–36px standard, 30px compact, 40px prominent.
- **Radius:** 8px controls, 12px working surfaces, 16px overlays, round only
  for indicators and status badges.
- **Spacing:** existing 2/4/6/8/10/12/16/20/24/32/40/48 scale.
- **Elevation:** none inline; controlled shadow for menus, drawers, dialogs,
  tooltips, and toasts.
- **Icons:** Lucide, consistent stroke and optical size.
- **Motion:** 80–240ms for controls and disclosure; up to 360ms for data;
  reduced-motion equivalents required.

### 4.3 Shared component rebuild order

Rebuild in dependency order:

1. typography and focus;
2. Button, ButtonLink, IconButton;
3. Input, Select, textarea, checkbox, radio, switch;
4. Tabs, segmented controls, filter chips, metadata chips, status badges;
5. Surface, JoinedSection, InsetGroup, LeadSummary;
6. PageFrame and route-family shells;
7. tables, registries, pagination, row actions, bulk selection;
8. chart frames, legends, tooltips, accessible tables, timelines;
9. Modal, Drawer, menu, popover, Tooltip, Toast;
10. loading, empty, error, not-found, locked, permission, and degraded states.

No route-local CSS may recreate a shared semantic component after its canonical
replacement exists.

### 4.4 Component convergence

The reconstruction must remove or merge overlapping visual ownership:

- `Card`, `Panel`, `SectionCard`, `AuthenticatedPanel`, and bespoke framed
  route blocks converge on explicit `Surface` roles.
- `PageFrame`, workbench/detail/settings shells become thin semantic
  compositions over one foundation.
- Button-like links and icon actions share one state model.
- Status badges, filter chips, metadata chips, and source labels remain
  visually distinct.
- Tables share row height, header, numeric alignment, selection, overflow,
  empty, and loading anatomy.
- All overlays share focus trapping, backdrop, elevation, edge spacing, and
  restoration behaviour.
- Route skeletons are assembled from the same geometry as resolved views.

### 4.5 CSS teardown ledger

Before `VR-14`, remove:

- superseded global/public/authenticated token aliases;
- the extension’s independent brown/orange palette;
- route-local literal colours, radii, and shadows;
- ordinary inline appearance styles, except data-derived geometry and CSS
  custom properties;
- old card-grid and equal-KPI layout classes;
- duplicate shell and page-header systems;
- obsolete prototype styles from production bundles; and
- visual rollout/cohort code that has no remaining functional purpose.

Deletion is consumer-driven. Do not remove a rule until repository search
proves it has no live visual consumer.

---

## 5. Shells and page-family contracts

### 5.1 Authenticated shell

- 216px expanded / 56px collapsed navigation plane.
- 52px utility toolbar.
- 32px wide-screen gutters, 24px intermediate, 20px at 1024px.
- One page title owned by the page, not repeated in the global toolbar.
- Compact demo/billing/source notices that do not permanently dominate the
  work.
- Parent breadcrumbs only on nested routes.
- Command search, notifications, account, workspace, permissions, live counts,
  source health, and collapse preference remain functionally unchanged.
- At 1024px the primary composition must still work horizontally where the
  route contract requires it.
- Below 1024px, retain the accessible Desktop required boundary.

### 5.2 Operational registry

Order:

`identity and operating statement → joined filter/action bar → result surface → contextual detail or pagination`

The registry is one work object. Search, filters, result count, bulk state,
rows, pagination, and empty states must not appear as unrelated cards.

### 5.3 Record detail

Order:

`human identity and state → decisive facts → active evidence/story → decision or next action → provenance and history`

Wide routes may use one 304–352px contextual inspector. At 1024px it becomes an
inline disclosure or accessible drawer, never a mobile bottom sheet.

### 5.4 Analytical

Order:

`identity and scope → operating statement → one dominant analysis → actionable records → compact trust/provenance`

Charts must answer a named business question, show an informative resting
state, support keyboard inspection, and provide a data table.

### 5.5 Board

One board owns the page. Stage counts, items, filters, and detail are joined.
Columns are not independent floating cards, and critical actions remain
available without drag and drop.

### 5.6 Builder

Object and version identity lead. The construction canvas or ordered form is
dominant, with contextual preview and history subordinate. Publish, test,
rollback, and save states remain explicit and permission-aware.

### 5.7 Settings

Use stable local navigation and one readable settings column. Group by task and
consequence, not by a grid of generic cards. Destructive, financial, privacy,
and credential actions receive explicit confirmation and durable feedback.

### 5.8 Public and entry

Marketing demonstrates the actual evidence-reconciliation mechanism at
first-viewport scale. Auth and onboarding prioritise completion and trust.
Legal and help prioritise reading and wayfinding. They share identity and
component craft without being forced into the authenticated shell.

### 5.9 Embedded

The extension and helpdesk widget use a compressed version of the same
hierarchy:

`identity → confidence/state → decisive facts → one action → source detail`

No uppercase control-room styling, glow, dark cyber palette, or generic risk
grade banner.

---

## 6. Exhaustive surface map

The manifest remains the machine-readable route authority. The following map
is the visual migration contract.

| Family | Routes and views | Target composition | Phase |
| --- | --- | --- | --- |
| Global authenticated | Sidebar, toolbar, banners, command palette, route progress, account/workspace menus, desktop boundary | Three calm planes with one work canvas | `VR-02` |
| Overview | `/dashboard` | Existing Decision Briefing becomes the calibration anchor; no new redesign | `VR-03` |
| Work | `/work`, `/exceptions` redirect | Joined operational registry with actionable priority and inspectable task context | `VR-03` |
| Cases | `/claims`, `/claims/[id]` | Evidence registry and case workbench with one decision spine | `VR-03` |
| Customers | `/customers`, `/customers/[id]`, `/customers/[id]/evidence/new`, `/customers/[id]/claims` redirect | Registry, human profile, evidence task | `VR-04` |
| Losses | `/losses`, `/losses/[id]` | Financial registry and one auditable loss story | `VR-04` |
| Recovery | `/recoveries`, `/recoveries/[id]` | Joined recovery board and recovery case detail | `VR-04` |
| Connected records | `/orders/[id]`, `/shipments/[id]`, `/returns/[id]`, `/refunds/[id]`, `/tickets/[id]`, `/disputes/[id]` | Shared connected-object shell with source identity, facts, relationships, provenance | `VR-05` |
| Rules | `/rules`, `/rules/[id]`, `/rules/recovery` | Registry plus rule construction workbench | `VR-06` |
| Flows | `/flows`, `/flows/[id]`, `/flows/runs`, `/flows/runs/[id]` | Registry, workflow workbench, and run evidence detail | `VR-06` |
| Reports | `/reports`, `/reports/records` | Analytical briefing and auditable record registry | `VR-07` |
| Integrations | `/integrations`, `/integrations/[provider]`, `/integrations/imports`, `/integrations/shipbob/select` | Source catalogue, connector detail, import task, account selection | `VR-08` |
| Connector settings | `/settings/integrations/chrome`, `/settings/integrations/freshdesk`, `/settings/integrations/gorgias`, `/settings/integrations/shopify`, `/settings/integrations/zendesk` | One connector-setup grammar with status, scope, action, and verification | `VR-08` |
| Settings | `/settings/account`, `/settings/agreements`, `/settings/api-integrations`, `/settings/audit-trail`, `/settings/billing`, `/settings/data-privacy`, `/settings/notifications`, `/settings/platform`, `/settings/team`, `/settings` redirect | Settings Ledger | `VR-08` |
| Notifications | `/notifications` | Operational inbox registry with read/unread and direct destinations | `VR-09` |
| Help | `/help` | Evidence Folio with task-led navigation | `VR-09` |
| Entry | `/login`, `/reset`, `/reset/update`, `/signup` | Quiet Threshold | `VR-10` |
| Onboarding | `/onboarding` | Guided setup with visible progress and connection truth | `VR-10` |
| Public product | `/landing`, `/pricing`, `/demo`, `/` redirect | Reconciled Story using real product captures and live mechanism | `VR-11` |
| Legal | `/legal/data-handling`, `/legal/dpa`, `/legal/pilot-terms`, `/legal/privacy` | Evidence Folio reading system | `VR-11` |
| Embedded | Chrome popup states, helpdesk widget/unlock states, visible checkout extension | Pocket Brief | `VR-12` |
| Development | `/dev/design-system`, `/integrations/dev-preview`, case-detail prototype lab | Internal component/state harness; never presented as production | `VR-01`, `VR-14` |
| Global route states | Root and family `loading`, `error`, `not-found`; empty, stale, partial, disconnected, permission and locked states | Geometry-faithful, truthful shared state system | Every phase, final sweep `VR-13` |

---

## 7. State and interaction matrix

Every family phase must implement and verify all applicable states:

| State | Visual requirement |
| --- | --- |
| Initial loading | Skeleton mirrors the resolved page’s dominant geometry |
| Background refresh | Existing content remains; updating state is quiet and explicit |
| Zero state | Explains what the product can show and the safe next action |
| Filtered empty | Preserves scope and offers clear/reset without implying no data exists |
| First run | Uses existing setup destinations; never invents sample success |
| Partial | Identifies the incomplete source or metric without hiding valid content |
| Stale | Shows source and timestamp; does not style the whole page as an alarm |
| Disconnected | Names the source and gives the existing reconnection path |
| Unavailable | Uses truthful unavailable treatment, not zero or em dash ambiguity |
| Permission denied | Explains access without exposing protected object existence |
| Feature locked | Shows value and entitlement truth without fake interactivity |
| Pending mutation | Preserves context, disables duplicate submission, states progress |
| Success | Confirms the exact completed action at the durable point of effect |
| Conflict | Preserves user input where safe and explains how to refresh/reconcile |
| Error | Local where recoverable, route-level only where necessary |
| Not found | Uses the correct public or authenticated shell and safe destination |
| Destructive confirmation | Names the object, effect, reversibility, and commit action |
| Maximum content | Long names, many rows, multiple currencies, dense evidence, overflow |

Interaction requirements:

- real links, buttons, forms, tables, dialogs, and browser history;
- no clickable `div` substitutes;
- shareable URL-backed filters and selected sections remain shareable;
- hover is optional enhancement, never the only disclosure;
- focus order follows reading and action priority;
- dialogs and drawers trap focus, make background inert, handle Escape safely,
  and restore focus;
- route and data transitions acknowledge change without blanking the page;
- motion communicates relationship or state and has a reduced-motion path.

---

## 8. Responsive, theme, and accessibility decisions

### 8.1 Viewport contract

| Surface | Required widths |
| --- | --- |
| Authenticated workspace | 1440×900, 1280×800, 1024×900; desktop boundary at 1023px |
| Public, legal, auth, onboarding | 1440, 1024, 768, 390, 320 CSS px |
| Chrome popup | 360×420 minimum plus content-growth state |
| Helpdesk widget | 280, 320, 360, and 420px host widths |
| Landing-page product capture | 1440×900 and crop-safe 16:10 composition |

No supported viewport may have document-level horizontal scrolling. A table or
canvas may own local overflow when the route contract requires it.

### 8.2 Dark mode

- Authenticated, auth, onboarding, demo, settings, extension, and embedded
  product views receive full role-preserving dark mode.
- Public marketing, pricing, help, and legal use the same theme preference and
  retain intentional contrast and hierarchy rather than merely inverting.
- Charts, source labels, semantic states, skeletons, overlays, focus, and
  unavailable states receive explicit dark treatment.

### 8.3 Accessibility

Required:

- WCAG 2.2 AA contrast and interaction;
- full keyboard completion;
- visible focus at every layer;
- correct names, roles, descriptions, live regions, and heading structure;
- 200% zoom without lost controls or horizontal document scroll;
- text-spacing overrides;
- reduced motion;
- forced colours;
- coarse-pointer targets;
- non-colour state cues;
- accessible chart data; and
- no essential information hidden in tooltips.

---

## 9. Implementation architecture

### 9.1 Target ownership

| Layer | Owns | Must not own |
| --- | --- | --- |
| `styles/system` | tokens, typography, status, motion, focus, theme, reset | route composition |
| `components/ui` | semantic component anatomy and states | page-specific layout |
| `components/layout` | global shells, navigation, toolbar, overlays | business data interpretation |
| route-family composition | registry/detail/analytical/board/builder/settings/read/entry structure | global tokens |
| route modules | data loading, permissions, semantic ordering, existing actions | local design systems |
| extension/widget adapters | constrained composition and host integration | independent brand palette |

The exact folder move may be adapted to the existing dependency graph, but
ownership must finish in this shape.

### 9.2 Visual-value rule

Static colours, radii, spacing, typography, elevation, and motion belong to the
system. Inline values are allowed only for:

- chart or progress geometry derived from data;
- measured placement;
- authored CSS custom properties passed into a canonical component; or
- a documented third-party integration constraint.

### 9.3 Dependency decision

Do not introduce a design framework or wholesale component library. The current
React, Next.js, Tailwind/CSS, Lucide, Framer Motion, and Recharts stack can
reach the target without importing another visual opinion.

Add a specialist accessibility dependency only if an existing overlay cannot
meet the required focus and keyboard contract cleanly; that decision must be
limited to behaviour, not appearance.

---

## 10. Execution phases

Every phase includes its routes’ loading, error, empty, dark, keyboard, and
supported-width states. A phase is not complete when only the populated light
screen is attractive.

### `VR-00` — Authority, inventory, and visual freeze

Deliver:

- make this document the active product-wide visual implementation authority;
- record the exact dirty-worktree baseline and preserve unrelated work;
- bind the 64-route manifest and embedded-surface list as the coverage ledger;
- bind the exhaustive coverage appendix and make its checker a phase gate;
- capture current representative routes only as anti-reference;
- mark the completed dashboard as the calibration surface; and
- prohibit new route-local visual patterns during migration.

Gate:

- every production page and embedded view has exactly one target family and
  phase;
- `node scripts/visual-rebuild/check-coverage-ledger.mjs` passes;
- no product or behaviour change is included.

### `VR-01` — Foundation and component laboratory

Deliver:

- product-wide tokens, typography, focus, semantic states, motion, and theme;
- canonical actions, fields, chips, badges, surfaces, overlays, tables,
  charts, timelines, and route-state primitives;
- rebuild `/dev/design-system` as the complete state laboratory;
- include light/dark, keyboard, long-copy, error, disabled, loading, and forced
  colour examples; and
- remove superseded primitives only after consumer migration is possible.

Gate:

- no literal visual values in the new primitives;
- every primitive passes component tests and the authenticated design guard;
- the laboratory shows every interactive state.

### `VR-02` — Shells, global layers, and navigation

Deliver:

- authenticated shell, sidebar, toolbar, banners, command palette, account and
  workspace menus, route progress, toasts, dialogs, drawers, and desktop
  boundary;
- public, entry, read, onboarding, and embedded shell foundations;
- one page-header responsibility model; and
- global loading, error, and not-found anatomy.

Gate:

- no duplicate title or shell chrome;
- navigation, deep links, permissions, counts, shortcuts, and focus restoration
  remain unchanged;
- no overflow at 1440, 1280, or 1024px.

### `VR-03` — Core operating spine

Routes:

- `/dashboard`;
- `/work`;
- `/claims`;
- `/claims/[id]`;
- `/exceptions` redirect.

Deliver:

- retain the finished Overview as calibration;
- rebuild Work as one prioritised operating registry;
- rebuild Cases as one evidence registry;
- rebuild case detail around identity, evidence spine, judgment, action, and
  audit;
- converge contextual drawers, timelines, comments, evidence, decisions, and
  action regions on canonical components.

Gate:

- a five-second review identifies purpose, state, and next action on all four
  flagship views;
- all existing actions and permission boundaries remain reachable;
- no equal-card or cage composition remains.

### `VR-04` — Customer and financial lifecycle

Routes:

- `/customers`;
- `/customers/[id]`;
- `/customers/[id]/evidence/new`;
- `/customers/[id]/claims` redirect;
- `/losses`;
- `/losses/[id]`;
- `/recoveries`;
- `/recoveries/[id]`.

Deliver:

- customer registry and human profile;
- evidence creation task;
- financial loss registry and detail;
- recovery board and recovery detail;
- explicit currency, provenance, ledger confidence, and relationship paths.

Gate:

- loss, concession, recovery, and unresolved amount are never visually
  conflated;
- board actions remain keyboard-available without drag and drop;
- large histories and mixed states remain legible.

### `VR-05` — Connected source objects

Routes:

- `/orders/[id]`;
- `/shipments/[id]`;
- `/returns/[id]`;
- `/refunds/[id]`;
- `/tickets/[id]`;
- `/disputes/[id]`.

Deliver:

- one connected-object shell with source identity, freshness, decisive facts,
  relationships, linked cases, raw detail disclosure, and safe destinations;
- source-specific facts remain distinct without creating six design systems.

Gate:

- every source page feels native to Unauth while retaining its domain-specific
  content;
- provenance and unsupported/missing fields are explicit.

### `VR-06` — Rules and Flows

Routes:

- `/rules`;
- `/rules/[id]`;
- `/rules/recovery`;
- `/flows`;
- `/flows/[id]`;
- `/flows/runs`;
- `/flows/runs/[id]`.

Deliver:

- registries, builder workbenches, versions, simulation/test results,
  publication state, rollback, run history, and run detail;
- clear separation of current, draft, historical, and failed states.

Gate:

- builder canvas/form is dominant;
- consequential actions state exact effect;
- no function depends on drag, hover, or visual order alone.

### `VR-07` — Reports and analytical system

Routes:

- `/reports`;
- `/reports/records`.

Deliver:

- report briefing with one primary analytical question;
- consistent metric definitions, scope, comparison, trust, chart interaction,
  accessible data, export, and record drill-down;
- auditable record registry.

Gate:

- every chart answers a named question;
- idle, hover, keyboard, pinned, null, partial, stale, and unavailable states
  are complete;
- numbers reconcile with the existing reporting contract.

### `VR-08` — Integrations and Settings

Routes:

- `/integrations`;
- `/integrations/[provider]`;
- `/integrations/imports`;
- `/integrations/shipbob/select`;
- `/settings/integrations/chrome`;
- `/settings/integrations/freshdesk`;
- `/settings/integrations/gorgias`;
- `/settings/integrations/shopify`;
- `/settings/integrations/zendesk`;
- `/settings/account`;
- `/settings/agreements`;
- `/settings/api-integrations`;
- `/settings/audit-trail`;
- `/settings/billing`;
- `/settings/data-privacy`;
- `/settings/notifications`;
- `/settings/platform`;
- `/settings/team`;
- `/settings` redirect.

Deliver:

- source catalogue and health hierarchy;
- provider detail, setup, verification, sync, error, import, and account
  selection;
- Settings Ledger for account, agreements, API access, audit, billing, privacy,
  notifications, platform, and team;
- consistent credential, destructive, financial, and privacy confirmation.

Gate:

- connected, degraded, stale, disconnected, unsupported, pending, and failed
  are visually distinct;
- save and verification feedback persists at the correct location;
- settings no longer read as a grid of generic cards.

### `VR-09` — Notifications, Help, and governance reading

Routes:

- `/notifications`;
- `/help`.

Deliver:

- joined operational notification inbox;
- task-led help navigation and readable editorial surface;
- deep links, read/unread state, and empty/error states.

Gate:

- notifications are scannable without decorative severity;
- help answers and destinations remain usable at all public responsive widths.

### `VR-10` — Entry and onboarding

Routes:

- `/login`;
- `/reset`;
- `/reset/update`;
- `/signup`;
- `/onboarding`.

Deliver:

- one Quiet Threshold entry shell;
- complete form states, validation, recovery, pending, and success;
- onboarding progress, profile, Shopify, helpdesk, and verified-completion
  states;
- mobile-responsive entry and setup without importing authenticated desktop
  chrome.

Gate:

- first-time completion is obvious at 320px through desktop;
- OAuth and connection failures preserve progress and next action;
- keyboard, password-manager, autofill, and browser validation remain intact.

### `VR-11` — Public story, pricing, demo, and legal

Routes:

- `/landing`;
- `/pricing`;
- `/demo`;
- `/`;
- four legal routes.

Deliver:

- first viewport demonstrates Unauth’s real reconciliation mechanism;
- real, deterministic product captures from the rebuilt app;
- coherent navigation, proof, pricing, final action, footer, and responsive
  progression;
- demo visually connects public promise to live product;
- legal pages use the Evidence Folio reading system.

Gate:

- a visitor knows what Unauth is, why it matters, and what to do within one
  viewport;
- no invented commercial proof or screenshot-only UI;
- 320, 390, 768, 1024, and 1440px pass.

### `VR-12` — Embedded product surfaces

Views:

- Chrome popup bootstrap, setup, lookup, optional fields, loading, results,
  error, and settings;
- helpdesk widget loaded, no-match, unresolved identity, disconnected,
  locked/unlock, partial, error, and decision-ready states;
- any visible checkout extension state.

Deliver:

- Pocket Brief hierarchy;
- shared identity, tokens, typography, state, evidence, and action anatomy;
- host-safe focus, overflow, loading, and external-link behaviour.

Gate:

- the old cyber/brown palette is gone;
- every constrained view communicates identity, state, decisive facts, and one
  safe action;
- no host width clips content or hides essential work.

### `VR-13` — Cross-product state, responsive, theme, and accessibility sweep

Deliver:

- route-family state matrix;
- 1440/1280/1024 authenticated proof;
- 1440/1024/768/390/320 public and entry proof;
- extension/widget host-width proof;
- dark mode, reduced motion, forced colours, 200% zoom, text spacing,
  keyboard-only, screen-reader semantics, and coarse-pointer checks;
- maximum-content and long-localisation fixtures.

Gate:

- no P1 state, responsive, accessibility, or visual-consistency defect;
- no document-level overflow at a supported width;
- no route exposes old visual grammar.

### `VR-14` — Hard cutover, deletion, and capture release

Deliver:

- remove old visual tokens, CSS, primitives, cohort code, and obsolete
  prototype dependencies after consumer proof;
- verify the 64-route ledger and embedded-surface ledger;
- update `DESIGN.md` from the implemented system;
- produce the final product-capture set;
- replace landing-page product imagery with those captures;
- complete final code, browser, accessibility, and performance gates.

Gate:

- one visual authority, one active token system, one canonical primitive per
  semantic role;
- no screenshot fork, old theme, route-local palette, or orphaned CSS;
- full release gate passes;
- the visual scorecard reaches the threshold below.

---

## 11. Per-phase working protocol

For each phase:

1. Read this document, the relevant product/workflow contract, and the current
   phase report.
2. Record the dirty-worktree overlap; preserve unrelated user changes.
3. Inspect the route family and one real populated state before editing.
4. Rebuild the family from canonical primitives; do not polish the obsolete
   shell.
5. Implement every applicable state in the same pass.
6. Run focused component/unit checks.
7. Inspect all required widths and both themes in one bounded browser pass.
8. Fix findings in one consolidated batch and confirm once.
9. Run the Impeccable detector once on final changed UI targets.
10. Update the phase report and stop before the next phase.

Do not create one screenshot, test, or evidence file per checklist item. One
well-designed proof pass may satisfy several requirements.

---

## 12. Verification

### 12.1 Phase checks

Run as applicable:

- focused unit/component tests for changed components and routes;
- `npm run typecheck`;
- `npm run lint`;
- `npm run lint:authenticated-design`;
- `git diff --check`;
- focused browser route tests;
- the existing accessibility-responsive suite; and
- a production build when a shell, route boundary, CSS entry, or bundle
  dependency changes.

### 12.2 Final route proof

The release matrix must prove:

- every manifest route resolves or redirects as contracted;
- every production family has a populated and non-happy-path sample;
- all required viewport classes;
- light and dark modes where applicable;
- no console, hydration, or required-request errors;
- no unexpected business mutation from read-only navigation;
- no missing focus restoration or inaccessible overlay;
- no broken exports, links, query filters, browser history, or permissions; and
- no visual dependency on development-only fixtures.

### 12.3 Performance

- Visual reconstruction must not materially regress route interaction or
  loading stability.
- Fonts, icons, and CSS must not introduce layout shift.
- Skeletons reserve final geometry.
- Heavy charts and builders remain route-scoped.
- Marketing media is responsive, correctly sized, and lazy-loaded below the
  fold.
- Motion uses transform/opacity where possible and never delays interaction.

---

## 13. Quality scorecard

Final reviewers score each dimension from 1–5:

| Dimension | Required |
| --- | ---: |
| Hierarchy and dominant object | 5 |
| Product-specific visual identity | 4 |
| Information architecture and scanability | 4 |
| Component anatomy and consistency | 5 |
| Typography and spacing craft | 4 |
| State completeness and truthfulness | 5 |
| Responsive fit | 4 |
| Accessibility and keyboard quality | 4 |
| Motion and interaction feedback | 4 |
| Screenshot and marketing readiness | 5 |

Release threshold:

- at least **44/50**;
- no dimension below **4**;
- no unresolved P1 defect;
- no route family visibly belonging to the predecessor system; and
- flagship surfaces—Overview, Work, Cases, case detail, Reports, onboarding,
  landing, and one embedded view—must each independently feel release-ready.

---

## 14. Prohibited outcomes

The programme fails if it produces:

- the same interface with new colours and radii;
- dashboard composition copied onto unrelated tasks;
- a mix of old and new component systems;
- equal-weight KPI/card soup;
- nested framed cards;
- gradients, glass, glow, fake depth, or decorative motion;
- tiny type used to force content into a screenshot;
- unexplained colour or ambiguous status chips;
- public mock-ups that do not exist in the product;
- a visually attractive happy path with poor loading/error/permission states;
- an inaccessible custom control replacing a native browser pattern;
- a phone metaphor inside the authenticated desktop product;
- a new design framework imported to avoid making product-specific decisions;
  or
- any business, route, permission, financial, or workflow change disguised as
  visual work.

---

## 15. Definition of Done

The reconstruction is complete only when:

1. all 58 production routes, 4 redirects, 2 development harnesses, and embedded
   surfaces are accounted for, including the 65th page module outside the
   manifest;
2. every route family uses the new system in populated and non-happy states;
3. the dashboard remains the quality anchor without becoming a repeated
   template;
4. public, auth, onboarding, product, legal, and embedded surfaces feel like
   one brand adapted to their jobs;
5. the predecessor visual layers have no live consumer;
6. the final 64-route and embedded proof matrices pass;
7. required widths, dark mode, keyboard, reduced motion, forced colours, and
   200% zoom pass;
8. product truth, routes, queries, permissions, mutations, and financial
   semantics are unchanged;
9. real rebuilt product captures are ready for the landing page;
10. `DESIGN.md` describes the implemented system;
11. the final score is at least 44/50 with no unresolved P1; and
12. there is one shippable visual product—not a migration layer.

The Definition of Done also requires every applicable checkbox in
[`APPX_whole_product_visual_coverage_ledger.md`](APPX_whole_product_visual_coverage_ledger.md)
to be complete and its coverage checker to pass.

---

## 16. Implementation invocation

Use:

```text
Implement VR-N from docs/IMPL_whole_product_visual_reconstruction.md.

Visual changes only. Preserve all product truth, routes, permissions, data,
queries, mutations, financial definitions, and workflow behaviour. Complete
the named phase and every applicable state before stopping. Preserve unrelated
working-tree changes. Run the phase’s focused checks and bounded visual review,
update its report, and do not begin VR-(N+1).
```
