# Detailed design description

## Product and operating model

Unauth is designed as a post-purchase payout-control workspace for ecommerce merchants. Its job is to reconcile order, ticket, shipment, refund, return, dispute, and recovery evidence; expose financial exposure; recommend a policy outcome; and keep the final payout decision with an authorised merchant operator.

The core product model is an evidence spine:

`source facts → case or loss classification → recommendation → merchant decision → recovery handoff → ledger outcome`

The interface repeatedly reinforces that spine. A case is not presented as a generic support ticket: it is a bounded financial decision with evidence quality, ownership, next action, timing, and recovery consequences. The same records can be read from several operational angles — work queue, case queue, loss ledger, recovery board, customer registry, rule registry, and flow registry — while retaining a consistent status vocabulary.

## Visual point of view

The visual direction is “quiet precision”: instrument-like, calm, and information-dense without looking like a spreadsheet. The product is meant to help an operator make careful decisions under uncertainty, so the visual system avoids spectacle and gives attention to the current work surface, the state of the evidence, and the next action.

The main canvas is a light, warm-neutral surface with white or near-white content cards. Borders are subtle and low-contrast, corners are modestly rounded, and shadows are reserved for elevated objects such as menus, dialogs, drawers, and the decision rail. The persistent sidebar is a darker visual anchor, while the main working area stays bright enough for long sessions.

The product accent is a restrained violet/indigo. It is used for active navigation, primary affordances, selected filters, chart emphasis, links, and focus/selection states. Violet is deliberately not used as a meaning-bearing status by itself; operational meaning is carried by explicit labels and semantic colors.

## Typography and content hierarchy

The typography is a modern system sans/Inter-like voice. The hierarchy is compact:

- Page titles are prominent but not oversized, usually around the low-20px range with a strong but not black weight.
- Section headings are smaller and clearly grouped, allowing long operational pages to scan as a set of named regions.
- Supporting descriptions are short, muted, and sentence-case. They explain why a surface exists rather than narrating every control.
- Dense metadata uses small labels, compact values, and deliberate grouping for dates, owners, currency, IDs, and source names.
- Reference numbers and record identifiers benefit from monospaced or visibly tabular treatment where precision matters.
- Status and action copy is plain language: “Needs evidence”, “Waiting on carrier”, “Ready for decision”, “Unavailable”, “Validated values only”, and “Draft”.

The content design favors operational verbs and bounded claims. It distinguishes “approved” from “recovered”, and “eligible” from “safe to use”. When seeded data cannot support a conclusion, the product shows “Unavailable” or a warning rather than silently turning absence into zero.

## Shell and navigation

The shell is persistent and two-level:

1. A left workspace sidebar provides the stable information architecture: Overview, Work, Cases, Losses, Recovery, Customers, Rules, Flows, Reports, Integrations, Settings, and Help.
2. A compact top utility bar provides global search, unread notifications, and the account/workspace menu.

The sidebar groups destinations into operational categories such as Work and Configure, then Reports and setup. This makes the product feel like a control centre rather than a collection of disconnected pages. The workspace identity and operator identity remain visible, which is valuable in a tool where ownership and authorisation matter.

The sidebar can collapse to make space for wide registries and case workbenches. The capture includes both collapsed and restored states so the effect on horizontal density can be critiqued. A global “One source needs attention” notice is placed near the workspace identity; it links data freshness concerns to the integrations surface without hijacking the entire page.

## Dashboard and analytics

The dashboard is an executive-to-operator bridge. It starts with the time range, comparison period, and currency controls, then presents the “Payout position” as four mutually legible states: Exposure, Recovered, Prevented, and Realised loss.

The segmented metric treatment makes the same underlying financial model explorable without forcing the user to change pages. The captured metric states show how the chart and summary content respond to the selected position. A “View data” control opens the underlying chart data as an accessible table, which supports verification and makes the graphic less of a black box.

The dashboard also treats trust as a first-class visual layer. Freshness, ledger validation, and decision-safe scope are visible near the financial summary. “Review details” and “View all trust details” open the detailed trust dialog with source-level freshness, stale counts, unavailable sources, and the ledger exception. This is an intentional design choice: a financial number is accompanied by its qualification, rather than relying on a footnote or hidden tooltip.

## Work queue and cases

Work is optimized for prioritisation. The page establishes the number of open items, overdue/due-today pressure, and the current operational queue before exposing row-level work. A “More views” disclosure keeps secondary saved views available without permanently consuming navigation space. The captured menu includes no-deadline, blocked, evidence-needed, decision-needed, integration-exception, and completed views.

Row actions are intentionally compact and contextual. The captured action menu includes Assign to me, Start, Snooze 1 day, and Complete. These are reversible or bounded workflow actions and stay attached to the row that gives them meaning.

Cases uses a queue with segmented filters such as Needs evidence, Awaiting carrier, Awaiting 3PL, Ready for decision, Manual review, and Closed. The queue can also be sorted by updated time, oldest, ageing, or value. This makes status and urgency directly navigable instead of forcing an operator into a generic search flow.

The case detail is a workbench. A header summarizes the customer, case reference, issue type, state, value, owner, and dates. The main body uses regions for evidence and recommendations, responsibility, recovery, activity, and comments, while a complementary merchant-decision rail stays visible. The design makes the recommendation subordinate to the authorised merchant decision.

The Maya Chen capture preserves an evidence-loading failure: the case says that evidence could not be loaded, no recommendation or decision was changed, and the decision rail is unavailable until the required evidence context is present. This is an important product state, not an accidental omission: it communicates the safety boundary of the system.

## Losses and recovery

Losses is a ledger view for loss attribution and financial follow-through. It uses registry density and explicit source/claim terminology to help an operator distinguish what happened from what can be recovered. The detail page turns a ledger entry into a traceable record with status, amount, source context, and connected operational facts.

Recovery is a board rather than a flat list. Cards group progress by source outcome and show next action, recoverable value, deadline, source update, evidence completeness, and partner/source owner. The board makes pending operational work visible alongside reconciled outcomes.

Recovery detail uses a cumulative progression model: Sought, Approved, Recovered, Outstanding. The copy explicitly says that approved value is not presented as received cash. This guards against a common financial-product ambiguity and gives each amount a semantic definition.

Recovery actions are progressively disclosed. The capture opens the “More recovery actions” menu without performing a mutating action, and includes the case-context drawer. The drawer loads a related case summary with status, exposure, next action, related records, activity, and a link to the full case. This supports quick triage while preserving the full case as the canonical decision surface.

## Registries and configuration

Customers, Rules, Flows, Reports, Integrations, and Settings share a registry grammar: a named page, a concise operational subtitle, a count or health summary, filters or views, and rows/cards that expose enough detail to choose what to open.

The customer registry includes quick filters for open cases, refunds, and chargebacks. Customer preview is a drawer-like surface; the captures preserve both its loading and persistent-loading states because those are the states the seeded environment exposed. This lets Claude critique perceived responsiveness and recovery messaging rather than seeing only an idealized loaded panel.

Rules are policy objects. The registry shows priority, version, and active state. A rule detail page separates the evaluation sequence into When, If, and Recommend, and explains that a recommendation never approves, denies, or pays a case automatically. Version history and “Use as new draft” reinforce immutable published versions and safe change management.

Flows are bounded workflow automation. The registry distinguishes draft state, trigger, action count, and version. Flow detail uses Trigger, Conditions, and Bounded action sections and explicitly states that publishing and live execution are disabled for drafts. Flow runs is a table-shaped history surface; the seeded account currently exposes a truthful empty state explaining when runs will appear.

Reports and Integrations are setup and observability surfaces. Reports separates overview from records, while Integrations separates connected providers, browse/catalog, and import records. The integration catalog provides provider-specific entry points, and the settings area mirrors integration configuration for operator administration.

Settings is a grouped administrative surface: account, team, billing, platform, notifications, API integrations, agreements, data privacy, audit trail, and provider setup. The captures include the main administrative pages and API integration settings; the manifest calls out which pages are registry-level versus expanded/filtered states.

## Interaction and progressive disclosure

The interaction system is built around a small set of repeatable patterns:

- Filter chips and segmented tabs keep high-value operational slices one click away.
- Menus contain secondary views and bounded row actions without permanently expanding the page.
- Drawers provide quick context and preserve the current list or board underneath.
- Detail pages use named regions and breadcrumb links to preserve orientation.
- Dialogs expose trust detail, chart data, or a customer/case preview only when needed.
- Draft/test controls are visible on configuration detail pages, while publishing or decision side effects are clearly bounded.
- Loading, unavailable, stale, and error states are written as product states rather than generic technical failures.

The expanded captures are specifically useful for judging whether progressive disclosure is discoverable enough, whether menus are anchored and proportionate, and whether the product reveals the right amount of context without making every page permanently long.

## Color and semantic status

Violet/indigo is the product interaction accent. Teal, green, amber, and red are reserved for semantic distinctions such as connected/healthy, recovered/paid, warning/stale, and blocked/error. Status is also written as text, so color is supportive rather than the only carrier of meaning.

The system uses muted neutrals for secondary content and data-dense surfaces, with stronger contrast for titles, money, deadlines, and decision states. Warnings and trust exceptions are visually distinct but not alarmist. The intent is to create an environment where an operator can see risk quickly without living in a permanently red interface.

## Layout and density

The layout adapts its density to the job:

- Dashboard: broad summary cards, a chart, trust qualification, and drill-through data.
- Registries: compact rows/cards and high-value filters.
- Board: repeated cards with status, next action, owner, and amount.
- Detail workbench: a primary evidence/decision column with complementary context and action rail.
- Settings/help: grouped cards and explanatory text with lower information density.

Spacing is compact enough for operational scanning but uses card boundaries, section labels, and whitespace to prevent the page from becoming a uniform block. The most important object is usually the one elevated surface — the current dialog, drawer, menu, or decision rail — while the rest of the page recedes.

## Design review focus for Claude

The most valuable critique questions are:

- Does the shell make the product’s evidence-to-decision model obvious within the first few seconds?
- Is the difference between exposure, prevented, realised loss, recovered, approved, and outstanding visually and verbally clear?
- Is the dense operational information easy to scan without losing the source, date, owner, or confidence context?
- Are trust warnings and unavailable values prominent enough without overwhelming the core work?
- Do the menu, drawer, dialog, filter, and detail patterns feel like one coherent interaction system?
- Do loading and error states communicate what is safe, what is blocked, and what the operator can do next?
- Is the separation between Unauth recommendations and merchant-owned decisions visually unmistakable?
- Are focus, keyboard navigation, contrast, table semantics, and non-color status communication strong enough for an operational tool?
- Where would the desktop-first density fail on smaller screens or at zoomed text sizes?
