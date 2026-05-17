# App Interior — Polish & Experience Implementation Doc

> The case-file design language is locked in `components/ui/*` and `components/audit/CustomerProfileCard.tsx` + `RecommendedAction.tsx`. This doc maps the work needed to (a) carry that language into every remaining surface and (b) layer in tasteful, professional moments of delight — a Ramp-grade experience for fraud investigators.

**Scope:** `app/(app)/**` pages, `components/customers/*`, `components/dashboard/*`, `components/evidence/*`, `components/audit/*` (non-rebuilt), supporting `components/ui/*`.

**Out of scope:** Auth, landing, public marketing pages (already done).

---

## Design language quick reference

| Token | Value | Use |
|---|---|---|
| `--bg-canvas` | `#F8F5EE` | Page backgrounds, table headers, card headers, filter bars |
| `#FFFFFF` | white | Card bodies, drawer content, input backgrounds |
| `--border-default` | `#D2C9B5` | All borders |
| `#1A1814` | dark ink | Primary text, primary buttons, DEFINITE chip bg |
| `#7B2D26` | dark red | `§` markers, accent rails, active tab underline, hover, RISK chip text |
| `#FBEFEC` / `#F0C8BE` | red wash | RISK chip bg/border, danger surfaces |
| `#F2EDE3` / `#D2C9B5` | neutral wash | CONF chip, secondary chip |
| DM Sans | `var(--font-sans)` | Body, labels |
| DM Mono | `var(--font-mono)` | IDs, addresses, scores, currency |

**Section label primitive** (use everywhere a header would otherwise live):

```tsx
<div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', lineHeight: 1 }}>
  <span style={{ color: '#7B2D26', marginRight: 5 }}>§</span>
  Section name
</div>
```

**Chip primitive** (18px tall, 3px radius, 10px / 0.06em / 700 weight). Already in `Badge.tsx` and `RiskScoreBadge.tsx` — use these, do not hand-roll.

---

## Tier 1 — Carry the language (mandatory cleanup)

### 1.1 Customer Intelligence Drawer — `components/customers/CustomerIntelligenceDrawer.tsx` (635 lines)

The drawer is the highest-traffic investigator surface and currently uses `rounded-lg`, `rounded-xl`, mixed surface tokens, and generic icons. Full rewrite into case-file layout:

**Structure (top → bottom):**

1. **Header bar** — same pattern as `CustomerProfileCard`: `●` status dot + `CASE FILE · UN-…` ID on left; `DEFINITE/PROBABLE/CANDIDATE` + `RISK 0.92` + `CONF 0.96` chips on right.
2. **Subject row** — primary email in DM Mono, `+N linked accounts` callout in `#7B2D26` if multi-email.
3. **Stat strip** (4-col grid, same primitive as profile card): EMAILS / ADDRESSES / PAYMENT / DEVICES with each cell in DM Mono and `#7B2D26` colored if `> 1`.
4. **Triage callout** — replaces lines 343–460. Use the new `RecommendedAction` component (`components/audit/RecommendedAction.tsx`) — it already produces the dark red `●` strip.
5. **Behavior roadmap** (new — see §2.1).
6. **Identity trail** — replaces lines 558–587 (`IdentityTimeline`). See §2.2.
7. **Stored details** (lines 466–532) — wrap each subsection in a `SectionCard` with the `§` overline; collapse the inline `rounded-lg border p-3` cards.
8. **Notes & evidence** — keep current logic, wrap each in `SectionCard`.

**Specific replacements:**

| Line(s) | Current | Replace with |
|---|---|---|
| 40, 45 | `rounded-lg` skeletons | `borderRadius: 4`, `background: 'var(--bg-canvas)'` |
| 63 | `rounded-lg border bg-inset` | `SectionCard` |
| 171 | `rounded-lg border bg-surface` order card | Roadmap row (§2.1) |
| 343 | `rounded-lg border bg-risk-critical-bg` | `<RecommendedAction tier="critical" … />` |
| 405 | `rounded-xl` hero zone | Case-file header (per profile card pattern) |
| 466, 518, 562, 574 | `rounded-lg border` blocks | `SectionCard` body rows with `borderRadius: 3` |

### 1.2 Customers table — `components/customers/CustomersTableClient.tsx` + filter sheet

Migrate the table to the new `DataTable` (already rebuilt). Row click opens the redesigned drawer. The filter sheet should adopt:
- Header: canvas bg + `§ FILTERS` overline.
- Group labels: 10px ALL CAPS tracked, `§` prefix.
- Filter chips: use rebuilt `Badge` with `tone="neutral"`.
- Apply button: `Button variant="primary"` (now dark charcoal).

### 1.3 Dashboard — `app/(app)/dashboard/page.tsx`

The page currently mixes hard-coded `rounded-lg`, `accent-500` left accents (ln 349, 386), and custom KPI tiles. Plan:

- **Page header** — pass `eyebrow="Workspace overview"` to the rebuilt `PageHeader`.
- **KPI row** — replace inline metric tiles with `MetricCard` (already case-file styled). Add a `sparkline` slot (§2.4).
- **Lines 349 / 386 accent stripes** — change `accent-500` to `#7B2D26`.
- **Section blocks** — wrap "Recent activity", "Top flagged customers", "Savings" each in `SectionCard`.

### 1.4 Audit results — `app/(app)/audit/[runId]/page.tsx`

10+ `rounded-lg/xl` instances (lines 152, 186, 237, 249, 266, 347, 375):

- **Hero KPI strip** (lines 186–200) — `MetricCard` × 5. Make "Likely identity links" the visual anchor (see §2.5).
- **Success/failure cards** (lines 152, 347, 375) — `SectionCard` with a "STATUS" eyebrow.
- **Action bar** — `Button` primary/secondary instead of inline buttons.
- **"Completed at" timestamp** — render as DM Mono "Completed 2h 14m ago" with absolute timestamp on tooltip.

### 1.5 Standalone customer page — `app/(app)/customers/[id]/page.tsx`

Mirror the drawer redesign. The standalone page has more room — promote the **case summary strip** (§2.3) to a hero.

### 1.6 Audit nested pages

- `app/(app)/audit/[runId]/customers/page.tsx` — uses `CustomerProfileCard` (already rebuilt) ✓. Audit the surrounding chrome.
- `app/(app)/audit/[runId]/transaction/[id]/page.tsx` — case-file treatment.
- `app/(app)/audit/[runId]/customer/[hash]/page.tsx` — case-file treatment.

### 1.7 Inbox — `app/(app)/inbox/page.tsx`

- **Top summary card** (lines 105–112) — `MetricCard` with delta.
- **Top-row priority highlight** (line 294, `isTopRow`) — add `borderLeft: '2px solid #7B2D26'` to mark the next case in queue.
- **Empty state** — adopt `components/ui/EmptyState.tsx` (the canonical one — `components/common/EmptyState.tsx` is the duplicate; delete or alias).

### 1.8 Settings — `app/(app)/settings/{account,team,audit-trail}/page.tsx`

All form sections currently use `rounded-lg border p-5`. Wrap each in `SectionCard` with a `§` eyebrow ("PROFILE", "API KEYS", "NOTIFICATIONS", "TEAM", etc.). Form inputs need the same warm-inset treatment used on the auth page (`background: #FAF6EF, border: 1px solid #D2C9B5, borderRadius: 4px`). Create `components/ui/Input.tsx` + `components/ui/Select.tsx` to enforce.

### 1.9 Evidence package — `components/evidence/{DisputeReadinessPanel,EvidencePackagePreview,EvidenceStrengthMeter}.tsx`

This is a high-stakes flow — chargebacks. It needs to feel as official as a court filing.

- **EvidencePackagePreview** — render as a real "document": small dark-red page-number footers ("01 / 04"), thin top rule, file metadata in ALL-CAPS overline.
- **EvidenceStrengthMeter** — five-segment editorial bar (think `▓▓▓░░`) with strength labels in 10px tracked caps; dark red fill for "strong", neutral for "weak".
- **DisputeReadinessPanel** — `§ READINESS` overline, checklist items with `●` markers (filled dark = complete, hollow = missing).

### 1.10 Dashboard sub-components

- `DashboardCharts.tsx` (207 lines) — wrap charts in `SectionCard`; use `#1A1814` and `#7B2D26` for stroke/fill series; canvas-color grid lines (`stroke="#E5DECE"`).
- `InsightsStrip.tsx` — adopt chip-row pattern.
- `SavingsCard.tsx` — see §2.6 (number reveal).

### 1.11 Audit charts — `components/audit/AuditCharts.tsx` (214 lines)

Same chart treatment as 1.10. Specifically:
- Tooltip background → `#FFFFFF`, border → `#D2C9B5`, header → 10px tracked caps `§` eyebrow.
- Legend swatches → 8px squares (not circles) to feel typographic.
- Default Recharts colors are blue/green — override to a palette of `#1A1814 / #7B2D26 / #4A4640 / #888078 / #C8C0AB` (dark to light, no chroma).

### 1.12 Identity components

- `components/customers/IdentityTimeline.tsx` (73 lines) — see §2.2.
- `components/customers/IdentityClusterGraph.tsx` (71 lines) — render edges in `#7B2D26` for "strong" links, `#888078` for weak. Node circles white-fill, dark-ink stroke. Add ALL-CAPS node labels with DM Mono.
- `components/customers/CrossMerchantSignalCard.tsx` (183 lines) — full `SectionCard` treatment with a `§ CROSS-MERCHANT SIGNAL` overline; signal weight visualized as a 5-segment bar matching the evidence strength meter.

### 1.13 Lookup, Watchlist, Saved, History, Chargebacks

All four are list pages — they get the same treatment:
- `PageHeader` with `eyebrow` set per page.
- `FilterBar` (rebuilt) on top.
- `DataTable` (rebuilt) below.
- `EmptyState` (canonical) for empty cases.
- No bespoke cards.

### 1.14 Help — `app/(app)/help/**`

Editorial article treatment:
- Article body max-width 680px.
- Drop cap on first paragraph (optional, behind a flag — keep tasteful).
- Section headers use `§` eyebrows.
- Code/data callouts in DM Mono on canvas bg.

### 1.15 Onboarding / Upload

- `app/(app)/upload/page.tsx` welcome banner (lines 13–22) — turn into a `SectionCard` with `§ FIRST AUDIT` eyebrow, lightweight checklist (CSV format, required fields), and a clear primary CTA.
- The drop-zone state needs case-file styling: white card, warm border becomes dashed when empty, solid + filled when a file lands. Use `borderStyle: 'dashed'` + `#D2C9B5`.

---

## Tier 2 — Delight moments (the "experience" layer)

> Each item is small, professional, never gimmicky. Built once, reused everywhere.

### 2.1 Behavior roadmap (`components/customers/BehaviorRoadmap.tsx` — new)

The drawer + customer page's centerpiece. A vertical case-file timeline of every meaningful event for this customer, in reverse chronological order.

**Event types & glyphs:**

| Event | Glyph | Color |
|---|---|---|
| Order placed | `▣` filled square | `#1A1814` |
| Order refunded | `▢` outline square | `#7B2D26` |
| Chargeback filed | `●` filled circle | `#7B2D26` |
| Identity change (new email/address/card) | `▲` triangle | `#7B2D26` |
| Watchlist add | `★` star | `#7B2D26` |
| Cross-merchant signal | `◆` diamond | `#1A1814` |
| Note added | `–` em-dash | `#888078` |

**Visual structure:**

```
┌────────────────────────────────────────────────────────────┐
│ § BEHAVIOR ROADMAP                              12 EVENTS  │
├────────────────────────────────────────────────────────────┤
│ ▣  2026-05-12  Order #1029  £482.00            DEFINITE   │
│ │                                                          │
│ ▢  2026-05-09  Refund #R-887  £482.00          RISK 0.91  │
│ │                                                          │
│ ●  2026-05-08  Chargeback CB-441 — "Not received"          │
│ │                                                          │
│ ▲  2026-05-05  New address: 14 Sefton Rd, Manchester       │
│ │                                                          │
│ ▣  2026-05-01  Order #1018  £198.00                        │
└────────────────────────────────────────────────────────────┘
```

- Thin vertical rail (`#D2C9B5`) connecting glyphs.
- Hover on a row reveals supporting evidence in a tiny inline popover (3-line max).
- Click expands the row to show full order/event detail inline.
- Date column is DM Mono.
- Velocity heatband at the top: a 12-week horizontal strip showing event density per week (darker = denser). Hovering a band scrolls the list to that week.

**Data source:** Aggregate `profile.orders`, `profile.flags`, `profile.links`, `profile.notes` into one event stream sorted by date. Compute in `lib/analysis/customerIntelligence.ts` as `getEventStream(profile)`.

### 2.2 Identity trail (`IdentityTimeline.tsx` rebuild)

Today's `IdentityTimeline.tsx` is generic. Rebuild as a **two-column ledger**:

| First seen | Field | Value | Last seen |
|---|---|---|---|
| 2026-03-04 | EMAIL | jack.preston@gmail.com | 2026-05-12 |
| 2026-04-22 | EMAIL | j.preston@protonmail.com | 2026-05-09 |
| 2026-03-04 | ADDRESS | 11 Oak Avenue, Leeds | 2026-04-18 |
| 2026-05-05 | ADDRESS | 14 Sefton Rd, Manchester | 2026-05-12 |
| 2026-03-04 | CARD | ····4421 | 2026-05-12 |

- "Field" column in 10px ALL-CAPS tracked overline.
- Variant rows (same field, new value within 30 days) get a `#7B2D26` left rule and an inline `▲ VARIANT` chip.
- Sortable by any column.

### 2.3 Case summary strip (`components/customer/CaseSummaryStrip.tsx` — new)

A single horizontal hero strip for customer pages (drawer + standalone):

```
┌─────────────────────────────────────────────────────────────┐
│ § CASE AT A GLANCE                                          │
│                                                             │
│ FLAGGED      ORDERS    EXPOSURE       CADENCE    LAST SEEN  │
│ 2026-04-22   12        £4,820.00      ▓▓▓░░     2d ago     │
│                                                             │
│  ▓▓▓░░▓░░▓▓▓░ (12-week activity density)                    │
└─────────────────────────────────────────────────────────────┘
```

- `Cadence` is a 5-cell bar (sparse → dense).
- Bottom strip is the 12-week density band from §2.1.
- `LAST SEEN` is relative ("2d ago") with absolute timestamp on tooltip.

### 2.4 Sparkline chip (`components/ui/SparklineChip.tsx` — new)

A 60×16px inline sparkline component for use inside `MetricCard` and chips. Pure SVG, no library — keeps bundle slim.

```tsx
<MetricCard label="Exposure at risk" value="£12,420" 
  delta={{ value: 8, direction: 'up', tone: 'negative' }}
  microchart={<SparklineChip data={last7Days} tone="negative" />}
/>
```

- `tone="negative"` → `#7B2D26` stroke.
- `tone="positive"` → `#2A6634` stroke.
- `tone="neutral"` → `#1A1814` stroke.
- Last point gets a small filled circle.

### 2.5 Risk distribution mini-bar

For the audit hero's "Likely identity links" anchor:

```
┌─────────────────────────────────────┐
│ § LIKELY IDENTITY LINKS             │
│ 49                                  │
│ ▓▓▓▓▓▓▓░░░░░░░░░░  Definite  8     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░  Probable  23    │
│ ▓▓▓▓▓░░░░░░░░░░░░  Candidate 15    │
│ ▓░░░░░░░░░░░░░░░░  Weak      3     │
└─────────────────────────────────────┘
```

Reusable as `components/audit/RiskDistributionStrip.tsx`. Pass `{ definite, probable, candidate, weak }`.

### 2.6 Number reveal animation (`hooks/useCountUp.ts` — new)

A 600ms easing count from 0 → final on mount for: dashboard KPI tiles, audit hero metrics, savings card, inbox cases-in-queue.

```ts
const display = useCountUp(value, { duration: 600, format: formatCurrency });
```

- Respect `prefers-reduced-motion`: skip animation entirely.
- Only animate on initial mount or when value changes by ≥10%.

### 2.7 Document chrome on evidence pages

The evidence package preview deserves a real document feel:
- Small page numbers in the corner (`01 / 04` in 10px tracked caps).
- Thin top rule with `§ EVIDENCE PACKAGE · CB-441` overline.
- Generated/exported timestamp footer.
- "Final" / "Draft" stamp watermark (subtle, `#7B2D26` outline at 8% opacity, rotated 12°). Off by default; flag in settings.

### 2.8 Hover-reveal evidence on order rows

Inside the customer profile order table and the behavior roadmap, hovering a row reveals a slim tooltip with the 2-3 signals that drove the score:

```
┌────────────────────────────┐
│ § WHY THIS ORDER           │
│ ▲ Velocity: 3 orders / 24h │
│ ▲ Card mismatch on IP      │
│ ▲ Address ≠ billing        │
└────────────────────────────┘
```

200ms delay, 100ms fade. Implementable with a single `<Tooltip>` component (`components/ui/Tooltip.tsx` exists — extend).

### 2.9 Empty state visual richness

Adopt `components/ui/EmptyState.tsx` everywhere. Add an optional `illustration` prop with three minimal SVGs:
- `empty-search` — a magnifying glass over a blank case file
- `empty-inbox` — stacked folders, top one open
- `all-clear` — a checked clipboard with `§ NO RISKS FOUND` typography

All illustrations in `#888078` line-art on canvas bg, dark red highlight on one detail.

### 2.10 Staggered card entrance

When a dashboard or audit page mounts, animate the row of `MetricCard`s in with a 40ms stagger and a 12px translate-up + opacity fade. Use Framer Motion (already in deps) or a CSS-only `animation-delay` approach. Skip when `prefers-reduced-motion`.

### 2.11 Keyboard shortcut legend chip

The ⌘K palette already exists. Add a persistent footer hint on dense pages (inbox, customers, history): a 18px chip row showing the 3 most useful shortcuts (`J/K` to nav, `Enter` to open, `S` to star).

```tsx
<KbdHint pairs={[['J/K', 'navigate'], ['↵', 'open'], ['S', 'watchlist']]} />
```

### 2.12 Pulse on "processing" status

For audits in-flight, the status chip gets a 2s pulse animation (opacity 1 → 0.6 → 1). Subtle. Stops on any non-processing state.

### 2.13 Recent activity ticker

On the dashboard, a thin canvas-colored strip below the KPI row showing the last 5 events across the whole tenant:

```
§ RECENT  · 2m ago — Audit run completed (1,204 rows)  · 14m ago — High-risk flag on jack.p@gmail.com  · 1h ago — Watchlist hit (CB-441)  →
```

Auto-scrolls horizontally on hover; static otherwise. Subtle, but immediately makes the app feel alive.

---

## Tier 3 — Polish details (small but compounding)

| # | Detail | Where |
|---|---|---|
| 3.1 | Tabular numerals everywhere — `fontVariantNumeric: 'tabular-nums'` on all data values | Global in `globals.css` for `.num` and DM Mono |
| 3.2 | Replace `→` arrows with `›` chevrons in body copy | Settings, drawer "open in profile" links |
| 3.3 | Date format: `2026-05-17` (ISO) in tables; "May 17, 2026" in prose; "2d ago" in recent context | Standardize via `formatDate(date, mode)` |
| 3.4 | Currency: always 2 decimals in tables, no decimals on hero metrics ≥ £1,000 | `formatCurrency(value, compact)` |
| 3.5 | Score format: always `0.92` (2 decimals, 0–1) in chips; never `92` | `RiskScoreBadge` already does this — audit callsites |
| 3.6 | Replace all `→` icon usages on Links with case-file `›` (thin chevron) | Global |
| 3.7 | Set `caret-color: #7B2D26` on inputs | `globals.css` |
| 3.8 | Selected row gets `borderLeft: '2px solid #7B2D26'` + `background: var(--bg-subtle)` | `DataTable` (extend) |
| 3.9 | Focus rings: `outline: 2px solid #7B2D26; outline-offset: 2px` everywhere consistent | Already partially in place — audit gaps |
| 3.10 | Scrollbar: thin, warm; `scrollbar-color: #D2C9B5 transparent` | `globals.css` |
| 3.11 | Replace generic Lucide icons in drawer (lines 558+) with semantic mapping: email/envelope, IP/globe, card/credit-card, name/user, address/map-pin | `IdentityField` glyph prop |
| 3.12 | Add `§ HISTORY` overline above audit list on `/history` | Page header `eyebrow` |
| 3.13 | `aria-current="page"` on active sidebar item — already done; verify focus-visible offset | `Sidebar.tsx` |
| 3.14 | Print stylesheet — evidence pages should print clean (no chrome, full-bleed) | `print.css` |
| 3.15 | Delete `components/common/EmptyState.tsx` (duplicate); single source `components/ui/EmptyState.tsx` | Cleanup |

---

## Execution order

**Phase 1 (Cleanup — 1 PR, foundational):**
- §1.1 drawer rebuild
- §1.2 customers table
- §1.3 dashboard token swap
- §1.4 audit results page
- §1.7 inbox priority styling
- §3.1, §3.5, §3.7, §3.8, §3.10, §3.15 (global polish)

**Phase 2 (Form / data screens):**
- §1.8 settings + new Input/Select primitives
- §1.13 lookup/watchlist/saved/history/chargebacks
- §1.6 audit nested pages
- §1.5 standalone customer page
- §1.11 audit charts palette
- §1.10 dashboard charts

**Phase 3 (Delight — gated behind a feature flag `experience_polish_v1` initially):**
- §2.1 Behavior roadmap (drawer + customer page)
- §2.2 Identity trail rebuild
- §2.3 Case summary strip
- §2.4 SparklineChip + plumb into MetricCard
- §2.5 RiskDistributionStrip on audit hero
- §2.6 useCountUp + apply to all KPI tiles
- §2.10 Staggered entrance
- §2.12 Processing pulse

**Phase 4 (High-stakes flows):**
- §1.9 Evidence package full document treatment
- §1.12 Identity components (timeline + cluster graph + cross-merchant)
- §2.7 Document chrome
- §2.8 Hover-reveal evidence
- §2.9 Empty state illustrations
- §2.11 Keyboard shortcut footer
- §2.13 Recent activity ticker
- §1.14 Help editorial chrome
- §1.15 Onboarding/upload

Each phase produces a shippable PR. Total scope: ~20-25 files touched, ~6 new components, ~3 new hooks. No data model changes.

---

## Component file map (new files to create)

```
components/
  ui/
    SparklineChip.tsx           § 2.4
    Input.tsx                   § 1.8
    Select.tsx                  § 1.8
    KbdHint.tsx                 § 2.11
  customers/
    BehaviorRoadmap.tsx         § 2.1
    CaseSummaryStrip.tsx        § 2.3
  audit/
    RiskDistributionStrip.tsx   § 2.5
  dashboard/
    ActivityTicker.tsx          § 2.13
hooks/
  useCountUp.ts                 § 2.6
lib/
  analysis/
    customerIntelligence.ts     extend with getEventStream(profile)
```

---

## Definition of done

For each page/component:

1. No `rounded-lg`, `rounded-xl`, `rounded-2xl`, or `rounded-3xl` survives (only `borderRadius: 3/4` via inline or the new tokens).
2. No `accent-500/600/700`, `bg-blue-*`, `bg-orange-*`, `bg-amber-*` Tailwind colors survive.
3. Every section header is the 10px tracked overline + `§` primitive.
4. Every data value sits in DM Mono.
5. Every status uses `Badge`, `RiskScoreBadge`, or `StatusChip` — no hand-rolled chips.
6. Every list page has `PageHeader` + `FilterBar` + `DataTable` + `EmptyState` — no bespoke list shells.
7. Every card uses `SectionCard` — no bespoke surface containers.
8. `prefers-reduced-motion: reduce` disables every Tier-2 animation cleanly.
9. Keyboard focus is visible and consistent on every interactive element.
10. Print (evidence pages) renders cleanly without chrome.

When all ten are true, the app feels like one continuous case file — beautiful, deliberate, and inhabited.
