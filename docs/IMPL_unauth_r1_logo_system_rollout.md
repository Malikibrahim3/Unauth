# IMPL — Unauth R1 logo system and rollout

- **Status:** Implemented and verified rollout specification
- **Date:** 27 July 2026
- **Scope:** Supplied R1 logo pack, first-party web surfaces, public metadata, PWA assets, marketing artifacts, browser/helpdesk extensions, generated reports, and legacy brand cleanup
- **Canonical source directory:** [`../public/brand/unauth-r1/`](../public/brand/unauth-r1/)
- **Related product visual contract:** [`IMPL_quiet_precision_product_ui.md`](IMPL_quiet_precision_product_ui.md)
- **Related contributor rules:** [`../styles/authenticated/README.md`](../styles/authenticated/README.md)

This document records the complete inspection of the supplied R1 logo pack, the implementation decisions, and the resulting placement map across the repository. It distinguishes brand identity from ordinary product copy: the word “Unauth” remains text in sentences, labels, titles, legal copy, and action text. Logo artwork belongs only in brand, signature, application-icon, and document-identity positions.

---

## 0. Executive decision

The supplied R1 system is the canonical Unauth identity.

The segmented `U` symbol replaces:

- the retired serif `Unauth.` wordmark and cream/rust app icons;
- generic Lucide `Layers` marks on the public site;
- letter `U` tiles in product, demo, error, and extension chrome;
- the orange/white placeholder browser-extension icons;
- the old Zendesk raster logos;
- styled text used as a logo in generated evidence reports.

Digital product surfaces use **graphite `#202020` on light backgrounds** and **white `#FAFAFA` on dark backgrounds**. Pure black is reserved for black-only reproduction and print workflows. Background-bound artwork is used only where the logo itself must own a square tile, such as a favicon, PWA icon, touch icon, browser-extension icon, or marketplace app icon.

Implementation must not:

- redraw, smooth, round, thicken, rotate, animate, or recolour the symbol;
- recreate the symbol with a font, Lucide icon, CSS borders, or an approximate `U`;
- put the transparent white artwork on a light surface or graphite artwork on a dark surface;
- add a cream, rust, copper, gradient, shadow, border, or rounded container unless the target platform requires a container;
- crop the supplied viewBox or remove its built-in clear space without explicit brand approval;
- replace normal textual mentions of “Unauth” with images.

### 0.1 Current repository state

The R1 rollout is implemented. The supplied SVGs remain preserved under `public/brand/unauth-r1/source/`; the production-facing lockups and wordmarks are generated path-outlined masters at the canonical directory root. Re-run `npm run generate:brand-assets` after changing the source pack or the pinned font.

| State | Current result |
|---|---|
| R1 source pack | All 32 supplied SVGs are preserved in `public/brand/unauth-r1/source/`; the 32 canonical outputs remain at the directory root |
| Outlined masters | Lockups and wordmarks are generated from the pinned Instrument Sans font and contain paths, not live text |
| Shared React logo | `components/ui/UnauthLogo.tsx` plus `lib/brand/unauthLogoAssets.ts` provide typed kind/tone/background selection and theme-aware auto-tone |
| Primary SVG favicon | `app/layout.tsx` points first to the R1 graphite-on-white favicon |
| 32px favicon fallback | Generated R1 graphite-on-white PNG |
| Apple/PWA icons | Generated R1 white-on-graphite PNGs at exact required sizes |
| Open Graph image | Dedicated 1200 × 630 R1 composition on `#FAFAFA` |
| Public marketing nav/footer | Graphite R1 lockup |
| Product entry/demo/error states | R1 lockup/symbol assets with explicit surface polarity |
| Chrome extension | Canonical R1 bounded symbols in popup, loading states, source icons, and rebuilt `dist/` |
| Zendesk extension | Canonical R1 bounded symbols in source assets and rebuilt downloadable zip |
| Static marketing artifact | Directly references canonical R1 symbols with empty alt text |
| Evidence PDF | Uses the generated R1 wordmark PNG instead of styled `UNAUTH` text |
| Legacy CSS | Retired `.ua-mark` and logo-dot rules removed; generated compatibility aliases serve R1 artwork |
| Brand QA gallery | Not added; automated checks and contact-sheet inspection cover the implemented surfaces |

### 0.2 Release blocker: live text inside the supplied SVGs

Every supplied lockup and wordmark contains:

```svg
<text font-family="Instrument Sans, sans-serif" font-weight="600">Unauth</text>
```

The repository does not load or bundle Instrument Sans. More importantly, an SVG loaded through `<img>` or `next/image` is an external image document and does not inherit fonts from the surrounding page. The same file can therefore render with different fallback typefaces in browsers, image processors, email clients, social crawlers, PDF renderers, and third-party marketplaces.

Before lockups or wordmarks are considered production-safe, obtain or produce **path-outlined master SVGs** that preserve the supplied viewBoxes, placement, weight, spacing, and colours. Embedding the licensed font inside every SVG is a less desirable alternative because it increases asset weight and complicates third-party use.

Symbol-only and favicon assets contain paths rather than text and are safe from this specific issue.

**P0 gate:** satisfied for the implemented rollout. The canonical lockups and wordmarks are path-outlined, while the original live-text files remain only as immutable source references for provenance.

---

## 1. Complete asset audit

### 1.1 Shared construction

| Property | Observed value |
|---|---|
| Symbol viewBox | `0 0 64 64` |
| Symbol construction | Two stroked paths |
| Symbol stroke | `8` units |
| Stroke caps | `butt` |
| Graphite | `#202020` |
| White | `#FAFAFA` |
| Black | `#000000` |
| Lockup viewBox | `0 0 300 56` |
| Lockup intrinsic size | `600 × 112` |
| Wordmark viewBox | `0 0 220 56` |
| Wordmark intrinsic size | `440 × 112` |
| Lockup wordmark origin | `x=72`, `y=42` |
| Lockup/wordmark type | Instrument Sans, weight 600, 46px, `-1` letter spacing |

All symbol size variants use the same path geometry and viewBox. The `16px`, `20px`, `24px`, `32px`, `64px`, and `256px` files differ only in their root `width` and `height` attributes; there are no optical redraws at small sizes.

### 1.2 Asset families

| Family | Count | Background | Intended role |
|---|---:|---|---|
| Favicons | 2 | White or graphite, full square | Browser tab and small square application identity |
| Lockups | 4 | Transparent, plus one graphite-bound version | Primary brand signature: symbol + wordmark |
| Marketplace icons | 3 | Transparent | Large external listing artwork where the marketplace supplies the background |
| Sized symbols | 18 | Transparent | UI marks at 16, 20, 24, 32, 64, or 256px in black, graphite, or white |
| Background-bound symbol | 1 | Graphite, full square | App/touch/extension icon source |
| Wordmarks | 4 | Transparent, plus one graphite-bound version | Text-only signature where a symbol would be redundant |
| **Total** | **32** |  |  |

### 1.3 Background semantics

Files whose names contain `on-white`, `on-graphite`, or `horizontal-white-on-graphite` include a full-viewBox `<rect>`. They own their background and must not be treated as transparent artwork.

All other supplied assets are transparent. White transparent assets require a dark host surface; black and graphite transparent assets require a light host surface.

### 1.4 Size and clear-space findings

- The symbol paths sit inside the `64 × 64` viewBox with built-in breathing room. Do not crop to the visible stroke bounds.
- Lockup and wordmark viewBoxes include right-side clear space. Treat that as intentional until the brand source owner approves tighter bounds.
- Because the size-specific symbols share geometry, they should be selected semantically by requested UI size. They do not need separate visual logic.
- The supplied background-bound files are square with square corners. Do not add a permanent radius to the source artwork; operating systems and marketplaces may apply their own masks.

### 1.5 Accessibility findings

The SVG files do not contain a `<title>` or intrinsic ARIA metadata. That is acceptable when they are consumed as image assets and the calling component owns accessibility.

Rules:

- A standalone linked logo uses `alt="Unauth"` or an equivalent accessible name.
- A logo next to visible “Unauth” text uses `alt=""` and `aria-hidden="true"` to avoid duplicate announcements.
- Decorative marks in activity rows use empty alt text.
- Inline SVGs use `aria-hidden="true"` when adjacent text identifies the brand.
- Do not put an `aria-label` on a neutral `<span>` and assume it becomes an image role.

---

## 2. Canonical usage rules

### 2.1 Colour selection

| Context | Asset colour |
|---|---|
| Light digital surface (`#FAFAFA`, white, near-white) | Graphite |
| Dark digital surface (`#202020`, `#14100e`, dark product theme) | White |
| Black-only print or legal reproduction | Black |
| Square application icon | White on graphite |
| Browser favicon on ordinary browser chrome | Graphite on white |
| Marketplace-provided light background | Graphite marketplace symbol |
| Marketplace-provided dark background | White marketplace symbol |

Graphite is the default digital ink. Black should not become the routine web variant merely because it is available.

### 2.2 Form selection

| Form | Use |
|---|---|
| Lockup | Navigation, auth entry, public header/footer, standalone product identity |
| Wordmark | Narrow signature areas where the symbol is already present or the available height is very small |
| Symbol | Collapsed navigation, app icons, compact product identity, status/activity authorship |
| Background-bound symbol | Icons that must remain identifiable independently of the host surface |
| Marketplace icon | External listing artwork at large source resolution |

### 2.3 Implementation minimums

These are product implementation minimums, not new brand-identity rules:

| Use | Minimum rendered size |
|---|---:|
| Standalone symbol in dense UI | 16px |
| Symbol used as navigation identity | 20px |
| Expanded app-shell lockup | 18px high |
| Public/auth lockup | 22px high |
| Footer lockup | 18px high |
| Text-only wordmark | 16px high |

Do not render the complete lockup at 9–12px high. At that size the wordmark becomes an incidental texture rather than readable identity.

### 2.4 Text that remains text

The following are not logo placements:

- page titles and document titles;
- “Open case in Unauth”, “Go to Unauth”, and similar actions;
- sentences describing Unauth behaviour;
- legal entity names and copyright lines;
- browser extension, manifest, package, and email subject names;
- breadcrumbs and route labels;
- text-only email fallbacks;
- provider-controlled card titles where an image is unsupported.

---

## 3. Target implementation architecture

### 3.1 Source and generated assets

Keep the supplied source SVGs immutable at:

```text
public/brand/unauth-r1/
```

Add deterministic derivatives under:

```text
public/brand/unauth-r1/generated/
```

Required generated files:

```text
favicon-32x32.png
apple-touch-icon-180x180.png
pwa-icon-192x192.png
pwa-icon-512x512.png
pwa-icon-maskable-512x512.png
chrome-icon-16.png
chrome-icon-48.png
chrome-icon-128.png
zendesk-logo-128.png
zendesk-logo-320.png
unauth-og-1200x630.png
unauth-wordmark-graphite-2x.png
unauth-wordmark-white-2x.png
```

Create one repository-owned generator, for example:

```text
scripts/generate-brand-assets.mjs
```

The generator must:

- read only from the canonical R1 SVG directory;
- render exact dimensions with a deterministic renderer;
- preserve the source palette and aspect ratio;
- never apply an undocumented crop, radius, shadow, gradient, or colour;
- validate output dimensions, alpha/background expectations, and non-empty content;
- update Chrome and Zendesk source assets from the same generated outputs;
- leave `extensions/chrome/dist/` to the normal extension build;
- leave the downloadable Zendesk zip to `npm run package:zendesk`.

### 3.2 Typed asset registry

Move path knowledge out of page components into one typed module:

```text
lib/brand/unauthLogoAssets.ts
```

The registry should describe:

- `kind`: `lockup | wordmark | symbol | bounded-symbol`;
- `tone`: `graphite | white | black`;
- intrinsic width, height, and viewBox;
- whether the file owns a background;
- whether the asset is outlined and production-safe;
- supported semantic sizes for symbols.

### 3.3 Shared React component

Refactor `components/ui/UnauthLogo.tsx` around visual meaning rather than the current ambiguous variant names.

Target API:

```tsx
<UnauthLogo
  kind="lockup"
  tone="auto"
  height={22}
  alt="Unauth"
/>
```

Recommended props:

```ts
type UnauthLogoProps = {
  kind?: 'lockup' | 'wordmark' | 'symbol';
  tone?: 'auto' | 'graphite' | 'white' | 'black';
  height?: number;
  alt?: string;
  decorative?: boolean;
  className?: string;
};
```

Requirements:

- `tone="auto"` must genuinely respond to `data-theme="dark"`; it must not merely return graphite.
- External SVGs with hardcoded colours cannot be recoloured by the old CSS variables.
- The preferred first-party implementation is an outlined inline SVG whose paths use `currentColor`, or two outlined image variants selected by theme-aware CSS.
- `kind="symbol"` selects the nearest supplied semantic size at or above the requested rendered size.
- Width is derived from the asset aspect ratio; callers set one height.
- The component owns correct alt/decorative behaviour.
- Do not use the background-bound symbol when a transparent logo is intended.

### 3.4 Theme behaviour

`UnauthLogo` renders graphite and white transparent variants together for `tone="auto"`; CSS selects the correct one from `:root[data-theme="dark"]`. Explicit tones and background-bound assets are rendered as a single fixed image and are not overridden by theme CSS.

The implemented behavior is:

- light app shell → graphite;
- dark app shell → white;
- light auth surface → graphite;
- dark auth surface → white;
- explicit dark embedded surfaces → white regardless of global theme;
- public marketing white surfaces → graphite.

### 3.5 Legacy public URL compatibility

The following legacy public paths previously exposed retired artwork and are retained as generated R1 compatibility aliases for one release:

```text
/favicon.svg
/favicon-32x32.png
/apple-touch-icon.png
/icon-192.png
/icon-512.png
/icon-512-maskable.png
/logo-mark.svg
/logo-mark.png
/logo-wordmark.svg
/logo-wordmark-light.svg
/logo-wordmark-dark.svg
/logo-wordmark.png
```

Do not leave these URLs serving the old identity. For one compatibility release:

- regenerate or replace them as R1 aliases;
- move all internal code to canonical `/brand/unauth-r1/...` paths;
- document the old names as deprecated;
- remove obsolete aliases only after access/log review confirms no external dependency.

---

## 4. Exact surface mapping

### 4.1 First-party web application

| Priority | Surface | Current treatment | Target artwork | Implementation |
|---|---|---|---|---|
| P0 | Public marketing navigation | Lucide `Layers` + styled “Unauth” | Graphite lockup, 22px high | Implemented in `FoundationNav.tsx`; obsolete icon/CSS removed |
| P0 | Public marketing footer | Lucide `Layers` + styled “Unauth” | Graphite lockup, 20px high | Implemented in `FoundationFooter.tsx`; copyright remains text |
| P0 | Expanded authenticated sidebar | R1 lockup with live-text/font and dark-theme risks | Auto-tone outlined lockup, 18px high | Implemented in `SidebarAside.tsx` and the skeleton in `Sidebar.tsx` |
| P0 | Collapsed authenticated sidebar | Full lockup at 9px | Auto-tone symbol, 20px | Implemented with `kind="symbol"` when collapsed |
| P0 | Auth shell | R1 graphite lockup through intermediate component | Graphite lockup, 22px high | Implemented in `AuthShell.tsx`; the shell remains light and explicit |
| P0 | Onboarding header | Inverse tile containing letter `U` + text | Auto-tone lockup, 20px high | Implemented in `OnboardingClient.tsx` |
| P0 | Public case walkthrough header | Inverse tile containing letter `U` | White-on-graphite bounded symbol, 32px | Implemented in `OperationalCaseDemo.tsx`; contextual title remains text |
| P0 | Root global error header | Inverse tile containing letter `U` + text | Resilient graphite lockup, 20px | Implemented with a native image so the root failure path does not depend on Next image runtime |
| P1 | Unsupported-width boundary | Text-only “Unauth workspace” | Auto-tone lockup, 22px | Implemented above the boundary title |
| P1 | Public legal pages | No shared brand header or home identity | Graphite lockup, 22px | Implemented as one shared header linking to `/landing` and `/login` |
| P1 | Root public 404 | No visible brand identity | Graphite lockup, 24px | Implemented as a linked lockup above the empty state |
| No change | Authenticated not-found/error routes | Render inside normal app shell | Sidebar owns identity | Do not duplicate a page-level logo |
| P1 | Helpdesk sidebar preview | Small text “Unauth” | White wordmark, approximately 52 × 13px | Implemented in `HelpdeskSidebarPreview.tsx` |
| P1 | Design-system gallery | No R1 QA matrix | Full light/dark logo matrix | Add a brand section showing all forms, tones, minimum sizes, and contrast failures |

Do not add the logo to `AppHeader.tsx`; the authenticated sidebar already owns persistent product identity.

### 4.2 Browser metadata, PWA, and social sharing

| Priority | Output | Source | Target |
|---|---|---|---|
| P0 | Primary SVG favicon | `unauth-r1-favicon-graphite-on-white.svg` | Keep current canonical reference |
| P0 | `favicon-32x32.png` | Graphite-on-white favicon | Regenerate at exactly 32 × 32 |
| P0 | Apple touch icon | White-on-graphite bounded symbol | 180 × 180 PNG |
| P0 | PWA icon | White-on-graphite bounded symbol | 192 × 192 PNG |
| P0 | PWA icon | White-on-graphite bounded symbol | 512 × 512 PNG |
| P0 | PWA maskable icon | White-on-graphite bounded symbol | 512 × 512 PNG; verify the symbol remains inside the maskable safe zone |
| P0 | Web manifest colours | R1 palette | `background_color: #FAFAFA`; `theme_color: #202020` |
| P0 | Open Graph/Twitter image | Graphite outlined lockup | Dedicated 1200 × 630 composition on `#FAFAFA` with generous safe margins |

Do not point social metadata directly at a transparent wordmark SVG. Major crawlers have inconsistent SVG support and a bare logo is not a complete social card.

The social composition should contain only approved brand identity and stable product positioning. It must not include fabricated product data, screenshots, gradients, or legacy rust accents.

### 4.3 Static landing-page artifacts

`public/hero-artifact.html` now loads canonical R1 symbol files directly from `/brand/unauth-r1/`.

| Placement | Current size | R1 replacement |
|---|---:|---|
| Sidebar identity mark | 18px | Graphite 20px symbol rendered at 18–20px |
| Activity/event authorship | 13px | Graphite 16px symbol rendered at 13–16px |
| Agent panel identity | 16px | Graphite 16px symbol |

These marks are decorative because adjacent text says “Unauth”; use empty alt text. Remove the locally invented border radius.

`public/hero-artifact-stack.html` contains no current Unauth logo placeholder and does not need an ornamental logo added to every card.

### 4.4 Chrome extension

The extension popup uses a letter `U` inside a rust gradient, while its packaged icons use an orange rectangle with a white approximate `U`. Both are placeholders.

| Priority | Surface/file | Target |
|---|---|---|
| P0 | `PopupHeader.tsx` | R1 bounded symbol at 28px plus the existing text label on the dark popup surface |
| P0 | `PopupBootstrapLoading.tsx` | R1 white-on-graphite bounded symbol, 48px |
| P0 | `PopupLookupLoadingScreen.tsx` | R1 white-on-graphite bounded symbol, 48px |
| P0 | `extensions/chrome/icons/icon16.png` | Generated 16px R1 white-on-graphite icon |
| P0 | `extensions/chrome/icons/icon48.png` | Generated 48px R1 white-on-graphite icon |
| P0 | `extensions/chrome/icons/icon128.png` | Generated 128px R1 white-on-graphite icon |
| P0 | `extensions/chrome/scripts/generate-icons.mjs` | Copies canonical R1 raster derivatives; root generator owns artwork |
| P0 | `extensions/chrome/dist/**` | Rebuilt with `npm run build:extension`; never hand-edit |

Keep the extension name and default title as text in `manifest.json`.

The host-page “Check with Unauth” content badge should remain a restrained text action. Do not inject a brand tile into arbitrary merchant/admin pages unless a separate host-integration design review approves it.

### 4.5 Zendesk extension and downloadable package

| Priority | Surface/file | Target |
|---|---|---|
| P0 | `extensions/zendesk/assets/logo.png` | 320 × 320 white-on-graphite bounded symbol |
| P0 | `extensions/zendesk/assets/logo-small.png` | 128 × 128 white-on-graphite bounded symbol |
| P1 | `extensions/zendesk/assets/iframe.html` footer signature | Transparent white outlined wordmark, about 52 × 13px |
| P1 | Zendesk README/package contract | Add the outlined SVG or generated PNG if the iframe consumes it |
| P0 | `public/downloads/unauth-zendesk-app.zip` | Rebuild after source assets change |

`npm run package:zendesk` remains the only way to refresh the downloadable zip. The checked-in zip has been rebuilt and contains the R1 `logo.png` and `logo-small.png`.

### 4.6 Gorgias and helpdesk widget rendering

The production Gorgias JSON integration is provider-rendered and may not support arbitrary brand images. Keep provider-controlled titles as text.

For Unauth-owned HTML previews:

| Surface | Target |
|---|---|
| `lib/gorgias/renderWidgetHtml.ts` footer | Transparent white outlined wordmark, approximately 52 × 13px |
| `components/settings/HelpdeskSidebarPreview.tsx` | The same wordmark and dimensions |

The implemented HTML preview embeds the outlined white wordmark as a local SVG data URI, so it does not depend on a remote request. Keep all action and explanatory references to Unauth as text.

### 4.7 Evidence PDF and exported documents

`lib/evidence/pdfDocumentView.tsx` now uses a deterministic generated R1 wordmark PNG as the PDF identity mark.

Implementation:

- the generated wordmark PNG is embedded as a local data URI at approximately 110px wide;
- keep “Identity Evidence Report” as real selectable text below or beside it;
- embed paths or a deterministic high-resolution PNG in the PDF bundle;
- do not reference a public HTTP URL during PDF generation;
- keep the footer URL and legal sentence as text;
- verify the logo in both local render and downloaded PDF at 100% and 200% zoom.

### 4.8 Email

Billing email footers currently use “Unauth · hello@unauth.co” as text. This is not a placeholder and should remain the reliable fallback.

A branded email header is optional P2 work. If added:

- use a small graphite wordmark PNG with meaningful alt text;
- preserve a text fallback;
- use an absolute production URL or content-ID attachment supported by the mail provider;
- verify images-off, dark-mode, and plain-text versions;
- never make access to account or billing information depend on the image.

### 4.9 External marketplace and submission artwork

The three `unauth-r1-marketplace-icon-1200-*.svg` files are large transparent submission masters, not routine in-product icons.

| Submission background | Master |
|---|---|
| White or light neutral | `unauth-r1-marketplace-icon-1200-graphite.svg` |
| Graphite or approved dark neutral | `unauth-r1-marketplace-icon-1200-white.svg` |
| Mandatory one-colour black reproduction | `unauth-r1-marketplace-icon-1200-black.svg` |

For Chrome Web Store, Shopify, Zendesk, or another marketplace:

- follow that marketplace’s current dimension, safe-area, file-type, and background rules;
- compose the transparent master onto an approved background when transparency is not accepted;
- never upload the transparent white master without confirming the listing supplies a dark background;
- keep listing screenshots and promotional tiles outside the runtime icon set;
- generate platform-specific raster outputs from the 1200px master rather than enlarging a 16–256px UI file.

---

## 5. Legacy cleanup

The R1 cleanup is implemented:

1. The old `.ua-mark` implementation is removed from `app/globals.css`.
2. Obsolete logo variables and authenticated compatibility rules are removed.
3. Lucide `Layers` identity imports are removed from the public site.
4. Letter-`U` brand tiles and their gradient CSS are removed from source.
5. The Chrome icon generator now copies canonical R1 raster derivatives.
6. Legacy public logo URLs are generated R1 compatibility aliases.
7. Generated extension and downloadable artifacts are rebuilt.

The cleanup must not remove provider logos under `public/integrations/`; those are unrelated external brands.

---

## 6. Rollout phases

### Phase 0 — Production-safe masters

**Goal:** make the supplied identity deterministic.

- Obtain path-outlined lockup and wordmark SVGs.
- Compare outlined exports to the supplied assets at the same viewBox.
- Confirm graphite, white, and black values.
- Confirm whether the right-side viewBox space is intentional clear space.
- Preserve all 32 supplied source files or replace text-bearing files in place only with approved outlined equivalents.

**Exit gate:** lockups and wordmarks render identically without Instrument Sans installed.

### Phase 1 — Brand infrastructure

**Goal:** establish one implementation path.

- Add the typed asset registry.
- Refactor `UnauthLogo`.
- Implement genuine auto-tone behaviour.
- Add deterministic raster generation.
- Add the design-system logo matrix.
- Add asset validation tests.

**Exit gate:** one component and one generator own all first-party logo selection.

### Phase 2 — First-party surfaces

**Goal:** remove visible placeholders from the web experience.

- Marketing navigation and footer.
- Auth shell.
- Expanded/collapsed sidebar and skeleton.
- Onboarding.
- Public demo.
- Root global error.
- Desktop-required boundary.
- Public legal header and public 404.
- Helpdesk preview.

**Exit gate:** no generic Layers mark or letter `U` tile remains in a brand position.

### Phase 3 — Metadata and generated public assets

**Goal:** remove retired identity from browser, install, and sharing contexts.

- Favicon fallback.
- Apple touch icon.
- PWA icons and manifest colours.
- Open Graph/Twitter card.
- Compatibility aliases.
- Static hero artifact.

**Exit gate:** every browser/PWA/social path serves R1 artwork.

### Phase 4 — Extensions and embedded surfaces

**Goal:** update shipped third-party packages.

- Chrome popup and icons.
- Chrome distribution build.
- Zendesk app icons and footer signature.
- Zendesk downloadable zip.
- Gorgias/Helpdesk owned previews.

**Exit gate:** unpacked extension artifacts contain no retired or approximate logo.

### Phase 5 — Documents and cleanup

**Goal:** finish non-browser identity and delete dead implementation.

- Evidence PDF.
- Optional email header.
- Legacy CSS/tokens.
- Deprecated source aliases after compatibility review.
- Final repository-wide placeholder scan.

**Exit gate:** the R1 system is the only Unauth logo system in source and generated outputs.

---

## 7. Verification and acceptance

### 7.1 Automated checks

Add direct checks for:

- all 32 canonical SVGs exist;
- outlined lockups/wordmarks contain no `<text>` elements;
- source colours are only approved R1 values;
- generated PNG dimensions are exact;
- background-bound outputs have no accidental transparency;
- transparent outputs preserve alpha;
- Chrome manifest icon paths exist at 16, 48, and 128;
- PWA manifest icon paths exist at 192 and 512;
- Zendesk package includes refreshed `logo.png` and `logo-small.png`;
- the social card is exactly 1200 × 630;
- no product source references a retired public logo path except the documented compatibility layer.

Suggested repository scans:

```bash
rg -n "logo-mark\.svg|logo-wordmark\.png|favicon-32x32\.png|icon-192\.png|icon-512" app components lib extensions public
rg -n ">U<|loading-logo|brand-mark" app components extensions
rg -n "Layers.*Logo|Logo.*Layers|heroNavLogoIcon" app components
rg -n "ua-logo-dot|ua-mark \.word|ua-mark \.dot" app styles
rg -n "<text" public/brand/unauth-r1/unauth-r1-{lockup,wordmark}-*.svg
```

The scans are acceptance aids, not permanent tests unless they protect a real regression.

### 7.2 Visual matrix

Inspect at minimum:

| Surface | Light | Dark | Small | Large |
|---|:---:|:---:|:---:|:---:|
| Symbol | ✓ | ✓ | 16px | 64px |
| Lockup | ✓ | ✓ | 18px | 48px |
| Wordmark | ✓ | ✓ | 16px | 48px |
| Bounded icon | White | Graphite | 16px raster | 512px raster |

Capture:

- marketing navigation at desktop and mobile widths;
- marketing footer;
- auth and signup;
- app sidebar expanded and collapsed;
- app light and dark themes;
- onboarding;
- public demo;
- desktop-required boundary;
- root error fallback;
- legal page header and public 404;
- Chrome popup header and loading state;
- Zendesk sidebar and app icons;
- evidence PDF first page;
- browser favicon, installed PWA icon, and social-card preview.

### 7.3 Accessibility acceptance

- Linked logos have a meaningful accessible name.
- Decorative marks do not duplicate adjacent brand text.
- Logo images never replace required headings or button labels.
- Contrast is valid at every explicit surface.
- Forced-colour mode leaves a textual route/home name available.
- Images-off and failed-image states do not make auth, navigation, or recovery actions unusable.

### 7.4 Build and package acceptance

Run the smallest relevant checks after each phase, then the final set:

```bash
npm run typecheck
npx eslint app components lib extensions/chrome
npm run build
npm run build:extension
npm run package:zendesk
npm test -- --runInBand
```

Inspect the built Chrome icons and unpack the Zendesk zip rather than trusting source files alone.

---

## 8. Definition of done

The R1 rollout is complete only when:

- the supplied segmented `U` is the only Unauth symbol in production-facing source and generated artifacts;
- no visible letter `U`, Lucide icon, serif/rust wordmark, or approximate pixel art acts as the logo;
- every lockup and wordmark is font-independent;
- light/dark polarity is explicit and correct;
- the collapsed sidebar uses a symbol, not a microscopic lockup;
- all favicon, touch, PWA, social, Chrome, and Zendesk images are regenerated;
- the evidence PDF uses approved artwork;
- legacy public URLs no longer expose retired identity;
- dead logo CSS and tokens are removed;
- textual references to Unauth remain readable text where they are content rather than identity.

---

## Appendix A — inspected R1 asset register

The register below describes the supplied files preserved under `public/brand/unauth-r1/source/`. The production-facing files with the same canonical names at `public/brand/unauth-r1/` are generated path-outlined replacements for the text-bearing entries.

### Favicons

1. `unauth-r1-favicon-graphite-on-white.svg` — 64 × 64, graphite symbol, white full-square background.
2. `unauth-r1-favicon-white-on-graphite.svg` — 64 × 64, white symbol, graphite full-square background.

### Lockups

3. `unauth-r1-lockup-black.svg` — 300 × 56 viewBox, transparent, black symbol and live-text wordmark in the supplied source.
4. `unauth-r1-lockup-graphite.svg` — 300 × 56 viewBox, transparent, graphite symbol and live-text wordmark in the supplied source.
5. `unauth-r1-lockup-horizontal-white-on-graphite.svg` — 300 × 56 viewBox, white symbol/live-text wordmark on graphite in the supplied source.
6. `unauth-r1-lockup-white.svg` — 300 × 56 viewBox, transparent, white symbol and live-text wordmark in the supplied source.

### Marketplace symbols

7. `unauth-r1-marketplace-icon-1200-black.svg` — 1200 × 1200 intrinsic, transparent black symbol.
8. `unauth-r1-marketplace-icon-1200-graphite.svg` — 1200 × 1200 intrinsic, transparent graphite symbol.
9. `unauth-r1-marketplace-icon-1200-white.svg` — 1200 × 1200 intrinsic, transparent white symbol.

### Black symbols

10. `unauth-r1-symbol-black-16px.svg`
11. `unauth-r1-symbol-black-20px.svg`
12. `unauth-r1-symbol-black-24px.svg`
13. `unauth-r1-symbol-black-32px.svg`
14. `unauth-r1-symbol-black-64px.svg`
15. `unauth-r1-symbol-black-256px.svg`

All six use the same transparent black symbol geometry and differ only in root dimensions.

### Graphite symbols

16. `unauth-r1-symbol-graphite-16px.svg`
17. `unauth-r1-symbol-graphite-20px.svg`
18. `unauth-r1-symbol-graphite-24px.svg`
19. `unauth-r1-symbol-graphite-32px.svg`
20. `unauth-r1-symbol-graphite-64px.svg`
21. `unauth-r1-symbol-graphite-256px.svg`

All six use the same transparent graphite symbol geometry and differ only in root dimensions.

### White symbols

22. `unauth-r1-symbol-white-16px.svg`
23. `unauth-r1-symbol-white-20px.svg`
24. `unauth-r1-symbol-white-24px.svg`
25. `unauth-r1-symbol-white-32px.svg`
26. `unauth-r1-symbol-white-64px.svg`
27. `unauth-r1-symbol-white-256px.svg`

All six use the same transparent white symbol geometry and differ only in root dimensions.

### Background-bound symbol

28. `unauth-r1-symbol-white-on-graphite.svg` — 256 × 256 intrinsic, white symbol on graphite full-square background.

### Wordmarks

29. `unauth-r1-wordmark-black.svg` — 220 × 56 viewBox, transparent black live text in the supplied source.
30. `unauth-r1-wordmark-graphite.svg` — 220 × 56 viewBox, transparent graphite live text in the supplied source.
31. `unauth-r1-wordmark-white-on-graphite.svg` — 220 × 56 viewBox, white live text on graphite in the supplied source.
32. `unauth-r1-wordmark-white.svg` — 220 × 56 viewBox, transparent white live text in the supplied source.
