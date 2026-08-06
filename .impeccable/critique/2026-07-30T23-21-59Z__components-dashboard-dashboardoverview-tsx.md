---
target: dashboard Overview
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-07-30T23-21-59Z
slug: components-dashboard-dashboardoverview-tsx
---
# Dashboard Overview design critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Strong loading, active, unavailable, and warning states; query-changing controls have no local pending or updated feedback. |
| 2 | Match system / real world | 3 | Merchant language is credible, but payout exposure, realised loss, reconciliation, and ledger remain undefined. |
| 3 | User control and freedom | 3 | Comparison, metric switching, chart pinning, modal close, and navigation are sound; there is no visible reset-all or unpin affordance. |
| 4 | Consistency and standards | 3 | The visual system is cohesive, but the work counts/taxonomy and Details versus Review details diverge. |
| 5 | Error prevention | 2 | Volume-ranked work and three unexplained case totals can make an operator choose the wrong queue or misread urgency. |
| 6 | Recognition rather than recall | 2 | Metric definitions exist in code but are not surfaced; users must mentally reconcile 15 needing action, 17 open, and 3 ready. |
| 7 | Flexibility and efficiency | 2 | Export, drill-down, native controls, and arrow-key inspection help; the chart creates 10+ tab stops and the CTA is not scoped to its 15 cases. |
| 8 | Aesthetic and minimalist design | 3 | The dominant object and restraint are strong; generic chart grammar and 1024px vertical expansion keep it below exceptional. |
| 9 | Error recognition and recovery | 3 | Honest unavailable states, warnings, details, and source links are good; the UI does not say which values remain safe when freshness and reconciliation fail together. |
| 10 | Help and documentation | 2 | Global Help, chart instruction, data table, and health details exist, but decision-critical financial and trust concepts lack contextual explanation. |
| **Total** |  | **26/40** | **Acceptable; meaningful improvements remain.** |

## Design Specificity Verdict

**Structurally specific; visually only semi-specific.**

The integrated Payout Position canvas, separate financial outcomes, provenance,
reconciliation warning, merchant-decision language, and Data trust model are
unmistakably grounded in Unauth. An unrelated product could not reuse the
information architecture unchanged.

The visual signature is weaker. In the static product-proof crop, this remains
a polished B2B sidebar, large number, and violet bar chart. The intended
differentiator—the persistent bucket readout—shows only generic interaction
instructions at rest. The peak label floats without a clear date or leader.
The result feels authored in product logic, but not yet visually unmistakable
at Stripe/Ramp/Apple level.

The deterministic markup scan returned **zero findings** for
`components/dashboard/DashboardOverview.tsx`. That confirms the markup avoids
the detector's known anti-patterns; it does not certify the information model,
computed styles, keyboard efficiency, or emotional quality. No false positives
required adjudication.

Live overlay evidence was unavailable because the Browser runtime exposed no
browser instances. No reliable user-visible overlay exists. The independent
evidence pass instead inspected the final 1440px, 1280px, 1024px, light, and
dark captures plus their manifests. The clean replacement capture matrix
records HTTP 200, zero overflow, zero console errors, and zero page errors.

## Overall Impression

This is a credible 7–8/10 operational dashboard, not a 9–10/10 product-proof
surface yet. The structure is far better than the original KPI/card stack, and
the product truth is unusually disciplined. The biggest opportunity is to make
the page explain one decisive story rather than simply display several correct
facts.

The next iteration should not add decoration. It should make the financial,
operational, and trust states resolve into one confident sentence:

> Here is the money at risk, here is what changed, here are the exact cases to
> act on, and here is why these numbers are safe to use.

## What's Working

1. **A genuine dominant object.** Payout Position replaces card soup with one
   coherent financial reading, and the exceptional value appears only once.

2. **Strong product truth.** Explicit currency, Unavailable instead of false
   zero, separate outcomes, provenance, reconciliation warnings, exact table
   parity, and non-mutating drill-down support financial trust.

3. **Thoughtful implementation craft.** Geometry-matched loading, recoverable
   error state, keyboard-readable buckets, focus styling, reduced-motion
   handling, forced-colour rules, clean responsive captures, and an authored
   dark theme form a strong foundation.

## Section-by-section critique and upgrades

### 1. Application shell and navigation context

**Critique:** The shell is calm and competent, but visually category-standard.
The active violet navigation wash, grouped route labels, small workspace row,
and source-warning dot could belong to many contemporary B2B products. The
sidebar also consumes valuable screenshot width without contributing much
Unauth-specific proof.

**Upgrade:** Keep the shell restrained, but make source state and merchant
context one authored object rather than two generic rows. Tighten low-value
footer content in product-proof crops, refine active navigation to one selected
treatment, and make the source-warning destination explicit. This is a
secondary priority because the dashboard-only scope should not casually
redesign global navigation.

### 2. Page heading

**Critique:** `Overview` is clear, but the subtitle repeats the broad territory
that Payout Position immediately repeats again. Full reports floats alone at
the far edge, creating a weak and generic opening.

**Upgrade:** Make the subtitle state the current operating condition rather
than list categories. Example: “£1,589.65 exposed across 23 cases · 15 require
action.” Place reporting/export utilities into one coherent control cluster.

### 3. Filter and reporting controls

**Critique:** Date and comparison sit left while currency and export sit right.
The controls are technically clean but feel distributed rather than composed.
Five visible choices precede the page's main story.

**Upgrade:** Treat the controls as one reporting instrument: period, optional
comparison, currency, then a compact More/Export action. Show comparison only
when enabled or make it a clear toggle. Add localized pending feedback when a
query change is loading.

### 4. Payout Position header and metric switcher

**Critique:** The title is product-specific, but its supporting sentence is
generic. The four metric choices use both a filled wash and underline, making
the selected state busier than the otherwise quiet system. No definition is
available for the four terms.

**Upgrade:** Use one selection treatment, preferably a precise underline or
tonal text state. Surface each metric's existing definition through concise
helper copy or an accessible information disclosure. Let the header state the
analytical question or current conclusion rather than “financial activity
across the selected period.”

### 5. Lead financial reading

**Critique:** The amount is the strongest element, but the supporting outcomes
remain three tiny, equal facts. The CTA says Review 15 cases while nearby text
says 3 ready and the next section says 17 open. The relationships are not
visible, so the page's most important action feels under-specified.

**Upgrade:** Turn the counts into one explicit hierarchy:
“17 open · 15 need action · 3 of those are ready for decision.” Scope the CTA
to those 15 cases or rename it Open work. Add a valid comparison conclusion and
an explicit safe-through timestamp/scope beside provenance.

### 6. Financial timeline

**Critique:** This is the biggest missed opportunity. At rest, the signature
readout says only “Focus or point…”, so the screenshot gets no analytical
insight from it. The bars remain a familiar SaaS chart; the peak label lacks a
date/leader; three-day aggregation is invisible; and the exact inspection
interaction exists only after input.

**Upgrade:** Make the idle state informative: selected-period total,
comparison, bucket basis, highest interval, and one plain-language conclusion.
Connect the peak label directly to its bar and date. Use one selected-period
rule rather than a broad wash. Make interaction deepen an already useful
reading instead of activating it from zero.

For keyboard efficiency, use one tabbable chart entry with roving focus across
buckets, Left/Right plus Home/End, and a direct skip-to-table path.

### 7. Reconciliation strip

**Critique:** The strip is honest, but it becomes a large amber boundary that
says the ledger needs review without explaining which values remain safe. It
competes with the separate 0% freshness failure.

**Upgrade:** State consequence and recovery, not merely diagnosis:
“Displayed exposure is reconciled through 28 Jul; 1,068 newer source records
need refresh.” Use a source-specific action where possible. If the issue does
not invalidate the lead amount, say that precisely; if it does, visually
qualify the amount itself.

### 8. What needs attention

**Critique:** The section appears actionable, but ranking is only by case count,
not merchant urgency. Numbering the rows gives that ordering more authority
than it deserves. Every subtitle says cases waiting, even Ready for decision.
Destination arrows disappear at rest.

**Upgrade:** Rank by an explicit operational priority such as deadline risk,
value at issue, decision readiness, or a documented composite. Otherwise rename
the section Most common open statuses and remove rank numbers. Give each row
semantically correct supporting copy and keep destination affordances visible.

### 9. Data trust

**Critique:** The large number is source freshness, but its adjacent label
becomes Ledger review required when reconciliation fails. “0% Ledger review
required” therefore combines a freshness measurement with a different
diagnosis. This is the most serious information-design defect on the page.

**Upgrade:** Separate the axes:

- Source freshness: 0% current · 1,068 stale
- Ledger validation: Needs review
- Decision-safe scope: through a precise time/source boundary

Replace generic Details with the most relevant recovery action, such as Review
Orders connection, while keeping full details secondary.

### 10. Responsive composition

**Critique:** At 1024×900, the stacked Payout Position canvas consumes nearly
the entire viewport. The page ends on a warning; What needs attention and Data
trust are below the fold. At 1280×800, barely one attention row is visible.
This weakens the route's definition as an overview.

**Upgrade:** Create a true compact desktop composition at the 1024 boundary:
shorter reading block, shorter plot, reduced secondary copy, inline trust
summary, and at least the leading attention row in the first viewport. Preserve
full detail below rather than deleting it.

### 11. Dark mode

**Critique:** Dark mode retains hierarchy well, but the broad muddy-brown
warning band is heavier than its light counterpart and the violet bars become
more luminous than the financial reading.

**Upgrade:** Reduce the warning plane's chroma/area while retaining contrast,
and rebalance chart saturation so the lead amount remains dominant. Validate
selected, hover, focus, and warning states together rather than treating dark
as palette inversion.

### 12. Loading, empty, error, and partial states

**Critique:** The implementation coverage is strong. The remaining concern is
conceptual: partial/stale states explain availability but not decision safety.

**Upgrade:** Make every degraded state answer two questions: “What remains
known?” and “What should I do next?” Preserve the same spatial hierarchy so
errors do not collapse into generic centered messages.

### 13. Landing-page screenshot readiness

**Critique:** The severe 0% freshness plus ledger-warning scenario proves
honesty, but without a precise safe-to-act explanation it can make the product
look broken. The static chart also hides the best interaction.

**Upgrade:** Use a deterministic, truthful fictional capture scenario that
demonstrates Unauth detecting and resolving a meaningful operational problem.
Do not hide warnings for marketing; make the warning itself impressive by
showing consequence, provenance, and recovery. The real route—not a
screenshot-only fork—must produce that state.

## Cognitive Load

**Three checklist failures: moderate load.**

- **Chunking:** What needs attention exposes five sibling rows.
- **Minimal choices:** opening controls/actions, the attention region, the
  sidebar, and the timeline each exceed four visible options.
- **Working memory:** users must infer relationships among 15 cases needing
  action, 17 open cases, 3 ready cases, and the ranked operation totals.

The surface passes single focus, grouping, broad visual hierarchy, one-thing-at-
a-time suitability for an overview, and progressive disclosure.

Decision points exceeding four options:

- Main sidebar: 11 product routes plus Help/account actions.
- Opening: Full reports, date range, comparison, currency, and Export.
- What needs attention: five row destinations plus Open work.
- Thirty-day timeline: ten independently tabbable buckets plus chart data.

## Emotional Journey

- **Arrival:** calm, competent, and well-oriented.
- **Peak:** the £1,589.65 lead and integrated chart create the strongest moment.
- **Confidence valley:** the unexplained 15/17/3 work counts weaken the primary
  action.
- **Trust valley:** valid ledger values, a failed ledger check, 0% current
  records, and a fresh generation date coexist without a safe-action model.
- **End at 1440:** attention rows and source drill-down restore some control.
- **End at 1024:** the viewport ends on the reconciliation warning, so the
  emotional endpoint becomes alarm rather than recovery.
- **Landing-page effect:** the severe state demonstrates honesty but currently
  risks signalling a broken integration instead of valuable vigilance.

## Priority Issues

### [P1] The work story has no single operational contract

**Why it matters:** The hero promises 15 cases, the note reports 3 ready, and
the next section reports 17 open without showing nesting or overlap. The CTA
opens generic Work rather than the promised set.

**Fix:** Expose one set hierarchy, scope the CTA, and rank work using an
explicit operational priority—or rename the list to match its actual
volume-based ordering.

**Suggested command:** `$impeccable clarify`

### [P1] Data trust combines independent failures into one misleading score

**Why it matters:** A freshness percentage is labelled with a ledger diagnosis,
so the operator cannot tell what failed or whether the lead amount is safe.

**Fix:** Separate freshness, ledger validation, and decision-safe scope; provide
a source-specific recovery action.

**Suggested command:** `$impeccable clarify`

### [P1] The timeline is inefficient for keyboard users

**Why it matters:** Ten or more ordinary tab stops make the most sophisticated
interaction cumbersome for keyboard users.

**Fix:** Implement roving focus, Home/End, one chart entry point, and a direct
table skip while preserving exact values and pinning.

**Suggested command:** `$impeccable harden`

### [P2] The intended signature interaction is invisible at rest

**Why it matters:** The landing crop receives generic instruction rather than
an insight, so the dashboard still resembles a conventional analytics product.

**Fix:** Make the idle readout analytical, connect direct labels to data marks,
state the bucket basis, and use a precise selected-period treatment.

**Suggested command:** `$impeccable bolder`

### [P2] The 1024px composition stops functioning as an overview

**Why it matters:** Attention and trust disappear below the fold, leaving the
operator on a warning instead of an actionable summary.

**Fix:** Create a compact desktop arrangement that exposes at least the leading
work item and trust state within the first 900px.

**Suggested command:** `$impeccable adapt`

## Persona Red Flags

### Alex — power user

- Review 15 cases opens generic Work instead of a matching filtered set.
- No scoped dashboard view accelerates repeat triage.
- Ten-plus chart tab stops slow keyboard navigation.
- Ranked rows imply operational priority but are sorted by volume.

### Sam — accessibility-dependent operator

- All timeline buckets are tabbable instead of using a composite roving-focus
  pattern.
- Repeated live-region updates may become verbose.
- Small tertiary metadata carries important provenance, aggregation, dates,
  and state explanations.
- Native selects, visible focus, non-colour state text, and the exact table are
  meaningful strengths.

### Jordan — first-time merchant operator

- The four financial terms have definitions in the model but not in the UI.
- Valid ledger values, Ledger review required, and 0% current are difficult to
  reconcile.
- The 15/17/3 case counts look contradictory without set relationships.
- Peak £352.18 lacks an attached date or explanation of three-day aggregation.

## Minor Observations

- Page subtitle and Payout Position subtitle repeat the same broad idea.
- Full reports is detached from Currency and Export.
- The active metric uses both a filled wash and underline.
- Every attention subtitle says cases waiting.
- Numeric ranking overstates count-based importance.
- View chart data's triangle can resemble a play control.
- Attention-row arrows are hidden until hover/focus.
- Provenance shows date but not time/timezone despite freshness being critical.
- The chart axis and metadata are visually quiet enough to disappear in a
  reduced landing-page crop.
- The 1440×900 crop shows three attention rows; the 1280×800 crop barely shows
  one.

## Questions to Consider

- If Unauth promises the next best action, why is attention ranked by volume
  rather than urgency, exposure, or deadline?
- If source freshness is 0% and reconciliation needs review, which displayed
  pound amount can the merchant safely act on?
- Why does Review 15 cases not open those exact 15?
- If the signature interaction becomes distinctive only after hover or focus,
  what does the landing-page screenshot prove?
- At 1024px, is this still an overview when attention and trust are not visible?
