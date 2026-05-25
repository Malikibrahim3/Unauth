# Landing page — mobile implementation

Audit + fixes for the marketing landing page on mobile widths (320 / 360 / 375 / 390 / 430 px). Goal: every section renders fully, real product screenshots stay legible, no layout that's just a stacked desktop.

## Files touched

- `app/(public)/landing/page.tsx`
- `app/(public)/landing/_components/HeroAuditCta.tsx`
- `app/(public)/landing/_components/PipelineTabs.tsx`

No new components. No bespoke "mobile-only artifacts" — we kept the same screenshots used on desktop (`/screenshots/inbox.png`, `/screenshots/pipeline-upload-cohesive.png`, `/screenshots/hash-demo.png`, `/screenshots/pipeline-casefile-v3.png`).

## Issues found in the audit

| # | Section | Issue at ≤430 px |
|---|---|---|
| 1 | Hero CTA | Email input clipped behind the submit button at 320 px |
| 2 | Section 1 → Pipeline | ~120 px of dead space between sections caused by desktop `pb-16` + a `translateY(-5vh)` carried over from desktop |
| 3 | Pipeline screenshot | `object-fit: cover` + `object-position: top left` cropped most of the screenshot at narrow widths, leaving an unreadable corner |
| 4 | Pipeline header | Type set at desktop scale; H2 wrapped awkwardly and ate vertical space |

Everything else (Why-it-matters stats, data schema chips, dashboard cards, comparison matrix, FAQ, footer) was already mobile-acceptable; left alone.

## Changes

### 1. Hero CTA stack at very narrow widths
`HeroAuditCta.tsx` — extracted inline styles to classes and added one breakpoint:

```css
@media (max-width: 359px) {
  .ua-hero-cta { flex-direction: column; align-items: stretch; gap: 6px; padding: 8px; }
  .ua-hero-cta-input { font-size: 16px; border-bottom: 1px solid var(--landing-line-faint); border-radius: 0; }
  .ua-hero-cta-button { padding: 11px 14px; }
}
```

Only triggers below 360 px (iPhone SE / small Androids); ≥360 px keeps the original side-by-side layout.

### 2. Tighten Section 1 → Pipeline gap on mobile
`page.tsx`:
- Section 1 outer padding: `pb-6 md:pb-20` (was `pb-16 md:pb-20`).
- Side padding: `px-6 md:px-4` (was `px-2 md:px-4`) so cards aren't flush to the viewport edge on mobile.
- The desktop `transform: translateY(-5vh)` on the why-it-matters grid was moved into a `min-width: 1024px` CSS media query so it no longer pulls mobile content up into the section above.

`PipelineTabs.tsx`:
- Pipeline section `paddingTop: clamp(48px, 8vw, 128px)` (was `clamp(80px, 10vw, 128px)`).

### 3. Real screenshots, fully visible on mobile
`PipelineTabs.tsx` — moved `object-fit`/`object-position` from inline style to a class so we can override per-breakpoint:

```css
.ua-pipeline-screenshot-img { object-fit: cover; object-position: top left; }
@media (max-width: 900px) {
  .ua-pipeline-screenshot-img { object-fit: contain !important; object-position: center !important; background: #fdfbf6; }
  .ua-pipeline-screenshot {
    aspect-ratio: 16 / 11 !important;
    height: auto !important;
    min-height: 0 !important;
    border: 1px solid var(--landing-line) !important;
    box-shadow: 0 6px 18px rgba(0,0,0,0.08) !important;
    background: #fdfbf6;
  }
}
```

Effect: at ≤900 px the container sizes itself to the screenshot's natural-ish ratio (16:11), the image renders `contain` so the whole product UI is visible (small but complete), and the warm paper background fills any letterbox area so it doesn't read as missing content.

Same approach for hero: `page.tsx` always renders `<LandingScreenshotFrame src="/screenshots/inbox.png" …>` — no separate mobile composition.

### 4. Pipeline header type/spacing on mobile
```css
@media (max-width: 900px) {
  .ua-pipeline-header { margin-bottom: 24px !important; }
  .ua-pipeline-header h2 { font-size: clamp(28px, 7vw, 40px) !important; margin-bottom: 12px !important; }
  .ua-pipeline-header p { font-size: 14px !important; }
}
```

Plus the existing mobile rules already in `PipelineTabs.tsx` that stack the tab control under the screenshot, reduce step-content padding, and turn the step number into a single mono badge.

## Verification

Tested with the in-repo preview server at:
- 320 × 812 (smallest realistic phone)
- 375 × 812 (iPhone SE / iPhone 13 mini)
- 1280 × 800 (desktop regression check)

For each width, scrolled the landing top → footer and confirmed:
- Hero CTA fully usable; email field never clipped.
- Inbox screenshot fully visible in hero on all widths.
- Pipeline screenshot fully visible per tab (Upload / Hash / Resolve / Case File), no crop.
- No horizontal scrollbar.
- Section transitions tight (no >40 px dead space between any pair on mobile).
- Desktop unchanged.

## Things explicitly **not** done

- No new mobile-only "artifact" components. Earlier passes had drafted `MobileHeroCaseCard` and `MobilePipelineVisuals` (bespoke compositions); both were removed at the user's direction — the brief is to use the real product screenshots, not invented mockups, and not to resurrect screenshots that aren't on the live page (e.g. the cluster network graph).
- No changes to the comparison matrix. It already stacks acceptably; a richer mobile design is a separate piece of work, not part of this audit.
- No changes to scoring / matching code (per `CLAUDE.md`).
