# Quiet Precision product UI rules

Read `styles/authenticated/README.md` and
`docs/IMPL_quiet_precision_product_ui.md` before changing product UI.
They supersede every earlier authenticated visual direction. Current authenticated
runtime appearance is governed by this replacement contract.

- Quiet Precision governs every signed-in route, onboarding and entry form,
  shared product component, overlay, route state, responsive state, theme, and
  compact embedded product surface.
- Use the monochrome, compact, border-led system documented in the binding
  rules: near-black primary action, neutral surfaces, restrained semantic
  colour, Inter typography, consistent geometry, and elevation only for
  floating layers.
- `--ua-*` is the sole product visual token namespace. Do not add hardcoded
  static colours, radii, shadows, duplicate token aliases, page palettes, or
  public/landing token dependencies.
- Pages use the canonical index, board, record-detail, settings, reporting,
  entry, or embedded composition. They do not invent visual systems.
- Use shared actions, fields, tabs, filters, badges, panels, KPI groups,
  tables, overlays, feedback, and state components. Authenticated
  `LandingPrimitives` imports are prohibited.
- Charts are flat, low-chroma, question-led, directly labelled or visibly
  keyed, and accessible. Do not add gradients, texture/hatch, glow,
  decorative matrices, or a coloured action/series convention.
- A change covers every descendant, loading/empty/error state, overlay,
  mobile layout, dark mode, focus state, reduced-motion path, and
  forced-colour behaviour in scope.
- The migration is a hard cutover. Do not retain visual compatibility
  aliases, parallel themes, visual rollout flags, or active
  instructions/screenshots for the superseded appearance.
- Keep public marketing/editorial styles isolated. Product primitives and
  tokens must not leak into public pages, or vice versa.
- Preserve merchant isolation, permissions, provenance, financial truth,
  audit history, integrations, idempotency, routes, query state, mutations,
  exports, deep links, keyboard paths, and truthful unavailable states.
- Visible focus, semantic labels, WCAG 2.2 AA contrast, reduced motion,
  200% zoom, and critical access at 320px are mandatory.
- Update `/dev/design-system`, the matching skeleton, visual evidence, and
  design lint whenever a canonical component or composition changes.
