# Landing Visual Fix Implementation Plan

Date observed: 2026-06-12  
Page inspected: `http://localhost:3000/landing`  
Viewports inspected: desktop `1440x900`, mobile `390x844`

## Goal

Fix the visible layout, alignment, and color-flow issues on the Foundation landing page without redesigning the page from scratch.

The current direction is good: editorial, spacious, warm, and product-led. The problems are mostly about scroll choreography and viewport fit, not the overall art direction.

## Confirmed Issues

### 1. Desktop hero content starts too low

At `1440x900`, the first viewport shows a very large pale field with only `EVERY CLAIM` visible. The rest of the headline, subcopy, hero image, and context line sit below the fold.

This makes the hero feel under-composed on desktop. The space reads less like intentional calm and more like the layout is vertically misaligned.

Relevant files:

- `app/(public)/landing/_components/foundation/FoundationHero.tsx`
- `app/(public)/landing/_components/foundation/foundation.module.css`

Likely causes:

- `FoundationHero` uses `min-h-[100svh]` plus a `justify-between` column layout.
- The main hero grid uses `flex-1 items-center`, which centers the content inside a tall remaining area after the top row.
- The hero visual is anchored with `self-end` and transformed with a large scale/translate, so it can contribute to the impression that the actual hero composition is happening below the visible fold.

### 2. Hero CTA bar is clipped at the fold

On desktop, the brown `Run a free claim audit` bar is partly visible at the bottom-left of the first viewport. It reads as accidentally cut off rather than deliberately peeking into view.

On scroll, it becomes fully visible, but the initial state is awkward.

Relevant file:

- `app/(public)/landing/_components/foundation/FoundationHeroCta.tsx`

Likely cause:

- The CTA is absolutely positioned at the top of the scroll curtain and shifted upward with `-translate-y-full`.
- Because it is tied to the section boundary, whether it appears cleanly depends heavily on viewport height and hero content height.

### 3. Floating nav collides with content while scrolling

The centered fixed pill nav looks good over the empty hero, but it overlaps meaningful content in later scroll positions:

- ghosted hero headline during the pinned transition
- espresso section CTA
- upper area of the evidence card

This makes the nav feel detached from the page layout rather than intentionally floating.

Relevant files:

- `app/(public)/landing/_components/foundation/FoundationNav.tsx`
- `app/(public)/landing/_components/foundation/FoundationSignalsEvidence.tsx`
- `app/(public)/landing/_components/foundation/HeroPin.tsx`

Likely cause:

- The nav is `fixed top-5 z-50` for the whole page.
- Sections do not reserve vertical safe space for the nav.
- The espresso section pulls content upward with negative translation, which puts important content inside the fixed nav collision zone.

### 4. Hero-to-espresso color flow is abrupt

The page moves from a very pale hero and statement section into a hard dark espresso band. The brown CTA introduces the dark color early, but because it is clipped, it does not feel like a deliberate bridge.

Relevant files:

- `app/(public)/landing/_components/foundation/FoundationHero.tsx`
- `app/(public)/landing/_components/foundation/FoundationHeroCta.tsx`
- `app/(public)/landing/_components/foundation/FoundationSignalsEvidence.tsx`
- `app/(public)/landing/_components/foundation/foundation.module.css`
- `app/globals.css`

Relevant tokens:

- `--fl-bg`
- `--fl-dusk-1`
- `--fl-dusk-2`
- `--fl-dusk-3`
- `--fl-dusk-ink`
- `--fl-nav-bg`

### 5. Mobile hero note is horizontally clipped

On mobile `390x844`, the note line below the hero subhead starts as `EAD-ONLY...` instead of `READ-ONLY...`.

This is a concrete layout bug.

Relevant file:

- `app/(public)/landing/_components/foundation/FoundationHero.tsx`

Likely cause:

- The note is rendered in a `Badge` with a long uppercase line.
- The badge is centered on mobile and does not wrap or shrink safely inside the viewport.

## Implementation Order

### Step 1: Fix the mobile clipping bug

This is the clearest defect and should be fixed first.

In `FoundationHero.tsx`:

- Replace the badge layout around `FL_HERO.ctaNote` with a wrapping-safe treatment.
- Allow the note to wrap on small screens.
- Keep the note visually compact on desktop.
- Avoid horizontal overflow from uppercase text.

Acceptance criteria:

- At `390x844`, the line starts with `READ-ONLY`.
- No part of the note clips off either edge.
- The note still reads as metadata, not as a second CTA.

### Step 2: Recompose the desktop hero above the fold

In `FoundationHero.tsx`, adjust the hero grid so the complete first hero thought is visible on common desktop heights.

Recommended approach:

- Replace the broad `items-center` vertical centering with a more deliberate grid placement.
- On `lg+`, move the main grid upward slightly using padding/grid alignment rather than large transforms.
- Keep the top nav row stable.
- Ensure at least the full headline and subhead are visible at `1440x900`.
- Make the hero image visible enough to register as the product/network visual in the first viewport.

Avoid:

- Shrinking the display type so far that the hero loses its editorial identity.
- Adding more copy or explanatory UI.
- Making the hero shorter than the viewport unless the pinned-curtain behavior is also reconsidered.

Acceptance criteria:

- At `1440x900`, the first viewport shows the full `EVERY CLAIM / LEAVES / A TRAIL` headline, subhead, note, and a meaningful portion of the hero image.
- The bottom CTA is either fully visible or fully hidden/cleanly placed, not partially clipped.
- There is still a hint of the next section when scrolling begins.

### Step 3: Make the hero CTA placement intentional

In `FoundationHeroCta.tsx`, decide whether the CTA bar should be:

- a clean bottom-left overlay in the hero, or
- the first element of the scroll curtain.

Recommended approach:

- Keep it visually tied to the hero, but avoid the partial clipped state.
- Use a position that is stable across desktop heights.
- On mobile, keep the full-width bottom bar if it remains visually useful, but make sure it does not fight the nav/menu pill.

Possible implementation options:

- Move the CTA into the hero section as an absolute bottom-left element on `lg+`, while keeping the current mobile flow.
- Keep it in the curtain but change the transform/offset so it is fully visible at the boundary.
- Add responsive rules that hide it until the curtain reaches a cleaner scroll position.

Acceptance criteria:

- On desktop first load, the CTA is not half-clipped.
- On the first scroll into `Evidence, not verdicts`, the CTA does not cover the section heading.
- On mobile, the CTA remains readable and does not crowd the floating menu pill.

### Step 4: Add nav collision protection

In `FoundationNav.tsx` and section components, give the fixed nav an explicit safe zone.

Recommended approach:

- Keep the fixed pill nav, but make sections account for it.
- Add top padding to sections whose important content starts near the top of the viewport.
- Reduce or remove negative vertical translation where it places content under the nav.
- Consider nav visual adaptation by section tone only if collision protection is not enough.

Specific areas to check:

- `FoundationSignalsEvidence.tsx`, where the left heading and CTA are pulled upward with negative translations.
- `FoundationStatement` if its heading reaches the top while the ghosted hero is still visible.
- `HeroPin.tsx` scroll transition, because the pinned hero remains visible behind the curtain and creates overlap moments.

Acceptance criteria:

- The nav never sits over active CTA text, section headings, or evidence-card content.
- The nav can overlap decorative/empty background only.
- During scroll, the nav feels like a stable layer rather than an object blocking the page.

### Step 5: Smooth the color transition into espresso

In `foundation.module.css`, tune the hero and espresso transition as a sequence.

Recommended approach:

- Keep the page warm, but create a clearer bridge from pale hero to dark espresso.
- Use the CTA or the lower hero/statement region as the bridge color, not a sudden hard band.
- If the espresso section remains dark, reduce the apparent cliff by adding a subtle top gradient or warmer pre-section spacing.

Possible implementation options:

- Add a warmer lower vignette to `.dusk::after`.
- Add a transitional background or border treatment at the bottom of the statement section.
- Soften the top edge of `.espresso` with a gradient that starts closer to the previous section color before dropping into deep brown.

Acceptance criteria:

- Scrolling from statement into espresso feels deliberate.
- The CTA color no longer feels like an isolated brown block.
- The espresso section still has enough contrast and does not become beige-on-brown mush.

## Visual QA Checklist

Run the local page at `http://localhost:3000/landing` and inspect these viewports:

- Desktop: `1440x900`
- Wide desktop: `1980x1200` if capture performance allows
- Mobile: `390x844`

Check these states:

- First page load at top of hero
- First scroll where the hero CTA meets the statement section
- Statement section midpoint
- Transition into `Signals Become Evidence`
- Evidence card midpoint
- Mobile top hero
- Mobile first scroll into `Evidence, Not Verdicts`

Pass conditions:

- No clipped text.
- No horizontally overflowing metadata badges.
- No fixed nav overlap with meaningful text, CTAs, or cards.
- Full hero message is visible on normal desktop.
- CTA placement looks intentional at rest and during scroll.
- Color transition from pale to espresso has an intermediate cue.

## Non-Goals

Do not redesign the whole landing page.

Do not change product copy unless needed to fix overflow.

Do not remove the fixed nav unless collision protection fails after reasonable spacing adjustments.

Do not replace the visual assets.

Do not add new decorative elements just to fill space.

## Suggested Files To Touch

- `app/(public)/landing/_components/foundation/FoundationHero.tsx`
- `app/(public)/landing/_components/foundation/FoundationHeroCta.tsx`
- `app/(public)/landing/_components/foundation/FoundationNav.tsx`
- `app/(public)/landing/_components/foundation/FoundationSignalsEvidence.tsx`
- `app/(public)/landing/_components/foundation/foundation.module.css`
- `app/globals.css`, only if token-level color changes are necessary

## Testing Notes

This is primarily visual work. Automated tests are less valuable than viewport screenshots here.

Recommended verification:

- Run `npm run dev`.
- Inspect `/landing` manually in browser.
- Capture desktop and mobile screenshots before and after.
- Check browser console for hydration or image sizing warnings.

If adding behavioral nav logic, such as scroll-aware nav tone or section-aware collision handling, add a small focused test only if the repo already has a nearby pattern for that behavior.
