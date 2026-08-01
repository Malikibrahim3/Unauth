# IMPL — Dashboard Overview decision-surface iteration

- **Status:** Implemented and verified
- **Date:** 31 July 2026
- **Route:** `/dashboard`
- **Visual scope:** authenticated Overview only
- **Code scope:** dashboard components, dashboard reporting projection, dashboard
  loading state, and dashboard tests
- **Product authority:** [`PRODUCT.md`](PRODUCT.md)
- **Design authority:** [`../DESIGN.md`](../DESIGN.md)
- **Previous iteration:** [`IMPL_dashboard_overview_polish_iteration.md`](IMPL_dashboard_overview_polish_iteration.md)
- **Critique evidence:** [`Dashboard Overview design critique`](../.impeccable/critique/2026-07-30T23-21-59Z__components-dashboard-dashboardoverview-tsx.md)
- **Visitor mode:** Operate
- **Creative direction:** **The Decision Briefing**

This document makes the outstanding decisions from the dashboard critique. No
further visual-direction decision is required before implementation.

Implementation verification completed on 31 July 2026:

- visual QA passed at the 1280px desktop viewport and the supported 1024×900
  boundary, with no horizontal overflow;
- the Payout Position composition remains horizontal at 1024px;
- dashboard model, reporting, export, and component tests pass;
- TypeScript, project lint, and the authenticated-design guard pass; and
- the live authenticated route produced no application runtime errors.

---

## 1. Executive decision

The next dashboard pass will prioritise **operational truth and trust**, cover
all five priority problems from the critique, and use a **transparent composite
priority model** for the attention list.

The dashboard will be rebuilt around one sentence:

> Here is the money at risk, what changed, the exact work to act on, and why
> these values are safe to use.

The target is not a more decorative dashboard. The target is a more authored,
more decisive product surface whose visual impact comes from:

- a single, unmistakable financial position;
- a coherent relationship between active, action-needed, and decision-ready
  cases;
- an analytical timeline that already says something useful at rest;
- transparent operational prioritisation;
- explicit data confidence and recovery paths; and
- a compact composition that completes its story in the first desktop
  viewport.

### Fixed choices

1. **Outcome:** operational truth and trust first.
2. **Priority logic:** review-SLA risk, decision readiness, and value at issue,
   combined through a documented formula and shown through plain-language
   reasons rather than an unexplained score.
3. **Scope:** all five priority issues, plus the supporting header, controls,
   metric-definition, dark-mode, and state refinements required to make them
   coherent.
4. **Visual world:** retain the Quiet Evidence Desk and Payout Position
   foundation. This is a decisive refinement, not a replacement design system.
5. **Platform interpretation:** use Apple’s discipline—clarity, restraint,
   direct manipulation, legible hierarchy, and state quality—without imitating
   macOS or iOS chrome.

### Quality bar

The completed route should feel like a 9/10 operational product surface at
1440×900, 1280×800, and the supported 1024×900 boundary. A repeat critique
should target at least **34/40**, with no heuristic below 3 and no unresolved P1
information-design issue.

---

## 2. What the current version gets right

The current Payout Position iteration is the foundation, not the
anti-reference. Preserve:

- one dominant financial canvas rather than KPI-card soup;
- independent exposure, recovered, prevented, and realised-loss values;
- explicit currency and truthful `Unavailable` states;
- deterministic chart aggregation;
- comparison, export, reports, records, Work, and operation destinations;
- data provenance and reconciliation visibility;
- keyboard access, reduced-motion handling, forced-colour support, and dark
  mode;
- read-only dashboard behaviour; and
- the existing global shell and navigation.

The implementation should change the meaning and composition of existing
parts before introducing new visual furniture.

---

## 3. Job, audience, and success

### Primary audience

A merchant operator or operations lead opening Overview during active case
work. They are time-constrained, financially cautious, and need to know whether
the dashboard can support a decision without reconstructing relationships
between separate counts and warnings.

### Primary job

Within five seconds, answer:

1. What is the selected financial position?
2. What changed during the selected period?
3. How many cases are active, need action, and are ready now?
4. Which work should be considered first, and why?
5. Which values are complete, qualified, or unavailable?

### Success in the first viewport

At every supported desktop width, the viewer can identify:

- period and currency;
- the lead financial value, shown once;
- a useful comparison or peak-period conclusion;
- the explicit relationship between active, action-needed, and ready cases;
- an honest next action;
- the leading attention item; and
- separate source-freshness, ledger-validation, and decision-scope states.

### Product proof

A static screenshot must remain useful without hover, focus, an open modal, or
marketing-only data. It should demonstrate Unauth’s differentiator: evidence
and financial confidence are explained together, but never collapsed into a
single vague health score.

---

## 4. Scope and boundaries

### In scope

- page heading and dashboard-only reporting controls;
- Payout Position information hierarchy and copy;
- metric selection and definitions;
- lead case-count contract and primary action;
- timeline summary, peak annotation, direct inspection, and keyboard model;
- reconciliation qualifier inside Payout Position;
- What needs attention content, ranking, and destinations;
- Data trust information architecture and detail overlay;
- responsive composition at 1440, 1280, and 1024;
- dashboard loading, empty, error, partial, and stale states;
- dashboard reporting data needed to support truthful priority and trust
  states;
- deterministic capture data used on the real route; and
- dashboard-specific tests and visual evidence.

### Out of scope

- global sidebar or utility-toolbar redesign;
- Work, Cases, Reports, Integrations, or record-detail redesign;
- changes to financial definitions or business ledgers;
- automatic decisions, refunds, denials, recovery actions, or case mutation;
- a new global design system or parallel component library;
- mobile-app patterns, native-window chrome, traffic lights, docks, sheets, or
  segmented iOS controls;
- gradients, glass, blur, ambient glow, decorative shadows, or animated
  ornament;
- screenshot-only branches, hidden warnings, or hard-coded marketing markup;
  and
- converting missing, stale, partial, or unreconciled values to zero or
  healthy.

---

## 5. The five priority problems and their decisions

### Decision 1 — The work story gets one contract

**Current problem:** `Review 15 cases`, `3 ready`, and `17 open` appear close
together without exposing their relationship.

**Decision:** establish one canonical hierarchy:

> 17 active · 15 need action · 3 of those are ready now

The figures are computed from the same period-scoped case set:

- **Active:** every non-final, non-snoozed case in the selected reporting
  period.
- **Needs action:** active cases in `new`, `evidence_needed`,
  `ready_for_decision`, `manual_review`, `open`, or `escalated`, including
  normalised legacy equivalents.
- **Ready now:** the subset of needs-action cases in `ready_for_decision` or
  legacy `open`.
- **Waiting:** active cases in `awaiting_*` or `pending`.
- **In progress:** active cases in `decision_recorded` or `recovery_opened`.

The model must guarantee:

```text
active = needs action + waiting + in progress
ready now ⊆ needs action
```

Completed and snoozed cases do not enter the active hierarchy.

The primary button becomes **Open work** and keeps its truthful `/work`
destination. It no longer claims to open an exact case subset that the
destination does not preserve. When ready cases exist, adjacent context states:

> 3 ready for decision

The exact status rows in What needs attention retain their period-scoped record
destinations. This resolves the mismatch without expanding the Cases or Work
route scope.

### Decision 2 — Data trust separates unrelated states

**Current problem:** a source-freshness percentage and a ledger-reconciliation
diagnosis combine into phrases such as `0% Ledger review required`.

**Decision:** remove the combined trust score. Data trust always presents three
independent axes:

1. **Source freshness** — percentage current, current count, stale count, and
   the source most in need of refresh.
2. **Ledger validation** — passed, needs review, or unavailable, with issue
   count.
3. **Decision-safe scope** — complete, qualified, or unavailable, with a plain
   statement of what remains usable.

Source freshness must be calculated without a reconciliation parameter.
Ledger validation must never alter the freshness label or percentage.

### Decision 3 — Timeline navigation becomes one efficient interaction

**Current problem:** each bucket is a normal tab stop, creating ten or more
stops in the core chart.

**Decision:** use a roving-focus model with one bucket in the page tab order:

- Tab enters the chart once.
- Left and Right move by one bucket.
- Home and End move to the first and last bucket.
- Enter or Space pins or unpins the current bucket.
- Escape clears a pin and restores the period summary.
- A visible `View data` action before the plot opens the accessible table and
  moves focus to it.

Pointer movement may update the visual readout, but must not trigger a verbose
live-region announcement. Keyboard changes use one concise, atomic polite
announcement.

### Decision 4 — The timeline is informative before interaction

**Current problem:** the timeline’s static state says only `Focus or point…`,
so screenshots and first-time users receive no analytical value.

**Decision:** make the idle readout the default insight:

```text
30 days · 3-day intervals
Peak £352.18 · 25–27 Jul
18.4% lower than the previous period
```

The exact content adapts truthfully:

- show the bucket basis for every range;
- show the highest known interval and its date range;
- show a valid comparison conclusion when available;
- show `Comparison unavailable` rather than inventing a percentage;
- show the selected metric definition when no comparison is requested; and
- never call an incomplete or unknown interval zero.

Interaction deepens an already useful reading; it does not activate the chart
from an empty state.

### Decision 5 — The 1024px composition remains an overview

**Current problem:** the Payout Position stack consumes almost the full
1024×900 viewport and leaves the viewer on a warning.

**Decision:** retain the two-region Payout Position composition at the 1024px
supported boundary. Do not stack the financial reading above the chart until
below the supported desktop width.

At 1024×900, the first viewport must include:

- page identity and controls;
- the complete lead financial reading;
- the informative timeline summary and plot;
- the financial confidence qualifier;
- the What needs attention heading and first row; and
- the compact three-axis Data trust summary.

The full attention list and trust details continue below. Information is
compacted, not removed.

---

## 6. Final information architecture

```text
Overview                                      [Reports ▾]
3 cases are ready for decision; source data needs attention.
[Period] [Comparison] [Currency]                         [Updating…]

┌─ Payout position ───────────────────────────────────────────────────┐
│ [Exposure] [Recovered] [Prevented] [Realised loss]                 │
│                                                                    │
│ Payout exposure                 30 days · 3-day intervals           │
│ £1,589.65                       Peak £352.18 · 25–27 Jul             │
│ Known current exposure          18.4% lower than previous period    │
│                                                                    │
│ 17 active · 15 need action · 3 ready now     financial timeline    │
│ [Open work]  3 ready for decision             direct inspection    │
│                                                                    │
│ Validated ledger values only · 1 issue needs review     [Review]   │
└────────────────────────────────────────────────────────────────────┘

┌─ What needs attention ───────────────────┐  ┌─ Data trust ─────────┐
│ Ordered by SLA, readiness and GBP value  │  │ Source freshness     │
│ Ready for decision   3  £420  Ready now  │  │ 82% current          │
│ Manual review        5  £615  2 overdue  │  │ Ledger validation    │
│ Evidence needed      7  £270  1 overdue  │  │ Passed               │
│                                          │  │ Decision-safe scope  │
│                              [Open work] │  │ Financial totals safe│
└──────────────────────────────────────────┘  └──────────────────────┘
```

The topology is intentionally familiar and browser-native. The distinction
comes from the quality of the operating statement, count contract, analytical
readout, priority reasons, and confidence model.

---

## 7. Section specification

### 7.1 Page heading

Keep `Overview` as the H1.

Replace the generic subtitle with a generated operating statement:

- Ready cases and trust issue:
  `3 cases are ready for decision; connected source data needs attention.`
- Action cases and healthy trust:
  `15 cases need merchant action; displayed financial values reconcile.`
- No active work:
  `No merchant decisions are waiting; connected sources are current.`
- Financial data unavailable:
  `Case work is available; the financial position cannot be verified yet.`

Rules:

- one sentence;
- no repetition of the lead financial amount;
- no more than two facts;
- no severity language unless the underlying state warrants it; and
- use singular/plural correctly.

### 7.2 Reporting controls

Compose period, comparison, and currency as one reporting instrument. Put the
full Reports destination and export choices inside one compact `Reports` menu
aligned with it. This keeps the opening to four visible choices.

Order:

1. period;
2. comparison;
3. currency;
4. Reports menu:
   - Open full reports;
   - Export current view.

When a URL-backed query changes:

- start a local transition;
- keep the current result visible;
- disable only the affected controls;
- show `Updating…` after a short anti-flicker delay;
- expose the state through a polite live region; and
- restore controls without moving focus when navigation completes.

Comparison remains disabled for all-time scope with an explicit accessible
reason.

### 7.3 Payout Position header and metric selection

Keep the section title `Payout position`.

Use a single selected treatment for the metric switcher: stronger text plus
one precise underline. Remove the filled selected wash.

The selected metric’s existing definition is always visible:

- Payout exposure — `Known current exposure in this period`
- Recovered — `Received and reconciled`
- Prevented — `Not paid after review`
- Realised loss — `Ledger-confirmed merchant loss`

Do not hide these definitions in hover-only tooltips.

### 7.4 Lead financial reading

Show the selected financial value once, at exceptional scale.

Supporting order:

1. metric label;
2. lead value;
3. metric definition or valid comparison;
4. scope: period, currency, and total period cases;
5. active/action/ready hierarchy;
6. actions; and
7. ledger provenance.

The supporting outcomes remain one restrained sentence or definition list.
They must not become equal cards.

#### Count presentation

Use a joined, readable phrase:

> 17 active · 15 need action · 3 of those are ready now

Critical relationships cannot be pushed into tertiary metadata.

#### Actions

- Primary: `Open work`
- Supporting context when ready cases exist:
  `{n} ready for decision`
- Financial drill-down: `View records`

At most one filled primary button appears in the canvas.

#### Provenance

Use:

> Validated ledger values · generated 30 July 2026

When qualified:

> Validated entries only · generated 30 July 2026

`Generated` describes report creation, not source freshness. Never imply that
the generation timestamp proves every source is current.

### 7.5 Financial timeline

#### Idle summary

The idle state contains:

- selected range;
- aggregation basis;
- highest known interval;
- its date label;
- the exact peak value; and
- comparison conclusion or selected metric definition.

Bucket labels:

- 7 days — `Daily intervals`
- 30 days — `3-day intervals`
- 90 days — `Weekly intervals`
- All time — `Monthly intervals`

#### Peak annotation

Attach the peak label to its leader and include both date and value:

> 25–27 Jul · £352.18

Avoid a detached `Peak £352.18` badge.

If multiple buckets share the peak, label the most recent one and expose the
tie in the accessible summary.

#### Direct inspection

On pointer or roving keyboard focus, the readout changes to:

```text
25–27 Jul
Payout exposure £352.18 · Recovered £74.20 · Previous £431.90
```

Pinning retains the selected interval after pointer exit. A visible selected
rule connects the readout and bucket without creating a broad coloured wash.

#### Accessibility

- one bucket in the page tab order;
- Left/Right/Home/End navigation;
- Enter/Space pinning;
- Escape reset;
- concise keyboard instructions associated through `aria-describedby`;
- no mouse-hover live announcements;
- a pre-plot `View data` action;
- table values and bucket boundaries exactly match the visual; and
- forced-colour mode preserves current, comparison, selected, and focus states.

### 7.6 Financial confidence qualifier

Replace the large amber reconciliation strip with a compact qualifier joined to
the bottom of Payout Position.

States:

- **Complete:** `All displayed financial totals reconcile.`
- **Qualified:** `Only validated ledger values are shown; 1 issue needs
  review.`
- **Unavailable:** `The financial position cannot be verified from the current
  ledger data.`

The qualifier must state consequence before diagnosis and provide `Review
details` when an issue exists.

Use semantic warning colour on the icon and key phrase, not as a full-width
muddy background plane. The lead amount is visually qualified when the selected
metric itself is affected.

### 7.7 What needs attention

#### Content model

Continue to use period-scoped operational states, but enrich each active
operation with:

- case count;
- overdue count;
- approaching-SLA count;
- ready-for-decision count;
- oldest case timestamp;
- selected-currency known exposure;
- number of cases whose exposure is unavailable; and
- exact period-scoped records destination.

No currency values may be combined. The attention section uses the dashboard’s
selected currency and labels that basis.

#### Transparent priority model

For each active operation, calculate:

```text
deadline component =
  (2 × overdue cases + approaching-SLA cases)
  ÷ highest weighted deadline total across all active operations in scope

readiness component =
  ready-for-decision cases
  ÷ highest ready-for-decision total across all active operations in scope

value component =
  known selected-currency exposure ÷ highest known operation exposure

priority =
  50% deadline component
  + 30% readiness component
  + 20% value component
```

Rules:

- the known selected-currency amount is a lower bound when an operation also
  has unvalued cases;
- unknown exposure stays unknown and contributes no invented value;
- omit any component whose denominator is zero or unavailable, then renormalise
  the remaining weights proportionally;
- if all three components have no signal, sort by total count, oldest case,
  then canonical key;
- never compare or convert different currencies;
- stable ties resolve by overdue count, ready count, oldest case, total count,
  then canonical key; and
- the numeric score is an implementation detail and is not shown to users.

Visible explanation:

> Prioritised by review SLA, decision readiness, and GBP exposure.

This makes the ordering inspectable without presenting false-precision points.

#### Row anatomy

Each row contains:

1. operation label;
2. semantically correct support copy;
3. case count;
4. up to two priority reasons;
5. a proportional measure based on the computed priority; and
6. an always-visible destination arrow.

Examples:

- `Ready for decision` — `3 cases can be decided now`
- `Manual review` — `5 cases need merchant review`
- `Evidence needed` — `7 cases need evidence collected`
- `Awaiting carrier response` — `4 cases are waiting on a carrier`
- `Recovery opened` — `2 recoveries are being followed through`

Reason examples:

- `2 overdue`
- `Approaching SLA`
- `At least £615.40 exposure`
- `3 ready now`
- `No GBP value for 2`

Remove decorative rank numbers. Show no more than four rows before `Open work`;
remaining operations continue in the destination surface.

### 7.8 Data trust

Data trust becomes a compact three-row inspector, not a score card.

#### Source freshness

Display:

- `{n}% current` or `Unavailable`;
- `{current} current · {stale} stale`;
- a thin freshness track when a denominator exists; and
- the highest-impact stale source and direct source destination.

Freshness thresholds retain their current meaning:

- 90–100%: current;
- 70–89%: some sources need attention;
- below 70%: source freshness needs attention; and
- no denominator: unavailable, never 0%.

#### Ledger validation

Display:

- `Passed`;
- `Needs review · {n} issues`; or
- `Unavailable`.

This axis never displays a percentage.

#### Decision-safe scope

Display one of:

- **Complete:** `Displayed financial totals are reconciled.`
- **Qualified:** `Validated financial values remain usable; connected-source
  activity may be incomplete.`
- **Qualified, ledger issue:** `Only validated ledger values are shown; review
  affected scope before acting.`
- **Unavailable:** `No verified financial value is available in this scope.`

If both source freshness and ledger validation need attention, list both
causes. Do not collapse them into one status.

#### Actions

Choose the most relevant primary text action:

- stale source exists: `Review {source}`;
- ledger issue exists with sources otherwise current: `Review ledger`;
- healthy state: `View details`.

The existing details overlay remains available as a secondary path and is
updated to use the same three-axis structure.

---

## 8. Data and model changes

### 8.1 Reporting projection

Extend the dashboard’s reporting projection without creating a second source of
truth.

The case query adds the fields needed to align with existing active-queue
semantics, including `snoozed_until`. Existing submitted/created/updated dates
and financial summaries provide SLA age and value-at-issue inputs; no
additional per-case request is required.

Coverage rows also gain a scope discriminator:

```ts
scope: 'connected-source' | 'internal'
```

Orders, Tickets, Shipments, Refunds, and Returns are connected-source rows.
Cases is an internal projection. Only connected-source rows contribute to the
Source freshness percentage; the internal case index may remain visible in
details but cannot skew the source result.

Replace the minimal operation row with:

```ts
type DashboardOperationRow = {
  key: string;
  label: string;
  count: number;
  href: string;
  overdueCount: number;
  approachingCount: number;
  readyCount: number;
  oldestOpenedAt: string | null;
  exposureByCurrency: Array<{
    currency: string;
    knownMinor: number;
    knownCaseCount: number;
    unvaluedCaseCount: number;
  }>;
};
```

The implementation may retain the public property name `operations` to limit
call-site churn, but every consumer and fixture must adopt the richer type.

### 8.2 Canonical workflow helpers

Add pure helpers in `dashboardModel.ts` for:

- active/action/waiting/in-progress/ready case totals;
- canonical operation support copy;
- transparent priority calculation;
- selected-currency exposure extraction;
- operating-statement generation;
- chart idle summary and peak selection;
- source freshness independent of reconciliation; and
- decision-safe scope.

Reuse:

- `normalizeLegacyClaimStatus`;
- `isCanonicalFinalClaimStatus`;
- `getClaimSlaState`; and
- existing financial-known-state rules.

Do not introduce a separate dashboard-only status machine.

### 8.3 Structured financial confidence

The dashboard must not infer impact by parsing human-readable issue strings.
Add structured confidence metadata beside the existing issue messages:

```ts
type FinancialConfidence = {
  state: 'complete' | 'qualified' | 'unavailable';
  issueCount: number;
  affectedCurrencies: string[];
  affectedMetrics: FinancialReportMetric[];
  excludedRecordCount: number;
};
```

The issue strings remain available for the detail overlay. The structured
fields decide whether the selected lead value is complete, qualified, or
unavailable.

When precise affected scope cannot be proven, use `qualified`; never infer
`complete`.

### 8.4 Source freshness

Rename the presentation helper from the combined `calculateDataHealth` concept
to a source-specific model such as `calculateSourceFreshness`.

Its inputs are coverage rows only. Its output cannot mention ledger state.

---

## 9. Visual and interaction craft

### Hierarchy

- The selected financial amount remains the only exceptional value.
- The idle analytical conclusion becomes the second visual focal point.
- Case hierarchy and confidence qualifier are readable supporting lines, not
  fine print.
- Attention and trust are peers below the canvas, with attention receiving
  more width.

### Typography

- Keep the established Inter/system stack.
- Use tabular numerals for money, counts, percentages, and chart values.
- Keep the financial lead within the existing 48–56px desktop range.
- Do not enlarge `Overview` into a marketing hero.
- Metric definitions and confidence consequences use body text, not tiny
  metadata.

### Colour

- Violet remains limited to selection, primary interaction, focus, and the
  current chart series.
- Green means reconciled recovery or genuine positive state.
- Amber/critical colour appears only on the affected trust phrase, deadline
  reason, or icon.
- Comparison uses a quiet neutral/violet line subordinate to the current
  series.
- Neutral surface separation comes from tone, spacing, and joins.

### Motion

- Metric changes interpolate chart geometry rather than replaying from zero.
- Readout and selected-rule changes complete in 120–160ms.
- URL-backed control transitions do not fade out the current report.
- No layout movement, hover lift, bounce, glow, or looping motion.
- Reduced motion removes interpolation while preserving immediate state
  changes.

### Dark mode

- Reduce violet chart luminance until the lead amount remains dominant.
- Replace the broad brown warning plane with the same compact qualifier used in
  light mode.
- Validate selected, pointer, keyboard focus, pin, comparison, warning, and
  disabled states together.
- Dark mode is not a palette inversion; it must preserve the same attention
  order.

---

## 10. Responsive contract

### 1440×900

- Payout Position uses approximately 34% reading / 66% timeline.
- At least three attention rows and the complete Data trust inspector are
  visible in the initial viewport.
- Sidebar remains unchanged.

### 1280×800

- Payout Position remains horizontal.
- Supporting copy tightens before controls wrap.
- At least two attention rows and all three trust-axis labels are visible.

### 1024×900

- Payout Position remains horizontal at the supported boundary.
- Plot height reduces to approximately 190–220px.
- Canvas and section padding compact one step.
- Metric selection may scroll horizontally, but the selected metric and its
  definition remain visible.
- The first attention row and the compact three-axis trust summary are visible
  without scrolling.
- No horizontal overflow is permitted.

### Below 1024

The shared unsupported/small-desktop behaviour may stack the canvas. It must
still preserve reading order and functionality, but it is not allowed to
dictate the supported 1024px composition.

Use content pressure to determine wrapping. Do not hide decision-critical
content merely to meet the viewport target.

---

## 11. State matrix

Every state answers:

1. What remains known?
2. What should the operator do next?

### Loading

- keep the final horizontal canvas geometry at supported widths;
- reserve the operating statement, lead value, timeline readout, plot,
  qualifier, first attention row, and three trust rows;
- do not use generic equal skeleton cards; and
- avoid cumulative layout shift when data resolves.

### Query updating

- preserve current content;
- show local `Updating…`;
- disable affected controls only; and
- retain focus.

### No selected-currency financial data

- lead value: `Unavailable`;
- explain that unavailable is not zero;
- retain case-work hierarchy;
- timeline state points to source/records recovery;
- decision-safe scope: unavailable; and
- Work remains usable.

### Empty period

- `No cases were recorded in this period`;
- retain range/currency controls;
- offer a wider period and reports destination;
- do not show a healthy 100% trust state from an empty denominator.

### No active work

- keep the financial position;
- use `No merchant decisions are waiting`;
- replace the attention list with one calm completion state; and
- provide case history as a quiet path.

### Comparison unavailable

- keep the current-period insight and peak;
- say `Comparison unavailable`;
- do not show 0%, a dash that resembles zero, or directional styling.

### Source freshness degraded

- financial ledger state remains independently visible;
- name the stale source and record count;
- explain whether financial totals remain usable; and
- provide the direct source destination.

### Ledger validation degraded

- qualify the affected lead value or series;
- show only values that pass existing known-state and validation rules;
- state issue count and scope;
- provide details; and
- never imply that refreshing a source alone resolves a ledger inconsistency.

### Partial chart data

- show known buckets and mark unavailable buckets distinctly;
- peak is calculated from known values only;
- the summary discloses incomplete interval coverage; and
- table parity is maintained.

### Error

- preserve the dashboard’s spatial hierarchy;
- keep filters available where recovery can succeed;
- name the failed region;
- provide retry or destination recovery; and
- do not collapse the route into a generic centred error panel.

---

## 12. Component and file plan

### Modify

- `components/dashboard/DashboardOverview.tsx`
  - orchestrate the new count, insight, confidence, and priority models;
  - replace generic heading copy;
  - add local query-pending feedback;
  - use the honest action contract; and
  - keep the component focused on composition.

- `components/dashboard/DashboardPositionChart.tsx`
  - add informative idle summary;
  - connect peak label to date and leader;
  - implement roving focus, Home/End, Escape, and pin behaviour;
  - separate visual pointer updates from live announcements; and
  - provide the pre-plot data-table path.

- `components/dashboard/dashboardModel.ts`
  - add count taxonomy;
  - add priority calculation and reason selection;
  - add operating-statement and timeline-summary helpers;
  - separate source freshness from ledger status; and
  - add decision-safe scope.

- `components/dashboard/dashboardPilot.module.css`
  - remove the double metric-selection treatment;
  - implement the compact confidence qualifier;
  - refine priority rows and always-visible affordances;
  - implement the horizontal 1024 composition;
  - rebalance dark-mode warning and chart colour; and
  - preserve reduced-motion and forced-colour behaviour.

- `lib/reporting/intelligence.ts`
  - enrich operation aggregates;
  - align active counts with canonical queue semantics;
  - add structured financial confidence; and
  - preserve existing report/export contracts.

- `components/navigation/skeletons/pageSkeletons.tsx`
  - match the revised dashboard geometry.

- `tests/unit/dashboardModel.test.ts`
  - cover all pure model and priority rules.

- `tests/components/phase07Dashboard.test.tsx`
  - cover rendered hierarchy, trust separation, chart access, actions, and
    degraded states.

### Add only if it improves clarity

- `components/dashboard/DashboardAttention.tsx`
- `components/dashboard/DashboardDataTrust.tsx`

These extractions are approved if they keep Overview readable. They must reuse
the same CSS module and model; they must not become a new component system.

### Do not modify

- global app shell and navigation;
- non-dashboard visual layouts;
- financial calculation meanings;
- case decision behaviour;
- public landing-page markup; or
- authentication and onboarding.

---

## 13. Implementation sequence

### Phase 1 — Truth model

1. Add structured operation and confidence fields to the report.
2. Align active/action/ready counts with canonical queue semantics.
3. Implement source-freshness, decision-scope, priority, and insight helpers.
4. Add unit tests for all formulas, unknowns, currency boundaries, and ties.

**Gate:** no component changes consume the model until the equations and
currency isolation pass.

### Phase 2 — Work and trust contract

1. Replace the heading statement.
2. render the joined active/action/ready hierarchy;
3. rename the primary action to `Open work`;
4. separate the three trust axes;
5. replace the warning band with the confidence qualifier; and
6. update degraded-state copy and actions.

**Gate:** no contradictory counts and no combined health label remain in the
DOM.

### Phase 3 — Timeline signature

1. Add the idle analytical summary and bucket-basis label.
2. Connect peak date/value to the peak bucket.
3. implement one-tab-stop roving focus;
4. add Home/End/Escape and table access; and
5. separate pointer updates from assistive announcements.

**Gate:** the timeline is useful in a static screenshot and efficient from the
keyboard.

### Phase 4 — Attention priority

1. Render the transparent priority order.
2. replace rank numbers with reason evidence;
3. correct support copy per operation;
4. show selected-currency basis and unknown-value coverage; and
5. keep destination arrows visible.

**Gate:** every visible ordering can be explained by the displayed reasons and
documented formula.

### Phase 5 — Composition and finish

1. Recompose controls as one instrument cluster.
2. keep Payout Position horizontal at 1024;
3. compact vertical rhythm at 1280 and 1024;
4. rebalance dark mode;
5. update skeletons; and
6. verify all state variants.

**Gate:** the first viewport meets the responsive contract at every target
size.

---

## 14. Test plan

### Unit tests

Add cases for:

- `active = needs action + waiting + in progress`;
- ready is always a subset of needs action;
- final and future-snoozed cases are excluded from active;
- legacy statuses normalise correctly;
- priority weighting at 50/30/20;
- proportional weight renormalisation when one or more priority components
  have no signal;
- stable priority tie-breaking;
- currency isolation and unknown exposure preservation;
- internal case-index freshness excluded from connected-source freshness;
- source freshness labels unaffected by reconciliation;
- complete, qualified, and unavailable decision-safe states;
- period operating statements;
- bucket-basis labels;
- peak selection including ties and partial data; and
- comparison wording without invented percentages.

### Component tests

Verify:

- one lead financial value;
- explicit active/action/ready relationship;
- primary action says `Open work`;
- ready context does not imply a narrower destination than `Open work`;
- metric definition is visible for the selected metric;
- idle timeline includes basis, date, peak, and value;
- exactly one chart bucket has `tabIndex=0`;
- Left/Right/Home/End move roving focus;
- Enter/Space pin and Escape reset;
- pointer changes do not spam the live region;
- `View data` opens and focuses the exact table;
- source freshness, ledger validation, and decision-safe scope render
  separately;
- ledger failure does not alter the freshness percentage label;
- priority rows show correct semantic support copy and reasons;
- unknown exposure never renders as zero;
- destination arrows remain present at rest;
- local query updating state appears without clearing current content; and
- empty, unavailable, stale, qualified, and error states retain next actions.

### Integration and regression tests

- report projection returns richer operation aggregates;
- export and report-record destinations remain unchanged;
- range, comparison, currency, and metric URL scope remains correct;
- no dashboard visit performs a write;
- current and previous periods remain aligned;
- dashboard component suite;
- authenticated cross-product component suite;
- full lint and typecheck; and
- existing Apple-quality guard.

---

## 15. Visual verification

Use the real authenticated route and one bounded review cycle:

1. complete the implementation;
2. capture all required widths and themes in one batch;
3. inspect all captures together;
4. make one consolidated correction batch; and
5. run at most one confirmation capture batch.

### Required captures

- light 1440×900;
- light 1280×800;
- light 1024×900;
- dark 1440×900;
- dark 1280×800;
- dark 1024×900;
- reduced motion;
- forced colours or equivalent high-contrast verification;
- no financial data;
- no active work;
- comparison unavailable;
- stale sources with ledger passed;
- ledger qualified with source freshness current; and
- both source and ledger degraded.

### Capture assertions

- HTTP 200;
- no page or console errors;
- no horizontal overflow;
- no clipped controls or chart annotations;
- no overlap at 200% zoom;
- lead value remains the dominant element;
- at least the required attention/trust content is above the fold;
- warning treatment does not dominate the page;
- dark mode preserves the same attention order; and
- the static timeline contains a useful conclusion.

---

## 16. Landing-page screenshot scenario

Use a deterministic fictional merchant dataset through the real dashboard
route. Do not add a capture-only component or hide warnings.

The preferred product-proof state is:

- a meaningful, non-round GBP exposure total;
- a legible rise or fall versus the previous period;
- a clear peak interval;
- active, action-needed, and ready counts with visible subset language;
- at least one overdue or ready priority reason;
- source freshness below perfect with one named source to review;
- ledger validation passed; and
- decision-safe copy explaining that displayed financial totals are
  reconciled.

This state proves that Unauth detects operational drift while making the
financial consequence and recovery path clear. The severe 0%-freshness and
ledger-failure combination remains a required product state, but it is not the
default landing-page capture.

---

## 17. Acceptance criteria

The iteration is complete only when all of the following are true:

### Information truth

- [ ] Active, needs-action, waiting, in-progress, and ready counts share one
      canonical period-scoped model.
- [ ] The visible relationship among active, needs-action, and ready counts is
      explicit.
- [ ] The primary action does not claim a narrower destination than it opens.
- [ ] Source freshness and ledger validation cannot produce a combined label.
- [ ] Decision-safe scope states what remains usable.
- [ ] Unknown and multi-currency financial values are never coerced or combined.

### Timeline

- [ ] The idle readout contains a useful scope, basis, peak date, and value.
- [ ] The peak annotation is visibly connected to its bucket.
- [ ] The chart contributes one bucket tab stop to the page.
- [ ] Left/Right/Home/End, pin, reset, and table access work.
- [ ] Pointer exploration does not generate repeated live announcements.
- [ ] Visual and tabular values use identical buckets.

### Attention

- [ ] Priority is derived from the documented 50/30/20 model.
- [ ] The selected-currency basis is visible.
- [ ] Every row uses semantically correct support copy.
- [ ] Visible reasons explain the ordering without exposing a numeric score.
- [ ] Rank numbers are removed.
- [ ] Destination arrows are visible at rest.

### Composition

- [ ] Payout Position remains horizontal at 1440, 1280, and 1024.
- [ ] 1024×900 shows the first attention row and three trust-axis summaries in
      the first viewport.
- [ ] 1280×800 shows at least two attention rows and all trust axes.
- [ ] 1440×900 shows at least three attention rows and the complete trust
      inspector.
- [ ] No supported viewport has horizontal overflow.
- [ ] The lead financial value appears once and remains visually dominant.

### Craft and resilience

- [ ] Light and dark themes meet the same hierarchy and state contract.
- [ ] Reduced motion and forced colours remain complete.
- [ ] Loading geometry matches the final layout.
- [ ] Every degraded state explains what remains known and what to do next.
- [ ] No gradients, glass, decorative shadows, native-OS imitation, or
      screenshot-only fork is introduced.
- [ ] Lint, typecheck, unit, component, integration, and visual checks pass.
- [ ] Repeat critique reaches the target with no unresolved P1 issue.

---

## 18. Definition of done

The dashboard is done when a first-time viewer can accurately say:

> The merchant has this amount exposed, this is how it moved, these cases need
> attention in this order, and these are the exact limits of the underlying
> data.

If the implementation merely looks cleaner while the viewer still has to
reconcile counts, infer priority, activate the chart to learn anything, or
guess whether the money is safe to use, the iteration is not complete.
