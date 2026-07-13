# Authenticated product design rules

- The authenticated application uses the neutral operational system scoped by `app/(app)/authenticated.css`.
- The public landing site is a separate design system. Never make authenticated tokens depend on `--landing-*` or `--fl-*` values, and never change the landing aesthetic as part of authenticated work.
- Do not reintroduce cream, espresso, rust, copper, warm-gradient, or old authenticated palette assumptions.
- Use semantic tokens and shared components. Authenticated hardcoded colours are prohibited except documented data-visualisation values.
- New signed-in pages must inherit the canonical shell or the explicit `.ua-auth-surface` setup scope.
- Tables, drawers, dialogs, forms, statuses, metrics, loading, empty, stale, and error states use the authoritative component families documented in `docs/design/authenticated-component-system.md`.
- Prefer compact operational density, border-defined hierarchy, small radii, and shadows only for floating UI.
- Semantic colour is restrained and must never be the only carrier of meaning.
- Preserve merchant isolation, permissions, source provenance, financial calculations, audit history, integration behaviour, and idempotency. Presentation convenience never justifies weakening product logic.
- Every reachable authenticated route, including legacy redirects and deep-link-only views, must remain visually consistent and accessible.
- Keyboard access, visible focus, semantic labels, reduced motion, contrast, and critical mobile access are mandatory.
