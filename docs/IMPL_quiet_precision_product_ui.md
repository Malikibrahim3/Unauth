# IMPL — Quiet Precision product UI

- **Status:** Approved replacement specification; product-wide implementation complete
- **Date:** 2026-07-25
- **Scope:** Product application UI, entry flows, embedded product surfaces, every component and every state
- **Reference set:** `IMG_9611.jpg`, `IMG_9612.jpg`, and `IMG_9613.jpg` supplied with the design request
- **Binding rules:** [`../styles/authenticated/README.md`](../styles/authenticated/README.md)
- **Supersedes:** every earlier authenticated visual direction, palette, chart treatment, component appearance, and migration-era compatibility rule

This document specifies the complete target state. It does not authorise a partial visual blend. Product logic, permissions, data truth, source provenance, financial calculations, audit history, routes, keyboard paths, and responsive access remain unchanged unless a separate product specification explicitly changes them.

---

## 0. Executive decision

Unauth will adopt a single product design ethos named **Quiet Precision**.

Quiet Precision is a calm, high-density operational interface built from near-white layered surfaces, graphite text, fine neutral borders, compact controls, crisp tables, restrained pastel status cues, and near-black primary actions. It should feel deliberate, capable, and almost weightless. Hierarchy comes from spacing, grouping, type weight, and surface contrast—not from saturated brand colour, oversized typography, decorative illustration, gradients, or shadow-heavy cards.

The reference images are a visual source, not a product or brand template. Unauth keeps its own product model, language, information architecture, logo, permissions, and workflows. The outer grey photographic canvas and showcase drop shadow around the pictured application are presentation framing; they are not part of the in-product shell.

The final implementation is a **hard replacement**:

- There is one authenticated token system and one component appearance.
- There is no warm, cream, rust, copper, espresso, or orange-led application theme.
- There is no legacy “Autumn” chart language, hatch texture, cap gradient, or orange-first data grammar.
- There are no visual compatibility aliases forwarding old tokens to new ones.
- There is no authenticated use of landing-page primitives or landing tokens.
- There is no page-level “temporary” palette, radius, shadow, or type system.
- There is no visual rollout flag left in the merged final state.
- A migrated page is not complete while any descendant still renders the superseded styling.

The authenticated foundation, shared shell, controls, semantic states, and chart primitives now implement this contract. Route-specific changes must preserve the same tokens and primitives; no parallel visual language is permitted.

---

## 1. The reference language, decoded

### 1.1 Core characteristics

| Characteristic | Interpretation for Unauth |
|---|---|
| Quiet shell | Near-white canvas, slightly differentiated sidebar/header, no coloured chrome |
| Ink-led action | Near-black primary buttons; secondary actions are white with a neutral border |
| Border-led hierarchy | One-pixel lines and subtle fill changes organise the interface; shadows are reserved for floating layers |
| Compact density | Small but legible type, 32–40px controls, 36–44px data rows, shallow page headers |
| Layered whites | Canvas, shell, primary surface, and muted inset are close in value but visibly distinct |
| Restrained colour | Colour explains status, category, or data only; it never decorates a container |
| Local grouping | Tabs, metrics, filters, tables, and pagination sit in coherent bounded surfaces |
| Modal focus | The underlying page becomes inert and visually recedes; the dialog is a clear, structured task |
| Soft geometry | Consistent 6–12px radii; pills only where the shape has meaning |
| Direct typography | Neutral sans-serif, sentence case, modest weights, tabular numerals |

### 1.2 Product personality

The interface should feel:

- calm under operational pressure;
- precise without looking clinical;
- dense without feeling cramped;
- neutral without becoming anonymous;
- modern without visual novelty;
- trustworthy because every state and action is explicit.

The interface must not feel:

- warm, artisanal, editorial, or marketing-led;
- playful, glossy, glassy, or skeuomorphic;
- like a collection of independent cards;
- like a generic analytics dashboard;
- visually louder than the evidence and decisions it contains.

### 1.3 Hierarchy order

Every screen should establish hierarchy in this order:

1. Current location and page purpose.
2. Primary action or decision.
3. Operational summary.
4. Working data or form.
5. Supporting context.
6. Metadata and tertiary controls.

Colour may reinforce this order but may not create it.

---

## 2. Scope and authority

### 2.1 In scope

Quiet Precision governs:

- `app/(app)/**`;
- `app/onboarding/**`;
- `/login`, `/reset`, `/reset/update`, and the product form portion of `/signup`;
- all authenticated loading, empty, zero, filtered-empty, stale, disconnected, partial, unavailable, permission-denied, locked, error, and not-found states;
- all shared components consumed by product routes;
- command palette, navigation, notifications, banners, menus, popovers, drawers, dialogs, and toasts;
- product-like public demo surfaces;
- compact embedded product surfaces, including helpdesk widgets and extension UI, using the compact adaptation in §7.10;
- the development design-system gallery used to validate the implementation.

### 2.2 Deliberately separate

The public landing, pricing, and legal/editorial pages are not application chrome. Their layout system remains isolated unless a future request explicitly redesigns the public site. They must not supply tokens, primitives, fonts, or component variants to product UI.

This separation is not permission for authenticated legacy styling. Every in-scope product surface must converge on Quiet Precision.

### 2.3 Authority order

For visual implementation decisions, use this order:

1. This document for target architecture, coverage, and migration.
2. `styles/authenticated/README.md` for concise binding contributor rules.
3. Shared tokens and primitives after they are migrated.
4. A documented extension to this specification.

A page-local precedent is never authoritative merely because it already exists.

---

## 3. Design foundations

### 3.1 Colour model

The application is monochrome by default. Neutral surfaces carry structure; semantic colours carry meaning. Product action is ink, not a brand hue.

#### Light mode target

| Token | Value | Use |
|---|---:|---|
| `--ua-canvas` | `#F3F3F2` | Main viewport behind product surfaces |
| `--ua-shell` | `#F8F8F7` | Sidebar and utility-header shell |
| `--ua-surface-primary` | `#FFFFFF` | Main panels, dialogs, menus |
| `--ua-surface-secondary` | `#F7F7F6` | KPI tiles, table heads, inset groups |
| `--ua-surface-muted` | `#F1F1F0` | Disabled or strongly recessed areas |
| `--ua-surface-hover` | `#F5F5F4` | Neutral hover |
| `--ua-surface-selected` | `#ECECEA` | Selected neutral item |
| `--ua-surface-inverse` | `#242424` | Primary action and inverse chips |
| `--ua-backdrop` | `rgb(24 24 24 / 14%)` | Modal/drawer scrim |
| `--ua-text-primary` | `#202020` | Headings and primary content |
| `--ua-text-secondary` | `#626262` | Body support and labels |
| `--ua-text-tertiary` | `#767676` | Non-essential metadata |
| `--ua-text-disabled` | `#A6A6A2` | Disabled content only |
| `--ua-text-inverse` | `#FFFFFF` | Content on inverse surfaces |
| `--ua-text-link` | `#2D2D2D` | Underlined or otherwise identified links |
| `--ua-icon-primary` | `#343434` | Primary icons |
| `--ua-icon-secondary` | `#858581` | Supporting icons |
| `--ua-border-subtle` | `#ECECEA` | Internal separators |
| `--ua-border-default` | `#DEDEDB` | Controls and panel boundaries |
| `--ua-border-strong` | `#BDBDB8` | Selected/active boundary |
| `--ua-border-focus` | `#202020` | Keyboard focus |
| `--ua-action-primary` | `#242424` | Primary button |
| `--ua-action-primary-hover` | `#151515` | Primary hover |
| `--ua-action-primary-pressed` | `#080808` | Primary pressed |
| `--ua-action-primary-fg` | `#FFFFFF` | Primary action text/icon |

#### Dark mode target

Dark mode is a neutral relational inversion, not a second aesthetic.

| Token | Value |
|---|---:|
| `--ua-canvas` | `#101010` |
| `--ua-shell` | `#151515` |
| `--ua-surface-primary` | `#1B1B1B` |
| `--ua-surface-secondary` | `#202020` |
| `--ua-surface-muted` | `#272727` |
| `--ua-surface-hover` | `#252525` |
| `--ua-surface-selected` | `#303030` |
| `--ua-surface-inverse` | `#F2F2F0` |
| `--ua-backdrop` | `rgb(0 0 0 / 46%)` |
| `--ua-text-primary` | `#F3F3F1` |
| `--ua-text-secondary` | `#B8B8B3` |
| `--ua-text-tertiary` | `#92928D` |
| `--ua-text-disabled` | `#62625E` |
| `--ua-text-inverse` | `#171717` |
| `--ua-text-link` | `#F0F0ED` |
| `--ua-icon-primary` | `#D8D8D4` |
| `--ua-icon-secondary` | `#94948F` |
| `--ua-border-subtle` | `#292929` |
| `--ua-border-default` | `#363636` |
| `--ua-border-strong` | `#565652` |
| `--ua-border-focus` | `#F2F2F0` |
| `--ua-action-primary` | `#F2F2F0` |
| `--ua-action-primary-hover` | `#FFFFFF` |
| `--ua-action-primary-pressed` | `#DADAD6` |
| `--ua-action-primary-fg` | `#171717` |

#### Semantic colours

Semantic colour always ships as a foreground, soft fill, and border triplet. It must be paired with text, a glyph, or both.

| Meaning | Foreground | Fill | Border |
|---|---:|---:|---:|
| Information / active | `#355C96` | `#EAF2FF` | `#CADAF2` |
| Success / complete / healthy | `#246B4D` | `#E9F6EF` | `#C7E5D4` |
| Warning / pending / attention | `#775A12` | `#FFF6D8` | `#EAD99B` |
| Critical / failed / destructive | `#963F3F` | `#FCECEC` | `#EAC5C5` |
| Neutral / offline / unknown | `#61656B` | `#F0F1F2` | `#D9DBDE` |
| Optional categorical violet | `#68558E` | `#F1EDFA` | `#D9D0EC` |

Dark-mode semantic triplets must retain the same meanings with subdued fills and WCAG-compliant foregrounds. They may not become neon.

#### Colour prohibitions

- No saturated product accent on navigation, buttons, page titles, card borders, or selected filters.
- No semantic colour as a decorative card background.
- No colour-only status, delta, selection, or chart identity.
- No opacity applied to text to create hierarchy; use the correct text token.
- No literal product colours outside the token definition files.
- Provider logos may retain verified provider brand colours.

### 3.2 Typography

Use **Inter** for all product UI. Use a system monospace only for source identifiers, hashes, API keys, code, and machine-formatted payloads. Ordinary metrics, dates, amounts, percentages, table values, and chart values use Inter with `font-variant-numeric: tabular-nums`.

Inter Tight, display faces, and monospace-as-dashboard-aesthetic are not part of the target product language.

| Role | Size / line height | Weight | Notes |
|---|---:|---:|---|
| Page title | `18px / 24px` | 600 | One per page |
| Dialog title | `18px / 24px` | 600 | Never oversized |
| Section title | `15px / 20px` | 600 | Panels and major groups |
| Card title | `13px / 18px` | 600 | Compact and sentence case |
| Body | `14px / 20px` | 400 | Forms and prose |
| Compact body | `13px / 18px` | 400 | Tables, toolbars, dense lists |
| Label | `13px / 18px` | 500 | Form and control labels |
| Caption | `12px / 16px` | 400 | Supporting copy |
| Metadata | `11px / 14px` | 500 | Non-essential, never sole carrier |
| KPI value | `22px / 26px` | 500 | Tabular numerals, no display face |
| Large financial total | `28px / 32px` | 600 | Rare; detail lead only |

Rules:

- Sentence case everywhere.
- Weights are 400, 500, or 600. Reserve 700 for brand artwork only.
- Avoid letter spacing except machine codes and tiny all-caps legal abbreviations.
- No italic captions as a visual signature.
- Do not truncate essential labels without a tooltip or an alternate full-text path.
- Amounts always retain currency; dates use a consistent locale-aware formatter.

### 3.3 Spacing

Use the following scale only:

| Token | Value |
|---|---:|
| `--ua-space-0` | `0` |
| `--ua-space-0-5` | `2px` |
| `--ua-space-1` | `4px` |
| `--ua-space-1-5` | `6px` |
| `--ua-space-2` | `8px` |
| `--ua-space-2-5` | `10px` |
| `--ua-space-3` | `12px` |
| `--ua-space-4` | `16px` |
| `--ua-space-5` | `20px` |
| `--ua-space-6` | `24px` |
| `--ua-space-8` | `32px` |
| `--ua-space-10` | `40px` |
| `--ua-space-12` | `48px` |

Dense UI uses 4–12px internal gaps. Page composition uses 16–24px gaps. A 32px or larger gap must separate major page regions, not compensate for weak hierarchy.

### 3.4 Geometry

| Token | Value | Use |
|---|---:|---|
| `--ua-radius-xs` | `4px` | Checkboxes, tiny icon cells, progress segments |
| `--ua-radius-control` | `6px` | Buttons, inputs, selects, tabs |
| `--ua-radius-surface` | `10px` | Cards, tables, KPI groups |
| `--ua-radius-overlay` | `14px` | Dialogs and large floating surfaces |
| `--ua-radius-round` | `9999px` | Avatar, count, status dot/pill only |

Rules:

- A component has one canonical radius across the product.
- Nested surfaces step down in radius: overlay → surface → control.
- Do not turn ordinary buttons, tabs, cards, or filters into pills.
- Do not use asymmetric or decorative corner shapes.

### 3.5 Borders and depth

Borders carry most hierarchy:

- Default panel: 1px `--ua-border-subtle`.
- Interactive control: 1px `--ua-border-default`.
- Active/selected control: 1px `--ua-border-strong`.
- Dividers: 1px `--ua-border-subtle`.
- No double border where joined regions meet.

Depth tokens:

| Token | Target |
|---|---|
| `--ua-shadow-none` | `none` |
| `--ua-shadow-float` | `0 4px 14px rgb(20 20 20 / 8%)` |
| `--ua-shadow-menu` | `0 8px 24px rgb(20 20 20 / 12%)` |
| `--ua-shadow-overlay` | `0 24px 64px rgb(20 20 20 / 18%)` |
| `--ua-shadow-focus` | 2px focus ring plus 2px surface-coloured separation |

Inline cards and KPI tiles have no drop shadow. Menus, tooltips, popovers, drawers, dialogs, and toasts may use the appropriate floating shadow.

### 3.6 Control dimensions

| Control | Desktop | Mobile / coarse pointer |
|---|---:|---:|
| Compact button / filter | 30px | 44px hit target |
| Default button | 34px | 44px |
| Large button | 40px | 44px |
| Input / select / combobox | 38px | 44px |
| Icon button visual box | 30–34px | 44px hit target |
| Table header | 34px | 40px |
| Table row | 40px minimum | 44px minimum |
| Top utility header | 48px | 48px |

Visual density must not reduce the interactive hit target below 44×44px on coarse pointers. Transparent hit padding is allowed where the visual control remains compact.

### 3.7 Iconography

- Use one outline icon family, currently Lucide.
- Default stroke: 1.5px at 14–16px.
- Icons support labels; they do not replace unfamiliar labels.
- Decorative icons are rare and `aria-hidden`.
- A filled icon is reserved for the current navigation item, a selected role tile, or a semantic state where fill adds a second cue.
- Provider marks use official assets; do not redraw them with product icons.

### 3.8 Motion

| Token | Duration | Use |
|---|---:|---|
| `--ua-duration-fast` | `100ms` | Hover/focus colour |
| `--ua-duration-base` | `160ms` | Menus, tabs, small disclosure |
| `--ua-duration-slow` | `220ms` | Dialog/drawer entrance |

Use a standard ease-out curve. No bounce, spring, parallax, decorative looping, staggered page entrances, or `translateY(1px)` button press. Loading indicators may rotate; progress may update. Reduced-motion mode removes spatial motion and preserves state changes.

---

## 4. Global application shell

### 4.1 Desktop anatomy

```text
┌─────────────────────────────────────────────────────────────┐
│ sidebar │ utility header / breadcrumb / global actions      │ 48
│         ├───────────────────────────────────────────────────┤
│         │ page heading + local actions                      │ 64–76
│         ├───────────────────────────────────────────────────┤
│         │ local tabs / KPI group / toolbar / working surface│
│         │                                                   │
└─────────────────────────────────────────────────────────────┘
```

- Expanded sidebar: 200px.
- Collapsed sidebar: 52px.
- Utility header: 48px, opaque `--ua-shell`, one bottom border; no blur.
- Main canvas: `--ua-canvas`.
- Content gutter: 20px at ≥1280px, 16px at 768–1279px.
- Maximum working width: 1480px. Tables and boards may use the full width.
- Page-heading band belongs to the page, not to a freestanding hero card.

The actual application fills the viewport. Do not reproduce the reference image’s outer showcase margin, rounded browser frame, or environmental shadow inside the live app.

### 4.2 Sidebar

The sidebar is a quiet navigation rail:

- `--ua-shell` background with one right border.
- Logo and workspace switcher at the top.
- Groups use 11px metadata text; no decorative rules between every group.
- Items are 32px visual height on desktop.
- Default item: secondary text and icon.
- Hover: `--ua-surface-hover`.
- Active: primary text, primary icon, `--ua-surface-primary`, subtle border; no coloured left bar.
- Counts are compact semantic or neutral badges and never change item geometry.
- Connection health appears as a labelled compact status, not a full-width coloured banner.
- User identity, help, settings, and sign out live in a stable footer region.

Collapsed mode preserves tooltips, active state, badges, keyboard access, and workspace identity. Hover-expansion must never cause content reflow; an explicit toggle remains available.

#### 4.2.1 Selected navigation row (amended 2026-07-26)

The selected sidebar row is the **one inline surface permitted to carry depth**.
It renders as `--ua-surface-primary` against the `--ua-shell` sidebar, with a
`--ua-border-default` hairline, `--ua-shadow-raised`, and a 1px upward
translate. Selection is therefore carried by four channels — fill, border,
elevation and type weight — and never by colour alone (§9.1).

Constraints:

- `--ua-shadow-raised` exists only for this role. Do not use it on panels, cards,
  table rows, or KPI cells; those stay flat per §3.5.
- Unselected rows keep a transparent 1px border so gaining the border on
  selection does not shift the label.
- The rise is 1px and the transition uses `--ua-duration-base`. It must stay
  below the threshold where it reads as a hover toy rather than a state.

### 4.3 Utility header

The utility header contains:

- breadcrumb/current page context on the left;
- optional page-global context such as workspace;
- command search;
- notifications;
- avatar/account menu.

It must not duplicate the page title. Search, notification, and avatar controls share one compact treatment. The header is not translucent and has no backdrop blur.

### 4.4 Page header

- Title and one-line subtitle on the left.
- Up to two visible actions on the right: one primary, one secondary.
- Overflow actions move into a labelled menu.
- Tabs, when present, attach to the bottom of the header or the top of the first working surface.
- Eyebrows are omitted unless they identify a true parent domain that breadcrumbs cannot express.
- Page headers remain compact; they do not become marketing heroes.

### 4.5 Mobile shell

At widths below 768px:

- Sidebar becomes a left modal drawer opened from the 48px top bar.
- Page header stacks title, subtitle, then full-width action row.
- KPI groups become a two-column grid or horizontally scrollable labelled strip when comparison matters.
- Toolbars split into search plus a “Filters” action; filters open a bottom sheet or drawer.
- Data tables expose priority columns and place the complete row in a detail sheet; a contained horizontal scroll is acceptable for genuinely tabular comparison.
- Sticky action bars respect safe-area insets.
- No page-level horizontal overflow is permitted at 320px.

---

## 5. Page composition families

Every route uses one of these compositions. A route may extend a family, but it may not invent a new visual language.

### 5.1 Index / registry

Used by Work, Payout decisions, Losses, Customers, Notifications, Rules, Flows, Integrations, audit trail, and record listings.

Order:

1. Page header.
2. Optional tabs.
3. KPI group when the values affect prioritisation.
4. Optional one-sentence operational insight.
5. Search/filter/action toolbar.
6. One primary table or joined list surface.
7. Pagination and result count inside the same surface.
8. Optional narrow supporting rail only when it changes a decision.

KPI tiles, toolbar, table, and pagination should visually read as one working area where practical, matching the reference’s grouped team-management surface.

#### 5.1.1 Master–detail exception (amended 2026-07-25)

`/claims` is a decision queue, not a registry: the operator's task is to judge a
case against its evidence, and a bare table forces a round trip per case. It
therefore uses a **master–detail** composition — the queue list on the left, a
live case preview on the right — rather than the index-plus-table form above.

This is a deliberate amendment, not drift. The constraints that still apply:

- tabs, KPI group, filters, and pagination follow §5.1 unchanged;
- the queue list is a dense list of rows, not a set of oversized cards: one
  identity line, one next-action line, and at most two status badges per row;
- selection uses fill **plus** a border or glyph, never fill alone (§9.1);
- the list remains keyboard-navigable and each row exposes a real link to the
  full record, so the preview never becomes the only path to a case;
- below the mobile navigation boundary the composition stacks to list-then-detail.

Any other index route that wants a preview pane must use a drawer per §6.8, not
a second bespoke split-pane.

### 5.2 Board / workflow

Used by Recovery, workflow builders, rule builders, and exception resolution.

- Columns or stages share one parent surface.
- Column headers are compact and neutral.
- Cards inside boards are flat, bordered rows/tiles with no elevation.
- Drag handles appear only where drag-and-drop is real and keyboard alternatives exist.
- Builder canvases use neutral grid/alignment aids, not decorative dotted backgrounds.
- A fixed or sticky property panel may sit on the right at ≥1180px.

### 5.3 Record detail / decision workspace

Used by payout cases, customers, losses, recoveries, flow runs, and connected objects.

Order:

1. Breadcrumb through global header.
2. Compact identity header with status and primary action.
3. Four-or-fewer key facts in one grouped strip.
4. Primary decision/work section.
5. Evidence and operational sections.
6. Timeline/history.
7. Supporting context rail where needed.

Do not render every section as an unrelated floating card. Use one parent surface with joined, divided sections. Sticky decision actions must not hide the final content or conflict with browser zoom.

### 5.4 Settings / configuration

Used by every `/settings/**` and provider configuration route.

- Local settings navigation is a stable tab strip or left sub-navigation, never both.
- Main column target: 680–820px.
- Optional guidance rail: 240–280px.
- Sections are joined bordered groups with header, body, and optional footer.
- Labels sit above controls.
- Save actions are local to the changed section unless the whole page is one form.
- Destructive actions live in a final separated section.
- Success is confirmed inline and by toast where the change is not otherwise visible.

The Team page should be the closest direct adaptation of the supplied reference: page actions, compact tabs, four-stat group, searchable member table, and structured invite dialog.

### 5.5 Reporting

Used by Overview and Reports.

- Summary values first.
- One primary chart question per panel.
- Tables remain the detailed source of truth.
- Supporting charts are allowed only when they answer a distinct question.
- Chart panels use the same border, title, action, and empty-state grammar as other surfaces.

### 5.6 Entry / onboarding

- Single calm surface on the neutral canvas.
- Product mark, short title, concise support text, form, primary action, and necessary legal/help links.
- No marketing carousel or decorative illustration inside the working flow.
- Progress uses a labelled stepper with text and current-step indication, not colour alone.
- Onboarding may widen into a two-column configuration view only when a live preview or checklist is genuinely useful.

### 5.7 Embedded compact surface

Helpdesk widgets and extension UI use the same tokens and states at a smaller scale:

- 12–13px body;
- 30–34px controls with accessible host hit targets;
- no sidebar or page header;
- one clear recommendation, evidence gap, or lookup result;
- a direct link to the full Unauth record for deeper work;
- no independent palette or component variants.

---

## 6. Component system

### 6.1 Buttons and links

Canonical variants:

| Variant | Treatment | Use |
|---|---|---|
| Primary | Near-black fill, white text; reversed in dark mode | One principal action per surface |
| Secondary | White/primary surface, default border, primary text | Alternative or supporting action |
| Ghost | Transparent, primary/secondary text | Toolbars and low-emphasis actions |
| Danger | Critical foreground and soft fill/border; solid critical only in final confirmation | Destructive action |
| Link | Underlined text or text plus directional chevron | Navigation in prose/metadata |

Rules:

- `Button`, `ButtonLink`, and `IconButton` share height, radius, focus, loading, and disabled logic.
- Remove a separate `cta` appearance from product UI; CTA is a marketing concept.
- Loading preserves width and announces progress.
- Disabled uses muted surface and disabled text, not opacity on an otherwise active style.
- An icon-only button requires an accessible name and tooltip when meaning is not universal.
- Internal links use chevrons/arrows; external links use the external-link glyph and announce a new context.

### 6.2 Inputs and selection controls

All fields share one border, radius, height, label, hint, and error model.

Required primitives:

- text, email, password, number, currency, date, and search input;
- textarea;
- native select and accessible combobox;
- checkbox;
- radio group;
- switch;
- multi-value/token input;
- file upload/drop zone;
- date-range control;
- segmented role/option tile.

States:

- Default: primary surface, default border.
- Hover: strong border only; no tinted fill.
- Focus: focus ring plus default/strong border.
- Filled: same surface as default.
- Invalid: critical border, error icon, and explicit message.
- Disabled: muted surface and disabled text.
- Read-only: secondary surface with selectable content.

Placeholders are examples, not labels. Required/optional state is explicit. Help text remains visible when useful and does not appear only in a tooltip.

Option tiles, such as invite roles, use a two-column grid on wide dialogs and one column on narrow screens. Selection uses border, background, check/glyph, and `aria-checked`; pastel icon chips may distinguish categories but do not indicate selection.

### 6.3 Tabs, segmented controls, filters, and chips

- Tabs navigate sibling content regions. They sit in one subtle container or on one underlined row.
- Segmented controls change one mutually exclusive view and use a contained selected surface.
- Filter chips are interactive and neutral. Selected filters never borrow semantic colours.
- Status badges are non-interactive and semantic.
- Metadata chips are neutral labels.
- Counts may be round/pill badges.
- Removable tokens include a labelled remove action with a 44px coarse-pointer target.

Do not visually conflate tabs, filters, status, and metadata.

### 6.4 Cards, panels, and grouped surfaces

Canonical surfaces:

| Surface | Purpose |
|---|---|
| Panel | Major working region with optional header and footer |
| Section | Joined region inside a panel |
| KPI group | One outer surface containing equal metric cells |
| Inset group | Muted area for secondary configuration or explanation |
| Floating surface | Menu, popover, tooltip, toast, dialog |

`Card`, `SectionCard`, `AuthenticatedPanel`, `MetricCard`, and `WorkbenchKpiStrip` must converge on these forms. Variant proliferation (`raised`, `overlay`, `flat`, `muted`, `inset`, `plain`) should be replaced by explicit structural primitives, not retained as styling aliases.

Rules:

- Default inline surface: one border, no shadow.
- Nested surfaces use dividers or a subtle fill; avoid card-inside-card borders.
- Card headers are 44–52px where present.
- An icon chip is optional and never repeated mechanically on every card.
- Empty state belongs inside the surface it empties.

### 6.5 KPI and summary values

- KPI group is one bordered surface.
- Each metric cell uses a subtle fill or divider, not an individual elevated card.
- Label above value; optional trend/context below.
- Values use Inter tabular numerals.
- A passive KPI is not clickable and has no selected style.
- A filtering metric is a real tab/button with selected state and appropriate ARIA.
- Deltas include direction, comparison period, and whether the direction is favourable.

### 6.6 Tables and dense lists

`DataTable` and `DataTableServer` are the only new table foundations. Existing hand-built tables must migrate or adopt the same shared row/cell primitives before final acceptance.

Table anatomy:

- One surface owns toolbar, table, footer, and pagination.
- Header: secondary surface, 11–12px medium text, sentence case.
- Rows: primary surface, minimum 40px.
- No zebra striping.
- Hover: neutral hover.
- Selected: selected surface plus checkbox/selection cue.
- Focused interactive row: inset focus ring.
- Numeric columns right-align and use tabular numerals.
- Status, date, source, and action columns retain consistent widths.
- Row actions use a labelled overflow menu; a single common action may remain visible.
- Sticky headers are allowed inside the table scroll container.
- Bulk actions appear only after selection and state the selection count.
- Footer shows result range, page size where useful, and compact pagination.

Responsive rules:

- Preserve the identity, status, amount/priority, and primary action columns first.
- Hide lower-priority columns with an accessible detail path.
- Horizontal scrolling stays inside the table surface.
- Never transform every table row into an oversized marketing card.

### 6.7 Status, badges, sources, and grades

`StatusBadge`, `Badge`, `PrivacyBadge`, `GradeBadge`, `MetadataChip`, `FeatureTierBadge`, `SourceBadge`, `FreshnessIndicator`, and match/connection badges use one shared badge anatomy.

- Height: 20–24px.
- Radius: control radius or round only for compact status pills.
- Text: 11–12px, 500.
- Optional 5–6px dot or 12px icon.
- Sentence case.
- Status mapping is centralised by domain family.
- No raw database status string is rendered.
- Confidence/evidence grade always includes its label and explanation path.
- Freshness includes an absolute or relative timestamp and does not imply health from colour alone.

### 6.8 Overlays

#### Dialog / modal

The reference invite dialog defines the target hierarchy:

1. Outer overlay shell with product mark/context and close control.
2. Primary white content region.
3. Clear title and support text.
4. Labelled form groups.
5. Sticky or fixed footer with secondary and primary actions.

Specifications:

- Small: 420px.
- Default: 560px.
- Large: 720px.
- Maximum: `calc(100vw - 32px)`.
- Maximum height: `calc(100dvh - 32px)`.
- Outer radius: overlay radius.
- Inner region radius: surface radius.
- Backdrop: neutral scrim plus at most 6px blur.
- Focus trapped; background inert; Escape closes unless a critical operation is in progress.
- Initial focus follows task intent, not automatically the close button.
- Destructive confirmation names the object and consequence.

#### Drawer / sheet

- Desktop side drawer: 420–520px.
- Mobile: full width or bottom sheet based on content.
- Same header/body/footer grammar as dialogs.
- A drawer is for contextual work that preserves the parent list, not a substitute for every detail page.

#### Menu / popover / tooltip

- Compact, floating shadow, one border.
- Menus use roving keyboard focus.
- Popovers contain short interactive content.
- Tooltips contain supplemental text only and never essential instructions.
- All close on Escape and restore focus.

#### Toast

- Confirms completed background or cross-surface effects.
- Does not replace inline form error or persistent status.
- Maximum two visible; queued beyond that.
- Includes a text label and optional action.

### 6.9 Feedback and route states

Canonical shared components must cover:

- skeleton;
- inline progress;
- empty;
- filtered empty;
- zero-data activation;
- unavailable/disconnected;
- stale/partial;
- permission denied;
- feature locked;
- recoverable error;
- fatal route error;
- not found.

Every state preserves the resolved page geometry. Skeletons mirror the actual header, metrics, toolbar, table/board, and rail. Skeletons use neutral static/pulsing blocks with reduced-motion support; they do not preview obsolete chart treatments.

### 6.10 Navigation and command surfaces

`AppHeader`, `Sidebar*`, `WorkspaceSwitcher`, `AvatarMenu`, `CommandPalette*`, notification access, route progress, and breadcrumbs share:

- compact controls;
- neutral selected states;
- one focus treatment;
- no page-local restyling;
- complete keyboard access;
- current-route announcements where appropriate.

Command palette:

- 560–640px default dialog;
- search field integrated at the top;
- grouped results with 36–40px rows;
- keyboard hint on the right;
- active result uses selected surface, strong text, and a leading icon;
- no colour-gradient or oversized search treatment.

### 6.11 Existing shared component disposition

| Existing component/family | Target disposition |
|---|---|
| `Button`, `ButtonLink`, `IconButton` | Consolidate on §6.1 |
| `Input`, `Select` | Extend into complete field family in §6.2 |
| `Tabs`, `SegmentedControl`, `FilterChip` | Preserve semantic distinctions; restyle to §6.3 |
| `Card`, `SectionCard`, `AuthenticatedPanel` | Consolidate structure; remove visual variant sprawl |
| `MetricCard`, `MetricGroup`, `WorkbenchKpiStrip` | One grouped KPI grammar |
| `DataTable`, `DataTableServer` | Authoritative table implementation |
| `RowActionsMenu`, `PageSizeSelect`, pagination | One dense table utility grammar |
| `Badge`, `StatusBadge`, `PrivacyBadge`, `GradeBadge`, `MetadataChip` | One anatomy, distinct semantics |
| `Modal`, `Drawer`, `Tooltip`, `Toast` | One floating-layer system |
| `EmptyState`, `WorkbenchEmptyState`, `LoadingState`, `LoadingSkeleton` | Consolidate by state and geometry |
| `PageHeader`, `AuthenticatedPageHeader` | One page-header primitive |
| `WorkbenchPage`, `DetailPageShell`, `SettingsPageShell` | Retain as page composition families, restyle fully |
| `KeyInsightCallout`, `SummaryRail`, `RecommendationBlock` | Flatten into neutral decision/support regions |
| `EvidenceChecklist` | Joined checklist rows with explicit completion |
| `UnauthLogo` | One monochrome app variant; provider/marketing variants stay scoped |
| `LandingPrimitives` | Prohibited from authenticated/product UI; migrate existing consumers |

### 6.12 Internal and legacy helper disposition

The following exported helpers are also in scope; they are not exempt merely
because they are style constants or component internals.

| Existing helper/family | Target disposition |
|---|---|
| `BUTTON_ICON_SIZES` and button class maps | Rebuild from canonical control and icon-size tokens |
| `BADGE_LAYOUT_STYLE`, `badgeToneStyle`, `STATUS_TONES`, `PriorityChip` | One badge anatomy and central domain status mapping |
| `GRADE_BADGE_LETTER_STYLE`, `GRADE_BADGE_LABEL_STYLE` | Consume canonical type and spacing roles; retain only confidence semantics |
| `PAGE_*` constants in `pageShellStyles.ts` | Replace with the single page-header/composition contract; no parallel inline-style layer |
| `DATA_TABLE_*` constants in `dataTableStyles.ts` | Fold into canonical table primitives and shared CSS; no second table skin |
| `ToastProvider` | Retain behaviour; replace presentation through the shared floating-layer system |
| `ErrorBoundaryUI` | Merge into the canonical recoverable/fatal route-error family |
| `WorkbenchNav` and `WORKBENCH_NAV_ITEMS` | Remove if still deprecated; global/sidebar or true local tabs own navigation |
| `WorkbenchActionBar` | Retain as the canonical index toolbar composition |
| `CommandPaletteInputBar`, `CommandPaletteFooter`, `CommandPaletteSurface`, `CommandPaletteResultsList` | Treat as one command-palette component with the states in §6.10 |
| `ContextCreditsBadge`, `MerchantEnvChip` | Compact neutral utility-header controls; semantic colour only for a real state |
| `BreadcrumbOverrideProvider`, `SetBreadcrumbLabel` | Behaviour-only helpers; presentation comes solely from the global breadcrumb |
| `SidebarInner`, `SidebarAside`, `SidebarNavItem`, `SidebarGroupLabel` | One responsive sidebar implementation following §4.2 |
| `Bone`, `MetricCardGridSkeleton`, `TableSkeleton`, `SectionCardSkeleton` | Low-level canonical skeleton geometry only |
| `WorkbenchPageSkeleton`, `AuthenticatedChartSkeleton`, route-named skeleton exports | Consolidate around resolved composition geometry; remove legacy route names and shapes |
| `OperationalRouteSkeleton`, `OperationalRouteError` | Fold into the shared route-state family without losing route-specific copy/actions |

Every export from `LandingPrimitives`—including `StepBadge`,
`SectionEyebrow`, `SectionHeadline`, `SectionBody`, `PanelCard`,
`EvidenceLine`, `ThreadPanel`, `KanbanBoard`, `KanbanColumn`, `TagPill`, and
`MockBrowserFrame`—remains public/marketing-only. Any product consumer must
migrate; none may be restyled into a second product primitive.

---

## 7. Domain component application

### 7.1 Payout decisions and investigations

Applies to `components/claims/**`, `components/claims/payout/**`, and `components/claims/investigations/**`.

- `ClaimReviewHeader` becomes the compact record identity band.
- `PayoutCaseLeadBlock` is the first decision surface, not a decorative hero.
- Exposure, evidence, responsibility, attribution, recovery, and financial-history cards become joined sections under one surface grammar.
- `GateRecommendationPanel` uses neutral structure; recommendation state uses semantic status only.
- `EvidenceChecklistCard` and `DeliveryEvidenceCard` use explicit checklist/record rows.
- `IntegrationEvidenceSourcePanel` preserves provider identity without provider-coloured containers.
- `InvestigationTimeline` and the case timeline share one timeline primitive.
- Request/response dialogs use the canonical modal and field system.
- The action rail stays visible on wide screens and becomes a bottom action region on narrow screens.
- Draft, saving, saved, conflict, and stale states are all visible and text-labelled.

### 7.2 Work and exceptions

Applies to `WorkQueue`, `ExceptionQueue`, and `ExceptionResolutionDrawer`.

- Work is a table-led cockpit.
- Saved/system views use tabs or a compact view switcher.
- Deadline risk appears in the KPI/summary region; no decorative risk card.
- Bulk actions appear only after selection.
- Exception resolution opens a contextual drawer with evidence, impact, available actions, audit note, and confirmation.
- SLA status uses icon + text + semantic badge and retains exact deadline information.

### 7.3 Customers and relationships

Applies to customer tables, preview drawer, profile, support cases, behaviour roadmap, connected objects, related records, and match badges.

- Customer list follows the index composition.
- Preview drawer is a compact summary with one “Open full profile” action.
- Full profile leads with identity and case context, then joined activity/evidence sections.
- Relationship confidence never becomes a colourful score spectacle.
- `BehaviorRoadmap` becomes a clean event sequence with labelled states and no decorative gradient.
- Source records retain provider icon, source name, record ID, and timestamp.

### 7.4 Losses and recovery

- Loss ledger is a dense financial table.
- Amounts align right, retain explicit currency, and use tabular numerals.
- Loss detail uses joined attribution, source, correction, and history sections.
- Recovery board uses neutral stage columns and small status accents.
- Recovery cards have no shadow and no saturated stage background.
- Recovery detail exposes owner, evidence, outstanding amount, next action, correspondence, tasks, and history in that order.
- Completion and write-off actions use explicit confirmation and audit-note requirements.

### 7.5 Rules and flows

- Index pages follow the same toolbar/table/list system.
- Published/draft state is a semantic badge, not a coloured card style.
- Builders use a neutral canvas, bordered condition/action blocks, and a fixed properties/validation rail.
- Connectors/branches are graphite; status/error annotations use semantics.
- Version history is a compact list/table.
- Publish and rollback are explicit modal flows.
- Simulation results are a joined result region with input facts, matched conditions, outcome, and explanation.
- Flow runs use the same status and timeline grammar as other operational histories.

### 7.6 Integrations and imports

- Integration index groups sources by operational state using labels and filters, not coloured sections.
- `ConnectorRow` is a bordered list row with provider mark, capability summary, health, freshness, and actions.
- Provider detail uses settings composition.
- Connection-health panels use text-labelled dimensions and exact last-verified time.
- Setup steps are compact numbered sections.
- CSV import uses a stepper, mapping table, validation summary, row-level errors, and a final confirmation.
- Account-selection views use radio rows or selectable tiles with explicit account metadata.
- Provider brand colour is limited to the official mark.

### 7.7 Reports and charts

- Dashboard and Reports share the chart grammar in §8.
- Export controls are secondary buttons/menus in the panel header.
- Record drill-down is a table/detail composition, not a special analytics aesthetic.
- No chart exists solely to fill an empty region.

### 7.8 Settings, billing, account, and team

- All settings share one navigation and section structure.
- Account/profile/password/appearance sections are joined groups.
- Billing status and plan information use neutral panels; warning/critical semantics appear only for real billing state.
- API key creation/revocation uses canonical dialogs, read-only code fields, and copy confirmation.
- Data/privacy destructive actions are isolated, consequence-led, and re-authenticated where required.
- Team management directly follows the reference composition.
- Invite roles use selectable option tiles with concise permissions copy.
- Team rows use avatar, name/email, role, status, joined date, and row actions.
- Audit trail is a dense filterable table with actor, action, target, source, and timestamp.

### 7.9 Product gating, banners, and demo state

- `FeatureGate`, `FeatureTierBadge`, `LockedFeaturePreview`, and `UpgradeCard` use neutral structure.
- Locked capability copy explains the capability and access path without a marketing gradient.
- Demo, connection, and billing banners are one-line compact strips.
- Persistent banners use semantic icon, title, concise text, and one action.
- Multiple banners stack by severity and must not consume most of the viewport.

### 7.10 Helpdesk widgets and browser extensions

- Use compact product tokens, not public-site tokens.
- Surface one outcome/recommendation and the evidence behind it.
- Keep full investigation, recovery, and configuration in the main app.
- Host-platform constraints may change dimensions but not colour, typography, state, or interaction meaning.
- Any raw HTML renderer must consume a generated/shared token map to prevent drift.

---

## 8. Data visualisation

The previous chart-specific visual language is fully superseded. Quiet Precision charts are flat, restrained, and subordinate to the operational question.

### 8.1 Chart principles

- Use a chart only when position or shape communicates something a table cannot communicate as quickly.
- One chart answers one named question.
- Use neutral axes, grid, labels, and panel chrome.
- Use flat fills and solid/dashed strokes. No gradients, hatching, texture, glow, 3D, pictograms, or decorative matrices.
- Use Inter with tabular numerals. Monospace is limited to identifiers/code.
- Maximum five simultaneous series; facet or group beyond that.
- Direct-label when practical; otherwise use a visible legend.
- Every chart has an accessible table or equivalent text summary.
- Hover is supplementary; keyboard and touch expose the same values.
- Null, unavailable, partial, disconnected, and zero are distinct.
- Never aggregate incompatible currencies.

### 8.2 Series palette

Product action remains monochrome. Charts may use a fixed low-chroma categorical set:

| Slot | Light | Dark | Typical role |
|---|---:|---:|---|
| 1 | `#4F6FA8` | `#86A3D4` | Primary series / informational |
| 2 | `#2F7A68` | `#67AE99` | Positive/recovered |
| 3 | `#705D96` | `#A595C5` | Duration/secondary category |
| 4 | `#936B25` | `#C9A35D` | Attention |
| 5 | `#A05252` | `#D28686` | Failure/loss |
| Neutral | `#8A8E93` | `#8F949A` | Other/reference |

These colours are marks, not text colours. Final implementation must run contrast, adjacent-series, and colour-vision-deficiency validation before locking the token values. Series assignment is stable across filters. Meaning never depends on the slot alone.

### 8.3 Approved forms

- Line: 2px stroke, optional 4px focus point, no area wash by default.
- Bar/column: flat fill, 4px top/data-end radius, no cap or gradient.
- Stacked bar: max five segments, 2px separation only where it does not distort totals.
- Ranked contribution: flat bar plus direct value.
- Progress/capacity: one flat fill and neutral track; label and value always visible.
- Donut: only for two-to-five-part composition; total in adjacent text, not trapped inside a tiny centre.
- Sparkline: support only, never sole evidence.
- Matrix/heatmap: only for a real two-dimensional question; square cells, one sequential scale, full legend.

### 8.4 Route assignment

- `/dashboard`: summary metrics, one performance trend, one composition/health support view, operational work table.
- `/reports`: trend/comparison plus contribution view and detailed data table.
- Operational index routes: KPI/summary plus the primary table/board; charts only when a distinct operational question justifies one.
- Detail and settings routes: no chart unless the record has real history that materially changes a decision.

---

## 9. Interaction states and behaviour

### 9.1 Universal state matrix

Every interactive component implements:

| State | Required cue |
|---|---|
| Default | Base surface, border, text |
| Hover | Neutral fill or border change |
| Focus-visible | High-contrast focus ring, no geometry shift |
| Active/pressed | Darker/lighter neutral state, no physical jump |
| Selected | Fill + border/text/glyph; not colour alone |
| Disabled | Muted surface/text, inert semantics |
| Loading | Stable dimensions, progress announcement |
| Invalid | Border + icon + message |
| Success | Persistent inline confirmation when needed |

### 9.2 Primary action discipline

- One primary action per dialog, panel footer, or page header.
- A page may contain multiple local primary actions only when each belongs to a clearly separate form section.
- Destructive action is not visually primary until the destructive confirmation dialog.
- Row actions remain secondary/ghost.
- “Save” is disabled only when no valid change exists or submission is in progress; explain other blocking states.

### 9.3 Keyboard model

- Logical DOM order follows visual order.
- All menus, dialogs, drawers, tabs, comboboxes, builders, and data grids implement established ARIA patterns.
- Row click never replaces a real link/button.
- Escape closes the top dismissible layer.
- Focus returns to the invoking element.
- Skip link reaches the main working region.
- Sticky regions never obscure focused controls.

---

## 10. Content, labels, and data presentation

- Use the neutral operational language in `docs/PRODUCT.md`.
- Titles name the object or task; subtitles explain scope or consequence.
- Button labels use verbs: “Invite member”, “Save changes”, “Export CSV”.
- Avoid “Submit” when a more exact verb exists.
- Empty states explain why the region is empty and the next useful action.
- Errors state what failed, what was preserved, and what to do next.
- Status is humanised and sentence case.
- Dates, currency, percentages, identifiers, and provider sources use shared formatters.
- Relative dates include an absolute value on hover/focus or adjacent metadata.
- Truncated cell content has a discoverable full value.
- Source provenance remains visible wherever it affects trust.

---

## 11. Responsive, accessibility, and system preferences

### 11.1 Breakpoints

Use content-driven changes around:

- 320–479px: compact phone;
- 480–767px: wide phone;
- 768–1023px: tablet / mobile navigation boundary;
- 1024–1279px: compact desktop;
- 1280–1599px: standard desktop;
- 1600px+: wide operational workspace.

Do not add a breakpoint to solve one page’s arbitrary spacing.

### 11.2 Accessibility

Target WCAG 2.2 AA:

- 4.5:1 for normal text;
- 3:1 for large text and meaningful graphics;
- 3:1 component boundary/focus contrast where required;
- visible focus on every interactive element;
- 44×44px coarse-pointer targets;
- zoom to 200% without loss of content or function;
- text spacing overrides without clipping;
- no status, chart series, or selection conveyed by colour alone;
- accessible names for icons and controls;
- live-region announcements for asynchronous completion/error;
- reduced motion, forced colours, and high contrast remain usable.

The supplied references contain very light supporting text. The implementation must preserve the quiet appearance while raising contrast to the values in this specification; visual imitation never overrides accessibility.

### 11.3 Theme and system settings

- Light and dark mode use the same hierarchy and component geometry.
- Forced-colours mode may flatten fills and shadows; borders, labels, and focus must survive.
- Print/export views use white background, black text, visible table boundaries, and explicit URLs/metadata where relevant.

---

## 12. Route-by-route target map

Every route listed here includes its loading, error, empty, responsive, dark, permission, and disconnected variants where applicable. Redirect aliases inherit the canonical destination and do not maintain separate visual implementations.

### 12.1 Core operations

| Route | Family | Target composition |
|---|---|---|
| `/dashboard` | Reporting | Compact page header; period/actions; grouped KPIs; primary trend; supporting composition/health; priority work table |
| `/work` | Index | Views; deadline/work KPIs; search/filter toolbar; work table; bulk action region |
| `/exceptions` and exception view | Index + drawer | Exception table; severity/source filters; resolution drawer |
| `/claims` | Record detail (master–detail) | Queue tabs; exposure/decision KPIs; filters; queue list beside a live case preview; pagination |
| `/claims/[id]` | Record detail | Identity/status; exposure/decision lead; evidence; investigation; responsibility; recovery; timeline; action rail |
| `/losses` | Index | Financial KPIs; contribution summary; filters; loss ledger |
| `/losses/[id]` | Record detail | Loss identity; amount/status; attribution; source; correction/actions; financial history |
| `/recoveries` | Board | Recovery KPIs; view/filter toolbar; neutral stage board; progress summary |
| `/recoveries/[id]` | Record detail | Owner/status/amount; next action; evidence; correspondence; tasks; history |
| `/customers` | Index | Customer/case KPIs; search/filter toolbar; customer table; preview drawer |
| `/customers/[id]` | Record detail | Customer identity; case context; orders/payouts/losses; relationships; notes; timeline |
| `/customers/[id]/claims` | Index within detail | Customer-scoped payout-case table with full route context |
| `/customers/[id]/evidence/new` | Form | Evidence-package stepper; source selection; fields; review; sticky actions |

### 12.2 Rules, flows, and reports

| Route | Family | Target composition |
|---|---|---|
| `/rules` | Index | Lifecycle KPIs; filters; rule list/table; create action |
| `/rules/[id]` | Builder/detail | Rule identity/version; condition builder; validation/simulation rail; version history |
| `/rules/recovery` | Index/config | Recovery-owner/routing rules; filters; ordered rule list |
| `/flows` | Index | Flow status KPIs; filters; flow list/table |
| `/flows/[id]` | Builder/detail | Flow identity/version; neutral workflow canvas; property/validation rail |
| `/flows/runs` | Index | Run filters; status summary; run table |
| `/flows/runs/[id]` | Record detail | Run status/timing; input/output summary; step timeline; errors |
| `/reports` | Reporting | Range/compare controls; KPIs; trend/comparison; contribution; export |
| `/reports/records` | Index/detail | Report context; matching-record table; pagination/export |

### 12.3 Integrations

| Route | Family | Target composition |
|---|---|---|
| `/integrations` | Index | Source-health KPIs; state/category filters; joined connector rows |
| `/integrations/[provider]` | Settings/detail | Provider identity; connection status; capabilities; setup/config; sync/history/actions |
| `/integrations/imports` | Form/workflow | Import stepper; upload; mapping; validation; commit; result |
| `/integrations/shipbob/select` | Selection | Account radio rows/tiles; metadata; confirm action |
| `/integrations/dev-preview` | Dev gallery | Canonical integration states only; production-inaccessible |
| `/settings/integrations/shopify` | Settings/detail | Shared provider settings composition |
| `/settings/integrations/gorgias` | Settings/detail | Shared provider settings composition |
| `/settings/integrations/zendesk` | Settings/detail | Shared provider settings composition |
| `/settings/integrations/freshdesk` | Settings/detail | Shared provider settings composition |
| `/settings/integrations/chrome` | Settings/detail | Extension setup and verification using shared step groups |

Provider routes such as BigCommerce and WooCommerce rendered through `/integrations/[provider]` use the same provider-detail composition.

### 12.4 Settings

| Route | Family | Target composition |
|---|---|---|
| `/settings` | Settings landing | Compact settings index or redirect to first section; no duplicate bespoke page |
| `/settings/account` | Settings | Profile, password, workspace, appearance, danger sections |
| `/settings/billing` | Settings | Plan/status, usage, payment, invoices, actions |
| `/settings/team` | Settings/index | Reference-led tabs, KPI group, member table, invite dialog, audit section |
| `/settings/platform` | Settings | Grouped operational defaults with local save actions |
| `/settings/agreements` | Settings/index | Agreement upload, validation, list, detail/actions |
| `/settings/api-integrations` | Settings | API/helpdesk integration groups; key table; create/revoke dialogs |
| `/settings/notifications` | Settings | Event preference groups and delivery controls |
| `/settings/data-privacy` | Settings | Scope, retention, erasure, audit, legal links, destructive actions |
| `/settings/audit-trail` | Settings/index | Actor/action/time filters; audit table; export where authorised |

### 12.5 Connected object details

| Route | Target |
|---|---|
| `/orders/[id]` | Shared object-detail shell with source, financials, events, relationships |
| `/shipments/[id]` | Shared object-detail shell with tracking, delivery evidence, events |
| `/refunds/[id]` | Shared object-detail shell with amount, reason, source, relationships |
| `/returns/[id]` | Shared object-detail shell with items, status, source, events |
| `/disputes/[id]` | Shared object-detail shell with amount, evidence, status, events |
| `/tickets/[id]` | Shared object-detail shell with provider, customer, case links, events |

These pages must use one `ConnectedObjectDetail` composition rather than six visual systems.

### 12.6 Utility, entry, and global routes

| Route | Family | Target |
|---|---|---|
| `/notifications` | Index | Read/unread summary; filter/action toolbar; notification list |
| `/help` | Settings/editorial hybrid | Search/guide list; compact support region; product shell retained |
| `/dev/design-system` | Dev gallery | Every token, primitive, state, density, theme, and breakpoint |
| `/login` | Entry | Single authentication surface |
| `/reset` | Entry | Password-reset request surface |
| `/reset/update` | Entry | New-password surface |
| `/signup` | Entry | Product form portion follows Quiet Precision; public surrounding content remains isolated |
| `/onboarding` | Entry/workflow | Labelled stepper, configuration groups, preview/checklist where useful |
| `/demo` | Product demo | Quiet Precision product shell inside the demo; public framing stays separate |
| Global/app `loading` | State | Geometry-matched shell/page skeleton |
| Global/app `error` | State | Clear failure, retry, preserved-work message |
| Global/app `not-found` | State | Current shell where authenticated; direct recovery links |

### 12.7 Compatibility routes

`/inbox`, `/catches`, `/chargebacks`, `/evidence`, `/store`, `/lookup`, `/global`, `/graph`, `/clusters`, `/watchlist`, `/audit`, `/report`, `/audits`, `/history`, `/saved`, `/new-audit`, `/upload`, `/network-metrics`, `/eval`, older help routes, and `/partners` redirect to canonical destinations. They must not retain pages, styles, skeletons, or screenshots of their own.

---

## 13. State coverage

Every page family must specify and test:

| State | Required presentation |
|---|---|
| Initial loading | Geometry-matched skeleton |
| Background refresh | Existing content retained; small progress indicator |
| Empty workspace | Activation explanation and primary setup action |
| True zero | Explicit successful zero, not an error |
| Filtered empty | Filters/search summary plus clear-reset action |
| Partial data | Visible scope/coverage note; available data remains usable |
| Stale data | Timestamp, source, impact, and refresh/repair action |
| Disconnected | Provider/source status and connect/repair action |
| Permission denied | Explain access boundary; no leaked record metadata |
| Feature locked | Explain entitlement and legitimate access path |
| Recoverable error | What failed, what remains, retry action |
| Fatal error | Stable shell, reference ID where available, safe navigation |
| Not found | No existence leakage across merchants; return path |
| Saving | Stable form, progress, duplicate-submit prevention |
| Saved | Inline confirmation and audit visibility |
| Conflict/stale edit | Preserve draft, explain conflict, offer resolution |
| Destructive in progress | Locked action, explicit progress, no accidental dismissal |

---

## 14. Implementation architecture

### 14.1 Canonical style entry

`styles/authenticated/index.css` remains the only product-style entry point. The implementation should retain clear files for:

- tokens;
- typography;
- foundations;
- controls;
- surfaces;
- tables;
- overlays;
- states;
- responsive behaviour.

Files may be renamed during implementation, but application code must not import individual layers.

### 14.2 Token cutover

The future implementation must:

1. Define the Quiet Precision `--ua-*` tokens directly.
2. Remove duplicate unprefixed authenticated aliases.
3. Remove authenticated product variables from global/public scope.
4. Scope public-site tokens to public layouts only.
5. Update Tailwind mappings to the canonical `--ua-*` names.
6. Remove hardcoded visual values from authenticated components.
7. Remove migration comments that describe superseded palettes or aliases.

Do not forward `--accent`, `--surface`, `--bg-*`, `--brand-rust`, `--copper-*`, `--chart-orange`, or similar historical names into the new system.

### 14.3 Primitive-first order

Migrate in dependency order:

1. Tokens, type, focus, motion, and reset.
2. Button/link/icon button and form controls.
3. Badge/status/chip/tabs/filter.
4. Panel/section/KPI.
5. Table/list/pagination.
6. Overlay and feedback layers.
7. Shell/navigation/page headers.
8. Page composition shells.
9. Domain components and charts.
10. Route states and embedded surfaces.

A page migration may begin only after its required primitives are stable.

### 14.4 Shared style implementation

- Prefer component-owned CSS modules or shared class builders consuming canonical tokens.
- Tailwind arbitrary values are prohibited for visual design.
- Inline style is reserved for data-derived geometry and CSS custom-property assignment, not static appearance.
- Component props describe semantics or structure, not arbitrary colours/radii/shadows.
- Provider brand marks and data-derived chart geometry are narrow documented exceptions.

### 14.5 Design gallery

`/dev/design-system` becomes the executable contract. It must render:

- every token in light/dark;
- all type roles;
- all button and field states;
- tabs, filters, badges, and selection controls;
- surfaces and KPI groups;
- table densities and row states;
- menus, tooltip, popover, toast, drawer, and all dialog sizes;
- all route states;
- charts with zero/null/partial/unavailable data;
- desktop, tablet, and phone frames;
- forced-colours/reduced-motion notes.

No component is canonical until its states appear in the gallery.

---

## 15. Migration plan

The work should be delivered in reviewable implementation changes, but the final merge state is one visual system.

### Phase 0 — Baseline and safety

- Freeze route and capability inventory.
- Capture every route at 1440×900, 1024×900, and 390×844 in light and dark.
- Record current keyboard paths, actions, query parameters, exports, dialogs, and empty/error states.
- Extend functional-parity selectors before visual refactoring.
- Add a repository search report for legacy tokens/classes/styles.

### Phase 1 — Foundations

- Replace authenticated tokens with §3.
- Consolidate fonts and type roles.
- Remove global authenticated aliases and warm/coloured action values.
- Implement canonical focus, motion, borders, radii, shadows, and control sizes.
- Update authenticated design lint to reject the deletion ledger in §16.

### Phase 2 — Primitive system

- Migrate every component in §6.11.
- Add missing field controls.
- Consolidate duplicate loading/empty/error primitives.
- Consolidate page headers and badge anatomy.
- Build the complete design gallery.

### Phase 3 — Shell and composition

- Migrate sidebar, utility header, command palette, menus, banners, and mobile drawer.
- Migrate `WorkbenchPage`, `DetailPageShell`, and `SettingsPageShell`.
- Establish index, board, detail, settings, report, entry, and embedded compositions.

### Phase 4 — High-coverage pages

Migrate in this order because each validates a different family:

1. Team settings: table, KPI group, tabs, invite dialog.
2. Work: dense index and filters.
3. Payout-case detail: complex detail and action rail.
4. Recovery: board.
5. Dashboard: reporting/charts.
6. Account settings: form sections.
7. Onboarding: entry/workflow.

### Phase 5 — Full route migration

- Complete every route in §12.
- Migrate all domain components in §7.
- Migrate every loading/error/not-found file.
- Migrate embedded helpdesk/extension surfaces.
- Remove authenticated use of `LandingPrimitives`.

### Phase 6 — Hard deletion and proof

- Complete §16 deletion ledger.
- Remove visual rollout/cohort branches.
- Remove compatibility token aliases.
- Remove old chart treatments and unused components/assets.
- Replace legacy evidence screenshots.
- Run the full acceptance suite in §17.
- Search the entire in-scope tree for forbidden remnants.

---

## 16. Mandatory deletion ledger

The final implementation is incomplete until these are absent from in-scope runtime code and active design rules.

### 16.1 Palette remnants

- Warm/cream authenticated canvases and surfaces.
- Rust, copper, espresso, orange action, orange brand-signal, and orange-first chart assumptions.
- Old literal values associated with those palettes.
- Authenticated dependencies on `--landing-*` or `--fl-*`.
- Page-local hardcoded colours, including grandfathered exceptions that are not provider marks or data-derived visualisation definitions.

### 16.2 Token and style remnants

- Duplicate authenticated aliases such as parallel `--bg-*`, `--surface-*`, `--text-*`, `--accent*`, and `--ua-*` layers.
- Mismatched control/card radius compatibility notes.
- Legacy shadow scales not used by Quiet Precision.
- Static inline `borderRadius`, `boxShadow`, colour, and background declarations.
- Arbitrary Tailwind visual values.
- Page-specific style systems such as dashboard-only chrome that conflict with shared primitives.

### 16.3 Component remnants

- Authenticated `LandingPrimitives` consumers.
- Separate `cta` product-button appearance.
- Multiple visual page-header implementations.
- Hand-rolled status pills and page-local badges.
- New or retained hand-built tables that do not use the canonical table primitives.
- Duplicate empty/loading/error component families.
- Card variants preserved only to keep old appearance.

### 16.4 Chart remnants

- Hatch patterns and patterned tracks.
- Gradient bars/areas and decorative fills.
- Orange-leading financial chart convention.
- Monospace for all chart numerals.
- Old treatment names and route-specific visual grammar.
- Recharts/library default tooltips or colours.
- Charts on operational pages that do not answer a distinct question.

### 16.5 Documentation and test remnants

- Active rules that describe a superseded visual direction.
- Historical screenshots treated as current approval evidence.
- Tests that assert old colours, geometry, treatment names, or token aliases.
- Visual-regression baselines captured before Quiet Precision.
- “Temporary” visual feature flags or compatibility cohorts.

Historical source-control history is sufficient provenance. The live repository does not need active conflicting design instructions.

---

## 17. Verification and acceptance

### 17.1 Automated gates

The implementation must pass:

- `npm run lint`;
- `npm run typecheck`;
- `npm run lint:authenticated-design`;
- `npm run verify:ui-parity`;
- relevant Jest suites;
- `npm run test:redesign` after it is rewritten for Quiet Precision;
- accessibility and responsive Playwright coverage;
- full release browser coverage.

The design lint must additionally reject:

- forbidden legacy token names and palette literals;
- authenticated landing-token/primitives use;
- page-local static colour/radius/shadow;
- unapproved table/status/overlay implementations;
- obsolete chart textures/gradients;
- route-local skeleton markup;
- missing design-gallery coverage for exported UI primitives where enforceable.

### 17.2 Visual matrix

Capture and review:

- every static route;
- seeded dynamic routes;
- every dialog/drawer/menu;
- every state in §13;
- light and dark;
- 1440×900, 1280×800, 1024×900, 768×1024, 390×844, and 320×568;
- 200% browser zoom;
- reduced motion;
- forced colours/high contrast where available.

### 17.3 Functional parity

The visual migration must preserve:

- every route and redirect;
- query-string view/filter/sort/page state;
- server and client permission enforcement;
- form validation and mutation semantics;
- export/download;
- bulk actions;
- deep links;
- keyboard shortcuts;
- focus restoration;
- source provenance;
- financial and currency truth;
- loading/error recovery;
- audit history.

### 17.4 Performance

- No new render-blocking font family beyond Inter.
- No chart library outside approved report surfaces.
- Shell does not add query fan-out.
- Large tables remain virtualised/paginated as appropriate.
- Dialog/drawer code may be lazy-loaded when not part of the initial task.
- Motion and blur remain inexpensive; backdrop blur is limited to overlays.

### 17.5 Definition of done

Quiet Precision is complete only when:

1. Every route in §12 visibly belongs to the same product.
2. Every component and state uses the canonical tokens and primitives.
3. No superseded styling remains in the in-scope runtime or active rules.
4. Public-site styling remains isolated.
5. Light, dark, mobile, keyboard, reduced-motion, and forced-colour paths work.
6. Functional parity and product truth are proven.
7. The design gallery and visual evidence set match the shipped implementation.
8. Repository searches and the design lint return no forbidden remnants.

---

## 18. Contributor checklist

Before changing product UI:

- Read `styles/authenticated/README.md` and this document.
- Identify the page composition family.
- Use an existing primitive or extend the canonical primitive.
- Specify default, hover, focus, active, selected, disabled, loading, invalid, empty, error, mobile, and dark states.
- Preserve all product and access invariants.
- Add the component/state to `/dev/design-system`.
- Update the matching route skeleton and visual evidence.
- Run the design lint, parity gate, focused tests, and relevant browser matrix.

If a requested treatment conflicts with Quiet Precision, update this specification deliberately. Do not create a local exception and allow the system to fragment.

---

## 19. Existing component migration inventory

This is the implementation checklist for visual component exports present on
2026-07-25. A rename does not remove the obligation: the successor must satisfy
the stated contract. Reducers, data loaders, context providers, telemetry, and
formatters are behaviour-only unless they render DOM; if they render DOM, the
rendered output is in scope.

### 19.1 Shell, navigation, and global feedback

| Components | Required outcome |
|---|---|
| `AppHeader`, `AvatarMenu`, `WorkspaceSwitcher`, `ContextCreditsBadge`, `MerchantEnvChip` | One 48px neutral utility header and shared compact-control grammar |
| `CommandPalette`, `CommandPaletteInputBar`, `CommandPaletteFooter`, `CommandPaletteSurface`, `CommandPaletteResultsList` | One canonical command dialog with complete keyboard states |
| `Sidebar`, `SidebarInner`, `SidebarAside`, `SidebarNavItem`, `SidebarGroupLabel` | One desktop/collapsed/mobile sidebar implementation |
| `AppNavLink`, `NavigationProvider`, `RouteProgressBar`, `ScrollToTop` | Preserve behaviour; any visible output uses canonical focus/motion/colour |
| `BreadcrumbOverrideProvider`, `SetBreadcrumbLabel` | Behaviour only; global breadcrumb owns appearance |
| `DemoBanner`, `BillingStatusBanner`, `ConnectionPromptStrip` | One compact persistent-banner family |
| `NotificationCentre` | Index/list composition with shared row and read/unread states |
| `ToastProvider`, `ClaimReviewToast` | One canonical toast system; remove claim-specific toast appearance |
| `ThemeBootstrap`, `AmplitudeInit`, `AuthUiCohortTelemetry` | No independent UI; remove obsolete visual-cohort behaviour at final cutover |

### 19.2 Foundations and shared UI

| Components | Required outcome |
|---|---|
| `Button`, `ButtonLink`, `IconButton`, button style helpers | §6.1 action family; no product CTA variant |
| `Input`, `Select`, `FieldLabel` and new textarea/choice primitives | §6.2 complete field family |
| `Tabs`, `SegmentedControl`, `FilterChip`, `PriorityChip` | Preserve distinct semantics; one selection grammar |
| `Badge`, `StatusBadge`, `PrivacyBadge`, `GradeBadge`, `MetadataChip`, badge/grade/status helpers | One anatomy and central tone mapping |
| `Card`, `SectionCard`, `AuthenticatedPanel` | Panel/joined-section/inset structures; remove appearance-only variant sprawl |
| `MetricCard`, `MetricGroup`, `WorkbenchKpiStrip`, `CaseIntelTile` | One grouped KPI grammar |
| `DataTable`, `DataTableServer`, `RowActionsMenu`, `PageSizeSelect`, data-table style helpers | One table/list implementation |
| `Modal`, `Drawer`, `Tooltip`, `Toast` | One floating-layer implementation |
| `EmptyState`, `WorkbenchEmptyState`, `LoadingState`, `ErrorBoundaryUI` | One geometry-aware state family |
| `EvidenceChecklist`, `RecommendationBlock`, `KeyInsightCallout`, `SummaryRail` | Neutral joined decision/support sections |
| `PageHeader`, `AuthenticatedPageHeader`, page-shell style helpers | One compact page header |
| `UnauthLogo` | Monochrome product-shell variant; public variants remain scoped |
| `StatusPill`, `SlaBadge` | Remove page-local implementations; use central status/badge primitives |
| `RailSection` | Replace with canonical joined section/support-rail structure |

### 19.3 Page shells and route states

| Components | Required outcome |
|---|---|
| `WorkbenchPage`, `WorkbenchActionBar`, `WorkbenchNav`, `WORKBENCH_NAV_ITEMS` | Canonical index composition; remove deprecated cross-page workbench navigation |
| `DetailPageShell` | Canonical record-detail composition |
| `SettingsPageShell` | Canonical settings/configuration composition |
| `Bone`, `MetricCardGridSkeleton`, `TableSkeleton`, `SectionCardSkeleton` | Canonical low-level skeleton geometry |
| `WorkbenchPageSkeleton`, `OperationalRouteSkeleton`, `AuthenticatedChartSkeleton` | Geometry matches the resolved target composition |
| `DashboardLoadingSkeleton`, `CustomersLoadingSkeleton`, `ClaimsLoadingSkeleton`, `ReportsLoadingSkeleton`, `TablePageLoadingSkeleton`, `FormPageLoadingSkeleton`, `SettingsListLoadingSkeleton`, `ReportDetailLoadingSkeleton` | Restyle and consolidate by current page family |
| `StoreLoadingSkeleton`, `WatchlistLoadingSkeleton`, `ChargebacksLoadingSkeleton`, `UploadLoadingSkeleton`, `HistoryLoadingSkeleton`, `NetworkIntelligenceLoadingSkeleton`, `AuditDetailLoadingSkeleton`, `GraphLoadingSkeleton` | Remove legacy-route naming/geometry or map to a canonical current family |
| `OperationalRouteError` | Canonical recoverable/fatal route-error presentation |

### 19.4 Payout cases, evidence, and investigations

| Components | Required outcome |
|---|---|
| `ClaimReviewPanel`, `ClaimReviewHeader`, `ClaimReviewActionRail`, `ClaimReviewContextColumn` | Canonical decision-detail shell and responsive rail |
| `ClaimReviewFormSection`, `ClaimReviewManageCard`, `ClaimReviewHistoryTable` | Shared form section, panel, and table primitives |
| `PayoutCaseLeadBlock`, `PayoutExposureCard`, `GateRecommendationPanel` | One neutral lead-decision region |
| `DeliveryEvidenceCard`, `EvidenceChecklistCard`, `IntegrationEvidenceSourcePanel` | Joined evidence rows with provenance and explicit completeness |
| `ResponsibilityAssessmentCard`, `LossAttributionCard`, `RecoveryPathCard`, `RecoveryCaseCard` | Joined operational sections; semantic state only |
| `CaseFinancialHistoryCard` | Canonical financial table/history section |
| `CaseInvestigationsCard`, `InvestigationTimeline`, `DeliveryPhotoFinding` | Shared section/timeline/evidence primitives |
| `InvestigationRequestDialog`, `InvestigationResponseDialog` | Canonical dialog and field system |
| `EvidencePackageForm`, `EvidencePackageFormFields` | Canonical stepped form |
| `EvidencePackageFormIntro`, `EvidencePackageFormLoadingState`, `EvidencePackageFormEmptyOrders`, `EvidencePackageFormNoClaimsBanner` | Canonical activation/loading/empty/banner states |
| `CaseContextDrawer` | Canonical contextual drawer |
| `CaseComments`, `MentionPicker`, `CustomerNotes` | Shared collaboration rows, composer, menu, and audit states |
| `ClaimLifecycleStatusBar` | Neutral labelled lifecycle sequence; no independent palette |

### 19.5 Work, customers, losses, and relationships

| Components | Required outcome |
|---|---|
| `WorkQueue`, `ExceptionQueue`, `ExceptionResolutionDrawer` | Canonical table-led cockpit and contextual resolution drawer |
| `CustomersTableClient`, `CustomersFilterSheet`, `CustomersFilterSheetInner` | Shared table/filter sheet |
| `CustomerPreviewDrawer`, `CustomerSupportCasesSection` | Canonical preview drawer and joined list section |
| `BehaviorRoadmap` | Flat labelled event sequence |
| `LossLedger`, `LossActions` | Canonical financial table and explicit action/confirmation flow |
| `ConnectedObjectDetail`, `RelatedRecordsPanel`, `MatchStatusBadge` | One object-detail/relationship system and central status anatomy |
| `SupportCaseContextList` | Shared compact record list |
| `ProviderLogo`, `SourceMark` | Official provider identity inside neutral product containers |

### 19.6 Dashboard, reporting, and visualisation

| Components | Required outcome |
|---|---|
| `DashboardOverview`, `DashboardCharts`, `IntelligenceReportView` | Reporting composition in §5.5 and §8 |
| `ChartPanel`, `ChartState`, `ChartLegend`, `ChartTooltip`, `ChartCursor`, `ChartAxisPill` | One flat accessible chart shell/interaction grammar |
| `TrendLineChart`, `DualLineChart`, `ComboBarLineChart` | Restyle to approved flat forms; replace combo form if it requires obsolete gradient/cap geometry |
| `RankedContributionChart`, `SparkTrend` | Flat supporting forms with direct values |
| `MetricTabs`, `MetricTabsStatic` | Use only when metrics truly select a series; otherwise grouped passive KPIs |
| `BlockRailChart`, `SegmentCompositionCard`, `TickMeterRow` | Re-evaluate against a named operational question; retain only as flat accessible forms with no obsolete texture |
| `HatchDefs` | Delete |
| `AnalyticsLineChart`, `AnalyticsBarChart`, `AnalyticsDonutChart` | Migrate behind the canonical chart system or remove if unreferenced |
| `ExportMenu` | Canonical secondary menu in a panel/page action region |

### 19.7 Integrations, connections, imports, and provider setup

| Components | Required outcome |
|---|---|
| `ConnectorRow`, `ConnectionActions`, `ConnectionHealthHeader`, `ConnectionHealthGrid`, `DeferredLiveConnectionVerification` | Canonical neutral connector row/detail health grammar |
| `PageConnectionGate` | Canonical disconnected/partial/available state, preserving loaded content where safe |
| `CanonicalCsvImportClient` | Canonical stepped import workflow |
| `ShipBobIntegrationBanner` | Shared compact banner or provider-detail status |
| `ShopifyIntegrationBanner`, `ShopifyIntegrationBannerInner` | Shared compact banner; remove provider-specific container styling |
| `SyncStatusCard`, `SyncStatusConnectedView`, `SyncStatusDisconnectedView`, `SyncStatusScopesList` | Provider-detail joined sections and central status anatomy |
| `SyncStatusConnectModal`, `ShopifyDisconnectClient` | Canonical connect/confirm dialogs |
| `ConnectionStateProvider`, `DemoModeProvider` | Behaviour only; descendants use canonical state components |

### 19.8 Rules and flows

| Components | Required outcome |
|---|---|
| `RulesIndexClient`, `FlowsIndexClient`, `RecoveryRulebookClient` | Canonical index/list composition |
| `RuleVersionWorkbench`, `FlowVersionWorkbench` | Canonical builder/detail composition |
| `RuleBuilderDrawer` | Canonical property/configuration drawer |
| `ConditionBlock`, `FlowEditor` | Flat bordered builder blocks, neutral connectors, explicit validation |

### 19.9 Settings, account, team, billing, and helpdesk setup

| Components | Required outcome |
|---|---|
| `AccountProfileSection`, `AccountPasswordSection`, `AccountDangerSection`, `AppearanceSettings` | Joined settings sections; danger isolated last |
| `BillingSettingsClient` | Canonical billing settings composition |
| `PlatformSettingsClient`, `NotificationPreferencesForm`, `SubjectErasureClient`, `BulkDeleteClient`, `AuditTrailClient` | Canonical form/table/state primitives |
| `TeamManagementClient`, `TeamMembersSection`, `TeamMemberRow`, `TeamInviteForm`, `TeamAuditTrailSection` | Direct reference-led Team composition and invite flow |
| `ApiIntegrationsClient`, `ApiIntegrationsHelpdeskSection`, `ApiIntegrationsAdvancedSection`, `ApiKeysListSection` | Joined settings groups and canonical key table |
| `ApiKeyCreateDialog`, `ApiKeyRevokeDialog` | Canonical create/destructive dialogs |
| `GorgiasSetupClient`, `GorgiasSupportSyncClient`, `GorgiasSupportSyncConnectionDetails`, `GorgiasSupportSyncCreateForm`, `GorgiasCredentialFields`, `GorgiasWebhookSetupPanel` | One provider settings composition |
| `FreshdeskSupportSyncClient`, `FreshdeskSupportSyncConnectionDetails`, `FreshdeskSupportSyncCreateForm`, `FreshdeskCredentialFields`, `FreshdeskWebhookSetupPanel` | Same provider settings composition |
| `ZendeskSetupClient`, `ZendeskSupportSyncClient` | Same provider settings composition |
| `ChromeSetupClient` | Same step/configuration grammar adapted to extension setup |
| `HelpdeskSidebarPreview` | Compact embedded-surface grammar, framed as preview rather than independent theme |

### 19.10 Entry, demo, product gating, and isolated public components

| Components | Required outcome |
|---|---|
| `OnboardingClient` | Canonical entry/workflow composition |
| `OperationalCaseDemo` | Quiet Precision product UI inside the demo frame |
| `FeatureGate`, `FeatureTierBadge`, `LockedFeaturePreview`, `UpgradeCard` | Neutral locked/entitlement state; no marketing gradient |
| `DevPreviewProvider` | Behaviour only; no persistent alternate visual system |
| `UnauthLinearClaimHero`, `EvidenceNotVerdictsRampSection`, `GateArtifactsRow` | Public/marketing-only unless a product consumer is found; never treated as product primitives |
| `StepBadge`, `SectionEyebrow`, `SectionHeadline`, `SectionBody`, `PanelCard`, `EvidenceLine`, `ThreadPanel`, `KanbanBoard`, `KanbanColumn`, `TagPill`, `MockBrowserFrame` | Keep isolated in `LandingPrimitives`; migrate every product consumer away |

### 19.11 Inventory enforcement

During implementation, generate the visual export inventory from all in-scope
`.tsx` files and compare it with the design gallery. Any component that renders
visible DOM must be either:

1. represented in `/dev/design-system`;
2. covered as a domain composition with screenshots and states; or
3. documented as behaviour-only/public-only and verified not to render
   product UI.

An unclassified visual export is a release blocker.
