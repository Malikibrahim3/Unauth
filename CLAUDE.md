# Contributor guide

Read `PRODUCT.md` and `ARCHITECTURE.md` before changing product behavior, schema, integrations, or merchant-facing language.

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
- Product UI authority is
  `docs/IMPL_decision_ledger_instrument_grade_final_iteration.md` for every
  visible authenticated, public, entry, onboarding, and embedded surface.
  Surface modes remain intentionally distinct densities of one system.
  `styles/authenticated/README.md`,
  `.codex/rules/authenticated-product.md`, and
  `.cursor/rules/authenticated-design-system.mdc` route contributors by scope.
- Engine weights and thresholds: `lib/engine/weights.ts`
- Identity normalization and hashing: `lib/identity/normalise.ts` and `lib/identity/hash.ts`

The fast scoring and identity scoring paths are calibrated independently. Similar names do not make their thresholds interchangeable.

## Working rules

Use the validated `env` object in server application code. Scripts and tests may load a named environment file explicitly. Never expose a server secret through a `NEXT_PUBLIC_*` variable.

Keep applied migrations immutable and add forward migrations. Authorization must be checked before using service-role access, and every database operation must be merchant-scoped.

For visual changes, follow `IG-00` through `IG-16` in
`docs/IMPL_decision_ledger_instrument_grade_final_iteration.md`. The approved direction
uses an evidence-to-decision hierarchy with explicit scope, provenance,
consequence, action, and recorded outcomes. It does not
copy iOS navigation, macOS chrome, SF assets, or decorative glass. Preserve one
violet product accent, semantic colour meaning, the `--ua-*` namespace,
canonical components, surface-mode isolation, keyboard access, truthful data
states, and accessibility reflow. The migration is a hard visual
cutover inside `.ua-app`; do not add a visual cohort, compatibility theme, or
route-local visual system.
Functional rollout controls
`CONNECTION_HEALTH_V2_ENABLED`, `WORK_COCKPIT_V2_ENABLED`, and
`CASE_WORKSPACE_V2_ENABLED` remain independent product controls and must never
select a visual theme.
