# Contributor guide

Read `docs/PRODUCT.md` and `ARCHITECTURE.md` before changing product behavior, schema, integrations, or merchant-facing language.

## Invariants

1. Preserve merchant isolation, permissions, webhook verification, idempotency, source provenance, financial calculations, and audit history.
2. Do not change scoring formulas, weights, thresholds, identity matching, or cluster-building logic unless the task explicitly requires it and includes recalibration evidence.
3. Do not use `as any` in production code or suppress lint rules to avoid a real fix.
4. Provider-specific code feeds the canonical model; it must not create a parallel case lifecycle, timeline, status system, or financial model.
5. Merchant rules make explainable recommendations. The merchant controls the final outcome.
6. Use neutral operational product language from `docs/PRODUCT.md`.

## Canonical ownership

- Claim lifecycle: `lib/claims/statusMachine.ts`
- Provider metadata: `lib/integrations/registry.ts` and `lib/integrations/providers`
- Executable adapters: `lib/connectors/registry.ts`
- Routes: `lib/appRoutes.ts`; legacy redirects: `next.config.js`
- Database conventions: `lib/supabase`; migration history: `supabase/migrations`
- Environment validation: `lib/utils/env.ts`
- Product UI: `styles/authenticated/README.md` (binding rules) and
  `docs/IMPL_quiet_precision_product_ui.md` (complete implementation contract)
- Engine weights and thresholds: `lib/engine/weights.ts`
- Identity normalization and hashing: `lib/identity/normalise.ts` and `lib/identity/hash.ts`

The fast scoring and identity scoring paths are calibrated independently. Similar names do not make their thresholds interchangeable.

## Working rules

Use the validated `env` object in server application code. Scripts and tests may load a named environment file explicitly. Never expose a server secret through a `NEXT_PUBLIC_*` variable.

Keep applied migrations immutable and add forward migrations. Authorization must be checked before using service-role access, and every database operation must be merchant-scoped.

Read `styles/authenticated/README.md` and
`docs/IMPL_quiet_precision_product_ui.md` before product UI changes. Quiet
Precision is a hard replacement: use its canonical tokens, primitives, page
families, states, responsive rules, and accessibility contract; do not treat
the pre-migration runtime appearance as precedent or preserve visual
compatibility aliases. Keep public landing styles isolated, preserve keyboard
and mobile access, and run `npm run lint:authenticated-design`.

Before completion run the relevant focused tests, then the full validation gate in `docs/TESTING.md`.
