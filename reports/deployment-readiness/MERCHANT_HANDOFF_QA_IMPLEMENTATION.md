# Merchant Handoff QA Implementation Plan

Generated: 2026-06-03  
Companion checklist: `reports/deployment-readiness/MERCHANT_HANDOFF_QA_CHECKLIST.md`  
Scope: How to execute, automate, evidence, and sign off every merchant handoff check before merchants use the app.

## Objective

Build a repeatable release process that proves the app is safe for merchant hands.

The checklist says what must pass. This implementation plan says how the team should run it, what should be automated, what needs manual review, what evidence to collect, and which gaps should be closed before broader rollout.

## Release Roles

Assign these names before running the release candidate.

| Role | Responsibility | Required For Go |
| --- | --- | --- |
| Release captain | Owns run order, evidence folder, final checklist state, and go/no-go meeting | `P0` |
| Automation owner | Runs commands, fixes broken automated gates, stores logs | `P0` |
| Security/privacy owner | Reviews service-role, RLS, webhooks, PII, logs, legal/data handling | `P0` |
| Product QA owner | Reviews merchant flows, copy, claims, evidence PDFs, UX states | `P0` |
| Integrations owner | Tests Shopify, WooCommerce, BigCommerce, helpdesk, widget, extension | `P0` if exposed |
| Billing owner | Tests Stripe lifecycle, entitlements, usage, context credits, billing emails | `P0` if paid plans exposed |
| Support/ops owner | Confirms runbooks, known limitations, escalation path, first merchant monitoring | `P0` |

## Evidence System

Create one evidence folder per release candidate.

Recommended folder:

```text
reports/deployment-readiness/merchant-handoff-evidence/YYYY-MM-DD-<short_sha>/
```

Store:

- `00-release-metadata.md`: commit SHA, branch, staging URL, production URL, owner names, test start/end timestamps.
- `01-command-output/`: terminal logs from every automated command.
- `02-screenshots/`: screenshots from manual flows and Playwright artifacts.
- `03-provider-events/`: Stripe event IDs, Shopify webhook IDs, helpdesk webhook payload IDs, Supabase job IDs.
- `04-security-review/`: service-role triage, RLS proof, dependency audit exception if any.
- `05-copy-and-legal-review/`: screenshots or notes for marketing, legal, evidence PDF, help pages.
- `06-go-no-go.md`: final decision, exceptions, rollback owner, launch scope.

Use this evidence rule: every checked item needs a pointer to a file, provider event, database record, or named human reviewer.

## Execution Order

Run checks in this order so the release fails fast on expensive blockers.

1. Freeze and identify the release candidate.
2. Run dependency, build, unit, compliance, security, CSV, identity, and critical browser gates.
3. Run database, RLS, migration, service-role, and storage checks.
4. Run merchant workflow walkthroughs.
5. Run integration, billing, API, widget, and extension checks for anything merchants can see.
6. Run privacy, legal, observability, support, rollback, and final signoff.

Do not start merchant walkthroughs until the automated `P0` gates pass or have written exceptions.

## Phase 0: Release Candidate Freeze

Implementation steps:

1. Pick the target commit and stop non-critical changes.
2. Create the evidence folder.
3. Record branch, SHA, URLs, env names, and known exceptions.
4. Run `git status --short` and confirm only expected files are changed.
5. Confirm no secrets or local test credentials are committed.

Commands:

```bash
git status --short
git rev-parse HEAD
git diff --stat <last_safe_sha>..HEAD
```

Evidence:

- Save command output to `01-command-output/release-candidate.txt`.
- Save a list of known exceptions in `06-go-no-go.md`.

Exit criteria:

- Exact SHA is recorded.
- No unknown local changes.
- No unapproved secrets, screenshots with PII, traces, or credentials are staged.

## Phase 1: Automated Gate Harness

Run the automated gates from a clean install. If possible, run them in CI and once locally against staging.

Required command order:

```bash
npm ci
npm audit --audit-level=moderate
npm run build
npm test -- --runInBand
npm run test:critical
npm run test:compliance
npm run audit:deployment
npm run audit:security
npm run test:merchant-readiness
npm run audit:csv
npm run audit:identity
```

Recommended extended command order:

```bash
npm run test:e2e
npm run audit:ux
npm run docs:check
npm run build:extension
npm run smoke:support-intake
npm run post:gorgias-webhook-fixture
npm run test:support-walkthrough
npm run doctor
```

Implementation notes:

- Save each command output to its own file under `01-command-output/`.
- For commands that generate reports, copy the report path into `00-release-metadata.md`.
- If a command fails and is fixed, re-run the full affected gate, not only the failed test.
- If a command is skipped, record why, owner, impact, and expiry.

Exit criteria:

- All `P0` automated commands pass or have signed exceptions.
- No new compliance failure, no new security static finding, no new broken critical/mobile path.

## Phase 2: Environment And Deployment Implementation

Implement these checks as a small environment audit script plus a manual provider dashboard review.

### Env Audit Script

Create or run a script that validates:

- Required variables exist in staging and production.
- Public variables are safe to expose.
- Secret variables are not prefixed with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_APP_URL` matches the deployed URL.
- `IDENTITY_SALT` exists, is long enough, and is stable for the environment.
- Provider variables are either configured or the feature is hidden.

Recommended future script:

```text
scripts/deployment-readiness/audit-env.ts
```

Evidence:

- Save env audit output with values redacted.
- Attach screenshots or export notes from Vercel/Supabase/Stripe/provider settings.

### Cron Coverage Check

The app has multiple cron routes. `vercel.json` currently schedules only `/api/cron/purge-expired-audits`.

Implementation steps:

1. List every route under `app/api/cron`.
2. List scheduled Vercel crons.
3. Confirm unscheduled jobs are intentionally run elsewhere or add schedules.
4. Verify every cron route rejects unauthenticated public requests.

Recommended future script:

```text
scripts/deployment-readiness/audit-crons.ts
```

Exit criteria:

- No accidental public cron.
- No required background job left unscheduled.
- Rollback target is recorded and can be redeployed quickly.

## Phase 3: Database, Migrations, RLS, And Storage

This phase needs a staging Supabase project that can be reset and a production-like staging project with existing data.

Implementation steps:

1. Apply migrations to a fresh database.
2. Apply migrations to a seeded production-like database.
3. Confirm no migration order conflict between numbered and timestamped migrations.
4. Run RLS coverage checks for all tenant tables.
5. Run merchant isolation API tests and manual IDOR checks.
6. Verify storage bucket policies, MIME limits, and file size limits.
7. Test account/customer deletion and soft-delete paths.

Existing coverage to run:

```bash
npm test -- tests/api/merchantIsolation.test.ts --runInBand
npm test -- tests/api/scopedClient.test.ts --runInBand
npm test -- tests/security/customerApiMerchantIsolation.test.ts --runInBand
npm test -- tests/security/evidenceIsolation.test.ts --runInBand
npm test -- tests/compliance/softDelete.test.ts --runInBand
```

Recommended future scripts:

```text
scripts/deployment-readiness/audit-rls.ts
scripts/deployment-readiness/replay-migrations-fresh.ts
scripts/deployment-readiness/replay-migrations-seeded.ts
scripts/deployment-readiness/audit-storage-policies.ts
```

Evidence:

- Migration logs.
- RLS table report.
- Two-merchant isolation screenshots or API logs.
- Storage policy screenshot/export.

Exit criteria:

- Every tenant data table has RLS or a documented reason.
- Merchant A cannot read or mutate Merchant B data through UI, API, exports, PDFs, widgets, or URLs.

## Phase 4: Auth, Onboarding, Team, And Permissions

Implement this as Playwright coverage plus one manual staging pass.

Required personas:

- Owner/admin merchant.
- Analyst merchant user.
- Viewer/read-only user.
- Billing or restricted user if supported.
- Logged-out user.

Flows:

1. New signup and onboarding.
2. Existing login.
3. Password reset.
4. Expired/malformed callback links.
5. Duplicate onboarding retry, refresh, and back-button behavior.
6. Route access for each role.
7. Mutation access for each role.
8. Team invite, permission update, removal, audit trail.
9. Account deletion.

Existing coverage to run:

```bash
npm test -- tests/unit/onboardingGate.test.ts --runInBand
npm test -- tests/lib/appRoutes.test.ts --runInBand
npm test -- tests/security/middlewareGate.spec.ts --runInBand
npm run test:critical
```

Recommended future Playwright specs:

```text
tests/auth/onboarding-permissions.spec.ts
tests/auth/password-reset.spec.ts
tests/team/team-permissions.spec.ts
```

Evidence:

- Persona matrix with pass/fail.
- Screenshots of denied states.
- Audit trail entries for team/account changes.

Exit criteria:

- Read-only users can view only what they should.
- No role can mutate outside its permission set.
- Logged-out and wrong-merchant access fails safely.

## Phase 5: Navigation, Shell, Public Site, And Legal

Implement this as a route matrix plus manual copy/legal review.

Navigation checks:

- Sidebar routes land on intended pages.
- Aliases redirect correctly, especially `/inbox -> /claims`.
- Loading, error, empty, and partial-setup states render.
- Command palette routes are valid.
- Slow navigation shows immediate pending feedback.

Existing coverage:

```bash
npm test -- tests/lib/appRoutes.test.ts --runInBand
npm run test:critical
npm run test:e2e
```

Public/legal checks:

- Landing CTAs.
- Signup and demo routes.
- Public audit upload retention and isolation.
- Privacy, DPA, pilot terms, data-handling pages.
- No prohibited claims about accuracy, compliance, CE 3.0, win rates, or network coverage.

Existing coverage:

```bash
npm run test:compliance
npm test -- tests/banned-terms.test.ts --runInBand
```

Recommended future coverage:

```text
tests/navigation/app-route-matrix.spec.ts
tests/public/public-site-links.spec.ts
tests/public/legal-copy-review.spec.ts
```

Evidence:

- Route matrix output.
- Screenshots of public pages.
- Product/legal signoff notes.

Exit criteria:

- Merchants do not hit stale pages, wrong redirects, or unsupported claims.

## Phase 6: CSV Upload And Audit Processing

Implement as a fixture-driven test harness plus a manual upload walkthrough.

Datasets:

- `tests/fixtures/generated/small_sanity.csv`
- `tests/fixtures/generated/medium_realistic.csv`
- `tests/fixtures/generated/large_merchant_scale.csv`
- `tests/fixtures/generated/negative_control.csv`
- `tests/fixtures/generated/adversarial_fraud.csv`
- `test-data/audit/*`
- One sanitized real merchant export per supported platform when available.

Existing coverage:

```bash
npm run test:merchant-readiness
npm run audit:csv
npm test -- tests/csv --runInBand
npm test -- tests/processing --runInBand
npm run test:critical
```

Manual walkthrough:

1. Download template.
2. Upload valid CSV.
3. Upload missing-column CSV.
4. Upload malformed/binary/script CSV.
5. Map columns and save merchant mapping.
6. Interrupt browser during processing and recover.
7. Export results.
8. Confirm audit detail pages and summaries.

Recommended future coverage:

```text
tests/audit/upload-recovery.spec.ts
tests/audit/large-csv-processing.spec.ts
tests/audit/csv-export-contract.spec.ts
scripts/deployment-readiness/run-real-export-smoke.ts
```

Evidence:

- Job IDs.
- Upload screenshots.
- Processing logs.
- Export file with row count and contract fields checked.

Exit criteria:

- Supported CSVs complete.
- Unsafe files fail safely.
- Exports are complete, paginated correctly, and formula-safe.

## Phase 7: Scoring, Identity, And Cross-Merchant Privacy

Implement with deterministic fixtures, threshold review, and multi-merchant isolation tests.

Existing coverage:

```bash
npm run audit:identity
npm test -- tests/engine --runInBand
npm test -- tests/identity --runInBand
npm test -- tests/linker --runInBand
npm test -- tests/api/lookup-kanon.test.ts --runInBand
npm test -- tests/lib/merchantLookupPrivacy.test.ts --runInBand
```

Manual review:

1. Review clean and negative-control false-positive rates.
2. Review adversarial and known-pattern recall.
3. Confirm current thresholds match product expectations.
4. Confirm identity explanations are consistent in app, exports, help pages, and PDFs.
5. Run a two or three merchant k-anon scenario and verify no sub-threshold leakage.

Recommended future coverage:

```text
scripts/deployment-readiness/identity-quality-gate.ts
tests/privacy/cross-merchant-k-anon-ui.spec.ts
tests/identity/threshold-contract.test.ts
```

Evidence:

- Benchmark JSON.
- Threshold signoff.
- Screenshots of no-match, sub-threshold, weak, probable, and definite states.

Exit criteria:

- False positives are inside agreed pilot threshold.
- Cross-merchant signals never expose prohibited details.

## Phase 8: Customers, Claims, Chargebacks, And Evidence

Implement as UI regression tests plus manual analyst workflow.

Existing coverage:

```bash
npm test -- tests/customers --runInBand
npm test -- tests/claims --runInBand
npm test -- tests/components/claimReviewDraft.test.ts --runInBand
npm test -- tests/lib/claimsStatusMachine.test.ts --runInBand
npm test -- tests/lib/claimsQueueCounts.test.ts --runInBand
npm test -- tests/evidence --runInBand
npm run test:e2e
```

Manual workflow:

1. Filter customers by all/new/review/contacted/resolved/cleared.
2. Search and paginate.
3. Open customer profile.
4. Open drawer and switch selected order.
5. Change investigation status.
6. Add a note.
7. Open claims queue as viewer and analyst.
8. Assign, view, snooze, escalate, reopen, reverse, and resolve claims.
9. Build evidence from customer, audit, claim, and chargeback entry points.
10. Download PDF and inspect content.

Recommended future coverage:

```text
tests/claims/claim-state-machine-ui.spec.ts
tests/evidence/pdf-visual-regression.spec.ts
tests/chargebacks/chargeback-workflow.spec.ts
```

Evidence:

- Screenshots before/after each mutation.
- Claim IDs and event rows.
- Evidence package IDs and PDF samples.

Exit criteria:

- No stale customer/claim data after filtering or navigation.
- Evidence PDFs are accurate and scoped to the merchant.

## Phase 9: Commerce Integrations

Implement provider-specific smoke tests with sandbox stores. Hide any integration that cannot pass these checks.

Shopify:

- OAuth install from onboarding and settings.
- Callback state/shop validation.
- Token exchange failure handling.
- Disconnect.
- Order/refund/fulfillment webhook signature validation.
- Sync-audit processing job creation.
- Duplicate webhook idempotency.

WooCommerce and BigCommerce:

- Connection/status/disconnect.
- Webhook signature verification.
- Order normalization.
- Duplicate webhook idempotency.
- Safe hidden state if not launch-ready.

Existing coverage:

```bash
npm test -- tests/api/shopifyOAuth.test.ts --runInBand
npm test -- tests/api/shopifyWebhookP0.test.ts --runInBand
npm test -- tests/lib/shopifyOrderToCsvRow.test.ts --runInBand
npm test -- tests/lib/shopifyAuditBridge.test.ts --runInBand
npm test -- tests/api/woocommerceWebhook.test.ts --runInBand
npm test -- tests/api/bigcommerceWebhook.test.ts --runInBand
npm test -- tests/lib/webhookIdempotency.test.ts --runInBand
```

Recommended future coverage:

```text
tests/integrations/shopify-sandbox-install.spec.ts
tests/integrations/commerce-settings-state.spec.ts
scripts/deployment-readiness/post-commerce-webhook-fixtures.ts
```

Evidence:

- Provider app IDs.
- Webhook delivery IDs.
- Connection row IDs.
- Processing job IDs.
- Screenshots of connected/disconnected/error states.

Exit criteria:

- Exposed integrations work end to end or are hidden.
- Credentials are encrypted and never browser-visible.

## Phase 10: Helpdesk, Widget, API, And Extension

Implement these as provider fixtures plus manual clean-profile browser checks.

Helpdesk/widget existing coverage:

```bash
npm run smoke:support-intake
npm run post:gorgias-webhook-fixture
npm run test:support-walkthrough
npm test -- tests/api/gorgiasSupportWebhook.test.ts --runInBand
npm test -- tests/lib/gorgiasWidgetJson.test.ts --runInBand
npm test -- tests/lib/performWidgetContextUnlock.test.ts --runInBand
npm test -- tests/lib/contextUnlockFlow.test.ts --runInBand
```

API existing coverage:

```bash
npm test -- tests/lib/apiKeys.test.ts --runInBand
npm test -- tests/api/routeSecurity.test.ts --runInBand
npm test -- tests/lib/v1Signals.test.ts --runInBand
```

Extension checks:

```bash
npm run build:extension
```

Manual checks:

1. Connect Gorgias or selected helpdesk.
2. Send valid, invalid, duplicate, and missing-email webhook fixtures.
3. Open widget locked, unlockable, unlocked, no-match, and error states.
4. Verify context credit consumption.
5. Create/revoke API key and call `/api/v1/*` routes.
6. Install extension in a clean Chrome profile.
7. Confirm host permissions match production API.

Recommended future coverage:

```text
tests/api/v1-public-contract.test.ts
tests/support/widget-token-security.spec.ts
tests/extension/chrome-extension-smoke.spec.ts
```

Evidence:

- Widget screenshots.
- Credit event rows.
- API key audit entries.
- Extension manifest and clean-profile screenshots.

Exit criteria:

- No token, API key, widget, or helpdesk flow can expose wrong merchant context.

## Phase 11: Billing, Plans, Entitlements, And Credits

Implement with Stripe test clocks or deterministic webhook fixtures.

Existing coverage:

```bash
npm test -- tests/lib/billingActivation.test.ts --runInBand
npm test -- tests/lib/billingLifecycle.test.ts --runInBand
npm test -- tests/lib/billingTiers.test.ts --runInBand
npm test -- tests/lib/contextCredits.test.ts --runInBand
npm test -- tests/lib/creditUsage.test.ts --runInBand
npm test -- tests/lib/productEntitlements.test.ts --runInBand
```

Manual billing workflow:

1. Start checkout or assign test subscription.
2. Verify Stripe webhook signature and event handling.
3. Confirm plan activates.
4. Confirm paid gates unlock.
5. Consume context credits.
6. Test concurrent context unlocks.
7. Cancel subscription.
8. Simulate failed payment and lifecycle cron.
9. Confirm emails and billing settings state.

Recommended future coverage:

```text
tests/billing/stripe-webhook-fixtures.test.ts
tests/billing/billing-settings-ui.spec.ts
scripts/deployment-readiness/run-stripe-test-clock.ts
```

Evidence:

- Stripe event IDs.
- Merchant subscription row.
- Credit event rows.
- Billing emails in test inbox.
- Screenshots of billing settings.

Exit criteria:

- Merchants get exactly the access and usage they paid for.
- Failed/canceled plans cannot retain paid-only access beyond grace rules.

## Phase 12: Security, Privacy, And Compliance Review

This phase is partly automated and partly human signoff.

Automated checks:

```bash
npm audit --audit-level=moderate
npm run audit:security
npm run test:compliance
npm test -- tests/security --runInBand
npm test -- tests/compliance --runInBand
```

Human review:

1. Service-role route-by-route triage.
2. Webhook signature verification on every provider route.
3. Mutation route auth, merchant context, permission, and rate limit review.
4. Export CSV injection review.
5. File upload abuse review.
6. Logging/Sentry/analytics PII redaction review.
7. Privacy, DPA, pilot terms, and data-handling review against actual data flows.
8. Right-to-deletion dry run.

Recommended future coverage:

```text
scripts/deployment-readiness/service-role-inventory.ts
scripts/deployment-readiness/audit-route-auth.ts
scripts/deployment-readiness/log-redaction-smoke.ts
tests/privacy/right-to-deletion.spec.ts
```

Evidence:

- Service-role inventory with owner decision per route.
- Dependency audit output or exception.
- Legal/privacy signoff.
- Deletion request dry-run notes.

Exit criteria:

- No unreviewed service-role use.
- No merchant-facing PII leak.
- No unauthenticated or wrong-merchant write path.

## Phase 13: UX, Accessibility, Performance, And Reliability

Implement with Playwright, manual viewport checks, and targeted performance measurement.

Automated checks:

```bash
npm run test:critical
npm run test:e2e
npm run audit:ux
```

Manual checks:

1. Desktop Chrome primary workflows.
2. Mobile critical path and mobile unsupported state.
3. Safari and Firefox smoke.
4. Keyboard navigation.
5. Focus trap and restoration for modals/drawers.
6. 125 percent and 150 percent zoom.
7. Reduced motion.
8. Slow network route transitions.
9. Large dataset customers/claims/reports pages.

Recommended future coverage:

```text
tests/accessibility/keyboard-navigation.spec.ts
tests/performance/merchant-page-budgets.spec.ts
scripts/deployment-readiness/query-performance-smoke.ts
```

Evidence:

- UX screenshot audit output.
- Manual browser matrix.
- Page timing notes.
- Large dataset job IDs.

Exit criteria:

- Core workflows are usable, clear, and stable under merchant-realistic data sizes.

## Phase 14: Observability, Support, And Rollback

Implement before first merchant handoff, even for a limited pilot.

Checks:

1. Sentry enabled, source maps configured, PII redacted.
2. Alerts route to the person on call.
3. Billing/webhook failure alerts exist.
4. CSV processing failures are visible and recoverable.
5. Audit trail captures high-risk actions.
6. Support runbooks exist.
7. Known limitations are written in approved wording.
8. Rollback playbook is rehearsed.
9. First merchant monitoring channel exists.

Recommended artifacts:

```text
reports/deployment-readiness/runbooks/merchant-onboarding.md
reports/deployment-readiness/runbooks/upload-failure.md
reports/deployment-readiness/runbooks/integration-failure.md
reports/deployment-readiness/runbooks/billing-issue.md
reports/deployment-readiness/runbooks/deletion-request.md
reports/deployment-readiness/runbooks/rollback.md
```

Evidence:

- Alert screenshots.
- Runbook links.
- Rollback rehearsal notes.
- Support escalation rota.

Exit criteria:

- Support can handle the first merchant without needing engineering to improvise every answer.

## Manual Merchant Journey Implementation

Run these only after automated `P0` gates are green or exception-approved.

### Journey A: New CSV-Only Merchant

Tester: product QA owner  
Account: fresh staging merchant  
Data: `small_sanity.csv`, `medium_realistic.csv`, invalid fixture

Steps:

1. Sign up.
2. Complete onboarding without commerce integration.
3. Download CSV template.
4. Upload valid CSV.
5. Confirm data-quality warnings.
6. Wait for processing.
7. Open dashboard and audit run.
8. Filter customers.
9. Open customer detail.
10. Change status and add note.
11. Build evidence package and download PDF.
12. Export CSV.
13. Log out and back in.

Pass condition:

- All state persists and all export/PDF data matches the source merchant.

### Journey B: Shopify Merchant

Tester: integrations owner  
Account: staging merchant with Shopify sandbox

Steps:

1. Connect Shopify.
2. Verify connection status on dashboard, upload, and settings.
3. Sync/import orders.
4. Send order/refund/fulfillment webhook fixtures.
5. Confirm idempotent processing.
6. Confirm claims/customer records update.
7. Disconnect Shopify.

Pass condition:

- Shopify data creates correct merchant-scoped jobs and no stale connected state remains after disconnect.

### Journey C: Helpdesk Merchant

Tester: integrations owner  
Account: staging merchant with Gorgias or supported helpdesk sandbox

Steps:

1. Connect helpdesk.
2. Send webhook fixture.
3. Verify support case on customer profile.
4. Open claim review support context.
5. Open widget.
6. Unlock context.
7. Test no-match and wrong-customer states.

Pass condition:

- Widget and support context show only the intended merchant/customer data.

### Journey D: Paid Plan Merchant

Tester: billing owner  
Account: staging merchant linked to Stripe test customer

Steps:

1. Activate plan through checkout or webhook fixture.
2. Confirm billing page state.
3. Confirm entitlements unlock.
4. Consume context credits.
5. Simulate failed payment.
6. Simulate cancellation.
7. Confirm access changes and emails.

Pass condition:

- Plan, credits, access, and emails match Stripe state.

### Journey E: Multi-Merchant Isolation

Tester: security/privacy owner  
Accounts: two or three staging merchants

Steps:

1. Seed similar customers across merchants.
2. Attempt URL/API ID swaps.
3. Attempt export/PDF/widget token reuse.
4. Attempt lookup below and above k-anon threshold.
5. Confirm audit logs.

Pass condition:

- No cross-merchant raw data leak or inference leak below threshold.

### Journey F: Failure Recovery

Tester: release captain plus area owner

Steps:

1. Upload invalid CSV.
2. Interrupt processing.
3. Retry/recover job.
4. Send duplicate provider webhook.
5. Simulate provider outage.
6. Force evidence PDF failure and retry.
7. Replay billing webhook.

Pass condition:

- Failures are safe, visible, retryable, and do not duplicate or corrupt merchant data.

## Automation Backlog

These are the highest-leverage checks to implement as code before a broader rollout.

| Priority | Automation | Purpose | Suggested Path |
| --- | --- | --- | --- |
| `P0` | Service-role inventory | Ensure every service-role route has scope proof | `scripts/deployment-readiness/service-role-inventory.ts` |
| `P0` | Cron coverage audit | Ensure required cron jobs are scheduled and protected | `scripts/deployment-readiness/audit-crons.ts` |
| `P0` | Env audit | Catch missing/stale/mis-scoped env vars | `scripts/deployment-readiness/audit-env.ts` |
| `P0` | RLS table coverage | Prove tenant tables are protected | `scripts/deployment-readiness/audit-rls.ts` |
| `P0` | Identity quality gate | Enforce false-positive and negative-control thresholds | `scripts/deployment-readiness/identity-quality-gate.ts` |
| `P0` | Route auth matrix | Check app/API routes by persona | `tests/security/route-auth-matrix.spec.ts` |
| `P0` | CSV export contract | Ensure exports include all current fields and sanitize formulas | `tests/audit/csv-export-contract.spec.ts` |
| `P0` | PDF scope/content check | Validate evidence package content and tenant isolation | `tests/evidence/pdf-content-scope.spec.ts` |
| `P0` | Stripe webhook fixtures | Cover subscription lifecycle deterministically | `tests/billing/stripe-webhook-fixtures.test.ts` |
| `P1` | Provider sandbox smoke | Test commerce/helpdesk connection UI and callbacks | `tests/integrations/provider-sandbox-smoke.spec.ts` |
| `P1` | Chrome extension smoke | Install extension in clean profile and test auth/error states | `tests/extension/chrome-extension-smoke.spec.ts` |
| `P1` | Accessibility keyboard matrix | Keyboard and focus trap coverage for drawers/dialogs | `tests/accessibility/keyboard-navigation.spec.ts` |
| `P1` | Performance budget smoke | Catch slow dashboard/customers/claims/reports regressions | `tests/performance/merchant-page-budgets.spec.ts` |

## Go / No-Go Meeting Agenda

Use this agenda after all phases are complete.

1. Confirm release SHA and deployment URL.
2. Review failed or skipped automated commands.
3. Review unresolved `P0` checklist items.
4. Review exceptions with owner, expiry, scope, and rollback.
5. Review manual journey evidence.
6. Review security/privacy signoff.
7. Review support readiness and first merchant monitoring.
8. Decide launch mode:
   - internal dogfood only
   - controlled merchant pilot
   - broader merchant rollout
   - no-go

## Final Exit Criteria

Merchant handoff is allowed only when:

- Every `P0` checklist item is checked or exception-approved.
- Every exposed integration has passed end to end or is hidden.
- No known wrong-merchant data exposure exists.
- No unsupported compliance or accuracy claim remains merchant-facing.
- Support has runbooks and a named escalation path.
- Rollback is known and rehearsed.
- The first merchant cohort is intentionally scoped and monitored.
