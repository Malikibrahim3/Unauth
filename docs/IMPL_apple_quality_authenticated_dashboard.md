# IMPL — Apple-quality authenticated dashboard

- **Status:** Implemented — authenticated visual cutover complete; see `docs/phase-reports/apple-quality/`
- **Date:** 30 July 2026
- **Scope:** The complete authenticated Unauth product under `app/(app)/**`
- **Flagship calibration surfaces:** `/dashboard`, `/work`, `/claims`, and `/claims/[id]`
- **Product authority:** [`PRODUCT.md`](PRODUCT.md)
- **Functional/workflow authority:** [`IMPL_merchant_operations_experience.md`](IMPL_merchant_operations_experience.md)
- **Current visual predecessor:** [`IMPL_living_precision_product_ui.md`](IMPL_living_precision_product_ui.md)
- **Implementation model:** One hard visual cutover; no merchant-facing visual feature flag or parallel theme

This document uses **dashboard** to mean the signed-in Unauth workspace as a
whole, not only the `/dashboard` Overview route. Public marketing, legal,
authentication, onboarding, the helpdesk widget, and the browser extension are
outside this programme except where they consume a final, truthful product
capture.

This implementation contract was requested on 30 July 2026 and completed
against the named working-tree baseline on the same date. The phase reports and
capture artifacts record the resulting system and its verification.

---

## 0. Executive decision

Unauth will adopt Apple’s product-design discipline without imitating iOS or
macOS chrome.

The target is a calm, high-trust operational workspace with:

1. one unmistakable focal object per screen;
2. strong type hierarchy that remains legible in a landing-page capture;
3. alignment, spacing, and tonal planes doing more work than borders;
4. a compact, browser-native toolbar and navigation system;
5. progressively disclosed evidence and secondary controls;
6. immediate, restrained feedback;
7. full keyboard, pointer, URL, zoom, and accessibility behaviour; and
8. the data density and financial exactness expected of Stripe- or Ramp-level
   software.

The current application is functionally credible. Its visual problem is not
primarily its violet, radius, or shadow values. It is the repeated composition:

`small header → bordered filter bar → equal KPI slab → bordered chart → bordered chart → bordered cards`

That distributes attention almost evenly across the page. The result feels
like a well-polished 2020 enterprise dashboard rather than a current,
high-confidence product.

The transformation therefore changes the **visual grammar and information
composition**, not merely the palette.

### 0.1 The target in one sentence

> Unauth should feel like a precise evidence-and-recovery workspace designed
> for sustained desktop use: quiet at rest, decisive at the point of action,
> and visibly organised around the operator’s next judgment.

### 0.2 What the earlier Incident Desk direction established

The Incident Desk prototype is useful only as evidence that simultaneous
case context, evidence, and decision controls can work. Its rendered appearance
is rejected.

Retain:

- decision context remains available while evidence is inspected;
- evidence and action are visually connected;
- the operator does not need to reconstruct the case from separate pages; and
- the next meaningful action is obvious.

Reject:

- tiny typography;
- a rigid three-column cage;
- boxed navigation and boxed utilities;
- equal visual weight across every region;
- dense chips as a substitute for hierarchy; and
- a control-room aesthetic applied decoratively.

The new result must preserve the topology while removing the cage.

---

## 1. Authority and conflict resolution

### 1.1 Before implementation starts

Until an implementation phase is explicitly authorised, Living Precision
remains the active authenticated visual contract. This document is a proposed
replacement and does not authorise opportunistic UI changes.

### 1.2 When implementation starts

Phase `AQ-00` must make this document the single visual implementation
authority for `.ua-app` and `app/(app)/**` by updating:

- `styles/authenticated/README.md`;
- `.codex/rules/authenticated-product.md`;
- `.cursor/rules/authenticated-design-system.mdc`; and
- `CLAUDE.md`.

At that point:

- this document supersedes Living Precision for visual design, composition,
  component anatomy, motion, and migration sequencing inside
  `app/(app)/**`;
- Living Precision’s dashboard-scope clauses and phase reports become
  implementation history and evidence only;
- the loaders route visual authority by scope, retaining or extracting an
  explicit as-built contract for excluded authentication, onboarding, demo,
  widget, extension, public, and legal surfaces;
- `PRODUCT.md` continues to win every product-truth conflict;
- `IMPL_merchant_operations_experience.md` continues to win every workflow,
  data, and operational-behaviour conflict; and
- architecture, security, permission, audit, financial, and provenance
  contracts remain binding.

No surface may have two active visual authorities. A shared primitive consumed
inside and outside `.ua-app` must either satisfy both scoped contracts or be
split at a meaningful product-surface boundary; it must not use a runtime theme
branch to guess which design applies.

Functional rollout controls remain independent:

- `CONNECTION_HEALTH_V2_ENABLED`;
- `WORK_COCKPIT_V2_ENABLED`; and
- `CASE_WORKSPACE_V2_ENABLED`.

They govern product capability rollout, not visual themes. This programme does
not remove, repurpose, or visually branch on them.

The one explicit presentation-scope resolution is responsive access:
`IMPL_merchant_operations_experience.md` records a 320px aspiration, while the
implemented root boundary and active authenticated contract support the product
from 1024 CSS pixels. This programme preserves the implemented 1024px boundary.
Adding a phone product is a separate product and interaction decision, not an
implicit consequence of following Apple guidance.

### 1.3 Existing worktree protection

The implementation baseline contains substantial uncommitted work. Before
touching production UI:

1. identify and record the exact named working-tree state;
2. capture a baseline from that state rather than assuming `HEAD` represents
   the application;
3. preserve unrelated changes;
4. do not reset, discard, or recreate existing work; and
5. resolve overlap deliberately at the file and behaviour level.

---

## 2. Product truth that is frozen

This programme changes presentation and presentation-layer interaction only.
It does not redefine Unauth.

The following are non-negotiable:

- A case remains the shared operational unit.
- Provider records enrich a case; they do not become parallel product models.
- Customer action, responsibility, and recovery remain three independent
  recommendations and decisions.
- The merchant makes every final decision.
- Unauth does not automatically approve, deny, refund, accuse, close a case,
  submit an external claim, or assign responsibility.
- Every displayed fact retains source provenance.
- Source facts, human findings, and inferences remain distinguishable.
- Evidence remains reconciled at claimed item × parcel level.
- Customer concession and merchant economic loss remain separate ledgers.
- Only reconciled credits reduce net unrecovered loss.
- Currency is always explicit; mixed currencies are never silently aggregated.
- Null, missing, stale, partial, unverified, and unsupported never become zero
  or healthy.
- Merchant isolation is absolute.
- Existing permissions, entitlements, APIs, mutations, redirects, deep links,
  exports, query parameters, audit events, and idempotency behaviour remain
  intact.
- Read-only route visits perform no business mutation.

The redesign may reorder presentation, consolidate controls, add safe
disclosures, preserve selection between views, and improve non-mutating
feedback. It may not change business outcomes or hide uncertainty.

---

## 3. Evidence-based diagnosis

### 3.1 Why the current interface reads as dated

| Finding | Current pattern | Required replacement |
| --- | --- | --- |
| No dominant object | Page header, KPI group, charts, and lower cards use similar borders, weight, and spacing | One dominant working object; supporting information visibly recedes |
| Border-led grouping | Almost every module is a white rounded rectangle with a one-pixel frame | Use alignment, whitespace, joined sections, and tonal planes first |
| Timid type | 20px page titles, 13px chart titles, and frequent 11px metadata | 28px page identity, 17–18px focal section titles, 14px operating text, 12px minimum metadata |
| Equal KPI treatment | Four values sit in identical cells regardless of importance | One lead value with quieter supporting metrics |
| Fragmented dashboard story | Metric tabs, combo chart, ranked bars, donut, waffle, and micro-rails compete | One analytical question followed by actionable work and compact supporting facts |
| Boxed shell utilities | Workspace, source health, search, notification, nav state, and badges each add a bezel | A quiet tonal shell with controls gaining definition on interaction |
| Duplicate chrome responsibility | Global and page-level headers split location, utility, and title responsibilities | Global toolbar owns utilities; page frame owns one visible location/title |
| Screenshot fragility | Small text and many modules become visual texture when reduced | A 16:10 product crop communicates the object, state, and action in five seconds |
| Route inconsistency | Overview is bespoke while other routes compose several overlapping shells | One canonical frame with thin route-family adapters |

### 3.2 Root cause

The current design repeatedly treats **containment** as **hierarchy**. A border
can show where something ends, but it cannot decide what matters. Adding more
polish to the existing card stack will not reach the requested standard.

### 3.3 What must not be lost

The application already has strong foundations:

- explicit financial truth;
- useful operating density;
- provenance and freshness;
- accessible chart alternatives;
- URL-backed filters and selections;
- keyboard-aware overlays;
- shared route states;
- deterministic demo/capture data;
- a single authenticated token namespace; and
- a canonical desktop boundary.

The visual reset must build on those foundations rather than replacing them
with a screenshot-only facade.

---

## 4. Apple principles translated to the web

Apple’s principles govern the quality of the decisions below. They are not a
component library and do not authorise copying Apple assets.

| Principle | Browser-native Unauth translation | Observable acceptance |
| --- | --- | --- |
| Hierarchy | Put the operational object and next decision first; subordinate support and metadata | A new viewer identifies page purpose, current state, and next action within five seconds |
| Harmony | Let navigation, toolbar, content, and inspector feel like related planes | No collection of unrelated floating cards |
| Consistency | Use one anatomy for repeated actions, fields, registries, details, and overlays | The same semantic component behaves and looks the same on every route |
| Content first | Controls frame the work instead of becoming the work | The primary surface is larger and quieter than its toolbar |
| Progressive disclosure | Keep essential evidence visible; reveal raw payloads, definitions, and rare controls on demand | Advanced detail is reachable in one clear action and never required to understand the decision |
| Familiarity | Use real links, buttons, tables, menus, browser history, and expected keyboard behaviour | Back/forward, refresh, deep links, focus restoration, and shortcuts work predictably |
| Immediate feedback | Acknowledge selection, save, background refresh, and mutation state without page jumps | Every action has a truthful pending, success, conflict, or failure state |
| Adaptability | Recompose across supported desktop window sizes | No clipping or document-level horizontal scroll at 1440, 1280, or 1024px |
| Accessibility | Make information perceivable and interaction operable across modalities | WCAG 2.2 AA, keyboard-only, 200% zoom, reduced motion, and forced colours pass |
| Restraint | Use colour, motion, material, and elevation only when they communicate | No decorative animation, glass, glow, or semantic colour used as ornament |

### 4.1 Explicitly prohibited Apple imitation

Do not introduce:

- iOS tab bars, bottom toolbars, or bottom sheets;
- large iOS navigation titles;
- swipe-, long-press-, or hover-only actions;
- full-width pill buttons or 44–56px controls everywhere;
- fake macOS title bars, traffic lights, window frames, or desktop wallpaper;
- SF Symbols, SF Pro redistribution, or copied Apple assets;
- Dynamic Island, notch, home-indicator, or safe-area motifs;
- decorative Liquid Glass, heavy blur, or detached floating navigation;
- a phone card stack below 1024px; or
- critical information and primary actions anchored to the bottom edge.

Use the project’s existing Inter and Lucide foundations. Apple quality comes
from hierarchy, clarity, feedback, consistency, and fit—not from pretending the
browser is an Apple operating system.

---

## 5. Design north star

### 5.1 Operating scene

The primary user is an ecommerce operations lead working for sustained periods
on a 13–27 inch display, often switching between evidence, support context,
financial impact, and recovery work. The environment is ordinary office light,
not a dark control room. The interface must remain calm after hours of use and
clear when captured for a landing page.

### 5.2 Desired character

Unauth is:

- precise, composed, and contemporary;
- operational rather than decorative;
- dense but not compressed;
- serious without becoming severe;
- recognisable through layout and evidence structure, not loud branding;
- quiet until attention or commitment is required; and
- transparent about provenance, uncertainty, and consequences.

Unauth is not:

- a generic analytics template;
- an iOS app stretched to desktop;
- a wall of cards;
- a cyber-security control room;
- a pastel status board;
- a glassmorphic showcase;
- a marketing mock-up inside the live product; or
- monochrome at the expense of comprehension.

### 5.3 Visual priority order

Every screen must establish:

1. location and purpose;
2. the current operational object or question;
3. state, amount, deadline, or decision;
4. the primary work surface;
5. the next safe action;
6. supporting evidence and explanation; and
7. raw metadata and audit detail.

If two elements compete at the same level, one must be demoted.

---

## 6. Application shell contract

### 6.1 Shell planes

The authenticated shell uses three related planes:

1. **Navigation plane** — quiet tonal rail, persistent wayfinding, workspace
   identity, and source health.
2. **Utility plane** — compact global toolbar for parent location, command
   search, notifications, and account controls.
3. **Work plane** — route identity and the actual operational content.

These planes use tonal separation and one boundary where needed. They do not
each sit inside another rounded container.

### 6.2 Target geometry

| Region | 1440px and wider | 1280–1439px | 1024–1279px |
| --- | ---: | ---: | ---: |
| Navigation rail | 216px expanded / 56px collapsed | 200–216px / 56px | 56px visual rail; hover/focus expansion may overlay without rewriting the stored preference |
| Utility toolbar | 52px | 52px | 52px |
| Content gutter | 28–32px | 24–28px | 16–20px |
| General content maximum | 1600px, route dependent | Available width | Available width |
| Context inspector | 320–360px when useful | 304–336px | Inline disclosure or right-side drawer; never a bottom sheet |

Exact widths may move by up to 8px after live calibration. Relative hierarchy,
supported-width behaviour, and content visibility are binding.

### 6.3 Navigation

Keep the current route taxonomy and permission filtering:

- Overview
- Work
- Cases
- Losses
- Recovery
- Customers
- Rules
- Flows
- Reports
- Integrations
- Settings

Requirements:

- Preserve all canonical routes and compatibility redirects.
- Preserve live Cases count, tier visibility, source status, workspace switch,
  collapsed preference, hover/focus expansion, Help, and sign-out.
- Replace nested workspace/source-health tiles with one composed identity area.
- Use one selected-row signal: a quiet accent fill plus a precise marker or
  text treatment, not several simultaneous cues.
- Group labels remain quiet but readable at 12px minimum.
- Tooltips are required for collapsed icon destinations.
- The rail may compact automatically at the supported narrow edge, but this
  must not overwrite `unauth.sidebar.collapsed`.

### 6.4 Utility toolbar

The toolbar owns:

- parent breadcrumb context for nested routes;
- command search;
- notifications;
- context-credit warning only when actionable;
- account access; and
- truly global actions.

The page frame owns the current page title. A top-level title appears once.
Nested routes show parent breadcrumbs without repeating the record name above
its own heading.

Toolbar controls are visually quiet at rest and gain a boundary or fill on
hover, focus, open, unread, or warning state. Search continues to use
`⌘K`/`Ctrl+K`; the visible shortcut label must match the user’s platform.

### 6.5 Banners

Demo and billing banners remain functional but may not permanently displace the
primary work:

- use compact, single-line banners where possible;
- preserve the exact action and state;
- reserve semantic colour for the actual condition;
- avoid stacking several full-width notices; and
- collapse acknowledged, non-critical guidance into an accessible status entry
  where the product contract permits.

---

## 7. Foundation system

All static authenticated appearance continues to use `--ua-*`. Do not add a
second token namespace, route-local palettes, or literal visual values in
ordinary components.

The target values in this section apply to the `.ua-app` workspace. The current
token file also groups `.ua-app` with `.ua-auth-surface`; implementation must
separate those selectors where necessary so excluded authentication and
onboarding surfaces do not change accidentally. This is scope isolation, not a
parallel dashboard theme. Any shared primitive consumed on both sides requires
an explicit regression check.

### 7.1 Colour roles

The reset remains predominantly neutral with one Unauth violet accent. Colour
is not the primary hierarchy tool.

Initial light targets:

| Role | Initial value | Use |
| --- | --- | --- |
| `--ua-canvas` | `#F6F7F9` | Main work canvas |
| `--ua-shell` | `#F1F2F5` | Navigation plane |
| `--ua-surface-primary` | `#FFFFFF` | Deliberate working surface |
| `--ua-surface-secondary` | `#F5F6F8` | Joined or recessed region |
| `--ua-surface-muted` | `#EEEFF2` | Tracks, skeletons, quiet grouping |
| `--ua-surface-hover` | `#EDEEF2` | Neutral hover |
| `--ua-surface-selected` | `#ECEBFF` | Product selection only |
| `--ua-text-primary` | `#17171B` | Primary ink |
| `--ua-text-secondary` | `#52515B` | Supporting ink |
| `--ua-text-tertiary` | `#6B6B75` | Metadata that still passes contrast on approved tonal surfaces |
| `--ua-border-subtle` | `#E6E6EA` | Internal dividers |
| `--ua-border-default` | `#D7D7DE` | Meaningful boundaries |
| `--ua-border-strong` | `#AAA9B3` | Emphasised boundaries |
| `--ua-accent-500` | `#5B5BD6` | Primary action, focus, selection, primary data |

Dark mode uses the same roles and hierarchy, not a separate direction. Initial
dark targets:

| Role | Initial value |
| --- | --- |
| `--ua-canvas` | `#101114` |
| `--ua-shell` | `#15161A` |
| `--ua-surface-primary` | `#1B1C20` |
| `--ua-surface-secondary` | `#222328` |
| `--ua-surface-muted` | `#2A2C32` |
| `--ua-surface-hover` | `#25262C` |
| `--ua-surface-selected` | `#302F4E` |
| `--ua-text-primary` | `#F4F4F6` |
| `--ua-text-secondary` | `#C2C1C8` |
| `--ua-text-tertiary` | `#9897A0` |
| `--ua-border-subtle` | `#2C2D33` |
| `--ua-border-default` | `#3A3B43` |
| `--ua-border-strong` | `#60616B` |
| `--ua-accent-500` | `#9B99FF` |

These are implementation starting values, not a waiver from contrast testing.
Every foreground/background pair must be measured, including tertiary text on
canvas, shell, primary, secondary, muted, hover, and selected surfaces. Adjust
only through the canonical tokens and record any change in the phase report.

Accent usage should remain below roughly 5% of a normal screen. Semantic hues
carry success, attention, critical, information, freshness, and risk only.
Selection never borrows a semantic colour.

### 7.2 Typography

Use Inter as the product typeface with the existing system fallbacks. Do not
import SF Pro.

| Role | Size / leading | Weight | Notes |
| --- | --- | ---: | --- |
| Page identity | 28 / 34px | 600 | Top-level route only |
| Record identity | 22–24 / 30px | 600 | Human-readable reference, never raw ID |
| Lead financial value | 36–40 / 44px | 600 | One per analytical view |
| Primary section title | 17–18 / 24px | 600 | Dominant surface |
| Section title | 15–16 / 22px | 600 | Supporting section |
| Body | 14 / 20px | 400–500 | Default operating text |
| Dense table/control | 13 / 18px | 400–600 | Never used to hide complexity |
| Metadata | 12 / 16px | 400–500 | Minimum normal metadata size |

Rules:

- sentence case throughout;
- weights 400, 500, and 600 only;
- tabular numerals for money, quantities, dates, and comparisons;
- monospace only for true identifiers, hashes, API keys, code, and raw payloads;
- no uppercase tracking as a decorative section system;
- descriptions target 50–72 characters per line; and
- type must remain readable when a 1440px capture is reduced to a
  landing-page proof asset.

### 7.3 Spacing and density

Keep the existing 2/4/6/8/10/12/16/20/24/32/40/48px scale.

Apply it with these rules:

- 28–32px separates major page regions;
- 16–20px separates joined sections;
- 8–12px separates a label from its related value or control;
- controls are 34–36px by default, 30px only in dense toolbars, and 40px only
  for a prominent action;
- table rows are 44px standard and 56px only when the row carries two real
  lines of information;
- coarse-pointer hit areas remain at least 44×44px without inflating every
  visible control; and
- intentional whitespace may replace a border, but not conceal missing
  information.

### 7.4 Geometry and material

Initial geometry:

- controls: 8px;
- isolated working surfaces: 10–12px;
- menus and popovers: 12px;
- dialogs and drawers: 16px;
- status and count badges: fully rounded only when the content is genuinely
  compact.

Geometry is subordinate to structure:

- an unframed section has no visible radius;
- joined sections use dividers, not nested rounded rectangles;
- large panels do not become floating cards merely because radius tokens exist;
- inline surfaces remain flat;
- elevation belongs to menus, popovers, tooltips, drawers, dialogs, and toasts;
- sticky toolbars may use an opaque tonal backing and divider;
- blur is not part of the normal product material system; and
- gradients, glow, texture, grain, and 3D effects are prohibited.

### 7.5 Iconography

- Continue using Lucide.
- Use 16px icons for ordinary controls and 18px where the icon leads a section.
- Standardise stroke weight within each region.
- Icons support labels; they do not replace unfamiliar actions.
- Icon-only buttons require an accessible name and tooltip where discovery is
  not obvious.
- Provider marks may retain official provider branding.

### 7.6 Motion

Motion communicates state and continuity:

- press acknowledgement: 80–100ms;
- hover/focus colour response: 100–140ms;
- menu/popover entry: 140–180ms;
- drawer/dialog entry: 180–240ms;
- data transition: 240–360ms only when it improves comparison;
- route progress reflects real navigation and never loops indefinitely.

No bounce, spring theatre, parallax, staggered card entrances, decorative
number counting, or autonomous looping. Reduced motion removes spatial
movement while retaining immediate state feedback.

### 7.7 Exhaustive token migration ledger

The tables above name the art-direction changes. `AQ-01` must also produce an
exhaustive retain/change/deprecate ledger for every currently consumed role:

| Token family | Required treatment |
| --- | --- |
| Neutral surfaces and ink | Map every light/dark surface, text, icon, border, backdrop, and disabled role |
| Accent | Preserve a complete 50–800 ramp, foreground pairing, focus role, link role, and selected role |
| Actions | Preserve distinct ordinary primary, high-stakes commit, danger, secondary, ghost, link, hover, pressed, pending, and disabled roles |
| Semantic state | Preserve success, attention, critical, information, freshness, risk, and their text/background/border triplets |
| Charts | Audit primary, comparison, neutral ramp, grid, track, semantic exceptions, thickness, and accessible non-colour distinctions |
| Geometry | Map controls, surfaces, overlays, round forms, shell dimensions, table rows, and target sizes |
| Depth | Retain flat inline content and map each raised/floating/menu/overlay/focus role |
| Motion | Map CSS duration/easing roles and the JavaScript mirror in `lib/design/motion.ts` |
| Layers | Verify header, sidebar, dropdown, drawer, modal, toast, and tooltip order |

Unlisted roles retain their current values until the ledger deliberately
changes or deprecates them. No token is removed before its consumers are
identified. The phase updates and verifies:

- `styles/authenticated/contracts.ts`, including `authenticatedDesignEthos`;
- `lib/design/motion.ts`;
- authenticated theme access used by charts;
- design lint and token coverage; and
- light, dark, reduced-motion, capture-mode, and forced-colour behaviour.

---

## 8. Component and ownership convergence

The current stack contains good primitives but too many overlapping page and
surface responsibilities. Implementation must converge rather than add another
wrapper.

| Area | Canonical target | Existing owners to adapt | Required result |
| --- | --- | --- | --- |
| Authenticated root | `app/(app)/layout.tsx` | Root layout and providers | Visual rearrangement without changing auth, onboarding, merchant, permission, telemetry, billing, demo, or context providers |
| Navigation | One rail anatomy | `Sidebar.tsx`, `SidebarInner.tsx`, `SidebarAside.tsx`, `SidebarNavItem.tsx` | Workspace, source health, grouped routes, collapse, counts, Help, and account context read as one composition |
| Utility toolbar | One global utility row | `AppHeader.tsx`, `CommandPalette*`, `AvatarMenu.tsx`, `WorkspaceSwitcher.tsx` | No collection of boxed widgets; platform-correct shortcut; all current behaviour preserved |
| Page frame | `PageFrame` | `AuthenticatedPageHeader`, `AuthenticatedPageChrome.module.css` | One title, one action hierarchy, shared gutters, optional meta/tabs/toolbar |
| Family adapters | Thin semantic adapters | `WorkbenchPage`, `DetailPageShell`, `SettingsPageShell` | No independent visual systems; adapters only arrange canonical regions |
| Surfaces | `Surface` structural roles | `AuthenticatedPanel`, `JoinedSection`, `InsetGroup`, route cards | Working, joined, inset, floating, or unframed; no “card” as the default section |
| Registries | `RegistrySurface` + canonical table | `DataTable`, `DataTableServer`, filters and pagination | Search, filters, count, selection, table, and pagination form one work surface |
| Actions and fields | Shared semantic primitives | `Button`, `ButtonLink`, `IconButton`, form controls | Same dimensions, focus, disabled, pending, invalid, and destructive behaviour |
| Status/provenance | Central role mapping | Badges, chips, freshness, source indicators | Status, selection, source, confidence, and metadata remain visually distinct |
| Overlays | One floating-layer system | `Modal`, `Drawer`, menus, `Tooltip`, `Toast` | Clear header/body/footer, focus trap, inert background, Escape, restoration |
| Route states | Geometry-aware shared states | loading/error/not-found files, skeletons | Loading, empty, filtered-empty, stale, partial, disconnected, denied, and error remain distinct |
| Charts | Question-led chart frame | `ChartFrame`, authenticated chart primitives, Recharts adapters | Fewer encodings, direct labels, accessible data, freshness, and drill-down |

Do not introduce a new component library for this programme. The existing
Next, React, Tailwind, CSS Module, Lucide, Recharts, and Framer Motion stack is
sufficient. A new dependency requires a documented capability gap and explicit
approval.

---

## 9. Flagship compositions

The following surfaces calibrate the system. Shared foundations are not
approved until these compositions work in light and dark at 1440, 1280, and
1024px.

### 9.1 Overview — `/dashboard`

The Overview becomes one operational reading path, not a gallery of widgets.

#### Target order

1. **Identity and compact controls**
   - `Overview` at 28px;
   - one short purpose line;
   - date range as the lead control;
   - comparison and currency as secondary controls;
   - Export in a compact action or overflow;
   - `Open work` as the single primary action;
   - Reports remains a clear text destination.

2. **Financial sentence**
   - one lead metric from Exposure, Recovered, Prevented, or Realised loss;
   - lead value at 36–40px;
   - comparison stated in plain language;
   - three supporting metrics inline and quieter;
   - metric switching preserved without four equal selected-looking cards.

3. **Primary grid**
   - approximately eight columns for the trend and four for actionable work;
   - the trend answers one question and owns the visual focus;
   - “Work requiring attention” is an actionable ranked list with counts,
     deadlines where available, and direct links;
   - both regions share alignment and do not look like two unrelated cards.

4. **Supporting context**
   - workflow distribution uses a compact ranked bar/list rather than a donut
     by default;
   - source health uses a concise status list or matrix rather than a decorative
     waffle;
   - the current Data health detail flow and modal data remain available;
   - financial freshness, reconciliation, and record drill-down remain explicit.

#### Functionality ledger

Preserve:

- authentication, `VIEW_DASHBOARD`, and safe fallback;
- URL-backed `range`, `timezone`, `compare`, and `currency`;
- `7d`, `30d`, `90d`, and `all`;
- current versus previous-period alignment;
- Exposure, Recovered, Prevented, and Realised loss switching;
- per-currency separation;
- export;
- exact report-record drill-down URLs;
- accessible chart table;
- Work, Reports, workflow, and source-record links;
- data-health dialog;
- reconciliation and freshness;
- empty, partial, unavailable, and proven-zero distinctions; and
- `lib/reporting/intelligence.ts` as financial truth.

Do not recreate calculations inside presentation code.

### 9.2 Work — `/work`

Work is the operational home and should feel closer to a native desktop work
queue than a dashboard.

- Use one joined queue surface.
- Keep search, saved view, filters, SLA band, assignment, and bulk controls in
  one compact toolbar system.
- Make row priority legible through ordering, type, amount, deadline, and one
  restrained state cue—not multiple badges.
- Preserve URL-backed views, search, pagination, selected item, shared views,
  assignment, start, complete, reopen, snooze, and exception resolution.
- A selected item may open a context inspector at wide widths.
- At 1024px, use a right-side drawer or full route destination; never a bottom
  sheet.
- The list remains operable without the inspector and every row retains a safe
  destination.

### 9.3 Cases registry — `/claims`

- Use a continuous master/detail workspace at wide widths.
- Keep one search/sort row and one quieter workflow-filter row when both are
  needed.
- Make the selected case clear without turning the whole row violet.
- Let preview content use joined sections instead of nested cards.
- Preserve entitlement and connection gates, filters/counts, sorting, ageing
  and value views, page size, pagination, `focus` URL state, and case links.
- Retain `/claims` as the canonical route and `/inbox` compatibility.

### 9.4 Case detail — `/claims/[id]`

This is the decisive proof surface and the successor to the rejected Incident
Desk visual.

#### Wide composition

- compact record identity and state at the top;
- key facts in one aligned summary, not a KPI strip;
- a central story plane that preserves the five canonical sections:
  **Evidence**, **Investigation**, **Decision**, **Recovery**, and **Timeline**;
- the active section contains recommendation, evidence, reconciliation,
  connected objects, or activity as appropriate through joined sections;
- a 320–360px decision inspector that keeps the current decision, consequence,
  permission state, and next safe action visible;
- persistent section navigation with shareable state; and
- raw payloads, low-frequency metadata, and advanced investigation fields
  behind explicit disclosures.

Preserve the functional section contract:

- `?section=evidence|investigation|decision|recovery|timeline`;
- the existing default-section rules;
- `#investigation-<id>` selection and focus;
- Work return paths; and
- refresh, back, and forward restoration.

The inspector presents the existing action-rail capability in the new
composition. It must not duplicate the decision form, create two competing
commit actions, or move a section’s only content out of its shareable URL
state.

#### Narrow supported composition

At 1024–1279px:

- the case story remains the primary column;
- the decision inspector becomes a right-side drawer or an inline decision
  section opened by a persistent, clearly labelled control;
- the final action is never hidden at the bottom of a long evidence scroll;
- browser back, focus restoration, and the direct case URL remain intact.

#### Behaviour to preserve

- read-only versus decision permission;
- evidence and recommendation freshness;
- independent customer action, responsibility, and recovery;
- assignment;
- monetary confirmation and rationale validation;
- lifecycle status, snooze, reversal, and comments;
- investigations and recovery handoff;
- audit history;
- source provenance; and
- safe conflict/error handling.

The inspector is a presentation of existing capability. It must not imply that
Unauth made the merchant’s decision.

---

## 10. Route-family transformation map

| Family | Routes | Target composition |
| --- | --- | --- |
| Analytical overview | `/dashboard` | Financial sentence → dominant trend + actionable work → compact supporting context |
| Operational queue | `/work`, `/notifications` | Joined toolbar/list workspace with contextual inspector |
| Case registry | `/claims` | Master list and preview; workflow filters remain URL-backed |
| Primary case detail | `/claims/[id]` | Evidence story plus decision inspector |
| Financial registries | `/losses`, `/recoveries` | Ledger/board is dominant; metrics support rather than precede everything |
| Financial detail | `/losses/[id]`, `/recoveries/[id]` | Identity → value/ownership → evidence/action → activity |
| Customers | `/customers`, `/customers/[id]`, evidence task | Registry → profile narrative → linked objects; no dashboard of profile cards |
| Connected objects | orders, shipments, refunds, returns, disputes, tickets | Human identity → lead source/financial object → relationships/evidence/events |
| Rules | `/rules`, `/rules/[id]`, `/rules/recovery` | Registry → desktop builder canvas → restrained preview/inspector |
| Flows | `/flows`, builder, runs, run detail | Registry → builder → execution record; version and status remain explicit |
| Reporting | `/reports`, `/reports/records` | One analytical question per region with records and definitions attached |
| Integrations | catalogue, provider detail, import/select tasks | Source health and next action first; setup and technical detail progressively disclosed |
| Settings | account, team, platform, API, billing, agreements, notifications, audit, privacy | Stable local rail → readable form/table column → optional guidance |
| Help | `/help` | Search-led editorial workspace with clear topic navigation |

Every family must use the same shell, typography, control, surface, state, and
overlay grammar. Route families may differ in composition because their tasks
differ.

---

## 11. Browser-native interaction contract

### 11.1 URLs and navigation

- Filters, comparison, currency, saved view, selected record, and relevant
  section state remain shareable where they are shareable today.
- Browser back and forward restore meaningful context.
- Deep links open the same object and state after refresh.
- Real navigation uses links; actions use buttons.
- A table row never becomes a faux button with manual keyboard emulation.
- Redirects preserve their current path/query behaviour.

### 11.2 Pointer and keyboard

- Every interactive element has default, hover, focus-visible, active,
  selected, disabled, pending, invalid, and error states as applicable.
- Hover reveals convenience, never essential content.
- `Tab` order follows reading and action priority.
- Dialogs and drawers trap focus, support Escape when safe, and restore focus.
- Menus, tabs, listboxes, grids, and comboboxes follow their established ARIA
  keyboard patterns.
- `⌘K` and `Ctrl+K` remain global search shortcuts.
- No swipe, drag, or pointer-precision gesture is the only path.

### 11.3 Feedback

- Optimistic presentation is allowed only when the mutation contract already
  supports safe reconciliation.
- Pending state names what is happening.
- Success is acknowledged near the changed object.
- Failure preserves input and explains recovery.
- Version conflicts do not silently overwrite.
- Background refresh preserves visible content and selection.
- Route transitions leave the shell stable and use matching skeleton geometry.

---

## 12. Responsive and accessibility contract

### 12.1 Supported widths

The existing authenticated boundary remains:

- `≥1024px`: full product;
- `<1024px`: one accessible “Desktop required” notice; the product subtree is
  removed from the accessibility tree.

This programme does not add a phone UI.

Within supported widths:

- no document-level horizontal scroll;
- local table and board overflow remains inside its owned surface;
- supporting rails stack or become contextual drawers before the main work is
  crushed;
- priority columns stay visible and all hidden detail has an accessible path;
- page actions wrap deliberately rather than becoming a second header row; and
- zoom reflow is evaluated by effective viewport, not device labels.

Required visual widths:

- 1440×900;
- 1280×800;
- 1024×768 or 1024×900; and
- 1023px boundary verification.

### 12.2 Accessibility

Release requirements:

- WCAG 2.2 AA;
- no serious or critical axe violations;
- 4.5:1 normal text contrast;
- 3:1 meaningful graphics and component boundaries where required;
- visible focus that does not cause layout shift;
- keyboard-only completion of primary workflows;
- 200% zoom;
- browser text-spacing overrides;
- forced-colour support;
- reduced-motion support;
- meaningful heading and landmark order;
- status changes announced without duplicate noise;
- chart information available as a table or equivalent summary; and
- colour never carries meaning alone.

---

## 13. Data visualisation contract

Charts must answer a merchant question. If a ranked list or table answers it
more clearly, do not use a chart.

Rules:

- one dominant analytical object per view;
- current/product-owned data uses violet;
- comparison data uses neutrals;
- semantic colour appears only when the encoded value is semantic;
- maximum five simultaneous series;
- direct labels or a visible legend;
- no donut when ranking or precise comparison is the task;
- no waffle or decorative dot matrix for a value that a sentence and compact
  status list explain better;
- no gradient, glow, 3D, texture, hatch, or decorative animation;
- null, zero, partial, stale, unavailable, disconnected, and mixed-currency
  remain distinct;
- currency never aggregates across incompatible values;
- freshness and provenance remain visible;
- an accessible table or equivalent is available;
- drill-down leads to correctly scoped underlying records; and
- pinned/selected data remains keyboard reachable.

The Overview may remove the current donut and waffle encodings, but it must
preserve their truthful workflow and source-health information.

---

## 14. Implementation architecture and file ownership

### 14.1 Foundation

Canonical authenticated styling remains:

- `styles/authenticated/index.css`
- `styles/authenticated/tokens.css`
- `styles/authenticated/foundations.css`
- `styles/authenticated/typography.css`
- `styles/authenticated/composition.css`
- `styles/authenticated/surfaces.css`
- `styles/authenticated/controls.css`
- `styles/authenticated/tables.css`
- `styles/authenticated/status.css`
- `styles/authenticated/states.css`
- `styles/authenticated/overlays.css`
- `styles/authenticated/responsive.css`
- `styles/authenticated/contracts.ts`

Application code must not import individual authenticated layers.

### 14.2 Shell and shared composition

Primary owners:

- `app/(app)/layout.tsx`
- `app/(app)/template.tsx`
- `components/nav/Sidebar*.tsx`
- `components/layout/AppHeader.tsx`
- `components/layout/CommandPalette*.tsx`
- `components/layout/AvatarMenu.tsx`
- `components/layout/WorkspaceSwitcher.tsx`
- `components/navigation/RouteProgressBar.tsx`
- `components/authenticated/AuthenticatedPageHeader.tsx`
- `components/authenticated/AuthenticatedPageChrome.module.css`
- `components/ui/PageFrame.tsx`
- `components/workbench/WorkbenchPage.tsx`
- `components/workbench/DetailPageShell.tsx`
- `components/settings/SettingsPageShell.tsx`

### 14.3 Overview

Primary owners:

- `app/(app)/dashboard/page.tsx`
- `app/(app)/dashboard/loading.tsx`
- `app/(app)/dashboard/error.tsx`
- `components/dashboard/DashboardOverview.tsx`
- `components/dashboard/dashboardModel.ts`
- `components/dashboard/dashboardPilot.module.css`
- `lib/reporting/intelligence.ts` as read-only financial authority

### 14.4 Shared components

Prefer adapting:

- `Surface`
- `JoinedSection`
- `InsetGroup`
- `RegistrySurface`
- `MetricGroup`
- `DataTable`
- `DataTableServer`
- `Button`
- `ButtonLink`
- `Modal`
- `Drawer`
- `Toast`
- `Tooltip`
- authenticated chart primitives

Do not create a new component when an existing component can own the target
anatomy without semantic contortion.

### 14.5 Style ownership

- Tokens own visual constants.
- Shared primitives own static component appearance.
- Page-family composition owns layout.
- Route modules own data and semantic ordering.
- Inline styles are limited to data-derived geometry or custom-property values.
- A component variant describes meaning or structure, never an arbitrary local
  colour, shadow, or radius.

---

## 15. Implementation phases

Only identifiers `AQ-00` through `AQ-10` refer to executable phases in this
document. An implementation request must name the phase or explicitly request
the whole programme.

Each phase:

- begins only after its predecessor report passes;
- preserves unrelated working-tree changes;
- updates affected loading/error/empty states;
- records light and dark proof at the required widths;
- runs focused functional tests; and
- writes `docs/phase-reports/apple-quality/AQ-NN.md`.

Route-family phases normally change no more than two reusable production
modules and roughly twelve production files. Cross-cutting foundation and shell
phases use a named contract/risk boundary instead of an artificial file count:
their reports must list every shared contract, every changed consumer family,
and at least two direct regression consumers.

### AQ-00 — Authority and truthful baseline

**Goal:** Establish one target and one reliable comparison state.

Work:

- record the exact working-tree baseline;
- run `npm run verify:schema-preflight` before visual capture;
- run `npm run release:readiness` and applicable runtime preflight where the
  environment is available;
- require representative flagship routes to resolve truthful data, and classify
  environment/schema failures separately from visual failures;
- capture representative routes and states from that baseline;
- inventory current test drift;
- update the four visual-authority loaders named in §1.2;
- route Living Precision or an extracted as-built contract to excluded
  surfaces, while marking its `.ua-app` clauses as historical visual evidence;
- introduce `verify:apple-quality` as the active design-contract command and
  retire or redirect predecessor-only verification;
- create the phase-report directory and scorecard template; and
- record the canonical route/test matrix before interpreting failures.

No production UI changes.

**Exit:** One active visual authority, baseline captures, protected change
ledger, and agreed test truth.

### AQ-01 — Foundation calibration in the real product

**Goal:** Prove the visual grammar against real Unauth content before a
product-wide sweep.

Work:

- implement the target colour, typography, spacing, geometry, depth, and motion
  roles in the authenticated token layers;
- complete the exhaustive retain/change/deprecate ledger in §7.7;
- update `styles/authenticated/contracts.ts`, `authenticatedDesignEthos`, and
  the JavaScript motion mirror;
- update `/dev/design-system` with shell, surface, control, table, status,
  overlay, and route-state examples;
- render real-density examples, long labels, mixed statuses, money, loading,
  error, dark mode, reduced motion, and forced colours;
- produce two recorded visual iterations; and
- calibrate Overview header/metric/hero and case identity/inspector fragments
  without completing either route.

**Exit:** Foundations pass contrast and state coverage; two reviewers agree the
calibration no longer reads as the current card-led system or the rejected
Incident Desk prototype.

### AQ-02 — Shell and global utilities

**Goal:** Replace boxed chrome with a composed navigation, utility, and work
plane.

Work:

- adapt sidebar anatomy and responsive compaction;
- adapt utility toolbar, command search, notification, credit warning, and
  account controls;
- preserve all providers and layout security behaviour;
- remove duplicate title/location responsibility;
- keep the shell mounted through route transitions; and
- update shell skeleton and banners.

Direct regression routes:

- `/dashboard`
- `/claims/[id]`
- `/settings/account`

**Exit:** Every authenticated route is navigable at 1440, 1280, and 1024px;
collapse persistence, permissions, counts, workspace switch, source link,
search, notifications, and account actions pass.

### AQ-03 — Canonical frames and primitives

**Goal:** Make shared composition capable of producing the target without
route-local visual inventions.

Work:

- complete review slice A: converge `PageFrame`, page header, Workbench, Detail,
  and Settings adapters, then converge surfaces into working, joined, inset,
  floating, and unframed roles;
- complete review slice B: update action, field, status/provenance, registry,
  and table anatomy;
- complete review slice C: update overlay and route-state anatomy;
- remove visually redundant wrappers in direct consumers; and
- update `/dev/design-system`.

Each slice has its own changed-contract ledger and direct consumer checks. Do
not begin slice B or C while the prior slice has unresolved semantic or
accessibility regressions.

**Exit:** All three slices pass; shared primitives express every target
composition; no new parallel card, page-header, table, or overlay system
exists.

### AQ-04 — Overview

**Goal:** Deliver the first complete 9/10 flagship surface.

Work:

- restructure `DashboardOverview` to §9.1;
- preserve all URL, export, chart, data-health, financial, and drill-down
  behaviour;
- replace equal KPI and infographic-card composition;
- simplify workflow and source-health encodings;
- update loading, error, empty, partial, and unavailable geometry; and
- capture two live visual-review iterations.

**Exit:** Focused tests pass; the five-second test, first-viewport gate, crop
gate, accessibility gate, and scorecard pass.

### AQ-05 — Work

**Goal:** Deliver the operational queue grammar.

Work:

- compose one joined queue surface;
- clarify filters, saved views, SLA bands, selection, and bulk state;
- add the wide contextual inspector only where it improves triage;
- preserve all eleven URL-backed views and every existing mutation; and
- verify exception and no-case destinations.

**Exit:** Operators can identify what needs action, why, amount, deadline, and
destination without opening every row; all current Work behaviours pass.

### AQ-06 — Cases registry and case detail

**Goal:** Deliver the decisive product-proof experience.

Work:

- transform Cases into the target master/detail registry;
- transform case detail into the evidence story plus decision inspector;
- preserve all permissions, recommendations, evidence, investigations,
  decisions, responsibility, recovery, timeline, confirmations, and conflicts;
- verify long evidence, split shipments, multiple currencies, missing sources,
  read-only users, and completed cases; and
- produce the primary landing-page case capture from deterministic fictional
  data.

**Exit:** A merchant can understand the case and exact decision consequence
within five seconds without any loss of functionality or product truth.

### AQ-07 — Loss, recovery, customer, and connected-object families

**Goal:** Extend the registry/detail grammar across the evidence graph.

Work:

- migrate Losses and Recovery registry/board/detail surfaces;
- migrate Customers and customer evidence task;
- migrate order, shipment, refund, return, dispute, and ticket detail;
- preserve financial, provenance, relationship, pagination, board overflow,
  and action contracts; and
- remove nested record-card stacks.

**Exit:** Related records feel like one product while retaining distinct task
composition and every deep link.

### AQ-08 — Rules, flows, and reports

**Goal:** Extend the system to analytical and builder work.

Work:

- migrate Rules and Flows registries, builders, versions, runs, and detail;
- migrate Reports and record drill-down;
- keep builder previews contextual rather than decorative;
- preserve versions, publish/pause behaviour, execution history, exports,
  financial definitions, accessible chart data, and entitlements; and
- verify long rule/flow labels and dense report states.

**Exit:** Builders feel spatially deliberate and Reports retains exact,
explainable financial truth.

### AQ-09 — Integrations, settings, notifications, and help

**Goal:** Complete secondary authenticated routes without reducing their
quality.

Work:

- migrate integration catalogue, provider details, import, and account
  selection;
- migrate connector setup routes;
- migrate all Settings sections;
- migrate Notifications and Help;
- keep source health and merchant action above technical implementation detail;
  and
- preserve permissions, secrets, save feedback, destructive confirmations,
  theme, billing, audit, and privacy behaviour.

**Exit:** Sparse routes look intentional, dense routes remain readable, and no
merchant-facing surface exposes raw implementation artefacts as decoration.

### AQ-10 — Cross-product states, deletion, capture, and cutover

**Goal:** Finish `.ua-app`, remove predecessor styling from that scope, and
prove release quality.

Work:

- sweep all 51 authenticated pages plus loading, error, and not-found
  boundaries;
- verify every route family and end-to-end flow;
- remove obsolete `.ua-app` route-local palettes, wrappers, screenshots, tests,
  comments, and active visual instructions without deleting the scoped
  contract for excluded surfaces;
- remove any temporary calibration code;
- update deterministic product captures;
- run the complete release matrix;
- obtain independent visual review; and
- update authority and contributor documents to describe only the as-built
  system.

**Exit:** The Definition of Done in §20 passes. No mixed visual system remains
inside `.ua-app`.

---

## 16. Verification plan

### 16.1 Focused foundation/shell gate

```text
npm run lint:authenticated-design
npm run verify:ui-parity
npm run typecheck
```

Add focused component and browser tests for every changed primitive and its two
highest-risk consumers.

### 16.2 Overview gate

```text
npm run lint:authenticated-design
npm run typecheck
npx eslint "app/(app)/dashboard" components/dashboard
npx jest tests/unit/dashboardModel.test.ts tests/components/phase07Dashboard.test.tsx tests/lib/reportsPayoutContract.test.ts --runInBand
```

Add `npm run verify:ui-parity` when links, URL state, controls, or navigation
change. Add `npm run build` when route/client boundaries change.

### 16.3 Cross-product release gate

At programme completion run:

```text
npm run verify:design-contract
npm run verify:ui-parity
npm run verify:apple-quality
npm run verify:schema-preflight
npm run lint
npm run typecheck
npm test
npm run build
npm run test:release-browser
```

`verify:apple-quality` is introduced in `AQ-00`. Do not keep a passing command
whose name or assertions enforce the predecessor.

Run `npm run release:readiness` and the applicable runtime checks in an
environment with the required services. A schema or service failure is a
release blocker and must be reported separately; it is not a visual-review
failure and must not be hidden with deterministic fixtures.

Use broader security, tenancy, audit, financial, and provider gates when the
touched code crosses those boundaries.

### 16.4 Known test drift to resolve

Do not preserve stale expectations merely to keep a test green:

- tests that still expect the old “Payout decisions” label must align with the
  current canonical “Cases” product language;
- tests that expect a 390px authenticated mobile navigation must align with the
  active 1024px desktop boundary; and
- functional parity comparisons must use the named working-tree baseline, not
  assume `HEAD` represents current behaviour.

Replace stale visual text assertions with semantic, capability, route, and
state assertions where possible.

---

## 17. Visual review and screenshot gates

Automated tests cannot determine whether the result is 9/10. Every flagship
route requires live visual review.

### 17.1 Required proof set

For `/dashboard`, `/work`, `/claims`, and `/claims/[id]` capture:

- 1440×900 light;
- 1440×900 dark;
- 1280×800 light;
- 1024px supported edge;
- relevant loading, empty/partial, error, selected, overlay, and read-only
  states;
- reduced motion behaviour; and
- a 16:10 landing-page crop using deterministic, privacy-safe fictional data.

Verify 1023px separately as the desktop-required boundary.

### 17.2 First-viewport gate

At 1440×900:

- page identity, scope controls, lead state/value, and primary action are
  visible;
- at least 60% of the dominant work surface is visible;
- the dominant object occupies at least 1.5 times the visual area of any
  supporting object;
- no more than one filled primary action appears in a local region;
- the screen does not begin with a wall of equal cards; and
- provenance or freshness is available without competing with the main task.

### 17.3 Five-second test

A reviewer unfamiliar with the screen must answer:

1. What page or record is this?
2. What matters right now?
3. What is the financial or operational state?
4. What should the operator do next?
5. Is this a recommendation, a fact, or a merchant-confirmed outcome?

All five answers must be correct from the initial viewport.

### 17.4 Quality scorecard

Two reviewers score each flagship from 1–10:

| Dimension | What is judged |
| --- | --- |
| Hierarchy | Dominant object, reading order, action priority |
| Product clarity | Product truth, evidence, uncertainty, consequence |
| Composition | Alignment, whitespace, density, absence of card soup |
| Typography | Authority, legibility, financial scanning, capture readability |
| Interaction | Familiarity, feedback, keyboard/pointer quality |
| Craft | Consistency, detail, states, icon and control anatomy |
| Accessibility | Contrast, focus, zoom, motion, forced colour |
| Distinctiveness | Feels like Unauth, not a template or Apple imitation |

Pass requires:

- at least `9.0/10` overall from both reviewers;
- no dimension below `8.5`;
- no unresolved “dated”, “generic”, “iOS-like”, or “screenshot-only” finding;
  and
- both reviewers choosing the new surface over its baseline without being told
  which is new.

### 17.5 Performance and stability

- CLS ≤ 0.05 on tested routes;
- no hydration warning;
- no hanging loader;
- no failed required request hidden by a polished state;
- no layout jump when fonts, charts, banners, or data resolve;
- no expensive blur or perpetual animation;
- no document-level horizontal overflow; and
- route transitions preserve shell and focus context.

---

## 18. Rollout and rollback

### 18.1 Rollout

- Implement on a dedicated branch from the named baseline.
- Do not add a merchant-facing visual cohort or compatibility theme.
- Route-family work may be reviewed incrementally on the branch.
- Merge/release only when `AQ-10` proves one complete authenticated system.
- Preserve the existing authenticated rollout telemetry until a separate
  cleanup decision; do not repurpose it as a second visual theme switch.
- Update landing-page captures only after the underlying live product route
  passes its release gates.

### 18.2 Rollback

Rollback is source-control based:

- keep phase boundaries reviewable;
- avoid data migrations for presentation work;
- avoid coupling visual changes to irreversible product behaviour;
- record every shared contract change and direct consumers;
- if a phase fails, revert that phase as a coherent unit rather than restoring
  predecessor aliases or runtime theme branches.

---

## 19. Prohibited outcomes

The implementation fails if it produces any of the following:

- the same pale bordered-card stack with slightly different tokens;
- four or more equal KPI cards leading a route;
- several chart types competing for attention on one screen;
- tiny metadata used to fit an overfull composition;
- a sidebar made from nested tiles, chips, and boxed controls;
- a header made from a row of unrelated bordered widgets;
- a dominant surface smaller than its supporting cards;
- rounded rectangles around every section;
- status pills used as general metadata or decoration;
- accent colour used for risk, success, warning, or freshness;
- semantic colour used for selection;
- raw UUIDs, provider keys, storage IDs, or database statuses in normal
  merchant-facing hierarchy;
- a decision inspector that implies Unauth made the decision;
- hidden uncertainty, provenance, currency, or reconciliation state;
- iOS navigation, bottom sheets, phone layouts, fake system chrome, SF assets,
  or decorative glass;
- a screenshot-only route, fixture-only UI branch, or fabricated production
  capability;
- a new visual feature flag or parallel token namespace;
- new public/landing tokens imported into the authenticated product;
- route-local shadows, palettes, radii, headers, tables, or overlay systems;
- inaccessible hover-only evidence or pointer-only actions;
- decorative motion, auto-playing chart theatre, or count-up animation;
- a misleading loading, empty, zero, healthy, or success state; or
- a page declared complete while its loading, error, dark, 1024px, keyboard,
  zoom, or forced-colour state still uses the predecessor.

---

## 20. Definition of Done

The transformation is complete only when:

1. this document is the sole visual authority for `.ua-app` and
   `app/(app)/**`, with excluded surfaces routed to an explicit scoped
   authority;
2. all 51 authenticated page routes use the target shell and visual grammar;
3. all route loading, empty, filtered-empty, stale, partial, disconnected,
   permission, error, and not-found states are migrated;
4. `/dashboard`, `/work`, `/claims`, and `/claims/[id]` pass the two-reviewer
   9/10 scorecard;
5. all existing routes, redirects, permissions, entitlements, query states,
   exports, mutations, audit behaviour, and deep links remain intact;
6. financial, currency, provenance, recommendation, decision, responsibility,
   and recovery truth remains intact;
7. no mixed predecessor styling, route-local visual fork, or compatibility
   theme remains;
8. light and dark modes pass at 1440, 1280, and 1024px;
9. the 1023px desktop-required boundary passes;
10. WCAG 2.2 AA, keyboard, 200% zoom, text spacing, reduced motion, and forced
    colours pass;
11. deterministic, privacy-safe product captures are generated from real route
    implementations rather than mock screenshot components;
12. the product proof remains understandable when reduced for the landing page;
13. the complete validation suite passes against the named baseline;
14. contributor rules, tests, comments, and design-system documentation
    describe the as-built system only; and
15. an independent reviewer can no longer reasonably describe the result as
    dated, generic, iOS-like, or a wall of cards.

---

## 21. References

Product and repository:

- [`PRODUCT.md`](PRODUCT.md)
- [`IMPL_merchant_operations_experience.md`](IMPL_merchant_operations_experience.md)
- [`IMPL_living_precision_product_ui.md`](IMPL_living_precision_product_ui.md)
- [`UI_SHIP_REVIEW_2026-07-30.md`](UI_SHIP_REVIEW_2026-07-30.md)
- [`../styles/authenticated/README.md`](../styles/authenticated/README.md)

Official Apple design guidance:

- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos/)
- [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)
- [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
- [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility/)

These references govern principles and quality. The implementation remains a
browser-native Unauth interface built from Unauth’s product truth and
components.
