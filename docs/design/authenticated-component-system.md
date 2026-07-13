# Authenticated component system

Updated: 2026-07-13

## Authority and isolation

`app/(app)/authenticated.css` is the authoritative signed-in token scope. The `.ua-app` root is applied only by the authenticated application layout; `.ua-auth-surface` covers authenticated onboarding and setup routes outside that layout. Public landing tokens and components remain independent.

## Foundations

| Family | Authority | Variants and use |
|---|---|---|
| Shell | `AppLayout`, `Sidebar`, `AppHeader` | Persistent desktop sidebar, collapsible compact sidebar, mobile overlay navigation, global command search, notifications, workspace/account controls. |
| Page structure | `WorkbenchPage`, `DetailPageShell`, `PageHeader`, `SettingsPageShell` | High-density list, medium-density detail, low-density setup, settings-with-rail. |
| Actions | `Button`, `ButtonLink`, `IconButton` pattern | Primary near-black; secondary bordered; ghost for quiet actions; danger only for destructive actions; link for inline navigation. |
| Inputs | `Input`, `Select`, native textarea wrappers, filter controls | Labels above fields, 36px desktop controls, 40px critical mobile controls, visible help/error text. |
| Data display | `DataTable`, table style constants, `MetricCard`, `WorkbenchKpiStrip` | Compact rows, aligned numerics, quiet headers, flat metric groups, internal horizontal overflow. |
| Status | `StatusBadge`, `ConfidenceBadge`, `SourceBadge`, `FreshnessIndicator` | Neutral by default; semantic colour only for attention, failure, completion, and material risk. |
| Containers | `Card`, `SectionCard`, `ModuleCard`, chart containers | Ordinary content is border-defined and shadowless. Overlay depth is reserved for floating UI. |
| Overlays | `Drawer`, `Modal`, `RowActionsMenu`, `CommandPalette`, `Tooltip`, toast provider | Focus trapping, Escape, return focus, labelled surfaces, mobile-fit widths. |
| Feedback | `EmptyState`, `OperationalRouteSkeleton`, `OperationalRouteError`, `Toast`, banners | Structure-matched loading, explanatory empty states, actionable failure/stale states. |
| Activity | history tables, related-record panels, case context | Actor/action/object/time/outcome order; deep link retained when previewing. |
| Builders | rule/flow workbenches and `RuleBuilderDrawer` | Structured conditions/actions, explicit versions, publish/rollback/test controls. |

## Core rules

1. Authenticated components consume semantic tokens, never landing tokens.
2. New routes use the canonical authenticated layout or the explicit authenticated setup scope.
3. Financial values use tabular numerals and never coerce unknown to zero.
4. A coloured badge is not a substitute for hierarchy or explanatory text.
5. Tables are the default for comparable operational records; cards are used for summaries and distinct modules.
6. Drawers preserve list context; multi-step work belongs on a page.
7. Modals are limited to focused creation, compact editing, and confirmation.
8. Every icon-only control has an accessible name and visible focus.
9. Reduced motion is respected across the authenticated scope.
10. Business logic, permissions, source provenance, auditability, and tenant isolation are outside the presentation refactor boundary.

## Canonical status vocabulary

- Data: Current, Updating, Partial, Stale, Unavailable, Failed.
- Confidence: Confirmed, Probable, Unknown, Conflicting.
- Financial: Exposed, Approved, Paid, Estimated loss, Confirmed loss, Recoverable, Recovered, Prevented, Written off, Final net loss.
- Case: New, Gathering evidence, Needs review, Waiting on external outcome, Decision recorded, Recovery in progress, Financially complete, Closed without loss, Voided.
