# Quiet Precision product design rules

**Status:** Binding contract implemented across product surfaces.
**Implementation specification:** [`../../docs/IMPL_quiet_precision_product_ui.md`](../../docs/IMPL_quiet_precision_product_ui.md)

This file is the concise source of truth for product UI. It supersedes every earlier authenticated palette, chart language, component appearance, and migration-era compatibility rule. Shared authenticated runtime output now follows this contract; route-specific work must extend it rather than fork it.

## Scope

Quiet Precision governs:

- `app/(app)/**`;
- `app/onboarding/**`;
- product entry forms in auth/signup flows;
- product-like demo, helpdesk-widget, and extension surfaces;
- all shared components consumed by those surfaces;
- every loading, empty, zero, filtered-empty, stale, partial, disconnected, permission, locked, error, and not-found state.

The public landing, pricing, and legal/editorial pages remain a separate design system. Product UI must not import public-site tokens or primitives.

## Non-negotiable ethos

Quiet Precision is:

- a neutral near-white/graphite shell;
- compact, information-dense, and calm;
- organised by spacing, one-pixel borders, restrained fills, and modest type;
- led by near-black primary actions;
- coloured only when colour communicates status, category, provider identity, or data;
- flat in normal content and elevated only for floating layers.

It is not:

- warm, cream, rust, copper, espresso, or orange-led;
- gradient-, texture-, hatch-, glow-, or shadow-led;
- a collection of unrelated floating cards;
- a marketing layout inside the product;
- permission to imitate the reference images’ outer showcase frame.

The final migration is a hard cutover. Do not preserve old visual aliases, visual feature flags, parallel theme layers, or page-local compatibility styling.

## Foundations

The exact target tokens live in the implementation specification. Binding rules:

- `--ua-*` is the only authenticated visual token namespace.
- Product action is neutral ink, not a brand hue.
- Inter is the product UI typeface.
- Monospace is reserved for identifiers, hashes, API keys, code, and raw payloads.
- Ordinary amounts, dates, metrics, tables, and charts use Inter with tabular numerals.
- Type uses sentence case and weights 400, 500, or 600.
- Spacing comes from the documented 2/4/6/8/10/12/16/20/24/32/40/48px scale.
- Controls use a 6px radius, inline surfaces 10px, and overlays 14px.
- Round/pill geometry is reserved for avatars, counts, compact statuses, and true circular controls.
- Inline panels and cards have no drop shadow.
- Menus, popovers, tooltips, toasts, drawers, and dialogs use the documented floating shadows.
- Static component appearance never uses literal colour, radius, or shadow values.
- Provider marks may use official provider brand colours.

Do not reintroduce duplicate `--bg-*`, `--surface-*`, `--accent*`, or historical brand/palette aliases. Public tokens stay scoped to public layouts.

## Product shell

- Desktop sidebar: 200px expanded, 52px collapsed.
- Utility header: 48px, opaque neutral shell, one bottom border, no backdrop blur.
- Main canvas uses the canonical neutral canvas.
- Desktop content gutters are 16–20px.
- Page headers are compact: title/subtitle left, at most one primary and one secondary action right.
- Tabs attach to the page header or first working surface.
- The live app fills the viewport; it is not placed in a rounded showcase browser frame.
- Mobile uses a modal navigation drawer, stacked page actions, compact KPI layout, contained table scrolling, and no page-level horizontal overflow at 320px.

## Page composition

Every route uses one of these shared families:

1. **Index/registry:** page header → optional tabs/KPIs → toolbar → one table or joined-list surface → pagination.
2. **Board/workflow:** shared parent surface → neutral columns/stages → flat bordered items → optional property rail.
3. **Record detail:** compact identity/status → key facts → primary decision/work → joined evidence/context sections → timeline.
4. **Settings/configuration:** stable local navigation → 680–820px form column → optional guidance rail → joined form sections.
5. **Reporting:** KPIs → one primary chart question → distinct supporting view → detailed table.
6. **Entry/onboarding:** one calm task surface → labelled progress → form → explicit action.
7. **Embedded compact:** same tokens/states at compact density, one task, direct link to full Unauth context.

Pages compose primitives. They do not invent colours, card systems, page headers, tables, status pills, skeletons, or overlay styles.

## Canonical component contracts

### Actions

- `Button`, `ButtonLink`, and `IconButton` share dimensions, radius, focus, loading, and disabled behaviour.
- Product variants are primary, secondary, ghost, danger, and link.
- Remove the separate product `cta` appearance during migration.
- Use one primary action per page header, dialog footer, or local form surface.
- Destructive actions become solid critical only in the final confirmation.
- Icon-only controls require accessible names.

### Fields

- Inputs, textarea, select/combobox, checkbox, radio, switch, date/range, file upload, token input, and option tiles share one label/hint/error/focus system.
- Placeholders never replace labels.
- Invalid state uses border, icon, and message.
- Read-only and disabled are visibly distinct.
- Mobile/coarse-pointer controls retain 44×44px hit targets.

### Tabs, filters, and status

- Tabs navigate sibling regions.
- Segmented controls choose one mutually exclusive view.
- Filter chips are interactive and neutral.
- Status badges are non-interactive and semantic.
- Metadata chips are neutral labels.
- Selection never borrows warning/success/critical colour.
- Status and selection never rely on colour alone.

### Surfaces and metrics

- Canonical structures are panel, joined section, KPI group, inset group, and floating surface.
- `Card`, `SectionCard`, `AuthenticatedPanel`, `MetricCard`, `MetricGroup`, and `WorkbenchKpiStrip` must converge on those structures.
- KPI cells live in one grouped surface; they are not elevated individual cards.
- Do not nest free-standing bordered cards directly inside another bordered panel.
- Passive KPIs are not given selected/active styling.

### Tables

- `DataTable` and `DataTableServer` are authoritative.
- Toolbar, table, result count, and pagination belong to one surface.
- Use a quiet filled header, 40px minimum rows, no zebra striping, neutral hover, and explicit selected/focus states.
- Numeric values align right and use tabular numerals.
- Row actions use a shared overflow menu.
- Horizontal overflow stays inside the table panel.
- Mobile retains priority columns and an accessible path to all row detail.

### Badges and provenance

`StatusBadge`, `Badge`, `PrivacyBadge`, `GradeBadge`, `MetadataChip`, tier badges, source badges, freshness, match, and connection indicators share one compact anatomy while retaining distinct semantics.

- Sentence case.
- Central domain-to-tone mapping.
- No raw database status strings.
- Source identity and freshness remain explicit.
- Grade/confidence includes a text label and explanation path.

### Overlays and feedback

- `Modal`, `Drawer`, menus, popovers, `Tooltip`, and `Toast` use one floating-layer system.
- Dialogs use a clear header/body/footer, canonical 420/560/720px widths, focus trap, inert background, Escape handling, and focus restoration.
- Backdrop blur is limited to overlays and capped at 6px.
- Drawers preserve parent context and are not a replacement for every detail page.
- Tooltips never contain essential instructions.
- Toasts do not replace inline errors or persistent state.

### Route states

Consolidate loading, empty, error, and not-found implementations into geometry-aware shared components.

- Skeletons mirror the resolved header, KPI, toolbar, table/board, and rail.
- Background refresh retains existing content.
- Zero, empty, filtered-empty, partial, stale, disconnected, locked, permission-denied, error, and not-found are distinct.
- Cross-merchant not-found/denied states do not leak object existence.

### Authenticated landing primitives

`components/ui/LandingPrimitives.tsx` is not an authenticated component library. Migrate every product consumer to product primitives; do not add new product imports.

## Data visualisation

Quiet Precision replaces every previous chart treatment.

- Charts are flat, restrained, and question-led.
- Neutral axes/grid/panel chrome; low-chroma data marks.
- No gradient fills, hatch/texture, glow, 3D, decorative dot matrices, or orange-first series convention.
- Inter tabular numerals, not monospace-as-aesthetic.
- Maximum five simultaneous series; assignment stays stable through filters.
- Direct labels or visible legend; meaning is never hover-only or colour-only.
- Every meaningful chart exposes an accessible table or equivalent summary.
- Null, zero, partial, unavailable, and disconnected remain distinct.
- No incompatible-currency aggregation.
- Full chart-library use remains confined to approved reporting surfaces.

See the implementation specification for the palette, approved forms, and route assignment.

## Interaction, accessibility, and responsive rules

Every interactive component implements default, hover, focus-visible, active, selected, disabled, loading, and invalid states as applicable.

- Focus is always visible and never causes layout shift.
- No pressed-state translation/jump.
- Motion uses the canonical 100/160/220ms durations; no bounce, spring, parallax, or decorative looping.
- Reduced motion removes spatial effects.
- Follow established ARIA patterns for dialogs, menus, tabs, grids, comboboxes, and builders.
- Use real links/buttons; row click does not replace semantics.
- Restore focus after overlays.
- Target WCAG 2.2 AA, 200% zoom, text-spacing overrides, forced colours, and keyboard-only access.
- Normal text meets 4.5:1; meaningful graphics and component boundaries meet 3:1 where required.
- The references’ very light text is not a contrast exemption.

## Implementation rules

- `styles/authenticated/index.css` is the only authenticated stylesheet entry point.
- Application code does not import individual authenticated CSS layers.
- Shared primitives own static visual appearance.
- Inline styles are limited to data-derived geometry/custom-property assignment.
- Component variants describe semantics or structure, not arbitrary appearance.
- No new grandfathered lint exceptions for ordinary product styling.
- A migrated page includes every descendant, overlay, state, skeleton, mobile layout, and dark-mode appearance.
- Route, permission, query-parameter, mutation, export, deep-link, audit, and data-truth behaviour must remain intact.

## Required deletion before completion

The final implementation must remove:

- superseded warm/coloured product tokens and literal values;
- visual compatibility aliases and parallel token namespaces;
- authenticated public/landing-token dependencies;
- page-local palettes, radii, shadows, and page-header systems;
- hand-rolled statuses, tables, skeletons, and overlay appearances;
- old chart textures, gradients, treatment names, and palette rules;
- visual rollout/cohort branches and obsolete screenshots;
- active design documents or tests that instruct the old appearance.

Source-control history is the archive. Active product rules must describe only the current target.

## Verification

Before completing product UI work:

1. Add/update the component and every state in `/dev/design-system`.
2. Update the matching route skeleton.
3. Inspect light/dark at 1440, 1024, 768, 390, and 320px as relevant.
4. Check keyboard, 200% zoom, reduced motion, and forced colours.
5. Run `npm run lint`, `npm run typecheck`, `npm run lint:authenticated-design`, `npm run verify:ui-parity`, focused tests, and relevant browser tests.
6. Search the in-scope tree for the deletion ledger.

A page is finished only when it is functionally intact, visually native to Quiet Precision, accessible, responsive, and free of superseded styling in all descendants and states.
