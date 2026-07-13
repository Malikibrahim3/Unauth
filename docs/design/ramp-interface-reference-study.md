# Ramp interface reference study

Updated: 2026-07-13

## Scope and sources

This is a focused implementation study, not a history or a pixel-copy brief. It uses current public product and support material to identify interaction principles appropriate for Unauth's authenticated finance-operations product.

Primary references:

- [Ramp Help Center: setting up spend request approvals](https://support.ramp.com/hc/en-us/articles/20843280013459-Setting-up-spend-request-approvals)
- [Ramp Help Center: simplified workflow builder](https://support.ramp.com/simplified-workflow-builder-faq/)
- [Ramp Help Center: procurement quick start](https://support.ramp.com/ramp-procurement-quick-start-guide/)
- [Ramp Help Center: spend requests and limit increases](https://support.ramp.com/hc/en-us/articles/4409480530707-Spend-requests-and-spending-limit-increases)
- [Ramp Help Center: Policy Agent approvals](https://support.ramp.com/use-policy-agent-for-approvals/)
- [Ramp Help Center: mobile app](https://support.ramp.com/ramp-mobile-app/)
- [Ramp Help Center: configuring procurement workflows](https://support.ramp.com/configuring-procurement-workflows/)

## Pattern study

| Pattern | Observed principle | Why it works | Application to Unauth | Do not copy literally | Implementation rule |
|---|---|---|---|---|---|
| Application shell | A stable left-side product map keeps high-frequency operational areas visible while secondary configuration remains subordinate. | Users retain context while moving between queues, records, and settings. | Keep Overview, Work, Payout Control, Losses, Recovery, Customers, Rules, Flows, Reports, Integrations, and Settings predictable. | Ramp's exact labels, icons, logo, navigation grouping, or visual measurements. | One shell registry drives sidebar, command search, breadcrumbs, and active state. |
| Navigation density | Labels and icons are compact; selection is a quiet surface change rather than a loud brand block. | The product feels calm even with many capabilities. | Use 32px rows, restrained group labels, neutral icons, and a pale selected surface. | Exact Ramp colours or icon set. | Selected state must remain visible without relying on colour alone; focus remains explicit. |
| Page header | Context and primary actions are close to the data; explanatory copy is short. | More of the operational surface is visible above the fold. | Use one title, optional short subtitle, and actions aligned by importance. | Product-specific copy and exact layouts. | No duplicated title in the global header and page body. |
| Queue/table | Review work is table-first with filtering and saved/segmented views. | Dense records remain comparable and sortable. | Work, Payout Control, exceptions, losses, recoveries, customers, and report records use a common compact table grammar. | Ramp's transaction fields or status names. | 36–44px rows, tabular numerals, subdued metadata, aligned amounts, hover and keyboard access. |
| Review detail | Recommendations inform but do not replace human authority; activity remains auditable. | Reviewers understand why a suggestion exists and can override it. | Keep Unauth evidence, recommendation, matched rule, reviewer decision, and append-only history together. | Ramp Policy Agent wording or policy presentation. | Recommendation is secondary to the decision; overrides and rationale remain visible in activity. |
| Drawers | Compact secondary inspection keeps the queue in context; deeper workflows get full pages. | Users can triage quickly without losing filters or position. | Use drawers for case/customer/source previews and connection detail. | Exact drawer dimensions or content organization. | Header, status/summary, separated sections, optional full-detail link, sticky actions only when necessary. |
| Modals | Dialogs handle focused creation, confirmation, or destructive choices. | Scope and consequence stay clear. | Standardize API-key, write-off, publish/rollback, connection, and small creation dialogs. | Ramp copy and styling. | Labelled controls, focus trap, Escape, return focus, honest loading/error state, mobile fit. |
| Workflow builder | Conditions and outcomes are explicit; complex workflows can be tested and versioned. | The policy is readable and operationally safe. | Preserve Unauth rule/flow logic while using a structured builder and version workbench. | Ramp's node layouts or proprietary workflow concepts. | Prefer readable ordered steps; use canvas only where existing semantics require it. |
| Activity/audit | Changes, recommendations, overrides, and delegated actions appear in an activity view. | Operators can reconstruct decisions. | Timelines and audit tables use actor, action, object, time, and outcome consistently. | Ramp's event names. | Audit history is never reduced to decorative prose. |
| Settings | Categories are separated from the active settings form and the active category is persistent. | Large setup surfaces remain navigable. | Keep a secondary settings rail with working categories only. | Exact information architecture. | Settings content uses a narrower reading width; connection setup remains in Integrations. |
| Mobile | Critical approvals and record context remain accessible, with narrower workflows adapted rather than removed. | Time-sensitive work is still possible away from desktop. | Collapse the sidebar, preserve actions/status/amounts, allow internal table scroll, make drawers full-width. | Ramp mobile navigation. | Never hide financial/status meaning solely at a breakpoint. |

## Visual translation for Unauth

- Neutral off-white shell (`#F7F7F4`) and white working surfaces.
- Near-black primary ink with low-chroma neutral metadata.
- Thin separators; ordinary cards have no shadow.
- Primary actions are near-black. A pale yellow-green tint is reserved for selection and setup emphasis.
- Restrained green, amber, red, blue, and violet are semantic only.
- Inter/Inter Tight provide a legally distributable grotesk system; tabular numerals are enabled for financial and tabular data.
- Corners are small (4–8px), with pills reserved for statuses and filters.
- Overlay elevation is reserved for drawers, dialogs, menus, and command search.

## Intentional differences

Unauth is a post-purchase loss and recovery operating system, not a spend-management product. Its canonical statuses, record relationships, evidence confidence, recovery lifecycle, merchant isolation, and financial calculations remain Unauth-specific. No Ramp trademark, illustration, screenshot, exact product copy, or proprietary implementation is used.
