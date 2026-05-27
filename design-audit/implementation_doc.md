# Unauth UI/UX Modernisation Implementation Document

Generated: 27 May 2026  
Scope: product design, frontend implementation guidance, fraud-ops workflow guidance  
Important: this document is a handoff artifact. No app source code was changed as part of this audit.

## 1. Design Direction

### Target Product Feel

Unauth should feel like a calm enterprise fraud-ops console for ecommerce merchants. The target is not a consumer app and not a generic analytics dashboard. It should feel like an analyst can open it at 9am, see the riskiest work first, make evidence-backed claim decisions quickly, and defend every decision later through audit trails and reports.

Target attributes:

- Premium and serious
- Operationally calm
- Dense but easy to scan
- Trustworthy with customer data
- Fast to triage
- Evidence-first
- Warm and distinctive without feeling beige
- Enterprise-ready for large ecommerce operations

### How To Modernise Without Turning The App Blue

Do not solve the palette by making Unauth look like every fintech/risk product. The warm parcel-adjacent brand can work if it is used with more discipline.

The new balance should be:

- **Neutral enterprise surfaces dominate:** near-white raised surfaces, warm graphite text, pale neutral canvas, crisp borders.
- **Rust/copper becomes a controlled brand accent:** primary actions, active nav, selected filters, small chart accents, logo dot.
- **Risk/status colors become semantic:** red for critical fraud, amber for SLA warning, green for legitimate/safe, teal/slate for data/privacy/info.
- **Brown should not be the default fill for every state:** avoid using rust for charts, warnings, active nav, primary buttons, table accents, and status at the same time.
- **Contrast should increase:** muted text and borders need stronger separation from cream surfaces.

### Relevant Visual References

Use these as directional references, not direct visual copies:

- **Linear:** compact density, calm hierarchy, precise interaction states.
- **Ramp:** operational finance seriousness, clear tables, restrained surfaces.
- **Stripe Dashboard:** trust, data source clarity, strong developer/admin surfaces.
- **Pylon or Intercom admin surfaces:** work queues, inbox-style priority, fast triage.
- **Retool Enterprise:** dense operational layouts without marketing flourishes.

Avoid:

- Decorative gradients and large illustrative hero treatments inside the app.
- Generic dashboard card grids with no operational priority.
- One-note beige or brown UI.
- AI-generated visual flourishes.

### Preserve This

Preserve these current strengths:

- Customer profile dossier, especially evidence scope and identity signals.
- Inbox/queue concept.
- Claim workflow concepts: duplicate prevention, outcome, evidence, response template, reopen/reversal.
- Evidence packages and dispute-readiness framing.
- Audit trail concept.
- DM Sans and compact type direction.
- Sidebar/header workbench shell, once naming and spacing are cleaned up.

## 2. Design Principles

1. **Operational calm over visual noise.** Use fewer boxes, clearer hierarchy, and steady interaction states.
2. **Risk clarity over generic metrics.** Every page should answer what needs attention and why.
3. **Warm brand accents, neutral enterprise surfaces.** Rust is a brand/action accent, not the entire UI.
4. **Evidence-first decisions.** Claims, customer profiles, and reports should foreground evidence and provenance.
5. **Shorter flows.** Analysts should resolve common claims without unnecessary manual setup.
6. **Status visible everywhere.** Claim status, SLA, risk, evidence readiness, and Shopify sync state should be legible at a glance.
7. **No raw enums in UI.** Human labels for statuses, actions, confidence grades, events, and metadata.
8. **Tables are the product.** Data tables need the most polish because fraud ops lives there.
9. **Trust is part of the interface.** Data source, sync state, actor, permission, and retention details should be explicit.
10. **Default to analyst speed, expose detail on demand.** Dense summaries first, expandable detail second.

## 3. Token-Level Recommendations

### Current Token Files

- `app/globals.css`
- `tailwind.config.ts`

Current state:

- There are multiple overlapping token systems: brand tokens, spec tokens, shadcn aliases, workbench surface tokens, landing tokens, dark mode tokens, risk/severity tokens.
- Warm surface values dominate: `--brand-paper`, `--bg-canvas`, `--surface-base`, `--surface-overlay`, `--surface-muted`.
- `--text-muted: #6E7A8A` is cool blue-grey against warm paper, which creates a subtle tonal mismatch.
- `--brand-rust`, `--copper-bright`, severity reds, and warm chart colors compete for attention.

### Recommended App Token Structure

Keep legacy aliases temporarily, but introduce one canonical app layer and migrate components toward it.

#### Background

Recommended role:

- `--app-canvas`: page background, pale warm neutral, not beige-heavy.
- `--app-canvas-subtle`: alternate band background.
- `--app-sunken`: table header, filters, input backgrounds.

Acceptance criteria:

- The full app no longer reads as beige-on-beige.
- Page canvas and card surfaces are visibly distinct at normal laptop brightness.

#### Surface

Recommended role:

- `--surface-raised`: cards, panels, drawers, popovers, usually near-white.
- `--surface-panel`: task panels and table containers.
- `--surface-selected`: selected nav/filter background, lightly tinted rust only when selected.

Acceptance criteria:

- Cards and tables feel crisp without heavy shadows.
- Selected states do not look like warnings.

#### Border

Recommended role:

- `--border-subtle`: internal table rows and card separators.
- `--border-default`: card edges, input edges.
- `--border-strong`: focus/selected outlines or critical separators.

Acceptance criteria:

- Borders remain visible on warm canvas but do not create a boxed-in admin-template feel.

#### Text

Recommended role:

- `--text-primary`: warm graphite, high contrast.
- `--text-secondary`: metadata and table secondary text.
- `--text-muted`: muted labels, should be warm-neutral rather than blue-grey.
- `--text-disabled`: disabled fields/buttons.

Acceptance criteria:

- Table secondary text is readable at 13px.
- Labels and metadata meet contrast expectations on canvas and input backgrounds.

#### Primary/Action

Recommended role:

- `--action-primary`: rust/copper, used for primary buttons.
- `--action-primary-hover`: darker rust.
- `--action-primary-soft`: selected filter/nav fill.

Acceptance criteria:

- Primary actions are visually stronger than filter chips and status badges.
- Rust is not used for unrelated chart series and warnings.

#### Warm Accent

Recommended role:

- Logo dot
- Active nav indicator
- Selected filter tint
- One primary report series
- Small highlight in empty states

Avoid:

- Filling every KPI card
- Filling every warning
- Large chart areas
- Table row backgrounds except selected state

#### Risk Colours

Recommended semantic mapping:

- Critical fraud: red, strong text, pale red fill
- High risk: vermilion or red-orange
- Medium risk: amber
- Low risk/legitimate: green
- Info/data/privacy: teal/slate

Acceptance criteria:

- Risk, SLA, status, and confidence badges are visually distinct.
- No badge requires knowing internal enum values to understand it.

#### Success/Warning/Danger

Recommended:

- Success: legitimate, recovered, safe, completed sync.
- Warning: SLA approaching, evidence missing, pending external info.
- Danger: overdue, suspected fraud, destructive action, sync failed.

Acceptance criteria:

- Warning and danger no longer share the same rust family as primary actions.

#### Radius

Recommended:

- 4px: small badges, inputs inside dense tables.
- 6px: buttons, controls, table containers.
- 8px: cards and panels.
- 12px only for modals/drawers if current design needs softer emphasis.

Acceptance criteria:

- Cards are 8px radius or less unless reused design system components require otherwise.

#### Shadow

Recommended:

- Default surfaces should use border plus very subtle shadow only when elevated.
- Drawers/modals can use stronger depth.
- Avoid heavy soft shadows on every card.

Acceptance criteria:

- The app feels flatter in the good enterprise sense, not visually flat in hierarchy.

#### Spacing

Recommended scale:

- 4px: fine gaps inside controls.
- 8px: compact internal spacing.
- 12px: table cells and badges.
- 16px: card padding in dense surfaces.
- 24px: page section separation.
- 32px: major page blocks.

Acceptance criteria:

- Repeated page templates use consistent header, filter, table, and panel spacing.

#### Typography

Keep DM Sans and DM Mono.

Recommended type scale:

- Page title: 20 to 24px, semibold, visible H1.
- Section title: 15 to 16px, semibold.
- Table body: 13 to 14px.
- Metadata: 12px, medium weight.
- KPI values: 24 to 32px depending on container, tabular numerics.
- Badge text: 11 to 12px, semibold.
- Mono IDs: 12 to 13px with truncation/copy affordance.

Acceptance criteria:

- Every primary app route has a visible H1.
- No table or badge relies on raw enum shorthand.

## 4. Component-Level Implementation Plan

### App Shell And Sidebar

Current problem:

- Brand/merchant display truncates awkwardly as `Unauth .x aurora...`.
- Navigation labels are inconsistent.
- Active nav is helpful but warm fill blends with other warm UI.

Desired behavior/look:

- Product logo and merchant switcher should be visually separate.
- Sidebar should use canonical IA labels.
- Active state should be clear but not heavy.

Implementation details:

- Update `components/nav/Sidebar.tsx` and `components/layout/MerchantEnvChip.tsx`.
- Show `Unauth` wordmark as fixed product identity.
- Move merchant name/domain into a compact switcher chip or header control with tooltip.
- Rename IA consistently: Dashboard, Inbox, New audit, Audit history, Reports, Customers, Claims, Watchlist, Evidence packages.
- Use active nav treatment: 3px rust rail, very pale selected fill, semibold text.

Acceptance criteria:

- Merchant name can be understood at 1440px and 1280px.
- No nav label conflicts with page title or route.
- Active nav is visible without looking like an alert.

### Page Header

Current problem:

- Several workbench pages have empty or visually weak H1s.
- Header actions are not always aligned with the analyst's next task.

Desired behavior/look:

- Every page gets a visible H1, concise subtitle, primary action, and optional context chips.

Implementation details:

- Standardize `components/ui/PageHeader.tsx` and `components/workbench/WorkbenchPage.tsx`.
- Ensure server pages pass non-empty `title`.
- Use header layout:
  - Left: H1 and subtitle.
  - Middle or right: filters/context chips if needed.
  - Right: primary action and secondary export/settings action.

Acceptance criteria:

- H1 appears on Dashboard, Inbox, Customers, Claims, Watchlist, Evidence packages, Settings subpages, Upload, Reports.
- Primary action is visible above the fold where relevant.

### KPI Cards

Current problem:

- KPI cards are useful but generic and sometimes too beige/boxy.
- Reports overuse small cards without narrative.

Desired behavior/look:

- KPI cards should explain metric, value, trend, and operational meaning.

Implementation details:

- Update `components/ui/MetricCard.tsx` and `components/workbench/WorkbenchKpiStrip.tsx`.
- Add optional `trend`, `trendTone`, `context`, and `href`.
- Use neutral surface, compact border, tabular numeric value, and a small semantic trend badge.
- Avoid rust fill except for selected or key branded metric.

Acceptance criteria:

- Dashboard KPIs answer "what changed?" and "what should I do?"
- Reports KPIs can be exported or read by a manager without guessing metric meaning.

### Data Tables

Current problem:

- Tables are functional but not premium.
- Claims table exposes UUIDs and breaks at 1024px.
- Row actions and priority hierarchy are weak.

Desired behavior/look:

- A shared enterprise table system with sticky header, compact density, readable rows, clear state badges, and laptop-safe behavior.

Implementation details:

- Update `components/ui/DataTable.tsx`.
- Add table features:
  - Sticky header.
  - Optional sticky first column.
  - Optional sticky action column.
  - Row hover with clear pointer behavior.
  - Density modes: comfortable and compact.
  - Column priority for responsive widths.
  - Horizontal-scroll shadow/affordance.
  - Empty/loading/error states.
  - Sort indicators.
- Update per-page table data:
  - Claims: customer name/email, risk score, claim status, SLA, at risk, evidence readiness, updated.
  - Customers: customer name/email, risk, confidence, orders, refunds, claims, LTV, latest order, watchlist.
  - Watchlist: name/email, reason, first seen, last seen, appeared 30d, claims, last action.
  - Audit trail: actor, action, object, summary, timestamp.

Acceptance criteria:

- Claims table remains usable at 1024px.
- No primary table cell shows raw UUID as the main label.
- Analysts can open a claim/customer from the row without hunting.

### Status Badges

Current problem:

- Badges are numerous but semantically overloaded.

Desired behavior/look:

- One badge taxonomy for claim status, SLA, risk, confidence, evidence, sync, and environment.

Implementation details:

- Update `components/ui/Badge.tsx`, `components/ui/RiskScoreBadge.tsx`, `components/ui/ConfidenceBadge.tsx`.
- Define badge variants:
  - `status.open`, `status.review`, `status.pending`, `status.escalated`, `status.resolved`
  - `sla.normal`, `sla.approaching`, `sla.overdue`
  - `risk.critical`, `risk.high`, `risk.medium`, `risk.low`
  - `evidence.ready`, `evidence.partial`, `evidence.missing`
  - `sync.connected`, `sync.warning`, `sync.error`
- Add optional tooltip for confidence grades.

Acceptance criteria:

- Badge color alone is never the only signal.
- Raw statuses such as `under_review` never render directly.

### Search And Filter Bars

Current problem:

- Filters work, but they feel visually similar to page chrome and sometimes take too much space.

Desired behavior/look:

- Search and filters should be compact, persistent, and easy to reset.

Implementation details:

- Update `components/ui/FilterBar.tsx`, `components/ui/FilterChip.tsx`, `components/customers/CustomersFilterSheet.tsx`.
- Use a single filter grammar:
  - Search input
  - Primary filter chips
  - More filters drawer/dropdown
  - Active filter summary
  - Clear all
- Add count in active chips when useful.

Acceptance criteria:

- Filter state is obvious from URL and UI.
- Filters do not push the table far below the fold.

### Claim Panel

Current problem:

- Strong workflow, but form-heavy and not anchored enough to a selected claim.

Desired behavior/look:

- A two-column professional claim review workspace:
  - Left: customer/order/evidence context and active claim summary.
  - Right: task panel for decision/outcome/status/response.
  - Bottom: timeline and history.

Implementation details:

- Update `app/(app)/customers/[id]/claims/page.tsx` and `components/claims/ClaimReviewPanel.tsx`.
- Default to the highest-priority active claim.
- Preselect the order if duplicate warning has a known order.
- Add compact sticky claim summary:
  - Customer name/email
  - Risk score
  - Claim type/status
  - SLA age
  - Amount at risk
  - Last touch
- Split actions into:
  - Review claim
  - Add evidence
  - Decide outcome
  - Customer response
  - Reopen/reverse, only when applicable
- Disable actions with explicit reason text, not just greyed buttons.

Acceptance criteria:

- Analyst can resolve a standard claim in 3 to 5 clicks after opening the page.
- Duplicate warning links directly to the existing claim review.
- Internal notes and customer-facing response are clearly separated.

### Timeline And Event History

Current problem:

- Audit history exists but often renders as raw metadata.
- Claim timeline requires selection even in a claim-specific context.

Desired behavior/look:

- Human event timeline with actor, action, object, timestamp, and concise summary.

Implementation details:

- Update `components/ui/Timeline.tsx`, `components/claims/ClaimReviewPanel.tsx`, `lib/claims/events.ts`.
- Create event label map:
  - `claim_created`: Claim created
  - `note_added`: Internal note added
  - `evidence_added`: Evidence added
  - `outcome_added`: Outcome recorded
  - `claim_resolved`: Claim resolved
  - `claim_reopened`: Claim reopened
  - `decision_reversed`: Decision reversed
  - `customer_response_copied`: Customer response copied
  - `status_changed`: Status changed
- Show raw metadata only inside "View technical details".

Acceptance criteria:

- Managers can understand claim history without reading JSON or IDs.
- Timeline is populated for selected claim by default.

### Evidence Cards

Current problem:

- Evidence exists, but attachment/source/provenance hierarchy is understated.

Desired behavior/look:

- Evidence cards should look like defensible proof, not file attachments.

Implementation details:

- Update `components/ui/EvidenceList.tsx`, `components/evidence/EvidencePackagePreview.tsx`, `components/evidence/DisputeReadinessPanel.tsx`.
- Card fields:
  - Evidence type
  - Source system
  - Added by
  - Added at
  - Verification state
  - Linked order/claim
  - View/copy/export action
- Add source icons for Shopify, carrier, support ticket, manual, payment dispute.

Acceptance criteria:

- Evidence provenance is visible above the fold in package detail.
- Analyst can tell what evidence is missing.

### Customer Response Cards

Current problem:

- Customer response exists and is a good concept, but it sits as a large beige text area.

Desired behavior/look:

- Response templates should feel controlled, safe, and support-ready.

Implementation details:

- Update `components/claims/ClaimReviewPanel.tsx`.
- Add response tone/status:
  - Awaiting evidence
  - Approved refund
  - Denied with evidence
  - Escalated
  - Customer-safe request for info
- Show copy action, last copied timestamp, and who copied it.
- Add warning that internal signals are excluded.

Acceptance criteria:

- Customer-facing copy never exposes fraud labels or internal risk signals.
- Copy action writes an audit event.

### Reports Charts

Current problem:

- Charts are too sparse and visually dated.

Desired behavior/look:

- Reports should look credible enough for a manager to screenshot.

Implementation details:

- Update `app/(app)/reports/page.tsx` and chart components.
- Add:
  - Claim volume trend
  - Approved vs denied vs partial stacked bar
  - Value at risk vs refunded/recovered
  - Resolution funnel
  - Overdue claims trend
  - Export menu
- Use neutral grid, clear labels, restrained palette, and tooltip/legend.

Acceptance criteria:

- Every chart has title, subtitle, axis/legend, and date range.
- Rust is used as one accent series, not the entire chart language.

### Empty States

Current problem:

- Missing routes and some empty states do not guide the user.

Desired behavior/look:

- Every empty/error state should be branded, useful, and safe.

Implementation details:

- Update `components/ui/EmptyState.tsx`.
- Add `app/(app)/not-found.tsx` or route-specific not-found pages.
- Empty state fields:
  - What happened
  - Why it may be empty
  - Primary next action
  - Secondary link
  - Data safety note when relevant

Acceptance criteria:

- Missing route screenshots no longer show default not-found.
- Empty tables show import/connect/create/retry actions.

### Loading States

Current problem:

- Loading states exist but are not consistently route-specific.

Desired behavior/look:

- Skeletons should preserve layout and reduce perceived latency.

Implementation details:

- Update `components/ui/LoadingState.tsx`.
- Add skeleton variants for table, profile dossier, claim panel, chart, and settings card.

Acceptance criteria:

- No major page shifts dramatically after load.
- Skeletons match final content dimensions.

### Forms

Current problem:

- Inputs, selects, and textareas often look default-like and are not always properly labeled.

Desired behavior/look:

- Compact enterprise controls with accessible labels, clear helper text, and strong focus/error states.

Implementation details:

- Update `components/ui/Field.tsx`, `components/ui/Input.tsx`, `components/ui/Select.tsx`.
- Require:
  - Label `htmlFor`
  - Help text
  - Error text
  - Disabled reason
  - Focus ring
  - 36 to 40px control height in dense pages

Acceptance criteria:

- Playwright can locate form controls by label on login and claim review.
- Disabled buttons explain why they are disabled.

## 5. Page-Level Implementation Plan

### Dashboard

Keep:

- KPI strip
- Trend/insight concept
- Consistent shell

Change:

- Make it queue-first.
- Add "Next up" panel with overdue/high-risk/awaiting-evidence items.
- Add Shopify sync status only when actionable.
- Replace generic chart emphasis with operational summary.

Priority: Phase B

Acceptance criteria:

- A fraud analyst can choose their next case in under 30 seconds.
- Dashboard has clear H1 and primary next action.

### Inbox

Keep:

- Queue model
- Bulk selection idea
- Analyst triage surface

Change:

- Strengthen priority ordering and row hierarchy.
- Add SLA/risk badges, assigned user, next action, quick review action.
- Make row hover/action behavior clear.

Priority: Phase B

Acceptance criteria:

- Queue can be sorted by SLA, risk, value at risk, and last updated.
- Bulk actions are visible only after selection.

### Customers List

Keep:

- Dense table
- Search/filter
- Risk/confidence/claim context

Change:

- Rename consistently as Customers.
- Add visible H1.
- De-duplicate demo/baseline data for demo mode or clearly separate imported records.
- Improve risk and watchlist row treatment.

Priority: Phase A

Acceptance criteria:

- No Customers/Clusters naming conflict.
- Rows are readable at 1024px and 1280px.

### Customer Profile

Keep:

- Dossier
- Evidence scope
- Identity signals
- Cross-merchant context
- Claims/order sections

Change:

- Reduce same-weight boxes.
- Separate risk, identity confidence, and evidence confidence.
- Replace system-oriented copy such as Compile signal data.
- Add a sticky case summary or right rail on scroll.

Priority: Phase B

Acceptance criteria:

- Manager can understand why the customer is risky in under 15 seconds.
- Primary action to claim review is visible above the fold.

### Customer Claims Page

Keep:

- Duplicate prevention
- Claim action tabs
- Evidence attachment
- Customer response
- Reopen/reversal
- Timeline

Change:

- Fix customer context loading.
- Default to active claim.
- Reduce manual setup.
- Keep evidence/timeline tied to selected claim.
- Improve button hierarchy and disabled-state explanations.

Priority: Phase B

Acceptance criteria:

- Claim review page opens with a selected claim when one exists.
- Analyst can save evidence and outcome with clear feedback and audit event.

### Claims List

Keep:

- Operational columns
- Filters for status/SLA
- Date/age/value data

Change:

- Replace UUID customer cells with customer name/email/risk.
- Add sticky action column.
- Add responsive column priority.
- Fix wrapping of order refs and evidence IDs.

Priority: Phase A

Acceptance criteria:

- Claims table remains usable at 1024px.
- Every row has an obvious Review action.

### Reports

Keep:

- Claim operations metrics
- Date range switcher
- Export concept

Change:

- Redesign as manager-ready report.
- Add narrative summary and trend deltas.
- Replace sparse charting.
- Add resolution funnel and value-at-risk/recovered split.
- Expand export menu.

Priority: Phase B

Acceptance criteria:

- A manager can use the page in a weekly ops report without manual interpretation.
- Export actions are visible and correctly scoped to the selected date range.

### Watchlist

Keep:

- Watchlist table
- Search
- Reason context

Change:

- Fix appearance metrics.
- Add last seen and source context.
- Add row action to review customer/claims.
- Use distinct watchlist badge/icon treatment.

Priority: Phase A

Acceptance criteria:

- Recent appearance counts match underlying customer/claim/order activity.
- Watchlist row explains why the customer is on the list.

### Upload

Keep:

- Clear dropzone
- Template download
- Processing steps

Change:

- Compress layout.
- Make validation and import provenance more enterprise-ready.
- Fix wrapping KPI/step copy.
- Add recent imports and recovery actions.

Priority: Phase B

Acceptance criteria:

- Upload page above the fold includes import action, validation expectations, and recent import status.

### Audit Trail

Keep:

- Append-only audit concept
- Settings placement, or promote if needed

Change:

- Humanize actions.
- Show actor name/email/role.
- Add filters.
- Move raw metadata behind detail disclosure.

Priority: Phase C

Acceptance criteria:

- Compliance reviewer can understand every row without seeing raw IDs first.

### Settings, Privacy, Team

Keep:

- Team roles and invite concept
- Shopify integration page concept
- Account/settings grouping

Change:

- Fix Shopify contradiction.
- Add `/settings/data-privacy`.
- Add clear data scope, retention, deletion, DPA, audit logging, permissions.
- Separate active team members from pending invites.
- Guard owner/destructive actions.

Priority: Phase A for Shopify contradiction; Phase C for broader trust surfaces.

Acceptance criteria:

- Settings can reassure an enterprise buyer about data handling and access control.
- Shopify status is consistent across header and settings.

## 6. Flow Simplification Plan

### Merchant Onboarding

Current flow:

- Completed merchants redirect to dashboard.
- New merchant onboarding was not deeply exercised because seeded merchant is already setup-complete.

Ideal flow:

- Connect Shopify.
- Confirm scopes.
- Show first sync status.
- Import historical data if needed.
- Land in Inbox with first actionable queue.

Click count reduction:

- Target first value in 3 steps: Connect, Sync, Review first case.

Removed friction:

- Reduce instructional screens.
- Make sync state transparent.

Acceptance criteria:

- Merchant always knows whether Shopify is connected, syncing, failed, or waiting for permission.

### Shopify Connect

Current flow:

- Header shows connected while integrations card says not connected.

Ideal flow:

- One canonical connection state across header, settings, onboarding, and upload.
- Show shop domain, scopes, last order sync, last webhook, error/reconnect.

Click count reduction:

- From uncertain status checking to one Manage integration action.

Removed friction:

- No contradictory status.
- No guessing where to reconnect.

Acceptance criteria:

- Header and integrations page always agree.

### First Risky Customer Review

Current flow:

- Analyst can find customer via Customers/InBox, but dashboard is not strongly queue-first.

Ideal flow:

- Dashboard/InBox surfaces top-risk customer with reason.
- Click row opens profile.
- Profile top explains risk and offers Open claim review.

Click count reduction:

- Target 2 clicks from dashboard to claim review.

Removed friction:

- No search needed for daily triage.

Acceptance criteria:

- Risk reason and next action are visible in the queue row.

### Claim Creation

Current flow:

- Claim review form requires order selection, claim type, reason, notes, amount, then save.

Ideal flow:

- If claim already exists, open it.
- If order is known, preselect it.
- If only one likely claim type applies, preselect with ability to change.
- Save draft automatically or create claim when first meaningful field is completed.

Click count reduction:

- From 5 to 7 interactions to 2 to 3 for common missing parcel cases.

Removed friction:

- Fewer blank fields.
- Clear default values.

Acceptance criteria:

- Duplicate warning never requires manually recreating the same claim.

### Evidence Add

Current flow:

- Evidence fields are available but disabled until a claim is saved.

Ideal flow:

- Evidence panel is tied to selected claim.
- Drag/drop or URL/source entry.
- Source and type default from order/claim context.

Click count reduction:

- From save claim plus evidence form to attach evidence directly to active claim.

Removed friction:

- No "save first" dead end when a claim exists.

Acceptance criteria:

- Evidence attachment creates a timeline event and appears immediately.

### Decision/Outcome

Current flow:

- Decision/outcome area is tabbed but depends on claim save state.

Ideal flow:

- Decision panel shows recommended actions, risk/evidence summary, refund impact, and customer-safe response.
- Dangerous decisions ask for confirm reason.

Click count reduction:

- Target 2 clicks: choose decision, confirm.

Removed friction:

- Fewer separate fields for routine outcomes.

Acceptance criteria:

- Outcome writes audit event and updates claim row/status without page reload confusion.

### Reopen/Reversal

Current flow:

- Reopen/reverse exists as a tab, but hierarchy is similar to normal actions.

Ideal flow:

- Reopen/reverse visible only for resolved/closed claims.
- Requires reason, shows previous decision, records actor and timestamp.

Click count reduction:

- Not necessarily fewer clicks; safer clarity is more important.

Removed friction:

- No accidental use on active claims.

Acceptance criteria:

- Reversal timeline clearly shows previous decision, new decision, reason, and actor.

### Reporting/Export

Current flow:

- Reports page has range filter and claims CSV export.

Ideal flow:

- Date range, KPI deltas, claim funnel, value at risk/recovered, export menu.
- Export options: claims CSV, outcomes CSV, audit trail CSV, PDF summary.

Click count reduction:

- From manual interpretation to one export/screenshot-ready page.

Removed friction:

- Numbers have context and date range baked in.

Acceptance criteria:

- Head of ops can report upward from the page without additional spreadsheet cleanup.

## 7. Priority Roadmap

### Phase A: Immediate Visual Credibility Fixes, 1 to 2 Days

Tasks:

- Fix Shopify status contradiction.
- Add route redirects or canonical pages for `/new-audit`, `/audit-history`, `/evidence-packages`, `/settings/data-privacy`.
- Replace raw customer UUIDs in claims table.
- Fix claims table 1024px behavior.
- Add visible H1s to workbench pages.
- Fix login labels and H1.
- Canonicalize IA labels.
- Reduce warm/beige dominance through token tweaks.
- Fix watchlist recent appearance metric.
- Fix sidebar merchant/logo truncation.
- Fix Upload KPI/step wrapping.

Likely files:

- `app/globals.css`
- `tailwind.config.ts`
- `components/nav/Sidebar.tsx`
- `components/layout/AppHeader.tsx`
- `components/layout/MerchantEnvChip.tsx`
- `components/shopify/SyncStatusCard.tsx`
- `app/api/shopify/status/route.ts`
- `app/(auth)/login/page.tsx`
- `app/(app)/claims/page.tsx`
- `components/ui/DataTable.tsx`
- `app/(app)/watchlist/page.tsx`
- `components/upload/UploadClient.tsx`

Dependencies:

- Canonical Shopify status decision.
- Agreement on route naming.

Expected score improvement:

- Overall 72 -> 80 to 82.
- Integrations 48 -> 78+.
- Claims 72 -> 78+.

### Phase B: Workflow Polish, 3 to 5 Days

Tasks:

- Redesign claim review panel around selected active claim.
- Make dashboard/inbox queue-first.
- Improve all primary tables.
- Redesign reports as manager-ready.
- Improve customer profile hierarchy and action labels.
- Humanize claim events and timeline.
- Improve upload validation and import status.
- Add evidence card provenance.

Likely files:

- `components/claims/ClaimReviewPanel.tsx`
- `app/(app)/customers/[id]/claims/page.tsx`
- `app/(app)/dashboard/page.tsx`
- `components/inbox/InboxClient.tsx`
- `components/dashboard/InsightsStrip.tsx`
- `app/(app)/reports/page.tsx`
- `components/ui/Timeline.tsx`
- `lib/claims/events.ts`
- `components/evidence/*`
- `components/customers/*`

Dependencies:

- Phase A table and token cleanup.
- Reliable claims/customer query joins.

Expected score improvement:

- Overall 80 -> 86 to 88.
- Customer claims 73 -> 84+.
- Reports 66 -> 80+.

### Phase C: Enterprise Trust And Admin Polish, 1 to 2 Weeks

Tasks:

- Build `/settings/data-privacy`.
- Upgrade audit trail to compliance-ready presentation.
- Improve team management permission states.
- Add Shopify scopes, sync history, webhook health, reconnect, and data-source transparency.
- Add permission-aware reveal/copy for sensitive customer data.
- Add branded not-found/error states.
- Add export permissions and audit events for downloads.

Likely files:

- `app/(app)/settings/data-privacy/page.tsx`
- `app/(app)/settings/audit-trail/page.tsx`
- `app/(app)/settings/team/page.tsx`
- `components/settings/TeamManagementClient.tsx`
- `components/settings/BulkDeleteClient.tsx`
- `components/shopify/SyncStatusCard.tsx`
- `app/not-found.tsx`
- `components/ui/EmptyState.tsx`
- `lib/permissions.ts`

Dependencies:

- Permission model clarity.
- Data retention/DPA policy decisions.

Expected score improvement:

- Overall 86 -> 90 to 92.
- Enterprise trust across settings and audit surfaces moves into enterprise-grade range.

### Phase D: Best-In-Class Refinement, Longer-Term

Tasks:

- Add saved table views and density preferences.
- Add command palette actions for Open claim, Search customer, Export report.
- Add subtle motion and microfeedback.
- Add advanced fraud graph/relationship visualisation only where useful.
- Add assignment, comments, SLA ownership, and manager review states.
- Add guided weekly report and pilot-demo mode.

Likely files:

- `components/layout/CommandPalette.tsx`
- `components/ui/DataTable.tsx`
- `components/ui/Drawer.tsx`
- `components/ui/Tabs.tsx`
- `components/global/GlobalIdentityGraphClient.tsx`
- `components/customers/IdentityClusterGraph.tsx`

Dependencies:

- Stable core IA, table system, claim workflow, and trust surfaces.

Expected score improvement:

- Overall 90 -> 94+.
- ASOS-level impression becomes credible if data integrity and enterprise workflow polish are also strong.

## 8. Acceptance Checklist

### Visual

- [ ] Warm/rust tones are accent, not dominant background.
- [ ] Page canvas, raised surfaces, table headers, and selected states are visually distinct.
- [ ] No page relies on nested cards as its primary hierarchy.
- [ ] Cards use 8px radius or less unless intentionally modal/drawer.
- [ ] Icons and badges follow a shared taxonomy.
- [ ] Charts use neutral grids and controlled semantic colors.

### UX

- [ ] Every major route has visible H1, subtitle, and clear primary action where relevant.
- [ ] Dashboard and Inbox surface next work within 30 seconds.
- [ ] Claims, Customers, Watchlist, Audit history, and Evidence packages use the shared table system.
- [ ] Filters are visible, resettable, and reflected in URL.
- [ ] Empty/error states provide a next step.
- [ ] Missing expected routes are redirected or branded with recovery.

### Accessibility

- [ ] Login inputs and all form controls are locatable by label in Playwright.
- [ ] Focus rings are visible on keyboard navigation.
- [ ] Table controls, icon buttons, and destructive actions have accessible names.
- [ ] Badge meaning is not conveyed by color alone.
- [ ] Claims table remains usable at 1024px.
- [ ] Text contrast passes on warm surfaces.

### Fraud-Ops Workflow

- [ ] Claims table shows customer name/email/risk, not UUID as primary identity.
- [ ] Claim review defaults to the active/high-priority claim.
- [ ] Duplicate warning links to existing claim.
- [ ] Evidence attachment records source, actor, time, and claim.
- [ ] Decision/outcome writes timeline and audit events.
- [ ] Reopen/reversal requires reason and records before/after state.
- [ ] Customer-facing response excludes internal fraud/risk signals.

### Enterprise Trust

- [ ] Shopify status is consistent across header, onboarding, settings, and upload.
- [ ] Settings include a real data privacy page.
- [ ] Audit trail shows actor, role, human action, object, timestamp, and expandable metadata.
- [ ] Team management separates active members from pending invites.
- [ ] Destructive actions are guarded and audited.
- [ ] Reports include date range, deltas, export scope, and metric definitions.

### ASOS Demo Readiness

- [ ] Demo data has no duplicate or obviously fake operational artifacts visible in key tables.
- [ ] Dashboard opens to priority work, not a generic chart wall.
- [ ] A risky customer can be reviewed from queue to decision in a short, defensible flow.
- [ ] Reports are screenshot-ready for a manager.
- [ ] Data privacy, audit trail, Shopify sync, and team permissions feel mature.
- [ ] No route, label, or status contradiction appears during a scripted walkthrough.
