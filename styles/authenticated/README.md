# Authenticated design system

Single source of truth for every visual value used by `app/(app)/**` and the authenticated-consumed parts of `components/**`. If you're building or editing an authenticated surface, styles come from here — never invent a new colour, radius, shadow, or control height locally.

This is an infrastructure/consolidation layer, not a redesign. Every value here was relocated from the pre-existing `app/(app)/authenticated.css` (see `docs/design/authenticated-style-system-audit.md` for the full "what came from where" trace) — nothing was changed to make the product look different. Final craft decisions (button radius, pill shape, badge palette, chart palette) are deferred to a later pass; see `docs/design/authenticated-style-system-audit.md` and `docs/design/authenticated-component-migration-register.md` for what's tracked as remaining work.

## Entry point

`index.css` is the **only** authenticated stylesheet entry point. It's imported from three route-layout files (`app/(app)/layout.tsx`, `app/onboarding/layout.tsx`, `app/audit-running/page.tsx`) — all three import the same relative path, `../../styles/authenticated/index.css`. Do not add a fourth import site; do not import any file in this folder except `index.css` from application code.

## File map

| File | Contents |
|---|---|
| `tokens.css` | Surfaces, ink/text, borders, brand/accent, geometry (radius/shadow/focus), density (control heights), plus the `--ua-*` alias layer (surfaces/text/borders/radius/shadow/control-dimensions/spacing/motion/z-layers) |
| `status.css` | Semantic/risk/severity/gauge colour tokens, plus `--ua-success/-warning/-critical/-info` (+ `-bg`/`-border`) aliases |
| `typography.css` | Font stacks + `--ua-text-*` named type-role tokens |
| `foundations.css` | Canvas/base text rendering, selection, focus-visible, reduced motion, logo mark, scrollbar |
| `controls.css` | Base input/button/link visual contract (component-level variants live in `components/ui/*.tsx`) |
| `surfaces.css` | Sidebar/header chrome, identity tile, focal/section panels, metric card, empty-state visual |
| `tables.css` | Table shell/header/row base rules |
| `overlays.css` | Documents where modal/drawer/tooltip/toast styling actually lives (component TSX, not CSS) and the one known gap (Toast's DOM-sibling issue — see audit) |
| `states.css` | Documents the three still-separate loading/skeleton systems (not unified in this pass) |
| `responsive.css` | Shared responsive density override |

## The `--ua-*` alias layer

Every token above also has a `--ua-`-prefixed name (e.g. `--ua-radius-card: var(--radius-md)`). These are declared once in the light-mode block and are **not** re-declared in the dark-mode block — dark values flow through automatically, because a custom property's `var()` reference resolves against the nearest declaration of the *referenced* property at the point of use, not at the point where the alias itself was declared. Since the dark-mode selector (`:root[data-theme="dark"] .ua-app`) redeclares the base variables (`--surface-base`, `--critical`, etc.) that the `--ua-*` aliases point to, any element under that scope automatically gets the dark value with zero extra code.

New and migrated code should read `--ua-*` names. Existing code reading the older unprefixed names (`--accent`, `--radius-md`, `--shadow-md`, …) keeps working unchanged during the transition — both names resolve to the same value today.

### Known mismatches the alias layer surfaces honestly, not silently

- **Control radius**: buttons use `--radius-sm` (4px); inputs/selects use `--radius-md` (6px). `--ua-radius-control` forwards to 4px (matches Button); a separate `--ua-radius-input` forwards to 6px (matches Input/Select) rather than forcing one onto the other's current value. Converging these is a craft-pass decision, not made here.
- **Card radius**: `Card.tsx`/`SectionCard.tsx`/`ModuleCard.tsx`/`MetricCard.tsx`/`Modal.tsx`/`DataTable.tsx` all use `--radius-md` (6px) — `--ua-radius-card`/`--ua-radius-overlay` forward to that. `PanelCard`'s `app`/`appMuted`/`appInset` variants (in `components/ui/LandingPrimitives.tsx`, consumed 39× across the authenticated app) use `--radius-lg` (8px) instead — a real, pre-existing inconsistency, tracked in the migration register, not fixed here.

## Component taxonomy — one primitive per situation

**Buttons** — `components/ui/Button.tsx` / `ButtonLink.tsx`. Variants: `primary`, `cta`, `secondary`, `ghost`, `danger`, `link`. All share height/radius/typography/focus/disabled treatment from `buttonStyles.ts`. There is no canonical `IconButton` yet — see the migration register.

**Status badges** — `components/ui/StatusBadge.tsx`. Non-interactive. Communicates neutral/informational/warning/critical/success. Do not build a page-specific status badge; if a status doesn't fit the existing tone map, extend `STATUS_TONES`, don't hand-roll a pill.

**Badge** — `components/ui/Badge.tsx`. Generic labelling (not lifecycle status). Distinct height/radius/case convention from `StatusBadge` intentionally — they solve different problems (see the migration register for where this line has blurred in practice).

**Filter chips** — no canonical component exists yet. `contracts.ts` in this folder defines the intended visual contract (unselected/hover/selected/disabled) so whoever builds the component next has a token-driven starting point instead of inventing colours. Filter chips must never borrow semantic warning/success/critical colour merely because they're selected — selection uses `--ua-surface-selected`/`--ua-border-focus`, not a semantic tone.

**Segmented controls** — no canonical component exists yet either; same `contracts.ts` treatment. Use only for mutually exclusive views/sort choices — one container, one height, one selected-state treatment, not per-segment pill styling.

**Cards and panels** — `components/ui/Card.tsx` (`raised`/`overlay`/`flat`) is authoritative going forward. `SectionCard`/`ModuleCard` wrap it. `PanelCard` (`LandingPrimitives.tsx`) remains in heavy authenticated use today (see mismatch note above) and is not migrated in this pass — do not add *new* authenticated call sites of `PanelCard`; use `Card`/`SectionCard` instead.

**Tables** — `components/ui/DataTable.tsx` is authoritative. Nine hand-rolled `<table>` implementations exist today (see migration register) and are not migrated in this pass — do not add a tenth.

## Exception mechanism (for the lint guard in `scripts/check-authenticated-design.mjs`)

Hardcoded colour/radius/shadow values are flagged by the authenticated design lint. Documented exceptions:

- **Data visualisation** — chart series colours may be literal when they encode a specific semantic data mapping (not a component's chrome). Prefer referencing `--ua-success`/`--ua-warning`/`--ua-critical`/`--ua-info` where the semantics match; only use a literal value for a genuinely chart-specific hue with a comment explaining why.
- **Provider/third-party brand marks** — a connector's own logo colour (e.g. Shopify green, Gorgias mark) is not a product theme choice and may be literal.
- **`styles/authenticated/tokens.css` and `status.css` themselves** — these are the token *definitions*; they are excluded from the hardcoded-value scan by design (that's where hex values are supposed to live).

Anything else — a literal hex/rgb/hsl colour, an arbitrary `rounded-[Npx]`, an inline `boxShadow`/`borderRadius` — should reference a token instead. If you believe you have a genuine new exception category, add it to the `ignored`/exception list in `scripts/check-authenticated-design.mjs` with a comment explaining why, rather than working around the lint.
