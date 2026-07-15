# Authenticated chip and badge audit

Date: 2026-07-14

## Before

The authenticated product had three overlapping systems: `StatusBadge`, the generic uppercase `Badge`, and page-local rounded controls. Claims rows combined a status, SLA state and recoverability state; filters used a cobalt selected fill; reports, notifications and losses each implemented their own segmented filter; evidence and recommendations were rendered as pills in several payout components.

| Route/component | Badge/chip type | Current component | Correct taxonomy | Action |
|---|---|---|---|---|
| `/claims` queue filters | Filter | Page-local links | `FilterChip` | Migrated; neutral selected state and aligned counts |
| `/claims` sort | Segmented control | Page-local links | `SegmentedControl` | Migrated |
| `/claims` queue rows | Status + attention | `StatusPill` + `SlaPill` + recoverability badge | One `StatusBadge`, optional SLA attention | Recoverability badge removed from row |
| `/claims` workflow | Sentence/status chips | Three `StatusBadge` instances | `RecommendationBlock` + text rows | Migrated; duplicate nearby state removed |
| `/claims` recovery | Evidence chips | `Badge`/raw spans | `EvidenceChecklist` | Migrated; keys humanised once |
| `/reports` and `/dashboard` | Period switcher | Page-local links | `SegmentedControl` | Migrated |
| Notifications | Filter and kind label | Page-local tabs + `Badge` | `SegmentedControl` + `MetadataChip` | Migrated |
| Losses | View filter | Page-local tab buttons | `SegmentedControl` | Migrated |
| Claim review next step | Action/status pill | Gradient panel + local button recipe | `Card` + `Button` | Migrated |
| Claim decision recommendation | Recommendation pill | Rounded semantic span | Recommendation text block | Pill removed |

Known review flags remaining in the authenticated tree include legacy `PanelCard` call sites, raw buttons in low-level row/action implementations, generic `Badge` consumers outside the migrated paths, and hand-built tables. These are tracked in `authenticated-component-defect-register.md`; they are not hidden by a numeric badge limit.

## After acceptance rules

- A normal queue row has one primary status badge and at most one separate SLA attention badge.
- Status badges are non-interactive, sentence case, semantic and one shared height.
- Filters are interactive and neutral when selected.
- Segmented controls have one enclosing border and no gaps between floating pills.
- Metadata is quiet and never represents a next action.
- Recommendations and evidence use prose, rows or checklists.
- Three adjacent pills require a documented product reason.
