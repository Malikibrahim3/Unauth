# Unauth — Merchant Experience: 3-Phase Implementation Plan

Companion to [`MERCHANT_EXPERIENCE_AUDIT.md`](MERCHANT_EXPERIENCE_AUDIT.md). The audit found **14 Critical · 19 Moderate · 16 Polish** issues, plus 6 product decisions (resolved) and 2 business/legal facts that need a human call. This doc sequences every one of those findings into **three execution phases**, each with file references, the concrete fix, acceptance criteria, and an effort estimate.

**The shape of the work in one line:** Phase 1 makes the first run *honest and unbroken*; Phase 2 makes the product *navigable and legible*; Phase 3 makes it *consistent and clean*. The audit's own 6-wave plan (§8) collapses into these three phases as noted per task.

**Target outcome:** a non-technical US Shopify merchant can go landing → free audit → account → first in-app screen → customer triage **with no 404, no jargon they can't parse, no screen that reads as broken or fake, and no figure shown in the wrong currency.**

---

## 0. Guiding constraints (read first)

Hard rules from `CLAUDE.md` and `LANDING_DESIGN_LOCK.md`. Every task below respects them:

- **Landing is design-locked.** `app/(public)/landing/**` styling/layout/composition is frozen. Only *functional* defects there (a CTA that 404s, dead scroll anchors) may be fixed, and only minimally — never touch composition. `AuditDemoClient` is **not** in the lock and is safe to edit.
- **Do not touch scoring/weighting/matching/cluster logic.** No edits to `lib/engine/weights.ts` values, `lib/scorer.ts`, `lib/engine/fastScore.ts` thresholds, or identity-matching algorithms. UI/copy tasks here only *label* engine outputs — they never change them.
- **No `as any` in new production code; no `// eslint-disable`.** Fix the underlying type/lint issue.
- **SSOT.** New constants/enums/labels go in a single canonical file and are imported everywhere (mirrors the table in `CLAUDE.md`). Currency formatting routes through the existing shared `formatCurrency`; signal/jargon labels through one map.
- **Minimal-diff rule.** Touch only the code needed for the described finding. Dead-code deletions are explicit, listed, and confined to Phase 3.
- **Verification reality.** Public funnel (landing, `/audit-demo`, `/audit`) is browser-verifiable. Authenticated pages (dashboard, drawer, settings) rely on lint/typecheck + careful reading + screenshots where a seeded session exists — called out honestly per task.

---

## 1. Root-cause summary (what's actually wrong)

| # | Symptom (from audit) | Root cause (file:line) | Phase |
|---|---|---|---|
| C1 | Hero CTA dead-ends at 404 | quiz pushes to non-existent `/audit-demo/results` — `HeroAuditCta.tsx:18` → `AuditDemoClient.tsx:148` | 1 |
| C2 | Two same-labeled "Run free audit" funnels; real one hidden | demo CTAs everywhere vs real `/audit` in footer only — `landing/page.tsx:1708` | 1 |
| C3 | Sold "network," delivered "single-store," revealed post-upload | `SignupFlow.tsx:316,339`; `audit/page.tsx:69`; `report/[runId]/page.tsx:101` | 1 |
| C4 | `cal.example.com` placeholder booking link ships | `AuditDemoClient.tsx:367` | 1 |
| C5 | Built onboarding dashboard is dead code; new merchants see empty console | `EmptyDashboardHero.tsx` (0 imports) vs `dashboard/page.tsx:274` | 1 |
| C6 | Green "No identity match signals" shown while job still processing | `audit/[runId]/page.tsx:412` | 1 |
| C7 | Always-on "Graph live" pulse on empty account | `dashboard/page.tsx:197` | 1 |
| C8 | Customer drawer unreadable (`CONF 0.85`, `CE 3.0`, `DEFINITE`) | `CustomerIntelligenceDrawer.tsx:594-605,854` | 1 |
| C10 | Currency renders GBP/`en-GB`, flips $↔£ across tabs (21 files) | `AuditCustomersTableClient.tsx:76` + 20 more | 1 |
| C11 | Privacy page promises bulk deletion UI that doesn't exist | `data-privacy/page.tsx:32`; `BulkDeleteClient.tsx` (0 imports) | 1 |
| C12 | Orphaned `BulkDeleteClient` has destructive stealth "Delete All" bug | `BulkDeleteClient.tsx:62-71` | 1 |
| M17 | Empty "Linked identities" renders fake PII | `customers/[id]/page.tsx:963` | 1 |
| C9 | Two Integrations hubs; sub-page back-links strand the user | `settings/layout.tsx:9-10`; `zendesk/page.tsx:23`; `chrome/page.tsx:35` | 2 |
| C13 | Mobile wall *after* signup; dead-end with no way back | `proxy.ts` allow-list + `mobile-unsupported/page.tsx` | 2 |
| C14 | Cross-merchant signals table has no responsive collapse | `customers/[id]/page.tsx:733,743` | 2 |
| M1–M19 | Friction & inconsistency (nav gaps, orphan routes, naming, copy) | see Phase 2 tasks | 2 |
| P1–P4 | Jargon in merchant copy ("cluster", "k-safe", confidence tiers) | see Phase 2 tasks | 2 |
| P5–P16 | Component/token/header/width drift, leaked dev strings | see Phase 3 tasks | 3 |
| §6 dead code | Confirmed-dead components to delete; good ones to wire | see Phase 3 | 3 |

---

## 2. Resolved product decisions (apply across phases)

These six were decided in audit §6; this doc only *schedules* them. No re-litigation.

1. **Front door → one canonical free audit.** `/audit` (real CSV) is the single free-audit CTA; `/audit-demo` becomes an explicit un-gated "interactive demo" or retires. → **Phase 1** (C1/C2).
2. **Signup → keep live `/login?signup=1`; delete dead `SignupFlow.tsx`.** Strip its 4 gating dropdowns (collect in onboarding). → deletion in **Phase 3** (§6); dropdown strip in **Phase 2** (M14).
3. **Drawer → keep live `CustomerIntelligenceDrawer`; port the missing "plain verdict / recommended action" into it; delete dead `CustomerDrawer` + `CrossMerchantSignalCard`.** → port in **Phase 1** (C8); deletion in **Phase 3**.
4. **Orphan routes → redirect `/report/[runId]` → `/audit/[runId]`; delete `/saved`.** → **Phase 2** (M3).
5. **Nav → add Inbox + Reports to sidebar; keep clean redirect stubs.** → **Phase 2** (M2).
6. **Dead code → delete `CustomerList`, `DeleteAuditButton`, `LoadDemoButton`, `SignupFlow`, `CustomerDrawer`, `CrossMerchantSignalCard`; wire `EmptyDashboardHero`; decide `SavingsCard`/`InsightsStrip`/`NextUpPanel`.** → wiring of `EmptyDashboardHero` in **Phase 1** (C5); all deletions in **Phase 3**.

---

## Phase 1 — First-run integrity: don't 404, don't lie, don't look broken

**Goal:** every screen on the headline path either works, tells the truth, or honestly says "still working." This is the highest-leverage phase — it covers all the issues that *block understanding or use* and the ones that *erode trust at the worst moment*. Maps to audit Wave 1 (+ the trust-critical parts of Wave 2/3).

**Scope:** C1, C2, C3, C4, C5, C6, C7, C8, C10, C11, C12, M17 + landing dead anchors. Product decisions 1, 3 (drawer port), 6 (wire `EmptyDashboardHero`).

### P1-A · Repoint the demo funnel to the real audit (C1, C2, C4) — *public, browser-verifiable*
- **C1:** `app/(public)/audit-demo/AuditDemoClient.tsx:148` — the quiz's terminal step pushes to `/audit-demo/results`, which does not exist. Repoint to the real path: signup/`/audit`. Verify `HeroAuditCta.tsx:18` lands somewhere live.
- **C2:** Make `/audit` the single canonical free-audit destination. Relabel the quiz CTA as "See a 60-second interactive demo" (not "Run free audit") so the demo and the real thing aren't the same label. The footer link (`landing/page.tsx:1708`) and hero CTA must resolve to the *same* canonical audit entry.
- **C4:** `AuditDemoClient.tsx:367` — replace `cal.example.com` with the real booking URL, or remove the booking CTA. (Booking URL is a business fact — see §Open Questions; if unknown, remove rather than ship a placeholder.)
- **Landing dead anchors:** sweep `app/(public)/landing/**` for scroll anchors / hrefs that point at nothing and fix the targets only (no composition change — lock-safe).
- **Acceptance:** clicking the hero CTA from a cold browser never 404s; demo and real audit are distinguishable by label; no `example.com` string in shipped public copy. Verify in-browser end to end.
- **Effort:** 0.5 day.

### P1-B · State tiering honestly and early (C3) — *public + signup*
- **C3:** `SignupFlow.tsx:316,339`, `audit/page.tsx:69`, `report/[runId]/page.tsx:101` present a cross-merchant "network" but the free tier is single-store, only disclosed post-upload. Add one honest framing string *before* upload, e.g. "Your free audit scans your own store. Approved founding merchants unlock the cross-merchant network." Place it on the audit entry and signup, not buried in results.
- **Note:** copy only — does not change tiering logic or entitlements.
- **Acceptance:** a first-time merchant reads what the free tier does *before* uploading; no post-upload "gotcha." Verify on `/audit` and signup.
- **Effort:** 0.5 day.

### P1-C · Wire the onboarding dashboard (C5, C7) — *authenticated; read/lint-verified + screenshot*
- **C5:** `components/EmptyDashboardHero.tsx` has **0 imports**. In `app/(app)/dashboard/page.tsx:274`, render `EmptyDashboardHero` when the account `isEmpty` (no audits/data) instead of the analyst console with "Unavailable" tiles and 6 empty charts. Reconcile its CTA to the canonical first-audit action (`/upload?welcome=1` per the traced path).
- **C7:** `dashboard/page.tsx:197` — the "Graph live" pulse renders even with zero data. Make it reflect real state (live only when data is actually flowing) or hide it pre-data. On a security product a fake heartbeat reads as untrustworthy.
- **Acceptance:** a brand-new account's first dashboard shows the onboarding hero, not an empty console; no green "live" pulse beside "Unavailable" KPIs. Verify with a seeded empty account + screenshot.
- **Effort:** 1 day.

### P1-D · Truthful audit-results state (C6) — *authenticated*
- **C6:** `app/(app)/audit/[runId]/page.tsx:412` shows a confident green "No identity match signals were found" while `status !== 'completed'`. Render a "still analyzing" state until the job completes; only show the no-signals verdict on a completed run.
- **Acceptance:** an in-progress run never shows a green all-clear; the message changes to analyzing/processing and resolves only when done.
- **Effort:** 0.5 day.

### P1-E · Make the customer drawer readable (C8) + port plain verdict (decision 3) — *authenticated*
- **C8:** `components/customers/CustomerIntelligenceDrawer.tsx:594-605,854` shows `Case file · UN-…`, unlabeled `CONF 0.85`/`CONF 0.50`, `CE 3.0`, `DEFINITE/CANDIDATE`. Lead with a plain-English verdict ("Likely the same shopper as 2 other accounts — 85% confident"), label every metric, and drop `CE 3.0` from the merchant view.
- **Decision 3:** port the "recommended action / plain verdict" idea from the dead `CustomerDrawer` into this live drawer (do not revive the dead component; just graft the one missing concept). Route confidence/grade rendering through a shared label map so it stays SSOT.
- **Constraint:** presentation only — confidence/grade values come unchanged from the engine.
- **Acceptance:** a non-technical merchant can answer "is this person abusing me, and what do I do?" from the drawer without a glossary. No raw `CONF`/`CE` codes.
- **Effort:** 1.5 days.

### P1-F · One currency, one locale: USD / `en-US` (C10) — *app-wide, lint-verified*
- **C10:** 21 files render GBP (£) / `en-GB` and flip $↔£ across tabs of the same audit. `AuditCustomersTableClient.tsx:76` uses £; overview uses the shared `$` helper. Route **all** money/date formatting through the USD-default shared `formatCurrency` / `en-US` helper. Replace ad-hoc `toLocaleString('en-GB', …)`/`£` literals.
- **Method:** grep for `en-GB`, `'£'`, `style:'currency'`, and local `Intl.NumberFormat` instances; replace each with the shared helper. SSOT — no per-file currency logic remains.
- **Acceptance:** every audit tab shows the same currency; a US merchant's revenue shows in `$`/`en-US`; grep finds zero `en-GB`/`£` in render paths. (Currency *display* only — does not touch legal jurisdiction; see §Open Questions #1.)
- **Effort:** 1 day.

### P1-G · Remove fake PII from empty states (M17) — *authenticated*
- **M17:** `app/(app)/customers/[id]/page.tsx:963` — empty "Linked identities" renders `placeholder@domain.com`, `12 Example Street`. Replace with a real empty state ("No linked identities yet").
- **Acceptance:** no fabricated emails/addresses render anywhere on a real profile.
- **Effort:** 0.25 day.

### P1-H · Privacy promise vs reality (C11, C12) — *authenticated; safety-critical*
- **C11:** `app/(app)/settings/data-privacy/page.tsx:32` promises "request bulk deletion from Account settings" but no such UI exists (`BulkDeleteClient.tsx` has 0 imports). **Decision required (default safe path):** *remove the sentence* in Phase 1 so the privacy page doesn't promise an absent capability. Building a safe delete UI is larger and depends on the destructive bug below being fixed first — schedule the build only if product wants it (otherwise the copy fix stands).
- **C12:** `components/settings/BulkDeleteClient.tsx:62-71` — a stealth "Delete All" button silently re-scopes the next "Delete" to wipe audit runs too, no confirm. **Do not wire as-is.** If/when a delete UI is built: remove the stealth button, add a typed-confirm ("type DELETE"), and name every category explicitly. Until then this component is slated for deletion in Phase 3 (§6 list).
- **Acceptance:** the privacy page makes no promise the product can't keep; the destructive stealth path cannot be reached by any user. No data-loss footgun ships.
- **Effort:** 0.25 day (copy fix). Safe delete UI, if approved: +1.5 days.

**Phase 1 exit criteria:** headline path verified in-browser with zero 404; first dashboard onboards instead of looking broken; results never lie; drawer is human-readable; all money is USD; no fake PII; no destructive footgun; privacy page is truthful.
**Phase 1 effort:** ~6 engineer-days (copy fix path for C11); +1.5 if the safe delete UI is approved.

---

## Phase 2 — Navigable & legible: nav, route hygiene, mobile, de-jargon

**Goal:** the merchant can *find* the finished features, never gets stranded, can use the product on a phone, and reads plain English instead of fraud-ops jargon. Maps to audit Waves 2 (nav/routes), 3 (de-jargon), and 4 (mobile).

**Scope:** C9, C13, C14 + M1–M16, M18, M19 + P1–P4. Product decisions 2 (strip dropdowns), 4 (orphan routes), 5 (nav).

### P2-A · One integrations hub + fixed back-links (C9) — *authenticated*
- **C9:** `settings/layout.tsx:9-10` exposes two hubs — `/settings/integrations` (Gorgias+Shopify) and `/settings/api-integrations` (all four). Zendesk/Chrome are only reachable from the latter, but their "← Integrations" back-link (`zendesk/page.tsx:23`, `chrome/page.tsx:35`) points at the former, which doesn't list them → dead end mid-credential-handover. Collapse to **one** hub that lists all four; point every "← Integrations" back-link at it.
- **Acceptance:** every integration sub-page is reachable from one hub and its back-link returns there. No stranded credential flow.
- **Effort:** 0.75 day.

### P2-B · Surface finished features; clean orphan routes (M2, M3, decisions 4 & 5) — *authenticated*
- **M2 / decision 5:** add **Inbox** and **Reports** to `components/.../Sidebar.tsx:55-77`. `/inbox` (7 refs, even linked from the 404 page), `/reports`, `/claims`, `/global` are finished but unreachable from nav. Add Inbox + Reports now; keep redirect stubs clean.
- **M3 / decision 4:** redirect `/report/[runId]` → `/audit/[runId]` (0 refs, duplicates with different jargon "Siloed audit"/"INR behaviour"); delete or hide `/saved` (0 refs, ships an empty "Saved Views").
- **AppHeader dead ternary** (audit Wave 2): remove the dead conditional branch in the app header.
- **Acceptance:** Inbox and Reports appear in the sidebar and route correctly; `/report/[runId]` redirects; `/saved` is gone/hidden; the 404 page's `/inbox` link is now reachable from nav.
- **Effort:** 1 day.

### P2-C · Mobile: gate earlier, give an exit, make triage table responsive (C13, C14) — *mixed*
- **C13:** `proxy.ts` allow-list lets marketing/signup through on phones, then `/upload` `/dashboard` `/onboarding` hard-block to a dead-end `app/mobile-unsupported/page.tsx`. Either gate earlier (before the merchant invests effort) or give the wall a way out: "email me a desktop link" + a link to the mobile-friendly free audit.
- **C14:** `app/(app)/customers/[id]/page.tsx:733,743` — cross-merchant signals table is a fixed 5-col grid (~590px min) with no responsive collapse; it overflows on a phone (the exact triage screen used on mobile). Stack to label/value cards below `md`, matching the pattern the Customers list already uses.
- **Acceptance:** a phone user is never stranded with no way back; the customer signals table is usable below `md`.
- **Effort:** 1.5 days.

### P2-D · De-jargon copy pass (M4, M18, P1, P2, P3, P4) — *app-wide, SSOT label map*
- **P1:** "Cluster" → "linked accounts/shoppers" — `global/page.tsx:120,186`; `dashboard:277`.
- **P2:** "k-safe" / "k ≥ 3 gate · HMAC-SHA256" → "Privacy-safe" + plain tooltip — `customers/[id]/page.tsx:870`; `dashboard:430`; `PrivacyBadge.tsx`.
- **P3:** destructive verbs ("Bin"/"Remove"/"Dismiss"/"Delete") → "Remove" everywhere — `AuditHistoryTableClient.tsx:75`.
- **P4:** define confidence tiers for the merchant; one label per tier + tooltip; drop the competing 5th "Linked accounts" label on the same card — `audit/[runId]/page.tsx:384`.
- **M4:** unify "Generate evidence PDF" vs "Compile signal data" → "Build evidence package" everywhere — `customers/[id]/page.tsx:627` vs `evidence/new/page.tsx:130`.
- **M18:** translate analyst KPIs ("Decision ready", "Anchor metric", "fraud-ops console") to plain language — `inbox/page.tsx:153`, `audit/[runId]/page.tsx:356`.
- **Method:** create one SSOT label/glossary map (mirrors the `signalLabels` approach in `audit/IMPLEMENTATION_PLAN.md` P0-2) so the same term never renders two ways.
- **Acceptance:** none of the words *cluster, k-safe, CE3, INR, anchor metric, fraud-ops console* appear in merchant-facing copy without a plain equivalent/tooltip; one verb per action.
- **Effort:** 1.5 days.

### P2-E · Flow correctness & onboarding friction (M1, M5, M6, M7, M8, M9, M10, M11, M12, M13, M14, M15, M16, M19) — *mixed*
Batched smaller fixes; each is independent.
- **M1:** lead dashboard with a network metric ("Shoppers linked across the network"), not audit-processing stats — `dashboard/page.tsx:207`.
- **M5:** Gorgias success copy ("fully automated… every ticket") fires alongside a mandatory 6-step webhook panel → make success copy conditional; make webhook steps primary — `GorgiasSupportSyncClient.tsx:242-351` + `GorgiasSetupClient.tsx:11`.
- **M6:** lead credential asks with "why + safety," not "paste your API key"; trust line above the field — `GorgiasSupportSyncClient.tsx:355`.
- **M7:** add a "which credential goes where" map for the three types (`unauth_sk_` API key, Widget Token, webhook secret) — `ApiIntegrationsClient.tsx:294`, `GorgiasSupportSyncClient.tsx:284`, `ChromeSetupClient.tsx:108`.
- **M8:** `app/audit-running/page.tsx:20-71` — replace hand-coded hex/serif, British "analysing", and "email in ~20 minutes" with the design system + the real fast in-app flow.
- **M9:** audit results tabs don't update the URL — `components/audit/AuditTabs.tsx:16-49`; sync tab to URL so back button + deep-links work.
- **M10:** data-quality shown two ways ("score/119" and "n of 17 fields") — `UploadClient.tsx:743,771`; pick one framing, drop `/119`.
- **M11:** standardize errors on the good Shopify pattern (no raw `err.message` / "Network error").
- **M12:** API-keys empty state tells merchants to make a key "for Gorgias, Zendesk" but neither consumes one — fix the copy — `ApiIntegrationsClient.tsx:206`.
- **M13:** onboarding "Skip" posts `setupComplete:true` and dumps user on empty dashboard — `OnboardingClient.tsx:135-143,285`; reconcile with the wired `EmptyDashboardHero` (P1-C).
- **M14 / decision 2:** strip the 4 gating dropdowns (platform/volume/concern) from `login/page.tsx:43-47` signup; collect in onboarding.
- **M15:** "Annual order volume" label stores `monthly_order_volume`; unify "annual" vs "monthly" across signup/onboarding/apply — `login/page.tsx:202` vs `FoundingMerchantApplicationForm.tsx:84`.
- **M16:** Identity Timeline prints the same date for "First seen"/"Last seen" — `components/customers/IdentityTimeline.tsx:45,59`; fix the presentation bug.
- **M19:** account password change collects no current password (no re-auth); profile save throws "Merchant not loaded" if submitted before load — `settings/account/page.tsx:31,67,106`.
- **Acceptance:** each item verified by reading + (where authenticated) screenshot; no flow contradicts itself; signup is lower-friction; the timeline and volume labels are correct.
- **Effort:** 3 days (batched).

**Phase 2 exit criteria:** all finished features reachable from nav; no stranded back-links; usable on a phone; merchant-facing copy is plain; onboarding/signup/integration flows are internally consistent.
**Phase 2 effort:** ~8.75 engineer-days.

---

## Phase 3 — Consistency & cleanup: tokens, headers, dead code

**Goal:** remove the visual/structural drift and the dead code that causes future regressions. Lowest user-facing risk, highest codebase-health payoff. Maps to audit Waves 5 (consistency) and 6 (dead-code cleanup).

**Scope:** P5–P16 + product decision 6 (deletions/wiring).

### P3-A · Component & token canon (P5, P6) — *app-wide*
- **P5:** two `PageHeader` components (`ui/` inline-styled vs `common/` token-classed) and three overlapping type scales (`.text-heading-*`, `.text-h1/h2/h3`, `.t-heading`). Pick canon (the `common/PageHeader` cohesion effort already started); migrate usages.
- **P6:** two color-token vocabularies (`--ink-*/--surface-*` vs `--text/--bg-surface/--border`); mobile sidebar toggle uses the legacy set — `Sidebar.tsx:426`. Standardize on one token vocabulary.
- **Acceptance:** one `PageHeader`, one type scale, one token vocabulary in active use.
- **Effort:** 1.5 days.

### P3-B · Settings consistency (P12, P13) — *authenticated*
- **P12:** settings headers diverge across 5 patterns (`text-heading-lg` vs `t-heading`, `←` vs `ArrowLeft`, missing back-link on data-privacy) — `account/page.tsx:144` etc. Standardize one header pattern + back-link.
- **P13:** settings container widths vary (`max-w-2xl/3xl/5xl/6xl`); integration cards hand-rolled instead of `SectionCard`. Pick one width; use `SectionCard`.
- **Acceptance:** every settings page shares one header pattern, one container width, and `SectionCard`-based cards.
- **Effort:** 1 day.

### P3-C · Polish details (P7, P8, P9, P10, P11, P14, P15, P16) — *mixed*
- **P7:** `not-found.tsx` offers only "dashboard/sign in" — useless to a logged-out prospect (who hits it via C1 pre-fix). Add "Back to home."
- **P8:** evidence preview shows hardcoded "01 / 04" page counter — `EvidencePackagePreview.tsx:81`; make it real.
- **P9:** `DataQualityBanner` uses lowercase "x" as close in one branch, ✕ in others — `DataQualityBanner.tsx:82`; unify.
- **P10:** demo page leaks "staging/seeded/snapshot" to prospects — `demo/page.tsx:187,239`; remove.
- **P11:** contact email domain mismatch `hello@unauth.app` vs `privacy@unauth.io`/`dpa@unauth.io` — standardize on the confirmed domain (see §Open Questions #2).
- **P14:** two near-duplicate sidebar-preview cards (Gorgias vs Zendesk) with drifting labels — `GorgiasSetupClient.tsx:35` vs `ZendeskSetupClient.tsx:91`; unify.
- **P15:** double pagination on Customers (action bar + above table) — `customers/page.tsx:384,480`; keep one.
- **P16:** Chrome setup leaks `npm run build:extension` / "Load unpacked / Developer mode" to non-technical merchants — `ChromeSetupClient.tsx:90`; hide dev instructions behind the published-extension path.
- **Acceptance:** each item resolved; no leaked dev/staging strings; consistent icons/counters/pagination.
- **Effort:** 1.5 days.

### P3-D · Dead-code deletion + wiring decisions (decision 6) — *codebase health*
- **Delete (confirmed dead):** `CustomerList`, `DeleteAuditButton`, `LoadDemoButton`, `SignupFlow`, `CustomerDrawer`, `CrossMerchantSignalCard`, and (per C11/C12 resolution) `BulkDeleteClient` unless a safe delete UI was approved in Phase 1.
- **Already wired in Phase 1:** `EmptyDashboardHero` (C5) — do not delete.
- **Decide:** `SavingsCard`/`InsightsStrip`/`NextUpPanel` (gated value props) — wire `SavingsCard` + `InsightsStrip` if feature flags allow, else delete. Keep the good narrative pieces.
- **Method:** confirm 0 inbound imports per file before deleting (grep import graph); delete in one reviewable commit.
- **Acceptance:** `npm run lint && tsc --noEmit` pass; no dangling imports; import graph shows the listed components gone.
- **Effort:** 1 day.

**Phase 3 exit criteria:** one component/token/header canon; no leaked dev strings; confirmed-dead code removed; lint/types green.
**Phase 3 effort:** ~5 engineer-days.

---

## 3. Sequencing & milestones

```
Phase 1 — First-run integrity (highest leverage)
  P1-A demo→real ── P1-B honest tiering ── P1-C wire EmptyDashboardHero/Graph
  P1-D processing state ── P1-E readable drawer ── P1-F USD ── P1-G no fake PII ── P1-H privacy truth
  → Milestone 1: "A merchant can go landing → audit → first screen → triage with no 404, no lie, no broken-looking screen, all in USD."

Phase 2 — Navigable & legible
  P2-A one integrations hub ── P2-B nav + orphan routes ── P2-C mobile ── P2-D de-jargon ── P2-E flow fixes
  → Milestone 2: "Every finished feature is reachable, usable on a phone, and reads in plain English."

Phase 3 — Consistency & cleanup
  P3-A component/token canon ── P3-B settings ── P3-C polish ── P3-D dead-code deletion
  → Milestone 3: "Cohesive, drift-free, dead-code-free."
```

**Total effort:** ~20 engineer-days (one engineer ~4 weeks; parallelizable). Phase 1 ≈ 6 days, Phase 2 ≈ 8.75 days, Phase 3 ≈ 5 days. Add 1.5 days if the Phase 1 safe-delete UI is approved.

**Coverage check:** Critical C1–C14 ✔ (C1–C12 + M17 in P1; C9, C13, C14 in P2). Moderate M1–M19 ✔ (M17 in P1; rest in P2). Polish P1–P16 ✔ (P1–P4 in P2 de-jargon; P5–P16 in P3). Product decisions 1–6 ✔ (scheduled in §2). Business facts 1–2 ✔ (Open Questions below).

---

## 4. Definition of done & verification

| Check | How | Pass condition |
|---|---|---|
| Headline path | in-browser, cold | landing → CTA → audit, zero 404; demo vs real labeled distinctly |
| First dashboard | seeded empty account + screenshot | `EmptyDashboardHero` renders; no "Graph live" on empty |
| Results honesty | in-progress run | "analyzing" state, never a green all-clear pre-completion |
| Drawer legibility | screenshot | plain verdict + labeled metrics; no `CONF`/`CE 3.0` |
| Currency | grep render paths | zero `en-GB`/`£`; one currency per audit; USD default |
| No fake PII | grep | no `placeholder@domain.com` / `12 Example Street` in render |
| Privacy truth | read | no promise of an absent capability; no reachable destructive stealth path |
| Nav reachability | click-through | Inbox + Reports in sidebar; `/report/[runId]` redirects; `/saved` gone |
| Back-links | click-through | every integration sub-page returns to the one hub |
| Mobile | phone viewport | no dead-end wall; customer signals table stacks below `md` |
| De-jargon | grep + read | no raw `cluster`/`k-safe`/`CE3`/`anchor metric` in merchant copy |
| Consistency | read | one `PageHeader`/type scale/token vocab; one settings header/width |
| Dead code | import-graph grep | listed components have 0 imports and are deleted |
| Lint/types | `npm run lint && tsc --noEmit` | green; no `as any`, no eslint-disable |

Public funnel is browser-verified. Authenticated pages rely on lint/typecheck + careful reading + screenshots where a seeded session exists — called out per task, honestly, since full auth+DB browser verification isn't available in this environment.

---

## 5. Open questions (business/legal — need a human call before the relevant task ships)

1. **US vs UK identity (affects C10 scope, legal pages, sample data).** Target is "US ecommerce merchants," but legal pages are UK GDPR/"England and Wales," footer is "London, UK / GMT," sample data is `+44`/Royal Mail. **This plan fixes only currency/date *display* to USD/`en-US`** (P1-F) — showing a US merchant's own orders correctly is not a jurisdiction question. It does **not** flip legal jurisdiction, address, or GDPR→CCPA. *Please confirm the legal entity + primary market before any legal-copy change.*
2. **Canonical domain/email (affects C4 booking URL, P11).** `unauth.app` vs `unauth.io`. P11 standardizes the in-app support address on the more-used value and flags it; C4 needs the real booking URL (else the CTA is removed). *Please confirm the real domain + booking link.*
3. **Privacy bulk-delete (affects C11/C12).** Default in this plan is to *remove the false promise* (copy fix) and *not* ship a delete UI. If product wants real bulk deletion, approve the +1.5-day safe-delete-UI build (typed confirm, named categories, no stealth button).
