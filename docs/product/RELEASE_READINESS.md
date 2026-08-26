# Merchant-ready release readiness

The merchant-ready programme remains **NO-GO**. MR0 is `PASS`; MR2, MR3, and
MR4 are `PASS` only under the documented synthetic-data and unpassed-MR1
limitation. MR5 is `PARTIAL` because owner/counsel legal facts and approval are
absent, so public legal routes remain non-operative. MR6 is `PARTIAL / NO-GO`:
local implementation proof is strong, but staging reconciliation, selected
provider lifecycles, hosted restore, non-founder operation, named owners,
clean-release evidence, and signed agreements are absent.

The fixed Asterlane profile is synthetic certification data, not a real merchant
connection. No synthetic result is promoted to live-provider proof. The current
repository cleanup is tracked separately in `DEPLOYMENT_READINESS.md`; it cannot
change these external phase verdicts.

## Current gates

| Gate | State | Owner or evidence |
|---|---|---|
| Product, billing, permissions, provider truth | PASS locally | `PRODUCT.md`, `lib/billing/plans.ts`, registries, and existing focused gates |
| Active route and surface ownership | PASS locally | `lib/surfaces/manifest.ts` and generated `docs/page-inventory.md` |
| Responsive/theme and state grammar | PASS locally | `DESIGN.md`, surface/UI checks, and browser evidence still required for formal UX9 acceptance |
| MR1 controlled provider/source runtime | BLOCKED | Controlled sandbox accounts and lifecycle receipts are absent |
| MR5 legal approval | BLOCKED | Owner/counsel facts and approval are absent |
| MR6 external release proof | PARTIAL / NO-GO | See `MR6_HANDOFF.md` |

Do not treat this document, a local build, or a preview URL as production
approval. No production deploy, merge, remote migration, provider mutation, or
real-user invitation is authorized by the repository cleanup.
