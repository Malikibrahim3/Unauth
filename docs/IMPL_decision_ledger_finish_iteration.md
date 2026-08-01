# IMPL — Decision Ledger finish iteration

- **Status:** Decision-complete implementation plan — planning only
- **Date:** 31 July 2026
- **Programme:** `DL-00` through `DL-13`
- **Scope:** every production page, layout, route boundary, named nested view,
  stateful view owner, overlay, public surface, entry flow, and embedded view
- **Inventory authority:** [`APPX_whole_product_visual_coverage_ledger.md`](APPX_whole_product_visual_coverage_ledger.md)
- **Product authority:** [`../PRODUCT.md`](../PRODUCT.md)
- **Visual authority:** [`../DESIGN.md`](../DESIGN.md)
- **Implemented baseline:** [`IMPL_evidence_spine_craft_iteration.md`](IMPL_evidence_spine_craft_iteration.md)
- **Change boundary:** presentation, responsive composition, interaction
  feedback, and visual-system maintenance only
- **Visitor modes:** Operate for product UI; Persuade for public pages; Read for
  legal/help; compact Operate for embedded views
- **Retained visual world:** **The Quiet Evidence Desk**
- **Next iteration thesis:** **The Decision Ledger**

This document defines the next complete visual iteration after the Evidence
Spine rollout. It is not a request for another visual theme, a compatibility
layer, or a collection of route-local polish tasks. It retains the product
truth, behaviour, and design identity already established, then removes the
remaining generic SaaS anatomy.

No implementation decision in this document is intentionally left to the
builder.

---

## 0. Executive decision

The current application is coherent, credible, responsive at its supported
desktop boundary, and materially stronger than the original product. The
Evidence Spine repaired the clearest layout defect and introduced a useful
product-specific sequence.

It still falls short of a 9–10 visual bar for one reason:

> The product now has a good design system, but several important views still
> look like the design system was applied to them rather than as if the view
> itself was precisely authored around its decision.

The remaining gap is not colour, radius, shadow, or typography fashion. It is
composition.

The dashboard still places its strongest financial story inside a conventional
framed card. Work separates risk, view selection, search, and the queue into
successive interface bands. Reports presents the same four headline values in
the Evidence Spine and then immediately repeats them in four metric cells.
Registries often use pill-like filters because the primitive exists, not
because pills are the clearest way to navigate a serious queue. Detail pages
retain too many independently introduced sections. Public pages contain real
product proof, but the proof is still smaller and less legible than it should
be at standard laptop height.

The next iteration will turn every major route into a **decision instrument**:

1. one dominant object with minimal surrounding chrome;
2. one visible relationship between evidence, state, action, and outcome;
3. one primary control zone, integrated with the object it changes;
4. direct labels and conclusions instead of duplicated legends or explanatory
   paragraphs;
5. seams, alignment, and tonal planes instead of nested card frames;
6. page-specific composition using shared primitives; and
7. first viewports that complete a meaningful part of the operator’s work.

### 0.1 Quality benchmark

Stripe and Ramp remain execution benchmarks, not templates. The target is:

- financially trustworthy;
- calm at operational density;
- precise enough to reward expert use;
- unmistakably Unauth because provenance and merchant control are visible;
- composed at 1440, 1280, and 1024 rather than merely responsive;
- screenshot-ready because the real product is strong, not because a special
  capture mode exists; and
- visually quiet without becoming anonymous.

### 0.2 What “better” means in this pass

“Better” means:

- less visible interface scaffolding;
- fewer repeated labels and values;
- fewer equal-weight controls;
- fewer bordered rectangles;
- stronger numerical and evidential hierarchy;
- tighter alignment between what changed and the control that changed it;
- more useful information above the fold;
- clearer scan paths for queues and records;
- more decisive product proof in public surfaces; and
- identical functional reach with lower visual and cognitive cost.

It does not mean:

- gradients, glow, glass, blur, decorative textures, or 3D;
- a new accent colour;
- another font family;
- larger headlines as a substitute for composition;
- fake browser chrome;
- animation for atmosphere;
- rounded pills for every selection;
- mobile metaphors inside the authenticated desktop product;
- hiding unavailable, stale, partial, or contradictory data; or
- removing operational density solely to improve screenshots.

---

## 1. Current implemented baseline

### 1.1 What is now strong

The following decisions are successful and remain:

- the 200px/56px authenticated navigation system;
- the adaptive compact rail between 768 and 1199px;
- the 52px utility header;
- the cool-neutral canvas, graphite ink, and single violet interaction voice;
- flat inline surfaces and floating-only shadows;
- the five-column Work decision table;
- semantic state colour used only for meaning;
- sentence-case interface language;
- fixed authenticated type roles;
- tabular financial values;
- Evidence Spine semantics for source, fact, finding, recommendation, decision,
  and outcome;
- real chart data, real record links, real missing states, and real financial
  definitions;
- public/auth/onboarding/embedded identity continuity;
- full functional parity across committed destinations; and
- the exhaustive 245-owner coverage ledger.

### 1.2 Direct observations from the implemented calibration routes

#### Dashboard

At 1280×800:

- the `Payout position` region starts at approximately `y=195` and is about
  `442px` tall;
- `What needs attention` and `Data trust` begin at approximately `y=651`, so
  only their headings and first rows enter the initial viewport;
- the financial hierarchy is strong;
- the period, comparison, currency, and report controls still read as a generic
  form row above the product object;
- the outer perimeter makes the composition feel more like a polished
  dashboard card than an instrument; and
- the chart retains a separate legend and explanatory line where direct series
  labels could do more work.

#### Work

At 1280×800:

- page-level overflow is fixed;
- the queue remains readable;
- the table region measures approximately `986px` with about `1014px` of
  internal scroll content;
- the risk pulse, filter pills, saved-view controls, search, table header, and
  rows form five successive horizontal bands;
- risk and view selection describe overlapping dimensions but appear as
  separate interface systems;
- selected and unselected views still resemble compact buttons rather than
  durable queue navigation; and
- the primary work object begins later than necessary.

#### Reports

At 1280×800:

- the financial Evidence Spine is clear and product-specific;
- `Maximum exposure`, `Confirmed loss`, `Recovered cash`, and `Final net loss`
  are then repeated immediately below it;
- the second set adds small sparklines, but the duplication weakens the
  hierarchy;
- the reconciliation warning takes appropriate precedence;
- the overall result is trustworthy but not yet economical; and
- the primary analytical answer should be one bridge, not a bridge plus a
  metric grid containing the same facts.

#### Landing

At 1280×800:

- the headline is now controlled and product proof has greater width;
- navigation and CTA hierarchy are clear;
- there remains a large neutral interval between the 64px navigation and the
  hero’s active content;
- the product proof is authentic but much of its text is still too small to
  read in the first viewport;
- the visitor understands the proposition, but the proof should become the
  hero’s most visually authoritative object; and
- later sections must use equally legible real product evidence rather than
  falling back to generic marketing anatomy.

### 1.3 Directional score

| Dimension | Implemented baseline | Next target | Remaining gap |
|---|---:|---:|---|
| System coherence | 9.1 | 9.7 | A few visual authorities and tokens still drift |
| Operational clarity | 8.9 | 9.7 | Controls and conclusions still compete on some routes |
| Product specificity | 8.2 | 9.7 | Evidence Spine exists, but too many page anatomies remain generic |
| Composition authorship | 8.0 | 9.6 | Repeated header + toolbar + bordered panel structure |
| Responsive desktop | 8.8 | 9.6 | Local overflow and rail ordering still need archetype-specific proof |
| Typography and rhythm | 8.7 | 9.5 | Good roles; some explanatory copy and public dead space remain |
| Data visualisation | 8.6 | 9.6 | Correct charts; legends, duplication, and indirect conclusions remain |
| Interaction finish | 8.2 | 9.4 | Working states; weak action-to-result continuity |
| Public persuasion | 8.3 | 9.5 | Real proof is present but still undersized |
| Screenshot authority | 8.5 | 9.6 | Strong enough to ship; not consistently art-directed by product truth |
| Accessibility foundation | 9.2 | 9.7 | Strong baseline; zoom, long labels, and local overflow need final proof |

The next iteration is successful only if it improves product specificity and
composition authorship without lowering operational clarity or accessibility.

---

## 2. Selected direction — The Decision Ledger

### 2.1 Relationship to the Evidence Spine

The Evidence Spine remains the lifecycle primitive. It answers:

> Where did this fact, recommendation, decision, or financial state come from?

The Decision Ledger becomes the page-composition system. It answers:

> Given what is known, what requires attention, what can the merchant decide,
> and what outcome will be recorded?

The Evidence Spine is a sequence inside a view. The Decision Ledger determines
the view itself.

### 2.2 Visual thesis

Every important screen will read like a well-designed financial working paper:

- identity and scope are concise;
- source and time are explicit;
- values align;
- relationships are visible;
- supporting evidence recedes without disappearing;
- decisions are adjacent to their reason;
- outcomes remain traceable; and
- the interface frame does not compete with the content.

This is not a skeuomorphic paper ledger. It is a browser-native information
discipline.

### 2.3 Five-part page grammar

Every route uses the parts that genuinely apply:

1. **Identify** — the record, queue, report, configuration, or task.
2. **Scope** — time, workspace, saved view, currency, source, or status.
3. **Read** — the dominant evidence, financial position, state, or sequence.
4. **Decide** — the next merchant-owned action or configuration change.
5. **Prove** — provenance, audit history, outcome, and recovery path.

The builder must not add all five parts mechanically. Missing parts remain
absent. The rule prevents pages from defaulting to the same shell anatomy.

### 2.4 Signature moments

The visual system gains four restrained, product-specific moments:

1. **Ledger line** — a direct relationship between values or states, including
   known, unavailable, and contradictory segments.
2. **Decision sentence** — one concise line that joins current evidence to the
   next legitimate action.
3. **Source trace** — provider, timestamp, freshness, and fact type presented
   as a compact aligned provenance row.
4. **Recorded outcome** — a brief, local confirmation showing what changed,
   who changed it, and where it now appears.

These moments replace generic cards, banners, and success toasts where the
product truth supports them.

---

## 3. Global visual-system decisions

### 3.1 Design authority reconciliation

`DL-00` must reconcile documentation before broad UI editing:

- update `DESIGN.md` frontmatter to the implemented `8px / 12px / 16px`
  control, surface, and overlay radii;
- document the actual authenticated type steps used by the product, including
  `12`, `13`, `14`, `16`, `18`, `20`, `24`, `28`, and the exceptional
  financial lead role;
- retain DM Mono only for identifiers, hashes, compact timestamps, and payload
  material;
- remove or replace the undocumented `Sfmono-Regular` fallback;
- record `1200px`, `1280px`, and `1440px` as distinct compact, local-rail, and
  wide-workspace thresholds;
- update `.impeccable/design.json` from the same ground truth;
- update active design-authority references that still name Living Precision;
  and
- keep the historical Living Precision documents unchanged as history.

This is documentation and visual-governance work, not a new visual direction.

### 3.2 Surface rule

Default:

- continuous canvas;
- open content regions;
- one owning perimeter when containment or scroll ownership requires it;
- interior seams rather than nested frames;
- tonal sections only when they change reading mode; and
- no shadow for document-flow content.

Allowed owning perimeters:

- a data registry with contained scrolling;
- a builder or preview canvas;
- an evidence dossier that must read as one object;
- a host-constrained Pocket Brief;
- a modal, drawer, menu, or popover; and
- a real product screenshot on public pages.

Disallowed:

- a panel solely because a section has a heading;
- a bordered card inside another bordered card;
- a metric card for a single number that can sit in an aligned ledger row;
- a separate card for explanatory copy; and
- equal cards for items with unequal importance.

### 3.3 Border rule

- structural seams: `1px var(--ua-border-subtle)`;
- owning perimeter: `1px var(--ua-border-default)`;
- focus: the existing violet focus contract;
- selected rows: tonal fill plus non-colour current-state cue;
- semantic borders only for real warning/error/success states;
- no decorative accent sidebars;
- no two-pixel coloured section rules; and
- no more than one complete perimeter around the dominant object.

### 3.4 Typography roles

Authenticated product:

| Role | Size / leading | Weight | Use |
|---|---|---:|---|
| Page identity | `28 / 34` | 650 | One route title |
| Record identity | `24 / 30` | 650 | Human-readable case/customer/object |
| Section | `18 / 25` | 600 | Major object regions |
| Subsection | `16 / 22` | 600 | Joined internal chapters |
| Body | `14 / 20` | 400 | Forms, evidence prose, explanations |
| Dense | `13 / 18` | 400–600 | Tables, controls, operational facts |
| Metadata | `12 / 16` | 500 | Source, timestamp, compact provenance |
| Financial lead | `36 / 40` | 650 | One genuine primary total |
| Financial row | `18 / 24` | 600 | Ledger values and equations |
| Identifier | `12 / 16` | 500 mono | Hash, reference, provider key only |

Rules:

- authenticated typography is fixed, never fluid;
- public display type remains Inter and may use `44–60px` responsive endpoints;
- no text below `12px` in product or public proof;
- no uppercase eyebrow system;
- paragraphs cap near `68ch`;
- table primary text may use two lines only when the row height explicitly
  supports it; and
- all financial values remain tabular.

### 3.5 Spacing and first-viewport targets

Authenticated desktop:

- page header top/bottom: `22px / 16px` at wide desktop;
- page header top/bottom: `18px / 14px` at compact desktop;
- page gutters: `32px` wide, `20px` at 1024–1279;
- major object gap: `20px`;
- joined section padding: `16–20px`;
- dense registry row: `52–60px`;
- evidence/decision row: `60–72px`; and
- page content cap remains `1600px`.

First meaningful object target:

- dashboard, Work, reports, registries: begins at or above `y=170` at
  1280×800;
- case/detail identity: begins at or above `y=150`;
- first actionable row/conclusion: visible by `y=430`;
- dashboard attention list: at least two complete rows visible at 1280×800;
- public product proof: begins at or above `y=150` at 1280×800; and
- auth primary field: visible without scrolling at 768px viewport height.

These are composition targets, not screenshot-specific transforms.

### 3.6 Control hierarchy

Each region may contain:

- one primary action;
- one quiet secondary action group;
- one overflow menu for genuinely infrequent actions; and
- one scope/navigation system.

Do not show:

- a row of five button-shaped filters when text tabs are sufficient;
- a label repeated inside both a control and adjacent helper text;
- a visible action per table row when an on-focus/on-hover action or overflow
  menu preserves keyboard access;
- two search fields for the same dataset; or
- a page-level export action repeated inside every chart.

### 3.7 Motion and continuity

Motion remains state-driven:

- hover/focus: `100ms`;
- selection and inline disclosure: `140–160ms`;
- drawer/modal: `180–220ms`;
- updated value crossfade: `160ms`;
- newly recorded row highlight: one `600ms` tonal settle, then rest;
- chart series change: value/mark crossfade, no animated sweep;
- saved configuration: local recorded-outcome line, not a celebratory overlay;
- reduced-motion: immediate state change with the same information; and
- no route-load choreography.

### 3.8 Icon and illustration rule

- Lucide remains the product icon system;
- icons label standard actions and navigation, not decorative concepts;
- source/provider marks remain real assets or deterministic fallbacks;
- no emoji;
- no generic line-art spot illustrations in empty states;
- public diagrams use semantic HTML/CSS/SVG based on real product relationships;
  and
- product screenshots remain real route output.

---

## 4. Shared component architecture

### 4.1 Extend

- `PageFrame`
- `AuthenticatedPageHeader`
- `WorkbenchPage`
- `DetailPageShell`
- `AuthenticatedPanel`
- `RegistrySurface`
- `DataTable`
- `MetricGroup`
- existing chart primitives
- existing status, priority, source, button, input, modal, drawer, tooltip,
  empty-state, and skeleton primitives

### 4.2 Create or consolidate

The implementation may introduce the following shared presentation
primitives:

#### `DecisionHeader`

Purpose:

- joins route identity, a decision sentence, scope controls, and the primary
  action without creating separate page-header and toolbar bands.

Slots:

- identity;
- decision sentence;
- scope;
- primary action;
- secondary actions; and
- metadata.

It must not replace `PageFrame`; it is a compositional child used only by
archetypes that benefit.

#### `LedgerBridge`

Purpose:

- presents a causal or lifecycle sequence once;
- supports value, label, definition, source state, destination, and
  unavailable/partial status;
- replaces duplicate metric strip + spine compositions; and
- works as horizontal, compact horizontal, or vertical depending on width.

#### `SourceTraceRow`

Purpose:

- aligns source type, provider, fact/finding/inference label, timestamp,
  freshness, summary, and optional destination;
- supports dense and standard variants; and
- preserves semantic distinctions in markup and non-colour cues.

#### `DecisionSentence`

Purpose:

- one sentence made from existing truthful data;
- identifies current state and legitimate next action;
- never fabricates advice;
- may include one link or action; and
- degrades to explicit partial/unavailable language.

#### `ScopeStrip`

Purpose:

- period, currency, saved view, workspace, or status scope;
- text-tab navigation where the set is durable;
- controls where the value is variable;
- one compact utility zone for search/export/density; and
- horizontal containment at 1024 without page overflow.

#### `RecordedOutcome`

Purpose:

- local, accessible confirmation after saves, decisions, connections, syncs,
  publishes, or assignment;
- states what changed, actor/time when known, and next destination;
- uses `role=status` for ordinary success and `role=alert` only for urgent
  interruption; and
- never becomes a generic green toast.

#### `ActionDock`

Purpose:

- contains the primary commit action and its immediate consequence;
- sticky only when long content makes the decision otherwise disappear;
- remains in document order;
- never obscures content at 200% zoom; and
- collapses to an in-flow region when width or height is constrained.

### 4.3 Consolidate and retire

Consolidate:

- route-local KPI strips that repeat a ledger bridge;
- duplicate source/provenance rows;
- pill-based durable navigation;
- route-local success banners;
- duplicate detail headers;
- route-local form section frames;
- per-chart legends that can be direct labels;
- repeated page subtitle + panel description copy; and
- separate action cards that belong to the dominant object.

Retire only after all consumers migrate:

- duplicate metric presentation below the Reports Evidence Spine;
- any generic `Primary work surface` or implementation-language label;
- screenshot-only public product frames;
- dormant `navItems`/`activeNavKey` Workbench presentation paths;
- undocumented radius/type exceptions;
- `Sfmono-Regular` product styling; and
- obsolete visual-authority checks that fail because the active authority
  changed.

---

## 5. Archetype implementation specifications

## 5.1 Dashboard — financial position instrument

### Job

An operator must understand current payout exposure, what changed it, what
needs action, and whether the values are trustworthy.

### Composition

1. Compact page identity and one decision sentence.
2. Integrated scope strip for period, comparison, currency, and Reports.
3. Open `Payout position` canvas with no outer card perimeter:
   - left: one financial lead and its operational consequence;
   - right: directly labelled chart;
   - bottom seam: validated/partial state and last generation time.
4. Attention ledger immediately below:
   - next action;
   - count;
   - exposure;
   - readiness/deadline cue; and
   - destination.
5. Data trust becomes a narrow joined column only at `>=1440`; at 1280 and
   1024 it becomes an inline ledger row below the position canvas.

### Specific changes

- move scope controls into `DecisionHeader`;
- remove the full perimeter around the primary financial canvas;
- preserve the internal left/right tonal distinction;
- directly label chart marks/series and remove the separate legend when both
  series can be named at their endpoint;
- convert `17 active · 15 need action · 8 ready now` into one aligned decision
  line;
- show two complete attention rows at 1280×800;
- prevent `Review Orders` or similar destinations from wrapping into unrelated
  words; and
- keep every current tab, range, currency, comparison, chart disclosure, data
  destination, and record destination.

### Primary files

- `components/dashboard/DashboardOverview.tsx`
- `components/dashboard/DashboardPositionChart.tsx`
- `components/dashboard/dashboardPilot.module.css`
- `components/dashboard/dashboardModel.ts`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/dashboard/loading.tsx`
- `app/(app)/dashboard/error.tsx`

### Acceptance

- primary object begins by `y=170` at 1280×800;
- two attention rows are fully visible in the first viewport;
- no repeated legend/series label;
- no number appears twice without a different analytical role;
- partial/unknown values remain explicit; and
- dark, forced-colour, keyboard, and 200% zoom compositions remain legible.

## 5.2 Work — queue forecast and decision registry

### Job

An operator must see when the queue becomes risky, choose a durable work view,
scan the next action, and act without losing scope.

### Composition

1. Compact page identity and risk decision sentence.
2. One joined queue forecast:
   - deadline distribution;
   - overdue/due-today conclusion;
   - durable work-view navigation; and
   - search/utility controls.
3. Registry table begins immediately below the joined header.
4. Bulk actions replace the utility zone when rows are selected.
5. Saved and additional views disclose from one anchored menu or inline
   secondary row without moving the table unexpectedly.

### Specific changes

- merge `WorkQueuePulse` and the durable view navigation into one owned queue
  header;
- use underline/text navigation for `Open`, `My work`, `Unassigned`, `Due
  today`, and `Overdue`;
- reserve compact bordered controls for `Save view`, search, and utility
  actions;
- maintain five table columns;
- remove internal horizontal overflow at 1280 and 1440;
- permit bounded local overflow at 1024 only when a 1.35× long-label fixture
  requires it;
- keep source mark, title, object, and explanation inside one stable primary
  cell;
- keep priority and status distinct but visually quieter;
- reveal row actions on hover/focus while retaining them in keyboard order;
- make the table header sticky inside its owning registry;
- preserve saved views, URL query, due-band drill-down, pagination, selection,
  drawer, and every mutation; and
- ensure loading/empty/error states occupy the same registry geometry.

### Primary files

- `components/work/WorkQueue.tsx`
- `components/work/WorkQueuePulse.tsx`
- `components/work/WorkQueuePulse.module.css`
- `components/work/ExceptionResolutionDrawer.tsx`
- `components/workbench/WorkbenchPage.tsx`
- `styles/authenticated/tables.css`
- `app/(app)/work/**`

### Acceptance

- no internal table overflow at 1280 or 1440 with standard fixtures;
- the first five rows remain readable at 1024;
- risk, view, and search read as one hierarchy;
- no row title collapses or source mark overlaps;
- selection does not cause layout jump; and
- every current action remains reachable by mouse, keyboard, and touch target.

## 5.3 Cases — registry to dossier

### Registry composition

- compact route identity and current queue conclusion;
- scope strip with search/sort as the primary utility and status filters as
  durable text navigation;
- one registry perimeter;
- stronger case/customer identity column;
- state, amount, readiness, owner, and deadline aligned as ledger facts;
- contextual preview only when it materially reduces navigation;
- no nested preview card; and
- current URL, return path, pagination, filters, and drawer behaviour remain.

### Case-detail composition

Case detail is the calibration surface for all record routes.

1. **Identity line**
   - case identity;
   - customer/order relationship;
   - amount;
   - current lifecycle state;
   - owner/SLA;
   - return path and overflow actions.
2. **Evidence dossier**
   - compact lifecycle/Evidence Spine;
   - readiness and named gaps;
   - source traces;
   - provider facts;
   - human findings;
   - system inferences;
   - independent recommendations.
3. **Decision chapter**
   - customer action;
   - responsibility;
   - recovery;
   - explicit merchant control;
   - ActionDock when a legitimate commit is available.
4. **Proof chapter**
   - activity;
   - investigations;
   - comments;
   - financial history;
   - reversals/outcomes.

### Specific changes

- remove any residual generic surface-introduction copy;
- stop presenting readiness, provenance, gaps, and next action as four equal
  summary cells when one decision sentence can lead;
- make raw evidence progressively disclosed after the decision-relevant
  summary, without hiding gaps;
- join recommendation and its decision control visually;
- keep customer action, responsibility, and recovery independently truthful;
- convert the detached right action card into an ActionDock or an integrated
  decision chapter;
- preserve all submit, save draft, reopen, reverse, snooze, assign, evidence,
  investigation, response, recovery handoff, and history behaviour; and
- preserve route anchors and `returnTo`.

### Primary files

- `app/(app)/claims/**`
- `components/claims/ClaimReviewHeader.tsx`
- `components/claims/ClaimReviewPanel.tsx`
- `components/claims/ClaimReviewContextColumn.tsx`
- `components/claims/ClaimReviewActionRail.tsx`
- `components/claims/ClaimReviewFormSection.tsx`
- `components/claims/ClaimReviewHistoryTable.tsx`
- `components/claims/payout/**`
- `components/claims/investigations/**`
- `components/cases/CaseContextDrawer.tsx`

### Acceptance

- identity, readiness, and legitimate next action are visible without scroll at
  1280×800;
- the operator can distinguish source fact, human finding, system inference,
  recommendation, and merchant decision without relying on colour;
- the same information is not repeated in header, summary, and rail;
- the action region reads as the conclusion of review, not a detached form;
- long evidence and missing-data states preserve the sequence; and
- every mutation and audit destination remains unchanged.

## 5.4 Related registries and connected records

Applies to:

- Customers;
- Losses;
- Recoveries;
- Exceptions;
- Notifications;
- report records;
- flow runs;
- team members; and
- other tabular/list registries in the ledger.

Registry contract:

- one owned registry surface;
- one stable identity/action column;
- durable text navigation;
- one utility/search zone;
- consolidated but truthful state facts;
- sticky headers only inside contained scroll;
- direct row destination;
- focus/hover action reveal;
- geometry-matched loading/empty/error/permission states; and
- bounded overflow.

Connected-record contract:

- compact identity and relationship header;
- object-specific lead fact;
- source/decision/outcome sequence where real;
- event chronology;
- linked records;
- action adjacent to consequence; and
- no generic KPI strip unless the record contains genuinely independent
  measures.

Primary route families:

- `app/(app)/customers/**`
- `app/(app)/losses/**`
- `app/(app)/recoveries/**`
- `app/(app)/exceptions/**`
- `app/(app)/orders/**`
- `app/(app)/disputes/**`
- `app/(app)/refunds/**`
- `app/(app)/returns/**`
- `app/(app)/shipments/**`
- `app/(app)/tickets/**`
- `app/(app)/notifications/**`

## 5.5 Reports and analytical surfaces

### Job

An operator must understand the financial bridge, why it reconciles or does
not, what needs attention, and which records support each value.

### Composition

1. Compact route identity and scope strip.
2. Reconciliation status.
3. One `LedgerBridge` per currency:
   - maximum exposure;
   - confirmed loss;
   - recovered cash;
   - final net loss;
   - definitions and record destinations available progressively.
4. One primary analytical chart with a written conclusion.
5. Attention and recovery contribution views.
6. Full stage definitions and record exports as supporting material.

### Specific changes

- remove the duplicate four-metric group below the Evidence Spine;
- promote the Evidence Spine implementation into `LedgerBridge`;
- make the bridge values themselves the headline metrics and drill-down links;
- represent unavailable/partial stages as interrupted or explicitly unknown
  segments, never zero;
- replace ornamental micro-sparklines with one meaningful trend chart or omit
  them;
- directly label ranked and cartesian charts where possible;
- show the analytical conclusion before chart controls;
- keep accessible data tables/disclosures;
- keep every report-range, timezone, currency, export, definition, and record
  link; and
- preserve reconciliation warnings above all optimistic interpretation.

### Primary files

- `components/reporting/IntelligenceReportView.tsx`
- `components/reporting/DashboardCharts.tsx`
- `components/reporting/reportChartModel.ts`
- `components/charts/authenticated/**`
- `components/reports/ExportMenu.tsx`
- `app/(app)/reports/**`

### Acceptance

- no headline financial value is repeated without a distinct analytical role;
- the bridge tells the financial story in under five seconds;
- warnings and unavailable values cannot be mistaken for healthy zeroes;
- every value links to its supporting record scope;
- charts remain keyboard-readable and expose exact values; and
- the first analytical chart begins within the 1280×800 viewport.

## 5.6 Rules, Flows, and builders

### Job

An operator must understand the ordered logic, change it safely, test it, and
publish with a clear view of version and consequence.

### Composition

- compact builder identity, state, version, and ownership;
- ordered rule/flow sequence as the dominant canvas;
- condition/action rows joined by sequence, not independent cards;
- focused editing region;
- validation adjacent to the affected field or step;
- simulation/test result in a connected preview;
- persistent dirty-state indicator;
- ActionDock for save/publish/rollback;
- version history as a supporting ledger; and
- run detail as a readable event sequence rather than terminal output.

### Specific changes

- consolidate card-like condition blocks into joined sequence rows;
- use numbering and connector geometry only where order is real;
- distinguish draft, published, invalid, and stale states without colour alone;
- keep rule effect and consequence visible while editing;
- keep preview readable at 1280 and stack it below at 1024;
- use a structured input/output tree with copy affordances for run detail;
- preserve reorder, simulate, test, save, publish, rollback, version, and run
  destinations; and
- preserve keyboard reorder and focus restoration.

### Primary files

- `app/(app)/rules/**`
- `app/(app)/flows/**`
- `components/rules/**`
- builder-related styles in `styles/authenticated/composition.css`

## 5.7 Integrations — source connection ledger

### Job

An operator must know which evidence roles are covered, source health,
freshness, authority, and the next legitimate connection action.

### Composition

1. Coverage summary by evidence role:
   - commerce;
   - helpdesk;
   - fulfilment/warehouse;
   - returns;
   - tracking;
   - extension/host.
2. Connection ledger rows:
   - provider;
   - role;
   - connection state;
   - freshness/last sync;
   - authority or limitation;
   - next action.
3. Provider detail:
   - setup or connection state;
   - recent sync/verification;
   - evidence made available;
   - failure recovery;
   - dangerous/disconnect action.

### Specific changes

- replace equal provider tiles with evidence-role grouping;
- retain provider brand assets without letting logos dominate;
- make `connected`, `partially connected`, `requires attention`, `not
  applicable`, and `unavailable` distinct;
- join live verification with the provider row it updates;
- expose sync recency without a separate generic health card;
- preserve connect, install, OAuth, key entry, sync, verify, rotate,
  disconnect, applicability, import, and ShipBob selection behaviour; and
- retain truthful development-preview separation.

### Primary files

- `app/(app)/integrations/**`
- `components/integrations/**`
- `components/settings/ConnectorSetupShell.tsx`
- provider-specific settings clients

## 5.8 Settings and administration — configuration document

### Job

An administrator must understand the setting group, make a precise change,
know whether it is saved, and distinguish ordinary configuration from
destructive or security-sensitive actions.

### Composition

- 204px grouped local rail at `>=1280`;
- compact grouped in-flow navigation below 1280;
- one `680–720px` configuration document;
- section headings with short descriptions only when needed;
- fields aligned to natural content width rather than always full width;
- inline save ownership;
- dirty/saving/saved state adjacent to the action;
- audit/security facts as ledger rows;
- destructive region separated by space and a seam, not an alarming card; and
- dialogs only for confirmation or irreducibly focused tasks.

### Specific changes

- reduce default settings form measure from `760px` to a maximum `720px`;
- remove repeated page/panel/form-section introductions;
- give short values natural widths;
- use joined field groups;
- show sticky/in-flow save dock only while dirty or saving;
- keep API keys, secrets, webhooks, and deletion states explicit;
- preserve account, team, platform, notifications, API, billing, agreements,
  audit, privacy, connector, password, key, invite, erasure, and bulk-delete
  behaviour; and
- restore focus after every confirmation dialog.

### Primary files

- `app/(app)/settings/**`
- `components/settings/**`
- `styles/authenticated/composition.css`

## 5.9 Notifications, Help, and secondary administration

Notifications:

- use an inbox ledger with unread, source, event, time, and destination;
- group by time only when real;
- remove card treatment per notification;
- preserve mark-read and filtering behaviour; and
- align empty/loading/error states to the same list geometry.

Help:

- lead with search or task groups;
- use a readable documentation measure;
- connect relevant setup/status destinations;
- avoid marketing copy inside authenticated help; and
- preserve support/contact destinations.

Audit/team/secondary records:

- use event/identity ledgers;
- directly align actor, action, target, time, and result;
- keep raw payload or technical detail progressive; and
- never hide permission or failure context.

## 5.10 Landing, demo, pricing, auth, onboarding, and legal

### Landing

First viewport:

- navigation remains 64px;
- active hero content begins by `y=112–128`;
- compact copy column, maximum `12ch` headline;
- real product proof occupies at least 55% of desktop content width;
- proof uses a readable crop or live semantic representation of one real case
  stage, not a miniaturised full dashboard;
- primary and secondary CTAs remain visible;
- assurance copy remains subordinate; and
- no fake browser controls.

Later story:

1. the problem: fragmented evidence and uncontrolled payout decisions;
2. the mechanism: source trace → evidence → recommendation → merchant decision
   → loss/recovery;
3. product proof: real readable screens;
4. control and trust: merchant ownership, provenance, auditability;
5. integrations;
6. workflow/activation;
7. pricing or access action.

Rules:

- no new product claim;
- no fabricated metric or testimonial;
- every screenshot from a real deterministic route;
- annotate proof with semantic callouts outside the screenshot when needed;
- do not overlay decorative labels on top of unreadable product UI; and
- keep public motion limited to stateful disclosure or proof navigation.

### Demo

- mirror the product’s Decision Ledger composition;
- clearly identify fictional/demo data;
- preserve the current walkthrough sequence and CTA destinations;
- show enough content to prove the mechanism without reproducing the whole
  authenticated shell; and
- maintain keyboard and reduced-motion operation.

### Pricing

- keep current prices, terms, and destinations;
- lead with the plan decision, not a huge marketing headline;
- use comparable aligned rows rather than decorative plan cards where
  possible;
- make inclusion, limits, and next action easy to compare; and
- retain legal/commercial qualifiers.

### Auth

- retain the 44/56 split above 960;
- reduce context copy to one concise statement plus a three-step evidence trace;
- align the form vertically with the context focal point;
- keep a maximum 420px form measure;
- preserve password-manager, validation, reset, signup, and return behaviour;
- remove dead vertical space at common laptop heights; and
- collapse cleanly to one form column.

### Onboarding

- frame onboarding as source commissioning, not a generic four-step form;
- left: persistent setup ledger with completed/current/blocked state;
- right: active task without a large empty card;
- show what evidence capability each connection unlocks;
- display a final readiness ledger before completion;
- keep profile, Shopify, helpdesk, skip/continue, OAuth, error, and completion
  behaviour unchanged; and
- retain truthful partial setup.

### Legal and read surfaces

- one readable `65–72ch` document measure;
- quiet in-document navigation where needed;
- clear effective date/version;
- visible relationship to Privacy, DPA, data handling, and pilot terms;
- no product dashboard chrome inside legal reading; and
- preserve exact legal copy and destinations.

### Primary files

- `app/(public)/**`
- `app/(auth)/**`
- `app/onboarding/**`
- `components/OnboardingClient.tsx`
- landing foundation and proof components
- auth shell and form components

## 5.11 Pocket Brief embeds

Applies to:

- Chrome extension popup;
- Zendesk app;
- Gorgias widget;
- other registered helpdesk/host-constrained renders.

Composition:

- first `120px`: case identity, decisive state, amount or risk when present,
  source freshness, and one primary destination/action;
- next: compact evidence trace;
- then: gaps, recommendation, and merchant-control language;
- secondary detail progressively disclosed;
- no desktop dashboard anatomy;
- no horizontal scroll;
- host-native focus and overflow; and
- deterministic disconnected, loading, locked, partial, error, and success
  states.

Build outputs must be regenerated only after the host-size visual pass.

---

## 6. Responsive composition

### 6.1 Authenticated widths

#### `>=1440px`

- 200px expanded navigation unless user preference is collapsed;
- contextual rail may sit beside the dominant object;
- analytical and dossier split layouts allowed;
- primary object must still dominate;
- no empty third column; and
- no rail narrower than its longest required compact label fixture.

#### `1200–1439px`

- 200px expanded navigation;
- supporting rails become inline ledger rows unless the main object retains at
  least `860px`;
- work registry has no internal overflow with standard English fixtures;
- settings local rail appears at `>=1280`;
- charts keep direct labels; and
- ActionDock remains sticky only if it does not reduce the primary column below
  its contract.

#### `1024–1199px`

- 56px compact navigation with accessible hover/focus expansion;
- 20px page gutters;
- no desktop-to-mobile metaphor switch;
- supporting rails stack before or after the main object according to task
  priority;
- tables consolidate facts before enabling local overflow;
- boards retain minimum lane width and scroll inside their owner;
- ActionDock returns to document flow when necessary; and
- no page-level horizontal overflow.

#### `<1024px authenticated`

- retain the existing unsupported-width boundary;
- do not create a parallel mobile authenticated application in this programme.

### 6.2 Public and entry widths

Prove:

- 1440×900;
- 1280×800;
- 1024×900;
- 768×1024; and
- 390×844.

At mobile:

- product proof uses a deliberate crop or compact semantic version;
- navigation remains standard;
- controls retain 44px touch targets where appropriate;
- no desktop split forced into a narrow column;
- no horizontal scroll; and
- legal/read typography remains comfortable.

### 6.3 Embedded dimensions

Use the actual host contracts:

- Chrome popup approximately `360px`;
- helpdesk rail approximately `300–360px`;
- test constrained height and internal scroll;
- test 1.35× labels;
- test missing provider asset;
- test host theme where supported; and
- never rely on viewport-wide fixed overlays.

---

## 7. States, content ranges, and accessibility

Every changed archetype must implement and visually verify:

- loading;
- first-run;
- empty;
- populated typical;
- populated dense;
- long content;
- partial/stale;
- unavailable;
- permission denied;
- entitlement locked;
- inline validation;
- recoverable error;
- destructive confirmation;
- success/recorded outcome;
- not found;
- dark;
- reduced motion;
- forced colours;
- keyboard;
- 200% zoom; and
- text-spacing override.

### 7.1 Long-content fixtures

- merchant/customer/provider: `40 characters`;
- work title: `90 characters`;
- supporting description: `140 characters`;
- case label: `80 characters`;
- source reference/hash: `32+ characters`;
- financial value: `£1,234,567.89`;
- currency: GBP, USD, EUR, plus long ISO presentation;
- navigation label: `1.35×` English length;
- error explanation: `220 characters`;
- evidence facts: `0`, `1`, `8`, and `24`; and
- chart series: minimum, typical, and maximum supported counts.

### 7.2 Accessibility contracts

- all state distinctions survive without colour;
- focus order follows visual order;
- sticky regions never obscure focus;
- focus restores after dialog/drawer closure;
- chart data remains available in text/table form;
- source traces use semantic lists or descriptions;
- text tabs use correct current-state semantics;
- action reveal does not make actions keyboard-invisible;
- status announcements are concise and non-duplicative;
- forced colours retain owning perimeters and selected/current state;
- reduced motion preserves causality; and
- 200% zoom introduces local scroll only inside explicit owners.

---

## 8. Exhaustive coverage map

The existing ledger contains:

- 65 page modules, including the development case-detail lab;
- 7 layouts;
- 95 route-state boundary modules;
- 53 named nested view/overlay modules;
- 21 additional stateful view owners; and
- 4 non-route embedded surfaces.

The categories overlap and resolve to **245 independently visible owners**.
Every owner remains in scope.

### 8.1 Page-module ownership

| Route family | Phase |
|---|---|
| `/dashboard` | `DL-02` |
| `/work`, `/exceptions` | `DL-03` |
| `/claims`, `/claims/[id]` | `DL-04` |
| `/customers/**`, `/losses/**`, `/recoveries/**` | `DL-05` |
| `/orders/**`, `/disputes/**`, `/refunds/**`, `/returns/**`, `/shipments/**`, `/tickets/**` | `DL-05` |
| `/reports`, `/reports/records` | `DL-06` |
| `/rules/**`, `/flows/**` | `DL-07` |
| `/integrations/**`, `/settings/**` | `DL-08` |
| `/notifications`, `/help` | `DL-09` |
| `/login`, `/signup`, `/reset/**`, `/onboarding` | `DL-10` |
| `/`, `/landing`, `/demo`, `/pricing`, `/legal/**` | `DL-10` |
| `/dev/design-system`, integration dev preview, case prototype lab | `DL-01` and final retirement decision in `DL-13` |

### 8.2 Layout ownership

| Layout | Phase |
|---|---|
| Root and authenticated layouts | `DL-01` |
| Settings layout | `DL-08` |
| Auth and onboarding layouts | `DL-10` |
| Public layout | `DL-10` |
| Internal pass-through layout | `DL-13` coverage proof |

### 8.3 Boundary ownership

Every `loading.tsx`, `error.tsx`, `not-found.tsx`, and global boundary is owned
by the same phase as its route family. Shared authenticated/global boundaries
are owned by `DL-01` and confirmed again in `DL-12`.

No boundary may retain the geometry of the previous archetype after its page
family changes.

### 8.4 Nested views, overlays, and state owners

- case drawers, review rails, investigations, payout evidence, and decision
  views: `DL-04`;
- customer/loss/recovery connected views: `DL-05`;
- chart tooltips, data disclosures, export menus: `DL-06`;
- builder drawers, version workbenches, simulation/test/run views: `DL-07`;
- connector panels, key dialogs, setup previews, settings dialogs, team and
  privacy views: `DL-08`;
- notification/help overlays and secondary administration views: `DL-09`;
- public/auth/onboarding state owners: `DL-10`;
- extension/helpdesk views: `DL-11`;
- shared modal, drawer, menu, toast, tooltip, skeleton, empty, and error
  primitives: `DL-01` and `DL-12`.

### 8.5 Ledger maintenance

At `DL-00`, add a companion `DL phase` and `DL archetype` mapping without
duplicating the inventory.

The coverage checker must fail when:

- a visible owner has no `DL` phase;
- an owned path is deleted without a recorded retirement;
- a new page/boundary/view/embedded owner is absent;
- a completed phase contains an unchecked owner; or
- a route is mapped to more than one implementation phase.

---

## 9. Implementation programme

| Phase | Outcome | Calibration |
|---|---|---|
| `DL-00` | Freeze baseline, reconcile authority, map all 245 owners | Docs, tokens, coverage |
| `DL-01` | Build Decision Ledger primitives and reduce shared chrome | Design system, shared states |
| `DL-02` | Recompose Dashboard as a financial position instrument | Dashboard |
| `DL-03` | Recompose Work as one queue forecast and registry | Work, Exceptions |
| `DL-04` | Recompose Cases registry and case dossier | Cases, case detail |
| `DL-05` | Roll registry/dossier grammar through connected records | Customer, loss, recovery, objects |
| `DL-06` | Remove analytical duplication and rebuild report hierarchy | Reports, charts, records |
| `DL-07` | Recompose Rules and Flows as ordered builders | Rules, flows, runs |
| `DL-08` | Recompose Integrations and Settings | Sources, configuration, admin |
| `DL-09` | Recompose Notifications, Help, and secondary administration | Inbox, read, audit |
| `DL-10` | Recompose public, auth, onboarding, pricing, and legal | Landing, entry, read |
| `DL-11` | Recompose Pocket Brief surfaces and rebuild packages | Chrome, Zendesk, Gorgias |
| `DL-12` | Complete states, accessibility, dark, motion, and long-content proof | Cross-product |
| `DL-13` | Hard cutover, capture, finish review, and screenshot approval | All 245 owners |

### DL-00 — Authority and baseline

Deliver:

- update `DESIGN.md` and sidecar to implemented truth;
- resolve active-authority references;
- add `DL` mapping to all 245 owners;
- record current calibration captures;
- record the dashboard first-viewport, Work local-overflow, Reports duplicate,
  and landing proof-scale findings;
- freeze public proof and demo fixtures;
- make no UI change.

Complete when documentation, tokens, sidecar, and active verification agree.

### DL-01 — Shared Decision Ledger system

Deliver:

- `DecisionHeader`;
- `LedgerBridge`;
- `SourceTraceRow`;
- `DecisionSentence`;
- `ScopeStrip`;
- `RecordedOutcome`;
- `ActionDock`;
- reduced page/panel chrome;
- text-tab navigation contract;
- direct chart-label contract;
- joined state geometry;
- design-system gallery examples; and
- focused component/a11y tests.

Do not roll route families until the gallery proves:

- minimum/typical/maximum content;
- light/dark/forced colours;
- keyboard and reduced motion;
- 1440/1280/1024; and
- no nested-card regression.

### DL-02 through DL-11

For each route phase:

1. migrate the calibration route;
2. inspect all required widths/states in one bounded browser pass;
3. fix the complete observed batch;
4. confirm once;
5. migrate remaining owners in that archetype;
6. run focused checks;
7. update the coverage mapping; and
8. stop.

Do not reopen completed archetypes for subjective micro-polish unless a later
shared change creates a concrete regression.

### DL-12 — Cross-product finish

One bounded pass for:

- loading/empty/error geometry;
- permissions and entitlements;
- long labels and values;
- 200% zoom;
- keyboard/focus;
- dark;
- forced colours;
- reduced motion;
- overlay clipping/layering;
- sticky-region occlusion;
- page and local overflow;
- host constraints; and
- public mobile composition.

Fix once, confirm once, stop.

### DL-13 — Hard cutover

Requirements:

- no parallel legacy/Decision Ledger component branch;
- no route-specific copied ledger primitive;
- no dead page shell;
- no duplicate report metrics;
- no screenshot-only renderer;
- no undocumented visual token;
- no obsolete visual-authority failure;
- all 245 owners checked;
- functional parity passes;
- production build passes;
- final captures pass;
- real product-proof images regenerate from production routes;
- Chrome and helpdesk packages rebuild; and
- independent Impeccable finish review returns `ship`.

---

## 10. File strategy

### 10.1 Likely shared ownership

- `DESIGN.md`
- `.impeccable/design.json`
- `components/ui/PageFrame.tsx`
- `components/authenticated/**`
- `components/workbench/**`
- `components/ui/DataTable.tsx`
- `components/ui/RegistrySurface.tsx`
- `components/charts/authenticated/**`
- `styles/authenticated/tokens.css`
- `styles/authenticated/typography.css`
- `styles/authenticated/surfaces.css`
- `styles/authenticated/composition.css`
- `styles/authenticated/tables.css`
- `app/globals.css`

### 10.2 New shared files

Use the existing folder structure. Suggested placement:

- `components/authenticated/DecisionHeader.tsx`
- `components/authenticated/LedgerBridge.tsx`
- `components/authenticated/SourceTraceRow.tsx`
- `components/authenticated/DecisionSentence.tsx`
- `components/authenticated/ScopeStrip.tsx`
- `components/authenticated/RecordedOutcome.tsx`
- `components/authenticated/ActionDock.tsx`

If two primitives remain trivial wrappers after their second consumer, merge
them rather than preserving a ceremonial abstraction.

### 10.3 Do not introduce

- `components/v3`;
- a `decision-ledger.css` override sheet loaded after all existing styles;
- a new global token namespace;
- route-local copies of shared primitives;
- a new icon set;
- a charting library solely for this iteration;
- an animation dependency;
- a screenshot flag;
- mocked screenshot-only data;
- a public-only fake product shell; or
- a second dark-mode system.

---

## 11. Verification and evidence

### 11.1 Calibration captures

Authenticated:

- `/dashboard`
- `/work`
- `/claims`
- one populated `/claims/[id]`
- one populated customer detail;
- one populated recovery detail;
- `/reports`;
- one rule builder;
- one flow builder;
- `/integrations`;
- `/settings/account`;
- `/notifications`.

Public/entry:

- `/landing`;
- `/demo`;
- `/pricing`;
- `/login`;
- `/signup`;
- `/onboarding`;
- one legal page.

Embedded:

- one populated Chrome popup;
- disconnected Chrome popup;
- one populated Zendesk/Gorgias brief;
- locked/error helpdesk brief.

### 11.2 Viewports

Authenticated:

- `1440×900`;
- `1280×800`;
- `1024×900`.

Public/entry:

- `1440×900`;
- `1280×800`;
- `1024×900`;
- `768×1024`;
- `390×844`.

Embedded:

- exact host widths and representative short/tall heights.

### 11.3 Maintained hard gates

Use maintained equivalents of:

```text
npm run typecheck
npm run lint:authenticated-design
npm run verify:apple-quality
npm run verify:ui-parity
node scripts/visual-rebuild/check-coverage-ledger.mjs
npm run build
```

Also run:

- focused component tests for changed primitives;
- focused route tests for each phase;
- accessible-name/focus tests for text tabs and action reveal;
- chart accessibility tests;
- extension build/package verification;
- Zendesk/Gorgias packaging checks; and
- one production-route browser matrix after the optimized build.

Do not use the obsolete `verify:living-precision` programme as a completion
gate. Replace its still-useful route-inventory assertion with the maintained
coverage checker, and keep historical programme files intact.

### 11.4 Visual inspection protocol

For each phase:

1. build the full owned change;
2. capture all relevant widths in one round;
3. judge dominant object, scan path, duplication, overflow, state truth, and
   action continuity;
4. batch all material fixes;
5. recapture once;
6. record unresolved issues;
7. stop.

No open-ended polishing loop.

---

## 12. Acceptance scorecard

Every calibration surface must score at least `4`, with no `1–3` in the
non-negotiable dimensions.

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Dominant object | Several competing frames | One primary region | Purpose and next action are unmistakable |
| Product specificity | Generic SaaS anatomy | Evidence language is present | Provenance and merchant control shape the composition |
| Information economy | Values/copy repeat | Mostly concise | Every visible element adds a distinct decision role |
| Scan path | Eye searches across cards | General hierarchy works | Identity → evidence → decision → outcome reads immediately |
| Control hierarchy | Button/pill soup | Primary action exists | Scope, utilities, and commit actions are clearly separate |
| Financial clarity | Numbers lack relationship | Values are correct | Causal bridge and uncertainty are immediately legible |
| Responsive quality | Collision/overflow | Operable compromise | Authored at 1440, 1280, and 1024 |
| State truth | Missing appears healthy | Main states covered | Partial, stale, unavailable, and error remain unmistakable |
| Interaction continuity | Actions feel detached | Feedback exists | Result is recorded locally with consequence and destination |
| Accessibility | Material blocker | Automation passes | Keyboard, zoom, forced colour, and reduced motion feel native |
| Public proof | Claims outweigh evidence | Real screen shown | Product proof is readable, decisive, and primary |
| Craft | Polished template | Coherent product | Instrument-grade alignment, density, and restraint |

Automatic rejection:

- duplicate headline values;
- nested card stack around the dominant object;
- page-level overflow at a supported width;
- missing destination or mutation;
- decorative gradient/glass/glow;
- product proof that cannot be read at capture size;
- semantic state conveyed only by colour;
- unknown rendered as zero;
- focus obscured by sticky UI; or
- a screenshot-only visual branch.

---

## 13. Boundaries

This programme does not change:

- product logic;
- recommendations;
- financial definitions;
- responsibility logic;
- recovery logic;
- database schema;
- API contracts;
- permissions;
- entitlements;
- audit semantics;
- mutations;
- routes;
- redirects;
- deep links;
- URL query state;
- saved views;
- exports;
- browser history;
- prices;
- legal copy;
- product claims;
- supported providers;
- the below-1024 authenticated boundary; or
- merchant ownership of final decisions.

It must not:

- infer missing facts;
- turn stale or partial data into healthy presentation;
- hide operational complexity solely for visual cleanliness;
- remove exact values from accessible chart alternatives;
- replace standard browser affordances with custom interaction;
- create a parallel mobile authenticated product; or
- trade keyboard, zoom, contrast, or host support for screenshot quality.

---

## 14. Definition of done

The Decision Ledger iteration is complete only when:

- `DL-00` through `DL-13` are complete;
- all 245 visible owners have one phase and one archetype;
- Dashboard shows its primary object by `y=170` and two attention rows within
  the first 1280×800 viewport;
- Work has no internal table overflow at 1280/1440 standard fixtures;
- Reports presents headline financial values once;
- case detail joins evidence and decision into one legible dossier;
- registries use one stable navigation and utility hierarchy;
- builders show order, validation, version, and commit consequence;
- integrations read as evidence coverage rather than a provider-card gallery;
- settings read as compact configuration documents;
- landing proof is readable and visually primary;
- auth/onboarding contain no unnecessary empty-height composition;
- Pocket Brief surfaces establish the decisive state within the first 120px;
- loading, empty, error, partial, stale, locked, long-content, dark,
  reduced-motion, forced-colour, keyboard, and 200% zoom states pass;
- every destination and interaction category remains represented;
- no legacy visual branch or undocumented token remains;
- the production build and maintained verification gates pass;
- the deterministic screenshot set is approved; and
- the final independent finish review returns `ship`.

No additional visual-direction decision is required before implementation.
