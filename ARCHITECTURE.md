# Architecture

Unauth is a Next.js App Router application backed by Supabase. Its core domain is source-agnostic: provider adapters ingest records into canonical merchant-scoped entities, then domain services create one operational timeline across payout decisions, losses, and recoveries.

## System boundaries

- `app/(app)` contains the authenticated merchant product; `app/(public)` contains public pages.
- `app/api` authenticates requests, verifies provider signatures, and delegates to domain modules.
- `lib/canonical` defines provider-neutral records, money, statuses, and validation.
- `lib/connectors` defines executable connector capabilities, ingestion, synchronization, reconciliation, and disconnect behavior.
- `lib/integrations/providers` is the canonical catalogue for provider identity, category, availability, help text, and logo metadata.
- `lib/cases`, `lib/payouts`, `lib/finance`, `lib/recovery`, `lib/rules`, and `lib/events` own operational behavior.
- `lib/supabase` owns database client and schema conventions. `supabase/migrations` is the immutable database history.

Provider metadata and executable adapters are deliberately separate. A provider can be visible as `partial` before it implements the complete generic connector contract. See [`docs/CONNECTORS.md`](docs/CONNECTORS.md).

## Canonical data flow

1. A signed provider webhook, scheduled sync, CSV import, or manual action enters through an authenticated boundary.
2. The connector records source provenance and normalizes data into canonical customers, orders, shipments, tickets, payments, and events.
3. Idempotent matching links records only inside the owning merchant workspace.
4. Domain events project the case timeline and append financial ledger entries.
5. Merchant rules produce explainable recommendations. They never autonomously approve, deny, refund, or close a case.
6. Recorded merchant decisions update payout exposure, loss attribution, recoverability, and recovery work.

## Canonical contracts

- Claim lifecycle states and active/final groupings: `lib/claims/statusMachine.ts`
- Provider presentation metadata: `lib/integrations/registry.ts`
- Executable connector adapters: `lib/connectors/registry.ts`
- Authenticated routes and navigation: `lib/appRoutes.ts` and `components/nav/SidebarInner.tsx`
- Database names and clients: `lib/supabase`
- Authenticated visual tokens and primitives: `styles/authenticated`

Compatibility redirects are defined only in `next.config.js`. Do not create duplicate redirect pages or middleware rules.

## Security invariants

- Every query and mutation is scoped to the authenticated merchant; service-role access never replaces an authorization check.
- Webhooks are verified before parsing or mutation, and replay-sensitive writes are idempotent.
- Raw provider payloads retain provenance. Canonical records do not erase their source identifiers.
- Money is represented in minor units with an explicit currency. Financial history is append-only.
- Secrets remain server-only and are accessed through the validated environment contract in `lib/utils/env.ts`.
- Scoring, matching, and identity thresholds are independent calibrated systems and are not changed as incidental refactors.

## Legacy compatibility

Some historical ingestion and scoring modules remain because current tests, imported data, or operational projections still depend on them. They are supporting subsystems, not separate merchant-facing products. Remove a compatibility path only after its database, runtime, test, and access-log dependencies have been disproved.
