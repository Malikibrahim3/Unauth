# Ramp Redesign — Full-App Implementation Doc

**Goal:** Rebuild the entire Unauth product — marketing landing through every authenticated screen — to look and feel like [ramp.com](https://ramp.com). Adopt Ramp's *design language* (not its branding): neutral white/black surfaces, a single sparing lime accent, a clean neutral grotesque at scale, flat hairline-bordered cards, generous whitespace, and crisp data tables.

**Author's note on scope (binding):** *Everything changes.* No component is skipped. Each gets an explicit verdict — **KEEP / RESTYLE / REPLACE / DELETE** — and a KEEP must justify why it already meets the Ramp bar. Default posture is change; survival is earned.

**Hard constraints**
- **No hand-authored SVG.** No `<svg>`/`<path>` written in JSX. Use `lucide-react` (already a dep), charting libraries (echarts/recharts, already deps), CSS (gradients/borders), or real image assets in `public/`. Existing file-based brand logos (`public/integrations/*.svg`, `public/logo-*.svg`) are assets, not authored markup — those stay.
- **Do not touch business logic.** Per `CLAUDE.md`: no changes to scoring formulas, weights, matching/cluster logic, or the `lib/engine`/`lib/scorer` stack. This is a *presentation* rebuild only.
- **No `as any`, no `// eslint-disable`.** Fix types properly (several existing `as any` sites are flagged below — clean them as you pass through).

---

## 0. The surgical thesis — three stable surfaces

The app is large (~75 page routes, ~200 components) but the visual system funnels through three narrow chokepoints. Change these and the look cascades; everything else is downstream.

| Surface | Where | Strategy |
|---|---|---|
| **Design tokens** | `app/globals.css` `:root` CSS variables → mapped to Tailwind names in `tailwind.config.ts` | **Keep every variable *name*. Change only the *values*.** Every `style={{ color: 'var(--ink-primary)' }}` and every `text-ink-primary` class instantly adopts the new palette. |
| **Primitive barrel** | `@/components/ui` (`components/ui/index.ts`) — `Button`, `Modal`, `Drawer`, `DataTable`, `Card`, `Badge`, etc. | **Keep the barrel exports and prop APIs stable. Swap implementations behind them** (shadcn/Radix internals). Call sites don't change. |
| **Fonts** | `app/layout.tsx` — `next/font/google` assigns families to CSS vars (`--font-dm-sans`, `--font-bricolage`, `--font-serif`) | **Keep the var names. Load different fonts into them.** Assign Inter to `--font-dm-sans` and the whole body re-types with zero `globals.css` edits. |

This is why the rebuild is *surgical*: we never do a 200-file find-and-replace. We change values at the root and implementations behind stable names.

### Current state (what the inventory found)
- **Palette:** warm "rust / copper / paper" — `--surface-base #F4F3F1`, `--ink-primary #1A1612`, brand accent burgundy `--copper-bright #8A2828` / `--brand-rust #7B2D26`, primary action near-black-warm `--action-primary #1C1008`. Risk tiers are earthy/warm.
- **Fonts:** Bricolage Grotesque (display), DM Sans (body), DM Mono (numerals), Source Serif 4 (wordmark only).
- **Token fragmentation:** three generations coexist — `--ink-*`/`--surface-*`/`--radius-md` (newest), `--text-*`/`--bg-*`/`--radius-N` (spec), and raw hardcoded hex (landing, a few pages). We exploit this (change all the canonical roots) and partially clean it (Phase 7).
- **Theme:** light is default (`:root`); dark via `:root[data-theme="dark"]` + `.dark`, toggled by `ThemeBootstrap` reading `localStorage['unauth.theme']`. **We keep light as default** (per UX guardrail) and reskin dark to a Ramp-charcoal variant.

---

## 1. Open decisions (defaults chosen — override if you disagree)

These are foundational; I've picked the obvious Ramp-faithful default for each so the doc is concrete. Flag any you want changed before Phase 0.

1. **Accent lime** — default `#C9F94B` (with near-black `#16170D` text on it). This is the single tunable brand value; every lime reference reads one token. *Tune the exact hex to taste in one place.*
2. **Sans font** — default **Inter** (the closest excellent free analog to Ramp's proprietary grotesque). Premium alternative: **Geist** (Vercel). Either is loaded into the existing `--font-dm-sans` var name.
3. **Product identity** — we **keep "Unauth"** as the product name/wordmark, restyled in Ramp's visual language. We are matching Ramp's *design*, not rebranding the company to Ramp.
4. **Lime usage** — *sparing.* In Ramp's product, lime appears only on marquee CTAs ("New vendor"), count/highlight chips, and gauge fills. The workhorse primary button stays **black**. Marketing pages use lime CTAs liberally; product pages do not.

---

## 2. The Ramp design language, decoded

What actually makes the reference screenshots read as "Ramp":

1. **Color restraint.** ~95% of every screen is white / off-white / black / gray. Lime is a punctuation mark, never a wash. There is no second brand color.
2. **Neutral grotesque at scale.** Page titles are large (32–48px) and tight (-0.02 to -0.03em tracking). Marketing heroes are enormous (clamp up to ~84px). The typeface is neutral and confident — no decorative contrast.
3. **Flat, hairline-bordered surfaces.** Cards are white on white, separated by 1px borders (`#E7E4DE`-class), *not* drop shadows. Definition comes from **borders + whitespace + type hierarchy**, not elevation. Shadows appear only on true overlays (dropdowns, modals, popovers).
4. **Generous whitespace.** Big padding, big gaps, big titles, airy tables. Density is achieved through alignment and tabular figures, not cramming.
5. **Tables are the product.** Clean rows with comfortable height, thin dividers, a small rounded logo/avatar + primary name + gray secondary line, right-aligned ghost actions (icon buttons / "Undo" text links), subtle row hover. (Reference: "Migrate payments".)
6. **Underline tabs** with count badges (Overview · Renewals · Migrate payments `70`).
7. **Arc gauges.** The Reporting page uses semicircular gauges with an orange→lime gradient arc. (Reference: Operational Efficiency / Money Saved / Compliance.)
8. **Faint dotted-grid background** on marketing surfaces — a subtle dot field behind hero/sections (CSS radial-gradient, *not* SVG).
9. **Pill chips** for counts/status; **rounded-8px** buttons and inputs; **rounded-12px** cards.

---

## 3. New design token system (Phase 0 — highest leverage)

Rewrite the **values** in `app/globals.css` `:root`. Keep every variable **name**. Below is the canonical Ramp-light set. (Token names map straight to the file's existing declarations — replace value-by-value.)

### 3.1 Surfaces & borders
```css
/* Surfaces — white content, faint off-white chrome/sunk */
--surface-base:    #FFFFFF;   /* content canvas (was #F4F3F1) */
--surface-raised:  #FFFFFF;   /* cards — defined by border, not bg */
--surface-overlay: #F6F5F2;   /* sidebar, subtle panels, hover wells */
--surface-muted:   #EFEEEA;   /* sunk wells, track fills */
--surface-input:   #FFFFFF;

/* Borders — light hairlines do the structural work */
--border-subtle:   #F0EEEA;
--border-default:  #E7E4DE;   /* the canonical hairline */
--border-strong:   #1A1A1A;   /* emphasis / focus borders */

/* Legacy/spec aliases — re-point to the above (names stay) */
--bg-canvas:       var(--surface-base);
--bg-surface:      var(--surface-raised);
--bg-surface-alt:  var(--surface-overlay);
--bg-surface-sunk: var(--surface-muted);
--bg-hover:        #F5F4F1;
--bg-selected:     #EEEDE8;
--bg-subtle:       var(--surface-overlay);
--border:          var(--border-default);
```
> **Sidebar note:** because `--surface-base` becomes white, the sidebar (which currently fills with `--surface-base`) must switch to `--surface-overlay` so the faint Ramp separation survives. One-line change in `SidebarAside.tsx` (Phase 2).

### 3.2 Ink (text)
```css
--ink-primary:   #1A1A1A;   /* near-black (was warm #1A1612) */
--ink-secondary: #5B5A53;   /* secondary gray */
--ink-tertiary:  #8C8A80;   /* muted / labels */
--ink-inverse:   #FFFFFF;
--text-subtle:   #A8A69B;
--text-disabled: #C4C2B8;
/* spec aliases */
--text:          var(--ink-primary);
--text-primary:  var(--ink-primary);
--text-secondary:var(--ink-secondary);
--text-muted:    var(--ink-tertiary);
--text-tertiary: var(--ink-tertiary);
--text-inverse:  var(--ink-inverse);
--text-link:     var(--ink-primary);   /* dark links, underline on hover */
--icon:          #57564F;
--icon-muted:    #9A988E;
```

### 3.3 Accent — black workhorse + sparing lime
```css
/* Workhorse primary = black (neutralize the old warm action color) */
--accent:              #1A1A1A;
--accent-hover:        #000000;
--accent-soft:         #F2F1EE;
--accent-fg-on-500:    #FFFFFF;
--action-primary:      #1A1A1A;
--action-primary-hover:#000000;
--action-primary-soft: #F2F1EE;
--accent-500:          #1A1A1A;
--accent-600:          #000000;
--accent-700:          #000000;

/* Lime — the ONE brand highlight. Used by: cta button variant, count chips, gauge fills, active-nav accent. */
--lime:        #C9F94B;   /* ← the single tunable brand value */
--lime-hover:  #BCEE3C;
--lime-fg:     #16170D;   /* near-black text/icon on lime — never white */
--lime-soft:   #F3FBD9;   /* faint lime tint for chip backgrounds */

/* Retire copper/rust → neutral dark (highlights) or lime (brand pops) */
--copper-bright: #1A1A1A;
--copper-mid:    #1A1A1A;
--copper-dim:    #EEEDE8;
--brand-rust:        #1A1A1A;
--brand-rust-hover:  #000000;
--brand-rust-soft:   var(--lime-soft);

/* Focus — subtle dark ring (lime is too low-contrast for focus) */
--focus-ring:   #1A1A1A;
--shadow-focus: 0 0 0 3px rgba(26,26,26,0.14);
```

### 3.4 Risk / status / severity (muted Ramp-modern, semantics preserved)
The fraud product *needs* semantic tiers; restyle them to Ramp's clean, slightly-desaturated palette. **Grade still means confidence, not verdict** (UX guardrail) — these colors render confidence/risk badges, not value judgments.
```css
--risk-critical: #C5443B; --risk-critical-bg:#FBEDEB; --risk-critical-bd:#E7B3AD; --risk-critical-fg:#B23A32; --risk-critical-line:#E7B3AD;
--risk-high:     #C2762E; --risk-high-bg:    #FBF2E8; --risk-high-bd:    #ECCDA9; --risk-high-fg:    #B36A26; --risk-high-line:    #ECCDA9;
--risk-medium:   #9A7A12; --risk-medium-bg:  #FAF5DE; --risk-medium-bd:  #E4D38C; --risk-medium-fg:  #8A6D10; --risk-medium-line:  #E4D38C;
--risk-low:      #2E7D5B; --risk-low-bg:     #E9F6EF; --risk-low-bd:     #ABDBC2; --risk-low-fg:     #277050; --risk-low-line:     #ABDBC2;
--risk-none:     #7C8A99; --risk-none-bg:    #EEF1F4; --risk-none-bd:    #CDD6DF;
--info:    #3B6FB0; --info-bg:#EDF3FB; --info-bd:#BCD2EE; --info-fg:#356399; --info-line:#BCD2EE;
--success: var(--risk-low);  --success-bg: var(--risk-low-bg);  --success-bd: var(--risk-low-bd);
--warning: var(--risk-medium); --warning-bg: var(--risk-medium-bg); --warning-bd: var(--risk-medium-bd);
--watchlist: #157C77; --watchlist-bg:#E6F4F2; --watchlist-bd:#A7D8D2;

/* Severity (feeds charts/badges) — neutral mapping */
--sev-definite:#C5443B; --sev-definite-fill:#FBEDEB;
--sev-probable:#C2762E; --sev-probable-fill:#FBF2E8;
--sev-neutral: #7C8A99; --sev-neutral-fill: #EEF1F4;
--sev-clear:   #2E7D5B; --sev-clear-fill:   #E9F6EF;

/* Reporting gauge gradient (orange → yellow → lime) */
--gauge-from: #F08C3C; --gauge-mid: #E8D43E; --gauge-to: var(--lime);
```

### 3.5 Radius (cards 12 / controls 8 / chips pill)
```css
--radius-xs: 4px;  --radius-sm: 6px;  --radius-md: 8px;   /* buttons, inputs, selects */
--radius-lg: 12px; /* cards */         --radius-xl: 16px;  /* big cards, modals */
--radius-pill: 9999px; --radius-full: 9999px;
--radius-1: var(--radius-xs); --radius-2: var(--radius-sm); --radius-3: var(--radius-md); --radius-4: var(--radius-lg);
```

### 3.6 Shadows (flat — overlays only)
```css
--shadow-0:  0 0 0 1px var(--border-default);                                   /* "card" = just a border */
--shadow-xs: 0 1px 2px rgba(20,20,20,0.04);
--shadow-sm: 0 1px 2px rgba(20,20,20,0.05), 0 1px 3px rgba(20,20,20,0.04);
--shadow-md: 0 4px 12px rgba(20,20,20,0.08), 0 2px 4px rgba(20,20,20,0.04);      /* dropdowns/popovers */
--shadow-lg: 0 12px 32px rgba(20,20,20,0.12), 0 4px 8px rgba(20,20,20,0.06);     /* modals */
--shadow-xl: 0 24px 60px rgba(20,20,20,0.16), 0 8px 16px rgba(20,20,20,0.08);
--shadow-1: var(--shadow-xs); --shadow-2: var(--shadow-sm);
--shadow-drawer: var(--shadow-lg); --shadow-modal: var(--shadow-lg);
```
**Rule:** product cards get `border` + *no shadow*. Reserve `--shadow-md`/`-lg` for floating layers.

### 3.7 Spacing & motion
- Keep the 4px spacing scale. **Increase application:** page padding `p-6 md:p-8` (from `p-4 md:p-6`); section gaps `gap-6`/`space-y-8`; table row height +4px. Ramp breathes.
- Motion stays **restrained** (UX guardrail): keep durations 120–200ms, `--ease-standard`. Keep subtle reveal/hover-lift; **delete** loud effects (meteors, border-beam, spotlight, animated grid).

### 3.8 Dark mode (secondary — reskin, keep light default)
Reskin the `:root[data-theme="dark"]` and `.dark` blocks to Ramp-charcoal: surfaces `#1A1A1A`/`#0F0F0F`/`#242424`, ink `#F5F5F3`/`#A3A199`, borders `#2C2C2A`, accent = lime (`--lime`), primary button = lime or white. Keep semantic risk fg colors, deepen their fills. Lower priority than light; do after Phase 4.

---

## 4. Fonts (Phase 0, with tokens)

Edit `app/layout.tsx` only. **Keep the CSS var names** so `globals.css` and `tailwind.config.ts` need no edits.

| Var name (unchanged) | Was | Becomes | Weights |
|---|---|---|---|
| `--font-dm-sans` (→ `--font-sans`) | DM Sans | **Inter** | 400, 500, 600, 700 |
| `--font-bricolage` (→ display/`--ua-font-display`) | Bricolage Grotesque | **Inter Tight** (or Inter) | 500, 600, 700 |
| `--font-dm-mono` (→ `--font-mono`) | DM Mono | keep DM Mono *(or Geist Mono)* | 400, 500 |
| `--font-serif` | Source Serif 4 | **drop** — re-point to sans | — |

- **Drop** the Bricolage and Source Serif imports. Load Inter into the `--font-dm-sans` variable, Inter Tight into `--font-bricolage`.
- The wordmark (`.ua-mark` in `globals.css`, ~line 1153) uses `font-family: var(--font-serif)` — repoint it to `var(--font-sans)` (Ramp's wordmark is a clean sans) and set its colors to ink `#1A1A1A` with an optional lime dot.
- **Type scale** (`globals.css` already defines `.page-title`, `.text-display-*`, `.t-*`, `.kpi-numeral`): retune for Ramp — tighten tracking on display to `-0.025em`, bump app page title to **36px / 600**, set marketing display-1 to `clamp(44px, 6vw, 84px) / 600 / -0.03em`. KPI numerals → sans + `tabular-nums` (Ramp shows big figures in the grotesque, not mono) while keeping a mono option.

---

## 5. Library strategy — add shadcn/ui, swap behind the barrel

The repo runs **Tailwind v4** (`@tailwindcss/postcss`, `@import "tailwindcss"`) and already has shadcn-compatible CSS vars (`--background`, `--primary`, `--card`, `--ring`, `--radius`) wired in `globals.css` + `tailwind.config.ts`. shadcn drops in cleanly.

**Setup:** `npx shadcn@latest init` (Tailwind v4 mode, CSS-vars on, base color neutral). Installs to `components/ui/` — **the same dir as the hand-rolled primitives, by design**: we replace them one file at a time and keep `components/ui/index.ts` exporting the same names + prop shapes, so the ~200 call sites importing `@/components/ui` never change.

| shadcn component to add | Replaces / powers | Notes |
|---|---|---|
| `button` | `Button` / `ButtonLink` internals | Keep our `variant` names (`primary`→black, `secondary`, `ghost`, `danger`, `link`) **+ add `cta`** (lime). CVA + token-driven. |
| `dialog` | `Modal` | Keep `Modal` wrapper API; Radix internals + focus trap for free. |
| `sheet` | `Drawer` | Keep `Drawer` API. |
| `tooltip` | `Tooltip` | Fixes token-namespace drift. |
| `select` | `Select` | **Fixes the `data:image/svg+xml` chevron with hardcoded hex** — Radix + lucide `ChevronDown`. |
| `dropdown-menu` | `AvatarMenu`, `ExportMenu` | |
| `tabs` | the ad-hoc `role="tablist"` toolbars (claims, reports, audit) + underline-tab look | |
| `command` (cmdk) | `CommandPalette` + `CommandPalette*` subfiles | **Kills the custom `PALETTE_ICONS` inline SVGs.** |
| `sonner` | `ClaimReviewToast` + ad-hoc toasts | One global toaster. |
| `input` | `Input` | Or just retoken existing. |
| `badge` | optional | Our tone system is richer — keep ours, retoken. |
| `skeleton` | `LoadingState`/`Skeleton` | Or retoken existing `.skeleton`. |

Already present and reused: `clsx`, `tailwind-merge`, `tailwindcss-animate`, `lucide-react`, `motion`, `recharts`, `echarts`+`echarts-for-react`, `reactflow`. No new chart libs needed.

**Tables:** keep our generic `DataTable` abstraction (it's good) — RESTYLE only. Do **not** pull in TanStack unless a page needs column virtualization.

---

## 6. No-SVG remediation (Phase 1)

Every hand-authored `<svg>` in JSX, with its replacement. (23 files flagged; the substantive ones below.)

| File | Offender | Replace with |
|---|---|---|
| `components/ui/Button.tsx` (17–32) | spinner `<svg>` | lucide `Loader2` (spin) |
| `components/ui/LoadingState.tsx` (116–130) | `Spinner` `<svg>` | lucide `Loader2` |
| `components/ui/DataTable.tsx` (78–95) | `SortIcon` triangle paths | lucide `ChevronUp`/`ChevronDown`/`ChevronsUpDown` |
| `components/ui/Select.tsx` (13) | `data:image/svg+xml` chevron, hardcoded `#8F816F` | shadcn Select (lucide `ChevronDown`) |
| `components/layout/AppHeader.tsx` | inline hamburger `<svg>` | lucide `Menu` |
| `components/layout/CommandPaletteInputBar.tsx` + `CommandPaletteResultsList.tsx` | custom search `<svg>` + `PALETTE_ICONS` map | lucide via cmdk |
| `components/ui/dot-pattern.tsx` | `<svg><pattern><circle>` | **CSS dotted-grid utility** (radial-gradient) — see §10 |
| `components/ui/animated-grid-pattern.tsx` | `<svg>` + `motion.rect` | **DELETE** (not Ramp) |
| `components/customers/[id]/CustomerProfilePageHero.tsx` (92, 109) | copy-button glyphs | lucide `Copy` |
| `app/(app)/audit/[runId]/transaction/[id]/page.tsx` (75–77) | back-chevron | lucide `ArrowLeft` |
| `app/(app)/customers/[id]/evidence/new/page.tsx` (38–44) | back-chevron | lucide `ArrowLeft` |
| `components/audit/RiskDistributionStrip.tsx` | `<svg>` accumulated `<rect>` strip | CSS flex segments **or** echarts (see §9) |
| `app/(public)/landing/_components/PipelineTabsParts.tsx` | play/pause `<svg>` | lucide `Play`/`Pause` |
| `app/(public)/landing/_components/{NetworkChart,MerchantDashboard}.tsx` | large hand-authored chart `<svg>` | **DELETE** (orphaned — see §8) |

**Allowed (not offenders):** `public/integrations/*.svg`, `public/logo-*.svg`, `favicon.svg` (file assets); `dot-pattern` *once converted to CSS*; any chart rendered by echarts/recharts (the library emits SVG — that's fine, we don't author it).

---

## 7. Component disposition — every primitive gets a verdict

`components/ui/` — nothing skipped:

| Component | Verdict | Action |
|---|---|---|
| `Button` / `buttonStyles` / `ButtonLink` | **REPLACE** | Rebuild on shadcn Button + CVA; keep variant names; add `cta` (lime); spinner→`Loader2`. |
| `Card` | **RESTYLE** | white + `--border-default` + `--radius-lg`, **no shadow**; keep `variant`/`density`. |
| `SectionCard` | **RESTYLE** | hairline header divider; 13→14px/600 title; airier padding. |
| `ModuleCard` | **RESTYLE** | retoken; `→` glyph → lucide `ArrowRight`. |
| `MetricCard` | **RESTYLE** | KPI numerals sans+`tabular-nums`; `↑↓›` glyphs → lucide `ArrowUp`/`ArrowDown`/`ChevronRight`; deltas use muted risk colors. |
| `Badge` / `badgeStyles` | **KEEP+RESTYLE** | tone system is good (Ramp-grade abstraction); retoken to muted palette; add lime `accent` tone; pill radius. |
| `GradeBadge` / `ConfidenceBadge` (+ `.styles`) | **RESTYLE** | product-semantic; keep logic, retoken to new sev/risk values. Preserve grade=confidence. |
| `PrivacyBadge` / `SensitiveField` | **KEEP+RESTYLE** | already lucide-based; retoken. |
| `Input` | **RESTYLE** (or shadcn) | `--radius-md`, hairline border, dark focus ring. |
| `Select` | **REPLACE** | shadcn Select (kills hardcoded-hex SVG chevron). |
| `Modal` | **REPLACE** | shadcn Dialog behind `Modal` API. |
| `Drawer` | **REPLACE** | shadcn Sheet behind `Drawer` API. |
| `Tooltip` | **REPLACE** | shadcn Tooltip. |
| `EmptyState` | **RESTYLE** | bigger type, lime CTA option, lucide icon tile. |
| `PageHeader` | **REPLACE** | one canonical Ramp header: large title (36/600) + subtitle + right-aligned actions + optional tabs/metricSlot; `›` → lucide `ChevronRight`. Becomes the single page-scaffold header (see §8). |
| `GradeHeader` | **RESTYLE** | retoken tile. |
| `LoadingState` / `Skeleton` / `Spinner` / `ErrorBoundaryUI` | **RESTYLE** | Spinner→`Loader2`; skeleton uses new surfaces. |
| `MotionWrap` | **KEEP** | restrained reveal/hover-lift fits Ramp; *justified KEEP*. |
| `UnauthLogo` | **RESTYLE** | CSS wordmark; repoint font to sans, ink `#1A1A1A`, optional lime dot. |
| `DataTable` / `dataTableStyles` | **KEEP+RESTYLE** | good generic; restyle to Ramp rows (logo/avatar + name + gray subline, ghost actions, +height, hover); SortIcon→lucide. *Justified KEEP — the abstraction is sound.* |
| `dot-pattern` | **REPLACE** | → CSS utility. |
| `animated-grid-pattern` | **DELETE** | not Ramp. |
| `border-beam` | **DELETE** | hardcoded burgundy; not Ramp. |
| `meteors` | **DELETE** | not Ramp. |
| `spotlight` | **DELETE** | not Ramp. |

---

## 8. App shell rebuild (Phase 2)

### 8.1 Sidebar — `components/nav/Sidebar*.tsx`, `SidebarNavItem.tsx`
Target the Ramp product rail (reference: Vendors/Reporting/Accounting screenshots).
- **RESTYLE.** Width 240px expanded / 56px collapsed (keep). **Background → `--surface-overlay`** (the faint off-white; base is now white). Right border `--border-default`.
- Nav items: keep lucide icons. Default ink-secondary; hover ink-primary + `--bg-hover`; **active = `--bg-selected` + ink-primary + a left lime accent bar** (Ramp marks active subtly — choose the lime bar *or* a subtle gray fill, not both loud). Count badges (claims open count) → **lime pill** (`--lime-soft` bg / `--lime-fg`), matching Ramp's `70` / `5` chips.
- Group labels: keep uppercase micro-label, ink-tertiary.
- Wordmark via restyled `UnauthLogo`.
- Keep collapse + hover-expand behavior.

### 8.2 Header — `components/layout/AppHeader.tsx`
- **RESTYLE.** Keep `h-14` sticky, but switch translucent warm bg → white/`--surface-base` with hairline bottom border (drop the heavy saturate/blur or make it subtle). Breadcrumb in ink-tertiary→ink-primary, `ChevronRight` separators (already lucide; the leading dot can go).
- ⌘K search trigger: hairline border, `--radius-md`, lucide `Search`, `⌘K` kbd — already close; retoken.
- `AvatarMenu`: circle bg → `--accent` (black) or initials on `--surface-muted`; dropdown → shadcn DropdownMenu.
- Hamburger inline SVG → lucide `Menu`.
- `MerchantEnvChip`: hairline pill, env dot uses risk-low for prod.
- `ContextCreditsBadge` exists but is **unmounted** — decide: wire it into the header (lime/dark chip) or **DELETE**. Recommend deleting if unused.

### 8.3 Command palette
- **REPLACE** the native `<dialog>` + reducer + `PALETTE_ICONS` with **cmdk / shadcn Command**. Keep the result groups (Customers / Navigate / Orders / Evidence), 250ms debounced fetch (`commandPaletteFetch.ts` logic survives), and ⌘K binding. lucide icons throughout. Modal surface uses `--shadow-lg`.

### 8.4 Layout shells
- `(app)/layout.tsx`: keep structure; bg stays `--surface-base` (now white). Bump page gutter convention to `p-6 md:p-8` (apply per page, or introduce a shared `<PageShell>` — see §9.1).
- `(auth)`: login already two-column — RESTYLE the dark left panel to Ramp-charcoal + lime; right card to white/hairline/`--radius-lg`.
- `settings/layout.tsx`: vertical tab rail — RESTYLE active state to ink-primary + lime/gray indicator (replace `--copper-bright` border-left).
- `(public)/layout.tsx`: stays passthrough (landing self-styles).

---

## 9. Page-by-page plan (Phases 3–4)

### 9.1 First: unify the page scaffold
The inventory found **two shell families** (`WorkbenchPage`/`*PageWorkbench` vs `DetailPageShell`) **plus bespoke `p-6/p-8` one-offs** (audit transaction, chargebacks dossier, help, global). This inconsistency is the biggest non-token obstacle to a cohesive Ramp feel.

**Action:** define **one** `<PageShell>` (wrapping the rebuilt `PageHeader`): `title` + `subtitle` + `actions` + optional `tabs` + optional KPI `metricSlot` + `children`, padded `p-6 md:p-8`, content `max-w` only where prose-y (help/legal). Migrate all three families onto it. Tables and cards render inside it identically everywhere.

### 9.2 Authenticated pages

**Group A**
- **dashboard** (`DashboardPageCockpit`) — **RESTYLE→ rebuild on PageShell.** Big title; 5-col `MetricCard` strip (Ramp KPI cards: large tabular figure, tiny label, muted delta); attention-queue as a **Ramp table** (confidence badge + customer + ghost actions); right rail `ModuleCard`s. Flat hairline cards, no shadows.
- **customers (list)** — **RESTYLE.** The hero table → full Ramp table treatment (avatar + name + gray subline, sortable headers, row hover, ghost row actions). Analytics overview cards retoken; filter chips drop copper → neutral/lime-selected. `PageSizeSelect` pager → clean.
- **customers/[id] (profile)** — **RESTYLE.** Two-column workbench → PageShell with sticky right rail; hero retoken; copy glyphs → lucide `Copy`. Signals/timeline/linked-accounts as clean bordered sections.
- **claims** — **RESTYLE.** Tab toolbar → shadcn underline Tabs + count badges; queue → Ramp rows; KPI strip retoken.
- **reports** — **RESTYLE + add gauges.** Range segmented control retoken (neutral, active=ink); **add the Ramp arc-gauge row** (§9.4) at top (Operational/Compliance/etc. analogues); tabs → underline Tabs; `ExportMenu` → DropdownMenu.
- **store** — **RESTYLE.** Dedup its local `SyncRow`/`DataPresenceRow`/`CompletenessBanner` against dashboard's (consolidate into shared primitives), retoken.
- **global** — **RESTYLE.** "Network Intelligence": retoken; **replace the hand-rolled CSS bar chart** with an echarts bar (themed) or clean CSS segments; fix `ConfidenceBadge grade as any` (line 134) → proper type. `reactflow` graph: retoken node/edge colors to neutral + lime highlights.
- **Redirect stubs** (inbox→claims, lookup→customers, graph→global, clusters→customers) — no UI; **leave.** **watchlist** retired stub — RESTYLE the single explanatory card or DELETE the route if truly dead.

**Group B**
- **audit/[runId]** (`DetailPageShell` + `AuditTabs`, 4 panels) — **RESTYLE→PageShell.** `AuditRunPageSummarySections` is the cleanest (uses primitives) — light retoken. `AuditRunOverviewPanel` + `AuditRunTransactionsPanel`: **replace hand-rolled `<table>`s with `DataTable`** (Ramp rows), fix the heavy `as any` casts (lines ~84–96) with real types. Grade tiles retoken (border-top accent → sev color or lime).
- **audit/[runId]/transaction/[id]** — **RESTYLE.** bespoke `p-8` → PageShell; back-chevron SVG → `ArrowLeft`; metric cards + `<dl>` grid retoken; clear `as any`.
- **chargebacks** — **RESTYLE.** Workbench → PageShell; `ReadinessFunnel` retoken (clean CSS segments); row list → Ramp rows with `Badge` tones.
- **chargebacks/[id] (dossier)** — **RESTYLE.** Two-rail dossier → PageShell + sticky aside; **kill inline `fontSize:18/13/12` literals** → type-scale classes; evidence-strength tokens retoken; grade chip uses new sev palette.
- **upload / apply / evidence/new** — **RESTYLE.** PageShell; evidence-new back-chevron SVG → `ArrowLeft`; forms use rebuilt primitives.
- **history** — **RESTYLE.** Workbench → PageShell; `AuditHistoryTableClient` → Ramp rows.
- **help** suite (index + how-it-works / csv-export / confidence-grades / identity-matching) — **RESTYLE.** Clean doc pages (`max-w-2xl/3xl` prose), lucide icon tiles, retoken `GradeRow`/`UniquenessChip` color maps.

### 9.3 Settings / auth / onboarding / public (Phase 4)
- **settings** (account, billing, team, data-privacy, audit-trail, integrations) — **RESTYLE.** Unify on the new tokens; settings sections become hairline `SectionCard`s. Fix `merchant_members as any` (audit-trail) and `public_audits as any` (audit/submitted).
- **integration subpages** (shopify/gorgias/zendesk/freshdesk/woocommerce/bigcommerce/chrome) — **RESTYLE.** They share a uniform server pattern (`space-y-8 p-8 max-w-2xl` + back-link); standardize on PageShell; keep `public/integrations/*` logos (file assets). Note shopify diverges (uses `PageHeader`) — fold into the shared pattern.
- **login** — **RESTYLE** (dark panel → Ramp-charcoal + lime; card → white hairline).
- **onboarding** — **RESTYLE** stepped flow with rebuilt primitives.
- **reset / reset/update** — **REPLACE styling.** These reimplement inputs/buttons with inline-CSS-object consts (`LABEL_STYLE`/`INPUT_BASE`/`resetFormStyles.ts`) instead of the primitives — **migrate to `Input`/`Button`** for consistency.
- **signup** (`SignupFlow`) — **RESTYLE.**
- **public audit** marketing + submitted + report — **RESTYLE.** Replace hardcoded hex (`#F8F5EE`/`#1A1814`) with tokens.
- **legal** (privacy/dpa/data-handling/pilot-terms) — **RESTYLE.** Retoken (some use legacy `--text*`, one uses hardcoded hex); clean prose layout.
- **audit-running**, **mobile-unsupported** — **RESTYLE** (retoken).

### 9.4 Arc gauges (net-new — no SVG)
No semicircular gauge exists anywhere; Ramp's Reporting page needs them. **Build a `<Gauge>` component on echarts `series.type:'gauge'`** (or a half-donut pie `startAngle:180/endAngle:0`) inside the existing `EChartWrapper` (SVG renderer, themed via `readCssTokens()`). Feed the gradient `--gauge-from → --gauge-mid → --gauge-to`. Place on **reports** (and optionally dashboard). This reuses the canonical analytics stack — zero hand-authored markup.

---

## 10. Landing rebuild (Phase 5)

> `LANDING_DESIGN_LOCK.md` locks the landing — **this rebuild is the explicit override.** Update or delete that file when done.

Root `/` → `redirect('/landing')`. The page renders 13 sections (Header, Hero, TrustStrip, Integrations, ProductTier, PipelineTabs, Dashboard, Network, DataSchema, Pricing, Comparison, FAQ, Footer).

- **First: delete the ~12 orphan files** (not reachable from `page.tsx`): `LandingReachableModules`, `LandingPatternSection`, `MerchantDashboard`, `NetworkChart`, `VerdictTicker`, `Counter`, `TypedText`, `AnimatedBar`, `HeroNotificationArtifact`, `LandingScreenshotFrame`, `landing/AuditForm`, `landing/PublicAuditForm`. This removes the two largest hand-authored chart SVGs in one stroke.
- **Tokens:** `_tokens.ts` is CSS-var refs only — retoken via the same root change (burgundy → ink + lime). The many `ua-landing-*` classes in `globals.css` (and `ua-shadow-*`, `--landing-*`) get the same value swap.
- **Dotted-grid background:** add a CSS utility (replaces `dot-pattern.tsx` SVG):
  ```css
  .ua-dot-grid { background-image: radial-gradient(var(--border-default) 1px, transparent 1px); background-size: 22px 22px; }
  ```
- **Per section (all RESTYLE; the loud-decoration helpers DELETE):**
  - **Header** — sticky, white/translucent, hairline bottom; nav links neutral; `Sign in` ghost; **lime `Cta`** ("Create workspace →").
  - **Hero** — **enormous** display type (`clamp(44px,6vw,84px)/600/-0.03em`), short subhead, lime primary CTA + ghost secondary, dotted-grid bg, product screenshot via `ProductFrame` (keep `next/image` + `public/screenshots/*`). Keep the hand-built case-file card (DOM, no SVG) — retoken.
  - **TrustStrip** — metric ticker + logo row (Ramp's "Join 70,000…" pattern); logos as `next/image` or muted text.
  - **Integrations / ProductTier / PipelineTabs / Dashboard / Network / DataSchema** — retoken to white/hairline/lime; PipelineTabs play/pause SVG → lucide; keep ProductFrame screenshots.
  - **Pricing** — clean cards, lime CTA on the featured tier.
  - **Comparison** — Ramp-style matrix; keep lucide `Check`/`Minus`/`X`.
  - **FAQ** — keep CSS `±` accordion; retoken.
  - **Footer** — multi-column, hairline top, muted links, lime accents sparingly.
- **CTA component** (`ui/Cta.tsx`) — RESTYLE to `--lime`/`--lime-fg` (primary) and ink/hairline (secondary). Unify the header's bespoke `.ua-landing-cta-*` onto `Cta`.

---

## 11. Charts & data-viz (Phase 6)

- **Standardize on echarts** (the canonical `components/analytics/*` stack via `EChartWrapper`). Migrate the older `components/charts/*Client.tsx` recharts pieces (Donut/HBar/WeeklyTrend) to echarts equivalents over time, *or* retoken both and defer consolidation — but **don't ship two visual languages**. At minimum, retoken both to the new palette.
- **`components/charts/echartsTheme.ts`** — update `LIGHT_TOKENS`/`DARK_TOKENS` hardcoded fallbacks to the new hexes; `readCssTokens()` already reads live vars so most updates flow from §3.
- Replace hand-authored bar/strip markup: `RiskDistributionStrip` (SVG rects), `AuditCharts`/`GradeDistBar`/`ReadinessFunnel` (CSS-div bars are acceptable if retoken; upgrade `RiskDistributionStrip` to clean CSS flex segments or echarts), global page's bar chart → echarts.
- `AuditRiskChart.tsx` returns `null` — **DELETE** (dead).
- **reactflow** global graph — retoken nodes (white/hairline), edges (neutral), highlights (lime).

---

## 12. Phased execution & verification

Run in order; **verify with the preview tools after each phase** (start dev server, screenshot key screens, check console/network). Don't proceed until the phase looks right.

| Phase | Scope | Proof |
|---|---|---|
| **0** | Fonts (`layout.tsx`) + token values (`globals.css` light + dark) | Screenshot dashboard, a table page, landing — whole app shifts to Ramp neutrals via cascade. *This validates the surgical thesis.* |
| **1** | shadcn init; rebuild primitives behind the barrel; all inline-SVG → lucide/CSS; delete loud decoratives; dotted-grid utility | Primitives render; key pages unbroken; zero authored `<svg>` in JSX (grep). |
| **2** | App shell — Sidebar, AppHeader, CommandPalette, settings rail | Nav, ⌘K, dropdowns, mobile drawer. |
| **3** | High-traffic pages on unified `PageShell`; Ramp tables; reports gauges | Screenshot dashboard / customers / claims / reports / audit run. |
| **4** | Long tail — settings, integrations, help, auth, onboarding, signup, reset, legal, public | Spot-check each. |
| **5** | Landing — delete orphans; rebuild sections; dotted grid; lime CTAs | Responsive screenshots 390/768/1280. |
| **6** | Charts — echarts theme, gauges, replace hand-authored bars, reactflow | Charts themed + legible. |
| **7** | Cleanup — unify token namespaces (optional), fix all `as any` (audit-trail, audit/submitted, transactions panel, global), delete dead code, a11y pass | Lint clean; contrast/focus audit. |

---

## 13. Guardrails (binding)

- **Keep stable surfaces:** token *names*, the `@/components/ui` barrel exports, and component prop signatures. Change values and internals, not the public API.
- **Don't touch** scoring/weights/matching/cluster logic or `lib/engine`/`lib/scorer` (`CLAUDE.md`).
- **No hand-authored SVG; no `as any`; no `eslint-disable`.** (Clean the existing `as any` sites you pass through — they violate `CLAUDE.md` already.)
- **Light theme default** (UX guardrail). Reskin dark; don't make it primary.
- **Grade = confidence, not verdict.** Risk/grade colors are informational; don't recolor them into "good/bad" judgments.
- **Restrained motion.** Subtle reveals/hover only; delete the meteor/beam/spotlight effects.
- **Accessibility:** lime is low-contrast — **always near-black text/icon on lime; never lime text on white** for body copy. Keep visible focus rings (dark ring, not removed).
- **Single source of truth for the accent:** every lime reference reads `--lime` (and `--lime-fg`/`--lime-soft`). Tuning the brand = one line.

---

## 14. Appendix — file touch map (non-exhaustive)

- **Foundations:** `app/layout.tsx`, `app/globals.css` (`:root`, `[data-theme="dark"]`, `.dark`, `.ua-mark`, type-scale + `ua-landing-*` blocks), `tailwind.config.ts` (only if adding new token aliases like `--lime`).
- **Primitives:** all `components/ui/*` per §7; new `components/ui/Gauge.tsx`; new `components/ui/PageShell.tsx`; `components/ui/index.ts` (barrel — keep names).
- **Shell:** `components/nav/Sidebar*.tsx`, `SidebarNavItem.tsx`, `components/navigation/AppNavLink.tsx`, `components/layout/AppHeader.tsx`, `AvatarMenu.tsx`, `CommandPalette*.tsx`, `MerchantEnvChip.tsx`, `ContextCreditsBadge.tsx` (wire or delete), `app/(app)/layout.tsx`, `app/(app)/settings/layout.tsx`.
- **Charts:** `components/charts/echartsTheme.ts`, `components/analytics/*`, `components/charts/*`, `components/audit/{AuditCharts,RiskDistributionStrip}.tsx`, delete `AuditRiskChart.tsx`, `components/global/GlobalIdentityGraphClient.tsx`.
- **Pages:** every `app/(app)/**/page.tsx` + client views per §9; `app/(auth)/*`, `app/(public)/landing/**` (delete orphans per §10), `app/(public)/{signup,audit,legal,demo,audit-demo}`, `app/{audit-running,mobile-unsupported,page}.tsx`.
- **Cleanup target:** `LANDING_DESIGN_LOCK.md` (update/remove), the inline-CSS reset form styles (`app/(auth)/reset/resetFormStyles.ts`), dead landing files.

---

**TL;DR for the implementer:** Start at Phase 0 — swap fonts and rewrite token *values* (names frozen). The entire app re-skins on the first run; everything after is making each surface *worthy* of that palette: flat hairline cards, big tight type, clean tables, lime only where Ramp uses it, arc gauges on Reporting, and not a single `<svg>` written by hand.
