# SECURITY_TODO — secret rotation after identity-salt session (2026-06-16)

During the identity-salt diagnosis + rotation session, the following secrets were
read from `.env.local` and/or printed in terminal/tool output (and are therefore
in this session's transcript/logs). Treat them as **exposed** and rotate them.

## Priority 1 — rotate ASAP (high blast radius)
- [ ] **SUPABASE_SERVICE_ROLE_KEY** — full DB bypass of RLS. Rotate in Supabase → Project Settings → API → regenerate service_role key; update Vercel + `.env.local`.
- [ ] **INTERNAL_HMAC_SECRET** — internal request signing. Regenerate; update everywhere it's verified.
- [ ] **SHOPIFY_API_SECRET** and **SHOPIFY_WEBHOOK_SECRET** — Shopify app secret + webhook HMAC. Rotate in the Shopify Partner dashboard; update Vercel.
- [ ] **SHOPIFY_ADMIN_API_TOKEN** (`shpca_…`) — admin API access to the store. Revoke + reissue.
- [ ] **GORGIAS_API_TOKEN** and **GORGIAS_SUPPORT_WEBHOOK_SECRET** — helpdesk API + webhook auth. Rotate in Gorgias; update Vercel.
- [ ] **RESEND_API_KEY** — transactional email send. Rotate in Resend.

## Priority 2 — lower risk but exposed
- [ ] **SHOPIFY_API_KEY** — public-ish app id, but rotate alongside the secret.
- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY** — designed to be public (RLS-gated); rotate only if doing a full key cycle.

## IDENTITY_SALT — handled this session
- Old prod salt was Sensitive/unrecoverable; rotated to a new value via provenance rebuild.
- The **new** `IDENTITY_SALT` is intentionally stored **non-Sensitive** in Vercel (so it can be read back). It was printed in this session by design. If you consider that unacceptable, rotate again — but note any rotation requires re-running `scripts/rotate-identity-salt.mjs` to rehash the identity graph.
- The previous salt (`1b497e…`) is retired and no longer in use.

## Notes
- `vercel env pull` returns empty for Sensitive vars — that's what forced the rotation. Keep secrets that must be readable locally as **non-Sensitive** (Encrypted), and only mark truly write-once secrets Sensitive.
- After rotating each secret above, redeploy so prod picks up the new values.
