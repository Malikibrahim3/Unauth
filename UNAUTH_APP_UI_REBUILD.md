# Unauth Authenticated App — Full UI Rebuild

**Implementation specification. Audience: the AI coding agent executing this inside the Unauth repository.**

Execute this document end to end. Do not ask for clarification. Every rule here is final. Where the codebase contradicts an assumption made in this document, resolve it during Phase 0 (Section 16) and record the discrepancy in the implementation report — do not stop work.

---

## 1. Scope

Rebuild the entire authenticated Unauth UI from the auth pages onward: visual system, app shell, navigation, page layouts, cards, tables, detail pages, settings, empty states, loading states, error states, copy, and interaction patterns. This is not a polish pass and not a component tweak. Replaced UI must not survive — old patterns, old styles, and old layout code are removed in Phase 6.

**In scope (rebuild freely):** page layout, component structure, styling, UI copy, visual hierarchy, navigation labels, section ordering, empty/loading/error states, table and card presentation, responsive behaviour.

**Out of scope (read-only — never modify):** API routes, Supabase queries, database schema, RLS policies, auth logic and middleware, the scoring / identity / evidence engine, billing logic, import logic, integration sync logic, environment variable expectations. Phase 0 produces an explicit list of these files; the final audit verifies via git diff that none were touched.

**Adapter rule:** if a page needs data in a different shape than the existing query returns, write a pure UI-layer adapter function (in `lib/ui-adapters.ts` or co-located with the page). Never modify the query, the API route, or the schema. If data needed for a design does not exist in the backend, render the designed empty/limited state and log it in the implementation report. Do not invent data. Do not add endpoints.

**No-dead-UI rule:** never ship a control that is not wired to existing functionality. No disabled "coming soon" buttons, no search boxes with no data source, no nav links to routes that don't exist. If a designed element has no backing functionality, omit it and record it in the report.

**Functionality preservation:** do not silently remove functionality. If a current page does something, the rebuilt page does it too — redesigned, not deleted. If a route is broken, fix only the minimum needed for the UI to render safely, and note it in the report.

---

## 2. Stack and ground rules

- **Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres, RLS, magic-link auth), deployed on Vercel. Work within this stack.
- Keep shadcn/ui as the primitive layer. Restyle via tokens and component variants. Do not swap in another component library, CSS framework, or design system.
- **Allowed new dependencies:** `lucide-react` (if not already present) and `next/font`. Nothing else. No animation libraries (CSS transitions only, unless framer-motion is already installed — in which case it may be used sparingly). No charting libraries — if one is already installed, restyle its output with tokens; if not, use the CSS `DistributionBar` component defined in Section 8.
- **Icons:** lucide-react only. Default 16px in nav, tables, and chips; 20px in empty states and page headers. Never emoji, anywhere.
- **TypeScript:** no `any` in new code. All components have typed props.
- **Routes:** every existing URL path is preserved exactly. Restyle in place. Only restructure files if a shared authenticated layout requires a route group — and if so, move files without changing URL paths and verify auth middleware still applies to every route.
- All component styling flows through the token system (Section 6). Zero hardcoded hex values in components. Zero raw Tailwind palette classes (`bg-slate-100`, `text-purple-600`, etc.) in app code.

---

## 3. Product context

Unauth is a cross-merchant claim intelligence and evidence platform for ecommerce brands. It helps merchant support, risk, and finance teams understand refund, delivery, item-not-received, return, and chargeback claims with context before they refund, reship, escalate, or dispute.

Unauth connects: helpdesk tickets, ecommerce order history, delivery evidence, customer claim history, identity continuity signals, merchant-local behavioural history, privacy-safe cross-merchant network signals, and evidence packs for chargebacks and internal review.

Unauth is **not** a helpdesk, not a fraud blocker, not a decision engine, and not a replacement for Gorgias, Zendesk, Freshdesk, Shopify, Stripe, or carrier systems. It is the evidence layer that sits across those systems.

Every screen must let the user answer, at a glance:

1. What claim / customer / order / ticket am I looking at?
2. What evidence exists?
3. Where did each piece of evidence come from?
4. How strong is the identity link?
5. Is this merchant-local or network context?
6. What can be exported or used in a dispute?
7. What is missing or uncertain?

The product presents evidence and context. The merchant decides. The UI never instructs a decision.

---

## 4. Product non-negotiables (hard constraints)

These override everything else in this document, including any conflicting copy found in the existing codebase.

1. **The word "fraud" and its derivatives never appear in merchant-facing UI strings.** Internal identifiers, legacy table names, and route slugs may remain in code; rendered text may not contain them. Full banned vocabulary is in Section 15.
2. **No numeric risk scores are ever rendered.** Confidence grades only. If the backend returns a numeric value, map it to the grade labels that already exist in the codebase (discover them in Phase 0 — do not invent new grade names). Never display a 0–100, a percentage risk, or a raw score, anywhere in merchant-facing UI.
3. **No merchant ever sees another merchant's data or customer identity.** Network context renders exclusively as aggregate, pseudonymous signals. No UI element may state or imply per-merchant visibility into another merchant's customers.
4. **Backend gating is respected, never worked around.** If the API withholds network data (anonymity thresholds, plan gating, insufficient corroboration), the UI renders the designed limited/locked state. The UI layer never reconstructs, infers, or back-fills gated data.
5. **Evidence, not verdicts.** No "approve claim" / "deny claim" / "block customer" actions are invented. Statuses describe evidence ("Evidence ready", "Limited delivery context"), never judgments about people.

---

## 5. Visual direction

**Light theme only.** One theme across the entire authenticated app, including auth pages. No dark mode, no theme toggle, no `prefers-color-scheme: dark` overrides, no dark panels or dark sidebars mixed into the light app. Dark-mode variants are explicitly out of scope.

**Quality bar:** Stripe Dashboard, Ramp, and Linear's restraint and density transposed to a light surface system. Calm, precise, data-rich, operational, expensive. Distinctively Unauth — not a template, not a generic admin dashboard, not a fraud toy.

**Palette character:** cool neutral off-white canvas, white surfaces, graphite ink, a muted indigo-violet accent, and a disciplined semantic colour set. Graphite is the *text* colour in this system, not a surface colour.

**Retire the legacy palette.** The previous design used a warm cream / brown / burgundy palette. None of it survives in the authenticated app: remove or replace those tokens, classes, and any hardcoded values wherever they appear in authenticated UI. Do not let the new background drift warm/cream — the canvas is cool neutral.

**Banned visual patterns:** multi-colour gradients, gradient text, gradient blobs, glassmorphism cards, frosted panels, illustration mascots, stock imagery, emoji icons, neon glows, bouncy or springy animation, per-metric random colours, heavy drop shadows, over-rounded "toy" cards, decorative background textures.

**Single allowed exception:** the sticky top bar may use translucency with background blur (`rgba(255,255,255,0.85)` + blur). Nothing else in the app is translucent.

**Signature visual language** (this is what makes the app recognisably Unauth — apply it consistently rather than adding decoration elsewhere):

- Every piece of evidence renders as an **evidence card** carrying a **source chip** (origin system + received timestamp).
- Every claim ref, order ref, profile ID, and pseudonymous identifier renders in the **mono face**.
- Identity confidence renders as a **segmented band** (filled segments + grade label), never a number.
- **Merchant-local vs network** context is always visually distinguished via the two dedicated semantic colours — this two-tone distinction is carried through badges, panels, and signal rows across the whole app.

---

## 6. Design tokens

Define CSS variables in `globals.css`, map them into the Tailwind config as semantic colour names, and align shadcn/ui's semantic classes to them. Components consume semantic tokens only.

**v1 token values.** Adjust a value only if a real combination fails WCAG AA (4.5:1 for text and badge labels) — fix the token, never patch individual components.

```css
/* Surfaces */
--bg:               #F6F7F9;   /* app canvas */
--surface:          #FFFFFF;   /* cards, panels, sidebar, top bar */
--surface-sunken:   #F0F2F5;   /* table header rows, input wells, timeline rails, code/ID blocks */
--surface-overlay:  #FFFFFF;   /* menus, popovers, modals (with --shadow-overlay) */

/* Borders */
--border:           #E3E6EB;
--border-muted:     #ECEEF2;

/* Text */
--text-primary:     #14171C;   /* graphite ink: titles, values, body */
--text-secondary:   #5A6372;   /* labels, supporting text */
--text-tertiary:    #67707F;   /* timestamps, metadata, captions */

/* Brand / interactive */
--accent:           #5B5BD6;   /* links, primary buttons, active nav, focus */
--accent-hover:     #4E4EC4;
--accent-soft:      #EFEFFC;   /* active-nav bg, selected states, soft fills */
--accent-border:    #C9C9F0;

/* Status — evidence semantics */
--success:          #18794E;   /* evidence ready / verified */
--success-soft:     #E9F6EF;
--success-border:   #BBE3CD;

--warning:          #AB6400;   /* limited / missing evidence, needs review */
--warning-soft:     #FBF1E2;
--warning-border:   #EBD2A9;

--critical:         #CE2C31;   /* severe only: failed integrations, destructive confirms */
--critical-soft:    #FCEAEA;
--critical-border:  #F3C2C2;

--neutral:          #667085;   /* unknown / no data */
--neutral-soft:     #F1F2F4;
--neutral-border:   #DDE0E5;

/* Signal provenance */
--network:          #0E7490;   /* cross-merchant network context */
--network-soft:     #E6F4F8;
--network-border:   #BCDFE9;

--local:            #50617B;   /* merchant-local context */
--local-soft:       #EEF1F6;
--local-border:     #D5DCE6;

/* Focus & elevation */
--focus-ring:       var(--accent);
--shadow-sm:        0 1px 2px rgba(20, 23, 28, 0.05);   /* sticky top bar only */
--shadow-overlay:   0 4px 16px rgba(20, 23, 28, 0.10);  /* menus, popovers, modals only */
```

**Usage rules:**

- Cards and panels are **border-defined, not shadow-defined**: `--surface` on `--bg` with a 1px `--border`. No resting shadows on cards.
- `--critical` is rare. Target at most one critical element visible per screen in normal operation. It is never used for "risky customer" semantics — only system failures, destructive confirmations, and genuinely severe alerts.
- Purple (`--accent`) means *interactive/brand* only. It is never a status colour.
- Status and provenance colours appear only through the `StatusBadge` / `ConfidenceBadge` / `SourceChip` / signal components — never as ad-hoc text colouring.
- `--network` and `--local` are reserved exclusively for the provenance distinction. Do not reuse them decoratively.

**Geometry:**

- Radii: 6px controls (buttons, inputs, selects), 10px cards/panels/modals, 4px badges and chips (sharp rectangular chips, not pills).
- Spacing: 4px base grid. Standard steps: 4 / 8 / 12 / 16 / 24 / 32.
- Borders: 1px everywhere. No 2px decorative borders.

---

## 7. Typography and formatting

- **UI face:** use the sans already configured if it is Inter or Geist; otherwise install Inter via `next/font/google`. **Mono face:** Geist Mono or JetBrains Mono via `next/font` — used for claim refs, order refs, profile IDs, pseudonymous identifiers, hashes, and API keys.
- Apply `font-variant-numeric: tabular-nums` to all numeric data: metric values, table number cells, currency, counts.

**Type scale (size/line-height, weight):**

| Role | Spec | Colour |
|---|---|---|
| Page title | 20/28, 600 | `--text-primary` |
| Section title | 14/20, 600 | `--text-primary` |
| Micro-label (card labels, table headers) | 11/16, 600, +0.06em tracking, uppercase | `--text-secondary` |
| Body | 14/20, 400 | `--text-primary` |
| Table cell | 13/18, 400 | `--text-primary` |
| Metadata / caption | 12/16, 400 | `--text-tertiary` |
| Metric value | 26/32, 600, tabular | `--text-primary` |
| Metric delta / context | 12/16, 500 | semantic |
| Mono identifier | 12–13, 450 | `--text-primary` |

**Formatting rules — centralise in `lib/format.ts` and use everywhere:**

- Currency via `Intl.NumberFormat`, using the merchant's currency where the data provides it.
- Dates: absolute in detail views ("12 Mar 2026, 14:32"); relative in tables ("2h ago") with the absolute value in a tooltip.
- Counts with thousands separators.
- Truncated cells get a tooltip with the full value.

---

## 8. Component system

**Locations:** primitives in `components/ui/` (shadcn-extended), shell and cross-page composites in `components/app/`, feature-specific composites co-located per feature folder. Variants via `class-variance-authority` (ships with shadcn).

**Central status config:** one map in `lib/status.ts` drives every badge variant, label, and colour in the app. No page defines its own status colours.

Status vocabulary → token mapping:

| Status | Token set |
|---|---|
| Evidence ready / verified delivery context | success |
| Limited evidence / needs review / missing delivery proof | warning |
| Network context | network |
| Merchant-local | local |
| Unknown / no data | neutral |
| Integration error / severe alert | critical |

**`ConfidenceBadge`:** renders the grade labels that already exist in the codebase (discover in Phase 0; do not rename or invent grades). Visual: a 3-segment band with 1–3 segments filled mapped to low → high grades, plus the text label. Never renders a number.

**Required components** (build or rebuild; consistent radius, padding, border, hover, focus ring, and icon size across all of them):

- **Shell:** `AppShell`, `Sidebar`, `SidebarNavItem`, `WorkspaceSwitcher` (only if multi-workspace exists in the data model — otherwise a static merchant name display), `TopBar`, `GlobalSearch` (only if a search endpoint or client-searchable dataset exists), `UserMenu`, `PlanIndicator`, `IntegrationStatusDot`.
- **Layout:** `PageHeader` (title, description, breadcrumbs, action slot), `Section`, `DetailRail` (right-hand metadata panel), `Tabs`, `SegmentedControl`.
- **Data:** `DataTable` (sticky header, sortable columns where data supports it, row hover, right-aligned numeric columns, column priority tiers for responsive hiding), `MetricCard`, `EvidenceCard`, `SignalRow`, `Timeline` / `TimelineRow`, `StatusBadge`, `ConfidenceBadge`, `SourceChip`, `DistributionBar` (pure CSS stacked bar for status/confidence distributions), `IntegrationCard`, `SettingsRow`, `BillingTierCard`.
- **States:** `EmptyState`, `LockedState` (plan-gated), `ErrorState`, skeletons (`SkeletonTable`, `SkeletonCards`, `SkeletonDetail`), `ExportButton` (wired to existing export logic only).

---

## 9. App shell

**Sidebar:** 240px fixed, full height, `--surface` with a right `--border`. Top to bottom: Unauth wordmark (text wordmark; do not generate a logo), workspace/merchant display, primary nav, flexible spacer, secondary nav (Settings, plus Docs/Support only if those routes exist), then a compact plan indicator and integration status summary.

- Nav item: 32px height, 16px icon, 13px/500 label, 6px radius. Active state: `--accent-soft` background, `--text-primary` label, `--accent` icon. Hover: `--surface-sunken`.
- **Navigation labels (target IA):** Overview, Claims, Customers, Evidence, Network, Integrations, Settings. Phase 0 maps every existing authenticated route to this IA. If the codebase has separate Evidence and Reports surfaces, decide in Phase 0 whether they merge under "Evidence" or remain separate — based on what the routes actually do. Never create a nav link to a route that doesn't exist; never orphan an existing route — unmapped pages get a sensible label and placement.
- If a current route is named "watchlist" or similar, **keep the URL path, change every visible label to "Network".**

**Top bar:** 56px, sticky, `--surface` (translucent + blur allowed), bottom `--border`, `--shadow-sm`. Contains: breadcrumb/page context, global search (only if backed by data), integration status indicator, page-level primary action slot, user menu. Keep it sparse.

**Content area:** max-width 1400px, centred, 24px horizontal padding. Every page: `PageHeader` first, sections spaced 24–32px, identical grid and rhythm across all pages. No page invents its own layout system.

**Breakpoints:** ≥1024px fixed sidebar; <1024px the sidebar becomes an overlay drawer toggled from the top bar.

---

## 10. Page specifications

Build only what existing data and logic can back. Anything below that lacks a data source gets its designed empty/limited state instead, plus a line in the implementation report.

### 10.1 Auth (sign in, sign up if present, magic link states, callback)

- Light, like everything else. Two-column split at ≥1024px: **left** — form panel on `--surface`, form max-width 360px, vertically centred; **right** — a `--accent-soft` / token-tinted panel carrying one product statement and a subtle evidence/network line visual built in SVG/CSS from the token palette (no stock imagery, no gradient blobs, no dark background). Below 1024px: single centred column, visual hidden.
- Copy: heading "Sign in to Unauth"; supporting line "Claim evidence, connected across your commerce stack."
- Magic-link flow states, all designed: idle, sending, sent ("Check your inbox — we sent a sign-in link to {email}"), error. The auth callback route gets a branded loading state, never a blank page.
- **Do not touch Supabase auth calls, redirects, or middleware.** Restyle only. The final audit verifies auth code paths are unmodified by diff.

### 10.2 Overview

An evidence-command dashboard, not an analytics vanity screen. Modules, in order, each rendered only if a data source exists:

1. Evidence readiness summary — `DistributionBar` of claims by evidence status, with counts.
2. Metric row (3–4 `MetricCard`s): claims received, claims with evidence ready, claims with limited context, open claim value (if available).
3. Identity confidence distribution.
4. Recent claims — compact 5–8 row table linking into Claims.
5. Integration health strip.
6. Network context preview — `LockedState` if plan-gated.
7. Recent evidence exports.

No decorative trend charts unless real time-series data exists. **New-merchant state:** the overview becomes a setup surface — a connect checklist (helpdesk, commerce platform, or CSV import) with links to Integrations, framed around what each connection unlocks.

### 10.3 Claims (list)

The main operational surface. Toolbar: search, filters (claim type, evidence status, identity confidence, source, date range — only filters the data supports). Columns in priority order: claim/order ref (mono), customer/profile, claim type, evidence status (`StatusBadge`), identity confidence (`ConfidenceBadge`), delivery context, claim value (right-aligned, tabular), source (`SourceChip`), updated (relative + tooltip). Sticky header (`--surface-sunken`, micro-label typography). Rows are real links to the claim detail. Preserve the existing pagination/fetch pattern.

### 10.4 Claim detail (flagship page — highest quality bar in the app)

- **Header:** claim ref (mono) + claim type, status badges, actions: "Export evidence pack" (existing logic only) and "Open in {helpdesk}" (only if a deep link exists in the data).
- **≥1280px:** two columns. Main column: claim summary, claim timeline, order details, delivery evidence, source records. Right `DetailRail` (360px): customer snapshot, identity continuity panel (`ConfidenceBadge` + linked signals), merchant-local history, network context panel (gated → `LockedState`), evidence strength summary. **<1280px:** sections stack in that order.
- Every evidence block is an `EvidenceCard` with a `SourceChip` (origin system + received timestamp).
- The page presents evidence states only — "Evidence ready", "Supporting delivery context", "Linked identity signals", "Limited context", "Network context available". No approve/deny anywhere.

### 10.5 Customers (list and detail)

- **List columns:** profile (mono pseudonymous ID when no name exists), identity confidence, orders, claims, delivery records, merchant-local continuity, network availability, last activity.
- **Detail — a calm dossier, not surveillance:** profile header (pseudonymity made explicit, e.g. "Pseudonymous profile — linked via {n} signals"), identity continuity panel, claim history table, order history, delivery evidence, linked identifiers (render exactly as masked by the API — never unmask or reconstruct in the UI), activity timeline, related claims, evidence exports.
- No threat framing, no "risk profile" language, no per-person scores.

### 10.6 Evidence / exports

One coherent surface for evidence packs: each entry shows the related claim (mono ref, linked), included sources as `SourceChip`s, status (chargeback-ready vs internal review **only if that field exists** — otherwise one status), created/exported timestamps, and download/export via existing logic. Treat this as a first-class product surface, not a utility page.

### 10.7 Network

The most sensitive page — build it with care:

- Shows: aggregate signal availability, signal categories, the merchant-local vs network split (the two provenance colours), confidence bands, and plan gating via `LockedState`.
- Includes a **permanent "How network context works" explainer panel** (static copy): pseudonymous linking, aggregation, corroboration thresholds, what is never exposed (no raw identities, no other merchants' data, no per-merchant visibility).
- Never renders a list of people, never names other merchants, never frames anything as a blacklist or watchlist.
- Locked-state copy: "Network context is available on Growth plans. Merchant-local evidence remains available here."

### 10.8 Integrations

A premium setup and control centre. Grid of `IntegrationCard`s, grouped if numerous (Helpdesk / Commerce / Delivery / Data import). Each card: name + icon (use a lucide icon and text if no licensed brand assets exist in the repo — do not fabricate logos), connection status, last sync, records received, one "What it powers" line, and connect/manage CTA wired to the existing flow. Error states surface on the card with a path to fix. CSV import is presented as a first-class source, equal to live integrations.

### 10.9 Settings / Billing / Security

Sub-nav or tabs: Workspace, Team, Billing, Data & privacy, Security — plus API keys/webhooks and Audit log only if those routes exist. Everything uses the `SettingsRow` pattern (label + description left, control right). Billing: current plan card, `BillingTierCard` comparison, and gated-feature messaging identical to `LockedState` everywhere else. **Data & privacy is first-class, not buried:** static trust copy covering pseudonymous linking, merchant-local data separation, network context without cross-merchant identity exposure, and evidence source traceability. No new backend for any of this.

---

## 11. Empty, loading, and error states

- **Every authenticated route** ships a `loading.tsx` whose skeleton matches the final layout of that page (App Router convention). No centred spinners on blank pages, anywhere.
- **Error boundaries** (`error.tsx` at route or route-group level covering every page): calm and useful — what failed, whether data is safe, a retry action, and a link to Integrations/Settings when the failure is connection-related. Errors never apologise theatrically and are never vague.
- **`EmptyState` pattern:** small icon in a `--surface-sunken` circle, one line on what this page shows, one line on what to connect or import, one primary CTA. Reference copy:
  - Claims: "Claims will appear here once Unauth receives helpdesk or order data. Connect Gorgias, Zendesk, or import claims to start building evidence views."
  - Customers: "Customer profiles are created when Unauth links orders, claims, and delivery records into privacy-safe identity continuity."
- **`LockedState` pattern:** one consistent component for all plan gating — what the feature includes, what remains available on the current plan, one upgrade CTA. Never a broken or blank panel.

---

## 12. Interaction and motion

- Transitions: 120–180ms ease-out, `opacity`/`transform`/colour only. No layout-shift animation, no scale-ups on cards, no bounce or spring.
- Hover: background shift to `--surface-sunken` or border lightening. Row hover on all tables.
- `prefers-reduced-motion` disables non-essential transitions.
- Focus: 2px `--focus-ring` outline, 2px offset, visible on every interactive element via `:focus-visible`.
- Table rows navigate via real links (proper anchor semantics), not bare onClick handlers.
- Sticky table headers on long tables; sticky page header only where it earns its place (claim detail).

---

## 13. Responsive behaviour

- **≥1280px:** full layout including detail rails.
- **1024–1279px:** rails stack below main content; metric rows wrap 2-up.
- **768–1023px:** sidebar becomes drawer; tables hide tertiary-priority columns (define priority tiers per table in the `DataTable` config).
- **<768px:** per table, choose either a card-list presentation or horizontal scroll with a pinned first column — decide per surface and record the choice in the report. Touch targets ≥40px.

---

## 14. Accessibility

- WCAG AA (4.5:1) for all text and badge labels — verified against the token values; failures are fixed in the tokens, never per-component.
- Status is never conveyed by colour alone: every badge and indicator carries a text label.
- `aria-label` on all icon-only buttons; semantic landmarks (`nav`, `main`, `header`); labelled form fields on auth and filters.
- Full keyboard operability for nav, menus, tabs, tables, and dialogs.

---

## 15. Copy rules

**Tone:** clear, calm, precise, evidence-led. Sentence case everywhere (no Title Case headings). Active voice. Buttons are verb-first and name the exact outcome ("Export evidence pack", "Connect Gorgias"), and an action keeps the same name through its whole flow. No exclamation marks. No "Oops". No filler.

**Approved vocabulary:** claim evidence · identity continuity · linked signals · claim history · delivery evidence · network context · evidence readiness · review context · merchant-local history · cross-merchant signal · chargeback evidence · confidence · signal strength · supporting evidence · needs review · limited evidence · verified delivery context · pseudonymous network signal · source records · claim timeline · connected signals · no delivery proof received yet · export evidence pack.

**Banned in rendered UI strings** (code identifiers and legacy slugs may remain; visible text may not): fraud and all derivatives · fraudster · criminal · guilty · suspicious person · bad actor · bad customer · blacklist · watchlist (as a visible label) · block · ban · auto-decline · deny claim / approve claim (as actions or instructions) · punish · threat · risk score.

---

## 16. Execution plan

Work in phases, in order. **Gate at the end of every phase:** the project build passes, `tsc --noEmit` is clean, lint passes, and every route touched in the phase renders without console errors — with empty data and with data where seed/sample data is available.

**Phase 0 — Audit (no code changes).** Inventory every authenticated route and auth route: page file, layout, data sources, and current functionality. Inventory existing components and mark which are replaced. Produce the **read-only file list** (API routes, Supabase clients/queries, engine/scoring/identity logic, billing, import/sync, auth, middleware). Discover the existing confidence grade vocabulary and existing export logic. Deliver `docs/UI_REBUILD_PLAN.md`: route map (current path → nav label), component build list, read-only list, any broken routes plus the minimal fix each needs, and the Evidence-vs-Reports IA decision.

**Phase 1 — Foundations.** Tokens in `globals.css`, Tailwind mapping, fonts via `next/font`, `lib/format.ts`, `lib/status.ts`. Restyle base primitives (Button, Input, Select, Card, Badge, Tabs, Table, Tooltip, DropdownMenu, Dialog, Skeleton). Build `StatusBadge`, `ConfidenceBadge`, `SourceChip`, `DistributionBar`, `EmptyState`, `LockedState`, `ErrorState`.

**Phase 2 — Shell and auth.** `AppShell`, `Sidebar`, `TopBar`, nav mapping from the Phase 0 route map; all auth pages and callback/magic-link states.

**Phase 3 — Overview, Claims list, Claim detail.**

**Phase 4 — Customers list, Customer detail, Evidence/exports.**

**Phase 5 — Network, Integrations, Settings/Billing/Security.**

**Phase 6 — Sweep and audit.** `loading.tsx` and error coverage for every route; responsive pass; accessibility pass; dead-code removal of every replaced component, style, and legacy palette token; full final audit (Section 17); deliver the implementation report (Section 18).

---

## 17. Final audit checklist (all must pass)

- [ ] Every authenticated route renders with empty data and with data, no console errors.
- [ ] Auth code paths unmodified (git diff against the Phase 0 read-only list shows zero changes); all auth UI states render.
- [ ] No file on the read-only list was modified (git diff verification).
- [ ] No hardcoded hex values or raw Tailwind palette classes in `components/` or page files (search-verified).
- [ ] No banned vocabulary in rendered UI strings (search-verified against the Section 15 list).
- [ ] No numeric risk score rendered anywhere.
- [ ] All status, confidence, and provenance rendering flows through `lib/status.ts` and the shared badge components.
- [ ] No legacy cream/brown/burgundy palette values remain in authenticated UI.
- [ ] Every route has a matching skeleton `loading.tsx` and error boundary coverage.
- [ ] All tables: sticky header, hover states, tabular numerals on numeric columns, consistent typography.
- [ ] Focus-visible rings on every interactive element; no colour-only status; AA contrast holds.
- [ ] No dead UI: every rendered control is wired to existing functionality.
- [ ] Responsive behaviour verified at 1440 / 1280 / 1024 / 768 / 390 widths.
- [ ] Build, typecheck, and lint clean.

If any page still feels like a default admin template or visually disconnected from the rest, rebuild that page before closing out.

---

## 18. Implementation report

Deliver `docs/UI_REBUILD_REPORT.md` containing: all changed files; all new components and their locations; the final token and type summary; the final route map; confirmation that every read-only file is untouched; every page where designed UI awaits missing backend data (and the limited state shipped instead); per-table mobile presentation choices; and known follow-ups.

---

**Definition of done:** a user signs in and the product reads as a serious, cohesive, expensive enterprise evidence layer — one design system across every authenticated route, evidence and provenance legible at a glance, nothing that resembles a template, and zero changes to product logic, data, auth, or integrations.
