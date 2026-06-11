# Unauth — Auth + App UI Cohesion: Implementation Document

**Scope:** `/login` → authenticated app. Not the landing page.
**Mode:** This document is the audit. The implementation pass should follow it without re-auditing the repo.
**Grounding:** All file paths, line numbers, token names, and violations below were verified against the repo on 2026-06-09. Line numbers may drift slightly; the values quoted will not.

---

## 1. Executive summary

Unauth's authenticated app is already built on a mature token system (`app/globals.css`) with a strong final-cascade override block ("Ramp redesign — Phase 0"): white surfaces, near-black ink (`--ink-primary: #1A1A1A`), hairline borders, a single lime brand pop (`--lime`), and a muted risk palette. The shared primitives (`Button`, `Card`, `DataTable`, `Badge`, `MetricCard`, `PageHeader`, the `workbench/*` system) are largely token-clean and good. The product language is already mostly correct ("claims", "evidence", "confidence grade" — no "fraudster"/"block"/"verdict" found in app copy).

The problem is not the system. The problem is the seams:

1. **The login page lives in the landing visual world, not the app's.** `app/(auth)/login/page.tsx` is built on `--landing-dark-*` tokens with warm-cream/espresso hex fallbacks (`#15140F`, `#E8E4D8`, `#B7A98D`, `#F8F5EE`), a hardcoded white card (`#FFFFFF` / `#D8D0BD` border / landing shadows), and rust-coral badge colours (`rgba(193,96,88,…)`, `#C16058`). A merchant signs in through a warm 2024-era landing aesthetic and lands in a white Ramp-style workbench. This is the single largest cohesion break in the product.
2. **The three auth pages don't even match each other.** `/reset` and `/reset/update` use app tokens (`--surface-base`, `--surface-raised`) but hand-roll their own inputs with inline styles instead of `components/ui/Input.tsx`. There is **no `app/(auth)/layout.tsx`** — each page is self-contained, so drift is structural.
3. **Hardcoded colour debt is concentrated, not diffuse.** The worst offenders are known and small in number: the login page (~27 raw values), `claimsPageData.ts` (18 Tailwind-palette hex values like `#DCFCE7`/`#991B1B` in status maps), the settings/integrations clients (`#2f6b43` repeated ~21 times as a var fallback, raw `rgba()` alert backgrounds), Shopify sync views, `SidebarAside.tsx` (`#b45309` ×4), `MobileOptimizationNotice.tsx`, and the `Modal`/`Drawer` backdrops.
4. **Three overlapping type scales coexist** in `globals.css` (`.text-display-xl…` / `.text-h1…` spec scale / legacy `.t-*` scale, plus `.page-title` and `.kpi-numeral*`). Pages mix them. The fix is not to edit `globals.css` — it is to mandate one scale for all edited components.
5. **Semantic colour discipline leaks**: green is used for "connected" and "prod environment" chrome, risk-orange is used for the demo banner. Risk colours must mean risk; green must mean clear/verified.

**Priority order matters:** shared chrome and primitives first (everything inherits), then auth, then pages. Touching pages before primitives multiplies rework.

The landing/public side has higher absolute visual debt. It is explicitly out of scope here. Do not drift into it.

---

## 2. Scope

### In scope

- `app/(auth)/**` (login, reset, reset/update; creating `app/(auth)/layout.tsx` is in scope)
- `app/(app)/**` UI (pages, page-view components, loading/empty states)
- `components/nav/**`, `components/layout/**`, `components/navigation/**`, `components/common/**`, `components/billing/**`, `components/mobile/**`
- `components/ui/**`, `components/workbench/**`
- `components/settings/**`, `components/shopify/**`
- `components/charts/echartsTheme.ts` (chart theming only — it feeds in-scope reports/dashboard surfaces)
- Copy inside the above files

### Out of scope — do not open, do not edit

```txt
app/(public)/landing/**
app/(public)/audit/**
app/(public)/audit-demo/**
app/(public)/demo/**
app/(public)/legal/**
app/api/** and all backend/API routes
Supabase logic (lib/supabase/**, supabase/**)
billing logic
webhook logic
data processing / scoring logic (lib/engine/**, lib/scorer.ts, lib/identity/**)
middleware
pages/
```

Notes for the implementer:

- `pages/` **does not exist**. This repo is App Router only.
- `middleware.ts` **does not exist**. Do not create one.
- **Do not edit** `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, or `app/(public)/layout.tsx`. The token system is the contract; this work conforms to it.
- CLAUDE.md ground rules apply: no `as any`, no `eslint-disable`, no changes to scoring/weighting/matching logic.

---

## 3. Files to inspect first

Read these in this order, and only these, before editing. Each phase's edits can begin once that phase's files are read.

**Phase 1 — Auth**

```txt
app/(auth)/login/page.tsx
app/(auth)/reset/page.tsx
app/(auth)/reset/update/page.tsx
app/(auth)/reset/resetFormStyles.ts        (referenced by both reset pages)
```

(There is no `app/(auth)/layout.tsx` — you will create one in Phase 2 of the sequence.)

**Phase 2 — App shell**

```txt
app/(app)/layout.tsx
components/nav/Sidebar.tsx
components/nav/SidebarAside.tsx
components/nav/SidebarInner.tsx
components/nav/SidebarNavItem.tsx
components/layout/AppHeader.tsx
components/layout/AvatarMenu.tsx
components/layout/MerchantEnvChip.tsx
components/layout/CommandPalette.tsx
components/layout/CommandPaletteInputBar.tsx
components/layout/CommandPaletteResultsList.tsx
components/layout/CommandPaletteSurface.tsx
components/navigation/RouteProgressBar.tsx
components/common/DemoBanner.tsx
components/billing/BillingStatusBanner.tsx
components/mobile/MobileOptimizationNotice.tsx
```

**Phase 3 — Shared UI primitives**

```txt
components/ui/Button.tsx          + components/ui/buttonStyles.ts
components/ui/ButtonLink.tsx
components/ui/Card.tsx
components/ui/SectionCard.tsx
components/ui/DataTable.tsx       + components/ui/dataTableStyles.ts
components/ui/Badge.tsx           + components/ui/badgeStyles.ts
components/ui/ConfidenceBadge.tsx
components/ui/GradeBadge.tsx
components/ui/MetricCard.tsx
components/ui/PageHeader.tsx      + components/ui/pageShellStyles.ts
components/ui/PrivacyBadge.tsx
components/ui/EmptyState.tsx
components/ui/Input.tsx
components/ui/Select.tsx
components/ui/Modal.tsx
components/ui/Drawer.tsx
components/ui/UnauthLogo.tsx
components/workbench/*            (WorkbenchPage, WorkbenchKpiStrip, WorkbenchNav,
                                   WorkbenchActionBar, WorkbenchEmptyState, DetailPageShell)
```

**Phase 4 — Core app pages**

```txt
app/(app)/dashboard/page.tsx
app/(app)/dashboard/DashboardPageCockpit.tsx
app/(app)/claims/page.tsx
app/(app)/claims/ClaimsPageView.tsx
app/(app)/claims/ClaimsQueueClient.tsx
app/(app)/claims/claimsPageUi.tsx
app/(app)/claims/claimsPageData.ts          (status/decision colour maps live here)
app/(app)/customers/page.tsx
app/(app)/customers/CustomersOverviewPageView.tsx
app/(app)/customers/CustomersPageWorkbench.tsx
app/(app)/customers/[id]/page.tsx
app/(app)/customers/[id]/CustomerProfilePageView.tsx
app/(app)/customers/[id]/CustomerProfilePageHero.tsx
app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx
app/(app)/customers/[id]/CustomerProfilePageSidebar.tsx
app/(app)/customers/[id]/CustomerProfilePageParts.tsx
app/(app)/customers/[id]/claims/page.tsx
app/(app)/chargebacks/page.tsx
app/(app)/chargebacks/ChargebacksPageWorkbench.tsx
app/(app)/chargebacks/[id]/page.tsx
app/(app)/chargebacks/[id]/EvidenceDetailPageView.tsx
app/(app)/chargebacks/[id]/EvidenceDetailCard.tsx
app/(app)/chargebacks/[id]/IdentitySignalsTable.tsx
app/(app)/chargebacks/[id]/NarrativeSummarySection.tsx
app/(app)/reports/page.tsx
app/(app)/reports/ReportsPageView.tsx
app/(app)/reports/ReportsOverviewTab.tsx
app/(app)/reports/ReportsLiveTab.tsx
app/(app)/reports/ReportsCsvTab.tsx
app/(app)/global/page.tsx
components/charts/echartsTheme.ts
```

**Phase 5 — Settings and integrations**

```txt
app/(app)/settings/layout.tsx
app/(app)/settings/account/page.tsx
app/(app)/settings/billing/page.tsx
app/(app)/settings/team/page.tsx
app/(app)/settings/integrations/page.tsx
app/(app)/settings/integrations/shopify/page.tsx
app/(app)/settings/integrations/gorgias/page.tsx
app/(app)/settings/integrations/zendesk/page.tsx
app/(app)/settings/integrations/freshdesk/page.tsx
app/(app)/settings/integrations/woocommerce/page.tsx
app/(app)/settings/integrations/bigcommerce/page.tsx
app/(app)/settings/data-privacy/page.tsx
app/(app)/settings/audit-trail/page.tsx
components/settings/IntegrationsSetupClient.tsx
components/settings/OrderSourceClient.tsx
components/settings/ApiIntegrationsHelpdeskSection.tsx
components/settings/GorgiasSupportSyncClient.tsx
components/settings/ZendeskSupportSyncClient.tsx
components/settings/FreshdeskSupportSyncClient.tsx
components/settings/WooCommerceConnectClient.tsx
components/settings/BigCommerceConnectClient.tsx
components/shopify/ShopifyIntegrationBannerInner.tsx
components/shopify/SyncStatusConnectedView.tsx
components/shopify/SyncStatusDisconnectedView.tsx
components/shopify/SyncStatusConnectModal.tsx
```

For tokens, **do not read all of `app/globals.css`** (4,600+ lines). Read only the `:root` block up to the end of the "RAMP REDESIGN — Phase 0" override (~line 616) and the type-scale utilities (~lines 920–1005). The Phase 0 block is last-declared and wins; it is the live palette.

---

## 4. Files not to inspect unless absolutely necessary

Do not burn context on these unless a component you are editing directly imports from them:

```txt
app/(public)/landing/**
app/(public)/audit/**
app/(public)/audit-demo/**
app/(public)/demo/**
app/(public)/legal/**
app/(internal)/**
app/api/**
lib/**
supabase/**
scripts/**
```

Additional repo-specific warnings:

- `components/ui/spotlight.tsx`, `components/ui/meteors.tsx`, `components/ui/border-beam.tsx` are landing-style decorative components that live in `components/ui/`. **Never import them into app or auth surfaces.** Do not "clean them up" either — out of scope.
- `components/charts/echartsTheme.ts` has ~25 raw colour values. Touch only the entries that feed in-scope charts, and only to repoint at tokens (see §8).
- `--landing-*` tokens in `globals.css` exist and are valid CSS — but they are **forbidden in auth/app components**. Their presence in `app/(auth)/login/page.tsx` is the bug, not a pattern to follow.

---

## 5. Seed/demo data instruction

There is a seed script available if the app is empty or not showing enough useful data (check `scripts/` for seed/demo tooling; a demo workspace also exists — sign in as the demo account if configured locally).

Before judging any design, determine which state the workspace is in:

- **empty** (no sources connected)
- **partially connected** (order source only, or helpdesk only)
- **demo-seeded** (DemoBanner visible)
- **fully populated**

Use seeded/demo data if needed to evaluate:

```txt
/dashboard
/claims
/customers
/customers/[id]
/customers/[id]/claims
/chargebacks
/chargebacks/[id]
/reports
/global
/settings/integrations
```

Do not optimise only for empty states. Every page change must be reviewed in **both** a populated operational state **and** its empty/waiting/disconnected state. The dashboard alone has four distinct states (`EmptyDashboardHero`, `PartialSetupHero`, `DashboardSyncWaitingHero`, cockpit) — all four must hold together visually.

---

## 6. Design system decisions

These decisions are binding for every edited file. They reference existing tokens only — no token changes.

### 6.0 Token ground truth (read this before anything else)

The live palette is the **Phase 0 Ramp override** at the end of `:root`. Practical consequences:

- `var(--copper-mid)` currently resolves to `#1A1A1A` (copper was retired to neutral dark). Treat `--action-primary` as the workhorse action colour and `--lime` as the *only* brand pop, used sparingly (DataTable selected-row indicator and sidebar count badge already use it — that is the right dose). **Never use `--lime` for risk, success, or status meaning.**
- Severity tokens are the only correct source for grade/risk colour: `--sev-definite`, `--sev-probable`, `--sev-possible`/`--sev-neutral`, `--sev-clear`, each with a `-fill` companion.
- Status (non-risk) colour comes from `--info`/`--success`/`--warning` + `-bg`/`-bd`, and `--privacy-ink`/`--privacy-fill`/`--privacy-border` for privacy affordances.
- Operational data colours exist and are underused: `--data-score`, `--data-currency`, `--data-id`, `--data-date`.
- Legacy aliases (`--bg-surface`, `--text-muted`, `--accent-500`, etc.) resolve correctly via the cascade. **In edited files, migrate to the canonical names** (`--surface-*`, `--ink-*`, `--action-primary`, `--border-*`) so drift stops compounding. Do not do repo-wide alias renames — only in files you touch.

### 6.1 Typography hierarchy

`globals.css` ships three overlapping scales. **The spec scale + KPI/mono utilities are canonical for all edited components.** Do not author new font-size literals.

| Role | Use | Notes |
|---|---|---|
| App page title | `.text-h1` (20px/600) inside `PageHeader`/`DetailPageShell` | Stop using `.page-title`/`.t-page-title` (36px) and the 2rem `PAGE_TITLE_STYLE` in app pages — 36px is landing-scale, not workbench-scale. 20px titles + dense content is the Ramp register. |
| Page subtitle | `.text-small` in `--ink-secondary` | One line. No marketing sentences. |
| Section heading | `.text-h2` (16px/600) | Used by `SectionCard` titles at section level. |
| Card title | `.text-h3` (14px/600) | |
| Table header | DataTable's existing 11px uppercase `--ink-tertiary` header — keep, it's correct | Letter-spacing as-is. |
| Table cell | `.text-small` (13px); numeric/ID cells get `.text-mono-sm` + `.num` | |
| KPI value | `.kpi-numeral-sm` (36px mono) for hero KPIs; `.text-mono-lg` for strip KPIs | KPI numerals are **always** `--font-mono` with tabular nums. Replace the mixed 28px/30px sans values in `DashboardPageCockpit` and `WorkbenchKpiStrip`. |
| KPI label | `.text-overline` in `--ink-tertiary` | |
| Badge/chip | `.text-meta` (12px/500); grade letters mono | Existing `Badge`/`GradeBadge` already comply. |
| Mono data value | `.text-mono-sm` or `.text-mono-md` + semantic colour (`--data-id`, `--data-date`, `--data-currency`) | Applies to: order IDs, hashes, signal names, amounts, timestamps, scores, k-values, webhook URLs, API key prefixes. |
| Empty-state copy | Title `.text-h3`, body `.text-small` in `--ink-secondary` | Max width ~44ch. |
| Form labels | `.text-meta`, `--ink-secondary`, sentence case | Kill the uppercase 12px inline-styled labels in the reset pages. |
| Form helper text | 12px (`.text-meta` weight 400 via class composition), `--ink-tertiary` | Error text: `--sev-definite`, same size — never bold-red shouting. |

### 6.2 Spacing system

Use `--space-*` tokens or Tailwind steps that match them. No arbitrary pixel padding in inline styles.

- **App shell gutters:** main content `px-6` desktop / `px-4` <1024px; content max-width stays **1600px** (`PAGE_SHELL_INNER_CLASS` — keep).
- **Page header:** `pt-6 pb-4` between header block and first content row; tabs sit flush under the title block with `mt-3`.
- **Card padding:** `Card` density tokens are canonical — `compact = var(--space-3)` (12px), `default = var(--space-4)` (16px), `relaxed = var(--space-5)` (20px). Settings/integration cards use `default`. Never hand-author card padding.
- **Table row height:** DataTable's `compact: 40 / default: 52 / relaxed: 60` stands. **Operational queues (claims, customers, chargebacks) use `compact`.** Settings tables use `default`.
- **Form field spacing:** 16px between fields (`space-y-4`), 6px label→input, 24px between form sections.
- **Settings page sections:** 24px (`space-y-6`) between `SectionCard`s.
- **Dashboard grid gap:** `gap-4` (16px) for KPI rows and module grids — uniformly. No mixed `gap-3`/`gap-6`.
- **Mobile breakpoints:** app is desktop-first with a 1024px notice; ensure nothing hard-breaks at 375px and 768px (stack grids, let tables scroll horizontally inside their card). Do not invest in bespoke mobile layouts.

### 6.3 Surface system

| Surface | Token |
|---|---|
| Base page background | `--surface-base` |
| Raised card | `--surface-raised` + `--border-default` (1px) |
| Inset data panel (code blocks, webhook URLs, signal stacks) | `--surface-overlay`, border `--border-subtle` |
| Sidebar | `--surface-overlay` (current — keep) |
| Header | current `color-mix` blur over `--surface-base` (keep), bottom border `--surface-border` |
| Modal/drawer | `--surface-raised`; backdrop `color-mix(in srgb, var(--ink-primary) 44%, transparent)` — replaces the hardcoded rgba |
| Empty-state surface | `--surface-base` with `ua-dot-grid-faint` permitted for hero empties only, border `--border-subtle` dashed |
| Risk surfaces | `--sev-*-fill` bg + `--sev-*` fg only |
| Success surfaces | `--success-bg`/`--success-bd`/`--success` only for verified/clear/synced-OK |
| Warning/info surfaces | `--warning-*` / `--info-*` |

Since base and raised are both white in Phase 0, **separation comes from borders, not background tint**. Cards are `--surface-raised` + 1px `--border-default` + `--shadow-xs` at most. Inset panels are the only tinted surfaces.

### 6.4 Border and shadow system

- Default border: `1px solid var(--border-default)`
- Subtle border (dividers, inset panels): `var(--border-subtle)`
- Focus: rely on the global `:focus-visible` ring (`--focus-ring`) and `--shadow-focus`; never custom focus styles.
- Active nav: current pattern (raised bg + `--border-default` + shadow) is correct; the lime count badge stays.
- Card shadow: `--shadow-xs` or none. Cards do not lift on hover; **only interactive rows/cards may hover with `--bg-hover` background, no translateY, no shadow growth.**
- Modal: `--shadow-modal`. Drawer: `--shadow-drawer`. Nothing else uses `--shadow-lg`+.

### 6.5 Data visualisation rules

- No decorative charts. Every chart answers an operational question (claim volume over time, evidence readiness funnel, grade distribution, match-rate trend, exposure).
- Chart series colours come from tokens via `echartsTheme.ts` — map: neutral series → `--data-neutral`/`--ink-tertiary` greys; grade-segmented series → `--sev-*`; the single emphasis series may use `--ink-primary`. The gauge gradient tokens (`--gauge-from/mid/to`) exist for the readiness gauge only.
- Risk colours appear **only** when the data dimension is risk/severity/grade. A bar chart of claim counts is neutral ink, not red.
- Green appears **only** for clear/verified/success.
- Axis labels and numeric annotations: `--font-mono`, 11–12px, `--ink-tertiary`.
- Tooltips: `--surface-raised`, `--border-default`, `--shadow-md`, mono values.
- No neon, no glows, no gradient fills under lines (a ≤6% opacity ink fill is the ceiling).

---

## 7. Page-by-page implementation plan

### 7.1 `/login` (plus `/reset`, `/reset/update`) — highest priority page

**Current issue:** The page is a landing artifact. Left panel runs on `--landing-dark-*` tokens with espresso hex fallbacks; the form card hardcodes `#FFFFFF`, `#D8D0BD`, landing shadows; case-file badge uses raw `rgba(193,96,88,…)`/`#C16058`. Reset pages use app tokens but hand-rolled inputs and a different layout. No shared auth layout.

**Desired impression:** Signing in already feels like standing inside the workbench. Same white surfaces, same ink, same mono operational data, same restraint.

**Specific changes:**

- Create `app/(auth)/layout.tsx`: shared canvas (`--surface-base`), centered/split frame, `UnauthLogo`, and a quiet footer (privacy + terms links, `.text-meta`, `--ink-tertiary`). All three auth pages render inside it.
- Keep the split layout (`lg:grid-cols-[1fr_480px]`) but rebuild the left panel **on app tokens, light theme** — drop the dark landing panel entirely. The left panel becomes a calm product vignette: a static, non-interactive composition of *real app primitives* (a `GradeBadge`, a row styled like the claims queue, a `PrivacyBadge`) rather than marketing imagery. Build it from the actual shared components so it cannot drift.
- Left-panel content: a restrained vertical sequence of four mono-labeled moments — `CLAIM OPENED` → `IDENTITY MATCHED` → `EVIDENCE READY` → footer line `No automated decision issued`. Each is one line of mono caption + one small primitive (e.g., `INR claim · ticket #4821`, `Match grade B · 4 merchants · k≥3`). A `PrivacyBadge` anchors the bottom ("Privacy-safe graph").
- Right panel: form card = `Card` primitive (`--surface-raised`, `--border-default`, `--shadow-xs`), `Input` and `Button` primitives (already used — keep), error/success states on `--sev-definite`/`--sev-clear` fills (already correct).
- Rebuild `/reset` and `/reset/update` on `Input` + `Button` + the new auth layout; delete the hand-rolled input style objects and retire `resetFormStyles.ts` if it becomes unused.

**Copy:** Headline "Sign in to your workspace" (not "Welcome back!"). Sub-line: "Claim intelligence for your support and disputes team." No exclamation marks, no "supercharge".

**Components involved:** `app/(auth)/*`, `components/ui/Input.tsx`, `Button.tsx`, `Card.tsx`, `UnauthLogo.tsx`, `PrivacyBadge.tsx`, `GradeBadge.tsx`.

**Acceptance criteria:** zero `--landing-*` references and zero raw hex/rgba in `app/(auth)/**`; all three auth pages share the layout; a screenshot of login next to `/dashboard` reads as the same product; left panel contains the literal line "No automated decision issued".

### 7.2 `/dashboard`

**Current issue:** Cockpit is structurally good (KPIs, trend, grade distribution, module cards, insights strip) but typographically loud (2rem title, 28px sans KPI values) and the KPI values aren't mono. Four entry states exist but weren't designed as a family.

**Desired impression:** An operations console you glance at, not a BI demo. Hierarchy: claim operations → evidence readiness → network density → sync state.

**Changes:** title to `.text-h1` ("Claim overview" copy stays); KPI values to `.kpi-numeral-sm`/`.text-mono-lg` with `--data-score`/`--data-currency`; module-card headers normalized to `SectionCard`; charts re-skinned per §6.5; the sync row (`DashboardSyncRow`) gets mono timestamps and `--info`/`--success` status dots (not green-by-default). Empty/partial/waiting heroes: rebuild on `EmptyState` `hero` variant with dot-grid background, each stating concretely what's missing and the one next action ("Connect an order source", "Historical sync in progress — first results within minutes").

**Acceptance:** all numerals mono+tabular; no risk colour on neutral KPIs; the four states share one visual family; no hex (`EmptyDashboardHero` and `PartialSetupHero` currently carry raw values — clean during rebuild).

### 7.3 `/claims`

**Current issue:** The list/detail split is right. `ClaimsPageView.tsx:78-80` hardcodes `#C7762B`/`#9A3B32`/`#3E7A63`; `claimsPageData.ts:61-76` carries an entire Tailwind-palette status map (`#FEF3C7/#B45309`, `#FEE2E2/#991B1B`, `#DCFCE7/#166534`) that bypasses the token system; decision label "CB disputed" is jargon.

**Desired impression:** The main operational queue — Ramp-dense, scannable, evidence-first.

**Changes:** Replace both colour maps with semantic tokens: waiting → `--warning-*`, high-evidence/overdue → `--sev-definite`(+fill), resolved-favourable → `--success-*`, neutral/open → `--sev-neutral-*`. Queue rows at `compact` density; row anatomy: status dot · claim ref (mono) · customer · grade letter (`GradeBadge` sm) · amount (mono, `--data-currency`) · age (mono). Detail panel: evidence summary above metadata; every signal name and value in mono.

**Copy:** keep "claim evidence", "review context", "Within threshold/Ageing". Rename "CB disputed" → "Chargeback disputed". No verdict framing anywhere — statuses describe evidence and process state, never guilt.

**Acceptance:** `claimsPageData.ts` and `ClaimsPageView.tsx` contain zero raw hex; status colours all resolve through `--sev-*`/`--warning-*`/`--success-*`; queue row height 40px; selected row uses the existing overlay + lime inset indicator.

### 7.4 `/customers`

**Current issue:** Reads adjacent to a CRM. Identity-intelligence signals (grade, footprint, continuity) compete with generic table furniture.

**Desired impression:** An identity-intelligence index. Each row is an identity cluster, not a "customer record".

**Changes:** Table columns prioritized: identity (name/handle) · `ConfidenceBadge` · merchants seen (mono count) · claims (mono) · last activity (mono date, `--data-date`) · exposure (mono currency). The analytics strip stays but charts follow §6.5 (grade distribution segmented by `--sev-*`; everything else neutral ink). Keep "Strong/Moderate/Light match band" labelling — it correctly frames grade as confidence, not verdict.

**Acceptance:** grade column uses the shared badge (no bespoke pills); all counts/dates/amounts mono; KPI strip values mono.

### 7.5 `/customers/[id]`

**Current issue:** The dossier structure (hero / main column / sidebar) is right, but `CustomerProfilePageMainColumn.tsx:69-70` hardcodes `#3E7A63`/`#9A3B32`, and the page risks reading as a rap sheet if risk colour spreads.

**Desired impression:** Forensic, not punitive. A case file an agent can defend.

**Changes:** Hero: name, `GradeBadge` with label ("Match confidence: B — Probable"), and the Network Footprint panel (§10). Main column: claim timeline with mono timestamps and per-event source chips; identity signals table — signal name (mono), value (hashed, mono, `--data-id`), weight, matched-at. Risk colour only on the grade and explicitly severe claim events; everything else ink. Sidebar: merchants-seen list with k-anonymity note, `PrivacyBadge`.

**Copy:** Section titles "Identity signals", "Claim timeline", "Network footprint", "Evidence trail". Never "offender history" energy — "This identity has N delivery claims across M merchants" states facts.

**Acceptance:** lines 69-70 tokenized (`--sev-clear` / `--sev-definite` or the `--evidence-*` aliases); the literal footer line "No automated decision issued" appears on the dossier (via the footprint panel, §10).

### 7.6 `/customers/[id]/claims`

**Desired impression:** Agent-usable claim review: the screen answers *"what evidence exists and how strong is it?"* in under five seconds.

**Changes:** Lead each claim card with evidence strength (use the `--evidence-strong/moderate/weak-*` alias tokens — they exist for exactly this) and the supporting-signal count; merchant decision/outcome fields are visually separated (own sub-card, neutral surface) from Unauth-supplied intelligence, with the divider labelled "Merchant outcome — recorded by your team".

**Acceptance:** evidence strength and merchant decision never share a card; evidence chips use the `--evidence-*` tokens; mono for all refs/dates/amounts.

### 7.7 `/chargebacks` and `/chargebacks/[id]`

**Current issue:** Detail view is close ("CE 3.0 ready", "Dispute readiness", "Signal snapshot" are good). Needs density and readiness clarity at the index level.

**Desired impression:** Evidence-package assembly line: which disputes are ready to submit, which need data.

**Changes:** Index: readiness column as a three-state chip — Ready (`--success-*`) / Needs data (`--warning-*`) / Insufficient (`--sev-neutral-*`) — plus due date (mono, urgency via `--warning` text only when imminent). Detail: `EvidenceDetailCard` rows label-left (`.text-meta`, `--ink-tertiary`) value-right (mono); "what's missing" panel as inset surface listing absent fields concretely ("No checkout AVS result on file").

**Copy:** Never promise outcomes. "CE 3.0 ready" ✓; "Win this dispute" ✗. Readiness describes documentation completeness, not predicted result.

**Acceptance:** readiness states use exactly the three chips above; signals/IDs/amounts mono; no green anywhere except Ready/verified.

### 7.8 `/reports`

**Current issue:** Tabs and panels exist; chart styling is the risk (`echartsTheme.ts` carries ~25 raw values; date-range buttons use `--copper-dim`).

**Desired impression:** Operational analytics a fraud-ops lead would screenshot into a weekly review.

**Changes:** Re-point `echartsTheme.ts` entries feeding these charts at tokens (§6.5). Views: claim volume, evidence readiness, refund exposure, network match rate, integration freshness. Range buttons become a neutral segmented control (`--surface-overlay` active, `--border-default`). KPI cards normalized to `MetricCard`. CSV tab: file specs and column names in mono inset panels.

**Acceptance:** no raw hex in edited chart config paths; grade distribution is the only multi-colour chart; axis/tooltip styling consistent across all three tabs.

### 7.9 `/global`

**Desired impression:** The network is the moat — show density without exposing anything. Privacy is rendered, not asserted.

**Changes:** Headline stat row (merchants, matched identities, claims observed — mono numerals); identity rows display **hashed identifiers in mono** (`--data-id`) with the `PrivacyBadge` adjacent; every aggregate that respects k-anonymity gets a small mono `k≥3` chip (token: `--privacy-ink`/`--privacy-fill`); suppressed cohorts state "Hidden below k-anonymity threshold" rather than showing dashes.

**Acceptance:** no raw PII rendered; `k≥3` chip pattern present; privacy chips use `--privacy-*` tokens only.

### 7.10 `/settings/integrations`

**Current issue:** The most duplicated surface in the app. `#2f6b43` appears ~21 times as a `var(--sev-clear, #2f6b43)` fallback across `IntegrationsSetupClient`, `OrderSourceClient`, `ApiIntegrationsHelpdeskSection`; Gorgias/Zendesk/Freshdesk clients use raw `rgba()` alert backgrounds; Shopify views carry Tailwind-palette fallbacks; provider pages hardcode brand hex icons; every provider hand-rolls its own status display.

**Desired impression:** Trust infrastructure. Status legible in one glance; setup instructions calm and precise.

**Changes:**

- Build one `IntegrationStatusChip` (in `components/settings/`): states `connected` (`--success-*`) / `attention` (`--warning-*`) / `error` (`--sev-definite-*`) / `not-connected` (neutral hollow dot) / `coming-soon`. Replace **every** hand-rolled dot/pill across the files above.
- Build one `IntegrationMessage` alert (success/warning/error) on `--success-bg`/`--warning-bg`/`--sev-definite-fill`; replace all raw-rgba message boxes in the three helpdesk sync clients and both commerce connect clients.
- Provider brand colours: a single `PROVIDER_BRAND` const in one file (e.g., `components/settings/providerBrand.ts`) holding the five hex values with a comment that these are third-party brand colours exempt from the token rule — used **only** for the provider mark, never for status or chrome.
- Webhook URLs, secrets, API-key prefixes: mono inset panels with copy buttons — identical pattern across Gorgias/Freshdesk/Zendesk/WooCommerce/BigCommerce.
- Setup copy normalized to one register: "Connect [provider] so Unauth can [specific data outcome]." Sentence case, no exclamation marks.

**Acceptance:** zero hand-rolled status indicators remain in the listed files; all alerts via `IntegrationMessage`; status colour identical across all seven providers; sync timestamps mono.

### 7.11 `/settings/data-privacy`

**Current issue:** Four decent `SectionCard`s, but the actual privacy architecture (HMAC-SHA256, per-tenant salts, k-anonymity, no raw PII in the graph) is **absent** — the page talks about retention and legal links.

**Desired impression:** Privacy architecture as a product feature, not legalese.

**Changes:** Add a "How identity matching protects PII" section: a four-step inset panel — raw identifier → `normalise` → `HMAC-SHA256 (per-tenant salt)` → privacy-safe graph — rendered as a mono text sequence (no hand-authored SVG illustration). State plainly: "Raw emails, addresses, and phone numbers never enter the cross-merchant graph. Matching happens on salted hashes. Cohorts smaller than k=3 are never shown." Reuse `PrivacyBadge` and the `k≥3` chip. Copy is declarative-technical, not defensive.

**Acceptance:** HMAC-SHA256, per-tenant salts, and k-anonymity are each named in UI copy; the section uses mono inset panels; no new backend calls.

### 7.12 App shell (cross-cutting)

- `SidebarAside.tsx:110-118`: replace the four `#b45309` values with `--warning` (+ existing color-mix pattern).
- `MobileOptimizationNotice.tsx:20-22`: `#B45309`/`#92400E` → `--warning`/`--warning-bg`/`--warning-bd`.
- `DemoBanner`: currently `--risk-high-*` — demo data is not a risk state. Move to `--info-*`.
- `MerchantEnvChip`: prod pill currently `--risk-low-*` green — environment is not a verified/clear state. Move to neutral (`--bg-subtle`/`--text-muted`) for non-prod and `--info-*` for prod.
- `Modal.tsx:54` / `Drawer.tsx:83`: backdrops → `color-mix(in srgb, var(--ink-primary) 44%, transparent)` (and 42%).
- Command palette: results that include grades must use `GradeBadge`, not the `GRADE_COLOURS` map directly; IDs/amounts in results mono.

---

## 8. Hardcoded colour cleanup plan

Replace raw values with tokens; **never edit global tokens**. "Fallback hex" in `var(--x, #hex)` counts as a violation — drop the fallback once the token reference is canonical (every token below exists unconditionally in `:root`).

Verified violations (file → what → replacement):

| File | Violation | Replacement |
|---|---|---|
| `app/(auth)/login/page.tsx` | ~27 values: `--landing-dark-*` fallbacks `#15140F #E8E4D8 #B7A98D #5A5650 #B8B2A0 #2B2922 #1C1612 #D4C7AF`; canvas `#F8F5EE`; card `#FFFFFF`/`#D8D0BD`/`rgba(26,24,20,…)` shadows; badge `rgba(193,96,88,0.4/0.1)`/`#C16058` | Page rebuilt on app tokens (§7.1): `--surface-base/raised`, `--border-default`, `--shadow-xs`, `--ink-*`, badges via `--sev-*` fills. No `--landing-*` survives. |
| `app/(app)/claims/claimsPageData.ts` *(added — worst offender, 18 hits, lines 61–76)* | Tailwind palette: `#FEF3C7/#B45309`, `#FEE2E2/#991B1B`, `#DCFCE7/#166534` | `--warning-bg/--warning`, `--sev-definite-fill/--sev-definite`, `--success-bg/--success`. Pure colour-map swap; touch no logic. |
| `app/(app)/claims/ClaimsPageView.tsx:78-80` | `#C7762B #9A3B32 #3E7A63` | `--sev-probable`, `--sev-definite`, `--sev-clear` |
| `app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx:69-70` | `#3E7A63 #9A3B32` | `--sev-clear`, `--sev-definite` (or `--evidence-strong-fg`/`--evidence-weak-fg` if semantically evidence-strength) |
| `components/settings/IntegrationsSetupClient.tsx` (9×), `OrderSourceClient.tsx` (6×), `ApiIntegrationsHelpdeskSection.tsx` (6×) | `var(--sev-clear, #2f6b43)` fallbacks | `var(--sev-clear)` / `--success` via the new `IntegrationStatusChip` (§7.10) |
| `components/settings/GorgiasSupportSyncClient.tsx`, `ZendeskSupportSyncClient.tsx`, `FreshdeskSupportSyncClient.tsx` | alert bgs `rgba(180,50,50,0.08)`, `rgba(180,130,40,0.12)`, `rgba(47,107,67,0.10)` | `--sev-definite-fill`, `--warning-bg`, `--success-bg` via `IntegrationMessage` |
| `components/settings/WooCommerceConnectClient.tsx`, `BigCommerceConnectClient.tsx` | same fallback/alert pattern (2× each) | same as above |
| `app/(app)/settings/integrations/{gorgias,zendesk,freshdesk,woocommerce,bigcommerce}/page.tsx` | brand icon hex `#FF6B35 #03363D #25C16F #7F54B3 #34313F` | centralise in `providerBrand.ts` with exemption comment (§7.10) |
| `components/shopify/ShopifyIntegrationBannerInner.tsx` (9×), `SyncStatusConnectedView.tsx` (5×), `SyncStatusDisconnectedView.tsx` (3×), `SyncStatusConnectModal.tsx` (3×) | Tailwind-palette fallbacks `#DCFCE7 #166534 #BBF7D0 #FEF3C7 #92400E #FDE68A #FEE2E2 #991B1B #FCA5A5 #D97706` | drop fallbacks → bare `var(--success…)`, `var(--risk-medium…)`, `var(--risk-high…)`; status dots via `IntegrationStatusChip` |
| `components/nav/SidebarAside.tsx:110-118` | `#b45309` ×4 | `--warning` |
| `components/mobile/MobileOptimizationNotice.tsx:20-22` | `#B45309 #92400E` | `--warning`, `--warning-bg`, `--warning-bd` |
| `components/ui/Modal.tsx:54`, `components/ui/Drawer.tsx:83` | backdrop `rgba(17,18,16,0.44/0.42)` | `color-mix(in srgb, var(--ink-primary) 44%/42%, transparent)` |
| `components/charts/echartsTheme.ts` *(added, ~25 hits)* | chart palette hex | re-point at §6.5 token mapping; only entries feeding in-scope charts |
| `app/(app)/settings/integrations/zendesk/page.tsx:1`, `components/settings/ZendeskSetupClient.tsx` (5×), `ChromeSetupClient.tsx`, `HelpdeskSidebarPreview.tsx`, `GorgiasWebhookSetupPanel.tsx`, `FreshdeskWebhookSetupPanel.tsx`, `*ConnectionDetails.tsx`, `*CreateForm.tsx`, `TeamManagementClient.tsx`, `ApiKey*Dialog*.tsx`, `AccountDangerSection.tsx` *(added, 1–5 hits each)* | scattered hex/rgba | same token mapping; sweep while editing each file in Phase 5 |
| `components/EmptyDashboardHero.tsx` (4×), `components/PartialSetupHero.tsx` (2×), `components/dashboard/InsightsStrip.tsx` (3×), `components/connections/ConnectionPromptStrip.tsx` (3×) *(added)* | raw values in dashboard-state components | clean during the §7.2 rebuild |

Out-of-scope hits the scan also surfaced — **do not touch**: `components/apply/*`, `components/signup/*` (public funnel), `components/internal/*`, `components/ui/{spotlight,meteors,border-beam}.tsx`.

---

## 9. Component consolidation recommendations

**Make default (already good — leave internals alone, adopt everywhere):**
`Button`/`ButtonLink` (token-clean, full variant set), `Card` (variant+density), `DataTable` (density, sort, skeleton, lime selected-indicator), `Badge`, `MetricCard`, `PageHeader`, `PrivacyBadge`, `EmptyState`, `Input`, the entire `components/workbench/*` system (`WorkbenchPage`, `WorkbenchKpiStrip`, `WorkbenchNav`, `WorkbenchActionBar`, `WorkbenchEmptyState`, `DetailPageShell`). These are stable; pages migrate **to** them.

**Consolidate:**

- `ConfidenceBadge` vs `GradeBadge` — both render letter grades via `letterGradeTone()`. **`GradeBadge` becomes canonical** (richer sizes). `ConfidenceBadge` becomes a thin re-export or is migrated away in edited files; do not leave two divergent grade renderers.
- Bespoke status dots/pills in settings (`IntegrationsSetupClient`, `OrderSourceClient`, `ApiIntegrationsHelpdeskSection`, Shopify views, all five sync clients) → new `IntegrationStatusChip` + `IntegrationMessage` (§7.10).
- Hand-rolled inputs in `app/(auth)/reset/*` → `components/ui/Input.tsx`; retire `resetFormStyles.ts`.
- Status/decision colour maps in `claimsPageData.ts` and inline maps in `ClaimsPageView` → token-based maps colocated with `claimsPageUi.tsx` (one source).
- KPI value styling — `WorkbenchKpiStrip` and `DashboardPageCockpit` each define their own numeral styles → both adopt `.kpi-numeral-sm`/`.text-mono-lg`.

**Token cleanup only (no API changes):** `Modal`, `Drawer` (backdrops), `SectionCard` (`borderRadius: 8` → `var(--radius-md)`), `Select` (`height: 36` → `var(--input-height)`).

**Do not touch:** `UnauthLogo` (variant system is fine), `buttonStyles.ts`/`badgeStyles.ts`/`dataTableStyles.ts` internals, `RouteProgressBar`, `CommandPaletteSurface` structure, and the decorative `spotlight`/`meteors`/`border-beam` files (never import, never edit).

**Remove from app surfaces:** any direct use of `GRADE_COLOURS` for inline-styled pills where `GradeBadge` fits (command palette results are the known case).

---

## 10. Distinctive product moment: the **Network Footprint panel**

One shared component (suggested: `components/ui/NetworkFootprint.tsx`) rendered identically in four places: customer dossier hero, claim detail panel, chargeback evidence package, and (compact variant) `/global` rows.

**Anatomy** — a single-row inset panel (`--surface-overlay`, `--border-subtle`, `--radius-md`), four mono cells separated by hairline dividers:

```txt
MERCHANTS    CLAIMS      MATCH GRADE     PRIVACY
7            12          B · Probable    k≥3 ✓
```

- Labels: `.text-overline`, `--ink-tertiary`. Values: `.text-mono-md`, `--data-score`; grade cell renders `GradeBadge` `sm`; privacy cell uses `--privacy-ink`/`--privacy-fill`.
- Fixed footer line, always present, `.text-meta` in `--ink-tertiary`: **"No automated decision issued — evidence for agent review."**
- Props are display-only (`merchants`, `claims`, `grade`, `kSatisfied`) — all four host pages already fetch these values; zero backend change.

**Why this one:** it is the product's entire argument in 56 pixels — cross-merchant density (the moat), confidence-not-verdict (the legal/ethical posture), and k-anonymity (the privacy story) — repeated at every decision moment until it becomes the thing users remember and describe to other merchants. It is also the cheapest of the candidate ideas to ship consistently, and the footer line operationalises the positioning rule ("Unauth never sounds like it is making the decision") as a rendered artifact rather than a style-guide aspiration.

---

## 11. Implementation sequence

1. **Audit tokens and shared primitives** — read the Phase 0 token block + type utilities; fix `Modal`, `Drawer`, `SectionCard`, `Select`; build `IntegrationStatusChip`, `IntegrationMessage`, `NetworkFootprint`; settle `GradeBadge` consolidation.
2. **Fix auth** — create `app/(auth)/layout.tsx`; rebuild login on app tokens; migrate reset pages to `Input`/`Button`.
3. **Fix app shell** — `SidebarAside` warning hex, `DemoBanner` → info, `MerchantEnvChip` → neutral/info, `MobileOptimizationNotice` tokens, command-palette grade badges.
4. **Fix shared cards/tables/badges/buttons usage** — KPI numerals to mono scale across `WorkbenchKpiStrip` + dashboard; type-scale migration in `PageHeader`/`DetailPageShell` consumers.
5. **Fix core operational pages** — claims (colour maps first), customers, customer dossier (+ NetworkFootprint), chargebacks, reports (+ `echartsTheme` mapping), global.
6. **Fix settings/integrations** — adopt the two new settings primitives across all seven providers; data-privacy architecture section; `providerBrand.ts`.
7. **Fix empty/loading/error states** — dashboard's four states, workbench empties, skeletons.
8. **Screenshot and compare across breakpoints** — 375 / 768 / 1280 / 1600, populated and empty, login beside dashboard.
9. **Run lint/typecheck.**
10. **Final hardcoded colour sweep** — re-run a hex/rgba grep over every edited file; the §8 table must come back empty for in-scope files.

---

## 12. Verification checklist

- [ ] No hardcoded hex in edited files (grep `#[0-9a-fA-F]{6}` returns nothing in-scope; `providerBrand.ts` is the sole documented exemption)
- [ ] No raw `rgba(` in edited files unless wrapping CSS variables or `color-mix`
- [ ] Login and app shell feel visually connected (side-by-side screenshot)
- [ ] Sidebar and top header match the rest of the app
- [ ] Tables have consistent density (operational queues compact/40px)
- [ ] Cards have consistent padding, radius, border, and shadow (Card density tokens only)
- [ ] Mono font is used for IDs, hashes, grades, signal names, amounts, order IDs, timestamps
- [ ] Risk colour appears only for risk/severity/grade states (DemoBanner and env chip no longer use it)
- [ ] Green appears only for clear/verified/success states
- [ ] No "fraudster", "block", "auto-decline", or "verdict" language in edited copy
- [ ] "No automated decision issued" renders on dossier, claim review, and evidence surfaces (via NetworkFootprint)
- [ ] Populated states reviewed (seed/demo data if needed)
- [ ] Empty/waiting/disconnected states reviewed
- [ ] 375px, 768px, 1280px, 1600px layouts reviewed
- [ ] No console errors on the routes in §5
- [ ] Typecheck passes
- [ ] Lint passes (including the `no-restricted-imports` rules in CLAUDE.md)
- [ ] App Router only; no `pages/`, no `middleware.ts` created
- [ ] No `app/(public)/**` files touched
- [ ] No backend, auth logic, scoring, or Supabase code touched
- [ ] `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `app/(public)/layout.tsx` untouched
