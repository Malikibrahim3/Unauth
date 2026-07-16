# Connectors

Unauth separates provider presentation metadata from executable adapter behavior.

`lib/integrations/providers` is the canonical provider catalogue. It owns stable IDs, labels, category, availability (`live`, `partial`, or `planned`), setup paths, help text, and logos. UI code must read this registry instead of maintaining local provider maps.

`lib/connectors/registry.ts` contains providers that implement the generic runtime contract. Those adapters declare capabilities such as pull, webhook ingestion, reconciliation, and disconnect. A catalogue entry marked `partial` may have a specialized setup or webhook path without yet implementing that complete generic contract.

## Lifecycle

1. Authenticate or receive credentials through the provider-specific setup route.
2. Store the connection under the owning merchant.
3. Verify webhook signatures before accepting data.
4. Normalize source records into canonical entities while retaining source IDs and raw provenance.
5. Make writes idempotent and merchant-scoped.
6. Reconcile missing or changed records on a scheduled pull where supported.
7. Disconnect by revoking subscriptions or credentials and recording the resulting state; do not erase historical operational records.

Adding a provider requires one catalogue definition and, when executable, one adapter registered through the connector contract. Add contract tests for metadata, merchant isolation, idempotency, capability reporting, and disconnect behavior. Do not add provider logos, aliases, or status labels in page components.
