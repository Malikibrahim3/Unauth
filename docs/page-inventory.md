# Frontend page and surface inventory

<!-- active-renderer-inventory:start -->
## Current executable page ownership

Generated from `lib/surfaces/manifest.ts`; do not edit this block by hand. The verifier confirms that each named owner is reachable from the active page import graph and that the first-named owner is rendered, invoked, or directly re-exported by its page module. This ledger supersedes owner/component claims in archived audits and completion reports.

| Route | Page module | Active renderer | Maturity |
|---|---|---|---|
| `/landing` | `app/(public)/landing/page.tsx` | `NeutralLanding` | standardize |
| `/pricing` | `app/(public)/pricing/page.tsx` | `Challenge6Pricing` | standardize |
| `/demo` | `app/(public)/demo/page.tsx` | `Challenge6ProductDemo` | standardize |
| `/signup` | `app/(public)/signup/page.tsx` | `SignupForm` | standardize |
| `/login` | `app/(auth)/login/page.tsx` | `LoginForm` | standardize |
| `/reset` | `app/(auth)/reset/page.tsx` | `ResetForm` | standardize |
| `/reset/update` | `app/(auth)/reset/update/page.tsx` | `UpdatePasswordForm` | standardize |
| `/onboarding` | `app/onboarding/page.tsx` | `OnboardingClient` | standardize |
| `/overview` | `app/(app)/overview/page.tsx` | `DashboardOverview` | standardize |
| `/work` | `app/(app)/work/page.tsx` | `WorkQueueOperations` | standardize |
| `/cases` | `app/(app)/cases/page.tsx` | `ClaimsPage` | standardize |
| `/customers` | `app/(app)/customers/page.tsx` | `CustomersOverviewPageView` | standardize |
| `/financials/losses` | `app/(app)/financials/losses/page.tsx` | `LossesPage` | standardize |
| `/financials/recovery` | `app/(app)/financials/recovery/page.tsx` | `RecoveryPage` | standardize |
| `/financials/reconciliation` | `app/(app)/financials/reconciliation/page.tsx` | `ExceptionQueue` | refine |
| `/financials/reports` | `app/(app)/financials/reports/page.tsx` | `ReportsPage` | standardize |
| `/financials/reports/records` | `app/(app)/financials/reports/records/page.tsx` | `PageFrame` | standardize |
| `/controls/rules` | `app/(app)/controls/rules/page.tsx` | `RulesPage` | standardize |
| `/controls/rules/recovery` | `app/(app)/controls/rules/recovery/page.tsx` | `RecoveryRulebookClient` | standardize |
| `/controls/flows` | `app/(app)/controls/flows/page.tsx` | `FlowsPage` | standardize |
| `/controls/flows/runs` | `app/(app)/controls/flows/runs/page.tsx` | `FlowRunsPage` | standardize |
| `/sources/connected` | `app/(app)/sources/connected/page.tsx` | `SourceConnectionsPage` | standardize |
| `/sources/browse` | `app/(app)/sources/browse/page.tsx` | `SourceConnectionsPage` | standardize |
| `/sources/imports` | `app/(app)/sources/imports/page.tsx` | `ImportsPage` | standardize |
| `/notifications` | `app/(app)/notifications/page.tsx` | `NotificationCentre` | standardize |
| `/search` | `app/(app)/search/page.tsx` | `WorkspaceSearch` | build |
| `/cases/[caseId]` | `app/(app)/cases/[caseId]/page.tsx` | `CaseDetailRoute` | standardize |
| `/customers/[id]` | `app/(app)/customers/[id]/page.tsx` | `CustomerProfilePageView` | standardize |
| `/customers/[id]/evidence/new` | `app/(app)/customers/[id]/evidence/new/page.tsx` | `EvidenceNewPageContent` | standardize |
| `/orders/[id]` | `app/(app)/orders/[id]/page.tsx` | `connectedObjectPage` | standardize |
| `/refunds/[id]` | `app/(app)/refunds/[id]/page.tsx` | `connectedObjectPage` | standardize |
| `/returns/[id]` | `app/(app)/returns/[id]/page.tsx` | `connectedObjectPage` | standardize |
| `/shipments/[id]` | `app/(app)/shipments/[id]/page.tsx` | `connectedObjectPage` | standardize |
| `/tickets/[id]` | `app/(app)/tickets/[id]/page.tsx` | `connectedObjectPage` | standardize |
| `/disputes/[id]` | `app/(app)/disputes/[id]/page.tsx` | `connectedObjectPage` | standardize |
| `/financials/losses/[lossId]` | `app/(app)/financials/losses/[lossId]/page.tsx` | `LossDetailPage` | standardize |
| `/financials/recovery/[recoveryId]` | `app/(app)/financials/recovery/[recoveryId]/page.tsx` | `RecoveryDetailPage` | standardize |
| `/controls/rules/[ruleId]` | `app/(app)/controls/rules/[ruleId]/page.tsx` | `RuleDetailPage` | standardize |
| `/controls/flows/[flowId]` | `app/(app)/controls/flows/[flowId]/page.tsx` | `FlowDetailPage` | standardize |
| `/controls/flows/runs/[runId]` | `app/(app)/controls/flows/runs/[runId]/page.tsx` | `FlowRunDetailPage` | refine |
| `/sources/[sourceId]` | `app/(app)/sources/[sourceId]/page.tsx` | `SourceDetailPage` | standardize |
| `/sources/setup/[providerId]` | `app/(app)/sources/setup/[providerId]/page.tsx` | `SourceSetupWizard` | refine |
| `/sources/setup/shipbob/select` | `app/(app)/sources/setup/shipbob/select/page.tsx` | `ShipBobAccountSelectionClient` | standardize |
| `/settings/workspace/account` | `app/(app)/settings/workspace/account/page.tsx` | `AccountSettingsPage` | standardize |
| `/settings/workspace/team` | `app/(app)/settings/workspace/team/page.tsx` | `TeamSettingsPage` | standardize |
| `/settings/product/platform` | `app/(app)/settings/product/platform/page.tsx` | `PlatformSettingsPage` | standardize |
| `/settings/product/notifications` | `app/(app)/settings/product/notifications/page.tsx` | `NotificationsSettingsPage` | standardize |
| `/settings/developers/api-access` | `app/(app)/settings/developers/api-access/page.tsx` | `ApiAccessSettingsPage` | standardize |
| `/settings/governance/audit-trail` | `app/(app)/settings/governance/audit-trail/page.tsx` | `AuditTrailSettingsPage` | standardize |
| `/settings/legal/data-privacy` | `app/(app)/settings/legal/data-privacy/page.tsx` | `DataPrivacySettingsPage` | standardize |
| `/settings/legal/agreements` | `app/(app)/settings/legal/agreements/page.tsx` | `AgreementsSettingsPage` | standardize |
| `/settings/billing` | `app/(app)/settings/billing/page.tsx` | `BillingSettingsClient` | standardize |
| `/help` | `app/(app)/help/page.tsx` | `HelpCentre` | standardize |
| `/help/[articleSlug]` | `app/(app)/help/[articleSlug]/page.tsx` | `HelpArticlePage` | build |
| `/legal/data-handling` | `app/(public)/legal/data-handling/page.tsx` | `Challenge6Legal` | standardize |
| `/legal/dpa` | `app/(public)/legal/dpa/page.tsx` | `Challenge6Legal` | standardize |
| `/legal/pilot-terms` | `app/(public)/legal/pilot-terms/page.tsx` | `Challenge6Legal` | standardize |
| `/legal/privacy` | `app/(public)/legal/privacy/page.tsx` | `Challenge6Legal` | standardize |
| `/controls` | `app/(app)/controls/page.tsx` | `ControlsIndexPage` | adapter |
| `/financials` | `app/(app)/financials/page.tsx` | `FinancialsIndexPage` | adapter |
| `/sources` | `app/(app)/sources/page.tsx` | `SourcesIndexPage` | adapter |
| `/customers/[id]/claims` | `app/(app)/customers/[id]/claims/page.tsx` | `CustomerClaimReviewPage` | adapter |
| `/financials/reports/[reportId]` | `app/(app)/financials/reports/[reportId]/page.tsx` | `NamedReportDetail` | build |
| `/sources/imports/[jobId]` | `app/(app)/sources/imports/[jobId]/page.tsx` | `ImportJobDetail` | build |
<!-- active-renderer-inventory:end -->

Audited 6 August 2026 and P00-reconciled 12 August 2026 against the executable Next.js App Router code in `app/`, its route-owned components in `components/`, and the canonical navigation/redirect tables in `lib/navigation/appRoutes.ts` and `lib/navigation/aliases.js`.

## Scope and counting rules

- The repository contains **64 concrete `page.tsx` modules**. This document groups them by the product journey, then catalogs meaningful route-local overlays and state layouts.
- A redirect or compatibility alias is not counted as a UI surface. These are listed under **Routing references without a distinct surface**.
- Repeated empty, loading, error, and not-found implementations are inventoried once per meaningfully different layout rather than once per route import.
- “Real UI” means the surface renders product-specific data or an operable workflow. “Partial” means the route works but its content or visual model does not yet fulfill the route’s implied job. “Stub” means the route is only an adapter, redirect, or fallback copy.
- Density uses the requested categories. Marketing and help content are classified as slow-read detail views; setup and account screens as low-frequency form/config screens.

## 1. Acquisition, authentication, and onboarding

### [Marketing landing]

- Route/file path: `/landing` — `app/(public)/landing/page.tsx`; `/` redirects here from `next.config.js`.
- What it does: Explains Unauth’s merchant decision-ledger proposition and moves a prospective merchant toward signup or a product demo.
- Primary data shown: Product proof case reference, helpdesk ticket reference, Shopify order reference, requested action, recovery value, evidence-ready status, product capabilities, integration names, and operating-principle copy.
- Primary user action: Choose **Create workspace** or **View demo**.
- Density: Slow-read detail view.
- Current state: Real UI; a complete multi-section marketing page.

### [Pricing]

- Route/file path: `/pricing` — `app/(public)/pricing/page.tsx`.
- What it does: Presents plan and usage-credit choices before workspace creation.
- Primary data shown: Plan name, recurring price, included features, included credit allowance, top-up terms, and FAQ answers.
- Primary user action: Select a plan and create a workspace.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Interactive product demo]

- Route/file path: `/demo` — `app/(public)/demo/page.tsx`, `components/demo/OperationalCaseDemo.tsx`.
- What it does: Walks a prospect through intake, evidence, recommendation, merchant decision, and recovery using a synthetic case.
- Primary data shown: Case, customer and order references; case state and request; evidence source facts and timestamps; recommendation, rule, confidence and evidence gap; decision choices; recovery owner, handoff and deadline.
- Primary user action: Step through and simulate a merchant decision.
- Density: Slow-read detail view.
- Current state: Real UI using demonstration data.

### [Create account]

- Route/file path: `/signup` — `app/(public)/signup/page.tsx`.
- What it does: Creates the user account that owns or joins a workspace.
- Primary data shown: Email address, password, password confirmation, validation and submission status, plus validated plan/credit intent and a safe requested return route when supplied.
- Primary user action: Create an account.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Sign in]

- Route/file path: `/login` — `app/(auth)/login/page.tsx`.
- What it does: Authenticates an existing user and returns them to the requested product route.
- Primary data shown: Email address, password, authentication error, optional `next` destination, and validated plan/credit intent carried back to account creation.
- Primary user action: Sign in.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Request password reset]

- Route/file path: `/reset` — `app/(auth)/reset/page.tsx`.
- What it does: Sends a password-recovery link to an account email.
- Primary data shown: Email address, submission/error status, and the safe return path carried into the one-time recovery link when supplied.
- Primary user action: Request the reset link.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Password-reset sent state]

- Route/file path: In-page state of `/reset` — `app/(auth)/reset/page.tsx`.
- What it does: Replaces the reset form with confirmation that recovery instructions were sent.
- Primary data shown: Destination email context and “check your email” guidance.
- Primary user action: Open the email and follow the recovery link.
- Density: Low-frequency form/config screen.
- Current state: Real UI with a distinct confirmation layout.

### [Set new password]

- Route/file path: `/reset/update` — `app/(auth)/reset/update/page.tsx`.
- What it does: Changes the password after a valid recovery session.
- Primary data shown: New password, password confirmation, requirements, validation and update status, with the safe requested return route preserved through the sign-in handoff.
- Primary user action: Save the new password.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Workspace onboarding — store profile]

- Route/file path: Step state on `/onboarding` — `app/onboarding/page.tsx`, `components/OnboardingClient.tsx`.
- What it does: Captures the merchant context used to tailor the initial workspace.
- Primary data shown: Store/business name, commerce platform, monthly order volume, primary loss concern, WMS/3PL usage, returns-platform usage, current URL-backed step, validated plan/credit context, and the safe workspace handoff route.
- Primary user action: Complete the store profile.
- Density: Low-frequency form/config screen.
- Current state: Real UI; first of four route-local steps.

### [Workspace onboarding — Shopify connection]

- Route/file path: Step state on `/onboarding` — `components/OnboardingClient.tsx`.
- What it does: Connects the primary commerce source during initial setup.
- Primary data shown: Shopify shop domain, connection status, and connection guidance.
- Primary user action: Authorize Shopify.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Workspace onboarding — helpdesk connection]

- Route/file path: Step state on `/onboarding` — `components/OnboardingClient.tsx`.
- What it does: Adds the support source needed to connect customer requests with orders.
- Primary data shown: Gorgias, Zendesk and Freshdesk provider options, each provider’s connection status and setup route.
- Primary user action: Choose and connect a helpdesk.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Workspace onboarding — setup verified]

- Route/file path: Completion state on `/onboarding` — `components/OnboardingClient.tsx`.
- What it does: Confirms the minimum setup and hands the user into the product.
- Primary data shown: Completed profile, commerce connection and helpdesk connection checklist states.
- Primary user action: Enter the workspace.
- Density: Low-frequency form/config screen.
- Current state: Real UI with a distinct completion treatment.

## 2. Operational overview and work triage

### [Overview dashboard]

- Route/file path: `/overview` — `app/(app)/overview/page.tsx`, `components/dashboard/DashboardOverview.tsx`.
- What it does: Gives an operator a current financial position and a prioritized starting point for work.
- Primary data shown: Date range, comparison period and currency; exposure, recovered, prevented and realised-loss totals; case count; active, needs-action and ready counts; time-series values; attention category, count, SLA and exposure; source freshness, reconciliation confidence and data coverage.
- Primary user action: Scan the operating position and open the highest-priority work.
- Density: High-density scan/dashboard view.
- Current state: Real UI.

### [Overview data-trust details modal]

- Route/file path: Overlay on `/overview` — `components/dashboard/DashboardOverview.tsx`.
- What it does: Explains whether dashboard figures are safe to act on.
- Primary data shown: Source name, coverage state, current/stale record counts, last freshness, financial validation issues and reconciliation issues.
- Primary user action: Verify the trust boundary before acting on dashboard metrics.
- Density: Slow-read detail view.
- Current state: Real UI.

### [Overview unavailable and no-work states]

- Route/file path: In-page states on `/overview` — `components/dashboard/DashboardOverview.tsx`.
- What it does: Separately explains missing dated metric history, unavailable verified financial data, or a queue with no active work.
- Primary data shown: Selected metric label, period total where available, missing-history reason, source-connection action, or zero-work confirmation.
- Primary user action: Change the metric, inspect underlying records, connect sources, or continue with no intervention.
- Density: High-density scan/dashboard state.
- Current state: Real UI; product-specific states rather than zero-filled charts.

### [Work queue]

- Route/file path: `/work` — `app/(app)/work/page.tsx`, `components/work/WorkQueueOperations.tsx`.
- What it does: Presents one server-backed, stably paged projection of operator tasks and integration exceptions with exact counts and URL-owned query state.
- Primary data shown: Task/exception ID, title, description, exact related-object route, source, priority, lifecycle state/version, owner or waiting party, deadline, blocker, and selected-record inspector.
- Primary user action: Search, filter, sort, page, inspect, take ownership, start, snooze, complete, release, reopen, or follow the exact record handoff when valid.
- Density: High-density scan/list view.
- Current state: Real UI.

### [Integration-exception resolution drawer]

- Route/file path: Drawer on `/work?view=integration-exceptions` — `components/work/ExceptionResolutionDrawer.tsx`.
- What it does: Resolves or dismisses one source-matching exception without leaving Work.
- Primary data shown: Exception title, status, source, assignment, deadline, candidate match, linked case, resolution action and operator note.
- Primary user action: Accept/reject a match or dismiss the exception.
- Density: Slow-read detail view.
- Current state: Real UI.

### [Saved Work views]

- Route/file path: Inline controls on `/work` — `components/work/WorkQueueOperations.tsx` and `app/api/work/views/route.ts`.
- What it does: Loads, validates, saves, shares when permitted, and deletes complete server-query definitions; a read error makes saved views visibly unavailable instead of silently partial.
- Primary data shown: View name, ownership/sharing state, the complete URL-backed query definition, and availability/error feedback.
- Primary user action: Apply, save, share, delete, or retry loading a saved server view.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Work empty/search states]

- Route/file path: In-page states on `/work` — `components/work/WorkQueueOperations.tsx`.
- What it does: Distinguishes no search results, no open work, and no items matching a saved/filter view.
- Primary data shown: Search term or active-view context and a reset/clear action.
- Primary user action: Clear search/filters or accept that the queue is complete.
- Density: High-density scan/list state.
- Current state: Real UI with route-specific copy; visually uses the shared `EmptyState` treatment.

## 3. Case review and customer investigation

### [Cases registry]

- Route/file path: `/cases` — `app/(app)/cases/page.tsx`, `app/(app)/cases/ClaimsPage.tsx`, `app/(app)/cases/ClaimsPageView.tsx`.
- What it does: Provides the primary case queue and a quick path into review.
- Primary data shown: Case ID, customer name/ID, Shopify order ID/reference, source ticket reference, case type/reason/status, amount at risk and currency, attribution confidence, responsibility, recovery status/next action, case next action/reason, created and updated timestamps.
- Primary user action: Scan, filter and open a case.
- Density: High-density scan/list view.
- Current state: Real UI.

### [Case context drawer]

- Route/file path: Drawer on `/cases` and `/financials/recovery` — `components/cases/CaseContextDrawer.tsx`.
- What it does: Previews a case without replacing the registry or recovery board.
- Primary data shown: Case ID, status, exposure, next action and reason, related-record links, and timeline title/date/source/summary.
- Primary user action: Decide whether to open the full case.
- Density: Slow-read detail view.
- Current state: Real UI; shared across two journeys.

### [Cases empty/filter states]

- Route/file path: In-page states on `/cases` — `app/(app)/cases/ClaimsPageView.tsx`.
- What it does: Distinguishes an unpopulated case ledger from a filter with no matches.
- Primary data shown: Connection/manual-create guidance or the current filter/search context.
- Primary user action: Connect a source, create a case, or clear filters.
- Density: High-density scan/list state.
- Current state: Real UI.

### [Case review workbench]

- Route/file path: `/cases/[caseId]` — `app/(app)/cases/[caseId]/page.tsx`, `app/(app)/cases/CaseDetailRoute.tsx`, `components/claims/ClaimReviewPanel.tsx` and `components/claims/**`.
- What it does: Brings the canonical case evidence file, advisory recommendation, merchant decision, exact assisted provider handoff, external outcome, responsibility and recovery evidence together without conflating their authority.
- Primary data shown: Case status/type/reason; customer, order and ticket; amount at risk/currency; nine hard provider gates; item/parcel and custody evidence; investigation requests/responses/attachments; merchant decision history; manual handoff state; source or receipt-backed outcomes; provider position; financial stages; credit/reconciliation; comments and combined audit activity.
- Primary user action: Review the evidence, open or answer a focused investigation, record a merchant decision, follow the exact external handoff, or continue recovery work while preserving URL-backed tabs and the exact validated return target.
- Density: Slow-read detail view.
- Current state: Real UI; the most product-specific detail surface.

### [Record or reverse merchant decision modals]

- Route/file path: Modals on `/cases/[caseId]` — `components/claims/ClaimReviewManageCard.tsx`.
- What it does: Confirms a merchant decision or appends a reversal without mutating the original ledger entry; refund authorisation can prepare an exact manual provider handoff but never asserts provider success.
- Primary data shown: Decision, authorized value/currency, explicit external-action state, replacement decision and required reversal rationale.
- Primary user action: Commit the decision or reversal to the append-only ledger.
- Density: Low-frequency form/config screen.
- Current state: Real UI; two related confirmation layouts.

### [Investigation request modal]

- Route/file path: Modal on `/cases/[caseId]` — `components/claims/investigations/InvestigationRequestDialog.tsx`.
- What it does: Drafts or edits a factual request to a carrier, warehouse, supplier or other recovery partner.
- Primary data shown: Target type/name, partner, evidence gap, requested evidence, recommendation reason, override rationale, summary, subject, body, recipient, source channel and due date.
- Primary user action: Save an investigation draft.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Investigation response modal]

- Route/file path: Modal on `/cases/[caseId]` — `components/claims/investigations/InvestigationResponseDialog.tsx`.
- What it does: Records a partner’s factual response and attaches it to case evidence.
- Primary data shown: Response outcome, summary, full response, responder name, response timestamp and optional evidence attachment.
- Primary user action: Record the response.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Investigation lifecycle action modal]

- Route/file path: Modal on `/cases/[caseId]` — `components/claims/investigations/CaseInvestigationsCard.tsx`.
- What it does: Confirms sending, chasing, closing or cancelling an investigation with an auditable note.
- Primary data shown: Investigation target, current state, selected lifecycle action, action timestamp and operator note/rationale.
- Primary user action: Record the investigation state transition.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Responsibility assessment modal]

- Route/file path: Modal on `/cases/[caseId]` — `components/claims/payout/ResponsibilityAssessmentCard.tsx`.
- What it does: Confirms or corrects the merchant’s audited loss-responsibility assessment independently of the customer decision.
- Primary data shown: Loss attribution, attribution confidence, likely recovery owner, recoverability, supporting/conflicting evidence IDs and correction rationale.
- Primary user action: Confirm or correct responsibility.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Delivery-photo finding modal]

- Route/file path: Modal on `/cases/[caseId]` — `components/claims/investigations/DeliveryPhotoFinding.tsx`.
- What it does: Records a human interpretation of carrier photo evidence.
- Primary data shown: Delivery-photo finding, recorded timestamp and supporting rationale.
- Primary user action: Save the human finding.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Customers registry]

- Route/file path: `/customers` — `app/(app)/customers/page.tsx`, `app/(app)/customers/CustomersOverviewPageView.tsx`.
- What it does: Lets an operator find customers and scan their value and case history.
- Primary data shown: Customer name/email, order count, total spend and currency, average order value, total/open case counts, last-order date, and open-case/refund/chargeback filter flags.
- Primary user action: Find and open a customer.
- Density: High-density scan/list view.
- Current state: Real UI.

### [Customer preview drawer]

- Route/file path: Drawer on `/customers` — `components/customers/CustomerPreviewDrawer.tsx`.
- What it does: Gives a quick customer and risk summary before opening the full profile.
- Primary data shown: Name/email, orders and value by currency, case rate, open exposure, open cases, and linked commerce/support account references.
- Primary user action: Decide whether to open the profile or a case.
- Density: Slow-read detail view.
- Current state: Real UI with its own loading and unavailable substates.

### [Customers empty/filter states]

- Route/file path: In-page states on `/customers` — `app/(app)/customers/CustomersOverviewPageView.tsx`.
- What it does: Distinguishes no indexed customers from no search/filter matches.
- Primary data shown: Current search/filter context and source-connection guidance.
- Primary user action: Connect sources or reset search/filters.
- Density: High-density scan/list state.
- Current state: Real UI.

### [Customer profile]

- Route/file path: `/customers/[id]` — `app/(app)/customers/[id]/page.tsx`, `app/(app)/customers/[id]/CustomerProfilePageView.tsx`.
- What it does: Assembles a customer’s commercial, support, dispute and identity history for investigation.
- Primary data shown: Name, email, phone, shipping/billing addresses; order count and average; case count and rate; chargebacks, refund value and open exposure; order reference/date/value/items/shipment/refund/chargeback; helpdesk records; disputes; merchant notes; activity; linked identity accounts/confidence, observed identity changes, possible matches and network aggregate context.
- Primary user action: Investigate the customer and open a related case or evidence workflow.
- Density: Slow-read detail view.
- Current state: Real UI.

### [Customer profile access-blocked state]

- Route/file path: State of `/customers/[id]` — `app/(app)/customers/[id]/CustomerProfilePageView.tsx`.
- What it does: Explains an access-denied or expired-link result without exposing customer data.
- Primary data shown: Block reason and safe navigation options.
- Primary user action: Return to Customers or re-enter through an authorized route.
- Density: Slow-read detail view.
- Current state: Real UI with a distinct blocked layout.

### [Build evidence package]

- Route/file path: `/customers/[id]/evidence/new` — `app/(app)/customers/[id]/evidence/new/page.tsx`.
- What it does: Builds a case-ready evidence package from one customer’s disputed order and prior signals.
- Primary data shown: Order ID/date/value/currency, refund or dispute claim, prior-signal match, inclusion item and availability state, merchant note, order-history loading state and package eligibility.
- Primary user action: Select an order and build the evidence package.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Evidence-package no-orders/no-cases states]

- Route/file path: In-page states on `/customers/[id]/evidence/new` — route component above.
- What it does: Explains why no package can yet be built when orders or qualifying cases are absent.
- Primary data shown: Customer reference, order-history availability and qualifying-case state.
- Primary user action: Return to the customer/cases or wait for source data.
- Density: Low-frequency form/config state.
- Current state: Real UI.

## 4. Connected commerce and support records

### [Order detail]

- Route/file path: `/orders/[id]` — `app/(app)/orders/[id]/page.tsx`, `components/relationships/ConnectedObjectDetail.tsx`.
- What it does: Traces a canonical order back to its provider record and connected objects.
- Primary data shown: Placed date, total, subtotal, discounts, financial status, fulfilment status, line items, payment gateway, cancellation timestamp/reason, customer, source, freshness, lifecycle and connected records.
- Primary user action: Verify order facts and drill into a connected case, refund, return or shipment.
- Density: Slow-read detail view.
- Current state: Real UI; uses the generic commerce-object template.

### [Refund detail]

- Route/file path: `/refunds/[id]` — `app/(app)/refunds/[id]/page.tsx`, `components/relationships/ConnectedObjectDetail.tsx`.
- What it does: Shows the source-backed financial and lifecycle facts for a refund.
- Primary data shown: Refund amount/currency, full/partial scope, reason, refunded timestamp, ingested timestamp, customer, source, freshness and connected records.
- Primary user action: Verify the refund and follow its linked order or case.
- Density: Slow-read detail view.
- Current state: Real UI; no refund-specific visual treatment beyond field configuration.

### [Return detail]

- Route/file path: `/returns/[id]` — `app/(app)/returns/[id]/page.tsx`, `components/relationships/ConnectedObjectDetail.tsx`.
- What it does: Shows the return lifecycle and its resulting refund or replacement.
- Primary data shown: Canonical/source status, disposition, requested/received/inspected timestamps, refund reference, replacement reference, customer, source, freshness and connected records.
- Primary user action: Trace return progression and open its linked records.
- Density: Slow-read detail view.
- Current state: Real UI; no return-specific visual treatment beyond field configuration.

### [Shipment detail]

- Route/file path: `/shipments/[id]` — `app/(app)/shipments/[id]/page.tsx`, `components/relationships/ConnectedObjectDetail.tsx`.
- What it does: Shows fulfilment and delivery evidence for a shipment.
- Primary data shown: Carrier, service, tracking number, canonical/source status, shipped/delivered timestamps, customer, source, freshness, lifecycle and connected records.
- Primary user action: Verify delivery progression and open its order or case.
- Density: Slow-read detail view.
- Current state: Real UI; no shipment-specific visual treatment beyond field configuration.

### [Support ticket detail]

- Route/file path: `/tickets/[id]` — `app/(app)/tickets/[id]/page.tsx`, `components/relationships/ConnectedObjectDetail.tsx`.
- What it does: Reconstructs a helpdesk conversation and its linked commerce/case context.
- Primary data shown: Subject, status, channel, message count, customer replies, reopen count, satisfaction, opened/closed timestamps; message actor, body, timestamp and visibility; customer, source, freshness and connected records.
- Primary user action: Read the conversation and open the related case or order.
- Density: Slow-read detail view.
- Current state: Real UI; uses the generic support-object template.

### [Dispute detail]

- Route/file path: `/disputes/[id]` — `app/(app)/disputes/[id]/page.tsx`, `components/relationships/ConnectedObjectDetail.tsx`.
- What it does: Shows the financial dispute lifecycle and its linked evidence.
- Primary data shown: Dispute type/status/reason, amount/currency, initiated/finalized/ingested timestamps, lifecycle events, customer, source, freshness and connected records.
- Primary user action: Verify the dispute and open its linked case/order.
- Density: Slow-read detail view.
- Current state: Real UI; uses the same support-object template as tickets.

### [Connected-record not found]

- Route/file path: `/tickets/[id]`, `/disputes/[id]`, `/financials/losses/[lossId]` not-found variants — route-local `not-found.tsx` files.
- What it does: Reports that a requested canonical record is missing or inaccessible while preserving authenticated product navigation.
- Primary data shown: Record type, missing identifier context and safe return routes.
- Primary user action: Return to the parent registry.
- Density: Slow-read detail state.
- Current state: Real UI; the three routes use close variants of the authenticated not-found treatment.

## 5. Loss recognition and recovery

### [Loss ledger]

- Route/file path: `/financials/losses` — `app/(app)/financials/losses/page.tsx`, `components/losses/LossLedger.tsx`.
- What it does: Makes confirmed, estimated, recoverable, prevented and written-off loss records scannable and auditable.
- Primary data shown: Net unrecovered, recoverable and confirmed-loss totals; record count; effective-date trend; ranked loss cause; category, attribution, source, owner/counterparty, status, confirmed/estimated loss, recoverable value, updated timestamp and freshness.
- Primary user action: Scan unrecovered loss and open the record that needs investigation.
- Density: High-density scan/list view.
- Current state: Real UI.

### [Loss chart/ledger unavailable states]

- Route/file path: In-page states on `/financials/losses` — `components/losses/LossVisuals.tsx`, `components/losses/LossLedger.tsx`.
- What it does: Distinguishes no records, no filter matches, mixed currencies, no dated history, insufficient trend history and an unreconciled loss formula.
- Primary data shown: Excluded mixed-currency record count, selected currency, dated-entry count, reconciliation gap and current filter context.
- Primary user action: Choose a currency/view, clear filters, or inspect the ledger instead of relying on a chart.
- Density: High-density scan/list state.
- Current state: Real UI with explicit unknown/unavailable states.

### [Loss detail]

- Route/file path: `/financials/losses/[lossId]` — `app/(app)/financials/losses/[lossId]/page.tsx`.
- What it does: Explains one loss’s value, cause, evidence and recoverability.
- Primary data shown: Category, counterparty, status, owner, source and freshness; gross exposure, refunds/offsets, confirmed/estimated loss, recovered and net loss; primary/alternative attribution with confidence/rationale; evidence requirements; linked case/recovery; correspondence, tasks, activity and append-only financial entries.
- Primary user action: Decide how the loss should be recovered or written off.
- Density: Slow-read detail view.
- Current state: Real UI.

### [Write off outstanding recovery modal]

- Route/file path: Modal on `/financials/losses/[lossId]` — `components/losses/LossActions.tsx`.
- What it does: Creates an immutable write-off entry and closes a loss as unrecoverable.
- Primary data shown: Outstanding value/currency, loss reference, required write-off reason and permanence warning.
- Primary user action: Confirm the write-off.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Recovery board]

- Route/file path: `/financials/recovery` — `app/(app)/financials/recovery/page.tsx`, `app/(app)/financials/recovery/RecoveryBoardClient.tsx`.
- What it does: Moves recovery cases through evidence, submission, correspondence and outcome stages.
- Primary data shown: Estimated recovery, open/missing-data/needs-correspondence/recovered counts; recovery ID, partner, owner, recovery type/status, case reference, sought/recovered/outstanding values, last source event, missing evidence, deadline and next action.
- Primary user action: Progress the next recovery case or record an external outcome.
- Density: High-density scan/list board.
- Current state: Real UI.

### [Confirm recovery action modal]

- Route/file path: Modal on `/financials/recovery` — `app/(app)/financials/recovery/RecoveryBoardClient.tsx`.
- What it does: Records a recovery transition such as ready, submitted, chased, approved, partial, rejected, appealed, paid or closed.
- Primary data shown: Recovery case, selected transition, amount pursued, amount already recovered, approved or cumulative received amount/currency when relevant, and required reason/source-reference note.
- Primary user action: Confirm the external recovery event.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Recovery board empty state]

- Route/file path: In-page state on `/financials/recovery` — `app/(app)/financials/recovery/RecoveryBoardClient.tsx`.
- What it does: Explains that recovery records appear only after a source-backed loss has a viable recovery route.
- Primary data shown: Zero-case state and source/case-review next steps.
- Primary user action: Connect sources or review a case.
- Density: High-density scan/list state.
- Current state: Real UI.

### [Recovery detail]

- Route/file path: `/financials/recovery/[recoveryId]` — `app/(app)/financials/recovery/[recoveryId]/page.tsx`.
- What it does: Provides the evidence pack, correspondence, tasks and money progression for one external recovery.
- Primary data shown: Partner, owner, recovery type/status, deadline, next chase and updated time; sought, approved, recovered, outstanding and written-off values; required/missing evidence; correspondence direction/channel/provider reference/subject/date/source URL; task status/priority/owner/due/blocker; status event, note and timestamp.
- Primary user action: Complete the pack and record partner progress or outcome.
- Density: Slow-read detail view.
- Current state: Real UI.

## 6. Reconciliation and reporting

### [Reconciliation exception workspace]

- Route/file path: `/financials/reconciliation` — `app/(app)/financials/reconciliation/page.tsx`, `components/exceptions/ExceptionQueue.tsx`.
- What it does: Resolves source-to-ledger mismatches without silently inferring a financial result.
- Primary data shown: Ledger scope, confirmed-entry count, open-exception count, source coverage and decision boundary; exception ID/type/confidence/status/title/detail/assignee; candidate ID/label/value/confidence; note and linked case.
- Primary user action: Resolve or dismiss each reconciliation exception.
- Density: High-density scan/list view.
- Current state: Real but partial UI; it is a stacked generic exception-card queue rather than a mature source-versus-ledger reconciliation workbench.

### [Reconciliation loading/empty states]

- Route/file path: In-page states on `/financials/reconciliation` — `components/exceptions/ExceptionQueue.tsx`.
- What it does: Reports pending exception data or confirms that no exceptions remain.
- Primary data shown: Loading text or zero-exception message.
- Primary user action: Wait or return to financial review.
- Density: High-density scan/list state.
- Current state: Real behavior but no distinct visual treatment; plain bordered/text states.

### [Financial reports]

- Route/file path: `/financials/reports` — `app/(app)/financials/reports/page.tsx`.
- What it does: Summarizes the financial ledger and operational outcomes for a selected reporting scope.
- Primary data shown: Date range, timezone and currency; requested, exposure, approved, paid, estimated/confirmed loss, recoverable, recovered, prevented, written-off, outstanding and final-net-loss stages; reconciliation issue count; case count; cumulative exposure/recovery; loss cause, recovery stage and open-operation breakdowns; metric definitions.
- Primary user action: Analyze the period, export it, or drill into supporting records.
- Density: Slow-read detail/analytical view.
- Current state: Real UI.

### [Report supporting records]

- Route/file path: `/financials/reports/records` — `app/(app)/financials/reports/records/page.tsx`.
- What it does: Shows the immutable rows behind a selected report metric.
- Primary data shown: Report metric, range, currency and timezone; record reference/link, record type, state, amount/currency and updated timestamp; pagination and export state.
- Primary user action: Audit or export the underlying rows.
- Density: High-density scan/table view.
- Current state: Real UI, but uses the shared generic registry/table treatment.

### [Named report record view]

- Route/file path: `/financials/reports/[reportId]` — `app/(app)/financials/reports/[reportId]/page.tsx`.
- What it does: Applies `reportId` as a filter to the supporting-records route.
- Primary data shown: The same record reference, type, state, amount/currency and updated fields as `/financials/reports/records`, scoped by `reportId`.
- Primary user action: Audit the rows associated with the named report.
- Density: High-density scan/table view.
- Current state: Real route adapter, but **no distinct report-detail visual treatment**; it directly renders the records page.

## 7. Rules, recovery policy, and flows

### [Payout rules registry]

- Route/file path: `/controls/rules` — `app/(app)/controls/rules/page.tsx`, `components/rules/RulesIndexClient.tsx`.
- What it does: Lists versioned advisory payout rules and opens their builder/workbench.
- Primary data shown: Rule name, description, priority, draft/published status, current version and updated timestamp.
- Primary user action: Open a rule or create a new draft.
- Density: High-density scan/list view.
- Current state: Real UI.

### [Rule builder drawer]

- Route/file path: Drawer on `/controls/rules` and `/controls/rules/[ruleId]` — `components/rules/RuleBuilderDrawer.tsx`.
- What it does: Creates or edits an unpublished advisory rule.
- Primary data shown: Name, description, condition group/operator, signal field/operator/value, recommended action and priority.
- Primary user action: Save the rule draft.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Rules empty state]

- Route/file path: In-page state on `/controls/rules` — `components/rules/RulesIndexClient.tsx`.
- What it does: Explains how to create, simulate and publish the first rule.
- Primary data shown: Zero-rule state and rule lifecycle guidance.
- Primary user action: Create a payout rule.
- Density: High-density scan/list state.
- Current state: Real UI using the shared empty-state component.

### [Rule version workbench]

- Route/file path: `/controls/rules/[ruleId]` — `app/(app)/controls/rules/[ruleId]/page.tsx`, `components/rules/RuleVersionWorkbench.tsx`.
- What it does: Compares, tests, publishes and rolls back versioned rule logic.
- Primary data shown: Rule name/description/status/priority/version; condition fields/operators/values; recommendation; draft-versus-published diff and version history.
- Primary user action: Validate and publish a rule version.
- Density: Slow-read detail view.
- Current state: Real UI.

### [Rule simulation and publication modals]

- Route/file path: Modals on `/controls/rules/[ruleId]` — `components/rules/RuleVersionWorkbench.tsx`.
- What it does: Tests a rule against sample signals and previews/commits an atomic publication.
- Primary data shown: Sample signal fields/values, match result and recommended action; draft version, current version, diff, validation status and publication warning.
- Primary user action: Run a simulation or publish the validated version.
- Density: Low-frequency form/config screen.
- Current state: Real UI; two distinct modal states in one workbench.

### [Recovery rulebook]

- Route/file path: `/controls/rules/recovery` — `app/(app)/controls/rules/recovery/page.tsx`, `components/rules/RecoveryRulebookClient.tsx`.
- What it does: Defines which partner owns a recovery, what can be claimed and which evidence/deadline applies.
- Primary data shown: Recovery rule name, partner, recovery type, case/claim type, required evidence, claimable costs, deadline, confidence and active state; partner name/type/contact email/URL/channel/SLA/instructions; investigation defaults.
- Primary user action: Configure partner and recovery-routing policy.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Partner and recovery-rule modals]

- Route/file path: Modals on `/controls/rules/recovery` — `components/rules/RecoveryRulebookClient.tsx`.
- What it does: Adds/edits a recovery partner or creates a rule that targets one.
- Primary data shown: Partner identity/type/contact/channel/deadline defaults; rule claim type, recovery type, required evidence, claimable costs, deadline and confidence.
- Primary user action: Save the partner or recovery rule.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Flows registry]

- Route/file path: `/controls/flows` — `app/(app)/controls/flows/page.tsx`, `components/rules/FlowsIndexClient.tsx`.
- What it does: Lists bounded operational automations and their publication state.
- Primary data shown: Flow name, description, trigger event type, action count, active/published/paused/draft status and version.
- Primary user action: Open a flow, inspect runs, or create a draft.
- Density: High-density scan/list view.
- Current state: Real UI.

### [New flow draft modal]

- Route/file path: Modal on `/controls/flows` — `components/rules/FlowsIndexClient.tsx`.
- What it does: Creates the initial trigger, conditions and bounded actions for a flow.
- Primary data shown: Flow name/description, trigger, condition sequence, action type/configuration and validation summary.
- Primary user action: Save the flow draft.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Flows empty state]

- Route/file path: In-page state on `/controls/flows` — `components/rules/FlowsIndexClient.tsx`.
- What it does: Explains the draft-test-publish lifecycle before any flow exists.
- Primary data shown: Zero-flow state and safe-automation guidance.
- Primary user action: Create a flow.
- Density: High-density scan/list state.
- Current state: Real UI using the shared empty-state component.

### [Flow version workbench]

- Route/file path: `/controls/flows/[flowId]` — `app/(app)/controls/flows/[flowId]/page.tsx`, `components/rules/FlowVersionWorkbench.tsx`.
- What it does: Edits, tests, publishes, pauses, resumes and rolls back a versioned flow.
- Primary data shown: Flow name/description/status/version; trigger event; conditions; action sequence/configuration; draft diff and version history.
- Primary user action: Validate and publish the flow version.
- Density: Slow-read detail view.
- Current state: Real UI.

### [Flow edit, test and publication modals]

- Route/file path: Modals on `/controls/flows/[flowId]` — `components/rules/FlowVersionWorkbench.tsx`.
- What it does: Edits a draft, tests it with an event payload and previews/commits publication.
- Primary data shown: Trigger/conditions/actions, sample event values, step results, version diff, validation state and publication availability.
- Primary user action: Save, test or publish the flow.
- Density: Low-frequency form/config screen.
- Current state: Real UI; three distinct modal modes.

### [Flow runs registry]

- Route/file path: `/controls/flows/runs` — `app/(app)/controls/flows/runs/page.tsx`.
- What it does: Lists flow executions, optionally filtered to one flow.
- Primary data shown: Run ID, flow ID/filter, status/outcome, error, started time and completed time.
- Primary user action: Find and inspect a failed or relevant run.
- Density: High-density scan/table view.
- Current state: Real UI, but **no distinct visual treatment** beyond the shared generic `DataTable`.

### [Flow run detail]

- Route/file path: `/controls/flows/runs/[runId]` — `app/(app)/controls/flows/runs/[runId]/page.tsx`.
- What it does: Explains the trigger and step-by-step result of one automation execution.
- Primary data shown: Run ID/status, domain event, started/completed times and run error; step index, output type, status, result JSON, error and completion time.
- Primary user action: Diagnose the run result or failure.
- Density: Slow-read detail view.
- Current state: Real UI, presented in generic panels rather than a specialized execution trace.

## 8. Sources, imports, and integrations

### [Connected sources]

- Route/file path: `/sources/connected` — `app/(app)/sources/connected/page.tsx`, `app/(app)/sources/SourceConnectionsPage.tsx`.
- What it does: Shows source coverage and the health of every configured provider.
- Primary data shown: Commerce/support/fulfilment/delivery/financial coverage layers; connected count, covered-layer count, indexed-record count and attention count; provider, account, status, data covered, record count and last-data timestamp.
- Primary user action: Monitor, sync, repair or open a connection.
- Density: High-density scan/list view.
- Current state: Real UI.

### [Source catalogue]

- Route/file path: `/sources/browse` — `app/(app)/sources/browse/page.tsx`, `app/(app)/sources/SourceConnectionsPage.tsx` in browse mode.
- What it does: Lets an operator choose a provider to connect.
- Primary data shown: Provider name, category, description, capability stage (`live`, `beta`, `partial`, `planned`), auth mode and runtime availability.
- Primary user action: Choose a source and enter setup.
- Density: High-density scan/card view.
- Current state: Real UI; planned providers are explicitly labeled rather than presented as operational.

### [Source detail]

- Route/file path: `/sources/[sourceId]` — `app/(app)/sources/[sourceId]/page.tsx`.
- What it does: Explains one provider’s capabilities, connection health, sync/import history and ingestion failures.
- Primary data shown: Provider/account/status, auth and delivery model, scopes, last health/sync/data timestamps; capability description/support; import-run status/row/error/timestamps; failed-ingestion event ID/type/error/time.
- Primary user action: Connect, sync, repair or diagnose the provider.
- Density: Slow-read detail view.
- Current state: Real UI; planned-provider variants are capability-only and disable unavailable connection actions.

### [Connection and disconnection modals]

- Route/file path: Overlays on source detail/setup surfaces — `components/integrations/ConnectionActions.tsx`.
- What it does: Collects a provider’s connection boundary or confirms disconnection while retaining canonical history.
- Primary data shown: Provider name; ShipBob environment/account choice or credential fields; verification error; disconnect impact and confirmation.
- Primary user action: Connect/verify credentials or disconnect the source.
- Density: Low-frequency form/config screen.
- Current state: Real UI; modal content branches by connection method.

### [Connect Shopify modal]

- Route/file path: Native dialog within Shopify setup — `components/shopify/SyncStatusConnectModal.tsx`, reached from `/sources/setup/shopify`.
- What it does: Normalizes a Shopify Admin URL before sending the merchant to Shopify authorization.
- Primary data shown: Shopify Admin URL, normalized-domain validation, public-domain/invalid-input errors and authorization guidance.
- Primary user action: Enter the store’s Admin URL and continue to Shopify.
- Density: Low-frequency form/config screen.
- Current state: Real UI; it is a bespoke native `<dialog>` rather than the shared `Modal` component.

### [CSV imports]

- Route/file path: `/sources/imports` — `app/(app)/sources/imports/page.tsx`, `app/(app)/sources/imports/ImportsPage.tsx`.
- What it does: Validates, maps and commits merchant-supplied CSV records into canonical datasets.
- Primary data shown: Dataset type (orders/refunds/customers), import name, file name/size, source columns, canonical field mapping, validation row/error counts, commit state and recent import history.
- Primary user action: Map and commit a validated import.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Import validation/empty states]

- Route/file path: In-page states on `/sources/imports` — `app/(app)/sources/imports/ImportsPage.tsx`.
- What it does: Shows no-file, validating, mapping-error, invalid-row and ready-to-commit states.
- Primary data shown: Selected file, detected columns, required mappings, valid/invalid row counts and per-row validation errors.
- Primary user action: Choose a file, correct mappings/errors, or commit.
- Density: Low-frequency form/config state.
- Current state: Real UI.

### [Import job route]

- Route/file path: `/sources/imports/[jobId]` — `app/(app)/sources/imports/[jobId]/page.tsx`.
- What it does: Currently re-exports the general CSV imports screen.
- Primary data shown: The same dataset, file, mapping, validation and recent-history data as `/sources/imports`; `jobId` is not rendered or used.
- Primary user action: There is no job-specific action; the user sees the general import workflow.
- Density: Low-frequency form/config screen.
- Current state: **Stub/route gap**; a job-detail route is referenced but no distinct job status, row-error, progress or retry surface is built.

### [Provider-specific connector setup]

- Route/file path: `/sources/setup/[providerId]` for `chrome`, `shopify`, `gorgias`, `zendesk`, and `freshdesk` — `app/(app)/sources/setup/[providerId]/page.tsx`, `components/sources/setup/*SetupPage.tsx`, `components/settings/ConnectorSetupShell.tsx`.
- What it does: Runs provider-specific prepare, connect and verify workflows.
- Primary data shown: Provider requirements/stage; Chrome API-key availability and extension download/install status; Shopify shop domain/scopes/sync counts/last sync; Gorgias, Zendesk and Freshdesk domain/account email/API token or key/webhook and sync state.
- Primary user action: Supply provider-specific access details and verify the connection.
- Density: Low-frequency form/config screen.
- Current state: Real UI; five provider-specific layout/content variants share a setup shell.

### [Generic seven-step source setup]

- Route/file path: `/sources/setup/[providerId]` for all other catalogue providers — `components/sources/SourceSetupWizard.tsx`.
- What it does: Walks through provider, permissions, field mapping, history, schedule, review and activation boundaries.
- Primary data shown: Provider description/status, capability/mapping descriptions and support states, permissions guidance, history/schedule status, review copy and connection action.
- Primary user action: Review the connection contract and activate the provider.
- Density: Low-frequency form/config screen.
- Current state: **Partial UI**; the seven-step shell is real, but mapping, historical scope, schedule and test/review are explanatory rather than editable or testable.

### [ShipBob channel selection]

- Route/file path: `/sources/setup/shipbob/select` — `app/(app)/sources/setup/shipbob/select/page.tsx`.
- What it does: Chooses one discovered ShipBob channel/account before authorization is finalized.
- Primary data shown: Selection ID, account/channel ID and name, environment, expiry, loading/error/no-account state and save state.
- Primary user action: Select and connect one ShipBob channel.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

## 9. Workspace, product, governance, and billing configuration

### [Account and appearance]

- Route/file path: `/settings/workspace/account` — `app/(app)/settings/workspace/account/page.tsx` and `components/settings/Account*`, `AppearanceSettings.tsx`.
- What it does: Maintains the owner’s profile, workspace context, appearance and password.
- Primary data shown: Account email, store/business name, monthly volume, primary loss concern, selected theme, new password and confirmation; destructive account-delete confirmation.
- Primary user action: Update account/workspace preferences or credentials.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Team management]

- Route/file path: `/settings/workspace/team` — `app/(app)/settings/workspace/team/page.tsx`, `components/settings/TeamManagementClient.tsx`.
- What it does: Manages workspace membership, roles, invitations and ownership.
- Primary data shown: Active/pending member counts, recent access changes; member email, role, status, invite state and access metadata; search/filter and audit events.
- Primary user action: Grant, change or remove workspace access.
- Density: High-density scan/list plus low-frequency configuration.
- Current state: Real UI.

### [Invite member and transfer ownership modals]

- Route/file path: Modals on `/settings/workspace/team` — `components/settings/TeamInviteDialog.tsx`, `components/settings/TeamManagementClient.tsx`.
- What it does: Invites a user with a role or confirms the high-impact ownership transfer.
- Primary data shown: Invite email/role; target owner, ownership/billing/access impact and typed/explicit confirmation.
- Primary user action: Send the invitation or transfer ownership.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Platform defaults]

- Route/file path: `/settings/product/platform` — `app/(app)/settings/product/platform/page.tsx`, `components/settings/PlatformSettingsClient.tsx`.
- What it does: Sets reporting, retention, decision, financial and connector defaults for the workspace.
- Primary data shown: Reporting currency, timezone, raw-retention days, default report range, matching policy, cost basis, default deadline hours, approval limit, escalation/high-value thresholds, repeat-case lookback, sync frequency, connector writeback and webhook-alert booleans.
- Primary user action: Save workspace operating defaults.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Notification preferences]

- Route/file path: `/settings/product/notifications` — `app/(app)/settings/product/notifications/page.tsx`.
- What it does: Controls which product events create in-app notifications.
- Primary data shown: In-app toggles for assignments, mentions, deadlines, evidence, decision requests, recovery outcomes, connection health, high-value cases, daily summaries and scheduled reports; email-channel availability.
- Primary user action: Toggle notification categories.
- Density: Low-frequency form/config screen.
- Current state: Real UI; email delivery is visibly unavailable/disabled rather than implemented.

### [Developer API access]

- Route/file path: `/settings/developers/api-access` — `app/(app)/settings/developers/api-access/page.tsx`, `components/settings/ApiIntegrationsAdvancedSection.tsx`.
- What it does: Manages machine credentials and advanced integration access.
- Primary data shown: API-key name/prefix, creation time, last-used time, rate limit and revoked state; configured helpdesk/integration status.
- Primary user action: Create or revoke an API key.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Create/reveal and revoke API key modals]

- Route/file path: Modals on `/settings/developers/api-access` — `components/settings/ApiKeyCreateDialog.tsx`, `components/settings/ApiKeyRevokeDialog.tsx`.
- What it does: Creates a scoped key, reveals its secret once, or immediately revokes an existing key.
- Primary data shown: Key name, rate limit/scopes, one-time secret and prefix; revoke target and irreversible-impact warning.
- Primary user action: Copy the new credential or confirm revocation.
- Density: Low-frequency form/config screen.
- Current state: Real UI with a distinct post-create secret state.

### [Audit trail]

- Route/file path: `/settings/governance/audit-trail` — `app/(app)/settings/governance/audit-trail/page.tsx`, `components/settings/AuditTrailClient.tsx`.
- What it does: Exposes append-only workspace actions for governance review and export.
- Primary data shown: Timestamp, action, resource/object type and ID, actor email/role or system actor, summary and metadata/details.
- Primary user action: Search/filter and audit an action.
- Density: High-density scan/table view.
- Current state: Real UI, but **no distinct visual treatment** beyond the shared generic table/registry.

### [Data privacy]

- Route/file path: `/settings/legal/data-privacy` — `app/(app)/settings/legal/data-privacy/page.tsx`.
- What it does: Explains data flow/retention and performs workspace or customer erasure workflows.
- Primary data shown: Source-to-normalization-to-case-to-audit flow, retention/removal scope, workspace deletion scope, customer canonical ID, typed `ERASE`/delete confirmation, and legal/audit links.
- Primary user action: Review privacy handling or execute a deliberate erasure.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Agreements]

- Route/file path: `/settings/legal/agreements` — `app/(app)/settings/legal/agreements/page.tsx`.
- What it does: Stores agreement documents and verifies extracted recovery terms before approval.
- Primary data shown: Agreement type, counterparty, service, document name/status, effective dates and version; uploaded PDF; extracted rule name, claim type, recovery effect/status/route, deadline, evidence requirements and reason.
- Primary user action: Upload an agreement and approve its verified term.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

### [Billing]

- Route/file path: `/settings/billing` — `app/(app)/settings/billing/page.tsx`.
- What it does: Manages plan, usage credits, top-ups and Stripe payment state.
- Primary data shown: Plan ID/name/status, billing-period end, downgrade/cancel state, credits used/remaining/limit, top-up amount/options, alternative plans and payment-method status.
- Primary user action: Change the plan, buy credits or update payment.
- Density: Low-frequency form/config screen.
- Current state: Real UI.

## 10. Notifications, search, help, legal, and system surfaces

### [Notifications inbox]

- Route/file path: `/notifications` — `app/(app)/notifications/page.tsx`.
- What it does: Collects user-targeted product events and links each event back to its operating surface.
- Primary data shown: Notification ID/kind, title, body, target URL, read timestamp and created timestamp; Today/Previous 7 days/Earlier grouping; 14-day read/unread activity counts.
- Primary user action: Scan and open the next unread notification.
- Density: High-density scan/list view.
- Current state: Real UI.

### [Notifications empty states]

- Route/file path: In-page states on `/notifications` — route component above.
- What it does: Distinguishes an empty inbox from an empty Unread filter.
- Primary data shown: All/unread tab context and zero-notification guidance.
- Primary user action: Switch tabs or accept that the inbox is caught up.
- Density: High-density scan/list state.
- Current state: Real UI using shared empty-state styling.

### [Search route]

- Route/file path: `/search` — `app/(app)/search/page.tsx`.
- What it does: Searches permission-filtered, merchant-scoped workspace entities while keeping canonical navigation destinations in a separate group.
- Primary data shown: Query, record type, source family, page, grouped entity results, navigation matches, restricted families and partial-source status.
- Primary user action: Open a canonical workspace record, move through bounded result pages or jump to a product surface.
- Density: High-density scan/list view.
- Current state: Real UI with URL-backed query/type/source/page state and explicit empty, unavailable, partial and permission states.

### [Global command palette]

- Route/file path: App-header overlay on authenticated routes — `components/layout/CommandPalette.tsx` and `components/layout/CommandPaletteSurface.tsx`.
- What it does: Searches navigation and live workspace entities from anywhere in the app.
- Primary data shown: Query; navigation destination; customer/case/order and other unified result type, title, subtitle and href; loading/error/no-result state and keyboard selection.
- Primary user action: Search and jump directly to a route or record.
- Density: High-density scan/list overlay.
- Current state: Real permission-filtered quick-search subset for customers, orders, cases and tickets, with separate navigation grouping and a full-search handoff to the broader entity search.

### [Help index]

- Route/file path: `/help` — `app/(app)/help/page.tsx`.
- What it does: Provides operating guides for case review, rules, recovery and source connection.
- Primary data shown: Guide title, summary, steps, linked product action and support email.
- Primary user action: Choose a guide or contact support.
- Density: Slow-read detail view.
- Current state: Real UI.

### [Help article]

- Route/file path: `/help/[articleSlug]` — `app/(app)/help/[articleSlug]/page.tsx`.
- What it does: Renders a focused operating article with links back to Search and Help.
- Primary data shown: Article title, summary, section heading/body and related navigation; authored articles currently cover `reviewing-cases`, `data-health` and `setting-up-a-source`.
- Primary user action: Read guidance and return to the relevant operating surface.
- Density: Slow-read detail view.
- Current state: Real for three authored slugs; every unknown slug resolves to the shared contextual not-found state.

### [Privacy policy]

- Route/file path: `/legal/privacy` — `app/(public)/legal/privacy/page.tsx`, shared `LegalDocument` layout.
- What it does: States what data the service collects, uses, shares and retains.
- Primary data shown: Data categories, purposes, sharing, retention, rights, cookies and contact information.
- Primary user action: Review the privacy policy.
- Density: Slow-read detail view.
- Current state: Real content; no page-specific visual treatment beyond the shared legal-document template.

### [Data handling explainer]

- Route/file path: `/legal/data-handling` — `app/(public)/legal/data-handling/page.tsx`, shared `LegalDocument` layout.
- What it does: Explains merchant data isolation and how source records become case evidence.
- Primary data shown: Merchant silo, source ingestion, canonical customer/case records, evidence review and audit-history handling.
- Primary user action: Review data handling.
- Density: Slow-read detail view.
- Current state: Real content; shared legal-document treatment.

### [Data processing addendum]

- Route/file path: `/legal/dpa` — `app/(public)/legal/dpa/page.tsx`, shared `LegalDocument` layout.
- What it does: Documents processor obligations for merchant personal data.
- Primary data shown: Parties, duration, purpose, data types, obligations, subprocessors, data-subject rights, security, transfers and contact details.
- Primary user action: Review the DPA.
- Density: Slow-read detail view.
- Current state: Real content; shared legal-document treatment.

### [Pilot terms]

- Route/file path: `/legal/pilot-terms` — `app/(public)/legal/pilot-terms/page.tsx`, shared `LegalDocument` layout.
- What it does: Defines access and participation terms for the product pilot.
- Primary data shown: Pilot access, participation, product/network use, responsibilities and termination terms.
- Primary user action: Review the pilot terms.
- Density: Slow-read detail view.
- Current state: Real content; shared legal-document treatment.

### [Authenticated route loading shell]

- Route/file path: Fallback for authenticated route transitions — `app/(app)/loading.tsx`, `components/navigation/skeletons/pageSkeletons.tsx`.
- What it does: Preserves app chrome while an otherwise unspecified page is loading.
- Primary data shown: Skeleton page title, summary blocks and content rows rather than product data.
- Primary user action: Wait for route data.
- Density: High-density scan/list state.
- Current state: Real shared loading UI.

### [Overview dashboard loading]

- Route/file path: `/overview` loading — `app/(app)/overview/loading.tsx`, `DashboardLoadingSkeleton` in `components/navigation/skeletons/pageSkeletons.tsx`.
- What it does: Reserves the dashboard’s filters, financial headline, chart and attention/data-trust regions.
- Primary data shown: Skeleton range controls, metric cards, time-series plot and priority/trust rows.
- Primary user action: Wait for the operating summary.
- Density: High-density scan/dashboard state.
- Current state: Real custom loading UI.

### [Operational list/board loading skeleton]

- Route/file path: Used by Work, rules, flows, flow runs, losses, recovery, connected sources and source detail — their `loading.tsx` files via `OperationalRouteSkeleton`.
- What it does: Reserves KPI/filter/table, board or visual-analysis geometry during route loading.
- Primary data shown: Skeleton title, KPI count, filters, visual bands and row/column placeholders.
- Primary user action: Wait while preserving a stable mental model of the destination.
- Density: High-density scan/list state.
- Current state: Real shared loading UI; configured per route but not independently designed per page.

### [Operational detail loading skeleton]

- Route/file path: Used by case, customer, loss, recovery, rule, flow and run details — route `loading.tsx` files via `OperationalRouteSkeleton` detail variants.
- What it does: Reserves header, action rail, summary and multi-section detail geometry.
- Primary data shown: Skeleton identity/header, metadata, action controls and content sections.
- Primary user action: Wait for the record.
- Density: Slow-read detail state.
- Current state: Real shared loading UI.

### [Cases registry loading]

- Route/file path: `/cases` loading — `app/(app)/cases/loading.tsx`.
- What it does: Reproduces case KPI, queue/table and selected-case drawer geometry while data loads.
- Primary data shown: Skeleton metric cards, filters, case rows and docked context panel.
- Primary user action: Wait for the registry.
- Density: High-density scan/list state.
- Current state: Real custom loading UI.

### [Customers registry loading]

- Route/file path: `/customers` loading — `app/(app)/customers/loading.tsx`, `CustomersLoadingSkeleton`.
- What it does: Reproduces customer summary, controls and table geometry.
- Primary data shown: Skeleton customer metrics, filters and rows.
- Primary user action: Wait for customer data.
- Density: High-density scan/list state.
- Current state: Real custom loading UI.

### [Evidence-package builder loading]

- Route/file path: `/customers/[id]/evidence/new` loading — `app/(app)/customers/[id]/evidence/new/loading.tsx`.
- What it does: Reserves the evidence-workspace heading, order controls and package body.
- Primary data shown: Skeleton title/description, two selection controls and evidence-package content block.
- Primary user action: Wait for customer/order evidence.
- Density: Low-frequency form/config state.
- Current state: Real custom loading UI.

### [Commerce-object loading]

- Route/file path: Order, refund, return and shipment `loading.tsx` files via `CommerceObjectRouteSkeleton`.
- What it does: Reserves the shared commerce-record detail template.
- Primary data shown: Skeleton record header, fact groups, item/lifecycle region and connected-record rail.
- Primary user action: Wait for the object.
- Density: Slow-read detail state.
- Current state: Real shared loading UI.

### [Support-object loading]

- Route/file path: Ticket and dispute `loading.tsx` files via `SupportObjectRouteSkeleton`.
- What it does: Reserves the support/dispute header, facts, lifecycle and optional conversation geometry.
- Primary data shown: Skeleton object facts, connected records and conversation rows for tickets.
- Primary user action: Wait for the object.
- Density: Slow-read detail state.
- Current state: Real shared loading UI.

### [Reports and records loading]

- Route/file path: `/financials/reports` and `/financials/reports/records` loading files via `ReportsLoadingSkeleton` and `ReportRecordsLoadingSkeleton`.
- What it does: Separately reserves analytical report charts/summary rails and the supporting-records table.
- Primary data shown: Skeleton metric stages/charts or filter/table/pagination rows.
- Primary user action: Wait for report data.
- Density: Slow-read analytical state for reports; high-density scan/table state for records.
- Current state: Real route-specific loading UI.

### [Settings/form loading families]

- Route/file path: Settings, billing, API access, audit, agreements, privacy, preferences and ShipBob setup `loading.tsx` files via `FormPageLoadingSkeleton`, `SettingsListLoadingSkeleton`, `TablePageLoadingSkeleton`, `ConfigurationTaskLoadingSkeleton` and `UploadLoadingSkeleton`.
- What it does: Preserves the settings sidebar plus form, list, table, task or upload geometry.
- Primary data shown: Skeleton settings navigation, section headings, labels/controls, rows or upload/mapping steps.
- Primary user action: Wait for configuration data.
- Density: Low-frequency form/config state, except table variants which are high-density.
- Current state: Real shared loading UI.

### [Onboarding loading]

- Route/file path: `/onboarding` loading — `app/onboarding/loading.tsx`.
- What it does: Reserves the public/auth shell, step rail and two-column setup form before onboarding loads.
- Primary data shown: Skeleton title, step list, form labels and six controls.
- Primary user action: Wait for workspace setup.
- Density: Low-frequency form/config state.
- Current state: Real custom loading UI.

### [Notifications loading]

- Route/file path: `/notifications` loading — `app/(app)/notifications/loading.tsx`.
- What it does: Reserves the activity chart and grouped notification list.
- Primary data shown: Skeleton activity band and eight notification rows.
- Primary user action: Wait for the inbox.
- Density: High-density scan/list state.
- Current state: Real custom loading UI.

### [Authenticated not-found]

- Route/file path: `app/(app)/not-found.tsx`.
- What it does: Handles a missing/inaccessible authenticated route without implying that workflow state changed.
- Primary data shown: Missing-page explanation and links to Overview and Cases.
- Primary user action: Return to a known operating surface.
- Density: Slow-read detail state.
- Current state: Real UI.

### [Root not-found]

- Route/file path: `app/not-found.tsx`.
- What it does: Handles a missing public or unmatched route outside the authenticated layout.
- Primary data shown: Missing-route explanation and canonical links to Landing and sign in.
- Primary user action: Choose a valid entry point.
- Density: Slow-read detail state.
- Current state: Real UI.

### [Route error boundaries]

- Route/file path: Route-local `error.tsx` files across operational, object, source, settings and onboarding routes, backed by shared error-state components.
- What it does: Keeps product chrome and offers retry/navigation after a route data or mutation-render failure.
- Primary data shown: Route-specific failure title/message, safe retry action and sometimes a parent-route link.
- Primary user action: Retry or return to the parent surface.
- Density: Slow-read detail state.
- Current state: Real UI; most routes reuse shared error composition rather than distinct visual layouts.

### [Root global error]

- Route/file path: `app/global-error.tsx`.
- What it does: Renders a self-contained recovery screen when even the root layout fails.
- Primary data shown: Safe failure message, retry action, Overview link and optional non-sensitive error digest/reference.
- Primary user action: Retry loading the app.
- Density: Slow-read detail state.
- Current state: Real standalone UI with no dependency on the normal layout.

## Routing references without a distinct surface

### Intentional route adapters and redirects

- `/` → `/landing`.
- `/controls` → `/controls/rules` (`app/(app)/controls/page.tsx`) while preserving rule filters, sorting and selected-record query state.
- `/financials` → `/financials/losses` (`app/(app)/financials/page.tsx`) while preserving range, currency, source and registry query state.
- `/sources` → `/sources/connected` (`app/(app)/sources/page.tsx`) while preserving source filters.
- `/customers/[id]/claims` validates a query-selected `claimId`, opens the canonical case with a safe return to the customer’s Cases section, or falls back to `/customers/[id]?tab=cases`; it has no own layout.
- `/financials/reports/[reportId]` renders the governed named-report detail, scope, run metadata and linked supporting records.
- `/sources/imports/[jobId]` loads the merchant-scoped immutable import job, mapping snapshot, validation errors and outcome.
- Legacy public URLs in `lib/navigation/aliases.js`—including `/dashboard`, `/inbox`, `/claims/**`, `/losses/**`, `/recoveries/**`, `/reports/**`, `/integrations/**`, legacy settings paths, `/exceptions`, `/catches/**`, `/chargebacks/**`, `/evidence*`, legacy customer/network routes and legacy help slugs—redirect to canonical surfaces and intentionally have no UI of their own.

### Referenced or implied, but not built as a complete distinct surface

- **Internal/admin frontend:** `app/(internal)/layout.tsx` exists as a pass-through route group, but there are no internal/admin `page.tsx` files beneath it. The internal support-ingest API is not paired with an internal frontend.
- **Planned connectors:** Catalogue entries marked `planned` have capability/detail representation, but their connection action is intentionally unavailable; they are not finished setup flows.
- **Persisted report administration:** Named-report analytical detail is built, but persisted owner, schedule and delivery mutations remain unavailable until a saved-report backend exists.

## Surfaces with no distinct visual treatment

- Order, refund, return and shipment details all use `ConnectedObjectDetail` with field configuration; their information differs, but their visual treatment does not.
- Ticket and dispute details use the same support-object template; tickets only add conversation emphasis.
- Flow runs, report supporting records and the governance audit trail use the shared registry/`DataTable` pattern with little route-specific visual language.
- Reconciliation uses generic stacked cards plus plain loading/empty boxes; it lacks a purpose-built source-versus-ledger comparison treatment.
- All four public legal pages use one `LegalDocument` template.
- Most settings pages use `SettingsPageShell` plus joined `SectionCard` groups. This is deliberate reuse, but the pages have little surface-specific visual differentiation.
- Route errors and many empty states reuse shared `AuthenticatedPanel`, `EmptyState`, `WorkbenchEmptyState` and loading skeletons; the copy is contextual but the treatment is generic.

## Shared components requiring one design pass

### App structure and navigation

- `AuthenticatedDesignShell`, `AuthenticatedSidebar`, `WorkspaceSwitcher`, `CommandPalette`, `PageFrame`, `DetailPageShell`, `WorkbenchPage`, `SettingsNav`, `SettingsPageShell`, `AuthenticatedPanel`.

### Surface and layout primitives

- `Surface`, `Panel`, `Card`, `SectionCard`, `JoinedSection`, `InsetGroup`, `RegistrySurface`, `RailSection`, `Divider`.

### Tables, lists, and record actions

- `DataTable`, `DataTableServer`, `Pagination`, `PageSizeSelect`, `RowActionsMenu`, registry filter/header patterns.

### Status, provenance, and metadata

- `Badge`, `StatusBadge`, `StatusWithReason`, `MetadataChip`, `SourceBadge`, `FreshnessIndicator`, `FeatureTierBadge`, `OwnerAvatar`/assignee treatments.

### Financial summaries and values

- `LeadSummary`, `MetricGroup`, `MetricCard`, `MetricValueCell`, `FinancialEquation`, `LedgerBridge`, `SummaryRail`, currency/minor-unit formatters and explicit unavailable-value treatment.

### Charts and analytical states

- `ChartFrame`, `ChartState`, `ChartDataTableDisclosure`, `RankedContributionChart`, `CumulativeAreaLineChart`, `StageDotPlot`.

### Forms and controls

- `Button`, `ButtonLink`, `IconButton`, `Input`, `Textarea`, `Select`, `FormField`, `Checkbox`, `Tabs`, `SegmentedControl`, `FilterChip`, `Disclosure`, `Tooltip`, `Toast`.

### Overlays

- `Modal`, `Drawer`, overlay portal/focus management, confirmation action rows and command-palette surface.

### Empty, loading, error, and unavailable states

- `EmptyState`, `WorkbenchEmptyState`, `LoadingSkeleton`, `Bone`, `OperationalRouteSkeleton`, `AuthenticatedRouteLoadingSkeleton`, form/table/settings/upload/configuration skeleton families, and shared authenticated error-state composition.

### Case and evidence patterns

- `EvidenceChecklist`, evidence rows/threads, recommendation block, decision header/recorded outcome, investigation cards/dialogs, related-records panel, `CaseContextDrawer`.

### Rule and flow builders

- `BuilderShell`, `BuilderSequence`, `BuilderStep`, `BuilderValidationSummary`, `ConditionBlock`, version diff/history panels and `RuleBuilderDrawer`.

### Source and connector patterns

- `ProviderLogo`, connection prompt/gate, `ConnectionActions`, `ConnectorSetupShell`, source capability matrix, import mapping/validation rows.

## Coverage conclusion

The frontend has a real merchant-facing operating product across overview, Work, case/customer investigation, loss/recovery, rules/flows, sources and settings. The clearest unfinished surface contracts are import-job detail, full-page entity search, generic connector setup’s middle steps, arbitrary help articles and dedicated saved-report detail. There is currently no internal/admin frontend to inventory beyond an empty route group.
