# Phase 12 full-system validation and release gate

Date: 12 July 2026  
Branch: `codex/refocus-claim-gate-map`  
Readiness: **Not ready due to release-blocking validation gaps**

The application code, current-product browser suite, financial unit fixtures, isolation checks, and local reconciliation route are green. The release gate remains closed because the primary source-to-final-financial-result journey has not been completed against a working commerce sandbox in the built application, Shopify authentication currently returns 401, the retained E2E recovery seed is not linked to a loss and must not be used as financial proof, and deployed scheduled reconciliation has not run with `CRON_SECRET` configured.

Supporting registers:

- [Coverage matrix](./phase-12-coverage-matrix.md)
- [Defect register](./phase-12-defect-register.md)
- [Deferred-work register](./phase-12-deferred-work.md)

## 1. Scope tested

Current merchant routes, authentication, authorization, merchant isolation, source normalization, support intake, matching, case creation/state, rules, workflows, evidence, financial ledger logic, loss/recovery logic, reconciliation, exceptions, search, reports, integration health, responsive desktop/tablet UI, migrations, generated types, and security-focused routes were tested. External write actions were intentionally excluded.

## 2. Commands executed

Key commands included `npm ci`, `npm audit --omit=dev`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm test -- --runInBand`, focused Jest isolation/finance/security suites, `RUN_LIVE_DB=1` RLS tests, `npm run test:e2e`, `npm run test:critical`, `npm run test:compliance`, `npm run gen:supabase-types`, Supabase migration list/lint commands, the read-only integration preflight, and `npm run smoke:reconciliation`.

## 3. Test environment used

Validation used the dedicated merchant from `E2E_MERCHANT_ID`, authenticated through the protected E2E auth route, the linked Supabase project, a production Next.js build on localhost, recorded/simulated connector fixtures, and read-only external preflight calls. The merchant contains 17 open cases, eight USD financial summaries, 70 source tickets, 13 source orders, six evidence records, 47 rule evaluations, and 17 reconciliation exceptions. No real customer message, refund, payment, carrier claim, or order mutation was triggered.

## 4. Automated-test results

- Jest: 241 suites passed, 1 skipped; 1,883 tests passed, 3 skipped; one snapshot passed.
- Current Playwright suite: 34/34 passed across 1440px desktop and 1024px tablet.
- Current critical desktop suite after reporter correction: 16/16 passed.
- Live RLS opt-in: 3/3 passed.
- Focused isolation/finance set: 11 suites and 79 tests passed.
- Security route set: 3 suites and 91 tests passed.

Expected error-path logging appears in some unit tests; those suites assert failure handling and passed.

## 5. Production build and TypeScript results

`npm run typecheck` passed. `npm run build` passed under Next.js 16.2.7, including TypeScript, page-data collection, and generation of 87 static pages. Two stale Next.js route-param signatures found by standalone typecheck were corrected.

## 6. Lint results

Lint passed with 0 errors and 73 warnings. Warnings are pre-existing unused declarations, hook-dependency warnings, and two removable disable directives. They do not invalidate this gate, but remain cleanup debt.

## 7. Database migration results

Local and linked migration ledgers match through `20260712120000`. Generated Supabase types were refreshed and now reproduce cleanly. The linked schema was inspected read-only and live RLS tests passed. A clean local replay was not possible because Docker was unavailable; this is a validation gap. Linked database lint also reports broken `legacy_v1` functions that reference moved legacy tables. The proposed destructive legacy removal remains unapplied. Recent trigger migration duplicate execution was inspected as safe because duplicate creation fails and rolls back rather than mutating existing data.

## 8. Merchant-isolation and permission results

Automated merchant-isolation, route-security, evidence, reports, search, and ID-tampering tests passed. Live RLS rejected anonymous reads of member/service tables while the service client retained expected access. Server-side permissions are covered for the implemented `owner`, `admin`, `analyst`, and `viewer` model. Manual browser walkthroughs for separately provisioned manager, support, operations, and finance personas were not completed; the product roles do not map one-to-one to all requested personas.

## 9. Integrations tested with real sandbox credentials

Gorgias accepted a read-only API preflight for the configured development account, and its deployed webhook URL was reachable. No live ticket creation, message, tag, or other write was attempted. Supabase connectivity was live. This is connectivity evidence, not a complete live Gorgias workflow.

## 10. Integrations tested only with fixtures or simulations

Shopify normalization/import/webhook/idempotency, Gorgias intake/webhook/idempotency, BigCommerce, WooCommerce, Zendesk, Freshdesk, tracking, generic/canonical intake, CSV intake, payment/refund, return, fulfilment, and dispute behavior were exercised by recorded fixtures, simulations, or unit/integration tests. These are not described as production-tested.

## 11. Integrations or capabilities not testable and why

Shopify external preflight returned 401 for the configured token. Carrier/recovery providers had no controlled credentials. No provider-backed email delivery was attempted. Production Vercel cron execution was unavailable. External destructive or write actions were excluded by safety requirements.

## 12. Record-matching results

Exact, probable, ambiguous, conflicting, and no-match paths passed automated coverage, including cross-merchant duplicate identifiers and manual resolution. Probable and ambiguous matches remain exceptions rather than silently confirmed. The actual browser case for order 1013 showed a linked source order and Gorgias ticket, but no production match-rate claim is made from test data.

## 13. Automatic case-creation results

Support intake, canonical entity/event intake, Shopify/Gorgias bridge, manual fallback, replay, and idempotency tests passed. The current merchant includes source-linked automatically created cases. A new full commerce-event-to-final-outcome case was not created during this validation because the configured Shopify credential is invalid and external writes were prohibited.

## 14. Shared case-state results

Automated case state-machine, timeline, decision, status, outcome, exception, and financial projection tests passed. Browser validation confirmed a case workspace exposes source context, lifecycle controls, evidence state, recommendation, timeline, comments, and outcome recording. Cross-module final closure was not demonstrated in the live E2E merchant.

## 15. Rule and workflow results

Rule engine, adversarial decision, priority, evidence, workflow, task, retry, and connector-action tests passed. The inspected order-1013 case had 13 historical rule evaluations and displayed an explainable `Default review control` recommendation. Repeated evaluation history is visible; it was not treated as duplicate financial activity.

## 16. Reconciliation results

The route rejects missing and invalid authorization with 401. The documented local smoke procedure used an ephemeral secret and returned 200 for a valid sweep: one merchant swept, 17 exceptions raised, zero detector failures. Immediate repeat returned 200 with zero new exceptions. Detector failures are now named, returned, counted, and cause HTTP 500 instead of a false success. Merchant cursor/resume behavior has automated coverage. The Vercel schedule is statically present as `0 6 * * *` for `/api/cron/reconcile`. **Deployed scheduled execution is unverified.**

## 17. Exception-queue results

Seventeen deduplicated open reconciliation exceptions were present for the E2E merchant. Browser tests opened an exception, followed its case link, and verified the complete case workspace. Automated tests cover creation, resolution, deduplication, and projection. A full financial exception resolution against a live loss/recovery chain was not available.

## 18. Financial-calculation results

Deterministic fixtures passed for exposure, payout, full and partial refunds, replacement combinations, chargeback combinations, recoveries, write-off behavior, duplicate events, and cross-module integrity. For the E2E merchant, eight USD summaries reconcile exactly to USD 3,739.80 exposure, zero confirmed loss, and zero canonical recovery. No duplicate confirmed financial-entry groups were found.

## 19. Loss-attribution results

Automated fixtures cover carrier, warehouse/3PL, supplier, customer, merchant policy, payment provider, shared, suspected abuse, and unknown attribution behavior. The live E2E merchant contains no `loss_cases`, so actual UI traceability from a confirmed loss to attribution was not demonstrated.

## 20. Recovery-workflow results

Recovery calculation, creation, state progression, evidence, task, deadline, and outcome behavior passed fixture tests. The retained E2E merchant has one intentional verification seed showing GBP 20–60 recoverable on GBP 80 merchant loss, but it has `loss_case_id = null`, is linked to a USD case, and bypassed the normal store invariant. It is validation data, not proof of product recovery integrity.

## 21. Financial-closure results

Closure and stale-case tests passed for the supported states, including preventing closure while recovery remains unresolved. The current E2E merchant has no completed loss/recovery chain and therefore does not provide live closure evidence.

## 22. Dashboard and report reconciliation results

The dashboard’s USD 3,739.80 exposure matches the eight canonical USD financial summaries. Reports rendered, showed operational metrics, and exposed underlying-record navigation. Confirmed loss is zero. The recovery board contains the retained direct seed described above; it must not be reconciled as a canonical recovery or used for readiness proof.

## 23. Search results

Automated search tests cover IDs, customer/order context, isolation, and no-result behavior. Browser command search opened from the current dashboard and returned current navigation results. Current route deep links rendered correctly.

## 24. Work-management results

Assignment, comments, mentions, tasks, exception ownership, deadlines, priorities, and completion behavior have automated coverage. Browser validation confirmed assignment controls, lifecycle controls, snooze, comments, and mentions on a current case. The E2E merchant had no active work-task rows, so manager workload reporting was not demonstrated with live task volume.

## 25. Notification results

Notification preferences, links, read state, deduplication, inaccessible-record protection, and in-app behavior have automated coverage. No real external notification was sent. A general durable collaboration email-job queue was not found; live email delivery and provider-boundary queue semantics remain unverified.

## 26. Integration-health results

The Integration Centre correctly showed stale/unknown health. A high-severity fail-open defect was fixed: verify errors and inconclusive responses now fail closed, and the gate requires a connected/syncing, current, issue-free canonical connection plus a healthy webhook for Gorgias. Browser regression now requires Shopify and Gorgias to display `Required`, not `Ready`, for the present stale state.

## 27. Audit-history results

Audit/accountability, timeline, matching resolution, decision, financial, recovery, and exception events have automated coverage. Browser validation found and fixed a null-metadata audit failure; the repeated customer-context request then returned 200 and a `view_customer` row with object metadata was confirmed in `user_action_log`. The current E2E merchant still has no canonical audit rows for a completed financial chain, so end-to-end financial audit traceability remains unproven.

## 28. Failure-recovery results

Automated tests cover webhook retry/idempotency, duplicate requests, partial intake failures, financial reversals, sync retries, connector failures, reconciliation detector failures, and exception deduplication. Reconciliation now makes partial detector failure observable. No real provider outage or deployed retry loop was induced.

## 29. Performance observations

The retained generated fixture processed 5,400 rows in 5,181 ms (1,042 rows/s). Browser page checks generally completed in about 0.7–4.4 seconds in the local production build, while the two multi-route compliance passes took 14–20 seconds. This is local MVP-scale evidence, not a production load test. Concurrent sync/reconciliation at realistic multi-integration volume remains unmeasured.

## 30. Security findings

Cron authorization, route authorization, webhook signatures, provider credential handling, upload validation, merchant lookup privacy, RLS, and cross-merchant isolation tests passed. No secret was logged by the reconciliation smoke script. `npm audit --omit=dev` reports seven production dependency advisories (one low, six moderate), primarily a Babel file-read advisory and OpenTelemetry/Sentry baggage memory issue; no blind dependency upgrade was applied.

## 31. Manual exploratory-testing findings

The current merchant experience was manually inspected across Dashboard, Work, Exceptions, Payout Control, case detail, Losses, Recoveries, Customers, Rules and Flows, Reports, Integrations, and Settings. No horizontal overflow or generic crash state appeared at desktop/tablet widths. The integration gate originally contradicted stale health and was fixed. The retained orphan recovery seed is visibly inconsistent with canonical loss data and is classified as a validation-data issue. The browser case for order 1013 clearly exposes missing evidence and an outdated recommendation warning rather than pretending the data is complete.

## 32. Bugs found

Five application defects were found: Next.js route-param typing drift, reconciliation false-success on detector failure, fail-open integration readiness, a case-workbench customer-context ID mismatch, and null metadata causing lost user-action audit events. Validation infrastructure defects included obsolete Playwright schema/UI assumptions, unsafe cleanup after setup failure, nested reporter paths with committed generated reports, stale generated database types, and early locator ambiguity in the replacement suite. See the separate defect register.

## 33. Bugs fixed

All five application defects were fixed with regression tests. Obsolete E2E infrastructure was replaced with a current-product suite using the protected existing E2E merchant. Authentication state is temporary, reporters now target ignored `tests/reports`, stale committed reports were removed, generated types were refreshed, and current route/compliance coverage was added.

## 34. Remaining known issues

The release evidence still lacks a complete built-application source-to-loss-to-recovery-to-final-report trace; Shopify auth is invalid; scheduled production reconciliation has not run; the shared E2E recovery seed is intentionally noncanonical; clean migration replay was unavailable; `legacy_v1` functions fail database lint; role-persona browser coverage is incomplete; a general email queue is absent; 73 lint warnings and seven production dependency advisories remain.

## 35. Deferred items and justification

Deferred work is limited to external setup, destructive-legacy approval, validation-environment repair, or non-core cleanup. No unfinished core logic is relabelled as an external dependency. Owners, fallbacks, and blocking status are in the deferred-work register.

## 36. External dependencies

Required external inputs are a valid Shopify development-store token, `CRON_SECRET` in the deployed environment, deployment of the committed Vercel schedule, evidence of a successful cron run, controlled carrier/recovery credentials if those integrations are to be claimed, a configured email provider/queue if email is in pilot scope, representative pilot data, Docker or a disposable Supabase project for clean replay, and approval before destructive legacy removal.

## 37. Release-blocking failures

There are no known unresolved critical/high application-code defects from this pass. The validation gate is nevertheless blocked by four evidence conditions: no complete actual merchant-flow demonstration, invalid Shopify sandbox authentication, no successful deployed cron run, and contaminated recovery proof in the retained E2E dataset. These must be resolved before design-partner safety is claimed.

## 38. Recommended follow-up work

1. Repair the Shopify development credential and reconnect/sync the dedicated merchant.
2. Replace or isolate the direct recovery seed, then generate a loss and recovery through current application services.
3. Execute the order/ticket/refund/loss/recovery scenario through the built UI and capture case, timeline, audit, dashboard, and report evidence.
4. Configure `CRON_SECRET`, deploy `vercel.json`, observe a successful scheduled run, and confirm the repeat run is idempotent.
5. Run a clean migration replay and complete role-persona browser checks.
6. Decide whether a durable email queue is pilot scope; implement and validate it before claiming email behavior.

## 39. Final readiness status

**Not ready due to release-blocking validation gaps.**

Design-partner testing is not yet safe to claim. The largest limitation is the missing actual source-to-final-financial-result walkthrough with a valid commerce sandbox. No unresolved high-severity application defect was left open, but the release gate depends on evidence, not only green code. Final recommendation: **Proceed only after listed non-code setup and controlled end-to-end validation are completed.**

## Evidence-backed merchant-flow walkthrough

The strongest actual built-application trace is case `361dd765-8451-428d-9562-d490b1e13c68` for order 1013:

1. A Gorgias ticket (`67818375`) and normalized source order (`16857807094129`) are linked to the case.
2. The case is `awaiting_customer_evidence`, carries USD 185 exposure, and displays source provenance and helpdesk deep link.
3. Thirteen historical rule evaluations exist; the current recommendation is `request_customer_evidence` under `Default review control`, with the UI warning that the recommendation may be outdated.
4. The timeline shows creation, review, and lifecycle changes. The browser exposes evidence, decision, ownership, comments, and recovery-route controls.
5. The canonical financial summary contains one USD 18,500 memo exposure entry and zero paid, confirmed-loss, recoverable, recovered, prevented, or written-off values.
6. No canonical evidence item, loss case, completed outcome, or audit-backed final financial result exists for this case.
7. A direct GBP recovery verification seed is linked to the case without a loss and is deliberately excluded from the trace.

This proves source context, case review, rule output, and exposure presentation in the current UI. It does **not** satisfy the required final event-to-loss-to-recovery demonstration, which is why the release gate remains closed.
