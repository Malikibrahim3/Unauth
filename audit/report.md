# Unauth — ASOS-Level Product, UX & Workflow Audit

**Audited build:** local dev (`http://localhost:3000`), Next.js 16.2.4 (Turbopack), Supabase (hosted), 27 May 2026.
**Method:** Headless Chromium (Playwright 1.59) driving a fresh merchant account end-to-end. Console errors, page errors, failed requests and all `/api/` + Supabase responses ≥400 were captured per route. 50+ full-page screenshots saved to `./audit/screenshots/`.
**Test account:** `a***@***-test.com` / store "Audit Test Store". One real CSV audit run was created via the product's own upload path (fixture: 46 orders) to populate customer/claim views. No data deleted, no migrations run.
**PII:** all customer emails/names in this report are masked.

> **Setup note — dev server.** On first contact the running dev server was deadlocked on a stale Turbopack compile (`Compiling /…` at 0% CPU, never completing; root timed out at 180s). Clearing `.next` and restarting fixed it permanently. Flagging because a wedged build cache that produces an infinitely-hanging blank page is exactly the failure a merchant would read as "broken/fragile" — see Performance.

---

## 1. Executive Summary

- **Overall ASOS-readiness score: 69 / 100**

**Verdict.** Unauth is, in effect, two products sharing a shell. The **fraud-audit half** — landing, signup, CSV upload + column-mapping, audit results, the customers/clusters table, and the individual customer profile — is genuinely impressive: a warm, deliberate, editorial visual system that reads as serious risk infrastructure rather than a generic SaaS template, with plain-English explainability and helpful empty/warning states. The **claims half** — the missing-parcel claim review workflow that one of the five target personas (support agent) lives in — is an unfinished prototype that exposes raw internal field names and an unrounded float risk score, and **fails outright** (`Invalid claim payload`, HTTP 400) for any customer imported by CSV because it has no Shopify order to attach. An ASOS director shown the dashboard and a customer profile would lean in; shown the claim screen 30 seconds later they would conclude the product is half-built. The audit engine is pilot-grade today; the claims workflow and Shopify-sync story are not.

**Top 5 things that feel strong**
1. **Visual credibility.** Confident editorial typography, restrained copper-on-cream palette, deliberate spacing and density. Reads like Signifyd/Forter-tier infrastructure, not a template. (`00_landing`, `46_dashboard_populated`, `48_customer_profile`)
2. **CSV upload & column mapping.** Step indicator (Upload → Map fields → Confirm & run), auto-detected columns with green-check confirmations, required vs identity field grouping, an inline "How do I export this from your platform?" guide, and clear limits (200 MB / 500k rows). Best-in-class onboarding for the core action. (`41_upload_mapping`, `42_upload_context`)
3. **Customer profile.** Plain-English narrative ("3 recorded orders… 2 followed by a refund claim (67% rate)… 2 behaviour patterns match known detection criteria"), Case-at-a-Glance, behaviour roadmap, merchant dossier, signal-strength bar. A fraud analyst gets context fast. (`48_customer_profile`)
4. **Operational table.** The customers/clusters list has search, sort-by-risk, status tabs, quick-filters (Has refunds / Has chargebacks / Watchlisted), saved views (Repeat refund claims, Fast claimants…), confidence badges and pagination. (`47_customers_populated`)
5. **Trust layer.** Real Privacy Policy, DPA and Data-handling pages; consistent "raw records stay scoped to your workspace; network comparison uses hashed identifiers and k-safe presence" messaging; zero console/network errors across the entire authenticated app (one exception, below). (`30_legal_privacy`)

**Top 10 things blocking enterprise polish**
1. **Claim review workflow is broken for CSV data.** `Save claim` → `Invalid claim payload` (HTTP 400) because CSV-imported customers have no Shopify order; the order picker shows "No Shopify orders found for this profile yet." The entire missing-parcel → outcome → evidence flow is non-completable without a Shopify connection that this build can't establish. **CRITICAL.** (`51_claim_saved`)
2. **Claim screen looks like a dev prototype.** Raw signal name `postDeliveryClaimRate` shown to users; risk score rendered as `31.363636363636363`; placeholder-only inputs ("evidence url", "evidence hash", "Claim id (optional, for update)"); bare enum dropdowns (`missing_parcel`, `suspected_fraud`); key/value metadata rows. Jarring next to the rest of the app. **CRITICAL.** (`49_claim_panel`)
3. **Shopify sync visibility is essentially absent.** A persistent "Shopify not connected" pill is the only signal; no last-synced time, no sync status, no webhook/import activity, no failure surfacing. A merchant cannot tell if data is flowing. **HIGH.** (Area 4)
4. **The in-product sample-data path is broken for new merchants.** `POST /api/demo` returns 403 "Merchant account not found" for a freshly-signed-up owner — the owner's merchant row exists but is not readable via the user-scoped (RLS) client. New users can't "try it with sample data." **HIGH.**
5. **Claims are disconnected from the audit data model.** The product scores customers from CSV but claims require Shopify orders — the two halves don't meet. **HIGH.**
6. **Self-serve signup is hidden.** `/signup` redirects to a landing CTA; the real account-creation path is a "Request access" toggle buried on `/login`. Fine for closed beta, confusing for evaluation. **MEDIUM.**
7. **IA route/label mismatches.** "Evidence packages" nav → `/chargebacks`; `/evidence` redirects to `/chargebacks`; `/lookup` redirects to `/customers`. The Help page reuses the workbench tab bar (Overview/Cases/Clusters/Audits/Reports), which is contextually meaningless there. **MEDIUM.**
8. **First-run dashboard looks sparse.** With one audit (single day) the time-series charts are flat/empty and the volume chart is a single bar; "Exposure at risk £0.00 / Avg match rate 0.0%". The most-seen screen undersells the product until weeks of data accrue. **MEDIUM.** (`46_dashboard_populated`)
9. **Daily-review queue can read empty when it isn't.** The Inbox only surfaces HIGH/CRITICAL transactions, so with medium-risk data it shows "You're all caught up" despite 46 customers and flagged refund behaviour — the ops persona may conclude there's nothing to do. **MEDIUM.** (`55_inbox_populated`)
10. **Minor persistence/polish gaps.** Settings → "Monthly order volume" shows "Select a range…" despite being set at signup; cold dynamic-route load measured 7.5s (dev-only first compile). **LOW–MEDIUM.** (`17a_settings_account`)

---

## 2. Scorecard Table

| Area | Score /100 | Why | Severity | Recommended Fix |
|------|-----------|-----|----------|-----------------|
| 1. First impression / visual credibility | 86 | Premium editorial system, deliberate hierarchy; only let down by sparse first-run charts. | Low | Seed illustrative ranges / "data builds over time" affordance on empty charts. |
| 2. Navigation & IA | 74 | All expected destinations present and labelled, but redirect quirks and a label↔route mismatch (Evidence packages → /chargebacks). | Medium | Align labels to routes; give Help its own header; stop redirecting /lookup, /evidence silently. |
| 3. Merchant onboarding | 78 | Clear first-run checklist + Skip, strong upload step; but sample-data 403, no real Shopify connect, company-email gate. | Medium–High | Fix `/api/demo` for owners; make "try sample data" one click; clarify email-domain rule. |
| 4. Shopify data-sync visibility | 38 | Only a "not connected" pill; no status, last-synced, events, or failure surfacing. | High | Build a sync-status panel (connected/last sync/records/errors) even if integration is stubbed. |
| 5. Customer profile experience | 88 | Excellent: plain-English summary, dossier, roadmap, signals, clear actions. | Low | Round/scale numbers; ensure Shopify orders render here too. |
| 6. Claim review workflow | 32 | Prototype UI + hard failure for CSV customers (400). Not daily-usable. | Critical | Rebuild as a guided, validated form; allow CSV/manual orders; human-readable everything. |
| 7. Fraud / risk explainability | 80 | Strong in results & profile (A/B/C/D grades, help guides); claim panel leaks `postDeliveryClaimRate` and raw floats. | Medium | Map every internal signal to a human label; round scores; never show raw enums. |
| 8. Shortest path to value | 72 | login → upload → results → customers → profile is genuinely short; but action (claim) dead-ends and onboarding intercepts. | Medium | Make "Review flagged customers" the post-upload CTA; fix the action endpoint. |
| 9. Enterprise trust & polish | 70 | Mostly polished and consistent; the claim panel, unrounded float, and a few persistence gaps pull it down. | Medium | Treat the claims module to the same design system as the rest. |
| 10. Data / privacy / security perception | 84 | Privacy/DPA/Data-handling pages; hashing & k-anonymity messaging; PII shown only in-context. | Low | Surface a short in-app "what we store / what we hash" panel near upload. |
| 11. Operational readiness | 58 | Queue, filters, audit trail, team page exist; but claims broken, queue can read empty, sync absent. | High | Fix claims; let medium-risk feed a review queue; team-visible claim status. |
| 12. Broken / friction points | n/a | See dedicated list. | — | — |
| 13. Performance & responsiveness | 82 | Most routes DOM <1s / interactive <2s; clean console; upload→results 18.6s; cold dev route 7.5s. | Low | Add skeletons on the 3–7s operations; warm the build/cache in prod. |
| 14. ASOS-sized merchant impression (composite) | 70 | Strong audit half, broken claims half; demo risk is real. | — | Fix the two criticals before any ASOS demo. |

---

## 3. User Journey Audit

### Journey 1 — New merchant onboarding
**Steps:** (1) Land on `/landing`. (2) `/login` → click "Request access" toggle. (3) Fill email, password, store name, platform, annual volume, primary concern. (4) Submit → auto sign-in → `/onboarding`. (5) First-run checklist (Upload → Review → Evidence → Chargeback integration → Invite team) with a Step-1 upload form; click **Skip** to reach `/dashboard`.
**Clicks to "I understand what to do":** ~6.
**Friction:** signup is hidden behind a "Request access" toggle (not a visible Sign-up); the `/api/demo` "try sample data" path 403s for the new owner, so the only way to see anything is to upload a real CSV; onboarding intercepts every route until completed/skipped (e.g. `/dashboard` and `/upload` both render the onboarding wrapper while `setup_complete=false`).
**Confusing moments:** company-email gate on `/api/account/setup` would reject gmail/icloud merchants; no Shopify connection is actually establishable.
**Screenshots:** `00_landing`, `02_login`, `03_signup_form_empty`, `04_signup_form_filled`, `05_signup_result`, `06_onboarding`.
**Shorter flow:** auto-skip onboarding to a populated **sample** workspace (fix `/api/demo`), with a single "Connect Shopify or upload a CSV" card. Target 3 clicks to a populated dashboard.

### Journey 2 — Shopify sync check
**Steps:** look for connection/sync status across dashboard, customers header, settings.
**Outcome:** only a static "Shopify not connected" pill (top-right of workbench pages). No connect CTA that completes, no sync status, no last-synced, no event log.
**Friction:** a merchant cannot answer "is my data flowing / is it stale / did it fail?" This is the weakest area.
**Screenshots:** pill visible in `47_customers_populated`, `48_customer_profile`.
**Shorter flow:** a dedicated "Integrations / Sync" panel: status, last sync, records pulled, last error, reconnect.

### Journey 3 — Customer risk review
**Steps:** Customers → (Clusters tab, default) → sort by Highest risk → scan confidence + score + refunds columns → click **Review →** → customer profile.
**Clicks:** 2–3 to a fully-contextualised profile.
**Friction:** none significant — this is the product's strongest flow. Rows open a profile (the list also supports a drawer pattern elsewhere).
**Confusing:** risk scores shown as long decimals in some surfaces.
**Screenshots:** `47_customers_populated`, `48_customer_profile`.
**Shorter flow:** already close to ideal; add a one-click "Add to watchlist / Flag" directly from the row.

### Journey 4 — Missing-parcel claim review  ⚠️ blocked
**Steps:** customer profile → `/customers/:id/claims` → Claim Review panel → set type `missing_parcel` → enter customer reason + internal notes → **Save claim**.
**Outcome:** **`Invalid claim payload` (HTTP 400)** — the order picker shows "No Shopify orders found for this profile yet," and the claim cannot be saved without an order.
**Friction:** the panel exposes raw internals (`postDeliveryClaimRate`, score `31.363636363636363`), placeholder-only fields, and bare enums; even setting decision `denied` / outcome `suspected_fraud` cannot succeed for CSV data.
**Screenshots:** `49_claim_panel`, `50_claim_filled`, `51_claim_saved` (error banner), `52_outcome_selected`.
**Shorter flow:** allow a manual/CSV order reference; validate inline and explain what's missing; redesign as a single guided card.

### Journey 5 — Evidence & outcome saving
**Steps:** within the claim panel, set decision/outcome and evidence (type, source, url, hash, metadata) → Save.
**Outcome:** dependent on Journey 4; with no saved claim, outcome/evidence have nothing to attach to. Evidence inputs are raw ("evidence url", "evidence hash").
**Screenshots:** `49_claim_panel` (Evidence section), `52_outcome_selected`.
**Shorter flow:** evidence should be file-upload/drag-drop with auto-hashing, not a manual hash field.

### Journey 6 — Claim history review
**Steps:** Claim History table at the bottom of the claim panel (Claim / Status / Type / Decision-Outcome / At risk / Updated).
**Outcome:** structurally present and sensible, but empty because no claim could be saved.
**Screenshots:** `55_claim_history`.
**Shorter flow:** once claims save, this table is fine; add per-claim drill-in.

---

## 4. UI/UX Critique

- **Layout.** Disciplined left-rail + workbench shell; generous content cards on cream. Consistent across the audit half. The claim page breaks the grid language (raw bordered boxes).
- **Visual hierarchy.** Strong: KPI strip → charts → tables; overlines, section dots, and weight changes guide the eye. Claim page has flat hierarchy.
- **Density.** Comfortable, enterprise-appropriate; tables are scannable without being cramped.
- **Spacing.** Even and intentional almost everywhere; the claim panel's stacked inputs feel unconsidered.
- **Typography.** A clear highlight — editorial serif/grotesk mix on landing, tabular numerics in tables, consistent label casing. Best-in-class for the category.
- **Button language.** Mostly good ("Review →", "New audit", "Upload first audit"). Weak spots: "Save claim / Save outcome / Save evidence" three near-identical primary buttons stacked on one screen; bare enum labels.
- **Forms.** Upload mapping form is excellent (auto-map, validation checks). Account settings form is clean. Claim form is the outlier — placeholders as labels, no validation messaging beyond a generic 400.
- **Tables.** Customers, results tabs, audit history, claim history all well-structured with sensible columns and tabular numerics.
- **Badges & status labels.** Confidence A/B/C/D and definite/probable/possible/weak are consistent and colour-keyed; risk tiers consistent. "PROD" and "Shopify not connected" pills are clear.
- **Empty states.** A strength: "You're all caught up — Upload a CSV to get started"; "Limited identity data in this audit → See which fields to add". Helpful, branded, actionable.
- **Loading states.** Present for upload/processing; missing skeletons on the 3–7s claim-save and cold profile loads.
- **Error states.** Auth errors are humanised ("Email or password is incorrect"). The claim "Invalid claim payload" is the opposite — generic, non-actionable, no guidance on the missing order.

---

## 5. Fraud/Ops Critique

- **Would a fraud analyst know what to do within 30 seconds?** On the **customers list and profile, yes** — risk sort, refund columns, plain-English summary and "Review →" make the next action obvious. On the **claim screen, no** — raw signal names and a failing save erode confidence immediately.
- **Is the evidence actionable?** In the profile/results: yes (signals, refund rate, behaviour roadmap, confidence grade). In the claim/evidence module: not yet — it asks the user to hand-enter URLs and hashes rather than presenting carrier/delivery evidence.
- **Is the claim workflow operationally realistic for daily use?** No. It's prototype-grade and non-functional for CSV-sourced customers. It would not survive 50 claims/day.
- **Is the scoring explainable to a non-technical ops manager?** Largely yes via confidence grades and help guides — **except** where raw field names (`postDeliveryClaimRate`) and unrounded floats leak through.
- **What would ASOS ask for in a pilot scoping call?** (a) A working claims/INR workflow tied to their real order feed; (b) Shopify (or OMS/API) sync with visible status and freshness; (c) calibration evidence for the score and confidence tiers; (d) team roles, audit trail, and SSO; (e) data-processing/DPA and where PII is hashed vs stored; (f) throughput/SLA at their volume.

---

## 6. Product Gaps

**Must fix before any pilot**
- Claim save 400 for CSV customers — make the missing-parcel workflow complete end-to-end (manual/CSV order reference acceptable).
- Redesign the Claim Review panel to the app's design system; remove raw field names, round scores, replace placeholder-labels and bare enums with proper labels and human-readable options.
- Fix `/api/demo` 403 for new owners (RLS/merchant-membership) so sample data works.

**Should fix before an ASOS-level demo**
- Shopify (or generic OMS) sync status surface: connected / last sync / records / errors.
- First-run dashboard that doesn't read empty (sample state or "your data will build here").
- Make the review queue reflect medium-risk, not only HIGH/CRITICAL, or explain the threshold.
- IA cleanup: label↔route alignment (Evidence packages/chargebacks), Help header, stop silent redirects.
- Surface signup clearly (or rename the login toggle to "Create account").

**Nice to have later**
- One-click flag/watchlist from a customer row; evidence drag-drop with auto-hashing; per-claim drill-in; skeleton loaders on slow ops; persist and display the volume/concern set at signup.

---

## 7. Recommended Redesign Plan

- **Phase A — Fix obvious friction (<1 day each).** Round/scale every displayed score; replace raw `postDeliveryClaimRate`-style strings with labels; humanise the "Invalid claim payload" error; fix Settings volume persistence; align "Evidence packages" label/route; give Help its own header.
- **Phase B — Improve core workflows (1–3 days each).** Rebuild the Claim Review panel as a single guided, validated card; allow manual/CSV order reference so claims work without Shopify; fix `/api/demo` for owners; make "Review flagged customers" the post-upload CTA; feed medium-risk into a usable queue.
- **Phase C — Enterprise polish (visual, copy, states).** Apply the design system to the claims module; add skeleton loaders; non-empty first-run dashboard; evidence drag-drop + auto-hash; consistent button language.
- **Phase D — ASOS-demo readiness (trust, explainability, performance).** Shopify/OMS sync-status panel with freshness + errors; score/confidence calibration evidence in-app; team roles + SSO + audit trail surfaced; throughput validation at ASOS volume; warm prod build/cache so no route ever hangs.

---

## 8. Final Verdict

**Controlled pilot-ready only.**

The fraud-audit engine (upload → score → customer review) is strong enough to put in front of a friendly design partner today. But two of the five target personas — the **support agent** (missing-parcel claims) and the **merchant admin** (Shopify onboarding/sync) — hit broken or absent flows, and the claim screen's prototype quality is exactly the kind of detail that sinks an enterprise evaluation. It is not yet safe to demo the full workflow to an ASOS-sized buyer.

- **Current score: 69 / 100**
- **Score after must-fix changes: ~82 / 100** (estimated — working claims, redesigned claim panel, sample-data fixed)
- **Score after full recommended polish: ~90 / 100** (estimated — sync visibility, calibration evidence, enterprise trust signals, performance)

---

## Appendix: Console & Network Errors

Captured across the full authenticated walkthrough (landing, signup, onboarding, dashboard, inbox, upload, mapping, results + all tabs, customers, customer profile, claim review, watchlist, evidence packages, reports, history, all settings sub-pages, all help sub-pages, legal pages, dark mode, mobile). The app is exceptionally clean — **only one route produced any error**:

```
Route: /customers/:id/claims
  - [network 400] POST /api/claims        ("Invalid claim payload" — no Shopify order to attach)
  - [console error] Failed to load resource: the server responded with a status of 400 (Bad Request)

All other routes: no console errors, no page errors, no failed requests, no 4xx/5xx.
```

**Non-error API observations (not console errors, but product-relevant):**
```
POST /api/demo        → 403 "Merchant account not found"  (sample-data seed rejected for the new owner)
GET  /signup          → 307 → /#run-free-audit            (self-serve signup redirects away)
GET  /evidence        → 307 → /chargebacks                (label/route alias)
GET  /lookup          → 307 → /customers                  (route alias)
GET  /settings        → 307 → /settings/account           (index redirect)
```

**Performance (dev server; indicative):** dashboard DOM 0.98–2.05s / interactive ≤2.6s; customers DOM ~0.6–0.9s; most routes interactive <2s; upload→results 18.6s (with progress UI); cold dynamic profile route 7.5s (first-compile, dev-only); claim/outcome/evidence saves ~3.0–3.2s each.

---

### Screenshot index (`./audit/screenshots/`)
`00_landing` · `02_login` · `03_signup_form_empty` · `04_signup_form_filled` · `05_signup_result` · `06_onboarding` · `41_upload_mapping` · `42_upload_context` · `43_upload_processing` · `44_audit_results` · `45_results_customers` / `_transactions` / `_data_quality` · `46_dashboard_populated` · `47_customers_populated` · `48_customer_profile` · `49_claim_panel` · `50_claim_filled` · `51_claim_saved` (error) · `52_outcome_selected` · `55_inbox_populated` · `55_claim_history` · `56_history_populated` · `57_reports_populated` · `58_watchlist` · `59_chargebacks` · `17_settings` / `17a_settings_account` / `17b_settings_team` / `17c_settings_audit_trail` · `18_help` / `18a_help_how` / `18b_help_grades` / `18c_help_identity` · `15_evidence` · `16_lookup` · `10_history` · `11_reports` · `30_legal_privacy` · `31_legal_data` · `32_legal_dpa` · `33_dashboard_dark` · `34_dashboard_mobile` · `35_customers_mobile` · `36_mobile_unsupported`
