# Unauth — End-to-End Merchant Experience Audit

**Date:** 2026-05-30
**Lens:** A non-technical US Shopify merchant opening Unauth for the first time. The bar is Stripe-level clarity + Ramp-level density. The test: *can they understand what it does, why it matters, and what to do next — with no doc, no friction, no confusion?*
**Method:** Full source read of all 65 routes + 115 components (4 parallel survey passes), cross-checked against the codebase (import graphs, route references, design tokens). Builds on prior `reports/ui-ux-audit/APP_COHESION_AUDIT.md` and the deployment-readiness passes.

**Scope note — Landing page is LOCKED.** `LANDING_DESIGN_LOCK.md` freezes `app/(public)/landing/**` styling/layout/composition. I treat that as binding for *design*, but unambiguous *functional* defects there (a CTA that 404s, dead scroll anchors) are bugs, not design, and are fixed minimally without touching composition.

---

## 1. The verdict in one paragraph

The app is visually polished and the engine underneath is serious. But the **first-time merchant journey is broken at both ends and hollow in the middle.** The single most-clicked CTA on the marketing site leads to a 404. The product the merchant is sold (a *cross-merchant network*) is not the product the free tier delivers (*single-store*), and they only discover the gap after uploading. When they finally reach the app, the dashboard that was *built* to onboard them (`EmptyDashboardHero`) is disconnected dead code, so they land on an empty analyst console showing "Unavailable" tiles and a fake "Graph live" pulse. Throughout, the UI speaks in fraud-infrastructure jargon — *cluster, k-safe, CE3, INR, anchor metric, fraud-ops console* — that the target user cannot parse. None of this is unfixable; most of it is disconnected wiring and untranslated copy, not missing capability.

**Severity tally:** 14 Critical · 19 Moderate · 16 Polish. Plus 6 product decisions (resolved below with rationale) and 2 business/legal facts I cannot verify (flagged).

---

## 2. The first-run journey, traced

`landing` → hero email CTA → `/audit-demo` → 3-question quiz → **`/audit-demo/results` → 404 (route does not exist).** Dead before value.

The *real* path (buried in the footer): `/audit` (real CSV audit) → `/audit/[runId]/report` (blurred behind a signup wall with no value preview) → create account → `/onboarding` → "Upload first audit" → `/upload?welcome=1` → processing → `/audit/[runId]` results → click customer → `CustomerIntelligenceDrawer` (dense, unlabeled `CONF 0.85` / `CE 3.0`) → evidence.

Breaks, in order of how early they kill the merchant:
1. Hero CTA → 404 (C1).
2. Two front doors, same label, different products; real one hidden (C2).
3. Sold "network," delivered "single-store," gap revealed post-upload (C3).
4. Empty dashboard is a broken-looking console, not an onboarding (C5).
5. Drawer/results speak in codes the merchant can't read (C8).

---

## 3. CRITICAL — confusing or broken (blocks understanding or use)

| # | Finding | Location | Why it matters | Fix |
|---|---------|----------|----------------|-----|
| **C1** | Hero's primary CTA dead-ends at a 404. `HeroAuditCta` → `/audit-demo`, quiz pushes to `/audit-demo/results` which **does not exist**. | `app/(public)/landing/_components/HeroAuditCta.tsx:18` → `app/(public)/audit-demo/AuditDemoClient.tsx:148` | Total conversion loss on the headline path. `AuditDemoClient` is NOT in the landing lock — safe to fix. | Repoint the demo's terminal step to the real audit/signup. |
| **C2** | Two "Run free audit" funnels: `/audit-demo` (mock quiz, everywhere) vs `/audit` (real CSV, footer only). Same label, different products. | landing CTAs vs `landing/page.tsx:1708` (footer) | Merchant can't tell the demo from the real thing; the real value path is nearly unreachable. | One canonical free-audit destination; relabel the quiz "interactive demo." |
| **C3** | Sold cross-merchant network; free tier is explicitly *siloed/single-store*, revealed only after upload. | `SignupFlow.tsx:316,339`; `audit/page.tsx:69`; `report/[runId]/page.tsx:101` | Core expectation gap = trust hit at the worst moment. | State tiering honestly + early ("Free audit scans your store; approved founding merchants unlock the network"). |
| **C4** | `cal.example.com` placeholder booking link ships to prospects. | `AuditDemoClient.tsx:367` | Unmistakable "this is a prototype" tell. | Real booking URL or remove. |
| **C5** | The built onboarding dashboard is dead code; new merchants get an empty analyst console (4 "Unavailable" tiles, 6 empty charts). | `components/EmptyDashboardHero.tsx` (**0 imports**) vs `app/(app)/dashboard/page.tsx:274` | First in-app impression looks broken. The asset to fix it already exists, disconnected. | Render `EmptyDashboardHero` when `isEmpty`; reconcile its CTA. |
| **C6** | Audit results show a confident green **"No identity match signals were found"** while a job is still *processing*. | `app/(app)/audit/[runId]/page.tsx:412` | Actively misleads, then numbers change → erodes trust in the core output. | Render a "still analyzing" state when `status !== 'completed'`. |
| **C7** | Always-on green **"Graph live"** pulse renders even with zero data, beside "Unavailable" KPIs. | `app/(app)/dashboard/page.tsx:197` | A fake heartbeat on an empty account reads as decorative/untrustworthy on a security product. | Reflect real state, or hide pre-data. |
| **C8** | Live customer drawer is unreadable: `Case file · UN-…`, two unlabeled `CONF 0.85`/`CONF 0.50` badges, `CE 3.0`, `DEFINITE/CANDIDATE`. | `components/customers/CustomerIntelligenceDrawer.tsx:594-605,854` | The whole point — "is this person abusing me, what do I do?" — is obscured by codes. | Lead with a plain verdict ("Likely the same shopper as 2 other accounts — 85% confident"); label the metrics; drop `CE 3.0`. |
| **C9** | Two competing "Integrations" hubs; sub-page back-links strand the user. `/settings/integrations` lists Gorgias+Shopify; `/settings/api-integrations` lists all four. Zendesk/Chrome reachable only from the latter, but their "← Integrations" link goes to the former (which doesn't list them). | `settings/layout.tsx:9-10`; `integrations/zendesk/page.tsx:23`; `chrome/page.tsx:35` | A merchant handing over credentials hits a dead end; reads as broken. | Collapse to one hub; fix back-links. |
| **C10** | Currency renders as **GBP (£)** and dates as `en-GB` for a stated US audience — and *flips* between $ and £ across tabs of the same audit. 21 files affected. | `AuditCustomersTableClient.tsx:76` (£) vs overview ($ via shared helper); + 20 more | Showing a US merchant's revenue in pounds is a data-credibility break. | Route all formatting through the USD-default shared `formatCurrency` / `en-US`. |
| **C11** | Data & privacy page promises "request bulk deletion from Account settings" — **no such UI exists** anywhere. | `settings/data-privacy/page.tsx:32`; `BulkDeleteClient.tsx` (**0 imports**) | A compliance promise the product can't fulfill, on the privacy page specifically. | Wire a safe delete UI, or remove the sentence. |
| **C12** | The orphaned `BulkDeleteClient` has a destructive bug: a stealth "Delete All" button silently re-scopes the next "Delete" to wipe audit runs too, no confirm. | `components/settings/BulkDeleteClient.tsx:62-71` | If ever wired as-is, it's a data-loss incident. | Do not wire as-is; remove stealth button, add typed-confirm, name every category. |
| **C13** | Mobile wall *after* signup: marketing/signup allowed on phones, then `/upload` `/dashboard` `/onboarding` hard-block to a dead-end "Not supported" card with no way back. | `proxy.ts` allow-list + `app/mobile-unsupported/page.tsx` | Shopify merchants live on phones; we invest their effort then strand them. | Gate earlier, or give the wall a "email me a desktop link" + link to the mobile-friendly free audit. |
| **C14** | Cross-merchant signals table on the customer profile is a fixed 5-col grid (~590px min) with **no responsive collapse**. | `app/(app)/customers/[id]/page.tsx:733,743` | Overflows/crushes on a phone — the exact triage screen merchants use on mobile. | Stack to label/value cards below `md` (the Customers list already does this). |

---

## 4. MODERATE — friction and inconsistency

- **M1.** Network value (the moat) is buried: dashboard leads with audit-processing stats, no headline network metric. `dashboard/page.tsx:207`. → Lead with "Shoppers linked across the network."
- **M2.** Real, useful pages missing from primary nav: `/reports` (perf dashboard, 1 ref), `/claims` (queue, in `/inbox` only), `/inbox` (7 refs but not in sidebar), `/global` (network graph, 1 ref). The 404 page even links to `/inbox`, which nav can't reach. `Sidebar.tsx:55-77`.
- **M3.** Orphaned rendered pages: `/report/[runId]` (0 refs, duplicates `/audit/[runId]` with *different* jargon — "Siloed audit", "INR behaviour"); `/saved` (0 refs, ships an empty "Saved Views" feature). → Redirect `/report/[runId]` → `/audit/[runId]`; delete or hide `/saved`.
- **M4.** Same action, different names mid-flow: "Generate evidence PDF" (profile) vs "Compile signal data" (destination + drawer). `customers/[id]/page.tsx:627` vs `evidence/new/page.tsx:130`. → "Build evidence package" everywhere.
- **M5.** Gorgias flow contradicts itself: "fully automated… appears in every ticket" success message fires *alongside* a mandatory 6-step manual webhook panel. `GorgiasSupportSyncClient.tsx:242-351` + `GorgiasSetupClient.tsx:11`. → Make success copy conditional; make the webhook steps primary, not a dismissible panel.
- **M6.** Credential asks lead with "paste your API key," not "why + safety guarantee." Gorgias REST key (= password) behind a disclosure toggle. `GorgiasSupportSyncClient.tsx:355`. → Trust line above the field.
- **M7.** Three credential types (API key `unauth_sk_`, Widget Token, webhook secret) with overlapping unexplained names and no "which goes where" map. `ApiIntegrationsClient.tsx:294`, `GorgiasSupportSyncClient.tsx:284`, `ChromeSetupClient.tsx:108`.
- **M8.** `/audit-running` post-signup screen is hand-coded hex/serif, British ("analysing"), promises "email in ~20 minutes" — contradicting the fast in-app flow. `app/audit-running/page.tsx:20-71`.
- **M9.** Audit results tabs don't update the URL → back button and shared deep-links break. `components/audit/AuditTabs.tsx:16-49`.
- **M10.** Data-quality score shown two ways: "score/119" and "n of 17 fields." `UploadClient.tsx:743,771`. → One legible framing; drop `/119`.
- **M11.** Inconsistent, non-human errors: Shopify is excellent ("That looks like a public website address…"); others echo raw `err.message` ("Failed to rotate secret") or "Network error." → Standardize on the Shopify pattern.
- **M12.** API-keys empty state tells merchants to make a key "for Gorgias, Zendesk" — but neither consumes one here (Zendesk literally says "no API key to paste"). `ApiIntegrationsClient.tsx:206`.
- **M13.** Onboarding "Skip" posts `setupComplete:true` and dumps the user on the empty dashboard; checklist shows steps marked "available after your first audit." `OnboardingClient.tsx:135-143,285`.
- **M14.** Login-variant signup requires 4 extra dropdowns (platform/volume/concern) before account creation; the dead `SignupFlow` asked for fewer. The higher-friction path is the live one. `login/page.tsx:43-47`.
- **M15.** "Annual order volume" label stores `monthly_order_volume`; "annual" vs "monthly" differs across signup/onboarding/apply. `login/page.tsx:202` vs `FoundingMerchantApplicationForm.tsx:84`.
- **M16.** Identity Timeline prints the *same* date for "First seen" and "Last seen" (presentation bug). `components/customers/IdentityTimeline.tsx:45,59`.
- **M17.** Empty "Linked identities" renders fake PII (`placeholder@domain.com`, `12 Example Street`). `customers/[id]/page.tsx:963`.
- **M18.** Inbox/results KPI strips use analyst vocabulary ("Decision ready", "Anchor metric", 8 dense KPIs). `inbox/page.tsx:153`, `audit/[runId]/page.tsx:356`.
- **M19.** Account password change collects no current password (no re-auth); profile save throws "Merchant not loaded" if submitted before load. `settings/account/page.tsx:31,67,106`.

---

## 5. POLISH — small, high-ratio improvements

- **P1.** "Cluster" leaks into merchant copy (`global/page.tsx:120,186`; `dashboard:277`). → "linked accounts/shoppers."
- **P2.** "k-safe" / "k ≥ 3 gate · HMAC-SHA256" shown raw, meant as trust signals. `customers/[id]/page.tsx:870`; `dashboard:430`; `PrivacyBadge.tsx`. → "Privacy-safe" + plain tooltip.
- **P3.** Destructive verbs inconsistent: "Bin" (British!) / "Remove" / "Dismiss" / "Delete." `AuditHistoryTableClient.tsx:75`. → "Remove" everywhere.
- **P4.** Confidence tiers (Definite/Probable/Possible/Weak, A/B/C/D) never defined for the merchant; a 5th label set ("Linked accounts") competes on the same card. `audit/[runId]/page.tsx:384`. → One label per tier + tooltip.
- **P5.** Two `PageHeader` components (`ui/` inline-styled vs `common/` token-classed) and **three overlapping type scales** (`.text-heading-*`, `.text-h1/h2/h3`, `.t-heading`). → Pick canon; the `common/PageHeader` cohesion effort already started.
- **P6.** Two parallel color-token vocabularies (`--ink-*/--surface-*` vs `--text/--bg-surface/--border`); mobile sidebar toggle uses the legacy set. `Sidebar.tsx:426`.
- **P7.** `not-found.tsx` offers only "dashboard/sign in" — useless to a logged-out prospect (who hits it via C1). → "Back to home."
- **P8.** Evidence preview shows hardcoded "01 / 04" page counter. `EvidencePackagePreview.tsx:81`.
- **P9.** DataQualityBanner uses a literal lowercase "x" as close in one branch, ✕ in others. `DataQualityBanner.tsx:82`.
- **P10.** Demo page leaks "staging/seeded/snapshot" to prospects. `demo/page.tsx:187,239`.
- **P11.** Contact email domain mismatch: `hello@unauth.app` vs `privacy@unauth.io`/`dpa@unauth.io`. (See business-fact flag.)
- **P12.** Settings headers diverge (5 patterns, `text-heading-lg` vs `t-heading`, `←` vs `ArrowLeft`, missing back-link on data-privacy). `account/page.tsx:144` etc.
- **P13.** Settings container widths vary (`max-w-2xl/3xl/5xl/6xl`); integration cards hand-rolled instead of `SectionCard`.
- **P14.** Two near-duplicate sidebar-preview cards (Gorgias vs Zendesk) with drifting labels. `GorgiasSetupClient.tsx:35` vs `ZendeskSetupClient.tsx:91`.
- **P15.** Double pagination on Customers (action bar + above table). `customers/page.tsx:384,480`.
- **P16.** Chrome setup leaks `npm run build:extension` / "Load unpacked / Developer mode" to non-technical merchants. `ChromeSetupClient.tsx:90`.

---

## 6. Product decisions (resolved here, per "pick the best and document why")

1. **Front door:** Make **`/audit` (real CSV audit) the single canonical free-audit CTA.** Repurpose `/audit-demo` as an explicit, un-gated "See a 60-second interactive demo" (no email wall) or retire it. *Why:* the real audit is the actual value; two same-labeled doors + a 404 is the worst outcome.
2. **Signup:** Keep the **live `/login?signup=1`** path; delete dead `SignupFlow.tsx`. *Why:* one source of truth; but strip its 4 gating dropdowns (M14) — collect those in onboarding.
3. **Customer drawer:** Keep the live **`CustomerIntelligenceDrawer`**; delete dead `CustomerDrawer` + its only-consumer `CrossMerchantSignalCard`, BUT port the drawer's missing "recommended action / plain verdict" into the live one (C8). *Why:* finishing the abandoned migration is more work than grafting the one missing idea.
4. **Orphan routes:** Redirect `/report/[runId]` → `/audit/[runId]`; delete `/saved`. *Why:* 0 inbound refs, duplicate/empty.
5. **Nav:** Add **Inbox** and **Reports** to the sidebar; keep the clean redirect stubs. *Why:* both are finished, core, and currently unreachable from nav.
6. **Dead code:** Delete confirmed-dead `CustomerList`, `DeleteAuditButton`, `LoadDemoButton`, `SignupFlow`, `CustomerDrawer`, `CrossMerchantSignalCard`; **wire** (don't delete) `EmptyDashboardHero`; decide `SavingsCard`/`InsightsStrip`/`NextUpPanel` (gated value props) — wire `SavingsCard`+`InsightsStrip` if flags allow, else delete. *Why:* reduce drift; keep the good narrative pieces.

## 7. Business/legal facts I cannot verify — need a human call

1. **US vs UK identity.** Target = "US ecommerce merchants," but legal pages are UK GDPR / "England and Wales," footer is "London, UK / GMT," sample data is `+44`/Royal Mail. I will fix **currency/date *display*** to USD/`en-US` (showing a US merchant's own orders correctly is not a jurisdiction question). I will **not** flip legal jurisdiction, address, or GDPR→CCPA without confirmation. *Please confirm the legal entity + primary market.*
2. **Canonical domain/email:** `unauth.app` vs `unauth.io`. I'll standardize the in-app support address on the more-used value and flag; please confirm the real one.

---

## 8. Prioritized fix plan (execution order)

**Wave 1 — First-run path (highest leverage):** C1, C4 (demo→real, booking URL) · landing dead anchors · C5 (`EmptyDashboardHero`) · C6 (processing state) · C7 (Graph live) · M17 (placeholder PII) · C10 (USD/dates).
**Wave 2 — Nav & route hygiene:** AppHeader dead ternary · M3 (`/report`→redirect, `/saved`) · M2 (nav: Inbox, Reports) · C9 (integrations hub + back-links).
**Wave 3 — De-jargon copy:** P1, P2, P3, P4, M4, M18 + "fraud-ops console" → plain.
**Wave 4 — Mobile:** C13 (wall), C14 (profile table), audit tables/grade grid.
**Wave 5 — Consistency:** PageHeader/type-scale canon (P5), settings headers (P12/P13).
**Wave 6 — Dead-code cleanup + decided deletions (§6).**

Each wave verified via lint/build; public funnel verified in-browser where possible. Authenticated pages can't be browser-verified here (auth + DB), so those rely on lint/typecheck + careful reading — called out honestly per change.
