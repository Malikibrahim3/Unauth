# Phase 15 — Rules

Status: implemented; route-pack visual proof pending. Scope per §12.6 of
`docs/IMPL_living_precision_product_ui.md` (R34–R36).

## Scope and implementation

- Rebuilt `/rules` as a compact three-metric registry. The prior insight
  callout and lifecycle rail repeated the same rule counts and have been
  removed; the toolbar, count, and rule rows now share one `RegistrySurface`.
- Migrated `/rules/[id]` to the shared builder shell. Its primary work surface
  now reads in operational order: `When → If → Recommend`. Merchant decision
  authority is carried in the persistent validation summary beside the
  recommendation, rather than buried in explanatory prose.
- Kept simulations, draft creation/editing, atomic publish preview, discard,
  rollback, and immutable version history on their existing API paths. A draft
  comparison appears only when a draft differs from a published version; empty
  impact rails and repeated lifecycle messaging no longer render.
- Retained `/rules/recovery` as a deliberate chart-free configuration route;
  it continues to expose recovery-policy, partner, and delivery controls
  without inventing impact data.
- Removed the duplicate rule-detail page header so the shared builder header is
  the route’s single identity and action region.

## Verification

| Command/check | Result |
|---|---|
| `npx eslint app/(app)/rules/page.tsx app/(app)/rules/[id]/page.tsx components/rules/RulesIndexClient.tsx components/rules/RuleVersionWorkbench.tsx` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint:authenticated-design` | Pending final shared-design sweep |
| Route pack | Pending signed-in 1440×900 and 1024px inspection |

Prior-phase pack: the existing `BuilderShell`, `RegistrySurface`, and state
primitives are consumed without changing their shared API or CSS contract.
