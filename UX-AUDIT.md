# Unauth — Authenticated Product UX & Design Audit
**Date:** 2026-06-16 · **Method:** live rendered audit (preview server, authenticated as `demo@unauth.app`, 1440px) + a 16-agent source-grounded workflow (161 raw → 47 deduped findings) + targeted gap-closing greps. Output is **diagnosis + a prioritized, file-named fix plan**. No code was changed.

---

## 0. Read this first — three premise corrections

1. **The body typeface is Inter, not DM Sans.** The app was migrated to Inter in a "Ramp redesign" ([app/layout.tsx:2-30](app/layout.tsx:2)): `--font-dm-sans` now resolves to **Inter**, `--font-bricolage` → **Inter Tight**, `--font-dm-mono` → **DM Mono** (retained). So the "DM Sans" anchor in CLAUDE.md / design docs is **stale**, and the token names now mislead. The "all data in DM Mono" rule still holds and is violated in places (below). *Live-verified.*

2. **The demo env ≠ what ASOS sees.** `demo@unauth.app` ("Elara & Co Apparel") is **Free tier with no resolved customer profiles** (292 imported orders, 0 profiles), so data pages render as empty states locally. You confirmed ASOS demos against **production with real data** — so the empty/sparse states here are a local artifact, **but every P0 below lives in shared component code and is therefore present in production too.**

3. **`/api/catches` returns 500 in this environment** — table `public.identity_catch_events` is missing from the current schema. The `/catches` page degrades to an empty state, but the **dashboard fires a 500 on every load**. *Live-verified.* **Action: confirm prod's schema has this table before tomorrow** — if prod shares this state, the dashboard "Recent identity catches" feed is broken in the demo.

---

## 1. Executive summary

The product's information architecture, terminology discipline (confidence-not-verdict), and token *architecture* are genuinely strong — the foundations are right. But there is **one systemic defect that undermines trust on nearly every screen**, plus a band of consistency drift that separates this from a Ramp/Stripe-grade product.

**The headline: semantic colour is inverted for failure states.** `var(--success)` (green) is wired into *danger, critical, error, loss, and failed* states across the shared component layer. A skeptical fraud-ops lead — the exact ASOS persona — would see failed integrations, failed dispute checks, escalated claims, destructive buttons, and onboarding errors all rendered **green/"good."** For a product whose entire pitch is *trustworthy signal*, this is the single most damaging thing in the build, and it's a handful of one-line fixes.

**The eight P0s, at a glance:**

| # | P0 | Where | Fix locus |
|---|----|-------|-----------|
| 1 | `danger` & `critical` Badge tones render **green** | every screen with a risk/alert badge | `components/ui/badgeStyles.ts:45-46,55-56` |
| 2 | Destructive **Button** (`variant=danger`) has a **green** background | account deletion, any destructive action | `components/ui/buttonStyles.ts:50` |
| 3 | Helpdesk **connection-error** states render **green** | Gorgias/Freshdesk/Zendesk setup | `*SupportSyncClient.tsx`, `ZendeskSetupClient.tsx:102` |
| 4 | **Dispute-readiness** failed checks render **green** | `/chargebacks/[id]` | `components/evidence/DisputeReadinessPanel.tsx:47` |
| 5 | **Onboarding** form error renders **green** | first-run | `components/OnboardingClient.tsx:259` |
| 6 | Claims **escalated/overdue/lost** pills: red bg + **green** text | `/claims` | `app/(app)/claims/claimsPageData.ts:62,65,75` |
| 7 | Dashboard queue copy **conflates confidence with a fraud verdict** | dashboard | `app/(app)/dashboard/DashboardPageCockpit.tsx:223-225` |
| 8 | `/api/catches` **500** (missing table) → broken dashboard feed | dashboard / `/catches` | schema migration + verify in prod |

P0s #1–#6 are the *same root cause* (`--success` used for non-success) and are collectively well under a day's work. #7 is one copy edit. #8 needs a schema check.

---

## 2. Prioritised fix plan

> Ground rules respected: **UI only** — nothing here touches scoring/matching/weights (frozen SSOT). Fixes point at canonical sources. Severity re-graded conservatively; **system-fix** = one change repairs many screens (do these first).

### P0 — Fix before the ASOS demo

**P0-A · Semantic-colour inversion (the big one).** `var(--success)` is used for failure states throughout. Fix each call-site to a risk/critical or neutral token; **never touch the genuine `success` tone**.
- **Badges** — `badgeStyles.ts:45-46` (CHIP) & `:55-56` (SOLID): `danger`/`critical` → `var(--risk-critical-fg)`/`var(--risk-critical)`. *system-fix, all screens.*
- **Button** — `buttonStyles.ts:50`: `danger` bg/border `var(--success)` → `var(--risk-critical)`. *system-fix.*
- **Helpdesk errors** — `GorgiasSupportSyncClient.tsx:210`, `FreshdeskSupportSyncClient.tsx:203` error bg → `color-mix(... var(--critical) 8% ...)`; `ZendeskSetupClient.tsx:102` error text → `var(--critical)`. *(Leave Zendesk success lines 91/107/113 alone.)*
- **Dispute readiness** — `DisputeReadinessPanel.tsx:47`: non-passing marker → `var(--text-tertiary)` (neutral) or `var(--risk-critical-fg)` (hard fail).
- **Onboarding error** — `OnboardingClient.tsx:259` → `var(--critical)`.
- **Claims pills** — `claimsPageData.ts:62,65,75`: `escalated` → probable tone; `overdue` → warning tone; `resolved_lost` → loss tone. Reserve green for genuinely positive resolutions.

**P0-B · Confidence ≠ verdict copy.** `DashboardPageCockpit.tsx:223-225` ("high-confidence identity matches surface here") invites reading an A/B/C/D *confidence* grade as a guilt verdict — the exact trust break the product is built to avoid. Rewrite to describe linked signals + "your team decides," e.g. *"Customers with linked identity signals or cross-merchant patterns (confidence Definite/Probable). Your team reviews and decides."* Cross-check `lib/copy/terms.ts`.

**P0-C · Catches feed 500.** `public.identity_catch_events` is missing in this schema; dashboard `/api/catches` 500s on every load. **Verify prod has the table.** If not, ship the migration; meanwhile the dashboard feed should fail to an explicit empty/"unavailable" state rather than a silent 500. ([app/api/catches/route.ts:81](app/api/catches/route.ts:81))

### P1 — High-impact, low-effort

- **`--lime` is undefined** ([buttonStyles.ts:22,40-42](components/ui/buttonStyles.ts:22)). It silently breaks **CTA buttons**, **DataTable selected-row highlight** ([DataTable.tsx:168](components/ui/DataTable.tsx:168)), and **EmptyState accent dots** ([EmptyState.tsx:48](components/ui/EmptyState.tsx:48), [WorkbenchEmptyState.tsx:13](components/workbench/WorkbenchEmptyState.tsx:13)). *system-fix* — define `--lime`/`-hover`/`-fg` in `globals.css` **or** repoint all four to `var(--accent)`. One decision fixes CTAs + row selection + empty dots.
- **KPI numerals aren't mono** — `MetricCard.tsx:83` hardcodes `fontFamily:'var(--font-sans)'`, overriding the `.num` mono rule, so every KPI hero numeral is proportional Inter (breaks tabular alignment). *Live-verified on dashboard.* → `var(--font-mono)` or drop the inline override. *system-fix.*
- **No table hover/selected feedback** — `DataTable.tsx:166,171` set the same `--surface` for selected, unselected, and hover; the only selection cue is the invisible `--lime` inset. Users get zero row feedback. Add real `--surface-hover`/accent-fill states.
- **Dashboard "Open claim value" is green** — exposure/loss colored `var(--success)` when > 0 ([DashboardPageCockpit.tsx:197](app/(app)/dashboard/DashboardPageCockpit.tsx:197)). Outstanding exposure is potential loss → neutral `--text-primary`; add mono.
- **Grade colours hardcoded off-SSOT** — confidence A/B/C/D painted with the *risk* palette in [help/confidence-grades:85-111](app/(app)/help/confidence-grades/page.tsx:85), and a local `GRADE_CHART_COLORS` in `AuditRunOverviewPanel.tsx:28` instead of canonical `GRADE_COLOURS` ([lib/utils/confidenceStyles.ts:11](lib/utils/confidenceStyles.ts:11)). Collapsing confidence into the risk palette re-blurs the confidence/verdict line. Import the SSOT.
- **Provider integration pages drift** — only Shopify uses `SettingsPageShell` (breadcrumbs/eyebrow/title); the other six (gorgias/zendesk/freshdesk/woo/bigcommerce/chrome) are raw `p-8` divs with no breadcrumb or back-path. Refactor onto the shell.
- **Provenance over-claim (customer detail)** — every identity-signal row shows the profile-wide `firstSeen→lastSeen` as "Observed," not the window that signal actually appeared in ([customerProfilePageLoad.ts:210-223](app/(app)/customers/[id]/customerProfilePageLoad.ts:210), [CustomerProfilePageHero.tsx:350-358](app/(app)/customers/[id]/CustomerProfilePageHero.tsx:350)). For an evidence tool, overstated provenance is a credibility risk — derive per-signal ranges or mark the fallback explicitly.
- **"confidence" overloaded on customer detail** — linked-identity bars show a co-occurrence heuristic labelled "confidence" ([MainColumn:227-240](app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx:227)) colliding with the identity-confidence grade. Relabel "Link strength" + tooltip.

### P2 — High-impact, structural (a sprint)

- **Off-4px-scale spacing is endemic** (*system-fix*): `SectionCard` header `14px 18px` ([:44](components/ui/SectionCard.tsx:44)), `DataTable` cells `0 16px` + skeleton `10px 16px` ([DataTable.tsx:177](components/ui/DataTable.tsx:177), [dataTableStyles.ts:20,32](components/ui/dataTableStyles.ts:20)), `Drawer` header `0 18px` ([:104](components/ui/Drawer.tsx:104)), Button md/lg `14px/18px` ([buttonStyles.ts:10-11](components/ui/buttonStyles.ts:10)), Badge md `7px` ([badgeStyles.ts:28-29](components/ui/badgeStyles.ts:28)). Move all to `--space-*`.
- **Card elevation undecided** — `Card` exposes raised/flat shadows but `SectionCard`/`MetricCard` hardcode `box-shadow:none`. Pick one rule (all-flat-bordered, or a documented raised/flat matrix) and enforce it. ([Card.tsx:17-32](components/ui/Card.tsx:17))
- **Border-token aliasing in tables** — `--border` vs `--border-muted` used with no rule ([DataTable.tsx:49,121,165](components/ui/DataTable.tsx:49)). Define structural-vs-row-separator pairing.
- **Hand-rolled tables/lists bypass `DataTable`** — IdentityTimeline, customer-detail identity-signals + linked-identities, audit-run overview/customers/transactions panels all reinvent tables (no sort/hover/skeleton, non-mono numerics, off-scale padding). Migrate to `DataTable`. ([IdentityTimeline.tsx:27](components/customers/IdentityTimeline.tsx:27), [CustomerProfilePageHero.tsx:341-376](app/(app)/customers/[id]/CustomerProfilePageHero.tsx:341), [AuditRunOverviewPanel.tsx:154](app/(app)/audit/[runId]/AuditRunOverviewPanel.tsx:154))
- **Input/Select focus is jumpy** — field rests on `--surface-sunken`, focus only swaps to a dark border + ring without lifting the bg ([Input.tsx:12,17](components/ui/Input.tsx:12)). Lift to `--surface` on focus or adopt ring-only as documented standard.
- **Motion off-token** — Button/Input use hardcoded `120ms` vs `--duration-fast` 100ms ([buttonStyles.ts:6](components/ui/buttonStyles.ts:6), [Input.tsx:11](components/ui/Input.tsx:11)).
- **Chargebacks detail typography** — Cross-merchant/Generated values in sans 13px while Order ID is mono; sections hardcode `20px 24px`. Unify data → mono, padding → tokens. ([EvidenceDetailPageView.tsx:161-173](app/(app)/chargebacks/[id]/EvidenceDetailPageView.tsx:161))
- **Stale nav/permission refs to deleted routes** — `lib/permissions/index.ts:260` maps `VIEW_SAVED → /saved` (deleted); `appRoutes.ts:101` aliases `/inbox` (deleted). Latent 404 paths via `resolveDefaultAppPath`. Remove `/saved`; confirm `/inbox` alias is intentional URL-back-compat only.
- **Audit grade tiles** `grid-cols-4` at all breakpoints → cramped wrap ([AuditRunOverviewPanel.tsx:61](app/(app)/audit/[runId]/AuditRunOverviewPanel.tsx:61)).
- **Dashboard h1 off-scale** `text-2xl` (~28px) then jumps to `text-sm` (14px) with nothing between ([DashboardPageCockpit.tsx:101](app/(app)/dashboard/DashboardPageCockpit.tsx:101)). Use `.text-display-md`/`.text-body-sm`.
- **Competing `--font-sans` definitions** — `globals.css:109` still declares the stale `"DM Sans", …` while `:254` sets `var(--font-dm-sans)` (Inter). DM Sans isn't loaded, so elements that resolve the stale rule fall back to a system font. *Live-verified: the "Complete setup →" link computes `DM Sans` while buttons compute `Inter`.* Remove the stale line-109 definition. *system-fix.*

### P3 — Polish (good → great)

- Claims outcomes all collapse to "Merchant response recorded" ([claimsPageData.ts:22-32](app/(app)/claims/claimsPageData.ts:22)) — differentiate neutrally ("Refund approved", "Added to watchlist") and surface the reason.
- Dashboard activity feed types undifferentiated ([:359](app/(app)/dashboard/DashboardPageCockpit.tsx:359)) — tone-keyed Badge per type.
- `/global` empty state doesn't explain the k≥3 / 3-merchant gating ([GlobalIdentityGraphClient.tsx:264-268](components/global/GlobalIdentityGraphClient.tsx:264)); link to `/help/identity-matching`.
- `/catches` CatchCard "loss"/"save" vocab ([:181](components/catches/CatchCard.tsx:181)) muddies the confidence boundary — align to `DISCLAIMER`.
- Reports CSV tab: link labelled "Live intelligence" → destination "Integrations" (IA mismatch); add `/help/csv-export` affordance ([ReportsCsvTab.tsx:45,54](app/(app)/reports/ReportsCsvTab.tsx:45)).
- Audit transaction "Behavioural indicators" heading is verdict-leaning ([:143](app/(app)/audit/[runId]/transaction/[id]/page.tsx:143)) → "Behavioural context."
- `RecentCatchesFeed` skeleton doesn't match real rows → layout shift ([:67-73](components/catches/RecentCatchesFeed.tsx:67)); redundant `Reconnect sources` button appears twice on the dashboard header/banner (*live-verified*); off-scale border-radii scattered across chart/table components; settings mixes legacy `.t-heading` with spec `.text-heading-*` and a few raw `<input>`/`<select>` bypass `Input`/`Select`.

---

## 3. What's genuinely good (acknowledge and keep)

- **Terminology discipline is excellent.** `BANNED_UI_TERMS` is enforced; agent-facing copy consistently frames Unauth as an evidence surfacer, never a decision-maker; the Gorgias widget, CatchCard, and new `/catches` + `/global` pages all carry proper disclaimers. *No banned-term leaks found.* (The dashboard-queue copy in P0-B is the one over-claim to fix.)
- **IA is workflow-shaped, not DB-shaped** — sidebar groups (Overview / Operations / Analytics) and labels (Network, Evidence, Analytics) map to what the user is doing.
- **Token architecture is well-built** — 4px scale, full risk/severity palette, z-index + motion tokens. The problems are *mis-wiring* (green for failure, undefined `--lime`) and *drift* (off-scale literals), not a missing system.
- **`DataTable`, `Button`, `Drawer`, `Modal` have clean, consistent APIs.** The deletions of legacy/decorative components were done **cleanly — zero broken imports remain.**
- **Data-privacy + help content** is non-judgmental and mechanism-focused (k-anonymity, hashing) — exactly right for a skeptical buyer.

---

## 4. Coverage & caveats (honest scope)

- **Live-verified:** Inter-not-DM-Sans + competing `--font-sans`; KPI numerals in sans; duplicate Reconnect button; `/api/catches` 500 + missing table; data pages reachable (200) but empty (0 profiles); button/select rendering; no broken deleted-component imports; stale `/saved` + `/inbox` refs; `/catches` graceful-empty degmradation.
- **Source-grounded (16 agents), not yet pixel-verified:** the exact rendered contrast of each green-on-peach combination and the invisibility of the `--lime` fallback are code-level certainties (the code literally assigns the token) but were not each screenshotted — the demo merchant's empty data prevented rendering populated tables/claims/evidence locally. Confirm visually in prod where data exists.
- **Lighter coverage:** the app shell (`AppHeader`, `ContextCreditsBadge`, sidebar internals) — modified in git, observed live (groups/active-state render) but not deeply audited.
- **Line-number drift:** the tree has uncommitted churn; re-confirm exact lines before editing.

---

## 5. Suggested sequence for tonight

1. **P0-A** (semantic colour) — ~6 one-line token swaps; biggest trust win, lowest risk.
2. **P0-B** (dashboard copy) — one edit.
3. **P0-C** — verify prod has `identity_catch_events`; decide migrate vs. graceful-empty.
4. **P1 `--lime`** + **MetricCard mono** + **table hover/selected** — three system-fixes that visibly lift quality.
5. Everything else is post-demo.
