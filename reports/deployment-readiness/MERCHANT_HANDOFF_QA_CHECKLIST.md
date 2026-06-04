# Merchant Handoff QA Checklist

Generated: 2026-06-03  
Scope: Unauth / ParcelClaim merchant pilot and external merchant handoff readiness  
Release owner: TBD  
Target commit: TBD  
Staging URL: TBD  
Production URL: TBD

## How To Use This Checklist

Treat this as a release gate, not a suggestion list.

- `P0` means no merchant handoff until it passes, or there is a written, owner-approved exception with an expiry date.
- `P1` means required before a broader paid pilot or multi-merchant rollout.
- `P2` means required before scale, but can trail a controlled pilot if the risk is understood.
- Every completed item should have evidence: command output, screenshot, ticket, log link, Stripe/Supabase event ID, or manual tester initials.
- Re-run all P0 automated checks after the final deploy candidate is built, not before the last code change.

## Current Known Hard Gates

These were already called out by the existing launch readiness docs and should remain explicit no-go gates.

- [ ] `P0` Dependency vulnerability gate is closed.
  - Evidence required: `npm audit --audit-level=moderate` passes, or signed pilot exception with owner, scope, and expiry.
  - Existing context: `reports/deployment-readiness/LAUNCH_GATE_CHECKLIST.md` previously marked this as failed.
- [ ] `P0` Service-role usage surface is closed route-by-route.
  - Evidence required: every service-role use has tenant-scope proof, auth proof, and reason it cannot use a scoped client.
  - Existing context: prior static scan reported active service-role findings.
- [ ] `P0` Identity false-positive gate is acceptable for merchant use.
  - Evidence required: clean dataset review rate is below the agreed merchant pilot threshold, and exceptions are product-approved.
  - Existing context: prior launch checklist flagged clean-dataset false positives as an enterprise blocker.
- [ ] `P0` No merchant-facing text overclaims accuracy, compliance, CE 3.0 eligibility, chargeback win rates, or network coverage.
  - Evidence required: compliance tests pass plus manual copy review of landing, dashboard, evidence exports, help pages, and PDFs.

## Release Candidate Hygiene

- [ ] `P0` Confirm the release branch is clean and named.
  - Command: `git status --short`
  - Evidence:
- [ ] `P0` Record the exact commit SHA being handed to merchants.
  - Command: `git rev-parse HEAD`
  - Evidence:
- [ ] `P0` Review all changes since the last merchant-safe build.
  - Command: `git diff --stat <last_safe_sha>..HEAD`
  - Evidence:
- [ ] `P0` Confirm no local-only files or generated secrets are staged or committed.
  - Check: `.env*`, `tests/.test-credentials.json`, support walkthrough `.secret.local`, downloaded CSVs, traces, screenshots with PII.
  - Evidence:
- [ ] `P0` Confirm package-lock and extension lockfiles match the intended dependency versions.
  - Evidence:
- [ ] `P1` Confirm all known launch docs are updated or superseded.
  - Check: `README.md`, `ENV_SETUP.md`, `reports/deployment-readiness/*`, merchant-facing help pages.
  - Evidence:

## Automated Gate Commands

Run these in a production-like environment with clean dependencies.

- [ ] `P0` Fresh install succeeds.
  - Command: `npm ci`
  - Evidence:
- [ ] `P0` Type/build gate passes.
  - Command: `npm run build`
  - Evidence:
- [ ] `P0` Unit and integration tests pass.
  - Command: `npm test -- --runInBand`
  - Evidence:
- [ ] `P0` Critical desktop and mobile Playwright flows pass.
  - Command: `npm run test:critical`
  - Evidence:
- [ ] `P0` Compliance suite passes.
  - Command: `npm run test:compliance`
  - Evidence:
- [ ] `P0` Deployment readiness audit passes or has signed exceptions.
  - Command: `npm run audit:deployment`
  - Evidence:
- [ ] `P0` Security audit passes or has signed exceptions.
  - Command: `npm run audit:security`
  - Evidence:
- [ ] `P0` Merchant CSV blind readiness passes.
  - Command: `npm run test:merchant-readiness`
  - Evidence:
- [ ] `P0` CSV benchmark suite passes.
  - Command: `npm run audit:csv`
  - Evidence:
- [ ] `P0` Identity audit passes.
  - Command: `npm run audit:identity`
  - Evidence:
- [ ] `P1` Full Playwright suite passes.
  - Command: `npm run test:e2e`
  - Evidence:
- [ ] `P1` UX screenshot audit passes and screenshots are reviewed by a human.
  - Command: `npm run audit:ux`
  - Evidence:
- [ ] `P1` Docs generated from signal source of truth are up to date.
  - Command: `npm run docs:check`
  - Evidence:
- [ ] `P1` Chrome extension build succeeds.
  - Command: `npm run build:extension`
  - Evidence:
- [ ] `P1` Support intake smoke succeeds.
  - Command: `npm run smoke:support-intake`
  - Evidence:
- [ ] `P1` Gorgias webhook fixture posts and links correctly in staging.
  - Command: `npm run post:gorgias-webhook-fixture`
  - Evidence:
- [ ] `P1` Support walkthrough fixtures pass for a real staging account.
  - Command: `npm run test:support-walkthrough`
  - Evidence:
- [ ] `P2` React Doctor report has no new high-risk interaction findings.
  - Command: `npm run doctor`
  - Evidence:

## Environment And Deployment

- [ ] `P0` Production and staging environment variables are complete and use the same names as documented.
  - Check: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `IDENTITY_SALT`, `NEXT_PUBLIC_APP_URL`.
  - Evidence:
- [ ] `P0` `IDENTITY_SALT` is stable, long, secret, and identical across app workers for the same environment.
  - Evidence:
- [ ] `P0` Production `NEXT_PUBLIC_APP_URL` is the real production URL, not localhost, preview, or stale Vercel URL.
  - Evidence:
- [ ] `P0` Supabase service role key exists only in server-side environments and never appears in client bundles or logs.
  - Evidence:
- [ ] `P0` Stripe, Shopify, BigCommerce, WooCommerce, Gorgias, Freshdesk, Zendesk, Sentry, and Amplitude variables are either correctly configured or the corresponding UI is gated off.
  - Evidence:
- [ ] `P0` Webhook signing secrets are set per environment and are not shared across staging and production.
  - Evidence:
- [ ] `P0` Vercel deployment uses production build output, not dev server behavior.
  - Evidence:
- [ ] `P0` Vercel cron coverage is intentional.
  - Check routes present in app: `/api/cron/purge-expired-audits`, `/api/cron/billing-lifecycle`, `/api/cron/mark-stale-claims`, `/api/cron/process-csv-queue`.
  - Check `vercel.json` currently schedules only `/api/cron/purge-expired-audits`; confirm the other jobs are scheduled elsewhere or add schedules.
  - Evidence:
- [ ] `P0` All cron endpoints require the intended authorization and cannot be run publicly.
  - Evidence:
- [ ] `P1` Preview deployments are clearly labelled and cannot be confused with production by a merchant.
  - Evidence:
- [ ] `P1` Rollback target is identified and can be redeployed within 15 minutes.
  - Evidence:

## Database, Migrations, And Storage

- [ ] `P0` All Supabase migrations apply cleanly to a fresh database.
  - Evidence:
- [ ] `P0` All Supabase migrations apply cleanly to a production-like database with existing merchants.
  - Evidence:
- [ ] `P0` Migration order conflicts are resolved.
  - Check duplicate-style numbered migrations and timestamped migrations both apply in intended order.
  - Evidence:
- [ ] `P0` RLS is enabled on all tenant data tables.
  - Check: merchants, merchant users, processing jobs, audit transactions, customer profiles, notes, claims, support cases, billing usage, API keys, evidence packages, widget tokens.
  - Evidence:
- [ ] `P0` Storage bucket names, size limits, MIME limits, and RLS policies are correct for CSV uploads, evidence artifacts, public audit uploads, and extension downloads.
  - Evidence:
- [ ] `P0` Large CSV upload bucket limit matches merchant file expectations.
  - Evidence:
- [ ] `P0` Database indexes support high-volume pages.
  - Check: customers list, claims queue, lookup, audit transactions by merchant/job, support cases by customer, webhook idempotency, billing usage.
  - Evidence:
- [ ] `P0` Deletion and soft-delete migrations work for merchant account deletion, watchlist deprecation, notes, jobs, and customer data.
  - Evidence:
- [ ] `P1` A backup and restore drill has been run against staging.
  - Evidence:
- [ ] `P1` A failed migration rollback plan exists for the release.
  - Evidence:

## Authentication, Onboarding, And Team Access

- [ ] `P0` New merchant signup works end to end.
  - Steps: landing/signup -> account creation -> callback -> onboarding -> merchant profile created -> dashboard.
  - Evidence:
- [ ] `P0` Existing merchant login works.
  - Steps: magic link or configured auth method -> callback -> dashboard.
  - Evidence:
- [ ] `P0` Password reset request and update flows work.
  - Routes: `/reset`, `/reset/update`.
  - Evidence:
- [ ] `P0` Callback route handles expired, malformed, reused, and missing tokens with safe copy and no stack traces.
  - Evidence:
- [ ] `P0` Onboarding cannot create duplicate merchant profiles for one user through refresh/back-button/retry.
  - Evidence:
- [ ] `P0` Merchants without setup are gated into the correct empty/partial setup state.
  - Evidence:
- [ ] `P0` Authenticated merchants cannot access another merchant's data by changing IDs in URLs or API calls.
  - Evidence:
- [ ] `P0` Logged-out users are redirected away from app routes and APIs return correct unauthenticated responses.
  - Evidence:
- [ ] `P0` Team roles have correct route and API access.
  - Check at minimum: owner/admin, analyst, viewer, billing-only or read-only if supported.
  - Evidence:
- [ ] `P0` Viewer/read-only users can view allowed queues but cannot mutate claims, customers, billing, integrations, API keys, team, or exports beyond their permissions.
  - Evidence:
- [ ] `P1` Team invite, permission update, removal, and audit trail entries are tested.
  - Evidence:
- [ ] `P1` Account deletion requires confirmation and deletes or anonymizes data exactly as promised.
  - Evidence:

## Merchant-Facing Navigation And Shell

- [ ] `P0` Every sidebar route lands on the intended page.
  - Check: dashboard, upload, claims, customers, history, chargebacks, lookup, reports, settings, help.
  - Evidence:
- [ ] `P0` Legacy aliases redirect correctly.
  - Check: `/inbox` redirects to `/claims`; `/saved` behavior matches product decision; no stale `/claims -> /customers` redirect.
  - Evidence:
- [ ] `P0` Loading, error, empty, and partial-setup states render for every core app route.
  - Evidence:
- [ ] `P0` Command palette targets are valid and do not point to stale filters or removed pages.
  - Evidence:
- [ ] `P0` Navigation shows immediate pending feedback on slow routes.
  - Evidence:
- [ ] `P1` App shell does not duplicate slow calls during route transitions.
  - Check Shopify/status/setup calls in layout and page loads.
  - Evidence:

## Public Site, Signup, And Legal Pages

- [ ] `P0` Landing page CTAs route to the intended signup, demo, audit, or application flow.
  - Evidence:
- [ ] `P0` Public audit/demo upload cannot leak tenant data or create persistent PII beyond documented retention.
  - Evidence:
- [ ] `P0` Public legal pages are reachable.
  - Check: privacy, DPA, pilot terms, data handling.
  - Evidence:
- [ ] `P0` Legal and marketing copy match current product reality.
  - Check especially cross-merchant network claims, CE 3.0 language, confidence grades, and accuracy numbers.
  - Evidence:
- [ ] `P0` Banned merchant-facing language compliance passes.
  - Command: `npm run test:compliance`
  - Evidence:
- [ ] `P1` Founding merchant application captures data, validates input, and has spam/rate-limit protection.
  - Evidence:

## CSV Upload And Audit Processing

- [ ] `P0` Upload accepts the documented template and required headers.
  - Required fields: `order_id`, `order_date`, `customer_email`, `customer_name`, `shipping_address`, `order_total`, `currency`, `order_status`.
  - Evidence:
- [ ] `P0` Upload supports important merchant exports.
  - Check fixtures resembling Shopify, WooCommerce, BigCommerce, Amazon/Etsy-style headers, mixed case, BOM, semicolon, pipe, duplicate headers.
  - Evidence:
- [ ] `P0` Missing required columns produce clear, non-technical errors.
  - Evidence:
- [ ] `P0` Malformed, empty, header-only, binary, script/formula, and non-CSV files are rejected safely.
  - Evidence:
- [ ] `P0` Magic-byte checks work and cannot be bypassed by file extension changes.
  - Evidence:
- [ ] `P0` Duplicate headers do not corrupt canonical fields.
  - Evidence:
- [ ] `P0` Column mapping preserves merchant choices across refresh and repeat uploads where intended.
  - Evidence:
- [ ] `P0` Upload progress, chunk processing, finalization, retry, and recovery all work.
  - Evidence:
- [ ] `P0` A failed chunk or worker timeout does not create a permanently stuck job.
  - Evidence:
- [ ] `P0` Duplicate upload detection behaves correctly.
  - Check same file, same hash, different merchant, same merchant, changed filename.
  - Evidence:
- [ ] `P0` Very large merchant CSVs finish within agreed limits and do not exceed memory/serverless timeouts.
  - Test: at least the largest fixture plus one production-like merchant export.
  - Evidence:
- [ ] `P0` Audit run pages show accurate totals, data-quality warnings, review-worthy counts, and customer summaries.
  - Evidence:
- [ ] `P0` CSV export includes the current contract fields and all paginated rows.
  - Check identity score, confidence grade, cluster ID, matched signals, source fields, no stale `risk_level` contract.
  - Evidence:
- [ ] `P1` Browser refresh during upload, processing, and report generation resumes correctly.
  - Evidence:
- [ ] `P1` Multiple concurrent uploads for the same merchant and different merchants do not cross-contaminate data.
  - Evidence:

## Fraud Scoring, Identity, And Cross-Merchant Signals

- [ ] `P0` Current weights and thresholds match the documented source of truth.
  - Check: `lib/engine/weights.ts`, `README.md`, generated signal docs.
  - Evidence:
- [ ] `P0` Clean dataset false-positive rate is below the pilot threshold.
  - Evidence:
- [ ] `P0` Negative-control dataset produces zero or formally accepted low review rate.
  - Evidence:
- [ ] `P0` Known fraud-pattern fixtures still produce expected review-worthy results.
  - Evidence:
- [ ] `P0` Address-only overlap does not incorrectly create definite identity matches.
  - Evidence:
- [ ] `P0` Disposable email, payment churn, velocity, INR, refund-rate, address mismatch, device/network, and dispute-history signals fire only when their evidence exists.
  - Evidence:
- [ ] `P0` Identity confidence grades and explanations are understandable and consistent across customer profile, audit pages, exports, PDFs, and help pages.
  - Evidence:
- [ ] `P0` Cross-merchant signals respect k-anonymity and never expose sub-threshold merchant/customer details.
  - Evidence:
- [ ] `P0` Live lookup increments lookup counters, enforces caps, and logs access.
  - Evidence:
- [ ] `P0` Live lookup with no match, low-confidence match, sub-threshold k-anon match, and strong match all render safe states.
  - Evidence:
- [ ] `P0` Merchant-specific data is never used to explain another merchant's result unless it is privacy-gated and product-approved.
  - Evidence:
- [ ] `P1` Threshold tuning dashboard/report is reviewed by product and support before changing thresholds.
  - Evidence:
- [ ] `P1` Any published accuracy metrics are backed by reproducible eval output and labelled as synthetic or real holdout.
  - Evidence:

## Customer Intelligence, Claims, And Chargebacks

- [ ] `P0` Customers overview filters work.
  - Check all/new/review/contacted/resolved/cleared, search, pagination, sorting, empty states.
  - Evidence:
- [ ] `P0` Customer detail page loads correct identity, order, support, activity, and evidence data for the selected merchant only.
  - Evidence:
- [ ] `P0` Customer drawer opens, changes selected order correctly, and does not show stale data after list reordering or filter changes.
  - Evidence:
- [ ] `P0` Investigation status changes persist and emit audit/activity events.
  - Evidence:
- [ ] `P0` Notes create, edit/delete if supported, and remain merchant-scoped.
  - Evidence:
- [ ] `P0` Claims queue loads for users with view permission.
  - Evidence:
- [ ] `P0` Claim status machine permits valid transitions and blocks invalid ones.
  - Check open, pending, under review, evidence requested, snoozed, escalated, resolved, denied/refunded as applicable.
  - Evidence:
- [ ] `P0` Claim assignment, view tracking, snooze, reopen, reverse, outcome, and support-context routes work.
  - Evidence:
- [ ] `P0` Claim review drafts do not submit stale or wrong claim data after navigation.
  - Evidence:
- [ ] `P0` Claim customer-response copy flow works and logs the event.
  - Evidence:
- [ ] `P0` SLA/stale claim jobs mark records correctly without touching another merchant's claims.
  - Evidence:
- [ ] `P0` Chargeback list and detail pages show evidence packages, states, and errors correctly.
  - Evidence:
- [ ] `P1` Bulk dismiss/export actions require proper permissions and show confirmation.
  - Evidence:
- [ ] `P1` Watchlist page and deprecated watchlist tables are either product-supported or hidden with migration-safe behavior.
  - Evidence:

## Evidence Packages And PDFs

- [ ] `P0` Evidence package creation works from customer, audit, claim, and chargeback entry points.
  - Evidence:
- [ ] `P0` PDF generation completes for small, typical, and large evidence packages.
  - Evidence:
- [ ] `P0` PDF content is accurate.
  - Check merchant, customer, order IDs, dates, amounts, confidence grade, signal labels, caveats, and no hidden debug text.
  - Evidence:
- [ ] `P0` CE 3.0 checks are framed as eligibility/readiness support, not guaranteed compliance or win probability.
  - Evidence:
- [ ] `P0` Evidence download tokens expire, are single-scope, and cannot download another merchant's package.
  - Evidence:
- [ ] `P0` Evidence storage cleanup removes expired artifacts without deleting active packages.
  - Evidence:
- [ ] `P1` PDF visual layout is manually reviewed in at least Chrome PDF viewer and macOS Preview.
  - Evidence:
- [ ] `P1` Evidence export remains usable when support-case data is missing.
  - Evidence:

## Commerce Integrations

- [ ] `P0` Shopify OAuth install works from settings and onboarding.
  - Evidence:
- [ ] `P0` Shopify OAuth callback validates state, shop domain, merchant ownership, and token exchange failures safely.
  - Evidence:
- [ ] `P0` Shopify disconnect revokes or disables connection and updates UI state.
  - Evidence:
- [ ] `P0` Shopify order, refund, fulfillment, and claim-related webhooks are signature-verified and idempotent.
  - Evidence:
- [ ] `P0` Shopify sync-audit creates correct processing jobs and source labels.
  - Evidence:
- [ ] `P0` Shopify order normalization maps IDs, emails, names, addresses, phones, totals, statuses, refunds, fulfillments, IP/device fields where available.
  - Evidence:
- [ ] `P0` WooCommerce connection, status, disconnect, and webhooks work or are hidden from merchant handoff.
  - Evidence:
- [ ] `P0` BigCommerce install, callback, status, disconnect, and webhooks work or are hidden from merchant handoff.
  - Evidence:
- [ ] `P0` Commerce webhook idempotency blocks duplicate processing.
  - Evidence:
- [ ] `P0` Store connection credentials are encrypted at rest and never sent to the browser.
  - Evidence:
- [ ] `P1` Integration pages show clear connected, disconnected, error, expired, and partial-sync states.
  - Evidence:
- [ ] `P1` Backfill scripts are tested against staging before production use.
  - Evidence:

## Helpdesk And Widget Integrations

- [ ] `P0` Gorgias support connection setup works.
  - Evidence:
- [ ] `P0` Gorgias webhook secret verification blocks unsigned or wrong-secret requests.
  - Evidence:
- [ ] `P0` Gorgias ticket/customer identity resolution links the right customer and never leaks another merchant's context.
  - Evidence:
- [ ] `P0` Gorgias widget renders locked, unlockable, unlocked, no-match, and error states.
  - Evidence:
- [ ] `P0` Widget unlock consumes context credits exactly once per unlock.
  - Evidence:
- [ ] `P0` Widget/profile/evidence tokens expire and are scoped to the merchant and ticket/customer context.
  - Evidence:
- [ ] `P0` Freshdesk support connection and webhook either work end to end or are hidden.
  - Evidence:
- [ ] `P0` Zendesk support connection and verify-install either work end to end or are hidden.
  - Evidence:
- [ ] `P1` Support case linking appears on customer profile and claim review with correct timestamps and source labels.
  - Evidence:
- [ ] `P1` Helpdesk sync handles invalid credentials, provider downtime, duplicate tickets, deleted tickets, and changed customer emails.
  - Evidence:

## Billing, Plans, Entitlements, And Credits

- [ ] `P0` Stripe webhook route verifies signatures and rejects invalid payloads.
  - Evidence:
- [ ] `P0` Subscription created, updated, canceled, paused, resumed, and payment-failed events update merchant access correctly.
  - Evidence:
- [ ] `P0` Billing settings page shows accurate current plan, renewal/cancel state, payment issue state, and usage.
  - Evidence:
- [ ] `P0` Product entitlement gates match plan definitions.
  - Check dashboard, lookup, context unlock, evidence packages, integrations, API access, team seats, reports.
  - Evidence:
- [ ] `P0` Context credit allowance resolves correctly for every tier.
  - Evidence:
- [ ] `P0` Context credit consumption is atomic and cannot go negative under concurrent unlocks.
  - Evidence:
- [ ] `P0` Soft cap and no-unlimited behavior match product decision.
  - Evidence:
- [ ] `P0` Billing lifecycle cron runs, is authorized, and sends expected state transitions.
  - Evidence:
- [ ] `P0` Billing email notifications are correct, branded, and do not expose sensitive data.
  - Evidence:
- [ ] `P0` Failed payment or canceled plan cannot retain paid-only access after grace rules expire.
  - Evidence:
- [ ] `P1` Stripe test clocks or equivalent fixtures cover renewal, trial end, failed payment, and cancellation.
  - Evidence:
- [ ] `P1` Plan copy and tier chart match actual entitlements.
  - Evidence:

## API Keys And Public API

- [ ] `P0` API key creation, display-once behavior, rotation/revocation, and audit trail work.
  - Evidence:
- [ ] `P0` API keys are hashed or otherwise stored safely and never retrievable in plaintext after creation.
  - Evidence:
- [ ] `P0` API key scopes and merchant IDs are enforced on all `/api/v1/*` routes.
  - Evidence:
- [ ] `P0` API rate limiting works per key/merchant and returns safe error bodies.
  - Evidence:
- [ ] `P0` `/api/v1/customers`, `/api/v1/lookup`, `/api/v1/evidence`, and `/api/v1/profile-link` validate inputs with safe errors.
  - Evidence:
- [ ] `P0` API responses do not expose internal IDs, raw cross-merchant PII, stack traces, service role errors, or debug fields.
  - Evidence:
- [ ] `P1` API docs/examples match the live response schema.
  - Evidence:

## Chrome Extension

- [ ] `P0` Extension download route works in production and includes traced build files.
  - Evidence:
- [ ] `P0` Extension manifest host permissions match the production API base.
  - Evidence:
- [ ] `P0` Extension cannot connect to a preview or stale API base in production release.
  - Evidence:
- [ ] `P0` Extension popup/content/background scripts handle logged-out, no API key, revoked key, rate-limited, and network-error states.
  - Evidence:
- [ ] `P0` Extension does not scrape or transmit unrelated page data.
  - Evidence:
- [ ] `P1` Extension is tested in a clean Chrome profile.
  - Evidence:

## Security And Abuse Resistance

- [ ] `P0` Dependency audit is closed or exception-approved.
  - Evidence:
- [ ] `P0` Static security scan service-role findings are triaged with proof.
  - Evidence:
- [ ] `P0` All mutation routes verify authentication, merchant context, permissions, and CSRF/session assumptions.
  - Evidence:
- [ ] `P0` All webhook routes verify provider signatures before parsing side effects.
  - Evidence:
- [ ] `P0` All internal routes are blocked from normal merchants and unauthenticated users.
  - Check: `/internal`, `/api/internal/*`, eval/network-metrics pages.
  - Evidence:
- [ ] `P0` Query parameters and path IDs cannot be used for IDOR across merchant data.
  - Evidence:
- [ ] `P0` Export routes cannot be used for CSV injection or formula injection.
  - Evidence:
- [ ] `P0` File uploads reject script/formula payloads where relevant and sanitize output.
  - Evidence:
- [ ] `P0` CSP is configured and CSP reports do not contain sensitive data.
  - Evidence:
- [ ] `P0` CORS settings do not allow arbitrary merchant-data reads.
  - Evidence:
- [ ] `P0` Rate limits exist for login-sensitive, lookup, public audit, API-key, widget unlock, and webhook-adjacent abuse paths.
  - Evidence:
- [ ] `P0` Logs, Sentry, analytics, and audit trails redact emails, addresses, tokens, API keys, auth headers, and service-role errors.
  - Evidence:
- [ ] `P0` Error pages and API errors never expose stack traces or SQL/provider internals to merchants.
  - Evidence:
- [ ] `P1` Pen-test style manual pass completed for top merchant workflows.
  - Evidence:

## Privacy, Compliance, And Data Handling

- [ ] `P0` Merchant-scoped raw PII is isolated by tenant and RLS.
  - Evidence:
- [ ] `P0` Cross-merchant identity graph uses the approved normalization/hash/plaintext strategy and product/legal has signed off.
  - Evidence:
- [ ] `P0` K-anonymity is enforced in SQL and app code for cross-merchant profile search/lookup.
  - Evidence:
- [ ] `P0` Every live lookup is logged and counted.
  - Evidence:
- [ ] `P0` Right-to-deletion process is tested for one customer email and one merchant account.
  - Evidence:
- [ ] `P0` Public audit retention and purge behavior matches the legal page.
  - Evidence:
- [ ] `P0` Data export contains only the merchant's own data plus approved privacy-gated signals.
  - Evidence:
- [ ] `P0` Merchant-facing copy avoids prohibited claims and banned terminology.
  - Evidence:
- [ ] `P0` DPA, privacy policy, pilot terms, and data-handling pages are reviewed against actual data flows.
  - Evidence:
- [ ] `P1` Access audit log is queryable for support investigations.
  - Evidence:
- [ ] `P1` Data retention schedule has owners and automated jobs for each data category.
  - Evidence:

## UX, Accessibility, And Browser Coverage

- [ ] `P0` Primary merchant workflows are manually tested on desktop Chrome.
  - Evidence:
- [ ] `P0` Critical path is tested on mobile viewport even if full app is desktop-first.
  - Evidence:
- [ ] `P0` Mobile unsupported or constrained states are intentional and clear.
  - Evidence:
- [ ] `P0` No text overlaps, clipped labels, broken buttons, empty skeletons stuck forever, or layout jumps in core pages.
  - Evidence:
- [ ] `P0` Keyboard navigation works for forms, dialogs, drawers, tables, command palette, filter sheets, and menus.
  - Evidence:
- [ ] `P0` Focus is trapped in modals/drawers and restored after close.
  - Evidence:
- [ ] `P0` Buttons, links, inputs, selects, tables, and status messages have accessible names and semantics.
  - Evidence:
- [ ] `P0` Error banners are actionable and do not blame the merchant.
  - Evidence:
- [ ] `P0` Copy is calm, factual, and avoids unsupported fraud accusations.
  - Evidence:
- [ ] `P1` Desktop Safari and Firefox smoke tests pass.
  - Evidence:
- [ ] `P1` Reduced-motion, dark/light theme, zoom at 125/150 percent, and narrow viewport checks pass.
  - Evidence:

## Performance, Reliability, And Scale

- [ ] `P0` Dashboard, claims, customers, lookup, reports, and settings load within agreed staging budgets.
  - Evidence:
- [ ] `P0` App does not block route transitions on redundant slow integration/status calls.
  - Evidence:
- [ ] `P0` Large merchant CSV processing completes without exhausting memory or serverless duration.
  - Evidence:
- [ ] `P0` Background queue processing is idempotent and retry-safe.
  - Evidence:
- [ ] `P0` Webhook handlers are idempotent under duplicate delivery.
  - Evidence:
- [ ] `P0` Provider outages degrade gracefully.
  - Check Stripe, Shopify, Supabase, Gorgias/Freshdesk/Zendesk, Amplitude/Sentry.
  - Evidence:
- [ ] `P0` Supabase connection usage is bounded under concurrent uploads and page loads.
  - Evidence:
- [ ] `P0` Search and lookup queries are indexed and do not full-scan large tenant tables.
  - Evidence:
- [ ] `P1` Load test with multiple merchants running uploads/lookups/support webhooks concurrently.
  - Evidence:
- [ ] `P1` Alert thresholds exist for job failure rate, webhook failure rate, queue depth, error rate, and slow DB queries.
  - Evidence:

## Observability And Operations

- [ ] `P0` Sentry is enabled in production with source maps and PII redaction.
  - Evidence:
- [ ] `P0` Critical server errors alert the release owner.
  - Evidence:
- [ ] `P0` Billing/webhook failures alert someone who can act.
  - Evidence:
- [ ] `P0` CSV processing failures are visible to support and recoverable.
  - Evidence:
- [ ] `P0` Audit trail records high-risk actions.
  - Check login-sensitive actions if available, team changes, billing changes, API keys, integrations, claims, exports, deletion.
  - Evidence:
- [ ] `P0` Support runbook exists for merchant onboarding, upload failure, integration failure, billing issue, deletion request, and false-positive dispute.
  - Evidence:
- [ ] `P0` Rollback playbook exists and was rehearsed in staging.
  - Evidence:
- [ ] `P1` Product analytics events are named, deduplicated, and exclude raw PII.
  - Evidence:
- [ ] `P1` Release notes identify merchant-visible changes and known limitations.
  - Evidence:

## Manual Merchant Journey Walkthroughs

Run each journey with a fresh staging merchant and record screen capture or screenshots.

### Journey A: New CSV-Only Merchant

- [ ] `P0` Merchant signs up and completes onboarding without connecting a commerce integration.
- [ ] `P0` Merchant downloads CSV template.
- [ ] `P0` Merchant uploads valid CSV.
- [ ] `P0` Merchant maps columns and sees clear data-quality warnings.
- [ ] `P0` Processing completes and dashboard updates.
- [ ] `P0` Merchant opens customers list, filters review-worthy customers, and opens a customer detail page.
- [ ] `P0` Merchant changes investigation status and adds a note.
- [ ] `P0` Merchant builds an evidence package and downloads PDF.
- [ ] `P0` Merchant exports audit results CSV.
- [ ] `P0` Merchant logs out and back in; all state persists.
- Evidence:

### Journey B: Shopify Merchant

- [ ] `P0` Merchant connects Shopify.
- [ ] `P0` Connection status updates in settings, upload, and dashboard.
- [ ] `P0` Merchant syncs/imports orders.
- [ ] `P0` Refund/fulfillment/order webhooks update records idempotently.
- [ ] `P0` Claims are detected or imported as intended.
- [ ] `P0` Merchant disconnects Shopify and UI/data access behave as expected.
- Evidence:

### Journey C: Helpdesk Merchant

- [ ] `P0` Merchant connects Gorgias or selected supported helpdesk.
- [ ] `P0` Webhook test creates/updates support case.
- [ ] `P0` Support case appears on customer profile and claim review.
- [ ] `P0` Widget opens inside provider context.
- [ ] `P0` Widget unlock consumes credit and shows correct customer context.
- [ ] `P0` Wrong customer/ticket, missing email, and no-match states are safe.
- Evidence:

### Journey D: Paid Plan Merchant

- [ ] `P0` Merchant starts checkout or is assigned a plan in staging.
- [ ] `P0` Stripe webhook activates plan and entitlements.
- [ ] `P0` Context credits/usage appear correctly.
- [ ] `P0` Paid-only feature gates unlock.
- [ ] `P0` Failed payment or cancellation removes access according to rules.
- [ ] `P0` Billing emails and settings page reflect the state.
- Evidence:

### Journey E: Multi-Merchant Isolation

- [ ] `P0` Create two merchants with similar customers and overlapping order data.
- [ ] `P0` Merchant A cannot view Merchant B jobs, customers, claims, notes, evidence, support cases, API keys, billing, integrations, exports, or widget context.
- [ ] `P0` Cross-merchant signal appears only when k-anonymity threshold is met.
- [ ] `P0` Sub-threshold cross-merchant data returns no detail and no inference leak.
- Evidence:

### Journey F: Failure Recovery

- [ ] `P0` Invalid CSV fails safely with clear copy.
- [ ] `P0` Processing interruption can be recovered or retried.
- [ ] `P0` Provider webhook duplicate does not duplicate records.
- [ ] `P0` Provider outage shows non-destructive error state.
- [ ] `P0` Evidence PDF failure can be retried.
- [ ] `P0` Billing webhook failure is visible and replay-safe.
- Evidence:

## Pre-Handoff Support Readiness

- [ ] `P0` Merchant onboarding guide exists.
  - Evidence:
- [ ] `P0` CSV export guide exists for Shopify, WooCommerce, BigCommerce, and generic CSV where supported.
  - Evidence:
- [ ] `P0` Support has a list of known limitations and approved wording.
  - Evidence:
- [ ] `P0` Support has escalation contacts for engineering, billing, privacy, and integrations.
  - Evidence:
- [ ] `P0` Support can identify a merchant by account, store connection, job ID, claim ID, Stripe customer ID, and support provider connection.
  - Evidence:
- [ ] `P0` Support can safely request logs without asking merchants for secrets.
  - Evidence:
- [ ] `P1` Merchant-facing status/incident process is defined.
  - Evidence:

## Final Go / No-Go Signoff

- [ ] `P0` All P0 items complete.
- [ ] `P0` Open P0 exceptions are documented with owner, expiry, blast radius, and rollback.
- [ ] `P0` Release owner reviewed automated test evidence.
- [ ] `P0` Product reviewed merchant-facing workflows and copy.
- [ ] `P0` Security/privacy reviewed data isolation, service-role usage, webhooks, and retention.
- [ ] `P0` Support reviewed runbooks and known limitations.
- [ ] `P0` Rollback owner is available during first merchant handoff.
- [ ] `P0` First merchant handoff is limited, monitored, and has a named support channel.

Decision:

- [ ] GO for internal dogfood only
- [ ] GO for controlled merchant pilot
- [ ] GO for broader merchant rollout
- [ ] NO-GO

Approvers:

| Area | Name | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
| Engineering | TBD | TBD | TBD | TBD |
| Product | TBD | TBD | TBD | TBD |
| Security/Privacy | TBD | TBD | TBD | TBD |
| Support/Ops | TBD | TBD | TBD | TBD |
| Founder/Business Owner | TBD | TBD | TBD | TBD |
