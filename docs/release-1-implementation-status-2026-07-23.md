# Release 1 implementation status

**Status:** Implemented and verified locally; not deployed or approved for a real-merchant pilot

**Prepared:** 23 July 2026

**Baseline:** `perf/architecture-overhaul` at `2fef68a3`

**Implementation contract:** [`../unauth-product-map-release-1.md`](../unauth-product-map-release-1.md)

**Current-state audit:** [`audits/current-product-capability-baseline-2026-07-23.md`](audits/current-product-capability-baseline-2026-07-23.md)

This document records what was implemented from the Release 1 plan, the local evidence obtained, and the work that still requires external authority or a controlled environment. “Implemented locally” does not mean “released”: no production migration, provider mutation, credential rotation, customer communication, payout, refund, or recovery submission was performed.

## 1. Outcome

The repository now implements the planned merchant-controlled loop:

`case → evidence gap → investigation → send/manual record → response → canonical evidence → responsibility confirmation/correction → explicit recovery handoff`

The implementation keeps the existing product contracts intact:

- `support_payout_cases` remains the canonical customer case.
- `case_clarification_requests` is extended as the investigation record.
- `evidence_items` and `evidence_links` remain canonical evidence.
- `work_tasks` and notifications remain the operational queue.
- Customer decision, source-confirmed outcome, loss, and recovered cash remain separate facts.
- External actions remain merchant controlled.
- Existing investigation history remains readable when new investigation writes are disabled.

## 2. Implemented workstreams

| Workstream | Delivered state |
|---|---|
| Lifecycle and tenant integrity | Evaluation is separated from lifecycle persistence; the Gorgias widget is read-only; relationship constraints reject foreign merchant parents; partner rules validate ownership. |
| Credential integrity | Revoking a merchant API key also revokes its paired widget token; validation checks the parent key remains active. |
| Permissions | Viewer defaults no longer include settings, team, or audit export. Admin and owner retain those capabilities. Denied checks are audited and still fail closed if the audit projection is unavailable. |
| Delivered/POD semantics | A delivered scan is not proof of correct delivery. Raw delivery artefacts remain inconclusive until a merchant records a `consistent`, `inconsistent`, or `unclear` photo finding. |
| Missing-item semantics | “Item missing inside a delivered parcel” is classified and retained as normalized `missing_item`, while the compatibility claim type remains supported. |
| Case issue correction | Authorized users can correct the normalized issue through an idempotent, audited, version-aware API and receive refreshed evaluation. |
| Investigation recommendation | Deterministic routing uses case issue, evidence gap, carrier, fulfilment/warehouse context, configured partners, and response SLA. |
| Investigation lifecycle | Draft, edit, primary selection, manual/portal/API mark-sent, email send, chase, structured response, close, and cancel are implemented with state/version/idempotency guards. |
| Dispatch integrity | Email uses a durable dispatch ledger, lease/claim/complete RPCs, request hashing, provider acceptance IDs, and provider idempotency. Provider failure leaves the investigation draft truthful and offers manual fallback. |
| Attachments | Private investigation storage, size/type/hash validation, quarantine state, signed download, scan cron, canonical-evidence projection, and cleanup/privacy hooks are implemented. |
| Work and notification projection | Waiting-response and overdue investigation tasks, assignment/deadline notifications, queue counts, deep links, and case/widget summaries are implemented. |
| Responsibility | Merchant confirmation/correction is versioned, idempotent, evidence-linked, rationale-protected, evented, and protected from later advisory evaluation overwrite. |
| Recovery handoff | Recovery creation/update is explicit and guarded by confirmed merchant loss/responsibility; no external claim submission is performed. |
| Onboarding | Profile save and final setup completion are separate. Final completion requires verified Shopify plus a supported helpdesk. Shopify OAuth uses an allowlisted onboarding return path. |
| Entitlements | App, widget, and v1 evidence paths share the same credit precheck/spend contract. Credits are spent only after successful package persistence, with cleanup on a spend race. |
| Product truthfulness | Network context, legacy public claim-gate writers, generic event intake, Flow publication, investigation writes, and investigation email each fail closed behind explicit gates. |
| Generic event status | An authenticated merchant-scoped event-status endpoint is available; event acceptance remains disabled unless the processor gate is enabled. |
| Reporting | Trend buckets honor the selected timezone; drill-down keeps timezone; normalized issue drives loss category; `missing_item` maps to fulfilment/warehouse; recovery KPI copy distinguishes recovered value. |
| Privacy | Subject erasure and account deletion cover investigation messages, attachments, dispatch data, evidence provenance, and storage cleanup references. |
| Build contract | Reusable exports were removed from Next `route.ts` modules. The production build is pinned to webpack after the default Turbopack build demonstrably stalled. |

## 3. Product and API surfaces

The case workspace now includes:

- Investigation recommendation and request composer.
- Existing-request list and primary state.
- Draft editing and copy/manual fallback.
- Email send only when both global and merchant gates pass.
- Portal/manual/API send recording.
- Chase, response, closure, and cancellation controls.
- Investigation timeline and attachment controls.
- Delivery-photo finding.
- Responsibility confirmation/correction.
- Explicit recovery handoff.

Primary added routes:

- `GET|POST /api/claims/[claimId]/investigations`
- `PATCH /api/claims/[claimId]/investigations/[investigationId]`
- `POST .../send`
- `POST .../mark-sent`
- `POST .../chase`
- `POST .../response`
- `POST .../close`
- `POST .../cancel`
- `GET|POST .../attachments`
- `GET .../attachments/[attachmentId]/download`
- `GET|POST /api/claims/[claimId]/delivery-photo-finding`
- `POST /api/claims/[claimId]/issue`
- `POST /api/claims/[claimId]/responsibility`
- `POST /api/claims/[claimId]/recovery-handoff`
- `GET|PUT /api/settings/investigations`
- `GET /api/v1/ingest/events/[eventId]`
- `GET|POST /api/cron/scan-investigation-attachments`

All investigation mutations require authentication, the selected merchant context, `SUBMIT_PAYOUT_DECISIONS`, same-merchant parent resolution, an idempotency key, and the global write gate.

## 4. Database changes

Seven forward migrations were added after the eight-file canonical baseline:

1. `20260723100000_release1_relationship_credential_integrity.sql`
2. `20260723150000_release1_case_issue_correction.sql`
3. `20260723200000_release1_investigations.sql`
4. `20260723300000_release1_responsibility_recovery.sql`
5. `20260723400000_release1_investigation_email_dispatch.sql`
6. `20260723500000_release1_investigation_privacy.sql`
7. `20260723600000_release1_reporting_truthfulness.sql`

The local migration ledger contains all 15 active migrations in order.

The current local schema manifest is:

| Object | Count |
|---|---:|
| Tables | 137 |
| Views | 2 |
| Sequences | 2 |
| Enums | 45 |
| Columns | 1,956 |
| Not-null columns | 1,103 |
| Constraints | 726 |
| Indexes | 514 |
| Functions | 84 |
| Triggers | 95 |
| Policies | 152 |

Canonical schema hash:

`349e2ecaea756975ba84ce36928f3a80bbdeb039975dd472e28f5a32c7ecd9ee`

Generated Supabase types and the canonical migration/rehearsal manifests were updated to this state.

## 5. Fail-closed rollout controls

The following flags default to disabled when absent:

| Flag | Effect |
|---|---|
| `INVESTIGATIONS_ENABLED` | Allows investigation mutations. Reads and historical facts remain available while disabled. |
| `INVESTIGATION_EMAIL_DISPATCH_ENABLED` | Allows the external email transport only when investigation writes are also enabled. |
| Merchant `investigation_email_enabled` | Enables email for one merchant and requires a reply-to address; it cannot override the global transport gate. |
| `PUBLIC_CLAIM_GATE_ENABLED` | Allows legacy/public claim-gate writers only after canonical transition remediation is approved. |
| `GENERIC_EVENT_INGESTION_ENABLED` | Allows generic event acceptance only with an active processor/status contract. |
| `WORKFLOW_PUBLICATION_ENABLED` | Allows Flow publication/activation/execution only after replay and idempotency proof. |
| `NETWORK_CONTEXT_ENABLED` | Allows cross-merchant/network context only after product, privacy, and runtime approval. |

Deployed environments also validate the investigation malware-scanner URL/token, Resend key, cron secret, rate-limit service, Shopify credentials, and other existing production requirements.

Recommended initial production values:

```text
INVESTIGATIONS_ENABLED=false
INVESTIGATION_EMAIL_DISPATCH_ENABLED=false
PUBLIC_CLAIM_GATE_ENABLED=false
GENERIC_EVENT_INGESTION_ENABLED=false
WORKFLOW_PUBLICATION_ENABLED=false
NETWORK_CONTEXT_ENABLED=false
```

Enable one capability at a time only after its named gate below passes.

## 6. Local verification evidence

| Check | Result |
|---|---|
| TypeScript | Pass on the final tree. |
| ESLint | Pass with zero warnings on `app`, `components`, and `lib`. |
| Authenticated design guard | Pass; 403 files checked. |
| Production build | Pass with Next.js 16.2.7 webpack; 93 static pages generated and all route types validated. |
| Full Jest run | 327 suites passed, 2,446 tests passed, 3 skipped, 1 snapshot passed. |
| Post-build affected suites | 63 Shopify/Gorgias/route-gate tests passed after moving invalid route exports; 23 investigation/truthfulness/widget tests passed after adding kill switches. |
| Supabase contract audit | Pass; 137 live tables checked. |
| Provider-suite TypeScript | Pass. |
| Investigation PostgreSQL runtime | Pass, rollback-only, before the final app-only gate/build changes. |
| Privacy erasure PostgreSQL runtime | Pass, rollback-only. |
| Source-to-recovery PostgreSQL runtime | Pass, rollback-only, including normalized `missing_item` report categorization. |
| Current schema manifest/hash | Pass by read-only inspection. |
| Migration ledger | Pass; all 15 migrations applied locally in order. |
| Whitespace integrity | Pass. |

The full Jest run initially exposed stale expectations for the new Investigation widget row and for the corrected POD contract. Those fixtures now require an explicit merchant-reviewed consistent finding before asserting delivery-confirmed evidence. The run also exposed and fixed an admin/owner permission inheritance regression.

The default Turbopack production build stalled without advancing its build output. The equivalent webpack production build completed successfully, so `npm run build` now explicitly selects webpack.

The destructive fresh-replay and rollout-rehearsal scripts were not rerun against the populated local database because they execute `supabase db reset --local`. Their active migration list, object counts, and expected schema hash were updated from read-only current-schema evidence. They must be run in a disposable release environment before deployment.

## 7. External and approval-dependent release gates

These items are not solvable from the repository alone and remain required before the status can change to “release ready”:

1. Select and approve the exact pilot merchant, Shopify store, helpdesk, fulfilment source, and carrier evidence source.
2. Prove connect, initial import, incremental update/webhook, duplicate, stale event, reconciliation, expiry, revocation, disconnect, reconnect, and tenant isolation on the exact build.
3. Verify the outbound sender domain, SPF, DKIM, DMARC, reply-to behavior, provider acceptance/replay, bounce behavior, and controlled recipient allowlist.
4. Approve investigation and attachment retention or explicitly approve no time-based purge.
5. Reconcile staging and production schema, RLS policies, grants, storage buckets, scheduled jobs, and runtime configuration read-only.
6. Create a backup and demonstrate restore in the target environment.
7. Rotate any exposed or shared credentials and prove old values fail.
8. Run the fresh canonical replay twice and the rollout/rollback rehearsal in a disposable environment.
9. Run the release browser suite on the frozen build and synthetic release fixture.
10. Complete three fresh-account rehearsals and one non-founder usability/accessibility completion.
11. Name the pilot support owner, rollback owner, success metric, stop conditions, limitations, and data agreement.
12. Keep the first seven days in supervised shadow mode.

No production migration or external provider action should occur until one consolidated rollout packet authorizes the exact environment and build.

## 8. Deployment sequence

1. Freeze and identify the release commit.
2. Approve D-01 through D-12 from the implementation contract.
3. Run the destructive canonical replay and rollout rehearsal in a disposable local environment.
4. Run the complete Jest, build, browser, accessibility, security, and PostgreSQL gate on that commit.
5. Capture a read-only staging/production parity report and backup/restore evidence.
6. Apply migrations in timestamp order to staging.
7. Keep every Release 1 write/external flag disabled.
8. Run controlled source/provider verification.
9. Enable `INVESTIGATIONS_ENABLED` for the internal/synthetic cohort.
10. Prove manual and portal paths.
11. Prove sender-domain and provider-idempotency behavior with controlled addresses.
12. Enable `INVESTIGATION_EMAIL_DISPATCH_ENABLED`, then the merchant-level email setting, for the controlled cohort only.
13. Complete fresh-account and non-founder rehearsals.
14. Apply the same reviewed migration/config packet to production.
15. Start one-merchant shadow operation with the existing process authoritative.

## 9. Rollback

- Set `INVESTIGATION_EMAIL_DISPATCH_ENABLED=false` to stop new external email immediately.
- Set `INVESTIGATIONS_ENABLED=false` to make the investigation domain read-only.
- Keep generic intake, public claim gate, Flow publication, and network context disabled unless independently approved.
- Roll back application code while preserving investigation, dispatch, task, evidence, responsibility, and audit history.
- Reconcile provider-accepted dispatches by their durable provider/idempotency IDs before retrying.
- Use a forward repair for database defects. Do not reverse applied data migrations destructively.
- Restore from the approved backup only for a rehearsed database stop condition.

## 10. Definition of current status

The implementation portion of Release 1 is complete in the working tree. Release 1 itself remains incomplete until the provider, production, policy, rehearsal, browser, and pilot gates in section 7 have repeatable evidence on a frozen commit.
