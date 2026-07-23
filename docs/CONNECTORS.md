# Connectors

Unauth separates provider presentation metadata from executable adapter behavior.

`lib/integrations/providers` is the canonical provider catalogue. It owns stable IDs, labels, category, build status (`live`, `partial`, or `slot_only`), a ten-dimension lifecycle proof matrix, setup paths, help text, and logos. UI code must read this registry instead of maintaining local provider maps.

The merchant-facing build-maturity label (`live`, `beta`, `partial`, or `planned`) is never read from `buildStatus` directly — it is *derived* from the lifecycle matrix by `deriveProviderDisplayStage()` (`lib/integrations/registry.ts`). Implementation, passing automated tests, and controlled-runtime verification are distinct evidence levels. "Live" requires fresh, complete, passing controlled evidence (environment, controlled account, date, build, scenario, result, limitations, and artifact) for every applicable lifecycle dimension. Provider kind, including `manual_upload`, and per-merchant connection health never upgrade build maturity. See `docs/audits/unauth-mvp-plus/08-provider-proof-matrix.md` for the full per-provider breakdown and evidence.

`lib/connectors/registry.ts` contains providers that implement the generic runtime contract. Those adapters declare capabilities such as pull, webhook ingestion, reconciliation, and disconnect, plus their own `verificationStatus` (`verified`/`partial`/`unverified`) describing how much of that *generic* contract they implement. Dedicated provider routes may contain more implementation than a generic adapter, but neither adapter metadata nor code presence is controlled-runtime proof. A catalogue entry marked `partial` may have a specialized setup or webhook path without yet implementing or verifying that complete generic contract.

## Lifecycle

1. Authenticate or receive credentials through the provider-specific setup route.
2. Store the connection under the owning merchant.
3. Verify webhook signatures before accepting data.
4. Normalize source records into canonical entities while retaining source IDs and raw provenance.
5. Make writes idempotent and merchant-scoped.
6. Reconcile missing or changed records on a scheduled pull where supported.
7. Disconnect by revoking subscriptions or credentials and recording the resulting state; do not erase historical operational records.

Adding a provider requires one catalogue definition and, when executable, one adapter registered through the connector contract. Add contract tests for metadata, merchant isolation, idempotency, capability reporting, and disconnect behavior. Do not add provider logos, aliases, or status labels in page components.
