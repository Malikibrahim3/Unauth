# Unauth visual-first workspace rules

This file is a loader, not a second specification.

## Authority by surface

Before changing product UI, read `PRODUCT.md`, `CLAUDE.md`, and
`docs/unauth/implementation/visual-first-product-ui-plan.md`. The plan is the
active authority for visual direction, phase sequencing and UI acceptance on
every route it names. Older visual ledgers and version 1.x phase artifacts are
historical context only where they do not conflict with the active plan.

No surface may have two active visual authorities. Shared components must
satisfy each scoped consumer or split at a meaningful surface boundary; never
choose a visual system through a merchant-facing runtime theme or cohort.

Product, security, permissions, provenance, audit, financial, route, query,
mutation, export, and merchant-control invariants always win.

## Programme execution

Execute only the phase named by the user from the active plan. Do not infer
current status or the next phase from older ledgers, certificates or matching
phase IDs.

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
- Use the active plan's typography and Lucide. Do not bundle SF Pro or use SF
  Symbols, fake window chrome, bottom navigation, bottom sheets, decorative
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
- WCAG 2.2 AA, keyboard access, 200% zoom, forced colours, reduced motion and
  deterministic capture readiness are mandatory. Preserve an existing dark
  mode, but do not create a new theme solely for this rebuild.
- Update shared documentation or behavioural tests only when a real canonical
  contract changes; visual-only work does not require ceremonial evidence.
