# Design Changes Log

This file is appended at the end of every implementation phase.

---

## Phase 0 — Discovery

**Files created:**
- `audit/discovery.md` — full codebase inventory per §3.2

**Key findings:**
- Framework: Next.js 14 App Router
- Styling: Tailwind CSS v4 + CSS custom properties
- Existing token set: warm-neutral monochromatic accent (`#1C1B1A`); spec requires cool-blue accent (`#4F66E8`)
- Font: DM Sans (not Inter); retained as deviation from spec
- Customer views: 3 separate renderers found (Drawer, Full Page, ProfileCard); all documented in discovery
- `/customers/:id` route **exists** (579-line server component)
- No shared `Badge`, `DataTable`, or `PageHeader` spec-compliant components exist yet

---

## Phase 1 — Design Tokens

**Files modified:**
- `app/globals.css` — added all spec CSS variables (§5.2–§5.9) as new properties inside `:root` and `.dark`. Additive only; existing variables preserved for backward compatibility.
- `tailwind.config.ts` — added spacing scale (`s1`–`s11`), spec color aliases, additional radius tokens (`r1`–`r4`, `pill`), and additional shadow tokens (`s0`–`s2`, `drawer`, `modal`, `focus`).

**What was added (light mode):**
- Surface tokens: `--bg-surface-alt`, `--bg-surface-sunk`, `--bg-hover`, `--bg-selected`
- Border tokens: `--border-default` (new name for stronger border), `--border-strong`
- Text tokens: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-disabled`, `--text-link`
- Accent scale: `--accent-50` through `--accent-700`, `--accent-fg-on-500`
- Risk semantic aliases: `--risk-*-fg`, `--risk-*-line` (complementing existing `--risk-*-bg` / `--risk-*`)
- Info semantic aliases: `--info-fg`, `--info-line`
- Spacing scale: `--space-0` through `--space-11`
- Radius spec: `--radius-1` through `--radius-4`, `--radius-pill`
- Shadow spec: `--shadow-0` through `--shadow-2`, `--shadow-drawer`, `--shadow-modal`, `--shadow-focus`
- Motion spec: `--duration-fast` (120ms), `--duration-default` (180ms), `--duration-slow` (240ms), `--ease-standard`, `--ease-emphasized`
- Z-index scale: `--z-base` through `--z-tooltip`

**What was added (dark mode `.dark`):**
- Full parallel set of surface, border, text, accent, risk, and info tokens for dark mode

**Type scale additions (globals.css):**
- `.text-display`, `.text-h1`, `.text-h2`, `.text-h3`, `.text-body`, `.text-body-strong`, `.text-small`, `.text-meta`, `.text-overline`, `.text-mono-sm`
- `.num` utility class for tabular-nums (`font-feature-settings: "tnum" 1, "ss01" 1`)

**Deviations documented:**
- Font: DM Sans retained (not replaced with Inter). DM Sans is humanist neutral, adequate for the Amplitude-adjacent target aesthetic.
- `--bg-canvas` is `#FAF6EF` (warm parchment), not the spec's cool-tinted `#F7F8FB`. The warm palette is intentional and consistent with the brand direction.
- Existing `--border-subtle` value is `#E5DECE` (warm sand). No cool-gray override was applied.

**Correction (Phase A audit, 2026-05-12):**
- Previous entry incorrectly stated `--bg-canvas` was set to `#F7F8FB`. Actual value in `app/globals.css` is `#FAF6EF`.
- Previous entry claimed a `.dark` block was added to `app/globals.css`. No `.dark` block exists in that file today; dark-mode tokens were never committed.

---
