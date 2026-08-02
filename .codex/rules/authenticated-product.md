# Decision Ledger authenticated workspace rules

This file is a loader, not a second specification.

## Authority by surface

Before changing product UI, read `PRODUCT.md`, `CLAUDE.md`, and the
authority for the surface being changed:

- `.ua-app` authenticated surfaces:
  `docs/IMPL_authenticated_execution_ledger.md` (type ramp is 20px/600, not
  28px/650; elevation is permitted on exactly one focal object per view per
  its §7 amendment A1).
- public, entry/onboarding, and embedded surfaces (out of the ledger's
  scope): `docs/IMPL_decision_ledger_instrument_grade_final_iteration.md`.

No surface may have two active visual authorities. Shared components must
satisfy each scoped consumer or split at a meaningful surface boundary; never
choose a visual system through a merchant-facing runtime theme or cohort.

Product, security, permissions, provenance, audit, financial, route, query,
mutation, export, and merchant-control invariants always win.

## Programme execution

For `.ua-app`, the current executable items are §4–§8 of the authenticated
execution ledger, verified with `node scripts/verify-visual-adoption.mjs`.
For public, entry/onboarding, and embedded surfaces, `IG-00` through `IG-16`
in the instrument-grade document remain the current executable visual
phases. Earlier visual documents are historical records, not competing
authorities.

Functional rollout controls remain independent:

- `CONNECTION_HEALTH_V2_ENABLED`;
- `WORK_COCKPIT_V2_ENABLED`; and
- `CASE_WORKSPACE_V2_ENABLED`.

They are not visual themes and must not be removed, repurposed, or used to
select an appearance.

## `.ua-app` visual contract

- Translate Apple principles into a browser-native desktop workspace; do not
  imitate iOS or macOS chrome.
- Create one dominant object per screen. Use alignment, whitespace, joined
  sections, and tonal planes before borders.
- Make scope, evidence, consequence, and the next permissible action readable
  as one continuous decision ledger; do not repeat a value in a summary card
  and again in the dominant visual.
- Use the quiet navigation plane, compact utility plane, and content-first work
  plane defined by the implementation document.
- `--ua-*` remains the sole product token namespace. Static literals, duplicate
  aliases, route palettes, public-token dependencies, and visual feature flags
  are prohibited.
- Inter remains the UI face; Lucide remains the icon system. Do not add SF Pro,
  SF Symbols, fake window chrome, bottom navigation, bottom sheets, decorative
  glass, gradients, glow, texture, or theatrical motion.
- Use one violet product accent for ordinary primary action, focus, selection,
  and primary data. Semantic colour communicates meaning only.
- Prefer unframed and joined composition over rounded card stacks. Inline
  content is flat; elevation belongs to floating layers.
- Pages compose canonical frame, registry, detail, settings, builder,
  analytical, table, overlay, and state primitives. No route invents another
  system.
- Optimise authenticated work for 1024px and wider, while preserving an
  operable accessibility-reflow mode for browser zoom and text scaling.
- Preserve all product behaviour and truthful unavailable, partial, stale,
  mixed-currency, and permission states.
- WCAG 2.2 AA, keyboard access, 200% zoom, forced colours, reduced motion,
  dark mode, and deterministic capture readiness are mandatory.
- Update `/dev/design-system`, matching route states, the affected phase report,
  and design verification whenever a canonical contract changes.
