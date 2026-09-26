# Unauth UI/UX rebuild: complete product and surface context for Claude Code

Status: historical rebuild context from 27 August 2026; superseded for current instructions on 6 September 2026.  
Scope: every merchant-facing page, meaningful route state, overlay, shared system surface, and compatibility adapter in the current application  
Coverage baseline: 65 concrete `page.tsx` modules, 120 audited surfaces, and 223 scenario contracts (219 visual plus four adapters)

Read [GLOBAL_RULES.md](../../GLOBAL_RULES.md) before every new IDE task and use
[MERCHANT_CLARITY_IMPLEMENTATION.md](MERCHANT_CLARITY_IMPLEMENTATION.md) for the
current overhaul. This older explanatory brief is evidence only. Its authority
order, mobile/responsive requirements, presentation scope, and acceptance
instructions below cannot override the current global and domain owners.
Retain its useful descriptions without treating old capability or coverage
statements as verified-current results.

## 0. How Claude Code should use this document

This is the product-understanding brief for a whole-product UI/UX rebuild. It explains what Unauth is, why each surface exists, what the merchant is trying to accomplish, what Unauth must communicate, and which distinctions the interface must never blur.

This document is not permission to change backend behavior, routes, data contracts, permissions, audit effects, provider capabilities, pricing facts, or legal facts. When implementation details conflict, use this authority order:

1. `PRODUCT.md` — product, evidence, money, permission, mutation, and provider truth.
2. `lib/surfaces/manifest.ts` — executable page, state, overlay, adapter, and scenario coverage.
3. `lib/navigation/appRoutes.ts`, `lib/navigation/aliases.js`, and `next.config.js` — canonical navigation and compatibility redirects.
4. `DESIGN.md` — current visual and interaction system.
5. This document — the explanatory model and rebuild checklist.
6. `docs/page-inventory.md` — detailed current implementation projection; useful evidence, but the manifest wins if it has drifted.

The rebuild is presentation and interaction-architecture work. Preserve the application’s routes, URL-backed filters, safe return paths, tenancy, permissions, loaders, mutations, audit consequences, minor-unit money semantics, and truthful unavailable states.

## 1. What Unauth is

Unauth is a desktop evidence-operations system for merchants dealing with post-purchase problems: refund requests, delivery disputes, returns, support complaints, chargebacks, fulfilment failures, recovery claims, and the financial losses or recoveries that follow.

It connects records that normally live in separate systems—commerce, helpdesk, fulfilment, carrier, payment, and merchant-uploaded files—and turns them into one traceable operating workflow. It is not simply a fraud dashboard, helpdesk, refund button, or reporting tool. Its defining job is to keep the complete chain of responsibility visible:

`source fact → evidence gap → recommendation → merchant decision → external handoff → provider response → recovery received → match → reconciliation → audit history`

Each item in that chain has different authority. The interface must never visually imply that one automatically caused or completed the next.

### From Unauth’s perspective

Unauth exists to become the merchant’s auditable operating layer for post-purchase loss. It should:

- join fragmented source records into a coherent case;
- help an operator decide the next permitted action without losing context;
- make recommendations useful while leaving decisions with the merchant;
- expose who owns the next step and what evidence is missing;
- show financial impact without inventing certainty;
- prove how every reported result was derived;
- reduce avoidable leakage, inconsistent handling, and unreconciled recoveries;
- demonstrate value through prevented loss, received recovery, reconciled money, and operational clarity—not inflated claims.

### From the merchant’s perspective

The merchant is asking practical questions:

- What happened to this customer, order, shipment, refund, return, ticket, or dispute?
- Is the evidence complete and fresh enough to act on?
- What does Unauth recommend, and why?
- What did our team actually decide?
- Has anyone performed the external action, or has Unauth only prepared the handoff?
- Who is responsible for the loss and who should pursue recovery?
- Did the provider merely approve a credit, or was money actually received?
- Has the received money been matched and reconciled?
- What needs attention now, who owns it, and when is it due?
- Can we prove the full history later to finance, leadership, a provider, or an auditor?

The merchant should feel that Unauth is calm, exact, and operationally trustworthy. It should reduce cognitive load by ordering information, not by removing material truth.

## 2. Who uses it

- **Owner:** controls the workspace, billing, access, ownership transfer, and permission grants. Can do everything an administrator can do.
- **Administrator:** manages settings, integrations, team members below owner level, audit exports, APIs, shared Work views, and destructive data operations where permitted. Cannot silently become or replace the owner.
- **Analyst/operator:** investigates cases, manages work, records decisions, adds notes, prepares evidence, and progresses permitted operational workflows.
- **Viewer:** reads permitted dashboards, cases, customer context, reports, and records without changing operational state.
- **Finance user:** traces exposure, loss, recovery, received credits, matches, reconciliation, write-offs, and supporting ledger rows.
- **Support/loss-prevention user:** understands the customer request, source facts, prior history, recommendation, evidence gaps, and next action.

Navigation, search results, actions, settings sections, and overlays must be permission-filtered. A hidden or forbidden capability must not look available and fail only after confirmation.

## 3. The product’s truth model

These are UX requirements, not backend trivia.

### Evidence and decisions

- A source fact is not a recommendation.
- A recommendation or rule result is not a merchant decision.
- A merchant decision is not an external provider action.
- Preparing a Shopify, carrier, helpdesk, or recovery handoff is not proof that it was sent or succeeded.
- A factual provider response must be observed or manually recorded with provenance.

### Money

- Store and display money from integer minor units.
- Keep currency, period, timezone, source, freshness, and reconciliation scope visible wherever they change meaning.
- Unknown, unavailable, partial, stale, mixed-currency, and verified zero are different states.
- Never silently total mixed currencies.
- Provider approval is not received recovery.
- Received credit is not matched credit.
- Matched credit is not reconciled money.
- The ledger is append-only. Reversals, corrections, and write-offs add records; they do not erase the original event.

### Providers

Keep these axes separate in both labels and layout:

- provider exists in the catalogue;
- connector code maturity;
- merchant configuration/credentials;
- connection state;
- live health;
- last successful import or sync;
- object-family coverage and freshness;
- returned evidence;
- read capability;
- bounded write capability.

Shopify, Gorgias, ShipBob, UPS, and Shopify Payments form the selected synthetic certification stack. That stack is not proof of a live merchant connection. Stripe Billing is for the Unauth subscription, not merchant payment evidence. `refund.issue`, `request.deny`, and `claim.submit` are unsupported by the MVP+ boundary. The UI may prepare an assisted handoff; it must not claim these actions occurred.

### Consequential actions

Every high-impact action needs a review boundary that states:

- the exact object and workspace;
- the proposed action;
- the value/currency or affected scope;
- what will and will not happen externally;
- the permission being exercised;
- the audit/ledger consequence;
- whether the action is reversible and, if so, how.

## 4. Product-wide information architecture

The signed-in sidebar is grouped by merchant intent, not by database object:

1. **Act on work:** Overview, Work, Cases, Customers.
2. **Trace money:** Loss ledger, Recovery board, Reconciliation, Reports.
3. **Configure decisions:** Payout rules, Flows.
4. **Connect evidence:** Connected sources, Imports.
5. **Workspace:** Settings, Notifications, Help.

The authenticated shell has a permission-filtered navigation rail, compact utility bar, workspace switcher, source-health/notification/account access, and Cmd/Ctrl+K command palette. The main product is desktop-only below 1024px; show the existing desktop-required boundary rather than inventing a reduced mobile operating product. Landing, pricing, demo, authentication, legal, and onboarding remain responsive through 390px.

The dominant UX pattern is `Task → current truth → evidence and context → advanced detail → consequential action`. Registries should preserve filters and selection in the URL. Detail pages should preserve their safe return target. Overlays should keep the parent context visible and return focus correctly.

## 5. Complete page and surface guide

Each subsection names the page, its job, the merchant’s intent, Unauth’s intent, and every meaningful child state or overlay owned by that page.

## 5.1 Acquisition, authentication, and onboarding

### 1. Marketing landing — `/landing`

- **Merchant intent:** Quickly understand what Unauth solves, whether it fits post-purchase operations, and whether to create a workspace or view the demo.
- **Unauth intent:** Explain the evidence-to-decision-to-recovery proposition with credible product proof rather than generic fraud or AI claims.
- **Core content/actions:** Product thesis, real product capability categories, connected-source story, operating principles, evidence/recovery example, Create workspace, View demo.
- **Rebuild note:** This is Persuade mode, but product visuals must remain traceable to real screens, flows, or data categories. Do not invent customer logos, testimonials, numbers, or generic AI-startup imagery.

### 2. Pricing — `/pricing`

- **Merchant intent:** Compare Free, Pro, Growth, and Enterprise, understand monthly GBP price, credits, seats, stores, retention, API limits, inclusions, and exclusions, then start with a plan.
- **Unauth intent:** Set accurate commercial expectations and carry a proposed plan into signup without pretending a URL parameter activated billing.
- **States:** normal catalogue; `pricing-plan-unavailable` when a requested plan is invalid/unavailable.
- **URL state:** `plan`.
- **Truth:** only a server-owned subscription intent plus provider confirmation changes subscription state.

### 3. Interactive product demo — `/demo`

- **Merchant intent:** Experience the product logic before connecting data.
- **Unauth intent:** Demonstrate intake, evidence, recommendation, merchant decision, and recovery using clearly synthetic data.
- **Core sequence:** case/customer/order context → source facts and timestamps → recommendation/rule/confidence/gap → simulated merchant choice → recovery owner/handoff/deadline.
- **States:** step-specific content, `demo-loading`, `demo-error`.
- **URL state:** `step`.
- **Truth:** simulated decisions and outcomes are demonstration data, never product or merchant proof.

### 4. Create account — `/signup`

- **Merchant intent:** Create the user identity that will own or join a workspace.
- **Unauth intent:** Establish a valid authenticated identity and preserve safe plan/return context.
- **Core actions:** enter email/password/confirmation; submit; move to onboarding or safe destination.
- **States:** default, validation, `signup-submitting`, `signup-error`.
- **URL state:** `next`, `plan`.

### 5. Sign in — `/login`

- **Merchant intent:** Access the correct workspace and return to the interrupted task.
- **Unauth intent:** Authenticate without losing safe navigation or commercial context.
- **States:** default, validation, `login-submitting`, `login-error`.
- **URL state:** `next`, `plan`.

### 6. Request password reset — `/reset`

- **Merchant intent:** Recover access to an account.
- **Unauth intent:** Initiate Supabase recovery without exposing account existence or unsafe redirects.
- **States/surfaces:** request form; `password-reset-sent-state`; `password-reset-error`.
- **URL state:** `next`.

### 7. Set new password — `/reset/update`

- **Merchant intent:** Complete recovery and return to work.
- **Unauth intent:** Validate the recovery session and update credentials safely.
- **States:** default, `reset-update-invalid-session`, `reset-update-success`, `reset-update-error`.
- **URL state:** `next`.

### 8. Workspace onboarding — `/onboarding`

- **Merchant intent:** Supply business context, connect minimum evidence sources, and know when the workspace is ready to enter.
- **Unauth intent:** Create a truthful first-run path without implying that configured credentials equal healthy or complete data.
- **Surface 9 — store profile:** store/business name, commerce platform, monthly volume, primary loss concern, WMS/3PL and returns-platform usage.
- **Surface 10 — Shopify connection:** shop domain, authorization state, connection guidance.
- **Surface 11 — helpdesk connection:** Gorgias, Zendesk, or Freshdesk choice and connection/setup status.
- **Surface 12 — setup verified:** checklist of profile, commerce connection, and helpdesk connection; enter workspace.
- **Other states:** `onboarding-loading`, `onboarding-error`.
- **URL state:** `step`, `next`.
- **Responsive rule:** fully usable through 390px.

## 5.2 Operating overview and work triage

### 13. Overview dashboard — `/overview`

- **Merchant intent:** Understand the current financial/operational position and choose the most important work.
- **Unauth intent:** Prove value without hiding scope or data quality.
- **Core content:** range, comparison, currency, exposure, recovered, prevented, realised loss, case counts, active/needs-action/ready queues, time series, SLA/exposure attention groups, source freshness, reconciliation confidence, and coverage.
- **Primary action:** move from summary to the exact queue or supporting record.
- **Surface 14 — data-trust details modal:** source, coverage, current/stale counts, freshness, financial validation issues, and reconciliation issues. It answers “can I act on these figures?”
- **Surface 15 — unavailable/no-work states:** distinguish absent dated history, unavailable verified finance, no active work, and verified zero. Offer the correct source, range, or record action.
- **Other states:** `overview-dashboard-loading`, `overview-error`.
- **URL state:** `range`, `compare`, `currency`, `metric`.

### 16. Work queue — `/work`

- **Merchant intent:** See one prioritized list of tasks and integration exceptions, know who owns each item, and progress work without losing filters.
- **Unauth intent:** Become the operational control plane across cases, evidence, outcomes, recoveries, and source exceptions.
- **Core content:** exact counts, task/exception ID, title, description, related-object route, source, priority, lifecycle state/version, owner/waiting party, deadline, blocker, and selected-item inspector.
- **Actions:** search, filter, sort, page, inspect, take ownership, start, snooze, complete, release, reopen, or follow the validated record link.
- **Surface 17 — integration-exception resolution drawer:** compare exception and candidate match, accept/reject the match, or dismiss with an operator note.
- **Surface 18 — saved Work views:** apply, save, share where permitted, delete, or retry a complete server-owned query definition. A read error means unavailable, not an incomplete list.
- **Surface 19 — empty/search states:** distinguish no search result, no open work, and no match for the current saved/filter view.
- **Other states:** list/board loading, `work-error`.
- **URL state:** `view`, `search`, `priority`, `state`, `assignee`, `sort`, `page`, `savedView`, `selected`.

## 5.3 Cases and customer investigation

### 20. Cases registry — `/cases`

- **Merchant intent:** Scan every operational case, identify exposure and next action, and open the right review.
- **Unauth intent:** Provide the canonical case queue rather than fragmenting refunds, chargebacks, delivery issues, and support problems into disconnected tools.
- **Core content:** case/customer/order/ticket references, type/reason/status, amount at risk/currency, attribution confidence, responsibility, recovery status, next action/reason, owner, created/updated times.
- **Surface 21 — case context drawer:** compact preview with status, exposure, next action, related records, and timeline; decide whether to open the full case.
- **Surface 22 — empty/filter states:** distinguish an unpopulated case ledger from filters with no matches; offer source connection/manual creation or filter reset as appropriate.
- **Other states:** `cases-registry-loading`, `cases-error`.
- **URL state:** `search`, `queue`, `status`, `owner`, `sort`, `selected`.

### 23. Case review workbench — `/cases/[caseId]`

- **Merchant intent:** Understand exactly what happened, close evidence gaps, make a defensible decision, and progress the next recovery step.
- **Unauth intent:** Make the full authority chain visible in one place without converting advice into action.
- **Core content:** case identity/status/type/reason; customer/order/ticket; exposure/currency; nine hard provider gates; item, parcel, custody and delivery evidence; investigation requests/responses/attachments; recommendation with reason/confidence/gaps; merchant decision history; assisted handoff state; factual provider outcomes; responsibility; recovery; financial stages; credit/reconciliation; comments; combined audit timeline.
- **Primary hierarchy:** current task and decision boundary first; current truth strip second; evidence and context next; advanced history and related records after; consequential action last.
- **Surface 24 — record/reverse merchant decision modals:** confirm a decision with value/currency/external-action status, or append a replacement and required reversal rationale. Never mutate the original decision.
- **Surface 25 — investigation request modal:** target/partner, evidence gap, requested proof, recommendation reason, override rationale, subject/body/recipient/channel/due date; saves a factual request draft.
- **Surface 26 — investigation response modal:** outcome, summary, full response, responder, timestamp, attachment; records observed evidence.
- **Surface 27 — investigation lifecycle action modal:** auditable send, chase, close, or cancel transition with timestamp and note.
- **Surface 28 — responsibility assessment modal:** attribution, confidence, likely recovery owner, recoverability, supporting/conflicting evidence, and correction rationale. Responsibility is independent of the customer decision.
- **Surface 29 — delivery-photo finding modal:** human interpretation, timestamp, and rationale; never present machine inference as observed fact.
- **Other states:** detail loading, `case-not-found`, `case-error`.
- **URL state:** `tab`, `investigationId`, `return`.
- **Hard boundary:** a refund authorization may prepare an exact manual handoff; Unauth does not assert that Shopify issued the refund.

### 30. Customers registry — `/customers`

- **Merchant intent:** Find a customer and scan commercial value, open exposure, case rate, and connected identities before deeper investigation.
- **Unauth intent:** Give case decisions customer context without turning uncertain identity signals into accusations.
- **Core content:** name/email, order count, spend by currency, average order value, total/open cases, last order, and filter flags.
- **Surface 31 — customer preview drawer:** quick profile/risk summary, open cases/exposure, linked commerce/support accounts, plus loading/unavailable substates.
- **Surface 32 — empty/filter states:** distinguish no indexed customers from no query matches.
- **Other states:** `customers-registry-loading`, `customers-error`.
- **URL state:** `search`, `status`, `risk`, `sort`, `selected`.

### 33. Customer profile — `/customers/[id]`

- **Merchant intent:** Investigate the customer’s complete commerce, support, dispute, case, note, identity, and activity history.
- **Unauth intent:** Assemble relevant context while preserving source, confidence, permission, and merchant scope.
- **Core content:** identity/contact/address; orders/value/case rate/refunds/chargebacks/open exposure; order/shipment/refund/chargeback detail; tickets; disputes; notes; activity; linked accounts and confidence; identity changes; possible matches; explicitly bounded network aggregate context.
- **Overlay:** `customer-note-editor` for a permissioned merchant note.
- **Surface 34 — access-blocked state:** explain denied/expired access without exposing customer data; return to an authorized route.
- **Other states:** detail loading, `customer-not-found`, `customer-error`.
- **URL state:** `tab`.

### 35. Build evidence package — `/customers/[id]/evidence/new`

- **Merchant intent:** Select a disputed order and assemble case-ready evidence from available records and prior signals.
- **Unauth intent:** Make evidence inclusion deliberate, provenance-aware, and reviewable before a package is created.
- **Core content:** order/date/value/currency, refund/dispute claim, prior-signal match, each evidence item’s inclusion and availability, merchant note, eligibility.
- **Surface 36 — no-orders/no-cases states:** explain why a package cannot be built and whether the blocker is unavailable order history or absence of a qualifying case.
- **Other states:** `evidence-package-builder-loading`, `evidence-package-error`.
- **URL state:** `orderId`, `caseId`.

## 5.4 Connected commerce and support records

These pages verify source-backed facts and provide connected-record navigation. They share a visual family but must retain object-specific labels, fields, lifecycle, provenance, and return context.

### 37. Order detail — `/orders/[id]`

- **Merchant:** verify purchase, amounts, discounts, payment/fulfilment state, line items, cancellation, customer, and connected case/refund/return/shipment.
- **Unauth:** expose the canonical order and provider freshness as evidence, not as an editable order-management screen.
- **States:** commerce loading, shared not-found, `order-error`; URL `return`.

### 38. Refund detail — `/refunds/[id]`

- **Merchant:** verify amount/currency, full/partial scope, reason, timestamps, source, and linked order/case.
- **Unauth:** distinguish a source-observed refund record from a recommendation or prepared refund handoff.
- **States:** commerce loading, shared not-found, `refund-error`; URL `return`.

### 39. Return detail — `/returns/[id]`

- **Merchant:** trace requested, received, inspected, disposition, refund, and replacement progression.
- **Unauth:** show the return lifecycle without inferring missing milestones.
- **States:** commerce loading, shared not-found, `return-error`; URL `return`.

### 40. Shipment detail — `/shipments/[id]`

- **Merchant:** verify fulfilment, carrier/service/tracking, source status, shipped/delivered timestamps, and linked evidence.
- **Unauth:** make delivery/custody facts available to case and responsibility review.
- **States:** commerce loading, shared not-found, `shipment-error`; URL `return`.

### 41. Support ticket detail — `/tickets/[id]`

- **Merchant:** reconstruct the customer conversation and its relation to the order/case.
- **Unauth:** preserve message actor, visibility, time, source, freshness, and conversation history as evidence.
- **States:** support loading, shared not-found, `ticket-error`; URL `return`.

### 42. Dispute detail — `/disputes/[id]`

- **Merchant:** verify dispute type/status/reason, amount/currency, lifecycle, and linked records.
- **Unauth:** connect payment dispute evidence to cases and financial truth without inventing settlement status.
- **States:** support loading, shared not-found, `dispute-error`; URL `return`.

### 43. Connected-record not-found

- **Merchant:** understand that the requested record is missing or inaccessible and return safely to its registry.
- **Unauth:** avoid leaking data or implying that a workflow record was deleted/changed.
- **Owners:** connected object routes and loss detail variants.

## 5.5 Loss recognition and recovery

### 44. Loss ledger — `/financials/losses`

- **Merchant intent:** See confirmed, estimated, recoverable, prevented, and written-off loss; identify what remains unrecovered.
- **Unauth intent:** Maintain the canonical loss projection with explicit formula and provenance.
- **Core content:** net unrecovered/recoverable/confirmed totals, record count, effective-date trend, ranked causes, category, attribution, source, owner/counterparty, status, values, update/freshness.
- **Surface 45 — chart/ledger unavailable states:** no records, no filter matches, mixed currencies, no dated history, insufficient trend history, or unreconciled formula. Never zero-fill.
- **Other states:** list loading, `losses-error`.
- **URL state:** `range`, `currency`, `source`, `status`, `search`, `sort`, `page`.

### 46. Loss detail — `/financials/losses/[lossId]`

- **Merchant intent:** Understand one loss’s amount, cause, responsibility, evidence, recoverability, work, correspondence, and ledger history.
- **Unauth intent:** make every number traceable and every correction additive.
- **Core content:** category/counterparty/status/owner/source/freshness; gross exposure, refunds/offsets, confirmed/estimated loss, recovered/net; primary and alternative attribution; evidence requirements; linked case/recovery; tasks; correspondence; activity; immutable entries.
- **Surface 47 — write-off modal:** show outstanding value/currency, reason, permanence, and append-only effect before confirming.
- **States:** detail loading, not-found, `loss-detail-error`.

### 48. Recovery board — `/financials/recovery`

- **Merchant intent:** Progress viable recovery cases through evidence, submission/handoff, correspondence, provider result, receipt, and closure.
- **Unauth intent:** coordinate recovery without overstating external activity or money.
- **Core content:** estimated recovery; stage counts; partner/owner/type/status; case; sought/recovered/outstanding values; last source event; missing evidence; deadline; next action.
- **Surface 49 — confirm recovery action modal:** record ready/submitted/chased/approved/partial/rejected/appealed/paid/closed transitions with appropriate value, currency, source reference, and reason. Labels must distinguish approval from receipt.
- **Case context drawer:** shared quick case inspection from the board.
- **Surface 50 — empty state:** explain that recovery appears only after a source-backed loss has a viable route.
- **Other states:** list loading, `recovery-board-error`.
- **URL state:** `stage`, `owner`, `source`, `search`, `selected`.

### 51. Recovery detail — `/financials/recovery/[recoveryId]`

- **Merchant intent:** Complete the evidence pack, manage correspondence/tasks, and record factual partner and money progression.
- **Unauth intent:** preserve the separate sought, approved, received, matched, reconciled, outstanding, and written-off stages.
- **Core content:** partner/owner/type/status/deadline/next chase; monetary stages; required/missing evidence; correspondence provenance; tasks; append-only status events.
- **Overlay:** `recovery-detail-action-modal` for a reviewed transition.
- **States:** detail loading, `recovery-not-found`, `recovery-detail-error`.
- **URL state:** `tab`.

## 5.6 Reconciliation and reporting

### 52. Reconciliation exception workspace — `/financials/reconciliation`

- **Merchant intent:** Find and resolve differences between source records, received credits, and ledger entries.
- **Unauth intent:** prevent unmatched or ambiguous money from being silently reported as reconciled.
- **Core content:** ledger scope, confirmed-entry/open-exception counts, source coverage, decision boundary, exception identity/type/confidence/status/assignee, candidates, values, notes, linked case.
- **Overlay:** `reconciliation-resolution-drawer` for source-versus-ledger comparison and reviewed resolve/dismiss action.
- **Surface 53 — loading/empty states:** pending data and genuinely no open exceptions are distinct.
- **Other states:** `reconciliation-error`.
- **URL state:** `status`, `source`, `search`, `selected`.

### 54. Financial reports — `/financials/reports`

- **Merchant intent:** Understand period performance, financial stages, operational outcomes, and supporting definitions.
- **Unauth intent:** present derived value while keeping scope, formula, coverage, and source traceable.
- **Core content:** range/timezone/currency; requested, exposure, approved, paid, estimated/confirmed loss, recoverable, recovered, prevented, written-off, outstanding, final net loss; reconciliation issues; case count; cumulative trends; loss cause, recovery stage, open-operation breakdown; metric definitions.
- **States:** report loading, `reports-unavailable-zero`, `reports-error`.
- **URL state:** `range`, `compare`, `currency`, `report`.

### 55. Report supporting records — `/financials/reports/records`

- **Merchant intent:** Audit the immutable rows behind a report metric and export the bounded result.
- **Unauth intent:** let every aggregate be traced to record-level evidence.
- **Core content:** metric/scope, record link/type/state, amount/currency, update time, pagination, export state.
- **States:** shared report loading, `report-records-empty`, `report-records-error`.
- **URL state:** `reportId`, `range`, `currency`, `search`, `sort`, `page`, `pageSize`.

### 56. Named report detail — `/financials/reports/[reportId]`

- **Merchant intent:** Open a governed report definition/run and inspect its scoped results.
- **Unauth intent:** provide dedicated named-report context without pretending saved scheduling/delivery exists.
- **Core content:** report identity, definition/scope, run metadata, canonical financial summary, and linked supporting records.
- **States:** loading, `named-report-not-found`, `named-report-unavailable`, `named-report-error`.
- **URL state:** `range`, `currency`, `page`.
- **Unavailable boundary:** persisted owner, schedule, and delivery mutations remain unavailable until a saved-report backend exists.

## 5.7 Rules, recovery policy, and flows

Rules produce advisory results. Flows are bounded operational automations. Neither is allowed to silently turn a recommendation into a merchant decision or perform unsupported external actions.

### 57. Payout rules registry — `/controls/rules`

- **Merchant:** find, inspect, and create versioned decision-support rules.
- **Unauth:** make advisory policy consistent and auditable.
- **Core content:** name, description, priority, draft/published state, version, updated time.
- **Surface 58 — rule builder drawer:** name/description, condition group/operator, signal field/operator/value, recommended action, priority; saves a draft.
- **Surface 59 — empty state:** explain create → simulate → publish lifecycle.
- **Other states:** list loading, `rules-error`.
- **URL state:** `search`, `state`, `type`, `sort`, `selected`.

### 60. Rule version workbench — `/controls/rules/[ruleId]`

- **Merchant:** compare, edit, test, publish, or roll back a rule version.
- **Unauth:** preserve version history and make publication an explicit boundary.
- **Surface 61 — simulation/publication modals:** sample signals, match result, recommendation; draft/current diff, validation, atomic publication warning.
- **States:** detail loading, not-found, error.
- **URL state:** `version`, `tab`.

### 62. Recovery rulebook — `/controls/rules/recovery`

- **Merchant:** define the responsible recovery partner, claimable scope, required evidence, and deadline defaults.
- **Unauth:** route recovery consistently while exposing the policy source and confidence.
- **Surface 63 — partner/recovery-rule modals:** partner identity/contact/channel/SLA/instructions, or rule claim type/recovery type/evidence/costs/deadline/confidence.
- **States:** empty, error.
- **URL state:** `partner`, `state`, `selected`.

### 64. Flows registry — `/controls/flows`

- **Merchant:** see bounded workflows and their draft/published/paused state; open a flow or its runs.
- **Unauth:** make operational automation inspectable and permissioned.
- **Surface 65 — new-flow draft modal:** name, description, trigger, ordered conditions, bounded action configuration, validation summary.
- **Surface 66 — empty state:** explain safe draft → test → publish lifecycle.
- **Other states:** list loading, `flows-error`.
- **URL state:** `search`, `state`, `sort`.

### 67. Flow version workbench — `/controls/flows/[flowId]`

- **Merchant:** edit, test, publish, pause, resume, or roll back a versioned flow.
- **Unauth:** keep trigger, conditions, steps, result, version, and publication authority visible.
- **Surface 68 — edit/test/publication modals:** draft editor, sample event and step result, version diff/validation/publication boundary.
- **States:** detail loading, not-found, error.
- **URL state:** `version`, `step`, `tab`.

### 69. Flow runs registry — `/controls/flows/runs`

- **Merchant:** locate successful, failed, or relevant workflow executions.
- **Unauth:** provide operational accountability for automation.
- **Core content:** run/flow ID, status/outcome/error, start/end time.
- **States:** list loading, empty, error.
- **URL state:** `workflow`, `state`, `range`, `search`, `page`.

### 70. Flow run detail — `/controls/flows/runs/[runId]`

- **Merchant:** diagnose exactly what triggered and happened in one run.
- **Unauth:** show an execution trace rather than an opaque success/failure badge.
- **Core content:** event, run status/error/time; each step’s index, output type, status, result, error, and completion.
- **Overlay:** `flow-run-payload-inspector` for structured payload/result detail.
- **States:** detail loading, not-found, error.
- **URL state:** `step`.

## 5.8 Sources, imports, and integrations

### 71. Connected sources — `/sources/connected`

- **Merchant intent:** Know which evidence layers are covered, what each configured source is doing, and what needs repair.
- **Unauth intent:** make source trust visible rather than treating “connected” as a sufficient health signal.
- **Core content:** commerce/support/fulfilment/delivery/financial coverage; configured/covered/indexed/attention counts; provider/account; configuration, import, freshness, health, records, last data.
- **Overlays:** shared connection/disconnection modals.
- **States:** list loading, `connected-sources-empty`, `connected-sources-error`.
- **URL state:** `status`, `category`, `q`.

### 72. Source catalogue — `/sources/browse`

- **Merchant intent:** Find a provider and understand whether it is live, beta, partial, planned, and connectable.
- **Unauth intent:** show breadth honestly without presenting catalogue presence as working capability.
- **Core content:** provider, category, description, capability stage, authentication mode, runtime availability.
- **States:** no results, error.
- **URL state:** `category`, `q`.

### 73. Source detail — `/sources/[sourceId]`

- **Merchant intent:** Understand one provider’s connection, capability, health, freshness, imports, and failures; sync, repair, connect, or disconnect where permitted.
- **Unauth intent:** centralize provider truth and diagnose evidence gaps.
- **Core content:** provider/account/status, auth/delivery model, scopes, last health/sync/data; capability matrix; imports; failed ingestion events.
- **Surface 74 — connection/disconnection modals:** provider-specific credentials or account/environment selection, verification feedback, and disconnect impact while retaining history.
- **States:** list/detail loading, unavailable, not-found, error.
- **URL state:** `tab`.

### 75/79/80. Provider setup — `/sources/setup/[providerId]`

- **Merchant intent:** Understand requirements, authorize or supply access, verify the source, and know exactly what will be covered.
- **Unauth intent:** provide provider-specific setup while keeping activation separate from capability descriptions.
- **Surface 75 — Shopify connect modal:** normalize and validate Shopify Admin URL before redirecting to Shopify authorization.
- **Surface 79 — provider-specific setup:** real tailored flows for Chrome, Shopify, Gorgias, Zendesk, and Freshdesk, including required access, scopes, webhooks, sync state, and verification.
- **Surface 80 — generic seven-step setup:** provider → permissions → mapping → history → schedule → review → activation for other catalogue providers. Explanatory/unavailable steps must stay truthful when the backend cannot edit or test them.
- **Shared overlay:** connection/disconnection modal.
- **States:** settings/config loading, `connector-setup-error`.
- **URL state:** `step`, `returnTo`.

### 76. CSV imports — `/sources/imports`

- **Merchant intent:** upload merchant records, map columns, validate problems, and commit only a safe canonical dataset.
- **Unauth intent:** admit data without hiding mapping or row-level errors.
- **Core content:** dataset type, import/file metadata, source columns, canonical mappings, valid/invalid counts, errors, commit state, history.
- **Surface 77 — validation/empty states:** no file, validating, mapping error, invalid rows, ready to commit.
- **Overlay:** `replace-import-file-confirmation` protects in-progress mappings.
- **Other states:** `imports-error`.
- **URL state:** `step`.

### 78. Import job detail — `/sources/imports/[jobId]`

- **Merchant intent:** inspect one immutable import’s mapping snapshot, outcome, validation errors, and imported/failed counts.
- **Unauth intent:** make ingestion results diagnosable and auditable after the upload flow.
- **States:** `import-job-loading`, `import-job-not-found`, `import-job-error`.
- **Truth:** this is now a dedicated job detail; do not regress it into a re-export of the general import page.

### 81. ShipBob channel selection — `/sources/setup/shipbob/select`

- **Merchant intent:** choose the correct discovered ShipBob account/channel before completing authorization.
- **Unauth intent:** prevent ambiguous multi-account connection.
- **Core content:** selection/account/channel IDs, name, environment, expiry, save state.
- **States:** loading, empty/no account, error.
- **URL state:** `returnTo`.

## 5.9 Workspace, governance, privacy, and billing

Settings use a local vertical navigation. Every page should explain: who can change this, current state, what saving affects, whether the change is immediate, and what audit record results.

### 82. Account and appearance — `/settings/workspace/account`

- **Merchant:** maintain profile/workspace context, password, and the device-local light/dark preference.
- **Unauth:** keep identity, workspace defaults, security, and appearance understandable without mixing them with provider setup.
- **Core content:** email, business/store name, volume, loss concern, theme, new password/confirmation.
- **States:** config loading, `account-settings-error`.
- **Destructive account/workspace deletion belongs behind explicit reviewed overlays, not inline accidental actions.**

### 83. Team management — `/settings/workspace/team`

- **Merchant:** see active/pending members and audit context; invite, change role, remove access, or transfer ownership.
- **Unauth:** enforce the owner/admin/analyst/viewer model and make authority changes explicit.
- **Surface 84 — invite/ownership overlays:** invite email/role; transfer target, billing/access/ownership impact, no automatic rollback, and audit consequence. Ownership cannot be invited.
- **Other overlays/actions:** remove member/revoke invitation with retained historical attribution.
- **States:** settings loading, empty, error.
- **URL state:** `search`, `role`.

### 85. Platform defaults — `/settings/product/platform`

- **Merchant:** set workspace-wide reporting, retention, decision, financial, and connector defaults.
- **Unauth:** centralize policy that changes how other surfaces interpret or route work.
- **Core content:** reporting currency/timezone, retention, report range, matching policy, cost basis, deadlines, approval/escalation/high-value thresholds, repeat-case window, sync frequency, writeback/webhook toggles.
- **States:** loading, error.

### 86. Notification preferences — `/settings/product/notifications`

- **Merchant:** choose which assignments, mentions, deadlines, evidence, decisions, recovery, connection health, high-value cases, summaries, and reports generate in-app events.
- **Unauth:** reduce noise while preserving important operational signals.
- **States:** loading, email-channel unavailable, error.
- **Truth:** email delivery must look unavailable/disabled, not merely unchecked, when it is not implemented.

### 87. Developer API access — `/settings/developers/api-access`

- **Merchant:** create and revoke scoped machine credentials and understand rate/usage boundaries.
- **Unauth:** expose fail-closed integration access without leaking secrets.
- **Core content:** key name/prefix/scopes, creation/last use, rate limit, revoked state, configured integrations.
- **Surface 88 — create/reveal/revoke key modals:** scope/rate selection, one-time secret reveal/copy, and irreversible revocation confirmation.
- **States:** loading, no keys, error.

### 89. Audit trail — `/settings/governance/audit-trail`

- **Merchant:** answer who did what, when, with which permission, to which object, and what metadata was retained.
- **Unauth:** expose append-only governance history and make later corrections visible as later events.
- **Overlay:** `audit-event-detail-drawer` with event ID, actor/role, permission, object, summary, metadata, and record link.
- **States:** loading, empty, error.
- **URL state:** `actor`, `action`, `range`, `search`, `page`.

### 90. Data privacy — `/settings/legal/data-privacy`

- **Merchant:** understand data flow/retention and deliberately run customer erasure or workspace deletion where authorized.
- **Unauth:** make privacy operations resumable, scoped, and auditable while retaining legally required history boundaries.
- **Overlays:** `data-erasure-and-account-deletion-modals` with exact subject/workspace, typed confirmation, scope, irreversibility, and job progress/retry.
- **States:** loading, error.

### 91. Agreements — `/settings/legal/agreements`

- **Merchant:** upload an agreement, inspect extracted recovery terms, correct/verify them, and approve only what the document supports.
- **Unauth:** turn contractual recovery conditions into reviewed policy without treating extraction as legal approval.
- **Core content:** agreement/counterparty/service/document/version/effective dates/status; PDF; extracted rule/claim/recovery/deadline/evidence/reason.
- **Overlays:** `agreement-upload-and-review-overlays`.
- **States:** loading, empty, error.
- **URL state:** `status`, `selected`.
- **Legal truth:** placeholder or unapproved legal facts must remain a visible non-operative gate.

### 92. Billing — `/settings/billing`

- **Merchant:** see plan, subscription state, credits/allowance/usage, top-up choices, billing period, and payment state; request plan or credit changes.
- **Unauth:** enforce the single commercial catalogue and distinguish a request from provider-confirmed activation.
- **Overlay:** `billing-plan-change-modal` with current/proposed plan, price/limits, timing, and provider boundary.
- **States:** loading, `billing-unavailable`, `billing-error`.
- **URL state:** `return`.

## 5.10 Notifications, search, help, and legal

### 93. Notifications inbox — `/notifications`

- **Merchant:** scan user-targeted operational events and jump to the exact record needing attention.
- **Unauth:** provide a bounded, permission-safe activity inbox rather than a second Work queue.
- **Core content:** kind/title/body/target/read/created; Today, Previous 7 days, Earlier; 14-day activity.
- **Surface 94 — empty states:** distinguish an empty inbox from an empty Unread filter.
- **Other states:** `notifications-loading`, `notifications-error`.
- **URL state:** `tab`, `page`.

### 95. Workspace search — `/search`

- **Merchant:** find a case, customer, order, ticket, or other permitted record across the workspace.
- **Unauth:** provide merchant-scoped, permission-filtered discovery with honest partial-source status.
- **Core content:** query/type/source/page; grouped entity results; navigation matches; restricted families; partial/unavailable source feedback.
- **States:** initial empty, no results, unavailable/partial/permission-bounded results, error.
- **URL state:** `q`, `type`, `source`, `page`.

### 96. Global command palette — authenticated shell overlay

- **Merchant:** jump to navigation or a permitted record without losing the current task.
- **Unauth:** make the dense product fast for expert users.
- **Behavior:** Cmd/Ctrl+K, focus trap, keyboard traversal, Escape, focus return, permission-filtered navigation and live entity results, loading/error/no-results, handoff to full Search.

### 97. Help index — `/help`

- **Merchant:** find operating guidance for cases, evidence, recovery, source health, rules, and administration.
- **Unauth:** explain product-specific truth and workflows in the same vocabulary as the product.
- **States:** search/no article match, empty registry if unavailable, error.
- **URL state:** `q`.

### 98. Help article — `/help/[articleSlug]`

- **Merchant:** read one task-focused guide and return to the relevant operating surface.
- **Unauth:** provide a governed article registry rather than arbitrary route copy.
- **States:** unknown slug → contextual not-found; article error.

### 99. Privacy policy — `/legal/privacy`

- **Merchant/prospect:** understand collected data, purposes, sharing, retention, rights, cookies, and contact.
- **Unauth:** state approved privacy facts without product-marketing inflation.

### 100. Data handling explainer — `/legal/data-handling`

- **Merchant/prospect:** understand tenant isolation and how source records become evidence and audit history.
- **Unauth:** explain the operational data chain plainly.

### 101. Data processing addendum — `/legal/dpa`

- **Merchant/prospect:** review processor obligations, parties, data types, rights, security, transfers, subprocessors, and contacts.
- **Unauth:** expose only approved legal facts; missing approval remains a gate.

### 102. Pilot terms — `/legal/pilot-terms`

- **Merchant/prospect:** understand pilot access, participation, responsibilities, limitations, and termination.
- **Unauth:** set a truthful controlled-pilot boundary.

All four legal routes share the legal-document family and remain light-only, readable, printable, keyboard accessible, and robust for long tables/sections. Their shared error state is `legal-document-error`.

## 5.11 Shared loading, not-found, and error surfaces

These are first-class UX. Claude must design and verify them, not treat them as framework leftovers.

### 103. Authenticated route loading shell

Preserves navigation/chrome and reserves generic page geometry during transitions. It must not display invented figures or look like an empty state.

### 104. Overview dashboard loading

Reserves range controls, metrics, chart, attention, and data-trust regions so the final dashboard does not jump.

### 105. Operational list/board loading skeleton

Shared by Work, rules, flows, flow runs, losses, recovery, connected sources, and source detail. Configure geometry to the destination without fabricating content.

### 106. Operational detail loading skeleton

Shared by case, customer, loss, recovery, rule, flow, and run details. Reserve identity header, current task/action, facts, and timeline/evidence regions.

### 107. Cases registry loading

Reserves case summary, filters, rows, and context-drawer geometry.

### 108. Customers registry loading

Reserves customer summary, controls, table, and preview geometry.

### 109. Evidence-package builder loading

Reserves customer/order selection and package composition regions.

### 110. Commerce-object loading

Shared order/refund/return/shipment detail skeleton with record facts, lifecycle/items, and connected-record rail.

### 111. Support-object loading

Shared ticket/dispute skeleton with identity, facts, lifecycle, connected records, and ticket conversation region where applicable.

### 112. Reports and records loading

Separate analytical report geometry from supporting-record table/pagination geometry.

### 113. Settings/form loading families

Preserve settings navigation and the correct form/list/table/upload/configuration layout for each destination.

### 114. Onboarding loading

Preserve responsive entry shell, step rail, and form layout.

### 115. Notifications loading

Reserve activity summary and grouped notification list.

### 116. Authenticated not-found

Explain a missing or inaccessible product route without implying workflow mutation; offer permitted links to Overview/Cases or the parent registry.

### 117. Root not-found

For unmatched public routes, offer Landing and Sign in in the light public shell.

### 118. Route error boundaries

Keep the owning shell and context, use route-specific failure copy, provide safe retry and parent navigation, and never show sensitive raw errors.

### 119. Root global error

Self-contained recovery when the root layout fails: safe message, retry, known destination, and optional non-sensitive digest. It cannot depend on the normal shell.

## 6. Route adapters and redirects that must not become duplicate pages

- `/` redirects to `/landing`.
- `/controls` redirects to `/controls/rules` while preserving rule query state.
- `/financials` redirects to `/financials/losses` while preserving financial scope and registry state.
- `/sources` redirects to `/sources/connected` while preserving source filters.
- `/customers/[id]/claims` validates `claimId`, opens the canonical case with a safe customer return, or falls back to the customer’s Cases tab. It must never become a second case UI.
- `/financials/reports/[reportId]` and `/sources/imports/[jobId]` are now dedicated implemented detail routes; do not treat older inventory notes calling them generic/stub routes as current.
- Legacy URLs for dashboard, inbox, claims, losses, recoveries, reports, integrations, settings, exceptions, catches, chargebacks, evidence, old customer/network tools, uploads, and old Help slugs redirect to canonical pages. Preserve compatibility until the route authority changes; do not add legacy items to navigation.

## 7. What is deliberately unavailable, partial, or external

- The signed-in operating product has no mobile triage UI below 1024px.
- There is no internal/admin frontend; `app/(internal)` is intentionally unbuilt.
- Planned providers may appear in the catalogue but are not connectable.
- Generic setup steps may truthfully remain explanatory when live mapping/scheduling/testing is unsupported.
- Network context is gated and must not masquerade as universally available cross-merchant intelligence.
- Unauth does not issue refunds, deny customer requests, or submit provider claims.
- UPS is read-only/on-demand within the selected scope.
- Stripe is not a merchant evidence connector.
- Scheduled report delivery and persisted schedule/owner mutations are unavailable without their backend.
- Email notification delivery is unavailable where indicated.
- Legal pages and pilot admission are not release-cleared without approved entity/controller/retention/subprocessor/effective-date facts and signed agreements.
- Synthetic Asterlane/Avery data is coherent demo/certification material, not evidence of a real merchant or live provider success.

## 8. Rebuild interaction and visual model

### Surface families

- **Overview/reports:** joined metric ledger + divided analysis + supporting rows; avoid a floating-card mosaic.
- **Work/cases/customers/notifications/search:** dense registry or inbox with stable selection and inspector.
- **Record details:** identity/current truth header, central evidence/activity, facts/actions rail.
- **Case review:** explicit evidence/recommendation/decision/action/financial lanes.
- **Reconciliation/evidence/rules/flows/imports:** split workbench with persistent context and a clear review boundary.
- **Recovery:** restrained stage board/list; status colour supports labels and never becomes the whole hierarchy.
- **Sources:** evidence-layer summary + searchable provider registry + capability/health/freshness detail.
- **Settings:** local navigation + readable form plane + current state/save impact + isolated danger zone.
- **Help/legal:** Read mode, optimized for comprehension and print rather than marketing.
- **Auth/onboarding:** minimal light entry task plane, fully responsive.

### Cognitive-load order

On every operating page, answer these in order:

1. Where am I and which workspace/scope am I in?
2. What is true now?
3. What needs my attention?
4. What evidence supports that?
5. What is unknown, stale, partial, or blocked?
6. What can I do next?
7. What will that action change or record?

Progressive disclosure may hide advanced detail initially, but it may not hide currency/scope/freshness, evidence gaps, authority, or audit consequence from a decision.

### Accessibility and interaction

- Full keyboard operation, visible focus, semantic labels, useful headings, and focus return.
- Drawers/modals use portal layering, focus trap, Escape, defined outside-click behavior, and pending-dismissal protection.
- Charts always expose a data-table alternative.
- Color is never the only carrier of state or financial meaning.
- Loading reserves final geometry; empty, unavailable, forbidden, stale, partial, and error states remain visually and semantically distinct.
- Reduced motion removes non-essential movement. Route content should not fly/fade in.
- Keep compact professional density; do not turn expert registries into oversized cards.

## 9. Absolute anti-goals for the rebuild

- Do not simplify away evidence provenance, responsibility, permission, currency, freshness, reconciliation state, or audit consequence.
- Do not turn Unauth into a generic fraud dashboard, CRM, helpdesk, or finance analytics product.
- Do not make recommendations look like decisions or prepared handoffs look completed.
- Do not render unavailable/unknown as `0`, `£0`, empty charts, or success-looking states.
- Do not sum mixed currencies.
- Do not let planned/provider-catalogue status imply connection or health.
- Do not add unsupported automatic refunds, denials, claims, communications, scheduled delivery, or provider writeback.
- Do not duplicate canonical pages for aliases/adapters.
- Do not remove URL-backed query state or safe return context.
- Do not expose actions or results outside the user’s role and merchant tenancy.
- Do not use generic AI imagery, fake merchant proof, fabricated metrics, fake avatars, or untraceable bento cards on public pages.
- Do not use decorative gradients, glow, glass, giant product cards, nested card mosaics, or marketing-scale headings inside the operating product.

## 10. Claude Code completion checklist

A rebuild is not complete because the main route renders. It must cover:

- all 65 concrete page modules in `surfaceManifest`;
- all 120 audited surfaces above;
- all 223 manifest scenario contracts, including route-specific errors and states not separately numbered in the human audit;
- every declared overlay opened safely without confirming destructive or external actions;
- permission filtering for navigation, search, settings, and actions;
- URL-backed query/selection state and exact safe return behavior;
- authenticated light and dark themes without leaking dark state into public/auth/onboarding/legal routes;
- desktop-required behavior below 1024px for the signed-in product;
- public/auth/onboarding behavior through 390px;
- loading, empty, unavailable, partial, stale, forbidden, error, not-found, and verified-zero distinctions;
- keyboard/focus, zoom, reduced-motion, long content, dense rows, overflow, and chart-data alternatives;
- no page errors and no unsupported provider, financial, legal, or release claims.

Use `npm run verify:surface-manifest` as the minimum static coverage check. Rendered browser evidence is still required: source inspection or one screenshot of a route does not prove its closed drawers, unopened modals, loading/error/not-found states, keyboard behavior, or alternate theme.

## 11. One-sentence design north star

**Unauth should feel like a calm, exact evidence console where a merchant can move from “what happened?” to “what should we do?” to “what did we actually recover and reconcile?” without ever losing provenance, authority, or context.**
