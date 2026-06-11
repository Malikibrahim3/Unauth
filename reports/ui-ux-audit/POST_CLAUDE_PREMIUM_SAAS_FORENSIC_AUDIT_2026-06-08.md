# Post-Claude Premium SaaS Forensic Audit

Date: 2026-06-08
Scope: landing page, logged-out auth surfaces, authenticated app shell, and internal pages inspected visually after Claude's implementation pass.
Constraint: this is an implementation handoff only. No app code changes are included in this document.

## 0. Audit Position

Claude implemented a broad first pass. The app is visibly better than the prior audit in several important places: the sidebar no longer exposes obvious dev/tier labels in normal navigation, `/global` no longer hard-crashes, `/watchlist` is retired instead of pretending to be current, auth pages are much stronger, the landing page now tries to show a larger product artifact, and the customer-claim workbench is materially closer to the right product.

The app is still not at Stripe/Ramp level.

The remaining gap is not one missing animation or one prettier section. The gap is that premium SaaS feels stable, authored, source-backed, and inspectable from every route. Unauth still exposes loading dead zones, route instability, contradictory seeded-demo states, synthetic-looking product artifacts, and internal pages that often fall back to cards, tables, and setup banners instead of a complete workbench.

The target remains:

> A calm, evidence-led commerce-risk intelligence workbench that could sit next to Stripe Radar, Ramp, Linear, or Vercel without looking templated, underbaked, or AI-generated.

This document should be treated as the source of truth for the next implementation pass.

## 1. Evidence Corpus

### 1.1 Local Post-Claude Screenshots

Primary post-Claude capture directory:

- `/tmp/unauth-post-claude-audit/playwright`
- `/tmp/unauth-post-claude-audit/playwright-fresh-per-route`

Important screenshots:

- Landing desktop: `/tmp/unauth-post-claude-audit/playwright/00_public_landing_top.png`
- Landing mid-scroll: `/tmp/unauth-post-claude-audit/playwright/00_public_landing_mid.png`
- Landing lower-scroll: `/tmp/unauth-post-claude-audit/playwright/00_public_landing_lower.png`
- Landing mobile: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/63_landing_mobile.png`
- Login desktop: `/tmp/unauth-post-claude-audit/playwright/02_login_logged_out.png`
- Signup desktop: `/tmp/unauth-post-claude-audit/playwright/03_signup_logged_out.png`
- Reset route: `/tmp/unauth-post-claude-audit/playwright/04_reset_logged_out.png`
- Dashboard: `/tmp/unauth-post-claude-audit/playwright/06_dashboard.png`
- Dashboard 1024: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/60_dashboard_1024.png`
- Store: `/tmp/unauth-post-claude-audit/playwright/07_store.png`
- Claims: `/tmp/unauth-post-claude-audit/playwright/08_claims.png`
- Inbox alias: `/tmp/unauth-post-claude-audit/playwright/09_inbox_alias.png`
- Customer profile, critical: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/11_customer_profile_critical.png`
- Customer profile, suspicious: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/12_customer_profile_suspicious.png`
- Customer claim workbench: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/13_customer_claims.png`
- Reports: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/14_reports.png`
- Audit/report run: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/15_report_run.png`
- Watchlist: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/16_watchlist.png`
- Upload: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/17_upload.png`
- History: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/18_history.png`
- Chargebacks/evidence packages: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/20_chargebacks.png`
- Global graph: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/24_global.png`
- Graph alias: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/25_graph_alias.png`
- Settings account: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/37_settings_account.png`
- Settings billing: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/38_settings_billing.png`
- Settings team: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/39_settings_team.png`
- Settings integrations: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/40_settings_integrations.png`
- Freshdesk integration: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/44_integration_freshdesk.png`
- Data privacy: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/49_settings_data_privacy.png`
- Help: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/51_help.png`
- Legal data handling: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/57_legal_data_handling.png`
- Legal DPA: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/58_legal_dpa.png`
- Mobile unsupported: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/59_mobile_unsupported.png`
- Login mobile: `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/64_login_mobile_logged_out.png`

Earlier baseline screenshot directory:

- `/tmp/unauth-premium-saas-audit/seed`

Use these for before/after comparison:

- Old landing top: `/tmp/unauth-premium-saas-audit/seed/00_landing_top.png`
- Old dashboard: `/tmp/unauth-premium-saas-audit/seed/03_dashboard.png`
- Old claims: `/tmp/unauth-premium-saas-audit/seed/06_claims.png`
- Old customers: `/tmp/unauth-premium-saas-audit/seed/07_customers.png`
- Old customer profile: `/tmp/unauth-premium-saas-audit/seed/08_customer_profile.png`
- Old customer claims: `/tmp/unauth-premium-saas-audit/seed/09_customer_claims.png`
- Old chargebacks: `/tmp/unauth-premium-saas-audit/seed/14_chargebacks.png`
- Old evidence detail: `/tmp/unauth-premium-saas-audit/seed/15_evidence_detail.png`
- Old global: `/tmp/unauth-premium-saas-audit/seed/18_global.png`
- Old settings integrations: `/tmp/unauth-premium-saas-audit/seed/28_settings_integrations.png`
- Old billing: `/tmp/unauth-premium-saas-audit/seed/50_settings_billing.png`
- Old apply: `/tmp/unauth-premium-saas-audit/seed/44_apply.png`

### 1.2 Seed Account

- Email: `simulation@unauth-test.com`
- Password: `SimTest2025!`
- Merchant: Aurora Outfitters UK
- Critical customer: `e04d5eb6-50ac-4643-a61b-debf97a65a79`
- Suspicious customer: `52b9005d-819a-4c6d-b852-10498cc9c75c`
- Evidence package inspected in prior audit: `53f5795b-744f-4bf8-8e57-c81d3fd17cef`
- Audit run used: `3f9836f8-855d-426c-9723-29c5d1f012e9`

### 1.3 External Benchmark References

Reviewed as current premium SaaS comparators:

- Stripe home: https://stripe.com/gb
- Stripe Radar: https://stripe.com/gb/radar
- Ramp home: https://ramp.com/
- Ramp platform: https://ramp.com/platform

Captured reference files:

- `/tmp/unauth-post-claude-audit/reference/stripe_home_1440.png`
- `/tmp/unauth-post-claude-audit/reference/stripe_radar_1440.png`
- `/tmp/unauth-post-claude-audit/reference/ramp_platform_1440.png`
- `/tmp/unauth-post-claude-audit/reference/ramp-captures.json`

### 1.4 Prior Planning Docs

- `reports/ui-ux-audit/PREMIUM_SAAS_IMPLEMENTATION_PLAN_2026-06-08.md`
- `reports/landing-page-audit/LANDING_PAGE_STRIPE_RAMP_GAP_ANALYSIS.md`

This new document supersedes the prior plan for the next implementation pass, but it should not delete the prior docs. The old docs contain useful baseline observations and anti-AI-slop research.

## 2. Benchmark Standard

Stripe and Ramp do not feel premium because they use expensive colors. They feel premium because every visible layer reinforces confidence:

- Product proof appears immediately and withstands inspection.
- Marketing claims are backed by concrete objects: product UI, customer proof, documentation, security posture, integrations, metrics, and workflow evidence.
- The design system is disciplined. Buttons, tables, badges, charts, panels, skeletons, and nav all feel governed by one mature system.
- Pages are stable. There are no raw loading paragraphs, blank suspense gaps, unhandled redirects, or visible debug indicators.
- Operational pages are dense and scannable without becoming noisy.
- The visual personality has restraint. Stripe can be colorful because the system is sharp. Ramp can be minimal because the details are complete.

Unauth should not copy Stripe or Ramp visually. The product should keep its own identity: warm paper, ink, rust, investigative language, commerce-risk specificity, and evidence-led workbench structure. The benchmark is quality, not style.

## 3. Claude Implementation Verification

### 3.1 Verified Improvements

These changes appear implemented or materially improved after Claude's pass.

| Area | Before | After | Verification |
| --- | --- | --- | --- |
| Sidebar dev/tier UI | Exposed `DEV ACCESS`, `DEV PREVIEW`, and tier controls in normal screenshots. | No obvious dev/tier labels in the captured dashboard, claims, customer, reports, and settings screenshots. | Verified visually in `/tmp/unauth-post-claude-audit/playwright/06_dashboard.png` and app screenshots. |
| Global graph crash | `/global` and `/graph` previously crashed with `identity_signals_summary.slice` error. | `/global` renders a graph page and `/graph` resolves to `/global`. | Verified in `/tmp/unauth-post-claude-audit/playwright-fresh-per-route/24_global.png` and `25_graph_alias.png`; code guard at `components/global/GlobalIdentityGraphClient.tsx`. |
| Watchlist retirement | Watchlist page previously preserved a legacy workflow. | Page now says customer watchlists are retired. | Verified in `16_watchlist.png`. |
| Landing hero scale | Product artifact was too small and did not carry the first viewport. | Hero now has a much larger bespoke case artifact. | Verified in `00_public_landing_top.png`. Quality is still not premium; see findings. |
| Auth surfaces | Login/signup felt closer to default/auth-template pages. | Login/signup now have a stronger left proof panel and right form composition. | Verified in `02_login_logged_out.png` and `03_signup_logged_out.png`. |
| Claims/customer workbench | Customer claim review previously felt shallow and table-adjacent. | Customer claim route is now one of the strongest internal pages, with context and next-step rail. | Verified in `13_customer_claims.png`. |
| Customer profile | Prior profile felt like a dense admin detail page. | Current profile is more of a dossier with evidence scope, history narrative, and signal tables. | Verified in `11_customer_profile_critical.png` and `12_customer_profile_suspicious.png`. |
| Route aliases | Several legacy aliases now route to canonical pages. | `/inbox` -> `/claims`, `/saved` -> `/history`, `/audits/new` -> `/upload`, `/new-audit` -> `/upload`, `/graph` -> `/global`. | Verified in capture manifests. |
| Apply route | Prior `/apply` showed a not-found workspace state. | Authenticated `/apply` now redirects to dashboard. | Verified in `34_apply.png`, but still not ideal. |

### 3.2 Partially Implemented Or Not Verified

These areas changed but do not yet pass a premium SaaS bar.

| Area | Current Evidence | Problem |
| --- | --- | --- |
| `/customers` list | Direct `/customers` repeatedly timed out or stalled during visual capture. | This is a P0 route reliability problem, especially because customers are core to the product. |
| Settings billing | Screenshot shows only `Loading billing...`. Code returns a plain loading paragraph. | Premium SaaS cannot show raw loading text as the whole page. |
| Settings team | Screenshot shows `0 active user(s)` and `Loading team...` despite seeded team data. | Demo data and trust story are contradictory. |
| Settings integrations | Screenshot shows a large blank top area and `Loading keys...`. Code has `Suspense fallback={null}` around the Shopify banner. | Looks broken, not incomplete. |
| Integration detail pages | Freshdesk captured; BigCommerce/WooCommerce stuck in loading or redirected; Shopify/Gorgias/Zendesk/Chrome were not reliably captured due auth/login flake. | Source-health pages are not stable enough for top-tier evaluation. |
| Evidence detail | Current detail route was not reliably captured after Claude due auth flake. | Prior evidence detail was important and still requires verification. |
| Help/legal subroutes | Some captured, others redirected or timed out unexpectedly. | Public/help IA still feels inconsistent. |
| 1024 internal responsive | Dashboard captured, but claims/customers at 1024 did not reliably capture. | Responsive quality is not yet proven. |

### 3.3 Regressions Or New Risks

- The landing hero artifact is larger than before, but now looks synthetic and partially broken.
- The product artifact includes black redaction blocks, truncated fragments, mid-animation text, empty rows, and a large blank subject area. It reads like an AI-generated mock UI instead of a real product screenshot.
- Several routes now redirect instead of showing old broken states, but the redirects are not explained. A redirect can be correct product architecture, but silent redirects during evaluation feel like instability.
- Loading text and blank suspense states are now more visible because the rest of the app looks cleaner.
- The seeded merchant story is still incoherent: the app contains customers, claims, evidence packages, reports, and audit runs, but most pages still warn that helpdesk data is missing or not connected.

## 4. P0 Premium Blockers

These must be fixed before any final polish pass. They are design defects because reliability and data coherence are part of visual trust.

### 4.1 `/customers` Is Unreliable

Evidence:

- `/customers` timed out in the main post-Claude Playwright batch.
- Later isolated attempts also hung or failed to produce a reliable screenshot.
- Direct customer profile pages do load, which suggests the problem is list-page query/render complexity or route-level data work, not global auth.

Likely source area:

- `app/(app)/customers/page.tsx`
- The page performs many server-side filters and service-client queries before render.

Required fix:

- Make `/customers` render a shell immediately with a proper premium skeleton.
- Split heavy count/filter/search queries from the initial page render.
- Add instrumentation or logging around slow queries.
- Guarantee that unfiltered first load returns within a premium threshold.
- Add a Playwright check that `/customers` reaches a visible `Customers` heading and non-empty table/list in under 4 seconds on seeded data.

Acceptance:

- `/customers` captures successfully at 1440 and 1024.
- No raw timeout, no blank page, no redirect to a previous route.
- Seeded list shows real customers, filters, risk bands, and an inspectable first result.

### 4.2 Loading And Blank States Break Trust

Evidence:

- `components/billing/BillingSettingsClient.tsx` returns `Loading billing...` as the entire loading state.
- `/settings/billing` captured as a plain loading page.
- `/settings/team` captured with `Loading team...` and zero active users.
- `/settings/integrations` captured with a large blank panel and `Loading keys...`.
- `app/(app)/settings/integrations/page.tsx` uses `<Suspense fallback={null}>` for `ShopifyIntegrationBanner`.

Required fix:

- Replace raw loading paragraphs with real skeletons that preserve page structure.
- Never use `fallback={null}` for above-the-fold merchant-facing surfaces.
- Add a loaded, empty, error, and partial-connection state for billing, team, integrations, and API keys.
- Make loading copy precise and calm. Do not use generic "Loading..." as a page's main content.

Acceptance:

- Every settings route has meaningful content within 2 seconds on seeded data.
- Any async panel has a designed skeleton or localized fallback.
- Billing, team, and integrations never appear as a single-line loading page in screenshots.

### 4.3 Seeded Demo Story Is Contradictory

Evidence:

- Dashboard flags: `Missing`, `Not connected`, `not connected`.
- Claims flags: `Missing`, `not connected`.
- Customer profiles flags: `Missing`, `not connected`.
- Store flags: `Not connected`, `not connected`.
- Reports flags: `Not connected`, `not connected`.
- Global flags: `not connected`.
- Seeded app still has claims, customers, evidence packages, reports, and audit runs.

Problem:

The app looks like it has useful intelligence but simultaneously says the data source needed for that intelligence is missing. This makes the demo feel fake.

Required fix:

- Decide the seeded merchant state.
- Option A: Fully connected demo merchant. Shopify and one helpdesk are connected. All pages show live source-health status and no global missing-helpdesk warning.
- Option B: Partial setup demo merchant. Then every page must clearly distinguish `seeded historical data` from `live helpdesk sync not connected`, and the product should not show live-claim claims that depend on missing helpdesk data.

Recommended:

- Use Option A for the premium demo. Top-tier SaaS demos show the product working at its best.
- Move partial setup examples to onboarding, integrations, and locked/empty-state demos only.

Acceptance:

- The seed account's global state is coherent across dashboard, store, claims, customers, reports, evidence, global, and settings.
- No page undermines its own data with contradictory source warnings.
- Source-health indicators are localized and specific: `Shopify synced 12 minutes ago`, `Gorgias synced 9 minutes ago`, `Evidence export ready`, etc.

### 4.4 Landing Hero Artifact Looks AI-Made

Evidence:

- Desktop hero screenshot: `00_public_landing_top.png`.
- The card has a strong shell, but the content includes redaction blocks, partial typing, empty rows/dots, and odd layout gaps.
- The artifact looks generated to look like a product, not like a product someone could use.

Required fix:

- Replace the hero artifact with a credible, deterministic product snapshot using real seeded data.
- Show one complete case journey: source ingest, claim triage, identity signals, evidence package, recommended action.
- Remove mid-animation typed fragments from static screenshot moments.
- Redaction can exist, but it must look deliberate and legally precise, not like a black rectangle covering a broken name.
- Use fewer fake terminal/status details and more real domain evidence.

Acceptance:

- At 1440, the first viewport tells the product story without needing to scroll.
- The product artifact could pass as a real screenshot of the app.
- No visible fake lorem, placeholder rows, empty dots, or mid-animation text fragments.
- At mobile width, the artifact remains legible or is replaced by a tailored compact product proof module.

### 4.5 Route Canonicalization Is Still Messy

Evidence from post-Claude manifests:

- `/inbox` -> `/claims`
- `/saved` -> `/history`
- `/audits` -> `/history`
- `/audits/new` -> `/upload`
- `/new-audit` -> `/upload`
- `/audit-history` -> `/history`
- `/evidence-packages` -> `/chargebacks`
- `/graph` -> `/global`
- `/report/[runId]` -> `/audit/[runId]`
- `/audit/[runId]/customers` -> `/dashboard` with navigation timeout
- `/apply` -> `/dashboard` with navigation timeout
- `/onboarding` -> `/dashboard` with navigation timeout
- Some help/legal routes redirected to dashboard or timed out during capture.

Required fix:

- Create an IA map of canonical routes, aliases, deprecated routes, and public routes.
- For each alias, choose one behavior: permanent redirect, in-app tab mapping, or intentional retired page.
- Do not redirect a meaningful deep route like `/audit/[runId]/customers` to dashboard unless there is a product reason and a visible explanation.
- Add route-level tests for every canonical and alias route.

Acceptance:

- Every route either renders a designed page, redirects cleanly within 500 ms, or shows a designed retired/unavailable state.
- No route gets stuck at dashboard with an unrelated heading.
- No route silently sends the user to an unrelated product area.

## 5. Page-By-Page Forensic Findings

### 5.1 Landing Page, First Viewport

Post-Claude improvement:

- The hero now has more confidence than the original. The headline is clearer, the integration-first message is stronger, and the product proof is larger.

Still not premium:

- The artifact is synthetic. Stripe and Ramp product visuals are dense but controlled. Unauth's artifact looks like a staged case card that only needs to look plausible from a distance.
- The product proof has too many empty or pseudo-technical elements. Empty rows, isolated dots, short labels, and typed fragments do not create trust.
- The hero does not yet show enough external trust evidence: no customer logos, security posture, integration certification, platform scale, or proof of measurable impact.
- The visual hierarchy is slightly split between editorial copy and artifact. The artifact should not be decoration; it should be the proof.
- The first viewport does not provide a strong enough "this is a real product with real data" moment.

How to fix:

- Build a true hero product scene from seeded data.
- Use an actual case: `Reginald Osei`, 8 of 10 orders with claims, 4 merchants seen, 1 chargeback, evidence package ready.
- Show a compact source rail: Shopify order, Gorgias ticket, shipping event, identity graph, evidence export.
- Show final operator action: `Challenge claim`, `Request evidence`, or `Approve refund`, depending on the story.
- Add trust proof near the CTA: source connections, privacy model, audit trail, and evidence export. Keep it specific, not generic.

### 5.2 Landing Page, Mid And Lower Sections

Post-Claude improvement:

- CSV is visually demoted and the integration story is more prominent.
- The lower page has a stronger attempt at product tiers and workflow proof.

Still not premium:

- The `connect live sources` style section contains a huge dark empty workspace with only a few bullets. It reads like a placeholder.
- The page still leans on section cards rather than a continuous narrative.
- The proof density is lower than Stripe/Ramp. Stripe and Ramp make every scroll reveal more product, more customer proof, more integration specificity, or more enterprise trust.
- Pricing/tier logic and plan bullets feel more like internal product planning than a polished commercial story.
- The page does not yet show final artifacts clearly: evidence package, report export, helpdesk handoff, or audit trail.

How to fix:

- Replace large empty panels with real product surfaces.
- Build a vertical story: connect sources, review claim, inspect identity, generate evidence, sync back to helpdesk, measure savings.
- Add one or two real customer-proof style modules if actual logos/quotes are unavailable. If no real customers can be claimed, use `Example workflow` and keep it honest.
- Make every section answer a buyer objection: accuracy, privacy, operational fit, integration effort, evidence quality, team workflow, time-to-value.

### 5.3 Landing Mobile

Post-Claude improvement:

- Mobile layout is not obviously broken.

Still not premium:

- The product artifact becomes too small and low in the viewport.
- The first mobile view is still copy-heavy. Stripe/Ramp mobile pages keep proof visible without forcing the user to parse a desktop artifact.

How to fix:

- Use a mobile-specific proof module: one claim card, one signal stack, one final recommendation.
- Avoid shrinking a desktop artifact until it becomes unreadable.
- Ensure CTA, proof, and brand signal all appear without awkward cropping.

### 5.4 Public Demo Page

Observation:

- `/demo` renders a simple `Unauth demo` page.

Issue:

- If this route is public or linked anywhere, it is below premium quality. It has no top-tier product narrative, no real demo environment, and no conversion purpose.

How to fix:

- Either remove/hide the route from public IA or turn it into a polished interactive demo entry.
- Best option: route to a curated read-only demo case that uses the same hero story and lets prospects click through claim review, customer dossier, graph, and evidence package.

### 5.5 Login, Signup, Reset

Post-Claude improvement:

- Login/signup now feel like part of the brand. The left proof panel gives Unauth more identity and the right auth card is cleaner.

Still not premium:

- The auth card still has too much empty space relative to its content.
- The proof panel looks good at first glance, but some details are decorative rather than clearly useful.
- The submit button disabled/loading states need QA. Multiple Playwright captures saw the sign-in button remain disabled after fields were filled under fresh sessions. Direct login did work in another run, so treat this as a timing/automation flake until proven, but it is a serious signal.
- `/reset` redirected to `/login` in capture rather than presenting a distinct reset screen.

How to fix:

- Make the proof panel show one clear operational story: `Shopify + Gorgias synced`, `12 open claims`, `4 high confidence`, `3 evidence packages ready`.
- Reduce decorative density and increase usefulness.
- QA auth form state under fast autofill, paste, keyboard submit, password manager fill, and slow JS hydration.
- Make reset/password flows visibly intentional, not just login with a query state unless that is the designed route.

### 5.6 App Shell And Navigation

Post-Claude improvement:

- Removal of visible dev/tier UI is a major improvement.
- The shell feels calmer.

Still not premium:

- The sidebar still has footer/legal links inside the operational navigation, which creates a mixed product/legal surface feel.
- The "Helpdesk not connected" banner appears globally and repeatedly, weakening every page.
- The active route and page hierarchy are sometimes unclear because route aliases land in different canonical areas without explanation.
- Command/search affordance is present but not yet visually integrated into page workflows.

How to fix:

- Treat source health as a small, precise status in the shell, not a repeated trust-eroding warning.
- Move legal links to a quieter footer/account/help area.
- Make nav labels match the actual product objects: `Claims`, `Customers`, `Evidence`, `Network`, `Reports`, `Sources`, `Team`.
- Add breadcrumbs only where they help orientation. Do not expose raw UUID fragments unless needed for audit traceability.

### 5.7 Dashboard

Post-Claude improvement:

- The dashboard is cleaner and less obviously "dev admin".
- The claim overview framing is better than before.

Still not premium:

- The page remains a collection of cards with a large empty helpdesk placeholder.
- It does not feel like an executive-grade command center.
- Repeated `Missing` and `Not connected` states dominate the visual impression.
- Charts and panels feel decorative or incomplete rather than giving a decisive "what should I do today?" story.
- Stripe/Ramp dashboards prioritize next action, system health, and measurable value. This dashboard still asks the user to infer importance.

How to fix:

- Rebuild dashboard around a claim operations cockpit:
  - `Today`: claims needing action, SLA risk, high-confidence abuse, evidence ready.
  - `Sources`: Shopify and helpdesk sync health with last synced timestamps.
  - `Impact`: refund value protected, evidence packages generated, chargebacks prevented or disputed.
  - `Next best actions`: 3-5 concrete tasks with owners/status.
- Replace big empty placeholders with either connected demo data or designed partial-setup modules.
- Use one primary data visualization that tells a real story, not multiple low-information cards.

### 5.8 Store Overview

Post-Claude improvement:

- The store page is more visually composed than before.

Still not premium:

- It still reads like a setup/status page, not a source-health and commerce-risk overview.
- The large chart area is mostly empty and weakens confidence.
- Integration state is too binary and generic.
- The page does not show enough store-specific intelligence.

How to fix:

- Make this the source-health center:
  - Order source status.
  - Helpdesk status.
  - Sync latency.
  - Coverage by data type: orders, refunds, returns, chargebacks, tickets, shipping events.
  - Data quality issues with repair actions.
- Replace the empty order-volume chart with a compact, annotated data-quality timeline.
- Show exactly how source health affects claims confidence.

### 5.9 Claims And Inbox Alias

Post-Claude improvement:

- Claims page has stronger metrics and action framing.
- `/inbox` correctly lands on claims.

Still not premium:

- The main `/claims` route is still table-first.
- The real workbench improvement appears mostly on `/customers/[id]/claims`, not on the primary claim review queue.
- Missing/helpdesk state contradicts the presence of claim data.
- Filter/action controls do not yet feel like a high-throughput operations tool.

How to fix:

- Turn `/claims` into a split-pane review queue:
  - Left: prioritized claim queue with SLA, value, confidence, source, and status.
  - Center/right: selected claim detail with identity signals, source evidence, and recommended reply/evidence package.
  - Bottom or side: activity/history and helpdesk sync.
- Keep table mode as a secondary view, not the default premium impression.
- Make claim status transitions feel deliberate and auditable.

### 5.10 Customers List

Post-Claude state:

- Could not be reliably captured. This blocks final visual evaluation.

Still not premium:

- A core route cannot hang. This alone prevents Stripe/Ramp-level perception.

How to fix:

- See P0 route reliability fix.
- Once stable, evaluate the page against the customer profile and claim workbench. The list should act as an investigation queue, not a generic CRM table.

Target design:

- Prioritized customer risk queue.
- Visible signal reasons: shared address, refund cadence, chargeback history, cross-merchant exposure, claim velocity.
- Saved views or segments.
- One-click transition to claim review and evidence package.

### 5.11 Customer Profile

Post-Claude improvement:

- The customer profile is significantly more product-specific.
- It includes a stronger identity grade, cross-merchant context, evidence scope, and chronological narrative.

Still not premium:

- It still looks like a dense stack of white cards.
- Grey placeholder-looking blocks remain in the top grid.
- The cadence section and bars feel awkward, not executive-polished.
- Breadcrumbs expose raw ID fragments.
- The helpdesk-missing banner undermines the dossier.
- The page is information-rich but not yet decision-led.

How to fix:

- Build the profile as a case dossier:
  - Top: identity summary and recommended handling.
  - Left: chronology of orders, claims, chargebacks, and notes.
  - Right: evidence strength, source coverage, linked identifiers, merchant-wide exposure.
  - Bottom: audit trail and package history.
- Replace placeholder metric blocks with designed data cards and sparklines.
- Make every metric answer "why should the operator trust this conclusion?"

### 5.12 Customer Claim Workbench

Post-Claude improvement:

- This is one of the strongest pages in the current app.
- It finally begins to feel like a real operational workflow, not just data display.

Still not premium:

- It still has dense small cards and muted panels that do not quite reach top-tier polish.
- The right-rail labels and accordion sections feel more like implementation components than designed workflow steps.
- The page needs more source-backed proof of why the recommendation is correct.
- It should show the eventual helpdesk/evidence output more explicitly.

How to fix:

- Make this page the model for other internal pages.
- Add a clear decision ladder: `Review signal`, `Check evidence`, `Draft reply`, `Generate package`, `Sync status`.
- Show final output preview in a high-quality panel: helpdesk note, customer reply, evidence summary.
- Tighten spacing and hierarchy so the operator's next action is unmistakable.

### 5.13 Reports And Audit Run

Post-Claude improvement:

- Reports are cleaner than before and route aliases land in more sensible places.

Still not premium:

- Charts still look lightweight and sometimes odd, such as a strange spike that does not feel explained.
- Reports do not yet feel like executive artifacts a merchant would forward internally.
- `/report/[runId]` redirects to `/audit/[runId]`, which may be fine, but it should be canonicalized and tested.
- The audit run page is still closer to a data table/report than a polished insight surface.

How to fix:

- Define two report modes:
  - Operator view: trends, queues, source coverage, claim risk.
  - Executive export: clean PDF-like summary with impact, evidence, top patterns, recommended policy changes.
- Annotate charts with plain reasons.
- Add export previews that look trustworthy.
- Canonicalize report/audit route behavior.

### 5.14 Watchlist

Post-Claude improvement:

- Retired state is clear. This is better than showing stale legacy UI.

Still not premium:

- The page is still reachable in nav/route space and mostly says something no longer exists.
- The phrase "Customer watchlists are retired" is clear but not a premium product transition.

How to fix:

- If watchlists are truly retired, remove from nav and turn the route into a migration page only for direct hits.
- Explain the replacement: saved segments, claim queue filters, monitored risk signals, or network alerts.
- Provide a clear CTA to the replacement workflow.

### 5.15 Upload, History, Saved, Audits Aliases

Post-Claude improvement:

- Aliases mostly land on upload/history as intended.
- Historical import language is clearer.

Still not premium:

- These pages still feel like internal utilities rather than part of a cohesive workbench.
- CSV/historical import should be positioned as one source ingestion path, not the main product personality.
- Alias behavior can be confusing without canonical route policy.

How to fix:

- Rename and structure around `Imports` or `Data ingestion`.
- Show source status, import history, validation results, and next actions.
- Make `/saved`, `/audits`, `/audit-history`, and `/new-audit` explicit aliases in tests and product architecture.
- Keep public landing integration-first; keep CSV as fallback/historical.

### 5.16 Evidence And Chargebacks

Post-Claude improvement:

- `/evidence-packages` now lands at `/chargebacks`.
- The overview is cleaner than before.

Still not premium:

- The page is still list/table oriented and not yet an artifact center.
- Evidence packages should be one of Unauth's strongest differentiators, but the visual surface does not yet feel board-ready or dispute-ready.
- Evidence detail could not be reliably captured after Claude due auth flake, so it needs direct QA.

How to fix:

- Rename or clarify IA. If the product language is `Evidence`, do not bury it under `Chargebacks` unless chargebacks are truly the only evidence context.
- Build evidence package cards that preview:
  - Claim summary.
  - Source evidence.
  - Identity confidence.
  - Timeline.
  - Generated export state.
  - Last synced/helpdesk status.
- Evidence detail must feel like a polished document builder and preview, not a form around a table.

### 5.17 Global Graph, Graph Alias, Clusters, Lookup

Post-Claude improvement:

- The old runtime crash is fixed.
- `/graph` routes to `/global`.

Still not premium:

- The graph still feels toy-like: dotted spokes, small floating cards, limited proof, and an empty `Evidence signals` panel.
- There is a visible bottom-left `1 Issue` indicator in the screenshot. This reads as a dev/runtime overlay and must never appear in premium screenshots.
- `/clusters` and `/lookup` were not reliably captured after Claude.
- The network visualization does not yet explain why a network relation matters operationally.

How to fix:

- Treat global graph as a signature differentiator.
- Make selected node detail rich: linked identifiers, merchant exposure, confidence, evidence examples, privacy/k-anonymity status, and related claims.
- Replace toy graph styling with a restrained investigative map: clear node hierarchy, edge types, confidence, and selected path.
- Add a fallback if there are no evidence signals, rather than an empty section.
- Remove any dev issue overlays from merchant-facing surfaces.
- Canonicalize `/clusters`, `/lookup`, `/graph`, and `/global`.

### 5.18 Settings Account

Post-Claude state:

- Account page captures and looks calmer than before.

Still not premium:

- It is serviceable but not distinctive.
- Account settings should be quiet and polished, but still aligned with the broader design system.

How to fix:

- Keep it simple.
- Ensure forms, buttons, validation, danger states, and save feedback match the premium component system.
- Avoid making settings pages feel like separate templates.

### 5.19 Settings Billing

Post-Claude state:

- Captured as `Billing` heading plus plain `Loading billing...`.

Still not premium:

- This is a P0 trust failure. Billing is a high-trust page; a raw loading line looks unfinished.

How to fix:

- Add skeleton and loaded seeded state.
- Show plan, usage, invoices, payment method, renewal, and upgrade/cancel controls.
- If billing is not configured in local demo, show a designed unavailable state with a reason.
- Never leave the entire page as a single loading paragraph.

### 5.20 Settings Team

Post-Claude state:

- Captured with `Team management`, `0 active user(s)`, and `Loading team...`.

Still not premium:

- Seed data reportedly includes team members. The UI says none are active and then loads forever.
- Team management is a trust surface. This looks broken.

How to fix:

- Fix seed/team fetch mismatch.
- Show seeded team members with roles, last active, invite status, and audit/security cues.
- Add empty/error/loading states, but seeded demo should load the real team.

### 5.21 Settings Integrations

Post-Claude state:

- Captured with `Integrations`, a large blank area, source setup modules, and `Loading keys...`.

Still not premium:

- Integrations should be one of the highest-trust pages in the app. It currently feels partially loaded.
- The blank suspense fallback is visible as absence.
- API keys loading is not localized enough.
- Source status is too setup-heavy and not enough health/coverage oriented.

How to fix:

- Replace blank top area with a designed source-health overview.
- Show commerce source and helpdesk source as first-class connected systems with sync health.
- Use progressive disclosure for setup forms.
- Add clear integration detail cards: Shopify, Gorgias, Zendesk, Freshdesk, BigCommerce, WooCommerce, Chrome/API.
- Make unsupported/not-connected integrations intentional, not half-rendered.

### 5.22 Integration Detail Pages

Post-Claude state:

- Freshdesk captured, though with navigation timeout.
- BigCommerce captured as `Connect BigCommerce` with `Loading...` and nav timeout.
- WooCommerce redirected to dashboard.
- Shopify, Gorgias, Zendesk, Chrome, API alias were not reliably captured because login button remained disabled in fresh sessions.

Still not premium:

- Source connection pages need to be flawless because they are where trust is either established or lost.
- A setup page that hangs at `Loading...` feels unsafe.

How to fix:

- Build one integration-detail template with:
  - Connection status.
  - Required scopes.
  - Last sync.
  - Data coverage.
  - Error diagnostics.
  - Disconnect/reconnect controls.
  - Setup steps.
  - Security/privacy explanation.
- Implement source-specific content inside that template.
- Add route tests for every integration detail path.

### 5.23 Data Privacy, Help, Legal, Mobile Unsupported

Post-Claude improvement:

- Data privacy, legal data handling, legal DPA, help, mobile unsupported all have captured surfaces.
- Mobile unsupported is clearer than a broken app at small app widths.

Still not premium:

- Some help/legal subroutes redirected unexpectedly or timed out during capture.
- Legal/help pages need consistent public/auth routing.
- Help docs are useful but not yet integrated into the app's task context.

How to fix:

- Canonicalize legal/help public routes.
- Add contextual help links inside complex pages: confidence grade, evidence package, privacy/k-anonymity, source sync.
- Keep legal pages visually sober and document-like, but polished.
- Mobile unsupported should include a path back to login or email link if appropriate.

## 6. Before Vs After Findings

### 6.1 What Got Better

- The app no longer immediately exposes dev/tier preview controls in standard product screenshots.
- The global graph runtime crash is fixed.
- Auth surfaces now carry brand and product context.
- Landing page now attempts a real first-viewport product proof.
- Watchlist retirement is handled directly.
- Customer profile and customer claim workflow are much more product-specific.
- Several legacy routes now land on canonical pages.
- The app's identity is more consistent than before.

### 6.2 What Did Not Move Enough

- Core pages are still too card/table driven.
- The demo data story is still contradictory.
- Source-health states dominate the app in a negative way.
- Settings/integrations/billing/team still look unfinished.
- Evidence, reports, and global graph still underuse Unauth's strongest product differentiators.
- Landing proof still does not hold up under inspection.
- Responsive internal QA is not complete.
- Several routes remain unreliable or unexplained.

### 6.3 What Got Riskier

- The larger landing artifact creates a new risk: it invites inspection but does not survive it.
- Redirecting more routes can hide broken pages while creating IA confusion.
- Cleaner visual styling makes loading dead zones and missing data more obvious.

## 7. Anti-AI-Slop Guardrails For The Next Pass

The next implementation must not drift into generic "AI-made SaaS." Avoid:

- Fake dashboards that look plausible only at thumbnail size.
- Random bento grids.
- Repeated pale cards with generic icons.
- Gradient/orb decoration.
- One-note beige/rust surfaces without contrast or hierarchy.
- Placeholder charts with no analytical point.
- Empty dark panels used as "premium" texture.
- Mid-animation text fragments in static screenshots.
- Overexplained marketing copy that the product UI does not prove.
- Generic feature names like `AI-powered insights` without domain evidence.
- Random motion, shimmer, or `transition-all` polish.
- Trust claims without proof, source, caveat, or artifact.

Use the prior research as guardrails:

- `nextlevelbuilder/ui-ux-pro-max-skill` has real value as a QA checklist, especially for accessibility, responsive behavior, forms, feedback, navigation, charts, and interaction quality. Use it as a checklist, not as a style authority.
- Taste Skill and UI Craft are useful as anti-slop references. Their value is in avoiding template-like layouts, lazy animation, and generic SaaS decoration.
- The implementation source of truth must remain Unauth's product identity: evidence-led, editorial, technical, commerce-risk specific, warm but restrained.

Every visual module should pass this question:

> Could a skeptical ecommerce operations leader inspect this for 30 seconds and believe it is a real tool connected to real sources?

If not, rebuild it.

## 8. Implementation Phases

### Phase 1 - Stabilize Routes, Data, And Loading

Goal: make every page reliable before more visual polish.

Implement:

- Fix `/customers` first-load reliability.
- Replace raw loading paragraphs and blank suspense fallbacks across settings, billing, team, integrations, API keys, and source pages.
- Resolve seeded account data coherence. Choose a fully connected demo state or a clearly labeled partial setup story.
- Canonicalize every route and alias listed in this document.
- Remove any visible dev/runtime indicators such as the bottom-left `1 Issue` on `/global`.
- QA auth form state under paste, autofill, keyboard submit, slow hydration, and fresh sessions.
- Add Playwright route smoke tests for all canonical and alias routes.

Phase 1 acceptance:

- Every route renders or redirects cleanly.
- `/customers` works at 1440 and 1024.
- No page is captured as only `Loading...`.
- No above-the-fold blank suspense gaps.
- Seeded data tells one coherent story.
- No dev/debug overlays in merchant-facing pages.

### Phase 2 - Rebuild Landing And Demo Proof

Goal: make the external story credible at Stripe/Ramp quality without copying their look.

Implement:

- Replace the hero artifact with a deterministic real-data product scene.
- Build a mobile-specific hero proof module.
- Replace large empty mid-page panels with real workflow surfaces.
- Add proof modules for integrations, privacy, evidence package output, and operational impact.
- Either remove `/demo` or turn it into a polished guided demo.
- Make plan/pricing/product-tier content feel commercial and buyer-ready, not internal.

Phase 2 acceptance:

- First viewport proves the product visually.
- No synthetic artifact cues: no placeholder dots, no truncated typed text, no fake terminal panels, no arbitrary redaction blocks.
- Mobile landing shows legible product proof.
- Every section has a buyer-objection purpose.
- Landing can sit beside Stripe/Ramp references without looking like a generated template.

### Phase 3 - Turn Internal Pages Into Workbenches

Goal: make the app's strongest surfaces feel like premium operational software.

Implement:

- Rebuild `/claims` as a split-pane review queue.
- Finish `/customers` as an investigation queue once stable.
- Upgrade customer profiles into true case dossiers.
- Use the customer claim workbench as the design benchmark for other workflows.
- Rebuild evidence/chargebacks as an artifact center with package previews and polished detail pages.
- Rebuild `/global` as a serious investigative graph with meaningful node/edge detail and evidence-backed explanations.
- Upgrade reports into operator and executive modes.
- Reframe store as source-health and data coverage, not a setup/status page.

Phase 3 acceptance:

- Claims, customers, evidence, reports, global, and store all answer "what should I do next?"
- Tables are secondary where a workbench is more appropriate.
- Every recommendation is backed by visible source evidence.
- Evidence exports and helpdesk outputs look board-ready.
- Screens are dense and scannable without card sprawl.

### Phase 4 - Premium Craft, Responsive, And QA

Goal: finish the system so no page feels like a lower-quality template.

Implement:

- Unify buttons, badges, cards, tables, forms, skeletons, empty states, page headers, tabs, panels, charts, and toasts.
- Remove raw color fallbacks and one-off inline styles from touched premium surfaces where practical.
- Audit typography: no negative letter spacing, no viewport-scaled type, no over-large headings inside dense panels.
- Audit spacing and layout stability at 1440, 1280, 1024, and mobile public widths.
- Verify focus states, keyboard navigation, reduced motion, and contrast.
- Screenshot every route after implementation and compare to benchmark references.
- Run lint/tests/build and route smoke tests.

Phase 4 acceptance:

- No page looks visually less mature than the rest of the app.
- No raw fallback styling is visible.
- No text overflow, overlapping UI, or layout shift in captured viewports.
- Skeletons, empty states, and error states are designed.
- App feels authored from landing through the deepest internal route.

## 9. Route QA Matrix

Claude must verify all of these after implementation.

### Public And Auth

- `/landing`
- `/`
- `/demo`
- `/login`
- `/signup`
- `/reset`
- `/reset/update`
- `/mobile-unsupported`
- `/legal/privacy`
- `/legal/data-handling`
- `/legal/dpa`

### Core App

- `/dashboard`
- `/store`
- `/claims`
- `/inbox`
- `/customers`
- `/customers/e04d5eb6-50ac-4643-a61b-debf97a65a79`
- `/customers/52b9005d-819a-4c6d-b852-10498cc9c75c`
- `/customers/e04d5eb6-50ac-4643-a61b-debf97a65a79/claims`
- `/reports`
- `/report/3f9836f8-855d-426c-9723-29c5d1f012e9`
- `/audit/3f9836f8-855d-426c-9723-29c5d1f012e9`
- `/audit/3f9836f8-855d-426c-9723-29c5d1f012e9/customers`
- `/upload`
- `/history`
- `/saved`
- `/audits`
- `/audits/new`
- `/new-audit`
- `/audit-history`

### Evidence And Network

- `/chargebacks`
- `/chargebacks/53f5795b-744f-4bf8-8e57-c81d3fd17cef`
- `/evidence`
- `/evidence-packages`
- `/global`
- `/graph`
- `/clusters`
- `/lookup`

### Settings And Help

- `/settings`
- `/settings/account`
- `/settings/billing`
- `/settings/team`
- `/settings/integrations`
- `/settings/integrations/shopify`
- `/settings/integrations/gorgias`
- `/settings/integrations/zendesk`
- `/settings/integrations/freshdesk`
- `/settings/integrations/bigcommerce`
- `/settings/integrations/woocommerce`
- `/settings/integrations/chrome`
- `/settings/api-integrations`
- `/settings/data-privacy`
- `/settings/audit-trail`
- `/help`
- `/help/how-it-works`
- `/help/identity-matching`
- `/help/confidence-grades`
- `/help/csv-export`

For each route, capture:

- Final URL.
- H1.
- Screenshot at 1440x900.
- Screenshot at 1024x768 for internal app routes.
- Screenshot at mobile width for public/auth routes.
- Console errors.
- Network/server errors.
- Whether any visible text says `Loading`, `Missing`, `Not connected`, `Unavailable`, or `Issue`.

## 10. Concrete Code Areas To Inspect First

Start here because visual evidence points to these areas.

- `app/(app)/customers/page.tsx`: heavy route data work and repeated `/customers` timeouts.
- `app/(app)/settings/integrations/page.tsx`: `Suspense fallback={null}` around the Shopify banner and integrations page composition.
- `components/billing/BillingSettingsClient.tsx`: raw `Loading billing...` and plain unavailable state.
- `components/settings/TeamManagementSections.tsx`: team loading/empty mismatch.
- `components/settings/IntegrationsSetupClient.tsx`: source setup cards, raw color fallbacks, and source-health composition.
- `components/settings/ApiIntegrationsClient.tsx` and related key sections: persistent `Loading keys...`.
- `components/global/GlobalIdentityGraphClient.tsx`: crash fixed, but graph still needs premium redesign and empty evidence-signal handling.
- `app/(public)/landing/_components/sections/LandingHeroCaseCard.tsx`: hero artifact shell.
- `app/(public)/landing/_components/sections/LandingHeroCaseCardBody.tsx`: synthetic artifact content, redaction, typed fragments, and animation.
- `app/(public)/landing/_components/sections/LandingProductTierSection.tsx`: card-heavy proof/tier section.
- `app/(auth)/login/page.tsx`: auth state, proof panel, disabled submit behavior, raw fallback colors/letter spacing.
- `components/claims/*`: reuse the strongest claim-workbench pieces on the main `/claims` route.
- `app/(app)/chargebacks/*` and `components/evidence/*`: evidence package artifact center and detail pages.
- `app/(app)/reports/*`: executive/operator report split.
- `app/(app)/store/page.tsx`: source-health center.

## 11. Final Acceptance Checklist

The implementation is not done until all are true:

- Every route in the QA matrix has a fresh screenshot and no unhandled console/server errors.
- `/customers` loads reliably and quickly.
- No merchant-facing page shows raw `Loading...` as its primary content.
- No above-the-fold suspense area is blank.
- No visible dev/debug issue indicators.
- Seeded demo data is coherent across all pages.
- Landing hero artifact looks like a real product state, not a generated mock.
- Public landing mobile has legible product proof.
- Claims default page is a workbench, not only a table.
- Customer profile is a decision-led dossier.
- Evidence package pages look like exportable artifacts.
- Global graph explains risk with evidence, not just decorative nodes.
- Settings integrations, billing, and team look trustworthy.
- Alias routes redirect or render intentionally.
- No page relies on vague AI wording without domain proof.
- No generic gradient/orb/bento/card-sprawl treatment replaces product-specific evidence.
- Stripe/Ramp side-by-side test passes: Unauth keeps its own identity, but no screenshot feels less finished, less stable, or less real.

## 12. Prompt For Claude

Use this prompt when handing implementation to Claude:

```text
You are implementing the next premium SaaS pass for Unauth. Read and follow:

reports/ui-ux-audit/POST_CLAUDE_PREMIUM_SAAS_FORENSIC_AUDIT_2026-06-08.md
reports/ui-ux-audit/PREMIUM_SAAS_IMPLEMENTATION_PLAN_2026-06-08.md
reports/landing-page-audit/LANDING_PAGE_STRIPE_RAMP_GAP_ANALYSIS.md

The new post-Claude audit is the source of truth. Do not treat this as a reskin. The goal is to make Unauth feel like a top-tier SaaS product at Stripe/Ramp quality while preserving Unauth's own identity: evidence-led, editorial, technical, commerce-risk specific, warm paper/ink/rust, restrained and trustworthy.

Implement in four phases, in order:

Phase 1: stabilize routes, seeded data coherence, auth state, settings loading states, and route aliases.
Phase 2: rebuild landing/demo proof so the product artifact is real, deterministic, and inspectable.
Phase 3: turn internal pages into workbenches, especially claims, customers, evidence, reports, global graph, and store/source health.
Phase 4: premium craft pass, responsive QA, accessibility, screenshots, lint/tests/build.

Do not introduce AI-slop patterns: no fake dashboards, no generic bento grids, no decorative orbs/gradients, no placeholder charts, no raw loading paragraphs, no empty suspense panels, no mid-animation text fragments, no trust claims without proof, no vague AI copy.

For every touched page, verify loaded, loading, empty, error, and partial-connection states. Capture screenshots for every route in the QA matrix at the required viewports. The work is not complete until every acceptance item in Section 11 passes.
```
