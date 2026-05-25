# Landing Page Design Lock

**Status:** LOCKED as of 2026-05-25

**Commit:** `c208eb9` (landing done mobile)

## Scope

The following are LOCKED and should not be changed without explicit user request:

- Landing page layout, spacing, typography across all breakpoints (320 px – desktop)
- Hero section (CTA, heading, subtitle, screenshot)
- Section 1 — Why it Matters (cards, stats, case snippets)
- Section 2 — The Pipeline (tabs, step descriptions, screenshots)
- Section 3 — Data Schema (field chips, categories)
- Section 4 — Merchant Dashboard (KPI cards)
- Section 5 — How Unauth Compares (feature comparison matrix)
- Section 6 — FAQ (collapsible Q&A)
- Footer (product links, legal, contact, version info)

## Exception: unlocked for explicit requests

If the user explicitly asks for landing page / design changes, they override this lock. Examples:

- "Update the hero copy to say X instead of Y"
- "Add a new testimonial section"
- "Change the pipeline tab colors"
- "Rework the comparison matrix for mobile"

Without an explicit request, do not modify landing page styling, layout, or composition.

## Files included in lock

```
app/(public)/landing/page.tsx
app/(public)/landing/_components/*.tsx
app/(public)/landing/_tokens.ts (design tokens)
```

## Rationale

The landing page has been thoroughly audited and optimized for mobile (320 / 375 / 390 / 430 px) and desktop (1280+ px). It's in a good, shippable state. This lock prevents accidental drift or unnecessary refactoring.
