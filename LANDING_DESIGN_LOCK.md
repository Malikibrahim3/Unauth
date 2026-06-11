# Landing Page Design Lock

**Status:** REBUILT 2026-06-10 by explicit user request (editorial display rebuild, foundation.house-style layout language). The previous lock (2026-05-25, commit `c208eb9`) was overridden per the exception below.

## Current design (2026-06-10)

Editorial display landing: dusk hero with stacked display headline + glass identity-record phone, statement section with 01–04 feature list + evidence manifest card, stat bento (colored blocks, giant numerals), giant-figures section, tabbed claim-programs section on sky, purple closer, dark footer with oversized wordmark.

Files:

```
app/(public)/landing/page.tsx
app/(public)/landing/_lib/foundationContent.ts        (all copy — real product facts only)
app/(public)/landing/_components/foundation/*.tsx
app/(public)/landing/_components/foundation/foundation.module.css
app/globals.css                                       (--fl-* token block)
```

The previous component set under `app/(public)/landing/_components/*.tsx` is retained on disk but unused (easy rollback).

## Scope

The following should not be changed without explicit user request:

- Landing page layout, spacing, typography across all breakpoints (320 px – desktop)
- All sections listed under "Current design" above

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
