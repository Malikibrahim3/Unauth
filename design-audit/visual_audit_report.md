# Unauth Visual Audit Report

Generated: 27 May 2026  
Audited environment: local app at `http://localhost:3000`  
Seeded merchant: Aurora Outfitters UK, `aurora-outfitters.myshopify.com`  
Primary screenshot directory: `./design-audit/screenshots/`

## Executive Summary

Overall visual and UX score: **72 / 100**

Verdict: **Strong fraud-ops foundation, usable for a pilot, but not yet ASOS-level enterprise-grade.** The authenticated app has clearly moved beyond a generic hobby dashboard in several important places, especially customer intelligence and claim workflow concepts. It still feels early-stage because the visual system is too warm and flat, several trust surfaces contradict each other, tables expose raw identifiers, and route/navigation naming is inconsistent.

Unauth should not abandon its warm palette. The distinctive parcel-adjacent tone can work. The problem is that warm tones currently do too many jobs at once: canvas, selected nav, cards, warnings, risk, chart accents, buttons, and fills. The next version should use warm graphite, cleaner neutral surfaces, and restrained rust accents so the product feels premium rather than beige.

### Top 5 Things That Are Good

1. **Customer profile intelligence is genuinely strong.** The profile page has a meaningful dossier, identity evidence, cross-merchant signals, order history, and risk context. Preserve this.
2. **The inbox/queue concept is the right operational center.** It gives analysts a way to start work quickly and should become more prominent.
3. **Claim workflow ideas are product-specific.** Duplicate prevention, customer response separation, evidence attachment, outcome recording, reopen/reversal, and audit history are the right ingredients.
4. **The app shell is consistent.** Sidebar, header, merchant chip, search, and page shell establish a reliable workspace.
5. **Audit trail and evidence packages create enterprise trust potential.** The concepts are right even though presentation needs refinement.

### Top 10 Things Making It Feel Dated Or Not Enterprise-Grade

1. **Shopify status contradiction:** header says connected, integrations page says not connected.
2. **Warm beige overuse:** too many backgrounds, cards, fills, charts, and buttons sit in nearby brown/beige values.
3. **Raw identifiers in tables:** claims list shows customer UUID fragments instead of names/emails.
4. **Route and label inconsistency:** Customers vs Clusters, Chargebacks vs Evidence packages, `/history` vs `/audit-history`, and missing expected routes.
5. **Reports page lacks executive polish:** charts are sparse and metrics do not explain operational meaning.
6. **Claim review form is long and default-like:** valuable workflow, but too much manual form work before decisions feel anchored.
7. **Accessibility gaps:** login labels are not programmatically associated and several workbench pages lack clear visible H1s.
8. **Tables are not laptop-resilient:** claims table clips important columns at 1024px.
9. **Audit trail exposes raw metadata:** actor IDs and enum-like actions reduce compliance confidence.
10. **Too many bordered boxes:** cards inside panels inside page frames make the app feel like an admin template.

## Page-By-Page Scores

### `/landing`

Screenshot: `./design-audit/screenshots/00_root_landing_or_redirect.png`  
Score: **78 / 100**

Strongest element: The public page has the most modern visual polish in the product and uses the warm brand more confidently.

Weakest element: It sets a higher expectation than the authenticated product currently meets.

Dated-feel reasons: The landing page is not the problem, but the mismatch makes the app feel less finished after login.

Enterprise-trust concerns: Enterprise buyers will compare the polished promise with the operational UI immediately after sign-in.

Recommended improvements: Bring the authenticated workbench closer to the landing page's sharper contrast, clearer typography, and more selective use of warm accents.

### `/login`

Screenshot: `./design-audit/screenshots/00_login.png`  
Score: **63 / 100**

Strongest element: Simple, calm, and not visually noisy.

Weakest element: It feels sparse and under-designed for enterprise access.

Dated-feel reasons: Centered card, low visual specificity, muted button color, no visible H1, and basic field treatment.

Enterprise-trust concerns: Inputs are visually labeled but not programmatically associated; this is a basic accessibility and quality signal.

Recommended improvements: Add H1, properly associated labels, clearer error state, stronger focus ring, and enterprise sign-in trust cues such as SSO-ready copy or data-security microcopy.

### `/upload`

Screenshot: `./design-audit/screenshots/10_upload_flow.png`  
Score: **72 / 100**

Strongest element: The new audit flow is understandable and the dropzone is obvious.

Weakest element: It uses too much vertical space for a repeated operational action.

Dated-feel reasons: Oversized empty dropzone, onboarding-style instructional copy, and wrapping step/KPI label.

Enterprise-trust concerns: Import validation, data source provenance, and post-upload processing state should feel more explicit.

Recommended improvements: Compress the dropzone, move guidance into a side rail, add a processing status strip, and make import validation/errors visibly enterprise-grade.

### `/dashboard`

Screenshot: `./design-audit/screenshots/01_dashboard_overview.png`  
Score: **74 / 100**

Strongest element: Useful high-level metrics and consistent shell.

Weakest element: It is not queue-first enough for a fraud analyst.

Dated-feel reasons: Generic KPI layout, warm cards everywhere, and charts that feel heavier than the decisions they support.

Enterprise-trust concerns: Metrics lack enough explanation and deltas for a head of ops to trust the trends.

Recommended improvements: Lead with priority work: overdue claims, high-risk open claims, awaiting evidence, Shopify sync health, and one-click continue review.

### `/inbox`

Screenshot: `./design-audit/screenshots/02_inbox_queue.png`  
Score: **76 / 100**

Strongest element: This is the clearest operational surface. Preserve the queue model.

Weakest element: Priority and SLA are not visually decisive enough.

Dated-feel reasons: Table states and badges are functional but not refined; row actions do not feel premium or fast.

Enterprise-trust concerns: Analysts need to understand why each case is in the queue and what should happen next.

Recommended improvements: Make this the default landing after login; add triage priority, SLA heat, assigned analyst, next action, and quick claim review affordances.

### `/customers`

Screenshot: `./design-audit/screenshots/03_customers_list.png`  
Score: **74 / 100**

Strongest element: Dense useful table, filters, search, risk and evidence fields.

Weakest element: Terminology and visual hierarchy are inconsistent.

Dated-feel reasons: Workbench naming says Customers in one place and Clusters in another; pale table rows, low contrast chips, and too many similar beige surfaces reduce clarity.

Enterprise-trust concerns: Duplicate seeded/baseline profiles and inconsistent labels can make buyers question data governance.

Recommended improvements: Canonicalize the page as Customers, add a clear visible H1, strengthen row hierarchy, and preserve density while making risk and claim status easier to scan.

### `/customers/:id`

Screenshot: `./design-audit/screenshots/04_customer_profile_top.png`  
Score: **80 / 100**

Strongest element: Best page in the app. The dossier, evidence scope, identity signals, customer history, and claim/order context feel product-specific.

Weakest element: Too many equal-weight boxes compete for attention.

Dated-feel reasons: Repeated bordered panels, muted beige surfaces, and some technical labels such as confidence shorthand make it feel less premium than the content deserves.

Enterprise-trust concerns: Risk score, confidence grade, and evidence confidence need clearer semantic separation.

Recommended improvements: Preserve the information architecture, but use stronger section hierarchy, fewer borders, cleaner risk language, and action labels like Review evidence or Open claim review.

### `/customers/:id/claims`

Screenshots: `./design-audit/screenshots/05_customer_claim_review_route.png`, `./design-audit/screenshots/05_claim_review_actions_mid.png`, `./design-audit/screenshots/05_claim_review_evidence_timeline.png`  
Score: **73 / 100**

Strongest element: Duplicate-prevention warning, customer response separation, evidence attachment, and outcome model are exactly the right fraud-ops concepts.

Weakest element: The workflow is too form-heavy and some context appears incorrect.

Dated-feel reasons: Long beige inputs and selects, disabled actions without enough explanation, and multiple panels of equal visual weight.

Enterprise-trust concerns: The page showed no customer email on file for a seeded customer that has an email. It also showed cross-merchant context inconsistently.

Recommended improvements: Default to the highest-priority active claim, preselect the relevant order, pin a compact claim summary, and keep outcome/evidence/timeline anchored to the selected claim.

### `/claims`

Screenshot: `./design-audit/screenshots/05_claims_list.png`  
Score: **72 / 100**

Strongest element: The table includes the right operational columns: type, status, decision, filed date, age, SLA, evidence, value at risk, updated time.

Weakest element: Customer cell displays UUID fragments and the table breaks at laptop/tablet width.

Dated-feel reasons: Wrapping IDs, weak row hierarchy, muted badges, and no obvious row-level primary action.

Enterprise-trust concerns: A fraud ops team cannot triage confidently if customer identity is hidden behind profile IDs.

Recommended improvements: Join customer name/email/risk into the row, add sticky action column, constrain ID widths, and make SLA and high-risk rows visually decisive.

### `/reports`

Screenshot: `./design-audit/screenshots/07_reports.png`  
Score: **66 / 100**

Strongest element: Useful claim metrics exist, including value at risk, denied/approved counts, and overdue claims.

Weakest element: Visual credibility is low compared with modern B2B reporting.

Dated-feel reasons: Sparse chart, single angular copper trend, too many small metric cards, weak narrative context, and limited export hierarchy.

Enterprise-trust concerns: A head of ecommerce operations cannot easily report this upwards without explanation, deltas, and exportable summaries.

Recommended improvements: Build a manager-ready report layout with KPI story, trend deltas, claim-resolution funnel, fraud loss/recovery split, date comparison, and export menu.

### `/settings/audit-trail`

Screenshot: `./design-audit/screenshots/08_audit_trail.png`  
Score: **68 / 100**

Strongest element: Append-only audit trail concept is valuable for enterprise trust.

Weakest element: It reads like an internal technical log.

Dated-feel reasons: Raw action keys, raw metadata, actor ID fragments, and dense table presentation.

Enterprise-trust concerns: An enterprise buyer expects actor name, role, object, before/after summary, timestamp, and provenance.

Recommended improvements: Humanize action labels, show actor identity and role, move raw metadata behind expandable details, and create filters for actor/action/object/date.

### `/watchlist`

Screenshot: `./design-audit/screenshots/09_watchlist_loaded.png`  
Score: **70 / 100**

Strongest element: Searchable watchlist table is a strong enterprise fraud-ops concept.

Weakest element: Recent appearance metrics did not reflect seeded active behavior.

Dated-feel reasons: Similar table treatment to every other surface and low visual urgency for critical/watchlisted customers.

Enterprise-trust concerns: If Appeared 30d reads as 0 for known active records, the risk intelligence feels unreliable.

Recommended improvements: Fix the count source, add last seen/order/claim context, and give watchlisted rows a distinct but restrained signal treatment.

### `/history`

Screenshot: `./design-audit/screenshots/11_audit_history.png`  
Score: **72 / 100**

Strongest element: Audit run history is necessary and the table is serviceable.

Weakest element: Raw filenames and empty period values make the page feel demo-like.

Dated-feel reasons: File-centric rather than operation-centric naming, generic table styling, and limited import provenance.

Enterprise-trust concerns: A merchant wants to know who uploaded what, when, for which period, what changed, and what data was processed.

Recommended improvements: Show audit name, source, imported by, covered period, row count, flagged count, processing status, and View report action.

### `/chargebacks`

Screenshot: `./design-audit/screenshots/12_evidence_packages.png`  
Score: **71 / 100**

Strongest element: Evidence package concept is strong and enterprise-relevant.

Weakest element: Naming conflict with Evidence packages reduces clarity.

Dated-feel reasons: Table looks similar to every other table and masks customer identity too aggressively for triage.

Enterprise-trust concerns: Analysts need enough identity context to distinguish packages without exposing unnecessary data.

Recommended improvements: Rename route/nav to Evidence packages or intentionally separate chargeback disputes from evidence packages. Show customer display name plus masked email/domain.

### `/chargebacks/:id`

Screenshot: `./design-audit/screenshots/12_evidence_package_detail.png`  
Score: **76 / 100**

Strongest element: Dispute-readiness framing and evidence checklist feel specific and useful.

Weakest element: Hierarchy could be sharper.

Dated-feel reasons: Muted surfaces and many equal-weight blocks reduce the feeling of a premium case file.

Enterprise-trust concerns: Evidence provenance, timestamps, source systems, and export-readiness need to be impossible to miss.

Recommended improvements: Give the package a clear case-header strip, source/provenance timeline, and stronger export/share affordance.

### `/settings`

Screenshot: `./design-audit/screenshots/13_settings_overview.png`  
Score: **65 / 100**

Strongest element: Settings are discoverable and predictable.

Weakest element: It feels closer to a simple admin template than an enterprise admin console.

Dated-feel reasons: Card-heavy layout, small typography, and limited permission/security framing.

Enterprise-trust concerns: Settings should make privacy, integrations, roles, audit logging, and data handling feel mature.

Recommended improvements: Rework settings into Account, Integrations, Team, Audit trail, Data privacy, Billing if applicable, and Security when ready.

### `/settings/integrations`

Screenshot: `./design-audit/screenshots/13_settings_integrations_shopify.png`  
Score: **48 / 100**

Strongest element: The page concept is important and the `SyncStatusCard` has the right shape.

Weakest element: Critical status contradiction.

Dated-feel reasons: Aside from the contradiction, the card is visually basic and lacks enough source-system detail.

Enterprise-trust concerns: A Shopify connection status mismatch is a serious buyer-confidence issue.

Recommended improvements: Fix canonical status first. Then show domain, permissions/scope, last order sync, webhook state, error state, reconnect, and data scope.

### `/settings/team`

Screenshot: `./design-audit/screenshots/13_settings_team.png`  
Score: **70 / 100**

Strongest element: Roles, pending invites, and invitation flow are credible.

Weakest element: Controls need more hierarchy and permission explanation.

Dated-feel reasons: Cards and forms are serviceable but not polished; role controls and trash icons feel too exposed.

Enterprise-trust concerns: Enterprise admins need confidence around owner permissions, pending invite lifecycle, and destructive member removal.

Recommended improvements: Separate active members and pending invites, disable owner edits with explanation, add confirmation copy for removals, and show last active/security details.

## Cross-App Themes

### Colour

The palette is distinctive but currently too muddy. The issue is not that Unauth is warm; the issue is that warm tones are used for almost every layer. Current tokens include warm paper/canvas values such as `--brand-paper`, `--bg-canvas`, and `--surface-base`, rust actions such as `--brand-rust` and `--copper-bright`, and multiple overlapping risk/status aliases. There is also a cool blue-grey muted text value (`--text-muted: #6E7A8A`) sitting on a warm beige canvas, which creates a slightly mismatched tone.

Use brown/rust for brand memory, primary action, active nav, selected filter, and limited chart accents. Do not use brown for every card fill, chart series, warning, table state, and status badge. Dominant neutrals should be warm graphite ink, near-white raised surfaces, pale neutral canvas, and sharper borders.

### Typography

DM Sans is a good choice and should be preserved. The app already has useful type utilities in `app/globals.css`, but actual pages often underplay headings and overuse small muted labels. Several workbench pages have empty or visually weak H1s. Table labels and badge copy are compact, but sometimes too compressed to scan confidently.

Recommended direction: use visible 20 to 24px page titles, 14px table body, 12px metadata, tabular numbers for metrics, semibold labels, and no raw shorthand such as `Conf 0.84` without explanation.

### Layout And Spacing

Spacing is mostly orderly, but the product has too many same-weight boxes. The strongest pages use dense operational grids, but nested cards make them feel older. Use page-level bands, one-level task panels, and stronger grouping through type/spacing rather than borders everywhere.

### Tables

Tables are central and mostly functional. The key issues are identifier exposure, weak row actions, uneven wrapping, insufficient column priority, and poor 1024px behavior on claims. Claims, Customers, Watchlist, Audit trail, Evidence packages, and Audit history should share one enterprise table system with density options, sticky headers, sticky action column, row hover, and clear empty/loading/error states.

### Forms

Forms are competent but default-looking. Claim review especially needs stronger task framing and clearer disabled-state logic. Inputs should feel compact, deliberate, and label-complete. Dangerous actions should be visually and copy-wise distinct.

### Badges

Badges exist everywhere, which is good. The problem is semantic overload: risk, status, confidence, SLA, evidence, watchlist, and environment chips often share similar fills and tones. Define a badge taxonomy and use one component API.

### Empty States

Some empty states are useful, but missing routes fall through to default not-found behavior. For enterprise readiness, every empty/error state should answer: what happened, whether data is safe, and where the analyst should go next.

### Motion

Motion is subtle to absent in the authenticated app. Add restrained 120 to 180ms transitions for hover, dropdowns, drawer reveal, filter changes, and save feedback. Respect `prefers-reduced-motion`.

### Icons

Lucide usage is good in the shell. Extend it systematically to evidence source, SLA, Shopify sync, duplicate warning, customer response, and destructive actions. Icon-only buttons need tooltips.

### Data Visualisation

Current charting is functional but not premium. Reports need neutral grids, labelled axes, trend deltas, legends, multiple series where useful, and careful use of rust as an accent rather than the main visual language.

### Copy

Copy is strongest where it is fraud-specific: duplicate prevention, evidence scope, customer response separation. It is weakest where raw implementation language leaks: UUIDs, enum keys, metadata dumps, confidence shorthand, and route labels.

## ASOS Merchant Impression

Would ASOS think this was built by a top-tier team?

**Not yet.** They would see a thoughtful product underneath, especially in the customer dossier, evidence package, and claim workflow. They would also notice inconsistencies that top-tier enterprise teams usually catch: Shopify status contradiction, raw IDs in operational tables, missing expected routes, report visuals that are not executive-ready, and accessibility basics on login.

What would impress them:

- Customer intelligence depth and cross-merchant signal framing.
- Duplicate-prevention logic in claim review.
- Evidence package and audit-trail concepts.
- Dense operational tables and queue-first potential.
- Warm brand distinctiveness in a market full of blue fintech dashboards.

What would make them doubt it:

- Contradictory Shopify connection state.
- Claims table showing UUIDs instead of real customer context.
- Reports that do not feel board-ready.
- Missing data privacy route and inconsistent route naming.
- Overuse of beige/brown surfaces, making the app feel less premium than the product logic.

What they would ask to improve before pilot:

1. Fix source-system trust: Shopify status, sync history, permissions, and data scope.
2. Make claims/inbox a fast analyst queue with clear priority and SLA.
3. Improve table scanability and responsive behavior.
4. Make reports credible for manager/executive reporting.
5. Add a real data privacy/settings trust surface.
6. Polish the visual system so warm brand accents feel premium, not muddy.
