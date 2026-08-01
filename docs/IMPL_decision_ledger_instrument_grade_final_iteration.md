# IMPL — Decision Ledger: Instrument Grade

- Status: final visual iteration implementation authority
- Date: 31 July 2026
- Scope: visual design, visual hierarchy, responsive composition, motion, and visual state quality only
- Product behaviour: frozen unless a visual refactor requires an equivalent internal composition
- Coverage baseline: APPX_whole_product_visual_coverage_ledger.md
- Direction: Decision Ledger, completed and elevated rather than replaced
- Quality target: a credible 9–10/10 product interface and screenshot system

This document is the final visual pass for the whole Unauth product. It is not a
request for another style experiment and it is not a light polish backlog. It
is the implementation authority for converging every visible surface on one
recognisable, product-specific design language.

Earlier visual plans remain useful history, but where their visual decisions,
phase order, component names, or acceptance criteria conflict with this
document, this document wins. PRODUCT.md, the current route behaviour, data
contracts, permissions, mutations, and provider truth remain authoritative for
what the product does.

---

## 0. Executive decision

### 0.1 Selected direction

The final direction is **Decision Ledger — Instrument Grade**.

The existing Decision Ledger idea is strategically right: Unauth exists to
show the financial position, assemble evidence, distinguish fact from
inference, support a merchant decision, and preserve the recorded outcome. The
remaining problem is execution. Today, only a handful of routes use that
grammar, several older design systems remain active, and too many pages still
resolve into familiar B2B cards, chips, tables, and sidebars.

Instrument Grade keeps the calm, cool, browser-native foundation and adds the
specificity, precision, and continuity missing from the current build:

1. Evidence has a visible route from source to decision.
2. Financial values form an equation instead of a row of unrelated KPIs.
3. Every page has one dominant operating object.
4. The action and its consequence occupy one deliberate decision region.
5. Recorded outcomes appear in place and become part of the ledger.
6. States explain what remains known, what is unavailable, and what happens
   next.
7. Public proof, authenticated work, entry flows, and host embeds look like
   different densities of the same product.

### 0.2 What creates the “wow”

The finish will not come from gradients, glass, giant decorative type, a new
font package, ornamental illustration, or more motion. It will come from:

- product-specific evidence geometry;
- unusually clear financial reconciliation;
- strong optical alignment and first-viewport composition;
- direct chart labels and meaningful annotations;
- visible provenance and decision-safe scope;
- coherent transitions from source fact to merchant action to recorded
  outcome;
- restraint that makes the few exceptional moments feel intentional; and
- screenshots that remain useful product proof after the browser chrome and
  marketing copy are removed.

The target is not “Apple-looking.” Apple’s useful principles for this web
product are purpose, hierarchy, alignment, adaptability, progressive
disclosure, feedback, and accessibility. Those principles are translated into
a desktop operational workspace. iOS tab bars, sheets, Liquid Glass, traffic
lights, floating segmented controls, SF-specific imitation, and mobile-first
chrome are explicitly rejected.

Reference principles:

- Apple Human Interface Guidelines — layout:
  https://developer.apple.com/design/human-interface-guidelines/layout
- Apple Human Interface Guidelines — design principles:
  https://developer.apple.com/design/human-interface-guidelines/design-principles
- Apple Human Interface Guidelines — accessibility:
  https://developer.apple.com/design/human-interface-guidelines/accessibility/
- WCAG 2.2:
  https://www.w3.org/TR/WCAG22/

### 0.3 Non-negotiable product boundary

This programme may change:

- visual hierarchy;
- page composition;
- spacing and density;
- responsive placement;
- component appearance;
- grouping and progressive disclosure;
- chart form and annotation;
- loading, empty, error, warning, success, and unavailable presentation;
- motion and local feedback;
- visual order when the semantic and keyboard order remain correct; and
- which shared component owns an existing visual responsibility.

It may not change:

- routes or route destinations;
- permissions or entitlements;
- business rules;
- data calculations;
- financial definitions;
- provider capabilities;
- API payloads;
- mutation semantics;
- audit records;
- source-versus-inference boundaries;
- merchant decision authority;
- required form fields;
- legal meaning; or
- the existence of any user-visible state.

No screenshot-only branches, fake values, visual feature flags, or parallel
production design systems are allowed.

---

## 1. Audit verdict

### 1.1 The honest state of the product

The product is no longer visually broken. It has a credible neutral palette,
good operational content, real product proof, stable shells, and a much
stronger information model than the original card-heavy dashboard.

It is still below the requested bar for five systemic reasons:

1. **The signature system is mostly theoretical.** DecisionHeader and
   ScopeStrip have one real route consumer, LedgerBridge has one, and
   SourceTraceRow has one. DecisionSentence, RecordedOutcome, and ActionDock
   have no real consumers.
2. **The visual authority is internally contradictory.** Active files contain
   overlapping token layers, historical names, stale programme comments, and
   incompatible radius and type documentation.
3. **Page families still look like separate redesigns.** Dashboard, case
   detail, builders, settings, entry, public, and Pocket Brief surfaces do not
   yet share one unmistakable grammar.
4. **Density is often solved with microtype and boxes.** The result is correct
   but visually timid, generic, and difficult to read in screenshots.
5. **The evidence programme proves coverage more reliably than final quality.**
   Existing captures are broad, but historical completion marks do not prove
   that the current source is visually final.

### 1.2 Measured coverage

The current checker passes with:

| Inventory class | Count |
|---|---:|
| Page modules | 65 |
| Layout modules | 7 |
| Route-state boundary modules | 95 |
| Named nested views and overlays | 53 |
| Additional stateful view owners | 21 |
| Embedded rendering surfaces | 4 |
| Unique required files | 245 |

That ledger remains the canonical baseline, but it is not the final inventory.
The audit found visible cross-route owners that are not represented as
independent rows, including:

- app/(app)/template.tsx;
- components/system/DesktopRequiredBoundary.tsx;
- components/connections/PageConnectionGate.tsx;
- components/connections/ConnectionPromptStrip.tsx;
- components/navigation/RouteProgressBar.tsx;
- components/navigation/RoutePendingNotice.tsx;
- components/common/DemoBanner.tsx;
- components/billing/BillingStatusBanner.tsx;
- components/integrations/ShipBobIntegrationBanner.tsx;
- components/shopify/ShopifyIntegrationBanner.tsx;
- components/layout/WorkspaceSwitcher.tsx;
- components/layout/MerchantEnvChip.tsx;
- components/layout/ContextCreditsBadge.tsx;
- components/product/FeatureGate.tsx;
- components/product/LockedFeaturePreview.tsx;
- components/product/UpgradeCard.tsx;
- components/product/FeatureTierBadge.tsx; and
- stateful settings clients whose internal modes are more substantial than a
  leaf component.

IG-00 must extend the checker and ledger before any route is marked complete.
All historical checked boxes are treated as baseline coverage, not evidence of
completion for this iteration.

### 1.3 Adoption gap

| Intended signature primitive | Current real adoption | Final decision |
|---|---:|---|
| DecisionHeader | Dashboard only | Make it the page-identity contract where appropriate |
| ScopeStrip | Dashboard only | Use for true scope and view control, not generic filters |
| LedgerBridge | Reports only | Generalise into the financial/evidence equation |
| SourceTraceRow | One reconciliation view | Make source provenance a shared record pattern |
| DecisionSentence | No real consumer | Adopt in decision-bearing routes or delete |
| RecordedOutcome | No real consumer | Adopt in case, recovery, rule, flow, and setup outcomes |
| ActionDock | No real consumer | Adopt for dirty forms and consequential actions or delete |

An exported component with no production consumer is not a design system.
Every signature primitive must finish this programme in one of two states:
widely and appropriately adopted, or deleted.

### 1.4 Visual debt signals

The audit found approximately 627 broad source matches for one or more of:
small text, uppercase treatments, excessive rounding, shadows, gradients, or
backdrop effects. This is a prioritisation signal rather than a defect count,
but it confirms that local styling has outpaced system ownership.

The largest visual owners also indicate route-local design worlds:

| File | Approximate size |
|---|---:|
| casePrototypeLab.module.css | 3,528 lines |
| dashboardPilot.module.css | 1,449 lines |
| app/globals.css | 1,230 lines |
| landing foundation.module.css | 961 lines |
| WorkQueue.tsx | 817 lines |
| ClaimsPageView.tsx | 799 lines |
| RuleVersionWorkbench.tsx | 776 lines |
| pageSkeletons.tsx | 758 lines |
| DashboardOverview.tsx | 695 lines |
| IntegrationsWorkspace.module.css | 507 lines |

Line count alone is not a quality problem. Here it exposes duplicated visual
decisions, difficult convergence, and a high chance that one route drifts while
another is polished.

### 1.5 Authority conflicts to remove

The final pass must resolve, not layer over, these contradictions:

- DESIGN.md frontmatter declares 8/12/16 radii while its narrative still says
  6/10/14.
- styles/authenticated/tokens.css defines 6/10/14, then overrides the
  authenticated product to 8/12/16 later in the same file.
- typography.css defines compact base values, then a second authenticated type
  system later in the file.
- DESIGN.md documents only a partial type ramp.
- app/layout.tsx contains a stale competitor-copy comment describing a “Ramp
  redesign.”
- the font variables use historical names that no longer describe the fonts
  they load.
- the monospace fallback still names SF Mono.
- .impeccable/design.json still describes an older “Quiet Evidence Desk” and
  Evidence Spine direction.
- styles/authenticated/README.md and several source comments still claim older
  Apple-quality and Living Precision authorities.
- multiple verification and capture commands preserve retired programme names.

The implementation must leave one active visual authority, one active token
layer per surface mode, and one current naming scheme.

### 1.6 What the screenshots prove

The latest broad route captures show meaningful progress, but the repeated
visual pattern remains:

- small sidebar;
- broad pale canvas;
- page title;
- thin toolbar;
- rounded white rectangle;
- tiny labels and chips;
- table or familiar chart;
- another rectangle.

Case detail contains truthful evidence and decision content, but the critical
relationship is split into a large bordered work card and a detached right
card. Reports resolves to four KPI-like readings above familiar chart panels.
Onboarding repeats progress through a bar, checklist, and step counter. The
landing hero has editorial scale, but the product frame remains a bordered
mini-application and the composition could belong to another operations
platform.

The existing dashboard critique scored 26/40 and described it as credible
7–8/10 rather than 9–10/10. Its most important findings remain applicable
across the product:

- category-standard shell and chart grammar;
- weak operating conclusion;
- distributed controls;
- ambiguous counts;
- conflated trust axes;
- degraded states that do not state what remains known;
- a weak first viewport at 1024px and 1280px; and
- screenshots that can look broken when freshness is low even if some values
  remain decision-safe.

### 1.7 Final diagnosis

Unauth does not need another visual direction. It needs:

- authority convergence;
- wider adoption of a smaller number of stronger primitives;
- route-by-route composition work;
- a state system as polished as the ideal state;
- native treatment of embedded surfaces;
- public proof made from the real product grammar; and
- a visual release gate strict enough to reject “technically complete.”

---

## 2. Scope and coverage contract

### 2.1 Included

The programme covers every visible:

- public page;
- auth page;
- onboarding step;
- authenticated page;
- settings page;
- layout and shell;
- loading, error, not-found, permission, entitlement, connection, and
  unsupported-width boundary;
- table, registry, board, builder, analytical canvas, detail dossier, form,
  document, and setup flow;
- modal, dialog, drawer, sheet-like web overlay, menu, tooltip, toast, and
  inline feedback state;
- command palette state;
- product demo step;
- design-system and provider preview route;
- browser extension state;
- checkout extension state;
- Zendesk host frame;
- Gorgias widget and unlock state;
- responsive composition;
- light, dark, forced-colours, and reduced-motion mode; and
- screenshot and public product-proof crop.

### 2.2 Excluded

This pass does not:

- redesign backend behaviour;
- invent a new user journey;
- rewrite product positioning;
- change pricing, commercial policy, or legal terms;
- add unsupported integrations;
- imply a Freshdesk embedded sidebar that does not exist;
- change data semantics to make a chart prettier;
- add a new design dependency without a demonstrated gap;
- create bespoke artwork to conceal an unfinished product surface; or
- convert the authenticated desktop workspace into a phone application.

### 2.3 Completion rule

A page is not complete because its default route screenshot looks good.

Completion requires:

1. its page owner is covered;
2. its layout and boundary owners are covered;
3. all named overlays and stateful internal modes are covered;
4. long, empty, dense, unavailable, error, and success data are covered where
   applicable;
5. the shared primitives it consumes are final;
6. its 1440px, 1280px, and 1024px authenticated compositions pass, or its
   public/mobile/embed matrix passes;
7. keyboard, zoom, forced-colours, dark mode, and reduced motion pass;
8. no historical visual-system styles remain in its rendered subtree; and
9. the final visual reviewer accepts the route at actual scale.

---

## 3. Creative system — Instrument Grade

### 3.1 Visual thesis

Unauth is an evidence-and-decision instrument, not a collection of dashboards.
The page should read like a carefully assembled operational record:

- a stable index and scope;
- a clear object or financial position;
- evidence with provenance;
- an explicit gap or inference;
- a merchant-owned action;
- an outcome that becomes part of the record.

The visual mood is cool, exact, calm, and unsentimental. It is not sterile:
specific data, provider marks, direct annotations, decisive type, and local
motion provide character.

### 3.2 The six signature patterns

#### A. Evidence Thread

A shared visual trace from source to fact to inference to recommendation to
merchant decision to outcome.

Rules:

- use nodes and connecting rules only when a genuine relationship exists;
- label each change of authority;
- source facts and system inferences must never share the same treatment;
- an absent or stale input interrupts the line and names the gap;
- the thread may be vertical in detail views, horizontal in wide analytical
  views, and compressed in Pocket Brief;
- every node remains understandable without colour; and
- the pattern is an information structure, never decorative circuitry.

#### B. Financial Equation

Exposure, prevented value, confirmed loss, recovered cash, and net loss must
read as an equation or reconciliation, not five equivalent KPI cards.

Rules:

- use operators, alignment, and direct labels;
- display exact currency and scope;
- link each result to its record set;
- qualify unavailable or partial operands;
- show the decision-safe boundary when source health is degraded; and
- do not repeat the same exceptional value in a header, card, chart, and
  footer.

#### C. Decision Focus

The current merchant action, its evidence threshold, and its consequence form
one aligned region.

Rules:

- one primary commit action per region;
- use the near-black commit treatment only for consequential recording or
  publication;
- ordinary navigation and setup actions remain violet;
- rationale, ownership, and validation sit with the decision rather than in a
  detached generic card;
- destructive choices are visually distinct and never adjacent without
  spacing and confirmation; and
- mobile or compact presentation preserves action context instead of making a
  sticky button with no explanation.

#### D. Source Beacon

A compact source identity containing:

- provider mark;
- source type;
- authority classification;
- last observed timestamp;
- freshness or availability;
- limitation when known; and
- direct route to source details when available.

It replaces ambiguous coloured dots and generic “connected” badges.

#### E. Outcome Echo

After an action succeeds, the local region changes into the recorded result:

- who acted;
- what was recorded;
- when;
- resulting state;
- any follow-on route; and
- immutable or reversible status.

Use a brief tonal settle and changed-value emphasis. Do not rely on a toast as
the only success evidence.

#### F. Scope Rail

Period, currency, owner, saved view, filters, or document section navigation
occupy one durable region. Durable navigation looks like navigation; temporary
filters look like controls. Both must stop masquerading as interchangeable
chips.

### 3.3 Surface modes

The product has one identity and four density modes:

| Mode | Use | Character |
|---|---|---|
| Operational | Authenticated app | precise, compact, high information yield |
| Editorial | Landing, pricing, demo, legal | larger rhythm, real product proof |
| Entry | Auth, signup, onboarding | calm focus, one forward action |
| Pocket Brief | Browser, helpdesk, checkout | native-width evidence summary |

Modes may change spacing and type scale. They may not change the colour voice,
icon family, state language, or provenance grammar.

### 3.4 Anti-aesthetic

The following are prohibited as finish techniques:

- glass, blur, translucent nav, or Liquid Glass imitation;
- decorative gradients in product, auth, onboarding, or embeds;
- large rounded containers around every section;
- floating cards inside bordered cards;
- fake browser chrome in real product proof;
- traffic-light controls;
- generic 3D objects, AI illustration, or abstract blobs;
- giant numbers without scope;
- all-uppercase micro-labels;
- pill controls for every state and filter;
- invisible row actions that appear only on mouse hover;
- micro-sparklines used as decoration;
- icon-only actions without names or tooltips;
- warm cream, copper, or rust as a second product accent;
- route-specific shadows;
- motion that delays work; and
- “premium” styling that weakens data truth.

---

## 4. Fixed visual foundation

### 4.1 Colour

Keep the current cool-neutral and violet identity, then remove duplicate
definitions.

| Role | Final light value | Use |
|---|---|---|
| Canvas | #F6F7F9 | continuous authenticated work area |
| Navigation plane | #F1F2F5 | stable shell index |
| Toolbar / paper | #FFFFFF | primary reading and editing plane |
| Secondary plane | #F5F6F8 | joined support regions |
| Muted plane | #EEEFF2 | disabled or low-emphasis structural area |
| Primary ink | #17171B | identities, decisions, financial values |
| Secondary ink | #52515B | body and supporting controls |
| Tertiary ink | #6B6B75 | timestamps and provenance, never below 12px |
| Subtle line | #E6E6EA | internal joins |
| Default line | #D7D7DE | owned perimeter and controls |
| Violet | #5B5BD6 | action, focus, selection, current series |
| Violet hover | #4949B8 | interactive hover |
| Violet wash | #ECEBFF | selected row or control |
| Commit ink | #17171B | consequential recording and publication |

Retain the current semantic triplets in status.css:

- information blue;
- success green;
- warning amber;
- critical red; and
- unknown neutral.

Every semantic use requires text or a glyph. Violet never means healthy,
dangerous, complete, or stale.

Dark mode is the same system with recalibrated luminance, not a second art
direction. Broad muddy warning panels and glowing accent fields are not
allowed.

### 4.2 Typography

Use Inter for all interface and editorial sans roles, Inter Tight only for
public display roles where its tighter construction is visibly useful, and DM
Mono only for source IDs, hashes, code, API keys, and payloads.

Final product type roles:

| Role | Size / leading | Weight | Use |
|---|---|---:|---|
| Public display XL | 64/66 | 650 | one landing statement at wide widths |
| Public display | 48/52 | 650 | major public section identity |
| Product financial hero | 38/44 | 650 | one true lead amount |
| Page identity | 28/34 | 650 | one per authenticated page |
| Record identity | 23/30 | 650 | case, customer, or connected object |
| Overlay identity | 20/27 | 600 | modal and drawer title |
| Section identity | 18/25 | 600 | major work regions |
| Working title | 16/22 | 600 | rows, cards only where truly needed |
| Body | 14/20 | 400 | forms, explanations, tables |
| Dense body / label | 13/18 | 400–550 | compact operational controls |
| Caption / metadata | 12/16 | 400–550 | provenance and timestamps |

Hard rules:

- no rendered product text below 12px;
- sentence case by default;
- one page identity;
- one exceptional financial hero only when earned;
- no monospace for money, dates, percentages, or table alignment;
- tabular numerals for all comparable values;
- paragraph measure near 60–72 characters;
- headings do not rely on weight 700+ as the only hierarchy; and
- public display type scales down fluidly without breaking into awkward
  two-word lines.

Rename historical font variables so their names describe Inter, Inter Tight,
and DM Mono. Remove the SF Mono-specific fallback and the competitor comment.

### 4.3 Geometry

One active geometry layer:

- control radius: 8px;
- surface radius: 12px;
- overlay radius: 16px;
- compact identity mark radius: 4px;
- fully round only for avatars, status dots, and genuinely circular controls;
- standard control height: 36px;
- compact control height: 32px;
- large public or touch control height: 44px;
- icon control: 32px product, 40–44px public/mobile;
- authenticated table row: 48px compact, 56px rich, 64px two-line;
- Pocket Brief body: 13px minimum with 38px primary controls.

The radius is a maximum vocabulary, not a requirement. Open sections and
joined regions should often use no visible radius at all.

### 4.4 Spacing and grid

Base spacing remains 4px with named steps:

- 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.

Authenticated layout:

- 200px expanded navigation;
- 56px collapsed navigation;
- 52px utility toolbar;
- 32px page gutters at 1280px and above;
- 20px page gutters at 1024–1279px;
- 12-column content grid;
- 24px standard column gap;
- 20px compact column gap;
- 1600px maximum work width;
- 288–352px contextual inspector when a true inspector is needed; and
- no duplicate outer card inset after the page canvas already owns the frame.

Optical rules:

- page identity, dominant object, and major work rows share one left axis;
- numbers align by digit and decimal where comparisons matter;
- status never pushes the primary identity off its alignment line;
- a right rail starts at the same vertical decision point as the content it
  controls;
- dividers terminate at semantic boundaries; and
- empty spacing belongs to hierarchy, not arbitrary margin accumulation.

### 4.5 Depth and borders

Inline surfaces are flat.

Allowed shadows:

- menus;
- tooltips;
- drawers;
- modals;
- command palette;
- a real product frame on a public page; and
- a floating public navigation bar if it remains visually subordinate.

Not allowed:

- route cards;
- chart panels;
- inline forms;
- table rows;
- metric blocks;
- selected items; or
- nested support regions.

One owner draws a perimeter. Children use tonal planes or internal rules. A
border around every cell is a defect.

### 4.6 Icons and provider identity

- Keep one icon family and one stroke logic.
- Use icons to improve scanning, never to decorate headings.
- Provider marks retain brand recognition but sit in a shared neutral holder.
- Icons never replace status text.
- Arrows remain visible for navigable rows; they do not appear only on hover.
- External-link and destructive glyphs remain consistent across all modes.
- Emoji are not interface icons.

### 4.7 Motion

Motion durations:

| Role | Duration |
|---|---:|
| Press | 80ms |
| Hover / focus colour | 100ms |
| Local state transition | 160ms |
| Menu / tooltip | 160–180ms |
| Drawer / modal | 220ms |
| Data transition | 300–360ms |
| Outcome Echo settle | 600ms |

Motion principles:

- movement explains continuity or causality;
- saved values highlight locally;
- list reordering preserves object identity;
- selected evidence and its detail use a shared positional relationship;
- no route-entry choreography;
- no springy operational controls;
- no animation that hides stale or unavailable states; and
- reduced motion removes spatial movement while preserving immediate state
  feedback.

### 4.8 Focus, targets, and visual accessibility

- focus is always visible and never clipped by overflow;
- sticky regions may not obscure focused elements;
- all desktop targets meet at least 24 by 24 CSS pixels;
- touch/public targets use 44px where practical;
- selected, warning, and success states never rely on colour alone;
- text and meaningful graphical objects meet WCAG 2.2 contrast requirements;
- content reflows at 200% zoom without lost actions;
- forced-colours mode retains boundaries and selected state;
- text-spacing overrides do not clip labels;
- tooltips are dismissible, hoverable, and persistent enough to read;
- chart information has a table or text equivalent; and
- DOM order matches reading and keyboard order even when the grid repositions
  regions.

---

## 5. Shared component system

### 5.1 Page-level primitives

#### DecisionHeader

Owns:

- page or record identity;
- one operating sentence;
- essential status;
- exact scope;
- no more than one primary and two quiet utilities.

It must replace inconsistent page-heading compositions in dashboard, work,
cases, losses, recoveries, reports, integrations, and relevant detail routes.
Settings and legal pages use specialised headings but share its type and axis.

#### ScopeStrip

Owns durable scope:

- time range;
- currency;
- owner or team;
- saved view;
- record category; and
- one compact utility group.

It is not a generic container for every filter. Temporary, high-cardinality
filters belong in a clear filter panel or drawer.

#### WorkbenchPage

Becomes the canonical registry and operational work frame. It owns:

- page identity;
- scope;
- selection mode;
- dominant work surface;
- inspector relationship;
- empty and unavailable geometry; and
- responsive collapse.

#### DetailPageShell

Becomes the canonical dossier frame. It owns:

- return path;
- record identity and status;
- anchored section index;
- evidence/record main plane;
- contextual decision region;
- sticky behaviour;
- not-found and degraded-source variants; and
- compact stacking.

#### SettingsPageShell

Becomes the canonical configuration document with:

- stable local index;
- readable form measure;
- clear save ownership;
- inline confirmation;
- danger-zone separation; and
- narrow-width in-flow section navigation.

### 5.2 Signature content primitives

#### EvidenceThread

Create as the canonical source-to-outcome structure. It may compose
SourceBeacon, SourceTraceRow, DecisionSentence, and RecordedOutcome rather than
replace them.

Variants:

- vertical dossier;
- horizontal analytical;
- compact Pocket Brief;
- missing-source;
- stale-source;
- mixed fact/inference;
- outcome-recorded; and
- forced-colours.

#### FinancialEquation

Create or evolve LedgerBridge into this role. It supports:

- operands;
- operators;
- scope;
- comparison;
- unavailable operands;
- record links;
- reconciliation status; and
- a plain-language conclusion.

#### SourceBeacon

Create from the existing source/freshness pieces and provider identity. It must
replace one-off source dots, ambiguous health badges, and repeated provider
metadata rows.

#### DecisionSentence

Use for the one sentence that states:

- current recommended or recorded action;
- why it follows;
- confidence or missing requirement; and
- merchant authority.

It must not become marketing copy inside the product.

#### ActionDock

Use only where a consequential action or dirty form benefits from persistent
context. Variants:

- in-flow;
- sticky within the work surface;
- compact stacked;
- validation blocked;
- saving;
- success transformed into Outcome Echo; and
- destructive confirmation.

It may never obscure content or create two equal primary actions.

#### RecordedOutcome

Use in:

- case decisions;
- investigation requests and responses;
- responsibility confirmation;
- recovery submission or closure;
- rule publication;
- flow publication and rollback;
- integration connection and disconnection;
- API key creation/revocation;
- team invite/member change;
- agreement acceptance; and
- onboarding completion.

### 5.3 Work-surface primitives

#### RegistrySurface

Canonical for cases, customers, losses, flow/rule indexes, reports records,
connected-record lists, and appropriate settings tables.

Requirements:

- one outer owner;
- integrated search and filtering;
- clear selection state;
- 48–64px row contracts;
- sticky header only inside its own scroll region;
- persistent destination affordance;
- keyboard-reachable row actions;
- bulk mode that visibly changes the toolbar;
- honest totals and current page range;
- no full-row pill fields; and
- compact and long-content fixtures.

#### BoardSurface

Canonical for recoveries and any genuine stage-based view.

Requirements:

- horizontal scrolling remains inside the board;
- columns have stable 288px width, 272px at compact desktop;
- stage identity is stronger than card decoration;
- cards expose amount, source gap, owner, and next event;
- empty columns remain quiet;
- dragged, focused, selected, and keyboard states are distinct; and
- a list-equivalent view remains available where already supported.

#### BuilderShell

Canonical for rules, flows, version workbenches, simulation, run history, and
recovery rulebook editing.

Requirements:

- stable index or outline;
- main builder/editor plane;
- validation or test output region;
- version state and unsaved state;
- one publish/commit zone;
- change review before publication;
- no equal card stack for every rule clause; and
- long rule names and nested conditions remain readable.

#### FormDocument

Canonical for settings, onboarding, integration setup, evidence creation, and
auth forms.

Requirements:

- natural field width;
- grouped sections through rhythm and joined rows;
- helper and error copy adjacent to the field;
- disabled state remains legible;
- one save owner;
- dirty-state visibility;
- success in place;
- destructive actions separated; and
- no giant empty panel around a short form.

### 5.4 Feedback and overlay primitives

Unify:

- Modal;
- Drawer;
- Tooltip;
- Toast;
- RowActionsMenu;
- CommandPalette;
- route progress;
- pending notice;
- loading skeletons;
- OperationalRouteError;
- OperationalRouteSkeleton;
- EmptyState;
- connection gates;
- entitlement locks; and
- unsupported-width boundary.

Rules:

- modal for a bounded decision;
- drawer for contextual inspection or an extended task that preserves origin;
- popover/menu for lightweight choices;
- inline disclosure for supporting detail;
- toast for secondary confirmation only;
- Outcome Echo for durable success;
- skeleton geometry matches final geometry;
- errors preserve known context;
- blocked states name the exact requirement and destination; and
- every overlay has escape, close, focus restoration, and background
  inertness.

### 5.5 Design-system gallery

app/(app)/dev/design-system/page.tsx must become the visual release laboratory,
not a sample page.

It must demonstrate:

- all foundations in light and dark;
- all type roles with long strings and tabular values;
- every control state;
- RegistrySurface row densities;
- BoardSurface cards;
- BuilderShell outline and validation;
- DecisionHeader;
- ScopeStrip;
- EvidenceThread;
- FinancialEquation;
- SourceBeacon;
- DecisionSentence;
- ActionDock;
- RecordedOutcome;
- loading, empty, partial, stale, unavailable, error, success, permission,
  entitlement, and destructive states;
- Modal, Drawer, Tooltip, Toast, RowActionsMenu, and CommandPalette;
- reduced motion;
- forced colours;
- 200% zoom;
- 30% longer copy; and
- Pocket Brief compact specimens.

No shared primitive may be considered final until its gallery specimen and at
least one real route consumer both pass.

---

## 6. Surface-by-surface implementation specification

### 6.1 Authenticated shell and global layers

#### Final composition

The authenticated shell is a stable index around a continuous work canvas:

- 200px expanded navigation;
- 56px collapsed navigation;
- 52px utility toolbar;
- fixed canvas origin with no hover-driven layout shift;
- one notice stack below the toolbar;
- route content on the shared 1600px frame; and
- portal-owned transient layers above the shell.

#### Upgrades

- Keep the shell visually quieter than the page.
- Merge workspace identity, merchant environment, and source attention into one
  compact, authored workspace block.
- Use one selected-navigation treatment: violet text/mark plus a quiet selected
  plane. Do not combine marker, heavy icon tint, rounded card, and count badge.
- Make navigation counts neutral unless they represent an urgent, defined
  state.
- Keep section labels sentence case and visually secondary.
- Use a fixed 56px compact rail at 1024–1199px. Labels may appear in an
  accessible flyout; the rail may not expand the flex layout and shift the
  canvas.
- Align every toolbar control to the 52px grid.
- Increase hit areas for search, notifications, collapse, avatar, and help
  without visually inflating desktop density.
- Recompose the command palette as a searchable ledger: query, grouped
  destination rows, scope/source hint, and keyboard path. Remove repeated icon
  tiles.
- Unify DemoBanner, BillingStatusBanner, ConnectionPromptStrip, route pending,
  source health, and quota messages under one notice stack contract with
  severity, persistence, action, and height budget.
- Keep no more than one persistent notice row at a time; additional notices
  collapse into a named summary.
- Replace route-settle transforms with opacity-only feedback or remove them.
  A persistent transformed ancestor must not interfere with fixed overlays.
- Portal menus, tooltips, drawers, modals, and the command palette to a
  designated overlay root.
- Make a central overlay stack responsible for topmost Escape handling,
  background inertness, scroll locking, collision, and focus restoration.
- Remove backdrop blur.
- Make tooltips collision-aware, dismissible with Escape, and present in the
  accessibility tree for the whole visible interval.
- Keep route progress to a subtle, deterministic top rule. The pending notice
  appears only after the delay threshold and cannot create layout jump.

#### Acceptance

- No canvas shift on sidebar hover, focus, or collapse.
- No notice stack exceeds 48px without explicit user expansion.
- First focus target, skip link, sidebar, toolbar, page, and overlay order are
  deterministic.
- First and last row menus never clip inside a table or registry.
- Nested overlays close only the topmost layer.
- Background content is inert while a modal is open.
- Every shell action has visible hover, pressed, focus, pending, and disabled
  treatment.

### 6.2 Dashboard — financial position instrument

#### Job

Answer in one viewport:

> What money is exposed, what changed, what requires action, and how safe is
> this reading?

#### Final composition

1. DecisionHeader with one operating sentence.
2. ScopeStrip containing period, comparison, currency, and report/export
   utility.
3. One open FinancialEquation and timeline canvas.
4. One joined supporting outcome row.
5. A ranked attention ledger.
6. An attached SourceBeacon footer and source-detail overlay.

#### Upgrades

- Replace distributed heading copy with one explicit operating sentence.
- Make the relationship among open, needing action, and ready for decision
  visible in one hierarchy.
- Reduce the metric switcher to a quiet underline set or compact selector.
- Make the chart useful at rest: exact selected-period total, bucket basis,
  comparison, highest interval, date, and one conclusion.
- Use one tabbable chart entry with roving bucket focus, Home/End, arrow keys,
  and a skip-to-data-table path.
- Connect annotations directly to their data mark.
- Put recovered, prevented, and realised loss into one aligned ledger row below
  the focal chart.
- Turn attention rows into why-now, amount, deadline/state, and destination.
- Rank only by a documented operational priority. If no valid priority exists,
  present the section as grouped status rather than ranked urgency.
- Separate source freshness, ledger validation, and decision-safe scope.
- Attach trust to the analysis it qualifies.
- Show the first two action rows at 1280×800 and at least one at 1024×900.
- The source overlay uses aligned source rows, not a grid of cards.

#### Required states

- single currency;
- mixed or qualified currency;
- no financial records;
- no comparison;
- comparison unavailable;
- no trend;
- pending URL scope change;
- partial source;
- stale source;
- reconciliation warning;
- unavailable values;
- decision-safe partial scope;
- source-detail overlay;
- long source names;
- dark;
- forced colours;
- reduced motion; and
- capture mode.

#### Primary owners

- app/(app)/dashboard/page.tsx
- app/(app)/dashboard/loading.tsx
- app/(app)/dashboard/error.tsx
- components/dashboard/DashboardOverview.tsx
- components/dashboard/DashboardPositionChart.tsx
- components/dashboard/dashboardPilot.module.css
- components/dashboard/dashboardModel.ts
- components/reporting/DashboardCharts.tsx

### 6.3 Work — queue forecast and decision registry

#### Job

Show what must be handled next, why it is urgent, and what object the operator
will act on.

#### Final composition

1. Compact DecisionHeader with open/due condition.
2. Four primary view destinations.
3. One narrow due-band strip.
4. One fixed-height registry command bar.
5. Work registry with optional inspector.
6. In-place bulk mode.

#### Upgrades

- Limit primary destinations to four; put secondary and saved views in a
  labelled Views menu.
- Compress the risk forecast into one due-band strip immediately above the
  registry.
- Do not render a detached chart and legend.
- Search, filters, count, density, and selection state share one command bar.
- Bulk mode replaces that bar rather than adding another toolbar.
- Lead each row with the next action.
- Retain object/customer, value, owner, and deadline.
- Move verbose descriptions and secondary source detail into the inspector.
- Remove avatar decoration, badge stacks, and warning blocks from the primary
  row.
- Use text and icon in addition to any priority colour.
- Make the deadline relationship explicit, not merely red.
- Keep row actions present to keyboard and discoverable to pointer.
- Preserve saved/shared view truth and URL-backed state.
- Exception resolution uses the shared drawer and consequence preview.

#### Required states

- built-in view;
- saved view;
- shared view;
- saved views loading;
- saved views unavailable;
- no saved views;
- integration exceptions;
- filtered empty;
- no source;
- row selected;
- bulk selected;
- busy row;
- bulk pending/error/success;
- save-view modal;
- deadline overdue/today/soon/later/unknown;
- inspector open;
- exception drawer;
- long identity; and
- 1024 compact registry.

#### Primary owners

- app/(app)/work/page.tsx
- app/(app)/work/loading.tsx
- app/(app)/work/error.tsx
- components/work/WorkQueue.tsx
- components/work/WorkQueuePulse.tsx
- components/work/WorkQueuePulse.module.css
- components/work/ExceptionResolutionDrawer.tsx

### 6.4 Cases registry

#### Job

Move from a broad case population to the exact next case, while preserving
evidence readiness and review priority.

#### Final composition

1. DecisionHeader with total, exposed value, and current scope.
2. Four primary views: Active, New evidence, Ready, History.
3. Search and advanced-filter command bar.
4. Case registry.
5. Selected-case decision preview.

#### Upgrades

- Replace the workflow chip wall with four durable views and one advanced
  filter popover.
- Separate durable view navigation from temporary filters.
- Simplify rows to customer/case identity, amount, one next action, and
  owner/due state.
- Present evidence gaps as plain named facts rather than a stack of badges.
- The selected preview begins with one DecisionSentence:
  ready to decide, or blocked by a named missing fact.
- Follow with the three independent axes: customer action, responsibility, and
  recovery.
- Add a compact EvidenceThread and a single route action.
- Put detailed evidence and activity behind a disclosure.
- Preserve keyboard listbox selection and deep-linked focus.
- At 1024px, move the preview below or into a drawer without pushing the
  registry below the first viewport.

#### Required states

- default and each primary view;
- advanced filters open;
- filter empty;
- initial no selection;
- selected case;
- selected case loading;
- missing evidence;
- missing customer;
- missing outcome;
- no source;
- overdue investigation;
- busy row;
- bulk action;
- deep-linked focus; and
- long case/customer values.

#### Primary owners

- app/(app)/claims/page.tsx
- app/(app)/claims/loading.tsx
- app/(app)/claims/error.tsx
- app/(app)/claims/ClaimsPageView.tsx
- app/(app)/claims/ClaimsQueueClient.tsx
- components/cases/CaseContextDrawer.tsx

### 6.5 Case detail — decision dossier

#### Job

Let an operator understand and record a merchant decision without losing the
source, evidence gap, responsibility, recovery path, or audit consequence.

#### Final first viewport

1. Back path and case identity.
2. Value at issue and requested customer action.
3. Evidence readiness and decision-safe scope.
4. DecisionSentence.
5. Named unresolved fact, if any.
6. EvidenceThread.
7. Decision Focus with staged ActionDock.

#### Upgrades

- Remove “Primary work surface” and other implementation-language labels.
- Replace the broad bordered card plus detached decision card with one joined
  dossier.
- Turn the section tabs into a thin sticky underline index with active scroll
  tracking.
- Render evidence as source trace rows with provider, source type, observed
  time, verification, and gap.
- Make the three recommendation axes aligned ledger dimensions, not three
  equal cards.
- The decision action uses a staged flow:
  choose decision → enter amount/rationale when applicable → review consequence
  → record.
- Keep the dock sticky only at wide widths.
- At 1024–1279px, place it immediately after the identity/decision summary.
- Put assignment, snooze, lifecycle, and reversal controls in a secondary
  management disclosure.
- Use a chronological activity spine with exact actor and timestamp.
- Render success as RecordedOutcome in the same region.
- Standardise decision, responsibility, investigation, recovery, and reversal
  dialogs around one consequence-preview anatomy.
- Preserve source facts, merchant findings, and system inferences as visually
  distinct authorities.

#### Required states

- evidence ready;
- named evidence gap;
- evidence absent;
- source stale;
- recommendation pending;
- recommendation unavailable;
- read-only;
- unassigned/assigned;
- decision unselected;
- decision validation;
- decision pending;
- decision recorded;
- reversal available/blocked/completed;
- open/closed/reopened;
- no recovery;
- no investigations;
- investigation draft/sent/waiting/responded/cancelled/closed;
- responsibility advisory/confirmed/corrected;
- no comments/history;
- failed action with preserved inputs;
- missing context;
- loading;
- error; and
- not found.

#### Primary owners

- app/(app)/claims/[id]/page.tsx
- app/(app)/claims/[id]/loading.tsx
- app/(app)/claims/[id]/error.tsx
- components/claims/ClaimReviewPanel.tsx
- components/claims/ClaimReviewHeader.tsx
- components/claims/ClaimReviewContextColumn.tsx
- components/claims/ClaimReviewActionRail.tsx
- components/claims/ClaimReviewManageCard.tsx
- components/claims/ClaimReviewHistoryTable.tsx
- components/claims/ClaimReviewToast.tsx
- components/claims/payout/*
- components/claims/investigations/*

### 6.6 Customers and evidence creation

#### Customer registry

- Use the canonical RegistrySurface.
- Lead with customer identity, order count/value where available, open case
  state, and current operational relevance.
- Make preview selection explicit without a decorative left stripe.
- Keep filter and sort controls in one command row.
- Either make CustomersFilterSheet reachable and canonical or remove it and its
  inner implementation.

#### Customer profile

- Lead with identity and the current operating question.
- Replace equal KPI blocks with one sentence joining open cases, order context,
  and value tied to cases.
- Merge orders and case history into one event ledger.
- Consolidate verified identifiers, observed changes, linked accounts, and
  possible matches into a Source Lineage inspector.
- Keep notes and activity as joined lower sections.
- Make the preview drawer mirror the full profile hierarchy.

#### Evidence creation

- Use one focused FormDocument:
  choose disputed order → inspect available evidence and named gaps → optional
  note → confirm destination and build.
- Remove duplicate page identity.
- Replace emoji and text glyphs with shared icons.
- Render “package will include” as evidence rows with availability and source.
- Keep unavailable evidence visible and explained.

#### Required states

- no customers;
- filtered empty;
- selected preview;
- no orders;
- no cases;
- no activity;
- no matches;
- no identifiers;
- access denied;
- expired view token;
- multiple currencies;
- evidence form loading;
- no eligible claim;
- prior match pending/likely/unlikely;
- submit validation;
- submit pending;
- submit failure; and
- submit outcome.

#### Primary owners

- app/(app)/customers/page.tsx
- app/(app)/customers/CustomersOverviewPageView.tsx
- app/(app)/customers/CustomersPageWorkbench.tsx
- app/(app)/customers/[id]/page.tsx
- app/(app)/customers/[id]/CustomerProfilePageView.tsx
- app/(app)/customers/[id]/CustomerProfilePageHero.tsx
- app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx
- components/customers/CustomerPreviewDrawer.tsx
- components/customers/CustomersFilterSheet.tsx
- app/(app)/customers/[id]/evidence/new/page.tsx
- components/evidence/EvidencePackageForm.tsx
- components/evidence/EvidencePackageFormFields.tsx
- components/evidence/EvidencePackageFormStates.tsx

### 6.7 Losses — financial attribution ledger

#### Final composition

1. DecisionHeader with net unrecovered condition.
2. One scope/filter line.
3. Open financial canvas joining value, trend, and ranked cause.
4. Loss registry.

#### Upgrades

- Combine cause and state scope in one control region.
- Put large cause sets in a searchable disclosure.
- Remove peer chart/card composition.
- Directly label trend, amount, period, and top causal contribution.
- Give every loss row one financial state, one cause, and one destination.
- On detail, lead with the auditable financial formula.
- Render attribution, recovery, evidence, source, and connected records as
  aligned ledger rows.
- Replace related-record buttons with directional relationship rows.
- State clearly when attribution is unknown rather than styling it as risk.

#### Required states

- no loss;
- mixed currencies;
- pending reconciliation;
- estimated/confirmed/prevented/recoverable/written-off;
- unknown cause;
- unknown owner;
- no trend;
- no linked records;
- source stale;
- action pending;
- write-off confirmation;
- loading/error/not found.

#### Primary owners

- app/(app)/losses/page.tsx
- app/(app)/losses/[id]/page.tsx
- components/losses/LossLedger.tsx
- components/losses/LossVisuals.tsx
- components/losses/LossActions.tsx

### 6.8 Recoveries — pursuit board and record

#### Board

- Let stages own status; remove coloured card rails.
- Reduce cards to identity, pursued/outstanding amount, next action, and
  deadline.
- Move evidence and partner context to one secondary line.
- Open rich context in an inspector or drawer.
- Keep board scroll local and preserve keyboard use.
- Empty columns remain quiet and structurally stable.

#### Detail

- Lead with outstanding amount, next action, and date.
- Make pursued, recovered, credited, and remaining value a FinancialEquation.
- Combine correspondence, tasks, and activity into one chronological record
  with filters.
- Attach SourceBeacon and evidence state to the action they qualify.
- Action dialogs show before/after financial consequence.
- Outcomes insert into the record rather than ending at a toast.

#### Required states

- every recovery stage;
- filtered board;
- no recoveries;
- empty column;
- selected item;
- unknown owner;
- mixed currency;
- incomplete evidence;
- correspondence required;
- action pending/error/success;
- permission;
- partner unavailable;
- write-off; and
- loading/error detail.

#### Primary owners

- app/(app)/recoveries/page.tsx
- app/(app)/recoveries/[id]/page.tsx
- app/(app)/recoveries/RecoveryBoardClient.tsx
- components/recoveries/*

### 6.9 Connected commerce and support records

Routes:

- orders/[id];
- disputes/[id];
- refunds/[id];
- returns/[id];
- shipments/[id]; and
- tickets/[id].

#### Shared dossier

Use one DetailPageShell but give each record type a distinct lead:

| Record | First-viewport lead |
|---|---|
| Order | amount, fulfilment state, item count |
| Dispute | disputed amount, deadline, dispute state |
| Refund | refunded amount, reason, case impact |
| Return | received state and disposition |
| Shipment | promised versus actual and exception |
| Ticket | unresolved customer request and conversation |

#### Upgrades

- Put source and freshness in the identity region or first source row.
- Remove duplicate terminal provenance insets.
- At 1280px and above, use lifecycle/conversation main plane plus an
  approximately 300px connected-record spine.
- Relationship rows show direction, match method, source, and freshness.
- Use neutral timeline geometry; violet does not decorate every event.
- Raise core facts from 12px metadata to readable operating text.
- Keep source links and missing values truthful.
- Add ConnectedObjectNotFound as an explicit visual owner.

#### Required states

- loading;
- error;
- not found where supported;
- permission;
- no facts;
- no items;
- no timeline;
- no evidence;
- no links;
- stale source;
- absent external URL;
- long IDs;
- deep-linked return path; and
- mixed currency.

#### Primary owners

- each route page and boundary;
- components/relationships/ConnectedObjectDetail.tsx;
- components/relationships/RelatedRecordsPanel.tsx;
- components/relationships/ConnectedObjectNotFound.tsx;
- CommerceObjectRouteSkeleton.tsx; and
- SupportObjectRouteSkeleton.tsx.

### 6.10 Rules, Flows, runs, and recovery rulebook

#### Registries

- Lead with a human-readable causal sentence.
- Show publication state, priority, and version as secondary aligned facts.
- Use the shared registry command bar and row actions.
- Do not wrap each rule or flow in a separate card.

#### Rule and flow workbenches

- Use one ordered BuilderShell document.
- Keep Test, Edit, Review changes, and Publish on one sticky command line.
- Render conditions as numbered editorial rows.
- Generate the same live causal sentence from the edited fields.
- Remove detached generic preview cards.
- Show draft changes inline as before → after.
- Keep version, simulation, validation, and publication state visible.

#### Flow runs

- Show steps as a causal trace with duration and state.
- Keep raw JSON in a deliberate code disclosure.
- Use the same SourceBeacon and Outcome Echo for external actions.

#### Recovery rulebook

- Use a partner/rule matrix with a selected-row inspector.
- Keep partner identity, eligibility, required evidence, deadline, and action
  aligned.
- Do not use a two-column card catalogue.

#### Required states

- zero rules/flows;
- filtered empty;
- draft/published/paused;
- invalid conditionless draft;
- simulation pending/pass/fail;
- test mismatch;
- unsaved changes;
- publish review;
- publish pending/conflict/success;
- version history;
- rollback available/blocked/pending/success;
- run queued/running/succeeded/failed/empty;
- raw detail disclosure;
- rule drawer validation/error; and
- recovery partner empty/edit.

#### Primary owners

- app/(app)/rules/page.tsx
- app/(app)/rules/[id]/page.tsx
- app/(app)/rules/recovery/page.tsx
- app/(app)/flows/page.tsx
- app/(app)/flows/[id]/page.tsx
- app/(app)/flows/runs/page.tsx
- app/(app)/flows/runs/[id]/page.tsx
- components/rules/RulesIndexClient.tsx
- components/rules/FlowsIndexClient.tsx
- components/rules/RuleVersionWorkbench.tsx
- components/rules/FlowVersionWorkbench.tsx
- components/rules/RuleBuilderDrawer.tsx
- components/rules/FlowEditor.tsx
- components/rules/RecoveryRulebookClient.tsx
- components/ui/BuilderShell.tsx

### 6.11 Reports and records

#### Job

Explain the financial and operational story, then expose the exact records
behind it.

#### Final composition

1. DecisionHeader and scope.
2. One FinancialEquation.
3. Three report chapters:
   - loss drivers;
   - recovery conversion;
   - operational backlog.
4. Definitions and methodology reference.
5. Records destination and export.

#### Upgrades

- Use one currency selector; do not repeat the whole report per currency.
- Give each chapter one focal visualisation.
- Add one interpretation sentence and one record destination per chapter.
- Flatten chart frames inside the report.
- Use direct labels where geometry permits.
- Keep comparison and unavailable states explicit.
- Remove decorative sparklines from metrics.
- Make records a canonical registry with consistent filters and export state.
- Give printed/exported output deliberate pagination, type, repeated headings,
  and no clipped charts.

#### Required states

- one/multiple currencies;
- no bridge/equation;
- reconciliation warning;
- missing dated values;
- comparison unavailable;
- empty causes;
- empty recoveries;
- empty backlog;
- export menu;
- export pending/error/success;
- records loading/error/filtered empty; and
- print layout.

#### Primary owners

- app/(app)/reports/page.tsx
- app/(app)/reports/records/page.tsx
- components/reporting/IntelligenceReportView.tsx
- components/reporting/DashboardCharts.tsx
- components/charts/authenticated/*
- components/reports/ExportMenu.tsx

### 6.12 Integrations, provider detail, account selection, and imports

#### Integrations workspace

- Group sources by evidence role: Commerce, Support, Fulfilment, Recovery, and
  Imports.
- Connected sources are dense rows with state, freshness, scope, and action.
- Provider catalogue uses comparison rows rather than cards.
- Collapse summary and alerts into one operating sentence plus ranked
  exceptions.
- Make every provider mark use SourceBeacon anatomy.

#### Provider detail

- Lead with provider identity and one connection sentence.
- Follow with source coverage ledger, state/freshness timeline, and ActionDock.
- Keep capability limitations visible.
- Connection, refresh, and disconnect outcomes appear in place.

#### ShipBob account selection

- Use one selection document with source identity, available accounts,
  consequences, pending, error, and recorded connection.
- Replace route-specific banners with the shared notice/outcome grammar.

#### Imports

- Use one continuous FormDocument.
- Add a sticky step rail or command dock.
- Mapping is a source-column → destination-field ledger.
- Validation is one conclusion plus issue table.
- Preserve file, mapping, validation, commit, and history truth.

#### Required states

- connected;
- degraded;
- stale;
- not syncing;
- pending;
- no data;
- unavailable;
- planned/beta/partial provider;
- empty filter;
- OAuth callback error;
- selection pending/error/success;
- unreadable file;
- unmapped fields;
- duplicate rows;
- validation warning/error;
- commit pending/failure/success;
- import history empty; and
- long provider/account names.

#### Primary owners

- app/(app)/integrations/page.tsx
- app/(app)/integrations/[provider]/page.tsx
- app/(app)/integrations/imports/page.tsx
- app/(app)/integrations/shipbob/select/page.tsx
- components/integrations/IntegrationsWorkspace.tsx
- components/integrations/ConnectionHealthPanel.tsx
- components/integrations/ConnectionActions.tsx
- components/integrations/ShipBobIntegrationBanner.tsx
- components/imports/CanonicalCsvImportClient.tsx
- components/settings/ConnectorSetupShell.tsx

### 6.13 Settings and administration

#### Canonical composition

Settings uses a 204px local index at 1280px and above. Each page is a
ConfigDocument:

- approximately 200px label/description column;
- flexible control column;
- 48–64px joined rows;
- clear section rules;
- natural input widths;
- no outer card;
- dirty-state ActionDock only when needed; and
- local Outcome Echo for save success.

At narrower widths, the index becomes grouped in-flow navigation. It does not
become a floating pill rail.

#### Route decisions

**Account**

- profile, appearance, security, danger;
- use one document;
- separate danger by space, consequence, and confirmation rather than a
  decorative danger card.

**Platform**

- plain configuration rows with anchor navigation;
- no equal option cards.

**Team**

- full-width member registry;
- invite action in the identity region;
- audit below as its own registry.

**Billing**

- plan and credit balance as one statement;
- invoices and transactions as rows;
- top-up in a modal;
- billing state banner uses the shared notice contract.

**Notifications**

- grouped switch rows;
- no icon intro panels;
- shared Switch with a 44px coarse-pointer target.

**Audit trail**

- full-width registry;
- inline filters;
- expandable source trace;
- stable long payload/actor treatment.

**Agreements**

- agreement library first;
- upload and term verification in a guided drawer;
- accepted outcome recorded in place.

**Data and privacy**

- textual data-flow sequence;
- export and erasure consequences explicit;
- destructive actions use staged confirmation.

**API integrations**

- key registry;
- once-only secret dialog;
- provider configuration subordinate;
- create/revoke outcomes local and durable.

**Connector settings**

- status first;
- host preview second where a real host surface exists;
- credentials last;
- one ConnectorSetupShell anatomy across Chrome, Shopify, Gorgias, Zendesk,
  and Freshdesk;
- Freshdesk preview must not imply an embedded brief.

#### Canonical form system

Build and adopt:

- FormField;
- Textarea;
- Switch;
- Checkbox;
- RadioGroup;
- read-only field;
- validation summary;
- inline error;
- field hint;
- character count;
- pending field;
- action row; and
- destructive confirmation.

Each uses deterministic IDs, described relationships, non-colour state cues,
stable async geometry, and coarse-pointer targets.

#### Required states

- pristine;
- dirty;
- validation;
- save pending;
- saved;
- conflict;
- read-only;
- destructive confirmation;
- no team members;
- no audit records;
- no agreements;
- no keys;
- revoked key;
- no invoices;
- invite pending/error/success;
- connector disconnected/degraded;
- webhook setup;
- secret-once modal; and
- long organisation/member/provider values.

#### Primary owners

- app/(app)/settings/layout.tsx
- app/(app)/settings/page.tsx
- every page under app/(app)/settings/*
- components/settings/SettingsNav.tsx
- components/settings/SettingsPageShell.tsx
- components/settings/AccountProfileSection.tsx
- components/settings/AccountPasswordSection.tsx
- components/settings/AccountDangerSection.tsx
- components/settings/AppearanceSettings.tsx
- components/settings/AgreementSettingsClient.tsx
- components/settings/ApiIntegrationsClient.tsx
- components/settings/AuditTrailClient.tsx
- components/billing/BillingSettingsClient.tsx
- components/settings/NotificationPreferencesForm.tsx
- components/settings/PlatformSettingsClient.tsx
- components/settings/TeamManagementClient.tsx
- components/settings/ChromeSetupClient.tsx
- components/settings/FreshdeskSupportSyncClient.tsx
- components/settings/GorgiasSupportSyncClient.tsx
- components/settings/ZendeskSupportSyncClient.tsx
- components/shopify/*

### 6.14 Notifications and Help

#### Notifications

- Remove or materially reduce the decorative 14-day mini chart.
- Use an open inbox ledger grouped by Today and Previous 7 days.
- Mark unread state at the row edge with text/state, not an icon tile.
- Keep destination and Mark all read compact.
- Insert local pending and outcome states without shifting row geometry.

States:

- no notifications;
- unread/read;
- grouped history;
- mark-all pending/error/success;
- long message;
- destination unavailable;
- loading; and
- route error.

#### Help

- Replace duplicated guide list plus full article bodies with a
  navigation/read-pane layout or controlled expanders.
- Search returns task destinations and highlighted matches.
- Deep links focus the relevant guide.
- Keep support contact as an unframed terminal action.

States:

- default;
- search results;
- no results;
- guide deep link;
- support action;
- loading; and
- route error.

#### Primary owners

- app/(app)/notifications/page.tsx
- components/notifications/NotificationCentre.tsx
- app/(app)/help/page.tsx
- components/help/HelpCentre.tsx

### 6.15 Landing page

#### Job

Prove, in the opening viewport, that Unauth assembles evidence around a payout
decision and keeps the merchant in control.

#### Final composition

- restrained public navigation;
- one decisive statement;
- one short supporting paragraph;
- primary and secondary action;
- a purpose-built evidence excerpt large enough to read;
- continuous source → recommendation → decision → recovery story;
- integrations as source rows;
- FAQ;
- final action; and
- quiet legal/footer index.

#### Upgrades

- Replace the generic scaled-full-screen hero with a purpose-built proof
  excerpt: case identity, value at issue, four source rows, named gap, and
  recommendation.
- Keep a full current product capture lower on the page at readable size.
- Introduce the split composition near 960px.
- At 768px and 390px, use semantic HTML proof or an art-directed crop; never
  shrink a desktop screenshot until it becomes texture.
- Recompose lower sections as one continuous evidence ledger rather than
  repeated copy/image bands.
- Turn steps and integrations into joined rows.
- Use full desktop navigation only near 1120px and above.
- Intermediate widths use a standard menu.
- Mobile menu is a joined below-header region, not a rounded floating glass
  card.
- Add Pricing to navigation and footer.
- Remove circular icon-within-button decoration.
- Keep FAQ/proof transitions purposeful and reduced-motion safe.
- Keep deterministic product proof and fictional-workspace disclosure.

#### Required states and widths

- 1440×900;
- 1280×800;
- 1024×900;
- 768×1024;
- 390×844;
- mobile menu closed/open;
- FAQ closed/open;
- long headline;
- missing proof image fallback;
- reduced motion;
- 200% zoom; and
- text spacing.

#### Primary owners

- app/(public)/landing/page.tsx
- app/(public)/landing/_components/foundation/*
- app/(public)/landing/_lib/foundationContent.ts
- public/product-proof/*

### 6.16 Pricing

#### Final composition

One continuous comparison ledger:

1. plan, price, credits, and CTA;
2. history;
3. stores/seats;
4. reporting;
5. exports;
6. top-ups;
7. API/bulk;
8. support;
9. credit-cost explanation;
10. FAQ;
11. final decision CTA and commercial qualifier.

#### Upgrades

- Remove four equal long cards.
- Keep all primary plan actions in the opening viewport.
- Highlight the recommended plan with a quiet selected column plane.
- Do not use a Recommended badge.
- Treat Enterprise as a distinct contact path while preserving comparison.
- Remove duplicated credit facts.
- Render the existing pricing FAQ.
- On mobile, use an accessible plan selection followed by the complete selected
  plan detail; do not stack four giant cards.
- Preserve every price, limit, feature, and destination.

#### Required states

- each plan selected;
- recommended plan;
- enterprise contact;
- long feature labels;
- mobile plan selection;
- FAQ open;
- CTA focus/pending where applicable; and
- pricing data mismatch guard.

#### Primary owners

- app/(public)/pricing/page.tsx
- FoundationPricingTiers.tsx
- FoundationPricingCredits.tsx
- lib/billing/landingTierChart.ts

### 6.17 Authentication, signup, and reset

#### Final composition

Keep the split entry surface, but rebalance it:

- concise evidence trace and one decisive sentence on the context plane;
- form identity aligned to the context focal point;
- one open FormDocument;
- stable status/outcome region; and
- compact mobile evidence reassurance.

#### Upgrades

- Shorten the repeated context statement for each task while preserving
  meaning.
- Raise form title hierarchy to 24–28px.
- Align the first field to the main context focal point instead of generic
  vertical centre.
- Remove vestigial Panel framing.
- Use one field/error rhythm without empty error-slot spacing.
- Give loading, validation, pending, service error, success, and workspace
  bootstrap failure identical geometry.
- Keep a compact evidence reassurance beneath the logo on mobile.
- Make reset success a RecordedOutcome with destination.
- Show password requirements before failure.
- Preserve autocomplete, password-manager, redirect, validation, and mutation
  behaviour.

#### Required states

- login initial/loading/invalid/service error/submitting;
- signup initial/per-field errors/submitting/bootstrap failure;
- reset request initial/invalid/service error/sending/sent;
- reset update initial/requirements/mismatch/weak/service error/submitting;
- long email;
- autofill;
- 390/768/1024/1440;
- 200% zoom; and
- reduced motion.

#### Primary owners

- app/(auth)/AuthShell.tsx
- app/(auth)/AuthShell.module.css
- app/(auth)/login/page.tsx
- app/(auth)/reset/page.tsx
- app/(auth)/reset/update/page.tsx
- app/(public)/signup/page.tsx

### 6.18 Onboarding

#### Final composition

- one setup ledger;
- current task document;
- one stage indication;
- one ActionDock;
- final readiness ledger.

#### Upgrades

- Remove the redundant global progress bar.
- Keep one left commissioning rail on wide screens.
- Use a 560–640px open task column, not a large generic card.
- Put required profile basics first.
- Move contextual operating questions into a joined secondary disclosure.
- Provider stages show identity, capability unlocked, current state, data use,
  and one action.
- Completion lists actual commerce connection, support ingestion, and
  available embed truth.
- Freshdesk is described as ingestion/sync only.
- At mobile, show current stage plus n of 4 and put the full ledger in a
  disclosure after the task.
- Loading and error preserve exact task geometry.

#### Required states

- loading;
- route error;
- profile blank/prefilled;
- validation;
- saving;
- Shopify disconnected/OAuth failure/connected/continuing;
- helpdesk disconnected;
- Gorgias/Zendesk/Freshdesk connected;
- verification pending/failure/success;
- skip path;
- disabled future step;
- complete; and
- 320 through 1440px.

#### Primary owners

- app/onboarding/page.tsx
- app/onboarding/layout.tsx
- app/onboarding/loading.tsx
- app/onboarding/error.tsx
- components/OnboardingClient.tsx

### 6.19 Public demo

#### Final composition

An interactive evidence theatre:

- compact case identity and fictional/read-only boundary;
- labelled stage index;
- one open case ledger;
- stage-specific dominant object;
- in-flow action dock;
- recorded outcome.

#### Upgrades

- Replace five segmented bars with labelled text navigation and one current
  marker.
- Remove bordered mini-app plus detached explanation rail.
- Keep merchant-control truth in one persistent sentence.
- Let source rows, recommendation, choice rows, or outcome own each step.
- Reuse the anatomy of SourceTraceRow, DecisionSentence, and RecordedOutcome
  without importing authenticated shell chrome.
- Remove 2px semantic side rails and whole-area status slabs.
- Keep arbitrary step selection, query deep link, back, next, restart, and
  simulated decision truth.
- At mobile, make the stage rail horizontally scrollable and labelled.

#### Required states

- incoming;
- evidence;
- recommendation;
- decision unselected/selected;
- recovery with/without prior decision;
- deep-linked step;
- restart;
- reduced motion;
- narrow stage rail; and
- long evidence row.

#### Primary owners

- app/(public)/demo/page.tsx
- components/demo/OperationalCaseDemo.tsx
- lib/demo/merchantCaseV1.ts

### 6.20 Legal and long-form reading

#### Final composition

- brand and Legal identity;
- compact document index;
- readable article measure;
- sticky section index on wide screens;
- in-flow disclosure on mobile;
- related documents; and
- print-authority layout.

#### Upgrades

- Simplify header to brand, Legal, document index, and Sign in.
- Use a horizontal document rail on tablet.
- Use an On this page disclosure on mobile.
- Tighten document offset and adapt it to document length.
- Replace the DPA violet side rule with a neutral procurement note.
- Scope the cool-neutral tokens explicitly.
- Keep all copy, anchors, links, and print semantics unchanged.

#### Required states

- data handling;
- DPA and countersign note;
- pilot terms;
- privacy;
- document not found;
- long TOC;
- mobile wrapped title;
- keyboard anchors;
- print; and
- 200% zoom.

#### Primary owners

- app/(public)/legal/data-handling/page.tsx
- app/(public)/legal/dpa/page.tsx
- app/(public)/legal/pilot-terms/page.tsx
- app/(public)/legal/privacy/page.tsx
- app/(public)/legal/not-found.tsx
- components/public/LegalHeader.tsx
- components/public/LegalDocument.tsx

### 6.21 Development routes and prototype archive

#### Design system

Use the final gallery contract in section 5.5.

#### Integration preview

Reuse final integration rows, setup states, and provider detail anatomy.
Remove old AuthenticatedPanel wrappers around each scenario.

#### Case prototype lab

The three directions are archived research, not production authority.

- Preserve the route and picker.
- Label Incident Desk, Signal Trace, and Safelight as archived explorations.
- Restyle only the lab chrome as a neutral internal tool.
- Exclude all variants from public product proof.
- Do not port their isolated CSS into production.
- Verify basic keyboard, responsive, reduced-motion, and forced-colours
  operation.
- Do not spend final production time polishing discarded directions.

The 3,528-line prototype stylesheet must be isolated from all production
imports. Its existence must not weaken production design gates.

### 6.22 Public and global failure surfaces

- Public 404 and error surfaces use public identity, not authenticated
  EmptyState composition.
- Use one primary recovery path.
- Global error remains dependency-light but uses final type, radius, focus, and
  mono decisions.
- Remove stale SFMono and old radius literals.
- Preserve diagnostic/retry behaviour.
- Static public pages do not need ornamental skeletons.

Owners:

- app/not-found.tsx
- app/global-error.tsx
- app/(app)/not-found.tsx
- components/states/OperationalRouteError.tsx
- components/ui/EmptyState.tsx

### 6.23 Pocket Brief — shared embedded specification

Pocket Brief is a compact evidence summary, not a miniature dashboard.

At 300–360px it contains:

1. compact Unauth/source header;
2. one decisive sentence;
3. match or case basis;
4. three to five joined evidence rows;
5. one primary route/action;
6. quiet secondary actions;
7. availability, locked, or error state; and
8. no nested card frame.

Hard rules:

- decisive state begins within the first 120px;
- 13px body minimum;
- 38px primary control minimum;
- no horizontal scroll;
- no emoji;
- no uppercase status shouting;
- no whole-card semantic fills;
- no dashboard sidebar or KPI anatomy;
- long identifiers use overflow-wrap:anywhere;
- focus, reduced motion, forced colours, 1.35× text, and short host frames are
  supported; and
- host-owned native components are shaped through hierarchy and content rather
  than pretending their styling can be overridden.

### 6.24 Chrome popup

#### Upgrades

- First 120px: compact brand/connection row, sentence-case finding, and match
  basis.
- Restrict semantic colour to a mark and state label.
- Show payout history and evidence availability as joined rows.
- Keep one primary action.
- Make report generation and new lookup secondary text actions.
- Expand evidence generation inline without a new card perimeter.
- Replace pulsing-logo loading with content-shaped rows.
- Isolate Disconnect as the destructive final row.
- Replace SF Mono with the canonical mono stack.
- Give Settings and error screens clear identity.
- Rebuild extensions/chrome/dist only after source approval.

#### Required states

- bootstrap;
- API-key setup/saving/error;
- lookup collapsed/expanded;
- lookup loading/failure;
- definite/probable/possible/weak match;
- CE 3.0 absent/present;
- evidence closed/open/generating/error/success;
- settings/update/disconnect/back/new lookup;
- long email/order;
- 1.35× text;
- short host;
- forced colours; and
- reduced motion.

#### Primary owners

- extensions/chrome/popup/PopupApp.tsx
- every Popup*Screen.tsx
- extensions/chrome/popup/popup.css
- extensions/chrome/content/content.ts
- generated extension assets after approval only

### 6.25 Zendesk sidebar

#### Upgrades

- Use one white Pocket Brief with compact Unauth header.
- Lead with a sentence-case identity finding and source line.
- Render store history, claims, network availability, and evidence as trace
  rows.
- Restrict semantic fill to the state mark.
- Replace emoji with accessible SVG or CSS marks.
- Keep Open full profile primary.
- Make report generation secondary.
- Add focus-visible, reduced-motion, and forced-colours rules.
- Rename the host-visible app identity to “Unauth — Case Context.”
- Repackage the downloadable archive only after approval.

#### Required states

- loading;
- missing/invalid key;
- missing requester email;
- plan gate;
- rate limit;
- server/general error;
- no profile;
- clean/low-clear context;
- definite/probable/possible/weak match;
- store/network/prior claims;
- CE 3.0 available/unavailable;
- PDF disabled/generating/failure/success; and
- short/tall host.

#### Primary owners

- extensions/zendesk/assets/iframe.html
- extensions/zendesk/manifest.json
- public/downloads/unauth-zendesk-app.zip after approval

### 6.26 Gorgias native widget, preview, and unlock receipt

#### Native widget

Gorgias owns styling. Optimise hierarchy, row order, label length, and action:

1. customer action;
2. missing evidence;
3. responsibility;
4. recovery;
5. why.

- Remove duplicated prefixes from values.
- Keep each value to one decisive sentence at 300px.
- Make Open full case the dominant link.
- Keep store check and case report secondary.

#### HTML preview

- Rebuild it to match the actual native five-row contract.
- Remove the legacy three-column Store/Network table.
- Use the same state fixtures as the native payload.

#### Unlock page

- Use a compact receipt composition.
- Put title and scope first.
- Put context rows second.
- Put credit consequence last.
- Violet is not used for noninteractive credit metadata.
- Return to ticket is primary.
- Use 16px padding below 480px.

#### Required states

- active;
- no case;
- unavailable facts;
- partial;
- disconnected;
- locked;
- error;
- basic/full/evidence unlock;
- network context;
- paused network;
- insufficient credits;
- plan gate;
- no matching context;
- ticket/order/claim scope; and
- return-to-ticket/close-tab.

#### Primary owners

- lib/support/gorgias/registerSidebarWidget.ts
- lib/gorgias/widgetJson.ts
- lib/gorgias/renderWidgetHtml.ts
- lib/gorgias/renderWidgetUnlockHtml.ts

### 6.27 Freshdesk and Shopify checkout truth

- Freshdesk has connection, webhook, backfill, and ingestion settings only.
  There is no Freshdesk embedded sidebar. Do not design or imply one.
- The Shopify checkout extension currently returns null and intentionally has
  no visible UI. Do not fabricate a checkout surface for coverage.
- Correct the coverage ledger so the zero-UI checkout implementation is
  recorded as an explicit no-visual contract rather than “visible checkout
  states.”
- Any future visible implementation must enter the inventory before release.

---

## 7. Exhaustive route and owner map

### 7.1 Phase key

| Phase | Ownership |
|---|---|
| IG-00 | authority, discovery, manifest, baseline |
| IG-01 | tokens, typography, layout, forms, surfaces, charts |
| IG-02 | shell, navigation, overlays, state primitives, gallery |
| IG-03 | dashboard and work |
| IG-04 | cases registry and case detail |
| IG-05 | customers, evidence creation, losses, recoveries |
| IG-06 | connected commerce and support records |
| IG-07 | rules, flows, runs, recovery rulebook |
| IG-08 | reports, records, export, print |
| IG-09 | integrations, providers, imports, source setup |
| IG-10 | settings and administration |
| IG-11 | notifications, help, global boundaries |
| IG-12 | landing, pricing, demo, legal, public failures, prototype archive |
| IG-13 | login, signup, reset, onboarding |
| IG-14 | Chrome, Zendesk, Gorgias, embedded truth |
| IG-15 | responsive, zoom, theme, a11y, long-content sweep |
| IG-16 | hard cutover, deletion, capture, final sign-off |

### 7.2 All 65 page modules

| Page module | Phase | Visual contract |
|---|---|---|
| app/(app)/claims/[id]/page.tsx | IG-04 | decision dossier |
| app/(app)/claims/page.tsx | IG-04 | case registry |
| app/(app)/customers/[id]/claims/page.tsx | IG-05 | redirect continuity only |
| app/(app)/customers/[id]/evidence/new/page.tsx | IG-05 | evidence FormDocument |
| app/(app)/customers/[id]/page.tsx | IG-05 | customer dossier |
| app/(app)/customers/page.tsx | IG-05 | customer registry |
| app/(app)/dashboard/page.tsx | IG-03 | financial position instrument |
| app/(app)/dev/design-system/page.tsx | IG-02 | visual release laboratory |
| app/(app)/disputes/[id]/page.tsx | IG-06 | dispute dossier |
| app/(app)/exceptions/page.tsx | IG-03 | redirect continuity to Work |
| app/(app)/flows/[id]/page.tsx | IG-07 | flow workbench |
| app/(app)/flows/page.tsx | IG-07 | flow registry |
| app/(app)/flows/runs/[id]/page.tsx | IG-07 | run trace |
| app/(app)/flows/runs/page.tsx | IG-07 | run registry |
| app/(app)/help/page.tsx | IG-11 | help navigation/read pane |
| app/(app)/integrations/[provider]/page.tsx | IG-09 | source dossier |
| app/(app)/integrations/dev-preview/page.tsx | IG-02 | integration state laboratory |
| app/(app)/integrations/imports/page.tsx | IG-09 | import document |
| app/(app)/integrations/page.tsx | IG-09 | source connection ledger |
| app/(app)/integrations/shipbob/select/page.tsx | IG-09 | account selection document |
| app/(app)/losses/[id]/page.tsx | IG-05 | financial attribution dossier |
| app/(app)/losses/page.tsx | IG-05 | loss ledger |
| app/(app)/notifications/page.tsx | IG-11 | notification ledger |
| app/(app)/orders/[id]/page.tsx | IG-06 | order dossier |
| app/(app)/recoveries/[id]/page.tsx | IG-05 | recovery record |
| app/(app)/recoveries/page.tsx | IG-05 | recovery board |
| app/(app)/refunds/[id]/page.tsx | IG-06 | refund dossier |
| app/(app)/reports/page.tsx | IG-08 | financial report |
| app/(app)/reports/records/page.tsx | IG-08 | report records registry |
| app/(app)/returns/[id]/page.tsx | IG-06 | return dossier |
| app/(app)/rules/[id]/page.tsx | IG-07 | rule workbench |
| app/(app)/rules/page.tsx | IG-07 | rule registry |
| app/(app)/rules/recovery/page.tsx | IG-07 | recovery rulebook |
| app/(app)/settings/account/page.tsx | IG-10 | account ConfigDocument |
| app/(app)/settings/agreements/page.tsx | IG-10 | agreement library |
| app/(app)/settings/api-integrations/page.tsx | IG-10 | API/key registry |
| app/(app)/settings/audit-trail/page.tsx | IG-10 | audit registry |
| app/(app)/settings/billing/page.tsx | IG-10 | billing statement |
| app/(app)/settings/data-privacy/page.tsx | IG-10 | data/privacy document |
| app/(app)/settings/integrations/chrome/page.tsx | IG-10 | Chrome setup |
| app/(app)/settings/integrations/freshdesk/page.tsx | IG-10 | Freshdesk ingestion setup |
| app/(app)/settings/integrations/gorgias/page.tsx | IG-10 | Gorgias setup |
| app/(app)/settings/integrations/shopify/page.tsx | IG-10 | Shopify setup |
| app/(app)/settings/integrations/zendesk/page.tsx | IG-10 | Zendesk setup |
| app/(app)/settings/notifications/page.tsx | IG-10 | notification preferences |
| app/(app)/settings/page.tsx | IG-10 | redirect continuity to Account |
| app/(app)/settings/platform/page.tsx | IG-10 | platform ConfigDocument |
| app/(app)/settings/team/page.tsx | IG-10 | team registry |
| app/(app)/shipments/[id]/page.tsx | IG-06 | shipment dossier |
| app/(app)/tickets/[id]/page.tsx | IG-06 | ticket conversation dossier |
| app/(app)/work/page.tsx | IG-03 | decision registry |
| app/(auth)/login/page.tsx | IG-13 | sign-in FormDocument |
| app/(auth)/reset/page.tsx | IG-13 | reset request/outcome |
| app/(auth)/reset/update/page.tsx | IG-13 | password update |
| app/(public)/demo/page.tsx | IG-12 | interactive evidence theatre |
| app/(public)/landing/page.tsx | IG-12 | public evidence story |
| app/(public)/landing/prototypes/unauth-case-detail/page.tsx | IG-12 | archived research lab |
| app/(public)/legal/data-handling/page.tsx | IG-12 | legal document |
| app/(public)/legal/dpa/page.tsx | IG-12 | legal document |
| app/(public)/legal/pilot-terms/page.tsx | IG-12 | legal document |
| app/(public)/legal/privacy/page.tsx | IG-12 | legal document |
| app/(public)/pricing/page.tsx | IG-12 | pricing comparison ledger |
| app/(public)/signup/page.tsx | IG-13 | signup FormDocument |
| app/onboarding/page.tsx | IG-13 | source commissioning |
| app/page.tsx | IG-12 | root public destination |

Redirect-only pages preserve query strings, hashes, selected objects, and
return destinations. They do not receive fake standalone designs.

### 7.3 All layout modules

| Layout | Phase | Contract |
|---|---|---|
| app/layout.tsx | IG-01 | font, theme, capture, global layer authority |
| app/(app)/layout.tsx | IG-02 | authenticated shell |
| app/(app)/settings/layout.tsx | IG-10 | local settings index |
| app/(auth)/layout.tsx | IG-13 | entry mode |
| app/(internal)/layout.tsx | IG-02 | explicit visual pass-through |
| app/(public)/layout.tsx | IG-12 | editorial mode |
| app/onboarding/layout.tsx | IG-13 | commissioning mode |

### 7.4 Route-state boundaries

All 95 boundary modules listed in
APPX_whole_product_visual_coverage_ledger.md remain individually required. They
inherit the phase of their owning route family and the geometry of its final
dominant object.

| Boundary family | Phase | Required geometry |
|---|---|---|
| claims and claim detail | IG-04 | registry or dossier |
| customers and evidence creation | IG-05 | registry, dossier, or form |
| dashboard | IG-03 | analytical instrument |
| disputes/orders/refunds/returns/shipments/tickets | IG-06 | typed dossier |
| losses and recoveries | IG-05 | ledger, board, or dossier |
| rules, flows, and runs | IG-07 | registry, builder, or trace |
| reports and records | IG-08 | report or registry |
| integrations, provider, imports, ShipBob | IG-09 | source dossier or form |
| every settings route | IG-10 | ConfigDocument |
| notifications and help | IG-11 | ledger or read pane |
| onboarding | IG-13 | commissioning document |
| public legal not found | IG-12 | public reading failure |
| authenticated app loading/not found | IG-11 | shell-preserving state |
| root global error/not found | IG-11 / IG-12 | context-appropriate recovery |

Boundary rules:

- loading reserves the final identity, scope, dominant object, and action
  geometry;
- an error says what remains known and confirms that no business action was
  recorded when that is true;
- not found is visually distinct from permission denied;
- a disconnected source is not a generic error;
- a stale value remains visible with its safe-through boundary;
- retry does not replace the route destination;
- skeletons do not use retired card geometry; and
- no state collapses into a centred blank card when useful context can remain.

### 7.5 Named nested views and overlays

The 53 named owners in the canonical ledger are mandatory. Their final
grouping is:

| Group | Owners | Phase |
|---|---|---|
| Case registry/detail | ClaimsPageView, CaseContextDrawer, ClaimReviewPanel, ClaimReviewToast, GateRecommendationPanel, IntegrationEvidenceSourcePanel | IG-04 |
| Investigations | InvestigationRequestDialog, InvestigationResponseDialog | IG-04 |
| Customers | CustomersOverviewPageView, CustomerProfilePageView, CustomerPreviewDrawer | IG-05 |
| Financial/reporting | IntelligenceReportView, ExportMenu, ChartTooltip | IG-08 |
| Connections | ConnectionHealthPanel, Shopify connection modal/views | IG-09 / IG-10 |
| Rules/builders | RuleBuilderDrawer | IG-07 |
| Settings | API key dialogs, webhook setup panels, team invite | IG-10 |
| Shell | AvatarMenu, command palette and its internal modes | IG-02 |
| Shared states | OperationalRouteError, OperationalRouteSkeleton, EmptyState, LoadingSkeleton, LoadingState | IG-02 |
| Shared overlays | Modal, Drawer, RowActionsMenu, Tooltip, Toast | IG-02 |
| Work | ExceptionResolutionDrawer | IG-03 |
| Connected records | related records and route skeletons | IG-06 |
| Chrome popup | all seven Popup screens | IG-14 |

The exact file list in the coverage ledger is normative. IG-00 adds the newly
discovered owners before implementation begins.

### 7.6 Stateful owners

Every conditional branch of these existing owners must be verified:

- ClaimsQueueClient;
- CustomersPageWorkbench;
- DesignSystemGalleryClient;
- ShipBobAccountSelectionClient;
- RecoveryBoardClient;
- OnboardingClient;
- DashboardOverview;
- OperationalCaseDemo;
- IntegrationsWorkspace;
- LossLedger;
- FlowVersionWorkbench;
- FlowsIndexClient;
- RecoveryRulebookClient;
- RuleVersionWorkbench;
- RulesIndexClient;
- SyncStatusCard;
- WorkQueue;
- CaseInvestigationsCard;
- ResponsibilityAssessmentCard;
- CommandPalette; and
- Chrome PopupApp.

Add these stateful owners to the discovered inventory:

- AgreementSettingsClient;
- BillingSettingsClient;
- NotificationPreferencesForm;
- PlatformSettingsClient;
- TeamManagementClient;
- AuditTrailClient;
- ApiIntegrationsClient;
- ChromeSetupClient;
- FreshdeskSupportSyncClient;
- GorgiasSupportSyncClient;
- ZendeskSupportSyncClient;
- EvidencePackageForm;
- HelpCentre;
- PageConnectionGate;
- FeatureGate;
- LockedFeaturePreview;
- UpgradeCard;
- WorkspaceSwitcher;
- MerchantEnvChip;
- ContextCreditsBadge; and
- FeatureTierBadge.

### 7.7 Embedded contracts

| Owner | Final visual status |
|---|---|
| extensions/chrome/popup and content | visible Pocket Brief; full state matrix |
| extensions/zendesk/assets/iframe.html | visible Pocket Brief; full state matrix |
| lib/gorgias/renderWidgetHtml.ts | visible preview; must match native widget |
| lib/gorgias/renderWidgetUnlockHtml.ts | visible unlock receipt |
| lib/support/gorgias native payload | host-owned visual hierarchy; fixture proof |
| extensions/unauth-checkout/src/index.jsx | explicit zero-UI contract |
| Freshdesk | ingestion/setup only; no invented embedded surface |

---

## 8. Universal state matrix

### 8.1 Every applicable surface must define

| State | Required presentation |
|---|---|
| Initial | complete hierarchy, no placeholder ambiguity |
| Loading | geometry-matched, labelled, no fake values |
| Slow loading | same geometry plus clear delayed feedback |
| Empty first-run | what this area becomes, exact setup action |
| Empty legitimate | quiet confirmation that no records match the domain |
| Filtered empty | active constraints and one clear reset |
| Zero | valid recorded zero, visually distinct from unavailable |
| Partial | values shown with missing scope named |
| Stale | last valid value and safe-through timestamp |
| Disconnected | exact source and reconnection destination |
| Unavailable | no invented zero or implied failure |
| Permission denied | identity preserved, access requirement named |
| Entitlement locked | value of feature, plan requirement, existing data truth |
| Pending mutation | stable layout, local progress, action disabled correctly |
| Validation error | field-level and summary path where needed |
| Conflict | current and attempted state, recovery choice |
| Success | local RecordedOutcome, optional secondary toast |
| Failure | preserved inputs/context, retry, no false recorded state |
| Destructive | consequence, scope, confirmation, recovery limits |
| Not found | missing object, preserved shell/context, next destination |
| Long content | 30% longer labels, names, IDs, and translated-like strings |
| Dense content | maximum rows, columns, sources, notes, and events |
| Dark | authored contrast and hierarchy |
| Forced colours | shape/text differentiation and visible focus |
| Reduced motion | immediate non-spatial feedback |
| 200% zoom | task remains operable and content reflows |
| Text spacing | no clipping or overlapping |

### 8.2 State visual grammar

- Known and healthy: normal ink, no celebratory fill.
- Current selection: violet plus text/structure.
- Success: green mark and sentence; the whole work surface does not turn green.
- Warning: amber mark, exact consequence, and recovery.
- Critical: red mark, exact failure, and recovery.
- Unknown: neutral, never amber by default.
- Locked: neutral boundary with plan/permission destination, not a seductive
  blurred preview.
- Loading: neutral skeleton and text.
- Recorded: ink-led outcome with actor and timestamp.

### 8.3 Forms

Every form state must reserve its final height. Saving may alter control state,
but must not cause the page to jump. Disabled content cannot be communicated by
opacity alone. Required, optional, hint, error, read-only, pending, and saved
states share one FormField structure.

### 8.4 Tables and registries

Test:

- sticky header;
- sort focus;
- first and last row action menus;
- horizontal scroll affordance;
- pagination;
- bulk mode;
- compact and rich density;
- long identity;
- selected row;
- partial row;
- stale row;
- empty;
- filtered empty;
- loading;
- error;
- 200% zoom; and
- keyboard-only traversal.

### 8.5 Boards

Test:

- every stage;
- empty column;
- long card;
- selected/dragged/focused item;
- keyboard movement where supported;
- local horizontal scroll;
- inspector;
- narrow desktop; and
- no page-level overflow.

### 8.6 Charts

Every chart must have:

- a question-led title;
- visible period/scope;
- exact value access;
- direct label where geometry permits;
- meaningful default reading;
- keyboard entry and efficient bucket movement;
- text or table equivalent;
- unavailable and partial states;
- truthful currency handling;
- forced-colour differentiation by dash/shape/pattern/text;
- reduced-motion state;
- no duplicate accessibility announcements; and
- no decorative sparkline or waffle variant.

### 8.7 Overlays

Test:

- trigger;
- initial focus;
- keyboard containment;
- Escape;
- close button;
- backdrop/outside click where appropriate;
- background inertness;
- scroll lock;
- focus restoration;
- nested topmost handling;
- long content;
- validation;
- pending;
- error;
- success;
- viewport collision;
- 1024px;
- 200% zoom;
- reduced motion; and
- forced colours.

---

## 9. Responsive, zoom, theme, and host behaviour

### 9.1 Authenticated desktop

#### 1440px and above

- expanded 200px navigation by default;
- full 12-column work grid;
- inspectors may remain beside the dominant object;
- ActionDock may be sticky within its owner;
- the first viewport must contain page identity, scope, dominant object, and
  first meaningful next action.

#### 1280–1439px

- preserve the dominant object, not every secondary column;
- inspectors narrow toward 288px;
- secondary descriptions shorten visually through measure, not copy deletion;
- dashboard shows the focal chart and at least two attention rows;
- report shows its first chapter;
- case shows its decision summary and action context.

#### 1024–1279px

- use the fixed 56px compact navigation rail;
- use 20px page gutters;
- no hover expansion that changes layout width;
- inspectors move below or into a drawer;
- action context follows identity before secondary detail;
- boards and wide tables scroll inside their owner;
- sticky elements may not consume more than 25% of viewport height;
- at least one useful registry row or action remains in the first viewport; and
- no page-level horizontal overflow.

### 9.2 Accessibility reflow and true zoom

The current “hide below 1024 CSS pixels” behaviour conflicts with a real 200%
zoom requirement. A 1280px or 1440px desktop can fall below that CSS width when
zoomed, causing the task UI to be replaced by DesktopRequiredBoundary.

Final decision:

- Unauth remains designed and supported primarily for desktop hardware.
- Browser zoom or text scaling may not replace an active task with a blocking
  boundary.
- Critical authenticated paths receive an accessibility reflow composition.
- The blocking boundary may be shown only for a genuinely small device context
  and must not be inferred from CSS width alone.
- If reliable distinction is unavailable, usability wins: render the reflowed
  task with an advisory rather than block it.
- No browser or user-agent sniffing is allowed.
- At 200% zoom, navigation becomes an accessible menu/rail, inspectors stack,
  tables use local scroll or priority-column composition, and actions remain
  reachable.
- Tests must exercise actual browser zoom or equivalent device-scale/text-scale
  behaviour, not merely set a 1024px viewport.

### 9.3 Public and entry

Required widths:

- 1440×900;
- 1280×800;
- 1024×900;
- 768×1024; and
- 390×844.

Rules:

- product proof remains readable;
- navigation changes before it crowds;
- display type scales fluidly;
- actions do not wrap into ambiguous clusters;
- forms remain 420–520px where possible;
- no decorative empty column survives after split collapse;
- mobile keeps product reassurance;
- legal navigation becomes disclosure; and
- pricing uses selected-plan detail, not four stacked desktop cards.

### 9.4 Pocket Brief

Required host tests:

- exactly 360px Chrome popup;
- 300px, 320px, and 360px helpdesk widths;
- short and tall host frames;
- internal vertical scroll;
- 1.35× text;
- long identifier and email;
- missing logo;
- no data;
- locked;
- disconnected;
- error;
- pending;
- success;
- forced colours; and
- reduced motion.

No host surface may scroll horizontally.

### 9.5 Dark mode

- Authenticated product receives full authored dark mode.
- Public pages are either deliberately light-only with a declared colour
  scheme or fully authored in dark. Accidental inherited dark tokens are not
  acceptable.
- Auth, onboarding, demo, and Pocket Brief follow their declared mode
  consistently.
- Dark warning regions stay compact and do not become muddy brown slabs.
- Charts preserve comparison and selection without neon.
- Disabled text never carries required information.

### 9.6 Forced colours

Explicit recipes are required for:

- EvidenceThread nodes and interruptions;
- FinancialEquation operators;
- selected navigation and rows;
- source-health marks;
- semantic panels;
- custom CSS and Recharts series;
- skeletons;
- focus rings;
- overlays;
- Chrome;
- Zendesk; and
- Gorgias preview/unlock.

Series and states remain distinguishable through dash, shape, pattern, label,
or position when colour is overridden.

### 9.7 Reduced motion

Global motion reduction must not turn every pending indicator into an
unrecognisable static object. Every pending state retains visible text and
aria-busy. Spatial animation is removed; state feedback remains immediate.

---

## 10. Implementation architecture and cleanup

### 10.1 One active authority

IG-00 updates:

- DESIGN.md;
- .impeccable/design.json through the documented Impeccable workflow;
- .codex/rules/authenticated-product.md;
- .cursor/rules/authenticated-design-system.mdc;
- CLAUDE.md;
- styles/authenticated/README.md;
- styles/authenticated/contracts.ts;
- app/(app)/layout.tsx data-ui-version;
- package scripts and verification names; and
- prior visual implementation docs with a clear superseded banner.

The final authority names:

- product direction: Decision Ledger — Instrument Grade;
- surface modes: Operational, Editorial, Entry, Pocket Brief;
- authenticated shell: 200/56/52;
- settings index: 204px wide;
- authenticated geometry: 8/12/16;
- type floor: 12px;
- maximum content frame: 1600px.

Historical visual names are removed from active code and comments:

- Apple-quality;
- Living Precision;
- Quiet Evidence Desk;
- Evidence Spine as current authority;
- Amplitude Core; and
- competitor redesign references.

### 10.2 Token layers

Keep a deliberate split:

- Product profile for authenticated Operational mode;
- Entry/Pocket profile for auth, onboarding, and embeds where compact geometry
  is intentional;
- Editorial profile for public reading and proof.

Do not define a base set and then silently override the same roles later in the
same scope. Each profile must be explicit, documented, and testable.

### 10.3 Surface convergence

Target grammar:

- Surface as the low-level base;
- RegistrySurface;
- JoinedSection;
- InsetGroup;
- overlay surface;
- no independent visual semantics for Card, Panel, SectionCard, or
  AuthenticatedPanel.

Migration rule:

1. map all consumers;
2. move valid layout responsibilities into the named composition;
3. migrate route family;
4. remove exports;
5. delete obsolete style rules; and
6. fail the design gate if the old import returns.

### 10.4 Header and tab convergence

- Fold useful DecisionHeader roles into one canonical page-header contract.
- Dashboard may not keep a second independent header geometry.
- Keep one underline navigation for route/section destinations.
- SegmentedControl is limited to true mutually exclusive view modes.
- FilterChip is temporary filter state only.
- A chip may not act as durable navigation.

### 10.5 Form convergence

Raw authenticated input, select, textarea, checkbox, switch, radio, validation,
and action-row styling is migrated to the canonical form system. Native
controls remain native where useful; visual and accessibility ownership moves
to shared primitives.

Fix the current focus-ring mismatch in Input and Select. The violet focus
contract must not rely on passing a multi-shadow token into a colour utility.

### 10.6 Table and menu convergence

- DataTable remains canonical.
- Registry rows that require custom composition still use its semantic and
  density contracts.
- Menus portal to the overlay root and use collision/flip logic.
- Local table overflow exposes a visible scroll affordance.
- Work and other long registries use sticky headers where the scroll owner is
  unambiguous.
- No selected row relies on a 2px coloured side border alone.

### 10.7 State and skeleton convergence

Consolidate:

- LoadingSkeleton;
- navigation skeleton primitives;
- pageSkeletons;
- OperationalRouteSkeleton; and
- AuthenticatedChartSkeleton

into one tokenised family-geometry map.

Remove obsolete chart skeleton variants, including matrix and decorative
sparkline forms. Skeleton dimensions derive from the same shell and component
variables as final content.

### 10.8 Chart convergence

Retain:

- ChartFrame;
- ChartDataTableDisclosure;
- ranked contribution;
- necessary Cartesian primitives;
- accessible motion and theme hooks.

Retire after consumer proof:

- ChartPanel compatibility shim;
- WaffleMatrixChart;
- decorative SparkTrend;
- unused BlockRail, SegmentComposition, MetricRail, MetricTabs,
  CompositionDonut, and AnalyticsDonut variants; and
- obsolete skeleton shapes.

No chart API is removed until consumer inventory proves it unused.

### 10.9 Overlay convergence

- Portal all transient layers.
- Add central overlay ordering.
- Make the background inert for modal states.
- Remove backdrop blur.
- Remove persistent route transforms.
- Keep one tokenised z-index system.
- Make menus/tooltips collision-aware.
- Give coarse pointers larger invisible targets.
- Use urgent alert semantics only for urgent failures.

### 10.10 CSS ownership

The goal is not arbitrary line reduction. It is decision reduction.

Required outcomes:

- dashboardPilot.module.css owns only dashboard-specific geometry;
- casePrototypeLab.module.css remains isolated archive CSS;
- globals.css owns public/global roles, not authenticated component details;
- foundation.module.css owns editorial composition, not duplicate controls;
- IntegrationsWorkspace.module.css delegates rows/forms/states to shared
  primitives;
- pageSkeletons.tsx becomes family composition rather than a second UI system;
- no route-local radius, shadow, focus, type, or z-index vocabulary;
- no duplicated dark-mode palette inside a route; and
- no grandfathered design-guard exceptions after migration.

### 10.11 Asset provenance and pruning

Audit all 134 public assets against imports, CSS URLs, metadata, downloads, and
generated packages.

Likely legacy candidates include:

- hero-background.png;
- hero-network.png;
- mock-app-hero.svg;
- metric-bridge-bg.png;
- old pricing background assets;
- setup-flow-visual.png;
- statement-facility.png;
- unauth-hero.png; and
- unauth-network-f5f6f5.png.

Deletion occurs only after a consumer and metadata audit. Keep current
product-proof captures and brand assets. Regenerate downloadable extension
archives only after their source visuals pass.

### 10.12 Dependency decision

Do not add a new visual dependency by default.

Inter, Inter Tight, DM Mono, existing icons, CSS, and the chart foundation are
sufficient. A new package requires:

- a documented gap;
- no equivalent current primitive;
- acceptable bundle impact;
- accessibility proof;
- dark/forced-colours/reduced-motion support; and
- removal of the superseded implementation.

---

## 11. Implementation programme

### Programme rules

- This is a hard-cutover programme, not a visual cohort rollout.
- No screenshot-only code.
- No route family begins before its shared primitives are accepted.
- Shared changes land before their route consumers.
- A phase does not finish with “tests pass”; it finishes with direct visual
  review at actual scale.
- Every phase updates the refreshed owner ledger.
- A discovered visible owner blocks phase completion until classified.
- Existing unrelated worktree changes are preserved.
- Product behaviour and product truth are checked after every visual refactor.

### IG-00 — Authority, discovery, and baseline

#### Work

- Declare this document the active implementation plan.
- Reconcile DESIGN.md and every authority pointer.
- Refresh .impeccable/design.json through the documented workflow.
- Rename data-ui-version and stale visual contract names.
- Classify or retire authenticatedUiRollout visual cohorts.
- Rewrite the authenticated style README.
- Mark older visual implementation documents superseded.
- Replace curated-only coverage with discovery-backed coverage.
- Add every missing owner identified in section 7.6.
- Correct the Shopify checkout zero-UI claim.
- Record Freshdesk as ingestion/setup only.
- Confirm prototype lab classification.
- Capture a clean, privacy-safe baseline from current source.
- Freeze new route-local visual variants until IG-16.

#### Exit gate

- one active authority;
- no conflicting geometry/type statement;
- refreshed exact owner count;
- every page, boundary, state owner, overlay, and embed classified;
- baseline manifest includes commit/source state, fixture, viewport, theme, and
  capture clock; and
- no implementation phase has an unowned surface.

### IG-01 — Foundations and canonical primitives

#### Work

- Consolidate token profiles.
- Reconcile typography and font variable names.
- Implement final geometry, spacing, depth, focus, and layer contracts.
- Build or consolidate:
  - EvidenceThread;
  - FinancialEquation;
  - SourceBeacon;
  - DecisionSentence;
  - ActionDock;
  - RecordedOutcome;
  - FormField and full form family;
  - canonical Surface grammar;
  - RegistrySurface;
  - BoardSurface;
  - BuilderShell;
  - FormDocument;
  - shared notice;
  - shared state;
  - shared skeleton map; and
  - shared overlay root/stack.
- Reconcile chart and table contracts.
- Implement forced-colour and reduced-motion specimens.

#### Exit gate

- every primitive is documented and rendered in the gallery;
- light/dark/forced-colours/reduced-motion specimens pass;
- 30% longer content and dense fixtures pass;
- no duplicate token layer in the same profile;
- no text role below 12px;
- no old surface primitive is required by a new implementation; and
- automated design guard understands the new contracts.

### IG-02 — Shell, navigation, overlays, states, and gallery

#### Work

- Rebuild authenticated shell and compact rail.
- Converge headers and page frames.
- Recompose workspace/source identity.
- Implement notice stack.
- Rebuild command palette and global menus.
- Portal and harden every overlay primitive.
- Replace route-settle transform.
- Rebuild shared loading/error/empty/permission/entitlement/disconnected
  states.
- Rebuild skeletons by page family.
- Complete the design-system and integration-preview laboratories.

#### Exit gate

- no shell shift;
- no overlay clipping;
- topmost Escape and focus restoration pass;
- background inertness passes;
- shell and every shared state pass 1024/1280/1440, dark, forced colours,
  reduced motion, and keyboard review;
- all shared owner specimens have captures; and
- old page header/tab/state geometry cannot be imported.

### IG-03 — Dashboard and Work

#### Work

- Build the financial position instrument.
- Build the at-rest useful chart and trust attachment.
- Build ranked attention ledger.
- Recompose Work views, due-band, command bar, registry, bulk mode, inspector,
  and exception drawer.
- Rebuild all route boundaries against final geometry.

#### Exit gate

- dashboard’s operating answer is clear within five seconds;
- count relationships are unambiguous;
- freshness, validation, and safe scope are separate;
- Work’s next action is the dominant row fact;
- first viewport targets pass at all three desktop widths;
- chart and table values reconcile;
- all required states in sections 6.2 and 6.3 pass; and
- functional parity tests pass.

### IG-04 — Cases registry and case dossier

#### Work

- Rebuild the four-view case registry.
- Rebuild selected preview.
- Recompose case detail into the joined dossier.
- Adopt EvidenceThread and Decision Focus.
- Stage the decision commit.
- Rebuild investigation, responsibility, recovery, reversal, and source
  overlays.
- Replace toast-only outcomes.
- Rebuild loading/error/not-found geometry.

#### Exit gate

- case registry and dossier are recognisably one workflow;
- fact, inference, recommendation, and merchant action are visually distinct;
- no consequential action lacks a consequence preview;
- no recorded action ends only in a toast;
- 1024px action context stays before secondary evidence;
- read-only and degraded-source states remain truthful; and
- every case state listed in section 6.5 passes.

### IG-05 — Customers, evidence, losses, and recoveries

#### Work

- Rebuild customer registry, profile, lineage inspector, and preview.
- Rebuild evidence creation.
- Rebuild Losses canvas, registry, and detail formula.
- Rebuild Recovery board, inspector, and detail chronology.
- Rebuild action outcomes and financial consequence previews.
- Remove unreachable customer filter owners or make them canonical.

#### Exit gate

- customer, loss, and recovery surfaces share source and financial grammar
  without sharing a generic layout;
- mixed/unknown/partial financial states remain explicit;
- boards have local overflow only;
- all evidence form states remain stable;
- no related records render as pill-button clouds; and
- family state matrices pass.

### IG-06 — Connected commerce and support dossiers

#### Work

- Rebuild the shared connected-object shell.
- Author the six type-specific lead regions.
- Rebuild lifecycle/conversation and relationship spine.
- Rebuild source/freshness and missing states.
- Add ConnectedObjectNotFound to the owner and proof manifests.
- Rebuild route skeletons and error boundaries.

#### Exit gate

- each object type is recognisable from the first viewport;
- shared shell does not erase type-specific priority;
- every source/relationship has direction, method, and freshness where known;
- no duplicate provenance block;
- long IDs and empty timelines pass; and
- all route boundaries pass.

### IG-07 — Rules, Flows, runs, and recovery rulebook

#### Work

- Rebuild registries around causal sentences.
- Rebuild rule and flow workbenches as ordered documents.
- Implement inline before/after review.
- Rebuild editor, simulation, validation, publication, and rollback.
- Rebuild run traces and raw detail disclosure.
- Rebuild recovery rulebook matrix and inspector.

#### Exit gate

- When → If → Recommend/Act is visually legible;
- dirty/version/published state is always visible;
- no builder depends on equal nested cards;
- every publication shows the reviewed change;
- raw JSON does not dominate the interface;
- keyboard and long-rule fixtures pass; and
- every listed variant passes.

### IG-08 — Reports, records, export, and print

#### Work

- Recompose report into three chapters.
- Adopt one FinancialEquation and currency scope.
- Refine charts, labels, data disclosures, and unavailable states.
- Remove decorative metric trends.
- Rebuild records registry.
- Rebuild export menu, pending/failure/outcome, and print layout.

#### Exit gate

- one financial story rather than currency-duplicated reports;
- every chart has a useful default reading;
- chart values reconcile with table and export;
- forced-colour series remain distinct;
- printed output has deliberate pagination;
- no clipped chart, legend, or table; and
- all report states pass.

### IG-09 — Integrations, providers, imports, and source setup

#### Work

- Rebuild source-role integration ledger.
- Rebuild provider comparison and detail.
- Rebuild health, freshness, coverage, and action outcomes.
- Rebuild ShipBob selection.
- Rebuild import mapping/validation/commit document.
- Rebuild provider route boundaries.

#### Exit gate

- each connection states what evidence it contributes;
- current state, freshness, scope, and limitation are visible;
- provider catalogue is not card soup;
- mapping remains readable with maximum columns;
- validation does not collapse to a generic alert;
- source setup outcomes are local; and
- all connection states pass.

### IG-10 — Settings and administration

#### Work

- Implement ConfigDocument and 204px settings index.
- Migrate all account, platform, team, billing, notifications, audit,
  agreements, data/privacy, API, and connector pages.
- Migrate raw form controls.
- Rebuild dialogs, switches, secret receipt, team registry, and billing
  statement.
- Rebuild every settings boundary and stateful client.

#### Exit gate

- all settings pages share document rhythm without looking templated;
- dirty state has one save owner;
- success is local and announced;
- destructive actions are visually isolated and staged;
- no opacity-only disabled or one-off switch state;
- no raw authenticated form control bypasses the canonical field contract
  without an explicit native-control reason; and
- all settings states pass.

### IG-11 — Notifications, Help, and global boundaries

#### Work

- Rebuild notification ledger.
- Rebuild help read pane/search.
- Rebuild app loading, not-found, permission, entitlement, connection, and
  desktop/reflow states.
- Rebuild root public/authenticated failure routing.
- Consolidate route pending and progress behaviour.

#### Exit gate

- inbox and guide destination are obvious;
- no decorative chart displaces notification content;
- every global state preserves the correct surface identity;
- 200% zoom does not trigger a false blocking boundary;
- every recovery path is singular and relevant; and
- global state matrix passes.

### IG-12 — Public story, pricing, demo, legal, and archive

#### Work

- Recompose landing proof and navigation.
- Rebuild pricing comparison ledger and FAQ.
- Rebuild demo as evidence theatre.
- Refine legal navigation, notes, responsive, and print.
- Rebuild public not-found/error.
- Quarantine and relabel prototype archive.
- Audit and prune public assets after consumer proof.

#### Exit gate

- opening landing proof is readable at 1024px and 390px;
- public proof uses real product truth;
- pricing actions remain in the opening viewport;
- demo no longer resembles a miniature dashboard;
- legal print remains intact;
- prototype directions cannot leak into production;
- no unused asset is deleted without proof; and
- all public widths/states pass.

### IG-13 — Auth, signup, reset, and onboarding

#### Work

- Rebalance AuthShell.
- Implement canonical entry forms and state geometry.
- Rebuild reset outcome.
- Rebuild onboarding as source commissioning.
- Correct Freshdesk capability presentation.
- Rebuild loading/error/completion geometry.

#### Exit gate

- form and context hierarchy are balanced;
- loading/error/success never jump anatomy;
- mobile retains product reassurance;
- onboarding uses one progress model;
- completion shows actual readiness and available surfaces;
- auth semantics and redirects are unchanged; and
- all entry states and widths pass.

### IG-14 — Pocket Brief surfaces

#### Work

- Implement shared Pocket Brief tokens, fixtures, and proof harness.
- Rebuild Chrome source views.
- Rebuild Zendesk iframe.
- Reorder and shorten Gorgias native payload.
- Rebuild Gorgias preview and unlock receipt.
- Correct zero-UI and no-embed truth.
- Rebuild Chrome distribution and Zendesk package only after source approval.

#### Exit gate

- all visible host products feel like one Unauth density;
- decisive state begins in first 120px;
- no semantic whole-card fill, emoji, or uppercase grade;
- no horizontal overflow;
- 1.35× text, forced colours, reduced motion, short host, long identifiers,
  locked, disconnected, error, and success pass;
- Gorgias preview matches native row contract; and
- packaged artifacts match approved source hashes.

### IG-15 — Cross-product finish

#### Work

- Perform true browser zoom and text-scale review.
- Perform long-content and maximum-density review.
- Perform dark and forced-colours review by family.
- Perform reduced-motion and coarse-pointer review.
- Perform keyboard and VoiceOver review.
- Review every overlay open state.
- Review first viewport and optical alignment.
- Review public/mobile/host matrices.
- Resolve all visual debt signals in rendered paths.

#### Exit gate

- no serious or critical accessibility issue;
- no page-level horizontal overflow;
- no clipped overlay, tooltip, row menu, label, value, or action;
- every task remains operable at 200% zoom;
- no disabled-opacity-only information;
- no colour-only status;
- no unreadable 12px operating fact;
- all page families score at least 9/10 in manual review; and
- no family has an unresolved high-severity visual defect.

### IG-16 — Hard cutover and visual release

#### Work

- Delete retired primitives, exports, styles, scripts, assets, and comments.
- Remove every grandfathered design exception.
- Replace old visual verification commands.
- Run the final discovered coverage checker.
- Run deterministic capture A and verification capture B.
- Compare manifests, states, values, and image evidence.
- Run the Impeccable craft detector once after all visual edits.
- Resolve every high-confidence detector finding.
- Run final manual review.
- Publish the final screenshot set and product-proof assets.

#### Exit gate

- one authority;
- one active implementation name;
- exact discovered owner count at 100%;
- no dormant signature primitive;
- no old surface/header/tab/state import;
- no stale programme marker;
- no visual cohort;
- no route-local design vocabulary outside approved composition needs;
- all automated gates pass;
- all manual gates pass;
- every coverage item has evidence; and
- release captures are the current source, not historical artefacts.

---

## 12. Verification and evidence

### 12.1 One final visual verification command

Create one active command:

- verify:decision-ledger, or a neutral verify:visual-system.

Retire:

- verify:apple-quality;
- verify:living-precision;
- stale pointer assertions;
- obsolete route counts; and
- visual-cohort checks.

The final gate must assert:

- all page modules discovered and classified;
- all layouts and boundaries discovered and classified;
- all independently visible owners discovered and classified;
- embedded/zero-UI contracts classified;
- authority pointers agree;
- no stale data-ui-version;
- no visual cohort;
- no forbidden primitive imports;
- no stale exports;
- no old programme name in active visual code;
- proof matrix complete; and
- final artefact manifests match source.

### 12.2 Expand the design guard

Keep the current zero-arbitrary-value, zero-uppercase-eyebrow, and
zero-hand-rolled-table checks, then extend them to:

- app/(public);
- components/public;
- components/demo;
- public CSS;
- AuthShell and onboarding;
- Chrome popup and content;
- Zendesk assets;
- Gorgias HTML renderers;
- Decision Ledger styles;
- raw authenticated form controls;
- duplicate header/tab patterns;
- forbidden blur and backdrop-filter;
- authenticated gradients;
- decorative sparklines and waffle charts;
- route-local z-index;
- route-local shadows/radii/type values;
- old primitive imports;
- missing text/icon state cue;
- whole-card semantic fill where statically identifiable; and
- all currently grandfathered files.

The final guard has zero exemptions. A documented generated-artifact exclusion
is allowed only when its source is guarded and the generated hash is verified.

### 12.3 Maintained functional gates

Run, at minimum:

- typecheck;
- lint;
- unit/component tests for touched visual owners;
- verify:ui-parity;
- current critical-route tests;
- release browser tests;
- content compliance;
- accessibility-responsive;
- dynamic surfaces;
- sidebar route matrix;
- release performance; and
- final discovered visual-system verification.

Visual refactoring is not allowed to change:

- route redirects;
- query/hash preservation;
- mutations;
- calculated values;
- permission/entitlement decisions;
- source provenance;
- export data;
- decision recording; or
- integration state.

### 12.4 Accessibility automation

- Run axe against the whole document, not only main.
- Open every modal, drawer, menu, tooltip, toast, command palette, and locked
  state during checks.
- Reject serious and critical findings.
- Test headings, landmarks, names, descriptions, state announcements, table
  semantics, form errors, dialog ownership, and focus restoration.
- Test 200% zoom, text spacing, forced colours, reduced motion, and coarse
  pointer.
- Test chart table alternatives and avoid duplicate announcements.

Automation is necessary but does not replace VoiceOver and keyboard review.

### 12.5 Deterministic capture programme

Reuse the current stable clock, RouteReadySignal, transient-overlay registry,
fixture, and privacy scanning infrastructure. Consolidate capture naming under
the final authority.

#### Route pass

- Every page module receives one resolved-state capture at its primary review
  width.
- Every layout and boundary receives a rendered proof through an owned route.
- Every named overlay receives an open-state capture.
- Every stateful owner receives captures for each materially different internal
  composition.
- Every embed receives every state listed in IG-14.
- Zero-UI contracts receive source/test evidence rather than a fabricated
  screenshot.

#### Flagship matrix

Capture:

- dashboard;
- work;
- cases registry;
- case detail;
- customer profile;
- losses;
- recoveries;
- rules builder;
- flow run;
- reports;
- integrations;
- settings account;
- landing;
- pricing;
- demo;
- login;
- onboarding;
- Chrome;
- Zendesk;
- Gorgias preview and unlock.

For authenticated flagships:

- 1440×900 light;
- 1280×800 light;
- 1024×900 light;
- 1440×900 dark;
- forced colours;
- reduced motion;
- long-content;
- partial/stale/error where applicable; and
- true 200% zoom proof.

For public/entry:

- 1440×900;
- 1280×800;
- 1024×900;
- 768×1024;
- 390×844;
- long content;
- 200% zoom; and
- open navigation/FAQ/form state.

For embeds:

- exact native width;
- short and tall host;
- 1.35× text;
- long values;
- loading;
- locked/disconnected;
- error;
- success;
- forced colours; and
- reduced motion.

#### Run A / Run B

Run A creates the candidate.
Run B replays the same deterministic fixture and verifies:

- route;
- state;
- clock;
- data values;
- no transient loading;
- no page error;
- no console error outside the approved optional-resource policy;
- no private data;
- no document overflow; and
- stable image dimensions.

Unexpected differences require explanation and review. Pixel identity is not
required when browser rendering is nondeterministic, but data, geometry, and
state must remain stable.

### 12.6 Manual visual review protocol

Review every flagship and every family representative:

1. at 100% scale;
2. in the whole browser frame;
3. as a landing-page crop;
4. in light and dark where supported;
5. at the compact supported width;
6. with long content;
7. with an unavailable or degraded source;
8. keyboard only;
9. VoiceOver;
10. 200% zoom;
11. forced colours;
12. reduced motion; and
13. coarse pointer.

Review questions:

- Can the dominant object be named in five seconds?
- Is the next meaningful action obvious?
- Does the page look like Unauth without the logo?
- Is source, fact, inference, recommendation, decision, and outcome authority
  visible?
- Is financial scope explicit?
- Is any value repeated without adding meaning?
- Does any rectangle exist only because the designer needed a container?
- Does any status rely on colour?
- Does any action disappear on hover or below the fold?
- Does the loading/error state preserve the final composition?
- Does the 1024px first viewport still explain the page?
- Is the embedded result useful within its first 120px?
- Would this screenshot be credible on the landing page without explanation?

### 12.7 Screenshot selection

The final landing proof set should use:

- one readable evidence-stage case crop;
- one readable recommendation/decision crop;
- one financial position crop if it adds a different proof point; and
- no more screenshots than the story requires.

Do not select a screenshot because it is visually busy. Select it because it
demonstrates product truth at the delivered size.

---

## 13. Final quality scorecard

Every dimension is scored from 1 to 10 for every route family.

| Dimension | 9–10 requirement |
|---|---|
| Purpose and hierarchy | dominant object and action understood in five seconds |
| Composition | authored for the task, not a generic template |
| Typography | readable, optically aligned, disciplined, no microtype dependency |
| Colour and depth | restrained, semantic, accessible, flat unless truly floating |
| Product specificity | recognisable as Unauth without logo or marketing copy |
| Data and financial truth | exact scope, provenance, unavailable/partial distinction |
| Interaction and motion | local, causal, fast, keyboard and reduced-motion sound |
| States | ideal and degraded states share equal visual care |
| Responsive/accessibility | 1024, 200% zoom, forced colours, keyboard, VoiceOver pass |
| Screenshot credibility | useful product proof at actual delivered size |

Release threshold:

- every route family scores at least 9 in every dimension;
- overall cross-product score is at least 92/100;
- no P0 or P1 visual defect remains;
- no score is rescued by averaging a weak state against a strong default; and
- the product owner accepts the flagship light, dark, compact, and degraded
  captures.

---

## 14. Quantitative acceptance gates

- 100% of the refreshed discovered owner manifest is classified.
- 100% of applicable owners have visual or explicit zero-UI evidence.
- 65/65 current page modules remain classified unless source discovery finds a
  legitimate new count.
- 0 unclassified route-state boundaries.
- 0 unclassified mounted overlays.
- 0 dormant Decision Ledger exports.
- 0 active references to retired visual authority names.
- 0 visual cohorts or screenshot-only variants.
- 0 active Card, Panel, SectionCard, or AuthenticatedPanel visual imports after
  convergence, unless the final authority explicitly retains a semantic alias.
- 0 rendered product text below 12px.
- 0 route-local overlay z-index values.
- 0 backdrop blur in product, entry, or embed surfaces.
- 0 decorative product gradients.
- 0 decorative sparkline or waffle chart.
- 0 colour-only status.
- 0 opacity-only required disabled content.
- 0 clipped first/last row action menus.
- 0 page-level horizontal overflow at required widths.
- 0 blocked critical task caused by 200% zoom.
- 0 whole-card semantic fills in Pocket Brief.
- 0 emoji used as an interface icon.
- 0 invented Freshdesk or checkout UI.
- 0 null/unavailable value presented as recorded zero.
- 0 currency aggregation without valid common scope.
- 0 serious/critical automated accessibility findings.
- 0 console/page errors in final captures outside documented optional-resource
  exclusions.
- 0 private or live customer data in release screenshots.

---

## 15. Prohibited outcomes

The implementation is rejected if:

- it creates another named aesthetic without finishing Decision Ledger;
- every page still looks like header + controls + rounded white card;
- the visual signature exists only on dashboard and reports;
- route families become visually identical despite different jobs;
- “premium” is expressed through glass, gradient, shadow, or giant type;
- Apple practice becomes iOS imitation;
- the first viewport contains mostly chrome and setup explanation;
- a dashboard value appears in four places;
- charts require interaction before saying anything useful;
- a case action is detached from the evidence it depends on;
- success exists only as a disappearing toast;
- loading and error use older geometry;
- a compact embed looks like a shrunk desktop dashboard;
- public proof is unreadable at delivered size;
- a visual improvement hides product limitations;
- the product claims a Freshdesk brief that does not exist;
- a zero-UI checkout extension is given invented visual states;
- 200% zoom triggers a blocking “desktop required” replacement;
- dark or forced-colour mode is treated as a final-day recolour;
- a legacy component remains “temporarily” after its last consumer moves; or
- a green checker is accepted without manual route-family review.

---

## 16. Definition of done

The final visual iteration is done only when:

1. Decision Ledger — Instrument Grade is the only active visual authority.
2. The discovered visual inventory is complete and exact.
3. Every page, layout, boundary, overlay, stateful owner, and embed is assigned
   and evidenced.
4. The authenticated shell is stable at 1024/1280/1440.
5. Browser zoom does not block critical tasks.
6. Public and entry surfaces pass 390/768/1024/1280/1440.
7. Pocket Brief passes every native-width and state fixture.
8. The six signature patterns are either adopted appropriately or removed.
9. Shared surfaces, forms, tables, charts, overlays, and states have one
   canonical contract.
10. No retired primitive or route-local visual system remains in production.
11. Every page has one dominant object and one obvious next action.
12. Financial values, currencies, source health, and unavailable states remain
    truthful.
13. Every consequential action has consequence, pending, failure, and recorded
    outcome presentation.
14. Dark, forced colours, reduced motion, keyboard, VoiceOver, long content,
    text spacing, coarse pointer, and 200% zoom pass.
15. All automated design, functional parity, browser, and accessibility gates
    pass.
16. Deterministic Run A and Run B evidence is complete.
17. The final Impeccable detector pass has no unresolved high-confidence
    finding.
18. Every route family scores at least 9/10.
19. The landing-page proof is readable, current, and credible.
20. The final source and packaged extension artefacts match.

---

## 17. Implementation invocation

When implementation is authorised, execute IG-00 through IG-16 in order.

Do not start by polishing routes independently. First make the authority,
owner manifest, foundation, shared components, shell, overlays, and states
converge. Then rebuild each route family against the exact specification in
section 6, using the route map in section 7 and the state matrix in section 8.

At each phase:

1. inspect current rendered truth;
2. confirm product and functional constraints;
3. implement shared responsibility before local responsibility;
4. test the touched owner and its states;
5. capture all required widths/modes;
6. review at actual scale;
7. remove superseded code immediately;
8. update owner evidence; and
9. stop the phase if a product-truth or unowned-surface discrepancy appears.

The final pass is complete only at IG-16. “Looks better” is not an exit
condition; the evidence and scorecard are.
