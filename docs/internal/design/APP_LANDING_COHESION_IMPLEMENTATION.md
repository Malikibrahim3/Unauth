# App and Landing Visual Cohesion Implementation

Date: 20 May 2026

## Short Visual Audit

The landing page has the strongest visual point of view: a warm stone canvas, serif wordmark, burgundy/rust accent, mono case-file metadata, sharp editorial panels, and a premium compliance feel. The signed-in app has the right workflow structure, but it still carries older SaaS defaults that make screenshots feel pasted into the landing page rather than native to it.

Main issues found:

- **Colour:** the app still uses blue as its primary accent in buttons, active tabs, avatar, links, focus, and logo SVG assets. This conflicts with the burgundy wordmark dot and Hero 1 artifact.
- **Typography:** the app mixes overline labels, larger sidebar text, raw text sizes, and serif-free utilitarian UI. The strongest landing visuals use a clearer hierarchy: mono for evidence/data, sans for operations, serif only for brand/editorial emphasis.
- **Spacing and density:** app pages are structurally sound, but several screens feel sparse in empty states while dense tables feel report-like. The workbench layout needs a consistent compact rhythm.
- **Borders and cards:** panels use many similar pale borders, rounded-lg cards, and flat table blocks. The hero artifact uses sharper edges, subtle inner structure, and intentional sectional headers.
- **Shadows:** shadows are mostly absent in the app, so panels can feel flat. Use restrained elevation only for the main workbench shell, dropdowns, drawers, and modals.
- **Tables:** table headers, row actions, selected states, and status pills are functional but dated. They need stronger hierarchy, lower visual noise, and brand-accent selection.
- **Badges and pills:** confidence/risk badges work semantically, but info/accent badges still read blue. Pills should be compact, mono-friendly, and use the neutral/rust/status palette.
- **Empty states:** many empty states are plain text links. They should feel like operational states with a title, concise cause, and one next action.
- **Navigation/sidebar/header:** the shell is stable, but the `§` decorative marker and blue highlights feel less enterprise-grade than the landing artifact's case-file marker system.
- **Landing screenshot compatibility:** live app screenshots currently contain blue buttons, blue underlines, rounded controls, and sparse beige panels. Those would clash with Hero 1's rust/stone artifact.

## Design Direction

Keep the product as a serious ecommerce risk/compliance workbench. Do not rebuild the IA. The update should make the current UX feel like one product system with the logo and Hero 1 artifact.

Core direction:

- Replace blue primary UI with **Unauth rust** (`#7B2D26`) and dark ink (`#1A1814`).
- Keep the warm stone canvas, but make surfaces cleaner: `#F8F5EE` canvas, `#FEFCF7` panels, `#F2EDE3` section headers.
- Use sharp, low-radius controls: 3-6px, never pill-shaped except badges and pagination groups.
- Treat the app as an **evidence workbench**, not a marketing dashboard: compact metrics, tabular numerics, restrained borders, and direct action language.
- Use subtle elevation on the main workbench shell so screenshots look deliberate against the landing page.
- Remove decorative `§` markers from app chrome and replace them with tiny rust evidence dots/rails.
- Preserve the current app structure: sidebar, sticky header, workbench page shell, KPI strips, action bars, tables, drawers, and audit tabs.

## Implementation Scope

### Global Tokens

- Change the primary accent from blue to rust across CSS variables.
- Add explicit brand aliases:
  - `--brand-rust`
  - `--brand-rust-hover`
  - `--brand-rust-soft`
  - `--brand-ink`
  - `--brand-paper`
- Add `--accent-subtle` as a compatibility alias because upload and customer filters already rely on it.
- Keep info separate from brand; use a muted slate/steel for neutral informational badges, not bright blue.
- Tune focus ring to rust with enough opacity for accessibility.

### Logo Assets

- Update `public/logo-mark.svg`, `public/logo-wordmark-light.svg`, `public/logo-wordmark-dark.svg`, and `public/mock-app-hero.svg` to remove the old blue accent.
- Update onboarding inline SVG so first-run and favicon-style visuals match the logo system.

### Shared UI Primitives

- `Button`: make primary rust, danger darker rust, secondary crisp white/stone, ghost quiet.
- `Badge`: replace blue info/accent tones with steel/rust tones.
- `Input` and `Select`: use the same stone-white surface, sharper border, rust focus ring.
- `DataTable`: use stone header rows, slightly stronger hover, rust selected rail, quieter row borders.
- `PageSizeSelect`: replace black selected state with dark ink/rust-compatible active state.

### App Shell

- Sidebar:
  - Reduce oversized nav label feel.
  - Replace `§` group markers with a small rust dot.
  - Use rust active rail and a quieter active background.
  - Keep the current collapse/mobile behavior.
- Header:
  - Replace `§` breadcrumb marker with a small rust dot.
  - Use a slightly translucent stone surface and sharper search/merchant chips.
  - Let avatar inherit the new rust accent.

### Workbench Layout

Applies to dashboard, upload, inbox, customers, history, watchlist, saved views, chargebacks/reports, help, and related shared pages using `WorkbenchPage`.

- Main workbench shell gets a subtle brand-compatible shadow and cleaner panel background.
- Workbench nav active state uses rust, not blue.
- KPI strip receives compact mono values, consistent separators, and a subtle section-header rhythm.
- Action bars get stone background and clearer separation.
- Empty states get an evidence-dot marker and more deliberate layout.

### Dashboard

- Keep the current operational dashboard structure.
- Align the navigation tabs, KPI strip, queue list, side rail, activity, and footer with the updated workbench shell.
- Preserve the dense summary style; avoid a marketing hero.

### Upload Flow

- Keep the existing upload steps and mapping UX.
- Apply new brand tokens to primary upload buttons, progress bars, dashed dropzone, selected upload type cards, duplicate warning, and processing state.
- Ensure screenshots of upload idle/mapping/context/processing no longer show the old blue primary action.

### Audit Results Flow

- Preserve overview/customers/transactions/data quality tabs.
- Change tab active underline to rust through global accent.
- Keep existing cards and charts but align badge/link colors through token updates.
- Tables should inherit updated `DataTable` or global token behavior where used.

### Customers and Customer Detail

- Keep global Customers as the cluster/profile workbench.
- Keep drawer drill-down behavior.
- Update search, filter chips, saved-view chips, table selected row, watchlist labels, and drawer links through shared tokens.
- Future follow-up: consolidate duplicate customer profile renderers, but do not block the visual cohesion pass on that refactor.

### Inbox/Cases

- Preserve queue structure.
- Update action buttons, rows, empty states, page-size controls, and queue metrics through workbench primitives.

### History/Audits

- Preserve table and pagination.
- Update selected row/bulk bar/table header/status badges through tokens and table styles.
- Use consistent upload type language in future copy pass: "Standard" instead of "Regular".

### Watchlist

- Preserve recent appearances and all watchlisted customers.
- Keep green/teal watchlist semantics, but reduce rounded-card styling where possible and let shared shell carry the page.

### Reports/Evidence Packages

- Preserve table and generate-from-customer CTA.
- Use rust primary CTA and neutral secondary CTA.
- Keep CE3.0 status green as a real status semantic.

### Help/Settings/Saved Views

- Keep content.
- Apply workbench shell and shared primitive updates.
- Settings account/team pages still have bespoke layouts; shared `Button`, `Input`, `Select`, and `SectionCard` updates improve them without requiring a route rewrite.

### Auth and Onboarding

- Login already matches the landing page closely.
- Update old logo blue and disabled/primary button accent via tokens where possible.
- Onboarding should use the rust logo/accent and lower-radius controls in a follow-up deeper pass.

### Landing Page

- Preserve the current Hero 1 artifact and editorial structure.
- The app should move toward the artifact, not the other way around.
- If live app screenshots are introduced later, capture pages after the token/workbench pass so active tabs, CTAs, badges, and tables use the same rust/stone system.

## Implemented In This Pass

- Brand/accent token update from blue to rust.
- Logo SVG accent update.
- Shared buttons, badges, inputs, selects, tables, page-size control, sidebar, header, and workbench primitives updated.
- Implementation remains scoped to visual cohesion and does not alter core UX, data contracts, or flows.

## Follow-Up Backlog

- Consolidate duplicate customer profile UI into one canonical panel.
- Replace remaining `§` markers inside deep audit/evidence content with the same evidence-dot primitive.
- Convert audit transaction details into drawer/inline expansion if the full page remains thin.
- Make upload mapping more two-column and guided on desktop.
- Add a screenshot capture script for landing artifacts once a stable demo dataset is available.
