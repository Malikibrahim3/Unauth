# IMPL — Dashboard Overview polish iteration

- **Status:** Implemented — dashboard-only polish cutover complete
- **Date:** 30 July 2026
- **Route:** `/dashboard`
- **Code surface:** `components/dashboard/**` and the dashboard route states
- **Product authority:** [`PRODUCT.md`](PRODUCT.md)
- **Design authority:** [`../DESIGN.md`](../DESIGN.md)
- **Parent programme:** [`IMPL_apple_quality_authenticated_dashboard.md`](IMPL_apple_quality_authenticated_dashboard.md)
- **Creative direction:** **Payout Position**

This iteration was deliberately limited to the authenticated Overview route.
It does not change the application shell, sidebar, global toolbar, Work, Cases,
other authenticated routes, authentication, onboarding, or public pages.

The implementation report and final evidence are recorded in
[`phase-reports/apple-quality/OV-00-05.md`](phase-reports/apple-quality/OV-00-05.md).

---

## 1. Executive decision

The first dashboard iteration solved the structural problem: it is calmer,
clearer, more legible, and no longer a stack of interchangeable cards.

It has not yet solved the **signature-product problem**.

The current first viewport still reads as a competent analytics template:

- the lead financial value appears twice;
- the four-part metric strip recreates an equal KPI slab inside the chart;
- the chart is visually sparse but consumes most of the viewport;
- filters and actions feel adjacent to the story rather than part of it;
- “Need action” and a severe source-freshness state receive the same treatment;
- the operator’s actual work falls below the primary screenshot crop; and
- there is no interaction or visual moment uniquely associated with Unauth.

The next iteration will create one integrated **Payout Position** canvas: a
high-craft financial and operational reading that makes current exposure,
movement, trust, and the next action understandable as one story.

The “wow” factor will come from intelligence, spatial composition, direct
manipulation, and precise motion—not gradients, glass, decorative shadows,
oversized decoration, or imitation Apple chrome.

### Target impression

> This is not a dashboard of metrics. It is the merchant’s live position on
> payout exposure, what has been prevented or recovered, and what requires a
> decision next.

---

## 2. Job, audience, and proof

### Job

Give a merchant operator or operations lead an immediate, trustworthy answer
to four questions:

1. What is our current payout exposure?
2. Is that position changing?
3. What needs attention now?
4. Can the underlying data be trusted?

### Success

Within five seconds at 1440×900, a viewer must be able to identify:

- the selected period and currency;
- the lead financial position;
- the direction or absence of a valid comparison;
- the number of cases requiring action;
- the most important next-action category; and
- whether source freshness or reconciliation needs attention.

The same crop must also look distinctive enough to use as landing-page product
proof without a screenshot-only variant.

### Product truth to preserve

- Financial values remain explicit by currency.
- Missing, partial, stale, or unreconciled data never becomes zero or healthy.
- Exposure, prevented value, recovered value, and realised loss remain
  independent recorded metrics; the UI must not invent a false waterfall or
  equation between them.
- Existing range, comparison, currency, export, metric selection, chart-table,
  data-health, modal, records, report, Work, and operation drill-down behaviour
  remains available.
- A dashboard visit performs no business mutation.

---

## 3. Selected visual and interaction direction

### 3.1 The focal object: Payout Position

Replace the separate summary band and generic chart frame with one integrated
financial canvas.

At 1440px and above, the canvas has two connected regions:

- **Position reading — approximately one third:** selected metric, exceptional
  financial value, period/case context, valid comparison language, supporting
  outcome facts, and the primary work action.
- **Financial timeline — approximately two thirds:** a compact, expressive,
  truthful plot with direct labels and a persistent value readout.

They are one surface and one story. There is no border between a “KPI card” and
a “chart card”.

### 3.2 Page opening

Keep the page identity `Overview`, but make its supporting line more useful:

> Your live position on payout exposure, outcomes, and work waiting.

Use one compact control row for:

- period;
- comparison;
- currency;
- export; and
- full reports.

The primary action moves into the Payout Position canvas and becomes specific:

> Review 15 cases

The count remains derived from the same truthful operation data. If no cases
need action, the action becomes a quieter route to Work rather than implying
urgency.

### 3.3 Metric selection

Remove the four equal metric tiles.

Use a quiet text-led metric switcher:

- Exposure
- Recovered
- Prevented
- Realised loss

Only the selected metric owns the large value and chart. The other three values
remain visible as a single supporting outcome sentence below the lead reading,
not four competing boxes.

This removes duplicated values while preserving metric switching and records
scope.

### 3.4 The signature interaction

The financial timeline gains a persistent **period readout**:

- at rest, it shows the selected-period total and comparison;
- pointer hover or keyboard focus on a time bucket updates it to that bucket’s
  exact date range and values;
- the selected bucket receives one restrained vertical rule and direct value
  label;
- leaving the plot returns the readout to the period summary.

This is the signature moment: the operator directly inspects the financial
position without relying on a detached floating tooltip.

The accessible table continues to expose the same values, and tooltip support
remains available as a secondary aid.

### 3.5 Plot geometry

The current 30-day daily plot is too sparse for its physical size. Use
deterministic, labelled aggregation:

- 7 days → daily buckets;
- 30 days → three-day buckets;
- 90 days → weekly buckets;
- all time → monthly buckets.

Every bucket is a transparent sum of the underlying values. Labels and the
accessible table use the exact same bucket boundaries. Exported and underlying
records remain unaggregated and unchanged.

Use:

- substantial exposure bars;
- a narrower recovered series only when exposure is selected;
- a quiet comparison line when comparison is enabled;
- one directly labelled high point;
- fewer, calmer grid lines;
- solid low-contrast plot tint where needed, never a gradient; and
- 240–280px plot height at desktop so operational work enters the first
  viewport.

No area fill may imply a continuous balance when the source data is periodic
activity.

---

## 4. Complete dashboard composition

### Region A — Page identity and controls

- `Overview` remains the H1.
- One useful supporting sentence replaces the current category list.
- Controls read as one compact instrument cluster rather than detached form
  fields.
- Export remains secondary.
- Full reports remains a quiet text action.

### Region B — Payout Position canvas

The canvas contains:

1. selected metric and lead value;
2. period, case count, and comparison status;
3. one inline sentence containing the three supporting financial outcomes;
4. `Review n cases` as the single primary action;
5. `View underlying records` as the secondary action;
6. metric switcher;
7. persistent period/bucket readout;
8. financial plot;
9. ledger generation and reconciliation state; and
10. accessible chart-data disclosure.

The canvas must not contain nested cards.

### Region C — What needs attention

Move operational priority directly below the Payout Position canvas.

Use the existing operation data to show a ranked, linked list with:

- operation label;
- case count;
- proportional measure;
- restrained emphasis on the leading category; and
- a direct destination.

The section title becomes **What needs attention**. Avoid asking a second
analytics question such as “Where is work accumulating?” after the hero has
already established the page narrative.

At least the first three rows must be visible in a 1440×900 screenshot.

### Region D — Data trust

Replace the duplicated Workflow/Source Health support stack with one compact
**Data trust** inspector.

It shows:

- current percentage or `Unavailable`;
- current and stale record counts;
- ledger check state;
- the two sources most in need of attention when applicable; and
- `Review details`, preserving the existing modal.

Data trust uses semantic warning treatment only when the data warrants it. A
0% freshness state must be visibly important and actionable; it must not look
like an ordinary supporting metric.

### Desktop topology

```text
Overview                                      Reports · Export
Live position…                [Period] [Compare] [Currency]

┌─ Payout Position ───────────────────────────────────────────┐
│ Lead financial reading        Metric switcher + timeline    │
│ outcome sentence              persistent period readout     │
│ Review cases · View records   direct inspection             │
└─────────────────────────────────────────────────────────────┘

┌─ What needs attention ─────────────────┐  ┌─ Data trust ───┐
│ ranked linked operation rows           │  │ freshness       │
│ proportional measures                  │  │ ledger + source │
└────────────────────────────────────────┘  └─────────────────┘
```

---

## 5. Polish and “wow” specification

### 5.1 Typography

- Increase the selected financial value to a true focal scale of approximately
  48–56px at wide desktop, while keeping tabular numerals and explicit
  currency formatting.
- Use a stronger contrast jump between the lead value, supporting outcome
  sentence, and metadata.
- Keep section titles at the established product scale; do not introduce a
  marketing-display font or oversized hero headline.
- Ensure the value and chart read as a single horizontal composition rather
  than two independent modules.

### 5.2 Colour

- Violet remains the selected metric and direct-interaction voice.
- Recovered retains semantic green.
- Realised loss and reconciliation problems use semantic critical/warning
  colour only when displayed.
- Neutral surfaces should be separated mainly through tone and whitespace.
- No decorative colour wash, multicolour metric grid, gradient, glass, or
  ambient glow.

### 5.3 Micro-interactions

- Metric changes interpolate existing chart geometry rather than replaying an
  entrance animation from zero.
- Bucket hover/focus updates the persistent readout in 120–160ms.
- The active bucket rule and label fade in without moving the surrounding
  layout.
- Operation rows gain a precise tonal hover and reveal directional affordance;
  they do not lift.
- The Data trust detail action clearly previews that it opens an overlay.
- Focus appearance uses the existing violet focus contract.

### 5.4 Motion

- First meaningful chart reveal: 280–360ms, once.
- Metric switch: 160–220ms.
- Hover/focus feedback: 100–140ms.
- Modal entrance/exit continues to use the shared overlay contract.
- `prefers-reduced-motion` removes interpolation and preserves every state
  change instantly.
- No number-counting animation, bounce, parallax, scroll choreography, or
  perpetual ambient motion.

### 5.5 Detail craft

- Align controls, financial baselines, chart readout, axes, and action rows to
  a shared internal grid.
- Use direct labels where they remove legend scanning.
- Keep all monetary values tabular.
- Make click and focus targets generous without making controls look like
  mobile pills.
- Use purposeful empty space around the lead reading, but reduce unused chart
  height.
- Avoid icon badges above metrics; icons appear only where they improve action
  recognition or status comprehension.

---

## 6. Responsive behaviour

### 1440px and wider

- Two-column Payout Position canvas.
- Attention list and Data trust inspector sit side by side.
- The full hero and at least three attention rows appear within 900px height.

### 1280–1439px

- Preserve the hero’s two-region composition with a slightly narrower position
  reading.
- Reduce non-essential supporting copy before reducing data legibility.
- Controls may wrap as one intentional second line.

### 1024–1279px

- Position reading stacks above the financial timeline inside the same surface.
- Supporting outcomes remain an inline or two-line sentence, never a card grid.
- Attention list and Data trust stack.
- Plot labels thin deterministically; exact values remain available through
  focus, tooltip, and the data table.

Below 1024px, preserve the authenticated desktop boundary already defined by
the product. Do not invent an iOS-style mobile dashboard.

---

## 7. State matrix

Implementation must explicitly design and verify:

| State | Required presentation |
| --- | --- |
| Normal data | Full Payout Position, attention list, and Data trust |
| Previous comparison | Delta language and quiet comparison line |
| No comparison | No empty comparison slot or placeholder line |
| Multiple currencies | One explicit selected currency; no aggregation |
| No valid currency | Financial canvas explains unavailability; operations still render |
| No dated entries | Preserve total if known; explain absent timeline activity |
| No cases | Calm zero-work state; no urgent CTA |
| Partial financial states | Unknown outcomes read `Unavailable`, not £0 |
| Stale sources | Persistent semantic Data trust treatment and next step |
| Reconciliation issue | Valid values remain visible with an explicit ledger warning |
| Loading | Geometry-matched hero, attention, and trust skeletons |
| Route error | Existing recoverable error boundary |
| Long labels / large counts | No clipping at 1024px or 200% zoom |
| Dark mode | Same hierarchy and semantic meaning without muddy tonal stacking |
| Reduced motion | Instant, complete state changes |
| Forced colours | Controls, focus, selection, plot series, and warnings remain legible |

---

## 8. Implementation phases

### OV-00 — Baseline and composition lock

**Work**

- Preserve the current 1440, 1280, 1024, and dark captures.
- Record current first-viewport and crop failures.
- Create a static composition proof using real dashboard data.
- Confirm that the Payout Position canvas and three priority rows fit at
  1440×900.

**Exit**

- The composition passes the five-second test before detailed styling begins.
- No product value, action, or state is lost.

### OV-01 — Integrated Payout Position

**Work**

- Merge the lead summary and chart into one surface.
- Replace metric tiles with the text-led metric switcher.
- Move the primary Work action into the financial reading.
- Consolidate controls and remove duplicated financial values.
- Preserve report/export/records links and query behaviour.

**Exit**

- One focal object owns the first viewport.
- Exposure appears as a lead value only once.
- All four metrics remain selectable and correctly scoped.

### OV-02 — Signature financial timeline

**Work**

- Add deterministic range-based bucketing.
- Add persistent readout and pointer/keyboard bucket inspection.
- Add direct high-point labelling and refined plot geometry.
- Keep exact accessible table parity.
- Interpolate metric changes with reduced-motion support.

**Exit**

- Visual totals reconcile with the financial strip and accessible table.
- Every interactive reading is reachable without a pointer.
- The 30-day plot no longer reads as a mostly empty generic bar chart.

### OV-03 — Operational follow-through

**Work**

- Refine Priority work into What needs attention.
- Remove the redundant workflow summary.
- Build the compact Data trust inspector from existing coverage and
  reconciliation data.
- Preserve all operation destinations and the health-details modal.

**Exit**

- The next action is visible without scrolling at 1440×900.
- A severe freshness or reconciliation problem cannot be mistaken for a
  healthy secondary metric.

### OV-04 — States, loading, dark mode, and responsive craft

**Work**

- Rebuild the dashboard skeleton to match final geometry.
- Implement every state in §7.
- Refine 1280px and 1024px compositions.
- Verify dark, reduced-motion, forced-colour, keyboard, and zoom behaviour.

**Exit**

- No state falls back to the old summary-plus-card composition.
- No horizontal overflow, clipped value, ambiguous status, or layout jump.

### OV-05 — Bounded visual finish and capture

**Work**

- Capture one batched review at 1440, 1280, and 1024 in light and dark.
- Fix all observed hierarchy, spacing, chart, state, and crop issues in one
  batch.
- Run one confirmation capture.
- Produce a final landing-page candidate crop from the real route.

**Exit**

- The Definition of Done below passes.
- No screenshot-only code, demo-only layout, or visual feature flag exists.

---

## 9. Likely implementation surface

Primary files:

- `components/dashboard/DashboardOverview.tsx`
- `components/dashboard/dashboardPilot.module.css`
- `components/dashboard/dashboardModel.ts`
- `app/(app)/dashboard/loading.tsx`
- `tests/components/phase07Dashboard.test.tsx`

Possible small, dashboard-scoped components:

- `components/dashboard/DashboardPositionCanvas.tsx`
- `components/dashboard/DashboardAttentionList.tsx`
- `components/dashboard/DashboardDataTrust.tsx`

Shared chart code may receive opt-in capabilities only where required for the
persistent readout and keyboard bucket inspection. Existing chart consumers
must retain their current rendering and behaviour.

No global token or shell change is expected.

---

## 10. Verification

### Functional

- Range, comparison, and currency query updates
- All four metric selections
- Export
- Full reports
- Work action
- Operation destinations
- Underlying records scope
- Data-health modal
- Chart table parity
- No read-side mutation

### Visual

- 1600×1000 landing crop
- 1440×900
- 1280×800
- 1024×900
- light and dark
- normal, stale, partial, empty, and reconciliation-warning data

### Accessibility and resilience

- Keyboard-only inspection and navigation
- Visible focus
- Screen-reader names and live-readout behaviour
- Reduced motion
- Forced colours
- 200% zoom
- Long labels and four-digit counts
- No horizontal overflow

### Quality guard

- Full lint and typecheck
- Dashboard component/model tests
- Authenticated design guard
- Automated console/page-error and overflow capture scan

---

## 11. Definition of Done

The iteration is complete only when:

1. the first viewport contains one unmistakable Payout Position canvas;
2. the lead metric is not duplicated;
3. the metric switcher no longer reads as an equal KPI slab;
4. the selected range, currency, total, comparison, action count, leading work
   category, and data-trust state are readable within five seconds;
5. at least three What needs attention rows are visible at 1440×900;
6. the plot feels intentional with sparse real data and remains mathematically
   truthful;
7. pointer and keyboard inspection produce the same exact values;
8. loading, empty, partial, stale, and error states retain the new composition;
9. dark mode feels authored rather than inverted;
10. all existing dashboard functions and links pass;
11. the real route produces a landing-page-quality crop without special code;
12. the result contains no gradients, glass, decorative shadows, card soup,
    fake Apple chrome, or decorative analytics; and
13. a visual review scores at least 9/10 for hierarchy, distinctiveness,
    interaction craft, screenshot readiness, and trust.

---

## 12. Explicit anti-goals

Do not:

- redesign the application shell or another route;
- solve “wow” with illustration, photography, 3D, glow, or ornamental motion;
- recreate four KPI cards in a different shape;
- add a decorative ring, donut, gauge, or health score;
- infer a financial waterfall the source model does not support;
- hide severe data freshness to improve a screenshot;
- turn desktop controls into an iOS navigation metaphor;
- make every chart mark interactive if there is no truthful destination;
- introduce a second dashboard-specific chart system; or
- tune only the seeded screenshot state.

The intended result is memorable because it makes Unauth’s product truth
exceptionally clear—not because it looks more decorated.
