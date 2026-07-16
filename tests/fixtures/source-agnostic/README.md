# Source-agnostic test fixtures

Synthetic payloads used by the source-agnostic MVP+ normalization/snapshot tests
(Phases 1–3 of `ARCHITECTURE.md`).

- No production credentials, tokens, or real customer data. All identifiers are fake
  (`example.com`, `EXAMPLE-*`, sequential IDs).
- Provider fixtures (`shopify-*`, `gorgias-*`) are raw-shaped provider payloads that stop
  at the adapter boundary.
- `canonical-*` fixtures are the provider-neutral event envelope accepted by
  `POST /api/v1/ingest/events` (see IMPL §7.1).
- `ambiguous-email-orders.json` drives the matching test where two orders share one email
  and must produce an ambiguous candidate set (IMPL §5, Scenario D).
