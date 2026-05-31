# Customers UI Financial-App Polish Plan

## Goal

Make the Customers page feel like a controlled financial operations surface: uniform control sizing, predictable spacing, dense but readable data, and a filter experience that looks intentionally designed rather than assembled from mixed components.

This plan targets the layout shown in the May 31 screenshots of `/customers`.

## Issues Identified

1. Control heights are inconsistent.
   The search input, sort select, status tabs, filter button, clear button, saved-view chips, page-size segmented control, and pagination buttons all use different `py`, font size, radius, border, and active-state rules.

2. Buttons do not share a visual grammar.
   `New audit` uses the shared `Button`, but `Filters`, `Clear`, pagination links, saved views, and quick filters are hand-styled links/buttons. The page therefore mixes black selected states, copper primary states, grey chips, and plain bordered links.

3. The filter panel feels oversized and detached.
   When expanded, the filter panel becomes a large white card on the left with a large empty canvas to the right. It interrupts the page rhythm and makes the table controls feel unrelated.

4. Pagination appears in two places with different styling.
   The action bar has a page-size control and page navigation; the table area repeats page-size and next/previous controls with different button styles. This creates visual noise and weak hierarchy.

5. The toolbar wraps unpredictably.
   Search, sort, status tabs, filter button, clear button, and pagination compete in one grid row. At desktop widths this leaves the left controls crowded while the right side floats in empty space.

6. The search input is too narrow for its placeholder and product use.
   The placeholder truncates in the screenshot. For an identity product, search is a primary workflow and should have a stable width.

7. Filter sections use uneven grids.
   Advanced filters mix `grid`, `flex`, `max-w-xs`, two-column pairs, three-column rows, and full-width fields. Inputs align in some rows but not across the whole panel.

8. Numeric controls look browser-default.
   Number/date inputs show native spinner styling and inconsistent internal padding. This weakens the financial-app feel.

9. KPI strip is clean but too loosely connected to the table state.
   KPIs are full width and well divided, but the toolbar below does not inherit the same discipline. The transition from KPI strip to controls feels abrupt.

10. Quick filters and saved views compete.
    They are visually similar but semantically different. Both use low-contrast chips, and the page does not make clear which are filters, which are saved presets, and which are active.

11. Active filter chips are separated from the filter panel.
    Active filters appear below saved views rather than being integrated into the toolbar/filter surface. This makes filter state harder to scan.

12. Table controls are not visually anchored to the table.
    Rows-per-page and pagination sit far to the right in open space before the table, then repeat again near the table. They should be attached to the table header/footer.

## Root Causes In Code

- [Customers page](/Users/malikibrahim/Downloads/Unauth/app/(app)/customers/page.tsx) uses `WorkbenchPage`, `WorkbenchActionBar`, and shared `Button`, but also has many hand-styled `Link` elements for chips and pagination.
- [CustomersFilterSheet](/Users/malikibrahim/Downloads/Unauth/components/customers/CustomersFilterSheet.tsx) defines its own input classes and inline styles instead of using shared `Input`, `Select`, and `Button`.
- [PageSizeSelect](/Users/malikibrahim/Downloads/Unauth/components/common/PageSizeSelect.tsx) has its own segmented-control styling and height separate from the toolbar/status segmented control.
- [Button](/Users/malikibrahim/Downloads/Unauth/components/ui/Button.tsx), [Input](/Users/malikibrahim/Downloads/Unauth/components/ui/Input.tsx), and [Select](/Users/malikibrahim/Downloads/Unauth/components/ui/Select.tsx) already define a more coherent system, but the Customers page bypasses them.
- [WorkbenchActionBar](/Users/malikibrahim/Downloads/Unauth/components/workbench/WorkbenchActionBar.tsx) uses a generic grid that works for simple bars but is too loose for this dense customer workflow.

## Design Standard

Use these values for the Customers page unless the shared UI system is updated globally:

| Element | Target |
| --- | --- |
| Standard control height | `36px` |
| Compact control height | `32px` |
| Icon-only control | `32px x 32px` |
| Border radius | `6px` max for controls, `8px` max for panels |
| Toolbar gap | `8px` |
| Panel padding | `16px` desktop, `12px` mobile |
| Field label | `11px`, semibold, muted |
| Input text | `13px`, tabular where numeric |
| Primary action | Copper/burgundy only |
| Selected segmented state | One style across status/page size |
| Secondary action | Neutral border/background |

The page should read as an operations dashboard, not a marketing card layout. Keep it restrained, scannable, and data-led.

## Implementation Plan

### 1. Create A Customers Toolbar Shell

Add a focused customer toolbar component or refactor `CustomersFilterSheet` into two pieces:

- `CustomersToolbar`
- `CustomersAdvancedFilters`

The toolbar should own:

- Search
- Sort
- Status segmented control
- Filter toggle
- Clear button
- Active filter count

The table header/footer should own:

- Showing count
- Page size
- Page navigation

This removes duplicated pagination from the workbench action bar.

### 2. Standardise Control Primitives

Replace hand-styled controls in `CustomersFilterSheet` with shared UI components:

- Use `Input` for search and text filters.
- Use `Select` for sort and confidence.
- Use `Button` for filter toggle, clear, previous, next.
- Create or reuse one segmented-control primitive for status and page size.

If a segmented-control primitive does not exist, add `components/ui/SegmentedControl.tsx` and use it in both `CustomersFilterSheet` and `PageSizeSelect`.

Acceptance:

- Every toolbar control is `36px` high.
- Every compact chip/segmented item is `32px` high.
- Every border radius uses shared tokens.
- No ad hoc `px-2 py-1` pagination links remain on the Customers page.

### 3. Rebuild The Filter Panel As A Full-Width Operations Panel

Current expanded filters look like a floating left card. Replace with a panel that belongs to the toolbar/table system:

- Width should be `100%` of the content area, not half-width unless the layout intentionally reserves a right-side summary.
- Use a 12-column grid on desktop.
- Keep basic filters in the first row.
- Put advanced identity, behaviour, date, and signal filters in clear sections.
- Avoid nested rounded cards inside the panel.
- Collapse advanced sections by default when no advanced filters are active.

Suggested desktop grid:

- Search row: `minmax(280px, 1fr) 220px auto auto`
- Basic filter row: `repeat(4, minmax(180px, 1fr))`
- Advanced identity row: `repeat(4, minmax(180px, 1fr))`
- Numeric ranges: paired min/max controls in consistent two-input groups
- Dates: paired from/to controls in consistent two-input groups

Acceptance:

- Expanding filters does not create a large empty right side.
- All inputs align to a common grid.
- The panel height is only as tall as the visible controls require.

### 4. Consolidate Pagination

Remove pagination from the top action bar. Keep one pagination cluster attached to the table region.

Recommended placement:

- Above table, right aligned: `Page 1 of 21`, page size segmented control, Prev/Next.
- Below table only if we add long scrolling pages later.

Acceptance:

- Page size appears once.
- Prev/Next use shared `Button variant="secondary" size="sm"`.
- Page-size selected state matches the status segmented selected state.

### 5. Clarify Quick Filters, Saved Views, And Active Filters

Restructure the three chip rows:

- Quick filters: operational one-click filters.
- Saved views: presets with a quieter style.
- Active filters: state chips grouped directly under the toolbar or inside the filter panel header.

Recommended order:

1. Toolbar
2. Active filter chips if any
3. Quick filters and saved views in a compact two-column row
4. Table header
5. Table

Acceptance:

- Active filters are immediately visible after search/filter changes.
- Quick filters and saved views no longer look identical.
- `Clear all` is always in the same row as active filters.

### 6. Tighten The KPI Strip

Keep the KPI strip, but make it feel connected:

- Use tabular numerics consistently.
- Reduce vertical padding slightly if filters are open.
- Consider sticky KPI + toolbar only after layout is stable.

Do not change KPI logic in this pass unless there is a product decision to make KPIs page-scoped vs total-filter-scoped.

### 7. Mobile And Responsive Rules

Desktop:

- Search keeps a stable `min-width: 280px`.
- Sort keeps `width: 220px`.
- Status segmented control can wrap only after search/sort.
- Filter toggle stays adjacent to status.

Tablet:

- Toolbar becomes two rows.
- Search is full width on the first row.
- Sort/status/filter controls occupy the second row.

Mobile:

- Search full width.
- Sort and Filters full width or two equal columns.
- Status segmented control horizontally scrolls.
- Advanced filters use one column.

## Suggested File Changes

1. [CustomersFilterSheet.tsx](/Users/malikibrahim/Downloads/Unauth/components/customers/CustomersFilterSheet.tsx)
   Refactor toolbar controls to shared primitives and move expanded panel into a disciplined grid.

2. [page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/customers/page.tsx)
   Remove duplicated pagination from `WorkbenchActionBar`, move pagination into the table header area, and simplify quick/saved/active filter rows.

3. [PageSizeSelect.tsx](/Users/malikibrahim/Downloads/Unauth/components/common/PageSizeSelect.tsx)
   Rebuild on a shared segmented-control primitive.

4. [Button.tsx](/Users/malikibrahim/Downloads/Unauth/components/ui/Button.tsx)
   Keep existing button tokens; only add an icon-only size if needed.

5. `components/ui/SegmentedControl.tsx`
   Add only if no existing segmented control can be reused.

6. [WorkbenchActionBar.tsx](/Users/malikibrahim/Downloads/Unauth/components/workbench/WorkbenchActionBar.tsx)
   Either make it accept a denser customer-toolbar layout or leave it generic and keep customer-specific layout inside `CustomersToolbar`.

## Acceptance Checklist

- Search, sort, filter, clear, status tabs, page size, and pagination are visually uniform.
- No primary workflow control has a mismatched height.
- Search placeholder fits at desktop widths.
- Filter panel is full-width and grid-aligned.
- Page-size control appears once.
- Pagination style matches the rest of the page.
- Quick filters, saved views, and active filters are visually distinct.
- Table controls sit close to the table.
- Mobile layout has no overlapping controls.
- Desktop layout does not leave unexplained blank control space.
- Screenshots pass at `1440px`, `1280px`, `1024px`, and mobile width.

## Verification Plan

Run after implementation:

```bash
npx tsc --noEmit --pretty false
npm test -- --runTestsByPath tests/components/inboxFilters.test.ts tests/customers/customer-profile.spec.ts
```

Manual browser checks:

1. `/customers` with no filters.
2. `/customers?q=simsorsno3`.
3. `/customers?q=simeonmurray123`.
4. `/customers?risk=high&status=new`.
5. Expanded filters with date, numeric, and identity fields active.
6. Page size switching between `25`, `50`, and `100`.
7. Desktop, tablet, and mobile widths.

Known repo note: `npm run lint` currently fails because `next lint` is treated as an invalid project directory in this setup, so use TypeScript plus focused tests until the lint script is repaired.
