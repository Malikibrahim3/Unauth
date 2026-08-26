# Unauth Evidence Operations Design System

Status: current visual authority
Scope: entire website; public and entry surfaces are light-only, authenticated product surfaces are light-first with an optional dark theme
Mode: light default; authenticated dark available only in Settings → Appearance
Implementation root: `styles/operations/index.css`

## Product thesis

Unauth is a quiet evidence console for operators deciding what should happen after a post-purchase problem. The interface must make it fast to scan a queue, open a record without losing context, distinguish evidence from recommendation and merchant action, and understand the financial consequence without losing provenance.

Linear is a craft reference for density, hierarchy, list/detail continuity, command access, and restrained surfaces. It is not product, copy, feature, or pixel authority. Unauth keeps its own evidence, recovery, financial, source-health, and permission language.

## Authority and boundaries

Authority order:

1. `PRODUCT.md` for product, evidence, financial, mutation, permission, and provider truth.
2. `lib/surfaces/manifest.ts` for routes, owners, dispositions, states, overlays, and the 209-contract scenario ledger.
3. `lib/navigation/appRoutes.ts`, `lib/navigation/aliases.js`, and `next.config.js` for navigation and redirects.
4. This document for presentation, implementation, and verification rules.
5. Existing accepted behavioural tests.
6. The local Linear gallery as dated craft evidence only.

Public surfaces (landing, pricing, demo, legal, not-found, and global error), auth routes, and onboarding are permanently light and cannot read the authenticated theme cookie. The authenticated product reads a device-local theme cookie and exposes the only switch in Settings → Appearance. Product roots must never import the public compatibility cascade.

The signed-in product remains desktop-only below 1024px. Entry and onboarding routes remain responsive through 390px.

## Foundations

All new product tokens use `--uo-*`.

| Role | Token | Value |
|---|---|---:|
| Canvas | `--uo-canvas` | `#F7F8FA` |
| Navigation rail | `--uo-rail` | `#FFFFFF` |
| Primary surface | `--uo-surface` | `#FFFFFF` |
| Raised surface | `--uo-surface-raised` | `#FFFFFF` |
| Hover surface | `--uo-surface-hover` | `#F5F6F8` |
| Selected surface | `--uo-surface-selected` | `#F0F1F4` |
| Subtle border | `--uo-border-subtle` | `#ECEEF1` |
| Default border | `--uo-border` | `#DEE1E6` |
| Strong border | `--uo-border-strong` | `#C9CDD4` |
| Primary text | `--uo-text` | `#111318` |
| Secondary text | `--uo-text-secondary` | `#454B55` |
| Tertiary text | `--uo-text-tertiary` | `#6B7280` |
| Disabled text | `--uo-text-disabled` | `#A6ACB5` |
| Interaction accent | `--uo-accent` | `#5B57D6` |
| Accent hover | `--uo-accent-hover` | `#4946BC` |
| Focus/accent text | `--uo-focus` | `#5B57D6` |
| Information | `--uo-info` | `#2563A9` |
| Success | `--uo-success` | `#247A54` |
| Warning | `--uo-warning` | `#8A5A00` |
| Critical | `--uo-critical` | `#B23A43` |
| Source evidence | `--uo-evidence` | `#247388` |

The light foundation is deliberately white-heavy: white work surfaces sit on a near-white canvas and are separated by cool-grey hairlines and restrained shadows. The authenticated dark option retains the existing graphite hierarchy without changing layout, density, copy, assets, or data semantics. Violet is a sparse interaction and Unauth-identity accent, never a generic loss, fraud, warning, or success colour. Semantic colours always include a label or icon. Soft semantic fields use 10–12% opacity.

Typography uses Inter with the system sans fallback. Machine identifiers use native `ui-monospace`; ordinary labels and money never use mono. Page titles are 22/28, section titles 14/20, body 13/20, compact rows 12/18, captions 11/16, and key metrics 24–32px. Use weights 400, 500, and 600 only. Money, counts, dates, and tables use tabular numerals.

## Geometry

- Navigation rail: 220px.
- Utility bar: 44px.
- Page header: 64px target.
- Content gutter: 24px; dense workbenches may use 16px.
- Table rows: 32px compact or 40px standard.
- Controls: 28px, 32px, or 36px; responsive entry controls are at least 44px.
- Inspector: 360px target, bounded to 320–440px.
- Drawer: 420px. Dialog: 520px. Command palette: 640px.
- Radius scale: 4, 6, 8, 10, and 12px. Pills are only tags, counts, and avatars.
- Use borders and tonal separation. Shadows are reserved for overlays and the isolated entry task plane.

No decorative gradients, glow, glass, giant cards, nested card mosaics, or marketing-scale headings are permitted inside the product.

## Shell and interaction

The shell has a 220px permission-filtered navigation rail, a 44px utility bar, and one dominant work plane. Active navigation uses a neutral selected field, a one-pixel violet locator, and no status colour. Global search remains Cmd/Ctrl+K, focus-trapped, escapable, and permission-aware.

Hover feedback is 80ms, selection and control transitions 120ms, and overlays 160ms. Movement never exceeds 4px. Route content does not fly or fade in. Reduced-motion removes non-essential transition and movement.

## Canonical surface families

- Overview and reports: one joined metric ledger, one divided analytical workbench, and supporting rows separated by hairlines; never a floating-card dashboard.
- Work, cases, customers, notifications, search: dense registry or inbox with selected-object inspector.
- Record details: identity header, central activity/evidence history, facts and actions rail.
- Reconciliation, evidence building, rules, flows, and CSV intake: split workbench with persistent context and explicit review boundary.
- Recovery: restrained stage board/list without oversized coloured columns.
- Sources: evidence-layer summary plus searchable integration registry. Provider marks aid scanning but never replace names or capability text.
- Settings: vertical local navigation, readable form plane, explicit save state, and isolated destructive actions.
- Help: compact readable documentation rather than a marketing layout.
- Auth/reset/signup: minimal light entry shell with a centred 420px task plane.
- Onboarding: source-connection workspace with truthful capability, connection, health, freshness, and returned-data distinctions.

## Truth grammar

Every surface preserves these distinctions:

- unknown, unavailable, partial, stale, mixed-currency, available, and verified zero;
- evidence received versus evidence missing;
- rule result or recommendation versus merchant decision;
- merchant decision versus external provider action;
- expected recovery versus filed, accepted, paid, or written off;
- provider capability versus credentials, connection state, health, freshness, and proof returned.

Money stays in integer minor units and always retains currency, period, source, freshness, and reconciliation scope. Missing data never becomes zero, a zero bar, or a completed-looking chart. Every chart provides its underlying data and an unavailable explanation.

## Components and states

Canonical families are `AppShell`, `EntryShell`, `NavigationRail`, `UtilityBar`, `CommandMenu`, `PageHeader`, `Registry`, `DataTable`, `SplitWorkbench`, `Inspector`, `EvidenceTimeline`, `MoneyValue`, `ChartFrame`, `StatusIndicator`, form controls, overlays, and `OperationalState`.

Overlays use portal layering, focus trap/return, Escape, a defined outside-click policy, and pending-dismissal protection. Loading skeletons reserve final geometry and never invent values. Empty, unavailable, forbidden, stale, partial, error, and retry states remain bounded inside the owning work area.

## Coverage and verification

`lib/surfaces/manifest.ts` records a visual disposition for all 64 page modules and exports the 209-contract minimum scenario ledger: 205 visual contracts and four adapters. The verifier proves declaration coverage and fails when a declared replace-owned contract is absent from the ledger, when the signed-in root loads the frozen cascade, when public routes can consume the authenticated dark selector, or when an in-scope old token/design contract returns. Runtime capture and browser tests—not this static ledger alone—prove that both light default and authenticated dark render.

The CSS migration has three deliberate levels. Semantic `--uo-*` tokens are design authority. `--uo-route-*` aliases preserve reusable component contracts while mapping them into the semantic light system. `--uo-raw-*` aliases retain literal source-token compatibility inside the isolated operations cascade. Import order is raw palette, route foundations/families, then semantic Evidence Operations overrides; the authenticated dark override is scoped to `[data-auth-theme="dark"]` on the product root.

Reusable truth and readiness owners include `MoneyValue`/`UnavailableValue`, `Figure`, `Provenance`, `BeforeYouConfirm`, `RegistryToolbar`, `AuditTimeline`, and `RouteReadinessBoundary`, alongside the shell, registry, workbench, inspector, overlay, and operational-state families above.

Completion evidence includes static checks, production build, representative runtime journeys, keyboard/focus checks, current screenshots, and pre/post frozen-public hashes. Safe fictional local fixtures are used; visual proof never confirms destructive actions or external mutations.

## Implementation contract

`styles/operations/index.css` is the only signed-in and entry presentation entry point. It composes the operation foundations, semantic evidence tokens, route bridges, and the scoped authenticated theme. CSS modules own route-specific composition. `styles/authenticated/index.css` is frozen compatibility code and must not be imported by product roots.

`app/(app)/layout.tsx` owns authentication, tenancy, permissions, connection state, providers, telemetry, and the product root. `AuthenticatedDesignShell` owns the navigation rail, utility bar, command access, source health, notifications, account access, and route work plane; it does not own colour-mode state. Below 1024px, `DesktopRequiredBoundary` replaces signed-in navigation. Entry roots use `.uo-entry` and remain responsive through 390px.

Every in-scope control and state must preserve visible labels, keyboard and focus behaviour, geometry-stable loading, truthful unavailable/error/empty states, and pending-dismissal protection for consequential overlays. Recommendations never become decisions; provider capability never implies credentials, health, freshness, or returned evidence; money retains integer minor units, currency, scope, source, and reconciliation state.

The implementation purge fails on old `--ua-*` or `--c-*` product tokens, Challenge-named presentation modules, old mode markers, or imports of the frozen public cascade from `.uo-product` or `.uo-entry`. Compatibility code may remain only inside its isolated public dependency closure.

Verification order is: surface manifest, authority/docs, environment and Vercel contracts, typechecks, lint, Jest, extension build, production build, then representative browser journeys and keyboard/focus/reduced-motion checks. Captures are evidence only; they never confirm destructive actions, publication, provider connection, billing, or real-product mutation.
