# Security

Unauth enforces merchant isolation at request authorization, query scope, row-level security, and background-job boundaries. Service-role credentials are server-only and do not remove the obligation to authorize a merchant before reading or writing data.

Provider webhooks require signature verification, bounded payloads, replay-safe idempotency, and source provenance. Internal routes require dedicated secrets. Financial and case history is auditable; sensitive identifiers are normalized and hashed only through the canonical identity modules.

Baseline response headers are configured in `next.config.js`. Content Security Policy remains report-only until observed violations have been resolved and the allowed sources can be enforced without breaking the product.

## Required operational action

A previous diagnostic session exposed several development or hosted credentials in local session output. Before treating the environment as trusted, rotate the Supabase service role, internal signing, Shopify, Gorgias, and transactional-email credentials, update every deployment environment, revoke superseded credentials, and redeploy. Rotate the identity salt only through the dedicated provenance-rebuild process because hashes derived from it must be regenerated consistently.

Never commit secrets, diagnostic transcripts, environment dumps, generated database snapshots, or browser storage state.
