# Landing Mobile Expandable Features

Implementation brief for converting the landing page mobile experience to a Stripe-style expandable-card pattern.

This is a planning and execution handoff. The goal is to preserve full-size product artifacts on mobile without forcing every section to show all copy, CTAs, stats, bullets, and mock UI in the first collapsed viewport.

## Source context

Current page:

- `app/(public)/landing/page.tsx`

Current landing section order:

- `FoundationHero`
- `UnauthNetworkHero`
- `UnauthGlobeHero`
- `UnauthLinearClaimHero`
- `EvidenceNotVerdictsRampSection`
- `BuiltForPurposeStack`
- `UnauthClaimsRoadmapSection`
- `FoundationFinalCta`
- `FoundationFooter`

Current mobile screenshots to review before editing:

- `/Users/malikibrahim/Downloads/Unauth/screenshots/responsive-qa/final-confirmed/top-375.png`
- `/Users/malikibrahim/Downloads/Unauth/screenshots/responsive-qa/sections/375-network.png`
- `/Users/malikibrahim/Downloads/Unauth/screenshots/responsive-qa/sections/375-globe.png`
- `/Users/malikibrahim/Downloads/Unauth/screenshots/responsive-qa/sections/375-claim-patterns.png`
- `/Users/malikibrahim/Downloads/Unauth/screenshots/responsive-qa/sections/375-how-it-works.png`
- `/Users/malikibrahim/Downloads/Unauth/screenshots/responsive-qa/sections/375-integrations.png`
- `/Users/malikibrahim/Downloads/Unauth/screenshots/responsive-qa/sections/375-evidence.png`
- `/Users/malikibrahim/Downloads/Unauth/screenshots/responsive-qa/deep-mobile/claim-1.png`
- `/Users/malikibrahim/Downloads/Unauth/screenshots/responsive-qa/deep-mobile/evidence-2.png`

Reference screenshots from Stripe:

- `/Users/malikibrahim/Downloads/IMG_9273.PNG`
- `/Users/malikibrahim/Downloads/IMG_9274.PNG`
- `/Users/malikibrahim/Downloads/IMG_9275.PNG`
- `/Users/malikibrahim/Downloads/IMG_9276.PNG`

## Problem to solve

The current responsive pass technically fits, but on mobile many sections still compete for vertical space:

- The top hero has title, paragraph, two CTAs, and evidence mockup all in one viewport.
- The network section is mostly text in the first mobile view and loses the visual impact.
- The globe section shows only a sliver of the globe because text owns the viewport.
- The claim/thread and evidence roadmap sections are dense, so mock UI has to become long and compressed.
- The integration diagram is visible but too small relative to its importance.

The product artifacts are important. Do not treat them as secondary decoration.

## Desired mobile pattern

Only apply this pattern on mobile, initially `max-width: 767px`.

Collapsed state:

- Show the section title.
- Show the most important artifact/image/design large enough to feel intentional.
- Show an expand button in the top-right of the preview card.
- Keep only one line of supporting context if the card would otherwise feel ambiguous.
- Keep primary CTA only when it is crucial for conversion.

Expanded state:

- Open a bottom sheet similar to the Stripe screenshots.
- The sheet contains the full explanatory copy, bullets/stats, CTAs, and any detailed mock UI.
- The sheet can scroll internally.
- The page behind the sheet should dim or blur lightly.
- Closing returns focus to the expand button.

Desktop/tablet:

- Preserve the existing richer layouts at `min-width: 768px`.
- Do not regress the current `768`, `1024`, or `1440` layouts.

## Non-negotiables

- No horizontal page overflow at `375`, `390`, `768`, `1024`, or `1440`.
- Every existing hero/section artifact must remain visible on mobile either in the collapsed card or inside the expanded sheet.
- Do not hide/remove product visuals just to make text fit.
- Do not use tiny text. Mobile visible text must be `14px` minimum.
- Mobile buttons and icon buttons must be at least `44px` by `44px`.
- Do not create a generic marketing card layout that loses the current Unauth visual language.
- Do not alter desktop behavior except where required to share components safely.

## New components to add

Create a small landing-only expandable system. Suggested files:

- `components/landing/MobileExpandableFeature.tsx`
- `components/landing/MobileExpandableFeature.module.css`

If `components/landing` does not exist, create it.

### Component API

The component should be client-side.

Suggested props:

```tsx
type MobileExpandableFeatureProps = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  preview: React.ReactNode;
  children: React.ReactNode;
  expandLabel?: string;
  sheetTitle?: React.ReactNode;
  className?: string;
  previewClassName?: string;
};
```

Use it only in mobile-only branches:

```tsx
<div className="md:hidden">
  <MobileExpandableFeature
    eyebrow="Evidence pipeline"
    title="Patterns your queue already knows."
    expandLabel="Open evidence details"
    preview={<RoadmapPreview />}
  >
    <FullRoadmapMobileContent />
  </MobileExpandableFeature>
</div>

<div className="hidden md:block">
  Existing desktop/tablet layout
</div>
```

### Sheet behavior

Use a custom fixed bottom sheet instead of the generic app `Modal`. The app modal exists at `components/ui/Modal.tsx`, but it is desktop/app styled and not right for this landing pattern.

Requirements:

- `role="dialog"`
- `aria-modal="true"`
- Close button with lucide `X`
- Expand button with lucide `Maximize2`
- Optional drag handle at the top of the sheet
- Escape closes the sheet
- Backdrop click closes the sheet
- Body scroll locks while the sheet is open
- Restore focus to the expand button after close
- Sheet max height: `calc(100svh - 88px)` or similar
- Sheet top corners rounded, bottom flush to viewport
- Sheet content scrolls internally

Implementation note:

- Use `useEffect` for Escape key and body scroll lock.
- Store the trigger button ref with `useRef<HTMLButtonElement | null>`.
- Use Framer Motion only if it is already available in the target component area. It is already used on this landing page, so a simple `motion.div` entrance is fine.
- Keep animation simple: backdrop fades, sheet translates from bottom.

### Visual style

Match the landing page, not Stripe exactly.

- Background: `#ffffff` or current landing paper color.
- Border: `1px solid rgba(0,0,0,0.08)`.
- Radius: current landing sections use larger radii; use `16px` for feature preview cards and `24px 24px 0 0` for sheets.
- Expand button: square-ish `44px`, soft off-white background, lucide `Maximize2`.
- Close button: `44px`, lucide `X`.
- Avoid purple-heavy styling. Keep Unauth terracotta/black/off-white accents.

## Section-by-section implementation

### 1. FoundationHero

File:

- `app/(public)/landing/_components/foundation/FoundationHero.tsx`
- `components/UnauthEvidenceHeroCards.tsx`
- `components/UnauthEvidenceHeroCards.module.css`

Mobile collapsed view:

- Keep the nav.
- Keep eyebrow: `System Architecture`.
- Keep title: `One ticket / More context`.
- Keep the evidence cards artifact visible and larger than the current safe version if possible.
- Keep primary CTA: `Get a Demo`.
- Replace the long paragraph and secondary CTA with one compact expand link/button, for example `See evidence context`.

Expanded sheet:

- Full paragraph currently in `FL_HERO.subcopy`.
- Secondary CTA: `See How It Works`.
- Evidence explanation bullets:
  - Cross-merchant claim history
  - Graded evidence
  - Team keeps final decision
- Include the evidence artifact again only if it can be shown larger than collapsed. Otherwise do not duplicate it.

Desktop/tablet:

- Keep current behavior.

Important:

- Do not hide `UnauthEvidenceHeroCards` on mobile.
- The collapsed artifact must not overlap CTAs.

### 2. UnauthNetworkHero

File:

- `components/UnauthNetworkHero.tsx`

Current issue:

- Mobile first view is almost all text. The section lacks a visual anchor.

Mobile collapsed view:

- Title: `Fraud is a network problem. Now so is your intelligence.`
- Preview: compact network/stat visual. Use current stat data, but render as a small visual block rather than all copy.
- Expand button top-right.
- Optional primary CTA only if space remains.

Expanded sheet:

- Existing lead paragraph.
- Existing CTAs.
- Existing three stats.
- Present stats as stacked rows with large numbers and short labels.

Desktop/tablet:

- Keep current section.

### 3. UnauthGlobeHero

File:

- `components/UnauthGlobeHero.tsx`
- `components/UnauthNetworkCanvas.tsx`

Current issue:

- On mobile, title dominates and the globe is only partially visible.

Mobile collapsed view:

- Title: `Every merchant that joins makes the evidence stronger.`
- Preview: large globe/canvas crop. The globe must be visible, not a tiny edge sliver.
- Expand button top-right.

Expanded sheet:

- Both existing lead paragraphs.
- `What stays in your store` list.
- `What the network sees` list.
- Optionally include a static or live globe preview near the bottom.

Implementation caution:

- Do not mount two heavy Three.js canvases at once. For mobile, render either the collapsed canvas or the sheet canvas, not both simultaneously.
- If duplicating the visual is risky, keep the canvas only in the collapsed preview and use lists in the sheet.

Desktop/tablet:

- Keep current full-bleed globe section.

### 4. UnauthLinearClaimHero

File:

- `components/UnauthLinearClaimHero.tsx`

Current issue:

- The mobile section is long and the thread/board UI becomes a scroll journey.

Mobile collapsed view:

- Eyebrow: `Claim patterns`.
- Title: `Common complaints become cross-merchant evidence.`
- Preview: the thread mock UI, cropped or scaled so it feels like a hero artifact.
- Expand button top-right.

Expanded sheet:

- Existing explanatory paragraph.
- Existing step label.
- Full thread UI.
- Claims board preview below it.

Implementation detail:

- Split current visual pieces into reusable subcomponents if needed:
  - `ClaimThreadPreview`
  - `ClaimsBoardPreview`
- Avoid copy/paste duplication where possible.

Desktop/tablet:

- Keep current layout.

### 5. EvidenceNotVerdictsRampSection

File:

- `components/EvidenceNotVerdictsRampSection.tsx`

Current state:

- Already has small open buttons on feature cards, but they do not open a Stripe-style mobile sheet.

Mobile collapsed view:

- Keep section title and short lead.
- Render the three feature cards as compact preview cards.
- Each card should show:
  - number badge
  - card title
  - its mock panel preview
  - expand button

Expanded sheet per card:

- Card title.
- The full mock panel.
- The detailed supporting text/bullets for that card.
- Any relevant CTA from the current bottom strip.

Desktop/tablet:

- Keep current cards.

### 6. BuiltForPurposeStack

File:

- `components/BuiltForPurposeStack.tsx`

Current issue:

- Integration diagram is visible on mobile but too small relative to importance.

Mobile collapsed view:

- Eyebrow: `Integrations`.
- Title: `Connect your stack in minutes.`
- Preview: large integration diagram. Prefer making the diagram taller and more centered, not tiny.
- Expand button top-right.

Expanded sheet:

- Existing paragraph.
- Full integration diagram if it can be shown larger.
- Four connection steps currently below the diagram.

Desktop/tablet:

- Keep current layout.

### 7. UnauthClaimsRoadmapSection

File:

- `components/UnauthClaimsRoadmapSection.tsx`

Current issue:

- The roadmap is dense and long on mobile. It works, but it is information-heavy in the main scroll.

Mobile collapsed view:

- Eyebrow: `Evidence pipeline`.
- Title: `Patterns your queue already knows.`
- Preview: a simplified roadmap/quarter card with 2-3 representative claim cards.
- Expand button top-right.
- Keep `Explore claim patterns` CTA if it fits cleanly; otherwise move it to sheet.

Expanded sheet:

- Existing paragraph.
- `Explore claim patterns` CTA.
- Full quarterly roadmap rendered vertically.
- Bottom labels.

Implementation detail:

- Current board data is already structured in the component. Extract it so both collapsed preview and expanded sheet can reuse it.
- Avoid text truncation in the expanded sheet.

Desktop/tablet:

- Keep current layout.

### 8. FoundationFinalCta and Footer

Files:

- `app/(public)/landing/_components/foundation/FoundationFinalCta.tsx`
- `app/(public)/landing/_components/foundation/FoundationFooter.tsx`

Do not add expandable sheets here.

Keep these direct, simple, and readable.

## Suggested execution order

1. Build `MobileExpandableFeature`.
2. Add it to `EvidenceNotVerdictsRampSection` first because that section already has open buttons and isolated cards.
3. Add it to `BuiltForPurposeStack` because the integration diagram is the clearest visual win.
4. Add it to `UnauthClaimsRoadmapSection` because it has the most mobile density.
5. Add it to `UnauthLinearClaimHero`.
6. Add it to `UnauthGlobeHero`.
7. Add the lighter version to `FoundationHero`.
8. Review `UnauthNetworkHero` last, because it may need a small new visual/stat preview.

This order gets the pattern working on simpler sections before touching the most important first hero.

## Acceptance checks

Run the local server:

```bash
npm run dev
```

Test these viewports:

- `375 x 667`
- `390 x 844`
- `768 x 1024`
- `1024 x 768`
- `1440 x 900`

For each viewport:

- No horizontal scroll.
- No broken visible images.
- Mobile nav is not clipped.
- Mobile collapsed cards show title plus artifact.
- Expand buttons are visible, at least `44px` square, and tappable.
- Expanded sheet opens and closes cleanly.
- Escape closes the sheet.
- Backdrop closes the sheet.
- Body behind sheet does not scroll while sheet is open.
- Focus returns to expand button after close.
- All important artifacts/designs remain visible either collapsed or expanded.
- No mobile text below `14px`.
- Desktop layout remains visually equivalent to the current build.

Take screenshots:

- Mobile collapsed top hero.
- Mobile expanded top hero sheet.
- Mobile collapsed integration section.
- Mobile expanded integration sheet.
- Mobile collapsed evidence roadmap.
- Mobile expanded evidence roadmap sheet.
- Tablet hero.
- Desktop hero.

## Build verification

After implementation:

```bash
npm run build
```

Known note:

- The repo may print existing dependency warnings from Sentry/OpenTelemetry or Shopify SDK. Do not treat warnings as failure if the build exits successfully.
- If `next-env.d.ts` changes only between `.next/dev/types/routes.d.ts` and `.next/types/routes.d.ts`, do not commit that generated churn unless the repo already expects it.

## What not to do

- Do not hide artifacts on mobile.
- Do not make the mobile collapsed view text-only.
- Do not make every section a modal. Use sheets only where the artifact/copy tradeoff is real.
- Do not redesign desktop.
- Do not add a third-party sheet/dialog library.
- Do not use the generic app modal styling for the landing page.
- Do not commit screenshot folders unless explicitly requested.

