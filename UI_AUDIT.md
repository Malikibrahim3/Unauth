# UI / UX Audit

## Overall Assessment
This application has a strong functional foundation, but the experience feels assembled from competent dashboard parts rather than shaped into a cohesive enterprise product. The app communicates what it does, but not always what to do next, and it relies heavily on dense tables, small labels, and implicit product knowledge.

## Global UX
- **Navigation clarity:** The left sidebar is understandable, but the IA is only partially coherent. “Dashboard,” “Upload,” “History,” and “New Audit” overlap conceptually, while “Lookup,” “Customers,” and “Watchlist” are related investigative views that are not grouped or explained as a workflow.
- **Information hierarchy:** Most pages start with a small title and then immediately hit the user with a wall of cards, tables, or filters. Primary actions are present, but they do not always visually dominate the screen enough to establish the next step.
- **Discoverability:** Key controls are hidden behind low-salience patterns: advanced filters are collapsed, watchlist actions are tiny, row actions compete with row clicks, and some important guidance lives in dismissible banners that can disappear permanently.
- **Workflow friction:** The app expects users to understand CSV exports, identity fields, risk tiers, and fraud terminology before they can succeed. Upload mapping, advanced customer filtering, and lookup all require significant manual input with limited guidance or validation help.
- **Onboarding assumptions:** Onboarding assumes the user already knows their store metrics and fraud concerns. It does not explain the product model, what “good” data looks like, or how the audit workflow should be used day to day.

## Visual Design
- **Typography issues:** The UI relies on generic small-body enterprise typography with weak contrast between title, support copy, and metadata. Many pages use the same scale for primary titles and secondary labels, which flattens the hierarchy.
- **Spacing inconsistencies:** Some screens breathe well, but others become crowded quickly, especially in upload mapping, lookup, and the customer detail views. Vertical rhythm is inconsistent across pages; section spacing changes from page to page without a clear system.
- **Color problems:** The palette is functional but overused. Gray dominates, while amber/red/green/blue badges are applied to many different meanings, which reduces semantic clarity. Important warnings and informational states often look too similar.
- **Hierarchy issues:** Cards, banners, tables, and callouts all compete at roughly the same visual weight. Pages such as audit results and customer intelligence need a stronger primary/secondary hierarchy to guide scanning.
- **Alignment problems:** Several list and table layouts feel assembled rather than aligned to a strict grid. Mixed action placement, uneven column widths, and repeated icon-only controls create a slightly unfinished look.
- **Density problems:** The app is very information-dense, but not always intentionally dense. Some density is appropriate for fraud analysis; the problem is that density is not balanced with enough whitespace, progressive disclosure, or visual grouping.

## Component Audit

### Tables
- Tables are the dominant UI pattern, but they are too often visually identical: thin borders, light gray headers, tiny rows, and minimal differentiation between interactive and read-only content.
- Row actions are weakly signposted. In several tables the primary action is a small text link or an icon-only dismiss/remove control that is easy to miss.
- Tables do not scale well on small screens, and there is little evidence of sticky headers, column prioritization, or responsive table treatment.
- The audit result tables are especially dense and should likely use stronger grouping, sticky headers, and summary rows or filters.

### Filters
- The customers filter bar is powerful but intimidating. It exposes a large number of filters with little hierarchy, no saved presets, and no clear summary of the active filter state beyond the URL.
- Advanced filters are discoverable only if the user already suspects they exist; they are not visually framed as a separate, optional analysis mode.
- There are no filter chips, no “applied filters” summary, and no one-click recovery path for complex search states.

### Forms
- Forms are functional but basic. Inputs are consistent in shape, but labels, helper text, and validation states are minimal.
- The upload mapping form is the largest offender: it presents a high-cognitive-load form with many dropdowns, but not enough guidance on what matters most or what can be ignored.
- Lookup has two separate forms on one page that feel similar but support different jobs, which increases the chance of user confusion.

### Buttons
- Button hierarchy is inconsistent. Some primary actions are strong black buttons, while important actions elsewhere are low-contrast text links or icon-only controls.
- Destructive actions are too small and too quiet. Deleting audits, dismissing transactions, and removing watchlist entries rely on tiny controls that do not feel enterprise-grade.
- Several buttons lack sufficient explanation in their labels. “Watch,” “Remove,” and icon-only dismiss actions assume context the UI does not always provide.

### Cards
- Cards are the default packaging pattern for summary metrics and customer profiles, but many of them are visually generic.
- Metric cards repeat across pages without enough differentiation, so the app can feel like the same component pasted everywhere.
- Some cards are good, especially where they combine numeric summary with a meaningful state, but the overall system lacks a stronger design language.

### Charts
- There are effectively no charts in the UI. For an analytics and fraud-audit product, this is a major gap.
- Trend views, score distribution, time-based anomalies, and comparison graphs would materially improve interpretation speed.

### Modals / Drawers
- The customer intelligence drawer is the main overlay pattern and is implemented reasonably well, but it still feels like a utility panel rather than a polished enterprise surface.
- The drawer is dense, long, and content-heavy. It works, but it does not feel optimized for fast triage.
- There is no clear visual system for overlays beyond this drawer, and the app lacks a stronger modal convention for destructive or confirmatory flows.

### Detail Pages
- Detail pages contain a lot of useful data, but most of them rely on stacked cards and tables instead of a strong narrative hierarchy.
- The product often shows the evidence, but not the decision path. This is especially visible in customer, transaction, and audit result pages.

### Empty States
- Empty states are present and generally informative, but they are mostly text blocks with one action.
- They explain what is missing, but not always what the user should do next or how long the next step will take.

### Loading States
- Loading states are uneven. The drawer has a skeleton, and some buttons show loading text, but most page transitions are hard-cut navigations without spatial or structural placeholders.
- The upload flow has the most sophisticated state handling, but the rest of the app does not match that level of polish.

### Error States
- Error states are functional but not reassuring.
- Most errors are plain red boxes or inline text with little recovery guidance.
- There is limited use of remediation links, retry patterns, or error-specific next steps.

## Per Screen Audit

### Landing Redirect (/)
- **What works:** The redirect is clean and avoids a redundant landing page.
- **What feels outdated:** There is no product-level entry point, so the first impression is immediately utilitarian.
- **Usability issues:** Users get no orientation before entering the authenticated app shell.
- **Enterprise UX issues:** This assumes the app is already known and trusted.
- **Scalability issues:** Fine as a redirect, but not enough if the product later needs marketing, trials, or role-based entry.

### Login
- **What works:** The form is simple, readable, and low-friction.
- **What feels outdated:** It looks like a generic auth form rather than a polished enterprise login experience.
- **Usability issues:** Sign-in and sign-up are toggled in-place with little explanation of what changes between modes.
- **Enterprise UX issues:** There is no SSO, no organization context, and no trust-building content.
- **Scalability issues:** This flow may become too barebones if teams, roles, or enterprise auth are added later.

### Onboarding
- **What works:** The form is short and the next step is clear.
- **What feels outdated:** It is a plain centered card with no progress indicator or contextual education.
- **Usability issues:** The inputs ask for business data without explaining why each answer matters.
- **Enterprise UX issues:** The page assumes the user already understands terminology like order volume and primary fraud concern.
- **Scalability issues:** This onboarding will feel too shallow if more setup steps are added.

### Dashboard
- **What works:** It gives a fast overview of audit volume, transaction count, and flagged volume.
- **What feels outdated:** The table-heavy layout and tiny filenames feel more like an ops console than a premium analytics product.
- **Usability issues:** Status semantics are inconsistent in the code and the page does not clearly explain what a user should inspect first.
- **Enterprise UX issues:** There is no trend view, no comparison over time, and no obvious prioritization beyond raw counts.
- **Scalability issues:** As the number of runs grows, the single table will become difficult to scan without filters, sorting, or saved views.

### Upload / New Audit
- **What works:** This is one of the strongest workflows in the app. The step-by-step mapping, template download, and data-quality guidance are genuinely useful.
- **What feels outdated:** The experience is long, text-heavy, and visually flat for such an important workflow.
- **Usability issues:** The user must understand CSV structure, optional identity fields, and platform-specific export quirks before they can succeed.
- **Enterprise UX issues:** Mapping dozens of fields in a single vertical panel creates unnecessary cognitive load for busy operators.
- **Scalability issues:** The form will become unwieldy as more fields, platforms, or validation rules are added.

### Help / CSV Export Guide
- **What works:** It is thorough and gives the user practical guidance on improving data quality.
- **What feels outdated:** It reads like a long documentation page rather than a task-oriented help experience.
- **Usability issues:** The page is text-dense and difficult to skim under pressure.
- **Enterprise UX issues:** Users need faster “what should I do now?” guidance, not just a field encyclopedia.
- **Scalability issues:** If more export platforms are added, the page will become even more unwieldy without stronger structure.

### Lookup
- **What works:** The page supports two valuable jobs: historical lookup and quick scoring.
- **What feels outdated:** It looks like two stacked utility forms rather than a polished investigation workspace.
- **Usability issues:** The split between “search” and “quick check” is useful but not immediately legible, and the page is very dense for first-time users.
- **Enterprise UX issues:** Important cross-merchant context and caveats are easy to miss because they sit below the form instead of shaping the experience upfront.
- **Scalability issues:** This will get harder to use as result types and lookup modes grow.

### Customers Overview
- **What works:** This is the strongest example of an investigation table with meaningful filtering and sorting.
- **What feels outdated:** The dense table presentation and small action targets feel a step behind modern enterprise tools.
- **Usability issues:** The filter bar is powerful but overwhelming, and the relationship between basic and advanced filters is not obvious enough.
- **Enterprise UX issues:** There is no saved search, no pinned views, no filter chips, and no comparison mode.
- **Scalability issues:** The current table and filter stack will strain once the customer base becomes large.

### Customer Detail (/customers/[id])
- **What works:** It surfaces meaningful risk, behavior, and identity context in one place.
- **What feels outdated:** The page is highly card-based and somewhat static in presentation.
- **Usability issues:** The profile confidence, fraud flags, and narrative are useful but not always clearly prioritized.
- **Enterprise UX issues:** The page needs stronger triage structure: what is the risk, why is it risky, and what should the operator do next?
- **Scalability issues:** With more data, this layout will become too long and too repetitive without stronger sectioning and collapsible regions.

### Watchlist
- **What works:** It gives a clear monitoring view and makes recent appearances easy to spot.
- **What feels outdated:** The list/table structure is functional but basic, and removal actions are too small.
- **Usability issues:** The recent appearances section and the main watchlist are visually separate, which can make the page feel split in two.
- **Enterprise UX issues:** There is no bulk management, filtering, or review workflow for larger watchlists.
- **Scalability issues:** The page will become unwieldy as the watchlist grows beyond a few dozen entries.

### History
- **What works:** It is straightforward and easy to understand.
- **What feels outdated:** It largely duplicates the dashboard’s run table without adding enough value.
- **Usability issues:** Users may wonder why they need both pages.
- **Enterprise UX issues:** Duplicate IA reduces trust in the information architecture.
- **Scalability issues:** Maintaining two nearly identical run-history surfaces will become harder as the product expands.

### Audit Results (/audit/[runId])
- **What works:** This is the most complete page in the app. The summary cards, risk legend, data quality banner, export action, and drilldowns form a strong analyst workflow.
- **What feels outdated:** The page still leans heavily on stacked tables and static cards rather than a more modern analytical layout.
- **Usability issues:** There is a lot of content competing at the same level, and the three major tables do not guide attention in a deliberate sequence.
- **Enterprise UX issues:** The page needs more prioritization, more comparison, and more visual summarization before diving into row-level detail.
- **Scalability issues:** As transaction counts rise, the current structure will require filtering, clustering, or summary charts to stay usable.

### Audit Customers (/audit/[runId]/customers)
- **What works:** The customer grouping and summary cards are useful for understanding linked identities within a run.
- **What feels outdated:** The customer cards are long and repetitive, with a lot of identical visual blocks.
- **Usability issues:** Scanning many customer profiles is hard because the list is vertically heavy and the most useful signals are buried inside each card.
- **Enterprise UX issues:** This needs stronger prioritization, collapsed defaults, and better comparative cues.
- **Scalability issues:** The card list will become expensive to scan once there are many customer profiles.

### Audit Transaction Detail (/audit/[runId]/transaction/[id])
- **What works:** It is clear, direct, and easy to parse.
- **What feels outdated:** It is a very literal detail page with limited narrative or contextual framing.
- **Usability issues:** The page shows facts well but does not help the user compare this transaction to the rest of the run.
- **Enterprise UX issues:** Operators usually need a stronger explanation of why the case matters, not just the row attributes.
- **Scalability issues:** This will feel too static if the product expands into case review or decision workflows.

### Audit Customer Legacy Route (/audit/[runId]/customer/[hash])
- **What works:** It provides a focused per-customer transaction timeline.
- **What feels outdated:** The route and presentation feel like an older generation of the product.
- **Usability issues:** The page uses a different model and rhythm from the newer customer intelligence surfaces, which can confuse users.
- **Enterprise UX issues:** Inconsistent route patterns and duplicated concepts make the app feel less coherent.
- **Scalability issues:** This route should be treated carefully; it reads as a legacy artifact rather than a scalable destination.

## Mobile / Responsive
- **Layout breakpoints:** The app is primarily desktop-first. The fixed sidebar layout, wide tables, and multi-column card grids are not optimized for small screens.
- **Overflow issues:** Tables, dense cards, and long identifiers will overflow or become awkward to scan on mobile without stronger responsive table behavior.
- **Density issues:** Some pages collapse their grids well, but the overall information density remains too high for mobile workflows.
- **Interaction issues:** Row clicks, tiny icons, and icon-only destructive actions are especially difficult to use on touch devices.
- **Shell behavior:** The app shell does not appear to have a mobile navigation pattern, so the sidebar will likely become a major usability problem below desktop widths.

## Benchmark Gaps

### Amplitude
- Missing analytical depth: no charts, cohorts, trend breakdowns, or comparison surfaces.
- Missing saved analyses: no named filters, pinned views, or reusable investigative workflows.
- Missing interpretability: the app shows data, but not enough analytics scaffolding around the data.

### Stripe
- Missing polish in hierarchy: Stripe-like products feel calmer, more precise, and more intentional at every scale.
- Missing data visualization discipline: the app needs cleaner summary blocks and fewer competing surfaces.
- Missing transaction-grade UX: destructive actions, confirmations, and state transitions are not as refined as a Stripe-style product.

### Linear
- Missing speed cues: there is no command palette, keyboard-first navigation model, or highly compressed workspace rhythm.
- Missing clarity under density: Linear makes dense information feel effortless; this app often makes dense information feel heavy.
- Missing interaction refinement: buttons, focus states, and overlays do not yet feel as crisp.

### Modern Enterprise SaaS
- Missing saved views, filters, and reporting shortcuts.
- Missing stronger loading, empty, and error state systems.
- Missing responsive data-table treatment and mobile-safe navigation.
- Missing consistent use of toast notifications, inline remediation, and guided next steps.
- Missing a unifying design system that makes cards, tables, forms, and overlays feel like one product.

## Bottom Line
The app is credible and useful, but it still feels like a technical dashboard that prioritizes function over confidence, speed, and polish. The biggest opportunity is not a redesign for its own sake; it is to reduce cognitive load, strengthen hierarchy, and make the investigative workflow feel more guided and enterprise-grade.