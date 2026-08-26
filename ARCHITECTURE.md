# Architecture and authority index

Status: current deployment-candidate authority, 26 August 2026.

This is the index, not a second product specification. Each concern has one
binding owner. Historical plans, screenshots, completion reports, and local
tool state are evidence only and are kept outside the deployment tree.

## Canonical owners

| Concern | Binding owner | Projection or boundary |
|---|---|---|
| Product semantics, evidence, money, permissions, provider truth | `PRODUCT.md` | Product copy and behaviour must import or derive these rules. |
| Visual system, responsive behaviour, theme, interaction states | `DESIGN.md` | `styles/operations/index.css` and route CSS modules implement it. |
| Merchant-ready MVP+ scope | `docs/product/MVP_PLUS_SCOPE.md` | Scope is bounded by the selected certification profile. |
| Routes and canonical URLs | `lib/navigation/appRoutes.ts` | Route names, permissions, and URL-backed state. |
| Compatibility redirects | `lib/navigation/aliases.js` | Redirect table only; it does not own page routes. |
| Redirect delivery and rewrites | `next.config.js` | Consumes the redirect table and owns framework rewrites. |
| Page ownership and scenario coverage | `lib/surfaces/manifest.ts` | `docs/page-inventory.md` is a generated projection. |
| Provider identity and lifecycle maturity | `lib/integrations/registry.ts` | Provider metadata and lifecycle only. |
| Executable provider adapters | `lib/connectors/registry.ts` | Runtime adapter catalogue; intentionally separate from lifecycle. |
| Plans, entitlements, credits, billable events | `lib/billing/plans.ts` | Pricing, signup, billing, and metering derive from this catalogue. |
| Environment contract | `lib/utils/env.ts` | `.env.local.example` documents the contract and test-only additions. |
| Permissions and role vocabulary | `lib/permissions/constants.ts`, `lib/permissions/roles.ts` | Consumers import values; no route-local copies. |
| Notification vocabulary | `lib/notifications/kinds.ts` | Notification projection and UI labels derive from this module. |
| Claim and case state transitions | `lib/claims/statusMachine.ts`, `lib/cases/stateMachine.ts` | Claim status and multi-axis case state remain distinct. |
| Money formatting and canonical aggregates | `lib/utils/format.ts`, `lib/financial/canonicalAggregates.ts` | Integer minor units and currency scope remain explicit. |
| Database history and ordering | `scripts/release-migration-manifest.mjs`, `supabase/migrations/` | Applied migrations are immutable history. |
| Capability evidence and external release blockers | `docs/product/CAPABILITY_STATUS.md`, `docs/product/MR6_HANDOFF.md` | These documents report status; they cannot grant release approval. |
| UX9 acceptance status | `docs/product/UX9_STATUS.md` | Implementation and independent rendered acceptance are separate. |
| Deployment-candidate evidence | `docs/product/DEPLOYMENT_READINESS.md` | Repository readiness only; MR1/MR6/legal gates remain external. |

## Non-negotiable boundaries

- Preserve HTTP routes, request/response contracts, database values,
  permissions, audit effects, redirects, and truth semantics unless a duplicate
  is proven obsolete and the affected gates pass.
- Recommendations, merchant decisions, provider actions, provider responses,
  recovery states, and ledger outcomes are separate records and projections.
- Unknown, unavailable, partial, stale, and verified-zero values are distinct;
  missing data never becomes a fabricated zero or completed-looking chart.
- `lib/integrations/registry.ts` and `lib/connectors/registry.ts` intentionally
  represent different axes and must not be collapsed.
- Supabase migrations are append-only history. A later migration may repair or
  supersede behaviour but never deletes an applied migration.
- Compatibility redirects remain until production access evidence proves that
  they have been unused for the required 90 days.

## Documentation rules

Current documents link to the owners above, not to archived plans. The page
inventory is regenerated from the manifest. Any new binding concern must first
be assigned one owner here; duplicate authority claims are a verifier failure.

The release archive at
`/Users/malikibrahim/Downloads/Unauth-release-archive/2026-08-26/` contains the
preserved dirty baseline and checksummed historical evidence. It is not a
runtime dependency and is not committed to the repository.
