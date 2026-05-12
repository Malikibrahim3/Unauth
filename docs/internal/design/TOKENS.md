# Design Token Reference

> **Canonical spec-token set** for this codebase.  
> All tokens live in `app/globals.css` inside `:root`.  
> No `.dark` block exists today — dark mode tokens are a future phase.  
> **Do not hard-code hex values in components.** Always reference a CSS variable.

---

## 1 · Surface & Canvas

| Token | Value | Usage |
|---|---|---|
| `--bg-canvas` | `#FAF6EF` | Page background (warm parchment) |
| `--bg-surface` | `#FFFFFF` | Card / panel background |
| `--bg-surface-alt` | `#F2EDE3` | Secondary surface |
| `--bg-surface-sunk` | `#EAE3D4` | Recessed / inset areas |
| `--bg-hover` | `#EDE6D8` | Generic hover state |
| `--bg-selected` | `#E4EDFC` | Selected row / item |
| `--bg-subtle` | `#F2EDE3` | (legacy alias → same as `--bg-surface-alt`) |
| `--bg-muted` | `#EAE3D4` | (legacy alias → same as `--bg-surface-sunk`) |
| `--bg-inset` | `#FAF6EF` | (legacy alias → canvas) |

---

## 2 · Borders

| Token | Value | Usage |
|---|---|---|
| `--border-subtle` | `#E5DECE` | Dividers, hairlines |
| `--border-default` / `--border` | `#D2C9B5` | Default border |
| `--border-strong` | `#8C97A8` | Emphasized border, focus rings |

---

## 3 · Text

| Token | Value | Usage |
|---|---|---|
| `--text-primary` / `--text` | `#141821` | Primary body copy |
| `--text-secondary` | `#2E3947` | Secondary labels |
| `--text-tertiary` | `#56657A` | Captions, placeholders |
| `--text-muted` | `#78889C` | (legacy) de-emphasised |
| `--text-subtle` | `#9CA8BB` | (legacy) ghost text |
| `--text-disabled` | `#B9C2CF` | Disabled state |
| `--text-inverse` | `#FFFFFF` | Text on dark/accent backgrounds |
| `--text-link` | `#2563EB` | Interactive links |

---

## 4 · Accent (Primary Action Blue)

| Token | Value | Usage |
|---|---|---|
| `--accent-50` | `#EEF3FE` | |
| `--accent-100` | `#D9E5FD` | |
| `--accent-200` | `#B6CCFB` | |
| `--accent-500` / `--accent` | `#2563EB` | CTA buttons, links |
| `--accent-600` / `--accent-hover` | `#1D4ED8` | Hover state |
| `--accent-700` | `#1E40AF` | Active / pressed |
| `--accent-fg-on-500` | `#FFFFFF` | Text on accent background |
| `--accent-soft` | `#EEF3FE` | (legacy alias → `--accent-50`) |
| `--accent-soft-hover` | `#D9E5FD` | (legacy alias → `--accent-100`) |

---

## 5 · Risk / Status Palette

> These are the **only** valid semantic uses of red, amber, and green.

| Tier | `*-fg` | `*-bg` | `*-line` / `*-bd` |
|---|---|---|---|
| `--risk-critical-*` | `#9F1D1D` | `#FBEFEC` | `#D08B7E` / `#E8B5AB` |
| `--risk-high-*` | `#B6512A` | `#FAEFE7` | `#D9A07E` / `#ECC6AC` |
| `--risk-medium-*` | `#8B6A14` | `#F7F0DA` | `#CDB258` / `#E5D194` |
| `--risk-low-*` | `#2F6B43` | `#E8F1E6` | `#8AB97A` / `#B5D2A8` |
| `--risk-none-*` | `#78889C` | `#EAE3D4` | `#D2C9B5` |

**Legacy plain aliases** (`--risk-critical`, `--risk-high`, etc.) point to the same fg values.

---

## 6 · Informational / Status (non-risk)

| Token | Value | Usage |
|---|---|---|
| `--info` / `--info-fg` | `#2563EB` | Info state |
| `--info-bg` | `#EEF3FE` | Info background |
| `--info-bd` / `--info-line` | `#B6CCFB` | Info border |
| `--success` | `#2F6B43` | = `--risk-low-fg` |
| `--warning` | `#8B6A14` | = `--risk-medium-fg` |

---

## 7 · Evidence Strength (Phase A aliases)

> Maps evidence confidence onto the risk-tier palette.

| Token | Aliased from | Semantic meaning |
|---|---|---|
| `--evidence-strong-fg` | `--risk-low-fg` | Confirmed / high-confidence evidence |
| `--evidence-strong-bg` | `--risk-low-bg` | |
| `--evidence-strong-line` | `--risk-low-line` | |
| `--evidence-moderate-fg` | `--risk-medium-fg` | Probable / medium-confidence evidence |
| `--evidence-moderate-bg` | `--risk-medium-bg` | |
| `--evidence-moderate-line` | `--risk-medium-line` | |
| `--evidence-weak-fg` | `--risk-high-fg` | Weak / low-confidence evidence |
| `--evidence-weak-bg` | `--risk-high-bg` | |
| `--evidence-weak-line` | `--risk-high-line` | |

---

## 8 · Watchlist Trend (Phase A aliases)

| Token | Aliased from | Semantic meaning |
|---|---|---|
| `--watchlist-trend-up` | `--risk-critical-fg` | Rising risk / upward trend |
| `--watchlist-trend-down` | `--risk-low-fg` | Declining risk / downward trend |
| `--watchlist-trend-flat` | `--text-tertiary` | No movement |

---

## 9 · Watchlist Brand

| Token | Value |
|---|---|
| `--watchlist` | `#0F6B6B` |
| `--watchlist-bg` | `#E2F1F0` |
| `--watchlist-bd` | `#A9D5D2` |

---

## 10 · Spacing Scale

| Token | Value |
|---|---|
| `--space-0` | `0px` |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-7` | `32px` |
| `--space-8` | `40px` |
| `--space-9` | `48px` |
| `--space-10` | `64px` |
| `--space-11` | `80px` |

---

## 11 · Radius

| Token | Value | Tailwind alias |
|---|---|---|
| `--radius-1` / `--radius-sm` | `4px` | `rounded-r1` |
| `--radius-2` / `--radius-md` | `6px` | `rounded-r2` |
| `--radius-3` / `--radius-lg` | `8px` | `rounded-r3` |
| `--radius-4` / `--radius-xl` | `12px` | `rounded-r4` |
| `--radius-pill` / `--radius-full` | `9999px` | `rounded-pill` |
| `--radius-xs` | `2px` | |

---

## 12 · Shadows

| Token | Usage |
|---|---|
| `--shadow-0` | Outline ring |
| `--shadow-1` | Card elevation |
| `--shadow-2` | Popover elevation |
| `--shadow-drawer` | Side drawer |
| `--shadow-modal` | Modal |
| `--shadow-focus` | Keyboard focus indicator |
| `--shadow-xs/sm/md/lg/xl` | Legacy HSL shadows (backward compat) |

---

## 13 · Motion

| Token | Value |
|---|---|
| `--duration-fast` | `120ms` (spec) / `100ms` (legacy — both present) |
| `--duration-default` | `180ms` |
| `--duration-slow` | `240ms` |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--ease-emphasized` | `cubic-bezier(0.3, 0, 0, 1)` |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` (legacy) |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` (legacy) |

---

## 14 · Z-Index Scale

| Token | Value |
|---|---|
| `--z-base` | `0` |
| `--z-sticky` | `100` |
| `--z-dropdown` | `200` |
| `--z-drawer` | `300` |
| `--z-modal` | `400` |
| `--z-toast` | `500` |
| `--z-tooltip` | `600` |

---

## 15 · Typography

Fonts: **DM Sans** (sans-serif) · **DM Mono** (monospace)

See `app/globals.css` for full utility classes: `.text-display-xl` → `.text-overline`, `.text-mono-md/lg`, plus spec aliases `.text-display`, `.text-h1`–`.text-h3`, `.text-body`, `.text-body-strong`, `.text-small`, `.text-meta`, `.text-mono-sm`.

---

## 16 · ESLint Enforcement

Raw Tailwind color classes (`text-red-*`, `bg-blue-*`, etc.) are **banned** in `components/**` via `no-restricted-syntax`.  
Exception: `components/internal/**` is excluded from this rule.

See `.eslintrc.json` → `overrides[0]`.

---

*Last updated: Phase A — 2026-05-12*
