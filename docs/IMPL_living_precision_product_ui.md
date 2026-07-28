# IMPL — Living Precision product UI

- **Status:** Binding replacement specification. Implementation in progress —
  **not** `LIVING-PRECISION COMPLETE / CAPTURE-READY`. See §12.10 for the
  as-built position; do not cite this document as evidence that a phase closed.
- **Date:** 27 July 2026
- **Scope:** All 64 page-route files (58 production surfaces, 2 development harnesses, and 4 redirects), shared product chrome, components, data visualisation, motion, route states, and landing-page product imagery
- **Audit basis:** Live review at 1440×900 plus source review of all route families and shared visual primitives
- **Current implementation reference:** [`IMPL_quiet_precision_product_ui.md`](IMPL_quiet_precision_product_ui.md)
- **Current screenshot programme:** [`IMPL_product_polish_and_screenshot_readiness.md`](IMPL_product_polish_and_screenshot_readiness.md)
- **Current contributor rules:** [`../styles/authenticated/README.md`](../styles/authenticated/README.md)

This specification is the implementation contract for the next visual pass. It does not claim that the target is already implemented.

---

## 0. Authority and executive decision

Unauth will evolve from **Quiet Precision** to **Living Precision**: a predominantly monochrome operational product with one recognisable violet accent, confident information hierarchy, substantial and truthful data visualisation, and restrained motion that makes the interface feel responsive and current.

The existing neutral foundation is worth keeping. The existing visual result is not.

The current application is clean in isolation, but it does not yet have the art direction, analytical depth, interaction feedback, or route-to-route consistency expected of a product shown beside Stripe or Ramp. Its main failure is not one hex value. It is the combined effect of:

1. an active contract that explicitly rejects a product accent;
2. five chart hues that overlap with semantic status colours;
3. too few decision-useful charts outside Overview and Reports;
4. bars and progress tracks that are physically too thin;
5. repeated KPI → prose callout → miniature rail compositions;
6. equal-weight cards with no dominant visual object;
7. several competing page shells, surface primitives, spacing systems, and chart frames;
8. static interactions that feel rendered rather than alive;
9. unfinished data, error, navigation, and developer-facing states that reduce credibility; and
10. landing-page artwork that depicts a different product and palette.

The target is not a clone of Stripe. Stripe and Ramp are the execution benchmark: restrained colour, clear focus, meaningful analytical density, exact component anatomy, trustworthy data states, and polished interaction. Unauth must retain its own product model, language, workflows, and visual identity.

### 0.1 Conflict resolution

This document supersedes the following visual clauses in the current Quiet Precision specification and contributor rules:

- “Product action is neutral ink, not a brand hue.”
- The prohibition on a saturated product accent in navigation, controls, and selected states.
- The current five-colour chart series palette and route chart assignments.
- The current 100/160/220ms motion-only contract.
- Any page composition that treats a prose callout or 3px summary rail as a substitute for a primary visual.
- Any completion claim that says the current authenticated visual migration is product-wide or screenshot-ready.
- Visual requirements in Phases 4–13 of the screenshot-readiness programme where they conflict with this document.

The following existing requirements remain binding:

- product truth, permissions, provenance, financial definitions, and audit history;
- no fabricated production data or screenshot-only product fork;
- deterministic, privacy-safe marketing fixtures;
- WCAG 2.2 AA requirements applicable at supported widths;
- the authenticated product boundary below 1024 CSS pixels, unless a later product decision changes it;
- one authenticated token namespace;
- no gradients, glass, 3D charts, decorative textures, or shadow-heavy card stacks; and
- no change to committed workflow behaviour without a separate product specification.

This specification does authorise presentation-layer interaction needed to make the requested visual system usable: synchronized filters, chart-to-existing-record drill-downs, pinned visual selection, stale-while-refresh resource handling, explicit background-update queues, and non-mutating feedback. These behaviors may navigate to existing routes/query states and improve read/update presentation; they may not create a new business mutation, decision authority, financial action, drag-and-drop workflow, or autonomous outcome.

### 0.2 Non-negotiable outcome

At completion:

- every route looks like part of one product;
- every data-rich primary route has a clear analytical story;
- every chart answers a business question and leads to detail;
- every chart-free route still feels intentional through hierarchy, state, and interaction;
- one violet accent is visible but never overwhelms the monochrome foundation;
- green, amber, and red communicate meaning rather than decoration;
- the first viewport has an obvious focal point and no accidental dead space;
- interactions respond with controlled motion and immediate feedback;
- no page exposes a raw developer artefact, hanging loader, broken link, or contradictory state; and
- real product captures can be placed on the landing page without redesigning, recolouring, or faking the interface.

### 0.3 Quantified visual target

These are implementation gates, not loose inspiration:

| Dimension | Required result |
|---|---|
| Neutral-to-colour balance | Manual capture target: at least 85% neutral surface/chrome, no more than 10% accent, and no more than 5% semantic colour in a normal populated viewport; there is no minimum colour quota |
| First-viewport hierarchy | At 1440×900, title, controls, KPI summary, and at least 60% of the primary visual or work surface are visible |
| Primary visual dominance | The primary visual/work surface occupies at least 1.5× the area of any supporting card |
| Data-rich overview | One hero view, two to four non-redundant supporting views, and a row-level table or drill-down |
| Bar weight | 65–85% category bandwidth; 12px absolute floor; 38–44px cap for low-cardinality vertical bars |
| Chart plot utilisation | Plot area occupies at least 55% of the chart card |
| Page action hierarchy | At most one filled primary action in a page header or local task region |
| Layout stability | CLS ≤0.05 on capture candidates; no content jump when banners, skeletons, fonts, or charts resolve |
| Route readiness | No uncaught error, hydration warning, failed required request, indefinite loader, or unintended mutation |
| Screenshot stability | Two deterministic captures differ by no more than 0.1% of pixels outside the approved antialiasing threshold |

---

## 1. Evidence and benchmark

### 1.1 Current product evidence

The review covered Overview, Work, Cases, case detail, Losses, Recovery, Customers, customer detail, Rules, Flows, Reports, Integrations, Settings, Notifications, and all remaining routes through source inspection.

The strongest current surface is Overview. It already contains grouped metrics, ranked priority work, a meaningful time series, and data-health context. The strongest current detail pattern is the connected-object timeline. Neither is yet a complete product-wide standard.

The most visible current defects are:

| Finding | Evidence |
|---|---|
| Brand accent is forbidden by contract | [`../styles/authenticated/README.md`](../styles/authenticated/README.md) and [`../styles/authenticated/tokens.css`](../styles/authenticated/tokens.css) |
| Chart hues overlap with success/warning/critical meanings | `--ua-chart-1` through `--ua-chart-5` in [`../styles/authenticated/tokens.css`](../styles/authenticated/tokens.css) |
| KPI grids leave unused quarters or halves | [`../components/workbench/WorkbenchPage.tsx`](../components/workbench/WorkbenchPage.tsx) |
| Summary rail bars are 3px | [`../components/ui/SummaryRail.tsx`](../components/ui/SummaryRail.tsx) |
| Operational tick meters are 6px | [`../components/charts/authenticated/operational/TickMeterRow.module.css`](../components/charts/authenticated/operational/TickMeterRow.module.css) |
| Recovery progression bars are 8px | [`../components/reporting/DashboardCharts.tsx`](../components/reporting/DashboardCharts.tsx) |
| Ranked bars are 9px | [`../components/charts/authenticated/AuthenticatedCharts.module.css`](../components/charts/authenticated/AuthenticatedCharts.module.css) |
| Vertical bars cap at 30px with a 28% category gap | [`../components/charts/authenticated/cartesian/ComboBarLineChart.tsx`](../components/charts/authenticated/cartesian/ComboBarLineChart.tsx) |
| Full charts are concentrated on Overview and Reports | Route and chart-component inventory |
| Seven or more overlapping surface idioms remain | `Card`, `Panel`, `SectionCard`, `AuthenticatedPanel`, and route-local equivalents |
| Context rails disappear below 1600px | [`../components/authenticated/AuthenticatedPageChrome.module.css`](../components/authenticated/AuthenticatedPageChrome.module.css) |
| Landing product artwork is a separately styled fake UI | [`../app/(public)/landing/_components/foundation/FoundationHero.tsx`](<../app/(public)/landing/_components/foundation/FoundationHero.tsx>) and [`../public/hero-artifact.html`](../public/hero-artifact.html) |

### 1.2 External execution benchmark

Use these current official references during implementation and final review:

- [Stripe Dashboard basics](https://docs.stripe.com/dashboard/basics)
- [Stripe Payments Analytics](https://docs.stripe.com/payments/analytics)
- [Stripe Acceptance Analytics](https://docs.stripe.com/payments/analytics/acceptance)
- [Stripe Revenue Recognition reports](https://docs.stripe.com/revenue-recognition/reports)
- [Stripe Revenue Recognition product asset](https://images.stripeassets.com/fzn2n1nzq965/4RyEOeRw60B4irtKiPQ0hm/e954971bb8c70cd6f9cb39506fba232b/Revenue_recognition_dashboard-en-US.svg?q=80&w=2160)
- [Ramp Spend Management](https://ramp.com/spend-management)
- [Ramp real-time reporting](https://support.ramp.com/real-time-reporting/)
- [Ramp Travel reporting](https://support.ramp.com/travel-admin-dashboard-and-reporting/)
- [Ramp Policy redesign](https://support.ramp.com/policy-page-ai-agent)
- [Ramp advanced table filtering](https://support.ramp.com/advanced-filtering-on-reporting-tables/)

The benchmark is the quality of execution, not copied branding:

- one coherent accent;
- quiet axes and surfaces;
- saturated current-period data against neutral comparison data;
- substantial bar geometry;
- question-led charts;
- one dominant object per screen;
- right-aligned financial data;
- drill-down from summary to records;
- precise loading, empty, error, and freshness states; and
- realistic information density at the actual shipped viewport.

---

## 2. Living Precision design principles

### 2.1 Personality

Living Precision should feel:

- calm under operational pressure;
- alive because data and controls visibly respond;
- authoritative rather than austere;
- dense without becoming compressed;
- recognisable without relying on a loud brand treatment;
- analytical without becoming a chart wall; and
- trustworthy because values, statuses, and transitions are truthful.

It must not feel:

- static, skeletal, generic, or template-generated;
- like greyscale UI with random coloured pills;
- like every route uses the same dashboard recipe;
- like every piece of content deserves its own bordered card;
- playful, bouncy, glossy, gradient-led, or game-like;
- like an engineering console exposed to a merchant; or
- like marketing art pasted into the product.

### 2.2 Hierarchy

Every screen must establish this order:

1. location and purpose;
2. primary action or decision;
3. current operational state;
4. dominant analytical or working surface;
5. supporting explanation and breakdowns;
6. record-level detail; and
7. tertiary metadata.

Colour reinforces this order. It does not create the order by itself.

### 2.3 “Alive” means responsive, not animated

The product feels alive when:

- selected states move and recolour predictably;
- charts reveal or update without jumping;
- hover and keyboard focus expose useful detail;
- freshness and sync states visibly change;
- records acknowledge actions immediately;
- background refresh preserves context;
- progress moves only when the underlying state changes;
- skeletons resolve into matching geometry; and
- drawers, menus, and dialogs preserve spatial continuity.

It does not feel alive merely because cards fade in or numbers count up.

---

## 3. Foundation tokens

### 3.1 Light neutral foundation

Use these exact target values:

| Token | Value | Role |
|---|---:|---|
| `--ua-canvas` | `#F7F7F8` | Application canvas |
| `--ua-shell` | `#FFFFFF` | Sidebar and utility header |
| `--ua-surface-primary` | `#FFFFFF` | Main working surface |
| `--ua-surface-secondary` | `#F4F4F5` | Table heads, inset groups, quiet selected regions |
| `--ua-surface-muted` | `#EEEEF0` | Disabled and strongly recessed areas |
| `--ua-surface-hover` | `#F1F1F3` | Neutral hover |
| `--ua-surface-selected` | `#ECECEE` | Neutral selected fallback |
| `--ua-surface-inverse` | `#18181B` | Neutral commit action |
| `--ua-text-primary` | `#18181B` | Titles and primary content |
| `--ua-text-secondary` | `#52525B` | Body support |
| `--ua-text-tertiary` | `#71717A` | Metadata |
| `--ua-text-disabled` | `#A1A1AA` | Disabled content only |
| `--ua-text-inverse` | `#FFFFFF` | Content on dark/accent fills |
| `--ua-text-link` | `#3C3C96` | Product links |
| `--ua-icon-primary` | `#3F3F46` | Primary icons |
| `--ua-icon-secondary` | `#71717A` | Supporting icons |
| `--ua-border-subtle` | `#E7E7EA` | Internal dividers |
| `--ua-border-default` | `#D8D8DC` | Controls and panel boundaries |
| `--ua-border-strong` | `#A5A5AE` | Strong selection or resize boundary |
| `--ua-backdrop` | `rgb(24 24 27 / 18%)` | Modal and drawer scrim |

### 3.2 Accent scale

Violet is the one product accent. It identifies the current selection/comparison period, interaction, and product-owned primary data. It does not communicate data freshness or semantic status.

| Token | Value | Role |
|---|---:|---|
| `--ua-accent-50` | `#F5F4FF` | Very quiet accent wash |
| `--ua-accent-100` | `#F0EFFF` | Selected background |
| `--ua-accent-200` | `#DEDCFF` | Accent border |
| `--ua-accent-300` | `#C2BEFF` | Disabled/decorative data tint |
| `--ua-accent-400` | `#8784E1` | Secondary data series |
| `--ua-accent-500` | `#5B5BD6` | Primary accent and current series |
| `--ua-accent-600` | `#4949B8` | Hover |
| `--ua-accent-700` | `#3C3C96` | Pressed |
| `--ua-accent-800` | `#303078` | High-contrast accent text |
| `--ua-accent-fg` | `#FFFFFF` | Text/icon on accent fill |
| `--ua-border-focus` | `#5B5BD6` | Keyboard focus ring |

Action role tokens:

| Token | Light value |
|---|---:|
| `--ua-action-primary` | `#5B5BD6` |
| `--ua-action-primary-hover` | `#4949B8` |
| `--ua-action-primary-pressed` | `#3C3C96` |
| `--ua-action-primary-fg` | `#FFFFFF` |
| `--ua-action-commit` | `#18181B` |
| `--ua-action-commit-hover` | `#09090B` |
| `--ua-action-commit-pressed` | `#000000` |
| `--ua-action-commit-fg` | `#FFFFFF` |

Accent is required for:

- active navigation marker and quiet selected-row wash;
- selected tabs, segmented controls, filters, and date ranges;
- focus rings;
- links and inline interactive affordances;
- the single primary forward action;
- the current or primary chart series;
- active timeline/progress position; and
- small product-owned highlights in marketing captures.

Near-black remains available as a **commit** action for financial decisions, irreversible workflow actions, and high-stakes confirmation. It is neutral, not a second brand colour. A region may not show both an accent primary action and a neutral commit action at equal emphasis.

Accent is prohibited for:

- success, warning, failure, or risk meaning;
- large decorative card backgrounds;
- every icon in a list;
- passive KPI values;
- provider identities; and
- multiple unrelated chart series.

### 3.3 Semantic colours

| Meaning | Foreground | Soft fill | Border | Use |
|---|---:|---:|---:|---|
| Success | `#217A5B` | `#EBF7F1` | `#BFE3D2` | Complete, recovered, verified healthy/current |
| Warning | `#8A6116` | `#FFF7DF` | `#EAD89B` | Pending, stale, attention |
| Critical | `#B04444` | `#FFF0F0` | `#E8C2C2` | Failed, overdue, destructive, confirmed loss |
| Information | `#326B9B` | `#EDF5FC` | `#C7DDEE` | Neutral operational information |
| Unknown | `#62626B` | `#F1F1F3` | `#D8D8DC` | Unavailable, offline, unsupported |

Rules:

- Semantic colour always ships with text or a glyph.
- Semantic colours never become ordinary categorical chart colours.
- “Unavailable” is neutral, not warning or critical.
- A selected item is accent, never semantic.
- Provider logos may retain verified provider colours within a neutral container.

### 3.4 Dark-mode relationship

Dark mode preserves the same roles and proportions:

| Token | Value |
|---|---:|
| `--ua-canvas` | `#111113` |
| `--ua-shell` | `#151517` |
| `--ua-surface-primary` | `#1B1B1E` |
| `--ua-surface-secondary` | `#222226` |
| `--ua-surface-muted` | `#29292E` |
| `--ua-surface-hover` | `#26262B` |
| `--ua-surface-selected` | `#2D2D33` |
| `--ua-text-primary` | `#F5F5F6` |
| `--ua-text-secondary` | `#B8B8C0` |
| `--ua-text-tertiary` | `#92929B` |
| `--ua-text-inverse` | `#151517` |
| `--ua-text-link` | `#8F8CF2` |
| `--ua-icon-primary` | `#E4E4E7` |
| `--ua-icon-secondary` | `#A1A1AA` |
| `--ua-surface-inverse` | `#F5F5F6` |
| `--ua-backdrop` | `rgb(0 0 0 / 46%)` |
| `--ua-accent-50` | `#201F35` |
| `--ua-border-subtle` | `#29292E` |
| `--ua-border-default` | `#37373E` |
| `--ua-border-strong` | `#585864` |
| `--ua-accent-100` | `#29284D` |
| `--ua-accent-200` | `#474477` |
| `--ua-accent-300` | `#5D5A93` |
| `--ua-accent-400` | `#7674CC` |
| `--ua-accent-500` | `#9B99FF` |
| `--ua-accent-600` | `#B2B0FF` |
| `--ua-accent-700` | `#8F8CF2` |
| `--ua-accent-800` | `#C8C7FF` |
| `--ua-accent-fg` | `#151517` |
| `--ua-border-focus` | `#9B99FF` |
| `--ua-action-primary` | `#9B99FF` |
| `--ua-action-primary-hover` | `#B2B0FF` |
| `--ua-action-primary-pressed` | `#8F8CF2` |
| `--ua-action-primary-fg` | `#151517` |
| `--ua-action-commit` | `#F5F5F6` |
| `--ua-action-commit-hover` | `#FFFFFF` |
| `--ua-action-commit-pressed` | `#D4D4D8` |
| `--ua-action-commit-fg` | `#151517` |

Dark semantic triplets:

| Meaning | Foreground | Soft fill | Border |
|---|---:|---:|---:|
| Success | `#79CFA8` | `#18372B` | `#2D5A46` |
| Warning | `#E6C36A` | `#3B3019` | `#635027` |
| Critical | `#F09595` | `#422326` | `#6C3438` |
| Information | `#8FC3EA` | `#1D3040` | `#31536B` |
| Unknown | `#B4B4BE` | `#29292E` | `#44444D` |

Dark mode is not a separate art direction. Every renderable route must retain the same emphasis order and semantic mapping.

The specified light foreground/fill pairs meet at least 4.5:1, as do the dark semantic pairs above. Disabled text is not an exemption for essential instructions or values.

### 3.5 Typography

Use Inter for product UI and tabular numerals for amounts, dates, percentages, durations, and counts.

`.ua-app` resets untyped product content to `font-size: 14px` and `line-height: 20px`; it must not inherit the public/global `14px / 21px` rhythm.

| Role | Size / line height | Weight | Use |
|---|---:|---:|---|
| Page title | `20px / 28px` | 600 | One per screen |
| Detail identity | `18px / 26px` | 600 | Record/customer identity |
| Section title | `15px / 22px` | 600 | Major surface |
| Card/chart title | `13px / 18px` | 600 | Compact heading |
| Body | `14px / 20px` | 400 | Default copy |
| Dense body | `13px / 18px` | 400 | Tables and dense lists |
| Label | `13px / 18px` | 500 | Fields and controls |
| Caption | `12px / 16px` | 400 | Supporting text |
| Metadata | `11px / 15px` | 500 | Tertiary information |
| KPI value | `24px / 30px` | 600 | Summary metric |
| Hero financial value | `30px / 36px` | 600 | One exceptional total only |

Canonical token names include `--ua-text-page-title-*`, `--ua-text-detail-identity-*`, `--ua-text-section-title-*`, `--ua-text-chart-title-*`, `--ua-text-body-*`, `--ua-text-dense-*`, `--ua-text-label-*`, `--ua-text-caption-*`, `--ua-text-metadata-*`, `--ua-text-kpi-*`, and `--ua-text-hero-value-*`. Each role stores size, leading, and weight. Delete route-local `font-weight: 650` and local replicas of these roles.

Rules:

- Sentence case.
- Use only weights 400, 500, and 600 in product UI.
- Monospace is limited to code, hashes, API keys, and expandable raw payload views.
- Do not use all-caps letter-spaced eyebrow text as routine hierarchy.
- Essential capture copy must satisfy the exact raster-height and slot rules in §13.4.

### 3.6 Spacing, dimensions, and geometry

Canonical spacing values are `2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48px`. Remove route-local `14px`, `15px`, `17px`, `18px`, and `28px` spacing where they do not map to an intentional dimension.

| Element | Target |
|---|---:|
| Sidebar | `200px` expanded, `52px` collapsed |
| Utility header | `48px` |
| Page gutter | `24px` at ≥1280px; `16px` at 1024–1279px |
| Page section gap | `20px` |
| Surface padding | `20px` standard; `16px` dense |
| Card gap | `16px` |
| Form field gap | `16px` |
| Control radius | `6px` |
| Inline surface radius | `10px` |
| Overlay radius | `14px` |
| Table row | `44px` dense; `56px` rich; `64–72px` only with multi-line identity or progress |
| Dense tertiary control | `30px` |
| Standard control | `36px` |
| Large action | `40px` |
| Standard input | `36px` |
| Icon control | `32px` minimum; `36px` beside standard controls |
| Table header | `36px` |
| Status badge | `20px` small; `22px` standard |

Dimension tokens:

| Token | Value |
|---|---:|
| `--ua-control-height-sm` | `30px` |
| `--ua-control-height-md` | `36px` |
| `--ua-control-height-lg` | `40px` |
| `--ua-control-height-input` | `36px` |
| `--ua-control-height-icon` | `32px` |
| `--ua-table-header-height` | `36px` |
| `--ua-table-row-height` | `44px` |
| `--ua-table-row-height-rich` | `56px` |
| `--ua-badge-height-sm` | `20px` |
| `--ua-badge-height` | `22px` |

Pills are reserved for statuses, counts, avatars, and true token inputs. Metadata, filters, and ordinary controls use the 6px control radius.

Inline surfaces are flat. Use a shadow only for menus, popovers, tooltips, toasts, drawers, dialogs, and a deliberately floating sticky control.

### 3.7 Iconography and marks

- Use one outline icon family in product UI.
- Default icon size is 16px with a 1.75px stroke; use 14px in dense metadata, 18px in primary actions, and 20–24px only for empty-state or feature identity.
- Do not mix outline, filled, duotone, emoji, and custom glyph styles in one workflow.
- Icons inherit text/status/accent roles; they do not introduce local colours.
- Avoid placing every icon inside its own rounded square.
- Icon-only actions require an accessible name and tooltip where the action is not universally understood.
- Provider and channel marks may retain verified brand artwork inside a neutral 32–40px tile.
- The Unauth mark may use the product accent in public/entry contexts, but product chrome remains quiet.

### 3.8 Source-token migration

Living Precision keeps role tokens literal; it does not create a permanent alias layer. Every consumer of a deleted or reclassified token moves in the same merge unit that changes the token.

| Current role | Target/action |
|---|---|
| `--ua-surface-secondary` | Retain the name; change its literal to the §3 value |
| `--ua-chart-1` through `--ua-chart-5`, `--ua-chart-neutral` | Reclassify each consumer by encoded role to §6.2; there is no positional one-to-one mapping; then delete old slots |
| `--ua-action-primary*` | Retain as the ordinary forward-action role and set to the accent action values |
| High-stakes uses of `--ua-action-primary` or `--ua-surface-inverse` | Migrate to `Button variant="commit"` and `--ua-action-commit*` before the action token changes |
| Historical `--ua-violet*` | Delete; product-owned selection uses accent roles and semantic state uses status roles |
| `--ua-surface-selected` | Retain as neutral fallback only; product-selected controls use accent-100/200/800 |
| Public `--accent*`, `--surface-*`, `--text-*` | Remain public-only; authenticated consumers are prohibited |

Domain status compatibility:

| Existing domain role | Living Precision mapping |
|---|---|
| Risk critical/high | Critical triplet plus explicit label/icon |
| Risk medium | Warning triplet |
| Risk low | Success triplet only when “low” is genuinely healthy; otherwise Information |
| Severity definite/clear | Success triplet |
| Severity probable | Warning triplet |
| Severity possible/unknown | Unknown triplet |
| Privacy/watchlist | Information triplet unless the actual state is critical |

Focus and floating depth use:

| Token | Light value |
|---|---:|
| `--ua-shadow-focus` | `0 0 0 2px var(--ua-surface-primary), 0 0 0 4px var(--ua-border-focus)` |
| `--ua-shadow-float` | `0 4px 14px rgb(24 24 27 / 8%)` |
| `--ua-shadow-menu` | `0 8px 24px rgb(24 24 27 / 12%)` |
| `--ua-shadow-overlay` | `0 24px 64px rgb(24 24 27 / 18%)` |

Dark mode keeps the same geometry with black-based shadow colour. There is no raised inline-card shadow.

Spacing, radius, z-index, and any token role not replaced by an exact Living Precision table remain at the current binding literal until explicitly reviewed. This clause prevents accidental deletion; it does not authorise a second namespace or page-local values.

---

## 4. Colour application contract

### 4.1 Screen-level balance

For a normal populated screen:

- canvas, shell, surfaces, borders, text, and at least 85% of visible area remain neutral;
- violet appears only where a functional accent role exists: active location → selected control → primary/current data → drill-down action;
- semantic colours appear only next to records or values carrying that meaning;
- no card receives a full saturated background; and
- no route introduces a local accent.

The percentages are a manual screenshot-composition target, not a DOM-area calculation. If pixel sampling tooling is later added, sample the app viewport excluding text antialiasing, provider artwork, avatars, and embedded user imagery. There is no minimum accent percentage: a chart-free legal or configuration screen may be almost entirely neutral.

### 4.2 Component mapping

| Component/state | Required treatment |
|---|---|
| Active sidebar item | `--ua-accent-100` wash, `--ua-accent-500` 2px marker, primary text |
| Primary forward action | Solid `--ua-action-primary`, `--ua-action-primary-fg` foreground; hover `--ua-action-primary-hover` |
| High-stakes commit | Solid neutral inverse; never adjacent to an equally strong accent action |
| Active tab | Primary text plus 2px accent underline |
| Selected filter | Accent-100 fill, accent-200 border, accent-800 text |
| Focus | Two-ring focus using surface separation plus `--ua-border-focus` |
| Link | Accent-700 text, underline on hover/focus |
| Current chart series | Accent-500 |
| Previous/comparison series | Neutral, dashed or lower-opacity geometry |
| KPI delta | Semantic only if the direction has a defined good/bad meaning; otherwise neutral |
| Status badge | Semantic foreground/fill/border |
| Provider logo | Verified brand mark in a neutral 32–40px tile |

### 4.3 Colour QA

Every flagship screenshot is reviewed:

- in full colour;
- in greyscale;
- with simulated deuteranopia and protanopia;
- in forced colours;
- at actual landing-page display size; and
- at 200% zoom while the effective CSS viewport remains supported.

No meaning may disappear in any of these checks.

---

## 5. Page composition system

### 5.1 Shared page frame

All authenticated routes use one frame:

1. utility header;
2. compact page header;
3. optional local navigation;
4. optional filter/action rail;
5. content grid; and
6. route state/feedback layer.

The page header contains:

- one title;
- one sentence of supporting context when necessary;
- optional freshness/source metadata;
- at most one secondary action; and
- at most one primary action.

Do not repeat the page title in a breadcrumb, eyebrow, panel heading, and document title.

### 5.2 First-viewport contract

At 1440×900:

- the header consumes no more than 84px after the utility bar;
- KPI summary consumes no more than 104px;
- filter/action controls consume no more than 52px;
- at least 60% of the primary chart or work surface is visible;
- no empty horizontal quarter or half remains in a metric row; and
- one surface clearly dominates.

At 1024px:

- page gutter becomes 16px;
- contextual rails collapse into an inline disclosure or move below only when secondary;
- charts reduce tick density before reducing plot legibility;
- wide tables and boards scroll inside their working surface; and
- no page-level horizontal overflow appears.

### 5.3 Adaptive KPI group

The metric group must size to its content:

| Metric count | Desktop layout |
|---:|---|
| 1 | Render `LeadMetric` outside a metric grid, max-width 360px, or let the value become the page’s hero total |
| 2 | Two equal columns at every supported width |
| 3 | Three equal columns at every supported width |
| 4 | Four equal columns at ≥1280px; two-by-two at 1024–1279px |
| 5 | Five equal columns at ≥1280px; a six-track grid at 1024–1279px with spans `2/2/2` then `3/3` |
| 6 | Six equal columns at ≥1280px; three-by-two at 1024–1279px |
| 7+ | Reduce to four headline metrics and move the remainder into a supporting breakdown |

A one-metric page has intentional surrounding whitespace, not an empty metric-grid cell. KPI groups show value, label, optional comparison, and optional 40–48px sparkline. They do not repeat the same fact in an adjacent callout and rail.

### 5.4 Page families

| Family | Required anatomy | Primary focus |
|---|---|---|
| Analytical overview | Header → scope controls → 3–4 KPIs → hero chart → 2–4 supports → table | Trend and decision |
| Operational registry | Header → compact summary → toolbar → table/master-detail → optional 140–200px queue pulse | Work and prioritisation |
| Board/workflow | Header → summary → optional stage-flow visual → board → detail drawer | Movement through stages |
| Record detail | Identity → status/provenance → one financial/lifecycle visual → decision/work → evidence → timeline | Understanding and action |
| Builder/configuration | Header → local nav → builder/form → live preview/validation → history | Creating safely |
| Settings | Header → grouped local navigation → 680–820px form → contextual help only when specific | Configuration |
| Entry/onboarding | One task surface → progress → form → preview/confirmation | Completion |
| Public product story | Marketing narrative framing real product captures | Credible product proof |

### 5.5 Context rails

A context rail is permitted only when it adds persistent, non-duplicated information or actions.

- At ≥1280px, use a `minmax(0, 1fr) 280px` grid when the rail is genuinely necessary.
- At 1024–1279px, convert secondary guidance to an inline disclosure or place it after the main task.
- Do not hide a critical summary below the fold until 1600px.
- Remove generic “help” rails repeated across all Settings pages.
- Never place the same counts in KPI cells, a prose callout, and a rail.

---

## 6. Data visualisation system

### 6.1 Purpose

More charts are required, but decorative chart volume is not the goal.

Every visual must answer one named question:

- What changed?
- Where is value concentrated?
- What is blocked?
- How is work progressing?
- What caused the outcome?
- How does this compare with the prior period?
- Which record should the user inspect?

If a visual cannot answer one of these questions or lead to a relevant record set, use prose, a table, or a timeline instead.

### 6.2 Palette

Default analytical charts use the accent plus a neutral ramp:

| Token | Value | Use |
|---|---:|---|
| `--ua-chart-primary` | `#5B5BD6` | Current/selected/primary series |
| `--ua-chart-primary-soft` | `#8784E1` | Related secondary series |
| `--ua-chart-neutral-900` | `#555A64` | Strong comparison |
| `--ua-chart-neutral-700` | `#747984` | Secondary comparison |
| `--ua-chart-neutral-500` | `#898E98` | Tertiary series |
| `--ua-chart-neutral-300` | `#C8CBD0` | Baseline/context |
| `--ua-chart-grid` | `#E7E7EA` | Grid |
| `--ua-chart-track` | `#F1F1F3` | Progress/rank track |

Dark chart values are:

| Token | Dark value |
|---|---:|
| `--ua-chart-primary` | `#9B99FF` |
| `--ua-chart-primary-soft` | `#7674CC` |
| `--ua-chart-neutral-900` | `#D6D6DC` |
| `--ua-chart-neutral-700` | `#A8A8B1` |
| `--ua-chart-neutral-500` | `#7A7A85` |
| `--ua-chart-neutral-300` | `#4E4E57` |
| `--ua-chart-grid` | `#303036` |
| `--ua-chart-track` | `#29292E` |

Rules:

- Current period is accent; prior period is neutral and dashed.
- Related composition may use accent tints.
- Semantic success/warning/critical is used only when the encoded value is itself success, warning, or critical.
- Neutral-300 is a baseline/track/context value only; meaningful discrete marks use a graphic colour with at least 3:1 contrast against the plot background.
- Use no more than five simultaneous categories.
- High-cardinality categories use ranked bars, small multiples, or a table rather than a rainbow.
- Series assignment remains stable through filters and route navigation.
- Comparison and multi-series views combine colour with dash, marker shape, direct end labels, or spatial grouping.
- Forced-colour mode uses system-colour strokes, visible focus outlines, dash/shape differentiation, and text/end labels; fill colour is never the only series key.

### 6.3 Geometry

| Element | Target |
|---|---:|
| Hero plot min-height | `320px` at ≥1280px; `300px` at 1024–1279px |
| Hero `ChartFrame` height | Content-driven; normally `400–460px` including title, controls, plot, and footer |
| Supporting plot min-height | `200–220px`; frame normally `280–340px` |
| Compact trend | `140–180px` |
| Metric sparkline | `40–48px`; standalone compact trend may use `48–56px` |
| Effective vertical bar bandwidth | `72–82%` target; `65%` minimum after the category region is constrained |
| Recharts category gap | `16–20%`; default `18%` |
| Full cartesian column | Fixed `36px` |
| Compact cartesian column | Fixed `24px` |
| Absolute desktop bar floor | `12px`; target `14px+` |
| Ranked/progress bar | Fixed `12px` |
| Composition strip | Fixed `12px` |
| Mini meter | `8px` |
| Stage dot-plot mark | `8px` diameter with 2px surface ring |
| Primary line | `2.25px` |
| Comparison line | `1.5–2px`, neutral, dashed |
| Active point | `5px` radius with 2px surface stroke |
| Grid lines | `3–5` horizontal; no routine vertical grid |
| X-axis labels | No more than 8 visible labels |
| Donut segments | Maximum 5; ranked bars preferred |

Bandwidth takes precedence over stretching a few columns across a wide plot:

- Four or fewer categorical values use horizontal ranked bars, not widely spaced vertical columns.
- Five to twelve vertical categories use a centred/constrained category region with a 50–56px effective slot, producing 36–44px columns.
- A short temporal series uses a line/area or a constrained column cluster selected by the §6.8 contract.
- Thirteen to twenty-four categories may scroll internally, aggregate, or switch orientation.
- Above twenty-four categories, show a meaningful top-N plus “Other” and expose the full table.

Do not keep an 800px plot filled with four 44px columns. Do not break the 44px cap by stretching four columns to 160px. Change orientation or constrain the category region.

Visible geometry may be smaller than its interaction target. Every drillable point/bar exposes at least a 24×24 CSS-pixel pointer/focus target or satisfies the WCAG spacing exception.

### 6.4 Chart anatomy

Every chart uses one shared frame:

1. question-led title;
2. concise supporting sentence or current value;
3. unit and scope;
4. optional range/metric control;
5. direct legend or end labels;
6. plot;
7. source/freshness metadata;
8. “View records” or equivalent drill-down; and
9. accessible table/summary.

Chart titles should be questions or decision statements such as “Where are losses accumulating?” rather than generic labels such as “Loss analytics.”

Sparklines inside metrics are exempt from the full visible nine-part frame. Their metric label/value supplies the visible title and unit; their accessible name/summary supplies trend direction, range, and latest value. They are not independently drillable unless a visible control announces that behavior.

### 6.5 Interaction

- Pointer and keyboard focus reveal one shared tooltip.
- Tooltip shows date/category, exact value, unit, and comparison/delta when those values exist.
- Hovered/focused geometry becomes fully opaque while siblings recede only to 60–70%.
- When the visual contract declares mark-level drill-down, click or Enter/Space applies the corresponding table filter or opens a scoped record view.
- Range, metric, and breakdown changes update every panel in their declared scope.
- The scope of a filter is visible; no silent partial filtering.
- A pinned selection persists while the user moves into the table or detail drawer.
- Escape clears a pinned selection and restores focus.
- Export uses the same filtered dataset shown in the visual.

Keyboard model:

- A non-drillable chart has no focusable marks; its labelled summary and `ChartDataTable` provide equivalent access.
- A drillable chart exposes one plot tab stop and roving mark focus.
- Left/Right moves through a time/category series; Up/Down moves through ranked bars or adjacent series.
- Home/End moves to the first/last mark.
- Enter/Space pins or activates the declared drill-down.
- Escape clears the pinned selection and restores plot focus.
- Tooltip content is associated with the active mark through `aria-describedby`.
- Custom shapes/active points provide the focus target; individual marks do not all enter the document tab order.

### 6.6 Data states

Each chart explicitly implements:

| State | Treatment |
|---|---|
| Loading | Geometry-matched axes/plot skeleton; no generic card shimmer |
| Background refresh | Preserve chart; show Updating activity beside unchanged `dataAsOf`/freshness; freshness changes only when the new domain result arrives |
| Empty | Explain why no records exist and provide a relevant next step |
| Filtered empty | Preserve axes/range and offer “Clear filters” |
| Insufficient history | Show available points and state the minimum comparison requirement |
| Partial | Render known data, mark the incomplete interval, explain scope |
| Stale | Preserve analytical accent/neutral marks; apply warning to the state label/metadata, not the whole series |
| Disconnected | Neutral connection state with route to integration |
| Error | Inline retry; preserve prior successful data when safe |
| Mixed currency | Split by currency or block aggregation; never silently combine |

Null, zero, unavailable, stale, and disconnected remain distinct.

### 6.7 Required shared visual primitives

Create or converge on:

- `ChartFrame`
- `ChartHeader`
- `ChartLegend`
- `ChartTooltip`
- `ChartState`
- `TrendChart`
- `BarChart`
- `StackedBarChart`
- `ComboBarLineChart`
- `RankedBarList`
- `LifecycleProgress`
- `WaterfallChart`
- `Sparkline`
- `MetricWithSparkline`
- `ChartDataTable`

`KeyInsightCallout` and `SummaryRail` may remain only for concise editorial context. They are deprecated as substitutes for a hero visual.

### 6.8 Route-level visual data contract

This table removes ambiguity about what “add a chart” means. Exact domain names may follow the existing read models, but the question, unit, scope, and drill-down may not change without design/product review.

| Surface | Question | Encoding | Measure and dimension | Comparison / drill-down |
|---|---|---|---|---|
| Overview hero | Is preventable value exposure improving? | Daily/weekly columns plus line | Exposure amount by event date; recovery amount over the same range | Prior equal period in neutral; mark opens scoped Losses/Recovery records |
| Overview priority | Where is action concentrated? | Ranked horizontal bars | Open actionable record count by workflow type; show value only when the existing domain read model supplies a reconciled amount | Click filters Work; no semantic hue unless the bar encodes a semantic state |
| Overview recovery | How much value is moving through recovery? | Thick stacked progression | Sought, approved, recovered, outstanding amount | Opens Recovery with stage filter |
| Work | When will the queue become risky? | Stacked due-band columns | Item count by overdue, today, 1–3 days, 4–7 days, later | Selecting band filters rows |
| Cases registry | Is case intake outpacing resolution or SLA capacity? | Compact opened/resolved columns plus line | Cases opened/resolved by day; SLA-at-risk = open cases within the domain-configured warning window ÷ open cases with an SLA | Selection filters queue; if no history, show current canonical state distribution |
| Case detail | How was the recommended amount derived? | Waterfall | Order amount, valid adjustments, disputed/unsupported amount, recommended payable amount | Segment opens matching evidence/line item |
| Customers registry | Where is open case work concentrated? | Ranked operational bands | Customer count and open-case exposure for mutually exclusive `0`, `1`, `2–3`, and `4+` open-case bands | Selecting band filters customer table; identity confidence is not customer risk |
| Customer detail | How are commercial value and case exposure changing? | Order-value columns plus case-exposure line | Gross order value and case value by week | Point opens orders/cases in that interval |
| Losses hero | When and why are confirmed losses accumulating? | Stacked daily/weekly columns | Confirmed loss amount by immutable loss date and canonical cause | Prior equal-period total as neutral dashed line; segment filters ledger |
| Losses support | Which causes account for most value? | Ranked horizontal bars | Loss amount and share by cause | Click filters ledger; top 5 plus Other |
| Loss detail | What turned the original value into net loss? | Waterfall | Gross exposure, offsets/refunds, recovered value, net loss | Segment opens source evidence |
| Recovery board | Is recoverable value converting into cash? | Weekly columns plus rate line | Recovered amount and outstanding amount; recovery rate | Selection filters board by week/stage |
| Recovery detail | How far has this recovery progressed? | Four-step 12–14px progression | Sought, approved, recovered, outstanding | Stage opens supporting correspondence/evidence |
| Notifications | When is operational activity arriving and being cleared? | Compact paired histogram | Received count grouped by `created_at` and cleared count grouped by `read_at`, explicitly over 14 days | Day filters list; no chart when fewer than 3 active days |
| Flows registry | Are terminal flow runs completing reliably? | Terminal-run columns plus reliability line | `completed` and `failed` by day/week; reliability = `completed / (completed + failed)`; `matched`/`not_matched` shown separately | Point filters flows/runs; not-matched is never treated as failure |
| Flow detail | Is this flow’s terminal execution healthy? | 40–48px sparkline plus labelled rate | Completed/failed terminal runs and the same explicit reliability denominator | Opens runs filtered to flow |
| Flow runs | Where do flow-run states occur? | Compact state columns | Canonical `matched`, `not_matched`, `completed`, and `failed` count by day | Segment filters run table; no invented cancelled state |
| Rules registry | Which recommendations are rules producing? | Evaluation columns plus recommendation composition | Evaluation volume and canonical recommendation distribution by period | Point filters rules/evaluations |
| Rule detail | How is this published version evaluating? | Compact trend | Evaluations and recommendation distribution by version/date | Opens evaluations for version/range; merchant outcome appears only with a separately specified join |
| Reports hero | How is financial value accumulating? | Flat cumulative exposure area plus recovered line and optional neutral dashed comparison | Known exposure and recovered increments accumulated by day/week; event-free observed buckets carry the known total, unknown intervals remain broken | Prior equal period; point exposes raw increment, cumulative value, and report records |
| Reports causes | What explains the result? | Ranked bars | Selected amount/count by canonical cause | Filters records |
| Reports recovery | How is value progressing through recovery? | Shared-scale stage dot plot | Sought, approved, recovered, outstanding by period | Stage label filters records |
| Integrations overview | Which sources are current and complete? | Freshness/coverage matrix, not a rainbow chart | Provider × object coverage plus canonical freshness | Cell opens provider and affected object type |
| Provider integration | Is scheduled ingestion healthy? | Optional compact trend | Records processed and failed by sync interval | Opens sync event log; only for scheduled providers with at least three completed intervals |
| Import job | What proportion of the file is usable? | Thick validation/result bars | Valid, warning, invalid, imported row counts | Segment filters issue/result table |
| Billing | How much of the current-cycle allowance remains? | Thick allowance/consumption progress | Current-cycle used and remaining credits from the existing snapshot, with reset date and source currency | No invented daily history or invoice drill-down; a trend requires an audited timestamped credit ledger and invoice adapter |
| Audit trail | Has administrative activity changed unusually? | Optional compact histogram | Audit events by day, grouped only by safe high-level action family | Day/action filters audit table; omit if it does not aid investigation |

Minimum data rules:

- A time trend needs at least three truthful points to render geometry and seven points for a period comparison.
- Canonical buckets are daily for ranges up to 31 days, ISO-week for 32–180 days, and calendar month above 180 days; timezone comes from the merchant/report scope.
- A rate requires an explicit numerator and denominator; never average pre-aggregated percentages.
- A waterfall renders only when every component reconciles to the displayed total within currency rounding.
- A distribution requires canonical mutually exclusive categories or an explicit overlap disclosure.
- “Other” is required when the visible top-N does not cover the full population.
- The marketing fixture must contain enough truthful points/categories to demonstrate the specified composition.
- Production with insufficient data uses the §6.6 state; it does not substitute invented history.
- A merchant-wide/global chart may never be calculated from a paginated, capped, or currently visible UI list.

Required aggregate ownership:

| Surface | Source requirement |
|---|---|
| Work | Server aggregate over the full scoped task set by `due_at`; ship counts unless an authorised value join is specified |
| Cases | Server aggregate of opened dates and terminal resolution events across the full filter scope |
| Customers registry | Server aggregate over the merchant directory; do not derive cohort percentages from the capped identity scan |
| Customer detail | Bin transactions using the shared `asOf` clock rather than direct `Date.now()` |
| Losses | Use `case_financial_entries.effective_at` or an explicitly defined immutable loss-occurrence date; never mutable `updated_at` |
| Recovery | Use recovered financial entries/accountability events by effective date; cumulative rows alone cannot reconstruct weekly history |
| Flows | Aggregate `workflow_runs.started_at`, `completed_at`, and canonical status; definition/version loaders are insufficient |
| Rules | Aggregate `rule_evaluations.evaluated_at`, `rule_id`, and recommendation; an actual merchant-outcome rate requires a documented join, lag window, and denominator |
| Notifications | Aggregate received by `created_at` and cleared by `read_at`; do not classify historical days from current read state |
| Audit | Add a bounded server aggregation endpoint; do not claim merchant-wide activity from the current 60-row client page |
| Provider detail | Declare whether the view covers the most recent ten processing jobs or add a bounded aggregate endpoint; label the scope |
| Billing | Use the current-cycle snapshot now; trend/invoices remain blocked until an audited ledger/adapter exists |

Any new aggregate endpoint inherits merchant scope, permissions, timezone, currency, null, and provenance rules from its destination route.

---

## 7. Motion and liveness

### 7.1 Tokens

| Token | Value | Use |
|---|---:|---|
| `--ua-duration-instant` | `0ms` | Reduced motion and state changes that must be immediate |
| `--ua-duration-press` | `80ms` | Press acknowledgement |
| `--ua-duration-fast` | `100ms` | Hover, tooltip, exit |
| `--ua-duration-base` | `160ms` | Selection, modal, toast, crossfade |
| `--ua-duration-slow` | `220ms` | Drawer and route settle |
| `--ua-duration-data` | `360ms` | One initial primary-chart reveal |
| `--ua-duration-highlight` | `700ms` | One-shot changed-data wash |
| `--ua-duration-spinner` | `800ms` | Real active work |
| `--ua-duration-skeleton` | `1600ms` | Low-amplitude loading breath |
| `--ua-duration-live` | `2400ms` | Verified live heartbeat only |
| `--ua-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | State change |
| `--ua-ease-enter` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter and response |
| `--ua-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exit |
| `--ua-ease-linear` | `linear` | Rotational spinner and indeterminate progress only |

JavaScript mirrors only values required by a library. Centralise them in one motion module. Do not let route call sites choose timing.

Timing thresholds:

- route-progress delay: `120ms`;
- pending-indicator delay: `150ms`;
- skeleton delay: `180ms`;
- explanatory slow-load/retry state: `8s`.

No entrance exceeds 400ms. No bounce, elastic spring, parallax, glow pulse, confetti, or decorative infinite loop is permitted.

Motion geometry is capped at:

- tooltip/menu: `2px`;
- route/content settle: `4px`;
- modal: `6px` plus `scale(.99 → 1)`;
- toast: `8px`; and
- drawer: `24px` from its attached edge.

Nothing else translates. There is no hover lift and no animated width/height for major surfaces.

### 7.2 Motion matrix

| Event | Required behavior |
|---|---|
| Route navigation | One route-body opacity/`y: 4px` settle over 160ms; shell remains fixed; no child stagger |
| Route progress | Wait 120ms; show a 2px accent line only for a genuinely pending route; complete from actual navigation state, never a timeout |
| Dense cards/table/list | No item-by-item entrance cascade |
| Hover | Colour/background/border only over 100ms; no lift or shadow jump |
| Focus | Ring appears instantly; never animate the focus indicator |
| Button press | 80ms fill/inset response; no translation, shake, or label movement |
| Selected nav/tab/filter | 160ms colour and indicator transition |
| Async action | Disable conflicting repeat immediately; show spinner only after 150ms; preserve label and exact width |
| Optimistic toggle | Move immediately; show “Saving” only after 400ms; roll back with local error |
| Successful mutation | Render new truth immediately; one 700ms accent-soft wash; use inline acknowledgement or toast, not both |
| Tooltip/menu | Opacity plus ≤2px travel over 100ms; 80–100ms exit |
| Drawer | Backdrop 160ms; panel `24px → 0` over 220ms; 160ms exit; width never animates |
| Dialog | Backdrop 160ms; opacity/`y: 6px`/`.99 → 1` over 160ms; 100ms exit |
| Toast | `y: 8px` plus opacity over 160ms; 100ms exit; timeout pauses on hover, focus, and hidden document |
| Skeleton resolve | Geometry-preserving 160ms crossfade |
| Initial primary chart | Bars grow from meaningful baseline or line path reveals over 360ms; axes/grid/text remain static |
| Supporting charts | Static on first paint or one 160ms group crossfade |
| Same-topology chart update | Retain prior plot and interpolate geometry over 220ms |
| Changed-topology chart update | Retain frame/axes and crossfade plot over 160ms |
| KPI refresh | New value is immediately truthful; one-shot highlight only; never count up |
| Progress update | Animate from previous truthful value, never from zero on remount |
| Ongoing sync | 800ms spinner with text only while real work is active |
| Verified live stream | One optional 2400ms breathing dot using standard easing; no other perpetual status pulse |

Initial mark animation is permitted only at 40 or fewer bars/points. Dense plots crossfade. Axes, tick labels, accessible data tables, and sparklines do not animate.

Server-resolved charts render final geometry without a manufactured entrance. The optional 360ms initial phase applies only when primary-chart data first resolves after hydration and motion is allowed. Never withhold server data to create a reveal. Every later change uses `update` or `none`.

### 7.3 Presence and route feedback

Use one shared presence primitive with `entering`, `open`, and `exiting` states for menus, popovers, dialogs, drawers, command surfaces, and toasts. Do not add component-local exit timers.

These transitions are simple enough for CSS plus the shared presence hook. Do not add component-local animation-library springs or timing values; if an animation library is retained, it sits behind one lazy shared configuration and obeys the same tokens.

The route progress line must:

1. stay hidden for navigations below 120ms;
2. enter at 12%;
3. ease toward 65% over 600ms and 82% over the next 1200ms;
4. reach 100% only on actual completion;
5. hold for 80ms and fade over 100ms.

It must not silently disappear after the current 3.5s timeout.

At 8s, a separate `RoutePendingNotice` renders “This page is taking longer than expected.” For a safe same-origin GET destination it may offer “Open directly” using the stored pending URL; otherwise it offers “Reload current page.” It does not claim cancellation, failure, or completion. A route change clears both progress and notice.

Exiting overlays are pointer-inert and absent from the accessibility tree. Focus trapping remains valid while open, and trigger focus is restored exactly once after close completes, or immediately with reduced motion.

Toast timing is:

- title-only information/success: 5 seconds;
- information/success with description: 8 seconds;
- danger: persistent until dismissed.

Timeout pauses on hover, focus, and hidden document. One viewport-level polite live region announces toasts; individual toasts do not create nested live regions.

### 7.4 Freshness and “live” grammar

Transport, activity, and freshness are separate:

| Axis | Values | Motion |
|---|---|---|
| Transport | Connected, offline | Static; transport alone is neutral/information |
| Activity | Idle, updating, syncing, failed | Spinner only for updating/syncing |
| Freshness | Current, stale, unknown | Static semantic treatment |
| Live | Verified active subscription plus recent heartbeat | Optional breathing dot |

Do not label a server snapshot, webhook credential, manual refresh, or periodic poll “Live.” A Live input comes from a domain-provided verified subscription plus `heartbeatExpiresAt`; the UI never invents a universal heartbeat timeout. The current product may ship Current/Stale/Updating now; Live ships only with real subscription and heartbeat infrastructure.

“Current” in the accent system means current selection or current comparison period, not data freshness. A merely Connected transport is not success; verified healthy/current data may use success.

Recency copy:

- `Updated just now` below 60 seconds;
- minute granularity afterwards;
- refresh relative text once per minute;
- render a visible `<time dateTime>` and associate an absolute timestamp through `aria-describedby`; and
- use `As of …` for snapshot data.

Remove the UI’s universal 24-hour freshness assumption. Provider/domain read models own their thresholds.

### 7.5 Background refresh

Polished data motion requires stale-while-refresh behavior. Upgrade the shared fetch state to a discriminated contract:

```ts
type ResourceSnapshot<T> =
  | {
      status: 'idle' | 'initial-loading';
      data: undefined;
      error: null;
      dataAsOf: null;
    }
  | {
      status: 'success' | 'refreshing';
      data: T;
      error: null;
      dataAsOf: string | null;
    }
  | {
      status: 'error';
      data: T | undefined;
      error: string;
      dataAsOf: string | null;
    };

// Derived: isInitialLoading, isRefreshing, hasStaleData.
// receivedAt may exist for cache bookkeeping; it is never source freshness.
reload(options?: { signal?: AbortSignal }): void;
```

Required behavior:

- initial load may show the route skeleton;
- refresh preserves existing data, plot, scroll, focus, and selection;
- refresh failure preserves stale data and adds a recoverable warning;
- refresh never invokes the current data-deleting reset behavior;
- initial error may have no data; refresh error retains data;
- `dataAsOf` comes from the domain response, not fetch completion time or `Date.now()`;
- response ordering is guarded by request ID or `AbortSignal`;
- a filter/range request keeps the old plot until the replacement is ready;
- a topology-compatible result morphs; an incompatible result crossfades; and
- new queue records accumulate behind an explicit “N new items” control rather than reordering beneath a pointer or keyboard focus.

Filter controllers maintain `requestedScope` and `resolvedScope`. While they differ:

- chart, table, axis, totals, and export remain labelled with `resolvedScope`;
- show “Updating to {requestedScope} — showing {resolvedScope}”;
- export/table actions are either disabled or explicitly bound to `resolvedScope`;
- data and resolved-scope label swap atomically; and
- an older response may never overwrite a newer request.

This is a prerequisite for the chart interactions in §6.5.

### 7.6 Skeletons and spinners

- Use one canonical skeleton region and bone.
- Delay a client-managed skeleton 180ms.
- Match the final geometry exactly.
- A local refresh never replaces the full region with a skeleton.
- Use one very low-amplitude `opacity: .78 ↔ 1` breath over 1600ms only while genuinely loading.
- Do not use a traveling shimmer or animated gradient.
- At 8s show explanatory slow-load/retry copy.
- One region owns `aria-busy` and one polite status announcement; bones are hidden from accessibility APIs.
- Consolidate raw `animate-spin` sites into one spinner with the 150ms display threshold.
- A loading button retains its accessible label and sets `aria-busy="true"`.
- Resolved content is never held back to satisfy a dwell time.
- A visible client skeleton may crossfade for at most 160ms with content mounted beneath it.
- A server Suspense fallback unmounts as soon as content is ready; there is no artificial minimum dwell.

### 7.7 Reduced motion and capture mode

With `prefers-reduced-motion: reduce`:

- remove translate, scale, path drawing, bar growth, pulse, spin, smooth scroll, and interpolation;
- switch state transitions to instant;
- retain visible focus, selection, status, progress values, and tooltips;
- do not auto-scroll to chart selections; and
- replace activity animation with a static glyph and text.

Use one SSR-safe motion-allowance hook for CSS presence and chart libraries. It returns false for reduced motion, capture mode, and until client preference is known.

Capture mode must be known before hydration, render final chart geometry immediately, and freeze relative time.

Readiness signals are distinct:

- `data-route-ready="true"` means every required resource for the declared route state has settled.
- `data-route-state="ready|degraded"` names whether the claimed state is healthy or explicitly degraded.
- `data-capture-ready="true"` is capture-only and appears only after route-ready, route-state ready, `document.fonts.ready`, image decode, frozen clock, no pending required resource, no transient UI, no running animation, and two stable animation frames.
- A degraded route never becomes capture-ready.

### 7.8 Liveness acceptance

A route does not pass merely because animation code exists. It passes when:

- every interactive element acknowledges hover, focus, press, selection, loading, success, and failure as applicable;
- motion does not delay an action or hide data;
- chart transitions preserve axes and context;
- no motion creates layout shift;
- no loop continues after its real process finishes;
- keyboard and pointer receive equivalent feedback; and
- reduced motion produces a complete, understandable interface.

Acceptance thresholds:

- pointer feedback begins within 100ms;
- modal opens within 160ms, drawer within 220ms, toast within 160ms, and initial chart reveal within 360ms;
- a mutation below 150ms does not flash a spinner;
- a load below 180ms does not flash a skeleton;
- background refresh never blanks a populated panel or resets axes;
- dashboard navigation triggers at most one route settle and one primary-chart reveal;
- no authenticated button jitter, `transition-all`, raw `animate-pulse`, or unapproved infinite animation remains;
- with reduced motion, automated inspection finds no running animation in `.ua-app`;
- loading controls retain a non-empty accessible name; and
- skeleton-to-content CLS remains ≤0.05 with no avoidable panel-height jump above 16px.

---

## 8. Shared component remediation

### 8.1 Consolidation map

| Current overlap/problem | Target |
|---|---|
| `Card`, `Panel`, `SectionCard`, `AuthenticatedPanel`, route-local panels | One `Surface` anatomy with `working`, `joined`, `inset`, and `floating` structures |
| `MetricCard`, `MetricGroup`, `WorkbenchKpiStrip`, local KPI grids | One adaptive `MetricGroup` and `Metric` |
| `KeyInsightCallout` + `SummaryRail` repeating KPIs | One optional `Insight` plus a meaningful chart or remove both |
| Bespoke dashboard, Workbench, case detail, recovery detail shells | Shared `PageFrame`, `RegistryPage`, `BoardPage`, and `DetailPage` families |
| Multiple chart shells/tooltips/legends | Shared chart anatomy from §6.7 |
| `LoadingState` and `OperationalRouteError` families | One geometry-aware route-state system |
| Route-local filters and tabs | Shared toolbar, tab, segmented-control, and filter contracts |
| Settings horizontal tab overflow | Grouped settings navigation with visible overflow/sectioning |

### 8.2 Surface rules

| Surface | Background | Boundary/depth | Radius | Padding | Permitted nesting |
|---|---|---|---:|---:|---|
| Working | Primary | 1px default border; no shadow | 10px | 20px standard, 16px dense | May contain joined sections and inset groups |
| Joined section | Transparent/primary | Top divider only after the first section | 0 | 20px | Lives only inside a working surface |
| Inset group | Secondary | 1px subtle border; no shadow | 6px | 12–16px | Contains controls/compact facts, not another working surface |
| Floating | Primary | Default border plus approved float/menu/overlay shadow | 14px | 16–20px | Overlay content only |
| Unframed section | Transparent | No border or shadow | 0 | 0 | Page-level grouping through spacing |

- One outer working surface may contain joined sections without each section becoming a floating card.
- Do not place a standard bordered card directly inside another standard bordered card.
- Use dividers and spacing before adding another rectangle.
- A panel must have a distinct job, not merely wrap content.
- Card header, action, body, and footer align to the same 20px inset.
- Supporting cards use equal heights only when their content questions are peers.

### 8.3 Table rules

- Toolbar, result count, table, bulk action, and pagination belong to one surface.
- Numeric, amount, percentage, and duration columns align right.
- Identity and status remain left-aligned.
- Table headers use quiet filled neutral background and sentence case.
- Rich rows are 56px; rows with logo plus two-line metadata may use 64px.
- Row hover uses a neutral fill; selected row adds an accent marker/wash.
- Row action uses opacity/visibility and `:focus-visible`/`:focus-within`; it never uses `display: none` and remains keyboard reachable.
- Status is one compact badge, not multiple adjacent pills.
- Horizontal overflow remains inside the table surface.
- A chart selection filters or highlights the matching rows.

### 8.4 Detail-page rules

One shared detail header renders:

- functional back navigation;
- human-readable identity;
- status and provenance;
- owner and updated time;
- one primary decision/action; and
- optional previous/next navigation.

The body uses:

1. lead financial or lifecycle visual;
2. primary decision/work region;
3. evidence/context;
4. connected objects; and
5. chronological activity.

Raw IDs are copyable secondary metadata, not the title. `DetailPageShell` must render its existing `backHref` and `backLabel` contract.

### 8.5 Builder and form rules

- Use one persistent validation summary.
- Show a live preview where the configuration produces visible logic.
- Long forms use joined sections, not stacks of equal-weight cards.
- In-place saves acknowledge near the action. Use a toast only when the initiating context closes/navigates or the confirmation would otherwise disappear; never duplicate one success in both locations.
- Raw JSON is collapsed behind a labelled developer disclosure and rendered as a structured tree where merchant users need to inspect it.

### 8.6 State rules

Skeletons mirror the resolved screen exactly. Empty, filtered-empty, partial, stale, disconnected, permission-denied, locked, error, and not-found states are distinct.

No resolved route may retain a spinner or “Loading…” message after its required data has settled.

---

## 9. Product-wide route implementation matrix

The matrix covers every `page.tsx` in the repository. R03, R10, R49, and R64 are redirect-only routes and receive navigation proof rather than a standalone screenshot. R08 and R28 are development-only visual harnesses. There are 58 production user-facing renderable surfaces plus those two development harnesses. A route may intentionally remain chart-free; that is a design decision, not an omission.

### 9.1 Core operations and connected records

| ID | Route | Target composition and primary visual/work surface | Liveness and acceptance |
|---|---|---|---|
| R01 | `/claims/[id]` | Unified detail header; reconciliation waterfall; claim-stage timeline; decision workspace; joined evidence and activity | Evidence state resolves; waterfall drills into line items; no nested-box maze |
| R02 | `/claims` | Compact KPI group; 160–180px intake/SLA queue pulse; master-detail case workspace | Selected case animates without layout jump; queue and preview share filter scope |
| R03 | `/customers/[id]/claims` | Exact redirect: when `claimId` exists, `/claims/${claimId}`; otherwise `/customers/${id}#cases` | No standalone shell or screenshot; preserve the supplied identifiers exactly |
| R04 | `/customers/[id]/evidence/new` | Chart-free evidence task; progress stepper; upload/entry; structured preview | Step and validation transitions; upload progress is truthful and reduced-motion safe |
| R05 | `/customers/[id]` | Identity/value lead; order-value trend with case-rate comparison; relationship timeline; case/order detail | Stop discarding graph-ready data; point selection opens matching order/case |
| R06 | `/customers` | Adaptive metrics; `0`, `1`, `2–3`, `4+` open-case workload bands; customer table | Remove repeated “49 of 56”; chart/table filters stay synced; do not revive legacy customer “risk” |
| R07 | `/dashboard` | Four headline metrics; 320–360px loss/exposure hero trend; priority-work ranked bars; recovery pipeline; data health; record table | Current period accent, prior neutral; filters precede and scope all visuals |
| R08 | `/dev/design-system` | Not an analytical product page; system gallery includes canonical component, state, chart, theme, and motion specimens | Development proof plus production-build 404 proof |
| R09 | `/disputes/[id]` | Shared connected-object detail; lifecycle timeline; financial facts; related case/refund links | Timeline state transitions; chart-free unless truthful series exists |
| R10 | `/exceptions` | Exact redirect to `/work?view=integration-exceptions` | No parallel page shell or dead-end navigation |
| R11 | `/losses/[id]` | Human-readable identity; loss-attribution waterfall; recovery progress; evidence and activity | Bars ≥12px; no raw hash as lead identity |
| R12 | `/losses` | Four metrics; loss trend hero; cause distribution ranked bars; loss ledger | Replace repeated callout/rail; selecting a cause filters the ledger |
| R13 | `/notifications` | Two equal metrics; compact 14-day activity histogram; notification list | Read/unread transition is immediate; count updates without full rerender |
| R14 | `/orders/[id]` | Shared connected-object detail; order lifecycle; financial composition; linked cases/shipments/refunds | Chart-free beyond financial/lifecycle visual; preserve provenance |
| R15 | `/recoveries/[id]` | Identity; sought → approved → recovered → outstanding thick progression; event timeline; actions | Animate only real stage changes; values reconcile |
| R16 | `/recoveries` | Five adaptive metrics; weekly recovered vs outstanding visual; three/four-column board based on available width | No five compressed columns beside a rail; explicit status transitions visibly settle; no new drag-and-drop workflow |
| R17 | `/refunds/[id]` | Shared connected-object detail; refund lifecycle and amount context; related order/case | Chart-free; state change and provenance remain explicit |
| R18 | `/returns/[id]` | Shared connected-object detail; return lifecycle; items and linked shipment/refund | Chart-free; timeline and item states provide the visual structure |
| R19 | `/shipments/[id]` | Shared connected-object detail; milestone timeline; carrier/source and linked order/case | Fresh tracking update is acknowledged; no decorative chart |
| R20 | `/tickets/[id]` | Shared connected-object detail; conversation/activity timeline; linked customer/case/order | New activity appears without context loss; chart-free |
| R21 | `/work` | Two equal metrics; 160–180px workload/deadline-risk visual; saved views and operational table | Fix saved-view error; no half-empty KPI strip; chart filters the queue |

### 9.2 Rules, flows, reporting, integrations, and help

| ID | Route | Target composition and primary visual/work surface | Liveness and acceptance |
|---|---|---|---|
| R22 | `/flows/[id]` | Unified builder/detail header; flow graph; run-volume/outcome sparkline; versions/history | Node selection and validation feel immediate; no shell mismatch |
| R23 | `/flows` | Three equal metrics; canonical terminal-run volume/reliability trend; flow registry | Remove duplicate availability copy; no blank KPI quarter; matched/not-matched remain distinct |
| R24 | `/flows/runs/[id]` | Structured run timeline; step durations; inputs/outputs tree; error context | Replace raw terminal-like JSON `<pre>`; expand/collapse and copy are polished |
| R25 | `/flows/runs` | Outcome trend; properly headed runs table; filters | Status treatment is canonical; point/segment selection filters rows |
| R26 | `/help` | Chart-free searchable anchored help content within `/help`, plus explicit external documentation/support URLs | Every “Read” link opens an in-page article/drawer or real external help destination; no undocumented article routes |
| R27 | `/integrations/[provider]` | Status/freshness header and coverage summary; compact processed/failed trend only for scheduled ingestion with at least three completed intervals | On-demand providers remain chart-free; freshness transitions after sync; grids rebalance without orphan dividers |
| R28 | `/integrations/dev-preview` | Internal-only provider/state gallery using production primitives | Clearly marked internal; cannot diverge into another design system |
| R29 | `/integrations/imports` | Import stepper; mapped-field coverage; validation/result bars; row issues table | Replace exposed canonical names/UUID prominence; progress is truthful |
| R30 | `/integrations` | Stable header/tabs; connection coverage; freshness strip; provider list and recent events | Banners do not shift header; search/filter placement matches registries |
| R31 | `/integrations/shipbob/select` | Chart-free account/location selection task with connection summary | Clear selection, loading, empty, and error feedback |
| R32 | `/reports` | Four headline metrics; 320–360px primary financial trend above fold; two to four support charts; records table | Fix gaps, clipped axes, and thin bars; every chart drills to records |
| R33 | `/reports/records` | Scoped report header; selected metric summary; record table and export | No raw paragraph states; inherits the report filter/range visibly |
| R34 | `/rules/[id]` | Unified rule builder/detail; hit-rate/outcome trend; versions and change history | Live validation and preview; consistent header with flow detail |
| R35 | `/rules` | Three equal metrics; rule-match/action-outcome trend; rules table | Remove repeated “7 of 7”; no blank KPI quarter |
| R36 | `/rules/recovery` | Chart-free recovery policy configuration with coverage preview and change history | Fix Recovery link target; preview responds to rule changes |

### 9.3 Settings

| ID | Route | Target composition and primary visual/work surface | Liveness and acceptance |
|---|---|---|---|
| R37 | `/settings/account` | Chart-free account form in unified settings shell | Pristine/edit/saving/saved/error states do not shift layout |
| R38 | `/settings/agreements` | Agreement status summary; server-loaded existing-document list; upload task; verified-terms disclosure | Reduce inert lead panel; add the required existing-agreement loader; upload and verification progress are truthful |
| R39 | `/settings/api-integrations` | Credentials/connections table; scoped creation drawer; usage metadata | Secret reveal/copy/rotate feedback is explicit; no raw internal language |
| R40 | `/settings/audit-trail` | Canonical audit table and structured detail drawer; optional compact activity histogram only when it aids investigation | Replace raw JSON exposure; if present, histogram and filters share the server-aggregate scope |
| R41 | `/settings/billing` | Current plan/credit lead; current-cycle allowance/consumption progress; payment method and reset context | Break equal-weight panel stack; use source-of-truth currency code; no invented history/invoices |
| R42 | `/settings/data-privacy` | Chart-free visual data-flow diagram; retention/export/delete controls | Replace monospace arrow string; focus order follows the visual flow |
| R43 | `/settings/integrations/chrome` | Installation/configuration task with extension state and test connection | Error uses critical, not success; progress and completion state are explicit |
| R44 | `/settings/integrations/freshdesk` | Shared helpdesk connector setup pattern | Consistent connect/test/save states and provider identity |
| R45 | `/settings/integrations/gorgias` | Shared helpdesk connector setup pattern | Consistent connect/test/save states and provider identity |
| R46 | `/settings/integrations/shopify` | Shared commerce connector setup pattern | Consistent connect/test/save states and provider identity |
| R47 | `/settings/integrations/zendesk` | Shared helpdesk connector setup pattern | Consistent connect/test/save states and provider identity |
| R48 | `/settings/notifications` | Chart-free preference groups; channels; digest preview | Switches acknowledge save state without toast spam |
| R49 | `/settings` | Exact redirect to `/settings/account` | No duplicate settings home and no intermediate flash |
| R50 | `/settings/platform` | Platform defaults form with connected-effect preview | Inputs, validation, and save state use shared anatomy |
| R51 | `/settings/team` | Team summary; seats/roles; member table; invite drawer | Chart-free unless billing supplies truthful seat history; remove generic help rail |

Settings navigation must replace the crowded ten-tab horizontal strip with grouped local navigation:

- Workspace: Account, Team, Platform
- Data and access: API integrations, Connected apps (explicit cross-link to `/integrations`), Data privacy
- Operations: Notifications, Audit trail
- Commercial: Billing, Agreements

At 1024px the groups may collapse into a labelled select/menu while retaining orientation and current location.

### 9.4 Entry, onboarding, public, legal, and root routes

| ID | Route | Target composition and primary visual/work surface | Liveness and acceptance |
|---|---|---|---|
| R52 | `/login` | One calm auth task; violet focus/action; concise trust cue | Form transitions preserve values; errors are inline and announced |
| R53 | `/reset` | One reset task with explicit success state | No layout jump between request and confirmation |
| R54 | `/reset/update` | One password-update task with strength/requirements feedback | Validation responds while typing without motion overload |
| R55 | `/demo` | Real product primitives and deterministic product scenario | No mock palette or fictional navigation that the app does not ship |
| R56 | `/landing` | Public narrative framing real deterministic product captures; product accent matches the app | Remove `hero-artifact.html`; no fake UI; product screenshot is legible at final size |
| R57 | `/legal/data-handling` | Quiet editorial legal layout with consistent public navigation | Chart-free; typography and links meet accessibility requirements |
| R58 | `/legal/dpa` | Quiet editorial legal layout with consistent public navigation | Chart-free |
| R59 | `/legal/pilot-terms` | Quiet editorial legal layout with consistent public navigation | Chart-free |
| R60 | `/legal/privacy` | Quiet editorial legal layout with consistent public navigation | Chart-free |
| R61 | `/pricing` | Public pricing hierarchy using the same violet interactive identity | No disconnected rust accent; plan comparison remains readable |
| R62 | `/signup` | Public-to-product bridge with violet action and product-consistent form | No visual discontinuity when entering onboarding |
| R63 | `/onboarding` | Task-focused stepper, connection state, preview, and completion | Progress reflects real completion; reduced motion and resume state work |
| R64 | `/` | Exact redirect to `/landing` | No intermediate flash of an unrelated theme |

### 9.5 Route-state coverage

The 64-route matrix covers populated page routes. In addition:

- every shared loading pattern is verified once per page family;
- every shared error pattern is verified once, plus route-specific failures;
- empty, filtered-empty, partial, stale, disconnected, permission-denied, and not-found states are verified where applicable;
- dark mode is verified on every shared primitive and representative page family;
- no route-specific loader uses geometry from a different destination family; and
- aliases and redirects preserve query parameters and do not briefly render duplicate chrome.

### 9.6 Binding route-state disposition

Every current route-state file is named below. “Split” permits adding nested `loading.tsx`/`error.tsx` files; it does not add a page route.

| Current file(s) | Current/inheriting route | Disposition |
|---|---|---|
| `app/(app)/loading.tsx` | Authenticated root transitions | Retain as shell-only fallback; no route-specific KPI/chart geometry |
| `app/(app)/claims/loading.tsx`, `error.tsx` | `/claims`, currently `/claims/[id]` | Retain registry geometry for index; add decision-detail loader/error for `[id]` |
| `app/(app)/customers/[id]/loading.tsx`, `error.tsx` | Customer detail, evidence form, customer-claims redirect | Retain for customer detail; add evidence-form state for `evidence/new`; redirect renders no state UI |
| `app/(app)/customers/loading.tsx`, `error.tsx` | `/customers` | Replace deprecated insight/rail geometry with cohort visual plus table geometry |
| `app/(app)/dashboard/loading.tsx`, `error.tsx` | `/dashboard` | Retain route ownership; match four metrics and hero/support visual layout |
| `app/(app)/disputes/[id]/loading.tsx`, `error.tsx` | Dispute detail | Delegate to connected-object detail state |
| `app/(app)/flows/[id]/loading.tsx`, `error.tsx` | Flow builder/detail | Retain ownership; match flow graph/version layout |
| `app/(app)/flows/loading.tsx`, `error.tsx` | `/flows`, currently both run routes | Retain registry state for `/flows`; add run-table and execution-trace states for `/flows/runs` and `/flows/runs/[id]` |
| `app/(app)/help/error.tsx` | `/help` | Delegate to help/search error; add local search-empty and external-link failure treatment |
| `app/(app)/integrations/loading.tsx`, `error.tsx` | Hub plus provider/import/select descendants | Retain hub state; add provider-detail, import-wizard, and ShipBob-selection states; dev preview uses gallery state |
| `app/(app)/losses/[id]/loading.tsx`, `error.tsx`, `not-found.tsx` | Loss detail | Retain ownership; match detail identity/waterfall/recovery/activity geometry |
| `app/(app)/losses/loading.tsx`, `error.tsx` | `/losses` | Replace insight/rail geometry with loss trend/cause/ledger geometry |
| `app/(app)/notifications/loading.tsx`, `error.tsx` | `/notifications` | Replace insight/rail geometry with two metrics, compact histogram, and list |
| `app/(app)/orders/[id]/loading.tsx`, `error.tsx` | Order detail | Delegate to connected-object detail state |
| `app/(app)/recoveries/[id]/loading.tsx`, `error.tsx` | Recovery detail | Replace generic Workbench state with detail/progression/timeline geometry |
| `app/(app)/recoveries/loading.tsx`, `error.tsx` | Recovery board | Replace insight/rail geometry with progression plus readable board |
| `app/(app)/refunds/[id]/loading.tsx`, `error.tsx` | Refund detail | Delegate to connected-object detail state |
| `app/(app)/reports/loading.tsx`, `error.tsx` | `/reports`, currently `/reports/records` | Retain analytics state for `/reports`; add scoped record-table state for `/reports/records` |
| `app/(app)/returns/[id]/loading.tsx`, `error.tsx` | Return detail | Delegate to connected-object detail state |
| `app/(app)/rules/[id]/loading.tsx`, `error.tsx` | Rule builder/detail | Retain ownership; match logic/version layout |
| `app/(app)/rules/loading.tsx`, `error.tsx` | `/rules`, currently `/rules/recovery` | Retain registry state for `/rules`; add recovery-configuration state |
| `app/(app)/settings/account/loading.tsx`, `error.tsx` | Account settings | Retain ownership; match multi-section account form |
| `app/(app)/settings/api-integrations/loading.tsx`, `error.tsx` | API integrations | Retain ownership; match credential table/drawer |
| `app/(app)/settings/audit-trail/loading.tsx`, `error.tsx` | Audit trail | Retain ownership; match dominant table and optional compact visual |
| `app/(app)/settings/billing/loading.tsx`, `error.tsx` | Billing | Retain ownership; match plan/current-cycle progress/payment layout |
| `app/(app)/settings/data-privacy/loading.tsx`, `error.tsx` | Data privacy | Retain ownership; match data-flow/form layout |
| `app/(app)/settings/loading.tsx`, `error.tsx` | Settings root plus Agreements, Notifications, Platform when no child state exists | Root redirect renders no state UI; add route-owned states for Agreements, Notifications, and Platform |
| `app/(app)/settings/integrations/loading.tsx`, `error.tsx` | Chrome, Freshdesk, Gorgias, Shopify, Zendesk setup | Replace generic list geometry with the shared provider-setup checklist geometry |
| `app/(app)/settings/team/loading.tsx`, `error.tsx` | Team settings | Retain ownership; match summary/member table/invite layout |
| `app/(app)/shipments/[id]/loading.tsx`, `error.tsx` | Shipment detail | Delegate to connected-object detail state |
| `app/(app)/tickets/[id]/loading.tsx`, `error.tsx` | Ticket detail | Delegate to connected-object detail state |
| `app/(app)/work/loading.tsx`, `error.tsx` | `/work` | Remove insight/rail placeholder; match two metrics, due-band visual, and queue |
| `app/not-found.tsx` | Public/global 404 | Retain public legal/marketing shell and prove independently |
| `app/(app)/not-found.tsx` | Authenticated 404 | Retain authenticated shell, safe language, and valid recovery destination |

Component-local required-data fallbacks are part of the same state contract. Replace Login and Shopify setup `Suspense fallback={null}` with geometry-stable form/setup fallbacks. R08 and R28 require a development visual proof and a production-build `notFound()` proof.

`ErrorBoundaryUI` and `OperationalRouteError` converge on one `RouteError` anatomy with page-family geometry slots; route-level `error.tsx` boundaries remain where recovery scope differs. The global, authenticated, and loss-detail not-found surfaces each receive separate copy/navigation proof.

Each route phase owns its resolved, loading, empty, error, and unique partial state. LP7 performs the cross-family sweep; it does not defer incorrect route states from LP3–LP6.

Exact baseline state-file inventory governed by the grouped dispositions above:

```text
app/(app)/claims/error.tsx
app/(app)/claims/loading.tsx
app/(app)/customers/[id]/error.tsx
app/(app)/customers/[id]/loading.tsx
app/(app)/customers/error.tsx
app/(app)/customers/loading.tsx
app/(app)/dashboard/error.tsx
app/(app)/dashboard/loading.tsx
app/(app)/disputes/[id]/error.tsx
app/(app)/disputes/[id]/loading.tsx
app/(app)/flows/[id]/error.tsx
app/(app)/flows/[id]/loading.tsx
app/(app)/flows/error.tsx
app/(app)/flows/loading.tsx
app/(app)/help/error.tsx
app/(app)/integrations/error.tsx
app/(app)/integrations/loading.tsx
app/(app)/loading.tsx
app/(app)/losses/[id]/error.tsx
app/(app)/losses/[id]/loading.tsx
app/(app)/losses/[id]/not-found.tsx
app/(app)/losses/error.tsx
app/(app)/losses/loading.tsx
app/(app)/not-found.tsx
app/(app)/notifications/error.tsx
app/(app)/notifications/loading.tsx
app/(app)/orders/[id]/error.tsx
app/(app)/orders/[id]/loading.tsx
app/(app)/recoveries/[id]/error.tsx
app/(app)/recoveries/[id]/loading.tsx
app/(app)/recoveries/error.tsx
app/(app)/recoveries/loading.tsx
app/(app)/refunds/[id]/error.tsx
app/(app)/refunds/[id]/loading.tsx
app/(app)/reports/error.tsx
app/(app)/reports/loading.tsx
app/(app)/returns/[id]/error.tsx
app/(app)/returns/[id]/loading.tsx
app/(app)/rules/[id]/error.tsx
app/(app)/rules/[id]/loading.tsx
app/(app)/rules/error.tsx
app/(app)/rules/loading.tsx
app/(app)/settings/account/error.tsx
app/(app)/settings/account/loading.tsx
app/(app)/settings/api-integrations/error.tsx
app/(app)/settings/api-integrations/loading.tsx
app/(app)/settings/audit-trail/error.tsx
app/(app)/settings/audit-trail/loading.tsx
app/(app)/settings/billing/error.tsx
app/(app)/settings/billing/loading.tsx
app/(app)/settings/data-privacy/error.tsx
app/(app)/settings/data-privacy/loading.tsx
app/(app)/settings/error.tsx
app/(app)/settings/integrations/error.tsx
app/(app)/settings/integrations/loading.tsx
app/(app)/settings/loading.tsx
app/(app)/settings/team/error.tsx
app/(app)/settings/team/loading.tsx
app/(app)/shipments/[id]/error.tsx
app/(app)/shipments/[id]/loading.tsx
app/(app)/tickets/[id]/error.tsx
app/(app)/tickets/[id]/loading.tsx
app/(app)/work/error.tsx
app/(app)/work/loading.tsx
app/not-found.tsx
```

---

## 10. Credibility blockers

These defects are implementation blockers even when they are not primarily aesthetic:

| Priority | Defect | Required result |
|---|---|---|
| P0 | Saved views visibly fail on Work | Required request succeeds or the feature presents a truthful, intentional unavailable state |
| P0 | Case evidence can remain on “Loading case evidence…” after the page resolves | Named ready state waits for required evidence; failure becomes explicit and retryable |
| P0 | Recovery “Partner rulebook” points to nonexistent `/partners` | Link points to `/rules/recovery` and passes navigation smoke |
| P0 | Product links target missing `/settings/integrations` | Update every generic link to `/integrations`; use an existing provider setup route only when the intent is provider-specific; do not add a 65th page route |
| P0 | Connected-object breadcrumbs target nonexistent `/orders`, `/shipments`, or `/refunds` indexes | Use a valid parent route or non-link label |
| P1 | Reports show clipped axes, visual gaps, stray points, and an 8px recovery bar | Correct data joins/null handling and apply §6 geometry |
| P1 | Flow-run detail exposes raw JSON as the final product surface | Structured, searchable disclosure with a copy/download path |
| P1 | Import UI foregrounds canonical field names and full job UUIDs | Merchant labels lead; machine identifiers move to secondary disclosure |
| P1 | Chrome setup styles download error with success colour | Use the critical state contract |
| P1 | `DetailPageShell` accepts but does not render back navigation | Render accessible back navigation consistently |
| P1 | Customer rows show test-domain data and unavailable commercial facts without explanation | Marketing fixture is realistic; production nulls remain truthful |
| P1 | Billing exposes only a current-cycle snapshot and can mix source field/currency presentation | Ship truthful used/remaining progress now; display the source-of-truth currency code; add no trend/invoice claim without the audited prerequisite |
| P1 | Landing hero shows fake navigation, gradients, and a different palette | Replace with captured shipping product |

No final visual score may conceal one of these failures.

---

## 11. Implementation architecture

### 11.1 Canonical style entry

`styles/authenticated/index.css` remains the only authenticated stylesheet entry. `--ua-*` remains the only authenticated visual namespace.

Update:

- [`../styles/authenticated/tokens.css`](../styles/authenticated/tokens.css)
- [`../styles/authenticated/typography.css`](../styles/authenticated/typography.css)
- [`../styles/authenticated/surfaces.css`](../styles/authenticated/surfaces.css)
- [`../styles/authenticated/controls.css`](../styles/authenticated/controls.css)
- [`../styles/authenticated/tables.css`](../styles/authenticated/tables.css)
- [`../styles/authenticated/status.css`](../styles/authenticated/status.css)
- [`../styles/authenticated/states.css`](../styles/authenticated/states.css)
- [`../styles/authenticated/responsive.css`](../styles/authenticated/responsive.css)
- [`../styles/authenticated/contracts.ts`](../styles/authenticated/contracts.ts)
- [`../styles/authenticated/README.md`](../styles/authenticated/README.md)

Do not add a temporary `living-precision.css`, feature-flagged palette, or route-local accent layer.

### 11.2 Component order

Implement in this order:

1. tokens, typography, motion, focus, and semantic roles;
2. buttons, links, fields, tabs, filters, badges, and tooltips;
3. surface, page frame, metric group, table, and route states;
4. chart frame and chart primitives;
5. detail, board, registry, builder, and settings families;
6. flagship routes;
7. remaining routes;
8. public product imagery and capture.

Route work may not introduce a local substitute for a primitive scheduled earlier.

Canonical primitives land first. Existing `Card`, `Panel`, `SectionCard`, `AuthenticatedPanel`, metric wrappers, and chart wrappers then delegate to the canonical anatomy without owning visual CSS. Call sites migrate page-family by page-family. Wrappers are deleted only after their use count reaches zero in LP8. Do not combine a product-wide markup rewrite and product-wide visual rewrite in one unreviewed step, and do not allow the delegation seam to become a permanent parallel system.

### 11.3 Chart data contract

Each new visual must document:

- business question;
- metric and unit;
- dimension;
- date range;
- timezone;
- comparison period;
- currency treatment;
- null/partial rules;
- filter scope;
- drill-down destination;
- accessible table shape; and
- loading/empty/error behavior.

Prepared data belongs in merchant-scoped server loaders or shared domain adapters. Do not:

- query separately for the chart and table when they express the same scope;
- convert null to zero;
- fabricate missing history;
- interpolate missing financial data without disclosure;
- aggregate incompatible currencies; or
- run chart transformation on every client render.

### 11.4 Performance

- Prefer server rendering for initial analytical data.
- Lazy-load the full chart library only on routes that use it.
- Use CSS/SVG operational primitives for small ranked bars, progress, and sparklines.
- Memoise stable chart arrays and formatters.
- Avoid animating more than 40 marks; above that, fade the plot or disable mark animation.
- Keep pointer interaction within a 16.7ms frame budget, with p95 scripting/render frames ≤16.7ms during a 10-second hover/focus/filter trace on the largest approved 40-mark chart.
- Capture candidates reach `data-capture-ready` within 5 seconds on three warmed production-build navigations.
- No chart or skeleton may shift surrounding layout when it resolves.

Performance and capture use the repository-pinned Playwright version and bundled Chromium in a recorded Linux CI container image, production build, dedicated marketing fixture, no CPU throttle, and no unrelated network traffic. Record browser version, container digest, fixture revision, and chart mark count with the evidence. Local Mac review is useful for design but is not the reproducible performance/capture authority.

A **required request** is one needed to render the route state or capability claimed in the manifest. Optional analytics, telemetry, and unsupported connector probes do not fail readiness when they are explicitly classified and their absence does not change the claim. Every required request must succeed or render its named explicit degraded state; a degraded state is never marketing-capture ready.

### 11.5 Known migration hotspots

This is a routing aid, not permission to limit the work to these files.

| Concern | Current hotspot | Required migration |
|---|---|---|
| Accent, chart, and motion tokens | [`../styles/authenticated/tokens.css`](../styles/authenticated/tokens.css) | Replace old chart slots; add §3/§7 roles; preserve one namespace |
| Global control shake and broad transitions | [`../app/globals.css`](../app/globals.css), button/filter presentation | Remove authenticated control jitter and unscoped generic transitions |
| Per-card entrance animation | [`../styles/authenticated/surfaces.css`](../styles/authenticated/surfaces.css) | Remove blanket metric/data-surface entrances; use one route settle |
| Overlay presence | [`../components/ui/Drawer.tsx`](../components/ui/Drawer.tsx), [`../components/ui/Modal.tsx`](../components/ui/Modal.tsx), [`../components/ui/Toast.tsx`](../components/ui/Toast.tsx) | Add shared enter/open/exit presence and correct focus restoration |
| Route progress | [`../components/navigation/RouteProgressBar.tsx`](../components/navigation/RouteProgressBar.tsx), navigation provider | Replace infinite sweep and timeout completion with §7.3 state machine |
| Slow navigation notice | Navigation provider/root shell | Add `RoutePendingNotice` with stored safe destination and truthful recovery |
| Chart motion | Authenticated cartesian charts | Replace blanket `isAnimationActive={false}` with central initial/update/none phase that defaults to none for reduced/capture |
| Background refresh | [`../lib/react/useFetchJson.ts`](../lib/react/useFetchJson.ts) | Preserve data on refresh/error and expose initial-loading/refreshing/stale state |
| Freshness | [`../components/sources/FreshnessIndicator.tsx`](../components/sources/FreshnessIndicator.tsx) | Consume domain/provider threshold and separate transport/activity/freshness |
| Loading button accessibility | [`../components/ui/Button.tsx`](../components/ui/Button.tsx) | Preserve accessible label and add `aria-busy` |
| Skeleton duplication | Shared loading skeletons, navigation skeleton primitives, route-local `animate-pulse` | Consolidate region/bone/spinner behavior and remove public shimmer inheritance |
| Capture bootstrap/readiness | Current route-ready effect and capture tooling | Add pre-hydration `CaptureModeBootstrap`, validated `CaptureClockProvider`, and `CaptureReadySignal` with §7.7 semantics |
| Metric geometry | [`../components/workbench/WorkbenchPage.tsx`](../components/workbench/WorkbenchPage.tsx) | Implement §5.3 adaptive layout |
| Context rail breakpoint | [`../components/authenticated/AuthenticatedPageChrome.module.css`](../components/authenticated/AuthenticatedPageChrome.module.css) | Apply §5.5 at 1280px and remove generic rails |
| Chart thickness | Summary rail, tick meter, dashboard charts, authenticated chart CSS, combo chart | Apply §6.3 and delete 3–9px primary analytical marks |
| Landing artifact | Landing hero component and [`../public/hero-artifact.html`](../public/hero-artifact.html) | Replace with deterministic product capture |
| Unused parallel product styles/charts | Historical `.cid-*` product CSS and unused `components/analytics/*` family | Remove during LP8 after proving zero consumers |

### 11.6 Guardrails

Extend the authenticated design check to reject:

- `transition-all`;
- route/component-local hard-coded motion durations;
- authenticated `animate-pulse`;
- raw `animate-spin` outside the canonical spinner;
- new `@keyframes` outside approved motion/state files;
- unapproved `infinite` animation;
- literal accent/semantic/chart colours outside token files;
- use of semantic colour tokens for non-semantic chart categories;
- old chart-slot tokens after the cutover; and
- new authenticated imports of public landing tokens/primitives.

The guardrail must parse CSS declarations and TS/TSX string/JSX values, exclude comments and ordinary identifiers, and report property, file, and line. A text regex alone is not accepted as semantic proof.

Charts accept typed colour roles such as `primary`, `comparison`, `semantic-success`, `semantic-warning`, and `semantic-critical`; direct semantic-token `colourVar` escape hatches are prohibited. The existing hand-built-table allowance ratchets to zero by LP8.

---

## 12. Phased execution plan

### Phase 1 — Foundation and system

#### Phase LP0 — Baseline, authority, and visual harness

Deliver:

- mark this document as the target in contributor guidance;
- capture 58 production surfaces and two development harnesses at 1440×900 and record destination proof for the four redirects;
- capture representative page families at 1024px;
- record light/dark, loading, empty, error, and reduced-motion baselines;
- add Living Precision foundations and states to `/dev/design-system`; and
- establish one contact sheet for route-level review.

Gate:

- all 64 route files appear exactly once in the baseline manifest, classified as renderable, development-only, or redirect-only;
- no undocumented route or page-family shell remains; and
- the current screenshot-readiness status is explicitly not `CAPTURE-READY`.

#### Phase LP1 — Foundations and liveness

Deliver:

- §3 colour, typography, spacing, geometry, and motion tokens;
- accent/semantic separation;
- focus, hover, press, selection, disabled, loading, invalid, and reduced-motion states;
- central motion constants/provider and pre-hydration capture/clock bootstrap;
- stale-while-refresh resource state with request ordering;
- shared overlay presence, Button loading, Spinner, Switch, and changed-value feedback;
- actual-state route progress and pending notice;
- canonical skeleton region/bone;
- light/dark parity; and
- updated design lint rules preventing literal route colours and old chart tokens.

Gate:

- component-level contrast passes;
- no old five-colour chart token is consumed by migrated primitives;
- one accent hue is used across all gallery examples; and
- motion matrix passes with reduced motion.

#### Phase LP2 — Structural primitives and chart system

Deliver:

- shared page frame and adaptive KPI group;
- surface consolidation;
- canonical table and route-state geometry;
- shared detail/settings/builder patterns;
- all chart primitives in §6.7;
- centralized chart `initial|update|none` phases with SSR/reduced/capture behavior;
- tooltip, keyboard, table alternative, drill-down, and every chart state; and
- removal/deprecation path for summary rails used as hero substitutes.

Gate:

- no blank KPI cell at 1–6 metrics;
- no standard card nested in another standard card in gallery fixtures;
- bars meet bandwidth and absolute-width thresholds;
- chart examples pass keyboard, screen-reader, forced-colour, and reduced-motion checks; and
- visual-regression baselines exist for every primitive/state.

### Phase 2 — Product-route implementation

#### Phase LP3 — Flagship calibration

Routes:

- `/dashboard`
- `/work`
- `/reports`
- `/reports/records`

Purpose:

Calibrate the system on one overview, one operational registry, and one analytical workspace before broad migration.

Gate:

- first-viewport and primary-visual thresholds pass at 1440×900 and 1024px;
- charts and tables share filters and drill-down;
- Work no longer has a half-empty metric strip or saved-view error;
- Reports shows four headline metrics and its primary chart above the fold;
- all LP3 route loaders/errors/empty states match the resolved geometry;
- independent benchmark review scores each LP3 route at least 3/4 in every applicable §14 dimension.

#### Phase LP4 — Cases, losses, and recovery

Routes:

- `/claims`
- `/claims/[id]`
- `/losses`
- `/losses/[id]`
- `/recoveries`
- `/recoveries/[id]`

Deliver:

- queue pulse, reconciliation/loss waterfalls, substantial ranked bars, and recovery progression;
- unified list/detail shells;
- evidence/loading repair; and
- board-width repair.

Gate:

- list-to-detail navigation feels continuous;
- financial values reconcile;
- case evidence never hangs silently;
- no 3–9px primary bar remains; and
- every primary visual drills into the relevant evidence or records;
- all LP4 route loaders/errors/empty states match the resolved geometry.

#### Phase LP5 — Customers, rules, and flows

Routes:

- customer routes R03–R06, with R03 verified as a redirect rather than a standalone visual surface;
- flow routes R22–R25;
- rule routes R34–R36.

Deliver:

- use currently discarded customer graph data;
- purposeful customer, rule, and flow trends;
- unified builders/details;
- structured flow-run payloads; and
- removal of repeated lifecycle counts and empty KPI quarters.

Gate:

- graph-ready values are not discarded in render code;
- each visual answers a different question;
- raw JSON is secondary and structured;
- builder validation is immediate and accessible; and
- chart-free task routes remain deliberate;
- all LP5 route loaders/errors/empty states match the resolved geometry.

#### Phase LP6 — Integrations, settings, help, and connected records

Routes:

- R09, R14, R17–R20;
- R26–R31;
- R37–R51.

Deliver:

- provider sync/freshness visuals;
- grouped settings navigation;
- billing and audit visuals;
- unified connector setup;
- connected-object detail shell;
- real help destinations; and
- every credibility repair in §10 owned by these routes.

Gate:

- no generic repeated settings rail;
- no crowded ten-tab strip;
- no raw machine identifier or payload leads a merchant screen;
- all provider/setup states use the same pattern; and
- all navigation targets return a valid authorised state;
- all LP6 route loaders/errors/empty states match the resolved geometry.

### Phase 3 — Product alignment, proof, and capture

#### Phase LP7 — Entry, onboarding, public alignment, and all shared states

Routes:

- R52–R64;
- every shared loading/error/empty/not-found pattern.

Deliver:

- violet identity across entry and product transition;
- real product demo state;
- replacement of the fake landing hero;
- deterministic screenshot components;
- public CTA/presentation alignment; and
- geometry-matched route states.

Gate:

- signup → onboarding → app has no theme discontinuity;
- landing imagery is generated from the shipping product;
- legal/editorial pages remain calm and accessible;
- root redirects without a theme flash; and
- shared states retain the resolved route’s geometry.

#### Phase LP8 — Full route proof and landing capture

Deliver:

- one populated 1440×900 capture of 58 production surfaces and two development harnesses, plus destination proof for R03, R10, R49, and R64;
- 1024px checks of every authenticated page family and every route with unique geometry;
- representative dark, reduced-motion, forced-colour, loading, empty, partial, stale, disconnected, error, and permission states;
- final side-by-side benchmark review;
- final landing capture set and contact sheet; and
- removal of superseded active visual instructions and primitives.

Gate:

- all §14 and §15 checks pass;
- every renderable route passes the scorecard and every redirect passes route-integrity gates;
- no P0/P1 visual or credibility defect remains;
- capture is deterministic and privacy-safe; and
- the programme status becomes `LIVING-PRECISION COMPLETE / CAPTURE-READY`.

### 12.9 Atomic requirement ledger

The prose above is authoritative. The ledger provides one owner and one binary closure condition for implementation tracking. R01–R64 remain separate route requirements in addition to these shared-system requirements.

#### Foundations

| ID | Owner | Requirement | Pass condition |
|---|---|---|---|
| LP-FND-01 | LP1 | Implement the light neutral tokens in §3.1 | Gallery computed values match exactly |
| LP-FND-02 | LP1 | Implement the full violet accent scale in §3.2 | One shared scale supplies nav, actions, focus, selection, and charts |
| LP-FND-03 | LP1 | Separate semantic from accent/chart roles | Static scan and visual gallery show no role collision |
| LP-FND-04 | LP1 | Implement relational dark tokens | Every role has a computed-value fixture; action/link/focus/selection/semantic pairings pass contrast |
| LP-FND-05 | LP1 | Implement the type-role table | No route-local heading/KPI scale remains |
| LP-FND-06 | LP1 | Enforce the spacing scale | Unapproved route-local spacing literals are zero |
| LP-FND-07 | LP1 | Enforce control/surface/overlay radii | Pills appear only in approved semantic shapes |
| LP-FND-08 | LP1 | Keep inline surfaces flat | No unapproved inline card shadow remains |
| LP-FND-09 | LP1 | Align public product interaction colour with the app | Signup/onboarding/product and landing product art form one identity |
| LP-FND-10 | LP1 | Update contributor/design contracts | No active document instructs the superseded accent/chart/motion behavior |

#### Components and composition

| ID | Owner | Requirement | Pass condition |
|---|---|---|---|
| LP-CMP-01 | LP2 | Implement one page frame/header | Every authenticated route uses the shared header grammar |
| LP-CMP-02 | LP2 | Implement the adaptive 1–6 metric group | Visual/unit tests show no empty cells or orphan dividers |
| LP-CMP-03 | LP2 | Consolidate surface anatomy | No standard bordered card is nested in another |
| LP-CMP-04 | LP2 | Consolidate registry/table toolbar/result/pagination | Representative registry has one working surface |
| LP-CMP-05 | LP2 | Implement one detail shell | Back, identity, provenance, owner, status, and action are consistent |
| LP-CMP-06 | LP2 | Implement board width/overflow rules | Recovery board remains readable at 1024, 1280, and 1440 |
| LP-CMP-07 | LP2 | Implement grouped settings navigation | Ten-tab overflow and generic repeated rail are gone |
| LP-CMP-08 | LP2 | Implement one builder/configuration shell | Rules and Flows share structure without losing domain behavior |
| LP-CMP-09 | LP2 | Consolidate loading/empty/error primitives | Geometry matches every page family |
| LP-CMP-10 | LP2 | Consolidate status/filter/metadata anatomy | Selection never uses a semantic state style |
| LP-CMP-11 | LP2 | Implement table density/alignment rules | Numeric values right-align; rich rows remain legible |
| LP-CMP-12 | LP2 | Remove duplicated KPI/callout/rail facts | Content audit finds no three-way repetition |

#### Data visualisation

| ID | Owner | Requirement | Pass condition |
|---|---|---|---|
| LP-VIZ-01 | LP2 | Implement the chart palette and role mapping | Every meaningful light/dark mark is ≥3:1 against its plot; computed token contrast is tested |
| LP-VIZ-02 | LP2 | Implement shared chart frame/anatomy | Every chart exposes question, scope, freshness, and drill-down |
| LP-VIZ-03 | LP2 | Implement exact bar/line/grid/tick geometry | Browser measurements satisfy §6.3 |
| LP-VIZ-04 | LP2 | Implement tooltip and keyboard mark focus | Pointer and keyboard expose equivalent values |
| LP-VIZ-05 | LP2 | Implement pinned selection and Escape restoration | Selection persists into records and clears accessibly |
| LP-VIZ-06 | LP2 | Implement chart data-table alternatives | Every meaningful chart has equivalent accessible data |
| LP-VIZ-07 | LP2 | Implement all chart data states | Gallery covers every state in §6.6 |
| LP-VIZ-08 | LP2 | Enforce null/currency/rate/waterfall rules | Focused domain tests reject invalid aggregation |
| LP-VIZ-09 | LP3–LP6 | Implement every assigned visual in §6.8 | Each route visual uses declared measure, dimension, and drill-down |
| LP-VIZ-10 | LP3–LP6 | Connect shared filters to charts and records | Scope is visible and updates atomically |
| LP-VIZ-11 | LP2 | Deprecate prose/3px rail hero substitutes | No data-rich primary route uses them as its lead visual |
| LP-VIZ-12 | LP8 | Verify plot utilisation and screenshot legibility | Plot ≥55% of card and labels survive final display size |

#### Motion, refresh, and feedback

| ID | Owner | Requirement | Pass condition |
|---|---|---|---|
| LP-MOT-01 | LP1 | Implement central motion tokens/constants/hook | CSS/JS values match and call sites do not choose durations |
| LP-MOT-02 | LP1 | Remove control jitter, hover lift, and broad `transition-all` | Authenticated source scan returns zero |
| LP-MOT-03 | LP1 | Implement shared overlay presence | Dialog, drawer, menu, and toast enter/exit/focus tests pass |
| LP-MOT-04 | LP1 | Implement actual-state route progress | Fast routes do not flash; slow routes never silently stop |
| LP-MOT-05 | LP1 | Replace per-card entrances with one route settle | Dashboard has one settle and no stagger |
| LP-MOT-06 | LP2 | Implement chart initial/update/none phases | Topology-aware transition and density cap pass |
| LP-MOT-07 | LP1 | Implement stale-while-refresh fetch state | Refresh preserves data, plot, scroll, focus, and error recovery |
| LP-MOT-08 | LP1 | Implement truthful transport/activity/freshness/live components | No unverified Live state appears |
| LP-MOT-09 | LP1 | Consolidate skeleton and spinner systems | Timing, geometry, announcements, and slow-load state pass |
| LP-MOT-10 | LP1 | Implement changed-value/row feedback | No first-mount count-up; one-shot wash uses truthful value |
| LP-MOT-11 | LP1 | Implement reduced-motion behavior | Automated inspection finds no running `.ua-app` animation |
| LP-MOT-12 | LP1 | Implement pre-hydration capture motion disable | Intermediate and final screenshots render settled geometry |

#### Credibility and route integrity

| ID | Owner | Requirement | Pass condition |
|---|---|---|---|
| LP-TRU-01 | LP3 | Repair Work saved views | Populated route has no visible request error |
| LP-TRU-02 | LP4 | Repair case evidence readiness | Required evidence resolves or shows retryable error |
| LP-TRU-03 | LP4–LP6 | Repair every broken internal destination in §10 | Navigation smoke returns valid authorised state |
| LP-TRU-04 | LP5 | Replace merchant-primary raw JSON | Structured flow trace leads; raw payload is secondary |
| LP-TRU-05 | LP6 | Demote raw field names and UUIDs | Merchant language leads imports and settings |
| LP-TRU-06 | LP6 | Correct semantic error styling | Chrome and other failures use critical treatment |
| LP-TRU-07 | LP3–LP6 | Reconcile chart/summary/table/detail/export values | Focused domain checks pass within display rounding |
| LP-TRU-08 | LP7 | Remove active fake product art | Landing/demo depict only shipping routes and capabilities |

#### Verification and capture

| ID | Owner | Requirement | Pass condition |
|---|---|---|---|
| LP-QA-01 | LP0 | Capture baseline inventory | All R01–R64 appear exactly once with the correct render/redirect classification |
| LP-QA-02 | Every route phase | Perform at least two visual iterations and continue until the gate passes | Before/after evidence and no unresolved scorecard defect |
| LP-QA-03 | Every route phase | Run independent design review | No unresolved scorecard dimension below 3 |
| LP-QA-04 | Every route phase | Run independent engineering review | No unresolved state/performance/accessibility concern |
| LP-QA-05 | LP8 | Capture 58 production surfaces plus two development harnesses at 1440×900 and verify four redirects | Every renderable proof passes §14, dev routes 404 in production, and redirects preserve intent |
| LP-QA-06 | LP8 | Verify every authenticated family/unique layout at 1024 | No page-level overflow or clipped primary control |
| LP-QA-07 | LP8 | Verify dark/reduced/forced-colour/state matrix | §15.2 is complete |
| LP-QA-08 | LP8 | Verify runtime integrity | Zero required-request, console, hydration, loader, or link failures |
| LP-QA-09 | LP8 | Verify deterministic privacy-safe captures | Two runs meet 0.1%; deny-list and human review pass |
| LP-QA-10 | LP8 | Review encoded assets at actual placement | One-message clarity and essential legibility pass |
| LP-QA-11 | LP8 | Score all renderable routes and capture candidates | Normal routes ≥89.5%; flagship/captures ≥95.8%; no applicable dimension below 3 |
| LP-QA-12 | LP8 | Remove superseded active instructions/primitives | Repository scan and contributor review find no competing system |

### 12.10 As-built position (27 July 2026)

This section records what is actually implemented. It is maintained by the
implementer and is the only place in this document permitted to make a
completion claim.

**Closed**

| ID | Evidence |
|---|---|
| LP-FND-01 … LP-FND-08 | `styles/authenticated/tokens.css`, `status.css`, `typography.css`; gallery computed values verified in-browser, light and dark |
| LP-FND-10 | `CLAUDE.md`, `styles/authenticated/README.md` |
| LP-CMP-02 | `components/ui/MetricGroup.tsx` + the `data-count` reflow in `surfaces.css` |
| LP-VIZ-01 | §6.2 role tokens; the numbered chart slots are deleted and lint-guarded |
| LP-VIZ-03 | `components/charts/authenticated/core/geometry.ts` (18% gap, 42px cap, 2.25px line); meter 8px, ranked bar 12px, summary rail 8px |
| LP-MOT-01 | `lib/design/motion.ts` mirrors §7.1; call sites read roles |
| LP-MOT-02 | `.ua-jitter` deleted; `transition-all`, hover lift, and hover glow are lint failures |
| LP-MOT-04 | `RouteProgressBar` + `RoutePendingNotice`; no timeout completes or hides the line |
| LP-TRU-08 (partial) | The commit-action sweep and accent separation are done; the landing imitation is **not** removed — see below |

**Open, with the reason**

| ID | Blocker |
|---|---|
| LP-CMP-01, LP-CMP-03 … LP-CMP-12 | Surface/registry/detail/settings/builder consolidation not started |
| LP-VIZ-02, LP-VIZ-04 … LP-VIZ-08, LP-VIZ-11 | The §6.7 primitive set (`ChartFrame`, `ChartState`, `WaterfallChart`, …) is not built |
| LP-VIZ-09, LP-VIZ-10 | Only Overview priority, Work, and Reports carry their §6.8 visual; LP4–LP6 routes need new server aggregates from the aggregate-ownership table |
| LP-MOT-03, LP-MOT-05 … LP-MOT-12 | Shared presence, chart phases, stale-while-refresh, freshness grammar, and capture motion disable not started |
| LP-TRU-01 | `/api/work/views` returns 500 because the linked database is behind 22 local migrations, including an unguarded 131-table baseline. Not a UI defect; needs a decided migration strategy, not a code change |
| LP-TRU-02 … LP-TRU-07 | Owned by LP4–LP6 |
| LP-QA-01 | LP0's 60-surface baseline manifest and contact sheet were dropped as a deliberate decision: they gate nothing the design guard and per-route browser verification do not already cover |
| LP-QA-05 … LP-QA-12 | §13.2 requires a pinned Playwright Linux CI container, a dedicated deterministic marketing merchant with a recorded seed revision, a validated frozen `captureNow`, and a manifest carrying container digests. None of that infrastructure exists, so no capture claim can be made |

**Landing imitation (LP-TRU-08, §13.1)**

`public/hero-artifact.html` and the Foundation hero still draw a separate HTML
imitation of the product. It violates four §13.1 bullets at once: it is an
imitation, it invents navigation that does not exist (`My Cases`, `Evidence
Feed`, `Loss Board`, `Carrier Loss Queue`, `Platform`, `Queues`), it recolours
the app to the public rust accent, and it leaves a simulated third-party toast
visible.

It has deliberately **not** been removed or restyled. §13.1 gates removal on an
approved replacement, restyling the imitation would still be an imitation, and
the landing page is public marketing — the decision is the product owner's, not
the implementer's. The related question of whether the public rust accent should
follow the product to violet (LP-FND-09) is a brand decision with the same owner.

---

## 13. Screenshot and landing-page production

### 13.1 Product-image rule

The landing page must show the shipping product with a deterministic fictional merchant. Do not:

- draw a separate HTML imitation;
- add navigation items that do not exist;
- recolour the app for marketing;
- edit values into screenshots;
- leave browser chrome, cursor, toast, tooltip, open menu, spinner, skeleton, or error visible; or
- hide a product defect with a crop.

Remove [`../public/hero-artifact.html`](../public/hero-artifact.html) from the active landing experience after the replacement is approved.

### 13.2 Capture format

| Property | Requirement |
|---|---|
| Engine | Repository-pinned Playwright with its bundled Chromium in the recorded Linux CI container |
| Master viewport | 1440×900 CSS pixels at device scale factor 2 |
| Secondary viewport | 1280×800 CSS pixels at device scale factor 2 when required by a slot |
| Supported-edge QA | 1024px CSS viewport |
| Theme | Light for primary marketing set; dark only if the landing narrative explicitly uses it |
| Locale/timezone | `en-GB`, `Europe/London`, recorded in manifest |
| Colour/fonts | sRGB; locally served production fonts; wait for `document.fonts.ready` |
| Data | Dedicated deterministic marketing merchant with recorded seed revision |
| Time | Validated frozen `captureNow` shared by server and client |
| Motion | Settled through named `data-capture-ready`; not hidden by arbitrary sleep |
| Output | Lossless master plus reviewed WebP/AVIF |
| Diff | Playwright screenshot comparison, colour threshold 0.2 and `maxDiffPixelRatio: 0.001` |
| Masks | No content masks; freeze the source instead. Capture-owned caret/pointer/scrollbar treatment may not change layout |
| Manifest | App commit, seed revision, clock, route/scope, browser version, container digest, viewport, DPR, crop, slot, and encoded checksum |
| Stability | Two clean runs in the same recorded environment meet the diff threshold |
| Privacy | Automated rendered/accessibility-tree deny-list plus human review |

`data-route-ready`, `data-route-state`, and `data-capture-ready` use the exact semantics in §7.7. Arbitrary waits never substitute for them.

Landing slots:

| Slot | Source crop from master | Desktop display | 2× encoded output |
|---|---:|---:|---:|
| Hero product focus | 960×600 | 760×475 | 1520×950 |
| Feature analytical focus | 760×475 | 620×388 | 1240×776 |
| Detail/evidence focus | 800×600 | 620×465 | 1240×930 |
| Narrow landing crop | 800×600 | 343×257 | 686×514 |

The full 1440×900 master is evidence and crop source; it is not automatically placed at a size that makes its text unreadable. Crops preserve enough real shell for credibility and may not hide a defect.

### 13.3 Candidate capture set

Produce five to seven final images with non-overlapping stories:

| Candidate | Story |
|---|---|
| Overview | Immediate operational clarity and value trend |
| Cases registry | Prioritised investigation workflow |
| Case detail | Evidence, reconciliation, and supervised decision |
| Recovery or Losses | Value movement and causal insight |
| Customer detail | Unified customer/order/case intelligence |
| Reports | Analytical depth and drill-down |
| Integrations | Credible data coverage and freshness |

Settings, Rules, Flows, and Notifications still require full product quality even if they are not selected for marketing.

### 13.4 Capture review

At the actual landing display size, a reviewer must be able to identify within five seconds:

- the page;
- the main value or problem;
- the selected/current state;
- the available primary action; and
- the evidence that the product is real.

At the final encoded slot, page title, primary value/problem, selected state, primary action, chart title/current series, and critical status must each retain at least a 10px raster height at 1× display and be readable without zoom. Tertiary metadata may act as texture; it may not carry the claim.

If the screenshot requires zooming or narration to understand, the product composition or crop is not finished.

---

## 14. Stripe-level quality scorecard

This scorecard translates “could stand next to Stripe” into a release gate without requiring imitation.

Score every renderable route from 0 to 4:

| Dimension | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Purpose and hierarchy | Unclear | Competing reads | Understandable after scanning | Clear first read and action | Immediate, unusually strong hierarchy |
| Composition | Broken | Template/card soup | Serviceable | Purpose-built and balanced | Exemplary spatial control |
| Typography | Clipped/inconsistent | Several local systems | Mostly consistent | Exact and legible | Exceptional rhythm at full/capture size |
| Colour | Random/misleading | Inconsistent accent | Restrained but anonymous | Coherent accent and semantics | Distinctive with perfect restraint |
| Data story | False/missing | Weak or redundant | Useful summary | Question-led and truthful | Comparative, drillable, decision-shaping |
| Chart/work-surface craft | Dead/noisy | Thin or awkward | Functional | Substantial and polished | Benchmark-quality craft |
| Interaction and motion | Broken/distracting | Inconsistent | Basic feedback | Responsive and reduced-motion safe | Spatially coherent and exceptionally calm |
| States and data truth | Misleading/broken | Major gaps | Main state works | Relevant states designed | Every transition/state reinforces trust |
| Accessibility | Blocking failure | Serious gap | Basic compliance | Strong keyboard/screen-reader/contrast | Excellent across forced colour and preferences |
| Responsive behavior | Overflow/clipping | Major compromise | Fits | Intentional reflow | Equally composed across supported widths |
| Screenshot credibility | Cannot be used | Looks unfinished | Needs careful crop | Ready as product proof | Landing hero quality without concealment |
| Product credibility | Developer artefacts/errors | Several visible seams | Mostly polished | No trust-breaking seam | Feels mature in every detail |

Pass rules:

- no dimension below 3;
- a route’s normalized score is `sum / (4 × applicable dimensions)`;
- normal renderable routes score at least 89.5%;
- flagship routes in Phase LP3 and final marketing captures score at least 95.8%;
- `Data story` may be N/A only for auth, legal, redirect-free public editorial, and configuration tasks with no truthful analytical question;
- `Chart/work-surface craft` remains applicable to the dominant form, document, table, builder, timeline, or process surface even when no chart exists;
- N/A removes the dimension from both numerator and denominator and requires a one-line rationale;
- redirects are not visually scored; they pass destination, query/hash/context, and no-flash gates;
- no P0 or P1 defect may be averaged away by a high score elsewhere; and
- two reviewers independently score flagship and capture-candidate routes.

Before LP3 review, reviewers jointly calibrate on one analytical, one operational, and one chart-free screen. A difference above one point on any dimension is discussed; until resolved, the lower score is binding. Reviewers record evidence, not taste-only adjectives.

---

## 15. Verification and acceptance

### 15.1 Automated checks

Use the existing stack. Extend it only where shipped behavior lacks direct coverage:

```bash
npm run lint
npm run typecheck
npm run lint:authenticated-design
npm run verify:ui-parity
npm run build
```

Create these named, non-overlapping programme commands:

```bash
npm run verify:living-precision
npm run test:living-precision:components
npm run test:living-precision:a11y
npm run capture:living-precision
npm run capture:living-precision:verify
```

- `verify:living-precision` owns parsed token/style/legacy-system guardrails and the R01–R64 manifest.
- `test:living-precision:components` owns adaptive metrics, surface anatomy, state machines, refresh ordering, and chart data contracts.
- `test:living-precision:a11y` owns representative keyboard, screen-reader semantics, reduced motion, forced colour, target size, and overlay focus.
- `capture:living-precision` owns the exact recorded environment and outputs.
- `capture:living-precision:verify` performs the second clean run, pixel comparison, privacy scan, transient-state scan, and encoded-slot checks.

Each phase records commands, captures/contact sheet, scorecards, defects, and decisions in `docs/phase-reports/living-precision/phase-lpN.md`. A command proves shipped behavior; do not build tests whose main subject is the report file.

Add focused checks for:

- prohibited literal colour and superseded chart-token use;
- computed values and contrast for every light/dark action, link, focus, selection, semantic, and meaningful chart-mark role;
- adaptive metric layouts for 1–6 items;
- chart keyboard/tooltips/data-table equivalence;
- chart state rendering and mixed-currency prevention;
- reduced-motion behavior;
- valid route links and redirects;
- no raw developer artefacts in merchant-primary UI;
- route-ready, console, request, hydration, and layout-shift failures;
- deterministic capture and privacy; and
- visual regression of shared primitives and exact marketing states.

### 15.2 Required visual matrix

| Coverage | Viewports/states |
|---|---|
| 58 production renderable routes | Populated light mode at 1440×900 |
| 2 development harnesses | Development visual proof plus production-build 404 |
| 4 redirect routes | Destination, query/hash preservation, and no theme flash |
| Every authenticated page family | Populated at 1024px |
| Flagship routes | 1440×900, 1280×800, 1024px; light/dark; reduced motion |
| Shared components | Default, hover, focus, active, selected, disabled, loading, invalid; icon-only names and 24×24 target/spacing |
| Shared route states | Loading, empty, filtered-empty, partial, stale, disconnected, error, denied, not-found |
| Charts | Populated, comparison, selected mark, loading, empty, partial, stale, error, reduced motion, forced colour; keyboard roving focus and 24×24 hit target |
| Overlays | Keyboard open/close, focus trap, restoration, reduced motion |
| Landing captures | Full size and exact encoded display size |

### 15.3 Manual checks

- full-size visual review at 100%;
- exact landing-size review;
- keyboard-only route completion;
- screen-reader spot check of page title, controls, chart summary/table, data table, drawer/dialog, and async feedback;
- greyscale and colour-vision simulation;
- forced-colour mode;
- text-spacing override;
- 200% zoom while the effective viewport remains supported;
- product-truth and financial reconciliation; and
- privacy review of visible and accessible strings.

### 15.4 Iteration protocol

No phase is accepted on its first visual render.

For each page family:

1. implement the shared system;
2. capture at 1440×900 and 1024px;
3. review hierarchy, colour balance, geometry, liveness, states, and data truth;
4. compare with the official benchmark references;
5. record defects;
6. revise;
7. recapture;
8. obtain independent design and engineering review; and
9. close only when the scorecard passes.

An iteration that changes only polish still requires screenshot comparison. An iteration that changes data, interaction, or component behavior requires the focused functional and accessibility checks as well.

---

## 16. Prohibited outcomes

The implementation fails if it produces any of the following:

- a new accent per route;
- violet success/error badges;
- green/red categorical charts with no semantic meaning;
- a rainbow legend for ordinary categories;
- bars thinner than 12px in a normal desktop chart;
- a wall of equal-weight KPI cards;
- more charts that repeat the same metric rather than answer new questions;
- generic charts on configuration/legal/task routes;
- large empty regions caused by fixed four-column metrics;
- chart axes or labels clipped at supported widths;
- nested bordered cards used as the default composition;
- dense rows made from several adjacent pills;
- prose, KPI, and rail repeating the same count;
- page-local headers, radii, shadows, typography, or filter placement;
- raw JSON, UUIDs, database enums, or internal field names as primary merchant UI;
- motion that bounces, loops decoratively, delays work, or ignores reduced motion;
- count-up animation from zero for financial values on page load;
- a loading skeleton whose geometry does not match the result;
- an indefinite loader or silent required-request failure;
- a screenshot-only product skin;
- landing artwork showing features or navigation that do not ship; or
- a visual score that is used to excuse a broken or misleading state.

---

## 17. Definition of done

The programme is complete only when:

1. This specification and the authenticated contributor rules describe the same implemented target.
2. All 58 production surfaces and two development harnesses in §9 have populated 1440×900 proofs and pass §14; both development routes also 404 in production, and the four redirects pass destination, context-preservation, and no-flash checks.
3. Every authenticated page family passes at 1024px without page-level overflow or clipped primary controls.
4. Every relevant loading, empty, filtered-empty, partial, stale, disconnected, error, denied, and not-found state uses the resolved route’s geometry and shared state language.
5. The violet accent is coherent across navigation, actions, selection, focus, charts, entry, onboarding, and public product presentation.
6. Semantic colours are used only for meaning and no ordinary chart category borrows them.
7. Every data-rich primary route has its specified question-led visual; every intentionally chart-free route remains purpose-built and visually complete.
8. All bar, plot, label, line, legend, tooltip, interaction, and drill-down requirements in §6 pass.
9. Every interactive component and chart satisfies the motion, feedback, reduced-motion, keyboard, screen-reader, contrast, and forced-colour requirements.
10. The surface, metric, chart, detail, settings, table, and route-state systems are consolidated; superseded active primitives and instructions are removed.
11. Every P0/P1 credibility blocker in §10 is fixed and there are zero uncaught errors, hydration warnings, failed required requests, hanging loaders, or broken internal links in the final sweep.
12. Financial, date-range, currency, source, and status values reconcile across summary, chart, table, detail, and export.
13. The landing page uses deterministic captures of the shipping product and no active fake product artifact.
14. The final capture set is privacy-safe, truthful, stable within the 0.1% threshold, and legible at its actual landing-page size.
15. Two independent reviewers approve the flagship and final capture scorecards with no unresolved concern.

Until all 15 conditions pass, the status is:

> **IN PROGRESS — not screenshot-ready**

The only successful final status is:

> **LIVING-PRECISION COMPLETE / CAPTURE-READY**
