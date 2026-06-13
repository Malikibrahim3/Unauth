# Landing Background Transitions Implementation

Date: 2026-06-12  
Scope: public landing page Foundation rebuild

## Visual Review

The landing page had a strong editorial base, but the scroll sequence moved through flat background bands: pale hero/statement, espresso evidence, warm setup, pale figures, pale FAQ, rust CTA. The hardest transition was the statement section into `Signals Become Evidence`; it read as a color cliff rather than a composed scroll moment.

The existing number treatment was also too restrained for the requested reference direction. The old Network bento presented large stats in a thin row, but it did not behave like the oversized numbered cards shown in the references.

## Implementation

Added a reusable landing-only scenery layer in `foundation.module.css`:

- large clipped polygon shapes behind light sections
- soft color fields that blend from light to dark sections
- a dark-to-warm fade into the setup section
- a rust-toned final CTA field with subtle background shapes
- mobile-specific spacing so the fixed menu pill does not cover card numerals

Reworked `FoundationBento` into the primary transition bridge:

- moved Network metrics directly after the statement section
- converted the sourced stats into staggered oversized cards
- used existing landing tokens only: rust, espresso, mint, slate, line, and page canvas
- preserved the existing source attribution

Updated section wrappers so decorative fields sit behind content:

- `FoundationStatement`
- `FoundationSignalsEvidence`
- `FoundationHowItWorks`
- `FoundationFigures`
- `FoundationFaq`
- `FoundationFinalCta`

## QA

Verified visually in the in-app browser:

- desktop/default viewport: hero, statement-to-card bridge, evidence transition, setup transition, final CTA
- mobile `390x844`: card stack, fixed menu overlap, source text, top hero

Build note: `npm run build` compiled successfully, then failed during TypeScript on an existing unrelated API issue in `app/api/claims/[claimId]/view/route.ts` where `ClaimForAction` lacks `first_viewed_by`.
