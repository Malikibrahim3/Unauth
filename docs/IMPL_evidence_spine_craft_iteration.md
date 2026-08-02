# IMPL — Evidence Spine craft iteration

- **Status:** Decision-complete implementation plan — not yet implemented
- **Date:** 31 July 2026
- **Programme:** `ES-00` through `ES-12`
- **Scope:** every production page, route state, shared shell, overlay, public
  surface, entry flow, onboarding step, and embedded product view
- **Change boundary:** presentation and responsive composition only
- **Product authority:** [`../PRODUCT.md`](../PRODUCT.md)
- **Visual authority:** [`../DESIGN.md`](../DESIGN.md)
- **Current rollout:** [`IMPL_whole_product_visual_reconstruction.md`](IMPL_whole_product_visual_reconstruction.md)
- **Exhaustive coverage:** [`APPX_whole_product_visual_coverage_ledger.md`](APPX_whole_product_visual_coverage_ledger.md)
- **Visitor modes:** Operate for product UI; Persuade for public pages; Read
  for legal/help; compact Operate for embedded views
- **Retained design world:** **The Quiet Evidence Desk**
- **Iteration thesis:** **The Evidence Spine**

This document makes all visual and implementation decisions for the next
iteration. It is a refinement of the completed visual reconstruction, not a
replacement product direction and not another compatibility layer.

---

## 0. Executive decision

The current application has crossed the coherence threshold. It now looks like
one product, uses one cool-neutral system, preserves product truth, and covers
all 245 registered surfaces. The next improvement must solve a different
problem:

> The product is consistent, but too many screens still feel system-generated
> rather than specifically authored for the work they contain.

The interface often applies the same calm page header, bordered white working
surface, toolbar, and secondary rail regardless of whether the operator is
reviewing a case, clearing a queue, reading a financial story, configuring a
rule, connecting a provider, or completing setup. That consistency is useful,
but the repeated composition suppresses the product’s most distinctive idea:
Unauth preserves the path from source evidence to recommendation, merchant
decision, loss, and recovery.

The next iteration will therefore:

1. repair the visible supported-width defects before adding polish;
2. give each page archetype a purpose-built composition;
3. make the evidence-to-action sequence the product’s restrained visual
   signature;
4. improve density, typography, and first-viewport completeness;
5. make product proof legible enough to sell the product without imitation
   browser chrome; and
6. add interaction finish through feedback and continuity, not ornamental
   animation.

The quality target is a calm Stripe/Ramp-level web product: precise, authored,
fast to scan, visually memorable for a reason tied to the product, and free of
generic “premium SaaS” effects.

### The non-negotiable interpretation of “wow”

“Wow” will come from:

- information snapping into a clear sequence;
- exact alignment and unusually good density;
- visible provenance and financial confidence;
- a primary action that feels inevitable rather than merely prominent;
- high-quality adaptive layouts at 1440, 1280, and 1024;
- real product screens that remain legible in marketing capture; and
- small, purposeful transitions that explain change.

It will not come from:

- gradients, glow, glass, blur, floating card stacks, or oversized pills;
- gratuitous shadows, animated backgrounds, or 3D scenes;
- a second accent colour or a new display font;
- copying macOS, iOS, Stripe, Ramp, Linear, or a Figma community template; or
- hiding truthful complexity to produce a cleaner screenshot.

---

## 1. Current-state critique

The baseline is the completed `run-a` capture set under
[`../artifacts/living-precision/run-a`](../artifacts/living-precision/run-a).
This critique concerns the rendered composition, not product behaviour.

### 1.1 Directional score

| Dimension | Current | Target | Main gap |
|---|---:|---:|---|
| System coherence | 8.8 | 9.5 | Strong foundation; a few route-local arrangements still diverge |
| Operational clarity | 8.3 | 9.5 | Good labels, but several first viewports do not finish the work story |
| Page-specific authorship | 7.1 | 9.4 | Too many routes share the same surface anatomy |
| Responsive desktop quality | 6.5 | 9.5 | Work queue is visibly compressed at 1024 and 1280 |
| Typography and rhythm | 7.8 | 9.3 | Clear but over-spacious in product; oversized in public/auth |
| Data visualisation | 8.0 | 9.3 | Correct and accessible; not always immediately interpretive |
| Interaction finish | 7.5 | 9.2 | States work; transitions and selection continuity are understated |
| Public product storytelling | 7.4 | 9.3 | Real proof is present, but scale and hierarchy compete |
| Screenshot authority | 7.6 | 9.4 | Coherent captures; several do not yet look deliberately art-directed |
| Accessibility foundation | 9.0 | 9.5 | Strong baseline; adaptive layouts and zoom remain the main visual risk |

The current product is credible and shippable. It is not yet at the requested
9–10 visual bar because responsive integrity and composition authorship are
still uneven.

### 1.2 What is already right and must be preserved

- One cool-neutral product identity across authenticated, public, entry,
  onboarding, and embedded surfaces.
- Violet as the sole interaction/current-selection voice.
- Semantic colours used for meaning rather than decoration.
- One dominant object on the strongest routes.
- Real financial definitions, provenance, uncertainty, and unavailable states.
- Flat inline surfaces and depth reserved for overlays.
- Sentence-case type, Inter, tabular financial values, and restrained radii.
- Merchant control of decisions and recovery actions.
- Existing routes, queries, deep links, keyboard paths, mutations, exports,
  permissions, and host constraints.
- The 1024px authenticated-product support boundary and the shared boundary
  below it.
- The complete 245-surface coverage ledger.

### 1.3 Priority defects observed

#### P0 — Work queue loses readability at supported widths

In the 1024 and 1280 captures, the Work queue’s seven-column table and
supporting risk rail compete for width. “Next action” collapses into a narrow
stack of words, source marks overlap the reading column, owner and deadline
content crowd, and the table continues beyond the visible composition.

Evidence:

- [`R21-work-1024x900.png`](../artifacts/living-precision/run-a/flagship/R21-work-1024x900.png)
- [`R21-work-1280x800.png`](../artifacts/living-precision/run-a/flagship/R21-work-1280x800.png)

This is the first implementation phase and blocks the rest of the craft pass.

#### P1 — Product pages spend too much height on introduction

The page-header contract is calm but uniform. At 1280×800, route identity,
subtitle, filters, and surface headers often consume enough height that the
first actionable row or analytical conclusion is pushed down. The issue is
most visible in Overview, Reports, settings, and several registries.

#### P1 — Record detail contains a strong layout but weak sequence

Case detail has the correct parts—identity, status, evidence, recommendation,
decision, responsibility, recovery, and activity—but the visual path between
them is mostly implied by section order. The large “Primary work surface”
introduction describes the UI rather than advancing the case. The sticky
decision rail reads as a separate form card instead of the culmination of the
evidence review.

Evidence:

- [`R01-claims-id-1280x800.png`](../artifacts/living-precision/run-a/flagship/R01-claims-id-1280x800.png)

#### P1 — Analytical pages still use equal-weight metric presentation

Reports correctly separates financial concepts, but the four equal metric
columns and tiny sparklines create a competent summary rather than a clear
financial argument. The analytical question and the most consequential number
should lead; other values should explain its movement.

Evidence:

- [`R32-reports-1280x800.png`](../artifacts/living-precision/run-a/flagship/R32-reports-1280x800.png)

#### P1 — Public and auth typography is expressive but over-scaled

The landing hero and auth context panel use type scale as the principal source
of impact. At common laptop heights, the headline consumes too much of the
composition and competes with the real product proof. The product screen should
be the focal proof, not a secondary object beside an oversized statement.

Evidence:

- [`R56-landing-1280x800.png`](../artifacts/living-precision/run-a/flagship/R56-landing-1280x800.png)
- [`R52-login-light.png`](../artifacts/living-precision/run-a/routes/R52-login-light.png)

#### P2 — Settings and onboarding are clean but spatially anonymous

Settings uses a wide form field measure and a tall local rail; onboarding
places a large form card in an even larger empty canvas. Both are usable, but
they lack the compact task focus and completion feedback expected at the target
quality bar.

Evidence:

- [`R37-settings-account-light.png`](../artifacts/living-precision/run-a/routes/R37-settings-account-light.png)
- [`R63-onboarding-light.png`](../artifacts/living-precision/run-a/routes/R63-onboarding-light.png)

#### P2 — Motion communicates state but not continuity

The current motion system correctly avoids spectacle, but selection changes,
chart readouts, disclosure, route transition, and successful saves rarely feel
connected to the operator’s action. The next pass should improve continuity
without moving whole surfaces or introducing ambient motion.

---

## 2. Job, audience, and success

### 2.1 Primary audience

Ecommerce operations, support, finance, loss-prevention, and recovery users
working for sustained periods on desktop. They are often handling several
partially known cases under time pressure and need reliable orientation more
than visual novelty.

### 2.2 Primary product job

Within five seconds of any authenticated page, the operator must be able to
answer:

1. What object or operational question owns this page?
2. What is known, inferred, missing, or stale?
3. What has financial consequence?
4. What needs action next?
5. Where will that action take me?

### 2.3 Success for this iteration

The iteration succeeds when:

- no supported viewport shows clipped, colliding, or word-stacked primary
  content;
- every route reads as one of the defined page archetypes rather than a generic
  dashboard template;
- case detail makes the evidence → recommendation → merchant decision → loss
  and recovery sequence visually obvious without merging those concepts;
- all first viewports contain a meaningful work row, conclusion, or next step;
- marketing product proof remains legible when placed on the landing page;
- public and entry compositions feel confident without oversized type;
- adaptive layout changes preserve all content and actions;
- dark, reduced-motion, forced-colour, keyboard, and zoom paths remain intact;
  and
- the visual change remains a hard single-system refinement with no legacy
  route fork.

---

## 3. Selected direction — The Evidence Spine

### 3.1 Structural thesis

Every route will use one of six intentional composition grammars:

1. **Command** — a financial or operational question followed by action.
2. **Queue** — saved view, triage controls, readable work rows, and bounded
   supporting insight.
3. **Record** — identity, evidence sequence, contextual facts, and a decisive
   action rail.
4. **Builder** — configuration sequence, validation, preview, and publication
   state.
5. **Setup** — one bounded task, compact progress, and persistent completion
   feedback.
6. **Narrative** — public or reading composition whose proof carries the
   story.

Shared tokens and primitives remain shared. Composition is no longer shared
indiscriminately.

### 3.2 The signature visual moment

Where a real lifecycle exists, Unauth will show a restrained **Evidence Spine**:

```text
Source facts ── Findings ── Recommendation ── Merchant decision ── Outcome
       provenance     uncertainty        rationale           loss / recovery
```

This is not a global progress stepper. It appears only where the product has
real ordered stages or connected evidence:

- case detail;
- interactive demo;
- recovery and loss detail;
- onboarding connection verification;
- public product proof; and
- Pocket Brief expanded evidence context.

The spine uses:

- one thin neutral rule;
- a violet marker for the current product-owned point of attention;
- semantic markers only for actual status;
- source icons or initials where provenance matters;
- plain-language labels;
- no circles-and-lines “process infographic” treatment; and
- no implication that Unauth automatically advances consequential stages.

### 3.3 Visual authority

The current `DESIGN.md` remains authoritative. This iteration sharpens it:

- typography becomes more compact and more deliberately measured;
- white surface area is composed into working planes rather than left empty;
- borders are reduced where alignment can carry structure;
- tables become responsive by information priority, not by squeezing;
- violet becomes a precise locator rather than a broad selected background;
- charts state their conclusion at rest;
- public scale is reduced so product evidence gains authority; and
- motion connects cause and effect.

---

## 4. Fixed system decisions

### 4.1 Adaptive authenticated shell

| CSS viewport | Sidebar | Page gutter | Supporting rail |
|---|---|---:|---|
| `1440px+` | 200px expanded | 32px | May remain beside the primary object |
| `1200–1439px` | 192px expanded | 24px | Beside only when primary content retains its minimum measure |
| `1024–1199px` | 56px compact icon rail | 20px | Moves below or into a compact summary band |
| `<1024px` | Existing desktop-required boundary | n/a | n/a |

Rules:

- The compact rail preserves every destination and uses the existing nav
  collapse semantics.
- Destination names remain available through accessible names and tooltips.
- Explicit user collapse/expand preference remains respected where current
  persistence exists.
- No drawer, hamburger, bottom navigation, or mobile-app shell is introduced.
- The utility header continues to provide search, notifications, workspace
  context, and account access.

### 4.2 Page rhythm

- Standard page header: `24px` top, `18px` bottom at 1280+.
- Compact page header: `20px` top, `16px` bottom at 1024–1279.
- Page title remains `28/34`; it does not grow further.
- Subtitle uses a maximum of `62ch` and no more than two rendered lines in the
  default fixture.
- Header actions align to the title baseline when space permits.
- The first working object starts no more than `24px` after the page header.
- Route headers do not repeat the title in a panel immediately below.

### 4.3 Surface hierarchy

Each page may use:

- one primary perimeter-bearing working surface;
- joined interior sections;
- one contextual tonal inset when evidence or preview needs separation;
- a supporting rail only when it remains secondary and readable; and
- elevation only for menus, popovers, drawers, dialogs, tooltips, and
  deliberately floating public product frames.

Remove visible framework labels such as “Primary work surface” wherever they
describe layout rather than product meaning.

### 4.4 Typography refinement

- Inter remains the only UI/display face.
- Authenticated display sizes remain unchanged; vertical spacing and measure
  do the refinement.
- Public hero headline caps at `72px` on standard laptops and `80px` only above
  1600px.
- Auth context headlines cap at `64px` with a `10–12ch` measure.
- Product-proof UI must render at a perceived minimum of `12px` in the landing
  composition; if it becomes smaller, enlarge the frame rather than the
  screenshot.
- Table primary text is `13px` or `14px`, secondary text `12px`, and never
  collapses into one-word lines.
- Financial amounts use tabular numerals and one hierarchy per view.

### 4.5 Controls

- Ordinary controls keep the 6px radius.
- Default form controls remain 36px; principal auth/onboarding controls use
  40px.
- Filter views use an underline or quiet selected wash, not a row of equal
  outlined pills when more than five choices are present.
- Primary actions remain violet.
- Financial/irreversible commit actions remain graphite.
- Icon-only actions use a 32–36px hit area with tooltip and accessible name.
- Hover never moves a control.

### 4.6 Motion and feedback

| Interaction | Treatment |
|---|---|
| Route transition | Existing progress indicator plus content-ready fade, no page slide |
| Selected row/view | 120–160ms fill and leading-marker transition |
| Tab/metric switch | Readout cross-fade and mark interpolation up to 220ms |
| Disclosure | Height/opacity transition up to 180ms; content remains in reading order |
| Successful save | Inline state changes to “Saved” with check glyph for 1.5–2s |
| Data refresh | Updated cells receive the existing bounded highlight token |
| Drawer/modal | Opacity plus short translate up to 220ms; focus restoration required |
| Reduced motion | No interpolation or translation; immediate state replacement |

No ambient loops, parallax, auto-playing carousels, spring overshoot, or
decorative loading animations.

---

## 5. Page-archetype specifications

### 5.1 Command pages

**Routes:** Overview, Reports, Losses, Recovery summary, operational health
summaries.

**Composition:**

1. State the operating question or financial position.
2. Show one lead value or conclusion.
3. Show the causal or temporal visual.
4. Show the work or record destination.
5. Qualify freshness, reconciliation, and scope.

**Decisions:**

- Overview keeps Payout position as its dominant object.
- Reduce the header/control/position stack so the first attention row is
  visible at 1280×800.
- Reports replaces four equal metrics with:
  - one lead “maximum exposure” statement;
  - a three-part reconciliation equation:
    `confirmed loss − recovered cash = final net loss`; and
  - compact trends aligned to their corresponding values.
- Charts receive direct labels for the primary series and a plain-language
  idle conclusion.
- Legends remain only where direct labelling would become ambiguous.
- Export and record inspection remain secondary actions.

### 5.2 Queue pages

**Routes:** Work, Cases, Customers, Losses registry, Recoveries registry,
Exceptions, Notifications, Report records, Flow runs, and other tabular
registries.

**Composition:**

```text
Page identity + canonical count
Saved/current view navigation
Search and filters
Primary registry surface
Result/pagination footer
Optional insight band or rail
```

**Work queue fixed layout:**

Replace the seven-column reading model with five stable columns:

| Column | Contents | Width role |
|---|---|---|
| Select | Checkbox | 36px |
| Work | Source, next action, object link, one supporting reason | flexible, minimum 300px |
| State | Priority and workflow status, vertically joined | 120px |
| Owner | Avatar/initials and name; role in secondary text | 160px |
| Deadline | Due state/date plus row menu | 148px |

The table’s minimum rendered width is approximately 800px. It may scroll
inside its own surface only when localised content exceeds that measure.
Primary text must retain at least 26 characters before wrapping.

**Work supporting insight:**

- At 1440px+, deadline risk may remain as a 288px side rail.
- At 1200–1439px, it becomes a compact horizontal band above the table.
- At 1024–1199px, it becomes a two-line summary below the view controls and
  above the table.
- It never takes width from the primary registry below 1440px.

**All queues:**

- Saved views use a compact view rail; secondary views live in one menu or
  disclosure.
- Search occupies the flexible region; filters do not force it below 240px.
- Rows use one primary identity/action and one supporting sentence.
- Repeated badges are consolidated into one state column.
- Long provider, customer, and owner names truncate with a title/tooltip path.
- Sticky table headers are allowed within the registry surface.
- Horizontal scrolling remains inside the table region and is visually
  discoverable.
- Bulk actions replace the normal toolbar in place; they do not add another
  stacked card.

### 5.3 Record pages

**Routes:** Case, customer, loss, recovery, order, refund, return, shipment,
ticket, dispute, flow run, rule detail, and other connected object details.

**Composition:**

```text
Back navigation
Identity + state + essential financial/context metadata
Local section navigation

Main evidence/action sequence                 Context or decision rail
┌ Source facts                                ┌ Current decision/action
├ Findings / gaps                             ├ Ownership
├ Recommendation                              ├ Relevant lifecycle controls
├ Merchant decision                           └ Source-data destination
├ Outcome
└ Loss / recovery
```

**Decisions:**

- Case identity stays the largest element; issue type becomes quiet context.
- Metadata is condensed into one scannable line.
- Status and owner actions align to the identity block instead of floating at
  the viewport edge.
- Replace the generic primary-surface introduction with the first real
  evidence section.
- Introduce the Evidence Spine only for stages present in the record.
- Source facts, merchant findings, and system inference use distinct labels,
  icons, and tonal rows; colour is not their sole distinction.
- Recommendation axes remain visually independent.
- The decision rail uses a quiet tonal plane and a stronger commit region,
  rather than a separate generic card.
- At 1024–1279, the rail moves inline immediately after the recommendation
  summary; it does not squeeze the evidence column.
- Local tabs become sticky only after the record identity leaves the viewport.
- Activity/timeline rows align source, event, actor, and timestamp on one
  consistent baseline.

### 5.4 Builder pages

**Routes:** Rules, recovery rules, Flows, Flow detail, provider configuration,
import mapping, and other multi-step configuration.

**Composition:**

- validation/state strip;
- ordered editing sequence;
- live preview or simulation output;
- one publication/commit region; and
- audit/version context.

**Decisions:**

- The editor remains the dominant object.
- Validation appears adjacent to the step it concerns and in one summary.
- Preview stays visible at 1440px+, moves below at narrower widths, and never
  makes the editor narrower than 620px.
- Sequence lines and step numbers are neutral; violet marks current editing
  focus only.
- Draft/published/version states are text-backed.
- Simulate, save, publish, rollback, and delete keep their exact existing
  semantics and permission checks.

### 5.5 Settings and administration

**Routes:** every `/settings/**` route, Team, Billing, Notifications,
Agreements, Audit trail, data controls, API access, and connector setup.

**Decisions:**

- Local settings navigation remains grouped and uses a 216px rail at 1280+.
- At 1024–1279, navigation becomes a compact grouped index above the content.
- Ordinary forms use a `680–760px` readable measure inside the available
  workspace rather than spanning the full content column.
- Help text remains directly below its control and caps near 68 characters.
- Related settings become joined sections separated by 24–32px, not repeated
  white cards.
- Save/commit actions sit at the end of their owned section.
- Existing dirty-state detection may expose a sticky save bar; do not invent
  dirty state where none currently exists.
- Destructive controls remain spatially separate and require their current
  confirmations.
- Provider setup uses verified logos, connection state, last verification,
  scope, and a single clear next step.

### 5.6 Setup and entry

**Routes:** Login, signup, reset, reset update, and onboarding.

**Auth decisions:**

- Use a `44/56` context/form split at 1280+, not the current near-equal split.
- Context headline caps at 64px and no longer dominates the full viewport.
- Replace excess empty space with a compact three-row proof sequence using
  existing factual content.
- The form remains a direct 400–420px column with 40px principal controls.
- Form identity, title, fields, submit, support copy, and alternate path fit in
  one standard laptop viewport.
- At below 960px, retain the existing single-column form path and remove the
  context panel from the reading flow.

**Onboarding decisions:**

- Use a centered maximum width of 1120px.
- Place progress in a 208px column and the task in a 680–760px work region.
- Reduce the empty top band and bring the current task into the first viewport.
- Progress communicates complete/current/upcoming through icon, label, and
  text—not opacity alone.
- The current task’s action remains visible at the bottom of the work region
  without covering fields.
- Connection steps show what will be checked, the returned state, and the
  recovery path if verification fails.
- Setup completion points directly to the first meaningful product destination.

### 5.7 Public narrative

**Routes:** Landing, pricing, demo, and product-proof sections.

**Hero decisions:**

- Retain the existing factual headline and CTA destinations.
- Cap the standard-laptop headline at 72px and reduce its measure so it reads as
  one authored statement rather than a wall of type.
- Make the real product proof the hero’s visual focal object.
- Increase the proof frame’s effective size and crop to the decisive evidence
  region; do not scale the full application until labels become unreadable.
- Keep one primary and one secondary action.
- Move the merchant-control qualifier close to the CTA rather than leaving it
  as detached footnote copy.

**Page sequence:**

1. Product promise plus live proof.
2. Source-to-decision Evidence Spine.
3. Case recommendation proof.
4. Connected context/integrations.
5. Merchant-control and product-boundary proof.
6. Pricing/access decision.
7. Final CTA and legal footer.

**Rules:**

- No decorative eyebrow/kicker system.
- No generic feature-card grid.
- No fake browser controls, traffic lights, glass, or gradient spectacle.
- Product images must be current deterministic captures.
- Each section gets one visual idea and one factual argument.
- Public motion is limited to reveal, state progression in the real demo, and
  restrained product-frame transitions.

### 5.8 Read surfaces

**Routes:** Help and legal pages.

- Use a 680–740px reading measure.
- Legal local navigation remains visible at wide widths and becomes in-flow at
  narrower public widths.
- Heading hierarchy, lists, definitions, tables, and links carry structure;
  no ornamental card treatment.
- Help search and article destinations remain operational and scannable.
- Print remains legible and strips navigation/elevation.

### 5.9 Pocket Brief embedded surfaces

**Surfaces:** Chrome popup, Zendesk app, Gorgias widget and unlock view, and any
visible host-constrained companion UI.

- Preserve the current Pocket Brief anatomy.
- Move connection state and decisive finding into the first 120px.
- Use a compact evidence-spine variant only when two or more real source stages
  are available.
- Keep 13px body type, 38px primary controls, and host-native scrolling.
- Keep one next action; secondary destinations become text links.
- Do not import authenticated shell, desktop tables, or dashboard metrics.
- All disconnected, partial, error, locked, and permission states retain an
  actionable recovery path.

---

## 6. State and content-range contract

Every archetype must explicitly support:

- healthy populated;
- minimum one-record;
- maximum realistic label and value length;
- empty;
- filtered empty;
- loading;
- partial;
- stale;
- disconnected;
- unavailable;
- permission denied;
- locked/entitlement;
- inline validation;
- recoverable error;
- destructive confirmation;
- success;
- not found; and
- dark, reduced-motion, forced-colour, 200% zoom, and keyboard use.

### Long-content rules

- Merchant/customer/provider names: test at 40 characters.
- Queue next action: test at 90 characters plus a 140-character supporting
  sentence.
- Currency: test GBP, USD, EUR, and a longer ISO currency presentation.
- Financial value: test at least `£1,234,567.89`.
- Source identifier/hash: test 32+ characters.
- Localised control label: test at 1.35× current English length.
- Missing values remain `Unavailable`, `Not recorded`, or the canonical
  product-specific absence label; never an unqualified dash or zero.

---

## 7. Implementation programme

The programme is sequential. Each phase makes one coherent visual change,
performs one bounded desktop/mobile-or-host inspection, and stops. Do not start
the next phase while the current phase has a visible defect.

| Phase | Outcome | Primary ownership |
|---|---|---|
| `ES-00` | Freeze baseline and map archetypes | Design docs, manifest, capture matrix |
| `ES-01` | Repair Work and supported-width layout | Work queue, workbench, table primitives |
| `ES-02` | Refine shell, page rhythm, and adaptive rail | Authenticated shell and page chrome |
| `ES-03` | Establish Evidence Spine and shared craft primitives | Shared components, tokens, gallery |
| `ES-04` | Recompose all queues and registries | Work, Cases, Customers, operational lists |
| `ES-05` | Recompose case and connected record details | Case, customer, loss, recovery, source records |
| `ES-06` | Recompose dashboard, reports, and charts | Overview, Reports, charts, financial registries |
| `ES-07` | Recompose boards, rules, flows, and integrations | Builders, boards, configuration |
| `ES-08` | Recompose settings and administration | All settings, notifications, help |
| `ES-09` | Recompose public, auth, onboarding, legal | Public/entry/read surfaces |
| `ES-10` | Refine Pocket Brief embeds | Chrome, Zendesk, Gorgias |
| `ES-11` | Finish states, motion, dark mode, and accessibility | All changed surfaces |
| `ES-12` | Hard cutover, full proof, and screenshot approval | All 245 ledger entries |

### ES-00 — Baseline and archetype map

Deliver:

- retain the current 245-entry ledger as the exhaustive source list;
- add an `ES` phase/archetype column or companion mapping without duplicating
  routes;
- record the current flagship captures as before evidence;
- record the P0 Work defect as an explicit acceptance failure; and
- add no new visual compatibility namespace.

Complete when every ledger entry belongs to exactly one `ES` implementation
phase and one page archetype.

### ES-01 — Work and responsive integrity

Primary files:

- `components/work/WorkQueue.tsx`
- `components/work/WorkQueuePulse.tsx`
- `components/work/WorkQueuePulse.module.css`
- `components/workbench/WorkbenchPage.tsx`
- `components/authenticated/AuthenticatedPageChrome.module.css`
- `components/ui/DataTable.tsx`
- `styles/authenticated/tables.css`

Deliver:

- five-column Work table composition;
- no source-mark/title collision;
- no one-word primary-text wrapping;
- bounded local table overflow;
- risk rail → band → summary adaptation;
- controls that remain usable at 1024; and
- matching loading, empty, bulk-action, error, saved-view, and drawer states.

Acceptance:

- 1440×900, 1280×800, and 1024×900 all show a readable first five rows;
- no page-level horizontal overflow;
- every row action, object link, checkbox, saved view, search, and deadline
  destination remains intact; and
- keyboard traversal follows the visible reading order.

### ES-02 — Shell and page rhythm

Primary files:

- `components/nav/**`
- `components/layout/**`
- `components/authenticated/**`
- `components/workbench/**`
- `styles/authenticated/tokens.css`
- `styles/authenticated/surfaces.css`
- `styles/authenticated/composition.css`

Deliver:

- adaptive sidebar widths;
- compact 1024 icon rail;
- tighter page header/body rhythm;
- title/action baseline alignment;
- consistent first-object placement; and
- tooltip/accessibility support for compact navigation.

Acceptance:

- no route loses a destination or context label;
- 1024 gains primary-work width without becoming a mobile composition;
- sidebar, utility header, route progress, command palette, notifications, and
  account controls remain fully functional; and
- the same shell proportions hold in light, dark, forced colours, and 200%
  zoom.

### ES-03 — Shared Evidence Spine and craft primitives

Create or extend:

- lifecycle/evidence sequence primitive;
- source fact row;
- finding/inference row;
- causal financial equation;
- compact insight band;
- adaptive supporting region;
- direct chart readout; and
- success/updated feedback treatment.

Rules:

- extend the existing component system; do not create a second design package;
- add only role-named tokens;
- add all primitives to `/dev/design-system`;
- verify min/typical/max labels; and
- keep source/finding/inference semantics explicit in markup.

### ES-04 — Queues and registries

Cover:

- Cases;
- Customers;
- Losses;
- Recovery;
- Exceptions;
- Notifications;
- Report records;
- Flow runs;
- Team registry; and
- every other tabular/list registry in the ledger.

Deliver:

- stable primary/action column;
- consolidated state presentation;
- authored toolbar hierarchy;
- sticky header where useful;
- bounded overflow;
- selection continuity; and
- geometry-matched states.

### ES-05 — Record details

Cover all detail routes in the ledger.

Deliver:

- compact identity/meta header;
- real Evidence Spine where applicable;
- source/finding/inference distinction;
- integrated action/decision region;
- adaptive rail placement;
- aligned activity history; and
- connected-object consistency.

Case detail is the calibration surface. Do not roll to the remaining details
until it passes at all three supported widths.

### ES-06 — Financial and analytical surfaces

Cover Overview, Reports, Losses, Recovery analytics, chart-containing detail
sections, and records exports.

Deliver:

- one lead financial story;
- reconciliation equation;
- direct chart conclusions;
- improved series labels and hover/focus readouts;
- first-row/insight visibility in the first viewport; and
- honest partial/unavailable chart states.

### ES-07 — Builders, boards, and integrations

Deliver:

- ordered editing sequences;
- validation adjacency;
- responsive preview placement;
- board lanes that retain readable width;
- provider connection anatomy;
- clear publish/commit regions; and
- unchanged simulate, save, publish, rollback, connect, sync, and disconnect
  behaviour.

### ES-08 — Settings and administration

Deliver:

- readable form measures;
- adaptive grouped navigation;
- joined section rhythm;
- clear save ownership;
- precise destructive zones;
- consistent connector settings; and
- matched loading, error, and success states.

### ES-09 — Public, entry, onboarding, and read

Deliver:

- product-proof-led landing hero;
- revised public scale and section pacing;
- Evidence Spine product explanation;
- aligned pricing and CTA composition;
- compact auth context/form split;
- task-focused onboarding;
- readable help/legal measure; and
- current deterministic captures.

No product claim, price, legal term, route, or CTA destination changes.

### ES-10 — Pocket Brief

Deliver:

- first-120px decisive state;
- compact provenance sequence;
- one primary action;
- host-native overflow;
- aligned disconnected/error/locked states; and
- rebuilt Chrome distribution and Zendesk package after visual validation.

### ES-11 — Finish states and accessibility

Perform one bounded cross-product pass for:

- keyboard and focus order;
- focus visibility and restoration;
- text spacing and 200% zoom;
- dark mode;
- forced colours;
- reduced motion;
- long labels and currency;
- loading/empty/error geometry;
- scroll containment;
- overlay layering; and
- non-colour state cues.

Fix the full batch once, confirm once, and stop.

### ES-12 — Hard cutover and final proof

Requirements:

- no parallel `ES`/legacy visual branch;
- no screenshot-only component fork;
- no unused route-local token generation;
- no duplicate page-archetype shell;
- every ledger entry remains checked;
- all interaction destinations remain represented;
- production build passes;
- focused component and visual-regression tests pass;
- production route matrix passes;
- flagship captures pass at 1440×900, 1280×800, and 1024×900;
- dark, reduced-motion, and forced-colour flagship captures pass;
- product-proof captures are regenerated from the real route; and
- one independent Impeccable finish review returns `ship`.

---

## 8. File and component decisions

### Extend rather than replace

- `PageFrame`
- `AuthenticatedPageHeader`
- `AuthenticatedPanel`
- `WorkbenchPage`
- `DetailPageShell`
- `RegistrySurface`
- `DataTable`
- existing chart primitives
- status, priority, source, button, input, modal, drawer, tooltip, and empty
  state primitives

### Consolidate

- route-local table width and row-density rules;
- duplicate record-detail headers;
- page-local metric strips;
- public/auth type scales;
- settings section wrappers;
- lifecycle progress treatments; and
- save/success feedback.

### Do not introduce

- a parallel `v2` component directory;
- a new global CSS token namespace;
- one CSS module per visual state;
- inline colour/radius/shadow values;
- page-specific copies of the Evidence Spine;
- an animation library solely for this iteration; or
- a screenshot mode that renders different UI.

---

## 9. Acceptance scorecard

Each calibration route must score `4` or better in every dimension before its
archetype rolls out.

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Dominant object | Competing cards | Primary region exists | Purpose is unmistakable in five seconds |
| Evidence hierarchy | Facts blur together | Labels distinguish sources | Source, finding, inference, and gap are instantly legible |
| Action clarity | Several equal actions | Primary action exists | Next action follows naturally from the evidence |
| Responsive integrity | Clipping/collision | Operable with compromise | Fully composed at 1440, 1280, and 1024 |
| Density | Empty or cramped | Generally balanced | First viewport completes a meaningful work story |
| Visual signature | Generic SaaS | Coherent Unauth palette | Product mechanism is recognisable without logo |
| State quality | Placeholder-like | Major states covered | Every state preserves geometry, truth, and recovery |
| Accessibility | Serious defect | Automated checks pass | Keyboard, zoom, forced colours, and motion all feel intentional |

Calibration routes:

- `/work`
- `/claims/[id]`
- `/dashboard`
- `/reports`
- `/settings/account`
- `/landing`
- `/login`
- `/onboarding`
- one Chrome popup result; and
- one helpdesk widget result.

---

## 10. Verification protocol

For each phase:

1. Implement the owned composition.
2. Run the smallest focused component/type checks.
3. Inspect all changed routes in one browser session:
   - authenticated: 1440×900, 1280×800, 1024×900;
   - public/auth/onboarding: 1440×900, 1024×900, 768×1024, 390×844;
   - embedded: native host dimensions.
4. Fix the complete observed batch.
5. Confirm once.
6. Update the phase report and coverage mapping.
7. Stop; do not polish in an open loop.

Final commands should include the maintained equivalents of:

```text
npm run typecheck
npm run lint:authenticated-design
npm run verify:ui-parity
node scripts/visual-rebuild/check-coverage-ledger.mjs
npm run dev:marketing -- --build
```

Use focused tests for changed tables, charts, record shells, public sections,
onboarding, extension rendering, and helpdesk packages. Do not revive obsolete
programme verifiers.

---

## 11. Boundaries and anti-goals

This iteration does not:

- change product logic, financial definitions, recommendation logic,
  permissions, database schema, APIs, mutation behaviour, or audit semantics;
- add autonomous decisions, payouts, refunds, recovery submissions, or
  responsibility assignment;
- change route structure, redirect behaviour, deep links, query state, saved
  views, exports, or browser history;
- fabricate customers, values, outcomes, connections, or marketing claims;
- convert missing/partial/stale data into zero or healthy presentation;
- create a mobile authenticated product below 1024px;
- replace the current logo, Inter, violet, cool-neutral palette, or semantic
  state system;
- add a second visual theme; or
- trade accessibility or information density for screenshot cleanliness.

---

## 12. Definition of done

The iteration is complete only when:

- `ES-00` through `ES-12` are complete;
- the Work table defect is absent at every supported width;
- all six page archetypes are visually distinct but system-consistent;
- the Evidence Spine is present only where lifecycle truth supports it;
- every primary route shows a meaningful work object or conclusion in the
  first viewport;
- every public/entry screenshot is balanced at standard laptop height;
- all 245 registered surfaces and their states remain covered;
- no user-visible capability or destination regresses;
- the hard-cutover checks find no parallel or dead visual generation;
- the optimized production build passes; and
- the final independent finish review returns `ship`.

No further visual-direction decision is required before implementation.
